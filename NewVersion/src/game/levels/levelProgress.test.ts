import { describe, expect, it } from 'vitest';
import { AS3_LEVELS, getLevel, LEVELS, levelsInWorld, WORLD_COUNT } from './levelData';
import {
  createEmptyProgress,
  DIFFICULTY_RANK,
  DIFFICULTY_SLOT,
  getAchievementTiers,
  getCurrentWorldAndLevel,
  getLevelValues,
  getTotalValues,
  isLevelCleared,
  nextLevelAfter,
  recordLevelResult,
  TOTALS_TYPE_TO_MODE,
} from './levelProgress';
import type { ProgressTable } from './levelProgress';
import { evaluate } from '../achievements/achievementState';
import { getAchievement } from '../achievements/achievementState';

describe('level data', () => {
  it('has 4 worlds of 45 levels', () => {
    // The redesigned campaign (T252). The AS3's own nine are still here as
    // `AS3_LEVELS` and are checked separately, in `roomSizeSource.test.ts`.
    expect(WORLD_COUNT).toBe(4);
    for (let w = 1; w <= WORLD_COUNT; w += 1) expect(levelsInWorld(w)).toBe(45);
    expect(AS3_LEVELS, 'the record is untouched').toHaveLength(9);
  });

  it('gives every level a unique PRNG seed', () => {
    const seeds = LEVELS.flat().map((l) => l.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });

  it('preserves known rows from ScreenGame.as, level data and enemy model', () => {
    /*
     * Reads the **source row**, not `getLevel`. Since T250 the accessor also
     * applies `campaignTuning` (`D-3`), so asserting the AS3's 10 enemies and
     * 45.53-frame interval through it would fail — and "fix" it by writing our
     * own tuned numbers here, which is the one thing this test must not do.
     * `campaignTuning.test.ts` pins what the accessor adds.
     */
    expect(AS3_LEVELS[0][0]).toEqual({
      // The extracted 640x400. This used to read `getLevel` and assert the
      // 800x600 that `levelSizeOverrides` substitutes; now that the accessor
      // also tunes counts and intervals (`D-3`), the whole row is asserted at
      // the source instead — which is what the test's name claims and is
      // strictly the stronger check. Both divergences have their own tests:
      // `levelSizeOverrides` for the room, `campaignTuning` for the rest.
      roomWidth: 640,
      roomHeight: 400,
      mode: 'Normal',
      // levelDataModel column 7. Named `tier` until T83, when both AS3 reads
      // turned out to call it `selectedUpgradeLimit` (`ScreenGame.as:365`,
      // `ScreenLevelSelect.as:1203`) and nothing anywhere calls it a tier.
      upgradeLimit: 1,
      theme: 'Desert',
      seed: 610309764,
      // enemyModelW1[0] is [10, 45.53, "Basic1", 10]. Column 1 is the base
      // spawn interval in frames — ScreenGame.as:473 assigns it to
      // reloadTimeEnemyMax via the `enemyModelCurrent` working copy.
      totalEnemies: 10,
      spawnInterval: 45.53,
      enemies: [{ type: 'Basic', level: '1', count: 10 }],
      // flagModelW1[0] is [0, 0] — world 1 level 1 is a Normal level.
      flagCount: 0,
      flagMoney: 0,
    });
  });

  it('gives every level a non-empty enemy composition', () => {
    for (const [w, world] of LEVELS.entries()) {
      for (const [l, level] of world.entries()) {
        expect(level.enemies.length, `world ${w + 1} level ${l + 1}`).toBeGreaterThan(0);
        expect(level.totalEnemies).toBeGreaterThan(0);
      }
    }
  });

  it('gives every level a positive spawn interval', () => {
    for (const [w, world] of LEVELS.entries()) {
      for (const [l, level] of world.entries()) {
        expect(level.spawnInterval, `world ${w + 1} level ${l + 1}`).toBeGreaterThan(0);
      }
    }
  });

  it('uses one room size per mode', () => {
    /*
     * The AS3 mixes three sizes across its Normal levels with no rule behind
     * it. The campaign gives each mode one size — see `ROOMS` in
     * `scripts/lib/campaign-design.mjs`, which folded in the port's own
     * settled divergences (Tower 800x800, Defense 712x960).
     *
     * Asserted as "one size per mode" rather than as a list of sizes, because
     * the property that matters is the consistency, not the numbers.
     */
    const byMode = new Map<string, Set<string>>();
    for (const level of LEVELS.flat()) {
      const sizes = byMode.get(level.mode) ?? new Set<string>();
      sizes.add(`${level.roomWidth}x${level.roomHeight}`);
      byMode.set(level.mode, sizes);
    }

    for (const [mode, sizes] of byMode) {
      // Boss is the exception, and a deliberate one: a level fielding five or
      // more bosses gets the larger of the two Boss rooms.
      expect(sizes.size, `${mode}: ${[...sizes].join(', ')}`).toBeLessThanOrEqual(
        mode === 'Boss' ? 2 : 1,
      );
    }
    expect(byMode.size, 'every mode is represented').toBe(5);
  });

  it('moves through themes in solid blocks within a world', () => {
    /*
     * `D-4`, reversed after the `#themes` gallery: all nine themes are kept and
     * a world crosses two or three of them, so "one theme per world" — true of
     * every one of the AS3's 405 rows — is deliberately no longer true.
     *
     * What must hold is that a theme never returns: `campaignThemes.test.ts`
     * proves it of the mapping, and this proves it of the data.
     */
    for (const world of LEVELS) {
      const runs: string[] = [];
      for (const level of world) {
        if (runs[runs.length - 1] !== level.theme) runs.push(level.theme);
      }
      expect(runs.length, 'no theme returns').toBe(new Set(runs).size);
      expect(runs.length).toBeGreaterThan(1);
    }

    // All nine across the campaign, each in exactly one world's run.
    const themes = LEVELS.flat().map((l) => l.theme);
    expect(new Set(themes).size).toBe(9);
  });
});

describe('createEmptyProgress', () => {
  it('matches the level tables in shape and is all zero', () => {
    const progress = createEmptyProgress();
    expect(progress).toHaveLength(WORLD_COUNT);
    for (let w = 0; w < WORLD_COUNT; w += 1) {
      expect(progress[w]).toHaveLength(45);
      for (const values of progress[w]) expect(values).toEqual([0, 0, 0]);
    }
  });
});

describe('getLevelValues — the difficulty cascade', () => {
  // Slot order is [hard, medium, easy]; this is the detail most likely to be
  // implemented backwards.
  const withValues = (hard: number, medium: number, easy: number): ProgressTable => {
    const progress = createEmptyProgress();
    progress[0][0] = [hard, medium, easy];
    return progress;
  };

  it('shows a Hard clear at every difficulty', () => {
    const progress = withValues(3, 0, 0);
    expect(getLevelValues(progress, 1, 1, 'Hard')).toBe(3);
    expect(getLevelValues(progress, 1, 1, 'Medium')).toBe(3);
    expect(getLevelValues(progress, 1, 1, 'Easy')).toBe(3);
  });

  it('does not show a Medium clear on Hard', () => {
    const progress = withValues(0, 3, 0);
    expect(getLevelValues(progress, 1, 1, 'Hard')).toBe(0);
    expect(getLevelValues(progress, 1, 1, 'Medium')).toBe(3);
    expect(getLevelValues(progress, 1, 1, 'Easy')).toBe(3);
  });

  it('shows an Easy clear only on Easy', () => {
    const progress = withValues(0, 0, 3);
    expect(getLevelValues(progress, 1, 1, 'Hard')).toBe(0);
    expect(getLevelValues(progress, 1, 1, 'Medium')).toBe(0);
    expect(getLevelValues(progress, 1, 1, 'Easy')).toBe(3);
  });

  it('takes the best of the visible slots, not the most recent', () => {
    const progress = withValues(1, 3, 2);
    expect(getLevelValues(progress, 1, 1, 'Hard')).toBe(1);
    expect(getLevelValues(progress, 1, 1, 'Medium')).toBe(3);
    expect(getLevelValues(progress, 1, 1, 'Easy')).toBe(3);
  });

  it('returns 0 rather than throwing on an out-of-range lookup', () => {
    const progress = createEmptyProgress();
    expect(getLevelValues(progress, 99, 1, 'Easy')).toBe(0);
    expect(getLevelValues(progress, 1, 999, 'Easy')).toBe(0);
    expect(getLevelValues(progress, 0, 0, 'Easy')).toBe(0);
  });

  it('ranks difficulties the way the AS3 comparisons imply', () => {
    expect(DIFFICULTY_RANK).toEqual({ Easy: 1, Medium: 2, Hard: 3 });
    expect(DIFFICULTY_SLOT).toEqual({ Hard: 0, Medium: 1, Easy: 2 });
  });
});

describe('getCurrentWorldAndLevel', () => {
  it('is the first level on a fresh profile', () => {
    expect(getCurrentWorldAndLevel(createEmptyProgress())).toEqual([1, 1]);
  });

  it('finds the first untouched level', () => {
    const progress = createEmptyProgress();
    progress[0][0] = [0, 0, 3];
    progress[0][1] = [0, 0, 1];
    expect(getCurrentWorldAndLevel(progress)).toEqual([1, 3]);
  });

  it('rolls into the next world', () => {
    const progress = createEmptyProgress();
    for (let l = 0; l < 45; l += 1) progress[0][l] = [0, 0, 1];
    expect(getCurrentWorldAndLevel(progress)).toEqual([2, 1]);
  });

  it('counts a clear on any difficulty as played', () => {
    const progress = createEmptyProgress();
    progress[0][0] = [1, 0, 0];
    expect(getCurrentWorldAndLevel(progress)).toEqual([1, 2]);
  });

  it('respects the unlocked-world limit', () => {
    const progress = createEmptyProgress();
    for (let l = 0; l < 45; l += 1) progress[0][l] = [0, 0, 1];
    // Only world 1 unlocked and fully played: nothing left to point at.
    expect(getCurrentWorldAndLevel(progress, 1)).toEqual([0, 0]);
  });

  it('returns [0, 0] when everything is played', () => {
    const progress = createEmptyProgress().map((w) =>
      w.map(() => [3, 3, 3] as [number, number, number]),
    );
    expect(getCurrentWorldAndLevel(progress)).toEqual([0, 0]);
  });
});

describe('getTotalValues', () => {
  it('is zero on a fresh profile', () => {
    const progress = createEmptyProgress();
    for (const type of Object.keys(TOTALS_TYPE_TO_MODE)) {
      expect(getTotalValues(progress, type, 'Easy')).toBe(0);
    }
  });

  it('counts only levels of the matching mode', () => {
    const progress = createEmptyProgress();
    // Award 3 medals on every level, on Hard.
    for (let w = 0; w < WORLD_COUNT; w += 1) {
      for (let l = 0; l < 45; l += 1) progress[w][l] = [3, 0, 0];
    }

    const normalCount = LEVELS.flat().filter((l) => l.mode === 'Normal').length;
    expect(getTotalValues(progress, 'Stars', 'Hard')).toBe(normalCount * 3);

    const bossCount = LEVELS.flat().filter((l) => l.mode === 'Boss').length;
    expect(getTotalValues(progress, 'Bosses', 'Hard')).toBe(bossCount * 3);
  });

  it('applies the same difficulty cascade as getLevelValues', () => {
    const progress = createEmptyProgress();
    const firstNormal = LEVELS[0].findIndex((l) => l.mode === 'Normal');
    progress[0][firstNormal] = [0, 2, 0];

    expect(getTotalValues(progress, 'Stars', 'Hard')).toBe(0);
    expect(getTotalValues(progress, 'Stars', 'Medium')).toBe(2);
    expect(getTotalValues(progress, 'Stars', 'Easy')).toBe(2);
  });

  it('partitions every level across exactly one totals type', () => {
    const progress = createEmptyProgress();
    for (let w = 0; w < WORLD_COUNT; w += 1) {
      for (let l = 0; l < 45; l += 1) progress[w][l] = [1, 0, 0];
    }
    const sum = Object.keys(TOTALS_TYPE_TO_MODE).reduce(
      (n, type) => n + getTotalValues(progress, type, 'Hard'),
      0,
    );
    // Every level counts once and only once, so the sum is the campaign.
    expect(sum).toBe(LEVELS.flat().length);
    expect(sum).toBe(180);
  });
});

describe('getAchievementTiers feeding the NumberArray achievements', () => {
  it('orders the triple [hard, medium, easy], as ScreenAchievements builds it', () => {
    const progress = createEmptyProgress();
    const firstNormal = LEVELS[0].findIndex((l) => l.mode === 'Normal');
    progress[0][firstNormal] = [1, 2, 3];

    // Hard sees 1; Medium sees max(1,2)=2; Easy sees max(1,2,3)=3.
    expect(getAchievementTiers(progress, 'Stars')).toEqual([1, 2, 3]);
  });

  it('drives a real achievement end to end', () => {
    const stars1 = getAchievement('Stars1');
    if (!stars1) throw new Error('Stars1 missing');

    const progress = createEmptyProgress();
    for (let w = 0; w < WORLD_COUNT; w += 1) {
      for (let l = 0; l < 45; l += 1) {
        if (getLevel(w + 1, l + 1)?.mode === 'Normal') progress[w][l] = [3, 0, 0];
      }
    }

    const tiers = getAchievementTiers(progress, 'Stars');
    expect(tiers[0]).toBeGreaterThanOrEqual(stars1.requirement);

    // Cleared on Hard, so the achievement should award state 3 regardless of
    // the difficulty currently selected.
    expect(evaluate(stars1, tiers, -1, 'Easy')).toEqual({ won: true, newState: 3 });
  });

  it('awards only the Easy tier when levels were cleared on Easy', () => {
    const stars1 = getAchievement('Stars1');
    if (!stars1) throw new Error('Stars1 missing');

    const progress = createEmptyProgress();
    for (let w = 0; w < WORLD_COUNT; w += 1) {
      for (let l = 0; l < 45; l += 1) {
        if (getLevel(w + 1, l + 1)?.mode === 'Normal') progress[w][l] = [0, 0, 3];
      }
    }

    const tiers = getAchievementTiers(progress, 'Stars');
    expect(tiers[0]).toBe(0);
    expect(evaluate(stars1, tiers, -1, 'Hard').newState).toBe(1);
  });
});

describe('recordLevelResult', () => {
  it('writes to the slot for the difficulty played', () => {
    const next = recordLevelResult(createEmptyProgress(), 1, 1, 'Medium', 2);
    expect(next[0][0]).toEqual([0, 2, 0]);
  });

  it('never downgrades an existing result', () => {
    const first = recordLevelResult(createEmptyProgress(), 1, 1, 'Easy', 3);
    const second = recordLevelResult(first, 1, 1, 'Easy', 1);
    expect(second[0][0]).toEqual([0, 0, 3]);
  });

  it('does not mutate the table it was given', () => {
    const progress = createEmptyProgress();
    recordLevelResult(progress, 1, 1, 'Hard', 3);
    expect(progress[0][0]).toEqual([0, 0, 0]);
  });

  it('clamps to the 0-3 medal range', () => {
    const high = recordLevelResult(createEmptyProgress(), 1, 1, 'Hard', 99);
    expect(high[0][0][0]).toBe(3);

    const negative = recordLevelResult(createEmptyProgress(), 1, 1, 'Hard', -5);
    expect(negative[0][0][0]).toBe(0);
  });

  it('ignores an out-of-range level', () => {
    const progress = createEmptyProgress();
    expect(recordLevelResult(progress, 99, 1, 'Hard', 3)).toBe(progress);
  });
});

describe('isLevelCleared', () => {
  it('is false on a fresh profile and true after any clear', () => {
    const progress = createEmptyProgress();
    expect(isLevelCleared(progress, 1, 1)).toBe(false);

    const played = recordLevelResult(progress, 1, 1, 'Easy', 1);
    expect(isLevelCleared(played, 1, 1)).toBe(true);
  });

  it('is false for an out-of-range level', () => {
    expect(isLevelCleared(createEmptyProgress(), 99, 99)).toBe(false);
  });
});


describe('nextLevelAfter', () => {
  it('advances within a world', () => {
    expect(nextLevelAfter(1, 1)).toEqual({ world: 1, level: 2 });
    expect(nextLevelAfter(3, 20)).toEqual({ world: 3, level: 21 });
  });

  it('rolls over into the next world at the last level', () => {
    // The bug this function replaced: the old inline check was
    // `getLevel(world, level + 1) !== undefined`, so 1-45 reported no
    // successor and the run dead-ended at all 8 world boundaries.
    expect(levelsInWorld(1)).toBe(45);
    expect(nextLevelAfter(1, 45)).toEqual({ world: 2, level: 1 });
    expect(nextLevelAfter(WORLD_COUNT - 1, 45)).toEqual({ world: WORLD_COUNT, level: 1 });
    // ...and the end of the campaign offers nothing, which is the other half
    // of the same branch.
    expect(nextLevelAfter(WORLD_COUNT, 45)).toBeNull();
  });

  it('returns null after the very last level of the last world', () => {
    expect(nextLevelAfter(WORLD_COUNT, levelsInWorld(WORLD_COUNT))).toBeNull();
  });

  it('returns null for the dev sentinel world, not level 1-1', () => {
    // devLevels.ts uses world 0, and its isolation depends on no onward level
    // being offered. `levelsInWorld(0)` is 0, so without the explicit guard the
    // rollover branch would hand back the first real level and drag a sandbox
    // run into the campaign.
    expect(nextLevelAfter(0, 1)).toBeNull();
    expect(nextLevelAfter(0, 7)).toBeNull();
  });

  it('returns null for a world beyond the table', () => {
    expect(nextLevelAfter(WORLD_COUNT + 1, 1)).toBeNull();
  });

  it('never names a level that does not exist', () => {
    // The property that matters: whatever it returns must be loadable.
    for (let w = 1; w <= WORLD_COUNT; w += 1) {
      for (let l = 1; l <= levelsInWorld(w); l += 1) {
        const next = nextLevelAfter(w, l);
        if (next) expect(getLevel(next.world, next.level), `${w}-${l}`).toBeDefined();
      }
    }
  });
});
