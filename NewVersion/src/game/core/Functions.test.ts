import { describe, expect, it } from 'vitest';
import { formatNumber } from './Functions';

describe('formatNumber (port of Functions.as)', () => {
  it('leaves short numbers untouched', () => {
    expect(formatNumber(0)).toBe('0');
    expect(formatNumber(7)).toBe('7');
    expect(formatNumber(42)).toBe('42');
    expect(formatNumber(999)).toBe('999');
  });

  it('groups at the thousands boundary', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234)).toBe('1,234');
    expect(formatNumber(9999)).toBe('9,999');
    expect(formatNumber(10000)).toBe('10,000');
    expect(formatNumber(100000)).toBe('100,000');
  });

  it('groups repeatedly for large values', () => {
    expect(formatNumber(1000000)).toBe('1,000,000');
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(1234567890)).toBe('1,234,567,890');
  });

  it('handles negatives above -1000 correctly', () => {
    expect(formatNumber(-1234)).toBe('-1,234');
    expect(formatNumber(-1000000)).toBe('-1,000,000');
  });

  describe('reproduced quirks of the original', () => {
    // These assertions document AS3 behaviour rather than endorse it. See the
    // comment on formatNumber before changing any of them.
    it('mangles 3-digit negatives, because the sign occupies a chunk slot', () => {
      expect(formatNumber(-123)).toBe('-,123');
      expect(formatNumber(-999)).toBe('-,999');
    });

    it('mangles decimals, because the point is treated as a digit', () => {
      expect(formatNumber(1234.5)).toBe('123,4.5');
      expect(formatNumber(12.34)).toBe('12,.34');
    });

    it('does not special-case exponential notation', () => {
      // String(1e21) === "1e+21"
      expect(formatNumber(1e21)).toBe('1e,+21');
    });
  });

  it('is locale-independent, unlike toLocaleString', () => {
    // The reason the HUD uses this rather than Number#toLocaleString: the
    // original always groups with commas, on every machine.
    expect(formatNumber(1234567)).toBe('1,234,567');
    expect(formatNumber(1234567)).not.toContain(' ');
    expect(formatNumber(1234567)).not.toContain('.');
  });

  it('groups every value in a sweep the same way a regex reference would', () => {
    const reference = (n: number): string => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    for (let n = 0; n < 5000; n += 7) {
      expect(formatNumber(n)).toBe(reference(n));
    }
    for (const n of [123456, 999999, 1000001, 987654321]) {
      expect(formatNumber(n)).toBe(reference(n));
    }
  });
});
