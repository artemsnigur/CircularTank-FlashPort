/**
 * The bestiary's stat block — `ScreenEnemies.as:485-567`.
 *
 * Four lines (money, health, damage, speed) for one enemy at one tier on one
 * difficulty, which the screen's two selector rows drive.
 *
 * ── Why this is its own formula and not `resolveEnemyStats` ───────────────
 * They agree on every tier the player can meet, and it is worth saying exactly
 * where they stop agreeing rather than papering over it:
 *
 *  - **Tiers 1-3 are identical.** Health `base x difficulty x tier`, damage the
 *    same, money `base x tier`. `bestiaryStats.test.ts` drives that agreement
 *    against the real resolver rather than asserting it here, because two
 *    formulas that are supposed to match are exactly the pair that silently
 *    drifts.
 *  - **Boss money differs, and the screen's version is the correct one for a
 *    screen.** `PartGameArea` divides a boss's money by how many bosses the
 *    *level* spawns and rounds to ten (`resolveEnemyStats`); the bestiary is
 *    not looking at a level, so `ScreenEnemies.as:546` shows the undivided
 *    figure. Reusing the gameplay resolver here would print a number that is
 *    wrong for every level with more than one boss and right for none of them
 *    in particular.
 *
 * ── The multipliers, and the one exception in them ────────────────────────
 * `:509-536`, transcribed:
 *
 * | quantity | Easy | Medium | Hard |
 * |---|---|---|---|
 * | health | 1 | 1.225 | 1.4 |
 * | damage | 1 | 1.225 | 1.4 |
 * | speed  | 1 | 1.1   | 1.2 |
 *
 * **A boss takes no health multiplier** — `:513` and `:527` both set
 * `hpMultiplier = 1` when the tier is Boss, while damage and speed keep theirs.
 * That is not a rounding detail: on Hard it is the difference between showing a
 * boss at its real health and showing it 40% too tough. `resolveEnemyStats`
 * carries the same rule for the same reason, and the test drives both.
 *
 * Tier scaling is `multiplierLevel2` 1.225 and `multiplierLevel3` 1.4; tier 1
 * and Boss are 1 (`:535-542` sets it only for "2" and "3").
 */
import { DIFFICULTY_PROFILES, ENEMY_TIER_MULTIPLIERS } from '../config/difficultyMultipliers';
import { getBaseStats, isBossLevel } from './enemyStats';
import type { Difficulty, EnemyLevel } from '../config/constants';
import type { BestiaryStats } from './bestiaryView';

/**
 * Frames per second the AS3 runs at, and the number `:551` multiplies by to
 * turn a per-frame step into the "PX/Sec" the screen prints.
 */
export const AS3_FPS = 30;

/**
 * Types whose speed is shown as a range, and the top of it.
 *
 * `:553-567`. Both accelerate past their base speed under their own mechanic,
 * so a single figure would be a lie in the direction that gets a player killed.
 * Temperamental's ceiling depends on whether it is a boss; Accelerating's does
 * not.
 */
const SPEED_RANGE: Record<string, { normal: number; boss: number }> = {
  // `:556` x4 normal, `:560` x3 as a boss.
  Temperamental: { normal: 4, boss: 3 },
  // `:566` x3, with no boss branch — the same either way.
  Accelerating: { normal: 3, boss: 3 },
};

export type { BestiaryStats } from './bestiaryView';

/**
 * The stat block for one enemy, or `undefined` when the type has no row.
 *
 * Returning `undefined` rather than zeroes matters: a missing stat row is a
 * data fault, and four zeroes would render as a real, very weak enemy.
 */
export function bestiaryStats(
  type: string,
  tier: EnemyLevel,
  difficulty: Difficulty,
): BestiaryStats | undefined {
  const base = getBaseStats(type, tier);
  if (!base) return undefined;

  const profile = DIFFICULTY_PROFILES[difficulty];
  const boss = isBossLevel(tier);
  const tierMultiplier = ENEMY_TIER_MULTIPLIERS[tier];

  // `:513`/`:527` — the boss exception, and only on health.
  const healthMultiplier = boss ? 1 : profile.enemyHealth;

  const speed = base.moveSpeedMax * AS3_FPS * profile.enemySpeed;
  const range = SPEED_RANGE[type];

  return {
    money: Math.round(base.money * tierMultiplier),
    health: Math.round(base.health * healthMultiplier * tierMultiplier),
    damage: Math.round(base.damage * profile.enemyDamage * tierMultiplier),
    speed: Math.round(speed),
    ...(range ? { speedMax: Math.round(speed * (boss ? range.boss : range.normal)) } : {}),
  };
}
