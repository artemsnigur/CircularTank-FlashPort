import { describe, expect, it } from 'vitest';

import {
  AS3_WALL_SPREAD,
  WALL_FAN_DEGREES,
  WALL_PIECES,
  WALL_SPREAD,
  wallImpactBursts,
} from './wallImpact';
import { advanceBullet, steppedPosition } from '../weapons/bullets';
import type { BulletState } from '../weapons/bullets';

const ROOM = { roomWidth: 800, roomHeight: 600 };

/**
 * `BulletSmall`: collision radius 2, art 16 units long.
 *
 * The pair is the point of T241 — the round is gone once its **centre** is
 * within half the art's length of a wall, which is eight times further out
 * than the radius the cull used to wait for.
 */
const RADIUS = 2;
const CONTACT = 8;

/** Everything but the position, so each case says only what it is about. */
const at = (x: number, y: number) => ({ x, y, contactInset: CONTACT, ...ROOM });

describe('which wall, and which way the debris sprays', () => {
  it('sends each fan back into the room, along the inward normal', () => {
    /*
     * `:1821`, `:1826`, `:1831`, `:1836`. The four angles are the whole rule,
     * and they are asserted together because a sign error would look correct
     * on one wall and be backwards on its opposite — a pair of walls tested
     * alone would pass for a rule that sprays *out* through both.
     *
     * `startAngle` is the fan's centre (`moveAngle = start - rand/2 +
     * random * rand`), so 0 is rightward and 90 is *down* in screen
     * coordinates.
     */
    expect(wallImpactBursts(at(-10, 300))[0].startAngle).toBe(0); // left -> right
    expect(wallImpactBursts(at(810, 300))[0].startAngle).toBe(180); // right -> left
    expect(wallImpactBursts(at(400, -10))[0].startAngle).toBe(90); // top -> down
    expect(wallImpactBursts(at(400, 610))[0].startAngle).toBe(270); // bottom -> up
  });

  it('throws three `BulletDestroy` pieces in a 90 degree fan', () => {
    const [burst] = wallImpactBursts(at(-10, 300));

    expect(burst.type).toBe('BulletDestroy');
    expect(burst.count).toBe(WALL_PIECES);
    expect(burst.randAngle).toBe(WALL_FAN_DEGREES);
    expect(burst.distance).toBe(WALL_SPREAD);

    // The AS3's own figures, stated rather than read back out of the module.
    expect(WALL_PIECES).toBe(3); // `:1821`
    expect(WALL_FAN_DEGREES).toBe(90);
  });

  it('offsets the debris into the room, less far than the AS3 does', () => {
    /*
     * A divergence (T240), and the AS3's figure is kept beside it rather than
     * deleted — the same arrangement the coin speed and the debris scale use.
     *
     * `distance` offsets each piece along its **own heading**, and every
     * heading points into the room, so at 10 all three pieces begin ten units
     * inside the wall and travel further in. Measured in play: a median of
     * **10.2** units from the wall, about twenty screen pixels at the usual
     * zoom — a visible gap between the wall and the sparks meant to be coming
     * off it.
     */
    expect(AS3_WALL_SPREAD).toBe(10); // `:1821`
    expect(WALL_SPREAD).toBe(6);

    // Between flush and the original — the range both complaints leave open.
    expect(WALL_SPREAD).toBeGreaterThan(0);
    expect(WALL_SPREAD).toBeLessThan(AS3_WALL_SPREAD);

    const [burst] = wallImpactBursts(at(-10, 275));
    expect(burst.distance).toBe(WALL_SPREAD);

    /*
     * The burst's own origin stays **on** the wall; `distance` is applied per
     * piece, along each one's own heading, inside `spawnParticles`. So the
     * offset spreads the fan without moving the impact point — which is why
     * it is also the scatter, and why zero collapsed all three onto one spot.
     */
    expect([burst.x, burst.y]).toEqual([0, 275]);
  });
});

describe('the clamp is per axis, which is what puts it on the wall', () => {
  it('pins the crossed axis to the wall and leaves the other alone', () => {
    /*
     * `partX = -cameraPosX` replaces **one** coordinate. The other keeps the
     * round's real position, so a shot that leaves halfway up the left wall
     * bursts halfway up the left wall — not at a corner, and not out in the
     * void where the round actually was.
     */
    const [left] = wallImpactBursts(at(-10, 275));
    expect(left.x).toBe(0);
    expect(left.y).toBe(275);

    const [bottom] = wallImpactBursts(at(133, 610));
    expect(bottom.x).toBe(133);
    expect(bottom.y).toBe(600);
  });

  it('uses the room edge, not the round`s overshoot', () => {
    // Two rounds leaving the same wall at different speeds land on the same
    // line. Without the clamp they would be scattered outside it by however
    // far each had travelled that frame.
    expect(wallImpactBursts(at(-4, 300))[0].x).toBe(0);
    expect(wallImpactBursts(at(-400, 300))[0].x).toBe(0);
  });
});

describe('a corner throws two bursts, and the second sees the first`s clamp', () => {
  it('spawns from both blocks, because they are not chained', () => {
    /*
     * `:1817` and `:1827` are separate `if` statements, each with its own
     * `else if`. A round leaving through a corner satisfies one from each and
     * spawns **twice** — six pieces, where every other impact throws three.
     *
     * This is the detail a paraphrase loses: written as one `if/else if`
     * chain over four edges, a corner would produce a single burst and nobody
     * would notice.
     */
    const bursts = wallImpactBursts(at(-10, -10));
    expect(bursts).toHaveLength(2);
    expect(bursts.map((b) => b.startAngle)).toEqual([0, 90]);
    expect(bursts.reduce((n, b) => n + b.count, 0)).toBe(WALL_PIECES * 2);
  });

  it('places the second burst at the corner, on the already-clamped x', () => {
    /*
     * The ordering that makes it a *corner* rather than two separate impacts:
     * the X block runs first and rewrites `partX`, and the Y block reads it.
     *
     * If the Y block used the round's raw x instead, its burst would sit
     * outside the left wall — correct in one axis and wrong in the other.
     */
    const bursts = wallImpactBursts(at(-10, -10));

    /*
     * Only the **second** burst sits on the corner, and that surprised me
     * enough to get this expectation wrong on the first run.
     *
     * The X block spawns *before* the Y block clamps `partY`, so the first
     * burst is on the left wall at the round's raw height — which, at a
     * corner, is still above the room. The second has both clamped.
     *
     * That is what `:1821` and `:1831` do in order, and it is worth a test
     * rather than a comment: "both at the corner" is the intuitive reading
     * and it is wrong.
     */
    expect(bursts.map((b) => [b.x, b.y])).toEqual([
      [0, -10],
      [0, 0],
    ]);

    // And the far corner, so the pattern is not an artefact of the origin:
    // same shape, first burst on the wall in x and still outside in y.
    const far = wallImpactBursts(at(810, 610));
    expect(far.map((b) => [b.x, b.y])).toEqual([
      [800, 610],
      [800, 600],
    ]);
  });

  it('is the only case that produces more than one', () => {
    // The counterpart: every edge that is not a corner throws exactly one.
    for (const point of [at(-10, 300), at(810, 300), at(400, -10), at(400, 610)]) {
      expect(wallImpactBursts(point)).toHaveLength(1);
    }
  });
});

describe('it fires only for a round that really left the room', () => {
  it('returns nothing for a round still inside', () => {
    /*
     * Empty is a real answer the caller must handle: `advanceBullet` returns
     * null for rounds removed for other reasons too, and a burst for those
     * would put debris in the middle of the arena.
     */
    expect(wallImpactBursts(at(400, 300))).toEqual([]);
    // Just clear of the contact margin on both axes, at both corners.
    expect(wallImpactBursts(at(CONTACT + 1, CONTACT + 1))).toEqual([]);
    expect(wallImpactBursts(at(800 - CONTACT - 1, 600 - CONTACT - 1))).toEqual([]);
  });

  it('uses the same contact margin the cull does', () => {
    /*
     * The pair that matters most, and the reason `advanceBullet` is imported
     * here: the burst must fire on **exactly** the step that culls. A hair
     * inside the margin, the round survives and there is no burst; a hair
     * past it, both agree.
     *
     * A margin that disagreed would show as debris with no removal, or a
     * removal with no debris — and neither is visible in a test of either
     * function alone. After T241 it would be worse than a mismatch: the burst
     * would find the round *in bounds* and produce nothing at all.
     */
    const bullet = (x: number): BulletState => ({
      x,
      y: 300,
      xVel: 0,
      yVel: 0,
      rotation: 0,
      radius: RADIUS,
      damage: 1,
      explosion: false,
      explosionRadius: 0,
      penetrates: false,
      bombTimer: 0,
      freezeTime: 0,
      poisonTime: 0,
      poisonDamage: 0,
      cakePieces: 0,
      targets: 0,
    });

    const bounds = { ...ROOM, contactInset: CONTACT };
    const clear = CONTACT + 0.5;
    const touching = CONTACT - 0.5;

    expect(advanceBullet(bullet(clear), bounds, 0)).not.toBeNull();
    expect(wallImpactBursts(at(clear, 300))).toEqual([]);

    expect(advanceBullet(bullet(touching), bounds, 0)).toBeNull();
    expect(wallImpactBursts(at(touching, 300))).toHaveLength(1);
  });

  it('kills the round while its centre is still inside the room', () => {
    /*
     * The change itself, stated as the thing that was wrong. The cull used to
     * be `-radius`, so the round survived until its centre had passed the
     * wall — and with the art eight times longer than the radius, the drawn
     * round reached **10 units through the wall** before dying. That is what
     * "the projectile is still visible" was.
     *
     * The old margin is asserted beside the new one, because "dies near the
     * wall" is true of both and only the *sign* separates them.
     */
    const bullet: BulletState = {
      x: 4, y: 300, xVel: 0, yVel: 0, rotation: 0, radius: RADIUS,
      damage: 1, explosion: false, explosionRadius: 0, penetrates: false,
      bombTimer: 0, freezeTime: 0, poisonTime: 0, poisonDamage: 0,
      cakePieces: 0, targets: 0,
    };

    // Inside the room by every measure — and gone, because its nose is out.
    expect(bullet.x).toBeGreaterThan(0);
    expect(advanceBullet(bullet, { ...ROOM, contactInset: CONTACT }, 0)).toBeNull();

    // Without the inset, the same round lives on and is drawn past the wall.
    expect(advanceBullet(bullet, ROOM, 0)).not.toBeNull();
    expect(advanceBullet({ ...bullet, x: -RADIUS - 1 }, ROOM, 0)).toBeNull();
  });

  it('reads the position the step produced, not the one before it', () => {
    /*
     * `advanceBullet` discards the stepped position when it culls, so the
     * scene recomputes it through `steppedPosition` — the one copy of that
     * arithmetic. Here it is checked end to end: a round one frame from the
     * wall is inside *now* and outside *after* the step, and only the second
     * position produces a burst.
     */
    const frame = 1000 / 30;
    const round = { x: 20, y: 300, xVel: -20, yVel: 0 };

    expect(wallImpactBursts(at(round.x, round.y))).toEqual([]);

    const exit = steppedPosition(round, frame);
    expect(exit.x).toBeCloseTo(0, 6);
    expect(wallImpactBursts(at(exit.x, exit.y))).toHaveLength(1);
  });

  it('returns nothing for a position that is not a number', () => {
    // A `NaN` reaching a particle spawn would put an untextured sprite at an
    // unrenderable coordinate; it stops here rather than being argued about.
    expect(wallImpactBursts(at(Number.NaN, 300))).toEqual([]);
    expect(wallImpactBursts(at(400, Number.POSITIVE_INFINITY))).toEqual([]);
  });
});
