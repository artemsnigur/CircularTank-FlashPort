/**
 * Owns canvas sizing for the whole game.
 *
 * Phaser's RESIZE mode matches the canvas backing store to the *parent
 * element's CSS size* (see ScaleManager.updateScale), which means a 3x phone
 * renders at one third of its native resolution. We want RESIZE's behaviour
 * without that loss, so:
 *
 *   1. React owns the <canvas> and passes it in via `config.canvas`, and the
 *      game config sets `parent: null` (not `undefined` — see gameConfig.ts).
 *      With no parent, ScaleManager.step returns early and never overwrites
 *      `parentSize` from a bounding rect.
 *   2. A ResizeObserver on the container calls `setParentSize(cssW * dpr,
 *      cssH * dpr)`, so the backing store is in *device* pixels.
 *   3. CSS sizes the canvas at 100% of the container, so it displays at
 *      cssW x cssH. Backing store : display = dpr : 1 — pixel-exact.
 *   4. Every camera gets `zoom` from `computeViewport`, so 640 design units
 *      span the viewport width regardless of device.
 *
 * Because `parent` is unset, Phaser cannot pick the renderer automatically
 * (CreateRenderer throws on `canvas` + AUTO), so `createGameConfig` probes for
 * WebGL itself and pins the type.
 */
// Types only: this module never constructs a Phaser object, so importing the
// runtime bundle here would pull ~1 MB into any module that touches viewports.
import type Phaser from 'phaser';
import type { Rect, SafeAreaInsets, Viewport } from '../config/viewport';
import { computeSafeRect, computeViewport, NO_INSETS } from '../config/viewport';
import { GameEvents } from '../events/GameEvents';

export class ViewportController {
  private readonly game: Phaser.Game;
  private readonly container: HTMLElement;
  private observer: ResizeObserver | null = null;
  private insets: SafeAreaInsets = NO_INSETS;
  private detachInsets: (() => void) | null = null;
  private lastKey = '';

  current: Viewport;

  constructor(game: Phaser.Game, container: HTMLElement) {
    this.game = game;
    this.container = container;
    this.current = computeViewport({
      cssWidth: container.clientWidth,
      cssHeight: container.clientHeight,
      pixelRatio: window.devicePixelRatio,
    });
  }

  start(): void {
    this.detachInsets = GameEvents.subscribe('ui:safe-area-changed', (insets) => {
      this.insets = insets;
      // Insets do not change the canvas size, but they do change where in-canvas
      // HUD elements belong, so re-broadcast.
      this.apply(true);
    });

    this.observer = new ResizeObserver(() => this.apply(false));
    this.observer.observe(this.container);

    // Safari fires no ResizeObserver entry for a rotation that keeps the
    // element's box identical but changes devicePixelRatio.
    window.addEventListener('orientationchange', this.onOrientationChange);

    this.apply(true);
  }

  stop(): void {
    this.observer?.disconnect();
    this.observer = null;
    this.detachInsets?.();
    this.detachInsets = null;
    window.removeEventListener('orientationchange', this.onOrientationChange);
  }

  /** Safe drawing area in design units, accounting for notches and home bars. */
  get safeRect(): Rect {
    return computeSafeRect(this.current, this.insets);
  }

  private readonly onOrientationChange = (): void => {
    // The new dimensions are not settled on the orientationchange tick.
    window.setTimeout(() => this.apply(true), 100);
  };

  private apply(force: boolean): void {
    const cssWidth = this.container.clientWidth;
    const cssHeight = this.container.clientHeight;
    if (cssWidth === 0 || cssHeight === 0) return; // hidden / not laid out yet

    const viewport = computeViewport({
      cssWidth,
      cssHeight,
      pixelRatio: window.devicePixelRatio,
    });

    const key = `${viewport.renderWidth}x${viewport.renderHeight}@${viewport.pixelRatio}`;
    if (!force && key === this.lastKey) return;
    this.lastKey = key;
    this.current = viewport;

    // Drives ScaleManager's RESIZE branch: gameSize, baseSize and the canvas
    // backing store all become renderWidth x renderHeight.
    this.game.scale.setParentSize(viewport.renderWidth, viewport.renderHeight);

    for (const scene of this.game.scene.getScenes(true)) {
      applyViewportToScene(scene, viewport);
    }

    GameEvents.emit('viewport:changed', {
      cssWidth: viewport.cssWidth,
      cssHeight: viewport.cssHeight,
      zoom: viewport.zoom,
      logicalWidth: viewport.logicalWidth,
      logicalHeight: viewport.logicalHeight,
      pixelRatio: viewport.pixelRatio,
    });
  }
}

/**
 * Applies the camera zoom for a scene. Scenes call this on create() too, since
 * a scene started after the last resize would otherwise render unzoomed.
 */
export function applyViewportToScene(scene: Phaser.Scene, viewport: Viewport): void {
  const camera = scene.cameras?.main;
  if (!camera) return;
  camera.setZoom(viewport.zoom);
}

/**
 * The controller is created by GameCanvas and read by scenes. Storing it in the
 * game registry avoids a module-level singleton that would leak across the
 * StrictMode create/destroy cycle.
 */
export const VIEWPORT_REGISTRY_KEY = 'viewportController';

export function getViewportController(scene: Phaser.Scene): ViewportController | null {
  return (scene.game.registry.get(VIEWPORT_REGISTRY_KEY) as ViewportController | undefined) ?? null;
}
