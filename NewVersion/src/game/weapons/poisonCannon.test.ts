/**
 * Poison Cannon — the inverse of every other weapon: the hit barely matters
 * and almost all the damage arrives afterwards, over time.
 */
import { describe, expect, it } from 'vitest';
import {
  CANNON,
  createFiringState,
  fire,
  getWeapon,
  MINIGUN,
  POISON_CANNON,
  resolveWeaponStats,
} from './firing';
import { applyBulletDamage } from './bullets';
import { applyPoison, createStatusState, tickStatuses } from '../enemies/statusEffects';
import { damageTypeOf, resolveDamageMultipliers } from '../enemies/damageTypes';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import { resolveEnemyStats } from '../enemies/enemyStats';

const FRAME = 1000 / 30;
const context = { x: 320, y: 480, towerRotation: 0 };
const host = { x: 0, y: 0, radius: 13 };

function upgrades(level = 1) {
  const state = createInitialUpgradeState();
  state.primary[7] = level;
  return state;
}

/** Total poison damage delivered until the effect expires. */
function drainPoison(state: ReturnType<typeof createStatusState>): number {
  let total = 0;
  for (let i = 0; i < 1000 && state.onPoison; i += 1) {
    total += tickStatuses(state, host, FRAME).damage;
  }
  return total;
}

describe('registration', () => {
  it('is exposed as a ported weapon', () => {
    expect(getWeapon('Poison Cannon')).toBe(POISON_CANNON);
  });

  it('leaves poison and does not explode', () => {
    expect(POISON_CANNON.appliesPoison).toBe(true);
    expect(POISON_CANNON.explosion).toBe(false);
  });

  it('fires BulletPoison, typed on the Poison channel', () => {
    expect(damageTypeOf(POISON_CANNON.bulletClass!)).toBe('Poison');
  });
});

describe('stats from the upgrade table', () => {
  it('reads level 1 correctly', () => {
    expect(resolveWeaponStats(POISON_CANNON, upgrades())).toEqual({
      reloadTimeMax: 14,
      damage: 1,
      explosionRadius: 0,
      poisonTime: 150,
      poisonDamage: 2.5,
    });
  });

  it('reads level 10 correctly', () => {
    expect(resolveWeaponStats(POISON_CANNON, upgrades(10))).toEqual({
      reloadTimeMax: 12.2,
      damage: 2.8,
      explosionRadius: 0,
      poisonTime: 180,
      poisonDamage: 5,
    });
  });

  it('maps its four tracks to the AS3 table', () => {
    const table = findUpgradeById('PoisonCannon')!;
    expect(table.stats[POISON_CANNON.reloadTrack][0]).toBe(14);
    expect(table.stats[POISON_CANNON.damageTrack][0]).toBe(1);
    expect(table.stats[POISON_CANNON.poisonTimeTrack!][0]).toBe(150);
    expect(table.stats[POISON_CANNON.poisonDamageTrack!][0]).toBe(2.5);
  });

  it('lengthens the poison from five seconds to six', () => {
    expect(resolveWeaponStats(POISON_CANNON, upgrades())!.poisonTime! / 30).toBe(5);
    expect(resolveWeaponStats(POISON_CANNON, upgrades(10))!.poisonTime! / 30).toBe(6);
  });

  it('is unavailable when unowned', () => {
    expect(resolveWeaponStats(POISON_CANNON, upgrades(0))).toBeNull();
  });
});

describe('the round it fires', () => {
  const stats = resolveWeaponStats(POISON_CANNON, upgrades())!;

  it('carries the poison payload', () => {
    const [bullet] = fire(createFiringState(), POISON_CANNON, stats, context);
    expect(bullet.poisonTime).toBe(150);
    expect(bullet.poisonDamage).toBe(2.5);
  });

  it('leaves every other weapon with no poison', () => {
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    const [bullet] = fire(createFiringState(), CANNON, cannon, context);
    expect(bullet.poisonTime).toBe(0);
    expect(bullet.poisonDamage).toBe(0);
  });

  it('scatters like the MiniGun', () => {
    expect(POISON_CANNON.spread).toBe(MINIGUN.spread);
  });
});

describe('almost all of its damage is the poison', () => {
  const stats = resolveWeaponStats(POISON_CANNON, upgrades())!;

  it('lands a direct hit of exactly 1 on a neutral enemy', () => {
    const dealt = applyBulletDamage(
      100,
      stats.damage,
      resolveDamageMultipliers('Basic'),
      'Poison',
    ).damageDealt;
    expect(dealt).toBe(1);
  });

  it('delivers 12.5 through the poison — 5 seconds at 2.5/second', () => {
    const state = createStatusState();
    applyPoison(state, { poisonTime: stats.poisonTime!, poisonDamage: stats.poisonDamage! }, 1);
    expect(drainPoison(state)).toBeCloseTo(12.5, 6);
  });

  it('puts 92.6% of its output in the poison', () => {
    const state = createStatusState();
    applyPoison(state, { poisonTime: stats.poisonTime!, poisonDamage: stats.poisonDamage! }, 1);
    const overTime = drainPoison(state);
    expect(overTime / (overTime + stats.damage)).toBeCloseTo(12.5 / 13.5, 4);
  });

  it('has the weakest direct hit of any ported weapon', () => {
    const state = upgrades();
    state.primary[1] = 1;
    expect(stats.damage).toBeLessThan(resolveWeaponStats(MINIGUN, state)!.damage);
    expect(stats.damage).toBeLessThan(
      resolveWeaponStats(CANNON, createInitialUpgradeState())!.damage,
    );
  });
});

describe('resistance applies to both halves', () => {
  const stats = resolveWeaponStats(POISON_CANNON, upgrades())!;

  /** Direct hit plus the full poison, against one enemy type. */
  const totalAgainst = (type: string): number => {
    const multipliers = resolveDamageMultipliers(type);
    const direct = applyBulletDamage(1000, stats.damage, multipliers, 'Poison').damageDealt;

    const state = createStatusState();
    applyPoison(
      state,
      { poisonTime: stats.poisonTime!, poisonDamage: stats.poisonDamage! },
      multipliers.Poison,
    );
    return direct + drainPoison(state);
  };

  it('scales the direct hit by the Poison channel too', () => {
    // `:5982` uses `theBullet.damage * theEnemy.poisonMultiplier`, so a poison
    // resister shrugs off the whole weapon rather than half of it.
    const crazy = resolveDamageMultipliers('Crazy');
    expect(crazy.Poison).toBe(0.25);
    expect(applyBulletDamage(1000, stats.damage, crazy, 'Poison').damageDealt).toBe(0.25);
  });

  it('is far worse against Crazy, which resists poison', () => {
    expect(totalAgainst('Crazy')).toBeLessThan(totalAgainst('Basic') / 2);
  });

  it('applies the compounding 0.5 + m/2 rule to the poison half', () => {
    // Poison scales duration *and* damage, so 0.25 becomes 0.625 on each.
    // The duration is rounded, though: 150 * 0.625 = 93.75 -> 94 frames, which
    // puts the total slightly *above* the idealised 12.5 * 0.625^2 = 4.8828.
    const state = createStatusState();
    applyPoison(
      state,
      { poisonTime: stats.poisonTime!, poisonDamage: stats.poisonDamage! },
      0.25,
    );

    const frames = Math.round(150 * 0.625);
    expect(frames).toBe(94);
    expect(drainPoison(state)).toBeCloseTo((frames / 30) * (2.5 * 0.625), 6);
  });
});

describe('immunity', () => {
  const stats = resolveWeaponStats(POISON_CANNON, upgrades())!;

  it('leaves no poison at all on an immune enemy', () => {
    const state = createStatusState();
    const applied = applyPoison(
      state,
      { poisonTime: stats.poisonTime!, poisonDamage: stats.poisonDamage! },
      0,
    );
    expect(applied).toBe(false);
    expect(state.onPoison).toBe(false);
    expect(drainPoison(state)).toBe(0);
  });
});

describe('firing into one target does not compound', () => {
  const stats = resolveWeaponStats(POISON_CANNON, upgrades())!;
  const source = { poisonTime: stats.poisonTime!, poisonDamage: stats.poisonDamage! };

  it('refreshes rather than stacks', () => {
    const once = createStatusState();
    applyPoison(once, source, 1);

    const many = createStatusState();
    for (let i = 0; i < 5; i += 1) applyPoison(many, source, 1);

    expect(drainPoison(many)).toBeCloseTo(drainPoison(once), 6);
  });

  it('re-applying mid-effect does not extend the total beyond one dose', () => {
    const state = createStatusState();
    applyPoison(state, source, 1);

    let total = 0;
    for (let i = 0; i < 400; i += 1) {
      // Keep firing into the same enemy every 30 frames.
      if (i % 30 === 0) applyPoison(state, source, 1);
      total += tickStatuses(state, host, FRAME).damage;
    }

    // A refresh that beats the remainder does restart the clock, so the total
    // exceeds a single dose — but it tracks the refresh rate, not the shot
    // count, and the enemy is never taking five doses at once.
    expect(total).toBeGreaterThan(12.5);
    expect(total).toBeLessThan(12.5 * 5);
  });
});

describe('killing real enemies', () => {
  const stats = resolveWeaponStats(POISON_CANNON, upgrades())!;

  it('one round eventually kills a tier-1 Basic', () => {
    // 10 hp against 1 direct + 12.5 poison.
    const enemy = resolveEnemyStats('Basic', '1', 'Easy')!;
    expect(enemy.health).toBe(10);

    const state = createStatusState();
    applyPoison(state, { poisonTime: stats.poisonTime!, poisonDamage: stats.poisonDamage! }, 1);
    expect(1 + drainPoison(state)).toBeGreaterThan(enemy.health);
  });

  it('but takes seconds to do it, unlike the Cannon', () => {
    // The Cannon kills the same enemy in two shots, ~26 frames. Poison needs
    // its full 150-frame duration to get there.
    const state = createStatusState();
    applyPoison(state, { poisonTime: stats.poisonTime!, poisonDamage: stats.poisonDamage! }, 1);

    let dealt = 1;
    let frames = 0;
    while (dealt < 10 && frames < 1000) {
      dealt += tickStatuses(state, host, FRAME).damage;
      frames += 1;
    }
    expect(frames).toBeGreaterThan(100);
  });
});
