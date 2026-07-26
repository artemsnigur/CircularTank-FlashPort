/**
 * The damage-type system — strengths, weaknesses, and which weapon deals what.
 *
 * Ported from `PartGameArea.spawnEnemy` (lines 3376-3455, where the multipliers
 * are built) and the enemy behaviour loop's hit branch (5591-6078, where they
 * are applied).
 *
 * ── How it works ──────────────────────────────────────────────────────────
 * Every enemy starts with all eight multipliers at 1. Its **strengths table
 * subtracts** and its **weaknesses table adds**, so:
 *
 *     Strong  ["Explosions", 0.5, "Bullets", 0.5]   -> 0.5x from both
 *     Ninja   ["Bullets", 0.25, "Laser", 0.75]      -> 0.75x and 0.25x
 *             weaknesses ["FireLava", 0.5]          -> 1.5x from fire
 *
 * A strength of 1.0 would make the enemy immune; none go that far, but the
 * arithmetic allows it, and the AS3 checks `foodDamageMultiplier > 0` before
 * showing an impact effect — so zero is a meaningful value, not an error.
 *
 * Bosses share their base type's tables: the AS3 looks them up by the type name
 * with the level suffix already stripped.
 *
 * ── The channel a weapon fires on ─────────────────────────────────────────
 * Not every projectile is typed. A plain `Bullet` — the Cannon's round —
 * matches none of the branches in the hit code and so takes **no multiplier at
 * all**. That is why the Cannon could be ported before this system existed.
 */

import { ENEMY_STATS } from './enemyStatsData';
import type { DamageType, Resistance } from './enemyStatsData';

/** All eight multipliers for one enemy. */
export type DamageMultipliers = Record<DamageType, number>;

export const DAMAGE_TYPES: readonly DamageType[] = [
  'Bullets',
  'Explosions',
  'FireLava',
  'Food',
  'Ice',
  'Laser',
  'Magic',
  'Poison',
];

function neutralMultipliers(): DamageMultipliers {
  return {
    Bullets: 1,
    Explosions: 1,
    FireLava: 1,
    Food: 1,
    Ice: 1,
    Laser: 1,
    Magic: 1,
    Poison: 1,
  };
}

/** Applies a type's strengths and weaknesses to the neutral baseline. */
export function resolveDamageMultipliers(type: string): DamageMultipliers {
  const multipliers = neutralMultipliers();
  const variants = ENEMY_STATS[type];
  if (!variants) return multipliers;

  const apply = (list: readonly Resistance[], sign: 1 | -1): void => {
    for (const entry of list) multipliers[entry.damageType] += sign * entry.value;
  };

  apply(variants.strengths, -1);
  apply(variants.weaknesses, 1);

  return multipliers;
}

/**
 * Projectile classes mapped to the channel they damage on.
 *
 * Taken from the string comparisons in the hit branch. Anything absent —
 * `Bullet`, `BulletBig`, `BulletPenetrate`, `BulletRocket` — is untyped and
 * takes plain damage. Those four all explode, so their damage arrives through
 * the `Explosions` channel instead; see weapons/explosions.ts.
 */
export const BULLET_DAMAGE_TYPES: Readonly<Record<string, DamageType>> = {
  BulletFire: 'FireLava',
  BulletLavaball: 'FireLava',
  BulletSmall: 'Bullets',
  BulletShotgun: 'Bullets',
  BulletGummyBear: 'Food',
  BulletCrazyCheese: 'Food',
  BulletCake: 'Food',
  BulletCakePiece: 'Food',
  BulletMagic: 'Magic',
  BulletMagicBunny: 'Magic',
  BulletIcicle: 'Ice',
  BulletIceball: 'Ice',
  BulletPoison: 'Poison',
  // The beam's only damage site is `PartGameArea.as:5560-5606`, which scales
  // by `laserDamageMultiplier`. An earlier note here claimed the direct hit
  // was untyped and that the Laser channel came from a separate
  // continuous-beam branch — there is no such branch. Line 5591 is inside the
  // same block, and the only other BulletLaser collision (`:7083`) clears
  // ground hazards rather than damaging enemies.
  BulletLaser: 'Laser',
  BulletPoisonSpike: 'Poison',
};

/** The channel a projectile deals on, or null when it is untyped. */
export function damageTypeOf(bulletClass: string): DamageType | null {
  return BULLET_DAMAGE_TYPES[bulletClass] ?? null;
}

/**
 * Damage after the enemy's resistance to this channel.
 *
 * `damageType` of null means untyped — plain damage, no multiplier. That is
 * the Cannon's case and the reason its numbers were already correct.
 */
export function applyDamageType(
  damage: number,
  multipliers: DamageMultipliers,
  damageType: DamageType | null,
): number {
  if (damageType === null) return damage;
  return damage * multipliers[damageType];
}

/** True when the enemy takes reduced damage on this channel. */
export function isStrongAgainst(
  multipliers: DamageMultipliers,
  damageType: DamageType,
): boolean {
  return multipliers[damageType] < 1;
}

/** True when the enemy takes extra damage on this channel. */
export function isWeakTo(multipliers: DamageMultipliers, damageType: DamageType): boolean {
  return multipliers[damageType] > 1;
}

/**
 * Which particle the AS3 shows on impact: `Strength` when the hit is resisted,
 * `Weakness` when it is amplified, `Immune` when the multiplier is zero.
 */
export type ImpactFeedback = 'Strength' | 'Weakness' | 'Immune' | null;

export function impactFeedback(
  multipliers: DamageMultipliers,
  damageType: DamageType | null,
): ImpactFeedback {
  if (damageType === null) return null;
  const multiplier = multipliers[damageType];
  if (multiplier <= 0) return 'Immune';
  if (multiplier > 1) return 'Weakness';
  if (multiplier < 1) return 'Strength';
  return null;
}
