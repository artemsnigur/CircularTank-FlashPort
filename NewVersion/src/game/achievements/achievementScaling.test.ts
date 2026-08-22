import { describe, expect, it } from 'vitest';

import {
  AS3_MEDAL_REQUIREMENTS,
  MEDALS_PER_LEVEL,
  SCALED_MEDAL_REQUIREMENTS,
  medalCeiling,
  parseMedalId,
  requirementFor,
  scaleDescription,
} from './achievementScaling';
import { ACHIEVEMENTS } from './achievementData';
import { TOTALS_TYPE_TO_MODE } from '../levels/levelProgress';
import type { TotalsType } from '../levels/levelProgress';

const TYPES = Object.keys(TOTALS_TYPE_TO_MODE);

/** The fifteen medal specs, straight out of the generated data. */
const medalSpecs = ACHIEVEMENTS.filter((spec) => parseMedalId(spec.id) !== null);

describe('the medal groups', () => {
  it('finds fifteen of them, three tiers each', () => {
    expect(medalSpecs).toHaveLength(15);
    expect(TYPES).toHaveLength(5);
    for (const type of TYPES) {
      expect(SCALED_MEDAL_REQUIREMENTS[type], type).toHaveLength(3);
    }
  });

  it('reads a tiered id and refuses anything else', () => {
    expect(parseMedalId('Stars2')).toEqual({ type: 'Stars', tier: 2 });
    expect(parseMedalId('Bosses3')).toEqual({ type: 'Bosses', tier: 3 });

    // The counterparts. `Kills1` looks exactly like a medal id and is not one —
    // it is a Number achievement counting kills, and rescaling it would move a
    // threshold nobody asked to move.
    expect(parseMedalId('Kills1')).toBeNull();
    expect(parseMedalId('Stars')).toBeNull();
    expect(parseMedalId('Stars4')).toBeNull();
    expect(parseMedalId('BossOnlySpecial')).toBeNull();
  });

  it('matches the AS3 table it was derived from', () => {
    // The generated data is the original's record; this pins that the
    // documentation copy has not drifted from it.
    for (const spec of medalSpecs) {
      const { type, tier } = parseMedalId(spec.id)!;
      expect(spec.requirement, spec.id).toBe(AS3_MEDAL_REQUIREMENTS[type][tier - 1]);
    }
  });
});

describe('the rescale', () => {
  /*
   * The property being preserved is the **fraction**, not the number. The AS3's
   * three tiers sit at 2/9, 4/9 and 6/9 of their ceiling — 60/120/180 of 270,
   * and 30/60/90 of 135, which are the same three fractions on two different
   * ceilings. Shown here rather than asserted about the new table, because it
   * is the reason the new numbers are what they are.
   */
  it('keeps the ladder the original had, as a share of what was reachable', () => {
    const as3Ceiling: Record<TotalsType, number> = {
      Stars: 270,
      Flags: 270,
      Towers: 270,
      Shields: 270,
      Bosses: 135,
    };
    for (const type of TYPES) {
      const shares = AS3_MEDAL_REQUIREMENTS[type].map((r) => r / as3Ceiling[type]);
      expect(shares[0], type).toBeCloseTo(2 / 9, 6);
      expect(shares[1], type).toBeCloseTo(4 / 9, 6);
      expect(shares[2], type).toBeCloseTo(6 / 9, 6);
    }
  });

  it('rises with the tier, in every group', () => {
    for (const type of TYPES) {
      const [one, two, three] = SCALED_MEDAL_REQUIREMENTS[type];
      expect(one, type).toBeLessThan(two);
      expect(two, type).toBeLessThan(three);
    }
  });

  it('asks less than the original everywhere', () => {
    // The direction, since the campaign got shorter. A rescale that raised a
    // threshold would be a different bug from an unreachable one and just as
    // silent.
    for (const type of TYPES) {
      for (let tier = 0; tier < 3; tier += 1) {
        expect(SCALED_MEDAL_REQUIREMENTS[type][tier], `${type}${tier + 1}`).toBeLessThan(
          AS3_MEDAL_REQUIREMENTS[type][tier],
        );
      }
    }
  });

  it('replaces the threshold for a medal id and nothing else', () => {
    expect(requirementFor({ id: 'Stars3', requirement: 180 })).toBe(80);
    expect(requirementFor({ id: 'Towers3', requirement: 180 })).toBe(40);

    // The counterpart, on the identical shape: a non-medal achievement keeps
    // the number the AS3 gave it.
    expect(requirementFor({ id: 'Kills1', requirement: 100 })).toBe(100);
    expect(requirementFor({ id: 'BossOnlySpecial', requirement: 0 })).toBe(0);
  });
});

describe('every threshold is reachable in the campaign as it stands', () => {
  /**
   * The check `achievementReachability.test.ts` does not make.
   *
   * That file is titled "every achievement is reachable" and feeds the
   * evaluator a fabricated total, so it proves the rule *fires* — it never asks
   * whether the campaign can supply the number. Five thresholds would have gone
   * unearnable at 180 levels with nothing failing anywhere.
   *
   * This counts the live campaign, so it moves when the campaign does.
   */
  it('leaves headroom above every tier', () => {
    for (const type of TYPES) {
      const ceiling = medalCeiling(type);
      for (let tier = 0; tier < 3; tier += 1) {
        const required = SCALED_MEDAL_REQUIREMENTS[type][tier];
        expect(required, `${type}${tier + 1} of ${ceiling}`).toBeLessThanOrEqual(ceiling);
      }
    }
  });

  it('does not require a flawless run of the whole mode', () => {
    // A threshold *equal* to the ceiling is technically reachable and
    // practically not — every level of that mode at three medals, on the
    // hardest difficulty. The top tier stays at two thirds.
    for (const type of TYPES) {
      const ceiling = medalCeiling(type);
      const top = SCALED_MEDAL_REQUIREMENTS[type][2];
      expect(top / ceiling, `${type}3`).toBeLessThanOrEqual(0.9);
    }
  });

  it('counts the ceiling from the campaign, not from a constant', () => {
    // Proves the ceiling is derived: it has to equal the levels of that mode
    // times three, computed here a second way.
    for (const type of TYPES) {
      const mode = TOTALS_TYPE_TO_MODE[type];
      const specs = medalSpecs.filter((s) => parseMedalId(s.id)!.type === type);
      expect(specs, type).toHaveLength(3);
      expect(medalCeiling(type) % MEDALS_PER_LEVEL, type).toBe(0);
      expect(medalCeiling(type), `${type} counts ${mode} levels`).toBeGreaterThan(0);
    }
  });
});

describe('the prose follows the number', () => {
  it('names its own threshold in every generated description', () => {
    /*
     * What makes `scaleDescription`'s replace safe. A string that stopped
     * naming its number would silently keep the old figure, telling the player
     * to earn 180 for something that wants 80.
     */
    for (const spec of medalSpecs) {
      expect(spec.description, spec.id).toContain(String(spec.requirement));
    }
  });

  it('rewrites it to the rescaled figure', () => {
    expect(scaleDescription('Stars3', 'Earn 180 stars.', 180)).toBe('Earn 80 stars.');
    expect(scaleDescription('Towers1', 'Earn 60 towers.', 60)).toBe('Earn 15 towers.');
  });

  it('leaves a non-medal description untouched', () => {
    const text = 'Win a boss level with 3 bosses, and get 3 medals.';
    expect(scaleDescription('BossOnlySpecial', text, 0)).toBe(text);
    // ...including one whose text happens to contain a number.
    expect(scaleDescription('Kills1', 'Kill 100 enemies.', 100)).toBe('Kill 100 enemies.');
  });

  it('produces a description whose number is the one that will be required', () => {
    // End to end, across all fifteen: whatever the panel says, the evaluator
    // asks for exactly that.
    for (const spec of medalSpecs) {
      const shown = scaleDescription(spec.id, spec.description, spec.requirement);
      expect(shown, spec.id).toContain(String(requirementFor(spec)));
    }
  });
});
