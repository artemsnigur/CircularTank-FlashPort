/**
 * What the bestiary's two selector rows are set to — `ScreenEnemies`'
 * `enemyDifficulty` (`:62`) and `selectedEnemyLevel` (`:161`).
 *
 * ── Why this is its own module, and a leaf ────────────────────────────────
 * `BestiaryScreen` is barred by test from importing `bestiaryData`,
 * `enemyKnowledge`, `bestiaryArt` or `bestiaryStats`: with any of them it could
 * look up an enemy the player has never met and render it, and the withholding
 * that the whole screen is built around would be one careless edit from
 * failing quietly.
 *
 * But the screen does need to *draw the buttons*, which means the tier list and
 * its labels. Putting those beside the stats table would have forced a choice
 * between loosening the guard and duplicating the labels. So they live here,
 * where there is nothing to leak: this module imports no enemy data at all, and
 * that is the property worth preserving if anything is ever added to it.
 */
import type { Difficulty, EnemyLevel } from '../config/constants';

/**
 * The four stat values a row shows. The *shape* lives here rather than beside
 * the formula so the screen can type its props without importing the table it
 * is forbidden to look things up in.
 */
export interface BestiaryStats {
  /** `Money: N$` — `:546`. */
  money: number;
  /** `Health: N HP` — `:547`. */
  health: number;
  /** `Damage: N HP` — `:548`. */
  damage: number;
  /** Pixels per second, rounded as the screen rounds it. */
  speed: number;
  /**
   * The top of the speed range, when this type has one.
   *
   * `undefined` for the 18 types that move at one speed — which is what lets a
   * view print "40" against "40-160" without a second flag.
   */
  speedMax?: number;
}

/** Screen-wide in the original, and screen-wide here: one setting, twenty rows. */
export interface BestiaryView {
  difficulty: Difficulty;
  tier: EnemyLevel;
}

/**
 * `ScreenEnemies.as:62` and `:161`.
 *
 * Deliberately **not** the difficulty the player last played on: these are
 * independent statics in the original, so the bestiary opens on Easy tier 1
 * whatever the save says, and does not remember a change across a visit.
 */
export const DEFAULT_BESTIARY_VIEW: BestiaryView = { difficulty: 'Easy', tier: '1' };

/** The four tiers the selector offers, in `ScreenEnemies.as:589-611` order. */
export const BESTIARY_TIERS: readonly EnemyLevel[] = ['1', '2', '3', 'B'];

/** How a tier is labelled on its button — `ButtonEnemyLevel*.myLevel`, `:165-168`. */
export const TIER_LABEL: Record<EnemyLevel, string> = {
  '1': '1',
  '2': '2',
  '3': '3',
  B: 'Boss',
};
