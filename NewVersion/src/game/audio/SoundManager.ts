/**
 * Port of `SWFimported/scripts/SoundManager.as` (Core systems).
 *
 * The AS3 class is a persistent display object whose ENTER_FRAME handler runs
 * four steps in order: flush the SFX queue, service the music crossfade,
 * service the continuous loops, then apply volumes. That ordering is preserved
 * exactly — `update()` below is the same four calls.
 *
 * Deliberately *not* dependent on Phaser: all engine contact goes through the
 * `AudioBackend` interface, so the state machine (dedup, crossfade curve,
 * volume envelopes) is unit-testable without standing up a game. The Phaser
 * implementation lives in `PhaserAudioBackend.ts`.
 *
 * ── Behaviours carried over verbatim ──────────────────────────────────────
 *  - **Frame-batched dedup.** Gameplay pushes logical names into a queue; each
 *    distinct name plays at most once per frame no matter how many times it
 *    was requested. Twenty bullets landing in one frame make one impact sound.
 *    This is voice-limiting, not an accident — dropping it turns combat into
 *    a wall of phased copies of the same clip.
 *  - **One random draw per play.** playSound() draws `Math.random()` once at
 *    the top and compares it against the variant thresholds in order.
 *  - **Two-channel music crossfade** over 30 frames of `Strong.easeOut`. The
 *    SWF header says 30 fps, so that is exactly 1000 ms; Flash's `Strong` is
 *    the quintic ease, matching Phaser's `Quint`.
 *  - **Loop keep-alive flags.** `flameThrowerPlay`/`burningPlay` are cleared at
 *    the end of every frame, so gameplay must re-assert them each frame the
 *    weapon is firing. Releasing the trigger simply stops re-asserting.
 *  - **Asymmetric loop ramps.** Fade-out runs at twice the fade-in rate.
 *
 * ── Deliberate divergences ────────────────────────────────────────────────
 *  - **The 3-channel SFX cap is dropped.** It never worked: `channelNumber`
 *    starts at 1 and the `== 1` branch reassigns it to 1, so channels 2 and 3
 *    were unreachable and every SFX played on channel 1. Clearly a typo for
 *    `= 2`. Playback is polyphonic here, bounded by the frame dedup above.
 *  - **Rates are per-second, not per-frame.** The AS3 constants assume a fixed
 *    30 fps; at 60 fps they would run twice as fast. Each is converted at its
 *    definition with the original value in a comment.
 */

import { LOOPS, MUSIC, SFX } from '../../assets/audioManifest';
import { enableQueueHistory, publishQueueHistory, recordQueued } from './queueHistory';
import type { MusicTrackName, SfxEntry } from '../../assets/audioManifest';

/** SoundManager.as — the SWF runs at 30 fps (confirmed from the SWF header). */
const AS3_FPS = 30;

/** `Tween(..., 30, false)` — 30 frames at 30 fps. */
export const MUSIC_CROSSFADE_MS = (30 / AS3_FPS) * 1000;

/** SoundManager.as `musicMultiplier` — music sits below SFX in the mix. */
export const MUSIC_MULTIPLIER = 0.75;
/** SoundManager.as `soundMultiplier`. */
export const SOUND_MULTIPLIER = 1;

/**
 * SoundManager.as `flameThrowerVolChangeValue` = 0.1 per frame at 30 fps.
 * Fade-out is `* 2`, i.e. twice as fast, which is in the AS3 too.
 */
const FLAMETHROWER_FADE_IN_PER_SEC = 0.1 * AS3_FPS;
const FLAMETHROWER_FADE_OUT_PER_SEC = 0.1 * 2 * AS3_FPS;

/** SoundManager.as `burningVolChangeValue` = 0.2 per frame at 30 fps. */
const BURNING_FADE_IN_PER_SEC = 0.2 * AS3_FPS;
const BURNING_FADE_OUT_PER_SEC = 0.2 * 2 * AS3_FPS;

/** AS3 tracks `currentMusic`/`changeMusic` as strings, with "None" as the idle value. */
export type MusicName = MusicTrackName | 'None';
export type LoopId = 'FlameThrower' | 'Burning';
export type MusicChannel = 1 | 2;

/**
 * Everything the manager needs from the audio engine. Keeping this narrow is
 * what makes the state machine testable.
 */
export interface AudioBackend {
  /** Plays a one-shot. `file` is an original mp3 filename from the manifest. */
  playSfx(file: string, volume: number): void;
  /** Starts a music track looping forever on a channel. */
  playMusic(channel: MusicChannel, file: string): void;
  stopMusic(channel: MusicChannel): void;
  setMusicVolume(channel: MusicChannel, volume: number): void;
  /** Starts a continuous loop at volume 0; the envelope is driven separately. */
  startLoop(id: LoopId, file: string): void;
  stopLoop(id: LoopId): void;
  setLoopVolume(id: LoopId, volume: number): void;
  /** True once the file is decoded and playable. */
  isLoaded(file: string): boolean;
  /** Requests a lazily-loaded track; may resolve on a later frame. */
  requestLoad(file: string): void;
}

/**
 * Flash's `fl.transitions.easing.Strong.easeOut`, which is the quintic ease:
 * `f(u) = 1 - (1 - u)^5`. Identical to Phaser's `Quintic.Out`.
 */
export function strongEaseOut(u: number): number {
  const t = u < 0 ? 0 : u > 1 ? 1 : u;
  return 1 - (1 - t) ** 5;
}

interface LoopState {
  /** Re-asserted every frame while firing; cleared at end of frame. */
  requested: boolean;
  active: boolean;
  volume: number;
  fadeInPerSec: number;
  fadeOutPerSec: number;
  file: string | null;
}

export interface SoundManagerOptions {
  backend: AudioBackend;
  /** Injectable for deterministic tests. */
  random?: () => number;
}

export class SoundManager {
  /* ── Public state, mirroring the AS3 statics ───────────────────────────── */
  soundOn = true;
  musicOn = true;
  musicPaused = false;
  soundVol = 1;
  musicVol = 1;

  private readonly backend: AudioBackend;
  private readonly random: () => number;

  private readonly sfxByName = new Map<string, SfxEntry>();
  private readonly musicByName = new Map<string, string>();

  /** Insertion-ordered and inherently de-duplicating — the AS3 does this by
   *  scanning a parallel `sfxPlayedArray`, which is the same thing. */
  private readonly queued = new Set<string>();

  /**
   * Frames elapsed, so the history can express "in the same frame".
   *
   * Not a clock and not used for playback — it exists only so a caller can ask
   * whether ten deaths in one frame produced one sound or ten, which is the
   * dedup rule (`SoundManager.as:1080`) and the one most likely to fail quietly.
   */
  private frameCounter = 0;

  private currentMusic: MusicName = 'None';
  private changeMusic: MusicName = 'None';
  private currentMusicChannel: MusicChannel = 1;
  private musicChanging = false;
  /** Elapsed crossfade time in ms; drives `musicTweenVar`. */
  private crossfadeElapsed = 0;
  /** AS3 `valueHolder.musicTweenVar`. Channel 1's share of the mix. */
  private musicTweenVar = 1;
  /** Which direction the active tween runs: tween1 is 1->0, tween2 is 0->1. */
  private crossfadeRising = false;

  private readonly loops: Record<LoopId, LoopState>;

  constructor({ backend, random = Math.random }: SoundManagerOptions) {
    // DEV-AID: the queue history records nothing until this runs.
    if (import.meta.env.DEV) enableQueueHistory();
    this.backend = backend;
    this.random = random;

    for (const entry of SFX) this.sfxByName.set(entry.name, entry);
    for (const track of MUSIC) this.musicByName.set(track.name, track.file);

    // DEV-AID: published *after* the maps are filled. It was above, before
    // either loop ran, and handed the harness an empty list — which read as
    // "no names exist" rather than as a bug, i.e. exactly the silent-wrong
    // answer this instrument was built to stop.

    const loopFile = (name: LoopId): string | null =>
      LOOPS.find((l) => l.name === name)?.file ?? null;

    this.loops = {
      FlameThrower: {
        requested: false,
        active: false,
        volume: 0,
        fadeInPerSec: FLAMETHROWER_FADE_IN_PER_SEC,
        fadeOutPerSec: FLAMETHROWER_FADE_OUT_PER_SEC,
        file: loopFile('FlameThrower'),
      },
      Burning: {
        requested: false,
        active: false,
        volume: 0,
        fadeInPerSec: BURNING_FADE_IN_PER_SEC,
        fadeOutPerSec: BURNING_FADE_OUT_PER_SEC,
        file: loopFile('Burning'),
      },
    };

    if (import.meta.env.DEV) {
      publishQueueHistory([
        ...this.sfxByName.keys(),
        ...this.musicByName.keys(),
        // The loops belong in the denominator too — see `keepLoopAlive`.
        ...(Object.keys(this.loops) as LoopId[]),
      ]);
    }
  }

  /* ── Gameplay-facing API ───────────────────────────────────────────────── */

  /**
   * `SoundManager.sfxArray.push(name)` — request a one-shot this frame.
   * Safe to call repeatedly; it will still play once.
   */
  queue(name: string): void {
    const resolved = this.sfxByName.has(name);
    // DEV-AID: queue history, so a trigger is observable. Recorded *before* the
    // early return, which is the whole point — an unresolved name is a row that
    // says so rather than a console warning nobody reads.
    recordQueued(name, resolved, this.frameCounter);

    if (!resolved) {
      console.warn(`[SoundManager] Unknown sfx "${name}"; check audioManifest.ts.`);
      return;
    }
    this.queued.add(name);
  }

  /** `SoundManager.changeMusic = name` — requests a crossfade. */
  setMusic(name: MusicName): void {
    // DEV-AID: music changes go into the same history as one-shots.
    //
    // They did not until T42, and the omission produced a clean wrong answer:
    // all eight music names sat in the coverage sweep's NOT FIRED list while
    // being fully wired, because the instrument could not see them. The list
    // was read as "music is unported" twice. An instrument that observes only
    // part of the thing it measures reports the rest as absent.
    recordQueued(name, this.musicByName.has(name) || name === 'None', this.frameCounter);
    this.changeMusic = name;
    if (name !== 'None') {
      const file = this.musicByName.get(name);
      // Music is lazy-loaded; ask early so the crossfade has something to play.
      if (file && !this.backend.isLoaded(file)) this.backend.requestLoad(file);
    }
  }

  /** Re-assert every frame the weapon is firing. */
  keepLoopAlive(id: LoopId): void {
    // DEV-AID: the third emit path, and it was invisible until T43.
    //
    // `playSfx` is fed by `queue()` and `playMusic` by `setMusic()`, both of
    // which record. `startLoop` is fed by this, which did not — so the two
    // continuous loops could never appear in the coverage sweep no matter what
    // the game did. They were also absent from the published name list, so they
    // were missing from the denominator as well as the numerator, which is the
    // quietest possible version of the failure: nothing looked wrong.
    recordQueued(id, true, this.frameCounter);
    this.loops[id].requested = true;
  }

  get activeMusic(): MusicName {
    return this.currentMusic;
  }

  /** Exposed for tests and the diagnostics panel. */
  get crossfadeProgress(): number {
    return this.musicChanging ? this.crossfadeElapsed / MUSIC_CROSSFADE_MS : 1;
  }

  /* ── Per-frame driver ──────────────────────────────────────────────────── */

  /**
   * SoundManager.update() — the same four steps, in the same order.
   *
   * `applyVolumes` was missing for the whole of the port's life while this
   * docstring claimed four steps and the body made three calls. Nothing outside
   * a test ever called it, so `musicVol`, `musicOn` and the crossfade's own
   * tween var were computed every frame and never reached a sound. Any mute
   * control built before this would have flipped a flag and changed nothing.
   */
  update(deltaMs: number): void {
    this.frameCounter += 1;
    this.playSounds();
    this.handleMusicChange(deltaMs);
    this.handleLoops(deltaMs);
    this.applyVolumes();
  }

  /** SoundManager.playSounds() */
  private playSounds(): void {
    if (this.soundOn) {
      const volume = this.soundVol * SOUND_MULTIPLIER;
      for (const name of this.queued) {
        const file = this.pickVariant(name);
        if (file) this.backend.playSfx(file, volume);
      }
    }
    // Cleared even when muted: the AS3 empties sfxArray unconditionally, so a
    // sound requested while muted must not fire when sound is switched back on.
    this.queued.clear();
  }

  /**
   * playSound()'s variant selection: one `Math.random()` draw compared against
   * the thresholds in order, falling through to the last variant.
   */
  private pickVariant(name: string): string | null {
    const entry = this.sfxByName.get(name);
    if (!entry || entry.variants.length === 0) return null;
    if (entry.variants.length === 1) return entry.variants[0].file;

    const draw = this.random();
    for (let i = 0; i < entry.thresholds.length; i += 1) {
      if (draw < entry.thresholds[i]) return entry.variants[i].file;
    }
    return entry.variants[entry.variants.length - 1].file;
  }

  /** SoundManager.handleMusicChange() */
  private handleMusicChange(deltaMs: number): void {
    if (this.musicOn && !this.musicPaused) {
      if (this.currentMusic !== this.changeMusic) {
        this.startCrossfade();
      }

      if (this.musicChanging) {
        this.crossfadeElapsed = Math.min(
          this.crossfadeElapsed + deltaMs,
          MUSIC_CROSSFADE_MS,
        );
        const eased = strongEaseOut(this.crossfadeElapsed / MUSIC_CROSSFADE_MS);
        // tween1 runs 1 -> 0, tween2 runs 0 -> 1, both writing musicTweenVar.
        this.musicTweenVar = this.crossfadeRising ? eased : 1 - eased;

        const base = this.musicVol * MUSIC_MULTIPLIER;
        this.backend.setMusicVolume(1, base * this.musicTweenVar);
        this.backend.setMusicVolume(2, base * (1 - this.musicTweenVar));

        if (this.crossfadeElapsed >= MUSIC_CROSSFADE_MS) this.finishCrossfade();
      }
    } else if (this.currentMusic !== 'None') {
      // musicOn off or paused: tear everything down, matching the AS3.
      this.currentMusic = 'None';
      this.musicChanging = false;
      this.backend.stopMusic(1);
      this.backend.stopMusic(2);
    }
  }

  private startCrossfade(): void {
    const target = this.changeMusic;

    if (target === 'None') {
      this.currentMusic = 'None';
      this.musicChanging = false;
      this.backend.stopMusic(1);
      this.backend.stopMusic(2);
      return;
    }

    const file = this.musicByName.get(target);
    if (!file) {
      console.warn(`[SoundManager] Unknown music track "${target}".`);
      this.currentMusic = target;
      return;
    }
    if (!this.backend.isLoaded(file)) {
      // Lazy load still in flight. Leave currentMusic alone so this retries
      // next frame rather than silently swallowing the request.
      this.backend.requestLoad(file);
      return;
    }

    this.musicChanging = true;
    this.crossfadeElapsed = 0;

    if (this.currentMusicChannel === 1) {
      this.backend.stopMusic(2);
      this.backend.playMusic(2, file);
      this.currentMusicChannel = 2;
      this.crossfadeRising = false; // musicTween1: 1 -> 0
      this.musicTweenVar = 1;
    } else {
      this.backend.stopMusic(1);
      this.backend.playMusic(1, file);
      this.currentMusicChannel = 1;
      this.crossfadeRising = true; // musicTween2: 0 -> 1
      this.musicTweenVar = 0;
    }

    this.currentMusic = target;
  }

  /** SoundManager.musicTweenFinish() */
  private finishCrossfade(): void {
    this.musicChanging = false;
    this.backend.stopMusic(this.currentMusicChannel === 1 ? 2 : 1);
  }

  /** SoundManager.handleLoops() */
  private handleLoops(deltaMs: number): void {
    const seconds = deltaMs / 1000;

    for (const id of Object.keys(this.loops) as LoopId[]) {
      const loop = this.loops[id];

      if (loop.requested) {
        if (!loop.active && loop.file) {
          this.backend.startLoop(id, loop.file);
          loop.active = true;
        }
        if (loop.volume < 1) {
          loop.volume = Math.min(1, loop.volume + loop.fadeInPerSec * seconds);
        }
      } else if (loop.volume <= 0) {
        if (loop.active) {
          this.backend.stopLoop(id);
          loop.active = false;
        }
      } else {
        loop.volume = Math.max(0, loop.volume - loop.fadeOutPerSec * seconds);
      }

      if (loop.active) {
        this.backend.setLoopVolume(id, loop.volume * SOUND_MULTIPLIER * this.soundVol);
      }

      // AS3 clears the play flags at the end of handleLoops, making them
      // per-frame keep-alives rather than sticky state.
      loop.requested = false;
    }
  }

  /* ── Options ───────────────────────────────────────────────────────────── */

  /**
   * SoundManager.setVolumes(). The AS3 also calls
   * `SaveManager.saveOptionSoundMusic()` here.
   * TODO: wire that up once SaveManager is ported (PROGRESS.md, Core systems).
   */
  applyVolumes(): void {
    const base = this.musicVol * MUSIC_MULTIPLIER;
    if (this.musicChanging) {
      this.backend.setMusicVolume(1, base * this.musicTweenVar);
      this.backend.setMusicVolume(2, base * (1 - this.musicTweenVar));
    } else {
      this.backend.setMusicVolume(this.currentMusicChannel, base);
      this.backend.setMusicVolume(this.currentMusicChannel === 1 ? 2 : 1, 0);
    }
  }

  /** Every SFX file the preloader should fetch up front (~703 KB total). */
  static sfxFilesToPreload(): string[] {
    const files = new Set<string>();
    for (const entry of SFX) for (const v of entry.variants) files.add(v.file);
    for (const loop of LOOPS) files.add(loop.file);
    return [...files];
  }

  /** Music is lazy: 8 files, 4.8 MB, 87% of all audio. */
  static musicFiles(): string[] {
    return MUSIC.map((m) => m.file);
  }
}
