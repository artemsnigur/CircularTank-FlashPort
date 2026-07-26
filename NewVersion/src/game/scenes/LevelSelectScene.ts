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
import { getPlayerProfile } from '../player/playerProfile';
import { isLevelCleared } from '../levels/levelProgress';
import { LEVELS } from '../levels/levelData';
import { Worlds } from '../config/constants';

/**
 * Only world 1 is selectable until the world picker is ported — the AS3's
 * `ScreenLevelSelect.selectedWorld`.
 */
const SELECTED_WORLD = 1;

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

    this.publishLevels();

    const offStart = GameEvents.subscribe('ui:start-game', ({ world, level, sandbox, equipped }) => {
      this.scene.start(SceneKeys.Gameplay, { world, level, sandbox, equipped });
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

  /**
   * Publishes the world's levels with their unlock state.
   *
   * `ScreenLevelSelect.as:842` locks level N when level N-1 scored zero on all
   * three difficulties — i.e. was never cleared. Level 1 is always open.
   *
   * Read here rather than in React because the profile lives in the Phaser
   * registry; the store bridge is the only sanctioned way across.
   */
  private publishLevels(): void {
    const profile = getPlayerProfile(this);
    const progress = profile.progress;
    const world = SELECTED_WORLD;

    // Indexed straight off the generated table; levelData.ts is regenerated
    // from the AS3, so helpers must not be added to it by hand.
    const levels = (LEVELS[world - 1] ?? []).map((spec, index) => {
      const level = index + 1;
      return {
        level,
        mode: spec.mode,
        cleared: isLevelCleared(progress, world, level),
        unlocked: level === 1 || isLevelCleared(progress, world, level - 1),
      };
    });

    GameEvents.emit('levels:listed', {
      world,
      worldName: Worlds[world - 1] ?? `World ${world}`,
      levels,
    });
  }
}
