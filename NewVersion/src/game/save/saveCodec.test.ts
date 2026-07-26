import { describe, expect, it } from 'vitest';
import {
  ALPHABET,
  alphabetShortStringToNumberArray,
  booleanToNumber,
  formatSaveDateTime,
  getWorldValuesArraysFromShortString,
  LEVELS_PER_WORLD,
  numberArrayToAlphabetShortString,
  numberArrayToShortString,
  numberToBoolean,
  removeDateFromSaveString,
  shortStringToStringArray,
  stringArrayToShortString,
} from './saveCodec';

describe('boolean helpers', () => {
  it('round-trips true and false', () => {
    expect(booleanToNumber(true)).toBe(1);
    expect(booleanToNumber(false)).toBe(0);
    expect(numberToBoolean(1)).toBe(true);
    expect(numberToBoolean(0)).toBe(false);
  });

  it('treats anything other than exactly 1 as false, matching `== 1`', () => {
    expect(numberToBoolean(2)).toBe(false);
    expect(numberToBoolean(-1)).toBe(false);
    expect(numberToBoolean(Number.NaN)).toBe(false);
  });
});

describe('alphabet encoding', () => {
  it('maps 0-25 onto a-z', () => {
    expect(numberArrayToAlphabetShortString([0, 1, 25])).toBe('abz');
    expect(alphabetShortStringToNumberArray('abz')).toEqual([0, 1, 25]);
  });

  it('round-trips every valid upgrade level', () => {
    const values = Array.from({ length: ALPHABET.length }, (_, i) => i);
    expect(alphabetShortStringToNumberArray(numberArrayToAlphabetShortString(values))).toEqual(
      values,
    );
  });

  it('encodes the real upgrade range (levels 0-10) losslessly', () => {
    const levels = [0, 3, 10, 7, 1];
    expect(alphabetShortStringToNumberArray(numberArrayToAlphabetShortString(levels))).toEqual(
      levels,
    );
  });

  describe('reproduced quirks', () => {
    it('drops out-of-range values, because AS3 charAt returns ""', () => {
      // A level above 25 contributes nothing, so the string comes back short.
      expect(numberArrayToAlphabetShortString([0, 26, 1])).toBe('ab');
      expect(numberArrayToAlphabetShortString([-1])).toBe('');
    });

    it('decodes unknown characters to 26 rather than rejecting them', () => {
      // The AS3 counter runs past the end of the alphabet and pushes 26.
      expect(alphabetShortStringToNumberArray('a!z')).toEqual([0, 26, 25]);
      expect(alphabetShortStringToNumberArray('A')).toEqual([26]);
    });
  });

  it('handles the empty string', () => {
    expect(alphabetShortStringToNumberArray('')).toEqual([]);
    expect(numberArrayToAlphabetShortString([])).toBe('');
  });
});

describe('comma-separated arrays', () => {
  it('round-trips ordinary values', () => {
    const values = ['Cannon', 'Shotgun', 'MiniGun'];
    expect(stringArrayToShortString(values)).toBe('Cannon,Shotgun,MiniGun');
    expect(shortStringToStringArray('Cannon,Shotgun,MiniGun')).toEqual(values);
  });

  it('handles a single element', () => {
    expect(stringArrayToShortString(['Cannon'])).toBe('Cannon');
    expect(shortStringToStringArray('Cannon')).toEqual(['Cannon']);
  });

  it('stringifies null and undefined the way AS3 String() does', () => {
    expect(stringArrayToShortString([null, undefined, 1])).toBe('null,undefined,1');
  });

  describe('reproduced quirks', () => {
    it('drops the trailing empty element that split() would produce', () => {
      // "a,".split(",") is ["a", ""] in JS; the AS3 scanner yields ["a"].
      expect(shortStringToStringArray('a,')).toEqual(['a']);
    });

    it('returns an empty array for an empty string, not [""]', () => {
      expect(shortStringToStringArray('')).toEqual([]);
    });

    it('keeps a leading empty element', () => {
      expect(shortStringToStringArray(',a')).toEqual(['', 'a']);
    });

    it('keeps interior empty elements', () => {
      expect(shortStringToStringArray('a,,b')).toEqual(['a', '', 'b']);
    });
  });
});

describe('numberArrayToShortString', () => {
  it('flattens a flat array', () => {
    expect(numberArrayToShortString([1, 2, 3], 1)).toBe('123');
  });

  it('flattens a 2-deep array', () => {
    expect(numberArrayToShortString([[1, 2], [3]], 2)).toBe('123');
  });

  it('flattens a 3-deep array', () => {
    expect(
      numberArrayToShortString(
        [
          [
            [1, 2, 3],
            [4, 5, 6],
          ],
        ],
        3,
      ),
    ).toBe('123456');
  });

  it('is only reversible while values stay single-digit', () => {
    // Documented limitation: there is no separator, so 10 becomes "1","0".
    expect(numberArrayToShortString([10], 1)).toBe('10');
    expect(numberArrayToShortString([1, 0], 1)).toBe('10');
  });
});

describe('getWorldValuesArraysFromShortString', () => {
  const worldOfDigits = (digit: string): string =>
    digit.repeat(LEVELS_PER_WORLD * 3);

  it('groups digits into 45 levels of 3 values per world', () => {
    const result = getWorldValuesArraysFromShortString(worldOfDigits('1'));
    expect(result).toHaveLength(1);
    expect(result[0]).toHaveLength(LEVELS_PER_WORLD);
    expect(result[0][0]).toEqual([1, 1, 1]);
  });

  it('decodes several worlds', () => {
    const text = worldOfDigits('1') + worldOfDigits('2');
    const result = getWorldValuesArraysFromShortString(text);
    expect(result).toHaveLength(2);
    expect(result[1][44]).toEqual([2, 2, 2]);
  });

  it('round-trips against numberArrayToShortString', () => {
    const world = Array.from({ length: LEVELS_PER_WORLD }, (_, i) => [
      i % 4,
      (i + 1) % 4,
      (i + 2) % 4,
    ]);
    const encoded = numberArrayToShortString([world], 3);
    expect(getWorldValuesArraysFromShortString(encoded)).toEqual([world]);
  });

  it('discards a trailing incomplete world, as the AS3 does', () => {
    // Only pushes a world once it holds exactly 45 levels.
    const text = worldOfDigits('1') + '222'.repeat(10);
    expect(getWorldValuesArraysFromShortString(text)).toHaveLength(1);
  });

  it('discards a trailing incomplete level', () => {
    expect(getWorldValuesArraysFromShortString('11')).toEqual([]);
  });

  it('returns an empty array for empty input', () => {
    expect(getWorldValuesArraysFromShortString('')).toEqual([]);
  });
});

describe('formatSaveDateTime', () => {
  it('formats as D/Mon/YY/HH:MM', () => {
    expect(formatSaveDateTime(new Date(2026, 7, 7, 9, 5))).toBe('7/Aug/26/09:05');
  });

  it('zero-pads hours and minutes but not the day', () => {
    expect(formatSaveDateTime(new Date(2026, 0, 1, 0, 0))).toBe('1/Jan/26/00:00');
  });

  it('does not pad a two-digit day', () => {
    expect(formatSaveDateTime(new Date(2026, 11, 25, 23, 59))).toBe('25/Dec/26/23:59');
  });
});

describe('removeDateFromSaveString', () => {
  it('removes a single date field including its semicolon', () => {
    expect(removeDateFromSaveString('m=5;dt=7/Aug/26/09:05;wl=1')).toBe('m=5;wl=1');
  });

  it('removes up to three date fields', () => {
    const text = '(dt=a;)(dt=b;)(dt=c;)';
    expect(removeDateFromSaveString(text)).toBe('()()()');
  });

  it('stops after three, leaving a fourth in place', () => {
    // The AS3 bound is one pass per slot; it is observable, so it is preserved.
    const text = '(dt=a;)(dt=b;)(dt=c;)(dt=d;)';
    expect(removeDateFromSaveString(text)).toBe('()()()(dt=d;)');
  });

  it('leaves a string with no date field untouched', () => {
    expect(removeDateFromSaveString('m=5;wl=1')).toBe('m=5;wl=1');
  });

  it('duplicates the prefix when the date field has no terminating semicolon', () => {
    // Pathological but faithful. With no ';' after "dt=", the AS3 leaves
    // endPos at 0, so `substring(0, startPos) + substring(0)` re-appends the
    // *entire* string to its own prefix. Three passes double it each time,
    // giving 2^3 = 8 copies of the prefix:
    //   pass 1: "m=5;"           + "m=5;dt=nope"
    //   pass 2: "m=5;m=5;"       + "m=5;m=5;dt=nope"
    //   pass 3: "m=5;m=5;m=5;m=5;" + "m=5;m=5;m=5;m=5;dt=nope"
    // Only reachable from a corrupt save string, and recorded so nobody
    // "tidies" the loop and quietly changes how corrupt input decodes.
    expect(removeDateFromSaveString('m=5;dt=nope')).toBe('m=5;'.repeat(8) + 'dt=nope');
  });
});
