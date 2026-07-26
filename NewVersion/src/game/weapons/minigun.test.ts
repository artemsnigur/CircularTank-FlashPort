/**
 * MiniGun — the first weapon whose damage an enemy can actually resist.
 *
 * The Cannon proved the *explosion* path; this proves the **typed direct**
 * path, which is the one that was previously only exercised against a neutral
 * enemy.
 */
import { describe, expect, it } from 'vitest';
import {
  CANNON,
  createFiringState,
  fire,
  getWeapon,
  MINIGUN,
  PRIMARY_WEAPONS,
  resolveWeaponStats,
  tickFiring,
} from './firing';
import { applyBulletDamage } from './bullets';
import { blastDamage, createExplosion } from './explosions';
import { damageTypeOf, resolveDamageMultipliers } from '../enemies/damageTypes';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import { resolveEnemyStats } from '../enemies/enemyStats';

const FRAME = 1000 / 30;
const context = { x: 320, y: 480, towerRotation: 0 };

/** Both starter-owned; MiniGun needs granting since the shop is unported. */
function upgrades(minigunLevel = 1) {
  const state = createInitialUpgradeState();
  state.primary[1] = minigunLevel;
  return state;
}

describe('registration', () => {
  it('is exposed alongside the other ported weapons', () => {
    expect(getWeapon('MiniGun')).toBe(MINIGUN);
    // The full roster is asserted in weaponRoster.test.ts.
    expect(Object.keys(PRIMARY_WEAPONS)).toContain('MiniGun');
  });

  it('fires BulletSmall, which is typed on the Bullets channel', () => {
    expect(MINIGUN.bulletClass).toBe('BulletSmall');
    expect(damageTypeOf(MINIGUN.bulletClass!)).toBe('Bullets');
  });

  it('does not explode, unlike the Cannon', () => {
    expect(MINIGUN.explosion).toBe(false);
    expect(CANNON.explosion).toBe(true);
  });
});

describe('stats from the upgrade table', () => {
  it('reads level 1 correctly', () => {
    const stats = resolveWeaponStats(MINIGUN, upgrades())!;
    expect(stats.reloadTimeMax).toBe(1.45);
    expect(stats.damage).toBe(1.2);
    // No explosion track in upgradeArrayMiniGun.
    expect(stats.explosionRadius).toBe(0);
  });

  it('improves to level 10', () => {
    const stats = resolveWeaponStats(MINIGUN, upgrades(10))!;
    expect(stats.reloadTimeMax).toBe(1);
    expect(stats.damage).toBe(2.6);
  });

  it('maps its tracks to the AS3 table', () => {
    const table = findUpgradeById('MiniGun')!;
    expect(table.stats[MINIGUN.reloadTrack][0]).toBe(1.45);
    expect(table.stats[MINIGUN.damageTrack][0]).toBe(1.2);
    expect(table.stats).toHaveLength(2);
  });

  it('is unavailable when unowned', () => {
    expect(resolveWeaponStats(MINIGUN, upgrades(0))).toBeNull();
  });
});

describe('firing behaviour', () => {
  const stats = { reloadTimeMax: 1.45, damage: 1.2, explosionRadius: 0 };

  it('applies random spread around the turret facing', () => {
    // The general rule: rotation - spread/2 + random() * spread.
    const low = fire(createFiringState(), MINIGUN, stats, { ...context, random: () => 0 });
    const high = fire(createFiringState(), MINIGUN, stats, { ...context, random: () => 1 });

    expect(low[0].rotation).toBeCloseTo(-2.5, 6);
    expect(high[0].rotation).toBeCloseTo(2.5, 6);
  });

  it('fires far faster than the Cannon', () => {
    const cannonStats = resolveWeaponStats(CANNON, upgrades())!;

    const count = (spec: typeof MINIGUN, s: typeof stats): number => {
      const state = createFiringState();
      let shots = 0;
      for (let i = 0; i < 300; i += 1) {
        tickFiring(state, FRAME);
        shots += fire(state, spec, s, context).length;
      }
      return shots;
    };

    expect(count(MINIGUN, stats)).toBeGreaterThan(count(CANNON, cannonStats) * 5);
  });

  it('sends bullets twice as fast as the Cannon', () => {
    expect(MINIGUN.bulletSpeed).toBe(36);
    expect(MINIGUN.bulletSpeed).toBe(CANNON.bulletSpeed * 2);
  });
});

describe('typed damage — the thing the Cannon could not prove', () => {
  const stats = resolveWeaponStats(MINIGUN, upgrades())!;
  const channel = damageTypeOf(MINIGUN.bulletClass!);

  it('deals full damage to a neutral enemy', () => {
    const neutral = resolveDamageMultipliers('Basic');
    expect(applyBulletDamage(100, stats.damage, neutral, channel).damageDealt).toBeCloseTo(
      1.2,
      10,
    );
  });

  it('is halved by Strong, which resists Bullets 0.5', () => {
    const strong = resolveDamageMultipliers('Strong');
    expect(applyBulletDamage(100, stats.damage, strong, channel).damageDealt).toBeCloseTo(
      0.6,
      10,
    );
  });

  it('is reduced to 0.75x by Ninja', () => {
    const ninja = resolveDamageMultipliers('Ninja');
    expect(applyBulletDamage(100, stats.damage, ninja, channel).damageDealt).toBeCloseTo(
      0.9,
      10,
    );
  });

  it('is amplified 1.5x by Crazy, which is weak to Bullets', () => {
    const crazy = resolveDamageMultipliers('Crazy');
    expect(applyBulletDamage(100, stats.damage, crazy, channel).damageDealt).toBeCloseTo(
      1.8,
      10,
    );
  });

  it('takes twice as many hits to kill Strong as a neutral enemy of equal health', () => {
    const strong = resolveDamageMultipliers('Strong');
    const neutral = resolveDamageMultipliers('Basic');
    const health = 60;

    const shotsFor = (multipliers: ReturnType<typeof resolveDamageMultipliers>): number => {
      let hp = health;
      let shots = 0;
      while (hp > 0 && shots < 1000) {
        hp = applyBulletDamage(hp, stats.damage, multipliers, channel).health;
        shots += 1;
      }
      return shots;
    };

    expect(shotsFor(strong)).toBe(shotsFor(neutral) * 2);
  });
});

describe('the two weapons trade off against each other', () => {
  const state = upgrades();
  const minigun = resolveWeaponStats(MINIGUN, state)!;
  const cannon = resolveWeaponStats(CANNON, state)!;

  /** Damage per frame, accounting for reload cadence and resistance. */
  const minigunDps = (type: string): number => {
    const dealt = applyBulletDamage(
      Infinity,
      minigun.damage,
      resolveDamageMultipliers(type),
      damageTypeOf(MINIGUN.bulletClass!),
    ).damageDealt;
    return dealt / minigun.reloadTimeMax;
  };

  const cannonDps = (type: string): number => {
    const explosion = createExplosion({
      x: 0,
      y: 0,
      radius: cannon.explosionRadius,
      damage: cannon.damage,
      type: 'Normal',
      smallSound: true,
    });
    return blastDamage(explosion, resolveDamageMultipliers(type)) / cannon.reloadTimeMax;
  };

  it('MiniGun out-damages the Cannon against a neutral enemy', () => {
    expect(minigunDps('Basic')).toBeGreaterThan(cannonDps('Basic'));
  });

  it('both are halved against Strong, which resists Bullets and Explosions', () => {
    // Strong: ["Explosions", 0.5, "Bullets", 0.5] — it is the counter to both.
    expect(minigunDps('Strong')).toBeCloseTo(minigunDps('Basic') / 2, 10);
    expect(cannonDps('Strong')).toBeCloseTo(cannonDps('Basic') / 2, 10);
  });

  it('the Cannon wins against Trap, which is weak to Explosions', () => {
    // Trap resists Ice and Magic but is weak to Explosions (1.5x); it also has
    // no Bullets modifier, so the MiniGun gains nothing.
    expect(cannonDps('Trap')).toBeGreaterThan(cannonDps('Basic'));
    expect(minigunDps('Trap')).toBeCloseTo(minigunDps('Basic'), 10);
  });

  it('the MiniGun wins against Crazy, which is weak to Bullets', () => {
    // Crazy's tables are strengths ["Poison", 0.75] and weaknesses
    // ["Bullets", 0.5] — no Explosions entry, so the Cannon is simply
    // unaffected rather than penalised. The MiniGun pulls ahead on its own.
    expect(minigunDps('Crazy')).toBeCloseTo(minigunDps('Basic') * 1.5, 10);
    expect(cannonDps('Crazy')).toBeCloseTo(cannonDps('Basic'), 10);
    expect(minigunDps('Crazy') / cannonDps('Crazy')).toBeGreaterThan(
      minigunDps('Basic') / cannonDps('Basic'),
    );
  });
});

describe('killing real enemies', () => {
  const stats = resolveWeaponStats(MINIGUN, upgrades())!;
  const channel = damageTypeOf(MINIGUN.bulletClass!);

  const shotsToKill = (type: string, level: '1' | 'B' = '1'): number => {
    const enemy = resolveEnemyStats(type, level, 'Easy')!;
    const multipliers = resolveDamageMultipliers(type);
    let hp = enemy.health;
    let shots = 0;
    while (hp > 0 && shots < 5000) {
      hp = applyBulletDamage(hp, stats.damage, multipliers, channel).health;
      shots += 1;
    }
    return shots;
  };

  it('kills a Basic in nine shots at level 1', () => {
    // 10 hp against 1.2 damage.
    expect(shotsToKill('Basic')).toBe(9);
  });

  it('needs far more against Strong', () => {
    expect(shotsToKill('Strong')).toBeGreaterThan(shotsToKill('Basic') * 2);
  });

  it('kills everything eventually', () => {
    for (const type of ['Basic', 'Fast', 'Shooting', 'Strong', 'Ninja', 'Crazy']) {
      expect(shotsToKill(type), type).toBeLessThan(5000);
    }
  });
});
