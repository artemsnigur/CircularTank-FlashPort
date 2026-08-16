/**
 * Explosions — `PartGameArea.spawnExplosion` (4338), `handleExplosions` (1082),
 * and the blast-damage branch of the enemy loop (6439-6500).
 *
 * ── The correction this file exists to make ───────────────────────────────
 * An exploding bullet deals **no direct damage**. `PartGameArea.as:5915` opens
 * the direct-damage block with `if (theBullet.explosion == false)`; the
 * explosion path is its `else` branch, which only queues a blast at the impact
 * point. All of an exploding weapon's damage arrives through the explosion.
 *
 * That matters for the Cannon, which has `explosion = true`. Its damage is
 * therefore **not** untyped — it goes through the `Explosions` channel and is
 * scaled by `explosionDamageMultiplier`. Against `Basic` (no resistances) the
 * result is identical, which is why direct damage looked correct; against
 * `Strong` (0.5x explosions) or `Trap` (1.5x) it is not.
 *
 * ── No falloff ────────────────────────────────────────────────────────────
 * Every enemy inside `enemy.radius + explosion.radius` takes the **full**
 * damage. There is no distance scaling anywhere in the AS3. A blast is a flat
 * disc, not a gradient — which makes explosion radius a much stronger upgrade
 * than it first looks.
 *
 * ── One frame of life ─────────────────────────────────────────────────────
 * `canDamage` is set true on spawn and cleared by `handleExplosions` on the
 * next frame, so each explosion damages each enemy at most once. The visual
 * then plays out its animation and is removed.
 */

import type { DamageType } from '../enemies/enemyStatsData';
import type { DamageMultipliers } from '../enemies/damageTypes';
import { applyDamageType } from '../enemies/damageTypes';

/** Explosion flavours — `spawnExplosion`'s `explosionType`. */
type ExplosionType = 'Normal' | 'Ice' | 'Poison';

/**
 * `spawnExplosion` scales the art by `radius / 250`, so 250 is the artwork's
 * native radius.
 */
export const EXPLOSION_ART_RADIUS = 250;

export interface ExplosionSpec {
  x: number;
  y: number;
  radius: number;
  damage: number;
  type: ExplosionType;
  /** False plays the big boom; true the small one. */
  smallSound: boolean;
  /**
   * Status payload — `explosionQueueArray`'s slots 5 and 6.
   *
   * The AS3 queues `[x, y, radius, damage, type, effectTime, effectDamage,
   * small]` and applies the effect at `:6484` (freeze) and `:6607` (poison).
   * Absent means a blast that only damages, which is every explosion the port
   * had before the Ice and Poison grenades.
   *
   * `effectTime` is frames of freeze or poison; `effectDamage` is poison's
   * per-tick damage and is unused by Ice, exactly as the AS3 passes 0 there.
   */
  effectTime?: number;
  effectDamage?: number;
}

export interface ExplosionState extends ExplosionSpec {
  /** True only on the frame it spawns — blast damage applies once. */
  canDamage: boolean;
}

export function createExplosion(spec: ExplosionSpec): ExplosionState {
  return { ...spec, canDamage: true };
}

/** Damage channel each explosion flavour uses. */
export function explosionChannel(type: ExplosionType): DamageType {
  switch (type) {
    case 'Ice':
      return 'Ice';
    case 'Poison':
      return 'Poison';
    default:
      return 'Explosions';
  }
}

/** Sound key, matching `spawnExplosion`'s `smallSound` branch. */
export function explosionSound(smallSound: boolean): string {
  return smallSound ? 'ExplosionSmall' : 'ExplosionBig';
}

/** Sprite scale for a given blast radius. */
export function explosionScale(radius: number): number {
  return radius / EXPLOSION_ART_RADIUS;
}

export interface BlastTarget {
  x: number;
  y: number;
  radius: number;
}

/**
 * Indices of every target caught in the blast.
 *
 * Uses `distance <= enemy.radius + explosion.radius`, and returns all of them
 * — an explosion hits everything in range, not just the nearest.
 */
export function findEnemiesInBlast(
  explosion: ExplosionState,
  targets: readonly BlastTarget[],
): number[] {
  const caught: number[] = [];
  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    const distance = Math.hypot(target.x - explosion.x, target.y - explosion.y);
    if (distance <= target.radius + explosion.radius) caught.push(i);
  }
  return caught;
}

/**
 * Blast damage against one enemy, after its resistance on the blast's channel.
 *
 * Flat within the radius — no falloff.
 */
export function blastDamage(
  explosion: ExplosionState,
  multipliers: DamageMultipliers,
): number {
  return applyDamageType(explosion.damage, multipliers, explosionChannel(explosion.type));
}

/** Clears `canDamage`, as `handleExplosions` does on the following frame. */
export function expireBlastDamage(explosion: ExplosionState): ExplosionState {
  return explosion.canDamage ? { ...explosion, canDamage: false } : explosion;
}
