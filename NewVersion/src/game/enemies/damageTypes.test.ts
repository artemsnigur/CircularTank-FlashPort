import { describe, expect, it } from 'vitest';
import {
  applyDamageType,
  BULLET_DAMAGE_TYPES,
  DAMAGE_TYPES,
  damageTypeOf,
  impactFeedback,
  isStrongAgainst,
  isWeakTo,
  resolveDamageMultipliers,
} from './damageTypes';
import { ENEMY_STAT_TYPES, ENEMY_STATS } from './enemyStatsData';
import { applyBulletDamage } from '../weapons/bullets';
import { resolveEnemyStats } from './enemyStats';

describe('the damage-type tables', () => {
  it('has all eight channels', () => {
    expect(DAMAGE_TYPES).toHaveLength(8);
    expect([...DAMAGE_TYPES].sort()).toEqual([
      'Bullets',
      'Explosions',
      'FireLava',
      'Food',
      'Ice',
      'Laser',
      'Magic',
      'Poison',
    ]);
  });

  it('only references channels that exist', () => {
    for (const type of ENEMY_STAT_TYPES) {
      for (const entry of [...ENEMY_STATS[type].strengths, ...ENEMY_STATS[type].weaknesses]) {
        expect(DAMAGE_TYPES, `${type}`).toContain(entry.damageType);
      }
    }
  });

  it('gives every resistance a value in (0, 1]', () => {
    for (const type of ENEMY_STAT_TYPES) {
      for (const entry of [...ENEMY_STATS[type].strengths, ...ENEMY_STATS[type].weaknesses]) {
        expect(entry.value, `${type}/${entry.damageType}`).toBeGreaterThan(0);
        expect(entry.value, `${type}/${entry.damageType}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('preserves known tables from ScreenGame.as', () => {
    expect(ENEMY_STATS.Strong.strengths).toEqual([
      { damageType: 'Explosions', value: 0.5 },
      { damageType: 'Bullets', value: 0.5 },
    ]);
    expect(ENEMY_STATS.Ninja.weaknesses).toEqual([{ damageType: 'FireLava', value: 0.5 }]);
  });

  it('leaves plain enemies with no resistances at all', () => {
    expect(ENEMY_STATS.Basic.strengths).toEqual([]);
    expect(ENEMY_STATS.Basic.weaknesses).toEqual([]);
  });
});

describe('resolveDamageMultipliers', () => {
  it('is all-neutral for an enemy with no tables', () => {
    const multipliers = resolveDamageMultipliers('Basic');
    for (const channel of DAMAGE_TYPES) expect(multipliers[channel], channel).toBe(1);
  });

  it('subtracts strengths', () => {
    // Strong: ["Explosions", 0.5, "Bullets", 0.5]
    const multipliers = resolveDamageMultipliers('Strong');
    expect(multipliers.Explosions).toBe(0.5);
    expect(multipliers.Bullets).toBe(0.5);
    expect(multipliers.Laser).toBe(1);
  });

  it('adds weaknesses', () => {
    // Ninja: strengths Bullets 0.25 / Laser 0.75, weakness FireLava 0.5
    const multipliers = resolveDamageMultipliers('Ninja');
    expect(multipliers.Bullets).toBe(0.75);
    expect(multipliers.Laser).toBe(0.25);
    expect(multipliers.FireLava).toBe(1.5);
  });

  it('is neutral for an unknown type rather than throwing', () => {
    const multipliers = resolveDamageMultipliers('Wyvern');
    for (const channel of DAMAGE_TYPES) expect(multipliers[channel]).toBe(1);
  });

  it('never produces a negative multiplier for any real enemy', () => {
    for (const type of ENEMY_STAT_TYPES) {
      const multipliers = resolveDamageMultipliers(type);
      for (const channel of DAMAGE_TYPES) {
        expect(multipliers[channel], `${type}/${channel}`).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('gives at least one enemy a real resistance and one a real vulnerability', () => {
    const withStrength = ENEMY_STAT_TYPES.filter((t) =>
      DAMAGE_TYPES.some((c) => isStrongAgainst(resolveDamageMultipliers(t), c)),
    );
    const withWeakness = ENEMY_STAT_TYPES.filter((t) =>
      DAMAGE_TYPES.some((c) => isWeakTo(resolveDamageMultipliers(t), c)),
    );
    expect(withStrength.length).toBeGreaterThan(5);
    expect(withWeakness.length).toBeGreaterThan(5);
  });
});

describe('damageTypeOf', () => {
  it('types the projectiles the AS3 branches on', () => {
    expect(damageTypeOf('BulletFire')).toBe('FireLava');
    expect(damageTypeOf('BulletSmall')).toBe('Bullets');
    expect(damageTypeOf('BulletShotgun')).toBe('Bullets');
    expect(damageTypeOf('BulletGummyBear')).toBe('Food');
    expect(damageTypeOf('BulletMagic')).toBe('Magic');
    expect(damageTypeOf('BulletIcicle')).toBe('Ice');
    expect(damageTypeOf('BulletPoison')).toBe('Poison');
  });

  it('leaves the Cannon round untyped', () => {
    // A plain `Bullet` matches no branch in the hit code, so it bypasses
    // resistances entirely — which is why the Cannon shipped before this.
    expect(damageTypeOf('Bullet')).toBeNull();
    expect(damageTypeOf('BulletBig')).toBeNull();
  });

  it('maps only to real channels', () => {
    for (const channel of Object.values(BULLET_DAMAGE_TYPES)) {
      expect(DAMAGE_TYPES).toContain(channel);
    }
  });
});

describe('applyDamageType', () => {
  const strong = resolveDamageMultipliers('Strong');

  it('halves damage against a resisted channel', () => {
    expect(applyDamageType(20, strong, 'Bullets')).toBe(10);
  });

  it('amplifies against a vulnerable channel', () => {
    const ninja = resolveDamageMultipliers('Ninja');
    expect(applyDamageType(20, ninja, 'FireLava')).toBe(30);
  });

  it('passes untyped damage through unchanged', () => {
    expect(applyDamageType(20, strong, null)).toBe(20);
  });

  it('leaves neutral channels alone', () => {
    expect(applyDamageType(20, strong, 'Magic')).toBe(20);
  });
});

describe('applyBulletDamage with resistances', () => {
  it('is unchanged for an untyped bullet', () => {
    const strong = resolveDamageMultipliers('Strong');
    expect(applyBulletDamage(20, 7, strong, null)).toEqual({
      health: 13,
      killed: false,
      damageDealt: 7,
    });
  });

  it('takes longer to kill a resistant enemy', () => {
    const strong = resolveDamageMultipliers('Strong');
    const enemy = resolveEnemyStats('Strong', '1', 'Easy')!;

    const plain = Math.ceil(enemy.health / 10);
    let health = enemy.health;
    let shots = 0;
    while (health > 0 && shots < 500) {
      health = applyBulletDamage(health, 10, strong, 'Bullets').health;
      shots += 1;
    }

    // Bullets are halved against Strong, so it takes twice as many.
    expect(shots).toBe(plain * 2);
  });

  it('kills faster on a weak channel', () => {
    const ninja = resolveDamageMultipliers('Ninja');
    const enemy = resolveEnemyStats('Ninja', '1', 'Easy')!;

    const fire = applyBulletDamage(enemy.health, 10, ninja, 'FireLava');
    const bullets = applyBulletDamage(enemy.health, 10, ninja, 'Bullets');
    expect(fire.damageDealt).toBeGreaterThan(bullets.damageDealt);
  });

  it('reports the damage actually dealt', () => {
    const strong = resolveDamageMultipliers('Strong');
    expect(applyBulletDamage(100, 20, strong, 'Bullets').damageDealt).toBe(10);
  });
});

describe('impactFeedback', () => {
  it('reports a resisted hit', () => {
    expect(impactFeedback(resolveDamageMultipliers('Strong'), 'Bullets')).toBe('Strength');
  });

  it('reports an amplified hit', () => {
    expect(impactFeedback(resolveDamageMultipliers('Ninja'), 'FireLava')).toBe('Weakness');
  });

  it('reports nothing for a neutral or untyped hit', () => {
    expect(impactFeedback(resolveDamageMultipliers('Basic'), 'Bullets')).toBeNull();
    expect(impactFeedback(resolveDamageMultipliers('Strong'), null)).toBeNull();
  });

  it('reports immunity at a zero multiplier', () => {
    const immune = { ...resolveDamageMultipliers('Basic'), Poison: 0 };
    expect(impactFeedback(immune, 'Poison')).toBe('Immune');
  });
});
