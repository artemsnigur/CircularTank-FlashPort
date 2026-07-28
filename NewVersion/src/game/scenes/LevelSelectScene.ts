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
import {
  isWorldUnlocked,
  levelUnlockStates,
  mayStartLevel,
  worldUnlockStates,
} from '../levels/levelUnlock';
import { chooseDifficulty, getDifficulty, publishDifficulty } from '../levels/difficultyService';
import { Worlds } from '../config/constants';

/** `selectedWorld = 0` — the picker itself, not a world. See `selectWorld`. */
const PICKER = 0;

export class LevelSelectScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.TileSprite;

  /**
   * Which world's grid is open, or `PICKER` for the world list.
   *
   * The AS3's `ScreenLevelSelect.selectedWorld`, and the same two-views-one-
   * screen model: `changeToWorldsFunction` (`:678`) sets it to 0 and swaps the
   * level buttons for world buttons.
   *
   * Scene state rather than a module constant now that there is something to
   * pick. It resets to the picker on every entry, matching `removed()`
   * (`:630`) — arriving from the menu should show where the player is in the
   * game, not the last grid they happened to look at.
   */
  private selectedWorld = PICKER;

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

    this.selectedWorld = PICKER;
    this.publishWorlds();
    publishDifficulty(this);

    const offStart = GameEvents.subscribe(
      'ui:start-game',
      ({ world, level, difficulty, sandbox, equipped }) => {
        if (!this.mayStart(world, level, sandbox)) return;
        this.scene.start(SceneKeys.Gameplay, { world, level, difficulty, sandbox, equipped });
      },
    );
    const offDifficulty = GameEvents.subscribe('ui:set-difficulty', ({ difficulty }) => {
      // The medal counts the grid shows are per-difficulty, so a change has to
      // republish the rows as well as the buttons. The world tallies are not —
      // they show all three tiers at once — so the picker needs no republish.
      chooseDifficulty(this, difficulty);
      if (this.selectedWorld !== PICKER) this.publishLevels();
    });
    const offWorld = GameEvents.subscribe('ui:select-world', ({ world }) => {
      this.selectWorld(world);
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
      offDifficulty();
      offWorld();
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
   * Opens a world's grid, or returns to the picker with `PICKER`.
   *
   * Refuses a locked world for the same reason `mayStart` refuses a locked
   * level: `ui:select-world` is an ordinary event and `disabled` on a React
   * button is presentation, not enforcement. A locked world in the AS3 is
   * simply inert — `handleWorldButtons` (`:1324`) tests
   * `clicked && !isLocked` and does nothing otherwise, with no message and no
   * shake — so refusing silently is faithful as well as simple.
   */
  private selectWorld(world: number): void {
    if (world === PICKER) {
      this.selectedWorld = PICKER;
      this.publishWorlds();
      return;
    }

    if (!isWorldUnlocked(getPlayerProfile(this).progress, world)) {
      console.warn(`[LevelSelectScene] Refused locked world ${world}.`);
      return;
    }

    this.selectedWorld = world;
    this.publishWorlds();
    this.publishLevels();
  }

  /**
   * Publishes the picker's rows, and which view is showing.
   *
   * Sent even while a grid is open so React knows to render the grid rather
   * than the picker, and so the back control has the world list to return to
   * without a second round trip.
   */
  private publishWorlds(): void {
    GameEvents.emit('worlds:listed', {
      selected: this.selectedWorld,
      worlds: worldUnlockStates(getPlayerProfile(this).progress),
    });
  }

  /**
   * Publishes the open world's levels with their unlock state.
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
    const world = this.selectedWorld;
    if (world === PICKER) return;

    GameEvents.emit('levels:listed', {
      world,
      worldName: Worlds[world - 1] ?? `World ${world}`,
      levels: levelUnlockStates(profile.progress, world, getDifficulty(this)),
    });
  }
}
