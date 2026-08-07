/**
 * The opening countdown — `PartInterface.countDownFunction()` (`:702-744`).
 *
 * A frame counter from 60 to 0 that gates the start of play. When it reaches
 * zero it sets `PartGameArea.countDownDone = true` (`:712`), which is read by
 * two very different things: the update partition in `countdownGate.ts`, and
 * the spawn placement rule in `spawnPlacement.ts`.
 *
 * ── Frames, converted; the cadence is not one per second ──────────────────
 * `countDown` starts at **60** (`PartInterface.as:88`) and is decremented once
 * per frame at the AS3's 30 fps, so the whole thing is **two seconds**. The
 * cues are at 54, 36, 18 and 0 (`:723`, `:728`, `:733`, `:738`) — **18 frames
 * apart, which is 0.6 s, not 1 s.** Transcribing "3, 2, 1" as one-second ticks
 * would be wrong and would look completely right, which is why the frame
 * numbers are kept here and the milliseconds are derived from them.
 *
 * ── Crossing, not equality ────────────────────────────────────────────────
 * The AS3 tests `countDown == 54` exactly, which is safe at a fixed 30 fps
 * where the counter moves in whole steps. This port advances by a fractional
 * frame count derived from `deltaMs`, so an equality test would be stepped over
 * and the cue would never fire. Cues therefore fire when the counter *crosses*
 * a threshold downward.
 *
 * This is the same substitution `flames.ts:38-42` makes for the same reason,
 * and it is recorded there as a deliberate AS3 bug-fix rather than a divergence
 * in behaviour: at 30 fps the two are identical, and at any other rate the
 * crossing model is the one that preserves the intent.
 *
 * A single long frame can cross more than one threshold; `tickCountdown`
 * returns every cue it passed, in order, so a stall cannot silently swallow the
 * "GO!".
 */

const AS3_FPS = 30;

/** `PartInterface.as:88` — `countDown:Number = 60`. */
export const COUNTDOWN_FRAMES = 60;

/** Two seconds. Derived, so the frame count stays the stated source value. */
export const COUNTDOWN_MS = (COUNTDOWN_FRAMES / AS3_FPS) * 1000;

/** What the countdown shows, in the order it shows it. */
export type CountdownCue = '3' | '2' | '1' | 'GO';

/**
 * Cue thresholds in AS3 frames — `:723`, `:728`, `:733`, `:738`.
 *
 * Ordered high to low, which is the order the counter passes them.
 */
export const CUE_FRAMES: readonly (readonly [CountdownCue, number])[] = [
  ['3', 54],
  ['2', 36],
  ['1', 18],
  ['GO', 0],
];

export interface CountdownState {
  /** Remaining time in **AS3 frames**, the unit the source counts in. */
  framesLeft: number;
  /** `PartGameArea.countDownDone`. False while the countdown is running. */
  done: boolean;
}

/**
 * `PartInterface.as:288` — the one case the countdown is skipped outright.
 *
 * On world 1 level 1, for a tutorial that is on, not completed and has done
 * nothing yet, the AS3 sets `countDownDone = true` and `countDown = 0` before
 * the countdown ever runs, and stops the intro tweens (`:290-299`).
 *
 * **So a brand-new player never sees a countdown**, and 1-1 is the one level
 * that cannot be used to observe this feature. Worth knowing before testing.
 */
export function countdownSkipped(input: {
  world: number;
  level: number;
  tutorialOn: boolean;
  tutorialCompleted: boolean;
  tutorialStepsDone: number;
}): boolean {
  return (
    input.world === 1 &&
    input.level === 1 &&
    input.tutorialOn &&
    !input.tutorialCompleted &&
    input.tutorialStepsDone === 0
  );
}

/** A countdown at its starting value, or already finished when `skipped`. */
export function createCountdown(skipped = false): CountdownState {
  return skipped
    ? { framesLeft: 0, done: true }
    : { framesLeft: COUNTDOWN_FRAMES, done: false };
}

export interface CountdownTick {
  state: CountdownState;
  /** Thresholds crossed this tick, in the order they were passed. */
  cues: CountdownCue[];
}

/**
 * Advances the countdown by `deltaMs`.
 *
 * Idempotent once finished: a done countdown stays done and emits nothing, so
 * calling this every frame for the rest of the level is harmless.
 */
export function tickCountdown(state: CountdownState, deltaMs: number): CountdownTick {
  if (state.done) return { state, cues: [] };

  const frames = (deltaMs / 1000) * AS3_FPS;
  const framesLeft = Math.max(0, state.framesLeft - frames);

  const cues: CountdownCue[] = [];
  for (const [cue, threshold] of CUE_FRAMES) {
    // Crossed downward through the threshold this tick. `>` on the old value
    // and `<=` on the new means each cue fires exactly once.
    if (state.framesLeft > threshold && framesLeft <= threshold) cues.push(cue);
  }

  return { state: { framesLeft, done: framesLeft <= 0 }, cues };
}
