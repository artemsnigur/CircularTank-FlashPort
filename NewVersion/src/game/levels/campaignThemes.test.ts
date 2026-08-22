import { describe, expect, it } from 'vitest';

import {
  CAMPAIGN_LEVELS_PER_WORLD,
  CAMPAIGN_THEMES,
  CAMPAIGN_WORLD_COUNT,
  campaignThemeOrder,
  themeBlocks,
  themeForCampaignLevel,
} from './campaignThemes';
import { GROUND_KEYS } from './groundTexture';
import type { LevelTheme } from './levelData';

/** Every level of the redesigned campaign, as `[world, level]`. */
function everyLevel(): [number, number][] {
  const out: [number, number][] = [];
  for (let w = 1; w <= CAMPAIGN_WORLD_COUNT; w += 1) {
    for (let l = 1; l <= CAMPAIGN_LEVELS_PER_WORLD; l += 1) out.push([w, l]);
  }
  return out;
}

describe('the mapping as specified', () => {
  /*
   * The boundaries, restated from the decision rather than read back out of
   * the table — the `TANK_ROT_SPEED_MAX` rule. A test that asks the module
   * where its own blocks start cannot tell a correct boundary from a typo, and
   * these four lines are the whole specification.
   */
  it('starts each block where the decision says', () => {
    expect(themeBlocks(1).map((b) => `${b.theme} ${b.from}-${b.to}`)).toEqual([
      'Desert 1-15',
      'Grass 16-30',
      'Beach 31-45',
    ]);
    expect(themeBlocks(2).map((b) => `${b.theme} ${b.from}-${b.to}`)).toEqual([
      'BlueDirt 1-22',
      'Concrete 23-45',
    ]);
    expect(themeBlocks(3).map((b) => `${b.theme} ${b.from}-${b.to}`)).toEqual([
      'Biology 1-22',
      'Hell 23-45',
    ]);
    expect(themeBlocks(4).map((b) => `${b.theme} ${b.from}-${b.to}`)).toEqual([
      'Futuristic 1-22',
      'MagicStone 23-45',
    ]);
  });

  it('names the exact levels either side of every boundary', () => {
    // The off-by-one, driven on both sides. `from` is inclusive, so 15 is the
    // last Desert level and 16 the first Grass one — a table read as exclusive
    // would pass every other test in this file.
    expect(themeForCampaignLevel(1, 15)).toBe('Desert');
    expect(themeForCampaignLevel(1, 16)).toBe('Grass');
    expect(themeForCampaignLevel(1, 30)).toBe('Grass');
    expect(themeForCampaignLevel(1, 31)).toBe('Beach');
    expect(themeForCampaignLevel(2, 22)).toBe('BlueDirt');
    expect(themeForCampaignLevel(2, 23)).toBe('Concrete');
    expect(themeForCampaignLevel(3, 22)).toBe('Biology');
    expect(themeForCampaignLevel(3, 23)).toBe('Hell');
    expect(themeForCampaignLevel(4, 22)).toBe('Futuristic');
    expect(themeForCampaignLevel(4, 23)).toBe('MagicStone');
  });
});

describe('the rules the blocks obey', () => {
  it('keeps all nine themes, each exactly once', () => {
    // The whole point of the reversal: nine kept, not four. Asserted against
    // the art table, so a theme with a ground tile that no world reaches fails
    // here rather than being quietly dropped.
    const used = campaignThemeOrder();
    expect(used).toHaveLength(9);
    expect(new Set(used).size, 'no theme is used twice').toBe(9);
    expect(new Set(used)).toEqual(new Set(Object.keys(GROUND_KEYS) as LevelTheme[]));
    // Every theme with a ground texture is used, and none other — the two
    // sets are the same, which is what "keep all nine" means. `allThemes()`
    // used to be the second reading here; it lived in the theme gallery and
    // went with it (T254), so this reads `GROUND_KEYS` directly.
    expect(used.every((theme) => theme in GROUND_KEYS)).toBe(true);
  });

  it('gives every level of every world exactly one theme', () => {
    for (const [world, level] of everyLevel()) {
      expect(themeForCampaignLevel(world, level), `${world}-${level}`).not.toBeNull();
    }
    expect(everyLevel()).toHaveLength(180);
  });

  it('tiles each world with no gap and no overlap', () => {
    for (let world = 1; world <= CAMPAIGN_WORLD_COUNT; world += 1) {
      const blocks = themeBlocks(world);
      expect(blocks[0].from, `world ${world} starts at 1`).toBe(1);
      expect(blocks[blocks.length - 1].to, `world ${world} ends at 45`).toBe(
        CAMPAIGN_LEVELS_PER_WORLD,
      );
      for (let i = 1; i < blocks.length; i += 1) {
        // Abutting exactly: the next block starts the level after this one ends.
        expect(blocks[i].from, `world ${world} block ${i}`).toBe(blocks[i - 1].to + 1);
      }
      const covered = blocks.reduce((n, b) => n + b.levels, 0);
      expect(covered, `world ${world} covers 45`).toBe(CAMPAIGN_LEVELS_PER_WORLD);
    }
  });

  it('runs each theme as one solid block, never returning to it', () => {
    /*
     * "Solid blocks, do not mix them randomly" is the requirement, and this is
     * what makes it checkable: walk all 180 levels in order and record each
     * theme the moment it changes. A theme that came back — Desert, Grass,
     * Desert — would appear twice in that walk.
     */
    const runs: LevelTheme[] = [];
    for (const [world, level] of everyLevel()) {
      const theme = themeForCampaignLevel(world, level)!;
      if (runs[runs.length - 1] !== theme) runs.push(theme);
    }
    expect(runs).toHaveLength(new Set(runs).size);
    expect(runs).toEqual(campaignThemeOrder());
  });

  it('lists the blocks in ascending order within a world', () => {
    // The loop in `themeForCampaignLevel` takes the *last* matching block, so
    // an unsorted table would answer with whichever came last rather than
    // whichever applies. It reads correctly only because this holds.
    for (let world = 1; world <= CAMPAIGN_WORLD_COUNT; world += 1) {
      const starts = (CAMPAIGN_THEMES[world] ?? []).map((b) => b.from);
      expect(starts, `world ${world}`).toEqual([...starts].sort((a, b) => a - b));
      expect(new Set(starts).size, `world ${world} has no duplicate starts`).toBe(starts.length);
    }
  });
});

describe('out of range', () => {
  it('answers null rather than a fallback theme', () => {
    for (const [world, level] of [
      [0, 1],
      [5, 1],
      [1, 0],
      [1, 46],
      [1, 1.5],
    ] as [number, number][]) {
      expect(themeForCampaignLevel(world, level), `${world}-${level}`).toBeNull();
    }
  });

  it('answers a theme for the levels that do exist', () => {
    // The counterpart. Without it the block above passes for a function that
    // returns null for everything.
    expect(themeForCampaignLevel(1, 1)).toBe('Desert');
    expect(themeForCampaignLevel(4, 45)).toBe('MagicStone');
    expect(themeBlocks(5)).toEqual([]);
  });
});
