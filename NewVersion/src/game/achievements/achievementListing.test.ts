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

  it('has an irregular grid, which is why the screen positions proportionally', () => {
    // The first screen divided by a 60/40 step to get grid cells. It is wrong:
    // `MaxedPrimary1` sits 16 units off the row step, so two entries would
    // round into one cell and one would silently vanish. Pinned as the reason
    // the layout is proportional rather than as a curiosity.
    const offStep = buildAchievementListing({}).entries.filter(
      (entry) => (entry.y - 120) % 40 !== 0,
    );
    expect(offStep.length).toBeGreaterThan(0);
  });

  it('gives every achievement a distinct position', () => {
    // Whatever the layout maths, two entries at one point means one is hidden.
    const cells = new Set(buildAchievementListing({}).entries.map((e) => `${e.x},${e.y}`));
    expect(cells.size).toBe(36);
  });

});
