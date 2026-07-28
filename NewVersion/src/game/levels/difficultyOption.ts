/**
 * The chosen difficulty — `ScreenLevelSelect.levelDifficulty`.
 *
 * ── It is a preference, not progress ──────────────────────────────────────
 * `SaveManager.as` writes it to the **options** SharedObject alongside the
 * volume settings (`:793`, `:845`) and reads it back at `:859`, defaulting to
 * `"Easy"` on reset (`:837`). It is *not* one of the 63 save-string fields.
 *
 * That placement is worth stating because the natural mistake is the other one.
 * Difficulty looks like save data — it decides which of the three progress
 * slots a result lands in — but the original keeps it per *player*, not per
 * slot. Putting it in `SaveSlotData` would change the save format for nothing
 * and would make a player who switches slots re-pick their difficulty.
 *
 * ── Two independent difficulties in the original ──────────────────────────
 * The same three buttons write `ScreenLevelSelect.levelDifficulty` on the level
 * select, options and status screens, and a *separate*
 * `ScreenEnemies.enemyDifficulty` on the enemies screen
 * (`ButtonGameDifficulty.as:50-57`). Only the first is modelled here; the
 * bestiary has no difficulty control in this port yet.
 */

import type { SaveStore } from '../save/SaveStore';
import type { Difficulty } from '../config/constants';

/** Key verbatim from `SaveManager.as:793`. */
export const LEVEL_DIFFICULTY_KEY = 'levelDifficulty';

/** `SaveManager.as:837` — the reset default. */
export const DEFAULT_DIFFICULTY: Difficulty = 'Easy';

const VALID: readonly Difficulty[] = ['Easy', 'Medium', 'Hard'];

/**
 * Narrows a stored value, falling back to the default.
 *
 * The store round-trips JSON from `localStorage`, which anything can have
 * written. A bad value must not reach `getDifficultyProfile`, whose record
 * lookup would yield `undefined` and take enemy stats to `NaN` — silently, and
 * only once a level started.
 */
export function coerceDifficulty(value: unknown): Difficulty {
  return VALID.includes(value as Difficulty) ? (value as Difficulty) : DEFAULT_DIFFICULTY;
}

export function readDifficulty(store: SaveStore): Difficulty {
  return coerceDifficulty(store.get<string>(LEVEL_DIFFICULTY_KEY, DEFAULT_DIFFICULTY));
}

export function writeDifficulty(store: SaveStore, difficulty: Difficulty): void {
  store.set(LEVEL_DIFFICULTY_KEY, coerceDifficulty(difficulty));
  store.flush();
}

/**
 * Deliberately no store-opening helper here.
 *
 * Difficulty shares the options SharedObject with the audio preferences, and
 * `SaveStore` caches its data at construction while `flush()` rewrites the whole
 * object — so a second handle would silently drop whatever the first had
 * written. Callers take the shared handle from `save/optionsStore.ts`.
 */
