/**
 * Penetration Cannon — the first round that outlives its own impact.
 *
 * The interesting behaviour is not "it keeps going"; it is the already-hit
 * list, which is what stops a surviving round detonating on every frame it
 * spends inside the same enemy. These tests simulate that frame by frame
 * rather than asserting the flag, because the flag on its own proves nothing.
 */
import { describe, expect, it } from 'vitest';
import {
  CANNON,
  BIG_CANNON,
  createFiringState,
  fire,
  getWeapon,
  PENETRATION_CANNON,
  resolveWeaponStats,
} from './firing';
import { advanceBullet, findHit } from './bullets';
import type { BulletState, HitTarget } from './bullets';
import { blastDamage, createExplosion } from './explosions';
import { damageTypeOf, resolveDamageMultipliers } from '../enemies/damageTypes';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';

const FRAME = 1000 / 30;
const context = { x: 320, y: 480, towerRotation: 0 };

function upgrades(level = 1) {
  const state = createInitialUpgradeState();
  state.primary[10] = level;
  return state;
}

describe('registration', () => {
  it('is exposed as a ported weapon', () => {
    expect(getWeapon('Penetration Cannon')).toBe(PENETRATION_CANNON);
  });

  it('explodes and penetrates, which no other ported weapon does', () => {
    expect(PENETRATION_CANNON.explosion).toBe(true);
    expect(PENETRATION_CANNON.penetrates).toBe(true);
    expect(CANNON.penetrates).toBeUndefined();
    expect(BIG_CANNON.penetrates).toBeUndefined();
  });

  it('is untyped, so its damage runs on the Explosions channel', () => {
    // Like the Cannon and Big Cannon: BulletPenetrate matches no typed branch,
    // and an exploding round deals no direct damage anyway.
    expect(damageTypeOf(PENETRATION_CANNON.bulletClass!)).toBeNull();
  });
});

describe('stats from the upgrade table', () => {
  it('reads level 1 and 10 correctly', () => {
    expect(resolveWeaponStats(PENETRATION_CANNON, upgrades())).toEqual({
      reloadTimeMax: 19,
      damage: 6,
      explosionRadius: 40,
    });

    const maxed = resolveWeaponStats(PENETRATION_CANNON, upgrades(10))!;
    expect(maxed).toEqual({ reloadTimeMax: 17, damage: 10, explosionRadius: 67 });
  });

  it('maps its tracks to the AS3 table', () => {
    const table = findUpgradeById('PenetrationCannon')!;
    expect(table.stats[PENETRATION_CANNON.reloadTrack][0]).toBe(19);
    expect(table.stats[PENETRATION_CANNON.damageTrack][0]).toBe(6);
    expect(table.stats[PENETRATION_CANNON.explosionTrack!][0]).toBe(40);
  });

  it('carries a smaller blast than the Big Cannon', () => {
    const state = createInitialUpgradeState();
    state.primary[2] = 1;
    state.primary[10] = 1;
    const big = resolveWeaponStats(BIG_CANNON, state)!;
    const pen = resolveWeaponStats(PENETRATION_CANNON, state)!;
    // Exactly half at level 1 — 40 against 80.
    expect(pen.explosionRadius).toBe(big.explosionRadius / 2);
  });

  it('is unavailable when unowned', () => {
    expect(resolveWeaponStats(PENETRATION_CANNON, upgrades(0))).toBeNull();
  });
});

describe('the bullet it produces', () => {
  it('is marked as penetrating', () => {
    const stats = resolveWeaponStats(PENETRATION_CANNON, upgrades())!;
    const [bullet] = fire(createFiringState(), PENETRATION_CANNON, stats, context);
    expect(bullet.penetrates).toBe(true);
    expect(bullet.explosion).toBe(true);
  });

  it('leaves other weapons non-penetrating', () => {
    const stats = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    const [bullet] = fire(createFiringState(), CANNON, stats, context);
    expect(bullet.penetrates).toBe(false);
  });
});

describe('findHit with an already-hit filter', () => {
  const bullet: BulletState = {
    x: 100,
    y: 100,
    xVel: 0,
    yVel: 0,
    rotation: 0,
    radius: 3,
    damage: 6,
    explosion: true,
    explosionRadius: 40,
    penetrates: true,
  };

  const targets: HitTarget[] = [
    { x: 100, y: 100, radius: 13 },
    { x: 105, y: 100, radius: 13 },
  ];

  it('finds the first target with no filter', () => {
    expect(findHit(bullet, targets)).toBe(0);
  });

  it('skips a filtered target and finds the next', () => {
    expect(findHit(bullet, targets, (_t, i) => i !== 0)).toBe(1);
  });

  it('returns -1 when everything overlapping is filtered out', () => {
    expect(findHit(bullet, targets, () => false)).toBe(-1);
  });

  it('does not let the filter invent hits out of range', () => {
    const distant: HitTarget[] = [{ x: 900, y: 900, radius: 13 }];
    expect(findHit(bullet, distant, () => true)).toBe(-1);
  });
});

describe('flying through a line of enemies', () => {
  /**
   * Runs a bullet across the room against fixed targets, resolving hits the
   * way GameplayScene.advanceBullets does.
   */
  function flyThrough(
    penetrates: boolean,
    targets: readonly HitTarget[],
  ): { hits: number[]; blasts: number } {
    const stats = resolveWeaponStats(PENETRATION_CANNON, upgrades())!;
    const [spec] = fire(createFiringState(), PENETRATION_CANNON, stats, {
      x: 0,
      y: 100,
      towerRotation: 0,
    });

    let state: BulletState | null = { ...spec, penetrates };
    const alreadyHit = new Set<number>();
    const hits: number[] = [];
    let blasts = 0;

    for (let frame = 0; frame < 200 && state; frame += 1) {
      state = advanceBullet(state, { roomWidth: 640, roomHeight: 960 }, FRAME);
      if (!state) break;

      const index = findHit(
        state,
        targets,
        penetrates ? (_t, i) => !alreadyHit.has(i) : undefined,
      );
      if (index === -1) continue;

      blasts += 1;
      hits.push(index);

      if (penetrates) alreadyHit.add(index);
      else break;
    }

    return { hits, blasts };
  }

  // Three enemies strung out along the bullet's path, spaced well apart.
  const line: HitTarget[] = [
    { x: 150, y: 100, radius: 13 },
    { x: 300, y: 100, radius: 13 },
    { x: 450, y: 100, radius: 13 },
  ];

  it('hits every enemy along the line', () => {
    expect(flyThrough(true, line).hits).toEqual([0, 1, 2]);
  });

  it('detonates exactly once per enemy, not once per overlapping frame', () => {
    // This is the whole point of enemiesArray. At 18 units/frame against a
    // radius-13 target the bullet overlaps for two frames or more, so without
    // the list this count would exceed three.
    expect(flyThrough(true, line).blasts).toBe(3);
  });

  it('an ordinary round stops at the first enemy', () => {
    const plain = flyThrough(false, line);
    expect(plain.hits).toEqual([0]);
    expect(plain.blasts).toBe(1);
  });

  it('without the already-hit filter the same round would multi-detonate', () => {
    // Demonstrates the bug the list exists to prevent: penetrating flight with
    // no filter re-triggers on the enemy it is still inside.
    const stats = resolveWeaponStats(PENETRATION_CANNON, upgrades())!;
    const [spec] = fire(createFiringState(), PENETRATION_CANNON, stats, {
      x: 0,
      y: 100,
      towerRotation: 0,
    });

    let state: BulletState | null = { ...spec };
    let blasts = 0;
    for (let frame = 0; frame < 200 && state; frame += 1) {
      state = advanceBullet(state, { roomWidth: 640, roomHeight: 960 }, FRAME);
      if (!state) break;
      if (findHit(state, line) !== -1) blasts += 1;
    }
    expect(blasts).toBeGreaterThan(3);
  });

  it('carries on past a lone enemy to the room border', () => {
    const single: HitTarget[] = [{ x: 150, y: 100, radius: 13 }];
    expect(flyThrough(true, single).blasts).toBe(1);
  });

  it('misses enemies off the line entirely', () => {
    const offset: HitTarget[] = [{ x: 300, y: 400, radius: 13 }];
    expect(flyThrough(true, offset).blasts).toBe(0);
  });
});

describe('what penetration is worth', () => {
  const stats = resolveWeaponStats(PENETRATION_CANNON, upgrades())!;

  const blast = (type: string, radius: number, damage: number): number =>
    blastDamage(
      createExplosion({ x: 0, y: 0, radius, damage, type: 'Normal', smallSound: true }),
      resolveDamageMultipliers(type),
    );

  it('loses to the Cannon on a single target', () => {
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    const cannonDps =
      blast('Basic', cannon.explosionRadius, cannon.damage) / cannon.reloadTimeMax;
    const penDps = blast('Basic', stats.explosionRadius, stats.damage) / stats.reloadTimeMax;
    expect(penDps).toBeLessThan(cannonDps);
  });

  it('wins once it lines up three targets', () => {
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    const cannonDps =
      blast('Basic', cannon.explosionRadius, cannon.damage) / cannon.reloadTimeMax;
    const penDps =
      (blast('Basic', stats.explosionRadius, stats.damage) * 3) / stats.reloadTimeMax;
    expect(penDps).toBeGreaterThan(cannonDps);
  });

  it('is resisted by Strong like any other blast', () => {
    expect(blast('Strong', stats.explosionRadius, stats.damage)).toBeCloseTo(
      blast('Basic', stats.explosionRadius, stats.damage) / 2,
      10,
    );
  });
});
