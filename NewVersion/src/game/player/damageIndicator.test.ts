import { describe, expect, it } from 'vitest';

import {
  DAMAGE_INDICATOR_FRAMES,
  DAMAGE_TINT_MAX,
  damageIndicatorOnHit,
  damageTintStrength,
  tickDamageIndicator,
} from './damageIndicator';

describe('the tint is a ramp, not a flash', () => {
  it('fades across the counter rather than being on or off', () => {
    // **Pinned at more than one level**, like the bomb marker's scale/alpha
    // pair. A boolean "is damaged" tint passes any single-level assertion and
    // produces a hard flicker instead of a hit.
    expect(damageTintStrength(20)).toBeCloseTo(0.8, 10);
    expect(damageTintStrength(15)).toBeCloseTo(0.6, 10);
    expect(damageTintStrength(10)).toBeCloseTo(0.4, 10);
    expect(damageTintStrength(5)).toBeCloseTo(0.2, 10);
  });

  it('decreases monotonically as the counter runs down', () => {
    // The property, so a change to the curve still has to be a fade.
    let previous = Infinity;
    for (let i = DAMAGE_INDICATOR_FRAMES; i >= 0; i -= 1) {
      const strength = damageTintStrength(i);
      expect(strength).toBeLessThan(previous);
      previous = strength;
    }
  });

  it('starts at exactly the AS3 maximum and ends at none', () => {
    // From the source, not from the module: `damageIndicator / 20 * 0.8`.
    expect(damageTintStrength(DAMAGE_INDICATOR_FRAMES)).toBe(DAMAGE_TINT_MAX);
    expect(damageTintStrength(0)).toBe(0);
  });

  it('never returns a negative strength', () => {
    // `:2795` takes the uncolor branch at zero, so the AS3 cannot reach this.
    expect(damageTintStrength(-5)).toBe(0);
  });
});

describe('the counter', () => {
  it('clears after exactly twenty frames, not before or forever', () => {
    // The two failure modes that look identical in a still: a tint that never
    // clears and one that clears immediately. Driven to the boundary.
    let indicator = damageIndicatorOnHit();
    for (let frame = 0; frame < DAMAGE_INDICATOR_FRAMES - 1; frame += 1) {
      indicator = tickDamageIndicator(indicator);
      expect(damageTintStrength(indicator), `frame ${frame}`).toBeGreaterThan(0);
    }
    indicator = tickDamageIndicator(indicator);
    expect(indicator).toBe(0);
    expect(damageTintStrength(indicator)).toBe(0);
  });

  it('restarts on a second hit rather than stacking', () => {
    // Both AS3 writers assign 20 outright. Stacking would pin the tank solid
    // red in a crowd, which is the visible consequence.
    let indicator = damageIndicatorOnHit();
    indicator = tickDamageIndicator(indicator, 15);
    expect(indicator).toBe(5);

    indicator = damageIndicatorOnHit();
    expect(indicator).toBe(DAMAGE_INDICATOR_FRAMES);
  });

  it('clamps at zero rather than going negative', () => {
    expect(tickDamageIndicator(2, 10)).toBe(0);
  });
});
