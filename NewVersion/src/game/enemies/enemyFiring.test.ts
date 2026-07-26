/**
 * Enemy shooting — the Basic/Front slice.
 */
import { describe, expect, it } from 'vitest';
import {
  advanceEnemyBullet,
  applyBulletToTank,
  BASIC_BULLET_DAMAGE,
  BASIC_BULLET_LIFETIME,
  BASIC_BULLET_RADIUS,
  BASIC_BULLET_SPEED,
  bulletAlpha,
  canShoot,
  createBasicFrontBullet,
  createShooter,
  hitsTank,
  initialReloadTime,
  registerShot,
  tickShooter,
} from './enemyFiring';
import { resolveEnemyStats } from './enemyStats';
import { TANK_MAX_HP } from '../player/tankDamage';
import { getLevel } from '../levels/levelData';

const FRAME = 1000 / 30;
const bounds = { roomWidth: 640, roomHeight: 960 };

describe('the stats come from the tables', () => {
  it('Shooting is a Basic/Front shooter', () => {
    const stats = resolveEnemyStats('Shooting', '1', 'Easy')!;
    expect(stats.shoot).toBe(true);
    expect(stats.shootType).toBe('Basic');
    expect(stats.shootAngle).toBe('Front');
    expect(stats.reloadTimeMax).toBeGreaterThan(0);
  });

  it('Basic enemies do not shoot', () => {
    expect(resolveEnemyStats('Basic', '1', 'Easy')!.shoot).toBe(false);
  });

  it('harder difficulties reload faster', () => {
    const easy = resolveEnemyStats('Shooting', '1', 'Easy')!.reloadTimeMax!;
    const hard = resolveEnemyStats('Shooting', '1', 'Hard')!.reloadTimeMax!;
    expect(hard).toBeLessThan(easy);
  });
});

describe('the reload clock', () => {
  it('starts randomised, never already loaded', () => {
    // Without this every enemy of a wave fires in unison; the +10 floor stops
    // a shooter arriving ready.
    for (const roll of [0, 0.5, 1]) {
      const initial = initialReloadTime(120, () => roll);
      expect(initial).toBeGreaterThanOrEqual(10);
      expect(initial).toBeLessThanOrEqual(120);
    }
  });

  it('spreads shooters out rather than syncing them', () => {
    const values = new Set([0.1, 0.4, 0.9].map((r) => initialReloadTime(120, () => r)));
    expect(values.size).toBe(3);
  });

  it('blocks until it reaches zero, then fires', () => {
    let shooter = createShooter(30, () => 1); // initial 30
    expect(canShoot(shooter, false)).toBe(false);

    for (let i = 0; i < 30; i += 1) shooter = tickShooter(shooter, FRAME);
    expect(canShoot(shooter, false)).toBe(true);
  });

  it('resets to the full interval after firing', () => {
    let shooter = createShooter(30, () => 0);
    for (let i = 0; i < 30; i += 1) shooter = tickShooter(shooter, FRAME);
    shooter = registerShot(shooter);
    expect(shooter.reloadTime).toBe(30);
    expect(canShoot(shooter, false)).toBe(false);
  });

  it('is frame-rate independent', () => {
    let at60 = createShooter(30, () => 1);
    for (let i = 0; i < 60; i += 1) at60 = tickShooter(at60, 1000 / 60);
    expect(at60.reloadTime).toBe(0);
  });

  it('a frozen enemy does not shoot', () => {
    // Freeze stops shooting as well as movement.
    let shooter = createShooter(10, () => 0);
    for (let i = 0; i < 20; i += 1) shooter = tickShooter(shooter, FRAME);
    expect(canShoot(shooter, false)).toBe(true);
    expect(canShoot(shooter, true)).toBe(false);
  });
});

describe('the shot', () => {
  const origin = { x: 300, y: 300, rotation: 0, radius: 13 };

  it('leaves the enemy edge, not its centre', () => {
    const bullet = createBasicFrontBullet(origin);
    expect(bullet.x).toBeCloseTo(300 + 13 + BASIC_BULLET_RADIUS, 6);
    expect(bullet.y).toBeCloseTo(300, 6);
  });

  it('travels along the enemy facing', () => {
    const bullet = createBasicFrontBullet({ ...origin, rotation: 90 });
    expect(bullet.xVel).toBeCloseTo(0, 6);
    expect(bullet.yVel).toBeCloseTo(BASIC_BULLET_SPEED, 6);
  });

  it('carries the Basic stats', () => {
    const bullet = createBasicFrontBullet(origin);
    expect(bullet.damage).toBe(BASIC_BULLET_DAMAGE);
    expect(bullet.lifeTime).toBe(BASIC_BULLET_LIFETIME);
  });

  it('is sped up on harder difficulties', () => {
    const easy = createBasicFrontBullet(origin, 1);
    const hard = createBasicFrontBullet(origin, 1.3);
    expect(Math.hypot(hard.xVel, hard.yVel)).toBeCloseTo(
      Math.hypot(easy.xVel, easy.yVel) * 1.3,
      6,
    );
  });
});

describe('flight', () => {
  const bullet = () => createBasicFrontBullet({ x: 320, y: 480, rotation: 0, radius: 13 });

  it('moves along its velocity', () => {
    const next = advanceEnemyBullet(bullet(), bounds, FRAME)!;
    expect(next.x).toBeCloseTo(bullet().x + BASIC_BULLET_SPEED, 6);
  });

  it('dies past the room edge, allowing for its own radius', () => {
    // The bound is roomWidth + radius, so a bullet at 639 travelling 4 reaches
    // 643 and is still inside 644 — it survives one more frame.
    expect(advanceEnemyBullet({ ...bullet(), x: 639 }, bounds, FRAME)).not.toBeNull();
    expect(advanceEnemyBullet({ ...bullet(), x: 645 }, bounds, FRAME)).toBeNull();
  });

  it('dies when its lifetime runs out', () => {
    const old = { ...bullet(), lifeTime: 0.5, xVel: 0, yVel: 0 };
    expect(advanceEnemyBullet(old, bounds, FRAME)).toBeNull();
  });

  it('fades over the last ten frames', () => {
    expect(bulletAlpha({ ...bullet(), lifeTime: 900 })).toBe(1);
    expect(bulletAlpha({ ...bullet(), lifeTime: 10 })).toBeCloseTo(1, 6);
    expect(bulletAlpha({ ...bullet(), lifeTime: 0 })).toBeCloseTo(0.3, 6);
  });

  it('is frame-rate independent', () => {
    let at30 = bullet();
    for (let i = 0; i < 10; i += 1) at30 = advanceEnemyBullet(at30, bounds, 1000 / 30)!;
    let at60 = bullet();
    for (let i = 0; i < 20; i += 1) at60 = advanceEnemyBullet(at60, bounds, 1000 / 60)!;
    expect(at60.x).toBeCloseTo(at30.x, 6);
  });
});

describe('hitting the tank', () => {
  const bullet = createBasicFrontBullet({ x: 100, y: 100, rotation: 0, radius: 0 });

  it('needs the radii to overlap', () => {
    expect(hitsTank(bullet, { x: bullet.x + 16, y: 100, radius: 13 })).toBe(true);
    expect(hitsTank(bullet, { x: bullet.x + 20, y: 100, radius: 13 })).toBe(false);
  });

  it('floors health at zero rather than going negative', () => {
    // `:1574` sets exactly 0 when a hit would overkill.
    expect(applyBulletToTank(1, 5)).toBe(0);
    expect(applyBulletToTank(100, 1)).toBe(99);
  });
});

describe('defeat is now reachable', () => {
  it('contact alone could never kill the tank on level 1-1', () => {
    // 10 enemies, each dying on contact, capped the level's damage at 50.
    const spec = getLevel(1, 1)!;
    const contact = resolveEnemyStats('Basic', '1', 'Easy')!.damage;
    expect(spec.totalEnemies * contact).toBeLessThan(TANK_MAX_HP);
  });

  it('ranged fire removes the cap', () => {
    // A shooter survives its own shots, so its output is bounded only by time.
    const stats = resolveEnemyStats('Shooting', '1', 'Easy')!;
    const shotsToKill = Math.ceil(TANK_MAX_HP / BASIC_BULLET_DAMAGE);
    const framesToKill = shotsToKill * stats.reloadTimeMax!;
    expect(framesToKill).toBeGreaterThan(0);
    expect(Number.isFinite(framesToKill)).toBe(true);
  });
});
