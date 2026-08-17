/**
 * What level select opens on.
 *
 * Both rules shipped wrong and neither was visible to the suite: the scene
 * needs a live Phaser game to construct, so the only thing a test could reach
 * was its source text. Extracting them is what makes the AS3's condition
 * checkable instead of merely written down.
 *
 * Every expected value here comes from the **AS3 line**, not from the module.
 */
import { describe, expect, it } from 'vitest';

import { entryWorld, guideLevelFor, PICKER } from './levelSelectEntry';
import { createEmptyProgress, recordLevelResult } from './levelProgress';
import type { ProgressTable } from './levelProgress';

/** A profile that has cleared every level of worlds 1..n on Easy. */
function clearedThrough(worlds: number): ProgressTable {
  let progress = createEmptyProgress();
  for (let world = 1; world <= worlds; world += 1) {
    for (let level = 1; level <= 45; level += 1) {
      progress = recordLevelResult(progress, world, level, 'Easy', 1);
    }
  }
  return progress;
}

describe('which world opens — ScreenLevelSelect.as:383', () => {
  /**
   * **The correction, and the whole point of this file.**
   *
   * `:41` declares `selectedWorld = 1` and `:383` re-points it at
   * `LevelGuide.selectedWorld` on entry, so `:431`'s
   * `if (selectedWorld != 0) changeToLevelsFunction()` always takes the levels
   * branch. The port opened the world picker on every visit instead.
   */
  it('never opens the picker', () => {
    const fresh = createEmptyProgress();
    expect(entryWorld(fresh, 1)).not.toBe(PICKER);
    expect(entryWorld(clearedThrough(3), 4)).not.toBe(PICKER);
    // Even from a guide value that cannot be honoured.
    expect(entryWorld(fresh, 9)).not.toBe(PICKER);
    expect(entryWorld(fresh, 0)).not.toBe(PICKER);
  });

  it('opens the level guide`s world', () => {
    const progress = clearedThrough(3);
    // Worlds 1-4 are open; the guide decides which of them, not the frontier.
    expect(entryWorld(progress, 2)).toBe(2);
    expect(entryWorld(progress, 4)).toBe(4);
  });

  /**
   * The counterpart to the line above. A function that returned the frontier
   * regardless would pass `entryWorld(progress, 4) === 4` on this table,
   * because 4 *is* the frontier — so the guide has to be shown steering it
   * somewhere the frontier is not.
   */
  it('follows the guide rather than the furthest world reached', () => {
    const progress = clearedThrough(3);
    expect(entryWorld(progress, 1)).toBe(1);
    expect(entryWorld(progress, 1)).not.toBe(entryWorld(progress, 4));
  });

  it('falls back to the furthest open world when the guide points past it', () => {
    // The guide derives from progress and should never do this; the clamp is
    // there because the alternative failure is a grid the player cannot play.
    expect(entryWorld(createEmptyProgress(), 5)).toBe(1);
    expect(entryWorld(clearedThrough(2), 9)).toBe(3);
  });

  it('never returns 0 for a nonsense guide value', () => {
    // `PICKER` leaking out of here would reinstate the bug for whoever hit it.
    for (const bad of [0, -1, Number.NaN]) {
      expect(entryWorld(clearedThrough(1), bad), String(bad)).toBe(2);
    }
  });
});

describe('which level it points at — selectFromLevelGuide, :583-595', () => {
  const rows = [
    { level: 1, unlocked: true },
    { level: 2, unlocked: true },
    { level: 3, unlocked: true },
    { level: 4, unlocked: false },
  ];

  it('takes the guide`s level when it is in this world and open', () => {
    expect(guideLevelFor(1, { selectedWorld: 1, selectedLevel: 2 }, rows)).toBe(2);
  });

  /**
   * `:587` tests **both** conditions before assigning. Each is driven on its
   * own, because a check that only honoured one would pass a test that varied
   * the other.
   */
  it('declines when the guide is in another world', () => {
    expect(guideLevelFor(1, { selectedWorld: 2, selectedLevel: 2 }, rows)).toBeUndefined();
  });

  it('declines when the guide`s level is locked', () => {
    expect(guideLevelFor(1, { selectedWorld: 1, selectedLevel: 4 }, rows)).toBeUndefined();
  });

  it('declines when the guide names a level this world does not have', () => {
    expect(guideLevelFor(1, { selectedWorld: 1, selectedLevel: 46 }, rows)).toBeUndefined();
  });

  /**
   * `undefined` is the AS3's own outcome, not a missing value: when either
   * condition fails it leaves `selectedLevel` alone. The screen reads that as
   * "fall back to the frontier", which is the behaviour it had before.
   */
  it('is undefined rather than a guess', () => {
    const declined = guideLevelFor(1, { selectedWorld: 2, selectedLevel: 1 }, rows);
    expect(declined).toBeUndefined();
    // And not 0, which a caller doing `?? frontier` would treat as a level.
    expect(declined).not.toBe(0);
  });
});
