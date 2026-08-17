/**
 * Medal colours, against `ScreenLevelSelect.as:849-910`.
 *
 * Every expected value is derived from the AS3's loop by hand, not from the
 * module: `iii` walks the tiers, `ii` walks that tier's count, each icon lands
 * at slot `ii`, and `:863`/`:870` suppress a slot a higher tier already took.
 */
import { describe, expect, it } from 'vitest';

import { medalTiers } from './medalTiers';
import { DIFFICULTY_SLOT } from './levelProgress';

describe('the slot order matches the AS3', () => {
  /**
   * `:1542` reads `valuesArray[ii][0]` as gold and `:1561` reads index 2 as the
   * bronze fallback. Pinned because every expectation below rests on it, and a
   * silent re-ordering of `DIFFICULTY_SLOT` would invert every colour without
   * failing anything else.
   */
  it('is hard, medium, easy', () => {
    expect(DIFFICULTY_SLOT).toEqual({ Hard: 0, Medium: 1, Easy: 2 });
  });
});

describe('one tier only', () => {
  it('gives three bronze for a level taken 3-medal on Easy', () => {
    // The reference capture: `HARD` is selected and levels 1-2 still show three
    // bronze medals. The count comes from the values triple, never from the
    // difficulty buttons.
    expect(medalTiers([0, 0, 3])).toEqual(['bronze', 'bronze', 'bronze']);
  });

  it('gives three gold for a level taken 3-medal on Hard', () => {
    expect(medalTiers([3, 0, 0])).toEqual(['gold', 'gold', 'gold']);
  });

  it('gives nothing for an untouched level', () => {
    expect(medalTiers([0, 0, 0])).toEqual([]);
  });
});

describe('tiers competing for the same slots', () => {
  /**
   * **The case that makes this per-medal rather than per-level.**
   *
   * 3 on Easy, 2 on Medium, 1 on Hard. Slot 0 goes gold (`values[0] > 0`),
   * slot 1 silver (gold did not reach it, silver did), slot 2 bronze. One row,
   * three colours — a record of how far the player got at each difficulty.
   */
  it('shows gold, silver and bronze together', () => {
    expect(medalTiers([1, 2, 3])).toEqual(['gold', 'silver', 'bronze']);
  });

  it('lets gold take every slot it reaches', () => {
    // `:858` — tier 0 never suppresses, so two gold sit above the silver.
    expect(medalTiers([2, 3, 3])).toEqual(['gold', 'gold', 'silver']);
  });

  /**
   * The counterpart to the line above: a lower tier must not add medals a
   * higher one already placed. A rule that concatenated the three counts would
   * give eight medals here instead of three.
   */
  it('never draws more medals than the best count', () => {
    for (const values of [
      [3, 3, 3],
      [1, 2, 3],
      [2, 3, 3],
      [0, 1, 2],
    ] as const) {
      const best = Math.max(...values);
      expect(medalTiers([...values]), values.join(',')).toHaveLength(best);
    }
  });
});

describe('the cascade the progress table already applies', () => {
  /**
   * Beating a level on Hard credits Easy and Medium too — `getLevelValues`
   * does that cascade upstream, so a real triple is non-increasing across
   * `[hard, medium, easy]`. These are the shapes that actually arrive.
   */
  it('reads a Hard clear as all gold, not as mixed', () => {
    expect(medalTiers([3, 3, 3])).toEqual(['gold', 'gold', 'gold']);
  });

  it('reads a Medium clear as all silver', () => {
    expect(medalTiers([0, 2, 2])).toEqual(['silver', 'silver']);
  });

  /**
   * And an *un*cascaded triple still resolves, because the rule is a
   * per-slot maximum rather than an ordering assumption. `[0, 3, 1]` cannot
   * come from `recordLevelResult`, but a hand-edited save could produce it and
   * the answer should still be defined.
   */
  it('does not assume the triple is ordered', () => {
    expect(medalTiers([0, 3, 1])).toEqual(['silver', 'silver', 'silver']);
  });
});
