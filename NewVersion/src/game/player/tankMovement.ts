/**
 * Port of `SWFimported/scripts/Tank.as` — `moveTank()` and `rotateTank()`.
 *
 * Tank.as is 318 lines and self-contained apart from reading its speed stats
 * from the Speed upgrade, so this is a full port of its movement rather than a
 * slice. Grappling-hook drag (`grappingEnemy`) and knockback (`pushed`) are the
 * two exceptions — both are driven by the enemy behaviour loop, which is not
 * ported, so they are represented as inputs rather than implemented.
 *
 * ── Details that are easy to get wrong ────────────────────────────────────
 *  - **Diagonals are normalised.** `diaSpeed = accSpeed * sqrt(2) / 2`, so
 *    moving diagonally is not ~41% faster. (An earlier note in this codebase
 *    claimed the original failed to do this. It does not.)
 *  - **Single-axis input auto-centres the other axis** by `accSpeed / 3` per
 *    frame, so releasing one direction glides back to straight travel rather
 *    than keeping the drift.
 *  - **The tank bounces off walls** — `xVel = -xVel` — it does not stop dead.
 *  - Friction is applied to the *speed*, scaling both components, not per-axis.
 *  - The AS3's speed clamp lags by a frame; that one is **not** reproduced —
 *    see the note at the clamp for why.
 */

import type { UpgradeState } from '../upgrades/upgradeState';
import {
  TETHERED_TANK_ACC_SPEED,
  TETHERED_TANK_FRICTION,
  TETHERED_TANK_MAX_SPEED,
  TETHER_PULL,
} from '../enemies/enemyGrapple';
import { findUpgradeById, getStatValue } from '../upgrades/upgradeState';

const AS3_FPS = 30;

/** Tank.as static initialisers, used before the Speed upgrade is read. */
export const DEFAULT_MAX_SPEED = 3;
export const DEFAULT_ACC_SPEED = 0.5;
export const DEFAULT_FRICTION = 0.2;

/** Tank.as `rotSpeedMax` — degrees per frame the body turns toward travel. */
export const TANK_ROT_SPEED_MAX = 10;

export interface TankStats {
  maxSpeed: number;
  accSpeed: number;
  friction: number;
}

export interface DirectionalInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

export interface TankState {
  x: number;
  y: number;
  xVel: number;
  yVel: number;
  /** Body facing in degrees; the turret aims independently. */
  rotation: number;
  /** Speed as of the last rotate step — the clamp reads this, as the AS3 does. */
  speed: number;
}

export interface TankBounds {
  roomWidth: number;
  roomHeight: number;
  radius: number;
}

/**
 * Reads the tank's speed stats from the Speed upgrade.
 *
 * `upgradeArraySpeed` is the one 11-entry table, indexed by level directly, so
 * level 0 is a real baseline rather than "not owned" (Tank.as:64).
 */
export function tankStatsFor(upgrades: UpgradeState): TankStats {
  const speed = findUpgradeById('Speed');
  if (!speed) {
    return {
      maxSpeed: DEFAULT_MAX_SPEED,
      accSpeed: DEFAULT_ACC_SPEED,
      friction: DEFAULT_FRICTION,
    };
  }
  return {
    maxSpeed: getStatValue(upgrades, speed, 0) ?? DEFAULT_MAX_SPEED,
    accSpeed: getStatValue(upgrades, speed, 1) ?? DEFAULT_ACC_SPEED,
    friction: getStatValue(upgrades, speed, 2) ?? DEFAULT_FRICTION,
  };
}

/** Tank.as `reduceValue` — moves a value toward a limit without overshooting. */
export function reduceValue(value: number, reducer: number, limit = 0): number {
  if (value > limit) return value - reducer > limit ? value - reducer : limit;
  return value + reducer < limit ? value + reducer : limit;
}

/** Applies one frame of directional acceleration. */
function accelerate(
  state: TankState,
  input: DirectionalInput,
  stats: TankStats,
  frames: number,
): { xVel: number; yVel: number } {
  const acc = stats.accSpeed * frames;
  const diagonal = (acc * Math.SQRT2) / 2;
  const centring = acc / 3;

  let { xVel, yVel } = state;
  const { up, down, left, right } = input;

  const horizontal = left !== right;
  const vertical = up !== down;

  if (horizontal && vertical) {
    xVel += left ? -diagonal : diagonal;
    yVel += up ? -diagonal : diagonal;
  } else if (horizontal) {
    xVel += left ? -acc : acc;
    yVel = reduceValue(yVel, centring);
  } else if (vertical) {
    yVel += up ? -acc : acc;
    xVel = reduceValue(xVel, centring);
  }

  return { xVel, yVel };
}

export interface MoveResult extends TankState {
  /** True when the tank struck the bottom wall — AS3 `tempHitBottom`. */
  hitBottom: boolean;
}

/**
 * One frame of tank movement.
 *
 * Returns a new state; the input is not mutated. `frozen` stands in for the
 * AS3's `levelDone` and `pushed` flags, which suppress input and let friction
 * bring the tank to rest.
 */
export function moveTank(
  state: TankState,
  input: DirectionalInput,
  stats: TankStats,
  bounds: TankBounds,
  deltaMs: number,
  frozen = false,
): MoveResult {
  const frames = (deltaMs / 1000) * AS3_FPS;
  if (frames <= 0) return { ...state, hitBottom: false };

  const idle = !input.up && !input.down && !input.left && !input.right;

  let { xVel, yVel } = frozen ? state : accelerate(state, input, stats, frames);

  // Clamp to top speed, scaling both components.
  //
  // DELIBERATE DIVERGENCE: the AS3 tests `this.speed`, which is only refreshed
  // in `rotateTank()` *after* `moveTank()` runs — so its clamp lags by a frame
  // and the tank transiently exceeds maxSpeed by one acceleration step.
  // Reproducing that makes movement frame-rate dependent: the clamp fires per
  // frame, so at 60 fps it applies twice as often relative to acceleration,
  // and the tank travels ~6% further per second than at the original 30 fps.
  // The overspeed is imperceptible; the inconsistency is not. Clamping the
  // current speed is what the code plainly intends and is frame-rate stable.
  const currentSpeed = Math.hypot(xVel, yVel);
  if (currentSpeed > stats.maxSpeed && currentSpeed > 0) {
    const scale = stats.maxSpeed / currentSpeed;
    xVel *= scale;
    yVel *= scale;
  }

  // Friction, applied to speed rather than per-axis.
  if (idle || frozen) {
    const current = Math.hypot(xVel, yVel);
    const reduced = current - stats.friction * frames;
    if (reduced > 0 && current > 0) {
      xVel *= reduced / current;
      yVel *= reduced / current;
    } else {
      xVel = 0;
      yVel = 0;
    }
  }

  // Integrate with wall bounce.
  let { x, y } = state;
  let hitBottom = false;

  const stepX = xVel * frames;
  if (stepX > 0) {
    if (x + stepX < bounds.roomWidth - bounds.radius) x += stepX;
    else {
      x = bounds.roomWidth - bounds.radius;
      xVel = -xVel;
    }
  } else if (stepX < 0) {
    if (x + stepX > bounds.radius) x += stepX;
    else {
      x = bounds.radius;
      xVel = -xVel;
    }
  }

  const stepY = yVel * frames;
  if (stepY > 0) {
    if (y + stepY < bounds.roomHeight - bounds.radius) y += stepY;
    else {
      y = bounds.roomHeight - bounds.radius;
      yVel = -yVel;
      hitBottom = true;
    }
  } else if (stepY < 0) {
    if (y + stepY > bounds.radius) y += stepY;
    else {
      y = bounds.radius;
      yVel = -yVel;
    }
  }

  return { ...rotateTank({ ...state, x, y, xVel, yVel }, frames), hitBottom };
}

/**
 * `Tank.rotateTank()` — turns the body toward its direction of travel, capped
 * at `rotSpeedMax`, and refreshes `speed`.
 *
 * The AS3 uses `180 - atan2(xVel, yVel) * 180 / PI` and then wraps values at or
 * above 180 into the negative half, which is the same facing expressed in
 * (-180, 180].
 */
export function rotateTank(state: TankState, frames: number): TankState {
  const speed = Math.hypot(state.xVel, state.yVel);
  if (speed <= 0) return { ...state, speed };

  let goal = 180 - (Math.atan2(state.xVel, state.yVel) * 180) / Math.PI;
  if (goal >= 180) goal -= 360;

  let difference = goal - state.rotation;
  if (Math.abs(difference) > 180) {
    difference = difference > 0 ? -(360 - Math.abs(difference)) : 360 - Math.abs(difference);
  }

  const maxTurn = TANK_ROT_SPEED_MAX * frames;
  const rotation =
    Math.abs(difference) < maxTurn ? goal : state.rotation + Math.sign(difference) * maxTurn;

  return { ...state, rotation, speed };
}

/** A fresh tank at the centre of the room. */
export function createTankState(x: number, y: number): TankState {
  return { x, y, xVel: 0, yVel: 0, rotation: -90, speed: 0 };
}

/**
 * Half the original Flash stage height — `PartGameArea.as:346`.
 *
 * The AS3 places the Defense tank at `cameraWidth / 2, cameraHeight / 2` where
 * the camera was a fixed 640x400 stage, so 200 units from the top of a 960-tall
 * lane. This port's camera height is *also* 400 on every landscape window,
 * because `MIN_LOGICAL_HEIGHT` clamps it there — but that is a coincidence of
 * the current viewport rule, not a constant, and deriving from it would make
 * the tank's starting position depend on window shape. Pinned instead.
 */
export const DEFENSE_START_Y = 200;

/**
 * Where the tank starts a level.
 *
 * Every mode centres in the room except Defense, which starts near the *top* of
 * its lane so enemies descending from above pass it on the way to the line
 * behind. The AS3 expresses that as `cameraWidth / 2, cameraHeight / 2` — but
 * only the vertical half is a real divergence from centring: with the original
 * room and camera both 640 wide, `cameraWidth / 2` *was* the room centre. So
 * horizontally this keeps centring the tank, which preserves the intent in a
 * lane that is no longer 640 wide, and vertically it takes the fixed 200.
 */
export function tankStartPosition(
  mode: string,
  roomWidth: number,
  roomHeight: number,
): { x: number; y: number } {
  return {
    x: roomWidth / 2,
    y: mode === 'Defense' ? DEFENSE_START_Y : roomHeight / 2,
  };
}

/**
 * The tank's handling while a **boss** grappler has it tethered —
 * `Tank.as:84-93`.
 *
 * The tether overwrites the player's upgraded stats outright rather than
 * modifying them, so a fully upgraded tank handles exactly the same as an
 * unupgraded one while attached. That is the mechanic: it is a handling
 * penalty, not a slow.
 *
 * Only the boss does this. A non-boss GrapplingHook sets `isGrapping` on itself
 * and charges; it never touches the tank.
 */
export function tetheredTankStats(): TankStats {
  return {
    maxSpeed: TETHERED_TANK_MAX_SPEED,
    accSpeed: TETHERED_TANK_ACC_SPEED,
    friction: TETHERED_TANK_FRICTION,
  };
}

/**
 * Velocity after one frame of being dragged toward the tethering enemy.
 *
 * Added to the tank's own velocity rather than replacing it, so the player can
 * still fight the pull — unlike the enemy's reel, which overwrites.
 */
export function tetherPull(
  state: { xVel: number; yVel: number },
  tankX: number,
  tankY: number,
  enemy: { x: number; y: number },
  frames: number,
): { xVel: number; yVel: number } {
  const angle = Math.atan2(enemy.y - tankY, enemy.x - tankX);
  return {
    xVel: state.xVel + Math.cos(angle) * TETHER_PULL * frames,
    yVel: state.yVel + Math.sin(angle) * TETHER_PULL * frames,
  };
}

/**
 * Keeps a directly-written tank position inside the room.
 *
 * ── Deliberate divergence from the AS3 ────────────────────────────────────
 * `PartGameArea.as:5319-5320` shoves the tank clear of a boss's hitbox by
 * writing `tank.x`/`tank.y` outright, with **no clamp**. Against a boss pinned
 * against a wall that places the player outside the room, where nothing pulls
 * them back — the ordinary movement clamp only constrains *steps*, not absolute
 * writes.
 *
 * Clamped here instead. This is the same category as the `:1716` magic-retarget
 * fix rather than Group A's stat quirks: a reachable defect with a visible
 * consequence, not a balance oddity worth preserving.
 */
export function clampTankToRoom(
  x: number,
  y: number,
  bounds: TankBounds,
): { x: number; y: number } {
  return {
    x: Math.min(Math.max(x, bounds.radius), bounds.roomWidth - bounds.radius),
    y: Math.min(Math.max(y, bounds.radius), bounds.roomHeight - bounds.radius),
  };
}
