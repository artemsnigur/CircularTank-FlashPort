import { describe, expect, it } from 'vitest';
import {
  CONTINUE_ANYWAY_FRAMES,
  CONTINUE_ANYWAY_MS,
  INITIAL_QUEUE,
  INITIAL_UNSEEN,
  INSTANT_DISMISS,
  PREREQUISITE,
  TRIGGER_TUTORIALS,
  TUTORIAL_IDS,
} from './tutorialData';
import type { TutorialId } from './tutorialData';
import {
  addTutorialsToQueue,
  completeTutorial,
  createDefaultContext,
  createInitialTutorialState,
  isTutorialDone,
  isTutorialUntouched,
  moveTriggerTutorialsToUnseen,
  peekNextTutorial,
  takeNextTutorial,
} from './tutorialState';
import type { TutorialContext, TutorialState } from './tutorialState';

/** Marks a set of steps done without going through the queue. */
const withDone = (state: TutorialState, ...done: TutorialId[]): TutorialState => ({
  ...state,
  done: [...state.done, ...done],
});

const ctx = (overrides: Partial<TutorialContext> = {}): TutorialContext => ({
  ...createDefaultContext(),
  ...overrides,
});

describe('tutorial data', () => {
  it('covers all 12 steps across the initial lists', () => {
    expect(TUTORIAL_IDS).toHaveLength(12);
    expect([...INITIAL_QUEUE, ...INITIAL_UNSEEN].sort()).toEqual([...TUTORIAL_IDS].sort());
  });

  it('starts with Move queued and everything else unseen', () => {
    expect(INITIAL_QUEUE).toEqual(['Move']);
    expect(INITIAL_UNSEEN).toHaveLength(11);
  });

  it('marks the 7 context-dependent steps as trigger tutorials', () => {
    expect(TRIGGER_TUTORIALS.size).toBe(7);
    expect(TRIGGER_TUTORIALS.has('CollectFlags')).toBe(true);
    expect(TRIGGER_TUTORIALS.has('Move')).toBe(false);
  });

  it('gives Move and Objective no auto-advance', () => {
    expect(CONTINUE_ANYWAY_FRAMES.Move).toBeNull();
    expect(CONTINUE_ANYWAY_FRAMES.Objective).toBeNull();
    expect(CONTINUE_ANYWAY_FRAMES.AimShoot).toBe(120);
  });

  it('converts frame counts to milliseconds at 30 fps', () => {
    expect(CONTINUE_ANYWAY_MS.AimShoot).toBe(4000);
    expect(CONTINUE_ANYWAY_MS.ShiftWeapon).toBe(7000);
    expect(CONTINUE_ANYWAY_MS.Move).toBeNull();
  });

  it('dismisses the three player-driven steps instantly', () => {
    expect([...INSTANT_DISMISS].sort()).toEqual(['AimShoot', 'Move', 'Special']);
  });

  it('chains the opening prerequisites', () => {
    expect(PREREQUISITE.AimShoot).toBe('Move');
    expect(PREREQUISITE.KillEnemies).toBe('AimShoot');
    expect(PREREQUISITE.Objective).toBe('KillEnemies');
    expect(PREREQUISITE.Move).toBeUndefined();
  });
});

describe('initial state', () => {
  it('matches the AS3 initialisers', () => {
    const state = createInitialTutorialState();
    expect(state.on).toBe(false);
    expect(state.completed).toBe(false);
    expect(state.queue).toEqual(['Move']);
    expect(state.unseen).toHaveLength(11);
    expect(state.done).toEqual([]);
    expect(isTutorialUntouched(state)).toBe(true);
  });
});

describe('addTutorialsToQueue', () => {
  it('queues nothing before the prerequisites are met', () => {
    const state = createInitialTutorialState();
    expect(addTutorialsToQueue(state, ctx())).toBe(state);
  });

  it('queues AimShoot once Move is done', () => {
    const state = withDone(createInitialTutorialState(), 'Move');
    const next = addTutorialsToQueue(state, ctx());

    expect(next.queue).toContain('AimShoot');
    expect(next.unseen).not.toContain('AimShoot');
  });

  it('walks the opening chain one step at a time', () => {
    let state = createInitialTutorialState();
    for (const [prerequisite, expected] of [
      ['Move', 'AimShoot'],
      ['AimShoot', 'KillEnemies'],
      ['KillEnemies', 'Objective'],
    ] as const) {
      state = withDone(state, prerequisite);
      state = addTutorialsToQueue(state, ctx());
      expect(state.queue).toContain(expected);
    }
  });

  it('queues CollectFlags only in a Flag level', () => {
    const state = withDone(createInitialTutorialState(), 'Move', 'AimShoot', 'KillEnemies', 'Objective');

    expect(addTutorialsToQueue(state, ctx({ levelMode: 'Normal' })).queue).not.toContain(
      'CollectFlags',
    );
    expect(addTutorialsToQueue(state, ctx({ levelMode: 'Flag' })).queue).toContain(
      'CollectFlags',
    );
  });

  it('queues DefendBottom only in a Defense level', () => {
    const state = withDone(createInitialTutorialState(), 'Move', 'AimShoot', 'KillEnemies', 'Objective');
    expect(addTutorialsToQueue(state, ctx({ levelMode: 'Defense' })).queue).toContain(
      'DefendBottom',
    );
  });

  it('queues NoMoveTowerMode only in a Tower level while a key is held', () => {
    const state = withDone(createInitialTutorialState(), 'Move', 'AimShoot', 'KillEnemies', 'Objective');

    expect(
      addTutorialsToQueue(state, ctx({ levelMode: 'Tower', movementKeyHeld: false })).queue,
    ).not.toContain('NoMoveTowerMode');
    expect(
      addTutorialsToQueue(state, ctx({ levelMode: 'Tower', movementKeyHeld: true })).queue,
    ).toContain('NoMoveTowerMode');
  });

  it('gates Pause behind reaching world 2 or level 4', () => {
    const state = withDone(createInitialTutorialState(), 'Move', 'AimShoot', 'KillEnemies', 'Objective');

    expect(addTutorialsToQueue(state, ctx({ currentWorldAndLevel: [1, 3] })).queue).not.toContain(
      'Pause',
    );
    expect(addTutorialsToQueue(state, ctx({ currentWorldAndLevel: [1, 4] })).queue).toContain(
      'Pause',
    );
    expect(addTutorialsToQueue(state, ctx({ currentWorldAndLevel: [2, 1] })).queue).toContain(
      'Pause',
    );
  });

  it('queues Special only when the secondary weapon is ready', () => {
    const state = withDone(createInitialTutorialState(), 'Move', 'AimShoot', 'KillEnemies', 'Objective');

    expect(addTutorialsToQueue(state, ctx({ reloadTimeSecondary: 5 })).queue).not.toContain(
      'Special',
    );
    expect(addTutorialsToQueue(state, ctx({ reloadTimeSecondary: 0 })).queue).toContain('Special');
  });

  it('queues ShiftWeapon only when both slots are filled', () => {
    const state = withDone(createInitialTutorialState(), 'Move', 'AimShoot', 'KillEnemies', 'Objective');

    expect(
      addTutorialsToQueue(state, ctx({ equippedWeapons: ['Cannon', 'None'] })).queue,
    ).not.toContain('ShiftWeapon');
    expect(
      addTutorialsToQueue(state, ctx({ equippedWeapons: ['Cannon', 'Rockets'] })).queue,
    ).toContain('ShiftWeapon');
  });

  it('queues Strength and Weakness from their gameplay triggers', () => {
    const state = withDone(createInitialTutorialState(), 'Move', 'AimShoot', 'KillEnemies', 'Objective');

    expect(addTutorialsToQueue(state, ctx({ enemyStrengthTrigger: true })).queue).toContain(
      'Strength',
    );
    expect(addTutorialsToQueue(state, ctx({ enemyWeaknessTrigger: true })).queue).toContain(
      'Weakness',
    );
  });

  it('appends to the back of the queue, preserving order', () => {
    const state = withDone(createInitialTutorialState(), 'Move');
    const next = addTutorialsToQueue(state, ctx());
    expect(next.queue[0]).toBe('Move');
    expect(next.queue[next.queue.length - 1]).toBe('AimShoot');
  });

  it('does not mutate the state it was given', () => {
    const state = withDone(createInitialTutorialState(), 'Move');
    const before = [...state.unseen];
    addTutorialsToQueue(state, ctx());
    expect(state.unseen).toEqual(before);
  });

  it('does not skip an entry when several qualify at once', () => {
    // The AS3 splices while iterating; this is the case that would expose an
    // off-by-one in that idiom.
    const state = withDone(
      createInitialTutorialState(),
      'Move',
      'AimShoot',
      'KillEnemies',
      'Objective',
    );
    const next = addTutorialsToQueue(
      state,
      ctx({
        levelMode: 'Flag',
        reloadTimeSecondary: 0,
        equippedWeapons: ['Cannon', 'Rockets'],
        enemyStrengthTrigger: true,
        enemyWeaknessTrigger: true,
        currentWorldAndLevel: [2, 1],
      }),
    );

    for (const id of ['CollectFlags', 'Pause', 'Special', 'ShiftWeapon', 'Strength', 'Weakness']) {
      expect(next.queue, id).toContain(id);
    }
    // The two mode-specific steps stay behind: this is a Flag level, so
    // NoMoveTowerMode (Tower) and DefendBottom (Defense) do not qualify.
    expect(next.unseen).toEqual(['NoMoveTowerMode', 'DefendBottom']);
  });
});

describe('moveTriggerTutorialsToUnseen', () => {
  it('returns context-dependent steps and keeps the rest queued', () => {
    const state: TutorialState = {
      ...createInitialTutorialState(),
      queue: ['Move', 'CollectFlags', 'Pause', 'Special'],
      unseen: ['Weakness'],
    };
    const next = moveTriggerTutorialsToUnseen(state);

    expect(next.queue).toEqual(['Move', 'Pause']);
    expect(next.unseen).toContain('CollectFlags');
    expect(next.unseen).toContain('Special');
  });

  it('puts them at the front of unseen in reverse queue order, as unshift does', () => {
    // Each is unshifted in turn, so the *last* one moved ends up first:
    //   unshift(CollectFlags) -> [CollectFlags, Weakness]
    //   unshift(Special)      -> [Special, CollectFlags, Weakness]
    const state: TutorialState = {
      ...createInitialTutorialState(),
      queue: ['CollectFlags', 'Special'],
      unseen: ['Weakness'],
    };
    expect(moveTriggerTutorialsToUnseen(state).unseen).toEqual([
      'Special',
      'CollectFlags',
      'Weakness',
    ]);
  });

  it('is a no-op when the queue holds none of them', () => {
    const state: TutorialState = { ...createInitialTutorialState(), queue: ['Move'] };
    expect(moveTriggerTutorialsToUnseen(state)).toBe(state);
  });

  it('round-trips a step back into the queue when the level suits it', () => {
    let state = withDone(createInitialTutorialState(), 'Move', 'AimShoot', 'KillEnemies', 'Objective');
    state = addTutorialsToQueue(state, ctx({ levelMode: 'Flag' }));
    expect(state.queue).toContain('CollectFlags');

    state = moveTriggerTutorialsToUnseen(state);
    expect(state.queue).not.toContain('CollectFlags');

    state = addTutorialsToQueue(state, ctx({ levelMode: 'Flag' }));
    expect(state.queue).toContain('CollectFlags');
  });
});

describe('queue consumption', () => {
  it('peeks and takes from the front', () => {
    const state = createInitialTutorialState();
    expect(peekNextTutorial(state)).toBe('Move');

    const { state: next, tutorial } = takeNextTutorial(state);
    expect(tutorial).toBe('Move');
    expect(next.queue).toEqual([]);
    expect(peekNextTutorial(next)).toBeNull();
  });

  it('returns null on an empty queue without changing state', () => {
    const state: TutorialState = { ...createInitialTutorialState(), queue: [] };
    const result = takeNextTutorial(state);
    expect(result.tutorial).toBeNull();
    expect(result.state).toBe(state);
  });
});

describe('completeTutorial', () => {
  it('records a step as done', () => {
    const state = completeTutorial(createInitialTutorialState(), 'Move');
    expect(isTutorialDone(state, 'Move')).toBe(true);
    expect(isTutorialUntouched(state)).toBe(false);
  });

  it('does not record the same step twice', () => {
    const once = completeTutorial(createInitialTutorialState(), 'Move');
    expect(completeTutorial(once, 'Move')).toBe(once);
  });

  it('does not complete the tutorial while steps remain unseen', () => {
    const state = completeTutorial(createInitialTutorialState(), 'Move');
    expect(state.completed).toBe(false);
  });

  it('completes when unseen empties, even with steps still queued', () => {
    // The AS3 checks tutorialArrayUnseen.length, not the queue.
    const state: TutorialState = {
      ...createInitialTutorialState(),
      on: true,
      unseen: [],
      queue: ['Weakness'],
    };
    const next = completeTutorial(state, 'Move');

    expect(next.completed).toBe(true);
    expect(next.on).toBe(false);
    expect(next.queue).toEqual(['Weakness']);
  });

  it('finishes as soon as unseen empties, leaving queued steps unshown', () => {
    let state: TutorialState = { ...createInitialTutorialState(), on: true };
    const context = ctx({
      levelMode: 'Flag',
      reloadTimeSecondary: 0,
      equippedWeapons: ['Cannon', 'Rockets'],
      enemyStrengthTrigger: true,
      enemyWeaknessTrigger: true,
      currentWorldAndLevel: [2, 1],
      movementKeyHeld: true,
    });

    // Every mode has to be visited or the mode-gated steps never leave unseen:
    // CollectFlags needs Flag, NoMoveTowerMode needs Tower, DefendBottom needs
    // Defense.
    const modes = ['Normal', 'Flag', 'Tower', 'Defense'];

    for (let step = 0; step < 50 && !state.completed; step += 1) {
      for (const levelMode of modes) {
        state = addTutorialsToQueue(state, { ...context, levelMode });
      }
      const { state: taken, tutorial } = takeNextTutorial(state);
      state = taken;
      if (tutorial) state = completeTutorial(state, tutorial);
    }

    expect(state.completed).toBe(true);
    expect(state.on).toBe(false);
    expect(state.unseen).toEqual([]);

    // Faithful quirk: once the opening chain (Move -> AimShoot -> KillEnemies
    // -> Objective) is done, every remaining step becomes eligible at once and
    // unseen drains in a single pass. Completing the very next step then finds
    // unseen empty and ends the tutorial — with the rest still queued and never
    // shown. In the real game modes cannot change mid-level, so this drains
    // more gradually, but the rule is the same: completion tracks `unseen`, not
    // `queue` or `done`.
    expect(state.done.length).toBeLessThan(12);
    expect(state.queue.length).toBeGreaterThan(0);
    expect(state.done.slice(0, 4)).toEqual(['Move', 'AimShoot', 'KillEnemies', 'Objective']);
  });
});
