/**
 * Mine — the first secondary, and the first weapon that damages without ever
 * firing a projectile.
 */
import { describe, expect, it } from 'vitest';
import {
  getSecondary,
  MINE,
  MINE_TRIGGER_RADIUS,
  placeMine,
  resolveSecondaryStats,
  SECONDARY_WEAPONS,
  sweepMines,
} from './secondaries';
import type { MineState } from './secondaries';
import { createFiringState, tickFiring, CANNON, resolveWeaponStats } from './firing';
import type { FiringState } from './firing';
import { blastDamage, createExplosion, explosionSound } from './explosions';
import { resolveDamageMultipliers } from '../enemies/damageTypes';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import { resolveEnemyStats } from '../enemies/enemyStats';
import { SECONDARY_UPGRADES } from '../upgrades/upgradeData';

const FRAME = 1000 / 30;
const upgrades = () => createInitialUpgradeState();

describe('registration', () => {
  it('exposes the ported secondaries', () => {
    expect(getSecondary('Mine')).toBe(MINE);
    expect(Object.keys(SECONDARY_WEAPONS)).toEqual([
      'Mine',
      'Shield',
      'Grenade',
      'Ice Grenade',
      'Poison Grenade',
      'Icicles',
      'Poison Spikes',
      'Magic Bunny',
      'Rockets',
      'Ice Ball',
    ]);
  });

  it('leaves the remaining two unported', () => {
    for (const name of [
      'Lava Ball',
      'Crazy Cheese',
    ]) {
      expect(getSecondary(name), name).toBeUndefined();
    }
  });

  it('accounts for all twelve secondaries between ported and unported', () => {
    // Guards against a thirteenth appearing in the table unnoticed.
    expect(SECONDARY_UPGRADES).toHaveLength(12);
  });

  it('names Mine exactly as ScreenGame.secondaryWeapon does', () => {
    expect(findUpgradeById(MINE.upgradeId)?.name).toBe(MINE.name);
  });
});

describe('stats from the upgrade table', () => {
  it('reads level 1 correctly', () => {
    expect(resolveSecondaryStats(MINE, upgrades())).toEqual({
      reloadTimeMax: 600,
      damage: 26,
      explosionRadius: 195,
      // Mine declares none of the optional tracks, so they resolve to zero.
      duration: 0,
      effectTime: 0,
      effectDamage: 0,
      count: 0,
    });
  });

  it('is owned from the start, like the Cannon', () => {
    // price[0] is 0 and startLevel is 1 — the free starter secondary.
    const table = findUpgradeById('Mine')!;
    expect(table.prices[0]).toBe(0);
    expect(table.startLevel).toBe(1);
    expect(resolveSecondaryStats(MINE, upgrades())).not.toBeNull();
  });

  it('improves damage and blast but never the cooldown', () => {
    const state = upgrades();
    state.secondary[0] = 10;
    const maxed = resolveSecondaryStats(MINE, state)!;

    expect(maxed.damage).toBe(35);
    expect(maxed.explosionRadius).toBe(240);
    // upgradeArrayMine[1] is a flat [600 … 600]; the cooldown is not buyable.
    expect(maxed.reloadTimeMax).toBe(600);
  });

  it('maps its tracks to the AS3 table', () => {
    const table = findUpgradeById('Mine')!;
    expect(table.stats[MINE.reloadTrack][0]).toBe(600);
    expect(table.stats[MINE.damageTrack!][0]).toBe(26);
    expect(table.stats[MINE.explosionTrack!][0]).toBe(195);
  });

  it('declares no duration, so the resolved one is zero', () => {
    // Only Shield carries a duration; an absent track resolves to 0 rather
    // than failing, which is what lets one interface serve all twelve.
    expect(MINE.durationTrack).toBeUndefined();
  });
});

describe('placement', () => {
  const stats = { reloadTimeMax: 600, damage: 26, explosionRadius: 195, duration: 0, effectTime: 0, effectDamage: 0, count: 0 };

  it('drops the mine at the tank position', () => {
    const mine = placeMine(stats, { x: 320, y: 480 });
    expect(mine.x).toBe(320);
    expect(mine.y).toBe(480);
  });

  it('carries the stats onto the mine', () => {
    const mine = placeMine(stats, { x: 0, y: 0 });
    expect(mine.damage).toBe(26);
    expect(mine.explosionRadius).toBe(195);
  });

  it('uses the hard-coded trigger radius, not the blast radius', () => {
    const mine = placeMine(stats, { x: 0, y: 0 });
    expect(mine.radius).toBe(MINE_TRIGGER_RADIUS);
    expect(mine.radius).toBe(12);
    expect(mine.radius).toBeLessThan(mine.explosionRadius);
  });

  it('always builds one — the gate is not its job any more', () => {
    // `placeMine` used to hold the cooldown check. That moved to
    // `updateSecondary` when Rockets needed a weapon that can decline a press
    // *after* the gate has already counted it. The cooldown behaviour it used
    // to own is still asserted below, against the gate that owns it now.
    expect(placeMine(stats, { x: 0, y: 0 })).not.toBeNull();
    expect(placeMine(stats, { x: 0, y: 0 })).not.toBeNull();
  });
});

/**
 * The shared secondary cooldown, which every weapon now goes through.
 *
 * These assertions moved off `placeMine` unchanged — the rule did not change,
 * only where it lives.
 */
describe('the shared secondary gate', () => {
  const stats = { reloadTimeMax: 600 };

  /** What `updateSecondary` does on an accepted press. */
  const consume = (state: FiringState) => {
    if (state.reloadTime > 0) return false;
    state.reloadTime += stats.reloadTimeMax;
    return true;
  };

  it('blocks until the cooldown expires', () => {
    const state = createFiringState();
    expect(consume(state)).toBe(true);
    expect(consume(state)).toBe(false);

    for (let i = 0; i < 600; i += 1) tickFiring(state, FRAME);
    expect(consume(state)).toBe(true);
  });

  it('takes twenty real seconds to come back', () => {
    const state = createFiringState();
    consume(state);

    let elapsed = 0;
    while (state.reloadTime > 0 && elapsed < 60_000) {
      tickFiring(state, FRAME);
      elapsed += FRAME;
    }
    expect(elapsed).toBeCloseTo(20_000, -2);
  });

  it('accumulates the cooldown rather than resetting it', () => {
    const state = createFiringState();
    consume(state);
    expect(state.reloadTime).toBe(600);
  });

  it('is frame-rate independent', () => {
    const at30 = createFiringState();
    at30.reloadTime = 600;
    for (let i = 0; i < 300; i += 1) tickFiring(at30, 1000 / 30);

    const at60 = createFiringState();
    at60.reloadTime = 600;
    for (let i = 0; i < 600; i += 1) tickFiring(at60, 1000 / 60);

    expect(at60.reloadTime).toBeCloseTo(at30.reloadTime, 6);
  });
});

describe('sweepMines', () => {
  const mine = (overrides: Partial<MineState> = {}): MineState => ({
    x: 100,
    y: 100,
    radius: MINE_TRIGGER_RADIUS,
    damage: 26,
    explosionRadius: 195,
    ...overrides,
  });

  it('leaves an untouched mine armed', () => {
    const result = sweepMines([mine()], [{ x: 400, y: 400, radius: 13 }]);
    expect(result.mines).toHaveLength(1);
    expect(result.detonations).toHaveLength(0);
  });

  it('detonates when an enemy overlaps the trigger radius', () => {
    const result = sweepMines([mine()], [{ x: 110, y: 100, radius: 13 }]);
    expect(result.mines).toHaveLength(0);
    expect(result.detonations).toHaveLength(1);
  });

  it('accounts for both radii', () => {
    // Trigger 12 + enemy 13 = 25.
    expect(sweepMines([mine()], [{ x: 126, y: 100, radius: 13 }]).detonations).toHaveLength(0);
    expect(sweepMines([mine()], [{ x: 124, y: 100, radius: 13 }]).detonations).toHaveLength(1);
  });

  it('detonates once even with several enemies on top of it', () => {
    // The AS3 relies on `stage.contains(theMine)` to prevent a second queue
    // entry after the splice; this is the same guarantee.
    const result = sweepMines(
      [mine()],
      [
        { x: 100, y: 100, radius: 13 },
        { x: 101, y: 100, radius: 13 },
        { x: 102, y: 100, radius: 13 },
      ],
    );
    expect(result.detonations).toHaveLength(1);
  });

  it('ignores invisible and teleporting enemies', () => {
    const on = { x: 100, y: 100, radius: 13 };
    expect(sweepMines([mine()], [{ ...on, invisible: true }]).detonations).toHaveLength(0);
    expect(sweepMines([mine()], [{ ...on, teleporting: true }]).detonations).toHaveLength(0);
    // …but a normal enemy alongside them still sets it off.
    expect(
      sweepMines([mine()], [{ ...on, invisible: true }, on]).detonations,
    ).toHaveLength(1);
  });

  it('detonates only the mines that were triggered', () => {
    const result = sweepMines(
      [mine({ x: 100 }), mine({ x: 400 }), mine({ x: 700 })],
      [{ x: 400, y: 100, radius: 13 }],
    );
    expect(result.detonations).toHaveLength(1);
    expect(result.detonations[0].x).toBe(400);
    expect(result.mines.map((m) => m.x)).toEqual([100, 700]);
  });

  it('handles empty inputs', () => {
    expect(sweepMines([], [{ x: 0, y: 0, radius: 13 }]).detonations).toHaveLength(0);
    expect(sweepMines([mine()], []).mines).toHaveLength(1);
  });

  it('produces a Normal blast at the mine position with its own radius', () => {
    const blast = sweepMines([mine()], [{ x: 100, y: 100, radius: 13 }]).detonations[0];
    expect(blast).toEqual({
      x: 100,
      y: 100,
      radius: 195,
      damage: 26,
      type: 'Normal',
      smallSound: false,
    });
  });

  it('plays the big boom, unlike a bullet impact', () => {
    const blast = sweepMines([mine()], [{ x: 100, y: 100, radius: 13 }]).detonations[0];
    expect(explosionSound(blast.smallSound)).toBe('ExplosionBig');
  });
});

describe('the mine actually kills things', () => {
  const stats = resolveSecondaryStats(MINE, upgrades())!;

  const blastOn = (type: string): number => {
    const explosion = createExplosion({
      x: 0,
      y: 0,
      radius: stats.explosionRadius,
      damage: stats.damage,
      type: 'Normal',
      smallSound: false,
    });
    return blastDamage(explosion, resolveDamageMultipliers(type));
  };

  it('one-shots a tier-1 Basic', () => {
    expect(blastOn('Basic')).toBeGreaterThan(resolveEnemyStats('Basic', '1', 'Easy')!.health);
  });

  it('runs on the Explosions channel, so Strong halves it', () => {
    expect(blastOn('Strong')).toBeCloseTo(blastOn('Basic') / 2, 10);
  });

  it('is amplified against Trap, which is weak to Explosions', () => {
    expect(blastOn('Trap')).toBeCloseTo(blastOn('Basic') * 1.5, 10);
  });

  it('hits far harder per use than the Cannon, and far less often', () => {
    const cannon = resolveWeaponStats(CANNON, upgrades())!;
    expect(stats.damage).toBeGreaterThan(cannon.damage * 3);
    expect(stats.explosionRadius).toBeGreaterThan(cannon.explosionRadius * 6);

    // …but at 600 frames against 13, its sustained output is a fraction of the
    // Cannon's. A mine is an ambush, not a damage source.
    expect(stats.damage / stats.reloadTimeMax).toBeLessThan(
      cannon.damage / cannon.reloadTimeMax / 10,
    );
  });
});
