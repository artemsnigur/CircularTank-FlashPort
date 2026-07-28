/**
 * Thrown grenades — `PartGameArea.as:4001` (throw), `:2015-2103` (flight).
 *
 * ── It lands where you point, by fighting itself ──────────────────────────
 * Launch speed and friction are both derived from the distance to the cursor,
 * and they pull against each other:
 *
 *     speed    = shootDistance / 9.35        (floored at 2.1)
 *     friction = 0.101 + 0.0014 * (shootDistance / 200)
 *
 * A longer throw starts faster **and decelerates harder**, which is what makes
 * the grenade come to rest near the cursor instead of overshooting it. Neither
 * number means anything alone.
 *
 * ── Detonation is the fuse, and only the fuse ─────────────────────────────
 * `timeLeft = 50` frames — 1.67 seconds — fixed at every upgrade level and for
 * all three variants. There is **no contact detonation**: the grenade rolls
 * straight through enemies for its whole life and the blast is the only thing
 * that ever damages anything. `:2082`'s `else` is the single exit.
 *
 * ── The tumble is not the heading ─────────────────────────────────────────
 * The AS3 sets `rotation` to the tower angle, reads `angle` from it, then
 * immediately overwrites `rotation` with `Math.random() * 360` and adds
 * `speed * 3` every frame. That is a cosmetic spin; the travel direction lives
 * in `angle` alone. Reading `rotation` as the heading would send every grenade
 * somewhere random.
 */

/** Frames a grenade lives before it detonates — `:4030`. Never upgradeable. */
export const GRENADE_FUSE_FRAMES = 50;

/** Distance is divided by this to get launch speed — `:4042`. */
export const SPEED_DIVISOR = 9.35;

/** Floor on launch speed, so a throw at your own feet still travels — `:4045`. */
export const MIN_SPEED = 2.1;

/** `friction = BASE + PER_200_UNITS * (distance / 200)` — `:4047`. */
export const FRICTION_BASE = 0.101;
export const FRICTION_PER_200_UNITS = 0.0014;

/** Below this the grenade stops dead rather than creeping — `:2020`. */
export const STOP_SPEED = 0.5;

/** Muzzle offset, added to the grenade's own radius — `:4028`. */
export const MUZZLE_OFFSET = 16;

export interface GrenadeState {
  x: number;
  y: number;
  /** Travel direction in radians. **Not** the sprite's rotation. */
  angle: number;
  speed: number;
  friction: number;
  /** Frames until it goes off. */
  timeLeft: number;
  radius: number;
  /** Sprite spin, purely cosmetic — `rotation += speed * 3`. */
  spin: number;
}

export interface ThrowInput {
  /** Tank centre. */
  tankX: number;
  tankY: number;
  /** Tower facing in degrees — the direction it actually travels. */
  towerRotation: number;
  /** Where the player pointed, in world units. */
  targetX: number;
  targetY: number;
  radius: number;
}

/**
 * Builds a grenade at the muzzle, aimed along the tower.
 *
 * ── The camera correction is deliberately not ported ──────────────────────
 * `:4032-4038` shortens the throw when `mouseY > 400 - cameraPosY`. Decoded:
 * `cameraPosY` is the negated camera offset, so `400 - cameraPosY` is the world
 * Y of the **bottom edge of the visible play area**. The Flash stage is 640x480
 * with the game view occupying the top 400 and an 80-pixel HUD strip below it,
 * so that condition means "the player aimed into the HUD", and the correction
 * projects the target back onto the bottom edge of what they can actually see.
 *
 * The port has no such strip. `GameplayScene.pointerWorldPoint()` is
 * `camera.getWorldPoint` of a pointer inside the canvas, so the target is always
 * within `worldView`, and the HUD is DOM floating over the canvas rather than a
 * reserved band carved out of it. The condition is unreachable, and reproducing
 * it would leave a branch no player can enter and no test can exercise — dead
 * code shaped like a rule.
 *
 * This looks like an exception to the constants-that-became-variables rule and
 * is the same question reaching a different answer. That rule asks what the AS3
 * value was *for*. Usually it was the screen, so the port takes the live value.
 * Here it compensates for a layout artefact — a fixed stage with a HUD cut out
 * of it — and the port does not have the artefact, so taking the live value
 * yields a permanently false test.
 *
 * The distance itself needs no correction: `shootDistance` is measured between
 * two world-space points, and camera zoom never enters it.
 */
export function throwGrenade(input: ThrowInput): GrenadeState {
  const heading = (input.towerRotation * Math.PI) / 180;
  const offset = MUZZLE_OFFSET + input.radius;
  const x = input.tankX + Math.cos(heading) * offset;
  const y = input.tankY + Math.sin(heading) * offset;

  // Measured from the muzzle, not the tank centre — `:4033`.
  const distance = Math.hypot(input.targetX - x, input.targetY - y);

  return {
    x,
    y,
    angle: heading,
    speed: Math.max(MIN_SPEED, distance / SPEED_DIVISOR),
    friction: FRICTION_BASE + FRICTION_PER_200_UNITS * (distance / 200),
    timeLeft: GRENADE_FUSE_FRAMES,
    radius: input.radius,
    // `rotation = Math.random() * 360` — cosmetic, and deliberately unrelated
    // to `angle`.
    spin: 0,
  };
}

export interface GrenadeTick {
  state: GrenadeState;
  /** True on the frame the fuse runs out and the blast should be queued. */
  detonated: boolean;
}

/**
 * One frame of flight — `:2017-2030`.
 *
 * Order matters and is the AS3's: the fuse ticks, then speed decays, then the
 * velocity is rebuilt from `angle`. The *position* is integrated by the caller
 * **before** this runs (`:1810` sits above the grenade branch), so a frame
 * moves at the previous frame's speed.
 *
 * The stop is a snap, not a taper: once one more multiplication would put the
 * speed under 0.5 it goes straight to zero, so a grenade never creeps.
 */
export function tickGrenade(state: GrenadeState, frames: number): GrenadeTick {
  if (state.timeLeft <= 0) {
    return { state, detonated: false };
  }

  const timeLeft = Math.max(0, state.timeLeft - frames);
  if (timeLeft <= 0) {
    return { state: { ...state, timeLeft: 0 }, detonated: true };
  }

  const decayed = state.speed * (1 - state.friction);
  const speed = decayed > STOP_SPEED ? decayed : 0;

  return {
    state: { ...state, timeLeft, speed, spin: state.spin + speed * 3 },
    detonated: false,
  };
}

/** Velocity for the current heading and speed. */
export function grenadeVelocity(state: GrenadeState): { xVel: number; yVel: number } {
  return {
    xVel: Math.cos(state.angle) * state.speed,
    yVel: Math.sin(state.angle) * state.speed,
  };
}

export interface RoomBounds {
  roomWidth: number;
  roomHeight: number;
}

/**
 * Reflects the grenade off a wall it has already crossed — `:2032-2078`.
 *
 * The position is pushed back to the boundary and the heading mirrored: across
 * the vertical for a side wall (`+-180 - angle`), across the horizontal for the
 * top or bottom (`-angle`).
 *
 * ── A corner does not compose, faithfully ─────────────────────────────────
 * The AS3 captures `angleDegrees` once, before the wall tests, and the
 * horizontal test then mirrors *that* rather than the value the vertical test
 * just wrote. So a grenade hitting a corner on the same frame ends up at
 * `-original` instead of the composed reflection. Reproduced rather than fixed:
 * it needs a simultaneous two-wall hit, it is harmless when it happens, and
 * "corrected" behaviour here would be a silent divergence in the one case that
 * is hard to observe.
 */
export function bounceGrenade(state: GrenadeState, room: RoomBounds): GrenadeState {
  const { radius } = state;
  const minX = radius;
  const maxX = room.roomWidth - radius;
  const minY = radius;
  const maxY = room.roomHeight - radius;

  // Captured once, as the AS3 does — see the corner note above.
  const original = (state.angle * 180) / Math.PI;
  let { x, y, angle } = state;

  if (state.x < minX) {
    x = minX;
    angle = ((original < 0 ? -180 - original : 180 - original) * Math.PI) / 180;
  } else if (state.x > maxX) {
    x = maxX;
    angle = ((original < 0 ? -180 - original : 180 - original) * Math.PI) / 180;
  }

  // A separate `if`, not an `else if` — both axes can fire on one frame.
  if (state.y < minY) {
    y = minY;
    angle = (-original * Math.PI) / 180;
  } else if (state.y > maxY) {
    y = maxY;
    angle = (-original * Math.PI) / 180;
  }

  return { ...state, x, y, angle };
}
