import { describe, expect, it } from 'vitest';
import { PM_PRNG } from './PM_PRNG';

const MODULUS = 2147483647;
const MULTIPLIER = 16807;

/**
 * Reference implementation in BigInt — exact by construction, no floating
 * point anywhere. The whole point of the differential tests below is that the
 * shipped double-precision version must agree with this for every step.
 */
function bigIntStream(seed: number, count: number): number[] {
  let s = BigInt(seed);
  const m = BigInt(MODULUS);
  const a = BigInt(MULTIPLIER);
  const out: number[] = [];
  for (let i = 0; i < count; i += 1) {
    s = (s * a) % m;
    out.push(Number(s));
  }
  return out;
}

/** Real per-level seeds from ScreenGame.as `levelDataModelW1..W9`, column 9. */
const LEVEL_SEEDS = [
  610309764, // W1 L1  Desert Normal
  1189992843, // W1 L2  Desert Normal
  704323495, // W1 L3  Desert Flag
  2099559426, // W1 L14 Desert Tower — near the top of the uint31 range
  567123519, // W2 L1  Grass Defense
  1149584223, // W3 L1  BlueDirt Tower
  1886685304, // W9 L45 Futuristic Boss
];

describe('PM_PRNG (port of PM_PRNG.as)', () => {
  it('starts at seed 1, matching the AS3 constructor', () => {
    expect(new PM_PRNG().seed).toBe(1);
  });

  it('reproduces the documented first values of the minimal standard', () => {
    // MINSTD from seed 1 is a well-known published sequence; these are its
    // canonical opening terms, independent of anything in this repo.
    const rng = new PM_PRNG(1);
    expect(rng.nextInt()).toBe(16807);
    expect(rng.nextInt()).toBe(282475249);
    expect(rng.nextInt()).toBe(1622650073);
    expect(rng.nextInt()).toBe(984943658);
    expect(rng.nextInt()).toBe(1144108930);
  });

  it('reaches the standard 10000th term from seed 1', () => {
    // Park & Miller's published check value: the 10000th term of MINSTD
    // starting from seed 1 is 1043618065.
    const rng = new PM_PRNG(1);
    let value = 0;
    for (let i = 0; i < 10000; i += 1) value = rng.nextInt();
    expect(value).toBe(1043618065);
  });

  describe('bit-exactness against BigInt', () => {
    // This is the guard that matters. If someone "optimises" gen() with
    // Math.imul or a |0 coercion, the double-precision product overflows
    // 32 bits and these diverge — silently changing every seeded level layout.
    for (const seed of LEVEL_SEEDS) {
      it(`matches exactly for 5000 draws from level seed ${seed}`, () => {
        const rng = new PM_PRNG(seed);
        const expected = bigIntStream(seed, 5000);
        const actual = Array.from({ length: 5000 }, () => rng.nextInt());
        expect(actual).toEqual(expected);
      });
    }

    it('matches for the largest representable uint32 seed', () => {
      const seed = 4294967295;
      const rng = new PM_PRNG(seed);
      const expected = bigIntStream(seed, 1000);
      const actual = Array.from({ length: 1000 }, () => rng.nextInt());
      expect(actual).toEqual(expected);
    });

    it('never loses precision: every intermediate stays integer-exact', () => {
      const rng = new PM_PRNG(2147483646); // largest non-absorbing state
      for (let i = 0; i < 20000; i += 1) {
        const value = rng.nextInt();
        expect(Number.isSafeInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(MODULUS);
      }
    });
  });

  describe('nextDouble', () => {
    it('stays strictly inside (0, 1)', () => {
      const rng = new PM_PRNG(610309764);
      for (let i = 0; i < 50000; i += 1) {
        const value = rng.nextDouble();
        expect(value).toBeGreaterThan(0);
        expect(value).toBeLessThan(1);
      }
    });

    it('is state / MODULUS', () => {
      const a = new PM_PRNG(12345);
      const b = new PM_PRNG(12345);
      expect(a.nextDouble()).toBe(b.nextInt() / MODULUS);
    });
  });

  describe('nextIntRange', () => {
    it('covers both endpoints of a small range', () => {
      // The 0.4999 widening exists so min and max are drawn about as often as
      // the interior values; if it were dropped, endpoints would need an exact
      // tie and would be effectively unreachable.
      const rng = new PM_PRNG(610309764);
      const seen = new Set<number>();
      for (let i = 0; i < 5000; i += 1) seen.add(rng.nextIntRange(1, 3));
      expect([...seen].sort((x, y) => x - y)).toEqual([1, 2, 3]);
    });

    it('stays within bounds over a large sample', () => {
      const rng = new PM_PRNG(1189992843);
      for (let i = 0; i < 20000; i += 1) {
        const value = rng.nextIntRange(8, 9); // Desert prop count, PartGameArea.as
        expect(value === 8 || value === 9).toBe(true);
      }
    });

    it('returns min when min equals max', () => {
      const rng = new PM_PRNG(42);
      for (let i = 0; i < 100; i += 1) expect(rng.nextIntRange(7, 7)).toBe(7);
    });

    it('reproduces the AS3 uint coercion on a negative result', () => {
      // Faithful, not sensible: the AS3 signature returns uint, so a negative
      // range wraps rather than clamping. Documented so nobody "fixes" it and
      // shifts a seeded placement.
      const rng = new PM_PRNG(610309764);
      const value = rng.nextIntRange(-5, -5);
      expect(value).toBe(4294967291); // -5 >>> 0
    });
  });

  describe('determinism', () => {
    it('two generators with the same seed produce identical streams', () => {
      const a = new PM_PRNG(704323495);
      const b = new PM_PRNG(704323495);
      for (let i = 0; i < 1000; i += 1) expect(a.nextDouble()).toBe(b.nextDouble());
    });

    it('re-seeding rewinds the stream', () => {
      const rng = new PM_PRNG(567123519);
      const first = Array.from({ length: 20 }, () => rng.nextInt());
      rng.seed = 567123519;
      const second = Array.from({ length: 20 }, () => rng.nextInt());
      expect(second).toEqual(first);
    });

    it('different level seeds produce different layouts', () => {
      const a = new PM_PRNG(LEVEL_SEEDS[0]);
      const b = new PM_PRNG(LEVEL_SEEDS[1]);
      const streamA = Array.from({ length: 50 }, () => a.nextInt());
      const streamB = Array.from({ length: 50 }, () => b.nextInt());
      expect(streamA).not.toEqual(streamB);
    });

    it('treats 0 as the absorbing state the algorithm implies', () => {
      const rng = new PM_PRNG(0);
      expect(rng.nextInt()).toBe(0);
      expect(rng.nextInt()).toBe(0);
    });
  });

  describe('seed coercion', () => {
    it('truncates and wraps like AS3 uint assignment', () => {
      const rng = new PM_PRNG();
      rng.seed = 12.9;
      expect(rng.seed).toBe(12);

      rng.seed = -1;
      expect(rng.seed).toBe(4294967295);

      rng.seed = 4294967296;
      expect(rng.seed).toBe(0);
    });

    it('degrades to 0 rather than NaN for a non-finite seed', () => {
      const rng = new PM_PRNG(Number.NaN);
      expect(rng.seed).toBe(0);
      expect(Number.isNaN(rng.nextInt())).toBe(false);
    });
  });
});
