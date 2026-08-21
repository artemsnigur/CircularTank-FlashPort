/**
 * The mute toggle at the seam, not just the state.
 *
 * A state test would pass on a toggle that flips a persisted boolean and changes
 * nothing audible — which is exactly what would have shipped, because
 * `applyVolumes()` existed and was never called (audit defect 5). So these drive
 * a real `SoundManager` against a recording backend and assert on **what the
 * backend was told**, plus a real `SaveStore` round trip for the persistence.
 *
 * The AS3 keeps these in `CircularTankOptions`, a SharedObject separate from the
 * save slots (`SaveManager.as:846-863`), so a save wipe does not reset
 * preferences and muting does not touch the 63-field slot.
 */
import { describe, expect, it } from 'vitest';
import {
  AS3_AUDIO_DEFAULTS,
  DEFAULT_AUDIO_OPTIONS,
  applyAudioOptions,
  coupleAudioChange,
  currentAudioOptions,
  readAudioOptions,
  reconcileAudioOptions,
  writeAudioOptions,
} from './audioOptions';
import { MemoryBackend, OPTIONS_STORE, SaveStore } from '../save/SaveStore';
import { SoundManager } from './SoundManager';
import type { AudioBackend, LoopId, MusicChannel } from './SoundManager';
import { setAudioOption } from './soundService';
import { GameEvents } from '../events/GameEvents';
import type { GameEventMap } from '../events/GameEvents';

/** Records every instruction, so "what did the engine hear" is answerable. */
class RecordingBackend implements AudioBackend {
  sfx: { file: string; volume: number }[] = [];
  musicPlayed: { channel: MusicChannel; file: string }[] = [];
  musicStopped: MusicChannel[] = [];
  musicVolumes: { channel: MusicChannel; volume: number }[] = [];
  loaded = new Set<string>();

  isLoaded(file: string): boolean {
    return this.loaded.has(file);
  }
  requestLoad(file: string): void {
    this.loaded.add(file);
  }
  playSfx(file: string, volume: number): void {
    this.sfx.push({ file, volume });
  }
  playMusic(channel: MusicChannel, file: string): void {
    this.musicPlayed.push({ channel, file });
  }
  stopMusic(channel: MusicChannel): void {
    this.musicStopped.push(channel);
  }
  setMusicVolume(channel: MusicChannel, volume: number): void {
    this.musicVolumes.push({ channel, volume });
  }
  startLoop(_id: LoopId, _file: string): void {}
  stopLoop(_id: LoopId): void {}
  setLoopVolume(_id: LoopId, _volume: number): void {}
}

const FRAME = 1000 / 60;

/** Runs enough frames for a crossfade to settle. */
function run(manager: SoundManager, frames = 60): void {
  for (let i = 0; i < frames; i += 1) manager.update(FRAME);
}

function fresh(): { manager: SoundManager; backend: RecordingBackend } {
  const backend = new RecordingBackend();
  // Everything already cached, so nothing is gated on a load.
  for (const file of SoundManager.musicFiles()) backend.loaded.add(file);
  for (const file of SoundManager.sfxFilesToPreload()) backend.loaded.add(file);
  return { manager: new SoundManager({ backend }), backend };
}

describe('sound off reaches the backend', () => {
  it('queued effects are not played', () => {
    const { manager, backend } = fresh();
    manager.soundOn = false;

    manager.queue('Coin');
    run(manager, 1);

    expect(backend.sfx).toEqual([]);
  });

  it('and turning it back on lets the next one through', () => {
    const { manager, backend } = fresh();
    manager.soundOn = false;
    manager.queue('Coin');
    run(manager, 1);

    manager.soundOn = true;
    manager.queue('Coin');
    run(manager, 1);

    // Exactly one: the muted request is dropped rather than deferred, matching
    // the AS3, which clears sfxArray unconditionally.
    expect(backend.sfx).toHaveLength(1);
  });
});

describe('music off reaches the backend', () => {
  it('a track requested while muted never plays', () => {
    const { manager, backend } = fresh();
    manager.musicOn = false;

    manager.setMusic('Menu');
    run(manager);

    expect(backend.musicPlayed).toEqual([]);
  });

  it('muting mid-track stops it', () => {
    const { manager, backend } = fresh();
    manager.setMusic('Menu');
    run(manager);
    expect(backend.musicPlayed.length).toBeGreaterThan(0);

    manager.musicOn = false;
    run(manager);

    expect(backend.musicStopped.length).toBeGreaterThan(0);
  });

  it('musicVol still reaches the backend after the crossfade settles — defect 5', () => {
    // The isolation matters. `handleMusicChange` also calls setMusicVolume, but
    // ONLY while `musicChanging` is true, so a volume change during a fade is
    // carried by it and proves nothing. Once the fade completes, `applyVolumes`
    // is the sole maintainer — which is the step that was missing from
    // `update()` for the whole life of the port.
    //
    // A first version of this test ran exactly one crossfade's worth of frames
    // and passed with `applyVolumes` deleted. It was measuring the fade.
    const { manager, backend } = fresh();
    manager.setMusic('Menu');
    run(manager, 240); // well past MUSIC_CROSSFADE_MS (1000ms)

    backend.musicVolumes.length = 0;
    manager.musicVol = 0.25;
    run(manager, 2);

    expect(
      backend.musicVolumes.length,
      'nothing set a volume after the fade — applyVolumes is not being called',
    ).toBeGreaterThan(0);
    // 0.25 * MUSIC_MULTIPLIER (0.75) = 0.1875, on the live channel.
    const loudest = Math.max(...backend.musicVolumes.map((v) => v.volume));
    expect(loudest).toBeCloseTo(0.1875, 4);
  });

  it('soundVol scales effects', () => {
    const { manager, backend } = fresh();
    manager.soundVol = 0.5;

    manager.queue('Coin');
    run(manager, 1);

    expect(backend.sfx[0].volume).toBeCloseTo(0.5, 4);
  });
});

describe('preferences survive a reload', () => {
  const store = (): SaveStore => new SaveStore(OPTIONS_STORE, new MemoryBackend());

  it('defaults match SaveManager.as:831-834', () => {
    expect(readAudioOptions(store())).toEqual(DEFAULT_AUDIO_OPTIONS);
  });

  it('a muted state round-trips through the options store', () => {
    const backend = new MemoryBackend();
    const first = new SaveStore(OPTIONS_STORE, backend);

    const { manager } = fresh();
    manager.soundOn = false;
    manager.musicVol = 0.4;
    writeAudioOptions(first, currentAudioOptions(manager));

    // A second store over the same backend is the reload.
    const reloaded = readAudioOptions(new SaveStore(OPTIONS_STORE, backend));
    expect(reloaded.soundOn).toBe(false);
    expect(reloaded.musicOn).toBe(true);
    expect(reloaded.musicVol).toBeCloseTo(0.4, 4);
  });

  it('a reloaded preference reaches the backend, not just the fields', () => {
    // The full loop: persist, reload, apply, and confirm the engine obeys. A
    // toggle that saved and restored correctly but never reached the backend is
    // precisely the failure this file exists to prevent.
    const backend = new MemoryBackend();
    writeAudioOptions(new SaveStore(OPTIONS_STORE, backend), {
      ...DEFAULT_AUDIO_OPTIONS,
      soundOn: false,
    });

    const { manager, backend: audio } = fresh();
    applyAudioOptions(manager, readAudioOptions(new SaveStore(OPTIONS_STORE, backend)));

    manager.queue('Coin');
    run(manager, 1);

    expect(audio.sfx).toEqual([]);
  });

  it('clamps a corrupt volume rather than passing it through', () => {
    // **Read with the channel OFF**, so the clamp is what the assertion sees.
    // With sound on, `reconcileAudioOptions` would lift a clamped 0 back to 1
    // (`ScreenOptions.as:246-249`) and this would be measuring reconciliation
    // instead of clamping — which is how it first failed when the coupling
    // landed. The clamp is still a real requirement; the fixture was ambiguous.
    const backend = new MemoryBackend();
    const s = new SaveStore(OPTIONS_STORE, backend);
    s.set('musicVol', 42);
    s.set('soundVol', -3);
    s.set('soundOn', false);
    s.flush();

    const read = readAudioOptions(new SaveStore(OPTIONS_STORE, backend));
    expect(read.musicVol).toBe(1);
    expect(read.soundVol).toBe(0);
  });

  it('lifts a corrupt zero to full when the channel is on — the counterpart', () => {
    // The same corrupt input with sound **on**. Pinned beside the row above so
    // the two cannot be confused: clamping is what makes -3 finite, and
    // reconciliation is what decides whether 0 is a legal resting place.
    const backend = new MemoryBackend();
    const s = new SaveStore(OPTIONS_STORE, backend);
    s.set('soundVol', -3);
    s.set('soundOn', true);
    s.flush();

    expect(readAudioOptions(new SaveStore(OPTIONS_STORE, backend)).soundVol).toBe(1);
  });
});

/**
 * The slider ↔ toggle coupling — `ButtonToggleSound.as:43-52` and
 * `ScreenOptions.as:235-254`.
 *
 * The expected values come from those lines, not from the implementation: the
 * AS3 writes the literals `1` and `0`, and `:246-249` jumps to `1` rather than
 * to anything remembered. There is only one volume field in the original, so
 * "restore what the player chose" is not a behaviour that exists to be tested
 * for.
 */
describe('mute and volume are one control', () => {
  it('unmuting restores FULL volume, not the last chosen value', () => {
    // The whole point of the decision, driven as a round trip. 0.3 is chosen,
    // then muted, then unmuted — and 0.3 is gone, because
    // `ButtonToggleSound.as:46` writes 1 rather than restoring anything.
    const chosen = coupleAudioChange({ soundVol: 0.3 });
    expect(chosen).toEqual({ soundVol: 0.3, soundOn: true });

    const muted = coupleAudioChange({ soundOn: false });
    expect(muted).toEqual({ soundOn: false, soundVol: 0 });

    const unmuted = coupleAudioChange({ soundOn: true });
    expect(unmuted).toEqual({ soundOn: true, soundVol: 1 });
  });

  it('dragging the slider to zero turns the channel off', () => {
    // `ScreenOptions.as:237-240` — the dragging branch, the direction that makes
    // a slider *be* the mute control rather than sit beside one.
    expect(coupleAudioChange({ soundVol: 0 })).toEqual({ soundVol: 0, soundOn: false });
  });

  it('dragging it off zero turns the channel on — the counterpart', () => {
    // `:241-244`. Without this beside the row above, "sets soundOn from the
    // volume" would also be satisfied by a rule that only ever turned it off.
    expect(coupleAudioChange({ soundVol: 0.01 })).toEqual({
      soundVol: 0.01,
      soundOn: true,
    });
  });

  it('couples music through the identical rule', () => {
    // Both channels, because the AS3 duplicates the block verbatim
    // (`ScreenOptions.as:257-278`, `ButtonToggleMusic.as:43-52`) and a port that
    // coupled only sound would look correct on every sound-only test here.
    expect(coupleAudioChange({ musicOn: false })).toEqual({ musicOn: false, musicVol: 0 });
    expect(coupleAudioChange({ musicOn: true })).toEqual({ musicOn: true, musicVol: 1 });
    expect(coupleAudioChange({ musicVol: 0 })).toEqual({ musicVol: 0, musicOn: false });
  });

  it('leaves the other channel entirely alone', () => {
    // A change to sound must not carry a music field, or every sound toggle
    // would silently reset the music volume — the failure mode of applying the
    // rule to the whole options object instead of to the change.
    expect(coupleAudioChange({ soundOn: false })).not.toHaveProperty('musicVol');
    expect(coupleAudioChange({ soundOn: false })).not.toHaveProperty('musicOn');
  });

  it('respects a change that names both fields', () => {
    // Defined rather than left to branch order. Nothing emits this today.
    expect(coupleAudioChange({ soundOn: true, soundVol: 0.5 })).toEqual({
      soundOn: true,
      soundVol: 0.5,
    });
  });
});

describe('on-but-silent is unreachable, and repairs itself', () => {
  it('reconciles on-with-zero to on-at-full', () => {
    // `ScreenOptions.as:246-249`. This is the migration for save data written
    // under the old independent model, where the state was reachable.
    expect(reconcileAudioOptions({ ...DEFAULT_AUDIO_OPTIONS, soundOn: true, soundVol: 0 }))
      .toEqual({ ...DEFAULT_AUDIO_OPTIONS, soundOn: true, soundVol: 1 });
  });

  it('reconciles off-with-volume to off-at-zero', () => {
    // `:251-254`, the other direction — the counterpart that stops "reconcile"
    // meaning "always raise the volume".
    expect(reconcileAudioOptions({ ...DEFAULT_AUDIO_OPTIONS, soundOn: false, soundVol: 0.8 }))
      .toEqual({ ...DEFAULT_AUDIO_OPTIONS, soundOn: false, soundVol: 0 });
  });

  it('leaves a legitimate mid-volume alone', () => {
    // `:150-151` initialises the slider from the stored volume, so a chosen 0.5
    // must survive a load. Without this, "reconcile" could be a rule that
    // rounded every volume to 0 or 1 and the two rows above would still pass.
    const mid = { ...DEFAULT_AUDIO_OPTIONS, soundOn: true, soundVol: 0.5 };
    expect(reconcileAudioOptions(mid)).toEqual(mid);
  });

  it('the old independent state cannot survive a store round trip', () => {
    // Written the way the previous model could have written it, then read back.
    // This is the end-to-end migration claim, through real storage rather than
    // through the pure function.
    const backend = new MemoryBackend();
    const s = new SaveStore(OPTIONS_STORE, backend);
    s.set('soundOn', true);
    s.set('soundVol', 0);
    s.flush();

    const read = readAudioOptions(new SaveStore(OPTIONS_STORE, backend));
    expect(read.soundOn).toBe(true);
    expect(read.soundVol).toBe(1);
  });

  it('a muted channel that reaches the manager is silent by volume as well as flag', () => {
    // The invariant the AS3 relied on, restored: `soundVol == 0` whenever sound
    // is off. `SoundManager.handleLoops` also gates on `soundOn`, so this pins
    // the *volume* half rather than the flag half — the two are independent
    // mechanisms and only one of them is this rule.
    const { manager } = fresh();
    applyAudioOptions(manager, reconcileAudioOptions({
      ...DEFAULT_AUDIO_OPTIONS,
      soundOn: false,
      soundVol: 0.9,
    }));

    expect(manager.soundOn).toBe(false);
    expect(manager.soundVol).toBe(0);
  });
});

/**
 * The coupling **at the seam every UI surface actually goes through**.
 *
 * `setAudioOption` had no test of its own. Everything above drives the pure
 * functions, and this project's recurring failure is exactly that shape: the
 * module correct, its tests green, and the caller not reaching it. These drive
 * the real `setAudioOption` against a real `SoundManager`.
 *
 * It matters most for the HUD and main menu, where `AudioToggles` renders with
 * no slider on screen — the surfaces the earlier write-up wrongly claimed the
 * AS3 had no equivalent of. `ButtonToggleSound.as:43-52` is that equivalent, and
 * it couples exactly like this.
 */
describe('setAudioOption applies the coupling for every surface', () => {
  function seam(): {
    scene: Phaser.Scene;
    manager: SoundManager;
    saved: number[];
    published: GameEventMap['audio:options'][];
  } {
    const { manager } = fresh();
    const saved: number[] = [];
    const installed = { manager, saveOptions: () => saved.push(manager.soundVol) };
    const scene = {
      game: { registry: { get: () => installed } },
    } as unknown as Phaser.Scene;

    const published: GameEventMap['audio:options'][] = [];
    GameEvents.subscribe('audio:options', (o) => published.push(o));
    return { scene, manager, saved, published };
  }

  it('a toggle with no slider on screen zeroes the volume, then restores full', () => {
    const { scene, manager } = seam();

    // A player sets a mid volume on the Options screen…
    setAudioOption(scene, { soundVol: 0.3 });
    expect(manager.soundVol).toBeCloseTo(0.3, 4);
    expect(manager.soundOn).toBe(true);

    // …then mutes from the HUD, where no slider is visible.
    setAudioOption(scene, { soundOn: false });
    expect(manager.soundVol).toBe(0);

    // …and unmutes. Full, not 0.3. This is the decision.
    setAudioOption(scene, { soundOn: true });
    expect(manager.soundVol).toBe(1);
  });

  it('republishes the coupled volume, so a visible slider follows the toggle', () => {
    // The AS3 moves `sliderButton.x` itself (`:248`, `:253`). This port has no
    // per-frame reconciliation — the slider is a controlled input, so the
    // equivalent is that the *published* volume changes with the toggle. If it
    // did not, the Options screen's slider would sit at 0.3 while the engine
    // played at 1.
    const { scene, published } = seam();
    setAudioOption(scene, { soundVol: 0.3 });
    published.length = 0;

    setAudioOption(scene, { soundOn: false });
    expect(published.at(-1)?.soundVol).toBe(0);

    setAudioOption(scene, { soundOn: true });
    expect(published.at(-1)?.soundVol).toBe(1);
  });

  it('persists the coupled value, not the requested one', () => {
    // `saveOptions` records `manager.soundVol` at the moment it runs, so this
    // fails if the coupling were applied after the save rather than before.
    const { scene, saved } = seam();
    setAudioOption(scene, { soundVol: 0.3 });
    setAudioOption(scene, { soundOn: false });

    expect(saved.at(-1)).toBe(0);
  });
});

describe('the starting volumes are half, by request', () => {
  it('starts a fresh profile at 0.5 on both channels', () => {
    /*
     * A divergence (T238). `SaveManager.as:831-834` resets both to 1, and full
     * is loud enough on modern hardware that the first thing a new player does
     * is reach for the slider.
     *
     * The AS3 figures are kept and asserted against their source line, so the
     * change stays deliberate rather than becoming an invented constant — the
     * same arrangement the coin speed and the debris scale used.
     */
    expect(AS3_AUDIO_DEFAULTS.soundVol).toBe(1); // `SaveManager.as:831-834`
    expect(AS3_AUDIO_DEFAULTS.musicVol).toBe(1);

    expect(DEFAULT_AUDIO_OPTIONS.soundVol).toBe(0.5);
    expect(DEFAULT_AUDIO_OPTIONS.musicVol).toBe(0.5);
  });

  it('leaves both channels switched on', () => {
    /*
     * The counterpart, and it matters because of the slider/toggle coupling
     * this file documents at length: half volume must not read as "muted".
     * A change that set the volumes by turning something off would fail here.
     */
    expect(DEFAULT_AUDIO_OPTIONS.soundOn).toBe(true);
    expect(DEFAULT_AUDIO_OPTIONS.musicOn).toBe(true);
  });

  it('is what a store with nothing saved hands back', () => {
    // The wiring half: defaults matter only if the reader falls back to them.
    const options = readAudioOptions(new SaveStore(OPTIONS_STORE, new MemoryBackend()));
    expect(options.soundVol).toBe(0.5);
    expect(options.musicVol).toBe(0.5);
  });
});
