/**
 * The achievement slice of the save format — the first part of
 * `SaveManager.updateSaveStringSlot` / `loadVarsFromSaveString` that can
 * actually be wired up, now that `ScreenAchievements` is ported.
 *
 * Covers 38 of the 63 slot fields: the 36 achievement states plus the two
 * running totals (`ek` enemyKills, `me` moneyEarned). The AS3 writes all of
 * them with `+ 1`, which is what lets a state of -1 travel as a single digit.
 */

import { ACHIEVEMENTS } from './achievementData';
import {
  ACHIEVEMENT_SAVE_KEYS,
  createInitialStates,
  decodeState,
  encodeState,
  NOT_EARNED,
} from './achievementState';
import type { AchievementStates } from './achievementState';
import type { SaveField } from '../save/saveString';
import { readField } from '../save/saveString';

/** `ScreenAchievements.enemyKills` / `.moneyEarned`, both `+ 1` encoded. */
export interface AchievementTotals {
  enemyKills: number;
  moneyEarned: number;
}

export const ENEMY_KILLS_KEY = 'ek';
export const MONEY_EARNED_KEY = 'me';

export interface AchievementSaveData {
  states: AchievementStates;
  totals: AchievementTotals;
}

/** Serialises to the ordered fields the save string expects. */
export function encodeAchievementFields({ states, totals }: AchievementSaveData): SaveField[] {
  const fields: SaveField[] = [
    { key: ENEMY_KILLS_KEY, value: String(encodeState(totals.enemyKills)) },
    { key: MONEY_EARNED_KEY, value: String(encodeState(totals.moneyEarned)) },
  ];

  // Display order, matching updateSaveStringSlot's field order.
  for (const spec of ACHIEVEMENTS) {
    const key = ACHIEVEMENT_SAVE_KEYS[spec.id];
    if (!key) continue;
    const state = states[spec.id] ?? NOT_EARNED;
    fields.push({ key, value: String(encodeState(state)) });
  }

  return fields;
}

/**
 * Reads the achievement slice back out.
 *
 * A missing or unparseable field falls back to the default rather than
 * producing NaN — a partially-written save must still load, which is what the
 * AS3 achieves by leaving its statics at their initialisers.
 */
export function decodeAchievementFields(fields: readonly SaveField[]): AchievementSaveData {
  const number = (key: string, fallback: number): number => {
    const raw = readField(fields, key);
    if (raw === undefined || raw === '') return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const states = createInitialStates();
  for (const spec of ACHIEVEMENTS) {
    const key = ACHIEVEMENT_SAVE_KEYS[spec.id];
    if (!key) continue;
    // encodeState(NOT_EARNED) === 0, so 0 is the correct "absent" default.
    states[spec.id] = decodeState(number(key, encodeState(NOT_EARNED)));
  }

  return {
    states,
    totals: {
      enemyKills: decodeState(number(ENEMY_KILLS_KEY, encodeState(0))),
      moneyEarned: decodeState(number(MONEY_EARNED_KEY, encodeState(0))),
    },
  };
}
