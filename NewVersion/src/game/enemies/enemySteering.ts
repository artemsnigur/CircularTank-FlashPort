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
): SteeringState {
  const frames = (deltaMs / 1000) * AS3_FPS;
  if (frames <= 0) return state;

  // 1. Turn toward the target, capped.
  const desired = angleToTarget(state, target);
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
