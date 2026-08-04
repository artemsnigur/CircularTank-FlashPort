import { describe, expect, it } from 'vitest';

import {
  CONTINUE_ANYWAY_FRAMES,
  CONTINUE_FRAMES,
  FAST_CONTINUE_FRAMES,
  actionSatisfies,
  beginStep,
  continueFramesFor,
  createDefaultExitContext,
  tickStep,
} from './tutorialExit';
import type { TutorialExitContext } from './tutorialExit';
import {
  addTutorialsToQueue,
  completeTutorial,
  createDefaultContext,
  createInitialTutorialState,
  moveTriggerTutorialsToUnseen,
  takeNextTutorial,
  tutorialDefaultOn,
  withTutorialEnabled,
} from './tutorialState';
import { INITIAL_QUEUE, INITIAL_UNSEEN } from './tutorialData';

const ctx = (over: Partial<TutorialExitContext> = {}): TutorialExitContext => ({
  ...createDefaultExitContext(),
  ...over,
});

/** Runs a step to completion, returning how many frames it took. */
function runToFinish(id: Parameters<typeof beginStep>[0], context: TutorialExitContext): number {
  let step = beginStep(id);
  for (let frame = 1; frame <= 2000; frame += 1) {
    const result = tickStep(step, context);
    step = result.step;
    if (result.finished) return frame;
  }
  return -1;
}

describe('the two-speed follow-on delay', () => {
  it('gives the three keypress steps 1 frame and everything else 50', () => {
    // A fast step asserted **against a slow one**. Collapsing the two into a
    // single value still advances and still looks correct on screen; only the
    // pair shows the carve-out.
    expect(continueFramesFor('Move')).toBe(FAST_CONTINUE_FRAMES);
    expect(continueFramesFor('AimShoot')).toBe(FAST_CONTINUE_FRAMES);
    expect(continueFramesFor('Special')).toBe(FAST_CONTINUE_FRAMES);

    expect(continueFramesFor('KillEnemies')).toBe(CONTINUE_FRAMES);
    expect(continueFramesFor('Objective')).toBe(CONTINUE_FRAMES);
    expect(continueFramesFor('Weakness')).toBe(CONTINUE_FRAMES);

    // Stated as the relationship too, so a change that made them equal fails
    // even if both constants moved together.
    expect(continueFramesFor('Move')).toBeLessThan(continueFramesFor('KillEnemies'));
  });

  it('shows in the frame count, not just the constant', () => {
    // Driven: `Move` satisfied immediately finishes on the next frame, where
    // `Objective` satisfied immediately takes the full delay.
    expect(runToFinish('Move', ctx({ movementKeyHeld: true }))).toBe(2);
    expect(runToFinish('Objective', ctx({ levelDone: true }))).toBe(1 + CONTINUE_FRAMES);
  });
});

describe('the four timer-only steps', () => {
  it('cannot be dismissed by any action, where a two-exit step can', () => {
    // **The pair that matters.** Wiring an action exit onto all twelve looks
    // like an improvement and makes these four skippable by an unrelated
    // keypress. Driven with *every* input held at once.
    const everything = ctx({
      movementKeyHeld: true,
      firePressed: true,
      secondaryPressed: true,
      pausePressed: true,
      weaponSwitchPressed: true,
      enemiesKilled: 99,
      flagsTaken: 99,
      levelDone: true,
    });

    for (const id of ['NoMoveTowerMode', 'DefendBottom', 'Strength', 'Weakness'] as const) {
      expect(actionSatisfies(id, everything), `${id} should have no action exit`).toBe(false);
    }
    // Beside a step that does — otherwise "nothing satisfies anything" passes.
    expect(actionSatisfies('Special', everything)).toBe(true);
  });

  it('still ends, on its own timeout', () => {
    // They are statements rather than instructions, so the timeout is the only
    // way out — and it must exist, or the tutorial stalls forever.
    const idle = ctx();
    expect(runToFinish('Strength', idle)).toBe(
      (CONTINUE_ANYWAY_FRAMES.Strength ?? 0) + CONTINUE_FRAMES,
    );
  });

  it('leaves Move and Objective with no timeout at all', () => {
    // The opposite carve-out, and the reason absence is modelled as null
    // rather than 0: these two are the steps the tutorial will not let you
    // skip by waiting. Asserted against a step that does time out.
    expect(beginStep('Move').continueAnyway).toBeNull();
    expect(beginStep('Objective').continueAnyway).toBeNull();
    expect(beginStep('AimShoot').continueAnyway).toBe(120);

    // Driven: 2000 idle frames and `Move` is still asking.
    expect(runToFinish('Move', ctx())).toBe(-1);
  });

  it('lets an action on the expiry frame still count', () => {
    // `:283` decrements after the action check, so the two do not race.
    let step = beginStep('AimShoot');
    for (let i = 0; i < 119; i += 1) step = tickStep(step, ctx()).step;
    expect(step.continueAnyway).toBe(1);

    const acted = tickStep(step, ctx({ firePressed: true }));
    expect(acted.step.continueTimer).toBe(FAST_CONTINUE_FRAMES);
  });
});

describe('context steps re-arm at the end of a level', () => {
  it('returns a Flag hint to unseen and leaves a plain step queued', () => {
    // The rule most likely to be simplified into "reset everything" or dropped.
    // Asserted as the pair: one returns, one does not.
    const state = {
      ...createInitialTutorialState(),
      queue: ['CollectFlags' as const, 'Pause' as const],
      unseen: [],
    };

    const after = moveTriggerTutorialsToUnseen(state);
    expect(after.unseen).toContain('CollectFlags');
    expect(after.queue).toEqual(['Pause']);
  });

  it('re-arms only steps whose condition is about where you are', () => {
    // `Pause` and `KillEnemies` are progress-gated, not context-gated: once
    // relevant they stay relevant, so returning them would show them twice.
    const state = {
      ...createInitialTutorialState(),
      queue: ['KillEnemies' as const, 'Special' as const],
      unseen: [],
    };
    const after = moveTriggerTutorialsToUnseen(state);

    expect(after.queue).toEqual(['KillEnemies']);
    expect(after.unseen).toEqual(['Special']);
  });

  it('is a no-op when nothing context-dependent is queued', () => {
    const state = { ...createInitialTutorialState(), queue: ['Pause' as const] };
    expect(moveTriggerTutorialsToUnseen(state)).toBe(state);
  });
});

describe('turning the tutorial on', () => {
  it('is on for a first run and off for a returning player who declined', () => {
    // The sentinel is `optionsInitiated`, in the options store — not the save
    // slot. Asserted as the pair, since "always on" passes the first line.
    expect(tutorialDefaultOn(false)).toBe(true);
    expect(tutorialDefaultOn(true)).toBe(false);
  });

  it('never resurrects a completed tutorial, even from a stored true', () => {
    // `:421` sets `tutorialOn = false` on completion. A preference saved
    // before that must not turn it back on.
    const finished = { ...createInitialTutorialState(), completed: true };
    expect(withTutorialEnabled(finished, true).on).toBe(false);

    // Beside the unfinished case, or "always off" would pass.
    const fresh = createInitialTutorialState();
    expect(withTutorialEnabled(fresh, true).on).toBe(true);
  });
});

describe('a full simulated lifecycle', () => {
  it('runs Move through Objective and re-arms a context step', () => {
    // End to end through both halves: entry conditions queue the steps, exit
    // conditions retire them, and a Flag hint comes back for the next level.
    let state = createInitialTutorialState();
    expect(state.queue).toEqual([...INITIAL_QUEUE]);
    expect(state.unseen).toEqual([...INITIAL_UNSEEN]);

    const context = { ...createDefaultContext(), levelMode: 'Flag' };
    const inputs: Record<string, TutorialExitContext> = {
      Move: ctx({ movementKeyHeld: true }),
      AimShoot: ctx({ firePressed: true }),
      KillEnemies: ctx({ enemiesKilled: 1 }),
      Objective: ctx({ levelDone: true }),
    };

    for (const expected of ['Move', 'AimShoot', 'KillEnemies', 'Objective'] as const) {
      state = addTutorialsToQueue(state, context);
      const taken = takeNextTutorial(state);
      expect(taken.tutorial, `expected ${expected} next`).toBe(expected);
      state = taken.state;

      // Drive the step to its finish rather than asserting it is done.
      expect(runToFinish(expected, inputs[expected])).toBeGreaterThan(0);
      state = completeTutorial(state, expected);
    }

    expect(state.done).toEqual(['Move', 'AimShoot', 'KillEnemies', 'Objective']);

    // `CollectFlags` is now eligible — Flag mode plus Objective done.
    state = addTutorialsToQueue(state, context);
    expect(state.queue).toContain('CollectFlags');

    // Level ends without taking a flag: it goes back to unseen and re-arms.
    const afterLevel = moveTriggerTutorialsToUnseen(state);
    expect(afterLevel.unseen).toContain('CollectFlags');
    expect(afterLevel.queue).not.toContain('CollectFlags');

    // And a Normal level does not bring it back.
    const normal = addTutorialsToQueue(afterLevel, { ...context, levelMode: 'Normal' });
    expect(normal.queue).not.toContain('CollectFlags');
  });

  it('cannot queue a step whose prerequisite is unmet, however true its own condition', () => {
    // The order-of-evaluation question. Both operands are pure boolean reads
    // in one conjunction, so order cannot change the result — but the
    // conjunction itself is spec, and this is what it means.
    const fresh = createInitialTutorialState();
    const tempting = {
      ...createDefaultContext(),
      levelMode: 'Flag',
      reloadTimeSecondary: 0,
      enemyStrengthTrigger: true,
      enemyWeaknessTrigger: true,
      equippedWeapons: ['Cannon', 'MiniGun'],
    };

    const queued = addTutorialsToQueue(fresh, tempting);
    for (const id of ['CollectFlags', 'Special', 'Strength', 'Weakness', 'ShiftWeapon'] as const) {
      expect(queued.queue, `${id} queued without Objective`).not.toContain(id);
    }
    // Only Move is available, which is the whole point of the chain.
    expect(queued.queue).toEqual(['Move']);
  });
});
