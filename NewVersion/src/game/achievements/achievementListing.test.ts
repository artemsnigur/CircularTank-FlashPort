import { describe, expect, it } from 'vitest';

import { buildAchievementListing } from './achievementListing';
import { ACHIEVEMENTS } from './achievementData';

describe('buildAchievementListing', () => {
  it('lists every achievement, earned or not', () => {
    // The board shows all 36; an unearned one is a visible goal, not a gap.
    const listing = buildAchievementListing({});
    expect(listing.entries).toHaveLength(ACHIEVEMENTS.length);
    expect(listing.total).toBe(36);
  });

  it('treats -1 and a missing state as the same unearned answer', () => {
    // `-1` is the AS3 default and `undefined` is a profile that never wrote
    // one. Pinned together because a screen that distinguished them would show
    // two kinds of "not earned".
    const missing = buildAchievementListing({});
    const explicit = buildAchievementListing({ Kills1: -1 });
    expect(missing.entries[0].earned).toBe(false);
    expect(explicit.entries[0].earned).toBe(false);
    expect(missing.earnedCount).toBe(explicit.earnedCount);
  });

  it('counts 0 as earned, since that is the difficulty-irrelevant win', () => {
    // The boundary that matters: `0` means earned with no difficulty recorded,
    // and a `> 0` test would report it as unearned forever.
    const listing = buildAchievementListing({ Kills1: 0 });
    expect(listing.entries[0].earned).toBe(true);
    expect(listing.earnedCount).toBe(1);
  });

  it('reports the difficulty only for an earned entry that records one', () => {
    const listing = buildAchievementListing({ Kills1: 0 });
    const withDifficulty = buildAchievementListing({ FlagNoWeapons: 2 });

    expect(listing.entries.find((e) => e.id === 'Kills1')!.difficulty).toBe(0);
    expect(buildAchievementListing({}).entries[0].difficulty).toBeNull();

    const entry = withDifficulty.entries.find((e) => e.id === 'FlagNoWeapons');
    if (entry) expect(entry.difficulty).toBe(2);
  });

  it('carries the AS3 grid placement through unchanged', () => {
    // The screen lays out from these; a listing that dropped them would render
    // a list and look plausible.
    const listing = buildAchievementListing({});
    for (const entry of listing.entries) {
      const spec = ACHIEVEMENTS.find((a) => a.id === entry.id)!;
      expect([entry.x, entry.y], entry.id).toEqual([spec.x, spec.y]);
    }
  });

  /*
   * ── The grid is regular, and the old test here said otherwise ────────────
   *
   * This used to assert "the grid is irregular", on the evidence that some
   * `y` is not a multiple of 40 — and it explained that as `MaxedPrimary1`
   * sitting 16 units off the row step. Measured, that is wrong twice over:
   * `MaxedPrimary1` is at (55, 176), exactly on the lattice, and the row step
   * is **56**, not 40. Every one of the 36 x/y pairs is on a 6x6 lattice at
   * x 55..355 step 60 and y 120..400 step 56, with no point missing and none
   * doubled.
   *
   * The original defect was real — the first screen divided y by 40 and two
   * entries rounded into one cell — but the cause was the assumed step, not
   * the data. A test that passes because the constant it disproves is wrong
   * describes nothing, and it stopped anyone from checking, which is why the
   * claim then reached three docstrings and the stylesheet.
   *
   * What replaces it pins the lattice itself, so a regenerated
   * `achievementData.ts` that actually moved a badge would fail here.
   */
  it('places all 36 on a regular 6x6 lattice, x step 60 and y step 56', () => {
    const entries = buildAchievementListing({}).entries;
    const xs = [...new Set(entries.map((e) => e.x))].sort((a, b) => a - b);
    const ys = [...new Set(entries.map((e) => e.y))].sort((a, b) => a - b);

    expect(xs).toEqual([55, 115, 175, 235, 295, 355]);
    expect(ys).toEqual([120, 176, 232, 288, 344, 400]);

    // Every lattice point occupied — 6 x 6 distinct values could still leave
    // holes and doubles, which is the shape that loses an entry.
    const seen = new Set(entries.map((e) => `${e.x},${e.y}`));
    for (const x of xs) for (const y of ys) expect(seen.has(`${x},${y}`), `${x},${y}`).toBe(true);
    expect(seen.size).toBe(36);
  });

  it('is not on the 40-unit row step the first layout assumed', () => {
    // The counterpart, and the only part of the old assertion worth keeping:
    // it is *why* deriving a row index from `y` went wrong. Driven against the
    // true step beside it, so "some modulus is non-zero" cannot pass on its
    // own the way it did before.
    const entries = buildAchievementListing({}).entries;
    expect(entries.some((entry) => (entry.y - 120) % 40 !== 0)).toBe(true);
    expect(entries.every((entry) => (entry.y - 120) % 56 === 0)).toBe(true);
  });

  it('gives every achievement a distinct position', () => {
    // Whatever the layout maths, two entries at one point means one is hidden.
    const cells = new Set(buildAchievementListing({}).entries.map((e) => `${e.x},${e.y}`));
    expect(cells.size).toBe(36);
  });

});
