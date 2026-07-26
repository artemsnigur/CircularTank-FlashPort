import { describe, expect, it } from 'vitest';
import {
  decodeAchievementFields,
  encodeAchievementFields,
  ENEMY_KILLS_KEY,
  MONEY_EARNED_KEY,
} from './achievementSave';
import { createInitialStates, NOT_EARNED } from './achievementState';
import { buildSlotBody, EMPTY_SAVE_STRING, parseSlotFields, writeSlot } from '../save/saveString';

const fresh = () => ({
  states: createInitialStates(),
  totals: { enemyKills: 0, moneyEarned: 0 },
});

describe('achievement save round trip', () => {
  it('emits 38 fields — 36 states plus two totals', () => {
    expect(encodeAchievementFields(fresh())).toHaveLength(38);
  });

  it('round-trips a fresh profile', () => {
    const data = fresh();
    expect(decodeAchievementFields(encodeAchievementFields(data))).toEqual(data);
  });

  it('round-trips a played profile', () => {
    const data = fresh();
    data.states.Kills1 = 0;
    data.states.BossOnlySpecial = 3;
    data.states.FlagNoWeapons = 1;
    data.totals = { enemyKills: 4211, moneyEarned: 98765 };

    expect(decodeAchievementFields(encodeAchievementFields(data))).toEqual(data);
  });

  it('encodes an unearned achievement as 0, keeping it a single digit', () => {
    // The +1 shift exists for the states, whose -1 default would otherwise need
    // a sign. It is applied uniformly, so the two counters — which start at 0
    // and are never negative — encode as 1 rather than 0.
    const fields = encodeAchievementFields(fresh());
    const states = fields.filter(
      (f) => f.key !== ENEMY_KILLS_KEY && f.key !== MONEY_EARNED_KEY,
    );

    expect(states).toHaveLength(36);
    expect(states.every((f) => f.value === '0')).toBe(true);
    expect(fields.filter((f) => f.key === ENEMY_KILLS_KEY)[0].value).toBe('1');
    expect(fields.filter((f) => f.key === MONEY_EARNED_KEY)[0].value).toBe('1');
  });

  it('survives a full trip through the save-string container', () => {
    const data = fresh();
    data.states.Kills2 = 0;
    data.states.Racing = 2;
    data.totals.enemyKills = 1234;

    const text = writeSlot(EMPTY_SAVE_STRING, 1, buildSlotBody(encodeAchievementFields(data)));
    expect(decodeAchievementFields(parseSlotFields(text, 1))).toEqual(data);
  });

  it('defaults every achievement to not-earned when fields are absent', () => {
    const decoded = decodeAchievementFields([]);
    expect(Object.values(decoded.states).every((s) => s === NOT_EARNED)).toBe(true);
    expect(decoded.totals).toEqual({ enemyKills: 0, moneyEarned: 0 });
  });

  it('falls back rather than producing NaN on a corrupt value', () => {
    const decoded = decodeAchievementFields([
      { key: 'ak1s', value: 'garbage' },
      { key: ENEMY_KILLS_KEY, value: '' },
    ]);
    expect(decoded.states.Kills1).toBe(NOT_EARNED);
    expect(decoded.totals.enemyKills).toBe(0);
  });

  it('places the totals first, as updateSaveStringSlot does', () => {
    const fields = encodeAchievementFields(fresh());
    expect(fields[0].key).toBe(ENEMY_KILLS_KEY);
    expect(fields[1].key).toBe(MONEY_EARNED_KEY);
  });

  it('uses unique keys', () => {
    const keys = encodeAchievementFields(fresh()).map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
