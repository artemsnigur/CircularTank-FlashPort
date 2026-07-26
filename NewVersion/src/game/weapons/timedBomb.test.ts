/**
 * Timed Bomb Cannon — the first weapon that does nothing at all on impact.
 *
 * Its round attaches to the enemy it hits and the damage arrives seconds
 * later, from the status tick, wherever that enemy has walked to. These tests
 * exercise the whole chain: fire -> attach -> fuse -> blast.
 */
import { describe, expect, it } from 'vitest';
import {
  CANNON,
  createFiringState,
  fire,
  getWeapon,
  resolveWeaponStats,
  TIMED_BOMB_CANNON,
} from './firing';
import { blastDamage, createExplosion } from './explosions';
import type { ExplosionSpec } from './explosions';
import {
  applyBomb,
  createStatusState,
  tickStatuses,
} from '../enemies/statusEffects';
import { damageTypeOf, resolveDamageMultipliers } from '../enemies/damageTypes';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import { resolveEnemyStats } from '../enemies/enemyStats';

const FRAME = 1000 / 30;
const context = { x: 320, y: 480, towerRotation: 0 };
const host = { x: 100, y: 200, radius: 13 };

function upgrades(level = 1) {
  const state = createInitialUpgradeState();
  state.primary[5] = level;
  return state;
}

describe('registration', () => {
  it('is exposed as a ported weapon', () => {
    expect(getWeapon('Timed Bomb Cannon')).toBe(TIMED_BOMB_CANNON);
  });

  it('attaches a bomb rather than exploding on contact', () => {
    expect(TIMED_BOMB_CANNON.attachesBomb).toBe(true);
    expect(CANNON.attachesBomb).toBeUndefined();
  });

  it('still carries explosion = true, which is what closes direct damage', () => {
    // `:5919` gates direct damage on `explosion == false`, and `:6171`
    // excludes BulletBomb from the impact blast. Both paths shut.
    expect(TIMED_BOMB_CANNON.explosion).toBe(true);
  });

  it('is untyped — the blast resolves on the Explosions channel', () => {
    expect(damageTypeOf(TIMED_BOMB_CANNON.bulletClass!)).toBeNull();
  });
});

describe('stats from the upgrade table', () => {
  it('reads level 1 correctly', () => {
    expect(resolveWeaponStats(TIMED_BOMB_CANNON, upgrades())).toEqual({
      reloadTimeMax: 9,
      damage: 8,
      explosionRadius: 110,
      bombTimer: 150,
    });
  });

  it('reads level 10 correctly', () => {
    expect(resolveWeaponStats(TIMED_BOMB_CANNON, upgrades(10))).toEqual({
      reloadTimeMax: 8,
      damage: 15,
      explosionRadius: 120,
      bombTimer: 120,
    });
  });

  it('maps its four tracks to the AS3 table', () => {
    const table = findUpgradeById('TimedBombCannon')!;
    expect(table.stats[TIMED_BOMB_CANNON.reloadTrack][0]).toBe(9);
    expect(table.stats[TIMED_BOMB_CANNON.damageTrack][0]).toBe(8);
    expect(table.stats[TIMED_BOMB_CANNON.explosionTrack!][0]).toBe(110);
    expect(table.stats[TIMED_BOMB_CANNON.bombTimerTrack!][0]).toBe(150);
  });

  it('shortens the fuse from five seconds to four as it levels', () => {
    const low = resolveWeaponStats(TIMED_BOMB_CANNON, upgrades())!;
    const high = resolveWeaponStats(TIMED_BOMB_CANNON, upgrades(10))!;
    expect(low.bombTimer! / 30).toBe(5);
    expect(high.bombTimer! / 30).toBe(4);
  });

  it('is unavailable when unowned', () => {
    expect(resolveWeaponStats(TIMED_BOMB_CANNON, upgrades(0))).toBeNull();
  });
});

describe('the round it fires', () => {
  const stats = resolveWeaponStats(TIMED_BOMB_CANNON, upgrades())!;

  it('carries the fuse onto the bullet', () => {
    const [bullet] = fire(createFiringState(), TIMED_BOMB_CANNON, stats, context);
    expect(bullet.bombTimer).toBe(150);
  });

  it('leaves every other weapon with no fuse', () => {
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    const [bullet] = fire(createFiringState(), CANNON, cannon, context);
    expect(bullet.bombTimer).toBe(0);
  });

  it('flies faster than a Cannon shell', () => {
    expect(TIMED_BOMB_CANNON.bulletSpeed).toBe(28);
    expect(TIMED_BOMB_CANNON.bulletSpeed).toBeGreaterThan(CANNON.bulletSpeed);
  });
});

describe('attach, fuse, detonate', () => {
  const stats = resolveWeaponStats(TIMED_BOMB_CANNON, upgrades())!;

  /** What the scene does on impact. */
  const attach = (state = createStatusState()) => {
    const [bullet] = fire(createFiringState(), TIMED_BOMB_CANNON, stats, context);
    const attached = applyBomb(state, {
      bombTimer: bullet.bombTimer,
      explosionRadius: bullet.explosionRadius,
      damage: bullet.damage,
    });
    return { state, attached };
  };

  it('attaches with the weapon stats', () => {
    const { state, attached } = attach();
    expect(attached).toBe(true);
    expect(state.bombTimer).toBe(150);
    expect(state.bombRadius).toBe(110);
    expect(state.bombDamage).toBe(8);
  });

  it('does nothing for five seconds, then blows up', () => {
    const { state } = attach();

    let explosions = 0;
    for (let i = 0; i < 149; i += 1) {
      explosions += tickStatuses(state, host, FRAME).explosions.length;
    }
    expect(explosions).toBe(0);

    for (let i = 0; i < 3; i += 1) {
      explosions += tickStatuses(state, host, FRAME).explosions.length;
    }
    expect(explosions).toBe(1);
  });

  it('blasts where the host is when the fuse ends, not where it was hit', () => {
    const { state } = attach();

    // The enemy walks while the fuse burns.
    let blast: ExplosionSpec | undefined;
    for (let i = 0; i < 200 && !blast; i += 1) {
      const moved = { x: 500 + i, y: 600 + i, radius: 13 };
      [blast] = tickStatuses(state, moved, FRAME).explosions;
    }

    expect(blast).toBeDefined();
    expect(blast!.x).toBeGreaterThan(600);
    expect(blast!.y).toBeGreaterThan(700);
  });

  it('enlarges the blast by the host radius', () => {
    const { state } = attach();
    let blast: ExplosionSpec | undefined;
    for (let i = 0; i < 200 && !blast; i += 1) {
      [blast] = tickStatuses(state, host, FRAME).explosions;
    }
    expect(blast!.radius).toBe(110 + host.radius);
  });

  it('deals no damage through the status tick itself', () => {
    // Everything arrives via the explosion, not as direct status damage.
    const { state } = attach();
    let damage = 0;
    for (let i = 0; i < 200; i += 1) damage += tickStatuses(state, host, FRAME).damage;
    expect(damage).toBe(0);
  });
});

describe('bombs do not stack', () => {
  const stats = resolveWeaponStats(TIMED_BOMB_CANNON, upgrades())!;
  const source = {
    bombTimer: stats.bombTimer!,
    explosionRadius: stats.explosionRadius,
    damage: stats.damage,
  };

  it('refuses a second bomb on the same enemy', () => {
    const state = createStatusState();
    expect(applyBomb(state, source)).toBe(true);
    expect(applyBomb(state, source)).toBe(false);
  });

  it('cannot be used to hold one enemy permanently pinned', () => {
    // Re-arming every 100 frames would keep it alive forever if it refreshed.
    const state = createStatusState();
    applyBomb(state, source);

    let explosions = 0;
    for (let i = 0; i < 300; i += 1) {
      if (i % 100 === 0) applyBomb(state, source);
      explosions += tickStatuses(state, host, FRAME).explosions.length;
    }
    expect(explosions).toBeGreaterThan(0);
  });

  it('accepts a fresh bomb once the previous one has gone off', () => {
    const state = createStatusState();
    applyBomb(state, source);
    for (let i = 0; i < 200; i += 1) tickStatuses(state, host, FRAME);
    expect(applyBomb(state, source)).toBe(true);
  });
});

describe('what the bomb is worth', () => {
  const stats = resolveWeaponStats(TIMED_BOMB_CANNON, upgrades())!;

  const blast = (type: string): number =>
    blastDamage(
      createExplosion({
        x: 0,
        y: 0,
        radius: stats.explosionRadius,
        damage: stats.damage,
        type: 'Normal',
        smallSound: true,
      }),
      resolveDamageMultipliers(type),
    );

  it('takes two bombs to kill a tier-1 Basic', () => {
    // 8 damage against 10 hp — the bomb is an area weapon, not a one-shot.
    expect(blast('Basic')).toBe(8);
    expect(resolveEnemyStats('Basic', '1', 'Easy')!.health).toBe(10);
  });

  it('is halved by Strong, like every Explosions-channel source', () => {
    expect(blast('Strong')).toBeCloseTo(blast('Basic') / 2, 10);
  });

  it('has a far bigger radius than the Cannon, at similar per-hit damage', () => {
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    expect(stats.explosionRadius).toBeGreaterThan(cannon.explosionRadius * 3);
    expect(stats.damage).toBeGreaterThan(cannon.damage);
  });

  it('fires fast, which is what pays for the delay', () => {
    // 9 frames against the Cannon's 13 — the fuse is the cost, not the cadence.
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    expect(stats.reloadTimeMax).toBeLessThan(cannon.reloadTimeMax);
  });
});
