import { describe, expect, it } from 'vitest';
import {
  createTankState,
  DEFAULT_ACC_SPEED,
  DEFAULT_FRICTION,
  DEFAULT_MAX_SPEED,
  moveTank,
  reduceValue,
  rotateTank,
  tankStatsFor,
} from './tankMovement';
import type { DirectionalInput, TankStats } from './tankMovement';
import { createInitialUpgradeState } from '../upgrades/upgradeState';

const FRAME = 1000 / 30;
const BOUNDS = { roomWidth: 640, roomHeight: 960, radius: 29 };

const stats: TankStats = {
  maxSpeed: DEFAULT_MAX_SPEED,
  accSpeed: DEFAULT_ACC_SPEED,
  friction: DEFAULT_FRICTION,
};

const NO_INPUT: DirectionalInput = { up: false, down: false, left: false, right: false };
const input = (overrides: Partial<DirectionalInput>): DirectionalInput => ({
  ...NO_INPUT,
  ...overrides,
});

const centre = () => createTankState(320, 480);

describe('tankStatsFor', () => {
  it('reads the Speed upgrade at level 0, which has a real baseline', () => {
    // upgradeArraySpeed is the one 11-entry table, indexed by level directly.
    const s = tankStatsFor(createInitialUpgradeState());
    expect(s.maxSpeed).toBe(3.25);
    expect(s.accSpeed).toBe(0.5);
    expect(s.friction).toBe(0.2);
  });

  it('improves with the upgrade level', () => {
    const upgrades = createInitialUpgradeState();
    upgrades.misc[0] = 10;
    const s = tankStatsFor(upgrades);
    expect(s.maxSpeed).toBe(5.75);
    expect(s.accSpeed).toBe(1);
  });
});

describe('reduceValue', () => {
  it('moves toward the limit without overshooting', () => {
    expect(reduceValue(1, 0.3)).toBeCloseTo(0.7, 10);
    expect(reduceValue(0.2, 0.3)).toBe(0);
    expect(reduceValue(-1, 0.3)).toBeCloseTo(-0.7, 10);
    expect(reduceValue(-0.2, 0.3)).toBe(0);
  });

  it('respects a non-zero limit', () => {
    expect(reduceValue(5, 1, 3)).toBe(4);
    expect(reduceValue(3.5, 1, 3)).toBe(3);
  });
});

describe('moveTank — acceleration', () => {
  it('accelerates along a single axis', () => {
    const next = moveTank(centre(), input({ right: true }), stats, BOUNDS, FRAME);
    expect(next.xVel).toBeCloseTo(stats.accSpeed, 6);
    expect(next.yVel).toBeCloseTo(0, 6);
  });

  it('normalises diagonals so they are not faster', () => {
    // diaSpeed = accSpeed * sqrt(2) / 2 — the original does normalise.
    const diagonal = moveTank(
      centre(),
      input({ right: true, down: true }),
      stats,
      BOUNDS,
      FRAME,
    );
    const straight = moveTank(centre(), input({ right: true }), stats, BOUNDS, FRAME);

    expect(Math.hypot(diagonal.xVel, diagonal.yVel)).toBeCloseTo(
      Math.hypot(straight.xVel, straight.yVel),
      6,
    );
  });

  it('auto-centres the perpendicular axis on single-axis input', () => {
    let state = centre();
    state.yVel = 1;
    state = moveTank(state, input({ right: true }), stats, BOUNDS, FRAME);
    expect(state.yVel).toBeLessThan(1);
    expect(state.yVel).toBeCloseTo(1 - stats.accSpeed / 3, 6);
  });

  it('cancels opposing input', () => {
    const next = moveTank(centre(), input({ left: true, right: true }), stats, BOUNDS, FRAME);
    expect(next.xVel).toBe(0);
  });

  it('reaches but does not exceed top speed', () => {
    // A wide room, so the run is not interrupted by a wall bounce.
    const openRoom = { roomWidth: 100000, roomHeight: 100000, radius: 29 };
    let state = createTankState(100, 100);

    for (let i = 0; i < 200; i += 1) {
      state = moveTank(state, input({ right: true }), stats, openRoom, FRAME);
    }
    // Clamped to exactly maxSpeed — the AS3's one-frame lag is deliberately
    // not reproduced, so there is no overshoot.
    expect(state.speed).toBeCloseTo(stats.maxSpeed, 6);
  });
});

describe('moveTank — friction', () => {
  it('slows to a stop with no input', () => {
    let state = centre();
    for (let i = 0; i < 20; i += 1) {
      state = moveTank(state, input({ right: true }), stats, BOUNDS, FRAME);
    }
    expect(state.speed).toBeGreaterThan(0);

    for (let i = 0; i < 200; i += 1) {
      state = moveTank(state, NO_INPUT, stats, BOUNDS, FRAME);
    }
    expect(state.xVel).toBe(0);
    expect(state.yVel).toBe(0);
  });

  it('scales both components, preserving direction', () => {
    let state = centre();
    for (let i = 0; i < 10; i += 1) {
      state = moveTank(state, input({ right: true, down: true }), stats, BOUNDS, FRAME);
    }
    const ratioBefore = state.xVel / state.yVel;

    state = moveTank(state, NO_INPUT, stats, BOUNDS, FRAME);
    expect(state.xVel / state.yVel).toBeCloseTo(ratioBefore, 6);
  });
});

describe('moveTank — walls', () => {
  // Velocities here stay within maxSpeed, or the clamp scales them down before
  // the wall test ever runs and the tank stops short.
  it('bounces off the right wall rather than stopping', () => {
    const state = { ...createTankState(BOUNDS.roomWidth - BOUNDS.radius - 1, 480), xVel: 3 };
    const next = moveTank(state, input({ right: true }), stats, BOUNDS, FRAME);

    expect(next.x).toBe(BOUNDS.roomWidth - BOUNDS.radius);
    expect(next.xVel).toBeLessThan(0);
  });

  it('bounces off the left wall', () => {
    const state = { ...createTankState(BOUNDS.radius + 1, 480), xVel: -3 };
    const next = moveTank(state, input({ left: true }), stats, BOUNDS, FRAME);

    expect(next.x).toBe(BOUNDS.radius);
    expect(next.xVel).toBeGreaterThan(0);
  });

  it('flags a bottom-wall hit', () => {
    const state = { ...createTankState(320, BOUNDS.roomHeight - BOUNDS.radius - 1), yVel: 3 };
    const next = moveTank(state, input({ down: true }), stats, BOUNDS, FRAME);

    expect(next.hitBottom).toBe(true);
    expect(next.y).toBe(BOUNDS.roomHeight - BOUNDS.radius);
  });

  it('does not flag a top-wall hit', () => {
    const state = { ...createTankState(320, BOUNDS.radius + 1), yVel: -3 };
    expect(moveTank(state, input({ up: true }), stats, BOUNDS, FRAME).hitBottom).toBe(false);
  });

  it('stays inside the room over a long run', () => {
    let state = centre();
    for (let i = 0; i < 2000; i += 1) {
      const dir = input({ right: i % 200 < 100, left: i % 200 >= 100, down: i % 97 < 50 });
      state = moveTank(state, dir, stats, BOUNDS, FRAME);
      expect(state.x).toBeGreaterThanOrEqual(BOUNDS.radius);
      expect(state.x).toBeLessThanOrEqual(BOUNDS.roomWidth - BOUNDS.radius);
      expect(state.y).toBeGreaterThanOrEqual(BOUNDS.radius);
      expect(state.y).toBeLessThanOrEqual(BOUNDS.roomHeight - BOUNDS.radius);
    }
  });
});

describe('moveTank — misc', () => {
  it('is a no-op for a zero delta', () => {
    const state = centre();
    const next = moveTank(state, input({ right: true }), stats, BOUNDS, 0);
    expect(next.x).toBe(state.x);
    expect(next.xVel).toBe(state.xVel);
  });

  it('ignores input when frozen but still applies friction', () => {
    const state = { ...centre(), xVel: 2, speed: 2 };

    const next = moveTank(state, input({ right: true }), stats, BOUNDS, FRAME, true);
    expect(next.xVel).toBeLessThan(2);
  });

  it('does not mutate the state it was given', () => {
    const state = centre();
    moveTank(state, input({ right: true }), stats, BOUNDS, FRAME);
    expect(state.xVel).toBe(0);
    expect(state.x).toBe(320);
  });

  it('is frame-rate independent', () => {
    // Only holds because the AS3's lagging speed clamp is not reproduced; with
    // the lag this drifts ~6% between 30 and 60 fps. See tankMovement.ts.
    const openRoom = { roomWidth: 100000, roomHeight: 100000, radius: 29 };

    let at30 = createTankState(0, 0);
    for (let i = 0; i < 60; i += 1) {
      at30 = moveTank(at30, input({ right: true }), stats, openRoom, 1000 / 30);
    }

    let at60 = createTankState(0, 0);
    for (let i = 0; i < 120; i += 1) {
      at60 = moveTank(at60, input({ right: true }), stats, openRoom, 1000 / 60);
    }

    const drift = Math.abs(at60.x - at30.x) / at30.x;
    expect(drift).toBeLessThan(0.01);
  });
});

describe('rotateTank', () => {
  it('does not rotate when stationary', () => {
    const state = centre();
    expect(rotateTank(state, 1).rotation).toBe(state.rotation);
  });

  it('turns toward the direction of travel', () => {
    const state = { ...centre(), xVel: 1, yVel: 0, rotation: 0 };
    const next = rotateTank(state, 1);
    expect(next.rotation).not.toBe(0);
    expect(next.speed).toBeCloseTo(1, 10);
  });

  it('converges on the travel direction when given enough frames', () => {
    let state = { ...centre(), xVel: 1, yVel: 0, rotation: 170 };
    for (let i = 0; i < 100; i += 1) state = rotateTank(state, 1);

    // Moving along +x; the AS3 formula gives 180 - atan2(1, 0) * 180/PI = 90.
    expect(state.rotation).toBeCloseTo(90, 6);
  });

  it('takes the short way round', () => {
    const state = { ...centre(), xVel: 0, yVel: -1, rotation: 175 };
    const next = rotateTank(state, 1);
    // Goal is -180+... ; turning should not sweep the long way through 0.
    expect(Math.abs(next.rotation - state.rotation)).toBeLessThanOrEqual(10 + 1e-9);
  });

  it('refreshes speed', () => {
    const state = { ...centre(), xVel: 3, yVel: 4, speed: 0 };
    expect(rotateTank(state, 1).speed).toBeCloseTo(5, 10);
  });
});
