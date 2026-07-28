import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ROCKET_MUZZLE_OFFSET,
  ROCKET_RADIUS,
  ROCKET_SPEED,
  nearestTargets,
} from './rockets';
import { findMagicTarget } from './magic';
import { ROCKETS, resolveSecondaryStats } from './secondaries';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';

const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

const owned = (level: number) => {
  const state = createInitialUpgradeState();
  const secondary = [...state.secondary];
  secondary[findUpgradeById('Rockets')!.index] = level;
  return { ...state, secondary };
};

const stats = (level: number) => resolveSecondaryStats(ROCKETS, owned(level))!;

/** A field laid out east of the origin at known distances. */
const field = [
  { x: 300, y: 0, radius: 10 }, // 290 after the radius subtraction
  { x: 100, y: 0, radius: 10 }, //  90
  { x: 500, y: 0, radius: 10 }, // 490
  { x: 200, y: 0, radius: 10 }, // 190
];
const TANK = { x: 0, y: 0 };

describe('the volley picks nearest-first', () => {
  it('orders by distance minus radius, from the tank', () => {
    expect(nearestTargets(TANK, field, 4)).toEqual([1, 3, 0, 2]);
  });

  it('takes only as many as asked for', () => {
    expect(nearestTargets(TANK, field, 2)).toEqual([1, 3]);
    expect(nearestTargets(TANK, field, 1)).toEqual([1]);
  });

  it('subtracts the radius, so a bigger enemy at the same centre wins', () => {
    const twins = [
      { x: 200, y: 0, radius: 5 },
      { x: 200, y: 0, radius: 40 },
    ];
    expect(nearestTargets(TANK, twins, 1)).toEqual([1]);
  });

  it('uses findMagicTarget rather than a second copy of the metric', () => {
    // One expression, one place. A parallel sort with the same subtraction in
    // it is the copy nobody updates when the metric changes.
    for (let i = 0; i < field.length; i += 1) {
      const picked = nearestTargets(TANK, field, i + 1);
      expect(picked[0]).toBe(findMagicTarget(TANK, field));
    }

    const source = readFileSync('src/game/weapons/rockets.ts', 'utf8');
    expect(source).toContain('findMagicTarget(');
    expect(source).not.toContain('Math.hypot');
  });

  it('never picks the same enemy twice', () => {
    const picked = nearestTargets(TANK, field, 10);
    expect(new Set(picked).size).toBe(picked.length);
  });
});

describe('the clamp to available targets', () => {
  it('returns fewer than asked when the field is short', () => {
    // `:4142` — `if (rocketCount > closestEnemiesArray.length) rocketCount = length`.
    expect(nearestTargets(TANK, field.slice(0, 2), 5)).toHaveLength(2);
  });

  it('returns nothing when nothing is eligible', () => {
    expect(nearestTargets(TANK, field, 5, () => false)).toEqual([]);
    expect(nearestTargets(TANK, [], 5)).toEqual([]);
  });

  it('honours the eligibility filter while ordering', () => {
    // Skipping the nearest promotes the next one rather than shortening the
    // list from the far end.
    expect(nearestTargets(TANK, field, 2, (_t, i) => i !== 1)).toEqual([3, 0]);
  });
});

/**
 * The test that proves R0 was necessary rather than tidy.
 *
 * `:3984-3985` sets the achievement flags above the dispatch, so a Rockets
 * press with nothing to shoot at **still burns `noWeaponsUsed`** even though
 * `:4169` refunds the cooldown. A per-weapon gate could not express that.
 */
describe('a refused volley', () => {
  it('returns false, which refunds the cooldown', () => {
    const start = SCENE.indexOf('private fireVolley()');
    const body = SCENE.slice(start, SCENE.indexOf('private steerRockets()', start));

    expect(body).toContain('if (picked.length === 0) return false;');
    expect(SCENE).toContain('this.secondaryFiring.reloadTime = 0;');
  });

  it('but the flags are already set, because the gate ran first', () => {
    const gate = SCENE.indexOf('this.levelFlags.noWeaponsUsed = false;');
    const dispatch = SCENE.indexOf('this.useSecondary(this.secondary.kind)');
    const refund = SCENE.indexOf('this.secondaryFiring.reloadTime = 0;');

    expect(gate).toBeLessThan(dispatch);
    expect(dispatch).toBeLessThan(refund);
  });

  it('and no sound plays — that half is per-weapon', () => {
    // `push("Rockets")` sits inside `if (rocketCount > 0)`, unlike the flags.
    const gateBlock = SCENE.slice(SCENE.indexOf('if (this.useSecondary('));
    expect(gateBlock.slice(0, 200)).toContain('queue(this.secondary.sound)');
    expect(gateBlock.slice(0, 200)).toContain('reloadTime = 0;');
  });
});

describe('the lock never re-acquires', () => {
  it('nulls the target and flies straight rather than searching', () => {
    // `:1775`/`:1780` set `targetEnemy = null` and there is no search block —
    // the difference from Magic, which re-searches at `:1716`.
    const start = SCENE.indexOf('private steerRockets()');
    const body = SCENE.slice(start, SCENE.indexOf('private fireSpikes()', start));

    expect(body).toContain('bullet.magicTarget = null;');
    expect(body).toContain('continue;');
    expect(body).not.toContain('nearestTargets');
    expect(body).not.toContain('findMagicTarget');
  });

  it('keeps its velocity — nothing zeroes it on losing the target', () => {
    const start = SCENE.indexOf('private steerRockets()');
    const body = SCENE.slice(start, SCENE.indexOf('private fireSpikes()', start));

    expect(body).not.toContain('setVelocity(0');
    expect(body).not.toContain('destroy()');
  });

  it('is a launch-time assignment, not a per-frame search', () => {
    const start = SCENE.indexOf('private fireVolley()');
    const body = SCENE.slice(start, SCENE.indexOf('private steerRockets()', start));
    expect(body).toContain('rocket.magicTarget = target;');
  });

  it('is flagged distinctly from Magic’s homing', () => {
    // `isLocked` against `isSeeking`: one is committed to an enemy, the other
    // is free to chase the next. Sharing a name would have hidden that.
    const entity = readFileSync('src/game/entities/Bullet.ts', 'utf8');
    expect(entity).toContain('readonly isLocked: boolean;');
    expect(entity).toContain('get isSeeking(): boolean');
  });
});

describe('a rocket passes through anything that is not its target', () => {
  it('reuses the magic collision rule, which is :5647 exactly', () => {
    // "own target only, or anything once the target is lost" — the same
    // sentence in both places, so one branch serves.
    expect(SCENE).toContain('return bullet.magicTarget === null || bullet.magicTarget === enemy;');
  });

  it('and that branch is reached by a locked round', () => {
    // The magic branch keys on `isMagic`; a rocket has no chain state, so the
    // predicate has to admit it too or a rocket would hit the first thing it
    // met.
    expect(SCENE).toMatch(/else if \(bullet\.isMagic \|\| bullet\.isLocked\)/);
  });
});

describe('the stat table', () => {
  it('reads level 1', () => {
    expect(stats(1)).toMatchObject({
      reloadTimeMax: 700,
      damage: 17,
      explosionRadius: 51,
      count: 3,
    });
  });

  it('reads level 10', () => {
    expect(stats(10)).toMatchObject({
      reloadTimeMax: 700,
      damage: 20,
      explosionRadius: 60,
      count: 5,
    });
  });

  it('never shortens the cooldown', () => {
    for (let level = 1; level <= 10; level += 1) {
      expect(stats(level).reloadTimeMax, `level ${level}`).toBe(700);
    }
  });

  it('is null when unowned', () => {
    expect(resolveSecondaryStats(ROCKETS, createInitialUpgradeState())).toBeNull();
  });

  it('explodes, unlike every other homing round', () => {
    expect(ROCKETS.explosionTrack).toBeDefined();
    expect(stats(1).explosionRadius).toBeGreaterThan(0);
  });
});

describe('the rocket itself', () => {
  it('is radius 3 at speed 16, from a 16-unit muzzle', () => {
    expect(ROCKET_RADIUS).toBe(3);
    expect(ROCKET_SPEED).toBe(16);
    expect(ROCKET_MUZZLE_OFFSET).toBe(16);
  });

  it('leaves aimed at its own target, not at the tower', () => {
    // `:4158` — each rocket in a volley starts on a different bearing.
    const start = SCENE.indexOf('private fireVolley()');
    const body = SCENE.slice(start, SCENE.indexOf('private steerRockets()', start));

    expect(body).toContain('Math.atan2(target.y - this.player.y, target.x - this.player.x)');
    expect(body).not.toContain('towerRotationDegrees');
  });
});
