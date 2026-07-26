import { describe, expect, it } from 'vitest';
import { ENEMY_STAT_TYPES, ENEMY_STATS } from './enemyStatsData';
import {
  getBaseStats,
  isBossLevel,
  isShooter,
  resolveEnemyStats,
  totalLevelHealth,
} from './enemyStats';
import { BESTIARY } from './bestiaryData';
import { LEVELS, getLevel } from '../levels/levelData';
import { DIFFICULTY_PROFILES, ENEMY_TIER_MULTIPLIERS } from '../config/difficultyMultipliers';
import { Difficulties, EnemyLevels } from '../config/constants';

describe('enemy stat tables', () => {
  it('has 20 types with both variants', () => {
    expect(ENEMY_STAT_TYPES).toHaveLength(20);
    for (const type of ENEMY_STAT_TYPES) {
      expect(ENEMY_STATS[type].normal, type).toBeDefined();
      expect(ENEMY_STATS[type].boss, type).toBeDefined();
    }
  });

  it('covers exactly the bestiary', () => {
    expect([...ENEMY_STAT_TYPES].sort()).toEqual(BESTIARY.map((e) => e.id).sort());
  });

  it('covers every type used in the level tables', () => {
    const used = new Set(LEVELS.flat().flatMap((l) => l.enemies.map((e) => e.type)));
    for (const type of used) expect(ENEMY_STATS[type], type).toBeDefined();
  });

  it('preserves known rows from ScreenGame.as', () => {
    expect(ENEMY_STATS.Basic.normal).toMatchObject({
      damage: 5,
      health: 10,
      money: 50,
      moveSpeedMax: 1.5,
      accSpeed: 0.2,
      rotSpeedMax: 1,
      particle: 'EnemyGreen',
      shoot: false,
    });
    expect(ENEMY_STATS.Basic.boss).toMatchObject({ damage: 15, health: 500, money: 500 });
  });

  it('populates shoot columns only for shooters', () => {
    for (const type of ENEMY_STAT_TYPES) {
      for (const variant of ['normal', 'boss'] as const) {
        const stats = ENEMY_STATS[type][variant];
        if (stats.shoot) {
          expect(stats.shootType, `${type}.${variant}`).toBeDefined();
          expect(stats.shootAngle, `${type}.${variant}`).toBeDefined();
          expect(stats.reloadTimeMax, `${type}.${variant}`).toBeGreaterThan(0);
          expect(stats.bulletAmount, `${type}.${variant}`).toBeGreaterThan(0);
        } else {
          expect(stats.shootType, `${type}.${variant}`).toBeUndefined();
        }
      }
    }
  });

  it('has 7 shooting types', () => {
    expect(ENEMY_STAT_TYPES.filter(isShooter)).toHaveLength(7);
    expect(isShooter('Shooting')).toBe(true);
    expect(isShooter('Basic')).toBe(false);
  });

  it('gives every table positive health and money', () => {
    for (const type of ENEMY_STAT_TYPES) {
      for (const variant of ['normal', 'boss'] as const) {
        expect(ENEMY_STATS[type][variant].health, `${type}.${variant}`).toBeGreaterThan(0);
        expect(ENEMY_STATS[type][variant].money, `${type}.${variant}`).toBeGreaterThan(0);
      }
    }
  });

  it('makes every boss variant tougher than its normal form', () => {
    for (const type of ENEMY_STAT_TYPES) {
      expect(ENEMY_STATS[type].boss.health, type).toBeGreaterThan(ENEMY_STATS[type].normal.health);
    }
  });
});

describe('getBaseStats', () => {
  it('picks the boss table only for level B', () => {
    expect(getBaseStats('Basic', '1')).toBe(ENEMY_STATS.Basic.normal);
    expect(getBaseStats('Basic', '2')).toBe(ENEMY_STATS.Basic.normal);
    expect(getBaseStats('Basic', '3')).toBe(ENEMY_STATS.Basic.normal);
    expect(getBaseStats('Basic', 'B')).toBe(ENEMY_STATS.Basic.boss);
  });

  it('returns undefined for an unknown type', () => {
    expect(getBaseStats('Wyvern', '1')).toBeUndefined();
  });

  it('identifies boss levels', () => {
    expect(isBossLevel('B')).toBe(true);
    expect(isBossLevel('3')).toBe(false);
  });
});

describe('resolveEnemyStats — difficulty scaling', () => {
  it('leaves Easy tier 1 identical to the base table', () => {
    const base = ENEMY_STATS.Basic.normal;
    const resolved = resolveEnemyStats('Basic', '1', 'Easy');

    expect(resolved).toMatchObject({
      damage: base.damage,
      health: base.health,
      money: base.money,
      moveSpeedMax: base.moveSpeedMax,
      rotSpeedMax: base.rotSpeedMax,
    });
  });

  it('applies the Hard health and damage multipliers', () => {
    const base = ENEMY_STATS.Basic.normal;
    const hard = DIFFICULTY_PROFILES.Hard;
    const resolved = resolveEnemyStats('Basic', '1', 'Hard');

    expect(resolved?.health).toBe(Math.round(base.health * hard.enemyHealth));
    expect(resolved?.damage).toBe(Math.round(base.damage * hard.enemyDamage));
  });

  it('applies the speed and rotation multipliers without rounding', () => {
    const base = ENEMY_STATS.Basic.normal;
    const medium = DIFFICULTY_PROFILES.Medium;
    const resolved = resolveEnemyStats('Basic', '1', 'Medium');

    expect(resolved?.moveSpeedMax).toBeCloseTo(base.moveSpeedMax * medium.enemySpeed, 10);
    expect(resolved?.accSpeed).toBeCloseTo(base.accSpeed * medium.enemySpeed, 10);
    expect(resolved?.rotSpeedMax).toBeCloseTo(base.rotSpeedMax * medium.enemyRotation, 10);
  });

  it('does not scale money by difficulty, only by tier', () => {
    const base = ENEMY_STATS.Basic.normal;
    for (const difficulty of Difficulties) {
      expect(resolveEnemyStats('Basic', '1', difficulty)?.money).toBe(base.money);
    }
  });

  it('makes Hard strictly harder than Easy for every non-boss type', () => {
    for (const type of ENEMY_STAT_TYPES) {
      const easy = resolveEnemyStats(type, '1', 'Easy');
      const hard = resolveEnemyStats(type, '1', 'Hard');
      expect(hard?.health, type).toBeGreaterThanOrEqual(easy?.health ?? 0);
      expect(hard?.damage, type).toBeGreaterThanOrEqual(easy?.damage ?? 0);
    }
  });

  it('shortens the reload time on harder difficulties', () => {
    // reloadTime multiplier is < 1 on Medium/Hard: enemies fire faster.
    const easy = resolveEnemyStats('Shooting', '1', 'Easy');
    const hard = resolveEnemyStats('Shooting', '1', 'Hard');
    expect(hard?.reloadTimeMax).toBeLessThan(easy?.reloadTimeMax ?? 0);
  });
});

describe('resolveEnemyStats — tier scaling', () => {
  it('scales health and damage by the tier multiplier', () => {
    const base = ENEMY_STATS.Basic.normal;
    const tier3 = resolveEnemyStats('Basic', '3', 'Easy');

    expect(tier3?.health).toBe(Math.round(base.health * ENEMY_TIER_MULTIPLIERS['3']));
    expect(tier3?.damage).toBe(Math.round(base.damage * ENEMY_TIER_MULTIPLIERS['3']));
  });

  it('scales money by tier', () => {
    const base = ENEMY_STATS.Basic.normal;
    expect(resolveEnemyStats('Basic', '2', 'Easy')?.money).toBe(
      Math.round(base.money * ENEMY_TIER_MULTIPLIERS['2']),
    );
  });

  it('stacks tier and difficulty for a non-boss', () => {
    const base = ENEMY_STATS.Basic.normal;
    const resolved = resolveEnemyStats('Basic', '3', 'Hard');
    expect(resolved?.health).toBe(
      Math.round(base.health * DIFFICULTY_PROFILES.Hard.enemyHealth * ENEMY_TIER_MULTIPLIERS['3']),
    );
  });
});

describe('resolveEnemyStats — bosses', () => {
  it('exempts boss health from the difficulty multiplier', () => {
    // getTotalHealth sets multiplierHealth = 1 for enemyLevel "B".
    const base = ENEMY_STATS.Basic.boss;
    for (const difficulty of Difficulties) {
      expect(resolveEnemyStats('Basic', 'B', difficulty)?.health, difficulty).toBe(base.health);
    }
  });

  it('still applies the difficulty damage multiplier to bosses', () => {
    const base = ENEMY_STATS.Basic.boss;
    expect(resolveEnemyStats('Basic', 'B', 'Hard')?.damage).toBe(
      Math.round(base.damage * DIFFICULTY_PROFILES.Hard.enemyDamage),
    );
  });

  it('splits health across the number of bosses', () => {
    const base = ENEMY_STATS.Basic.boss;
    const resolved = resolveEnemyStats('Basic', 'B', 'Easy', { bossAmount: 3 });
    expect(resolved?.health).toBe(Math.round(base.health / 3));
  });

  it('splits money and rounds it to the nearest 10', () => {
    const base = ENEMY_STATS.Basic.boss;
    const resolved = resolveEnemyStats('Basic', 'B', 'Easy', { bossAmount: 3 });
    expect(resolved?.money).toBe(Math.round(base.money / 3 / 10) * 10);
    expect(resolved!.money % 10).toBe(0);
  });

  it('rounds every boss money value to a multiple of 10', () => {
    for (const type of ENEMY_STAT_TYPES) {
      for (const amount of [1, 2, 3]) {
        const resolved = resolveEnemyStats(type, 'B', 'Hard', { bossAmount: amount });
        expect(resolved!.money % 10, `${type} x${amount}`).toBe(0);
      }
    }
  });

  it('treats a zero or negative bossAmount as 1 rather than producing Infinity', () => {
    const single = resolveEnemyStats('Basic', 'B', 'Easy', { bossAmount: 1 });
    for (const bad of [0, -3]) {
      const resolved = resolveEnemyStats('Basic', 'B', 'Easy', { bossAmount: bad });
      expect(Number.isFinite(resolved!.health)).toBe(true);
      expect(resolved!.health).toBe(single!.health);
    }
  });
});

describe('resolveEnemyStats — robustness', () => {
  it('returns undefined for an unknown type', () => {
    expect(resolveEnemyStats('Wyvern', '1', 'Easy')).toBeUndefined();
  });

  it('produces finite, non-negative values for every combination', () => {
    for (const type of ENEMY_STAT_TYPES) {
      for (const level of EnemyLevels) {
        for (const difficulty of Difficulties) {
          const resolved = resolveEnemyStats(type, level, difficulty, { bossAmount: 3 });
          const where = `${type}/${level}/${difficulty}`;
          expect(resolved, where).toBeDefined();
          expect(Number.isFinite(resolved!.health), where).toBe(true);
          expect(resolved!.health, where).toBeGreaterThan(0);
          expect(resolved!.damage, where).toBeGreaterThanOrEqual(0);
          expect(resolved!.money, where).toBeGreaterThanOrEqual(0);
          expect(resolved!.moveSpeedMax, where).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('level integration', () => {
  it('resolves every enemy in every level', () => {
    for (let w = 1; w <= LEVELS.length; w += 1) {
      for (let l = 1; l <= LEVELS[w - 1].length; l += 1) {
        for (const entry of getLevel(w, l)!.enemies) {
          const resolved = resolveEnemyStats(entry.type, entry.level, 'Medium');
          expect(resolved, `${entry.type}${entry.level} in ${w}-${l}`).toBeDefined();
        }
      }
    }
  });

  it('makes world 1 level 1 a gentle opener', () => {
    const level = getLevel(1, 1)!;
    const health = totalLevelHealth(level.enemies, 'Easy');
    // 10 basic tier-1 enemies at 10 hp each.
    expect(health).toBe(100);
  });

  it('grows total level health across difficulties', () => {
    const level = getLevel(1, 2)!;
    const easy = totalLevelHealth(level.enemies, 'Easy');
    const hard = totalLevelHealth(level.enemies, 'Hard');
    expect(hard).toBeGreaterThan(easy);
  });

  it('ignores unknown types when summing rather than throwing', () => {
    expect(totalLevelHealth([{ type: 'Wyvern', level: '1', count: 5 }], 'Easy')).toBe(0);
  });
});

describe('flag model', () => {
  it('gives every Flag level flags and every other level none', () => {
    for (const level of LEVELS.flat()) {
      if (level.mode === 'Flag') {
        expect(level.flagCount).toBeGreaterThan(0);
        expect(level.flagMoney).toBeGreaterThan(0);
      } else {
        expect(level.flagCount).toBe(0);
        expect(level.flagMoney).toBe(0);
      }
    }
  });

  it('preserves a known flag row', () => {
    // flagModelW1 row 3 is [10, 102]; world 1 level 3 is the first Flag level.
    const level = getLevel(1, 3)!;
    expect(level.mode).toBe('Flag');
    expect(level.flagCount).toBe(10);
    expect(level.flagMoney).toBe(102);
  });
});
