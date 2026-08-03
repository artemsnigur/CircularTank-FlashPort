/**
 * The erosion half of `:7071-7089`, which had never run.
 *
 * `drainIce` and `extinguishIce` were ported with T1 and had no caller outside
 * their own unit tests until now. Wired together rather than laser-first,
 * because they share one loop over one array — splitting them means reopening
 * the same code at full cost.
 *
 * The freeze/burn contact rules are pinned in `groundHazard.test.ts`; what is
 * new here is that a sweep actually reaches them, and that the two erosion
 * sources behave differently from each other.
 */
import { describe, expect, it } from 'vitest';
import { sweepHazards } from './hazardSweep';
import type { SweepEnemy } from './hazardSweep';
import { createHazard } from './groundHazard';
import { createBeam } from './laser';

const ice = (x = 100, y = 0, trailLife = 400) =>
  createHazard({ type: 'Ice', x, y, trailLife, payload: 175 });

const lava = (x = 100, y = 0) =>
  createHazard({ type: 'Lava', x, y, trailLife: 280, payload: 15 });

const noEnemies: SweepEnemy[] = [];
const base = { frames: 1, iceTrailId: 1 };

describe('a beam crossing an ice patch destroys it outright', () => {
  it('removes the patch in the same sweep', () => {
    // `:7085` zeroes `lifeTime` and the very next block splices it out, so a
    // beamed patch never survives to a second frame.
    const beam = createBeam(0, 0, 0); // along +x
    const result = sweepHazards([ice(100, 0)], noEnemies, { ...base, beam });

    expect(result.hazards).toHaveLength(0);
    expect(result.removed).toEqual([0]);
  });

  it('leaves a patch the beam misses alone', () => {
    const beam = createBeam(0, 0, 0);
    const result = sweepHazards([ice(100, 500)], noEnemies, { ...base, beam });

    expect(result.hazards).toHaveLength(1);
  });

  it('does not touch lava at all', () => {
    // The AS3 nests both erosion branches inside `if ObjectGroundIce` (`:7067`).
    // Lava burns out on its own clock whatever crosses it.
    const beam = createBeam(0, 0, 0);
    const result = sweepHazards([lava(100, 0)], noEnemies, { ...base, beam });

    expect(result.hazards).toHaveLength(1);
  });

  it('kills a patch far younger than the beam would otherwise reach', () => {
    // A fresh 400-frame trail dies instantly. Contrast with the drain below,
    // which takes many frames — the two erosion sources are not the same rule
    // at different strengths.
    const beam = createBeam(0, 0, 0);
    const fresh = ice(100, 0, 400);
    expect(fresh.lifeTime).toBe(415); // ice's +15

    expect(sweepHazards([fresh], noEnemies, { ...base, beam }).hazards).toHaveLength(0);
  });
});

describe('a flame overlapping ice drains it', () => {
  it('takes three frames of life per frame, on top of the ordinary tick', () => {
    // `:7078`. One tick (1) plus the drain (3) is 4 frames of life per frame.
    const patch = ice(100, 0);
    const before = patch.lifeTime;

    const result = sweepHazards([patch], noEnemies, {
      ...base,
      flames: [{ x: 100, y: 0, radius: 20 }],
    });

    expect(result.hazards[0].lifeTime).toBe(before - 4);
  });

  it('is ignored when the flame is elsewhere', () => {
    const patch = ice(100, 0);
    const before = patch.lifeTime;

    const result = sweepHazards([patch], noEnemies, {
      ...base,
      flames: [{ x: 900, y: 900, radius: 20 }],
    });

    expect(result.hazards[0].lifeTime).toBe(before - 1);
  });

  it('stacks per overlapping flame, as the AS3 loop does', () => {
    // The drain sits inside the bullet loop with no dedup, so two flames on one
    // patch drain it twice. Deliberately unlike lava's `onLava`, which is
    // per-frame deduped — same file, opposite rule.
    const patch = ice(100, 0);
    const before = patch.lifeTime;

    const result = sweepHazards([patch], noEnemies, {
      ...base,
      flames: [
        { x: 100, y: 0, radius: 20 },
        { x: 100, y: 0, radius: 20 },
      ],
    });

    expect(result.hazards[0].lifeTime).toBe(before - 7); // 1 tick + 3 + 3
  });

  it('kills ice roughly four times faster than time alone', () => {
    const drain = (flames: boolean) => {
      let hazards = [ice(100, 0, 100)];
      let frames = 0;
      while (hazards.length > 0 && frames < 1000) {
        hazards = sweepHazards(hazards, noEnemies, {
          ...base,
          flames: flames ? [{ x: 100, y: 0, radius: 20 }] : [],
        }).hazards;
        frames += 1;
      }
      return frames;
    };

    expect(drain(false) / drain(true)).toBeCloseTo(4, 0);
  });

  it('does not touch lava', () => {
    const patch = lava(100, 0);
    const before = patch.lifeTime;

    const result = sweepHazards([patch], noEnemies, {
      ...base,
      flames: [{ x: 100, y: 0, radius: 20 }],
    });

    expect(result.hazards[0].lifeTime).toBe(before - 1);
  });
});

describe('erosion runs before contact, as the two AS3 functions do', () => {
  it('a beamed patch never gets a contact pass', () => {
    // `handleGround` removes it before the `handleEnemies` ground loop would
    // see it, so an enemy standing in a patch the beam destroyed this frame is
    // not frozen by it.
    const enemy: SweepEnemy = {
      targetable: true,
      x: 100,
      y: 0,
      radius: 13,
      trailId: null,
      isBoss: false,
      enemyType: 'Normal',
      iceMultiplier: 1,
      fireLavaMultiplier: 1,
    };

    const beam = createBeam(0, 0, 0);
    const result = sweepHazards([ice(100, 0)], [enemy], { ...base, beam });

    expect(result.effects).toEqual([]);
    expect(result.stamped).toEqual([]);
    expect(result.hazards).toHaveLength(0);
  });

  it('and without the beam that same enemy is frozen', () => {
    // The control, so the assertion above is attributable to the beam.
    const enemy: SweepEnemy = {
      targetable: true,
      x: 100,
      y: 0,
      radius: 13,
      trailId: null,
      isBoss: false,
      enemyType: 'Normal',
      iceMultiplier: 1,
      fireLavaMultiplier: 1,
    };

    const result = sweepHazards([ice(100, 0)], [enemy], base);

    expect(result.effects).toEqual([{ kind: 'freeze', enemy: 0, frames: 175, enemyType: 'Normal' }]);
    expect(result.stamped).toEqual([0]);
  });
});
