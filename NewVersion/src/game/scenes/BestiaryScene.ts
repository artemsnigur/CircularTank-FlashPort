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
import { DEFAULT_BESTIARY_VIEW, buildBestiaryListing } from '../enemies/enemyKnowledge';
import type { BestiaryView } from '../enemies/enemyKnowledge';
import { BESTIARY } from '../enemies/bestiaryData';

/**
 * DEV-AID: reveal the whole bestiary, from `?known=all`.
 *
 * A fresh profile knows exactly one enemy — `Basic` — which has **no**
 * strengths and no weaknesses. So the default state renders only the frame-1
 * "none" badge, and the 16 typed badges cannot be photographed at all without
 * playing far enough to meet the enemies that have them.
 *
 * That is the gap T99 recorded and could not close for achievements ("no dev
 * aid to grant one on a fresh profile"). Here it is one line, and the alternative
 * — the harness writing a hand-serialised save into `localStorage` — would
 * couple the look script to the save format for no gain.
 *
 * DEV builds only, and it does not touch the profile: nothing is written, so a
 * run with the flag leaves the save exactly as it found it.
 */
function devKnownEnemies(): string[] | null {
  if (!import.meta.env.DEV) return null;
  if (typeof window === 'undefined') return null;
  if (new URLSearchParams(window.location.search).get('known') !== 'all') return null;
  return BESTIARY.map((entry) => entry.displayName);
}

export class BestiaryScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.TileSprite;

  /**
   * The selector state — `ScreenEnemies.enemyDifficulty` and
   * `selectedEnemyLevel`. Opens on Easy / tier 1 every time, as the original's
   * statics do.
   */
  private view: BestiaryView = DEFAULT_BESTIARY_VIEW;

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

    /**
     * The two selector rows. React emits, this holds the selection and
     * republishes — the shape `setGameplayOption` established, and required
     * here rather than preferred: the stats are withheld per row, so only the
     * side that knows what the player has met can recompute them.
     *
     * Not persisted, matching the original: `enemyDifficulty` and
     * `selectedEnemyLevel` are plain statics, reset when the SWF reloads.
     */
    const offView = GameEvents.subscribe('ui:bestiary-view', (view) => {
      this.view = view;
      this.publishBestiary();
    });

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
      offView();
      GameEvents.off('viewport:changed', onResize);
      GameEvents.emit('scene:shutdown', { key: SceneKeys.Bestiary });
    });

    GameEvents.emit('scene:ready', { key: SceneKeys.Bestiary });
  }

  private publishBestiary(): void {
    // The listing is built by a pure function so the withholding rule is
    // testable without standing up a scene — see enemyKnowledge.test.ts.
    GameEvents.emit(
      'bestiary:listed',
      buildBestiaryListing(
        devKnownEnemies() ?? getPlayerProfile(this).slot.knownEnemies,
        this.view,
      ),
    );
  }
}
