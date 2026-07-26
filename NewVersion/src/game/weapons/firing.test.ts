import { describe, expect, it } from 'vitest';
import {
  CANNON,
  createFiringState,
  fire,
  getWeapon,
  resolveWeaponStats,
  tickFiring,
} from './firing';
import { advanceBullet, applyBulletDamage, findHit } from './bullets';
import type { BulletState } from './bullets';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import { resolveEnemyStats } from '../enemies/enemyStats';

const FRAME = 1000 / 30;
const upgrades = () => createInitialUpgradeState();

const context = { x: 320, y: 480, towerRotation: 0 };

describe('weapon specs', () => {
  it('exposes the Cannon', () => {
    expect(getWeapon('Cannon')).toBe(CANNON);
    // The full roster and the unported list live in weaponRoster.test.ts.
  });

  it('maps the Cannon tracks onto the upgrade table', () => {
    // upgradeArrayCannon after dropping prices: [reload, damage, explosion].
    const cannon = findUpgradeById('Cannon')!;
    expect(cannon.stats[CANNON.reloadTrack][0]).toBe(13);
    expect(cannon.stats[CANNON.damageTrack][0]).toBe(7);
    expect(cannon.stats[CANNON.explosionTrack!][0]).toBe(30);
  });
});

describe('resolveWeaponStats', () => {
  it('reads level 1 stats for the starter Cannon', () => {
    const stats = resolveWeaponStats(CANNON, upgrades());
    expect(stats).toEqual({ reloadTimeMax: 13, damage: 7, explosionRadius: 30 });
  });

  it('improves with the upgrade level', () => {
    const state = upgrades();
    state.primary[0] = 10;
    const stats = resolveWeaponStats(CANNON, state);
    expect(stats!.damage).toBe(10);
    expect(stats!.reloadTimeMax).toBe(11); // faster
  });

  it('returns null for an unowned weapon', () => {
    const state = upgrades();
    state.primary[0] = 0;
    expect(resolveWeaponStats(CANNON, state)).toBeNull();
  });
});

describe('fire', () => {
  const stats = { reloadTimeMax: 13, damage: 7, explosionRadius: 30 };

  it('produces a bullet when ready', () => {
    const state = createFiringState();
    const bullets = fire(state, CANNON, stats, context);
    expect(bullets).toHaveLength(1);
    expect(bullets[0].damage).toBe(7);
  });

  it('starts the bullet at the muzzle, not the tank centre', () => {
    const bullets = fire(createFiringState(), CANNON, stats, context);
    const offset = CANNON.muzzleOffset + CANNON.bulletRadius;
    expect(bullets[0].x).toBeCloseTo(context.x + offset, 6);
    expect(bullets[0].y).toBeCloseTo(context.y, 6);
  });

  it('sends the bullet along the turret facing', () => {
    const bullets = fire(createFiringState(), CANNON, stats, {
      ...context,
      towerRotation: 90,
    });
    expect(bullets[0].xVel).toBeCloseTo(0, 6);
    expect(bullets[0].yVel).toBeCloseTo(CANNON.bulletSpeed, 6);
  });

  it('blocks until the reload finishes', () => {
    const state = createFiringState();
    expect(fire(state, CANNON, stats, context)).toHaveLength(1);
    expect(fire(state, CANNON, stats, context)).toHaveLength(0);

    for (let i = 0; i < 13; i += 1) tickFiring(state, FRAME);
    expect(fire(state, CANNON, stats, context)).toHaveLength(1);
  });

  it('accumulates the reload rather than resetting it', () => {
    // `reloadTime += reloadTimeMax` keeps cadence steady while held.
    const state = createFiringState();
    state.reloadTime = 0;
    fire(state, CANNON, stats, context);
    expect(state.reloadTime).toBe(13);
  });

  it('holds a steady cadence when fired continuously', () => {
    const state = createFiringState();
    let shots = 0;
    const frames = 300;
    for (let i = 0; i < frames; i += 1) {
      tickFiring(state, FRAME);
      shots += fire(state, CANNON, stats, context).length;
    }
    // 300 frames at one shot per 13 frames.
    expect(shots).toBeGreaterThanOrEqual(21);
    expect(shots).toBeLessThanOrEqual(24);
  });

  it('applies spread when a weapon has it', () => {
    const spread = { ...CANNON, spread: 20 };
    const low = fire(createFiringState(), spread, stats, { ...context, random: () => 0 });
    const high = fire(createFiringState(), spread, stats, { ...context, random: () => 1 });
    expect(low[0].rotation).toBeCloseTo(-10, 6);
    expect(high[0].rotation).toBeCloseTo(10, 6);
  });

  it('produces one bullet per bulletsPerShot', () => {
    const multi = { ...CANNON, bulletsPerShot: 5, spread: 30 };
    expect(fire(createFiringState(), multi, stats, context)).toHaveLength(5);
  });
});

describe('bullet flight', () => {
  const bullet = (overrides: Partial<BulletState> = {}): BulletState => ({
    x: 320,
    y: 480,
    xVel: 18,
    yVel: 0,
    rotation: 0,
    radius: 2,
    damage: 7,
    explosion: true,
    explosionRadius: 30,
    ...overrides,
  });

  const bounds = { roomWidth: 640, roomHeight: 960 };

  it('travels along its velocity', () => {
    const next = advanceBullet(bullet(), bounds, FRAME);
    expect(next!.x).toBeCloseTo(320 + 18, 6);
  });

  it('is removed at the room border', () => {
    expect(advanceBullet(bullet({ x: 639 }), bounds, FRAME)).toBeNull();
    expect(advanceBullet(bullet({ x: 1, xVel: -18 }), bounds, FRAME)).toBeNull();
  });

  it('is frame-rate independent', () => {
    let at30 = bullet();
    for (let i = 0; i < 10; i += 1) at30 = advanceBullet(at30, bounds, 1000 / 30)!;

    let at60 = bullet();
    for (let i = 0; i < 20; i += 1) at60 = advanceBullet(at60, bounds, 1000 / 60)!;

    expect(at60.x).toBeCloseTo(at30.x, 6);
  });

  it('crosses the room in a plausible time', () => {
    // 18 units/frame at 30 fps = 540 units/second; a 640-wide room takes ~1.2s.
    let current: BulletState | null = bullet({ x: 0 });
    let elapsed = 0;
    while (current && elapsed < 5000) {
      current = advanceBullet(current, bounds, FRAME);
      elapsed += FRAME;
    }
    expect(elapsed).toBeGreaterThan(1000);
    expect(elapsed).toBeLessThan(1400);
  });
});

describe('findHit', () => {
  const bullet: BulletState = {
    x: 100,
    y: 100,
    xVel: 0,
    yVel: 0,
    rotation: 0,
    radius: 2,
    damage: 7,
    explosion: false,
    explosionRadius: 0,
  };

  it('finds an overlapping target', () => {
    expect(findHit(bullet, [{ x: 105, y: 100, radius: 13 }])).toBe(0);
  });

  it('misses a distant target', () => {
    expect(findHit(bullet, [{ x: 300, y: 300, radius: 13 }])).toBe(-1);
  });

  it('accounts for both radii', () => {
    // Centres 16 apart, radii 13 + 2 = 15 -> just misses.
    expect(findHit(bullet, [{ x: 116, y: 100, radius: 13 }])).toBe(-1);
    expect(findHit(bullet, [{ x: 114, y: 100, radius: 13 }])).toBe(0);
  });

  it('returns the first of several overlapping targets', () => {
    expect(
      findHit(bullet, [
        { x: 300, y: 300, radius: 13 },
        { x: 101, y: 100, radius: 13 },
        { x: 102, y: 100, radius: 13 },
      ]),
    ).toBe(1);
  });

  it('handles an empty target list', () => {
    expect(findHit(bullet, [])).toBe(-1);
  });
});

describe('applyBulletDamage', () => {
  it('subtracts damage', () => {
    expect(applyBulletDamage(20, 7)).toEqual({ health: 13, killed: false, damageDealt: 7 });
  });

  it('kills at or below zero', () => {
    expect(applyBulletDamage(7, 7).killed).toBe(true);
    expect(applyBulletDamage(3, 7).killed).toBe(true);
  });
});

describe('the loop closes: Cannon versus a Basic enemy', () => {
  it('takes two shots to kill a tier-1 Basic on Easy', () => {
    const enemy = resolveEnemyStats('Basic', '1', 'Easy')!;
    const stats = resolveWeaponStats(CANNON, upgrades())!;

    expect(enemy.health).toBe(10);
    expect(stats.damage).toBe(7);

    let health = enemy.health;
    let shots = 0;
    while (health > 0) {
      health = applyBulletDamage(health, stats.damage).health;
      shots += 1;
    }
    expect(shots).toBe(2);
  });

  it('needs more total damage on Hard', () => {
    // Shot *count* is not always higher — Basic goes 10 -> 14 hp against 7
    // damage, which is two shots either way. Total damage is the honest metric.
    const easy = resolveEnemyStats('Basic', '1', 'Easy')!;
    const hard = resolveEnemyStats('Basic', '1', 'Hard')!;
    expect(hard.health).toBeGreaterThan(easy.health);

    const stats = resolveWeaponStats(CANNON, upgrades())!;
    expect(Math.ceil(hard.health / stats.damage)).toBeGreaterThanOrEqual(
      Math.ceil(easy.health / stats.damage),
    );
  });

  it('takes more shots on Hard for a tougher enemy', () => {
    const stats = resolveWeaponStats(CANNON, upgrades())!;
    const easy = resolveEnemyStats('Strong', '1', 'Easy')!;
    const hard = resolveEnemyStats('Strong', '1', 'Hard')!;

    expect(Math.ceil(hard.health / stats.damage)).toBeGreaterThan(
      Math.ceil(easy.health / stats.damage),
    );
  });

  it('a maxed Cannon one-shots a tier-1 Basic', () => {
    const state = upgrades();
    state.primary[0] = 10;
    const stats = resolveWeaponStats(CANNON, state)!;
    const enemy = resolveEnemyStats('Basic', '1', 'Easy')!;

    expect(applyBulletDamage(enemy.health, stats.damage).killed).toBe(true);
  });
});
