import { describe, expect, it } from 'vitest';
import {
  decodeUpgradeFields,
  encodeUpgradeFields,
  isEncodable,
  MAX_ENCODABLE_LEVEL,
  MONEY_KEY,
  PRIMARY_LEVELS_KEY,
  UPGRADE_COUNTS,
} from './upgradeSave';
import { createInitialUpgradeState } from './upgradeState';
import { SAVE_SLOT_FIELDS } from '../save/saveSchema';
import { buildSlotBody, EMPTY_SAVE_STRING, parseSlotFields, writeSlot } from '../save/saveString';
import { encodeAchievementFields } from '../achievements/achievementSave';
import { createInitialStates } from '../achievements/achievementState';
import { createInitialLevelSelectData, encodeLevelSelectFields } from '../levels/levelProgressSave';

describe('upgrade save round trip', () => {
  it('emits the four fields the schema declares for ScreenUpgrades', () => {
    const fields = encodeUpgradeFields(createInitialUpgradeState());
    expect(fields).toHaveLength(4);

    const schemaKeys = SAVE_SLOT_FIELDS.filter((f) => f.owner === 'ScreenUpgrades').map(
      (f) => f.key,
    );
    expect(fields.map((f) => f.key).sort()).toEqual(schemaKeys.sort());
  });

  it('round-trips a fresh profile', () => {
    const state = createInitialUpgradeState();
    expect(decodeUpgradeFields(encodeUpgradeFields(state))).toEqual(state);
  });

  it('round-trips a fully upgraded profile', () => {
    const state = createInitialUpgradeState();
    state.money = 987654;
    state.primary = state.primary.map(() => 10);
    state.misc = state.misc.map(() => 10);
    state.secondary = state.secondary.map(() => 10);

    expect(decodeUpgradeFields(encodeUpgradeFields(state))).toEqual(state);
  });

  it('round-trips a mixed profile', () => {
    const state = createInitialUpgradeState();
    state.money = 1234;
    state.primary[0] = 7;
    state.primary[5] = 3;
    state.misc[2] = 10;
    state.secondary[11] = 1;

    expect(decodeUpgradeFields(encodeUpgradeFields(state))).toEqual(state);
  });

  it('encodes levels as one letter each', () => {
    const state = createInitialUpgradeState();
    const fields = encodeUpgradeFields(state);
    const primary = fields.find((f) => f.key === PRIMARY_LEVELS_KEY);
    expect(primary?.value).toHaveLength(UPGRADE_COUNTS.primary);
    // Level 1 -> "b", level 0 -> "a".
    expect(primary?.value).toBe(`b${'a'.repeat(11)}`);
  });

  it('encodes level 10 as "k"', () => {
    const state = createInitialUpgradeState();
    state.primary[0] = 10;
    const primary = encodeUpgradeFields(state).find((f) => f.key === PRIMARY_LEVELS_KEY);
    expect(primary?.value.charAt(0)).toBe('k');
  });

  it('survives a trip through the save-string container', () => {
    const state = createInitialUpgradeState();
    state.money = 4242;
    state.primary[3] = 6;

    const text = writeSlot(EMPTY_SAVE_STRING, 1, buildSlotBody(encodeUpgradeFields(state)));
    expect(decodeUpgradeFields(parseSlotFields(text, 1))).toEqual(state);
  });

  it('falls back to defaults when fields are absent', () => {
    expect(decodeUpgradeFields([])).toEqual(createInitialUpgradeState());
  });

  it('pads a truncated level string from the defaults', () => {
    // Must never yield an array shorter than the upgrade tables.
    const decoded = decodeUpgradeFields([{ key: PRIMARY_LEVELS_KEY, value: 'kk' }]);
    expect(decoded.primary).toHaveLength(UPGRADE_COUNTS.primary);
    expect(decoded.primary[0]).toBe(10);
    expect(decoded.primary[1]).toBe(10);
    expect(decoded.primary[2]).toBe(0);
  });

  it('ignores a non-numeric money value rather than storing NaN', () => {
    expect(decodeUpgradeFields([{ key: MONEY_KEY, value: 'lots' }]).money).toBe(0);
  });

  it('reports every reachable level as encodable', () => {
    const state = createInitialUpgradeState();
    state.primary = state.primary.map(() => 10);
    expect(isEncodable(state)).toBe(true);
    expect(MAX_ENCODABLE_LEVEL).toBe(25);

    state.primary[0] = 26;
    expect(isEncodable(state)).toBe(false);
  });

  it('coexists with the achievement and level-select slices in one slot', () => {
    // 38 + 4 + 4 = 46 of the 63 fields now wired.
    const all = [
      ...encodeAchievementFields({
        states: createInitialStates(),
        totals: { enemyKills: 0, moneyEarned: 0 },
      }),
      ...encodeLevelSelectFields(createInitialLevelSelectData()),
      ...encodeUpgradeFields(createInitialUpgradeState()),
    ];

    expect(all).toHaveLength(46);
    expect(new Set(all.map((f) => f.key)).size).toBe(46);

    const text = writeSlot(EMPTY_SAVE_STRING, 3, buildSlotBody(all));
    expect(decodeUpgradeFields(parseSlotFields(text, 3))).toEqual(createInitialUpgradeState());
  });
});
