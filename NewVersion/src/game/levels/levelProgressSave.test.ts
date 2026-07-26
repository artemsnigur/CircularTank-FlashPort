import { describe, expect, it } from 'vitest';
import {
  createInitialLevelSelectData,
  decodeLevelSelectFields,
  encodeLevelSelectFields,
  WORLD_VALUES_KEY,
} from './levelProgressSave';
import { recordLevelResult } from './levelProgress';
import { buildSlotBody, EMPTY_SAVE_STRING, parseSlotFields, writeSlot } from '../save/saveString';
import { encodeAchievementFields } from '../achievements/achievementSave';
import { createInitialStates } from '../achievements/achievementState';
import { SAVE_SLOT_FIELDS } from '../save/saveSchema';

describe('level select save round trip', () => {
  it('emits the four fields the schema declares for ScreenLevelSelect', () => {
    const fields = encodeLevelSelectFields(createInitialLevelSelectData());
    expect(fields).toHaveLength(4);

    const schemaKeys = SAVE_SLOT_FIELDS.filter((f) => f.owner === 'ScreenLevelSelect').map(
      (f) => f.key,
    );
    expect(fields.map((f) => f.key).sort()).toEqual(schemaKeys.sort());
  });

  it('round-trips a fresh profile', () => {
    const data = createInitialLevelSelectData();
    expect(decodeLevelSelectFields(encodeLevelSelectFields(data))).toEqual(data);
  });

  it('round-trips real progress', () => {
    const data = createInitialLevelSelectData();
    data.progress = recordLevelResult(data.progress, 1, 1, 'Hard', 3);
    data.progress = recordLevelResult(data.progress, 3, 20, 'Medium', 2);
    data.progress = recordLevelResult(data.progress, 9, 45, 'Easy', 1);
    data.previousWorld = 3;
    data.previousLevel = 20;
    data.previousLevelWon = true;

    expect(decodeLevelSelectFields(encodeLevelSelectFields(data))).toEqual(data);
  });

  it('encodes the whole table as 1215 bare digits', () => {
    // 9 worlds x 45 levels x 3 values, no separators.
    const fields = encodeLevelSelectFields(createInitialLevelSelectData());
    const wva = fields.find((f) => f.key === WORLD_VALUES_KEY);
    expect(wva?.value).toHaveLength(9 * 45 * 3);
    expect(wva?.value).toMatch(/^[0-3]+$/);
  });

  it('survives a trip through the save-string container', () => {
    const data = createInitialLevelSelectData();
    data.progress = recordLevelResult(data.progress, 2, 10, 'Hard', 3);

    const text = writeSlot(EMPTY_SAVE_STRING, 1, buildSlotBody(encodeLevelSelectFields(data)));
    expect(decodeLevelSelectFields(parseSlotFields(text, 1))).toEqual(data);
  });

  it('coexists with the achievement fields in one slot', () => {
    // The two ported slices together are 42 of the 63 fields.
    const level = encodeLevelSelectFields(createInitialLevelSelectData());
    const achievements = encodeAchievementFields({
      states: createInitialStates(),
      totals: { enemyKills: 0, moneyEarned: 0 },
    });

    const all = [...achievements, ...level];
    expect(all).toHaveLength(42);
    expect(new Set(all.map((f) => f.key)).size).toBe(42);

    const text = writeSlot(EMPTY_SAVE_STRING, 2, buildSlotBody(all));
    const parsed = parseSlotFields(text, 2);
    expect(decodeLevelSelectFields(parsed)).toEqual(createInitialLevelSelectData());
  });

  it('falls back to defaults when fields are absent', () => {
    expect(decodeLevelSelectFields([])).toEqual(createInitialLevelSelectData());
  });

  it('recovers a correctly-shaped table from a truncated wva', () => {
    // The codec discards a trailing incomplete world; the decoder must still
    // produce a full 9x45 table rather than a short one.
    const decoded = decodeLevelSelectFields([{ key: WORLD_VALUES_KEY, value: '333' }]);
    expect(decoded.progress).toHaveLength(9);
    for (const world of decoded.progress) expect(world).toHaveLength(45);
    expect(decoded.progress[0][0]).toEqual([0, 0, 0]);
  });

  it('preserves a full first world from a partially truncated string', () => {
    const data = createInitialLevelSelectData();
    data.progress = recordLevelResult(data.progress, 1, 1, 'Hard', 3);
    const full = encodeLevelSelectFields(data).find((f) => f.key === WORLD_VALUES_KEY)!.value;

    // Keep only world 1's 135 digits.
    const decoded = decodeLevelSelectFields([
      { key: WORLD_VALUES_KEY, value: full.slice(0, 45 * 3) },
    ]);
    expect(decoded.progress[0][0]).toEqual([3, 0, 0]);
    expect(decoded.progress[1][0]).toEqual([0, 0, 0]);
  });

  it('ignores a non-numeric previousWorld rather than storing NaN', () => {
    const decoded = decodeLevelSelectFields([{ key: 'prw', value: 'x' }]);
    expect(decoded.previousWorld).toBe(1);
  });
});
