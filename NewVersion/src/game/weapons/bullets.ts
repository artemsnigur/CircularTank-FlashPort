/**
 * Bullet flight and enemy hits.
 *
 * ── Scope ─────────────────────────────────────────────────────────────────
 * `PartGameArea.handleBullets()` is 442 lines and the bullet-to-enemy damage
 * is not even in it — that lives inside the 2,545-line enemy behaviour loop
 * (lines 5591-6078), tangled up with per-damage-type multipliers, status
 * effects and death handling. Neither is ported.
 *
 * What is ported is the base path:
 *   - straight-line flight with per-frame velocity
 *   - removal at the room border
 *   - a distance hit test against enemy radius
 *   - damage scaled by the enemy's resistance on the bullet's channel
 *
 * Damage types *are* now applied — see `enemies/damageTypes.ts`. Untyped
 * projectiles (the Cannon's plain `Bullet`) take no multiplier, as in the AS3.
 *
 * Still absent: explosions (the Cannon's `explosionRadius` is carried but
 * unused), homing, bullet reflection, penetration, and the `DamageAddict`
 * enemy which is *healed* by damage.
 */

import { applyDamageType } from '../enemies/damageTypes';
import type { DamageMultipliers } from '../enemies/damageTypes';
import type { DamageType } from '../enemies/enemyStatsData';

const AS3_FPS = 30;

export interface BulletState {
  x: number;
  y: number;
  xVel: number;
  yVel: number;
  rotation: number;
  radius: number;
  damage: number;
  explosion: boolean;
  explosionRadius: number;
  /**
   * Survives impact. Optional because it has no bearing on flight — only the
   * caller resolving hits acts on it.
   */
  penetrates?: boolean;
  /** Fuse length in frames when this round attaches a bomb rather than hitting. */
  bombTimer?: number;
  /** Poison duration in frames; 0 or absent when this round leaves no poison. */
  poisonTime?: number;
  /** Poison damage per second. */
  poisonDamage?: number;
  /** Fragments this round bursts into on impact; 0 when it does not burst. */
  cakePieces?: number;
  /** Enemies a homing round may chain through; 0 when it does not home. */
  targets?: number;
}

export interface BulletBounds {
  roomWidth: number;
  roomHeight: number;
}

/** Advances a bullet. Returns null once it leaves the room. */
export function advanceBullet(
  bullet: BulletState,
  bounds: BulletBounds,
  deltaMs: number,
): BulletState | null {
  const frames = (deltaMs / 1000) * AS3_FPS;
  const x = bullet.x + bullet.xVel * frames;
  const y = bullet.y + bullet.yVel * frames;

  // The AS3 has per-weapon border behaviour (bounce, explode, stop); the base
  // path simply removes the bullet.
  if (
    x < -bullet.radius ||
    x > bounds.roomWidth + bullet.radius ||
    y < -bullet.radius ||
    y > bounds.roomHeight + bullet.radius
  ) {
    return null;
  }

  return { ...bullet, x, y };
}

/** Minimal shape a bullet needs to test against. */
export interface HitTarget {
  x: number;
  y: number;
  radius: number;
}

/**
 * First target the bullet overlaps, or -1.
 *
 * The AS3 measures `distanceBetween(bullet, enemy) - enemy.radius` and treats
 * <= 0 as a hit, i.e. the bullet is a point against the enemy's circle. The
 * bullet's own radius is included here because it is a real value (2 for the
 * Cannon) and excluding it makes fast bullets feel like they pass through.
 *
 * `canHit` filters candidates before the distance test. Penetrating rounds use
 * it to skip enemies they have already damaged — see `penetrates` in
 * firing.ts. Without it a surviving bullet would re-trigger on the same enemy
 * every frame it overlapped.
 */
export function findHit(
  bullet: BulletState,
  targets: readonly HitTarget[],
  canHit?: (target: HitTarget, index: number) => boolean,
): number {
  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    if (canHit && !canHit(target, i)) continue;
    const distance = Math.hypot(target.x - bullet.x, target.y - bullet.y);
    if (distance - target.radius - bullet.radius <= 0) return i;
  }
  return -1;
}

/**
 * Every target the bullet overlaps, not just the first.
 *
 * Fire needs this: the AS3's enemy loop is the *outer* one, so a single flame
 * is tested against every enemy in a frame and damages each of them (subject
 * to the per-frame `onFire` flag). `findHit` returning one index models a
 * round that stops on impact, which a flame does not.
 */
export function findAllHits(
  bullet: BulletState,
  targets: readonly HitTarget[],
  canHit?: (target: HitTarget, index: number) => boolean,
): number[] {
  const hits: number[] = [];
  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    if (canHit && !canHit(target, i)) continue;
    const distance = Math.hypot(target.x - bullet.x, target.y - bullet.y);
    if (distance - target.radius - bullet.radius <= 0) hits.push(i);
  }
  return hits;
}

export interface DamageResult {
  /** Health after the hit. */
  health: number;
  killed: boolean;
  /** Damage after the resistance multiplier — what was actually dealt. */
  damageDealt: number;
}

/**
 * Applies a bullet hit, scaled by the enemy's resistance on this channel.
 *
 * `multipliers` and `damageType` are optional so an untyped projectile — or a
 * caller that has no resistance data — behaves exactly as before.
 */
export function applyBulletDamage(
  health: number,
  damage: number,
  multipliers?: DamageMultipliers,
  damageType?: DamageType | null,
): DamageResult {
  const effective =
    multipliers && damageType ? applyDamageType(damage, multipliers, damageType) : damage;
  const remaining = health - effective;
  return { health: remaining, killed: remaining <= 0, damageDealt: effective };
}
