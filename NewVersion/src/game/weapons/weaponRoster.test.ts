/**
 * Cross-checks across every ported primary, plus the two added this session.
 *
 * The per-weapon specifics live with their own weapon; this file asserts the
 * properties that must hold for *all* of them, so a future weapon that gets a
 * track index or a bullet class wrong fails here rather than in play.
 */
import { describe, expect, it } from 'vitest';
import {
  BIG_CANNON,
  CANNON,
  createFiringState,
  fire,
  getWeapon,
  GUMMY_BEAR_CANNON,
  MINIGUN,
  PRIMARY_WEAPONS,
  resolveWeaponStats,
} from './firing';
import { applyBulletDamage } from './bullets';
import { blastDamage, createExplosion } from './explosions';
import { damageTypeOf, resolveDamageMultipliers } from '../enemies/damageTypes';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import { PRIMARY_UPGRADES } from '../upgrades/upgradeData';

const PORTED = Object.values(PRIMARY_WEAPONS);

/** Every ported weapon owned at level 1. */
function upgrades() {
  const state = createInitialUpgradeState();
  for (const spec of PORTED) {
    const index = PRIMARY_UPGRADES.findIndex((u) => u.id === spec.upgradeId);
    if (index >= 0) state.primary[index] = 1;
  }
  return state;
}

describe('the roster', () => {
  it('has all twelve primaries ported', () => {
    expect(Object.keys(PRIMARY_WEAPONS)).toEqual([
      'Cannon',
      'MiniGun',
      'Big Cannon',
      'Gummy Bear Cannon',
      'Shotgun',
      'Penetration Cannon',
      'Timed Bomb Cannon',
      'Poison Cannon',
      'Flamethrower',
      'Cake Cannon',
      'Laser Cannon',
      'Magic Cannon',
    ]);
  });

  it('covers every primary in the upgrade table', () => {
    // Nothing left unported: each of the twelve PRIMARY_UPGRADES entries has a
    // weapon spec, matched by display name.
    expect(PRIMARY_UPGRADES).toHaveLength(12);
    for (const upgrade of PRIMARY_UPGRADES) {
      expect(getWeapon(upgrade.name), upgrade.name).toBeDefined();
    }
  });

  it('names each weapon exactly as ScreenGame.primaryWeapon does', () => {
    // Gameplay compares these as raw strings, spacing included.
    for (const spec of PORTED) {
      const upgrade = PRIMARY_UPGRADES.find((u) => u.id === spec.upgradeId);
      expect(upgrade?.name, spec.upgradeId).toBe(spec.name);
    }
  });
});

describe('every ported weapon', () => {
  const state = upgrades();

  it('resolves stats at level 1', () => {
    for (const spec of PORTED) {
      expect(resolveWeaponStats(spec, state), spec.name).not.toBeNull();
    }
  });

  it('points its tracks at real entries in its upgrade table', () => {
    for (const spec of PORTED) {
      const table = findUpgradeById(spec.upgradeId);
      expect(table, spec.upgradeId).toBeDefined();
      expect(table!.stats[spec.reloadTrack], `${spec.name} reload`).toBeDefined();
      expect(table!.stats[spec.damageTrack], `${spec.name} damage`).toBeDefined();
      if (spec.explosionTrack !== undefined) {
        expect(table!.stats[spec.explosionTrack], `${spec.name} explosion`).toBeDefined();
      }
    }
  });

  it('gives an exploding weapon a blast radius and a non-exploding one none', () => {
    for (const spec of PORTED) {
      const stats = resolveWeaponStats(spec, state)!;
      if (spec.explosion) expect(stats.explosionRadius, spec.name).toBeGreaterThan(0);
      else expect(stats.explosionRadius, spec.name).toBe(0);
    }
  });

  it('produces a bullet that travels at its stated speed', () => {
    for (const spec of PORTED) {
      const stats = resolveWeaponStats(spec, state)!;
      const bullets = fire(createFiringState(), spec, stats, {
        x: 0,
        y: 0,
        towerRotation: 0,
        random: () => 0.5,
      });
      // Multi-pellet weapons read their count from a track, so the resolved
      // stats win over the spec's fallback.
      expect(bullets, spec.name).toHaveLength(stats.bulletCount ?? spec.bulletsPerShot);
      for (const bullet of bullets) {
        expect(Math.hypot(bullet.xVel, bullet.yVel), spec.name).toBeCloseTo(
          spec.bulletSpeed,
          6,
        );
      }
    }
  });

  it('improves damage from level 1 to 10', () => {
    const maxed = upgrades();
    for (const spec of PORTED) {
      const index = PRIMARY_UPGRADES.findIndex((u) => u.id === spec.upgradeId);
      maxed.primary[index] = 10;
    }
    for (const spec of PORTED) {
      const low = resolveWeaponStats(spec, state)!;
      const high = resolveWeaponStats(spec, maxed)!;
      expect(high.damage, spec.name).toBeGreaterThan(low.damage);
      expect(high.reloadTimeMax, spec.name).toBeLessThan(low.reloadTimeMax);
    }
  });
});

describe('damage channels across the roster', () => {
  it('covers three distinct channels', () => {
    // Explosions (Cannon, Big Cannon), Bullets (MiniGun), Food (Gummy Bear).
    expect(damageTypeOf(CANNON.bulletClass!)).toBeNull(); // untyped, but explodes
    expect(damageTypeOf(BIG_CANNON.bulletClass!)).toBeNull();
    expect(damageTypeOf(MINIGUN.bulletClass!)).toBe('Bullets');
    expect(damageTypeOf(GUMMY_BEAR_CANNON.bulletClass!)).toBe('Food');
  });

  it('lets each weapon find an enemy it is good against', () => {
    const state = upgrades();

    // Damage per frame against a given enemy type, by whichever path applies.
    const dps = (spec: typeof CANNON, type: string): number => {
      const stats = resolveWeaponStats(spec, state)!;
      const multipliers = resolveDamageMultipliers(type);

      if (spec.explosion) {
        const explosion = createExplosion({
          x: 0,
          y: 0,
          radius: stats.explosionRadius,
          damage: stats.damage,
          type: 'Normal',
          smallSound: true,
        });
        return blastDamage(explosion, multipliers) / stats.reloadTimeMax;
      }
      return (
        applyBulletDamage(
          Infinity,
          stats.damage,
          multipliers,
          damageTypeOf(spec.bulletClass!),
        ).damageDealt / stats.reloadTimeMax
      );
    };

    // Trap is weak to Explosions; the blast weapons gain, the others do not.
    expect(dps(CANNON, 'Trap')).toBeGreaterThan(dps(CANNON, 'Basic'));
    expect(dps(BIG_CANNON, 'Trap')).toBeGreaterThan(dps(BIG_CANNON, 'Basic'));

    // Crazy is weak to Bullets.
    expect(dps(MINIGUN, 'Crazy')).toBeGreaterThan(dps(MINIGUN, 'Basic'));

    // Accelerating is weak to Food (0.75 -> 1.75x).
    expect(dps(GUMMY_BEAR_CANNON, 'Accelerating')).toBeGreaterThan(
      dps(GUMMY_BEAR_CANNON, 'Basic'),
    );
  });

  it('makes Medic resistant to food, which the Gummy Bear feels', () => {
    // Medic: strengths ["FireLava", 0.5, "Food", 0.25] -> Food 0.75x
    const medic = resolveDamageMultipliers('Medic');
    expect(medic.Food).toBe(0.75);

    const stats = resolveWeaponStats(GUMMY_BEAR_CANNON, upgrades())!;
    const dealt = applyBulletDamage(100, stats.damage, medic, 'Food').damageDealt;
    expect(dealt).toBeCloseTo(stats.damage * 0.75, 10);
  });
});

describe('Big Cannon versus Cannon', () => {
  const state = upgrades();

  it('trades single-target DPS for area, not per-shot damage', () => {
    const cannon = resolveWeaponStats(CANNON, state)!;
    const big = resolveWeaponStats(BIG_CANNON, state)!;

    // The two damage curves are *identical* — [7, 7.33, … 10]. The Big Cannon
    // is not a damage upgrade: it fires far slower for the same hit, and buys
    // a much larger blast with the difference. Its single-target DPS is
    // roughly half the Cannon's.
    expect(big.damage).toBe(cannon.damage);
    expect(big.reloadTimeMax).toBeGreaterThan(cannon.reloadTimeMax);

    const cannonDps = cannon.damage / cannon.reloadTimeMax;
    const bigDps = big.damage / big.reloadTimeMax;
    expect(bigDps).toBeLessThan(cannonDps);
    expect(bigDps).toBeCloseTo(cannonDps * (13 / 23.8), 6);
  });

  it('shares the Cannon damage curve at every level', () => {
    const cannonTable = findUpgradeById('Cannon')!;
    const bigTable = findUpgradeById('BigCannon')!;
    expect(bigTable.stats[BIG_CANNON.damageTrack]).toEqual(
      cannonTable.stats[CANNON.damageTrack],
    );
  });

  it('has a far larger blast', () => {
    const cannon = resolveWeaponStats(CANNON, state)!;
    const big = resolveWeaponStats(BIG_CANNON, state)!;
    expect(big.explosionRadius).toBe(80);
    expect(big.explosionRadius).toBeGreaterThan(cannon.explosionRadius * 2);
  });

  it('preserves its table values from ScreenUpgrades.as', () => {
    const table = findUpgradeById('BigCannon')!;
    expect(table.stats[BIG_CANNON.reloadTrack][0]).toBe(23.8);
    expect(table.stats[BIG_CANNON.damageTrack][0]).toBe(7);
    expect(table.stats[BIG_CANNON.explosionTrack!][0]).toBe(80);
  });
});

describe('Gummy Bear Cannon', () => {
  it('preserves its table values', () => {
    const table = findUpgradeById('GummyBearCannon')!;
    expect(table.stats).toHaveLength(2); // reload and damage only
    expect(table.stats[GUMMY_BEAR_CANNON.reloadTrack][0]).toBe(17);
    expect(table.stats[GUMMY_BEAR_CANNON.damageTrack][0]).toBe(6);
  });

  it('scatters like the MiniGun', () => {
    expect(GUMMY_BEAR_CANNON.spread).toBe(5);
    expect(GUMMY_BEAR_CANNON.spread).toBe(MINIGUN.spread);
  });

  it('fires a fat, slow round compared with the MiniGun', () => {
    expect(GUMMY_BEAR_CANNON.bulletRadius).toBeGreaterThan(MINIGUN.bulletRadius);
    expect(GUMMY_BEAR_CANNON.bulletSpeed).toBeLessThan(MINIGUN.bulletSpeed);
  });
});
