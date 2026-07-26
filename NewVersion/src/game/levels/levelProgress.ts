/**
 * Port of the progress logic in `SWFimported/scripts/ScreenLevelSelect.as`.
 *
 * The screen's rendering (level buttons, world carousel, tweens, particles) is
 * not ported: it becomes a React screen. What is ported is the part that
 * decides what the player has actually achieved, which everything else — the
 * level grid, the level guide, and 15 of the 36 achievements — reads from.
 *
 * ── The progress table ────────────────────────────────────────────────────
 * `worldsValuesArrays[world][level]` is a triple, and **the order is
 * Hard, Medium, Easy** — not the other way round:
 *
 *     index 0 -> value earned on Hard
 *     index 1 -> value earned on Medium
 *     index 2 -> value earned on Easy
 *
 * The "value" is the level's medal count (0-3).
 *
 * That ordering is load-bearing and easy to get backwards. It exists because
 * clearing a level on a *harder* difficulty also satisfies every easier one, so
 * a query for Easy takes the best of all three slots, Medium takes the best of
 * the first two, and Hard takes only the first. `getLevelValues` implements
 * exactly that cascade.
 */

import { getLevel, LEVELS } from './levelData';
import type { LevelMode } from './levelData';
import type { Difficulty } from '../config/constants';

/** Medals earned per difficulty: [hard, medium, easy]. */
export type LevelValues = [number, number, number];
/** One world's levels. */
export type WorldProgress = LevelValues[];
/** All nine worlds. Indexed [world - 1][level - 1]. */
export type ProgressTable = WorldProgress[];

/** Maximum medals per level. */
export const MAX_LEVEL_VALUE = 3;

/**
 * ScreenLevelSelect.as compares `difficulty <= 2` and `difficulty == 1`, so the
 * ranks are Easy 1, Medium 2, Hard 3 — the same mapping ScreenAchievements uses
 * for its win states.
 */
export const DIFFICULTY_RANK: Record<Difficulty, number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

/** Slot in a `LevelValues` triple that a difficulty writes to. */
export const DIFFICULTY_SLOT: Record<Difficulty, 0 | 1 | 2> = {
  Hard: 0,
  Medium: 1,
  Easy: 2,
};

/**
 * `ScreenLevelSelect.initWorldValues()` — an all-zero table sized from the real
 * level tables.
 *
 * The AS3 has a redundant `if (i + 1 <= 6)` whose branches are identical; it
 * pushes `[0,0,0]` either way. Collapsed here.
 */
export function createEmptyProgress(): ProgressTable {
  return LEVELS.map((world) => world.map(() => [0, 0, 0] as LevelValues));
}

/**
 * `ScreenLevelSelect.getLevelValues(world, level, difficulty)` — best medal
 * count visible at the given difficulty. 1-based world and level.
 *
 * Returns 0 for an out-of-range lookup; the AS3 would throw on a bad index, but
 * a crash in a level grid is worse than a blank cell.
 */
export function getLevelValues(
  progress: ProgressTable,
  world: number,
  level: number,
  difficulty: Difficulty,
): number {
  const values = progress[world - 1]?.[level - 1];
  if (!values) return 0;
  return bestValueFor(values, DIFFICULTY_RANK[difficulty]);
}

/** The cascade: Hard sees slot 0; Medium also slot 1; Easy also slot 2. */
function bestValueFor(values: LevelValues, rank: number): number {
  let best = values[0];
  if (rank <= 2 && values[1] > best) best = values[1];
  if (rank === 1 && values[2] > best) best = values[2];
  return best;
}

/**
 * `ScreenLevelSelect.getCurrentWorldAndLevel()` — the first level with nothing
 * earned on any difficulty, i.e. where the player is up to.
 *
 * Returns `[0, 0]` when every level in every scanned world has been played,
 * exactly as the AS3 does (its locals stay at their 0 initialisers).
 *
 * `totalWorlds` limits the scan to the worlds actually unlocked, matching
 * `ScreenLevelSelect.totalWorlds`.
 */
export function getCurrentWorldAndLevel(
  progress: ProgressTable,
  totalWorlds: number = progress.length,
): [number, number] {
  const limit = Math.min(totalWorlds, progress.length);
  for (let w = 0; w < limit; w += 1) {
    const world = progress[w];
    for (let l = 0; l < world.length; l += 1) {
      const values = world[l];
      if (values[0] === 0 && values[1] === 0 && values[2] === 0) {
        return [w + 1, l + 1];
      }
    }
  }
  return [0, 0];
}

/** Worlds available without premium — Main.as:319. */
export const FREE_WORLD_COUNT = 6;
/** Worlds available with premium — Main.as:315. */
export const PREMIUM_WORLD_COUNT = 9;

/**
 * `SaveManager.setWorldAndLevel()` — the human-readable progress label stored
 * in the `wl` save field and shown on the save-slot list.
 *
 * Two details are load-bearing:
 *   - the separator is **two spaces**: "World 3  Level 12"
 *   - when every scanned level has been played the label is hardcoded to
 *     "World 6  Level 45" for a free save, because a free save only ever
 *     scans 6 worlds. A premium save reports "Premium Completed" instead.
 *
 * Returns "" when there are no worlds to scan; the AS3 falls out of its loop
 * with an uninitialised local there, which coerces to null on a String return.
 */
export function formatWorldAndLevel(
  progress: ProgressTable,
  totalWorlds: number = progress.length,
  hasPremium = false,
): string {
  const limit = Math.min(totalWorlds, progress.length);
  if (limit <= 0) return '';

  const [world, level] = getCurrentWorldAndLevel(progress, limit);
  if (world > 0) return `World ${world}  Level ${level}`;

  return hasPremium
    ? 'Premium Completed'
    : `World ${FREE_WORLD_COUNT}  Level ${LEVELS[FREE_WORLD_COUNT - 1]?.length ?? 45}`;
}

/**
 * Achievement category -> the level mode it counts.
 * ScreenLevelSelect.getTotalValues()'s leading switch.
 */
export const TOTALS_TYPE_TO_MODE: Record<string, LevelMode> = {
  Stars: 'Normal',
  Flags: 'Flag',
  Towers: 'Tower',
  Shields: 'Defense',
  Bosses: 'Boss',
};

export type TotalsType = keyof typeof TOTALS_TYPE_TO_MODE;

/**
 * `ScreenLevelSelect.getTotalValues(type, difficulty)` — sums the best medal
 * count across every level of one mode.
 *
 * This is what the 15 `NumberArray` achievements (Stars/Flags/Towers/Shields/
 * Bosses, three tiers each) are measured against.
 */
export function getTotalValues(
  progress: ProgressTable,
  type: TotalsType,
  difficulty: Difficulty,
): number {
  const mode = TOTALS_TYPE_TO_MODE[type];
  const rank = DIFFICULTY_RANK[difficulty];
  let total = 0;

  for (let w = 0; w < progress.length; w += 1) {
    const world = progress[w];
    for (let l = 0; l < world.length; l += 1) {
      if (getLevel(w + 1, l + 1)?.mode !== mode) continue;
      total += bestValueFor(world[l], rank);
    }
  }
  return total;
}

/**
 * The `[hard, medium, easy]` triple the NumberArray achievements consume.
 *
 * ScreenAchievements.as:524 builds this as
 * `[getTotalValues(type, 3), getTotalValues(type, 2), getTotalValues(type, 1)]`,
 * which is why `evaluate()` checks index 0 first and awards state 3.
 */
export function getAchievementTiers(
  progress: ProgressTable,
  type: TotalsType,
): [number, number, number] {
  return [
    getTotalValues(progress, type, 'Hard'),
    getTotalValues(progress, type, 'Medium'),
    getTotalValues(progress, type, 'Easy'),
  ];
}

/**
 * Records a level result, keeping the best medal count for that difficulty.
 *
 * The AS3 writes `worldsValuesArrays[...][slot]` from several places rather
 * than through one helper; this centralises it so the "never downgrade" rule
 * lives in one spot.
 */
export function recordLevelResult(
  progress: ProgressTable,
  world: number,
  level: number,
  difficulty: Difficulty,
  value: number,
): ProgressTable {
  const existing = progress[world - 1]?.[level - 1];
  if (!existing) return progress;

  const slot = DIFFICULTY_SLOT[difficulty];
  const clamped = Math.max(0, Math.min(MAX_LEVEL_VALUE, Math.trunc(value)));
  if (clamped <= existing[slot]) return progress;

  const next = progress.map((w) => w.map((values) => [...values] as LevelValues));
  next[world - 1][level - 1][slot] = clamped;
  return next;
}

/** True when the level has been cleared at all, on any difficulty. */
export function isLevelCleared(
  progress: ProgressTable,
  world: number,
  level: number,
): boolean {
  const values = progress[world - 1]?.[level - 1];
  if (!values) return false;
  return values[0] > 0 || values[1] > 0 || values[2] > 0;
}
