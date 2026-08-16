/**
 * The weapon loadout from `SWFimported/scripts/ScreenGame.as` — the three
 * statics the save format calls `ew`, `pw` and `sw`.
 *
 * Scoped deliberately to the loadout. The rest of ScreenGame (flag models,
 * enemy stat tables, the level-running loop) is untouched.
 *
 * ── The three values ──────────────────────────────────────────────────────
 *   equippedWeapons  `["Cannon", "None"]` — two primary slots
 *   primaryWeapon    `"Cannon"` — the slot currently in hand
 *   secondaryWeapon  `"Mine"` — the equipped special
 *
 * All three hold **display names** from `ScreenUpgrades.primaryNameArray` /
 * `secondaryNameArray` — "Big Cannon", "Ice Grenade", "Magic Bunny" — not ids.
 * Gameplay compares them as strings (`if (primaryWeapon == "Timed Bomb
 * Cannon")` in PartGameArea.as:3730), and they are saved verbatim, so the
 * spacing is load-bearing. `upgradeData.ts` already carries the same strings as
 * `UpgradeSpec.name`, which is what the validation below checks against.
 */

import { PRIMARY_UPGRADES, SECONDARY_UPGRADES } from '../upgrades/upgradeData';

/** Sentinel for an empty primary slot. */
export const NO_WEAPON = 'None';

/** ScreenGame.as initialisers. */
export const DEFAULT_EQUIPPED: readonly [string, string] = ['Cannon', NO_WEAPON];
const DEFAULT_PRIMARY = 'Cannon';
const DEFAULT_SECONDARY = 'Mine';

/** There are exactly two primary slots. */
export const PRIMARY_SLOT_COUNT = 2;

export interface LoadoutState {
  /** Two primary slots; either may be `NO_WEAPON`. */
  equippedWeapons: [string, string];
  primaryWeapon: string;
  secondaryWeapon: string;
}

export function createInitialLoadout(): LoadoutState {
  return {
    equippedWeapons: [...DEFAULT_EQUIPPED] as [string, string],
    primaryWeapon: DEFAULT_PRIMARY,
    secondaryWeapon: DEFAULT_SECONDARY,
  };
}

const PRIMARY_NAMES = new Set(PRIMARY_UPGRADES.map((u) => u.name));
const SECONDARY_NAMES = new Set(SECONDARY_UPGRADES.map((u) => u.name));

/** Every legal value for a primary slot, including the empty sentinel. */
export const isValidPrimaryName = (name: string): boolean =>
  name === NO_WEAPON || PRIMARY_NAMES.has(name);

export const isValidSecondaryName = (name: string): boolean => SECONDARY_NAMES.has(name);

/**
 * `ButtonEquipSlot.onReleaseHandler` — puts a primary into a slot.
 *
 * The slot is 1-based, matching the AS3's `this.slot`. A weapon can only occupy
 * one slot at a time: equipping something that is already in the *other* slot
 * clears it there first, so the two slots never hold duplicates.
 *
 * Returns a new state; the input is not mutated. An invalid name or slot is
 * ignored rather than corrupting the loadout.
 */
export function equipPrimary(state: LoadoutState, slot: 1 | 2, name: string): LoadoutState {
  if (!isValidPrimaryName(name)) return state;

  const equippedWeapons: [string, string] = [...state.equippedWeapons];
  const otherIndex = slot === 1 ? 1 : 0;

  // Clearing the other slot only matters for a real weapon; two empty slots are
  // fine, and the AS3 comparison would never match "None" against a name.
  if (name !== NO_WEAPON && equippedWeapons[otherIndex] === name) {
    equippedWeapons[otherIndex] = NO_WEAPON;
  }
  equippedWeapons[slot - 1] = name;

  return { ...state, equippedWeapons };
}

/** Empties a slot. */
export function unequipPrimary(state: LoadoutState, slot: 1 | 2): LoadoutState {
  return equipPrimary(state, slot, NO_WEAPON);
}

/**
 * `ScreenGame.chooseWeapon(weaponNumber)` — makes a slot the active primary.
 *
 * The AS3 assigns unconditionally, so selecting an empty slot sets
 * `primaryWeapon` to "None". That is reproduced: the shift/Q switch cycles
 * slots regardless of whether the second is filled, and gameplay's weapon
 * comparisons simply all fail for "None".
 */
export function chooseWeapon(state: LoadoutState, slot: 1 | 2): LoadoutState {
  return { ...state, primaryWeapon: state.equippedWeapons[slot - 1] };
}

/** Equips a special. Invalid names are ignored. */
export function equipSecondary(state: LoadoutState, name: string): LoadoutState {
  if (!isValidSecondaryName(name)) return state;
  return { ...state, secondaryWeapon: name };
}

/**
 * The slot a level should start on — `ScreenGame.as:460-469`.
 *
 *     if (equippedWeapons[0] != "None") { chooseWeapon(1); currentWeapon = 1; }
 *     else                              { chooseWeapon(2); currentWeapon = 2; }
 *
 * ── Why the stored `primaryWeapon` is not trusted ─────────────────────────
 * `ButtonEquipSlot.onPressHandler` writes a slot and **never touches
 * `primaryWeapon`**, so the two can disagree the moment the equip screen exists:
 * equip a new weapon into slot 1 and `primaryWeapon` still names the one that
 * was there, which is now in no slot at all. The AS3 covers that by re-deriving
 * on entry rather than reading the saved value, and so does this.
 *
 * Slot 2 is the fallback rather than an error: slot 1 really can be empty, by
 * equipping its weapon into slot 2 (which clears slot 1 — see `equipPrimary`).
 * Both empty is unreachable through the UI, because there is no unequip; it
 * still returns `NO_WEAPON` rather than throwing, since a corrupt save should
 * not stop a level booting.
 */
export function resolveActivePrimary(state: LoadoutState): string {
  return state.equippedWeapons[0] !== NO_WEAPON
    ? state.equippedWeapons[0]
    : state.equippedWeapons[1];
}

/** Slot the level should start on, matching `resolveActivePrimary`. */
export function resolveActiveSlot(state: LoadoutState): 1 | 2 {
  return state.equippedWeapons[0] !== NO_WEAPON ? 1 : 2;
}

/**
 * The slot Shift/Q moves to, or null when the switch is refused —
 * `ScreenGame.update` (`:481-500`).
 *
 * ── A refusal, not a wrap ─────────────────────────────────────────────────
 * The AS3 toggles 1 <-> 2 **only if the target slot holds a weapon**; with one
 * slot empty the press does nothing at all — no sound, no reload change, no
 * `chooseWeapon` call with any effect. That is the whole reason the equip
 * screen matters: two chosen weapons, toggled, rather than a ring through
 * everything owned.
 *
 * Returning null rather than `current` makes "nothing happened" explicit at the
 * call site, so a blocked press cannot accidentally run the switch path — which
 * is how a rapid-fire exploit got in once before.
 */
export function nextSlot(state: LoadoutState, current: 1 | 2): 1 | 2 | null {
  const target: 1 | 2 = current === 1 ? 2 : 1;
  return state.equippedWeapons[target - 1] !== NO_WEAPON ? target : null;
}

/** Slot (1-based) currently in hand, or null when the active primary is unset. */
export function activeSlot(state: LoadoutState): 1 | 2 | null {
  if (state.equippedWeapons[0] === state.primaryWeapon && state.primaryWeapon !== NO_WEAPON) {
    return 1;
  }
  if (state.equippedWeapons[1] === state.primaryWeapon && state.primaryWeapon !== NO_WEAPON) {
    return 2;
  }
  return null;
}

/** True when both slots hold a real weapon — the ShiftWeapon tutorial's trigger. */
export function hasTwoPrimaries(state: LoadoutState): boolean {
  return state.equippedWeapons.every((name) => name !== NO_WEAPON);
}

/** Names of the equipped primaries, excluding empty slots. */
export function equippedPrimaryNames(state: LoadoutState): string[] {
  return state.equippedWeapons.filter((name) => name !== NO_WEAPON);
}
