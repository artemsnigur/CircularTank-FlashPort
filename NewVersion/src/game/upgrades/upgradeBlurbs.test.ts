import { describe, expect, it } from 'vitest';

import {
  BLURB_MAX_LENGTH,
  UPGRADE_BLURBS,
  blurbFor,
  expectedBlurbKeys,
} from './upgradeBlurbs';
import { UPGRADE_DESCRIPTIONS } from './upgradeDescriptionData';

/**
 * The blurbs are a hand-authored layer over a **generated** table, which is
 * the whole reason these tests exist: a hand-maintained map beside a machine-
 * maintained one drifts the moment the generator runs again.
 */
describe('every upgrade has a blurb, and every blurb has an upgrade', () => {
  it('covers each generated description exactly once', () => {
    // Derived from the catalog, not from a copied count — a regenerated table
    // that gains a thirteenth primary fails here rather than in the UI.
    const expected = expectedBlurbKeys().sort();
    const authored = Object.keys(UPGRADE_BLURBS).sort();

    expect(authored).toEqual(expected);
  });

  it('has no orphan blurb for an upgrade that does not exist', () => {
    /*
     * The counterpart to the above, and not redundant with it: `toEqual` on
     * two sorted arrays would catch this, but stating it separately means a
     * future change to that assertion (to a subset check, say) cannot quietly
     * drop the orphan rule.
     */
    const known = new Set(expectedBlurbKeys());
    for (const key of Object.keys(UPGRADE_BLURBS)) {
      expect(known.has(key as never), `${key} has no matching upgrade`).toBe(true);
    }
  });

  it('resolves through blurbFor for every catalogued upgrade', () => {
    // The map being right and the lookup being right are different claims —
    // the key format is built by hand in `blurbFor` and could disagree.
    for (const d of UPGRADE_DESCRIPTIONS) {
      expect(blurbFor(d.category, d.index), `${d.category}:${d.index}`).toBeTruthy();
    }

    // And its negative, driven on the same function so it is not vacuous.
    expect(blurbFor('primary', 999)).toBeUndefined();
  });
});

describe('the blurbs are actually brief', () => {
  it('keeps every blurb to one short line', () => {
    for (const [key, text] of Object.entries(UPGRADE_BLURBS)) {
      expect(text.length, `${key} is ${text.length} chars: ${text}`).toBeLessThanOrEqual(
        BLURB_MAX_LENGTH,
      );
      // One line. The originals are up to six, and a newline here would
      // reintroduce the exact shape this layer exists to remove.
      expect(text, key).not.toContain('\n');
      expect(text.trim(), key).toBe(text);
    }
  });

  it('is dramatically shorter than the text it replaces', () => {
    /*
     * The point of the change, stated as a measurement rather than a feeling.
     *
     * Per-entry rather than on the total, so one enormous original cannot mask
     * a blurb that was left long. Every single upgrade must have got shorter,
     * and the worst case must still be a real reduction.
     */
    let worstRatio = 0;
    for (const d of UPGRADE_DESCRIPTIONS) {
      const blurb = blurbFor(d.category, d.index)!;
      expect(
        blurb.length,
        `${d.category}:${d.index} is not shorter than its original`,
      ).toBeLessThan(d.text.length);
      worstRatio = Math.max(worstRatio, blurb.length / d.text.length);
    }

    // Even the least-compressed entry is at most two thirds of its original.
    expect(worstRatio).toBeLessThan(0.67);
  });

  it('leaves the generated originals untouched', () => {
    /*
     * The guarantee the separate file exists to provide. If someone "tidies"
     * by editing the generated table instead, the long text disappears and
     * this fails — which is the failure worth catching, because the generated
     * file is the AS3's own copy and the only record of the detailed rules.
     */
    const longest = Math.max(...UPGRADE_DESCRIPTIONS.map((d) => d.text.length));
    expect(longest, 'the generated descriptions look like they were condensed').toBeGreaterThan(
      200,
    );

    // And at least one still carries the multi-line shape the AS3 wrote.
    expect(UPGRADE_DESCRIPTIONS.some((d) => d.text.includes('\n'))).toBe(true);
  });
});
