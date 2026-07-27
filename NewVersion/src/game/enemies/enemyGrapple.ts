/**
 * GrapplingHook — `PartGameArea.as:1563`, `:5041`, `:5323`, `:5342`, `:6891`.
 *
 * ── The two ranks do different things ─────────────────────────────────────
 * On impact (`:1567-1571`) the hook sets `isGrapping` on **both** ranks, but
 * `tank.grappingEnemy` **only when the enemy is a boss**. So:
 *
 *   GrapplingHook   reels *itself* at the tank. A charger, not a tether.
 *   GrapplingHookB  reels itself **and** drags the tank, overwriting the
 *                   player's handling — maxSpeed 8, accSpeed 0.4, friction 0.3
 *                   (`Tank.as:84-93`).
 *
 * The bestiary and the old board entry both said "tethers the tank and reels it
 * in", which is the boss half only.
 *
 * ── The reel replaces acceleration, it does not add to it ─────────────────
 * `:5041` is the `if` of an `if/else` whose `else` is the ordinary
 * accelerate-along-facing block. While grappling, velocity and rotation are
 * written outright from the bearing to the tank, and speed grows by 0.5 a frame
 * against a raised `moveSpeedMax` of 5 — a hard accelerating charge rather than
 * a steer.
 *
 * That re-derivation every frame is also why this cannot reproduce Defense's
 * wall-sliding bug: there, the wall zeroed the perpendicular velocity while
 * `rotation` still pointed into it and nothing re-aimed. Here both are rebuilt
 * from the tank's position next frame, so whatever the wall did is overwritten.
 * Position still goes through the ordinary clamp, so a reeling enemy is held
 * inside the room and slides *along* the wall toward the tank.
 */

import type { BulletClassSpec } from './enemyFiring';

/** `EnemyBulletHook` — a real bullet that also attaches — `:6930`. */
export const HOOK_BULLET: BulletClassSpec = {
  radius: 5,
  damage: 1,
  lifeTime: 100,
};

/** Speed gained per frame while reeling — `:5044`. */
export const REEL_ACCELERATION = 0.5;
/** Raised speed cap while reeling — `:5047`. Base is 1.5. */
export const REEL_MAX_SPEED = 5;

/** The tank's handling while a boss has it tethered — `Tank.as:88-90`. */
export const TETHERED_TANK_MAX_SPEED = 8;
export const TETHERED_TANK_ACC_SPEED = 0.4;
export const TETHERED_TANK_FRICTION = 0.3;
/** Pull applied to the tank each frame — `Tank.as:92`. */
export const TETHER_PULL = 2;

export interface GrappleState {
  /** Hooks currently in flight. The AS3's `bulletsShooting`. */
  bulletsShooting: number;
  isGrapping: boolean;
}

export function createGrappleState(): GrappleState {
  return { bulletsShooting: 0, isGrapping: false };
}

/**
 * Whether a grappler may fire — `:6891`.
 *
 * One hook at a time, and none at all while already attached. Every other enemy
 * may have many rounds in flight, which is why `bulletsShooting` exists for this
 * type alone: it is a firing gate rather than a property of the bullet.
 */
export function canFireHook(state: GrappleState): boolean {
  return state.bulletsShooting === 0 && !state.isGrapping;
}

export interface ReelResult {
  xVel: number;
  yVel: number;
  rotation: number;
  moveSpeedMax: number;
}

/**
 * Velocity for a reeling enemy — `:5043-5047`.
 *
 * `speed` is the enemy's current speed magnitude; the result is `speed + 0.5`
 * pointed straight at the tank, so it winds up over roughly nine frames to the
 * raised cap. Rotation is set from the same bearing rather than turned toward
 * it — there is no turn rate while grappling.
 */
export function reelVelocity(
  enemy: { x: number; y: number },
  tank: { x: number; y: number },
  speed: number,
): ReelResult {
  const angle = Math.atan2(tank.y - enemy.y, tank.x - enemy.x);
  const next = speed + REEL_ACCELERATION;

  return {
    xVel: Math.cos(angle) * next,
    yVel: Math.sin(angle) * next,
    rotation: (angle * 180) / Math.PI,
    moveSpeedMax: REEL_MAX_SPEED,
  };
}

/**
 * Heading a non-boss is flung to when the shield pushes it off — `:5344-5361`.
 *
 * The same 105±15 / 75±15 fan Defense uses for its spawn spread, clamped to
 * 15..165 — so it is thrown into the lower hemisphere whichever way it was
 * facing.
 */
export function releaseHeading(rotation: number, moveSpeedMax: number, random: () => number): number {
  if (rotation > 90 || rotation < -90) {
    return Math.min(105 + random() * 15 + moveSpeedMax * 17, 165);
  }
  return Math.max(75 - random() * 15 - moveSpeedMax * 17, 15);
}

/** Enemy types that fire a grappling hook. */
const GRAPPLES = new Set(['GrapplingHook']);

export function grapplesTank(enemyType: string): boolean {
  return GRAPPLES.has(enemyType);
}
