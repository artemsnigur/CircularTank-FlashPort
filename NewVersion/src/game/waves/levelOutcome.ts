/**
 * Ending a level — `PartGameArea.as:2774` (the outcome) and `:655`
 * (`levelDoneFunction`, the handover to the results screen).
 *
 * ── The loop had no end ───────────────────────────────────────────────────
 * `isWaveComplete` in waveState.ts has been ported and tested since the wave
 * system landed, and nothing ever called it. Enemies spawned, died, and the
 * arena simply sat empty. This is the piece that makes a level finishable.
 *
 * ── Winning does not end the level immediately ────────────────────────────
 * `levelDoneFunction` only hands over to the results screen once
 * `moneyCount == 0 || hp == 0` — that is, once every dropped coin has been
 * picked up, or the player is dead. Killing the last enemy while money is
 * still on the floor leaves the level running so the player can collect it.
 *
 * Only after that condition holds does `levelDoneTimer` (15 frames, half a
 * second) count down, and then the screen changes. So the sequence is:
 *
 *     last enemy dies -> outcome decided -> collect remaining drops
 *       -> 15-frame beat -> results
 *
 * Defeat skips the collection wait, because `hp == 0` satisfies the condition
 * on its own.
 *
 * ── Not ported ────────────────────────────────────────────────────────────
 * `ScreenStatus` itself — star ratings, the money breakdown, achievement
 * evaluation — is a screen of its own. This module decides *that* a level
 * ended and *how*; it does not score it.
 *
 * Flag mode is excluded upstream: `isWaveComplete` returns false for it,
 * because a Flag level ends on the flag rather than on an empty arena.
 */

const AS3_FPS = 30;

/** `levelDoneTimer:Number = 15` — half a second at 30 fps. */
export const LEVEL_DONE_DELAY_FRAMES = 15;

/**
 * Blast the tank leaves behind on defeat.
 *
 * `:2780` queues `[tank.x, tank.y, 150, 0, "Normal", 0, 0, false]` — radius
 * 150 and damage **0**. It is pure spectacle; it cannot hurt anything.
 */
export const TANK_DEATH_BLAST_RADIUS = 150;

export type LevelResult = 'won' | 'lost';

export interface LevelOutcomeState {
  /** Null until the level has been decided. */
  result: LevelResult | null;
  /** Counts down only once the handover condition holds. */
  doneTimer: number;
  /** True once the results screen should be shown. */
  finished: boolean;
}

export function createLevelOutcome(): LevelOutcomeState {
  return { result: null, doneTimer: LEVEL_DONE_DELAY_FRAMES, finished: false };
}

export interface OutcomeInputs {
  /** From `isWaveComplete` — nothing left to spawn and the arena is clear. */
  waveComplete: boolean;
  tankHp: number;
  /** Uncollected money still on the floor. */
  moneyOnFloor: number;
}

/**
 * Decides the outcome if it is not already decided.
 *
 * Defeat takes precedence: the AS3 branches on `hp == 0` *after* setting
 * `levelDone`, so dying on the same frame the last enemy falls is a loss.
 */
export function decideOutcome(
  state: LevelOutcomeState,
  inputs: OutcomeInputs,
): LevelOutcomeState {
  if (state.result !== null) return state;
  if (inputs.tankHp <= 0) return { ...state, result: 'lost' };
  if (inputs.waveComplete) return { ...state, result: 'won' };
  return state;
}

/**
 * Whether the handover countdown may run — `moneyCount == 0 || hp == 0`.
 *
 * Exposed so the HUD can tell "waiting for you to collect" apart from
 * "counting down".
 */
export function canHandOver(state: LevelOutcomeState, inputs: OutcomeInputs): boolean {
  if (state.result === null) return false;
  return inputs.moneyOnFloor === 0 || inputs.tankHp <= 0;
}

/**
 * Advances the end-of-level countdown.
 *
 * Returns the state unchanged while the level is undecided or the player still
 * has coins to collect; sets `finished` once the timer expires.
 */
export function tickOutcome(
  state: LevelOutcomeState,
  inputs: OutcomeInputs,
  deltaMs: number,
): LevelOutcomeState {
  const decided = decideOutcome(state, inputs);
  if (decided.result === null || decided.finished) return decided;
  if (!canHandOver(decided, inputs)) return decided;

  const frames = (deltaMs / 1000) * AS3_FPS;
  const doneTimer = decided.doneTimer - frames;

  return doneTimer > 0
    ? { ...decided, doneTimer }
    : { ...decided, doneTimer: 0, finished: true };
}

/** Music the outcome switches to — `SoundManager.changeMusic`. */
export function outcomeMusic(result: LevelResult): 'Win' | 'Lose' {
  return result === 'won' ? 'Win' : 'Lose';
}
