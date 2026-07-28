import { describe, expect, it } from 'vitest';
import {
  MEDAL_HP_BRONZE,
  MEDAL_HP_GOLD,
  MEDAL_HP_SILVER,
  medalsForHp,
} from './medals';
import { TANK_MAX_HP } from '../player/tankDamage';
import { MAX_LEVEL_VALUE } from '../levels/levelProgress';

describe('medals are decided by remaining health', () => {
  it('uses the AS3 thresholds', () => {
    expect([MEDAL_HP_GOLD, MEDAL_HP_SILVER, MEDAL_HP_BRONZE]).toEqual([95, 75, 1]);
  });

  it('reads them against the same 100 the original had', () => {
    // The thresholds are literals, not fractions, so a different max HP would
    // silently change every award.
    expect(TANK_MAX_HP).toBe(100);
  });

  // Both sides of each boundary, since an off-by-one here changes what every
  // level awards and nothing downstream would notice.
  it.each([
    [100, 3],
    [95, 3],
    [94, 2],
    [75, 2],
    [74, 1],
    [1, 1],
    [0, 0],
  ])('hp %i awards %i', (hp, expected) => {
    expect(medalsForHp(hp)).toBe(expected);
  });

  it('never exceeds the table maximum', () => {
    // `recordLevelResult` clamps to MAX_LEVEL_VALUE; this must not be relying
    // on that clamp.
    for (let hp = -10; hp <= TANK_MAX_HP; hp += 1) {
      expect(medalsForHp(hp)).toBeLessThanOrEqual(MAX_LEVEL_VALUE);
      expect(medalsForHp(hp)).toBeGreaterThanOrEqual(0);
    }
  });

  it('is monotonic — more health is never worth less', () => {
    for (let hp = 1; hp <= TANK_MAX_HP; hp += 1) {
      expect(medalsForHp(hp), `hp ${hp}`).toBeGreaterThanOrEqual(medalsForHp(hp - 1));
    }
  });

  it('treats below-zero as a loss', () => {
    // Unreachable — the port clamps HP to 0 on death — but the comparisons
    // handle it the same way the AS3's do.
    expect(medalsForHp(-1)).toBe(0);
    expect(medalsForHp(-999)).toBe(0);
  });
});

describe('a win is exactly "scored something"', () => {
  it('holds at every health value', () => {
    // `bankLevelOutcome` derives `won` from the medal count rather than taking
    // it separately, so the two can never disagree.
    for (let hp = 0; hp <= TANK_MAX_HP; hp += 1) {
      expect(medalsForHp(hp) > 0, `hp ${hp}`).toBe(hp >= MEDAL_HP_BRONZE);
    }
  });

  it('a flat 1 per win is gone', () => {
    // The old rule. A perfect run was worth a third of its value, and the 15
    // medal-threshold achievements were reachable at a third of the rate.
    expect(medalsForHp(TANK_MAX_HP)).not.toBe(1);
    expect(medalsForHp(TANK_MAX_HP)).toBe(MAX_LEVEL_VALUE);
  });
});
