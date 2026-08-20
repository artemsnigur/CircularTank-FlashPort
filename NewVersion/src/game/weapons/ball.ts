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

/**
 * ── Divergence: patches are spaced, not laid every frame ─────────────────
 *
 * `:1784` drops a hazard on **every frame the ball lives**, so at speed 12
 * with radius-18 patches they overlap about 3:1 and the trail is a dense
 * smear. Requested thinner.
 *
 * Spacing is in **world units travelled**, not frames, so the trail looks the
 * same however the frame rate wanders — a frame counter would thin the trail
 * on a fast machine and thicken it on a slow one, which is the sort of thing
 * that only shows up on someone else's hardware.
 *
 * 36 is three of the AS3's steps: patches sit about a radius apart and still
 * read as a continuous path, where 3:1 overlap read as a blob.
 */
export const BALL_TRAIL_SPACING = 36;

/**
 * Whether a patch is due, and the distance to carry forward.
 *
 * Returns the *remainder* rather than resetting to zero, so a step longer than
 * the spacing does not silently swallow the excess — at low frame rates a
 * single move can cover more than one patch's worth of ground, and dropping
 * the surplus would thin the trail exactly when the ball is moving fastest on
 * screen.
 */
export function trailDue(distanceSinceLast: number): { due: boolean; carry: number } {
  /*
   * ── The non-finite guard is the whole reason this is a function ────────
   *
   * A caller wanting the first patch immediately reaches for `Infinity`, and
   * `Infinity % 36` is **NaN**. `NaN < 36` is `false`, so the next call reports
   * *due* — and so does every call after it, because NaN never compares less
   * than anything. The trail silently reverts to one patch per frame, which is
   * exactly the behaviour being removed and looks like the rule was never
   * wired up.
   *
   * Measured: 64 patches from one ball where ~20 were expected. Failing
   * towards "lay everything" rather than "lay nothing" is what made it
   * invisible to a glance — a trail was still drawn.
   */
  if (!Number.isFinite(distanceSinceLast)) return { due: true, carry: 0 };
  if (distanceSinceLast < BALL_TRAIL_SPACING) return { due: false, carry: distanceSinceLast };
  return { due: true, carry: distanceSinceLast % BALL_TRAIL_SPACING };
}

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
