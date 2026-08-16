/**
 * When a tutorial step goes away — `checkIfRemoveTutorial` (`PartTutorial.as:223`)
 * and the two timers around it.
 *
 * The entry half lives in `tutorialState.ts`; this is the exit half, and it is
 * where "the tutorial advances wrongly" lives.
 *
 * ── Three ways a step can end, and they are not interchangeable ───────────
 *
 * 1. **The player does the thing** — eight of the twelve steps have an action
 *    exit (`:229-281`).
 * 2. **`continueAnywayTimer` expires** — ten of the twelve carry a per-step
 *    timeout (`:328-397`). It counts only while the step is showing.
 * 3. Neither. **`Move` and `Objective` have no timeout at all**, so they can
 *    only be finished by doing them, and **four steps have no action exit**, so
 *    they can only time out.
 *
 * That last asymmetry is the easy thing to get wrong. Giving every step both
 * exits reads as an improvement and makes `NoMoveTowerMode`, `DefendBottom`,
 * `Strength` and `Weakness` dismissible by an unrelated keypress, while making
 * `Move` and `Objective` — the two the tutorial genuinely requires — skippable
 * by waiting. Pinned as pairs in `tutorialExit.test.ts` for that reason.
 *
 * ── The follow-on delay is two-speed ──────────────────────────────────────
 * Once a step has been satisfied, `tutorialContinueTimer` runs before the next
 * appears: `tutorialContinueTimerMax` (50) normally, but **1** for `Move`,
 * `AimShoot` and `Special` (`:293-302`). Three named steps carved out of a
 * general rule — the ones whose action is a single keypress, where a
 * three-second pause would read as the game having stopped responding.
 * Collapsing the two into one value still advances and still looks correct.
 */

import type { TutorialId } from './tutorialData';

/** `:40` — `tutorialContinueTimerMax`, in frames. */
export const CONTINUE_FRAMES = 50;

/** `:299` — the carve-out for the three keypress steps. */
export const FAST_CONTINUE_FRAMES = 1;

/** `:300` — the three steps that use the fast delay, named as the AS3 names them. */
const FAST_CONTINUE_STEPS: ReadonlySet<TutorialId> = new Set([
  'Move',
  'AimShoot',
  'Special',
]);

/**
 * `continueAnywayTimer` per step, in frames — `:328-397`.
 *
 * **Absent means no timeout**, not zero: `Move` and `Objective` are the two the
 * tutorial will not let you skip by waiting. Modelling that as `0` would make
 * them expire instantly, which is the opposite behaviour and would still look
 * like a working tutorial.
 */
export const CONTINUE_ANYWAY_FRAMES: Readonly<Partial<Record<TutorialId, number>>> = {
  AimShoot: 120,
  KillEnemies: 240,
  CollectFlags: 240,
  Pause: 150,
  Special: 180,
  NoMoveTowerMode: 180,
  DefendBottom: 180,
  ShiftWeapon: 210,
  Strength: 210,
  Weakness: 210,
};

/** Everything the action exits read — `:229-281`. */
export interface TutorialExitContext {
  /** `Main.left || Main.right || Main.up || Main.down`. */
  movementKeyHeld: boolean;
  /** `Main.mouse`. */
  firePressed: boolean;
  /** `Main.space`. */
  secondaryPressed: boolean;
  /** `Main.keyP`. */
  pausePressed: boolean;
  /** `Main.keyShift || Main.keyQ`. */
  weaponSwitchPressed: boolean;
  /** Enemies killed this level — `total - (current + left)` at `:245`. */
  enemiesKilled: number;
  /** Flags taken this level — `total - flagsLeft` at `:261`. */
  flagsTaken: number;
  /** `PartGameArea.levelDone`. */
  levelDone: boolean;
}

export function createDefaultExitContext(): TutorialExitContext {
  return {
    movementKeyHeld: false,
    firePressed: false,
    secondaryPressed: false,
    pausePressed: false,
    weaponSwitchPressed: false,
    enemiesKilled: 0,
    flagsTaken: 0,
    levelDone: false,
  };
}

/**
 * Whether the player has satisfied this step by acting — `:229-281`.
 *
 * Returns false for the four steps with no action exit. That is a real answer,
 * not a gap: `NoMoveTowerMode`, `DefendBottom`, `Strength` and `Weakness` are
 * statements rather than instructions, and the AS3 gives them no branch here.
 */
export function actionSatisfies(id: TutorialId, context: TutorialExitContext): boolean {
  switch (id) {
    case 'Move':
      return context.movementKeyHeld;
    case 'AimShoot':
      return context.firePressed;
    case 'KillEnemies':
      // `:245` — one kill is enough, not the whole wave.
      return context.enemiesKilled >= 1;
    case 'Objective':
      return context.levelDone;
    case 'CollectFlags':
      return context.flagsTaken >= 1;
    case 'Pause':
      return context.pausePressed;
    case 'Special':
      return context.secondaryPressed;
    case 'ShiftWeapon':
      return context.weaponSwitchPressed;
    default:
      return false;
  }
}

/** The live state of the step currently on screen. */
export interface ActiveStep {
  id: TutorialId;
  /** Counts down while showing. Null when this step has no timeout. */
  continueAnyway: number | null;
  /** Set once satisfied; counts down before the next step may appear. */
  continueTimer: number | null;
}

/** Begins showing a step — `:313-399`. */
export function beginStep(id: TutorialId): ActiveStep {
  return {
    // `:313` sets -1 first, and each branch overwrites it or does not. Null
    // rather than -1 so "no timeout" cannot be decremented into one.
    continueAnyway: CONTINUE_ANYWAY_FRAMES[id] ?? null,
    continueTimer: null,
    id,
  };
}

/** How long after this step before the next may appear — `:293-302`. */
export function continueFramesFor(id: TutorialId): number {
  return FAST_CONTINUE_STEPS.has(id) ? FAST_CONTINUE_FRAMES : CONTINUE_FRAMES;
}

export interface ExitStep {
  step: ActiveStep;
  /** True on the frame the step has fully gone and the next may be taken. */
  finished: boolean;
}

/**
 * Advances the active step one frame — `:223-303` and `:452-470`.
 *
 * Two phases, in order. While unsatisfied, the action exit and the timeout are
 * both live. Once satisfied, only `continueTimer` runs — a step already on its
 * way out cannot be re-triggered by the player pressing something else.
 */
export function tickStep(
  step: ActiveStep,
  context: TutorialExitContext,
  frames = 1,
): ExitStep {
  // Phase two: already satisfied, running the follow-on delay.
  if (step.continueTimer !== null) {
    const remaining = step.continueTimer - frames;
    return remaining > 0
      ? { step: { ...step, continueTimer: remaining }, finished: false }
      : { step: { ...step, continueTimer: 0 }, finished: true };
  }

  // Phase one: still asking. `:283` decrements the timeout *after* the action
  // check, so an action taken on the last frame wins over the expiry.
  const satisfied = actionSatisfies(step.id, context);
  const countdown =
    step.continueAnyway === null ? null : Math.max(0, step.continueAnyway - frames);
  const timedOut = step.continueAnyway !== null && countdown === 0;

  if (!satisfied && !timedOut) {
    return { step: { ...step, continueAnyway: countdown }, finished: false };
  }

  return {
    step: { ...step, continueAnyway: countdown, continueTimer: continueFramesFor(step.id) },
    finished: false,
  };
}
