/**
 * Defense mode's movement rule.
 *
 * The rule is a *subtraction*: `PartGameArea.as:4528` gates the entire steering
 * block — goal selection, tank-lead prediction, the capped turn, lines
 * 4528-4758 — on `levelMode != "Defense"`, while acceleration and integration
 * at :5027 stay outside it. So a Defense enemy keeps the heading `resolveSpawn`
 * gave it and travels in a straight line for its whole life.
 *
 * That makes the headline assertion "the heading never changes", which is
 * awkward to get wrong quietly: any re-steering at all shows up immediately.
 */
import { describe, expect, it } from 'vitest';
import {
  crossesDefenseLine,
  steerToward,
  angleToTarget,
  towerAngleToTarget,
} from './enemySteering';
import { DEFENSE_START_Y, tankStartPosition } from '../player/tankMovement';
import type { SteeringState, SteeringStats } from './enemySteering';
import { resolveSpawn } from './enemySpawn';

const STATS: SteeringStats = { rotSpeedMax: 2, accSpeed: 0.2, moveSpeedMax: 1.5 };
const ROOM = { width: 712, height: 960 };

/** The tank, deliberately off to one side so homing would be obvious. */
const TANK = { x: 80, y: 900 };

function spawnedAtTop(x: number, seed = 0.5): SteeringState {
  const spawn = resolveSpawn(
    { roomWidth: ROOM.width, roomHeight: ROOM.height, x, y: 0, wall: 1, width: 0, height: 0 },
    {
      mode: 'Defense',
      target: { x: ROOM.width / 2, y: ROOM.height / 2 },
      moveSpeedMax: STATS.moveSpeedMax,
      enemyType: 'Basic',
      random: () => seed,
    },
  );
  return { x: spawn.x, y: spawn.y, rotation: spawn.rotation, xVel: spawn.xVel, yVel: spawn.yVel };
}

/** One frame of Defense movement: hold the heading, accelerate, integrate. */
function stepDefense(state: SteeringState): SteeringState {
  return steerToward(state, STATS, TANK, 1000 / 30, state.rotation);
}

describe('Defense enemies do not re-steer', () => {
  it('holds its spawn heading across a whole descent', () => {
    let state = spawnedAtTop(356);
    const heading = state.rotation;

    for (let frame = 0; frame < 300; frame += 1) state = stepDefense(state);

    expect(state.rotation).toBe(heading);
  });

  it('would have turned a long way if it homed', () => {
    // Guards against a vacuous pass: if the tank were straight ahead the
    // heading would hardly move under homing either, and this test would prove
    // nothing. The tank is 276 units to the left, so homing is unmistakable.
    let homing = spawnedAtTop(356);
    const heading = homing.rotation;
    for (let frame = 0; frame < 300; frame += 1) {
      homing = steerToward(homing, STATS, TANK, 1000 / 30);
    }
    expect(Math.abs(homing.rotation - heading)).toBeGreaterThan(20);
  });

  it('descends monotonically and reaches the bottom of the lane', () => {
    // Seed 0.5 gives a 42-degree heading, so the vertical component is
    // 1.5 * sin(42) = 1.0 units per frame and the 960-unit lane takes ~960
    // frames. The fan is wide: a shallow entry crosses slowly, which is the
    // point of it.
    let state = spawnedAtTop(356);
    let previousY = state.y;
    let frames = 0;

    while (state.y < ROOM.height && frames < 2000) {
      state = stepDefense(state);
      expect(state.y).toBeGreaterThanOrEqual(previousY);
      previousY = state.y;
      frames += 1;
    }

    expect(state.y).toBeGreaterThanOrEqual(ROOM.height);
    expect(frames).toBeGreaterThan(900);
    expect(frames).toBeLessThan(1100);
  });

  it('preserves the spawn fan — different draws give different headings', () => {
    // The fan is the whole of Defense's variety, since nothing re-aims later.
    const headings = [0.1, 0.3, 0.6, 0.9].map((seed) => spawnedAtTop(356, seed).rotation);
    expect(new Set(headings).size).toBeGreaterThan(1);

    // Every one of them points into the lower half — 15..165 degrees, where 90
    // is straight down.
    for (const h of headings) {
      expect(h, `heading ${h}`).toBeGreaterThanOrEqual(15);
      expect(h, `heading ${h}`).toBeLessThanOrEqual(165);
    }
  });
});

describe('the other modes are untouched', () => {
  it('Normal still turns toward the tank', () => {
    const start: SteeringState = { x: 356, y: 0, rotation: 90, xVel: 0, yVel: 0 };
    const stepped = steerToward(start, STATS, TANK, 1000 / 30);

    // It moves toward the tank's bearing rather than holding 90.
    expect(stepped.rotation).not.toBe(90);
    const desired = angleToTarget(start, TANK);
    expect(Math.abs(desired - stepped.rotation)).toBeLessThan(Math.abs(desired - 90));
  });

  it('Tower still uses its own heading, not a held one', () => {
    const start: SteeringState = { x: 400, y: 0, rotation: 90, xVel: 0, yVel: 0 };
    const centre = { x: 400, y: 400 };
    const tower = towerAngleToTarget(start, centre, STATS.moveSpeedMax, 800);
    const stepped = steerToward(start, STATS, centre, 1000 / 30, tower);

    expect(stepped.rotation).not.toBe(90);
    expect(tower).not.toBeCloseTo(angleToTarget(start, centre), 1);
  });

  it('holding a heading is the only difference from the shared path', () => {
    // Same inputs, same everything except the desired angle — so nothing about
    // acceleration, the speed clamp or integration is special-cased.
    const start: SteeringState = { x: 356, y: 100, rotation: 90, xVel: 0, yVel: 0 };
    const held = steerToward(start, STATS, TANK, 1000 / 30, start.rotation);
    const aimed = steerToward(start, STATS, TANK, 1000 / 30, start.rotation + 0);

    expect(held).toEqual(aimed);
  });
});

describe('the defended line at the bottom of the lane', () => {
  const RADIUS = 12;

  it('is not crossed while the enemy is still descending', () => {
    for (const y of [0, 200, 600, 900, 947]) {
      const state: SteeringState = { x: 356, y, rotation: 90, xVel: 0, yVel: 0 };
      expect(crossesDefenseLine(state, ROOM.height, RADIUS), `y ${y}`).toBe(false);
    }
  });

  it('is crossed exactly where the wall bounce would have happened', () => {
    // Other modes clamp to `roomHeight - radius`; Defense takes the else branch
    // at the same threshold, so the two must trigger at the same line.
    const atLine: SteeringState = { x: 356, y: ROOM.height - RADIUS, rotation: 90, xVel: 0, yVel: 0 };
    expect(crossesDefenseLine(atLine, ROOM.height, RADIUS)).toBe(true);

    const justShort = { ...atLine, y: ROOM.height - RADIUS - 0.001 };
    expect(crossesDefenseLine(justShort, ROOM.height, RADIUS)).toBe(false);
  });

  it('a full descent ends at the line', () => {
    // End to end: spawn, fly, breach. Nothing re-steers on the way, so the
    // only thing that can stop it is the line itself.
    let state = spawnedAtTop(356);
    let frames = 0;
    while (!crossesDefenseLine(state, ROOM.height, RADIUS) && frames < 2000) {
      state = stepDefense(state);
      frames += 1;
    }
    expect(crossesDefenseLine(state, ROOM.height, RADIUS)).toBe(true);
    expect(frames).toBeLessThan(1100);
  });
});

describe('where the tank starts', () => {
  it('Defense starts near the top of the lane, not its centre', () => {
    // The change: 480 (room centre) -> 200. Enemies come down from above and
    // must pass the tank on their way to the line behind it.
    expect(tankStartPosition('Defense', 712, 960)).toEqual({ x: 356, y: 200 });
    expect(DEFENSE_START_Y).toBe(200);
  });

  it('every other mode still centres in the room', () => {
    expect(tankStartPosition('Normal', 800, 600)).toEqual({ x: 400, y: 300 });
    expect(tankStartPosition('Tower', 800, 800)).toEqual({ x: 400, y: 400 });
    expect(tankStartPosition('Flag', 800, 600)).toEqual({ x: 400, y: 300 });
    expect(tankStartPosition('Boss', 900, 720)).toEqual({ x: 450, y: 360 });
  });

  it('centres Defense horizontally rather than copying the AS3 literal', () => {
    // The AS3 says `cameraWidth / 2` = 320, which was the room centre when the
    // room and camera were both 640 wide. The lane is 712 now, so 320 would be
    // off-centre; the intent was centring, and that is what is kept.
    expect(tankStartPosition('Defense', 712, 960).x).toBe(356);
    expect(tankStartPosition('Defense', 640, 960).x).toBe(320);
  });
});
