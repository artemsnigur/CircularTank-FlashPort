import { describe, expect, it } from 'vitest';
import { ENEMY_STAT_TYPES, ENEMY_STATS } from './enemyStatsData';
import { AS3_ENEMY_TURN_MULTIPLIER, ENEMY_TURN_MULTIPLIER, getBaseStats, isBossLevel, isShooter, resolveEnemyStats, totalLevelHealth } from './enemyStats';
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
  it('leaves Easy tier 1 identical to the base table, bar the turn divergence', () => {
    const base = ENEMY_STATS.Basic.normal;
    const resolved = resolveEnemyStats('Basic', '1', 'Easy');

    expect(resolved).toMatchObject({
      damage: base.damage,
      health: base.health,
      money: base.money,
      moveSpeedMax: base.moveSpeedMax,
    });
    // `rotSpeedMax` is the one field Easy does *not* pass through untouched —
    // divergence `A12`. Read through the constant so the relationship holds if
    // the multiplier is ever retuned; its magnitude is pinned separately.
    expect(resolved?.rotSpeedMax).toBeCloseTo(base.rotSpeedMax * ENEMY_TURN_MULTIPLIER, 10);
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
    // The difficulty ladder still applies; `A12` multiplies on top of it rather
    // than replacing it, so both factors are present.
    expect(resolved?.rotSpeedMax).toBeCloseTo(
      base.rotSpeedMax * medium.enemyRotation * ENEMY_TURN_MULTIPLIER,
      10,
    );
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

  /**
   * ── Divergence `A95`: the boss count no longer divides anything ─────────
   *
   * The AS3 divides a boss's health and money by `ScreenGame.bossAmount`
   * (`PartInterface.as:971`), so three bosses split one boss's worth. This
   * port does not, and there is nothing left to pass a count to.
   *
   * **The expected values here come from `ENEMY_STATS`, not from the AS3's
   * arithmetic**, which is the point: the source value for a lone Basic boss
   * is 500 and that is now what every Basic boss is worth, on a one-boss level
   * and on a ten-boss one alike.
   */
  it('gives a boss its whole stat line, whatever the level asks for', () => {
    const base = ENEMY_STATS.Basic.boss;
    expect(base.health).toBe(500);

    const resolved = resolveEnemyStats('Basic', 'B', 'Easy');
    expect(resolved?.health).toBe(base.health);
    expect(resolved?.money).toBe(Math.round(base.money / 10) * 10);
  });

  /**
   * The counterpart that makes the assertion above mean something: an
   * **ordinary** enemy's health does still scale, so "nothing divides" is not
   * passing because nothing multiplies either.
   */
  it('still scales an ordinary enemy by tier and difficulty', () => {
    const base = ENEMY_STATS.Basic.normal;
    const t1 = resolveEnemyStats('Basic', '1', 'Easy')!.health;
    const t3 = resolveEnemyStats('Basic', '3', 'Easy')!.health;
    const hard = resolveEnemyStats('Basic', '1', 'Hard')!.health;

    expect(t1).toBe(base.health);
    expect(t3).toBeGreaterThan(t1);
    expect(hard).toBeGreaterThan(t1);
  });

  it('rounds every boss money value to a multiple of 10', () => {
    for (const type of ENEMY_STAT_TYPES) {
      const resolved = resolveEnemyStats(type, 'B', 'Hard');
      expect(resolved!.money % 10, type).toBe(0);
    }
  });

  /**
   * There is no longer an argument that can produce `Infinity` here, so the
   * old guard test is gone rather than reworded. This replaces it with the
   * claim that actually needs holding: every boss line is finite and positive.
   */
  it('produces a finite, positive health for every boss on every difficulty', () => {
    for (const type of ENEMY_STAT_TYPES) {
      for (const difficulty of Difficulties) {
        const health = resolveEnemyStats(type, 'B', difficulty)!.health;
        expect(Number.isFinite(health), `${type}/${difficulty}`).toBe(true);
        expect(health, `${type}/${difficulty}`).toBeGreaterThan(0);
      }
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
          const resolved = resolveEnemyStats(type, level, difficulty);
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

/**
 * The turn divergence — **`A12`**, and the baseline it diverges from.
 *
 * The point of these is that the *data* stays the AS3's. `enemyStatsData.ts` is
 * generated from `ScreenGame.as` and checked by `data:check`; the multiplier is
 * applied at resolve time, so the source values remain readable and the change
 * is one constant to revert.
 */
describe('the enemy turn multiplier — divergence A12', () => {
  it('states both values from the source', () => {
    // Stated, not read back out of the module: `enemyBasicStats[5]` is 1, so
    // the original turns one degree per frame and the port turns two.
    expect(AS3_ENEMY_TURN_MULTIPLIER).toBe(1);
    expect(ENEMY_TURN_MULTIPLIER).toBe(2);
  });

  /**
   * **The baseline.** These are the AS3 rows, asserted against the source
   * numbers rather than against the resolver — if a future pass "fixes" the
   * divergence by editing the data instead of the constant, this fails.
   */
  it('leaves the stat table at the AS3 values', () => {
    // `ScreenGame.as:142` — [damage, health, money, moveSpeedMax, accSpeed,
    // rotSpeedMax, particle, shoot].
    expect(ENEMY_STATS.Basic.normal.rotSpeedMax).toBe(1);
    expect(ENEMY_STATS.Basic.normal.moveSpeedMax).toBe(1.5);
    expect(ENEMY_STATS.Basic.normal.accSpeed).toBe(0.2);
    // `:144` — the boss row shares the movement half of the Basic row.
    expect(ENEMY_STATS.Basic.boss.rotSpeedMax).toBe(1);
  });

  it('doubles the resolved turn and nothing else', () => {
    const base = ENEMY_STATS.Basic.normal;
    const resolved = resolveEnemyStats('Basic', '1', 'Easy')!;

    expect(resolved.rotSpeedMax).toBeCloseTo(base.rotSpeedMax * 2, 10);
    // The counterpart, and the reason this is a *turn* divergence: speed and
    // acceleration are untouched. A multiplier applied to the wrong field, or
    // to all three, passes the line above and fails here.
    expect(resolved.moveSpeedMax).toBeCloseTo(base.moveSpeedMax, 10);
    expect(resolved.accSpeed).toBeCloseTo(base.accSpeed, 10);
  });

  it('scales every type by the same factor, keeping their relative agility', () => {
    // Global, so Fast still out-turns Basic by exactly the ratio the AS3 gives
    // them. A per-type edit would pass the Basic assertions above and quietly
    // flatten the roster.
    for (const type of ['Basic', 'Fast', 'Shooting', 'Tank']) {
      const base = ENEMY_STATS[type]?.normal;
      if (!base) continue;
      const resolved = resolveEnemyStats(type, '1', 'Easy')!;
      expect(resolved.rotSpeedMax / base.rotSpeedMax, type).toBeCloseTo(ENEMY_TURN_MULTIPLIER, 10);
    }
  });

  it('composes with the difficulty ladder rather than replacing it', () => {
    // Hard turns faster than Easy by the AS3's own 1.2, on top of A12.
    const easy = resolveEnemyStats('Basic', '1', 'Easy')!;
    const hard = resolveEnemyStats('Basic', '1', 'Hard')!;

    expect(hard.rotSpeedMax / easy.rotSpeedMax).toBeCloseTo(
      DIFFICULTY_PROFILES.Hard.enemyRotation / DIFFICULTY_PROFILES.Easy.enemyRotation,
      10,
    );
  });
});
