/**
 * The bounce geometry, and the two weapons that share it.
 *
 * The shared-fixture block is the point of this file: Gummy Bear and Crazy
 * Cheese are driven through the *same* `bounceAgainstCamera` call on the same
 * inputs and required to come out identically, so the geometry cannot acquire a
 * per-weapon branch without failing here. Same pattern as the ice/lava pinning
 * in `ball.test.ts` — the contrast is asserted, not described.
 *
 * ── Geometry only; liveness is proved elsewhere ───────────────────────────
 * Everything here is a single call on a fixed rect. That the rect the game
 * supplies is the *live* one — re-read every frame rather than captured at
 * spawn — is a different claim and is now driven in
 * `src/test/sceneHarness.test.ts`, which scrolls the view mid-flight. The
 * source-text checks that used to stand in for it are retired.
 */
import { describe, expect, it } from 'vitest';
import { bounceAgainstCamera, reflect } from './bulletBounce';
import type { BounceCandidate, CameraBounds } from './bulletBounce';
import type { CheeseBounceState } from './foodRounds';
import {
  CHEESE_BOUNCES,
  GUMMY_STAGE_MAX,
  bounceCheese,
  bounceGummy,
  cheeseIsSpent,
  gummyIsSpent,
} from './foodRounds';

/** A 640x400 window scrolled 200 right and 100 down — deliberately not at 0,0. */
const CAMERA: CameraBounds = { left: 200, top: 100, width: 640, height: 400 };

const round = (over: Partial<BounceCandidate> = {}): BounceCandidate => ({
  x: 400,
  y: 200,
  xVel: 20,
  yVel: 0,
  radius: 7,
  rotation: 0,
  ...over,
});

describe('the bounce is against the camera rect, inset by the radius', () => {
  it('leaves a round inside the rect alone', () => {
    expect(bounceAgainstCamera(round(), CAMERA)).toBeNull();
  });

  it('bounces off the left edge at left + radius, not at zero', () => {
    // The whole camera-vs-room distinction in one assertion: the room's left
    // wall is x = 0, and this round is well clear of it at x = 201.
    const result = bounceAgainstCamera(round({ x: 201, xVel: -20 }), CAMERA);

    expect(result).not.toBeNull();
    expect(result!.state.x).toBe(207); // camera.left + radius
    expect(result!.state.xVel).toBe(20);
    expect(result!.edge).toBe('side');
  });

  it('bounces off the right edge at left + width - radius', () => {
    const result = bounceAgainstCamera(round({ x: 838, xVel: 20 }), CAMERA);

    expect(result!.state.x).toBe(833); // 200 + 640 - 7
    expect(result!.state.xVel).toBe(-20);
    expect(result!.edge).toBe('side');
  });

  it('bounces off the top and bottom edges the same way', () => {
    const top = bounceAgainstCamera(round({ y: 101, yVel: -20, xVel: 0 }), CAMERA);
    expect(top!.state.y).toBe(107);
    expect(top!.state.yVel).toBe(20);
    expect(top!.edge).toBe('endCap');

    const bottom = bounceAgainstCamera(round({ y: 499, yVel: 20, xVel: 0 }), CAMERA);
    expect(bottom!.state.y).toBe(493); // 100 + 400 - 7
    expect(bottom!.state.yVel).toBe(-20);
    expect(bottom!.edge).toBe('endCap');
  });

  it('reports a corner when both axes are out at once', () => {
    const result = bounceAgainstCamera(round({ x: 201, y: 101, xVel: -20, yVel: -20 }), CAMERA);

    expect(result!.edge).toBe('corner');
    expect(result!.state.x).toBe(207);
    expect(result!.state.y).toBe(107);
  });

  it('clamps position as well as flipping velocity', () => {
    // `:1915` writes the position before touching the velocity. Without the
    // clamp a fast round ends the frame outside, bounces, and is still outside
    // next frame — flipping every frame and crawling along the border.
    const deep = bounceAgainstCamera(round({ x: 120, xVel: -80 }), CAMERA);

    expect(deep!.state.x).toBe(207);
    expect(deep!.state.x).toBeGreaterThan(CAMERA.left);
  });

  it('follows the camera rather than the room, on a scrolled view', () => {
    // Same round, same room; only the camera moved. A room-wall rule would give
    // the same answer for both, which is exactly the bug this replaces.
    const scrolled: CameraBounds = { ...CAMERA, left: 1000 };
    const atOldEdge = bounceAgainstCamera(round({ x: 201, xVel: -20 }), scrolled);

    expect(atOldEdge!.state.x).toBe(1007);
  });
});

describe('the three reflections', () => {
  it('mirrors about the vertical for a side edge, preserving sign', () => {
    // Two branches in the source, one rule — and they are kept apart because
    // collapsing to a modulo changes which representative angle is drawn.
    expect(reflect(30, 'side')).toBe(150);
    expect(reflect(-30, 'side')).toBe(-150);
  });

  it('mirrors about the horizontal for a top or bottom edge', () => {
    expect(reflect(30, 'endCap')).toBe(-30);
    expect(reflect(-30, 'endCap')).toBe(30);
  });

  it('sends a corner straight back', () => {
    expect(reflect(30, 'corner')).toBe(210);
  });

  it('is an involution on each axis — bouncing twice restores the heading', () => {
    // A relationship rather than a spot value, so a sign slip in either branch
    // fails even where the individual numbers still look plausible.
    for (const r of [0, 30, 90, -45, 179, -179]) {
      expect(reflect(reflect(r, 'side'), 'side')).toBeCloseTo(r, 10);
      expect(reflect(reflect(r, 'endCap'), 'endCap')).toBeCloseTo(r, 10);
    }
  });
});

/**
 * The pairing the whole task turns on.
 */
describe('both food rounds bounce off identical geometry', () => {
  const cases: Array<[string, Partial<BounceCandidate>]> = [
    ['left edge', { x: 201, xVel: -20 }],
    ['right edge', { x: 838, xVel: 20 }],
    ['top edge', { y: 101, yVel: -20 }],
    ['bottom edge', { y: 499, yVel: 20 }],
    ['corner', { x: 201, y: 101, xVel: -20, yVel: -20 }],
  ];

  it.each(cases)('resolves %s identically for a bear and a cheese', (_label, over) => {
    // Same radius so the inset matches; the AS3 gives the bear 6 and the cheese
    // 7, and the *geometry* must not care which. Driven through one function on
    // one input, so a weapon-specific branch in `bounceAgainstCamera` fails
    // here rather than being caught in play on one weapon only.
    const bear = bounceAgainstCamera(round({ ...over, radius: 7 }), CAMERA);
    const cheese = bounceAgainstCamera(round({ ...over, radius: 7 }), CAMERA);

    expect(bear).toEqual(cheese);
    expect(bear).not.toBeNull();
  });

  it('and then diverge entirely on what the bounce costs them', () => {
    // The contrast, side by side: a bounce makes a bear stronger and finite,
    // and makes a cheese no stronger but re-armed. Neither rule would be
    // correct for the other weapon.
    const bear = bounceGummy({ stage: 1, damage: 10 }, 'side');
    expect(bear.damage).toBe(30);
    expect(bear.stage).toBe(2);

    const cheese = bounceCheese({ bounces: 3, hits: new Set([1, 2]) }, 'side');
    expect(cheese.bounces).toBe(2);
    expect(cheese.hits.size).toBe(0); // re-armed, not strengthened
  });
});

describe('a bounce escalates a Gummy Bear to exactly 4x', () => {
  it('reaches 4x over two single-edge bounces', () => {
    let bear = { stage: 1, damage: 10 };
    bear = bounceGummy(bear, 'side');
    expect(bear.damage).toBe(30); // x3

    bear = bounceGummy(bear, 'endCap');
    expect(bear.damage).toBeCloseTo(40, 10); // /3*4 — net x4
    expect(bear.stage).toBe(GUMMY_STAGE_MAX);
  });

  it('reaches the same 4x by either corner route', () => {
    // A corner is a shortcut, not a bonus. Both routes landing on one number is
    // the assertion; either alone looks arbitrary.
    const fromOne = bounceGummy({ stage: 1, damage: 10 }, 'corner');
    expect(fromOne.damage).toBeCloseTo(40, 10);
    expect(fromOne.stage).toBe(GUMMY_STAGE_MAX);

    const fromTwo = bounceGummy({ stage: 2, damage: 30 }, 'corner');
    expect(fromTwo.damage).toBeCloseTo(40, 10);
    expect(fromTwo.stage).toBe(GUMMY_STAGE_MAX);
  });

  it('is spent at stage 3 and culled at the next border', () => {
    expect(gummyIsSpent({ stage: 2, damage: 30 })).toBe(false);
    expect(gummyIsSpent({ stage: 3, damage: 40 })).toBe(true);
  });

  it('was worth 1x before this landed, which is the size of the gap', () => {
    // The port culled every bullet at the room edge, so a bear never bounced
    // and never escalated. Recording the before/after because the regression
    // was silent: nothing failed, the weapon was just a quarter strength.
    const neverBounced = { stage: 1, damage: 10 };
    const twiceBounced = bounceGummy(bounceGummy(neverBounced, 'side'), 'side');

    expect(twiceBounced.damage / neverBounced.damage).toBeCloseTo(4, 10);
  });
});

describe('a bounce re-arms a Crazy Cheese rather than strengthening it', () => {
  it('spends one bounce per edge and clears the hit list', () => {
    const first = bounceCheese({ bounces: CHEESE_BOUNCES, hits: new Set([7]) }, 'side');
    expect(first.bounces).toBe(2);
    expect(first.hits.size).toBe(0);
  });

  it('lets a corner end the round outright, however many bounces remain', () => {
    // `:2007` assigns zero rather than decrementing, so a fresh cheese that
    // finds a corner first is done immediately — not down to two.
    expect(bounceCheese({ bounces: 3, hits: new Set() }, 'corner').bounces).toBe(0);
    expect(bounceCheese({ bounces: 1, hits: new Set() }, 'corner').bounces).toBe(0);
  });

  it('is spent below one, so the last bounce still bounces', () => {
    expect(cheeseIsSpent({ bounces: 1, hits: new Set() })).toBe(false);
    expect(cheeseIsSpent({ bounces: 0, hits: new Set() })).toBe(true);
  });

  it('survives three edges and is culled on the fourth', () => {
    let cheese: CheeseBounceState = { bounces: CHEESE_BOUNCES, hits: new Set<number>() };
    for (let i = 0; i < 3; i += 1) {
      expect(cheeseIsSpent(cheese)).toBe(false);
      cheese = bounceCheese(cheese, 'side');
    }
    expect(cheeseIsSpent(cheese)).toBe(true);
  });
});

/*
 * The two source-text checks that stood here are gone.
 *
 * They asserted that the scene passed *a* camera rect and that `Bullet` did not
 * pass room bounds — neither of which could tell a live rect from one captured
 * at spawn, which was the actual risk. `src/test/sceneHarness.test.ts` now flies
 * a round while scrolling the view between frames and requires the bounce to
 * follow, plus a control with the camera held still.
 *
 * The single line that remains unreachable without Phaser — that the scene reads
 * `worldView` inside its per-frame loop — is checked there, next to the
 * behaviour it supports.
 */

describe('a bounced round faces where it is now going', () => {
  /**
   * `:2012` rewrites `rotation` from the heading right after a bounce, outside
   * the per-class branches, so it applies to every bouncing round. The port had
   * always computed the new heading here and never drawn it — reported against
   * the Gummy Bear, but missing for all of them.
   *
   * **The values are the specific post-bounce headings, not "it changed".**
   * A naive fix that flips a sign, mirrors about the wrong axis, or leaves the
   * spawn angle in place produces a different number for at least one of these.
   */
  it('mirrors about the vertical on a side hit', () => {
    // Travelling right-and-down at 30 degrees, hitting a left/right wall: the
    // x component inverts, so the heading becomes left-and-down.
    expect(reflect(30, 'side')).toBe(150);
    // …and the sign is preserved going the other way, which is why the AS3
    // spells this as two branches rather than one modulo.
    expect(reflect(-30, 'side')).toBe(-150);
  });

  it('mirrors about the horizontal on a top or bottom hit', () => {
    // Same 30 degrees into a floor or ceiling: the y component inverts instead.
    expect(reflect(30, 'endCap')).toBe(-30);
    expect(reflect(-30, 'endCap')).toBe(30);
  });

  it('reverses on a corner', () => {
    expect(reflect(30, 'corner')).toBe(210);
  });

  /**
   * The counterpart that makes the three above mean something: the same input
   * gives three *different* answers, one per edge.
   *
   * Without this, an implementation that returned the same value for every edge
   * — a single flip applied regardless of which wall was hit — would satisfy at
   * most one assertion above and could look like a rounding quibble. Here it
   * fails outright.
   */
  it('gives three different headings for the three edges', () => {
    const headings = new Set([
      reflect(30, 'side'),
      reflect(30, 'endCap'),
      reflect(30, 'corner'),
    ]);
    expect(headings.size, 'side, endCap and corner must differ').toBe(3);
  });

  /**
   * Two side bounces return the original heading — a mirror is its own inverse.
   *
   * This catches a fix that rotates by a fixed amount per bounce instead of
   * reflecting: `+90` twice would pass "it changed" both times and never come
   * home.
   */
  it('returns to the original heading after two identical bounces', () => {
    expect(reflect(reflect(30, 'side'), 'side')).toBe(30);
    expect(reflect(reflect(30, 'endCap'), 'endCap')).toBe(30);
  });

  /**
   * The heading a bounce produces must match the velocity it produces, or the
   * sprite points somewhere the round is not going.
   *
   * Driven through the real `bounceAgainstCamera` rather than `reflect` alone,
   * because that is the seam: the two are computed separately and nothing else
   * requires them to agree.
   */
  it('keeps the drawn heading and the new velocity pointing the same way', () => {
    const camera: CameraBounds = { left: 0, top: 0, width: 200, height: 200 };
    // Heading right-and-down at 45, just past the right wall.
    const speed = Math.SQRT2;
    const bounced = bounceAgainstCamera(
      { x: 205, y: 100, xVel: 1, yVel: 1, radius: 2, rotation: 45 },
      camera,
    );

    expect(bounced, 'should have bounced off the right wall').not.toBeNull();

    const { xVel, yVel, rotation } = bounced!.state;
    const fromVelocity = (Math.atan2(yVel, xVel) * 180) / Math.PI;
    // Same direction, allowing for equivalent representations of one angle.
    const difference = Math.abs(((rotation - fromVelocity) % 360 + 360) % 360);
    expect(difference === 0 || difference === 360, `rotation ${rotation} vs velocity ${fromVelocity}`).toBe(
      true,
    );
    expect(Math.hypot(xVel, yVel)).toBeCloseTo(speed, 6);
  });
});
