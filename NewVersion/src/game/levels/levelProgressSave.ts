/**
 * The `ScreenLevelSelect` slice of the save format — 4 of the 63 slot fields.
 *
 * `wva` is the whole 9x45x3 progress table flattened to bare digits with no
 * separator, which only works because every medal count is 0-3. See
 * `saveCodec.numberArrayToShortString`.
 */

import {
  getWorldValuesArraysFromShortString,
  numberArrayToShortString,
  booleanToNumber,
  numberToBoolean,
} from '../save/saveCodec';
import { PREVIOUS_WORLD_KEY, readField } from '../save/saveString';
import type { SaveField } from '../save/saveString';
import { createEmptyProgress } from './levelProgress';
import type { LevelValues, ProgressTable } from './levelProgress';

export const WORLD_VALUES_KEY = 'wva';
const PREVIOUS_LEVEL_KEY = 'pl';
const PREVIOUS_LEVEL_WON_KEY = 'plw';

export interface LevelSelectSaveData {
  progress: ProgressTable;
  previousWorld: number;
  previousLevel: number;
  previousLevelWon: boolean;
}

/** ScreenLevelSelect.as static initialisers. */
export function createInitialLevelSelectData(): LevelSelectSaveData {
  return {
    progress: createEmptyProgress(),
    previousWorld: 1,
    previousLevel: 1,
    previousLevelWon: false,
  };
}

export function encodeLevelSelectFields(data: LevelSelectSaveData): SaveField[] {
  return [
    { key: WORLD_VALUES_KEY, value: numberArrayToShortString(data.progress, 3) },
    // `pw` in the AS3; renamed to avoid the collision with primaryWeapon.
    { key: PREVIOUS_WORLD_KEY, value: String(data.previousWorld) },
    { key: PREVIOUS_LEVEL_KEY, value: String(data.previousLevel) },
    {
      key: PREVIOUS_LEVEL_WON_KEY,
      value: String(booleanToNumber(data.previousLevelWon)),
    },
  ];
}

export function decodeLevelSelectFields(fields: readonly SaveField[]): LevelSelectSaveData {
  const defaults = createInitialLevelSelectData();

  const int = (key: string, fallback: number): number => {
    const raw = readField(fields, key);
    if (raw === undefined || raw === '') return fallback;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const encoded = readField(fields, WORLD_VALUES_KEY);
  const decoded = encoded ? getWorldValuesArraysFromShortString(encoded) : [];

  // A truncated save string loses its last incomplete world (see the codec).
  // Overlay whatever survived onto a correctly-shaped empty table so the
  // result always matches the real level tables.
  const progress = createEmptyProgress();
  for (let w = 0; w < Math.min(decoded.length, progress.length); w += 1) {
    for (let l = 0; l < Math.min(decoded[w].length, progress[w].length); l += 1) {
      const values = decoded[w][l];
      progress[w][l] = [values[0] ?? 0, values[1] ?? 0, values[2] ?? 0] as LevelValues;
    }
  }

  return {
    progress,
    previousWorld: int(PREVIOUS_WORLD_KEY, defaults.previousWorld),
    previousLevel: int(PREVIOUS_LEVEL_KEY, defaults.previousLevel),
    previousLevelWon: numberToBoolean(int(PREVIOUS_LEVEL_WON_KEY, 0)),
  };
}
