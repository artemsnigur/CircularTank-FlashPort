/**
 * Declared stat tracks must actually do something.
 *
 * Crazy Cheese shipped for two commits firing nine rounds on one bearing. The
 * cause was not a wrong value — it was a field that was **never set**:
 * `spreadTrack` was added to `SecondarySpec`, threaded through `SecondaryStats`,
 * described in the spec's own docstring as a 40-62.5 degree arc, and then
 * omitted from the spec. `stats.spread` defaulted to 0, the per-round step
 * became 0, and every round spawned on the same heading.
 *
 * **Nothing objected.** Not the type — the field is optional, correctly, since
 * most secondaries have no arc. Not the tests — they asserted `countTrack` and
 * never looked at spread. Not the suite — it stayed green throughout. It took
 * driving the game and capturing at 120 ms.
 *
 * So the assertions here are about the *class* of mistake rather than the
 * weapon. A test asserting Crazy Cheese's spread is non-zero fixes one weapon;
 * these fail for the next spec that declares a track and leaves it inert, or
 * that needs one and does not declare it.
 */
import { describe, expect, it } from 'vitest';
import { SECONDARY_WEAPONS, resolveSecondaryStats } from './secondaries';
import type { SecondarySpec } from './secondaries';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import { MAX_UPGRADE_LEVEL } from '../upgrades/upgradeData';

const owned = (spec: SecondarySpec, level: number) => {
  const state = createInitialUpgradeState();
  const secondary = [...state.secondary];
  secondary[findUpgradeById(spec.upgradeId)!.index] = level;
  return { ...state, secondary };
};

const statsFor = (spec: SecondarySpec, level = MAX_UPGRADE_LEVEL) =>
  resolveSecondaryStats(spec, owned(spec, level))!;

/** Optional track fields, paired with the stat each one feeds. */
const TRACKS = [
  ['damageTrack', 'damage'],
  ['explosionTrack', 'explosionRadius'],
  ['durationTrack', 'duration'],
  ['effectTimeTrack', 'effectTime'],
  ['effectDamageTrack', 'effectDamage'],
  ['countTrack', 'count'],
  ['spreadTrack', 'spread'],
] as const;

describe('a declared track resolves to something', () => {
  it.each(Object.entries(SECONDARY_WEAPONS))('%s', (name, spec) => {
    const stats = statsFor(spec);
    for (const [track, stat] of TRACKS) {
      if (spec[track] === undefined) continue;
      // Declaring a track and having it resolve to 0 means it points at the
      // wrong row, or at a row of zeroes. Either way the field is decoration.
      expect(stats[stat], `${name}.${track} -> stats.${stat}`).toBeGreaterThan(0);
    }
  });
});

describe('a weapon that fires several rounds fires them in several directions', () => {
  /** The bearing formula both fan paths use — `:4222`, `:3911`. */
  const bearings = (count: number, spread: number) =>
    Array.from({ length: count }, (_, i) =>
      count > 1 ? -spread / 2 + (spread / (count - 1)) * i : 0,
    );

  const multiRound = Object.entries(SECONDARY_WEAPONS).filter(([, spec]) => {
    const stats = statsFor(spec);
    return spec.kind === 'fan' && stats.count > 1;
  });

  it('there is at least one such weapon, so this is not vacuous', () => {
    expect(multiRound.length).toBeGreaterThan(0);
  });

  /**
   * Radial fans cover 360 by construction and carry no arc — `spawnFan`'s
   * `fanBearings` derives the step from the count alone.
   *
   * Named explicitly rather than inferred from `spreadTrack` being absent,
   * because absence is the bug: a guard reading "skip if no spread track" skips
   * precisely the weapon that lost one. Anything not in this list is an arc fan
   * and must have an arc.
   */
  const RADIAL = new Set(['Icicles', 'Poison Spikes']);

  it.each(multiRound)('%s spreads its rounds', (name, spec) => {
    const stats = statsFor(spec);
    if (RADIAL.has(name)) {
      expect(spec.spreadTrack, `${name} is radial and needs no arc`).toBeUndefined();
      return;
    }

    // An arc fan with no arc stacks every round on one heading and renders as a
    // single projectile. That is what shipped.
    expect(spec.spreadTrack, `${name} is an arc fan and must declare one`).toBeDefined();
    expect(stats.spread, `${name} declares an arc`).toBeGreaterThan(0);
    const distinct = new Set(bearings(stats.count, stats.spread).map((d) => d.toFixed(6)));
    expect(distinct.size, `${name} distinct bearings`).toBe(stats.count);
  });

  it('and the arc widens with level rather than being flat', () => {
    // Guards the other half: a track that resolves non-zero but to a constant
    // would pass everything above while being the wrong row.
    const cheese = SECONDARY_WEAPONS['Crazy Cheese'];
    expect(statsFor(cheese, 1).spread).toBe(40);
    expect(statsFor(cheese, MAX_UPGRADE_LEVEL).spread).toBe(62.5);
  });
});
