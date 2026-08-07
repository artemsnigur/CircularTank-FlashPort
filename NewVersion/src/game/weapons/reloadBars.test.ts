import { describe, expect, it } from 'vitest';

import {
  AS3_BAR_HEIGHT,
  CONTINUOUS_FIRE_WEAPONS,
  primaryBarFill,
  secondaryBarFill,
} from './reloadBars';

/** A weapon with an ordinary per-shot cooldown, so the filling branch applies. */
const CANNON = { weaponName: 'Cannon', reloadTimeMax: 40 };

describe('the bar fills as the cooldown drains', () => {
  /**
   * `:756` is `80 - reloadTime / reloadTimeMax * 80`, so the bar is **empty at
   * the moment of firing and full when ready** — not the other way round.
   *
   * Pinned at both ends *and* the midpoint on one weapon, because a sign error
   * (`reloadTime / reloadTimeMax`) passes any single-point assertion at 0.5.
   */
  it('is empty just after firing, half way through, and full when ready', () => {
    const at = (reloadTime: number) =>
      primaryBarFill({ ...CANNON, reloadTime, countdownRunning: false });

    expect(at(40)).toBeCloseTo(0, 6); // just fired — a full cooldown remains
    expect(at(20)).toBeCloseTo(0.5, 6);
    expect(at(0)).toBeCloseTo(1, 6); // ready
  });

  it('reaches full only at zero, not merely near it', () => {
    // The counterpart to the pair above: an implementation that rounded up
    // would report ready while the weapon still cannot fire.
    const at = (reloadTime: number) =>
      primaryBarFill({ ...CANNON, reloadTime, countdownRunning: false });
    expect(at(1)).toBeLessThan(1);
    expect(at(0)).toBe(1);
  });

  it('states the AS3 bar height it derives the ratio from', () => {
    expect(AS3_BAR_HEIGHT).toBe(80);
  });
});

describe('the opening countdown gates the primary and nothing else', () => {
  /**
   * **The pair that matters most**, and the one a plausible wrong
   * implementation fails: the countdown empties the *primary* bar while the
   * *secondary* keeps showing its real state (`:766` has no countdown branch).
   *
   * Driven on one moment with both weapons mid-cooldown. Drop either half and a
   * wrong port passes — gating both satisfies the first, gating neither
   * satisfies the second.
   */
  it('empties the primary while the secondary keeps its real fill', () => {
    const primary = primaryBarFill({ ...CANNON, reloadTime: 20, countdownRunning: true });
    const secondary = secondaryBarFill({ reloadTime: 300, reloadTimeMax: 600 });

    expect(primary).toBe(0);
    expect(secondary).toBeCloseTo(0.5, 6);
  });

  /**
   * The countdown outranks every other branch, including the two that would
   * otherwise return a full bar. Without this, a port that checked the
   * exclusions first would show `MiniGun` full during the countdown.
   */
  it('outranks the ready state and the continuous-fire exclusion', () => {
    expect(
      primaryBarFill({ ...CANNON, reloadTime: 0, countdownRunning: true }),
      'ready, but the countdown is running',
    ).toBe(0);
    expect(
      primaryBarFill({ weaponName: 'MiniGun', reloadTime: 5, reloadTimeMax: 5, countdownRunning: true }),
      'continuous fire, but the countdown is running',
    ).toBe(0);
  });

  it('releases the primary to full the instant the countdown ends', () => {
    // At level start `reloadTime` is 0, so `:758-760` takes over and the bar
    // jumps straight to full — the observable behaviour at GO!.
    expect(primaryBarFill({ ...CANNON, reloadTime: 0, countdownRunning: true })).toBe(0);
    expect(primaryBarFill({ ...CANNON, reloadTime: 0, countdownRunning: false })).toBe(1);
  });
});

describe('continuous-fire weapons never show a reload', () => {
  /**
   * `:754` excludes `MiniGun` and `Flamethrower` from the filling branch.
   *
   * Pinned against an ordinary weapon **on the identical cooldown**, so
   * "nothing ever fills" and "everything always fills" both fail.
   */
  it('shows full for MiniGun and Flamethrower where the Cannon shows a partial', () => {
    const midCooldown = { reloadTime: 20, reloadTimeMax: 40, countdownRunning: false };

    for (const weaponName of CONTINUOUS_FIRE_WEAPONS) {
      expect(primaryBarFill({ ...midCooldown, weaponName }), weaponName).toBe(1);
    }
    expect(primaryBarFill({ ...midCooldown, weaponName: 'Cannon' })).toBeCloseTo(0.5, 6);
  });

  it('lists exactly the two the AS3 names', () => {
    expect([...CONTINUOUS_FIRE_WEAPONS].sort()).toEqual(['Flamethrower', 'MiniGun']);
  });
});

describe('the secondary bar', () => {
  it('fills as its own cooldown drains, independently of the primary', () => {
    expect(secondaryBarFill({ reloadTime: 600, reloadTimeMax: 600 })).toBeCloseTo(0, 6);
    expect(secondaryBarFill({ reloadTime: 150, reloadTimeMax: 600 })).toBeCloseTo(0.75, 6);
    expect(secondaryBarFill({ reloadTime: 0, reloadTimeMax: 600 })).toBe(1);
  });

  it('has no continuous-fire exclusion — every secondary shows its cooldown', () => {
    // `:766` tests only `reloadTimeSecondary > 0`. The primary's weapon-name
    // carve-out has no counterpart here, and inventing one would hide the
    // 20-second Mine cooldown the HUD exists to show.
    expect(secondaryBarFill({ reloadTime: 300, reloadTimeMax: 600 })).toBeCloseTo(0.5, 6);
  });
});

describe('degenerate input', () => {
  it('reads full rather than NaN when there is no cooldown to divide by', () => {
    // The AS3 would produce NaN and draw a bar of NaN height. Treated as
    // "nothing to show" instead, and stated rather than reproduced.
    expect(primaryBarFill({ ...CANNON, reloadTimeMax: 0, reloadTime: 5, countdownRunning: false })).toBe(1);
    expect(secondaryBarFill({ reloadTime: 5, reloadTimeMax: 0 })).toBe(1);
  });

  it('clamps a cooldown longer than its own maximum', () => {
    // `reloadTime += reloadTimeMax` (firing.ts:18) can exceed the max while
    // fire is held, which would otherwise give a negative fill.
    expect(primaryBarFill({ ...CANNON, reloadTime: 100, countdownRunning: false })).toBe(0);
  });
});
