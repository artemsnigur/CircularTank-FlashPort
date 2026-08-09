/**
 * The level guide's state model — `LevelGuide.as:66-139`.
 */
import { describe, expect, it } from 'vitest';

import {
  canStep,
  isPresetActive,
  levelGuideSelection,
  maxLevelFor,
  maxWorldFor,
  stepLevelGuide,
  upcomingWorldAndLevel,
} from './levelGuide';
import { isLevelUnlocked } from './levelUnlock';
import { LEVELS } from './levelData';
import { createEmptyProgress } from './levelProgress';
import type { ProgressTable } from './levelProgress';

/** A fresh table with nothing cleared. */
const empty = (): ProgressTable => createEmptyProgress();

/** Marks a level cleared on Easy, which is all any of these rules test. */
function clear(progress: ProgressTable, world: number, level: number): ProgressTable {
  progress[world - 1][level - 1] = [1, 0, 0];
  return progress;
}

const W1 = LEVELS[0].length;

describe('the bounds are counts, not predecessor tests', () => {
  /**
   * **The hazard this module exists to prevent, driven on the table that
   * separates the two rules.**
   *
   * `isLevelUnlocked(w, l)` asks whether `l - 1` is cleared — a local test.
   * `maxLevelFor` tallies every cleared level in the world (`:109-116`). On a
   * contiguous table the two agree, which is what makes swapping one for the
   * other look safe.
   *
   * This table is **not** contiguous: 1-5 is cleared and nothing else, which
   * the dev level jump can produce today because it starts any level directly.
   *
   *   count rule       -> maxLevel 2   (one cleared level in the prefix)
   *   predecessor rule -> 1-6 unlocked (its predecessor 1-5 is cleared)
   *
   * So the two disagree by four levels of arrow travel. Both halves are
   * asserted, on the identical table, because "they differ" is the claim.
   */
  it('a non-contiguous clear gives a count bound, not an unlock bound', () => {
    const progress = clear(empty(), 1, 5);

    expect(maxLevelFor(progress, 1), 'the count rule').toBe(2);

    // The counterpart, on the same table: the predecessor rule says something
    // else entirely. If `maxLevelFor` were ever rewritten to call this, the
    // assertion above fails and this one explains why.
    expect(isLevelUnlocked(progress, 1, 6), 'the predecessor rule').toBe(true);
    expect(isLevelUnlocked(progress, 1, 3), 'and it is local, so 1-3 is shut').toBe(false);
  });

  /** And the case where they agree, so the test above is not just noise. */
  it('agrees with the unlock rule on a contiguous table', () => {
    const progress = empty();
    for (let l = 1; l <= 4; l += 1) clear(progress, 1, l);

    expect(maxLevelFor(progress, 1)).toBe(5);
    expect(isLevelUnlocked(progress, 1, 5)).toBe(true);
    expect(isLevelUnlocked(progress, 1, 6)).toBe(false);
  });

  it('starts at 1 on an untouched profile', () => {
    expect(maxLevelFor(empty(), 1)).toBe(1);
    expect(maxWorldFor(empty())).toBe(1);
  });

  /**
   * `:109`'s loop bound is `length - 1`, so the final level is excluded from
   * the tally — a fully cleared world yields exactly its level count, not one
   * more. Off-by-one in either direction changes the last arrow press.
   */
  it('a fully cleared world bounds at its level count, not past it', () => {
    const progress = empty();
    for (let l = 1; l <= W1; l += 1) clear(progress, 1, l);
    expect(maxLevelFor(progress, 1)).toBe(W1);
  });

  /** `setMaxWorld` (`:96-102`) keys on each world's **last** level. */
  it('opens the next world only when the previous world is finished', () => {
    const nearly = empty();
    for (let l = 1; l <= W1 - 1; l += 1) clear(nearly, 1, l);
    expect(maxWorldFor(nearly), 'last level of world 1 still open').toBe(1);

    const finished = clear(nearly, 1, W1);
    expect(maxWorldFor(finished)).toBe(2);
  });
});

describe('the upcoming level', () => {
  const bounds = { maxWorld: 3, maxLevel: 10 };

  it('advances after a win', () => {
    expect(upcomingWorldAndLevel({ world: 1, level: 4, won: true }, bounds)).toEqual({
      world: 1,
      level: 5,
    });
  });

  /**
   * The counterpart, on the identical input but for `won` — `:69` requires it.
   * `ButtonLevelGuideSelect.as:50` states the intent: "If you didn't win the
   * previous level, the level guide assumes you are going to play it again."
   */
  it('stays put after a loss', () => {
    expect(upcomingWorldAndLevel({ world: 1, level: 4, won: false }, bounds)).toEqual({
      world: 1,
      level: 4,
    });
  });

  /** `:76-80` — rolls into the next world at the end of one. */
  it('rolls over into the next world', () => {
    expect(
      upcomingWorldAndLevel({ world: 1, level: W1, won: true }, { maxWorld: 3, maxLevel: 5 }),
    ).toEqual({ world: 2, level: 1 });
  });

  /**
   * `:69`'s other half: at the frontier it does not advance, so the guide never
   * points somewhere the arrows cannot follow. Driven as a pair — one step
   * inside the frontier advances, exactly at it does not.
   */
  it('will not advance past the bounds', () => {
    const atFrontier = { maxWorld: 1, maxLevel: 4 };
    expect(upcomingWorldAndLevel({ world: 1, level: 4, won: true }, atFrontier)).toEqual({
      world: 1,
      level: 4,
    });
    expect(upcomingWorldAndLevel({ world: 1, level: 3, won: true }, atFrontier)).toEqual({
      world: 1,
      level: 4,
    });
  });

  /** `:78` — the last world has nowhere to roll to. */
  it('stops at the end of the last world', () => {
    const last = LEVELS.length;
    expect(
      upcomingWorldAndLevel(
        { world: last, level: LEVELS[last - 1].length, won: true },
        { maxWorld: last, maxLevel: 99 },
      ),
    ).toEqual({ world: last, level: LEVELS[last - 1].length });
  });
});

describe('the three presets', () => {
  const previous = { world: 1, level: 3, won: true };
  const progress = (() => {
    const p = empty();
    for (let l = 1; l <= 5; l += 1) clear(p, 1, l);
    return p;
  })();

  /**
   * All three on the same table, because each is only meaningful against the
   * others: "Previous" and "Upcoming" differ by one level here, and "Last"
   * by the frontier.
   */
  it('picks three different levels from one state', () => {
    expect(levelGuideSelection('Previous', progress, previous)).toMatchObject({
      selectedWorld: 1,
      selectedLevel: 3,
    });
    expect(levelGuideSelection('Upcoming', progress, previous)).toMatchObject({
      selectedWorld: 1,
      selectedLevel: 4,
    });
    expect(levelGuideSelection('Last', progress, previous)).toMatchObject({
      selectedWorld: 1,
      selectedLevel: 6,
    });
  });

  /**
   * `:122` calls `setMaxLevel(maxWorld)` — the **furthest** world, not the
   * selected one. Pinned because it looks like a bug and is not: the arrow
   * handler calls it with `selectedWorld` instead (`:206`), and the two callers
   * genuinely disagree.
   */
  it('bounds the level against maxWorld, not against the selection', () => {
    const p = empty();
    for (let l = 1; l <= W1; l += 1) clear(p, 1, l); // world 1 finished
    clear(p, 2, 1);
    clear(p, 2, 2); // two levels into world 2

    const state = levelGuideSelection('Last', p, { world: 2, level: 2, won: true });
    expect(state.maxWorld).toBe(2);
    // The bound describes world 2 (the max), giving 3 — not world 1's 45.
    expect(state.maxLevel).toBe(3);
  });

  /**
   * Two presets can be lit at once — the AS3 asks each button about itself
   * (`:88`, `:99`, `:111`) rather than picking a winner. On a fresh profile all
   * three point at 1-1.
   */
  it('lights every preset that matches, not just the first', () => {
    const fresh = empty();
    const start = { world: 1, level: 1, won: false };
    const state = levelGuideSelection('Upcoming', fresh, start);

    for (const type of ['Previous', 'Upcoming', 'Last'] as const) {
      expect(isPresetActive(state, start, type), type).toBe(true);
    }

    // The counterpart: once the arrows move away, none of them is lit.
    const moved = { ...state, selectedLevel: 1, selectedWorld: 1, maxLevel: 9 };
    const away = stepLevelGuide(moved, fresh, 'Level', 'Right');
    expect(away.selectedLevel).toBe(2);
    expect(isPresetActive(away, start, 'Previous')).toBe(false);
    expect(isPresetActive(away, start, 'Upcoming')).toBe(false);
    expect(isPresetActive(away, start, 'Last')).toBe(false);
  });
});

describe('the arrows', () => {
  const progress = (() => {
    const p = empty();
    for (let l = 1; l <= W1; l += 1) clear(p, 1, l);
    for (let l = 1; l <= 4; l += 1) clear(p, 2, l);
    return p;
  })();
  const base = { selectedWorld: 1, selectedLevel: 1, maxWorld: 2, maxLevel: W1 };

  it('steps the level within its bound and stops at it', () => {
    expect(stepLevelGuide(base, progress, 'Level', 'Right').selectedLevel).toBe(2);
    expect(stepLevelGuide(base, progress, 'Level', 'Left').selectedLevel, 'floor').toBe(1);

    const atTop = { ...base, selectedLevel: W1 };
    expect(stepLevelGuide(atTop, progress, 'Level', 'Right').selectedLevel).toBe(W1);
  });

  /**
   * `:205-206` — a world step resets the level to 1 **and** recomputes the
   * level bound against the world just moved to. Both halves asserted: a step
   * that moved the world without re-bounding would leave world 2's arrows
   * travelling over world 1's range.
   */
  it('resets the level and re-bounds it when the world changes', () => {
    const moved = stepLevelGuide({ ...base, selectedLevel: 30 }, progress, 'World', 'Right');
    expect(moved.selectedWorld).toBe(2);
    expect(moved.selectedLevel, 'reset to 1').toBe(1);
    expect(moved.maxLevel, "world 2's bound, not world 1's").toBe(5);
    expect(moved.maxLevel).not.toBe(W1);
  });

  it('refuses to step past a bound rather than clamping silently', () => {
    const atMaxWorld = { ...base, selectedWorld: 2 };
    expect(stepLevelGuide(atMaxWorld, progress, 'World', 'Right')).toBe(atMaxWorld);
  });

  /** `updateState` (`:74-112`) — the four enable tests, each against its pair. */
  it('enables an arrow exactly when the step would move', () => {
    expect(canStep(base, 'World', 'Right')).toBe(true);
    expect(canStep(base, 'World', 'Left')).toBe(false);
    expect(canStep(base, 'Level', 'Right')).toBe(true);
    expect(canStep(base, 'Level', 'Left')).toBe(false);

    const far = { ...base, selectedWorld: 2, selectedLevel: W1 };
    expect(canStep(far, 'World', 'Right')).toBe(false);
    expect(canStep(far, 'World', 'Left')).toBe(true);
    expect(canStep(far, 'Level', 'Right')).toBe(false);
    expect(canStep(far, 'Level', 'Left')).toBe(true);
  });
});

describe('nothing here writes progress', () => {
  /**
   * The module's central claim, checked rather than asserted in prose: every
   * entry point is handed the table and must leave it untouched. A rule that
   * "helpfully" marked a level cleared would be a progression bug reachable
   * from a shop widget.
   */
  it('leaves the table it is given unchanged', () => {
    const progress = clear(empty(), 1, 5);
    const before = JSON.stringify(progress);
    const previous = { world: 1, level: 5, won: true };

    maxWorldFor(progress);
    maxLevelFor(progress, 1);
    upcomingWorldAndLevel(previous, { maxWorld: 2, maxLevel: 4 });
    const state = levelGuideSelection('Upcoming', progress, previous);
    stepLevelGuide(state, progress, 'World', 'Right');
    stepLevelGuide(state, progress, 'Level', 'Right');
    isPresetActive(state, previous, 'Last');

    expect(JSON.stringify(progress)).toBe(before);
  });
});
