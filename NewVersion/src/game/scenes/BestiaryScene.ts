/**
 * The player-facing bestiary — `ScreenEnemies.as`.
 *
 * Shows the enemies the player has actually met. Distinct from `EnemiesScene`,
 * which is the *development* board answering "what have we built" and is
 * DEV-only. This answers "what has the player seen", which is a different
 * question for a different audience, and merging them would mean one screen
 * that is wrong for both.
 *
 * ── Why it publishes, when EnemiesScene does not ──────────────────────────
 * `EnemiesScene` derives everything from generated data, so its React screen
 * computes it directly with no profile involved. This one cannot: the answer
 * depends on `SaveSlotData.knownEnemies`, which lives in the profile, and React
 * must never reach into a scene. So the scene reads the profile and publishes a
 * finished listing, the same shape `UpgradesScene` uses for the shop.
 *
 * ── Locked entries are included, not filtered ─────────────────────────────
 * `knownBestiary()` returns only what is known, which is the wrong shape for a
 * screen that wants to show silhouettes and "7 / 20". So this sends every
 * entry with a `known` flag, and withholds the description of anything unmet —
 * an unmet entry should not leak what it is.
 */
import Phaser from 'phaser';
import { SceneKeys } from '../config/constants';
import { GameEvents } from '../events/GameEvents';
import { applyViewportToScene, getViewportController } from '../systems/ViewportController';
import { getPlayerProfile } from '../player/playerProfile';
import { buildBestiaryListing } from '../enemies/enemyKnowledge';

export class BestiaryScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.TileSprite;

  constructor() {
    super(SceneKeys.Bestiary);
  }

  create(): void {
    const controller = getViewportController(this);
    if (controller) applyViewportToScene(this, controller.current);

    const camera = this.cameras.main;
    this.backdrop = this.add
      .tileSprite(0, 0, camera.width / camera.zoom, camera.height / camera.zoom, 'ground-grass')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(0.2);

    this.publishBestiary();

    // While this scene is active every other scene is torn down, so anything
    // the screen can emit has to be handled here — see uiEventListeners.test.ts,
    // which checks that pairing for every screen rather than the one that broke.
    const offGoto = GameEvents.subscribe('ui:goto', ({ key }) => {
      if (key !== SceneKeys.Bestiary) this.scene.start(key);
    });
    const onResize = (): void => {
      const c = getViewportController(this);
      if (c) applyViewportToScene(this, c.current);
      this.backdrop.setSize(camera.width / camera.zoom, camera.height / camera.zoom);
    };
    GameEvents.on('viewport:changed', onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offGoto();
      GameEvents.off('viewport:changed', onResize);
      GameEvents.emit('scene:shutdown', { key: SceneKeys.Bestiary });
    });

    GameEvents.emit('scene:ready', { key: SceneKeys.Bestiary });
  }

  private publishBestiary(): void {
    // The listing is built by a pure function so the withholding rule is
    // testable without standing up a scene — see enemyKnowledge.test.ts.
    GameEvents.emit('bestiary:listed', buildBestiaryListing(getPlayerProfile(this).slot.knownEnemies));
  }
}
