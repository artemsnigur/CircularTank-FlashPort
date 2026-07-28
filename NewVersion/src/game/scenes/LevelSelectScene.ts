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
import { levelUnlockStates, mayStartLevel, SELECTABLE_WORLDS } from '../levels/levelUnlock';
import { Worlds } from '../config/constants';

/**
 * The world the grid shows — the AS3's `ScreenLevelSelect.selectedWorld`.
 *
 * With no world picker there is nothing to pick from, so it shows the highest
 * world `SELECTABLE_WORLDS` admits. That constant is the single pin; this is
 * derived from it rather than being a second copy of the number.
 */
const SELECTED_WORLD = SELECTABLE_WORLDS;

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
      if (!this.mayStart(world, level, sandbox)) return;
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
   * Whether a `ui:start-game` may proceed — the rule made load-bearing.
   *
   * `disabled` on a React button is presentation, not enforcement. `ui:start-game`
   * is a shared channel — the dev level jump emits it too — so the lock was
   * decorative: anything that emitted the event started the level, however
   * locked the grid showed it.
   *
   * `UpgradesScene` already states this policy for purchases: it re-reads live
   * state and lets `purchaseNextLevel` refuse, "so a stale or forged event
   * cannot produce a negative balance". Same reasoning, same shape — the
   * authority sits with the scene that owns the profile, not with the emitter.
   *
   * Sandbox runs are exempt by design. They are the dev jump, they record
   * nothing (`bankLevelOutcome` skips them) and their whole purpose is reaching
   * a level the campaign has not opened yet.
   *
   * The decision itself is `mayStartLevel`, so it can be driven against a real
   * profile in a test; this method is only the lookup and the log.
   */
  private mayStart(world: number, level: number, sandbox?: boolean): boolean {
    const progress = getPlayerProfile(this).progress;
    if (mayStartLevel(progress, { world, level, sandbox })) return true;

    console.warn(`[LevelSelectScene] Refused locked level ${world}-${level}.`);
    return false;
  }

  /**
   * Publishes the world's levels with their unlock state.
   *
   * The rows come from `levelUnlockStates` rather than being assembled here.
   * Building them inline is how the unlock rule acquired a copy in this file in
   * the first place — see `levels/levelUnlock.ts`.
   *
   * Read here rather than in React because the profile lives in the Phaser
   * registry; the store bridge is the only sanctioned way across.
   */
  private publishLevels(): void {
    const profile = getPlayerProfile(this);
    const world = SELECTED_WORLD;

    GameEvents.emit('levels:listed', {
      world,
      worldName: Worlds[world - 1] ?? `World ${world}`,
      levels: levelUnlockStates(profile.progress, world),
    });
  }
}
