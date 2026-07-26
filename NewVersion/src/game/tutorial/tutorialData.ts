/**
 * Tutorial tables from `SWFimported/scripts/PartTutorial.as`.
 *
 * Hand-written rather than generated: unlike the audio/achievement/upgrade
 * tables, these are a dozen heterogeneous `if` branches with conditions that
 * reference five different classes. Extracting them mechanically would produce
 * something less readable than the conditions themselves, so they are
 * transcribed with the AS3 line noted on each.
 */

/** The 12 tutorial steps, in the order PartTutorial declares them. */
export const TUTORIAL_IDS = [
  'Move',
  'AimShoot',
  'KillEnemies',
  'Objective',
  'CollectFlags',
  'Pause',
  'Special',
  'NoMoveTowerMode',
  'DefendBottom',
  'ShiftWeapon',
  'Strength',
  'Weakness',
] as const;

export type TutorialId = (typeof TUTORIAL_IDS)[number];

/** PartTutorial.as `tutorialArrayUnseen` initialiser. */
export const INITIAL_UNSEEN: readonly TutorialId[] = [
  'AimShoot',
  'KillEnemies',
  'Objective',
  'CollectFlags',
  'Pause',
  'Special',
  'NoMoveTowerMode',
  'DefendBottom',
  'ShiftWeapon',
  'Strength',
  'Weakness',
];

/** `tutorialArrayQueue` initialiser — Move is queued from the start. */
export const INITIAL_QUEUE: readonly TutorialId[] = ['Move'];

/**
 * Steps that return to `unseen` when a level ends
 * (`moveTriggerTutorialsFromQueueToUnseen`).
 *
 * These are context-dependent: their trigger needs a particular level mode or
 * loadout, so a queued-but-unshown one is put back to wait for a level where it
 * makes sense. Everything else stays queued across levels.
 *
 * Note they are `unshift`ed, so they go to the *front* of unseen.
 */
export const TRIGGER_TUTORIALS: ReadonlySet<TutorialId> = new Set([
  'Special',
  'CollectFlags',
  'NoMoveTowerMode',
  'DefendBottom',
  'ShiftWeapon',
  'Strength',
  'Weakness',
]);

/**
 * The SWF runs at 30 fps, so these frame counts are also the AS3's real
 * durations. `null` means the step has no auto-advance and waits indefinitely
 * for its completion condition.
 */
const AS3_FPS = 30;

export const CONTINUE_ANYWAY_FRAMES: Readonly<Record<TutorialId, number | null>> = {
  Move: null, // never auto-advances; waits for a movement key
  AimShoot: 120,
  KillEnemies: 240,
  Objective: null, // waits for the level to be completed
  CollectFlags: 240,
  Pause: 150,
  Special: 180,
  NoMoveTowerMode: 180,
  DefendBottom: 180,
  ShiftWeapon: 210,
  Strength: 210,
  Weakness: 210,
};

/** Same values in milliseconds, for a frame-rate-independent runtime. */
export const CONTINUE_ANYWAY_MS: Readonly<Record<TutorialId, number | null>> =
  Object.fromEntries(
    TUTORIAL_IDS.map((id) => {
      const frames = CONTINUE_ANYWAY_FRAMES[id];
      return [id, frames === null ? null : (frames / AS3_FPS) * 1000];
    }),
  ) as Record<TutorialId, number | null>;

/**
 * PartTutorial.as `tutorialContinueTimerMax` — how long a finished step stays
 * on screen before sliding out. Steps the player actively dismissed (Move,
 * AimShoot, Special) use 1 frame instead.
 */
export const CONTINUE_TIMER_FRAMES = 50;
export const CONTINUE_TIMER_MS = (CONTINUE_TIMER_FRAMES / AS3_FPS) * 1000;

/** Steps that dismiss immediately rather than lingering. */
export const INSTANT_DISMISS: ReadonlySet<TutorialId> = new Set([
  'Move',
  'AimShoot',
  'Special',
]);

/**
 * Prerequisite that must already be in `done` before a step can be queued.
 * From the `checkIfTutorialDone(...)` guard in each `addTutorialsToQueue`
 * branch.
 *
 * `Move` is the odd one out: its guard is `!checkIfTutorialDone("Move")`, i.e.
 * "not already done". It is expressed separately below because it is a
 * negation, not a prerequisite.
 */
export const PREREQUISITE: Readonly<Partial<Record<TutorialId, TutorialId>>> = {
  AimShoot: 'Move',
  KillEnemies: 'AimShoot',
  Objective: 'KillEnemies',
  CollectFlags: 'Objective',
  Pause: 'Objective',
  Special: 'Objective',
  NoMoveTowerMode: 'Objective',
  DefendBottom: 'Objective',
  ShiftWeapon: 'Objective',
  Strength: 'Objective',
  Weakness: 'Objective',
};
