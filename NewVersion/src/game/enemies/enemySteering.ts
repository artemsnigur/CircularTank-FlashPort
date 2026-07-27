/**
 * The base steering rule for an enemy, lifted out of `PartGameArea`'s enemy
 * update loop.
 *
 * ── Scope, and why this is only a slice ───────────────────────────────────
 * That loop is **2,545 lines** (PartGameArea.as:4499-7044) and interleaves
 * steering with damage application, freezing, poison, burning, teleporting,
 * healing, grappling, bullet collision, death, money drops and the
 * strength/weakness system. It is not separable as a unit.
 *
 * What *is* separable is the movement core, which is four steps and touches
 * nothing else:
 *
 *   1. turn toward the target, capped at `rotSpeedMax` degrees per frame
 *      (PartGameArea.as:4696-4714)
 *   2. accelerate along the facing by `accSpeed` (…:5057)
 *   3. clamp speed to `moveSpeedMax` by scaling both components (…:5098)
 *   4. integrate position (…:5374, 5446)
 *
 * Everything else that loop does to an enemy is deliberately absent. This
 * moves an enemy toward a target; it does not make it a real enemy.
 *
 * ── What is still missing from the *shared* model ─────────────────────────
 * Unported, and shared by all 20 types in every mode except Tower:
 *
 *   - `slowDown` (…:4613-4640) halves and doubles `rotSpeedMax` on a
 *     randomised 2-6s timer, which is what makes non-boss enemies weave
 *     rather than track cleanly
 *   - `angleOffsetCurrent/Goal` (…:5223-5265) steers enemies away from each
 *     other, up to +-75 degrees, easing back to zero
 *   - `lockDirection` (…:4642-4680) makes bosses circle at the map border
 *   - mass-based enemy/enemy push (…:5199-5221)
 *
 * The distance-scaled approach term `(35 + moveSpeedMax*4) * (1 - dist^(1/8))`
 * is **not** on that list. It was recorded as a shared gap once; it is the
 * Tower branch at :4589 and applies to nothing else. Tower is implemented
 * below.
 *
 * Rates are per-frame at the SWF's 30 fps and are converted to per-second so
 * behaviour does not double at 60 fps.
 */

/** SWF frame rate; the AS3 constants are per-frame at this rate. */
const AS3_FPS = 30;

export interface SteeringState {
  x: number;
  y: number;
  /** Degrees, Flash convention: 0 is +x, y grows downward. */
  rotation: number;
  xVel: number;
  yVel: number;
}

export interface SteeringStats {
  /** Degrees per frame at 30 fps. */
  rotSpeedMax: number;
  /** Velocity added per frame along the facing. */
  accSpeed: number;
  /** Velocity magnitude cap. */
  moveSpeedMax: number;
}

export interface SteeringTarget {
  x: number;
  y: number;
}

/**
 * Normalises a degree difference into (-180, 180], so turning always takes the
 * short way round. The AS3 does this inline with a chain of comparisons.
 */
export function shortestRotation(from: number, to: number): number {
  let difference = (to - from) % 360;
  if (difference > 180) difference -= 360;
  if (difference <= -180) difference += 360;
  return difference;
}

/** Facing that points at the target, in the AS3's `atan2(dx, dy)` idiom. */
export function angleToTarget(state: SteeringState, target: SteeringTarget): number {
  return 90 - (Math.atan2(target.x - state.x, target.y - state.y) * 180) / Math.PI;
}

/**
 * Facing for a Tower-mode enemy — `PartGameArea.as:4589`.
 *
 * The mode's whole character is in the leading constant: every other mode uses
 * `90 - atan2(...)`, this uses `180 - ...`, and that 90-degree difference makes
 * the enemy travel *across* the tank rather than at it. The subtracted term
 * then bends it inward, and it is distance-scaled, so:
 *
 *   far from the tank   the term is ~0.8 degrees  -> ~90 degrees off: circling
 *   close to the tank   the term is 35 + 4*speed  -> ~45 degrees off: closing
 *
 * So enemies orbit on the way in and tighten as they arrive. They never aim
 * straight at the target, which is why Tower reads as rings rather than a
 * charge.
 *
 * The triple square root is the AS3's own, kept rather than folded into
 * `x ** (1/8)` so it matches `enemySpawn.resolveSpawn`, which computes the
 * same heading for the spawn frame.
 */
export function towerAngleToTarget(
  state: SteeringState,
  target: SteeringTarget,
  moveSpeedMax: number,
  roomWidth: number,
): number {
  const distance = Math.hypot(target.x - state.x, target.y - state.y);
  const lead =
    (35 + moveSpeedMax * 4) *
    (1 - Math.sqrt(Math.sqrt(Math.sqrt(distance / (roomWidth + 100)))));

  return (
    180 -
    (Math.atan2(target.x - state.x, target.y - state.y) * 180) / Math.PI -
    lead -
    moveSpeedMax -
    5
  );
}

/** Ceiling the Tower ramp stops at — `PartGameArea.as:5032`. */
export const TOWER_ACC_SPEED_MAX = 10;

/**
 * Tower enemies accelerate for the whole level — `:5030-5040`.
 *
 * `accSpeed += moveSpeedMax / 400` every frame, clamped at 10. From a stat base
 * near 0.2 that is a slow ramp, and it is what makes a Tower level tighten:
 * `towerRotSpeedMax` derives the turn rate from it, so the orbit closes as the
 * enemy speeds up.
 *
 * **This is per-enemy mutable state, not a stat.** It must reset when an enemy
 * spawns, or a reused entity inherits the previous one's ramp and enters at
 * full speed.
 */
export function towerAccSpeed(current: number, moveSpeedMax: number, frames: number): number {
  return Math.min(current + (moveSpeedMax / 400) * frames, TOWER_ACC_SPEED_MAX);
}

/** Turn rate derived from the ramp — `PartGameArea.as:4605`. */
export function towerRotSpeedMax(accSpeed: number): number {
  return accSpeed * 6 + 1;
}

/**
 * Advances one enemy by `deltaMs`.
 *
 * Returns a new state; the input is not mutated. `speedSubtracting` — the
 * periodic slowdown wobble non-boss enemies do — is not modelled here; it is
 * driven by timers the behaviour loop owns, and it only ever *reduces* the
 * speed cap, so leaving it out gives an enemy that moves at its nominal top
 * speed.
 */
export function steerToward(
  state: SteeringState,
  stats: SteeringStats,
  target: SteeringTarget,
  deltaMs: number,
  /**
   * Heading to turn toward, when it is not simply "at the target".
   *
   * Tower supplies `towerAngleToTarget`. Passing it in rather than branching on
   * a mode keeps this function's only job the four movement steps, and keeps
   * the Tower rule in one testable place.
   */
  desiredRotation?: number,
): SteeringState {
  const frames = (deltaMs / 1000) * AS3_FPS;
  if (frames <= 0) return state;

  // 1. Turn toward the target, capped.
  const desired = desiredRotation ?? angleToTarget(state, target);
  const difference = shortestRotation(state.rotation, desired);
  const maxTurn = stats.rotSpeedMax * frames;
  const turn = Math.abs(difference) <= maxTurn ? difference : Math.sign(difference) * maxTurn;
  const rotation = state.rotation + turn;

  // 2. Accelerate along the new facing.
  const radians = (rotation * Math.PI) / 180;
  let xVel = state.xVel + Math.cos(radians) * stats.accSpeed * frames;
  let yVel = state.yVel + Math.sin(radians) * stats.accSpeed * frames;

  // 3. Clamp to top speed, preserving direction.
  const speed = Math.hypot(xVel, yVel);
  if (speed > stats.moveSpeedMax && speed > 0) {
    const scale = stats.moveSpeedMax / speed;
    xVel *= scale;
    yVel *= scale;
  }

  // 4. Integrate. Velocities are per-frame, so scale by elapsed frames.
  return {
    rotation,
    xVel,
    yVel,
    x: state.x + xVel * frames,
    y: state.y + yVel * frames,
  };
}

/** Keeps an enemy inside the room. The AS3 handles walls per-axis inline. */
export function clampToRoom(
  state: SteeringState,
  roomWidth: number,
  roomHeight: number,
  radius: number,
): SteeringState {
  const x = Math.min(Math.max(state.x, radius), roomWidth - radius);
  const y = Math.min(Math.max(state.y, radius), roomHeight - radius);
  if (x === state.x && y === state.y) return state;

  return {
    ...state,
    x,
    y,
    // Kill the component that pushed into the wall so it does not accumulate.
    xVel: x === state.x ? state.xVel : 0,
    yVel: y === state.y ? state.yVel : 0,
  };
}
