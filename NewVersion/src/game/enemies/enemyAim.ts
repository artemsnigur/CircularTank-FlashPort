/**
 * Where an enemy aims — `PartGameArea.as:4528-4583`.
 *
 * ── Difficulty is not only multipliers ────────────────────────────────────
 * On Medium and Hard, enemies steer toward where the tank *will be* rather than
 * where it is. On Easy they do not. That is most of what makes the settings feel
 * different, and it is entirely separate from the health/damage/speed scaling in
 * `difficultyMultipliers.ts`:
 *
 *     Easy    goal = tank position
 *     Medium  goal = tank + velocity * 18   (`:4537`)
 *     Hard    goal = tank + velocity * 50   (`:4541`)
 *
 * The multiplier is a frame count, not a distance: `tank.xVel` is per-frame at
 * 30 fps, so Hard aims at roughly where the tank will be in 1.7 seconds if it
 * holds its current course.
 *
 * ── Only the target changes, never the formula ────────────────────────────
 * The AS3 computes a `goal` point and then feeds it to the *same* bearing
 * expression it would have used on the tank — both the ordinary form at `:4585`
 * and the Tower form at `:4589`. So this module produces a point and
 * `enemySteering` is untouched.
 *
 * ── Defense skips the whole path, not just the leading ────────────────────
 * `:4528` gates the entire block on `levelMode != "Defense"`, including the
 * `else` that would have aimed at the tank. A Defense enemy therefore takes no
 * goal from here at all; it runs its own lane logic in `defenseMode.ts`. This
 * returns the tank position for Defense so callers have one shape to handle,
 * but the reason is "this rule does not apply", not "Defense does not lead" —
 * a distinction that matters if anyone later adds leading to Defense.
 *
 * Frozen and teleporting enemies are excluded by the same `if`. The port
 * already suppresses their whole update through `Enemy.simulated`, so there is
 * nothing to reproduce here.
 */

import { angleToTarget } from './enemySteering';
import type { Difficulty } from '../config/constants';
import type { LevelMode } from '../levels/levelData';

/**
 * Frames of tank velocity an enemy leads by, per difficulty — `:4537`, `:4541`.
 *
 * Easy is 0 rather than absent: the AS3's `!= "Easy"` guard produces exactly
 * the un-led goal, so zero *is* the Easy rule rather than a stand-in for it.
 */
export const LEAD_FRAMES: Record<Difficulty, number> = {
  Easy: 0,
  Medium: 18,
  Hard: 50,
};

/** Half-angle of the cone within which an enemy is "facing the tank" — `:4532`. */
export const FACING_TOLERANCE_DEGREES = 90;

/**
 * A tank an enemy is aiming at.
 *
 * ── Velocity is required, deliberately ────────────────────────────────────
 * Not optional and not defaulted to zero. A zero default is silently the Easy
 * rule: every enemy would keep aiming straight at the tank and Medium and Hard
 * would differ only in their stat multipliers — working code, wrong game, and
 * invisible unless someone measured the aim. This is the `PlacementContext`
 * lesson: make the live value non-optional so omitting it is a compile error.
 */
export interface AimTank {
  x: number;
  y: number;
  xVel: number;
  yVel: number;
  radius: number;
}

export interface AimContext {
  difficulty: Difficulty;
  mode: LevelMode;
  /** The enemy's current facing, degrees, same convention as `angleToTarget`. */
  rotation: number;
  /** Half-extent kept clear of the walls — the enemy's own radius (`:4567`). */
  radius: number;
  roomWidth: number;
  roomHeight: number;
}

export interface AimPoint {
  x: number;
  y: number;
}

/**
 * Whether the enemy is facing the tank closely enough to lead it — `:4532`.
 *
 * The AS3 compares its facing against the bearing to the tank and requires the
 * difference to be inside ±90°, so an enemy that has been spun round or is
 * driving away keeps aiming at the tank's actual position until it has turned
 * back. Without this, an enemy pointing away would lead a target behind it and
 * arc outward.
 */
export function isFacingTank(
  enemy: { x: number; y: number; rotation: number },
  tank: { x: number; y: number },
): boolean {
  // Reuses `angleToTarget` rather than respelling it — one bearing formula,
  // see the convention note there.
  const toTank = angleToTarget(enemy, tank);
  let difference = (enemy.rotation - toTank) % 360;
  if (difference > 180) difference -= 360;
  if (difference <= -180) difference += 360;

  return difference > -FACING_TOLERANCE_DEGREES && difference < FACING_TOLERANCE_DEGREES;
}

/**
 * The point an enemy should steer at this frame.
 *
 * Returns the tank's position unless every condition for leading holds:
 * difficulty above Easy, the mode is not Defense, and the enemy is facing the
 * tank. The result is always clamped inside the room by the enemy's radius
 * (`:4562-4581`), which applies to the un-led point too — the AS3 clamps after
 * both branches, not only after the leading one.
 */
export function aimPoint(
  enemy: { x: number; y: number },
  tank: AimTank,
  context: AimContext,
): AimPoint {
  const lead = leadPoint(enemy, tank, context);
  return clampToRoom(lead, context);
}

function leadPoint(
  enemy: { x: number; y: number },
  tank: AimTank,
  context: AimContext,
): AimPoint {
  const frames = LEAD_FRAMES[context.difficulty];
  if (frames === 0 || context.mode === 'Defense') return { x: tank.x, y: tank.y };
  if (!isFacingTank({ ...enemy, rotation: context.rotation }, tank)) {
    return { x: tank.x, y: tank.y };
  }

  const goalX = tank.x + tank.xVel * frames;
  const goalY = tank.y + tank.yVel * frames;

  return clampOvershoot(enemy, tank, goalX, goalY);
}

/**
 * Stops the aim point from reaching past the enemy itself — `:4548-4560`.
 *
 * Without it a fast tank produces a goal far beyond the enemy's own position,
 * and the enemy turns to chase a point it has already passed instead of closing.
 * The AS3 caps the lead distance at `distance(tank, enemy) - tank.radius`,
 * keeping the same heading (the tank's velocity direction) and shortening it.
 *
 * When that cap is zero or negative the tank is already inside the enemy, and
 * the goal collapses to the tank's own position.
 */
function clampOvershoot(
  enemy: { x: number; y: number },
  tank: AimTank,
  goalX: number,
  goalY: number,
): AimPoint {
  const tankToGoal = Math.hypot(goalX - tank.x, goalY - tank.y);
  const tankToEnemy = Math.hypot(enemy.x - tank.x, enemy.y - tank.y);
  const limit = tankToEnemy - tank.radius;

  if (tankToGoal <= limit) return { x: goalX, y: goalY };
  if (limit <= 0) return { x: tank.x, y: tank.y };

  // Same bearing as the raw velocity, shortened to the limit. `atan2(yVel, xVel)`
  // here rather than the flipped idiom, matching `angleBetween` at `:4543`.
  const velAngle = Math.atan2(tank.yVel, tank.xVel);
  return {
    x: tank.x + Math.cos(velAngle) * limit,
    y: tank.y + Math.sin(velAngle) * limit,
  };
}

/** Keeps the goal inside the walls by the enemy's radius — `:4562-4581`. */
function clampToRoom(point: AimPoint, context: AimContext): AimPoint {
  const { radius, roomWidth, roomHeight } = context;
  return {
    x: Math.max(radius, Math.min(roomWidth - radius, point.x)),
    y: Math.max(radius, Math.min(roomHeight - radius, point.y)),
  };
}
