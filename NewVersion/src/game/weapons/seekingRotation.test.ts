/**
 * A homing round faces its heading — and it does so **cosmetically**.
 *
 * T235 wrote `motion.rotation` inside `steer`. A hard freeze was reported on
 * it and it was reverted (`A87`) without a cause ever being found. T237 does
 * the same job by writing only the display object's angle, so the question
 * cannot arise again — and the assertions below are as much about *what is
 * not touched* as about what is.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { magicVelocity, seekingRotation, turnsWhileSeeking } from './magic';

describe('turnsWhileSeeking', () => {
  it('turns the bunny and the rocket, and not the magic round', () => {
    /*
     * The AS3 draws this line in a place worth pinning, because two of three
     * looks like the third was missed by the port. `:1749` gates the rotation
     * write on `BulletMagicBunny` *inside* the shared seeking block, and
     * `:1769` writes it in the rocket's own — `BulletMagic` passes through the
     * first with its velocity re-aimed and its rotation untouched.
     */
    expect(turnsWhileSeeking('BulletMagicBunny')).toBe(true); // `:1749`
    expect(turnsWhileSeeking('BulletRocket')).toBe(true); // `:1769`
    expect(turnsWhileSeeking('BulletMagic')).toBe(false); // no write anywhere
  });

  it('says no to everything that does not home', () => {
    // A small allow-list, not a default-on rule, so a straight-flying round
    // cannot start spinning because it passed through the pass for some other
    // reason.
    for (const other of ['BulletSmall', 'BulletCake', 'BulletIceball', 'Bullet', '']) {
      expect(turnsWhileSeeking(other), other).toBe(false);
    }
  });
});

describe('seekingRotation', () => {
  it('reads the heading in degrees, with +x at zero', () => {
    /*
     * The art points along +x at rotation 0 — the same convention the spawn
     * write at `:3907` uses — so there is no offset. Screen `y` grows
     * downward, so +90 is *down*, and that is what catches a sign flip.
     */
    expect(seekingRotation(1, 0)).toBeCloseTo(0, 10);
    expect(seekingRotation(0, 1)).toBeCloseTo(90, 10);
    expect(seekingRotation(-1, 0)).toBeCloseTo(180, 10);
    expect(seekingRotation(0, -1)).toBeCloseTo(-90, 10);
    expect(seekingRotation(1, 1)).toBeCloseTo(45, 10);
  });

  it('ignores speed, reading only the direction', () => {
    // A round that slowed would otherwise appear to turn.
    expect(seekingRotation(3, 3)).toBeCloseTo(seekingRotation(0.1, 0.1)!, 10);
  });

  it('returns null rather than an angle for a round that is not moving', () => {
    /*
     * `Math.atan2(0, 0)` is `0`, not `NaN`, so this is not a safety guard
     * against arithmetic — it is a correctness one. Snapping a stationary
     * round to face right is a visible wrong answer; leaving its angle alone
     * is the right one, and `null` is how the caller is told to do nothing.
     */
    expect(seekingRotation(0, 0)).toBeNull();

    // The counterpart, so "returns null" is a rule about standing still rather
    // than something this function does generally.
    expect(seekingRotation(0, 0.0001)).not.toBeNull();
  });

  it('returns null for a velocity that is not finite', () => {
    /*
     * The freeze report named `NaN` infecting the transform tree. Nothing here
     * produces one — but this is the boundary where a `NaN` from anywhere
     * upstream would reach a Phaser transform, so it stops here rather than
     * being argued about.
     */
    for (const [x, y] of [
      [Number.NaN, 1],
      [1, Number.NaN],
      [Number.POSITIVE_INFINITY, 0],
      [0, Number.NEGATIVE_INFINITY],
    ]) {
      expect(seekingRotation(x, y), `${x}, ${y}`).toBeNull();
    }
  });

  it('agrees with the velocity the same target produces', () => {
    /*
     * The pair that makes this more than arithmetic: the angle drawn must be
     * the angle flown. `magicVelocity` is what steers, so its output fed here
     * must point back at the target it was aimed at.
     */
    const from = { x: 100, y: 100 };
    const to = { x: 340, y: 20 };

    const { xVel, yVel } = magicVelocity(from, to, 12);
    const wanted = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;

    expect(seekingRotation(xVel, yVel)).toBeCloseTo(wanted, 10);
  });
});

describe('the write is cosmetic, and that is the design', () => {
  const BULLET = readFileSync('src/game/entities/Bullet.ts', 'utf8');
  const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

  it('sets the sprite angle and assigns no state', () => {
    /*
     * The whole point of the second attempt. Source-shape, and narrow: it
     * proves what is written, not that it runs — the driven half is T237's
     * run. What it buys is the property the design rests on, which a later
     * edit could quietly remove.
     */
    const method = /faceHeading\(\): void \{[\s\S]{0,400}?\n {2}\}/.exec(BULLET);
    expect(method, 'faceHeading was not found').not.toBeNull();

    const body = method![0];
    expect(body).toMatch(/turnsWhileSeeking\(this\.bulletClassName\)/);
    expect(body).toMatch(/this\.setAngle\(angle\)/);

    // Nothing is assigned to `motion`, which is what T235 did and this does
    // not. A write here is the one thing that could feed back into physics.
    expect(body, 'faceHeading assigns to motion').not.toMatch(/this\.motion\s*=/);
  });

  it('runs after the flight, or `advance` would overwrite it', () => {
    /*
     * `advance` sets the angle from `motion.rotation` every frame it runs, so
     * ordering is load-bearing rather than incidental: a pass placed before it
     * would compute the right number and never be seen.
     */
    expect(BULLET).toMatch(/this\.setAngle\(this\.motion\.rotation\)/);

    const loop = /private advanceBullets\(deltaMs: number\): void \{[\s\S]*?\n {2}\}/.exec(SCENE);
    expect(loop, 'advanceBullets was not found').not.toBeNull();

    const body = loop![0];
    expect(body).toMatch(/bullet\.faceHeading\(\)/);
    expect(
      body.indexOf('this.bullets = [...surviving'),
      'the pass runs before the surviving list is settled',
    ).toBeLessThan(body.indexOf('bullet.faceHeading()'));
  });

  it('leaves `steer` writing velocity only, as it did before T235', () => {
    // The reverted change, asserted as absent. This is the line that was
    // reported to freeze the game, and its absence is now a test rather than
    // a memory.
    const steer = /steer\(xVel: number, yVel: number\): void \{[\s\S]{0,400}?\n {2}\}/.exec(BULLET);
    expect(steer, 'steer was not found').not.toBeNull();

    expect(steer![0]).toMatch(/this\.motion = \{ \.\.\.this\.motion, xVel, yVel \}/);
    expect(steer![0], 'steer computes a rotation again').not.toMatch(/seekingRotation/);
  });
});
