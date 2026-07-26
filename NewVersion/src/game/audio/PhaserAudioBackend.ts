/**
 * Phaser implementation of `AudioBackend`.
 *
 * Everything engine-specific lives here so `SoundManager` stays a pure state
 * machine. Loader keys are the original mp3 filenames from the manifest, which
 * keeps every sound traceable to its SWF library ID in a stack trace.
 */
import Phaser from 'phaser';
import { audioUrl } from '../../assets/registry';
import type { AudioBackend, LoopId, MusicChannel } from './SoundManager';

/** Phaser needs a key without a dot; the filename is otherwise preserved. */
export const audioKeyFor = (file: string): string => `snd:${file}`;

export class PhaserAudioBackend implements AudioBackend {
  private readonly game: Phaser.Game;

  private readonly music = new Map<MusicChannel, Phaser.Sound.BaseSound>();
  private readonly loops = new Map<LoopId, Phaser.Sound.BaseSound>();
  private readonly loadInFlight = new Set<string>();

  constructor(scene: Phaser.Scene) {
    // Only the Game is kept. An earlier version held the *scene* as a loader
    // host, which is why music never played: `installSoundManager` is called
    // from PreloadScene, and PreloadScene calls `scene.start(MainMenu)` seven
    // lines later. That shuts its LoaderPlugin down, and a shut-down loader's
    // `start()` silently no-ops forever. See docs/AUDIT-2026-07.md.
    this.game = scene.game;
  }

  isLoaded(file: string): boolean {
    return this.game.cache.audio.exists(audioKeyFor(file));
  }

  /**
   * A scene whose loader is alive *right now*.
   *
   * Resolved per call rather than captured once: whichever scene is running
   * owns a live LoaderPlugin, and scenes are torn down constantly. Returns null
   * only if nothing is running, which cannot happen while a frame is ticking.
   */
  private liveLoaderScene(): Phaser.Scene | null {
    const active = this.game.scene.getScenes(true);
    return active.length > 0 ? (active[active.length - 1] ?? null) : null;
  }

  requestLoad(file: string): void {
    const key = audioKeyFor(file);
    if (this.isLoaded(file) || this.loadInFlight.has(key)) return;

    const scene = this.liveLoaderScene();
    if (!scene) return;

    this.loadInFlight.add(key);
    const loader = scene.load;

    // Every one of these clears the in-flight marker. The previous version
    // registered only success listeners, and on a dead loader neither could
    // ever fire — so the marker stuck and every later request early-returned
    // at the guard above. A load that fails must be retryable.
    const clear = (): void => {
      this.loadInFlight.delete(key);
    };
    loader.once(`filecomplete-audio-${key}`, clear);
    loader.once(`loaderror`, (fileObj: { key?: string }) => {
      if (fileObj?.key === key) clear();
    });
    loader.once(Phaser.Loader.Events.COMPLETE, clear);

    loader.audio(key, audioUrl(file));
    // Safe mid-scene: Phaser no-ops if this loader is already running.
    loader.start();
  }

  playSfx(file: string, volume: number): void {
    const key = audioKeyFor(file);
    if (!this.game.cache.audio.exists(key)) return;
    // Fire-and-forget: Phaser reclaims the instance on complete.
    this.game.sound.play(key, { volume });
  }

  playMusic(channel: MusicChannel, file: string): void {
    this.stopMusic(channel);
    const key = audioKeyFor(file);
    if (!this.game.cache.audio.exists(key)) return;

    // AS3 uses play(0, int.MAX_VALUE) — effectively infinite looping.
    const sound = this.game.sound.add(key, { loop: true, volume: 0 });
    sound.play();
    this.music.set(channel, sound);
  }

  stopMusic(channel: MusicChannel): void {
    const sound = this.music.get(channel);
    if (!sound) return;
    sound.stop();
    sound.destroy();
    this.music.delete(channel);
  }

  setMusicVolume(channel: MusicChannel, volume: number): void {
    const sound = this.music.get(channel);
    if (sound && 'volume' in sound) {
      (sound as unknown as { volume: number }).volume = Math.max(0, Math.min(1, volume));
    }
  }

  startLoop(id: LoopId, file: string): void {
    this.stopLoop(id);
    const key = audioKeyFor(file);
    if (!this.game.cache.audio.exists(key)) return;

    const sound = this.game.sound.add(key, { loop: true, volume: 0 });
    sound.play();
    this.loops.set(id, sound);
  }

  stopLoop(id: LoopId): void {
    const sound = this.loops.get(id);
    if (!sound) return;
    sound.stop();
    sound.destroy();
    this.loops.delete(id);
  }

  setLoopVolume(id: LoopId, volume: number): void {
    const sound = this.loops.get(id);
    if (sound && 'volume' in sound) {
      (sound as unknown as { volume: number }).volume = Math.max(0, Math.min(1, volume));
    }
  }

  /** Tears down every sound this backend owns. */
  destroy(): void {
    for (const channel of [...this.music.keys()]) this.stopMusic(channel);
    for (const id of [...this.loops.keys()]) this.stopLoop(id);
    this.loadInFlight.clear();
  }
}
