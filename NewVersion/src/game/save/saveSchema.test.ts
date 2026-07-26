import { describe, expect, it } from 'vitest';
import { SAVE_SLOT_FIELDS, UNPORTED_OWNERS } from './saveSchema';
import { PREVIOUS_WORLD_KEY } from './saveString';

describe('save slot schema', () => {
  it('describes all 63 fields updateSaveStringSlot writes', () => {
    expect(SAVE_SLOT_FIELDS).toHaveLength(63);
  });

  it('has no duplicate keys, unlike the AS3', () => {
    const keys = SAVE_SLOT_FIELDS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('resolves the old "pw" collision by moving previousWorld to prw', () => {
    const pw = SAVE_SLOT_FIELDS.filter((f) => f.key === 'pw');
    expect(pw).toHaveLength(1);
    expect(pw[0].source).toContain('primaryWeapon');

    const prw = SAVE_SLOT_FIELDS.filter((f) => f.key === PREVIOUS_WORLD_KEY);
    expect(prw).toHaveLength(1);
    expect(prw[0].source).toContain('previousWorld');
  });

  it('assigns every field a known codec', () => {
    const valid = new Set(['raw', 'boolean', 'alphabet', 'csv', 'digits3', 'plusOne', 'computed']);
    for (const field of SAVE_SLOT_FIELDS) {
      expect(valid.has(field.codec), `${field.key}: ${field.codec}`).toBe(true);
    }
  });

  it('uses non-empty keys with no separator characters in them', () => {
    for (const field of SAVE_SLOT_FIELDS) {
      expect(field.key.length).toBeGreaterThan(0);
      expect(field.key).not.toContain('=');
      expect(field.key).not.toContain(';');
    }
  });

  it('accounts for every owner in the unported list', () => {
    const owners = new Set(
      SAVE_SLOT_FIELDS.map((f) => f.owner).filter((o) => o !== '(computed)'),
    );
    expect([...owners].sort()).toEqual([...UNPORTED_OWNERS].sort());
  });

  it('shows achievements dominate the format', () => {
    // 38 of 63 fields. Worth knowing before starting ScreenAchievements: it
    // unblocks more of the save format than any other single class.
    const achievements = SAVE_SLOT_FIELDS.filter((f) => f.owner === 'ScreenAchievements');
    expect(achievements.length).toBe(38);
    expect(achievements.every((f) => f.codec === 'plusOne')).toBe(true);
  });
});
