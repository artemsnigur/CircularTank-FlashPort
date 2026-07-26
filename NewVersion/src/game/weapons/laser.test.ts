/**
 * Laser Cannon — beam geometry and the segment-vs-circle test.
 *
 * The collision routine is a direct port of the AS3's quadratic, so these
 * tests pin its edge cases as much as the happy path — including the tangent
 * rule, which is the one an "obvious fix" would break.
 */
import { describe, expect, it } from 'vitest';
import {
  circleToLineCollision,
  createBeam,
  findBeamHits,
  LASER_LENGTH,
  LASER_RADIUS,
  LASER_START_OFFSET,
} from './laser';
import type { BeamTarget } from './laser';
import {
  CANNON,
  createFiringState,
  fire,
  getWeapon,
  LASER_CANNON,
  resolveWeaponStats,
} from './firing';
import { applyBulletDamage } from './bullets';
import { damageTypeOf, resolveDamageMultipliers } from '../enemies/damageTypes';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import { resolveEnemyStats } from '../enemies/enemyStats';

const context = { x: 320, y: 480, towerRotation: 0 };

function upgrades(level = 1) {
  const state = createInitialUpgradeState();
  state.primary[8] = level;
  return state;
}

describe('registration', () => {
  it('is exposed as a ported weapon', () => {
    expect(getWeapon('Laser Cannon')).toBe(LASER_CANNON);
    expect(LASER_CANNON.isBeam).toBe(true);
  });

  it('is typed on the Laser channel', () => {
    // Previously recorded as untyped, on the belief that a separate
    // continuous-beam branch owned the channel. No such branch exists.
    expect(damageTypeOf(LASER_CANNON.bulletClass!)).toBe('Laser');
  });

  it('has no projectile speed', () => {
    expect(LASER_CANNON.bulletSpeed).toBe(0);
  });
});

describe('stats from the upgrade table', () => {
  it('reads level 1 and 10 correctly', () => {
    expect(resolveWeaponStats(LASER_CANNON, upgrades())).toEqual({
      reloadTimeMax: 23,
      damage: 5.5,
      explosionRadius: 0,
    });
    expect(resolveWeaponStats(LASER_CANNON, upgrades(10))).toEqual({
      reloadTimeMax: 21.2,
      damage: 12,
      explosionRadius: 0,
    });
  });

  it('has only two stat tracks', () => {
    const table = findUpgradeById('LaserCannon')!;
    expect(table.stats).toHaveLength(2);
    expect(table.stats[LASER_CANNON.reloadTrack][0]).toBe(23);
    expect(table.stats[LASER_CANNON.damageTrack][0]).toBe(5.5);
  });

  it('is unavailable when unowned', () => {
    expect(resolveWeaponStats(LASER_CANNON, upgrades(0))).toBeNull();
  });
});

describe('the beam segment', () => {
  it('starts at a flat 16 from the tank, not at the sprite offset', () => {
    const beam = createBeam(0, 0, 0);
    expect(beam.start).toEqual({ x: LASER_START_OFFSET, y: 0 });
    expect(LASER_START_OFFSET).toBe(16);
  });

  it('runs 1000 units', () => {
    const beam = createBeam(0, 0, 0);
    const length = Math.hypot(beam.end.x - beam.start.x, beam.end.y - beam.start.y);
    expect(length).toBeCloseTo(LASER_LENGTH, 6);
    expect(LASER_LENGTH).toBe(1000);
  });

  it('follows the turret', () => {
    const beam = createBeam(100, 100, 90);
    expect(beam.start.x).toBeCloseTo(100, 6);
    expect(beam.start.y).toBeCloseTo(116, 6);
    expect(beam.end.y).toBeCloseTo(1116, 6);
  });

  it('carries the beam radius', () => {
    expect(createBeam(0, 0, 0).radius).toBe(LASER_RADIUS);
    expect(LASER_RADIUS).toBe(12);
  });

  it('outranges any room in the game', () => {
    // Rooms top out at 960 tall; the beam crosses one end to the other.
    expect(LASER_LENGTH).toBeGreaterThan(960);
  });
});

describe('circleToLineCollision', () => {
  const a = { x: 0, y: 0 };
  const b = { x: 100, y: 0 };

  it('detects a circle straddling the segment', () => {
    expect(circleToLineCollision(a, b, { x: 50, y: 0 }, 10).collision).toBe(true);
  });

  it('misses a circle beside the segment', () => {
    expect(circleToLineCollision(a, b, { x: 50, y: 40 }, 10).collision).toBe(false);
  });

  it('misses a circle beyond the segment end', () => {
    expect(circleToLineCollision(a, b, { x: 200, y: 0 }, 10).collision).toBe(false);
  });

  it('misses a circle behind the segment start', () => {
    expect(circleToLineCollision(a, b, { x: -50, y: 0 }, 10).collision).toBe(false);
  });

  it('treats an exact tangent as a miss', () => {
    // `deter <= 0` is a miss in the AS3, and a tangent gives deter == 0.
    // Relaxing this to `< 0` would make grazing shots connect — and would be
    // a divergence, not a fix.
    const result = circleToLineCollision(a, b, { x: 50, y: 10 }, 10);
    expect(result.collision).toBe(false);
  });

  it('catches a circle just past tangent', () => {
    expect(circleToLineCollision(a, b, { x: 50, y: 9.99 }, 10).collision).toBe(true);
  });

  it('reports containment when the segment sits inside the circle', () => {
    const result = circleToLineCollision(a, b, { x: 50, y: 0 }, 500);
    expect(result.inside).toBe(true);
    expect(result.intersects).toBe(false);
    expect(result.collision).toBe(true);
  });

  it('reports enter and exit points on a clean crossing', () => {
    const result = circleToLineCollision(a, b, { x: 50, y: 0 }, 10);
    expect(result.intersects).toBe(true);
    expect(result.enter!.x).toBeCloseTo(40, 6);
    expect(result.exit!.x).toBeCloseTo(60, 6);
  });

  it('handles a circle covering the segment start', () => {
    // One root behind the start, one on the segment -> a crossing.
    const result = circleToLineCollision(a, b, { x: 0, y: 0 }, 20);
    expect(result.collision).toBe(true);
  });

  it('is orientation independent', () => {
    const diagA = { x: 0, y: 0 };
    const diagB = { x: 100, y: 100 };
    expect(circleToLineCollision(diagA, diagB, { x: 50, y: 50 }, 5).collision).toBe(true);
    expect(circleToLineCollision(diagA, diagB, { x: 50, y: 90 }, 5).collision).toBe(false);
  });
});

describe('findBeamHits', () => {
  const beam = createBeam(0, 0, 0); // along +x from (16,0) to (1016,0)

  const line: BeamTarget[] = [
    { x: 100, y: 0, radius: 13 },
    { x: 300, y: 0, radius: 13 },
    { x: 600, y: 0, radius: 13 },
    { x: 300, y: 200, radius: 13 },
  ];

  it('catches every enemy on the line at once', () => {
    expect(findBeamHits(beam, line)).toEqual([0, 1, 2]);
  });

  it('ignores enemies off the line', () => {
    expect(findBeamHits(beam, line)).not.toContain(3);
  });

  it('sums the enemy radius and the beam radius', () => {
    // 13 + 12 = 25, so a centre 24 off the axis is caught and 26 is not.
    expect(findBeamHits(beam, [{ x: 300, y: 24, radius: 13 }])).toHaveLength(1);
    expect(findBeamHits(beam, [{ x: 300, y: 26, radius: 13 }])).toHaveLength(0);
  });

  it('honours the visibility filter', () => {
    // Models the AS3's on-screen check at `:5565`.
    expect(findBeamHits(beam, line, (_t, i) => i !== 1)).toEqual([0, 2]);
  });

  it('handles an empty field', () => {
    expect(findBeamHits(beam, [])).toEqual([]);
  });

  it('needs no already-hit list, unlike the Penetration Cannon', () => {
    // The beam resolves once, so repeat hits are structurally impossible
    // rather than filtered out.
    expect(findBeamHits(beam, line)).toEqual(findBeamHits(beam, line));
  });
});

describe('fire produces no projectile', () => {
  it('still reports a shot, so the caller knows to lay a beam', () => {
    const stats = resolveWeaponStats(LASER_CANNON, upgrades())!;
    const shots = fire(createFiringState(), LASER_CANNON, stats, context);
    expect(shots).toHaveLength(1);
    // Speed 0, so the "bullet" would not move even if one were spawned.
    expect(shots[0].speed).toBe(0);
  });

  it('reloads like any other weapon', () => {
    const stats = resolveWeaponStats(LASER_CANNON, upgrades())!;
    const state = createFiringState();
    expect(fire(state, LASER_CANNON, stats, context)).toHaveLength(1);
    expect(fire(state, LASER_CANNON, stats, context)).toHaveLength(0);
    expect(state.reloadTime).toBe(23);
  });
});

describe('damage', () => {
  const stats = resolveWeaponStats(LASER_CANNON, upgrades())!;

  const dealt = (type: string): number =>
    applyBulletDamage(1000, stats.damage, resolveDamageMultipliers(type), 'Laser')
      .damageDealt;

  it('deals full damage to a neutral enemy', () => {
    expect(dealt('Basic')).toBe(5.5);
  });

  it('takes two shots to kill a tier-1 Basic', () => {
    // 5.5 against 10 hp.
    expect(resolveEnemyStats('Basic', '1', 'Easy')!.health).toBe(10);
    expect(Math.ceil(10 / dealt('Basic'))).toBe(2);
  });

  it('hits harder per shot than the Cannon but far slower', () => {
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    expect(stats.reloadTimeMax).toBeGreaterThan(cannon.reloadTimeMax);
    expect(stats.damage / stats.reloadTimeMax).toBeLessThan(
      cannon.damage / cannon.reloadTimeMax,
    );
  });

  it('pays off against a line of enemies, where it hits all of them', () => {
    // Three enemies on the beam is 16.5 from one shot; the Cannon gets 7 on one.
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    expect(dealt('Basic') * 3).toBeGreaterThan(cannon.damage * 2);
  });
});
