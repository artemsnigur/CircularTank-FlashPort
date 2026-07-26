/**
 * The `ScreenUpgrades` slice of the save format — 4 of the 63 slot fields.
 *
 * The three level arrays travel as alphabet strings (0 -> "a" … 10 -> "k"),
 * which is why upgrade levels can never exceed 25 without the encoding
 * silently dropping them — see `saveCodec.numberArrayToAlphabetShortString`.
 */

import {
  alphabetShortStringToNumberArray,
  numberArrayToAlphabetShortString,
} from '../save/saveCodec';
import { readField } from '../save/saveString';
import type { SaveField } from '../save/saveString';
import { createInitialUpgradeState } from './upgradeState';
import type { UpgradeState } from './upgradeState';
import { MISC_UPGRADES, PRIMARY_UPGRADES, SECONDARY_UPGRADES } from './upgradeData';

export const MONEY_KEY = 'm';
export const PRIMARY_LEVELS_KEY = 'la';
export const MISC_LEVELS_KEY = 'lam';
export const SECONDARY_LEVELS_KEY = 'las';

export function encodeUpgradeFields(state: UpgradeState): SaveField[] {
  return [
    { key: MONEY_KEY, value: String(state.money) },
    { key: PRIMARY_LEVELS_KEY, value: numberArrayToAlphabetShortString(state.primary) },
    { key: MISC_LEVELS_KEY, value: numberArrayToAlphabetShortString(state.misc) },
    { key: SECONDARY_LEVELS_KEY, value: numberArrayToAlphabetShortString(state.secondary) },
  ];
}

/**
 * Reads the slice back.
 *
 * A short or absent level string is padded from the defaults rather than
 * producing an array of the wrong length, so a truncated save cannot desync the
 * level arrays from the upgrade tables.
 */
export function decodeUpgradeFields(fields: readonly SaveField[]): UpgradeState {
  const defaults = createInitialUpgradeState();

  const levels = (key: string, fallback: number[]): number[] => {
    const raw = readField(fields, key);
    if (raw === undefined) return [...fallback];
    const decoded = alphabetShortStringToNumberArray(raw);
    return fallback.map((value, i) => decoded[i] ?? value);
  };

  const rawMoney = readField(fields, MONEY_KEY);
  const money = rawMoney === undefined || rawMoney === '' ? defaults.money : Number(rawMoney);

  return {
    money: Number.isFinite(money) ? money : defaults.money,
    primary: levels(PRIMARY_LEVELS_KEY, defaults.primary),
    misc: levels(MISC_LEVELS_KEY, defaults.misc),
    secondary: levels(SECONDARY_LEVELS_KEY, defaults.secondary),
  };
}

/** Sanity bound: the encoding cannot represent a level above 25. */
export const MAX_ENCODABLE_LEVEL = 25;

/** True when every level is representable in the alphabet encoding. */
export function isEncodable(state: UpgradeState): boolean {
  return [...state.primary, ...state.misc, ...state.secondary].every(
    (level) => level >= 0 && level <= MAX_ENCODABLE_LEVEL,
  );
}

/** Array lengths the save format expects, for assertions. */
export const UPGRADE_COUNTS = {
  primary: PRIMARY_UPGRADES.length,
  misc: MISC_UPGRADES.length,
  secondary: SECONDARY_UPGRADES.length,
} as const;
