/**
 * Preload: proves the asset pipeline end to end on a small sample set.
 *
 * Loads real extracted assets (bitmaps, an SVG shape, MP3s) through Vite's
 * hashed URLs, reports progress to React over the event bus, and surfaces
 * individual file failures rather than hanging on a silent 404.
 */
import Phaser from 'phaser';
import {
  SAMPLE_ASSET_COUNT,
  SAMPLE_AUDIO,
  SAMPLE_IMAGES,
  SAMPLE_SHAPES,
} from '../../assets/manifest';
import { SceneKeys } from '../config/constants';
import { GameEvents } from '../events/GameEvents';
import { audioUrl } from '../../assets/registry';
import { SoundManager } from '../audio/SoundManager';
import { audioKeyFor } from '../audio/PhaserAudioBackend';
import { installSoundManager } from '../audio/soundService';
import { applyViewportToScene, getViewportController } from '../systems/ViewportController';

/**
 * If the loader makes no progress for this long, report it rather than
 * spinning forever. A file that neither loads nor errors — a hung request, or
 * an SVG whose decode never settles — would otherwise leave the game on the
 * loading screen indefinitely with no diagnostic anywhere.
 */
const STALL_TIMEOUT_MS = 15000;

export class PreloadScene extends Phaser.Scene {
  private startedAt = 0;
  private failures: string[] = [];
  private stallTimer: number | null = null;
  private lastProgress = 0;

  constructor() {
    super(SceneKeys.Preload);
  }

  preload(): void {
    this.startedAt = performance.now();
    this.failures = [];
    this.lastProgress = 0;

    GameEvents.emit('scene:ready', { key: SceneKeys.Preload });
    GameEvents.emit('preload:progress', { value: 0 });

    this.armStallWatchdog();

    this.load.on(Phaser.Loader.Events.PROGRESS, (value: number) => {
      this.lastProgress = value;
      this.armStallWatchdog();
      GameEvents.emit('preload:progress', { value });
    });

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (file: Phaser.Loader.File) => {
      // A 404 here almost always means src/assets is empty; say so rather than
      // leaving a blank screen.
      this.failures.push(file.key);
      // Phaser types `File.url` as `string | object` (it can be a Blob or a
      // config object), so narrow before interpolating.
      const url = typeof file.url === 'string' ? file.url : '<non-URL source>';
      GameEvents.emit('preload:error', {
        file: file.key,
        reason: `Failed to load ${url}. Have you run "npm run assets:sync"?`,
      });
    });

    for (const asset of SAMPLE_IMAGES) {
      this.load.image(asset.key, asset.url);
    }

    for (const asset of SAMPLE_SHAPES) {
      // Rasterise vector shapes at an explicit size. The SWF authored them at
      // ~29 units; we rasterise larger so a zoomed-in camera on a 2x screen
      // still has pixels to work with.
      this.load.svg(asset.key, asset.url, { width: asset.width, height: asset.height });
    }

    for (const asset of SAMPLE_AUDIO) {
      this.load.audio(asset.key, asset.url);
    }

    // Every SFX up front: 105 one-shots plus the 2 continuous loops total
    // ~703 KB, less than a single music track, and preloading removes
    // first-play latency entirely. The 8 music tracks (4.8 MB, 87% of all
    // audio) are lazy-loaded on demand by PhaserAudioBackend instead.
    for (const file of SoundManager.sfxFilesToPreload()) {
      this.load.audio(audioKeyFor(file), audioUrl(file));
    }
  }

  /** (Re)starts the no-progress timer. Cleared once create() runs. */
  private armStallWatchdog(): void {
    this.clearStallWatchdog();
    this.stallTimer = window.setTimeout(() => {
      // `inflight` is the set of requests the loader is still waiting on —
      // exactly the list you need to know which file is wedged.
      const pending = this.load.inflight.entries.map((file) => file.key);
      const detail = pending.length > 0 ? pending.join(', ') : 'none reported';
      console.error(
        `[PreloadScene] No loader progress for ${STALL_TIMEOUT_MS} ms at ` +
          `${Math.round(this.lastProgress * 100)}%. In flight: ${detail}`,
      );
      GameEvents.emit('preload:error', {
        file: detail,
        reason:
          `The loader stalled at ${Math.round(this.lastProgress * 100)}% with no ` +
          'progress for 15s. Check the network tab for a pending request.',
      });
    }, STALL_TIMEOUT_MS);
  }

  private clearStallWatchdog(): void {
    if (this.stallTimer !== null) {
      window.clearTimeout(this.stallTimer);
      this.stallTimer = null;
    }
  }

  create(): void {
    this.clearStallWatchdog();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.clearStallWatchdog());

    const controller = getViewportController(this);
    if (controller) applyViewportToScene(this, controller.current);

    const durationMs = performance.now() - this.startedAt;

    if (this.failures.length > 0) {
      // Stop here: continuing into a scene whose textures are missing produces
      // green "missing texture" boxes and a confusing bug report.
      console.error('[PreloadScene] Missing assets:', this.failures.join(', '));
      return;
    }

    // Now that the SFX are decoded, stand up the sound manager and start its
    // per-frame tick. Must happen before any scene queues a sound.
    installSoundManager(this);

    GameEvents.emit('preload:complete', {
      durationMs,
      assetCount: SAMPLE_ASSET_COUNT,
    });

    this.scene.start(SceneKeys.MainMenu);
  }
}
