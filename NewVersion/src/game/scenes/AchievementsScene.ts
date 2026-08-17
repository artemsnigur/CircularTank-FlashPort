/**
 * The achievements board — `ScreenAchievements.as`.
 *
 * The last absent UI component. Everything it shows was already ported: the
 * 36 specs, the earned states, the save fields and the end-of-level reveal.
 * What was missing was the screen that lists them.
 */
import Phaser from 'phaser';
import { publishAffordable } from '../upgrades/affordability';
import { SceneKeys } from '../config/constants';
import { GameEvents } from '../events/GameEvents';
import { applyViewportToScene, getViewportController } from '../systems/ViewportController';
import { getPlayerProfile } from '../player/playerProfile';
import { buildAchievementListing } from '../achievements/achievementListing';
import { buildAchievementStats } from '../achievements/achievementStats';

export class AchievementsScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.TileSprite;

  constructor() {
    super(SceneKeys.Achievements);
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

    this.publishAchievements();

    // While this scene is active every other scene is torn down, so anything
    // the screen can emit has to be handled here — see uiEventListeners.test.ts,
    // which checks that pairing for every screen rather than the one that broke.
    const offGoto = GameEvents.subscribe('ui:goto', ({ key }) => {
      if (key !== SceneKeys.Achievements) this.scene.start(key);
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
      GameEvents.emit('scene:shutdown', { key: SceneKeys.Achievements });
    });

    // The bottom bar's Upgrades tab shows a different frame when something is
    // affordable — `ButtonUpgrades`' `makeIcon`. The AS3's button reads a
    // global for this; here each screen that shows the bar publishes it.
    publishAffordable(this);
    GameEvents.emit('scene:ready', { key: SceneKeys.Achievements });
  }

  private publishAchievements(): void {
    // A pure projection, so the counting and the earned rule are testable
    // without a scene — see `achievementListing.test.ts`.
    const profile = getPlayerProfile(this);
    GameEvents.emit(
      'achievements:listed',
      buildAchievementListing(
        profile.slot.achievements.states,
        // The right-hand window's totals — `:725-780`. Read here because the
        // profile lives in the Phaser registry; the projection itself is pure.
        buildAchievementStats(profile.progress, profile.slot.achievements.totals),
      ),
    );
  }
}
