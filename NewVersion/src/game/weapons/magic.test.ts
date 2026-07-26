/**
 * Magic Cannon — target selection, chaining, and the fact that it does not
 * home until it has already hit something.
 */
import { describe, expect, it } from 'vitest';
import {
  createMagicState,
  findMagicTarget,
  isFinalTarget,
  isHoming,
  magicVelocity,
  registerMagicHit,
} from './magic';
import type { MagicTarget } from './magic';
import {
  CANNON,
  createFiringState,
  fire,
  getWeapon,
  MAGIC_CANNON,
  resolveWeaponStats,
} from './firing';
import { applyBulletDamage } from './bullets';
import { damageTypeOf, resolveDamageMultipliers } from '../enemies/damageTypes';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';

const context = { x: 320, y: 480, towerRotation: 0 };

function upgrades(level = 1) {
  const state = createInitialUpgradeState();
  state.primary[11] = level;
  return state;
}

describe('registration', () => {
  it('is exposed as a ported weapon', () => {
    expect(getWeapon('Magic Cannon')).toBe(MAGIC_CANNON);
    expect(MAGIC_CANNON.isHoming).toBe(true);
  });

  it('runs on the Magic channel', () => {
    expect(damageTypeOf(MAGIC_CANNON.bulletClass!)).toBe('Magic');
  });

  it('uses its own muzzle offset of 12', () => {
    expect(MAGIC_CANNON.muzzleOffset).toBe(12);
    expect(CANNON.muzzleOffset).toBe(16);
  });
});

describe('stats from the upgrade table', () => {
  it('reads level 1 and 10 correctly', () => {
    expect(resolveWeaponStats(MAGIC_CANNON, upgrades())).toEqual({
      reloadTimeMax: 15,
      damage: 2.2,
      explosionRadius: 0,
      targets: 3,
    });
    expect(resolveWeaponStats(MAGIC_CANNON, upgrades(10))).toEqual({
      reloadTimeMax: 13.2,
      damage: 3.5,
      explosionRadius: 0,
      targets: 4,
    });
  });

  it('maps its three tracks to the AS3 table', () => {
    const table = findUpgradeById('MagicCannon')!;
    expect(table.stats[MAGIC_CANNON.reloadTrack][0]).toBe(15);
    expect(table.stats[MAGIC_CANNON.damageTrack][0]).toBe(2.2);
    expect(table.stats[MAGIC_CANNON.targetsTrack!][0]).toBe(3);
  });

  it('goes from three targets to four at level 6', () => {
    const targets = findUpgradeById('MagicCannon')!.stats[MAGIC_CANNON.targetsTrack!];
    expect(targets).toEqual([3, 3, 3, 3, 3, 4, 4, 4, 4, 4]);
  });

  it('carries the budget onto the round it fires', () => {
    const stats = resolveWeaponStats(MAGIC_CANNON, upgrades())!;
    const [bullet] = fire(createFiringState(), MAGIC_CANNON, stats, context);
    expect(bullet.targets).toBe(3);
  });

  it('leaves other weapons with no budget', () => {
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    const [bullet] = fire(createFiringState(), CANNON, cannon, context);
    expect(bullet.targets).toBe(0);
  });
});

describe('it does not home until it has hit something', () => {
  it('starts with neverHitTarget true, so homing is off', () => {
    const state = createMagicState(3);
    expect(state.neverHitTarget).toBe(true);
    expect(isHoming(state)).toBe(false);
  });

  it('starts seeking after the first hit', () => {
    const state = registerMagicHit(createMagicState(3));
    expect(state.neverHitTarget).toBe(false);
    expect(isHoming(state)).toBe(true);
  });

  it('stops seeking once the budget is spent', () => {
    let state = createMagicState(2);
    state = registerMagicHit(state); // 1 left, seeking
    expect(isHoming(state)).toBe(true);
    state = registerMagicHit(state); // 0 left
    expect(isHoming(state)).toBe(false);
  });
});

describe('the chain budget', () => {
  it('spends one target per hit', () => {
    let state = createMagicState(3);
    state = registerMagicHit(state);
    expect(state.targetsLeft).toBe(2);
    state = registerMagicHit(state);
    expect(state.targetsLeft).toBe(1);
  });

  it('treats the last remaining target as final', () => {
    // `:5822` reads the budget before the decrement, so 1 means "this hit
    // consumes the round".
    expect(isFinalTarget(createMagicState(1))).toBe(true);
    expect(isFinalTarget(createMagicState(2))).toBe(false);
  });

  it('damages exactly three enemies at level 1', () => {
    let state = createMagicState(3);
    let hits = 0;
    while (!isFinalTarget(state)) {
      state = registerMagicHit(state);
      hits += 1;
    }
    hits += 1; // the final one
    expect(hits).toBe(3);
  });
});

describe('findMagicTarget', () => {
  const from = { x: 0, y: 0 };
  const field: MagicTarget[] = [
    { x: 300, y: 0, radius: 13 },
    { x: 100, y: 0, radius: 13 },
    { x: 500, y: 0, radius: 13 },
  ];

  it('picks the nearest', () => {
    expect(findMagicTarget(from, field)).toBe(1);
  });

  it('subtracts the enemy radius, so a bigger enemy wins a tie', () => {
    const tie: MagicTarget[] = [
      { x: 200, y: 0, radius: 13 },
      { x: 200, y: 0, radius: 40 },
    ];
    expect(findMagicTarget(from, tie)).toBe(1);
  });

  it('skips ineligible candidates', () => {
    expect(findMagicTarget(from, field, (_t, i) => i !== 1)).toBe(0);
  });

  it('returns -1 when nothing is eligible', () => {
    expect(findMagicTarget(from, field, () => false)).toBe(-1);
    expect(findMagicTarget(from, [])).toBe(-1);
  });

  it('scopes its comparison to one call', () => {
    // The AS3 shares `closestDist` across every bullet in the frame, so a
    // second round can acquire nothing at all. Each call here starts fresh —
    // a deliberate divergence, documented in magic.ts.
    const near = findMagicTarget(from, [{ x: 10, y: 0, radius: 5 }]);
    const far = findMagicTarget(from, [{ x: 900, y: 0, radius: 5 }]);
    expect(near).toBe(0);
    expect(far).toBe(0);
  });
});

describe('magicVelocity', () => {
  it('points straight at the target at full speed', () => {
    const v = magicVelocity({ x: 0, y: 0 }, { x: 100, y: 0 }, 14);
    expect(v.xVel).toBeCloseTo(14, 6);
    expect(v.yVel).toBeCloseTo(0, 6);
  });

  it('turns instantly, with no arc', () => {
    // Same origin, opposite target: the whole velocity flips in one step.
    const forward = magicVelocity({ x: 0, y: 0 }, { x: 100, y: 0 }, 14);
    const back = magicVelocity({ x: 0, y: 0 }, { x: -100, y: 0 }, 14);
    expect(back.xVel).toBeCloseTo(-forward.xVel, 6);
  });

  it('preserves speed in any direction', () => {
    for (const target of [
      { x: 10, y: 10 },
      { x: -30, y: 70 },
      { x: 0, y: -5 },
    ]) {
      const v = magicVelocity({ x: 0, y: 0 }, target, 14);
      expect(Math.hypot(v.xVel, v.yVel)).toBeCloseTo(14, 6);
    }
  });
});

describe('a full chain', () => {
  const stats = resolveWeaponStats(MAGIC_CANNON, upgrades())!;

  it('reaches three separate enemies from one shot', () => {
    const field: MagicTarget[] = [
      { x: 100, y: 0, radius: 13 },
      { x: 200, y: 0, radius: 13 },
      { x: 300, y: 0, radius: 13 },
      { x: 400, y: 0, radius: 13 },
    ];

    let state = createMagicState(stats.targets!);
    const hit = new Set<number>();
    let position = { x: 0, y: 0 };

    // First hit is whatever it flew into; the rest are chosen.
    hit.add(0);
    position = field[0];
    state = registerMagicHit(state);

    while (isHoming(state)) {
      const index = findMagicTarget(position, field, (_t, i) => !hit.has(i));
      expect(index).not.toBe(-1);
      hit.add(index);
      position = field[index];
      state = registerMagicHit(state);
    }

    expect(hit.size).toBe(3);
    // It walked outward rather than revisiting.
    expect([...hit].sort()).toEqual([0, 1, 2]);
  });

  it('never revisits an enemy it has already chained through', () => {
    const field: MagicTarget[] = [
      { x: 100, y: 0, radius: 13 },
      { x: 110, y: 0, radius: 13 },
    ];
    const hit = new Set<number>([0]);
    const next = findMagicTarget(field[0], field, (_t, i) => !hit.has(i));
    expect(next).toBe(1);

    hit.add(1);
    expect(findMagicTarget(field[1], field, (_t, i) => !hit.has(i))).toBe(-1);
  });
});

describe('damage', () => {
  const stats = resolveWeaponStats(MAGIC_CANNON, upgrades())!;

  const dealt = (type: string): number =>
    applyBulletDamage(1000, stats.damage, resolveDamageMultipliers(type), 'Magic')
      .damageDealt;

  it('deals full damage to a neutral enemy', () => {
    expect(dealt('Basic')).toBe(2.2);
  });

  it('is resisted by Trap, which is strong against Magic', () => {
    const trap = resolveDamageMultipliers('Trap');
    expect(trap.Magic).toBeLessThan(1);
    expect(dealt('Trap')).toBeLessThan(dealt('Basic'));
  });

  it('is weak per hit but spreads across the whole chain', () => {
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    expect(stats.damage).toBeLessThan(cannon.damage / 3);
    // 3 targets at 2.2 = 6.6, still under one Cannon shell — its value is
    // reach, not throughput.
    expect(stats.damage * stats.targets!).toBeLessThan(cannon.damage);
  });
});
