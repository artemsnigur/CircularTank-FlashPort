/**
 * The save-string container format from `SaveManager.as`.
 *
 * Layout is three parenthesised slots concatenated, each holding `key=value;`
 * pairs:
 *
 *     (m=1200;la=ccb;...;dt=7/Aug/26/09:05;)(...)(...)
 *
 * An empty slot is just "()". Slots are 1-indexed throughout, matching the AS3.
 *
 * This is the transfer/online-save representation. Local saves use the
 * key-value store instead (see `SaveStore`), which is why the duplicate-key bug
 * documented below only affects transfer codes.
 */

const SLOT_COUNT = 3;

/** An empty save string: three empty slots. */
export const EMPTY_SAVE_STRING = '()'.repeat(SLOT_COUNT);

/**
 * `SaveManager.partOfSaveString(theString, slotNum)` — extracts one slot
 * including its parentheses, or "" when the slot is not present.
 */
export function partOfSaveString(text: string, slot: number): string {
  let seen = 0;
  let start = 0;
  let end = 0;

  for (let i = 0; i < text.length; i += 1) {
    const char = text.charAt(i);
    if (char === '(') {
      seen += 1;
      if (seen === slot) start = i;
    } else if (seen === slot && char === ')') {
      end = i + 1;
      break;
    }
  }
  return text.substring(start, end);
}

/**
 * `SaveManager.checkIfSlotHasData(slot)`.
 *
 * True when the character after the slot's opening parenthesis is not the
 * closing one — i.e. the slot is not "()".
 */
export function slotHasData(text: string, slot: number): boolean {
  let seen = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charAt(i) === '(') seen += 1;
    if (seen === slot) return text.charAt(i + 1) !== ')';
  }
  return false;
}

/**
 * `SaveManager.deleteFromSaveString(slot)` — empties a slot, leaving "()".
 *
 * The AS3 also calls `sendSaveString(slot)` to push the change to the sponsor's
 * server; that is a networking concern and is not part of this function.
 */
export function clearSlot(text: string, slot: number): string {
  let seen = 0;
  let openAt = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charAt(i) === '(') seen += 1;
    if (seen === slot) {
      openAt = i;
      break;
    }
  }
  const closeAt = text.indexOf(')', openAt);
  if (closeAt === -1) return text;
  return text.substring(0, openAt + 1) + text.substring(closeAt);
}

/** Replaces a slot's contents, keeping the surrounding parentheses. */
export function writeSlot(text: string, slot: number, body: string): string {
  let seen = 0;
  let openAt = 0;
  for (let i = 0; i < text.length; i += 1) {
    if (text.charAt(i) === '(') seen += 1;
    if (seen === slot) {
      openAt = i;
      break;
    }
  }
  const closeAt = text.indexOf(')', openAt);
  if (closeAt === -1) return text;
  return text.substring(0, openAt + 1) + body + text.substring(closeAt);
}

/**
 * Parses a slot body into ordered key/value pairs.
 *
 * Ordered, not a plain object, because the format contains a **duplicate key**
 * (see `DUPLICATE_KEYS` below) and collapsing to an object would silently
 * discard one of them.
 */
export interface SaveField {
  key: string;
  value: string;
}

/**
 * Mirrors `loadVarsFromSaveString`'s scanner: read characters into the key
 * until "=", then into the value until ";".
 */
export function parseSlotFields(text: string, slot: number): SaveField[] {
  const body = partOfSaveString(text, slot);
  if (body.length < 2) return [];

  const inner = body.substring(1, body.length - 1);
  const fields: SaveField[] = [];

  let key = '';
  let value = '';
  let reading: 'key' | 'value' = 'key';

  for (const char of inner) {
    if (reading === 'key') {
      if (char === '=') reading = 'value';
      else key += char;
    } else if (char === ';') {
      fields.push({ key, value });
      key = '';
      value = '';
      reading = 'key';
    } else {
      value += char;
    }
  }
  // A final field without its terminating ';' is dropped, as in the AS3, whose
  // loop only commits on ';'.
  return fields;
}

/**
 * ── Deliberate deviation from the AS3: the `pw` key collision is fixed ─────
 *
 * `updateSaveStringSlot` wrote `pw=` twice — once for
 * `ScreenGame.primaryWeapon` and again for `ScreenLevelSelect.previousWorld` —
 * and `loadVarsFromSaveString` had two `case "pw":` arms in one switch. The
 * second arm is unreachable, so in the original:
 *
 *   - `primaryWeapon` was assigned twice and ended up holding the world number
 *   - `previousWorld` was never restored and kept its default
 *
 * There are no legacy transfer codes to stay compatible with, so this is fixed
 * rather than reproduced: `pw` keeps its natural pairing with `sw`
 * (primary/secondary weapon, adjacent in the writer) and `previousWorld` moves
 * to `prw`, alongside `pl` / `plw` in the "previous *" family.
 *
 * Consequence: keys are now unique, so `readField` can simply return the first
 * match. If a legacy string ever does need importing, it will decode
 * `previousWorld` as absent — which is exactly what the original did anyway.
 */
export const PREVIOUS_WORLD_KEY = 'prw';

/** Reads a field's value, or undefined when the key is absent. */
export function readField(fields: readonly SaveField[], key: string): string | undefined {
  return fields.find((field) => field.key === key)?.value;
}

/** Every key in a slot, for asserting uniqueness. */
export function fieldKeys(fields: readonly SaveField[]): string[] {
  return fields.map((f) => f.key);
}

/** Builds a slot body from ordered fields. Every field is ";"-terminated. */
export function buildSlotBody(fields: readonly SaveField[]): string {
  return fields.map((f) => `${f.key}=${f.value};`).join('');
}
