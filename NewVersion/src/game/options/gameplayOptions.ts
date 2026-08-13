/**
 * The non-audio player preferences — `ScreenOptions.as` and
 * `SaveManager.initAndLoadOptions` (`:820`).
 *
 * Deliberately a sibling of `audio/audioOptions.ts` rather than a merge: the
 * two are written to the same store but by different owners, and
 * `SoundManager` reloads the audio half on its own. Same store, same shape,
 * separate readers.
 *
 * ── `optionsInitiated` is the first-run sentinel ──────────────────────────
 * `:822` tests `optionsSave.data.optionsInitiated == null`. Absent means a
 * genuinely new player: the whole block is written with defaults, **including
 * `tutorialOn = true`**. Present means every option is read back as stored.
 *
 * That is why the tutorial switch lives here and not with the save slot.
 * Deleting a slot does not restore the tutorial; clearing the options does.
 * The three tutorial *arrays* travel with the slot; the on/off switch does not.
 *
 * ── What is deliberately absent ───────────────────────────────────────────
 * Two of `ScreenOptions`' controls are **not applicable** to this port:
 *
 * - **Graphics quality** (`ButtonOptionGraphics.as:93-101`) sets
 *   `stage.quality = LOW | MEDIUM | HIGH`, which is Flash's vector
 *   rasterisation setting. This port rasterises SVG to textures at load and
 *   renders through WebGL; there is no runtime equivalent to expose, and a
 *   control that changed nothing would be worse than its absence.
 * - **Save conversion** (`ScreenMenu.startConvertSaves`, `:341`) migrates
 *   between local and **Kongregate online** slots — `bGameSaveOnline1..3`. The
 *   third-party surface is out of scope for this port by standing decision, so
 *   there is nothing to convert. This is also the path that produced the
 *   "Overwrite?" confusion in T29: the prompt only ever fired under
 *   `convertingSaves`, which is why it looked like the port overwrote silently.
 */

import type { SaveStore } from '../save/SaveStore';

/** `:822` — absent means a first run. */
export const OPTIONS_INITIATED_KEY = 'optionsInitiated';

export const CROSSHAIR_KEY = 'optionCrosshairOn';
export const AUTO_PAUSE_KEY = 'optionAutoPauseOn';
export const WINDOW_UL_KEY = 'optionWindowUL';
export const AUTO_SELECT_KEY = 'autoSelect';
export const ACHIEVEMENT_POPUP_KEY = 'achievementPopUp';
export const TUTORIAL_ON_KEY = 'tutorialOn';

export interface GameplayOptions {
  /** `ScreenOptions.optionCrosshairOn` — draw the aiming crosshair. */
  crosshair: boolean;
  /** `optionAutoPauseOn` — pause when the window loses focus. */
  autoPause: boolean;
  /**
   * `optionWindowULOn` — **"UL" is Upgrade Limit, not upper-left.**
   *
   * It gates the "Upgrade Limit" warning window: `ScreenLevelSelect.as:1001`
   * scans the equipped loadout against the level's cap when it is on, `:1024`
   * raises the window, and `ButtonNextLevel.as:123`/`:147` do the same from the
   * results screen. The window's "don't show this message again" checkbox is
   * this flag.
   *
   * **Nothing reads it here and no options row offers it** — the cap mechanic
   * is deliberately unported (`A11`), so the toggle governed a warning about a
   * rule that does not exist. Kept in the type and the store so an existing
   * player's stored value round-trips rather than being dropped on the next
   * save; see `A11` for what reinstating it would take.
   */
  windowUL: boolean;
  /**
   * `LevelGuide.autoSelect` — whether the level guide follows your progress.
   *
   * **It does not start anything**, despite reading like it might.
   * `ButtonLevelGuideAutoSelect.as:60` spells it out: "Automatically selects the
   * upcoming level for the level guide and the level select screen." On, the
   * guide re-points at the upcoming level whenever one finishes
   * (`ScreenGame.as:359`, `ScreenStatus.as:512-515`) and a manual pick in level
   * select does *not* write back; off, the guide stays where you put it and
   * manual picks do write back (`ScreenLevelSelect.as:988`, `:1326`).
   */
  autoSelect: boolean;
  /** `PartAchievements.achievementPopUp` — toast on earning one. */
  achievementPopUp: boolean;
  /** `PartTutorial.tutorialOn`. */
  tutorialOn: boolean;
}

/**
 * The first run's defaults — `SaveManager.as:824-831`, **with two changed**.
 *
 * The AS3 writes all six `true`. `crosshair` and `tutorialOn` are `false` here
 * by decision — divergence `A13`. Both remain switchable on the options screen
 * and both persist normally once touched; only the value a brand-new profile
 * starts with differs.
 *
 * The AS3 values are kept beside this rather than in a comment, so the
 * divergence is a diff between two objects rather than a claim about one.
 */
export const DEFAULT_GAMEPLAY_OPTIONS: GameplayOptions = {
  crosshair: false,
  autoPause: true,
  windowUL: true,
  autoSelect: true,
  achievementPopUp: true,
  tutorialOn: false,
};

/**
 * `:824-831` exactly, kept as documentation. Nothing reads it at runtime.
 *
 * **`tutorialOn` is the consequential one.** `ScreenGame.as:390` builds the
 * tutorial layer on `tutorialOn && !tutorialCompleted`, so defaulting it off
 * does not postpone onboarding — it removes it for any player who never opens
 * the options screen. Asked for explicitly and recorded in `A13`.
 */
export const AS3_DEFAULT_GAMEPLAY_OPTIONS: GameplayOptions = {
  crosshair: true,
  autoPause: true,
  windowUL: true,
  autoSelect: true,
  achievementPopUp: true,
  tutorialOn: true,
};

/** Whether this store has ever been written — `:822`. */
export function optionsInitiated(store: SaveStore): boolean {
  return store.has(OPTIONS_INITIATED_KEY);
}

/**
 * Reads the preferences, or the first-run defaults.
 *
 * **The branch is the AS3's, not a convenience.** On a first run every value is
 * a default *and gets written*; afterwards every value is whatever is stored,
 * including a `false` the player chose. Collapsing the two into "default when
 * missing" would silently re-enable anything the player turned off, because a
 * stored `false` and an absent key are the same to a naive read.
 */
export function readGameplayOptions(store: SaveStore): GameplayOptions {
  if (!optionsInitiated(store)) return { ...DEFAULT_GAMEPLAY_OPTIONS };

  const read = (key: string, fallback: boolean): boolean => store.get(key, fallback);

  return {
    crosshair: read(CROSSHAIR_KEY, DEFAULT_GAMEPLAY_OPTIONS.crosshair),
    autoPause: read(AUTO_PAUSE_KEY, DEFAULT_GAMEPLAY_OPTIONS.autoPause),
    windowUL: read(WINDOW_UL_KEY, DEFAULT_GAMEPLAY_OPTIONS.windowUL),
    autoSelect: read(AUTO_SELECT_KEY, DEFAULT_GAMEPLAY_OPTIONS.autoSelect),
    achievementPopUp: read(ACHIEVEMENT_POPUP_KEY, DEFAULT_GAMEPLAY_OPTIONS.achievementPopUp),
    tutorialOn: read(TUTORIAL_ON_KEY, DEFAULT_GAMEPLAY_OPTIONS.tutorialOn),
  };
}

/** Writes the preferences and marks the store initiated — `:833-846`. */
export function writeGameplayOptions(store: SaveStore, options: GameplayOptions): void {
  // Set first, so a crash mid-write cannot leave the store looking fresh and
  // silently restore every default on the next launch.
  store.set(OPTIONS_INITIATED_KEY, true);
  store.set(CROSSHAIR_KEY, options.crosshair);
  store.set(AUTO_PAUSE_KEY, options.autoPause);
  store.set(WINDOW_UL_KEY, options.windowUL);
  store.set(AUTO_SELECT_KEY, options.autoSelect);
  store.set(ACHIEVEMENT_POPUP_KEY, options.achievementPopUp);
  store.set(TUTORIAL_ON_KEY, options.tutorialOn);
}
