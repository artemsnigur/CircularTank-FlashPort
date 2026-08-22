import { describe, expect, it } from 'vitest';
import { AS3_SLOT_FIELD_COUNT, PORT_ONLY_FIELD_KEYS, SAVE_SLOT_FIELDS, UNPORTED_OWNERS } from './saveSchema';
import { PREVIOUS_WORLD_KEY } from './saveString';

describe('save slot schema', () => {
  it('describes all 63 fields updateSaveStringSlot writes', () => {
    // The AS3's own, counted apart from anything the port appends — otherwise
    // this stops being a fact about `SaveManager.as` and becomes a running
    // total of our additions.
    const as3 = SAVE_SLOT_FIELDS.filter((f) => !PORT_ONLY_FIELD_KEYS.has(f.key));
    expect(as3).toHaveLength(AS3_SLOT_FIELD_COUNT);
    expect(AS3_SLOT_FIELD_COUNT).toBe(63);
  });

  it('appends the port\'s own fields after them, never among them', () => {
    /*
     * Order is the format: `updateSaveStringSlot` writes its 63 in one
     * sequence, and a key inserted among them would shift every field after it
     * out of the position the original reads. Appending keeps the string
     * readable against the AS3 up to the point our own data begins.
     */
    const keys = SAVE_SLOT_FIELDS.map((f) => f.key);
    const firstPortIndex = keys.findIndex((k) => PORT_ONLY_FIELD_KEYS.has(k));

    expect(firstPortIndex, 'the port adds at least one field').toBeGreaterThan(-1);
    expect(firstPortIndex).toBe(AS3_SLOT_FIELD_COUNT);
    for (const key of keys.slice(firstPortIndex)) {
      expect(PORT_ONLY_FIELD_KEYS.has(key), key).toBe(true);
    }
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
