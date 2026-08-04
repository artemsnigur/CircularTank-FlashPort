/**
 * What a slot-select screen needs to know about each slot.
 *
 * `ButtonGameSave.as:215-266` decides a slot button's whole appearance from
 * four facts, and this produces the same four:
 *
 *   empty        -> the button reads "New Game"
 *   occupied     -> "Slot N", plus `gameProgress` and `gameDateTime` on two
 *                   lines beneath it
 *   premium save -> a crown, and "Premium Required" (unclickable) when the
 *                   player has no premium
 *
 * ── Two probes, and they answer different questions ───────────────────────
 * `slotHasData(saveString, n)` asks whether slot *n of a string* is `()`.
 * `SaveStores.slotIsEmpty(n)` asks whether *store n* was ever written. The port
 * keeps one store per slot — `CircularTankSave1/2/3` — and so does the AS3
 * (`SaveManager.as:540-548`), so **the store-level probe is the one a screen
 * wants.** Using the string probe here would ask about slot 2 of store 1, which
 * is a slot that never gets written and would report every save as absent.
 */
import type { SaveStores } from './SaveStore';
import { SAVE_STRING_KEY } from '../player/playerProfile';
import { parseSlotFields } from './saveString';
import { readSaveDateTime, readWorldAndLevel } from './saveSlot';
import { decodeMainFlagFields } from '../onboarding/mainFlagsSave';

/** Slots the game offers — `SaveManager` opens exactly three. */
export const SLOT_NUMBERS = [1, 2, 3] as const;

export interface SlotSummary {
  slot: number;
  /** False when the button should read "New Game". */
  hasData: boolean;
  /** `gameProgress` — the `wl` field, e.g. "World 1 - 4". */
  progress?: string;
  /** `gameDateTime` — the `dt` field. */
  dateTime?: string;
  /** `Main.extraMoneyGiven`; draws the crown and gates on premium. */
  premium: boolean;
}

/**
 * Reads one slot's summary without loading it as a profile.
 *
 * Deliberately goes through the same `parseSlotFields` the real load uses, so
 * the screen and the game cannot disagree about which slot holds what. A
 * screen that offers slot 2 and loads slot 1 reads as data loss to a player,
 * and it is the one failure worth being careful about here.
 */
export function summariseSlot(stores: SaveStores, slot: number): SlotSummary {
  if (stores.slotIsEmpty(slot)) return { slot, hasData: false, premium: false };

  const saveString = stores.slot(slot).get<string>(SAVE_STRING_KEY, '');
  const fields = parseSlotFields(saveString, slot);

  return {
    slot,
    hasData: fields.length > 0,
    progress: readWorldAndLevel(fields),
    dateTime: readSaveDateTime(fields),
    premium: decodeMainFlagFields(fields).extraMoneyGiven,
  };
}

export function summariseSlots(stores: SaveStores): SlotSummary[] {
  return SLOT_NUMBERS.map((slot) => summariseSlot(stores, slot));
}

/**
 * Clears a slot — `ButtonGameSave` confirm on "Delete slot?" (`:453-462`).
 *
 * The AS3 calls `gameSave.clear()` on the slot's own SharedObject, which is why
 * this drops the whole store rather than editing the save string: the store is
 * the slot. `deleteFromSaveString` is the online path, and the port has no
 * online saves.
 */
export function deleteSlot(stores: SaveStores, slot: number): void {
  stores.slot(slot).clear();
}
