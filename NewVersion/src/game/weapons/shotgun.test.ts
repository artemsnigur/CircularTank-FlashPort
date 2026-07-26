/**
 * Shotgun — the first multi-projectile weapon, and the only one whose spread
 * is deterministic rather than random.
 *
 * Also pins the two muzzle-position rules, which the Shotgun is the sole user
 * of the second of. See the header of firing.ts.
 */
import { describe, expect, it } from 'vitest';
import {
  CANNON,
  createFiringState,
  fire,
  getWeapon,
  MINIGUN,
  resolveWeaponStats,
  SHOTGUN,
  tickFiring,
} from './firing';
import { applyBulletDamage } from './bullets';
import { damageTypeOf, resolveDamageMultipliers } from '../enemies/damageTypes';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import { resolveEnemyStats } from '../enemies/enemyStats';

const FRAME = 1000 / 30;
const context = { x: 320, y: 480, towerRotation: 0 };

/** Shotgun is bought, not granted, so tests must own it explicitly. */
function upgrades(level = 1) {
  const state = createInitialUpgradeState();
  state.primary[4] = level;
  return state;
}

describe('registration', () => {
  it('is exposed as a ported weapon', () => {
    expect(getWeapon('Shotgun')).toBe(SHOTGUN);
  });

  it('fires BulletShotgun on the Bullets channel, like the MiniGun', () => {
    expect(SHOTGUN.bulletClass).toBe('BulletShotgun');
    expect(damageTypeOf(SHOTGUN.bulletClass!)).toBe('Bullets');
    expect(damageTypeOf(MINIGUN.bulletClass!)).toBe('Bullets');
  });

  it('does not explode', () => {
    expect(SHOTGUN.explosion).toBe(false);
  });
});

describe('stats from the upgrade table', () => {
  it('reads level 1 correctly', () => {
    expect(resolveWeaponStats(SHOTGUN, upgrades())).toEqual({
      reloadTimeMax: 19.5,
      damage: 2.9,
      explosionRadius: 0,
      bulletCount: 5,
      fanArc: 18,
    });
  });

  it('reads level 10 correctly', () => {
    const stats = resolveWeaponStats(SHOTGUN, upgrades(10))!;
    expect(stats.bulletCount).toBe(9);
    expect(stats.fanArc).toBe(36);
    expect(stats.damage).toBe(3.5);
    expect(stats.reloadTimeMax).toBe(18.6);
  });

  it('maps its four tracks to the AS3 table', () => {
    const table = findUpgradeById('Shotgun')!;
    expect(table.stats[SHOTGUN.reloadTrack][0]).toBe(19.5);
    expect(table.stats[SHOTGUN.damageTrack][0]).toBe(2.9);
    expect(table.stats[SHOTGUN.fanArcTrack!][0]).toBe(18);
    expect(table.stats[SHOTGUN.bulletCountTrack!][0]).toBe(5);
  });

  it('never drops below 5 pellets, so the fan divisor is always safe', () => {
    // `arc / (count - 1)` would be Infinity at a count of 1.
    const counts = findUpgradeById('Shotgun')!.stats[SHOTGUN.bulletCountTrack!];
    expect(Math.min(...counts)).toBeGreaterThanOrEqual(5);
  });

  it('is unavailable when unowned', () => {
    expect(resolveWeaponStats(SHOTGUN, upgrades(0))).toBeNull();
  });
});

describe('the fan', () => {
  const stats = resolveWeaponStats(SHOTGUN, upgrades())!;

  it('fires one pellet per the count track', () => {
    expect(fire(createFiringState(), SHOTGUN, stats, context)).toHaveLength(5);
  });

  it('spreads pellets evenly across the arc', () => {
    const pellets = fire(createFiringState(), SHOTGUN, stats, context);
    // 18 degrees total, 5 pellets -> 4.5 degree steps from -9 to +9.
    expect(pellets.map((p) => p.rotation)).toEqual([-9, -4.5, 0, 4.5, 9]);
  });

  it('is symmetric about the turret axis', () => {
    const rotations = fire(createFiringState(), SHOTGUN, stats, context).map(
      (p) => p.rotation,
    );
    expect(rotations[0]).toBeCloseTo(-rotations[rotations.length - 1], 10);
  });

  it('always puts exactly one pellet on the turret axis', () => {
    // Every count in the table is odd, so there is always a centre pellet —
    // which is what the AS3 keys its muzzle-flare choice off.
    for (const level of [1, 4, 7, 10]) {
      const levelStats = resolveWeaponStats(SHOTGUN, upgrades(level))!;
      const pellets = fire(createFiringState(), SHOTGUN, levelStats, context);
      const centred = pellets.filter((p) => Math.abs(p.rotation - context.towerRotation) < 1e-9);
      expect(centred, `level ${level}`).toHaveLength(1);
    }
  });

  it('is deterministic — no random draw is consulted', () => {
    let calls = 0;
    const random = (): number => {
      calls += 1;
      return 0.5;
    };
    const a = fire(createFiringState(), SHOTGUN, stats, { ...context, random });
    const b = fire(createFiringState(), SHOTGUN, stats, { ...context, random });

    expect(calls).toBe(0);
    expect(a.map((p) => p.rotation)).toEqual(b.map((p) => p.rotation));
  });

  it('follows the turret', () => {
    const pellets = fire(createFiringState(), SHOTGUN, stats, {
      ...context,
      towerRotation: 90,
    });
    expect(pellets.map((p) => p.rotation)).toEqual([81, 85.5, 90, 94.5, 99]);
  });

  it('widens and thickens with the upgrade level', () => {
    const low = fire(createFiringState(), SHOTGUN, stats, context);
    const high = fire(
      createFiringState(),
      SHOTGUN,
      resolveWeaponStats(SHOTGUN, upgrades(10))!,
      context,
    );

    expect(high.length).toBeGreaterThan(low.length);
    const width = (p: typeof low) => p[p.length - 1].rotation - p[0].rotation;
    expect(width(high)).toBeGreaterThan(width(low));
  });

  it('sends every pellet at the full bullet speed', () => {
    for (const pellet of fire(createFiringState(), SHOTGUN, stats, context)) {
      expect(Math.hypot(pellet.xVel, pellet.yVel)).toBeCloseTo(SHOTGUN.bulletSpeed, 6);
    }
  });

  it('reloads as one shot, not one per pellet', () => {
    const state = createFiringState();
    fire(state, SHOTGUN, stats, context);
    expect(state.reloadTime).toBe(19.5);
    expect(fire(state, SHOTGUN, stats, context)).toHaveLength(0);

    for (let i = 0; i < 20; i += 1) tickFiring(state, FRAME);
    expect(fire(state, SHOTGUN, stats, context)).toHaveLength(5);
  });
});

describe('muzzle position', () => {
  it('offsets each pellet along its own heading, at a flat 16', () => {
    // PartGameArea.as:3918 — `cos(bullet.rotation) * 16`, with no half-width.
    const stats = resolveWeaponStats(SHOTGUN, upgrades())!;
    const pellets = fire(createFiringState(), SHOTGUN, stats, context);

    for (const pellet of pellets) {
      const radians = (pellet.rotation * Math.PI) / 180;
      expect(pellet.x).toBeCloseTo(context.x + Math.cos(radians) * 16, 10);
      expect(pellet.y).toBeCloseTo(context.y + Math.sin(radians) * 16, 10);
    }

    // The pellets genuinely start at different points, not stacked.
    expect(pellets[0].y).not.toBeCloseTo(pellets[4].y, 3);
  });

  it('puts every other weapon on the turret axis regardless of spread', () => {
    // PartGameArea.as:3913 — position uses `tower.rotation`, and the per-bullet
    // spread rotation affects velocity only. The MiniGun is the case that
    // distinguishes the two rules, since it has spread but is not the Shotgun.
    const stats = resolveWeaponStats(MINIGUN, (() => {
      const state = createInitialUpgradeState();
      state.primary[1] = 1;
      return state;
    })())!;

    const offset = MINIGUN.muzzleOffset + MINIGUN.bulletRadius;
    for (const random of [() => 0, () => 0.5, () => 1]) {
      const [bullet] = fire(createFiringState(), MINIGUN, stats, { ...context, random });
      // Same start point every time, even as the spread rotation changes.
      expect(bullet.x).toBeCloseTo(context.x + offset, 10);
      expect(bullet.y).toBeCloseTo(context.y, 10);
    }
  });

  it('keeps the Cannon where it was', () => {
    const stats = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    const [bullet] = fire(createFiringState(), CANNON, stats, context);
    expect(bullet.x).toBeCloseTo(context.x + CANNON.muzzleOffset + CANNON.bulletRadius, 10);
  });
});

describe('damage', () => {
  const stats = resolveWeaponStats(SHOTGUN, upgrades())!;
  const channel = damageTypeOf(SHOTGUN.bulletClass!);

  /** Damage if every pellet connects — only true at point-blank range. */
  const fullBurst = (type: string): number =>
    applyBulletDamage(Infinity, stats.damage, resolveDamageMultipliers(type), channel)
      .damageDealt * stats.bulletCount!;

  it('lands 14.5 damage on a neutral enemy with all five pellets', () => {
    expect(fullBurst('Basic')).toBeCloseTo(2.9 * 5, 10);
  });

  it('kills a tier-1 Basic in one full burst', () => {
    expect(fullBurst('Basic')).toBeGreaterThan(resolveEnemyStats('Basic', '1', 'Easy')!.health);
  });

  it('is halved by Strong and amplified by Crazy, like all Bullets damage', () => {
    expect(fullBurst('Strong')).toBeCloseTo(fullBurst('Basic') / 2, 10);
    expect(fullBurst('Crazy')).toBeCloseTo(fullBurst('Basic') * 1.5, 10);
  });

  it('out-damages the Cannon at point blank but loses on paper DPS per pellet', () => {
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;

    // A single pellet is feeble next to a Cannon shell…
    expect(stats.damage).toBeLessThan(cannon.damage / 2);
    // …but the burst beats it outright, if it all connects.
    expect(fullBurst('Basic')).toBeGreaterThan(cannon.damage);
  });

  it('rewards closing the distance: the burst is all-or-nothing', () => {
    // At 18 degrees the pellets diverge, so the fraction that hits a
    // fixed-radius target falls off with range. Two pellets is worse than a
    // Cannon shell; five is better. That trade is the weapon.
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    expect(stats.damage * 2).toBeLessThan(cannon.damage);
    expect(stats.damage * 5).toBeGreaterThan(cannon.damage);
  });
});
