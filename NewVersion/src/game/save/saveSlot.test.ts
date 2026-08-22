import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
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
import { AS3_SLOT_FIELD_COUNT, PORT_ONLY_FIELD_KEYS, SAVE_SLOT_FIELDS } from './saveSchema';
import { SAVE_VERSION_KEY } from './saveVersion';
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
  it('names the computed fields exactly as the schema does', () => {
    // Three now: `dt` and `wl` are the AS3's, `sv` is the port's save-schema
    // version (`D-6`).
    const computed = SAVE_SLOT_FIELDS.filter((f) => f.owner === '(computed)').map((f) => f.key);
    expect(computed.sort()).toEqual([DATE_TIME_KEY, WORLD_AND_LEVEL_KEY, SAVE_VERSION_KEY].sort());
  });

  it('produces every field the schema declares', () => {
    const fields = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    expect(fields).toHaveLength(SAVE_SLOT_FIELDS.length);
    expect(fields).toHaveLength(AS3_SLOT_FIELD_COUNT + PORT_ONLY_FIELD_KEYS.size);
    expect(() => assertSlotComplete(fields)).not.toThrow();
  });

  it('emits them in the exact order updateSaveStringSlot writes them', () => {
    const fields = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    expect(fields.map((f) => f.key)).toEqual(SAVE_SLOT_FIELDS.map((s) => s.key));
  });

  it('leaves no field empty that should carry a value', () => {
    const fields = encodeSaveSlot(playedSlot(), { now: FIXED_DATE });
    // A list legitimately encodes to "" when empty, so the allowance is read
    // off the schema's own codec rather than hand-listed — a new list field is
    // then covered without anyone having to remember it.
    const allowedEmpty = new Set(
      SAVE_SLOT_FIELDS.filter((spec) => spec.codec === 'csv').map((spec) => spec.key),
    );
    for (const field of fields) {
      if (allowedEmpty.has(field.key)) continue;
      expect(field.value.length, field.key).toBeGreaterThan(0);
    }
  });

  it('throws a directed error when a field is missing', () => {
    const fields = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    const truncated = fields.filter((f) => f.key !== 'm' && f.key !== 'la');
    expect(() => assertSlotComplete(truncated)).toThrow(/missing 2: m, la/);
  });

  /**
   * The case the guard was written for and could not see.
   *
   * It used to compare key presence against the schema, and `encodeSaveSlot`
   * builds its result by mapping over that same schema — so every key is
   * present by construction and the check was vacuous. Installing it as
   * written would have been a no-op that looked like a fix. The real
   * data-loss path is the `?? ''` fallback: a value no slice supplied, which
   * decodes to a default and is gone.
   */
  it('throws when a non-list field is present but empty', () => {
    const fields = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    const blanked = fields.map((f) => (f.key === 'm' ? { ...f, value: '' } : f));
    expect(() => assertSlotComplete(blanked)).toThrow(/empty 1: m/);
  });

  it('does not throw when a list field is empty, because that is honest', () => {
    // `tad` is empty on a fresh profile: the done-tutorials list has no members.
    const fields = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    expect(fields.find((f) => f.key === 'tad')?.value).toBe('');
    expect(() => assertSlotComplete(fields)).not.toThrow();
  });

  it('encodeSaveSlot runs the guard itself, so a caller cannot skip it', () => {
    // The whole defect was that this guard existed and nothing called it on the
    // path its own docstring describes.
    const source = readFileSync('src/game/save/saveSlot.ts', 'utf8');
    const body = source.slice(
      source.indexOf('export function encodeSaveSlot('),
      source.indexOf('export function decodeSaveSlot('),
    );
    expect(body).toContain('assertSlotComplete(encoded)');
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

  /*
   * ── The premium split is gone (`D-5`, T252) ──────────────────────────────
   *
   * Three tests lived here: a free save reporting a hardcoded "World 6  Level
   * 45", a premium one reporting "Premium Completed", and a free one refusing
   * to show world-7 progress because it only scanned six worlds. All three
   * described the AS3's paywall, which the port never had a way to take money
   * for and which makes no sense across four worlds.
   *
   * They are replaced rather than deleted: what the label does at the end of
   * the campaign still needs pinning, and the flag still needs to be inert.
   */
  it('names the last level of the campaign when everything is done', () => {
    const data = createInitialSaveSlot();
    for (let w = 1; w <= LEVELS.length; w += 1) {
      for (let l = 1; l <= LEVELS[w - 1].length; l += 1) {
        data.levelSelect.progress = recordLevelResult(data.levelSelect.progress, w, l, 'Easy', 1);
      }
    }
    const last = `World ${LEVELS.length}  Level ${LEVELS[LEVELS.length - 1].length}`;
    expect(readWorldAndLevel(encodeSaveSlot(data, { now: FIXED_DATE }))).toBe(last);
  });

  it('reads the same on a premium save as on a free one', () => {
    // The flag is inert for progress now. Driven both ways on identical data,
    // because "premium no longer gates levels" is exactly the kind of claim
    // that looks true while one branch still exists.
    const data = createInitialSaveSlot();
    for (let l = 1; l <= LEVELS[0].length; l += 1) {
      data.levelSelect.progress = recordLevelResult(data.levelSelect.progress, 1, l, 'Easy', 1);
    }

    const free = readWorldAndLevel(encodeSaveSlot(data, { now: FIXED_DATE, hasPremium: false }));
    const premium = readWorldAndLevel(encodeSaveSlot(data, { now: FIXED_DATE, hasPremium: true }));

    expect(free).toBe(premium);
    // ...and it is a real label, not two matching blanks.
    expect(free).toBe('World 2  Level 1');
  });

  it('scans every world, so late progress shows', () => {
    // The counterpart to the old "only scans 6 worlds": progress in the final
    // world reaches the label instead of being cut off by a paywall.
    const data = createInitialSaveSlot();
    for (let w = 1; w < LEVELS.length; w += 1) {
      for (let l = 1; l <= LEVELS[w - 1].length; l += 1) {
        data.levelSelect.progress = recordLevelResult(data.levelSelect.progress, w, l, 'Easy', 1);
      }
    }
    expect(readWorldAndLevel(encodeSaveSlot(data, { now: FIXED_DATE }))).toBe(
      `World ${LEVELS.length}  Level 1`,
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
    expect(data.levelSelect.progress).toHaveLength(LEVELS.length);
  });
});
