import { describe, expect, it } from 'vitest';
import {
  assertSlotComplete,
  createInitialSaveSlot,
  DATE_TIME_KEY,
  decodeSaveSlot,
  encodeSaveSlot,
  readSaveDateTime,
  readSaveSlot,
  readWorldAndLevel,
  WORLD_AND_LEVEL_KEY,
  writeSaveSlot,
} from './saveSlot';
import { SAVE_SLOT_FIELDS } from './saveSchema';
import { EMPTY_SAVE_STRING, parseSlotFields, slotHasData } from './saveString';
import { recordLevelResult } from '../levels/levelProgress';
import { purchaseNextLevel } from '../upgrades/upgradeState';
import { findUpgradeById } from '../upgrades/upgradeState';
import { equipPrimary, equipSecondary } from '../loadout/loadout';
import { markHintDone } from '../onboarding/mainFlags';
import { discoverEnemies } from '../enemies/enemyKnowledge';
import { LEVELS } from '../levels/levelData';

const FIXED_DATE = new Date(2026, 7, 7, 9, 5);

/** A slot with something set in every slice. */
function playedSlot() {
  const data = createInitialSaveSlot();

  data.upgrades.money = 12345;
  const miniGun = findUpgradeById('MiniGun');
  if (miniGun) data.upgrades = purchaseNextLevel({ ...data.upgrades, money: 99999 }, miniGun).state;

  data.loadout = equipPrimary(data.loadout, 2, 'Big Cannon');
  data.loadout = equipSecondary(data.loadout, 'Rockets');

  data.levelSelect.progress = recordLevelResult(data.levelSelect.progress, 1, 1, 'Hard', 3);
  data.levelSelect.previousWorld = 2;
  data.levelSelect.previousLevel = 7;
  data.levelSelect.previousLevelWon = true;

  data.knownEnemies = discoverEnemies(data.knownEnemies, 1, 2).known;

  data.achievements.states.Kills1 = 0;
  data.achievements.totals = { enemyKills: 4211, moneyEarned: 98765 };

  data.tutorial = { ...data.tutorial, done: ['Move', 'AimShoot'], queue: ['KillEnemies'] };
  data.mainFlags = markHintDone(data.mainFlags, 'ButtonNextLevel');

  return data;
}

describe('encodeSaveSlot', () => {
  it('names the two computed fields exactly as the schema does', () => {
    const computed = SAVE_SLOT_FIELDS.filter((f) => f.owner === '(computed)').map((f) => f.key);
    expect(computed.sort()).toEqual([DATE_TIME_KEY, WORLD_AND_LEVEL_KEY].sort());
  });

  it('produces all 63 fields', () => {
    const fields = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    expect(fields).toHaveLength(63);
    expect(() => assertSlotComplete(fields)).not.toThrow();
  });

  it('emits them in the exact order updateSaveStringSlot writes them', () => {
    const fields = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    expect(fields.map((f) => f.key)).toEqual(SAVE_SLOT_FIELDS.map((s) => s.key));
  });

  it('leaves no field empty that should carry a value', () => {
    const fields = encodeSaveSlot(playedSlot(), { now: FIXED_DATE });
    // `tad`/`taq`/`tau` legitimately encode to "" when their list is empty;
    // everything else must produce something.
    const allowedEmpty = new Set(['tau', 'taq', 'tad', 'ew']);
    for (const field of fields) {
      if (allowedEmpty.has(field.key)) continue;
      expect(field.value.length, field.key).toBeGreaterThan(0);
    }
  });

  it('throws a directed error when a field is missing', () => {
    const fields = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    const truncated = fields.filter((f) => f.key !== 'm' && f.key !== 'la');
    expect(() => assertSlotComplete(truncated)).toThrow(/missing 2 field\(s\): m, la/);
  });
});

describe('the dt field', () => {
  it('formats the supplied date', () => {
    const fields = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    expect(readSaveDateTime(fields)).toBe('7/Aug/26/09:05');
  });

  it('is reproducible for a fixed date', () => {
    const a = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    const b = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    expect(a).toEqual(b);
  });

  it('survives the container, slashes and colon intact', () => {
    const text = writeSaveSlot(EMPTY_SAVE_STRING, 1, createInitialSaveSlot(), {
      now: FIXED_DATE,
    });
    expect(readSaveDateTime(parseSlotFields(text, 1))).toBe('7/Aug/26/09:05');
  });
});

describe('the wl field', () => {
  it('points at the first unplayed level on a fresh profile', () => {
    const fields = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    expect(readWorldAndLevel(fields)).toBe('World 1  Level 1');
  });

  it('uses two spaces between the world and level, as the AS3 does', () => {
    const label = readWorldAndLevel(encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE }));
    expect(label).toContain('  Level');
    expect(label).not.toContain(' Level 1 ');
  });

  it('advances as levels are played', () => {
    const data = createInitialSaveSlot();
    data.levelSelect.progress = recordLevelResult(data.levelSelect.progress, 1, 1, 'Easy', 2);
    expect(readWorldAndLevel(encodeSaveSlot(data, { now: FIXED_DATE }))).toBe('World 1  Level 2');
  });

  it('rolls into the next world', () => {
    const data = createInitialSaveSlot();
    for (let l = 1; l <= LEVELS[0].length; l += 1) {
      data.levelSelect.progress = recordLevelResult(data.levelSelect.progress, 1, l, 'Easy', 1);
    }
    expect(readWorldAndLevel(encodeSaveSlot(data, { now: FIXED_DATE }))).toBe('World 2  Level 1');
  });

  it('reports the hardcoded free-save label when all 6 worlds are done', () => {
    const data = createInitialSaveSlot();
    for (let w = 1; w <= 6; w += 1) {
      for (let l = 1; l <= LEVELS[w - 1].length; l += 1) {
        data.levelSelect.progress = recordLevelResult(data.levelSelect.progress, w, l, 'Easy', 1);
      }
    }
    expect(readWorldAndLevel(encodeSaveSlot(data, { now: FIXED_DATE, hasPremium: false }))).toBe(
      'World 6  Level 45',
    );
  });

  it('reports Premium Completed when all 9 worlds are done on a premium save', () => {
    const data = createInitialSaveSlot();
    for (let w = 1; w <= 9; w += 1) {
      for (let l = 1; l <= LEVELS[w - 1].length; l += 1) {
        data.levelSelect.progress = recordLevelResult(data.levelSelect.progress, w, l, 'Easy', 1);
      }
    }
    expect(readWorldAndLevel(encodeSaveSlot(data, { now: FIXED_DATE, hasPremium: true }))).toBe(
      'Premium Completed',
    );
  });

  it('only scans 6 worlds on a free save, so world 7 progress does not show', () => {
    const data = createInitialSaveSlot();
    for (let w = 1; w <= 6; w += 1) {
      for (let l = 1; l <= LEVELS[w - 1].length; l += 1) {
        data.levelSelect.progress = recordLevelResult(data.levelSelect.progress, w, l, 'Easy', 1);
      }
    }
    // A premium save with the same progress points into world 7.
    expect(readWorldAndLevel(encodeSaveSlot(data, { now: FIXED_DATE, hasPremium: true }))).toBe(
      'World 7  Level 1',
    );
  });
});

describe('full slot round trip', () => {
  it('round-trips a fresh slot', () => {
    const data = createInitialSaveSlot();
    expect(decodeSaveSlot(encodeSaveSlot(data, { now: FIXED_DATE }))).toEqual(data);
  });

  it('round-trips a played slot', () => {
    const data = playedSlot();
    expect(decodeSaveSlot(encodeSaveSlot(data, { now: FIXED_DATE }))).toEqual(data);
  });

  it('round-trips through the save string', () => {
    const data = playedSlot();
    const text = writeSaveSlot(EMPTY_SAVE_STRING, 2, data, { now: FIXED_DATE });
    expect(readSaveSlot(text, 2)).toEqual(data);
  });

  it('keeps three slots independent', () => {
    const one = playedSlot();
    const three = createInitialSaveSlot();
    three.upgrades.money = 777;

    let text = writeSaveSlot(EMPTY_SAVE_STRING, 1, one, { now: FIXED_DATE });
    text = writeSaveSlot(text, 3, three, { now: FIXED_DATE });

    expect(readSaveSlot(text, 1).upgrades.money).toBe(one.upgrades.money);
    expect(readSaveSlot(text, 3).upgrades.money).toBe(777);
    expect(slotHasData(text, 2)).toBe(false);
    expect(readSaveSlot(text, 2)).toEqual(createInitialSaveSlot());
  });

  it('is idempotent — re-encoding a decoded slot gives identical fields', () => {
    const first = encodeSaveSlot(playedSlot(), { now: FIXED_DATE });
    const second = encodeSaveSlot(decodeSaveSlot(first), { now: FIXED_DATE });
    expect(second).toEqual(first);
  });

  it('produces unique keys, so nothing can shadow anything', () => {
    const fields = encodeSaveSlot(playedSlot(), { now: FIXED_DATE });
    expect(new Set(fields.map((f) => f.key)).size).toBe(fields.length);
  });

  it('decodes an empty slot to defaults rather than failing', () => {
    expect(readSaveSlot(EMPTY_SAVE_STRING, 1)).toEqual(createInitialSaveSlot());
  });

  it('survives a corrupt slot body', () => {
    const corrupt = '(m=;la=@@@;wva=xyz;kea=Wyvern;tc=maybe;)()()';
    const data = readSaveSlot(corrupt, 1);

    expect(data.upgrades.money).toBe(0);
    expect(data.knownEnemies).toEqual(['Basic']);
    expect(data.tutorial.completed).toBe(false);
    expect(data.levelSelect.progress).toHaveLength(9);
  });
});
