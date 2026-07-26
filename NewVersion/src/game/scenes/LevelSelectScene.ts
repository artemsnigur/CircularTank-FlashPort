/**
 * Level select — placeholder.
 *
 * The grid itself will be React (scrolling, momentum and accessibility are all
 * free in the DOM). This scene exists so the navigation graph is real from the
 * start: MainMenu -> LevelSelect -> Gameplay, driven entirely by events.
 *
 * Port target: ScreenLevelSelect.as, ButtonLevelSelect.as, ButtonWorld*.as,
 * BackgroundLevelSelect.as.
 */
import Phaser from 'phaser';
import { SceneKeys } from '../config/constants';
import { GameEvents } from '../events/GameEvents';
import { applyViewportToScene, getViewportController } from '../systems/ViewportController';

export class LevelSelectScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.TileSprite;

  constructor() {
    super(SceneKeys.LevelSelect);
  }

  create(): void {
    const controller = getViewportController(this);
    if (controller) applyViewportToScene(this, controller.current);

    const camera = this.cameras.main;
    const width = camera.width / camera.zoom;
    const height = camera.height / camera.zoom;

    this.backdrop = this.add
      .tileSprite(0, 0, width, height, 'ground-grass')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(0.35);

    const offStart = GameEvents.subscribe('ui:start-game', ({ levelIndex }) => {
      this.scene.start(SceneKeys.Gameplay, { levelIndex });
    });
    const offGoto = GameEvents.subscribe('ui:goto', ({ key }) => {
      if (key !== SceneKeys.LevelSelect) this.scene.start(key);
    });
    const onResize = (): void => {
      const c = getViewportController(this);
      if (c) applyViewportToScene(this, c.current);
      this.backdrop.setSize(camera.width / camera.zoom, camera.height / camera.zoom);
    };
    GameEvents.on('viewport:changed', onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offStart();
      offGoto();
      GameEvents.off('viewport:changed', onResize);
      GameEvents.emit('scene:shutdown', { key: SceneKeys.LevelSelect });
    });

    GameEvents.emit('scene:ready', { key: SceneKeys.LevelSelect });
  }
}
