/**
 * A homing round that turns should turn its art too — `:1749`, `:1769`.
 *
 * The Magic Bunny re-aimed at every target it chained to and kept the angle it
 * was fired at. The drawing half was never the problem: `Bullet.advance` has
 * applied `motion.rotation` every frame since the bounce work, and its comment
 * even names `:1750`. What was missing is that **nothing wrote the field
 * mid-flight** — `steer` set velocity alone.
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
     *
     * Asserted as the trio, so a change that turned them all on would fail on
     * the line that matters rather than passing two out of three.
     */
    expect(turnsWhileSeeking('BulletMagicBunny')).toBe(true); // `:1749`
    expect(turnsWhileSeeking('BulletRocket')).toBe(true); // `:1769`
    expect(turnsWhileSeeking('BulletMagic')).toBe(false); // no write anywhere
  });

  it('says no to everything that does not home', () => {
    // The counterpart: this is a small allow-list, not a default-on rule, so a
    // straight-flying round cannot start spinning because it passed through
    // `steer` for some other reason.
    for (const other of ['BulletSmall', 'BulletCake', 'BulletIceball', 'Bullet', '']) {
      expect(turnsWhileSeeking(other), other).toBe(false);
    }
  });
});

describe('seekingRotation', () => {
  it('reads the heading in degrees, with +x at zero', () => {
    /*
     * `angleToTarget * 180 / PI`, and the art points along +x at rotation 0 —
     * the same convention the spawn write at `:3907` uses. So there is no
     * offset: the number that steers is the number that draws.
     *
     * The four axes, computed rather than approximated. Screen `y` grows
     * downward, so +90 is *down* and this is what would catch a sign flip.
     */
    expect(seekingRotation(1, 0)).toBeCloseTo(0, 10);
    expect(seekingRotation(0, 1)).toBeCloseTo(90, 10);
    expect(seekingRotation(-1, 0)).toBeCloseTo(180, 10);
    expect(seekingRotation(0, -1)).toBeCloseTo(-90, 10);
    expect(seekingRotation(1, 1)).toBeCloseTo(45, 10);
  });

  it('ignores speed, reading only the direction', () => {
    // A round that slowed would otherwise appear to turn.
    expect(seekingRotation(3, 3)).toBeCloseTo(seekingRotation(0.1, 0.1), 10);
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
    const drawn = seekingRotation(xVel, yVel);
    const wanted = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;

    expect(drawn).toBeCloseTo(wanted, 10);
  });
});

describe('the bullet spends it', () => {
  const BULLET = readFileSync('src/game/entities/Bullet.ts', 'utf8');

  it('rewrites rotation inside `steer`, gated on the class', () => {
    /*
     * Source-shape, and narrow: `Bullet` cannot be constructed without a
     * scene, so this proves the write is *written* rather than reached. The
     * driven half is T235's run.
     *
     * Both halves are asserted — the write, and the gate. A `steer` that
     * rotated unconditionally would pass a check for the write alone, and
     * would spin the magic round the AS3 leaves alone.
     */
    const steer = /steer\(xVel: number, yVel: number\): void \{[\s\S]{0,600}?\n {2}\}/.exec(BULLET);
    expect(steer, 'steer was not found').not.toBeNull();

    expect(steer![0]).toMatch(/turnsWhileSeeking\(this\.bulletClassName\)/);
    expect(steer![0]).toMatch(/seekingRotation\(xVel, yVel\)/);
    expect(steer![0], 'rotation is not carried into the new motion').toMatch(/rotation,?\s*\}/);
  });

  it('keeps drawing whatever rotation the state holds, every frame', () => {
    // The other half of the path, which was already correct: `advance` applies
    // `motion.rotation` unconditionally, so writing the field is enough to
    // reach the screen. If this ever becomes conditional, `steer`'s write
    // stops mattering and nothing else would say so.
    expect(BULLET).toMatch(/this\.setAngle\(this\.motion\.rotation\)/);
  });
});
