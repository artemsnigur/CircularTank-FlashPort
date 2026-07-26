/**
 * Port of the tutorial queue logic in `SWFimported/scripts/PartTutorial.as`.
 *
 * The tutorial's *presentation* (image sprites, slide-in/out tweens, on-screen
 * positions) is not ported — those become React/Phaser overlays. What is ported
 * is the state machine that decides which step is eligible, when it advances,
 * and what persists.
 *
 * ── Three lists ───────────────────────────────────────────────────────────
 *   unseen   steps whose trigger conditions have not been met yet
 *   queue    steps eligible to show, in order
 *   done     steps the player has completed
 *
 * A step moves unseen -> queue when its condition holds, queue -> done when
 * shown and dismissed. Context-dependent steps move back queue -> unseen at the
 * end of a level so they can re-trigger somewhere appropriate.
 */

import {
  INITIAL_QUEUE,
  INITIAL_UNSEEN,
  PREREQUISITE,
  TRIGGER_TUTORIALS,
} from './tutorialData';
import type { TutorialId } from './tutorialData';

export interface TutorialState {
  /** PartTutorial.as `tutorialOn` — whether the tutorial is running at all. */
  on: boolean;
  /** `tutorialCompleted` — set once `unseen` empties. */
  completed: boolean;
  unseen: TutorialId[];
  queue: TutorialId[];
  done: TutorialId[];
}

export function createInitialTutorialState(): TutorialState {
  return {
    on: false,
    completed: false,
    unseen: [...INITIAL_UNSEEN],
    queue: [...INITIAL_QUEUE],
    done: [],
  };
}

/** `PartTutorial.checkIfTutorialDone(theTutorial)`. */
export function isTutorialDone(state: TutorialState, id: TutorialId): boolean {
  return state.done.includes(id);
}

/**
 * Everything `addTutorialsToQueue` reads from other classes.
 *
 * Injected rather than imported: three of the five owners are still unported,
 * and this keeps the state machine testable. Fields map 1:1 onto the AS3
 * conditions, noted on each.
 */
export interface TutorialContext {
  /** `ScreenLevelSelect.levelMode`. */
  levelMode: string;
  /** `ScreenLevelSelect.getCurrentWorldAndLevel()`. */
  currentWorldAndLevel: readonly [number, number];
  /** `ScreenGame.reloadTimeSecondary` — 0 means a special weapon is ready. */
  reloadTimeSecondary: number;
  /** `ScreenGame.equippedWeapons` — both slots filled enables ShiftWeapon. */
  equippedWeapons: readonly string[];
  /** `Main.up || Main.down || Main.left || Main.right`. */
  movementKeyHeld: boolean;
  /** `PartGameArea.enemyStrengthTrigger`. */
  enemyStrengthTrigger: boolean;
  /** `PartGameArea.enemyWeaknessTrigger`. */
  enemyWeaknessTrigger: boolean;
}

export function createDefaultContext(): TutorialContext {
  return {
    levelMode: 'Normal',
    currentWorldAndLevel: [1, 1],
    reloadTimeSecondary: 1,
    equippedWeapons: ['None', 'None'],
    movementKeyHeld: false,
    enemyStrengthTrigger: false,
    enemyWeaknessTrigger: false,
  };
}

/**
 * Whether a step's trigger condition currently holds.
 *
 * Every branch of the AS3's `addTutorialsToQueue`, in the same order. The
 * shared `checkIfTutorialDone(prerequisite)` guard is applied first, so only
 * the step-specific part appears here.
 */
function triggerHolds(
  id: TutorialId,
  state: TutorialState,
  context: TutorialContext,
): boolean {
  const prerequisite = PREREQUISITE[id];
  if (prerequisite && !isTutorialDone(state, prerequisite)) return false;

  switch (id) {
    // Move's guard is a negation, not a prerequisite: it queues while *not*
    // already done. In practice Move starts queued and is never returned to
    // unseen, so this branch is unreachable in a normal run — kept for fidelity.
    case 'Move':
      return !isTutorialDone(state, 'Move');

    case 'AimShoot':
    case 'KillEnemies':
    case 'Objective':
      return true; // prerequisite alone

    case 'CollectFlags':
      return context.levelMode === 'Flag';

    case 'Pause': {
      // Only once the player is a few levels in.
      const [world, level] = context.currentWorldAndLevel;
      return world > 1 || level >= 4;
    }

    case 'Special':
      return context.reloadTimeSecondary === 0;

    case 'NoMoveTowerMode':
      return context.levelMode === 'Tower' && context.movementKeyHeld;

    case 'DefendBottom':
      return context.levelMode === 'Defense';

    case 'ShiftWeapon':
      return (
        context.equippedWeapons[0] !== 'None' && context.equippedWeapons[1] !== 'None'
      );

    case 'Strength':
      return context.enemyStrengthTrigger;

    case 'Weakness':
      return context.enemyWeaknessTrigger;

    default: {
      const never: never = id;
      throw new Error(`Unhandled tutorial: ${String(never)}`);
    }
  }
}

/**
 * `PartTutorial.addTutorialsToQueue()` — moves every newly-eligible step from
 * unseen to the back of the queue.
 *
 * Returns a new state; the input is not mutated.
 */
export function addTutorialsToQueue(
  state: TutorialState,
  context: TutorialContext,
): TutorialState {
  const unseen: TutorialId[] = [];
  const queue = [...state.queue];
  let changed = false;

  // The AS3 splices while iterating and decrements the index. Partitioning is
  // equivalent and cannot skip an element.
  for (const id of state.unseen) {
    if (triggerHolds(id, state, context)) {
      queue.push(id);
      changed = true;
    } else {
      unseen.push(id);
    }
  }

  return changed ? { ...state, unseen, queue } : state;
}

/**
 * `PartTutorial.moveTriggerTutorialsFromQueueToUnseen()` — called when a level
 * ends.
 *
 * Context-dependent steps go back to the **front** of unseen (`unshift`), so
 * they are re-evaluated before the steps still waiting behind them.
 */
export function moveTriggerTutorialsToUnseen(state: TutorialState): TutorialState {
  const staying: TutorialId[] = [];
  const returning: TutorialId[] = [];

  for (const id of state.queue) {
    if (TRIGGER_TUTORIALS.has(id)) returning.push(id);
    else staying.push(id);
  }
  if (returning.length === 0) return state;

  // Each is unshifted in queue order, so the last one ends up first — the same
  // result as the AS3's in-place loop.
  const unseen = [...returning.reverse(), ...state.unseen];
  return { ...state, unseen, queue: staying };
}

/** The step that would be shown next, or null when the queue is empty. */
export function peekNextTutorial(state: TutorialState): TutorialId | null {
  return state.queue[0] ?? null;
}

/**
 * `addTutorialFromQueue()` — takes the head of the queue as the active step.
 * Returns the state with it removed, plus the step itself.
 */
export function takeNextTutorial(state: TutorialState): {
  state: TutorialState;
  tutorial: TutorialId | null;
} {
  if (state.queue.length === 0) return { state, tutorial: null };
  const [tutorial, ...queue] = state.queue;
  return { state: { ...state, queue }, tutorial };
}

/**
 * `outTweenFinish()` — records a step as done.
 *
 * `tutorialCompleted` is set when **unseen** empties, not the queue. A step
 * still queued does not prevent completion, which is what the AS3 checks.
 */
export function completeTutorial(state: TutorialState, id: TutorialId): TutorialState {
  if (isTutorialDone(state, id)) return state;

  const done = [...state.done, id];
  const finished = state.unseen.length === 0;

  return {
    ...state,
    done,
    completed: finished ? true : state.completed,
    on: finished ? false : state.on,
  };
}

/** True before any step has been completed — PartInterface.as:288. */
export function isTutorialUntouched(state: TutorialState): boolean {
  return state.done.length === 0;
}
