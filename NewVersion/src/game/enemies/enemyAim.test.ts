import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { FACING_TOLERANCE_DEGREES, LEAD_FRAMES, aimPoint, isFacingTank } from './enemyAim';
import { angleToTarget } from './enemySteering';
import type { AimContext, AimTank } from './enemyAim';
import type { Difficulty } from '../config/constants';

const ROOM = { roomWidth: 2000, roomHeight: 2000, radius: 12 };

/** A tank at the origin-ish centre, driving right at 4 units a frame. */
const drivingRight = (over: Partial<AimTank> = {}): AimTank => ({
  x: 1000,
  y: 1000,
  xVel: 4,
  yVel: 0,
  radius: 14,
  ...over,
});

/** An enemy 400 units below the tank, facing it. */
const below = { x: 1000, y: 1400 };

function context(difficulty: Difficulty, over: Partial<AimContext> = {}): AimContext {
  return {
    difficulty,
    mode: 'Normal',
    // Facing the tank, which is straight up from `below`.
    rotation: angleToTarget(below, { x: 1000, y: 1000 }),
    ...ROOM,
    ...over,
  };
}

describe('Easy does not lead at all', () => {
  it('aims at the tank however fast it is moving', () => {
    expect(LEAD_FRAMES.Easy).toBe(0);
    const tank = drivingRight({ xVel: 12 });

    expect(aimPoint(below, tank, context('Easy'))).toEqual({ x: 1000, y: 1000 });
  });

  it('zero is the rule, not a placeholder', () => {
    // `PartGameArea.as:4532` guards on `levelDifficulty != "Easy"`, whose else
    // branch sets the goal to the tank outright. Multiplying by zero frames is
    // the same point, so Easy needs no special case downstream.
    const tank = drivingRight();
    const easy = aimPoint(below, tank, context('Easy'));
    const stationary = aimPoint(below, { ...tank, xVel: 0, yVel: 0 }, context('Hard'));

    expect(easy).toEqual(stationary);
  });
});

describe('Medium and Hard lead by their own frame counts', () => {
  it('Hard leads 50 frames of tank velocity', () => {
    expect(LEAD_FRAMES.Hard).toBe(50);
    // 4 units/frame * 50 = 200 ahead, and 200 < the 386-unit overshoot limit.
    expect(aimPoint(below, drivingRight(), context('Hard'))).toEqual({ x: 1200, y: 1000 });
  });

  it('Medium leads 18', () => {
    expect(LEAD_FRAMES.Medium).toBe(18);
    // 4 * 18 = 72.
    expect(aimPoint(below, drivingRight(), context('Medium'))).toEqual({ x: 1072, y: 1000 });
  });

  it('Hard leads further than Medium, which leads further than Easy', () => {
    const tank = drivingRight();
    const distance = (d: Difficulty) => aimPoint(below, tank, context(d)).x - tank.x;

    expect(distance('Easy')).toBe(0);
    expect(distance('Medium')).toBeLessThan(distance('Hard'));
    expect(distance('Medium')).toBe(72);
    expect(distance('Hard')).toBe(200);
  });

  it('leads along the velocity, not along the facing', () => {
    // Tank driving straight down, enemy below it: the goal moves toward the
    // enemy, not sideways.
    const tank = drivingRight({ xVel: 0, yVel: 3 });

    expect(aimPoint(below, tank, context('Hard'))).toEqual({ x: 1000, y: 1150 });
  });

  it('a stationary tank is its own aim point on every difficulty', () => {
    const still = drivingRight({ xVel: 0, yVel: 0 });
    for (const difficulty of ['Easy', 'Medium', 'Hard'] as const) {
      expect(aimPoint(below, still, context(difficulty)), difficulty).toEqual({
        x: 1000,
        y: 1000,
      });
    }
  });
});

describe('the facing gate', () => {
  it('is a 90-degree half-cone', () => {
    expect(FACING_TOLERANCE_DEGREES).toBe(90);
  });

  it('an enemy facing away aims at the tank, not ahead of it', () => {
    // Turned 180 degrees from the tank. Without the gate it would lead a target
    // behind itself and arc outward.
    const facingAway = context('Hard', { rotation: context('Hard').rotation + 180 });

    expect(aimPoint(below, drivingRight(), facingAway)).toEqual({ x: 1000, y: 1000 });
  });

  it('holds just inside the cone and releases just outside', () => {
    const toTank = context('Hard').rotation;
    const tank = drivingRight();

    const inside = aimPoint(below, tank, context('Hard', { rotation: toTank + 89 }));
    const outside = aimPoint(below, tank, context('Hard', { rotation: toTank + 91 }));

    expect(inside.x).toBeGreaterThan(tank.x);
    expect(outside).toEqual({ x: 1000, y: 1000 });
  });

  it('is symmetric, so turning either way behaves the same', () => {
    const toTank = context('Hard').rotation;
    const tank = drivingRight();

    for (const offset of [-89, 89]) {
      expect(aimPoint(below, tank, context('Hard', { rotation: toTank + offset })).x).toBe(1200);
    }
    for (const offset of [-91, 91]) {
      expect(aimPoint(below, tank, context('Hard', { rotation: toTank + offset }))).toEqual({
        x: 1000,
        y: 1000,
      });
    }
  });

  it('wraps rather than comparing raw degrees', () => {
    // 360 degrees round is still facing the tank. A raw subtraction would read
    // this as 360 and fail the gate.
    const toTank = context('Hard').rotation;

    expect(isFacingTank({ ...below, rotation: toTank + 360 }, { x: 1000, y: 1000 })).toBe(true);
    expect(isFacingTank({ ...below, rotation: toTank - 360 }, { x: 1000, y: 1000 })).toBe(true);
  });
});

/**
 * Defense skips the whole path.
 *
 * `PartGameArea.as:4528` gates the entire block — including the `else` that
 * aims at the tank — on `levelMode != "Defense"`, so a Defense enemy takes no
 * goal from here at all. The tank position is the fallback shape, not a
 * statement that Defense leads by zero.
 */
describe('Defense is excluded, and for that reason', () => {
  it('never leads, even on Hard with a fast tank', () => {
    const tank = drivingRight({ xVel: 20 });

    expect(aimPoint(below, tank, context('Hard', { mode: 'Defense' }))).toEqual({
      x: 1000,
      y: 1000,
    });
  });

  it('is excluded by mode rather than by the facing gate', () => {
    // Facing the tank squarely, so the gate would pass. Only the mode stops it.
    const facing = context('Hard', { mode: 'Defense' });
    expect(isFacingTank({ ...below, rotation: facing.rotation }, { x: 1000, y: 1000 })).toBe(true);
    expect(aimPoint(below, drivingRight(), facing)).toEqual({ x: 1000, y: 1000 });
  });

  it('the enemy does not steer at it anyway', () => {
    // The reason the fallback is harmless: Enemy.update holds a Defense
    // enemy's heading rather than turning it toward any goal.
    const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(source).toMatch(/defense\s*\?\s*this\.steering\.rotation/);
  });

  it('every other mode does lead', () => {
    for (const mode of ['Normal', 'Flag', 'Boss', 'Tower'] as const) {
      expect(aimPoint(below, drivingRight(), context('Hard', { mode })).x, mode).toBe(1200);
    }
  });
});

/**
 * The overshoot clamp — `:4548-4560`.
 *
 * Without it a fast tank puts the goal past the enemy, and the enemy turns to
 * chase a point it has already gone by instead of closing.
 */
describe('the aim point never reaches past the enemy', () => {
  it('caps the lead at the enemy distance less the tank radius', () => {
    // 400 apart, tank radius 14, so the cap is 386. A 30/frame tank would ask
    // for 1500.
    const tank = drivingRight({ xVel: 30 });
    const point = aimPoint(below, tank, context('Hard'));

    expect(Math.hypot(point.x - tank.x, point.y - tank.y)).toBeCloseTo(386, 6);
    expect(point).toEqual({ x: 1386, y: 1000 });
  });

  it('keeps the velocity heading while shortening it', () => {
    // Diagonal at 45 degrees; the capped point stays on that bearing.
    const tank = drivingRight({ xVel: 30, yVel: 30 });
    const point = aimPoint(below, tank, context('Hard'));
    const limit = 400 - tank.radius;

    expect(Math.hypot(point.x - tank.x, point.y - tank.y)).toBeCloseTo(limit, 6);
    expect(point.x - tank.x).toBeCloseTo(point.y - tank.y, 6);
  });

  it('leaves a lead that is already short enough alone', () => {
    // 4 * 50 = 200, well inside the 386 cap, so no clamping happens.
    expect(aimPoint(below, drivingRight(), context('Hard'))).toEqual({ x: 1200, y: 1000 });
  });

  it('collapses onto the tank when it is inside the enemy', () => {
    // Enemy 10 away, tank radius 14: the cap is negative, so there is no room
    // to lead into at all.
    const tank = drivingRight({ xVel: 20 });
    const touching = { x: 1000, y: 1010 };

    expect(aimPoint(touching, tank, context('Hard'))).toEqual({ x: 1000, y: 1000 });
  });

  it('the cap scales with the gap, so a distant enemy may lead fully', () => {
    const tank = drivingRight({ xVel: 30 });
    const near = aimPoint({ x: 1000, y: 1100 }, tank, context('Hard'));
    const far = aimPoint({ x: 1000, y: 1900 }, tank, context('Hard'));

    expect(near.x - tank.x).toBeCloseTo(100 - tank.radius, 6);
    // 30 * 50 = 1500, capped at 900 - 14.
    expect(far.x - tank.x).toBeCloseTo(900 - tank.radius, 6);
  });
});

describe('the goal stays inside the room', () => {
  const tight: Partial<AimContext> = { roomWidth: 1100, roomHeight: 2000, radius: 12 };

  it('clamps by the enemy radius, not the tank radius', () => {
    const point = aimPoint(below, drivingRight({ xVel: 30 }), context('Hard', tight));
    expect(point.x).toBe(1100 - 12);
  });

  it('clamps the un-led point too', () => {
    // The AS3 clamps after both branches (`:4562`), not only after leading, so
    // a tank standing in a wall still produces an in-room goal.
    const outside = drivingRight({ x: 5000, y: -50, xVel: 0, yVel: 0 });
    const point = aimPoint(below, outside, context('Easy', tight));

    expect(point).toEqual({ x: 1088, y: 12 });
  });
});

describe('the two angle conventions are equal, and both are kept', () => {
  it('90 - atan2(dx, dy) is atan2(dy, dx)', () => {
    // `angleBetween` (`:2594`) and `rotationGoal` (`:4585`) spell the same
    // bearing two ways and sit in the same function. The note on
    // `angleToTarget` says not to "fix" either; this is the check behind it.
    for (const [dx, dy] of [
      [1, 0],
      [0, 1],
      [-1, 0],
      [3, 4],
      [-7, 2],
    ]) {
      const flipped = angleToTarget({ x: 0, y: 0 }, { x: dx, y: dy });
      const plain = (Math.atan2(dy, dx) * 180) / Math.PI;
      // Normalised into (-180, 180]: the two spellings differ by nothing.
      const difference = ((((flipped - plain) % 360) + 540) % 360) - 180;
      expect(difference, `dx=${dx} dy=${dy}`).toBeCloseTo(0, 9);
    }
  });

  it('the warning is written down beside the function', () => {
    const source = readFileSync('src/game/enemies/enemySteering.ts', 'utf8');
    expect(source).toContain('Two conventions, one angle');
    expect(source).toContain('atan2(dy, dx)');
  });
});

describe('the enemy actually steers at the aim point', () => {
  it('feeds the goal to both steering formulas, not the raw tank', () => {
    // The wiring failure this project keeps hitting: a correct module the scene
    // never routes through. Both the ordinary and the Tower bearing must take
    // the goal.
    const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(source).toContain('const goal = aimPoint(this.steering, target, {');
    expect(source).toMatch(/^\s*goal,\s*$/m);
    expect(source).toContain('towerAngleToTarget(this.steering, goal,');
    // And the raw tank must not still be the steering target.
    expect(source).not.toMatch(/^\s*target,\s*\r?\n\s*deltaMs,/m);
  });

  it('the scene hands over the tank velocity rather than a zero default', () => {
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).toContain('xVel: this.player.xVelPerFrame');
    expect(scene).toContain('yVel: this.player.yVelPerFrame');
    expect(scene).toContain('radius: this.player.radius');
  });
});
