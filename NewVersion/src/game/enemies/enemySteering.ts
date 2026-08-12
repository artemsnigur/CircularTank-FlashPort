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

/**
 * Facing that points at the target, in the AS3's `atan2(dx, dy)` idiom.
 *
 * ── Two conventions, one angle — do not "fix" either ──────────────────────
 * `PartGameArea.as` computes bearings two different ways and they are the same
 * number:
 *
 *     angleBetween(x1,y1,x2,y2)  =  atan2(dy, dx)              (`:2594`, radians)
 *     rotationGoal               =  90 - atan2(dx, dy)*180/pi  (`:4585`, degrees)
 *
 * `atan2(dx, dy)` is `90° - atan2(dy, dx)`, so `90 - atan2(dx, dy)` collapses
 * back to `atan2(dy, dx)`. The flipped form exists because Flash measures
 * `rotation` clockwise from the +x axis with +y downward; the two spellings sit
 * side by side in the same function at `:4530` and `:4585`.
 *
 * This function is the second form. Rewriting it to match `angleBetween` would
 * change nothing and rewriting `angleBetween` to match this one would silently
 * add 90° to every bearing that reads it, so both stay as the source has them.
 */
export function angleToTarget(from: SteeringTarget, to: SteeringTarget): number {
  return 90 - (Math.atan2(to.x - from.x, to.y - from.y) * 180) / Math.PI;
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

/**
 * Whether a Defense enemy has crossed the bottom of the lane — the defended
 * line.
 *
 * `PartGameArea.as:5449`. Every other mode clamps an enemy at
 * `roomHeight - radius` and bounces it; Defense takes the `else` instead, which
 * damages the player by the enemy's contact damage, kills the enemy and pays no
 * money. So the bottom edge *is* the objective, and it is ten lines inside the
 * existing wall-collision code rather than a separate defended-line system.
 *
 * Tested against the position *before* clamping, because `clampToRoom` would
 * otherwise pull the enemy back inside and the crossing would never be visible.
 */
export function crossesDefenseLine(
  state: SteeringState,
  roomHeight: number,
  radius: number,
): boolean {
  return state.y >= roomHeight - radius;
}

/**
 * Reflects a **non-boss** enemy off any of the four room walls.
 *
 * ── The rotation basis, because every guard below depends on it ───────────
 * Flash `rotation` here is **0 = right, 90 = down, 180 = left, -90 = up**, so a
 * heading is `(cos r, sin r)`. Derived from the spawn edges rather than
 * assumed: `PartGameArea.as:3507` faces an enemy on the **left** edge at `0`,
 * `:3511` one on the **bottom** at `-90`, `:3515` one on the **right** at
 * `180` — each pointing into the room. `enemySpawn.ts:156-158` is the same
 * mapping, already ported and tested.
 *
 * That basis is what makes the AS3's guards read as directions:
 * `-90 < r < 90` is `cos r > 0`, i.e. *moving right*; `r > 0` is `sin r > 0`,
 * i.e. *moving down*. Get the basis wrong and every guard inverts while still
 * looking plausible.
 *
 * ── Why this exists separately from `clampToRoom` ─────────────────────────
 * `clampToRoom` pins the position and **zeroes** the perpendicular velocity,
 * leaving the rotation pointing into the wall. The enemy then hugs the wall and
 * peels off only as steering re-aims it, a degree at a time. The AS3 instead
 * reverses the perpendicular velocity *and* mirrors the heading, so the enemy
 * leaves immediately.
 *
 * ── The four walls — `PartGameArea.as:5370-5513` ──────────────────────────
 * Each is: clamp the coordinate, reverse the perpendicular component, and
 * mirror the rotation **only when it points into that wall**.
 *
 * | Wall | AS3 | Guard | Mirror |
 * |---|---|---|---|
 * | right  | `:5379-5398` | `-90 < r < 90`   | `180 - r` / `-180 - r` |
 * | left   | `:5405-5434` | `r > 90 \|\| r < -90` | same |
 * | bottom | `:5439-5468` | `r > 0`          | `-r` |
 * | top    | `:5488-5513` | `r < 0`          | `-r` |
 *
 * The guard is the part that is easy to drop and hard to see: without it, an
 * enemy sitting on a wall while travelling *along* it is re-mirrored every
 * frame and jitters in place.
 *
 * ── Bosses do not come here ───────────────────────────────────────────────
 * `enemyLevel == "B"` takes the other arm in all four branches and sets
 * `rotateTowardsTank` instead — see `turnTowardsGoal`. Bosses never reflect.
 *
 * ── `skipBottom` is Defense, and only Defense ─────────────────────────────
 * `:5449`'s `else if(levelMode != "Defense")` makes the bottom edge the
 * objective rather than a wall: the enemy crosses it, damages the player and
 * dies (`crossesDefenseLine`, checked before this runs). Every other mode
 * bounces off the bottom like any other wall.
 *
 * ── A note for enemy-enemy separation, when it lands ──────────────────────
 * The AS3 tests `xVel + pushVelX` against the wall, where `pushVel` is the
 * separation velocity (`:5199-5221`, unported — 0 occurrences in `src/`). With
 * separation absent the term is identically zero, so this reads `xVel` alone
 * and is exact today.
 *
 * **When separation lands, do not make the four branches symmetric.** The
 * `-y` branch at `:5488` gates on `theEnemy.yVel < 0` alone and its predicate
 * omits `pushVelY`, where the other three include it — and `:5493` still *adds*
 * `pushVelY` to the position. That asymmetry is in the original. It is not a
 * port bug and tidying it into false symmetry would change behaviour.
 */
export function bounceOffWalls(
  state: SteeringState,
  roomWidth: number,
  roomHeight: number,
  radius: number,
  options: { skipBottom?: boolean } = {},
): SteeringState {
  const left = radius;
  const right = roomWidth - radius;
  const top = radius;
  const bottom = roomHeight - radius;

  let next = state;

  if (next.x <= left || next.x >= right) {
    const intoRight = next.x >= right;
    const pointsIn = intoRight
      ? next.rotation > -90 && next.rotation < 90
      : next.rotation > 90 || next.rotation < -90;
    next = {
      ...next,
      x: intoRight ? right : left,
      rotation: pointsIn ? mirrorAcrossVertical(next.rotation) : next.rotation,
      xVel: intoRight ? -Math.abs(next.xVel) : Math.abs(next.xVel),
    };
  }

  const atBottom = next.y >= bottom;
  if ((atBottom && !options.skipBottom) || next.y <= top) {
    const pointsIn = atBottom ? next.rotation > 0 : next.rotation < 0;
    next = {
      ...next,
      y: atBottom ? bottom : top,
      rotation: pointsIn ? mirrorAcrossHorizontal(next.rotation) : next.rotation,
      yVel: atBottom ? -Math.abs(next.yVel) : Math.abs(next.yVel),
    };
  }

  return next;
}

/** `180 - theta`, normalised — `PartGameArea.as:5389-5396`. */
function mirrorAcrossVertical(rotation: number): number {
  return rotation < 0 ? -180 - rotation : 180 - rotation;
}

/**
 * `-theta` — `PartGameArea.as:5461`, `:5504`.
 *
 * A horizontal wall flips the y component only: `(cos r, sin r)` becomes
 * `(cos r, -sin r)`, which is `-r`. No normalisation is needed because negating
 * a value in `(-180, 180]` stays in range.
 */
function mirrorAcrossHorizontal(rotation: number): number {
  return -rotation;
}

/** Which way a boss's border AI has locked its turn — `:4652`, `:4667`. */
export type LockDirection = 'None' | 'Clockwise' | 'CounterClockwise';

/**
 * A **boss** meeting a wall: turn toward the tank, one degree per frame.
 *
 * `PartGameArea.as:5516-5544`. All four wall branches set
 * `rotateTowardsTank = true` for `enemyLevel == "B"` instead of reflecting, and
 * this is what that flag runs. Bosses therefore never bounce — they grind along
 * the wall while swinging around to face the player.
 *
 * `:5521` snaps to the goal when already within a degree, rather than
 * oscillating across it.
 *
 * ── The `lockDirection` arm is ported but unreachable today ───────────────
 * `:5533-5542` overrides the turn with a fixed spin when the boss's border AI
 * has locked a direction. **Nothing in this port sets that**: its only producer
 * is `:4642-4680`, the 200-unit border-circling AI, which is unported (see the
 * gap list at the top of this file). Production always passes `'None'`.
 *
 * It is implemented rather than omitted because the rule is small, the AS3 line
 * is unambiguous, and a later pass porting `:4642-4680` would otherwise have to
 * re-derive it. It is driven in the tests for all three values so it cannot rot
 * silently — but **do not read its presence as evidence the border AI exists.**
 */
export function turnTowardsGoal(
  rotation: number,
  rotationGoal: number,
  lockDirection: LockDirection = 'None',
): number {
  if (lockDirection === 'Clockwise') return rotation + 1;
  if (lockDirection === 'CounterClockwise') return rotation - 1;

  const difference = shortestRotation(rotation, rotationGoal);
  if (difference < 1 && difference > -1) return rotationGoal;
  return difference > 0 ? rotation + 1 : rotation - 1;
}

/**
 * Whether the enemy is against a wall this frame — the condition the AS3
 * expresses as "the clamp branch was taken" (`:5372`, `:5406`, `:5441`,
 * `:5490`).
 *
 * Used for bosses, which need to know they hit a wall without the reflection
 * that `bounceOffWalls` would apply. `skipBottom` matches Defense's carve-out,
 * for symmetry with the bounce — no Boss level uses Defense mode today, so it
 * is consistency rather than a live case.
 */
export function atWall(
  state: SteeringState,
  roomWidth: number,
  roomHeight: number,
  radius: number,
  options: { skipBottom?: boolean } = {},
): boolean {
  if (state.x <= radius || state.x >= roomWidth - radius) return true;
  if (state.y <= radius) return true;
  return state.y >= roomHeight - radius && !options.skipBottom;
}
