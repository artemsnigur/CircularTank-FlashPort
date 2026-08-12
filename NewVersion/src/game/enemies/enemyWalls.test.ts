/**
 * Enemy wall collision — `PartGameArea.as:5370-5513`.
 *
 * ── The rotation basis, because every guard depends on it ─────────────────
 * **0 = right, 90 = down, 180 = left, -90 = up**, so a heading is
 * `(cos r, sin r)`. Taken from the spawn edges rather than assumed: `:3507`
 * faces a left-edge enemy at `0`, `:3511` a bottom-edge one at `-90`, `:3515` a
 * right-edge one at `180` — each pointing into the room.
 *
 * That is what makes the AS3's guards read as directions: `-90 < r < 90` is
 * `cos r > 0` (*moving right*), and `r > 0` is `sin r > 0` (*moving down*). With
 * the basis wrong every guard inverts while still looking plausible, so it is
 * derived here rather than carried over.
 *
 * Every expected value below is the AS3 formula applied by hand, not read back
 * out of the implementation.
 */
import { describe, expect, it } from 'vitest';
import {
  angleToTarget,
  atWall,
  bounceOffWalls,
  clampToRoom,
  turnTowardsGoal,
} from './enemySteering';
import type { SteeringState } from './enemySteering';

const W = 640;
const H = 960;
const R = 12;

const state = (overrides: Partial<SteeringState> = {}): SteeringState => ({
  x: 320,
  y: 480,
  rotation: 0,
  xVel: 0,
  yVel: 0,
  ...overrides,
});

describe('a non-boss reflects off every wall', () => {
  it('reflects off the right wall', () => {
    // 42 deg is down-and-right, into the wall. `:5389-5396` mirrors to 180 - 42.
    const out = bounceOffWalls(
      state({ x: W - R + 3, y: 400, rotation: 42, xVel: 1.1, yVel: 1 }),
      W,
      H,
      R,
    );
    expect(out.x).toBe(W - R);
    expect(out.rotation).toBe(138);
    expect(out.xVel).toBeCloseTo(-1.1, 10);
    // The along-wall component is untouched — that is what makes it a bounce
    // rather than a stop.
    expect(out.yVel).toBe(1);
  });

  it('reflects off the left wall', () => {
    const out = bounceOffWalls(state({ x: 2, y: 400, rotation: 138, xVel: -1.1, yVel: 1 }), W, H, R);
    expect(out.x).toBe(R);
    expect(out.rotation).toBe(42);
    expect(out.xVel).toBeCloseTo(1.1, 10);
    expect(out.yVel).toBe(1);
  });

  it('reflects off the bottom wall — an axis that did not exist before T112', () => {
    // `:5459-5463`: a horizontal wall flips y only, so the mirror is -r.
    const out = bounceOffWalls(
      state({ x: 300, y: H - R + 3, rotation: 42, xVel: 1, yVel: 1.1 }),
      W,
      H,
      R,
    );
    expect(out.y).toBe(H - R);
    expect(out.rotation).toBe(-42);
    expect(out.yVel).toBeCloseTo(-1.1, 10);
    expect(out.xVel).toBe(1);
  });

  it('reflects off the top wall — likewise', () => {
    // `:5502-5506`.
    const out = bounceOffWalls(state({ x: 300, y: 2, rotation: -42, xVel: 1, yVel: -1.1 }), W, H, R);
    expect(out.y).toBe(R);
    expect(out.rotation).toBe(42);
    expect(out.yVel).toBeCloseTo(1.1, 10);
    expect(out.xVel).toBe(1);
  });

  /**
   * The pointing-into-the-wall guard, on all four walls.
   *
   * This is the assertion that separates a correct bounce from one that
   * jitters: an enemy resting on a wall while travelling along or away from it
   * must be left alone, or it is re-mirrored every frame and vibrates in place.
   *
   * Driven as the counterpart to the four rows above — those prove the mirror
   * fires when it should, these prove it does not fire when it should not. On
   * its own either half is satisfied by a rule that always fires or never does.
   */
  it('leaves a heading that already points away from each wall alone', () => {
    expect(bounceOffWalls(state({ x: W - R, y: 400, rotation: 138 }), W, H, R).rotation).toBe(138);
    expect(bounceOffWalls(state({ x: R, y: 400, rotation: 42 }), W, H, R).rotation).toBe(42);
    expect(bounceOffWalls(state({ x: 300, y: H - R, rotation: -42 }), W, H, R).rotation).toBe(-42);
    expect(bounceOffWalls(state({ x: 300, y: R, rotation: 42 }), W, H, R).rotation).toBe(42);
  });

  it('keeps a mirrored heading inside (-180, 180]', () => {
    // `:5389-5396` carries two forms of the vertical mirror for this case:
    // 180 - (-30) is 210 — the same angle, outside the range everything else
    // assumes.
    expect(bounceOffWalls(state({ x: W - R, y: 400, rotation: -30 }), W, H, R).rotation).toBe(-150);
  });

  it('reflects both axes at a corner in one step', () => {
    // The AS3 runs the x branches and then the y branches in the same frame, so
    // a corner applies both: 42 -> 138 across the vertical wall, then -138
    // across the horizontal one.
    const out = bounceOffWalls(state({ x: W, y: H, rotation: 42, xVel: 1, yVel: 1 }), W, H, R);
    expect(out.x).toBe(W - R);
    expect(out.y).toBe(H - R);
    expect(out.rotation).toBe(-138);
    expect(out.xVel).toBeCloseTo(-1, 10);
    expect(out.yVel).toBeCloseTo(-1, 10);
  });

  it('does nothing away from every wall, returning the same object', () => {
    const mid = state({ rotation: 42, xVel: 1, yVel: 1 });
    expect(bounceOffWalls(mid, W, H, R)).toBe(mid);
  });

  it('skips the bottom for Defense, and only the bottom', () => {
    // `:5449` — there the bottom edge is the objective, not a wall.
    const atFloor = state({ x: 300, y: H - R, rotation: 42, xVel: 1, yVel: 1.1 });
    expect(bounceOffWalls(atFloor, W, H, R, { skipBottom: true })).toBe(atFloor);
    // Its counterpart: the side walls still reflect under the same flag, so
    // `skipBottom` cannot be a switch that quietly disables the whole rule.
    const atSide = state({ x: W - R, y: 400, rotation: 42, xVel: 1.1, yVel: 1 });
    expect(bounceOffWalls(atSide, W, H, R, { skipBottom: true }).rotation).toBe(138);
  });

  it('does not pin an enemy against a wall over a long run', () => {
    // The re-stick failure mode, driven rather than reasoned about: a shallow
    // heading repeatedly pushed into a wall must keep leaving it. With the
    // guard dropped this sits on the wall for every one of the 400 frames.
    let s = state({ x: W - R, y: 480, rotation: 10, xVel: 1.5, yVel: 0.2 });
    let onWall = 0;
    for (let i = 0; i < 400; i += 1) {
      s = { ...s, x: s.x + s.xVel, y: s.y + s.yVel };
      s = bounceOffWalls(s, W, H, R);
      s = clampToRoom(s, W, H, R);
      if (s.x >= W - R || s.x <= R) onWall += 1;
    }
    expect(onWall).toBeGreaterThan(0);
    expect(onWall).toBeLessThan(40);
  });
});

describe('a boss turns toward the tank at a wall instead of bouncing', () => {
  it('turns one degree per frame toward the goal', () => {
    // `:5525-5529` — not a mirror, and not a snap to the bearing.
    expect(turnTowardsGoal(0, 90)).toBe(1);
    expect(turnTowardsGoal(0, -90)).toBe(-1);
  });

  it('snaps when already within a degree', () => {
    // `:5521-5524`, which is what stops it oscillating across the goal.
    expect(turnTowardsGoal(89.5, 90)).toBe(90);
    expect(turnTowardsGoal(90.5, 90)).toBe(90);
  });

  it('takes the short way around the wrap', () => {
    // 179 -> -179 is 2 degrees the near way and 358 the far way.
    expect(turnTowardsGoal(179, -179)).toBe(180);
  });

  it('follows a locked direction when one is set', () => {
    // `:5533-5542`. **Unreachable in production today** — the only producer of a
    // lock is the border AI at `:4642-4680`, which is unported, so nothing
    // passes anything but 'None'. Driven directly so a later pass porting that
    // AI inherits a pinned rule rather than re-deriving it.
    expect(turnTowardsGoal(0, 90, 'Clockwise')).toBe(1);
    expect(turnTowardsGoal(0, 90, 'CounterClockwise')).toBe(-1);
    // The lock overrides the goal rather than blending with it: turning
    // clockwise even though the goal lies counter-clockwise.
    expect(turnTowardsGoal(0, -90, 'Clockwise')).toBe(1);
    // And 'None' falls through to the goal on the identical input.
    expect(turnTowardsGoal(0, -90, 'None')).toBe(-1);
  });

  /**
   * The split the whole task turns on, driven on **one** state.
   *
   * A boss and a non-boss at the same point with the same heading must do
   * different things. Asserted together because either result alone is
   * satisfied by a build that treats every enemy the same way.
   */
  it('bounces a non-boss and turns a boss, from an identical position', () => {
    const hit = state({ x: W - R, y: 400, rotation: 0, xVel: 1.5, yVel: 0 });
    const goal = { x: 0, y: 400 }; // due left, so the bearing is 180

    const nonBoss = bounceOffWalls(hit, W, H, R);
    expect(nonBoss.rotation).toBe(180); // mirrored: 180 - 0
    expect(nonBoss.xVel).toBeCloseTo(-1.5, 10); // and reversed

    const boss = {
      ...hit,
      rotation: turnTowardsGoal(hit.rotation, angleToTarget(hit, goal)),
    };
    expect(boss.rotation).toBe(1); // one degree, not a mirror
    expect(boss.xVel).toBe(1.5); // velocity untouched — bosses never reverse
  });

  it('recognises every wall, and the interior as not a wall', () => {
    expect(atWall(state({ x: W - R, y: 400 }), W, H, R)).toBe(true);
    expect(atWall(state({ x: R, y: 400 }), W, H, R)).toBe(true);
    expect(atWall(state({ x: 300, y: H - R }), W, H, R)).toBe(true);
    expect(atWall(state({ x: 300, y: R }), W, H, R)).toBe(true);
    expect(atWall(state(), W, H, R)).toBe(false);
    // Defense's floor is the objective, so it does not count as a wall.
    expect(atWall(state({ x: 300, y: H - R }), W, H, R, { skipBottom: true })).toBe(false);
  });
});
