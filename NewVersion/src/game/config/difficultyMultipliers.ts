/**
 * Port of `SWFimported/scripts/DifficultyMultipliers.as` (Core systems).
 *
 * A bag of static tuning constants in AS3, with no behaviour attached. Values
 * are transcribed verbatim — do not round or "tidy" them; they are balance
 * data and the original's feel depends on them exactly.
 *
 * Two independent axes are encoded here despite the class name:
 *   - **difficulty** (Easy / Medium / Hard) — the player's chosen setting
 *   - **enemy tier** (`multiplierLevel2` / `multiplierLevel3`) — applied per
 *     enemy variant, not per difficulty
 *
 * Easy has no entries because it is the baseline: every Easy multiplier is an
 * implicit 1. `EASY` below is spelled out anyway so callers can index by
 * difficulty without a special case.
 */

import type { Difficulty, EnemyLevel } from './constants';

/** One difficulty's full set of multipliers. */
export interface DifficultyProfile {
  /** Enemies spawned per wave. */
  amount: number;
  /** Delay between spawns — *lower is harder*. */
  spawnRate: number;
  enemyHealth: number;
  enemyDamage: number;
  enemySpeed: number;
  enemyRotation: number;
  /** Player weapon reload time — *lower is harder* (enemies fire faster). */
  reloadTime: number;
  enemyBulletSpeed: number;
}

/** Baseline. AS3 has no Easy constants; every multiplier is 1. */
export const EASY: DifficultyProfile = {
  amount: 1,
  spawnRate: 1,
  enemyHealth: 1,
  enemyDamage: 1,
  enemySpeed: 1,
  enemyRotation: 1,
  reloadTime: 1,
  enemyBulletSpeed: 1,
};

/** DifficultyMultipliers.as — `*Medium` constants. */
export const MEDIUM: DifficultyProfile = {
  amount: 1, // multiplierAmountMedium
  spawnRate: 0.95, // multiplierSpawnRateMedium
  enemyHealth: 1.225, // multiplierHealthMedium
  enemyDamage: 1.225, // multiplierDamageMedium
  enemySpeed: 1.1, // multiplierSpeedMedium
  enemyRotation: 1.1, // multiplierRotationMedium
  reloadTime: 0.85, // multiplierReloadTimeMedium
  enemyBulletSpeed: 1.15, // multiplierBulletSpeedMedium
};

/** DifficultyMultipliers.as — `*Hard` constants. */
export const HARD: DifficultyProfile = {
  amount: 1, // multiplierAmountHard
  spawnRate: 0.9, // multiplierSpawnRateHard
  enemyHealth: 1.4, // multiplierHealthHard
  enemyDamage: 1.4, // multiplierDamageHard
  enemySpeed: 1.2, // multiplierSpeedHard
  enemyRotation: 1.2, // multiplierRotationHard
  reloadTime: 0.7, // multiplierReloadTimeHard
  enemyBulletSpeed: 1.3, // multiplierBulletSpeedHard
};

export const DIFFICULTY_PROFILES: Record<Difficulty, DifficultyProfile> = {
  Easy: EASY,
  Medium: MEDIUM,
  Hard: HARD,
};

/**
 * Per-enemy-tier scaling, orthogonal to difficulty.
 *
 * DifficultyMultipliers.as — `multiplierLevel2` / `multiplierLevel3`. Note
 * they are numerically identical to the Medium/Hard health and damage
 * multipliers (1.225 / 1.4); they are kept separate because they are applied
 * on a different axis and could diverge during balancing.
 *
 * Bosses ("B") are not a tier: PartGameArea.getTotalHealth leaves their tier
 * multiplier at 1, exempts them from the *difficulty* multiplier as well, and
 * divides total health by `ScreenGame.bossAmount` instead. That rule belongs
 * with the enemy port, not here.
 */
export const ENEMY_TIER_MULTIPLIERS = {
  /** Tier 1 enemies are unscaled; AS3 has no constant for this. */
  '1': 1,
  '2': 1.225, // multiplierLevel2
  '3': 1.4, // multiplierLevel3
  B: 1, // bosses bypass tier scaling entirely
} as const satisfies Record<EnemyLevel, number>;

export const getDifficultyProfile = (difficulty: Difficulty): DifficultyProfile =>
  DIFFICULTY_PROFILES[difficulty];
