/**
 * The 36 achievement icon clips — reconciled against the achievements
 * themselves, and against what the asset sync copied.
 */
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ACHIEVEMENT_CLIPS, ACHIEVEMENT_SHAPE_IDS } from './achievementArt';
import { ACHIEVEMENTS } from './achievementData';
import { achievementFrame, achievementTooltip } from './achievementTooltip';
import { shapeUrls } from '../../assets/registry';

describe('one clip per achievement', () => {
  /**
   * **Both directions.** An icon with no achievement is dead art; an
   * achievement with no icon renders an empty box on the reveal page. Neither
   * shows up as an error — the first is invisible, the second is a gap that
   * reads as a layout bug.
   */
  it('matches ACHIEVEMENTS exactly, in both directions', () => {
    const clipIds = Object.keys(ACHIEVEMENT_CLIPS).sort();
    const specIds = ACHIEVEMENTS.map((a) => a.id).sort();
    expect(clipIds).toEqual(specIds);
    expect(clipIds).toHaveLength(36);
  });

  /** Distinct symbols — a copy-paste pointing two ids at one clip would show
   *  the wrong picture for an achievement and nothing would complain. */
  it('gives every achievement its own symbol', () => {
    const symbols = Object.values(ACHIEVEMENT_CLIPS).map((c) => c.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  /**
   * `Achievement.as:45-59` needs frame 3 and 4 only when the achievement
   * records a difficulty. So a clip's frame count and `difficultyMatters` must
   * agree — checked because a mismatch means one of the two tables is being
   * read wrong, and both would still render *something*.
   *
   * Driven as a pair: the difficulty-bearing clips have more frames than the
   * others, and the assertion states which way round.
   */
  it('has 4 frames when difficulty matters and 2 when it does not', () => {
    for (const spec of ACHIEVEMENTS) {
      const clip = ACHIEVEMENT_CLIPS[spec.id];
      expect(clip.frames.length, `${spec.id}`).toBe(spec.difficultyMatters ? 4 : 2);
    }
    // Not vacuous: both kinds exist.
    const matters = ACHIEVEMENTS.filter((a) => a.difficultyMatters).length;
    expect(matters).toBeGreaterThan(0);
    expect(matters).toBeLessThan(ACHIEVEMENTS.length);
  });

  /** Every frame `achievementFrame` can ask for is in range for its clip. */
  it('never asks for a frame a clip does not have', () => {
    for (const spec of ACHIEVEMENTS) {
      const clip = ACHIEVEMENT_CLIPS[spec.id];
      for (const difficulty of [null, 1, 2, 3]) {
        for (const earned of [false, true]) {
          const frame = achievementFrame({
            earned,
            difficultyMatters: spec.difficultyMatters,
            difficulty,
          });
          expect(frame, `${spec.id} earned=${earned} d=${difficulty}`)
            .toBeLessThanOrEqual(clip.frames.length);
          expect(frame).toBeGreaterThanOrEqual(1);
        }
      }
    }
  });
});

describe('the shapes exist and shipped', () => {
  it('draws only listed shapes, and lists only drawn ones', () => {
    const drawn = [
      ...new Set(Object.values(ACHIEVEMENT_CLIPS).flatMap((c) => c.frames.flat())),
    ].sort((a, b) => a - b);
    expect(drawn).toEqual([...ACHIEVEMENT_SHAPE_IDS]);
  });

  it('has every shape in the extraction and in the synced registry', () => {
    const missing = ACHIEVEMENT_SHAPE_IDS.filter(
      (id) => !existsSync(`../SWFimported/shapes/${id}.svg`),
    );
    expect(missing, 'shape ids with no SVG in SWFimported/shapes').toEqual([]);

    const unsynced = ACHIEVEMENT_SHAPE_IDS.filter((id) => !(`${id}.svg` in shapeUrls));
    expect(unsynced, 'shape ids the asset sync did not curate').toEqual([]);
  });

  it('is 76 shapes, so the sweep is not vacuous', () => {
    expect(ACHIEVEMENT_SHAPE_IDS.length).toBe(76);
  });
});

describe('the tooltip text is the AS3 composition', () => {
  /**
   * `Achievement.as:60-81`. **Every case yields a note** — the first port of
   * this (T99, the board) added one only when earned and wrote it `(Medium)`.
   * All four branches are asserted together, because the bug was that three of
   * them collapsed into "no note".
   */
  it('names the difficulty state in all four cases', () => {
    const base = { title: 'GRAVEYARD', description: 'Kill 100 enemies.' };

    expect(
      achievementTooltip({ ...base, difficultyMatters: false, difficulty: null, earned: false })
        .text,
    ).toBe("GRAVEYARD\nKill 100 enemies.\n\n(Difficulty doesn't matter.)");

    expect(
      achievementTooltip({ ...base, difficultyMatters: true, difficulty: null, earned: false })
        .text,
    ).toBe('GRAVEYARD\nKill 100 enemies.\n\n(Difficulty matters.)');

    expect(
      achievementTooltip({ ...base, difficultyMatters: true, difficulty: 2, earned: true }).text,
    ).toBe('GRAVEYARD\nKill 100 enemies.\n\n(Completed on MEDIUM.)');

    expect(
      achievementTooltip({ ...base, difficultyMatters: true, difficulty: 3, earned: true }).text,
    ).toBe('GRAVEYARD\nKill 100 enemies.\n\n(Completed on HARD.)');
  });

  /**
   * The lengths are what `PartInfoText.as:195-205` slices by, so they must
   * match the string they describe — a composition that agreed on the text and
   * disagreed on the offsets would bold the wrong characters.
   */
  it('reports lengths that partition its own text', () => {
    const tip = achievementTooltip({
      title: 'GRAVEYARD',
      description: 'Kill 100 enemies.',
      difficultyMatters: true,
      difficulty: 1,
      earned: true,
    });
    expect(tip.text.slice(0, tip.titleLength)).toBe('GRAVEYARD');
    expect(tip.text.slice(tip.text.length - tip.noteLength)).toBe('\n\n(Completed on EASY.)');
  });
});
