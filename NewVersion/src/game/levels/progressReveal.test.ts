import { describe, expect, it } from 'vitest';

import {
  REVEAL_STEP_FRAMES,
  REVEAL_STEP_MS,
  pendingReveals,
  revealComplete,
  stepReveal,
} from './progressReveal';
import { cloneProgress, createEmptyProgress, recordLevelResult } from './levelProgress';
import { levelUnlockStates, mayStartLevel } from './levelUnlock';
import { PlayerProfile } from '../player/playerProfile';
import { SaveStore } from '../save/SaveStore';
import { MemoryBackend } from '../save/SaveStore';

const storeName = 'CircularTankSaveRevealTest';

describe('the two tables, as a pair', () => {
  /**
   * **The counterpart pair the whole model rests on.** Asserted on one profile
   * in one test, because "earned has it" and "visible does not" are each
   * trivially satisfiable alone — a port with one table passes the first, and a
   * port that never records passes the second.
   */
  it('differ by exactly the result just recorded, then agree once revealed', () => {
    const profile = new PlayerProfile(new SaveStore(storeName, new MemoryBackend()));

    profile.recordLevel(1, 1, 'Easy', 3, true);

    // Post-record: earned has the medals, visible does not — `:356` -> `:357`.
    expect(profile.progress[0][0]).toEqual([0, 0, 3]);
    expect(profile.visibleProgress[0][0]).toEqual([0, 0, 0]);

    // Post-reveal: they agree.
    profile.syncVisibleProgress();
    expect(profile.visibleProgress[0][0]).toEqual([0, 0, 3]);
    expect(revealComplete(profile.progress, profile.visibleProgress)).toBe(true);
  });

  it('does not share rows between the tables', () => {
    // A shallow copy would leave both names pointing at one row, so recording
    // would move the "lagging" table too and the reveal would always be
    // complete. That is the entire mechanism defeated by a spread, and it would
    // pass any test that only reads one table.
    const profile = new PlayerProfile(new SaveStore(storeName, new MemoryBackend()));
    profile.recordLevel(1, 1, 'Easy', 2, true);
    expect(profile.progress[0][0]).not.toBe(profile.visibleProgress[0][0]);
  });

  it('re-snapshots rather than animating a backlog', () => {
    // `:356` clones before every result, so a reveal that never ran is
    // discarded rather than queued up. Two wins without a reveal leave exactly
    // one level pending, not two.
    const profile = new PlayerProfile(new SaveStore(storeName, new MemoryBackend()));
    profile.recordLevel(1, 1, 'Easy', 1, true);
    profile.recordLevel(1, 2, 'Easy', 1, true);

    const pending = pendingReveals(profile.progress, profile.visibleProgress);
    expect(pending).toHaveLength(1);
    expect(pending[0]).toMatchObject({ world: 1, level: 2 });
  });
});

describe('the unlock rule sees one table and the display sees the other', () => {
  /**
   * **The counterpart pair on the rule.** The identical earned table is passed
   * as the gate view and a lagging one as the display view; they must differ
   * *only* on the level just cleared and agree everywhere else.
   */
  it('lags only the level just cleared, and gates on none of it', () => {
    const earned = recordLevelResult(createEmptyProgress(), 1, 1, 'Easy', 3);
    const visible = createEmptyProgress();

    const rows = levelUnlockStates(earned, 1, 'Easy', visible);

    // The lag: level 1's medals have not arrived yet.
    expect(rows[0].value).toBe(0);
    // The gate is not lagging: level 1 reads cleared and level 2 is open.
    expect(rows[0].cleared).toBe(true);
    expect(rows[1].unlocked).toBe(true);

    // Everywhere else the two views agree, so the difference above is the
    // recorded result and not a wholesale disagreement.
    const settled = levelUnlockStates(earned, 1, 'Easy', earned);
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i], `level ${i + 1}`).toEqual(settled[i]);
    }
    expect(rows[0]).not.toEqual(settled[0]);
  });

  /**
   * The regression from T75, restated against the *visible* table now that one
   * exists. This is the assertion that would have caught the progression break.
   */
  it('opens the next level even when the reveal never runs', () => {
    const earned = recordLevelResult(createEmptyProgress(), 1, 1, 'Easy', 1);
    const neverRevealed = createEmptyProgress();

    // Gates read earned, so the level is playable regardless of the reveal.
    expect(mayStartLevel(earned, { world: 1, level: 2 })).toBe(true);
    // And the display still shows nothing, which is the point of the lag.
    expect(levelUnlockStates(earned, 1, 'Easy', neverRevealed)[0].value).toBe(0);
  });
});

describe('stepping the reveal', () => {
  it('adds one medal per step, in table order', () => {
    const earned = recordLevelResult(createEmptyProgress(), 1, 1, 'Easy', 3);
    let visible = createEmptyProgress();

    const seen: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      const step = stepReveal(earned, visible);
      if (!step.moved) break;
      visible = step.visible;
      seen.push(visible[0][0][2]);
    }

    expect(seen).toEqual([1, 2, 3]);
    expect(revealComplete(earned, visible)).toBe(true);
  });

  /**
   * **The counterpart pair on `Unlock`.** The latch fires on the step a level
   * goes from nothing to something, and **not** on the steps that only raise
   * the count — so a port that flashed on every medal, or never, fails.
   */
  it('flags the unlock only on the step the latch opens', () => {
    const earned = recordLevelResult(createEmptyProgress(), 1, 1, 'Easy', 3);
    let visible = createEmptyProgress();

    const flags: boolean[] = [];
    for (let i = 0; i < 3; i += 1) {
      const step = stepReveal(earned, visible);
      visible = step.visible;
      flags.push(step.unlocked);
    }

    expect(flags).toEqual([true, false, false]);
  });

  it('does nothing when the tables already agree', () => {
    const earned = recordLevelResult(createEmptyProgress(), 1, 1, 'Easy', 2);
    const step = stepReveal(earned, cloneProgress(earned));
    expect(step.moved).toBeNull();
    expect(step.unlocked).toBe(false);
  });
});

describe('the pace', () => {
  it('is seven AS3 frames per medal, not one', () => {
    // `:1378` places an icon at progressTimer 1, 8, 15 — a stride of 7,
    // corroborated by `progressTimerMax = iconsToAdd * 7 - 7` at `:1371`.
    // Reading `:532`'s `progressTimerOn = true` as the pace gives 33ms and no
    // visible animation at all.
    expect(REVEAL_STEP_FRAMES).toBe(7);
    expect(REVEAL_STEP_MS).toBeCloseTo((7 / 30) * 1000, 6);
  });
});
