/**
 * Resolves an enemy's spawn-time stats — the port of `PartGameArea.spawnEnemy`'s
 * stat block (around line 3266) plus `PartGameArea.getTotalHealth`.
 *
 * This is where three previously-separate ports meet: the base tables from
 * `ScreenGame.enemy*Stats`, the difficulty multipliers from
 * `DifficultyMultipliers`, and the per-level tier from the level tables.
 *
 * ── Two independent scaling axes ──────────────────────────────────────────
 *   difficulty  the player's Easy/Medium/Hard choice
 *   tier        the enemy's own level suffix, "1" | "2" | "3" | "B"
 *
 * They multiply together for damage and health. Two rules are easy to miss:
 *
 *   1. **Bosses are exempt from the difficulty health multiplier.**
 *      `getTotalHealth` sets it to 1 for `enemyLevel == "B"` — a boss is
 *      already scaled by its own stat table, so difficulty must not stack on
 *      top. The tier multiplier is likewise 1 for bosses.
 *   2. **Boss health and money are NOT divided by the level's boss count.**
 *      Divergence `A95`. The AS3 divides both by `ScreenGame.bossAmount`
 *      (`PartInterface.as:971`), so three bosses split one boss's worth of
 *      health and reward rather than tripling it. This port does not, for two
 *      reasons — and the second is the one that settles it:
 *
 *        - the redesigned campaign runs boss levels up to ten bosses deep, and
 *          under the AS3 rule a ten-boss level is one boss's health cut into
 *          ten pieces that splash clears faster than the single boss it
 *          replaced. **More bosses made the level easier**, which inverts what
 *          the level is for;
 *        - **the divisor never reached the running game.** `Enemy.spawn` is
 *          its sole call site and has never passed a count, so every boss this
 *          port has ever spawned already had full health. Deleting it makes
 *          the code say what the game does; it does not change what the game
 *          does. That is why this lands with no balance change to observe.
 *
 *      What keeps a ten-boss level survivable is `MAX_BOSSES_ALIVE` in
 *      `waves/waveState.ts`: at most four are out at once and the rest queue
 *      behind their deaths.
 *
 * Rounding is applied exactly where the AS3 applies it: `Math.round` on damage,
 * health, money and reload time, nothing on the speeds. Boss money is rounded
 * to the nearest 10 (`round(x / 10) * 10`).
 */

import { ENEMY_STATS } from './enemyStatsData';
import type { EnemyBaseStats } from './enemyStatsData';
import { DIFFICULTY_PROFILES, ENEMY_TIER_MULTIPLIERS } from '../config/difficultyMultipliers';
import type { Difficulty, EnemyLevel } from '../config/constants';

/** Stats as an enemy is actually spawned with. */
export interface ResolvedEnemyStats {
  damage: number;
  health: number;
  money: number;
  moveSpeedMax: number;
  accSpeed: number;
  rotSpeedMax: number;
  particle: string;
  shoot: boolean;
  shootType?: string;
  shootAngle?: string;
  /** Frames between shots at 30 fps. */
  reloadTimeMax?: number;
  bulletAmount?: number;
}

/** Base table for a type and variant, or undefined for an unknown type. */
export function getBaseStats(type: string, level: EnemyLevel): EnemyBaseStats | undefined {
  const variants = ENEMY_STATS[type];
  if (!variants) return undefined;
  return level === 'B' ? variants.boss : variants.normal;
}

export function isBossLevel(level: EnemyLevel): boolean {
  return level === 'B';
}

/**
 * Applies difficulty and tier scaling to a base table.
 *
 * Returns undefined for an unknown enemy type rather than throwing — a level
 * table naming a type with no stats is a data problem worth surfacing, but not
 * one that should take the game down mid-spawn.
 */
/**
 * How much faster than the original an enemy turns — **divergence `A12`**.
 *
 * ── This is a tuning decision, not a bug fix ──────────────────────────────
 * The port's movement is a faithful transcription of `PartGameArea.as`'s four
 * steps, the frame scaling is correct, and the stat rows match the source
 * exactly. **Nothing was broken.** `enemyBasicStats[5]` really is `1`, meaning
 * one degree per frame — 30 degrees a second — and the AS3 has no friction on a
 * live enemy at all, so velocity only re-aims as fast as the facing does.
 *
 * Measured on the shipped module, a Basic enemy at full speed with the tank 300
 * units behind it took **176 frames (5.9s)** to come about. Against a moving
 * player that is never: the enemy sails past and cannot correct, which reads as
 * ice-skating. Doubled, the same reversal takes **88 frames (2.9s)**.
 *
 * ── Why the turn rate and not friction ────────────────────────────────────
 * Acceleration is not the limiter — at `accSpeed 0.2` toward `moveSpeedMax 1.5`
 * an enemy is at top speed in 7.5 frames, some 23x quicker than it can turn.
 * Adding damping would invent a force the original does not have and make
 * enemies feel sluggish rather than accurate; raising the turn cap fixes the
 * thing that is actually slow.
 *
 * ── x2 specifically ───────────────────────────────────────────────────────
 * The conservative option of the three measured. It keeps every type's relative
 * agility — the multiplier is global, so Fast still out-turns Basic by the same
 * ratio — and leaves enemies committing to a path long enough for Flag and
 * Defense to play as designed. x3 (2.0s) and x6 (1.0s) were measured and
 * rejected as too far from the original's feel.
 *
 * **The AS3 values stay untouched in `enemyStatsData.ts`**, which is generated
 * from the source and checked by `data:check`. This multiplies at resolve time
 * so the baseline remains readable and revertable: set this to 1.
 */
export const ENEMY_TURN_MULTIPLIER = 2;

/** The AS3's own value, kept as documentation. Nothing reads it at runtime. */
export const AS3_ENEMY_TURN_MULTIPLIER = 1;

export function resolveEnemyStats(
  type: string,
  level: EnemyLevel,
  difficulty: Difficulty,
): ResolvedEnemyStats | undefined {
  const base = getBaseStats(type, level);
  if (!base) return undefined;

  const profile = DIFFICULTY_PROFILES[difficulty];
  const boss = isBossLevel(level);
  const tier = ENEMY_TIER_MULTIPLIERS[level];

  // getTotalHealth: bosses take neither the difficulty nor the tier multiplier.
  const healthMultiplier = boss ? 1 : profile.enemyHealth * tier;
  const damageMultiplier = profile.enemyDamage * tier;

  const resolved: ResolvedEnemyStats = {
    damage: Math.round(base.damage * damageMultiplier),
    // No `/ bossAmount` — see rule 2 in the module docstring (`A95`). A boss
    // on a ten-boss level is the same boss it would be alone.
    health: Math.round(base.health * healthMultiplier),
    money: boss ? Math.round(base.money / 10) * 10 : Math.round(base.money * tier),
    moveSpeedMax: base.moveSpeedMax * profile.enemySpeed,
    accSpeed: base.accSpeed * profile.enemySpeed,
    // **Divergence `A12`** — see `ENEMY_TURN_MULTIPLIER`. Applied on top of the
    // difficulty's own rotation multiplier rather than folded into it, so the
    // AS3's 1.0 / 1.1 / 1.2 ladder still reads straight off the source.
    rotSpeedMax: base.rotSpeedMax * profile.enemyRotation * ENEMY_TURN_MULTIPLIER,
    particle: base.particle,
    shoot: base.shoot,
  };

  if (base.shoot) {
    resolved.shootType = base.shootType;
    resolved.shootAngle = base.shootAngle;
    resolved.reloadTimeMax = Math.round((base.reloadTimeMax ?? 0) * profile.reloadTime);
    resolved.bulletAmount = base.bulletAmount;
  }

  return resolved;
}

/**
 * Total health a level's enemies represent, useful for pacing checks.
 * Sums each composition entry's resolved health times its count.
 */
export function totalLevelHealth(
  enemies: readonly { type: string; level: EnemyLevel; count: number }[],
  difficulty: Difficulty,
): number {
  return enemies.reduce((sum, entry) => {
    const stats = resolveEnemyStats(entry.type, entry.level, difficulty);
    return stats ? sum + stats.health * entry.count : sum;
  }, 0);
}

/** Enemy types that fire bullets — their shoot columns are populated. */
export function isShooter(type: string): boolean {
  return ENEMY_STATS[type]?.normal.shoot ?? false;
}
