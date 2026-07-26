import { describe, expect, it } from 'vitest';
import {
  buildSlotBody,
  clearSlot,
  EMPTY_SAVE_STRING,
  fieldKeys,
  parseSlotFields,
  partOfSaveString,
  PREVIOUS_WORLD_KEY,
  readField,
  slotHasData,
  writeSlot,
} from './saveString';

const THREE_SLOTS = '(m=100;dt=1/Jan/26/00:00;)(m=250;)()';

describe('partOfSaveString', () => {
  it('extracts each slot including its parentheses', () => {
    expect(partOfSaveString(THREE_SLOTS, 1)).toBe('(m=100;dt=1/Jan/26/00:00;)');
    expect(partOfSaveString(THREE_SLOTS, 2)).toBe('(m=250;)');
    expect(partOfSaveString(THREE_SLOTS, 3)).toBe('()');
  });

  it('returns an empty string for a slot that is not present', () => {
    expect(partOfSaveString(THREE_SLOTS, 4)).toBe('');
    expect(partOfSaveString('', 1)).toBe('');
  });
});

describe('slotHasData', () => {
  it('distinguishes populated from empty slots', () => {
    expect(slotHasData(THREE_SLOTS, 1)).toBe(true);
    expect(slotHasData(THREE_SLOTS, 2)).toBe(true);
    expect(slotHasData(THREE_SLOTS, 3)).toBe(false);
  });

  it('reports no data for a missing slot', () => {
    expect(slotHasData(EMPTY_SAVE_STRING, 1)).toBe(false);
    expect(slotHasData('', 1)).toBe(false);
    expect(slotHasData(THREE_SLOTS, 9)).toBe(false);
  });
});

describe('clearSlot', () => {
  it('empties a slot without disturbing the others', () => {
    expect(clearSlot(THREE_SLOTS, 1)).toBe('()(m=250;)()');
    expect(clearSlot(THREE_SLOTS, 2)).toBe('(m=100;dt=1/Jan/26/00:00;)()()');
  });

  it('is idempotent on an already-empty slot', () => {
    expect(clearSlot(THREE_SLOTS, 3)).toBe(THREE_SLOTS);
  });

  it('leaves a malformed string alone rather than corrupting it further', () => {
    expect(clearSlot('(no close', 1)).toBe('(no close');
  });
});

describe('writeSlot', () => {
  it('replaces a slot body', () => {
    expect(writeSlot(EMPTY_SAVE_STRING, 2, 'm=9;')).toBe('()(m=9;)()');
  });

  it('overwrites existing content', () => {
    expect(writeSlot(THREE_SLOTS, 2, 'm=1;')).toBe('(m=100;dt=1/Jan/26/00:00;)(m=1;)()');
  });

  it('round-trips with partOfSaveString', () => {
    const written = writeSlot(EMPTY_SAVE_STRING, 3, 'a=1;b=2;');
    expect(partOfSaveString(written, 3)).toBe('(a=1;b=2;)');
  });
});

describe('parseSlotFields', () => {
  it('parses ordered key/value pairs', () => {
    expect(parseSlotFields(THREE_SLOTS, 1)).toEqual([
      { key: 'm', value: '100' },
      { key: 'dt', value: '1/Jan/26/00:00' },
    ]);
  });

  it('returns nothing for an empty slot', () => {
    expect(parseSlotFields(THREE_SLOTS, 3)).toEqual([]);
    expect(parseSlotFields('', 1)).toEqual([]);
  });

  it('drops a trailing field with no terminating semicolon, as the AS3 does', () => {
    // The scanner only commits a field when it reaches ';'.
    expect(parseSlotFields('(a=1;b=2)', 1)).toEqual([{ key: 'a', value: '1' }]);
  });

  it('keeps values containing slashes and colons intact', () => {
    const fields = parseSlotFields('(dt=7/Aug/26/09:05;)', 1);
    expect(readField(fields, 'dt')).toBe('7/Aug/26/09:05');
  });

  it('handles an empty value', () => {
    expect(parseSlotFields('(la=;)', 1)).toEqual([{ key: 'la', value: '' }]);
  });

  it('round-trips through buildSlotBody', () => {
    const fields = [
      { key: 'm', value: '1200' },
      { key: 'la', value: 'ccb' },
    ];
    const written = writeSlot(EMPTY_SAVE_STRING, 1, buildSlotBody(fields));
    expect(parseSlotFields(written, 1)).toEqual(fields);
  });
});

describe('readField, with the "pw" collision fixed', () => {
  // The AS3 wrote pw= for both primaryWeapon and previousWorld; previousWorld
  // now uses `prw`, so both survive a round trip.
  const slot = `(pw=Cannon;sw=Rockets;wva=111;${PREVIOUS_WORLD_KEY}=3;pl=12;)`;

  it('reads the primary weapon and the previous world independently', () => {
    const fields = parseSlotFields(slot, 1);
    expect(readField(fields, 'pw')).toBe('Cannon');
    expect(readField(fields, PREVIOUS_WORLD_KEY)).toBe('3');
  });

  it('keeps every key unique, which the original did not', () => {
    const keys = fieldKeys(parseSlotFields(slot, 1));
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('keeps pw paired with sw, as the writer orders them', () => {
    const keys = fieldKeys(parseSlotFields(slot, 1));
    expect(keys.indexOf('sw')).toBe(keys.indexOf('pw') + 1);
  });

  it('returns undefined for a key that is absent', () => {
    expect(readField(parseSlotFields(slot, 1), 'nope')).toBeUndefined();
  });
});
