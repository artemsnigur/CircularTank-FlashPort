import { describe, expect, it } from 'vitest';

import {
  isReadableVersion,
  SAVE_SCHEMA_VERSION,
  SAVE_VERSION_KEY,
  slotVersion,
  UNVERSIONED_SAVE,
} from './saveVersion';
import {
  createInitialSaveSlot,
  decodeSaveSlot,
  encodeSaveSlot,
  readSaveSlot,
  writeSaveSlot,
} from './saveSlot';
import { EMPTY_SAVE_STRING } from './saveString';
import { recordLevelResult } from '../levels/levelProgress';

const FIXED_DATE = new Date('2026-08-22T10:00:00Z');

/** A slot with progress in it, so a reset is visible rather than a no-op. */
function playedSlot() {
  const data = createInitialSaveSlot();
  data.levelSelect.progress = recordLevelResult(data.levelSelect.progress, 1, 1, 'Hard', 3);
  data.upgrades.money = 4321;
  return data;
}

describe('the version a slot claims', () => {
  it('is what this build writes', () => {
    const fields = encodeSaveSlot(createInitialSaveSlot(), { now: FIXED_DATE });
    expect(fields.find((f) => f.key === SAVE_VERSION_KEY)?.value).toBe(String(SAVE_SCHEMA_VERSION));
    expect(slotVersion(fields)).toBe(SAVE_SCHEMA_VERSION);
  });

  it('is 1 when the field is absent, which is every pre-redesign save', () => {
    // Nothing before `D-6` wrote the field, so its absence *is* the version.
    expect(slotVersion([])).toBe(UNVERSIONED_SAVE);
    expect(UNVERSIONED_SAVE).toBe(1);
    expect(SAVE_SCHEMA_VERSION).toBeGreaterThan(UNVERSIONED_SAVE);
  });

  it('is 1 when the field is there but not a number', () => {
    // A corrupt slot takes the discard path rather than a trusted one; there is
    // no reading of `sv=banana` that should keep someone's progress.
    for (const value of ['', 'banana', '-3', '0', 'NaN']) {
      expect(slotVersion([{ key: SAVE_VERSION_KEY, value }]), value).toBe(UNVERSIONED_SAVE);
    }
  });

  it('accepts only its own version, in either direction', () => {
    expect(isReadableVersion(SAVE_SCHEMA_VERSION)).toBe(true);
    // Older is unreadable because the campaign changed under it...
    expect(isReadableVersion(SAVE_SCHEMA_VERSION - 1)).toBe(false);
    // ...and newer because reading it would silently drop fields this build
    // does not know about, destroying the newer save on the next write.
    expect(isReadableVersion(SAVE_SCHEMA_VERSION + 1)).toBe(false);
  });
});

describe('a slot from another version reads as a fresh one', () => {
  /**
   * The rule `D-6` is actually for.
   *
   * A pre-redesign slot describes 9 worlds of 45 and can hold a resume point in
   * world 7 — a level `getLevel` has no answer for. There is no honest mapping
   * onto a four-world campaign, so it resets.
   */
  it('discards a slot with no version field', () => {
    const encoded = encodeSaveSlot(playedSlot(), { now: FIXED_DATE });
    const stripped = encoded.filter((f) => f.key !== SAVE_VERSION_KEY);

    expect(decodeSaveSlot(stripped)).toEqual(createInitialSaveSlot());
  });

  it('keeps the very same slot when the version is there', () => {
    /*
     * The counterpart, on the identical data: without it, "discards an old
     * slot" would pass just as well for a decoder that discards everything —
     * which is a far worse bug and looks the same from one assertion.
     */
    const played = playedSlot();
    const encoded = encodeSaveSlot(played, { now: FIXED_DATE });

    const decoded = decodeSaveSlot(encoded);
    expect(decoded.upgrades.money).toBe(4321);
    expect(decoded.levelSelect.progress[0][0]).not.toEqual([0, 0, 0]);
    expect(decoded).not.toEqual(createInitialSaveSlot());
  });

  it('survives the round trip through a real save string', () => {
    // End to end, not just the field list: written and read back through
    // `writeSaveSlot`/`readSaveSlot`, which is what the game actually calls.
    const text = writeSaveSlot(EMPTY_SAVE_STRING, 2, playedSlot(), { now: FIXED_DATE });
    expect(readSaveSlot(text, 2).upgrades.money).toBe(4321);

    // ...and the same string with the version rewritten to the old one resets.
    const aged = text.replace(`${SAVE_VERSION_KEY}=${SAVE_SCHEMA_VERSION}`, `${SAVE_VERSION_KEY}=1`);
    expect(aged, 'the rewrite actually changed the string').not.toBe(text);
    expect(readSaveSlot(aged, 2)).toEqual(createInitialSaveSlot());
  });

  it('resets progress specifically, not just the balance', () => {
    // The field the redesign broke. A pre-redesign table has entries for worlds
    // that no longer exist, and the resume point can name one of them.
    const encoded = encodeSaveSlot(playedSlot(), { now: FIXED_DATE });
    const stripped = encoded.filter((f) => f.key !== SAVE_VERSION_KEY);
    const decoded = decodeSaveSlot(stripped);

    expect(decoded.levelSelect.progress).toEqual(
      createInitialSaveSlot().levelSelect.progress,
    );
    expect(decoded.levelSelect.progress).toHaveLength(4);
  });
});
