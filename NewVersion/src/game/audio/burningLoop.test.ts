import { describe, expect, it } from 'vitest';

import { flameBurnSounds } from './burningLoop';
import { ENEMY_STAT_TYPES } from '../enemies/enemyStatsData';
import { resolveDamageMultipliers } from '../enemies/damageTypes';
import { lavaAffects } from '../weapons/groundHazard';

/** Every type the port can actually spawn, with its real resolved resistances. */
const REAL_TYPES = ENEMY_STAT_TYPES.map((type) => ({
  type,
  fireLava: resolveDamageMultipliers(type).FireLava,
}));

describe('the DamageAddict exclusion at `:6004`', () => {
  /**
   * The exclusion is only worth pinning if it is reachable, and reachability
   * is not obvious: `:6002` requires `fireLavaDamageMultiplier > 0` *before*
   * `:6004` is consulted, so an immune-to-fire DamageAddict would make the
   * exclusion dead arithmetic and this whole suite vacuous.
   *
   * It resolves to the neutral **1** — no strengths, no weaknesses
   * (`enemyStatsData.ts:80-85`). Stated as an exact value rather than
   * `toBeGreaterThan(0)`: the magnitude is knowable here, and `> 0` would pass
   * just as happily if the table drifted.
   */
  it('is reachable at all — a DamageAddict clears the multiplier gate', () => {
    expect(resolveDamageMultipliers('DamageAddict').FireLava).toBe(1);
  });

  /**
   * **The counterpart pair, and the reason it is a pair.**
   *
   * `expect(flameBurnSounds('DamageAddict', 1)).toBe(false)` alone is satisfied
   * by a function that returns `false` for everything — a dropped `> 0`, an
   * inverted return, a stubbed-out predicate. It is proved by nothing until the
   * other half sits beside it on the *same* input shape.
   *
   * So both halves are driven over the identical set, at the identical
   * multiplier: exactly one of the 20 is silent, and it is the right one. A
   * dropped exclusion fails the first assertion; a broken predicate fails the
   * second.
   */
  it('silences a burning DamageAddict and nothing else', () => {
    const silent = REAL_TYPES.filter(({ type }) => !flameBurnSounds(type, 1)).map((e) => e.type);
    const sounding = REAL_TYPES.filter(({ type }) => flameBurnSounds(type, 1)).map((e) => e.type);

    expect(silent).toEqual(['DamageAddict']);
    expect(sounding).toHaveLength(ENEMY_STAT_TYPES.length - 1);
  });

  /**
   * The exclusion is on the **type**, not on the multiplier, so it must hold
   * however fire-resistant or fire-vulnerable the enemy is. Pinned against a
   * neighbour that differs only in type, so "returns false for large
   * multipliers" cannot pass for it.
   */
  it('holds at every multiplier, while Basic tracks the multiplier', () => {
    for (const multiplier of [0.5, 1, 2, 10]) {
      expect(flameBurnSounds('DamageAddict', multiplier), `x${multiplier}`).toBe(false);
      expect(flameBurnSounds('Basic', multiplier), `x${multiplier}`).toBe(true);
    }
  });

  /** `:6002` — immunity to fire is silent too, and for a different reason. */
  it('is silent at a zero multiplier, for every type', () => {
    for (const { type } of REAL_TYPES) expect(flameBurnSounds(type, 0), type).toBe(false);
  });
});

describe('the two sources of the `Burning` loop agree on who burns', () => {
  /**
   * `:6006` (a flame) and `:6261` (lava) assert the *same* loop, and the port
   * routes them through two different predicates on purpose — the lava side
   * rides `lavaAffects`, because `:6259` gates sound and damage on one `if` and
   * the port already spends that `if` to decide the damage.
   *
   * Two functions is fine; disagreeing is not. This is the mechanism that says
   * so, in place of a docstring claiming they match. Driven over every real
   * type at three multipliers, so a `DamageAddict` added to one exclusion and
   * not the other fails here rather than becoming a sound that plays from lava
   * and not from a flamethrower.
   */
  it('gives the same answer as `lavaAffects` for all 20 types', () => {
    for (const { type } of REAL_TYPES) {
      for (const multiplier of [0, 1, 3]) {
        expect(flameBurnSounds(type, multiplier), `${type} x${multiplier}`).toBe(
          lavaAffects(type, multiplier),
        );
      }
    }
  });

  /**
   * The counterpart to the agreement test: it would also pass if both
   * predicates were constant. One input where they agree on `true` and one
   * where they agree on `false` makes the agreement mean something.
   */
  it('agrees on a burn as well as on a silence', () => {
    expect([flameBurnSounds('Basic', 1), lavaAffects('Basic', 1)]).toEqual([true, true]);
    expect([flameBurnSounds('DamageAddict', 1), lavaAffects('DamageAddict', 1)]).toEqual([
      false,
      false,
    ]);
  });
});
