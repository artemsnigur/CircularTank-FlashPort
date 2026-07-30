/**
 * The Ice Ball / Lava Ball projectile — `PartGameArea.as:4174-4200`.
 *
 * The flight itself is the dullest part of these weapons: a flat speed along the
 * tower's heading, no gravity, no bounce, no homing, no piercing. What makes
 * them different is that a hazard is laid on **every frame the ball lives**
 * (`:1784`, immediately above `theBullet.x += theBullet.xVel`), so the trail's
 * density is a function of speed and nothing else. At speed 12 with radius-18
 * patches they overlap about 3:1 and read as continuous.
 *
 * Kept apart from `groundHazard.ts` because they are different objects with
 * different lifetimes — the ball is gone on first contact, the trail outlives it
 * by hundreds of frames — and folding them would put the dedup rules and the
 * flight rules in one place, which is how the two get confused.
 */
import type { HazardType } from './groundHazard';

/** `:4185`, `:4193` — both balls, and it does not scale with level. */
export const BALL_SPEED = 12;

/** `:4184`, `:4192`. */
export const BALL_RADIUS = 20;

/**
 * `:4198` — the muzzle sits `16 + width / 2` from the tank's centre.
 *
 * The AS3 reads the sprite's `width`, which for these is the radius doubled, so
 * this is `16 + radius` and matches the chain round's spelling of the same idea.
 */
export const BALL_MUZZLE_OFFSET = 16;

export interface BallState {
  type: HazardType;
  x: number;
  y: number;
  xVel: number;
  yVel: number;
  radius: number;
  /** Blast damage on contact. Not applied directly — see `ICE_BALL`. */
  damage: number;
  explosionRadius: number;
  /**
   * Ice: `frozenTime`, the freeze the blast *and* every trail patch carry.
   * Lava: the trail's damage per second.
   */
  payload: number;
  /** The trail's stat lifetime, before ice's `+15` — `groundHazard` applies it. */
  trailLife: number;
}

export interface BallThrow {
  type: HazardType;
  tankX: number;
  tankY: number;
  /** Degrees, as the tower carries it. */
  towerRotation: number;
  damage: number;
  explosionRadius: number;
  payload: number;
  trailLife: number;
}

/** Spawns a ball at the muzzle, moving along the tower's heading — `:4196-4200`. */
export function throwBall(spec: BallThrow): BallState {
  const heading = (spec.towerRotation * Math.PI) / 180;
  const offset = BALL_MUZZLE_OFFSET + BALL_RADIUS;

  return {
    type: spec.type,
    x: spec.tankX + Math.cos(heading) * offset,
    y: spec.tankY + Math.sin(heading) * offset,
    xVel: Math.cos(heading) * BALL_SPEED,
    yVel: Math.sin(heading) * BALL_SPEED,
    radius: BALL_RADIUS,
    damage: spec.damage,
    explosionRadius: spec.explosionRadius,
    payload: spec.payload,
    trailLife: spec.trailLife,
  };
}

/** One frame of travel — `:1810`. */
export function advanceBall(state: BallState, frames: number): BallState {
  return {
    ...state,
    x: state.x + state.xVel * frames,
    y: state.y + state.yVel * frames,
  };
}

/**
 * Whether the ball has left the room and should be dropped.
 *
 * The AS3 culls off-room bullets generically rather than per weapon; the ball
 * has no lifetime of its own and would otherwise travel forever.
 */
export function ballIsOutOfBounds(
  state: BallState,
  room: { width: number; height: number },
): boolean {
  return (
    state.x < -state.radius ||
    state.y < -state.radius ||
    state.x > room.width + state.radius ||
    state.y > room.height + state.radius
  );
}
