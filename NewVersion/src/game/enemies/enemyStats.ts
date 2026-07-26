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
 *   2. **Boss health and money are divided by `bossAmount`**, the number of
 *      bosses the level spawns, so three bosses split one boss's worth of
 *      health and reward rather than tripling it.
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

export interface ResolveOptions {
  /** `ScreenGame.bossAmount` — how many bosses this level spawns. */
  bossAmount?: number;
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
export function resolveEnemyStats(
  type: string,
  level: EnemyLevel,
  difficulty: Difficulty,
  { bossAmount = 1 }: ResolveOptions = {},
): ResolvedEnemyStats | undefined {
  const base = getBaseStats(type, level);
  if (!base) return undefined;

  const profile = DIFFICULTY_PROFILES[difficulty];
  const boss = isBossLevel(level);
  const tier = ENEMY_TIER_MULTIPLIERS[level];

  // getTotalHealth: bosses take neither the difficulty nor the tier multiplier.
  const healthMultiplier = boss ? 1 : profile.enemyHealth * tier;
  const damageMultiplier = profile.enemyDamage * tier;

  // Guard against a zero or negative bossAmount producing Infinity/NaN.
  const divisor = boss && bossAmount > 0 ? bossAmount : 1;

  const resolved: ResolvedEnemyStats = {
    damage: Math.round(base.damage * damageMultiplier),
    health: Math.round((base.health * healthMultiplier) / divisor),
    money: boss
      ? Math.round(base.money / divisor / 10) * 10
      : Math.round(base.money * tier),
    moveSpeedMax: base.moveSpeedMax * profile.enemySpeed,
    accSpeed: base.accSpeed * profile.enemySpeed,
    rotSpeedMax: base.rotSpeedMax * profile.enemyRotation,
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
  options: ResolveOptions = {},
): number {
  return enemies.reduce((sum, entry) => {
    const stats = resolveEnemyStats(entry.type, entry.level, difficulty, options);
    return stats ? sum + stats.health * entry.count : sum;
  }, 0);
}

/** Enemy types that fire bullets — their shoot columns are populated. */
export function isShooter(type: string): boolean {
  return ENEMY_STATS[type]?.normal.shoot ?? false;
}
