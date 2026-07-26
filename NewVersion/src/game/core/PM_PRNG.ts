/**
 * Port of `SWFimported/scripts/PM_PRNG.as` (Core systems).
 *
 * Park-Miller-Carta "minimal standard" Lehmer generator:
 *
 *     seed = seed * 16807 % 2147483647
 *
 * ── Why this must be bit-exact ────────────────────────────────────────────
 * PartGameArea.as:1184 seeds this from the level table:
 *
 *     randGenerator.seed = ScreenGame.worldModels[world * 3 - 2][level - 1][9];
 *
 * Column 9 of every row in `levelDataModelW1..W9` is a per-level seed (e.g.
 * 610309764 for World 1 Level 1). It drives deterministic placement of
 * background props — every level's layout is a pure function of that seed.
 *
 * The stream is positional: each call advances it, so a divergence in either
 * the arithmetic *or the number of calls* changes every subsequent draw in
 * that level. "Close enough" is not a thing here.
 *
 * ── The arithmetic trap ───────────────────────────────────────────────────
 * AS3 `uint` arithmetic promotes to `Number` (an IEEE-754 double) before the
 * multiply, so `seed * 16807` is evaluated at double precision and only then
 * reduced mod 2147483647. The largest intermediate is
 *
 *     4294967295 * 16807 ≈ 7.22e13
 *
 * comfortably inside the 2^53 (~9.01e15) integer-exact range of a double. JS
 * `number` behaves identically, so a plain `*` and `%` reproduce AS3 exactly.
 *
 * Do NOT "optimise" this with `Math.imul`, `| 0`, `>>> 0` on the product, or
 * any other 32-bit coercion: the product overflows 32 bits and the sequence
 * silently diverges from the original game. `PM_PRNG.test.ts` pins this with a
 * differential test against BigInt.
 */

const MULTIPLIER = 16807;
/** 2^31 - 1, a Mersenne prime. */
const MODULUS = 2147483647;

export class PM_PRNG {
  /**
   * Current stream position. `uint` in AS3; assignments are coerced to uint32
   * to match, so a caller passing a negative or fractional value degrades the
   * same way the original does.
   *
   * Note 0 is an absorbing state: the sequence is stuck at 0 forever. The AS3
   * constructor starts at 1 for exactly this reason.
   */
  get seed(): number {
    return this.#seed;
  }

  set seed(value: number) {
    this.#seed = toUint32(value);
  }

  #seed = 1;

  constructor(seed = 1) {
    this.seed = seed;
  }

  /** `PM_PRNG.gen()` — advances the stream and returns the raw state. */
  #gen(): number {
    // Deliberately plain double arithmetic. See the header comment.
    this.#seed = (this.#seed * MULTIPLIER) % MODULUS;
    return this.#seed;
  }

  /**
   * `PM_PRNG.nextInt()` — raw state in [1, 2147483646] for any non-zero seed.
   */
  nextInt(): number {
    return this.#gen();
  }

  /**
   * `PM_PRNG.nextDouble()` — in (0, 1).
   *
   * Never returns exactly 0 or 1: a non-zero seed can never produce 0 (the
   * modulus is prime), and the maximum state is MODULUS - 1.
   */
  nextDouble(): number {
    return this.#gen() / MODULUS;
  }

  /** `PM_PRNG.nextDoubleRange(min, max)`. */
  nextDoubleRange(min: number, max: number): number {
    return min + (max - min) * this.nextDouble();
  }

  /**
   * `PM_PRNG.nextIntRange(min, max)`.
   *
   * The 0.4999 fudge is the original's, kept verbatim: it widens the range by
   * just under half a unit at each end so that `Math.round` distributes the
   * endpoints at roughly the same frequency as the interior values. Using 0.5
   * would make the endpoints reachable only by an exact tie.
   *
   * The AS3 signature returns `uint`, so the rounded value is coerced to
   * uint32 on the way out — a negative range wraps rather than clamping. That
   * is reproduced rather than "fixed": callers in the original only ever pass
   * non-negative ranges, and silently changing the mapping would move every
   * seeded placement.
   *
   * AS3 and JS `Math.round` agree (half rounds toward +Infinity), so no
   * special handling is needed there.
   */
  nextIntRange(min: number, max: number): number {
    const lo = min - 0.4999;
    const hi = max + 0.4999;
    return toUint32(Math.round(lo + (hi - lo) * this.nextDouble()));
  }
}

/**
 * Matches AS3's implicit `uint` coercion: truncate toward zero, then reduce
 * modulo 2^32. `>>> 0` alone is wrong for values outside the int32 range and
 * for non-integers, which is why this is spelled out.
 */
function toUint32(value: number): number {
  if (!Number.isFinite(value)) return 0;
  const truncated = Math.trunc(value);
  const wrapped = truncated % 4294967296;
  return wrapped < 0 ? wrapped + 4294967296 : wrapped;
}
