/**
 * Boot: everything that must be true before the loading screen can be drawn.
 *
 * Fonts are the reason this scene exists. Phaser's `Text` game object renders
 * through the Canvas 2D API, which resolves a font family against the document
 * at draw time — if the @font-face has not finished loading, the first frame
 * silently falls back to a system font and Phaser caches the resulting
 * texture. So we block here rather than discovering it later.
 *
 * ── Invariant ─────────────────────────────────────────────────────────────
 * This scene MUST always hand off to Preload, whatever happens. Phaser does
 * not await `create()`, so a rejected promise here is unhandled and the game
 * strands on Boot with no error anywhere — the UI just shows "Loading"
 * forever. Every await below is non-rejecting, and the handoff sits in a
 * `finally`. Do not add a bare `await` to this method.
 */
import Phaser from 'phaser';
import { SAMPLE_FONTS } from '../../assets/manifest';
import { SceneKeys } from '../config/constants';
import { GameEvents } from '../events/GameEvents';
import { loadGameFonts } from '../text/fontLoader';
import { applyViewportToScene, getViewportController } from '../systems/ViewportController';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SceneKeys.Boot);
  }

  create(): void {
    const controller = getViewportController(this);
    if (controller) applyViewportToScene(this, controller.current);

    GameEvents.emit('scene:ready', { key: SceneKeys.Boot });
    GameEvents.emit('boot:stage', { stage: 'fonts' });

    // Fire-and-forget by design: `boot()` handles its own errors and always
    // starts Preload. Returning the promise would imply Phaser awaits it.
    void this.boot();
  }

  private async boot(): Promise<void> {
    try {
      const reports = await loadGameFonts(SAMPLE_FONTS);
      GameEvents.emit('boot:fonts-ready', { reports });
    } catch (error) {
      // loadGameFonts is contractually non-rejecting, so reaching here means
      // something unforeseen broke. Report it and carry on regardless —
      // degraded typography must never cost the player the whole game.
      console.error('[BootScene] Font stage failed unexpectedly:', error);
      GameEvents.emit('boot:fonts-ready', { reports: [] });
    } finally {
      GameEvents.emit('boot:stage', { stage: 'assets' });
      this.scene.start(SceneKeys.Preload);
    }
  }
}
