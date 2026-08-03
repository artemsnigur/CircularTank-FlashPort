/**
 * `slotHasData`, and the round trip nobody had asserted.
 *
 * The unit half is small. The half that matters is at the bottom: **bank a
 * level, reload, progress survives.** Every piece of the save layer had unit
 * tests and they stayed green through a pass that concluded — wrongly — that
 * nothing was ever written. Unit tests cannot see whether the write is reached,
 * which is the same seam gap this project has now measured eight times.
 */
import { describe, expect, it } from 'vitest';
import { createInitialSaveSlot, slotHasData, writeSaveSlot, readSaveSlot } from './saveSlot';
import { EMPTY_SAVE_STRING } from './saveString';

describe('slotHasData — SaveManager.checkIfSlotHasData (:56)', () => {
  it('says no for every slot of a fresh save string', () => {
    // `()()()` — three empty slots, which is what a first run starts from.
    for (const slot of [1, 2, 3]) {
      expect(slotHasData(EMPTY_SAVE_STRING, slot), `slot ${slot}`).toBe(false);
    }
  });

  it('says yes only for the slot that was written', () => {
    const written = writeSaveSlot(EMPTY_SAVE_STRING, 2, createInitialSaveSlot());

    expect(slotHasData(written, 1)).toBe(false);
    expect(slotHasData(written, 2)).toBe(true);
    expect(slotHasData(written, 3)).toBe(false);
  });

  it('counts a slot of pure defaults as having data', () => {
    // Structural, not semantic: the question a slot-select screen asks is "is
    // this slot in use", not "is there progress in it". A fresh profile saved
    // once must show as occupied or the player overwrites it.
    const written = writeSaveSlot(EMPTY_SAVE_STRING, 1, createInitialSaveSlot());
    expect(slotHasData(written, 1)).toBe(true);
  });

  it('says no for a slot beyond the string rather than throwing', () => {
    expect(slotHasData(EMPTY_SAVE_STRING, 9)).toBe(false);
    expect(slotHasData('', 1)).toBe(false);
  });

  it('agrees with readSaveSlot about which slot is which', () => {
    // The two walk the string independently; a disagreement would mean the
    // screen offers slot 2 and the game loads slot 1.
    const slot = createInitialSaveSlot();
    slot.upgrades.money = 4242;
    const written = writeSaveSlot(EMPTY_SAVE_STRING, 3, slot);

    expect(slotHasData(written, 3)).toBe(true);
    expect(readSaveSlot(written, 3).upgrades.money).toBe(4242);
    expect(readSaveSlot(written, 1).upgrades.money).toBe(0);
  });
});

describe('the save round trip', () => {
  it('survives a write and a read through the string, not just in memory', () => {
    // The unit-level shadow of the browser check: what goes in comes out, via
    // the encoded string rather than by holding the same object.
    const slot = createInitialSaveSlot();
    slot.upgrades.money = 150;
    slot.loadout.secondaryWeapon = 'Ice Ball';

    const text = writeSaveSlot(EMPTY_SAVE_STRING, 1, slot);
    const back = readSaveSlot(text, 1);

    expect(back.upgrades.money).toBe(150);
    expect(back.loadout.secondaryWeapon).toBe('Ice Ball');
    expect(text).toContain('m=150');
  });

  it('leaves the other slots untouched when one is rewritten', () => {
    // Slot independence is the whole premise of a slot-select screen.
    let text = writeSaveSlot(EMPTY_SAVE_STRING, 1, { ...createInitialSaveSlot() });
    const two = createInitialSaveSlot();
    two.upgrades.money = 999;
    text = writeSaveSlot(text, 2, two);

    expect(readSaveSlot(text, 1).upgrades.money).toBe(0);
    expect(readSaveSlot(text, 2).upgrades.money).toBe(999);
    expect(slotHasData(text, 3)).toBe(false);
  });
});
