/**
 * Enemy behaviour status — a development view, not a game screen.
 *
 * Deliberately thin. Unlike LevelSelect and Upgrades, it publishes nothing:
 * `enemyBehaviour.ts` derives everything from generated data and the supported
 * shoot sets, with no profile involved, so the React screen computes it
 * directly. This scene exists only so the navigation graph stays event-driven
 * and the screen has an `activeScene` to key off.
 *
 * The AS3 counterpart is `ScreenEnemies` — the in-game bestiary, which shows
 * enemies the player has met. That is a different thing and still unported;
 * this answers "what have we built", not "what has the player seen".
 */
import Phaser from 'phaser';
import { SceneKeys } from '../config/constants';
import { GameEvents } from '../events/GameEvents';
import { applyViewportToScene, getViewportController } from '../systems/ViewportController';

export class EnemiesScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.TileSprite;

  constructor() {
    super(SceneKeys.Enemies);
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

    const offGoto = GameEvents.subscribe('ui:goto', ({ key }) => {
      if (key !== SceneKeys.Enemies) this.scene.start(key);
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
      GameEvents.emit('scene:shutdown', { key: SceneKeys.Enemies });
    });

    GameEvents.emit('scene:ready', { key: SceneKeys.Enemies });
  }
}
