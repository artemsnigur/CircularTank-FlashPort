import { describe, expect, it } from 'vitest';

import { bombIndicatorView, medicRingScale, MEDIC_REFERENCE_DISTANCE } from './indicators';

const bomb = (over = {}) =>
  bombIndicatorView({ radius: 8.5, bombTimer: 60, bombTimerMax: 60, isBoss: false, ...over });

describe('the bomb marker', () => {
  it('shrinks and brightens as the fuse burns down', () => {
    // The pair, and the reason it is a pair: the same ratio drives both terms
    // in opposite directions. Porting one and inverting the other still
    // animates and means nothing.
    const fresh = bomb({ bombTimer: 60 });
    const nearly = bomb({ bombTimer: 0 });

    expect(nearly.scale).toBeLessThan(fresh.scale);
    expect(nearly.alpha).toBeGreaterThan(fresh.alpha);
  });

  it('runs alpha from exactly 0.2 to exactly 1', () => {
    // Computed, not compared — `0.2 + 0.8 * (1 - ratio)` at both ends.
    expect(bomb({ bombTimer: 60 }).alpha).toBeCloseTo(0.2, 10);
    expect(bomb({ bombTimer: 0 }).alpha).toBeCloseTo(1, 10);
  });

  it('scales with the host, so a boss marker is larger than a small one', () => {
    expect(bomb({ radius: 65.5 }).scale).toBeGreaterThan(bomb({ radius: 4.5 }).scale);
  });

  it('uses the boss frame only for a boss', () => {
    expect(bomb({ isBoss: false }).frame).toBe(1);
    expect(bomb({ isBoss: true }).frame).toBe(2);
  });

  it('never produces NaN when the fuse length is zero', () => {
    // A NaN scale draws nothing, which is the quietest failure a *warning*
    // marker could have. Guarded at the ratio rather than the inputs.
    const view = bomb({ bombTimer: 0, bombTimerMax: 0 });
    expect(Number.isFinite(view.scale)).toBe(true);
    expect(Number.isFinite(view.alpha)).toBe(true);
  });
});

describe('the medic ring', () => {
  it('is authored for a 100-unit reach and scales from there', () => {
    expect(medicRingScale(MEDIC_REFERENCE_DISTANCE)).toBe(1);
    expect(medicRingScale(50)).toBe(0.5);
  });

  it('gives a longer reach a larger ring', () => {
    // The property that matters: the ring must mean the reach, or it is
    // decoration that misinforms.
    expect(medicRingScale(100)).toBeGreaterThan(medicRingScale(60));
  });
});
