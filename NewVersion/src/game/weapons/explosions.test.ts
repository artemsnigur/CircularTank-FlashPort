import { describe, expect, it } from 'vitest';
import {
  blastDamage,
  createExplosion,
  EXPLOSION_ART_RADIUS,
  expireBlastDamage,
  explosionChannel,
  explosionScale,
  explosionSound,
  findEnemiesInBlast,
} from './explosions';
import { resolveDamageMultipliers } from '../enemies/damageTypes';
import { CANNON, resolveWeaponStats } from './firing';
import { createInitialUpgradeState } from '../upgrades/upgradeState';
import { resolveEnemyStats } from '../enemies/enemyStats';

const blast = (overrides = {}) =>
  createExplosion({
    x: 100,
    y: 100,
    radius: 30,
    damage: 7,
    type: 'Normal' as const,
    smallSound: true,
    ...overrides,
  });

describe('explosion basics', () => {
  it('can damage on the frame it spawns', () => {
    expect(blast().canDamage).toBe(true);
  });

  it('stops damaging after one frame', () => {
    expect(expireBlastDamage(blast()).canDamage).toBe(false);
  });

  it('maps each flavour to its damage channel', () => {
    expect(explosionChannel('Normal')).toBe('Explosions');
    expect(explosionChannel('Ice')).toBe('Ice');
    expect(explosionChannel('Poison')).toBe('Poison');
  });

  it('picks the sound the AS3 does', () => {
    expect(explosionSound(true)).toBe('ExplosionSmall');
    expect(explosionSound(false)).toBe('ExplosionBig');
  });

  it('scales the art by radius / 250', () => {
    expect(EXPLOSION_ART_RADIUS).toBe(250);
    expect(explosionScale(250)).toBe(1);
    expect(explosionScale(30)).toBeCloseTo(0.12, 10);
  });
});

describe('findEnemiesInBlast', () => {
  const targets = [
    { x: 100, y: 100, radius: 13 }, // dead centre
    { x: 140, y: 100, radius: 13 }, // 40 away, within 30 + 13
    { x: 200, y: 100, radius: 13 }, // 100 away, out of range
  ];

  it('catches everything in range, not just the nearest', () => {
    expect(findEnemiesInBlast(blast(), targets)).toEqual([0, 1]);
  });

  it('accounts for the enemy radius', () => {
    // 43 away with radius 13 is exactly on the 30 + 13 boundary.
    expect(findEnemiesInBlast(blast(), [{ x: 143, y: 100, radius: 13 }])).toEqual([0]);
    expect(findEnemiesInBlast(blast(), [{ x: 144, y: 100, radius: 13 }])).toEqual([]);
  });

  it('catches nothing with an empty field', () => {
    expect(findEnemiesInBlast(blast(), [])).toEqual([]);
  });

  it('grows with the radius', () => {
    expect(findEnemiesInBlast(blast({ radius: 200 }), targets)).toEqual([0, 1, 2]);
  });
});

describe('blastDamage', () => {
  it('deals full damage anywhere inside the radius — there is no falloff', () => {
    const neutral = resolveDamageMultipliers('Basic');
    const explosion = blast({ radius: 200 });

    // Centre and edge take the same amount.
    expect(blastDamage(explosion, neutral)).toBe(7);
    expect(blastDamage(explosion, neutral)).toBe(7);
  });

  it('is halved against an explosion-resistant enemy', () => {
    // Strong: ["Explosions", 0.5, "Bullets", 0.5]
    expect(blastDamage(blast(), resolveDamageMultipliers('Strong'))).toBe(3.5);
  });

  it('is amplified against an explosion-weak enemy', () => {
    // Trap has weakness ["Explosions", 0.5] -> 1.5x
    expect(blastDamage(blast(), resolveDamageMultipliers('Trap'))).toBe(10.5);
  });

  it('uses the Ice channel for an ice blast', () => {
    // Temperamental is weak to Ice (0.75 -> 1.75x).
    const ice = blast({ type: 'Ice' as const });
    expect(blastDamage(ice, resolveDamageMultipliers('Temperamental'))).toBeCloseTo(12.25, 10);
  });
});

describe('the Cannon is an exploding weapon', () => {
  const upgrades = createInitialUpgradeState();
  const stats = resolveWeaponStats(CANNON, upgrades)!;

  it('is flagged as exploding, so it deals no direct damage', () => {
    expect(CANNON.explosion).toBe(true);
  });

  it('has a blast radius from its upgrade table', () => {
    expect(stats.explosionRadius).toBe(30);
  });

  it('still kills a Basic in two shots — Basic resists nothing', () => {
    const enemy = resolveEnemyStats('Basic', '1', 'Easy')!;
    const neutral = resolveDamageMultipliers('Basic');
    const explosion = blast({ radius: stats.explosionRadius, damage: stats.damage });

    let health = enemy.health;
    let shots = 0;
    while (health > 0 && shots < 20) {
      health -= blastDamage(explosion, neutral);
      shots += 1;
    }
    expect(shots).toBe(2);
  });

  it('takes longer against Strong, which direct damage would have missed', () => {
    // This is the behaviour the direct-damage implementation got wrong: the
    // Cannon's damage goes through the Explosions channel, not untyped.
    const enemy = resolveEnemyStats('Strong', '1', 'Easy')!;
    const strong = resolveDamageMultipliers('Strong');
    const explosion = blast({ radius: stats.explosionRadius, damage: stats.damage });

    const perShot = blastDamage(explosion, strong);
    expect(perShot).toBe(stats.damage * 0.5);

    const shotsNow = Math.ceil(enemy.health / perShot);
    const shotsIfUntyped = Math.ceil(enemy.health / stats.damage);
    expect(shotsNow).toBe(shotsIfUntyped * 2);
  });

  it('hits several enemies at once', () => {
    const explosion = blast({ radius: stats.explosionRadius, damage: stats.damage });
    const cluster = [
      { x: 100, y: 100, radius: 13 },
      { x: 110, y: 105, radius: 13 },
      { x: 120, y: 95, radius: 13 },
    ];
    expect(findEnemiesInBlast(explosion, cluster)).toHaveLength(3);
  });

  it('an upgraded blast radius catches more', () => {
    const maxed = createInitialUpgradeState();
    maxed.primary[0] = 10;
    const maxedStats = resolveWeaponStats(CANNON, maxed)!;
    expect(maxedStats.explosionRadius).toBeGreaterThan(stats.explosionRadius);

    const spread = [
      { x: 100, y: 100, radius: 13 },
      { x: 150, y: 100, radius: 13 },
    ];
    const small = findEnemiesInBlast(blast({ radius: stats.explosionRadius }), spread);
    const large = findEnemiesInBlast(blast({ radius: maxedStats.explosionRadius }), spread);
    expect(large.length).toBeGreaterThanOrEqual(small.length);
  });
});
