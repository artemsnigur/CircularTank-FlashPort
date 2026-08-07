import { describe, expect, it } from 'vitest';

import {
  COUNTDOWN_FRAMES,
  COUNTDOWN_MS,
  createCountdown,
  countdownSkipped,
  tickCountdown,
} from './countdown';
import type { CountdownCue, CountdownState } from './countdown';

/**
 * Expected cue times, computed by hand from the AS3 frame numbers rather than
 * read back out of the module.
 *
 * `PartInterface.as:723`, `:728`, `:733`, `:738` fire at `countDown` 54, 36, 18
 * and 0, counting down from 60 at 30 fps. Elapsed milliseconds is therefore
 * `(60 - frame) / 30 * 1000`:
 *
 *     54 -> (60-54)/30*1000 =  200
 *     36 -> (60-36)/30*1000 =  800
 *     18 -> (60-18)/30*1000 = 1400
 *      0 -> (60- 0)/30*1000 = 2000
 *
 * Stated as literals because a test that derives its expectation the same way
 * the code does cannot detect a wrong conversion.
 */
const CUE_MS: readonly (readonly [CountdownCue, number])[] = [
  ['3', 200],
  ['2', 800],
  ['1', 1400],
  ['GO', 2000],
];

/** Runs the countdown in `stepMs` slices, recording when each cue fired. */
function driveToCompletion(stepMs: number): { cue: CountdownCue; atMs: number }[] {
  let state: CountdownState = createCountdown();
  const fired: { cue: CountdownCue; atMs: number }[] = [];
  let elapsed = 0;

  for (let i = 0; i < 10_000 && !state.done; i += 1) {
    elapsed += stepMs;
    const tick = tickCountdown(state, stepMs);
    state = tick.state;
    for (const cue of tick.cues) fired.push({ cue, atMs: elapsed });
  }

  return fired;
}

describe('countdown timing', () => {
  it('lasts two seconds, from the AS3 frame count', () => {
    // The magnitude from the source; the relationship from the constant.
    expect(COUNTDOWN_FRAMES).toBe(60);
    expect(COUNTDOWN_MS).toBe(2000);
  });

  it('fires each cue at its AS3 time', () => {
    // One port frame at 60 fps, the rate this actually runs at.
    const fired = driveToCompletion(1000 / 60);

    expect(fired.map((f) => f.cue)).toEqual(['3', '2', '1', 'GO']);

    for (const [i, [cue, expectedMs]] of CUE_MS.entries()) {
      const actual = fired[i];
      expect(actual.cue).toBe(cue);
      // Within one 60 fps frame of the hand-computed time — the counter can
      // only be sampled on frame boundaries.
      expect(Math.abs(actual.atMs - expectedMs)).toBeLessThanOrEqual(1000 / 60);
    }
  });

  /**
   * The counterpart to the timing test: the cadence is **not** one per second.
   * "3, 2, 1" transcribed as one-second ticks passes a "four cues in order"
   * assertion and is wrong, so the *gaps* are pinned, not just the sequence.
   */
  it('spaces the three digits 0.6s apart, not 1s', () => {
    const fired = driveToCompletion(1000 / 60);
    const at = (cue: CountdownCue) => fired.find((f) => f.cue === cue)!.atMs;

    const frame = 1000 / 60;
    expect(Math.abs(at('2') - at('3') - 600)).toBeLessThanOrEqual(frame);
    expect(Math.abs(at('1') - at('2') - 600)).toBeLessThanOrEqual(frame);
    expect(Math.abs(at('GO') - at('1') - 600)).toBeLessThanOrEqual(frame);
    // And the first digit is 0.2s in, not 0.6s — 60 to 54 is six frames.
    expect(Math.abs(at('3') - 200)).toBeLessThanOrEqual(frame);
  });

  /**
   * Rate independence, which is the whole reason for the crossing model. At 30
   * fps the AS3's equality test and this are identical; at 60 and at a stalled
   * 10 fps only the crossing model still fires every cue.
   */
  it('fires the same four cues at any frame rate', () => {
    for (const fps of [30, 60, 144, 10]) {
      const fired = driveToCompletion(1000 / fps);
      expect(fired.map((f) => f.cue), `at ${fps} fps`).toEqual(['3', '2', '1', 'GO']);
    }
  });

  it('emits every threshold crossed by one long frame', () => {
    // A stall must not swallow the GO. One 3-second frame crosses all four.
    const { state, cues } = tickCountdown(createCountdown(), 3000);
    expect(cues).toEqual(['3', '2', '1', 'GO']);
    expect(state.done).toBe(true);
  });
});

describe('countdown state', () => {
  it('starts running and finishes exactly once', () => {
    const start = createCountdown();
    expect(start.done).toBe(false);
    expect(start.framesLeft).toBe(60);

    let state = start;
    let goes = 0;
    for (let i = 0; i < 300; i += 1) {
      const tick = tickCountdown(state, 1000 / 60);
      state = tick.state;
      goes += tick.cues.filter((c) => c === 'GO').length;
    }
    expect(state.done).toBe(true);
    expect(goes).toBe(1);
  });

  it('is inert once done', () => {
    // Called every frame for the rest of the level, so this has to be free.
    const done = createCountdown(true);
    const tick = tickCountdown(done, 1000);
    expect(tick.state).toBe(done);
    expect(tick.cues).toEqual([]);
  });
});

describe('the 1-1 skip — PartInterface.as:288', () => {
  const FRESH = {
    world: 1,
    level: 1,
    tutorialOn: true,
    tutorialCompleted: false,
    tutorialStepsDone: 0,
  };

  it('skips for a brand-new player on 1-1', () => {
    expect(countdownSkipped(FRESH)).toBe(true);
    expect(createCountdown(true)).toEqual({ framesLeft: 0, done: true });
  });

  /**
   * Every clause driven against the same base case, per rule 2. A skip
   * predicate that returned true for everything would pass the assertion above
   * on its own, so each negative is the identical input with one field moved.
   */
  it('does not skip when any single condition fails', () => {
    expect(countdownSkipped({ ...FRESH, level: 2 })).toBe(false);
    expect(countdownSkipped({ ...FRESH, world: 2 })).toBe(false);
    expect(countdownSkipped({ ...FRESH, tutorialOn: false })).toBe(false);
    expect(countdownSkipped({ ...FRESH, tutorialCompleted: true })).toBe(false);
    expect(countdownSkipped({ ...FRESH, tutorialStepsDone: 1 })).toBe(false);
  });
});
