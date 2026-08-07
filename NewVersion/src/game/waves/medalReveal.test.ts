import { describe, expect, it } from 'vitest';

import {
  MEDAL_CUES,
  MEDAL_STAMP_FRAMES,
  MEDAL_STAMP_MS,
  medalCuesBetween,
  medalRevealDurationMs,
  medalsShownAt,
} from './medalReveal';
import { COUNTDOWN_FRAMES, COUNTDOWN_MS } from './countdown';

/**
 * Expected times computed by hand from the AS3 frame numbers, not read back out
 * of the module.
 *
 * `ScreenStatus.as:1147`, `:1153`, `:1159` stamp at `countTime` 10, 20 and 30 at
 * the AS3's 30 fps, so `frames / 30 * 1000`:
 *
 *     10 -> 333.33   20 -> 666.67   30 -> 1000
 */
const STAMP_MS = [1000 / 3, 2000 / 3, 1000];

describe('the stamp times come from the AS3 frames', () => {
  it('states the frames and derives the milliseconds', () => {
    expect([...MEDAL_STAMP_FRAMES]).toEqual([10, 20, 30]);
    MEDAL_STAMP_MS.forEach((ms, i) => expect(ms).toBeCloseTo(STAMP_MS[i], 6));
  });

  /**
   * **The cross-check the task asked for.** The same AS3-frames-to-milliseconds
   * conversion is now applied in two independent modules — `countdown.ts` (60
   * frames -> 2000 ms) and here (10/20/30 -> 333/667/1000). Deriving the one
   * from the other means a drift in either is a failure rather than a
   * discrepancy nobody notices.
   *
   * Asserted as a *ratio* rather than by recomputing: if both modules changed
   * their `AS3_FPS` together this still holds, which is correct — that would be
   * a deliberate project-wide change, not a drift.
   */
  it('agrees with the countdown module on what an AS3 frame is worth', () => {
    const msPerFrameHere = MEDAL_STAMP_MS[2] / MEDAL_STAMP_FRAMES[2];
    const msPerFrameCountdown = COUNTDOWN_MS / COUNTDOWN_FRAMES;
    expect(msPerFrameHere).toBeCloseTo(msPerFrameCountdown, 9);
    // And both are the AS3's 30 fps, stated rather than inferred from each
    // other — two modules agreeing on a wrong number would pass the above.
    expect(msPerFrameHere).toBeCloseTo(1000 / 30, 9);
  });
});

describe('medals stamp in one at a time', () => {
  /**
   * The reveal is a step function of elapsed time, pinned **either side** of
   * each threshold. A step function asserted only at its steps passes for any
   * threshold inside the band.
   */
  it('reveals each medal at its own time, checked either side', () => {
    expect(medalsShownAt(0, 3)).toBe(0);
    expect(medalsShownAt(333, 3)).toBe(0);
    expect(medalsShownAt(334, 3)).toBe(1);

    expect(medalsShownAt(666, 3)).toBe(1);
    expect(medalsShownAt(667, 3)).toBe(2);

    expect(medalsShownAt(999, 3)).toBe(2);
    expect(medalsShownAt(1000, 3)).toBe(3);
  });

  it('never shows more than were earned, however long it runs', () => {
    // `valueIconArray[n] != null` — the array is only as long as the count, so
    // a later stamp finds nothing to reveal.
    expect(medalsShownAt(10_000, 1)).toBe(1);
    expect(medalsShownAt(10_000, 2)).toBe(2);
    expect(medalsShownAt(10_000, 0)).toBe(0);
  });

  /**
   * **The animation must never change the outcome.** Whatever the elapsed time,
   * the settled count is exactly what was earned — the value the reveal is
   * animating, never a value it invents.
   *
   * Driven across every medal count so "always returns its input" and "always
   * returns 3" both fail.
   */
  it('settles on exactly the earned count for every result', () => {
    for (const earned of [0, 1, 2, 3]) {
      expect(medalsShownAt(medalRevealDurationMs(earned), earned), `${earned} medals`).toBe(
        earned,
      );
      expect(medalsShownAt(60_000, earned), `${earned} medals, long after`).toBe(earned);
    }
  });
});

describe('one sound per earned medal', () => {
  const allCues = (earned: number) => medalCuesBetween(0, 60_000, earned);

  /**
   * The counterpart pair: three medals sound three times, one medal sounds
   * once. Asserting only the three-medal case would pass for a port that
   * always fired all three.
   */
  it('fires exactly the cues for the medals earned', () => {
    expect(allCues(3)).toEqual(['Award1', 'Award2', 'Award3']);
    expect(allCues(2)).toEqual(['Award1', 'Award2']);
    expect(allCues(1)).toEqual(['Award1']);
    expect(allCues(0)).toEqual([]);
  });

  it('fires each cue exactly once across consecutive ticks', () => {
    // The half-open interval is what makes this true; an inclusive lower bound
    // would re-fire a cue on the tick that lands exactly on it.
    let previous = 0;
    const fired: string[] = [];
    for (let t = 0; t <= 1400; t += 40) {
      fired.push(...medalCuesBetween(previous, t, 3));
      previous = t;
    }
    expect(fired).toEqual([...MEDAL_CUES]);
  });

  it('emits every cue crossed by one long frame', () => {
    // A stall must not swallow a medal, the same rule the countdown's cues have.
    expect(medalCuesBetween(0, 5000, 3)).toEqual(['Award1', 'Award2', 'Award3']);
  });

  it('reports when the reveal is over', () => {
    expect(medalRevealDurationMs(0)).toBe(0);
    expect(medalRevealDurationMs(1)).toBeCloseTo(STAMP_MS[0], 6);
    expect(medalRevealDurationMs(3)).toBe(1000);
  });
});
