/**
 * Port of the achievement evaluation logic in
 * `SWFimported/scripts/ScreenAchievements.as`.
 *
 * The AS3 keeps 36 loose statics (`achievementKills1State`, …) and reaches them
 * with computed property access — `ScreenAchievements["achievement" + name +
 * "State"]`. That is untypeable and unsearchable, so state lives in a keyed
 * record here. The save format is unchanged: each state is still written as
 * `state + 1` (see `saveSchema.ts`).
 *
 * ── The state model ───────────────────────────────────────────────────────
 * Every achievement holds a single number:
 *
 *    -1  not earned                      (the AS3 default)
 *     0  earned, difficulty irrelevant
 *     1  earned on Easy
 *     2  earned on Medium
 *     3  earned on Hard
 *
 * The `-1` default is why the save encodes `state + 1`: it shifts the range to
 * 0..4 so it fits in the single digit the format allows.
 *
 * An achievement is (re-)won whenever `state < winStateValue`, so clearing a
 * difficulty-sensitive achievement on Hard after previously clearing it on Easy
 * *upgrades* it from 1 to 3. Achievements where difficulty is irrelevant have a
 * `winStateValue` of 0 and so can only ever be won once.
 */

import { ACHIEVEMENTS } from './achievementData';
import type { AchievementSpec } from './achievementData';
import type { Difficulty } from '../config/constants';

export const NOT_EARNED = -1;

/** `achievement<Id>State` for every achievement. */
export type AchievementStates = Record<string, number>;

/** ScreenAchievements.as difficulty -> winStateValue mapping. */
export const DIFFICULTY_STATE: Record<Difficulty, number> = {
  Easy: 1,
  Medium: 2,
  Hard: 3,
};

const SPEC_BY_ID = new Map<string, AchievementSpec>(ACHIEVEMENTS.map((a) => [a.id, a]));

export function getAchievement(id: string): AchievementSpec | undefined {
  return SPEC_BY_ID.get(id);
}

/** Fresh state: every achievement at -1. */
export function createInitialStates(): AchievementStates {
  const states: AchievementStates = {};
  for (const spec of ACHIEVEMENTS) states[spec.id] = NOT_EARNED;
  return states;
}

/**
 * The value an achievement is measured against.
 *
 * `Number` compares against `requirement`; `Boolean` is a flag; `NumberArray`
 * carries three tier counts — [hardCount, mediumCount, easyCount] — and the
 * earned difficulty is derived from which of them clears the requirement.
 */
export type AchievementValue = number | boolean | readonly [number, number, number];

/**
 * `winStateValue` for a plain Number/Boolean achievement: the current
 * difficulty when it matters, otherwise 0.
 */
export function winStateFor(spec: AchievementSpec, difficulty: Difficulty): number {
  return spec.difficultyMatters ? DIFFICULTY_STATE[difficulty] : 0;
}

export interface EvaluationResult {
  /** True when the achievement was newly earned or upgraded. */
  won: boolean;
  /** The state to store. Unchanged from `currentState` when `won` is false. */
  newState: number;
}

/**
 * Pure evaluation of one achievement — the `switch (type)` block at the end of
 * `achievementCheck`, with no side effects.
 *
 * The AS3 also mutates `PartGameArea.temp*` flags to consume one-shot events
 * when `checkEveryFrame` is false. That consumption belongs to whatever feeds
 * the value in, not here; see `evaluateAll` for the query/commit split.
 */
export function evaluate(
  spec: AchievementSpec,
  value: AchievementValue,
  currentState: number,
  difficulty: Difficulty,
): EvaluationResult {
  const unchanged: EvaluationResult = { won: false, newState: currentState };

  switch (spec.type) {
    case 'Number': {
      const numeric = typeof value === 'number' ? value : 0;
      const winState = winStateFor(spec, difficulty);
      if (numeric >= spec.requirement && currentState < winState) {
        return { won: true, newState: winState };
      }
      return unchanged;
    }

    case 'Boolean': {
      // AS3 `Boolean(theVariable)`: any truthy value counts, including a
      // non-zero number.
      const flag = Boolean(value);
      const winState = winStateFor(spec, difficulty);
      if (flag && currentState < winState) {
        return { won: true, newState: winState };
      }
      return unchanged;
    }

    case 'NumberArray': {
      // The three counts are checked hardest-first, so the *highest* difficulty
      // that clears the requirement determines the state. -1 when none do,
      // which can never beat a currentState of -1 — so nothing is won.
      const counts = Array.isArray(value) ? value : [0, 0, 0];
      let winState = -1;
      if ((counts[0] ?? 0) >= spec.requirement) winState = 3;
      else if ((counts[1] ?? 0) >= spec.requirement) winState = 2;
      else if ((counts[2] ?? 0) >= spec.requirement) winState = 1;

      if (currentState < winState) return { won: true, newState: winState };
      return unchanged;
    }

    default: {
      // Exhaustiveness guard: adding a type to AchievementType without
      // handling it here becomes a compile error.
      const never: never = spec.type;
      throw new Error(`Unhandled achievement type: ${String(never)}`);
    }
  }
}

/**
 * `achievementCheck(name, checkEveryFrame = true)` — a non-mutating query.
 *
 * Used for live UI feedback ("this is about to unlock"). Returns false for an
 * unknown id, matching the AS3's `obtainData == null` early return.
 */
export function wouldWin(
  id: string,
  value: AchievementValue,
  states: AchievementStates,
  difficulty: Difficulty,
): boolean {
  const spec = SPEC_BY_ID.get(id);
  if (!spec) return false;
  return evaluate(spec, value, states[id] ?? NOT_EARNED, difficulty).won;
}

/** Supplies the current value for each achievement id. */
export type AchievementValueSource = (spec: AchievementSpec) => AchievementValue;

export interface UpdateResult {
  /** Ids newly earned or upgraded this pass — the AS3 `newAchievementsArray`. */
  newlyEarned: string[];
  /** States after the pass. A new object; the input is not mutated. */
  states: AchievementStates;
}

/**
 * `ScreenAchievements.updateAchievements()` — evaluates every achievement in
 * display order and collects the ones that fired.
 *
 * The AS3 mutates statics in place and then calls
 * `SaveManager.saveStatsAchievements()`. Persistence is the caller's job here,
 * so this stays pure and testable.
 */
export function updateAchievements(
  states: AchievementStates,
  getValue: AchievementValueSource,
  difficulty: Difficulty,
): UpdateResult {
  const next: AchievementStates = { ...states };
  const newlyEarned: string[] = [];

  for (const spec of ACHIEVEMENTS) {
    const current = next[spec.id] ?? NOT_EARNED;
    const { won, newState } = evaluate(spec, getValue(spec), current, difficulty);
    if (won) {
      next[spec.id] = newState;
      newlyEarned.push(spec.id);
    }
  }

  return { newlyEarned, states: next };
}

/* ── Save encoding ────────────────────────────────────────────────────────── */

/**
 * Save-string field stem for an achievement, matching `updateSaveStringSlot`.
 * e.g. "Kills1" -> "ak1s", "PoisonDoctor" -> "apds".
 *
 * The AS3 keys are hand-abbreviated with no derivable rule, so they are listed
 * explicitly rather than guessed. Verified against saveSchema.ts by test.
 */
export const ACHIEVEMENT_SAVE_KEYS: Readonly<Record<string, string>> = {
  Kills1: 'ak1s',
  Kills2: 'ak2s',
  Kills3: 'ak3s',
  Money1: 'am1s',
  Money2: 'am2s',
  Money3: 'am3s',
  MaxedPrimary1: 'amp1s',
  MaxedPrimary2: 'amp2s',
  MaxedPrimary3: 'amp3s',
  MaxedSecondary1: 'ams1s',
  MaxedSecondary2: 'ams2s',
  MaxedSecondary3: 'ams3s',
  PoisonDoctor: 'apds',
  FreezeTemperamental: 'afts',
  TrapMine: 'atms',
  AddictedCake: 'aacs',
  Racing: 'ars',
  Idle: 'ais',
  Stars1: 'as1s',
  Stars2: 'as2s',
  Stars3: 'as3s',
  Flags1: 'af1s',
  Flags2: 'af2s',
  Flags3: 'af3s',
  Towers1: 'at1s',
  Towers2: 'at2s',
  Towers3: 'at3s',
  Shields1: 'ash1s',
  Shields2: 'ash2s',
  Shields3: 'ash3s',
  Bosses1: 'ab1s',
  Bosses2: 'ab2s',
  Bosses3: 'ab3s',
  FlagNoWeapons: 'afnws',
  DefensiveBombs: 'adbs',
  BossOnlySpecial: 'aboss',
};

/**
 * Encodes a state for the save string: `state + 1`, so -1 becomes 0.
 * See `saveSchema.ts`, codec `plusOne`.
 */
export function encodeState(state: number): number {
  return state + 1;
}

/** Inverse of `encodeState`. */
export function decodeState(encoded: number): number {
  return encoded - 1;
}
