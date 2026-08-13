/**
 * The pair rule — `PartGameArea.as:5174-5221`.
 *
 * **Every expected number below is derived by hand from the AS3 lines, not read
 * back out of the module.** That is the difference between a test that can
 * detect a wrong constant and one that passes for exactly as long as the bug
 * exists — `tankMovement.test.ts` carried the latter for a whole subsystem.
 *
 * The geometry is deliberately dull: bodies on the x axis, so `angleTowards` is
 * exactly `PI` and every expected value is a signed number rather than a
 * trigonometric expression. Two tests break that on purpose, because an axis
 * test cannot tell `cos`/`sin` apart if they are swapped.
 */
import { describe, expect, it } from 'vitest';

import {
  NORMAL_NUDGE,
  PUSH_DECAY,
  TOTAL_PUSH_FORCE,
  angleBetween,
  bodyMass,
  boxesOverlap,
  decayPush,
  distanceBetween,
  ranksAllowPush,
  separationBetween,
  withinBroadPhase,
} from './enemySeparation';
import type { SeparationBody } from './enemySeparation';

/** An ordinary enemy. `safetyDistance` is mid-range for `40 + random() * 60`. */
const normal = (over: Partial<SeparationBody> = {}): SeparationBody => ({
  x: 0,
  y: 0,
  radius: 13,
  enemyLevel: '1',
  safetyDistance: 70,
  ...over,
});

/** A boss. `safetyDistance` is mid-range for `160 + random() * 10`. */
const boss = (over: Partial<SeparationBody> = {}): SeparationBody => ({
  x: 0,
  y: 0,
  radius: 30,
  enemyLevel: 'B',
  safetyDistance: 165,
  ...over,
});

describe('the constants, against the AS3 lines', () => {
  /**
   * Stated from the source, not read from the module. A citation is not a
   * check — all three constants corrected in T34 carried correct-looking
   * references to the lines that contradicted them.
   */
  it('carries `:5201`, `:5187` and `:5365`', () => {
    expect(TOTAL_PUSH_FORCE).toBe(18);
    expect(NORMAL_NUDGE).toBe(0.5);
    expect(PUSH_DECAY).toBe(0.5);
  });

  it('mass is area — `:5199`', () => {
    // `theEnemy.radius * theEnemy.radius * Math.PI`.
    expect(bodyMass(30)).toBeCloseTo(900 * Math.PI, 10);
    expect(bodyMass(13)).toBeCloseTo(169 * Math.PI, 10);
    // Quadratic, not linear: doubling the radius quadruples the mass. A port
    // that used `radius` directly would pass a single-value check.
    expect(bodyMass(40) / bodyMass(20)).toBeCloseTo(4, 10);
  });

  it('the helpers match `:2345` and `:2594`', () => {
    expect(distanceBetween(0, 0, 3, 4)).toBe(5);
    // `atan2(y2 - y1, x2 - x1)` — from the first point toward the second.
    expect(angleBetween(0, 0, 1, 0)).toBeCloseTo(0, 10);
    expect(angleBetween(0, 0, 0, 1)).toBeCloseTo(Math.PI / 2, 10);
    expect(angleBetween(10, 0, 0, 0)).toBeCloseTo(Math.PI, 10);
  });
});

describe('normal vs normal — a flat 0.5 of position (`:5186-5189`)', () => {
  /**
   * A at (100,100), B at (110,100), both r13. Distance 10, well inside 26.
   * `angleTowards = angleBetween(B, A) = atan2(0, -10) = PI`, so the whole
   * nudge is `-0.5` in x.
   */
  it('nudges the subject away from the other body by exactly 0.5', () => {
    const effect = separationBetween(
      normal({ x: 100, y: 100 }),
      normal({ x: 110, y: 100 }),
    );

    expect(effect.kind).toBe('nudge');
    if (effect.kind !== 'nudge') return;
    expect(effect.dx).toBeCloseTo(-0.5, 10);
    expect(effect.dy).toBeCloseTo(0, 10);
    expect(Math.hypot(effect.dx, effect.dy)).toBeCloseTo(NORMAL_NUDGE, 10);
  });

  /**
   * **The distinguishing property, and the reason this branch is not a
   * penetration push.** Two overlaps of very different depth produce the
   * *identical* nudge. A "resolve the overlap" implementation cannot pass this.
   */
  it('is constant, whatever the overlap depth', () => {
    const barely = separationBetween(normal({ x: 0 }), normal({ x: 25.9 }));
    const almostConcentric = separationBetween(normal({ x: 0 }), normal({ x: 0.1 }));

    expect(barely.kind).toBe('nudge');
    expect(almostConcentric.kind).toBe('nudge');
    if (barely.kind !== 'nudge' || almostConcentric.kind !== 'nudge') return;

    expect(Math.hypot(barely.dx, barely.dy)).toBeCloseTo(0.5, 10);
    expect(Math.hypot(almostConcentric.dx, almostConcentric.dy)).toBeCloseTo(0.5, 10);
  });

  /**
   * Off-axis, so a swapped `cos`/`sin` fails. 3-4-5 at r13: distance 25 < 26.
   * `angleTowards = atan2(-4, -3)`, so `dx = -0.3`, `dy = -0.4`.
   */
  it('points along the true bearing, not an axis', () => {
    const effect = separationBetween(normal({ x: 0, y: 0 }), normal({ x: 15, y: 20 }));

    expect(effect.kind).toBe('nudge');
    if (effect.kind !== 'nudge') return;
    expect(effect.dx).toBeCloseTo(-0.3, 10);
    expect(effect.dy).toBeCloseTo(-0.4, 10);
  });

  /**
   * **Trap 3 — the double visit is load-bearing.** The AS3 walks ordered pairs,
   * so both bodies are nudged on their own visit and the pair separates by 1.0
   * per frame. An `iii > i` "optimisation" halves that.
   */
  it('separates a pair by 1.0 per frame across both orderings', () => {
    const a = normal({ x: 0, y: 0 });
    const b = normal({ x: 10, y: 0 });

    const onA = separationBetween(a, b);
    const onB = separationBetween(b, a);
    if (onA.kind !== 'nudge' || onB.kind !== 'nudge') throw new Error('expected two nudges');

    expect(onA.dx).toBeCloseTo(-0.5, 10);
    expect(onB.dx).toBeCloseTo(0.5, 10);
    // Opposite directions, so the gap grows by the sum.
    expect(onB.dx - onA.dx).toBeCloseTo(1.0, 10);
  });
});

describe('boss vs boss — mass-weighted force into pushVel (`:5191-5207`)', () => {
  /**
   * Equal radii, so `1 - m/(2m) = 0.5` and each gets `0.5 * 18 = 9`.
   * A at (0,0), B at (40,0), r30 both: distance 40 < 60, `angleTowards = PI`.
   */
  it('splits the force evenly between equal masses', () => {
    const effect = separationBetween(boss({ x: 0, y: 0 }), boss({ x: 40, y: 0 }));

    expect(effect.kind).toBe('bossPush');
    if (effect.kind !== 'bossPush') return;

    expect(effect.subject.pushVelX).toBeCloseTo(-9, 10);
    expect(effect.subject.pushVelY).toBeCloseTo(0, 10);
    expect(effect.other.pushVelX).toBeCloseTo(9, 10);
    expect(effect.other.pushVelY).toBeCloseTo(0, 10);
  });

  /**
   * **The direction of the weighting, which is the easy thing to invert.**
   * r20 against r40: masses 400pi and 1600pi, total 2000pi.
   *
   *   subject share = 1 - 400/2000  = 0.8 -> 14.4
   *   other   share = 1 - 1600/2000 = 0.2 ->  3.6
   *
   * The **lighter** body is thrown four times as fast. Simplifying `1 - own/total`
   * to `own/total` swaps these two numbers and still looks like physics.
   */
  it('throws the lighter boss further', () => {
    const effect = separationBetween(
      boss({ x: 0, y: 0, radius: 20 }),
      boss({ x: 50, y: 0, radius: 40 }),
    );

    expect(effect.kind).toBe('bossPush');
    if (effect.kind !== 'bossPush') return;

    expect(effect.subject.pushVelX).toBeCloseTo(-14.4, 10);
    expect(effect.other.pushVelX).toBeCloseTo(3.6, 10);
    // The ratio is the mass ratio, inverted: 4x the mass, a quarter of the speed.
    expect(Math.abs(effect.subject.pushVelX / effect.other.pushVelX)).toBeCloseTo(4, 10);
  });

  /**
   * The invariant behind both cases above: the two shares are `1 - a` and
   * `1 - b` where `a + b = 1`, so they always sum to the whole force.
   */
  it('always spends exactly TOTAL_PUSH_FORCE between the pair', () => {
    for (const [r1, r2] of [
      [30, 30],
      [20, 40],
      [13, 55],
      [8, 9],
    ]) {
      const effect = separationBetween(
        boss({ x: 0, y: 0, radius: r1 }),
        boss({ x: r1 + r2 - 1, y: 0, radius: r2 }),
      );
      if (effect.kind !== 'bossPush') throw new Error(`expected a boss push for ${r1}/${r2}`);

      const total =
        Math.hypot(effect.subject.pushVelX, effect.subject.pushVelY) +
        Math.hypot(effect.other.pushVelX, effect.other.pushVelY);
      expect(total, `${r1} vs ${r2}`).toBeCloseTo(TOTAL_PUSH_FORCE, 10);
    }
  });

  /** `:5193-5194` — the contact point sits on the *other* body's rim. */
  it('reports the contact point for the BossCollision gate', () => {
    const effect = separationBetween(boss({ x: 0, y: 0 }), boss({ x: 40, y: 0 }));

    expect(effect.kind).toBe('bossPush');
    if (effect.kind !== 'bossPush') return;
    // 40 + cos(PI) * 30 = 10, on the near side of B, facing A.
    expect(effect.contactX).toBeCloseTo(10, 10);
    expect(effect.contactY).toBeCloseTo(0, 10);
  });

  /**
   * **Trap 2's other half.** The second visit overwrites the first rather than
   * accumulating, so it matters whether the two visits agree. Where both
   * orderings survive the broad phase, they do — asserted here on equal radii,
   * where no rejection is possible.
   */
  it('agrees with itself when both orderings are visible', () => {
    const a = boss({ x: 0, y: 0 });
    const b = boss({ x: 40, y: 0 });

    const first = separationBetween(a, b);
    const second = separationBetween(b, a);
    if (first.kind !== 'bossPush' || second.kind !== 'bossPush') {
      throw new Error('expected two boss pushes');
    }

    // What the first visit says about A equals what the second says about A.
    expect(second.other.pushVelX).toBeCloseTo(first.subject.pushVelX, 10);
    expect(second.other.pushVelY).toBeCloseTo(first.subject.pushVelY, 10);
    expect(second.subject.pushVelX).toBeCloseTo(first.other.pushVelX, 10);
  });

  /**
   * **The scoping pass claimed the two visits are always both taken. They are
   * not**, and this is the case that disproved it — caught by this test file
   * rather than by review.
   *
   * r20 at (0,0) against r40 at (50,0) is a real overlap: 50 < 60. But the
   * broad phase rejects the ordering whose subject is the **bigger** body,
   * because it fires on `dx > 2 * otherRadius` — 50 > 40. So only one visit
   * happens, and the boss pair still resolves because that visit writes both
   * bodies.
   */
  it('still resolves a boss pair the broad phase only sees one way', () => {
    const small = boss({ x: 0, y: 0, radius: 20 });
    const large = boss({ x: 50, y: 0, radius: 40 });

    expect(distanceBetween(0, 0, 50, 0)).toBeLessThan(20 + 40);
    expect(withinBroadPhase(small, large)).toBe(true);
    expect(withinBroadPhase(large, small)).toBe(false);

    const seen = separationBetween(small, large);
    expect(seen.kind).toBe('bossPush');
    expect(separationBetween(large, small).kind).toBe('none');

    if (seen.kind !== 'bossPush') return;
    // The surviving visit still moves both, so nothing is lost: 14.4 / 3.6.
    expect(seen.subject.pushVelX).toBeCloseTo(-14.4, 10);
    expect(seen.other.pushVelX).toBeCloseTo(3.6, 10);
  });
});

describe('normal shoved by a boss — penetration depth into xVel (`:5210-5218`)', () => {
  /**
   * A normal r13 at (0,0), boss r30 at (35,0). Distance 35, sum of radii 43,
   * so the depth is 8 and `angleTowards = PI`.
   */
  it('adds the overlap depth to velocity, not to position', () => {
    const effect = separationBetween(normal({ x: 0, y: 0 }), boss({ x: 35, y: 0 }));

    expect(effect.kind).toBe('velocity');
    if (effect.kind !== 'velocity') return;
    expect(effect.dxVel).toBeCloseTo(-8, 10);
    expect(effect.dyVel).toBeCloseTo(0, 10);
  });

  /**
   * **The distinguishing property against the normal-vs-normal branch**, driven
   * on comparable geometry: this one scales with depth where that one is flat.
   */
  it('grows with the overlap, unlike the flat normal nudge', () => {
    const shallow = separationBetween(normal({ x: 0 }), boss({ x: 42 }));
    const deep = separationBetween(normal({ x: 0 }), boss({ x: 20 }));
    if (shallow.kind !== 'velocity' || deep.kind !== 'velocity') {
      throw new Error('expected two velocity pushes');
    }

    expect(Math.abs(shallow.dxVel)).toBeCloseTo(1, 10); // 43 - 42
    expect(Math.abs(deep.dxVel)).toBeCloseTo(23, 10); // 43 - 20
    expect(Math.abs(deep.dxVel)).toBeGreaterThan(Math.abs(shallow.dxVel));
  });

  /**
   * **The rank gate, driven as the counterpart of the test above on the
   * identical geometry.** Swap the roles and the boss is not moved at all.
   * Without this pairing, "returns none" would be satisfied by a function that
   * always returned none.
   */
  it('does not move the boss when the roles are swapped', () => {
    const enemy = normal({ x: 0, y: 0 });
    const theBoss = boss({ x: 35, y: 0 });

    expect(separationBetween(enemy, theBoss).kind).toBe('velocity');
    expect(separationBetween(theBoss, enemy).kind).toBe('none');
  });

  it('states the rank rule directly, both ways round', () => {
    // A boss is moved only by another boss; an ordinary enemy by anything.
    expect(ranksAllowPush(boss(), boss())).toBe(true);
    expect(ranksAllowPush(boss(), normal())).toBe(false);
    expect(ranksAllowPush(normal(), boss())).toBe(true);
    expect(ranksAllowPush(normal(), normal())).toBe(true);
  });
});

describe('the gates', () => {
  /** `:5182` — strictly less than the sum of the radii. */
  it('needs a real overlap, not a touch', () => {
    // r13 + r13 = 26. At exactly 26 the circles touch and nothing happens.
    expect(separationBetween(normal({ x: 0 }), normal({ x: 26 })).kind).toBe('none');
    // The counterpart, a hair closer.
    expect(separationBetween(normal({ x: 0 }), normal({ x: 25.99 })).kind).toBe('nudge');
  });

  /** `:5179` — a target mid-teleport is skipped entirely. */
  it('skips a teleporting target, and only for that reason', () => {
    const here = normal({ x: 0 });
    expect(separationBetween(here, normal({ x: 10, teleporting: true })).kind).toBe('none');
    // Identical geometry, not teleporting.
    expect(separationBetween(here, normal({ x: 10, teleporting: false })).kind).toBe('nudge');
    expect(separationBetween(here, normal({ x: 10 })).kind).toBe('nudge');
  });

  /**
   * The broad phase can only *filter*. This drives a pair that is far outside
   * any padded box and confirms nothing happens, against one inside it.
   */
  it('rejects a distant pair before the circle test', () => {
    expect(withinBroadPhase(normal({ x: 0 }), normal({ x: 5000 }))).toBe(false);
    expect(withinBroadPhase(normal({ x: 0 }), normal({ x: 10 }))).toBe(true);
    expect(separationBetween(normal({ x: 0 }), normal({ x: 5000 })).kind).toBe('none');
  });

  /**
   * **Trap 8 — the transposed `h`/`w` in `checkRectanglesOverlap` (`:2354`).**
   * The claim in the module is that it cannot matter *for these callers*
   * because an enemy's width equals its height. Asserted both ways:
   */
  it('is unaffected by the transposition while width equals height', () => {
    const square = (h: number, w: number) => boxesOverlap(0, 0, h, w, 30, 30, 20, 20);
    // Square rect: swapping the two arguments changes nothing.
    expect(square(50, 50)).toBe(square(50, 50));

    // And the test is not vacuous — with a non-square rect the swap does change
    // the answer, which is exactly why the transposition would matter if enemies
    // were ever drawn non-square. The second rect has to sit **off-diagonal**
    // for the two axes to disagree; at (30, 30) whichever side is short trips
    // its own axis and both orderings return false.
    expect(boxesOverlap(0, 0, 10, 100, 30, 5, 20, 20)).toBe(true);
    expect(boxesOverlap(0, 0, 100, 10, 30, 5, 20, 20)).toBe(false);
  });
});

/**
 * The broad phase's direction dependence, as a swept property rather than an
 * anecdote.
 *
 * The module's header states two figures — 17.2% of overlapping pairs seen by
 * one ordering only, 0% seen by neither. **A doc sentence in the present
 * indicative with no mechanism behind it is the exact shape CLAUDE.md warns
 * about**, so the sweep that produced those numbers lives here and fails if
 * either changes.
 */
describe('the broad phase is direction-dependent, and measurably so', () => {
  /** The same grid the header quotes: radii 5..60 by 5, offsets +-120 by 3. */
  function sweep() {
    let overlapping = 0;
    let oneWay = 0;
    let neither = 0;

    for (let rA = 5; rA <= 60; rA += 5) {
      for (let rB = 5; rB <= 60; rB += 5) {
        for (let dx = -120; dx <= 120; dx += 3) {
          for (let dy = -120; dy <= 120; dy += 3) {
            if (!(Math.hypot(dx, dy) < rA + rB)) continue;
            const a = normal({ x: 0, y: 0, radius: rA });
            const b = normal({ x: dx, y: dy, radius: rB });
            const ab = withinBroadPhase(a, b);
            const ba = withinBroadPhase(b, a);
            overlapping += 1;
            if (ab !== ba) oneWay += 1;
            if (!ab && !ba) neither += 1;
          }
        }
      }
    }
    return { overlapping, oneWay, neither };
  }

  it('never loses an overlapping pair entirely', () => {
    // The property that makes the asymmetry survivable rather than a dropped
    // collision: both orderings could only reject if `d > 2 * max(radius)`,
    // which contradicts the overlap that got us here.
    expect(sweep().neither).toBe(0);
  });

  it('hides about a sixth of overlaps from one ordering', () => {
    const { overlapping, oneWay } = sweep();
    expect(overlapping).toBe(241_816);
    expect(oneWay).toBe(41_538);
    // The figure the module header quotes, to one decimal place.
    expect(((100 * oneWay) / overlapping).toFixed(1)).toBe('17.2');
  });

  it('is the larger body that gets skipped, not an arbitrary one', () => {
    // Equal radii: no rejection is possible either way, whatever the offset.
    for (const dx of [1, 10, 20, 25]) {
      const a = normal({ x: 0, radius: 20 });
      const b = normal({ x: dx, radius: 20 });
      expect(withinBroadPhase(a, b), `equal radii at ${dx}`).toBe(true);
      expect(withinBroadPhase(b, a), `equal radii at ${dx}`).toBe(true);
    }

    // Unequal: the ordering whose *subject* is bigger is the one rejected.
    const small = normal({ x: 0, radius: 20 });
    const large = normal({ x: 50, radius: 40 });
    expect(withinBroadPhase(small, large)).toBe(true);
    expect(withinBroadPhase(large, small)).toBe(false);
  });
});

describe('the pushVel decay (`:5365-5366`)', () => {
  it('sheds 0.5 a frame toward zero', () => {
    expect(decayPush({ pushVelX: 9, pushVelY: -9 })).toEqual({
      pushVelX: 8.5,
      pushVelY: -8.5,
    });
  });

  /** `reduceValue` clamps rather than overshooting — the whole point of it. */
  it('lands on zero instead of crossing it', () => {
    expect(decayPush({ pushVelX: 0.3, pushVelY: -0.3 })).toEqual({
      pushVelX: 0,
      pushVelY: 0,
    });
    expect(decayPush({ pushVelX: 0, pushVelY: 0 })).toEqual({ pushVelX: 0, pushVelY: 0 });
  });

  /**
   * A full boss push takes 18 frames to die — 9 units at 0.5 a frame. Stated
   * because it is the number that says how long a shove is felt, and a decay
   * of, say, 0.05 would look plausible frame by frame and last twenty times
   * longer.
   */
  it('takes 18 frames to spend an equal-mass boss push', () => {
    let push = { pushVelX: 9, pushVelY: 0 };
    let frames = 0;
    while (push.pushVelX !== 0 && frames < 100) {
      push = decayPush(push);
      frames += 1;
    }
    expect(frames).toBe(18);
  });
});
