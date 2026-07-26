/**
 * The `ScreenGame` loadout slice of the save format — 3 of the 63 slot fields,
 * and the last ones outside `Main`.
 *
 * `ew` is the two primary slots comma-joined; `pw` and `sw` are single names.
 * `pw` is the key whose duplicate cost `previousWorld` its value in the
 * original — see `saveString.ts`, where `previousWorld` was moved to `prw` so
 * this one can keep its natural pairing with `sw`.
 */

import { shortStringToStringArray, stringArrayToShortString } from '../save/saveCodec';
import { readField } from '../save/saveString';
import type { SaveField } from '../save/saveString';
import {
  createInitialLoadout,
  isValidPrimaryName,
  isValidSecondaryName,
  NO_WEAPON,
  PRIMARY_SLOT_COUNT,
} from './loadout';
import type { LoadoutState } from './loadout';

export const EQUIPPED_WEAPONS_KEY = 'ew';
export const PRIMARY_WEAPON_KEY = 'pw';
export const SECONDARY_WEAPON_KEY = 'sw';

export function encodeLoadoutFields(state: LoadoutState): SaveField[] {
  return [
    { key: EQUIPPED_WEAPONS_KEY, value: stringArrayToShortString(state.equippedWeapons) },
    { key: PRIMARY_WEAPON_KEY, value: state.primaryWeapon },
    { key: SECONDARY_WEAPON_KEY, value: state.secondaryWeapon },
  ];
}

/**
 * Reads the slice back, rejecting names that are not real weapons.
 *
 * Worth validating: an unrecognised primary would silently disable firing —
 * every `primaryWeapon == "..."` comparison in the gameplay code would fail and
 * no branch would set a reload time.
 */
export function decodeLoadoutFields(fields: readonly SaveField[]): LoadoutState {
  const defaults = createInitialLoadout();

  const rawEquipped = readField(fields, EQUIPPED_WEAPONS_KEY);
  const equippedWeapons: [string, string] = [...defaults.equippedWeapons];
  if (rawEquipped !== undefined) {
    const parsed = shortStringToStringArray(rawEquipped);
    for (let i = 0; i < PRIMARY_SLOT_COUNT; i += 1) {
      const name = parsed[i];
      // A short list leaves the remaining slots empty rather than defaulted, so
      // a save that genuinely had one slot free round-trips unchanged.
      equippedWeapons[i] = name !== undefined && isValidPrimaryName(name) ? name : NO_WEAPON;
    }
  }

  const rawPrimary = readField(fields, PRIMARY_WEAPON_KEY);
  const primaryWeapon =
    rawPrimary !== undefined && isValidPrimaryName(rawPrimary) ? rawPrimary : defaults.primaryWeapon;

  const rawSecondary = readField(fields, SECONDARY_WEAPON_KEY);
  const secondaryWeapon =
    rawSecondary !== undefined && isValidSecondaryName(rawSecondary)
      ? rawSecondary
      : defaults.secondaryWeapon;

  return { equippedWeapons, primaryWeapon, secondaryWeapon };
}
