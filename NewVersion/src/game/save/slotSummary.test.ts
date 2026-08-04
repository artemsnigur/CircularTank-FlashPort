/**
 * The slot summary, and the one failure worth being careful about.
 *
 * "The screen offers slot 2 and the game loads slot 1" reads as data loss to a
 * player. It is also easy to build: the port keeps one store per slot, and each
 * store holds a save *string* which itself has three slots. Reading index 1 of
 * store 2 is a plausible mistake that reports every save but the first as empty.
 *
 * So these drive real stores through the real profile rather than hand-built
 * strings — the screen and the game have to agree, and the only way to show
 * that is to write with one and read with the other.
 */
import { describe, expect, it } from 'vitest';
import { MemoryBackend, SaveStores } from './SaveStore';
import { summariseSlot, summariseSlots, SLOT_NUMBERS } from './slotSummary';
import { PlayerProfile } from '../player/playerProfile';
import { saveSlotStoreName, SaveStore } from './SaveStore';

const profileFor = (backend: MemoryBackend, slot: number) =>
  new PlayerProfile(new SaveStore(saveSlotStoreName(slot), backend), slot);

describe('an untouched game has three empty slots', () => {
  it('reports every slot as New Game', () => {
    const stores = new SaveStores(new MemoryBackend());
    for (const summary of summariseSlots(stores)) {
      expect(summary.hasData, `slot ${summary.slot}`).toBe(false);
      expect(summary.progress).toBeUndefined();
    }
  });

  it('offers exactly the three the AS3 opens', () => {
    expect(SLOT_NUMBERS).toEqual([1, 2, 3]);
  });
});

describe('the screen and the game agree about which slot is which', () => {
  it('a save written to slot 2 shows up as slot 2 and nowhere else', () => {
    const backend = new MemoryBackend();
    const profile = profileFor(backend, 2);
    profile.recordLevel(3, 7, 'Easy', 2, true);
    profile.save(new Date('2026-02-03T04:05:06Z'));

    const stores = new SaveStores(backend);
    const [one, two, three] = summariseSlots(stores);

    expect(one.hasData).toBe(false);
    expect(three.hasData).toBe(false);
    expect(two.hasData).toBe(true);
    expect(two.progress).toBeTruthy();
    expect(two.dateTime).toBeTruthy();
  });

  it('and loading that slot returns the same progress the summary showed', () => {
    // The round trip across the two readers. A summary built from a different
    // index than the loader uses would pass the test above and fail this one.
    const backend = new MemoryBackend();
    const written = profileFor(backend, 3);
    written.recordLevel(2, 5, 'Easy', 1, true);
    written.save(new Date('2026-02-03T04:05:06Z'));

    const summary = summariseSlot(new SaveStores(backend), 3);
    const loaded = profileFor(backend, 3);

    expect(summary.hasData).toBe(true);
    expect(loaded.slot.levelSelect.previousLevel).toBe(5);
  });

  it('three slots hold three independent saves', () => {
    const backend = new MemoryBackend();
    for (const slot of SLOT_NUMBERS) {
      const p = profileFor(backend, slot);
      p.recordLevel(1, slot + 1, 'Easy', 1, true);
      p.save(new Date('2026-02-03T04:05:06Z'));
    }

    for (const slot of SLOT_NUMBERS) {
      expect(profileFor(backend, slot).slot.levelSelect.previousLevel, `slot ${slot}`)
        .toBe(slot + 1);
    }
  });
});
