import { describe, expect, it } from 'vitest';
import { HEALTH_STOPS, healthColour, redness } from './healthColour';

/**
 * The requirement, stated as three checkable things: green at full, red at
 * empty, and *gradual* in between — no steps, no plateaux, no reversals.
 *
 * The third is the one that needs care. "It looks like a gradient" is not an
 * assertion, and a stepped ramp passes any test that only samples the ends.
 */
describe('healthColour', () => {
  it('is the green stop at full health and the red stop at empty', () => {
    // Stated as the source values rather than read back from the function, so
    // a change to the palette is a deliberate act and not a silent one.
    expect(healthColour(1)).toBe('rgb(63, 174, 83)'); // #3fae53, `--green`
    expect(healthColour(0)).toBe('rgb(180, 35, 29)'); // #b4231d

    // And the counterpart that makes the two above mean something: they are
    // different, and in the direction claimed.
    expect(redness(healthColour(1))).toBeLessThan(0);
    expect(redness(healthColour(0))).toBeGreaterThan(0);
  });

  it('lands exactly on the amber stop at its own position', () => {
    // The midpoint is where a two-stop red-to-green mix would go muddy, so
    // the stop being hit exactly is the reason for having three.
    expect(healthColour(0.45)).toBe('rgb(232, 178, 58)'); // #e8b23a
  });

  it('gets redder, without exception, every step health falls', () => {
    /*
     * 101 samples across the whole range, each required to be strictly redder
     * than the one above it. This is what rules out a stepped ramp: a
     * discrete ramp holds one colour across a band, which shows up here as
     * `redness` failing to change between two adjacent samples.
     */
    const samples = Array.from({ length: 101 }, (_, i) => redness(healthColour(i / 100)));

    for (let i = 1; i < samples.length; i += 1) {
      expect(
        samples[i],
        `health ${i}% is not strictly less red than ${i - 1}%`,
      ).toBeLessThan(samples[i - 1]);
    }
  });

  it('never jumps — no step between adjacent percents exceeds a few units', () => {
    /*
     * Strict monotonicity alone permits a ramp that sits still and then leaps.
     * The largest single-percent change is bounded, which is the other half of
     * "gradual" and the half a monotonic check cannot see.
     *
     * The bound is derived, not guessed: the steepest segment is red-to-amber,
     * whose green channel covers 178 - 35 = 143 units over 45 percentage
     * points, so ~3.18 units per point. 5 leaves room for rounding without
     * admitting anything a viewer would read as a step.
     */
    let worst = 0;
    for (let i = 1; i <= 100; i += 1) {
      const a = healthColour((i - 1) / 100);
      const b = healthColour(i / 100);
      const channels = (s: string) => [...s.matchAll(/\d+/g)].map((m) => Number(m[0]));
      const [ar, ag, ab] = channels(a);
      const [br, bg, bb] = channels(b);
      worst = Math.max(worst, Math.abs(ar - br), Math.abs(ag - bg), Math.abs(ab - bb));
    }
    expect(worst).toBeLessThanOrEqual(5);

    // The counterpart: the ramp does move. A function returning one constant
    // colour would pass the bound above trivially.
    expect(worst).toBeGreaterThan(0);
  });

  it('clamps rather than extrapolating past either end', () => {
    // Health can exceed its maximum through an upgrade; extrapolating would
    // run the colour off the palette entirely.
    expect(healthColour(1.5)).toBe(healthColour(1));
    expect(healthColour(-0.2)).toBe(healthColour(0));
    expect(healthColour(Number.NaN)).toBe(healthColour(0));
  });

  it('keeps its stop table ascending and spanning the whole range', () => {
    // `healthColour` relies on this rather than re-checking per call, so it is
    // checked once here instead.
    expect(HEALTH_STOPS[0].at).toBe(0);
    expect(HEALTH_STOPS[HEALTH_STOPS.length - 1].at).toBe(1);
    for (let i = 1; i < HEALTH_STOPS.length; i += 1) {
      expect(HEALTH_STOPS[i].at).toBeGreaterThan(HEALTH_STOPS[i - 1].at);
    }
  });
});
