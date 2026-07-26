import { describe, expect, it } from 'vitest';
import {
  activeSlot,
  chooseWeapon,
  createInitialLoadout,
  DEFAULT_EQUIPPED,
  equipPrimary,
  equippedPrimaryNames,
  equipSecondary,
  hasTwoPrimaries,
  isValidPrimaryName,
  isValidSecondaryName,
  NO_WEAPON,
  unequipPrimary,
} from './loadout';
import {
  decodeLoadoutFields,
  encodeLoadoutFields,
  EQUIPPED_WEAPONS_KEY,
  PRIMARY_WEAPON_KEY,
  SECONDARY_WEAPON_KEY,
} from './loadoutSave';
import { PRIMARY_UPGRADES, SECONDARY_UPGRADES } from '../upgrades/upgradeData';
import { SAVE_SLOT_FIELDS } from '../save/saveSchema';
import { buildSlotBody, EMPTY_SAVE_STRING, parseSlotFields, writeSlot } from '../save/saveString';
import { encodeAchievementFields } from '../achievements/achievementSave';
import { createInitialStates } from '../achievements/achievementState';
import { createInitialLevelSelectData, encodeLevelSelectFields } from '../levels/levelProgressSave';
import { encodeUpgradeFields } from '../upgrades/upgradeSave';
import { createInitialUpgradeState } from '../upgrades/upgradeState';
import { encodeTutorialFields } from '../tutorial/tutorialSave';
import { createInitialTutorialState } from '../tutorial/tutorialState';
import { encodeEnemyKnowledgeFields } from '../enemies/enemyKnowledgeSave';
import { createInitialKnownEnemies } from '../enemies/enemyKnowledge';

describe('initial loadout', () => {
  it('matches the ScreenGame.as initialisers', () => {
    const state = createInitialLoadout();
    expect(state.equippedWeapons).toEqual(['Cannon', 'None']);
    expect(state.primaryWeapon).toBe('Cannon');
    expect(state.secondaryWeapon).toBe('Mine');
  });

  it('starts with the two free starter weapons', () => {
    // Cannon and Mine are the level-1 starters from upgradeData.
    const state = createInitialLoadout();
    expect(PRIMARY_UPGRADES.find((u) => u.name === state.primaryWeapon)?.startLevel).toBe(1);
    expect(SECONDARY_UPGRADES.find((u) => u.name === state.secondaryWeapon)?.startLevel).toBe(1);
  });

  it('does not share the default array between instances', () => {
    const a = createInitialLoadout();
    a.equippedWeapons[1] = 'MiniGun';
    expect(createInitialLoadout().equippedWeapons).toEqual([...DEFAULT_EQUIPPED]);
  });
});

describe('name validation', () => {
  it('accepts every primary display name plus the empty sentinel', () => {
    for (const u of PRIMARY_UPGRADES) expect(isValidPrimaryName(u.name), u.name).toBe(true);
    expect(isValidPrimaryName(NO_WEAPON)).toBe(true);
  });

  it('accepts every secondary display name but not the sentinel', () => {
    for (const u of SECONDARY_UPGRADES) expect(isValidSecondaryName(u.name), u.name).toBe(true);
    expect(isValidSecondaryName(NO_WEAPON)).toBe(false);
  });

  it('rejects an id where a display name is expected', () => {
    // "Big Cannon" is stored, not "BigCannon" — the spacing is load-bearing.
    expect(isValidPrimaryName('Big Cannon')).toBe(true);
    expect(isValidPrimaryName('BigCannon')).toBe(false);
  });

  it('keeps primary and secondary namespaces separate', () => {
    expect(isValidPrimaryName('Mine')).toBe(false);
    expect(isValidSecondaryName('Cannon')).toBe(false);
  });
});

describe('equipPrimary', () => {
  it('fills a slot', () => {
    const state = equipPrimary(createInitialLoadout(), 2, 'MiniGun');
    expect(state.equippedWeapons).toEqual(['Cannon', 'MiniGun']);
  });

  it('clears the other slot when the same weapon is equipped twice', () => {
    // ButtonEquipSlot.as: a weapon can only occupy one slot.
    let state = equipPrimary(createInitialLoadout(), 2, 'MiniGun');
    state = equipPrimary(state, 1, 'MiniGun');
    expect(state.equippedWeapons).toEqual(['MiniGun', 'None']);
  });

  it('never leaves duplicates across any pair of operations', () => {
    let state = createInitialLoadout();
    for (const name of PRIMARY_UPGRADES.map((u) => u.name)) {
      state = equipPrimary(state, 1, name);
      state = equipPrimary(state, 2, name);
      const [a, b] = state.equippedWeapons;
      expect(a === NO_WEAPON || a !== b).toBe(true);
    }
  });

  it('replaces without touching the other slot when they differ', () => {
    let state = equipPrimary(createInitialLoadout(), 2, 'MiniGun');
    state = equipPrimary(state, 1, 'Shotgun');
    expect(state.equippedWeapons).toEqual(['Shotgun', 'MiniGun']);
  });

  it('allows both slots to be empty', () => {
    let state = unequipPrimary(createInitialLoadout(), 1);
    state = unequipPrimary(state, 2);
    expect(state.equippedWeapons).toEqual(['None', 'None']);
  });

  it('ignores an invalid name', () => {
    const state = createInitialLoadout();
    expect(equipPrimary(state, 1, 'Rocket Launcher')).toBe(state);
  });

  it('does not mutate the state it was given', () => {
    const state = createInitialLoadout();
    equipPrimary(state, 2, 'MiniGun');
    expect(state.equippedWeapons).toEqual(['Cannon', 'None']);
  });
});

describe('chooseWeapon', () => {
  it('makes a slot the active primary', () => {
    let state = equipPrimary(createInitialLoadout(), 2, 'Shotgun');
    state = chooseWeapon(state, 2);
    expect(state.primaryWeapon).toBe('Shotgun');
    expect(activeSlot(state)).toBe(2);
  });

  it('sets the active primary to None when the slot is empty', () => {
    // The AS3 assigns unconditionally; every weapon comparison then fails.
    const state = chooseWeapon(createInitialLoadout(), 2);
    expect(state.primaryWeapon).toBe('None');
    expect(activeSlot(state)).toBeNull();
  });

  it('cycles between two filled slots', () => {
    let state = equipPrimary(createInitialLoadout(), 2, 'Laser Cannon');
    state = chooseWeapon(state, 2);
    expect(state.primaryWeapon).toBe('Laser Cannon');
    state = chooseWeapon(state, 1);
    expect(state.primaryWeapon).toBe('Cannon');
  });
});

describe('equipSecondary', () => {
  it('swaps the special', () => {
    expect(equipSecondary(createInitialLoadout(), 'Rockets').secondaryWeapon).toBe('Rockets');
  });

  it('ignores an invalid name', () => {
    const state = createInitialLoadout();
    expect(equipSecondary(state, 'Cannon')).toBe(state);
  });
});

describe('queries', () => {
  it('reports two primaries only when both slots are filled', () => {
    const one = createInitialLoadout();
    expect(hasTwoPrimaries(one)).toBe(false);
    expect(hasTwoPrimaries(equipPrimary(one, 2, 'MiniGun'))).toBe(true);
  });

  it('lists only filled slots', () => {
    expect(equippedPrimaryNames(createInitialLoadout())).toEqual(['Cannon']);
  });
});

describe('save round trip', () => {
  it('emits the three fields the schema declares for ScreenGame', () => {
    const fields = encodeLoadoutFields(createInitialLoadout());
    expect(fields).toHaveLength(3);

    const schemaKeys = SAVE_SLOT_FIELDS.filter((f) => f.owner === 'ScreenGame').map((f) => f.key);
    expect(fields.map((f) => f.key).sort()).toEqual(schemaKeys.sort());
  });

  it('round-trips the default loadout', () => {
    const state = createInitialLoadout();
    expect(decodeLoadoutFields(encodeLoadoutFields(state))).toEqual(state);
  });

  it('round-trips names containing spaces', () => {
    let state = equipPrimary(createInitialLoadout(), 1, 'Timed Bomb Cannon');
    state = equipPrimary(state, 2, 'Gummy Bear Cannon');
    state = chooseWeapon(state, 2);
    state = equipSecondary(state, 'Magic Bunny');

    expect(decodeLoadoutFields(encodeLoadoutFields(state))).toEqual(state);
  });

  it('round-trips an empty second slot', () => {
    const state = createInitialLoadout();
    const encoded = encodeLoadoutFields(state);
    expect(encoded.find((f) => f.key === EQUIPPED_WEAPONS_KEY)?.value).toBe('Cannon,None');
    expect(decodeLoadoutFields(encoded).equippedWeapons).toEqual(['Cannon', 'None']);
  });

  it('round-trips both slots empty', () => {
    let state = unequipPrimary(createInitialLoadout(), 1);
    state = unequipPrimary(state, 2);
    state = chooseWeapon(state, 1);
    expect(decodeLoadoutFields(encodeLoadoutFields(state))).toEqual(state);
  });

  it('survives a trip through the save-string container', () => {
    const state = equipSecondary(createInitialLoadout(), 'Ice Grenade');
    const text = writeSlot(EMPTY_SAVE_STRING, 1, buildSlotBody(encodeLoadoutFields(state)));
    expect(decodeLoadoutFields(parseSlotFields(text, 1))).toEqual(state);
  });

  it('keeps pw and sw distinct now the collision is fixed', () => {
    // In the original, `pw` was written twice and previousWorld clobbered
    // primaryWeapon on load.
    const state = equipSecondary(createInitialLoadout(), 'Shield');
    const fields = encodeLoadoutFields(state);
    expect(fields.find((f) => f.key === PRIMARY_WEAPON_KEY)?.value).toBe('Cannon');
    expect(fields.find((f) => f.key === SECONDARY_WEAPON_KEY)?.value).toBe('Shield');
  });

  it('falls back to defaults when fields are absent', () => {
    expect(decodeLoadoutFields([])).toEqual(createInitialLoadout());
  });

  it('rejects an unrecognised weapon rather than disabling firing', () => {
    const decoded = decodeLoadoutFields([
      { key: EQUIPPED_WEAPONS_KEY, value: 'Cannon,Death Ray' },
      { key: PRIMARY_WEAPON_KEY, value: 'Death Ray' },
      { key: SECONDARY_WEAPON_KEY, value: 'Nuke' },
    ]);
    expect(decoded.equippedWeapons).toEqual(['Cannon', 'None']);
    expect(decoded.primaryWeapon).toBe('Cannon');
    expect(decoded.secondaryWeapon).toBe('Mine');
  });

  it('empties trailing slots when the stored list is short', () => {
    const decoded = decodeLoadoutFields([{ key: EQUIPPED_WEAPONS_KEY, value: 'Shotgun' }]);
    expect(decoded.equippedWeapons).toEqual(['Shotgun', 'None']);
  });

  it('completes the save format outside Main — 54 of 63 fields', () => {
    const all = [
      ...encodeAchievementFields({
        states: createInitialStates(),
        totals: { enemyKills: 0, moneyEarned: 0 },
      }),
      ...encodeLevelSelectFields(createInitialLevelSelectData()),
      ...encodeUpgradeFields(createInitialUpgradeState()),
      ...encodeTutorialFields(createInitialTutorialState()),
      ...encodeEnemyKnowledgeFields(createInitialKnownEnemies()),
      ...encodeLoadoutFields(createInitialLoadout()),
    ];

    expect(all).toHaveLength(54);
    expect(new Set(all.map((f) => f.key)).size).toBe(54);

    const text = writeSlot(EMPTY_SAVE_STRING, 2, buildSlotBody(all));
    expect(decodeLoadoutFields(parseSlotFields(text, 2))).toEqual(createInitialLoadout());
  });
});
