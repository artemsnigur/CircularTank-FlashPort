/**
 * The `Main` slice of the save format — the last 7 non-computed slot fields.
 *
 * All seven are booleans stored via `booleanToNumber`, so each is a single
 * "1" or "0". Note `numberToBoolean` compares against exactly 1, so any other
 * value reads as false — which is also the safe default for a one-shot flag:
 * worst case a hint shows once more than it should.
 */

import { booleanToNumber, numberToBoolean } from '../save/saveCodec';
import { readField } from '../save/saveString';
import type { SaveField } from '../save/saveString';
import { createInitialMainFlags, UI_HINT_IDS } from './mainFlags';
import type { MainFlags, UiHintId } from './mainFlags';

/** Save key for each hint, from `SaveManager.updateSaveStringSlot`. */
export const HINT_SAVE_KEYS: Readonly<Record<UiHintId, string>> = {
  ButtonLevel: 'ubl',
  ButtonPlayLevel: 'ubpl',
  ButtonNextLevel: 'ubnl',
  ButtonSquarePage: 'ubsp',
  ButtonUpgrades: 'ubu',
  DifficultyChosen: 'hdc',
};

export const EXTRA_MONEY_KEY = 'emg';

export function encodeMainFlagFields(flags: MainFlags): SaveField[] {
  const fields: SaveField[] = UI_HINT_IDS.map((id) => ({
    key: HINT_SAVE_KEYS[id],
    value: String(booleanToNumber(flags.uiHints[id])),
  }));

  fields.push({
    key: EXTRA_MONEY_KEY,
    value: String(booleanToNumber(flags.extraMoneyGiven)),
  });

  return fields;
}

export function decodeMainFlagFields(fields: readonly SaveField[]): MainFlags {
  const flags = createInitialMainFlags();

  const bool = (key: string, fallback: boolean): boolean => {
    const raw = readField(fields, key);
    if (raw === undefined || raw === '') return fallback;
    return numberToBoolean(Number(raw));
  };

  for (const id of UI_HINT_IDS) {
    flags.uiHints[id] = bool(HINT_SAVE_KEYS[id], flags.uiHints[id]);
  }
  flags.extraMoneyGiven = bool(EXTRA_MONEY_KEY, flags.extraMoneyGiven);

  return flags;
}
