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

/**
 * The separation push through the wall branches — `:5370-5513`, pass (b).
 *
 * **Nothing writes `pushVel` yet**, so every assertion here drives it directly.
 * That is the point of the pass: the plumbing is provable before the producer
 * exists, and the producer then changes only itself.
 *
 * The four branches are *not* the same rule four times. `:5488` — the `-y` one
 * — differs in three ways, and each is asserted against a sibling that does the
 * opposite on identical geometry. A test that only proved "the push moves the
 * enemy" would pass on a symmetric implementation, which is the thing this is
 * guarding against.
 */
describe('the separation push, through each wall branch', () => {
  it('adds the push to the step when the wall is clear', () => {
    // Mid-room, so no branch reaches its bound: the enemy moves by the push on
    // top of wherever integration already put it. Both pushes point the same
    // way as their velocity, so both branches open on the sum.
    const out = bounceOffWalls(
      state({ x: 320, y: 480, rotation: 0, xVel: 1, yVel: 1, pushVelX: 4, pushVelY: 3 }),
      W,
      H,
      R,
    );
    expect(out.x).toBe(324);
    expect(out.y).toBe(483);
    // Untouched — nothing hit a wall, so nothing is cleared.
    expect(out.pushVelX).toBe(4);
    expect(out.pushVelY).toBe(3);
  });

  /**
   * **The `-y` asymmetry has teeth, and this is where they show.**
   *
   * An enemy drifting *down* (`yVel` positive) shoved *up* harder than it is
   * drifting satisfies neither y predicate: `+y` needs `yVel + pushVelY > 0`
   * and gets -2, `-y` needs `yVel < 0` and gets +1. The AS3 therefore applies
   * **no y movement at all** that frame — not the push, and not the velocity it
   * would otherwise have travelled.
   *
   * Written as a test because it is the single most surprising consequence of
   * `:5488`, and because a symmetric implementation — `yVel + pushVelY < 0` for
   * the second predicate — moves the enemy up by 2 and looks more correct.
   */
  it('moves an enemy not at all when the up-push outweighs a down-drift', () => {
    const out = bounceOffWalls(
      state({ x: 320, y: 480, rotation: 0, xVel: 0, yVel: 1, pushVelY: -3 }),
      W,
      H,
      R,
      {},
      // Integration had already carried it 1 down; the gate undoes exactly that.
      { x: 0, y: 1 },
    );
    expect(out.y).toBe(479);
    // The push is not spent either — it is still there next frame, less decay.
    expect(out.pushVelY).toBe(-3);
  });

  it('clears the push on the +x wall and snaps — `:5379-5380`', () => {
    // 5 short of the right bound with a push of 9: the bound test
    // `x + pushVelX < right` fails, so the AS3 snaps and zeroes.
    const out = bounceOffWalls(
      state({ x: W - R - 5, y: 400, rotation: 0, xVel: 1, yVel: 0, pushVelX: 9 }),
      W,
      H,
      R,
    );
    expect(out.x).toBe(W - R);
    expect(out.pushVelX).toBe(0);
  });

  it('clears the push on the -x wall too — `:5415-5416`', () => {
    const out = bounceOffWalls(
      state({ x: R + 5, y: 400, rotation: 180, xVel: -1, yVel: 0, pushVelX: -9 }),
      W,
      H,
      R,
    );
    expect(out.x).toBe(R);
    expect(out.pushVelX).toBe(0);
  });

  it('clears the push on the +y wall — `:5451-5452`', () => {
    const out = bounceOffWalls(
      state({ x: 300, y: H - R - 5, rotation: 90, xVel: 0, yVel: 1, pushVelY: 9 }),
      W,
      H,
      R,
    );
    expect(out.y).toBe(H - R);
    expect(out.pushVelY).toBe(0);
  });

  /**
   * **The asymmetry, and all three halves of it — `:5488-5497`.**
   *
   * The `-y` branch alone: gates on `yVel < 0` without the push, tests the
   * bound without the push, and does **not** clear the push on contact. Driven
   * against the `+y` branch above, which does all three.
   */
  it('does not clear the push on the -y wall, unlike the other three', () => {
    const out = bounceOffWalls(
      state({ x: 300, y: R + 5, rotation: -90, xVel: 0, yVel: -1, pushVelY: -9 }),
      W,
      H,
      R,
    );
    // `y > top` is 17 > 12, so `:5490` takes the *moving* arm and the push would
    // carry the enemy to 8 — through the bound, because the test guarding it
    // omits the push. **In the AS3 it would sit there.** In this port the
    // positional reflection that runs straight afterwards catches it, which is
    // the port's own net and not the original's.
    expect(out.y).toBe(R);
    // The reflection turns the velocity around, as it does for any wall.
    expect(out.yVel).toBe(1);
    // **But the push survives**, where all three sibling branches zero it.
    // That is `:5496`'s missing `pushVelY = 0`, and it is the asymmetry's third
    // half.
    expect(out.pushVelY).toBe(-9);
  });

  it('snaps to the top without clearing the push', () => {
    // Already at the bound, so the bound test fails and the `else` runs.
    const out = bounceOffWalls(
      state({ x: 300, y: R, rotation: -90, xVel: 0, yVel: -1, pushVelY: -9 }),
      W,
      H,
      R,
    );
    expect(out.y).toBe(R);
    // The sibling branches set this to 0; `:5496` does not.
    expect(out.pushVelY).toBe(-9);
  });

  /**
   * The `-y` predicate ignores the push, so a push alone cannot open that
   * branch — where the `+y` predicate would open on the sum. Both on the same
   * geometry, differing only in sign.
   */
  it('will not open the -y branch on the push alone', () => {
    // yVel is 0, so `yVel < 0` is false and the upward push does nothing.
    const upward = bounceOffWalls(
      state({ x: 300, y: 480, rotation: 0, xVel: 0, yVel: 0, pushVelY: -9 }),
      W,
      H,
      R,
    );
    expect(upward.y).toBe(480);

    // Its counterpart: the +y predicate *is* `yVel + pushVelY > 0`, so the same
    // magnitude downward does move the enemy with yVel still 0.
    const downward = bounceOffWalls(
      state({ x: 300, y: 480, rotation: 0, xVel: 0, yVel: 0, pushVelY: 9 }),
      W,
      H,
      R,
    );
    expect(downward.y).toBe(489);
  });

  /**
   * **The all-or-nothing axis gate.** When velocity and push cancel exactly,
   * the AS3 takes neither branch, so `xVel` is not applied either — the enemy
   * does not move on that axis at all. This port integrates first, so the step
   * has to be handed back for the undo to be possible.
   */
  it('undoes the integrated step when the push exactly cancels the velocity', () => {
    // Integration already moved it +3; the push is -3, so the sum is 0.
    const out = bounceOffWalls(
      state({ x: 323, y: 480, rotation: 0, xVel: 3, yVel: 0, pushVelX: -3 }),
      W,
      H,
      R,
      {},
      { x: 3, y: 0 },
    );
    expect(out.x).toBe(320);
  });

  it('leaves the step alone when no cancellation happens', () => {
    // The counterpart: same `steppedBy`, a push that does not cancel.
    const out = bounceOffWalls(
      state({ x: 323, y: 480, rotation: 0, xVel: 3, yVel: 0, pushVelX: -1 }),
      W,
      H,
      R,
      {},
      { x: 3, y: 0 },
    );
    expect(out.x).toBe(322);
  });

  /**
   * The safety property, stated as a test rather than left to the other 48.
   * With no push the function must return its **input object**, so the layer
   * added in this pass cannot be doing anything at all on the existing path.
   */
  it('returns the same object when there is no push', () => {
    const mid = state({ x: 320, y: 480, rotation: 42, xVel: 1, yVel: 1 });
    expect(bounceOffWalls(mid, W, H, R)).toBe(mid);
    // Explicit zeros, which is what `Enemy` actually passes.
    const zeroed = state({ x: 320, y: 480, rotation: 42, xVel: 1, yVel: 1, pushVelX: 0, pushVelY: 0 });
    expect(bounceOffWalls(zeroed, W, H, R)).toBe(zeroed);
  });

  /** `clampToRoom` kills the push on the axis it had to correct. */
  it('clears the push on the axis clampToRoom pulls back', () => {
    const out = clampToRoom(
      state({ x: 300, y: -40, rotation: -90, xVel: 1, yVel: -2, pushVelX: 5, pushVelY: -9 }),
      W,
      H,
      R,
    );
    expect(out.y).toBe(R);
    expect(out.pushVelY).toBe(0);
    // The untouched axis keeps both its velocity and its push.
    expect(out.xVel).toBe(1);
    expect(out.pushVelX).toBe(5);
  });
});
