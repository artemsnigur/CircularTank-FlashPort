import { describe, expect, it } from 'vitest';
import {
  angleToTarget,
  clampToRoom,
  shortestRotation,
  steerToward,
  TOWER_ACC_SPEED_MAX,
  towerAccSpeed,
  towerAngleToTarget,
  towerRotSpeedMax,
} from './enemySteering';
import { resolveSpawn } from './enemySpawn';
import type { SteeringState, SteeringStats } from './enemySteering';
import { resolveEnemyStats } from './enemyStats';

/** One frame at the SWF's 30 fps. */
const FRAME = 1000 / 30;

const state = (overrides: Partial<SteeringState> = {}): SteeringState => ({
  x: 0,
  y: 0,
  rotation: 0,
  xVel: 0,
  yVel: 0,
  ...overrides,
});

const stats: SteeringStats = { rotSpeedMax: 1, accSpeed: 0.2, moveSpeedMax: 1.5 };

describe('shortestRotation', () => {
  it('takes the short way round', () => {
    expect(shortestRotation(350, 10)).toBe(20);
    expect(shortestRotation(10, 350)).toBe(-20);
  });

  it('handles the antipodal case consistently', () => {
    expect(Math.abs(shortestRotation(0, 180))).toBe(180);
  });

  it('is zero for identical angles', () => {
    expect(shortestRotation(45, 45)).toBe(0);
    expect(shortestRotation(45, 405)).toBe(0);
  });

  it('always lands in (-180, 180]', () => {
    for (let from = -720; from <= 720; from += 37) {
      for (let to = -720; to <= 720; to += 53) {
        const diff = shortestRotation(from, to);
        expect(diff, `${from}->${to}`).toBeGreaterThan(-181);
        expect(diff, `${from}->${to}`).toBeLessThanOrEqual(180);
      }
    }
  });
});

describe('angleToTarget', () => {
  it('agrees with the spawn-time facing convention', () => {
    expect(angleToTarget(state(), { x: 100, y: 0 })).toBeCloseTo(0, 10);
    expect(angleToTarget(state(), { x: 0, y: 100 })).toBeCloseTo(90, 10);
  });
});

describe('steerToward', () => {
  it('turns no faster than rotSpeedMax per frame', () => {
    const next = steerToward(state({ rotation: 0 }), stats, { x: 0, y: 100 }, FRAME);
    expect(Math.abs(next.rotation)).toBeLessThanOrEqual(stats.rotSpeedMax + 1e-9);
  });

  it('turns toward the target, not away', () => {
    const next = steerToward(state({ rotation: 0 }), stats, { x: 0, y: 100 }, FRAME);
    expect(next.rotation).toBeGreaterThan(0); // target is at +90
  });

  it('snaps to the target angle when already within one frame of turning', () => {
    const next = steerToward(state({ rotation: 89.5 }), stats, { x: 0, y: 100 }, FRAME);
    expect(next.rotation).toBeCloseTo(90, 6);
  });

  it('accelerates along its facing', () => {
    const next = steerToward(state({ rotation: 0 }), stats, { x: 1000, y: 0 }, FRAME);
    expect(next.xVel).toBeCloseTo(stats.accSpeed, 6);
    expect(next.yVel).toBeCloseTo(0, 6);
  });

  it('never exceeds moveSpeedMax however long it runs', () => {
    let current = state({ rotation: 0 });
    for (let i = 0; i < 500; i += 1) {
      current = steerToward(current, stats, { x: 10000, y: 0 }, FRAME);
      expect(Math.hypot(current.xVel, current.yVel)).toBeLessThanOrEqual(
        stats.moveSpeedMax + 1e-9,
      );
    }
  });

  it('closes the distance to a stationary target', () => {
    let current = state({ x: 0, y: 0, rotation: 0 });
    const target = { x: 300, y: 200 };
    const before = Math.hypot(target.x - current.x, target.y - current.y);

    for (let i = 0; i < 200; i += 1) current = steerToward(current, stats, target, FRAME);

    expect(Math.hypot(target.x - current.x, target.y - current.y)).toBeLessThan(before);
  });

  it('orbits rather than converging, because turning is rate-limited', () => {
    // A constant-speed pursuer that can only turn `rotSpeedMax` per frame has a
    // minimum turning radius of v / omega. At 1.5 units per frame and 1 degree
    // per frame that is ~86 units, so it cannot spiral in to zero — it settles
    // into an orbit. This is the AS3's behaviour too, and it is why enemies
    // circle the tank instead of stacking on it.
    const turnRadius = stats.moveSpeedMax / ((stats.rotSpeedMax * Math.PI) / 180);
    expect(turnRadius).toBeGreaterThan(80);

    let current = state({ x: 0, y: 0, rotation: 0 });
    const target = { x: 200, y: 150 };
    const start = Math.hypot(target.x - current.x, target.y - current.y);

    const distances: number[] = [];
    for (let i = 0; i < 1000; i += 1) {
      current = steerToward(current, stats, target, FRAME);
      distances.push(Math.hypot(target.x - current.x, target.y - current.y));
    }

    // It gets close, and then stays in the neighbourhood rather than diverging.
    expect(Math.min(...distances)).toBeLessThan(start / 2);
    const settled = distances.slice(-500);
    expect(Math.max(...settled)).toBeLessThan(turnRadius * 2.5);
  });

  it('converges when it can turn tightly enough', () => {
    // Give it a much higher turn rate and the orbit collapses.
    const agile: SteeringStats = { ...stats, rotSpeedMax: 12 };
    let current = state({ x: 0, y: 0, rotation: 0 });
    const target = { x: 200, y: 150 };

    let closest = Infinity;
    for (let i = 0; i < 1000; i += 1) {
      current = steerToward(current, agile, target, FRAME);
      closest = Math.min(closest, Math.hypot(target.x - current.x, target.y - current.y));
    }
    expect(closest).toBeLessThan(20);
  });

  it('is frame-rate independent', () => {
    let at30 = state({ rotation: 0 });
    for (let i = 0; i < 60; i += 1) at30 = steerToward(at30, stats, { x: 500, y: 300 }, 1000 / 30);

    let at60 = state({ rotation: 0 });
    for (let i = 0; i < 120; i += 1) at60 = steerToward(at60, stats, { x: 500, y: 300 }, 1000 / 60);

    // Not identical — the turn is applied before acceleration each step — but
    // close enough that behaviour does not change with frame rate.
    expect(at60.x).toBeCloseTo(at30.x, 0);
    expect(at60.y).toBeCloseTo(at30.y, 0);
  });

  it('does not mutate the state it was given', () => {
    const original = state({ rotation: 0 });
    steerToward(original, stats, { x: 100, y: 100 }, FRAME);
    expect(original).toEqual(state({ rotation: 0 }));
  });

  it('is a no-op for a zero or negative delta', () => {
    const current = state({ rotation: 10 });
    expect(steerToward(current, stats, { x: 100, y: 0 }, 0)).toBe(current);
    expect(steerToward(current, stats, { x: 100, y: 0 }, -5)).toBe(current);
  });

  it('works with real resolved stats', () => {
    const basic = resolveEnemyStats('Basic', '1', 'Easy');
    expect(basic).toBeDefined();

    let current = state({ x: 0, y: 0, rotation: 0 });
    for (let i = 0; i < 300; i += 1) {
      current = steerToward(current, basic!, { x: 400, y: 400 }, FRAME);
    }

    expect(Math.hypot(current.xVel, current.yVel)).toBeLessThanOrEqual(
      basic!.moveSpeedMax + 1e-9,
    );
    expect(current.x).toBeGreaterThan(0);
    expect(current.y).toBeGreaterThan(0);
  });

  it('makes a Hard-difficulty enemy close faster than an Easy one', () => {
    const easy = resolveEnemyStats('Basic', '1', 'Easy')!;
    const hard = resolveEnemyStats('Basic', '1', 'Hard')!;
    const target = { x: 600, y: 0 };

    const run = (s: typeof easy): number => {
      let current = state({ rotation: 0 });
      for (let i = 0; i < 100; i += 1) current = steerToward(current, s, target, FRAME);
      return current.x;
    };

    expect(run(hard)).toBeGreaterThan(run(easy));
  });
});

describe('clampToRoom', () => {
  it('keeps an enemy inside the room', () => {
    const clamped = clampToRoom(state({ x: -50, y: 2000 }), 640, 960, 13);
    expect(clamped.x).toBe(13);
    expect(clamped.y).toBe(947);
  });

  it('zeroes the velocity component that hit the wall', () => {
    const clamped = clampToRoom(state({ x: -50, y: 400, xVel: -2, yVel: 1 }), 640, 960, 13);
    expect(clamped.xVel).toBe(0);
    expect(clamped.yVel).toBe(1);
  });

  it('returns the same object when nothing is out of bounds', () => {
    const inside = state({ x: 320, y: 480 });
    expect(clampToRoom(inside, 640, 960, 13)).toBe(inside);
  });

  it('keeps a long run inside the room', () => {
    let current = state({ x: 320, y: 480, rotation: 0 });
    for (let i = 0; i < 1000; i += 1) {
      current = steerToward(current, stats, { x: 99999, y: 99999 }, FRAME);
      current = clampToRoom(current, 640, 960, 13);
      expect(current.x).toBeGreaterThanOrEqual(13);
      expect(current.x).toBeLessThanOrEqual(627);
      expect(current.y).toBeGreaterThanOrEqual(13);
      expect(current.y).toBeLessThanOrEqual(947);
    }
  });
});


/**
 * Tower mode — `PartGameArea.as:4589`, `:4605`, `:5030`.
 *
 * The mechanic is entirely in the heading: every other mode turns toward the
 * target, Tower turns roughly across it and bends inward as it closes. These
 * assert the two distance regimes rather than the formula, because the formula
 * reproducing itself proves nothing.
 */
describe('tower steering', () => {
  const ROOM = 640;
  const centre = { x: 320, y: 320 };
  const at = (x: number, y: number): SteeringState => ({ x, y, rotation: 0, xVel: 0, yVel: 0 });

  /** How far the Tower heading sits from pointing straight at the target. */
  function offsetFromDirect(state: SteeringState, speed: number): number {
    const tower = towerAngleToTarget(state, centre, speed, ROOM);
    return Math.abs(shortestRotation(angleToTarget(state, centre), tower));
  }

  it('aims 79 degrees off the target at spawn distance — it circles', () => {
    // At a wall of a 640 room, 300 units out, with moveSpeedMax 1.5.
    // The offset is `85 - lead - moveSpeedMax` where lead is 4.38 here, so the
    // enemy travels almost perpendicular to the tank rather than at it.
    expect(offsetFromDirect(at(320, 20), 1.5)).toBeCloseTo(79.12, 2);
  });

  it('turns inward as it closes, but gradually', () => {
    // 79.1 at 300 units, 71.0 at 40. The bend is real but modest until very
    // close — worth pinning as figures, because "turns inward" alone would be
    // satisfied by a tenth of a degree and the mode would look wrong.
    const speed = 1.5;
    expect(offsetFromDirect(at(320, 20), speed)).toBeCloseTo(79.12, 2);
    expect(offsetFromDirect(at(320, 280), speed)).toBeCloseTo(70.97, 2);
  });

  it('bends inward monotonically', () => {
    const speed = 1.5;
    const offsets = [300, 240, 180, 120, 60, 20, 5].map((d) =>
      offsetFromDirect(at(320, 320 - d), speed),
    );
    for (let i = 1; i < offsets.length; i += 1) {
      expect(offsets[i], `step ${i}`).toBeLessThan(offsets[i - 1]);
    }
  });

  it('never aims straight at the target, even touching it', () => {
    // The property that makes Tower read as rings: there is no distance at
    // which an enemy simply charges. At zero distance the lead term is at its
    // maximum, and the eighth root keeps it well short of a head-on charge:
    // 60.4 degrees at one unit away.
    expect(offsetFromDirect(at(320, 319), 1.5)).toBeCloseTo(60.45, 2);
    for (const d of [1, 20, 60, 120, 240, 300]) {
      const offset = offsetFromDirect(at(320, 320 - d), 1.5);
      expect(offset, `distance ${d}`).toBeGreaterThan(55);
    }
  });

  it('matches the spawn-frame heading, which is computed separately', () => {
    // resolveSpawn computes the same angle for the spawn frame. If these ever
    // disagree an enemy would visibly jerk on its first update.
    const state = at(160, 0);
    const spawned = resolveSpawn(
      { roomWidth: ROOM, roomHeight: ROOM, x: 160, y: 0, wall: 1, width: 0, height: 0 },
      { mode: 'Tower', target: centre, moveSpeedMax: 1.5, enemyType: 'Basic' },
    );
    expect(towerAngleToTarget(state, centre, 1.5, ROOM)).toBeCloseTo(spawned.rotation, 6);
  });
});

describe('the tower acceleration ramp', () => {
  it('grows by moveSpeedMax/400 per frame', () => {
    expect(towerAccSpeed(0.2, 1.5, 1)).toBeCloseTo(0.2 + 1.5 / 400, 10);
    expect(towerAccSpeed(0.2, 1.5, 10)).toBeCloseTo(0.2 + (10 * 1.5) / 400, 10);
  });

  it('stops at 10 and stays there', () => {
    expect(towerAccSpeed(9.999, 1.5, 100)).toBe(TOWER_ACC_SPEED_MAX);
    expect(towerAccSpeed(TOWER_ACC_SPEED_MAX, 1.5, 1)).toBe(TOWER_ACC_SPEED_MAX);
  });

  it('takes a realistic level to reach the cap', () => {
    // Sanity on the rate: from a 0.2 base at moveSpeedMax 1.5 this is ~2613
    // frames, about 87 seconds at 30fps. If a refactor made it seconds rather
    // than minutes, Tower would become unplayable and every other test here
    // would still pass.
    let acc = 0.2;
    let frames = 0;
    while (acc < TOWER_ACC_SPEED_MAX && frames < 100_000) {
      acc = towerAccSpeed(acc, 1.5, 1);
      frames += 1;
    }
    expect(frames).toBeGreaterThan(1_500);
    expect(frames).toBeLessThan(4_000);
  });

  it('drives the turn rate, so the orbit tightens with speed', () => {
    expect(towerRotSpeedMax(0.2)).toBeCloseTo(2.2, 10);
    expect(towerRotSpeedMax(TOWER_ACC_SPEED_MAX)).toBe(61);
    expect(towerRotSpeedMax(1)).toBeLessThan(towerRotSpeedMax(2));
  });
});
