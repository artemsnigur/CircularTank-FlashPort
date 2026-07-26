/**
 * Port of the pure encoding helpers in `SWFimported/scripts/SaveManager.as`.
 *
 * These implement the game's "save string" — the compact transfer/online-save
 * format. They are separated from storage and from game state because they are
 * pure, and because save-format compatibility is the one thing in this class
 * that must not drift: a player's existing transfer code has to keep decoding
 * to the same values.
 *
 * Several of the originals misbehave on edge inputs. Every one of those is
 * reproduced deliberately and pinned by a test — see `saveCodec.test.ts`. Do
 * not "fix" one without deciding what it does to existing save strings.
 */

/** SaveManager.as `public static const alphabet`. */
export const ALPHABET = 'abcdefghijklmnopqrstuvwxyz';

/**
 * `SaveManager.booleanToNumber(bool)` — 1 or 0.
 */
export function booleanToNumber(value: boolean): number {
  return value ? 1 : 0;
}

/**
 * `SaveManager.numberToBoolean(number)`.
 *
 * The AS3 compares `number == 1` exactly, so anything other than 1 — including
 * 2, -1 or NaN — is false.
 */
export function numberToBoolean(value: number): boolean {
  return value === 1;
}

/**
 * `SaveManager.numberArrayToAlphabetShortString(array)` — one letter per entry,
 * 0 -> "a" … 25 -> "z".
 *
 * AS3 `String.charAt(i)` returns "" for an out-of-range index rather than
 * throwing, so a value above 25 (or below 0) silently contributes *nothing* and
 * the string comes back shorter than the array. Reproduced: a saved upgrade
 * level above 25 would already have been lost by the original.
 */
export function numberArrayToAlphabetShortString(values: readonly number[]): string {
  let out = '';
  for (const value of values) {
    out += ALPHABET.charAt(value); // "" when out of range, exactly as AS3
  }
  return out;
}

/**
 * `SaveManager.alphabetShortStringToNumberArray(string)` — inverse of the above.
 *
 * The AS3 walks the alphabet counting until it matches; when a character is
 * *not* in the alphabet the loop runs to completion and pushes 26. So unknown
 * characters decode to 26 rather than being rejected. Reproduced.
 */
export function alphabetShortStringToNumberArray(text: string): number[] {
  const out: number[] = [];
  for (const character of text) {
    const index = ALPHABET.indexOf(character);
    // indexOf gives -1 for "not found"; the AS3 counter lands on 26.
    out.push(index === -1 ? ALPHABET.length : index);
  }
  return out;
}

/**
 * `SaveManager.stringArrayToShortString(array)` — comma-joined.
 *
 * AS3 stringifies each entry with `String(...)`, so null becomes "null" and
 * undefined becomes "undefined". `Array.join` would render both as "", so the
 * conversion is spelled out.
 */
export function stringArrayToShortString(values: readonly unknown[]): string {
  return values.map((v) => String(v)).join(',');
}

/**
 * `SaveManager.shortStringToStringArray(string)` — comma-split.
 *
 * Not the same as `String.split(",")`. The AS3 pushes on *either* a comma or
 * the final character, in a single `if`, so a trailing comma yields no trailing
 * empty element: "a," decodes to ["a"], where split gives ["a", ""]. An empty
 * input yields [] rather than [""]. Both reproduced.
 */
export function shortStringToStringArray(text: string): string[] {
  const out: string[] = [];
  let piece = '';
  for (let i = 0; i < text.length; i += 1) {
    const char = text.charAt(i);
    if (char !== ',') piece += char;
    if (char === ',' || i === text.length - 1) {
      out.push(piece);
      piece = '';
    }
  }
  return out;
}

/**
 * `SaveManager.numberArrayToShortString(array, arraysInArrays)` — flattens a
 * 1-, 2- or 3-deep array of numbers into bare concatenated digits.
 *
 * There is no separator, so this is only reversible while every value is a
 * single character (0-9). A value of 10 or more silently becomes two entries on
 * decode. The original relies on that constraint holding; `wva` (world values)
 * only ever stores 0-3.
 */
export function numberArrayToShortString(
  array: readonly unknown[],
  arraysInArrays: 1 | 2 | 3,
): string {
  let out = '';
  for (const level1 of array) {
    if (arraysInArrays === 1) {
      out += String(level1);
      continue;
    }
    for (const level2 of level1 as readonly unknown[]) {
      if (arraysInArrays === 2) {
        out += String(level2);
        continue;
      }
      for (const level3 of level2 as readonly unknown[]) {
        out += String(level3);
      }
    }
  }
  return out;
}

/** Levels per world in the save layout — SaveManager.as, hard-coded 45. */
export const LEVELS_PER_WORLD = 45;
/** Values stored per level (stars / flags / towers) — hard-coded 3. */
export const VALUES_PER_LEVEL = 3;

/**
 * `SaveManager.getWorldValuesArraysFromShortString(string)` — inverse of
 * `numberArrayToShortString(..., 3)` for the world progress table.
 *
 * Groups digits into triples, then triples into worlds of 45 levels. A trailing
 * partial world is **discarded**: the AS3 only pushes `mediumArray` when it has
 * reached exactly 45 entries, so a truncated save string loses its last,
 * incomplete world rather than yielding a short one. Reproduced.
 */
export function getWorldValuesArraysFromShortString(text: string): number[][][] {
  const worlds: number[][][] = [];
  let world: number[][] = [];
  let level: number[] = [];

  for (const character of text) {
    level.push(Number(character));
    if (level.length === VALUES_PER_LEVEL) {
      world.push(level);
      level = [];
      if (world.length === LEVELS_PER_WORLD) {
        worlds.push(world);
        world = [];
      }
    }
  }
  return worlds;
}

/**
 * `SaveManager.setDateAndTime()` — the `dt=` field, e.g. "7/Aug/26/09:05".
 *
 * Day is *not* zero-padded but hour and minute are, and the year is the last
 * two characters of the full year. The AS3 also writes the result into
 * `gameSave.data.gameDateTime`; that side effect belongs to the store, so this
 * only formats.
 */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function formatSaveDateTime(date: Date = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  const year = String(date.getFullYear()).slice(2);
  return (
    `${date.getDate()}/${MONTHS[date.getMonth()]}/${year}/` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}

/**
 * `SaveManager.removeDateFromSaveString(theString)` — strips `dt=...;` fields.
 *
 * Bounded to three passes in the AS3 (one per save slot), so a string with more
 * than three date fields keeps the extras. Reproduced rather than looping to
 * exhaustion, because the bound is observable.
 */
export const MAX_DATE_FIELDS_REMOVED = 3;

export function removeDateFromSaveString(text: string): string {
  let result = text;
  for (let pass = 0; pass < MAX_DATE_FIELDS_REMOVED; pass += 1) {
    const start = result.indexOf('dt=');
    if (start === -1) break;

    // The AS3 scans forward for ';' and, when there is none, leaves endPos at 0
    // — which truncates the string to everything before "dt=". Reproduced.
    const semicolon = result.indexOf(';', start);
    const end = semicolon === -1 ? 0 : semicolon + 1;
    result = result.substring(0, start) + result.substring(end);
  }
  return result;
}
