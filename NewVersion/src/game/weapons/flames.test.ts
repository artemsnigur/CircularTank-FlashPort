/**
 * Flamethrower — lifetime, the density rule, and growth.
 *
 * The density rule is the interesting one: a flame with too few neighbours
 * cuts its own life short, so a thin stream barely leaves the muzzle and only
 * sustained fire produces a jet.
 */
import { describe, expect, it } from 'vitest';
import {
  advanceFlame,
  countCrowd,
  createFlame,
  FLAME_BASE_RADIUS,
  FLAME_CROWD_MIN,
  FLAME_CROWD_RADIUS,
  flameLifetimeMax,
  flameScale,
} from './flames';
import type { FlameState } from './flames';
import {
  CANNON,
  createFiringState,
  fire,
  FLAME_RANGE_MULTIPLIER,
  FLAMETHROWER,
  getWeapon,
  MINIGUN,
  resolveWeaponStats,
} from './firing';
import { damageTypeOf, resolveDamageMultipliers } from '../enemies/damageTypes';
import { applyBulletDamage, findAllHits } from './bullets';
import type { BulletState, HitTarget } from './bullets';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';

const FRAME = 1000 / 30;
const context = { x: 320, y: 480, towerRotation: 0 };
const CROWDED = FLAME_CROWD_MIN;

function upgrades(level = 1) {
  const state = createInitialUpgradeState();
  state.primary[3] = level;
  return state;
}

/** Runs a flame to burnout in a crowd, returning how many frames it lasted. */
function lifespan(flame: FlameState, crowd = CROWDED): number {
  let current: FlameState | null = flame;
  let frames = 0;
  while (current && frames < 500) {
    current = advanceFlame(current, FRAME, crowd);
    frames += 1;
  }
  return frames;
}

describe('registration', () => {
  it('is exposed as a ported weapon', () => {
    expect(getWeapon('Flamethrower')).toBe(FLAMETHROWER);
    expect(FLAMETHROWER.isFlame).toBe(true);
  });

  it('burns on the FireLava channel', () => {
    expect(damageTypeOf(FLAMETHROWER.bulletClass!)).toBe('FireLava');
  });

  it('penetrates and inherits the tank velocity', () => {
    expect(FLAMETHROWER.penetrates).toBe(true);
    expect(FLAMETHROWER.inheritsTankVelocity).toBe(true);
    expect(CANNON.inheritsTankVelocity).toBeUndefined();
  });

  it('has no one-shot sound, because its report is a loop', () => {
    expect(FLAMETHROWER.sound).toBe('');
  });
});

describe('stats from the upgrade table', () => {
  it('reads level 1 correctly', () => {
    expect(resolveWeaponStats(FLAMETHROWER, upgrades())).toEqual({
      reloadTimeMax: 3.15,
      damage: 0.28,
      explosionRadius: 0,
      // 100 in the table, times the 1.7 balance override.
      flameRange: 170,
    });
  });

  it('reads level 10 correctly', () => {
    const stats = resolveWeaponStats(FLAMETHROWER, upgrades(10))!;
    expect(stats.damage).toBe(0.5);
    expect(stats.flameRange).toBeCloseTo(255, 10); // 150 * 1.7
    expect(stats.reloadTimeMax).toBe(2);
  });

  it('maps its three tracks to the AS3 table', () => {
    const table = findUpgradeById('Flamethrower')!;
    expect(table.stats[FLAMETHROWER.reloadTrack][0]).toBe(3.15);
    expect(table.stats[FLAMETHROWER.damageTrack][0]).toBe(0.28);
    // The extracted table keeps the original 100 — the 1.7x is applied on
    // read, not baked into the generated data. See FLAME_RANGE_MULTIPLIER.
    expect(table.stats[FLAMETHROWER.flameRangeTrack!][0]).toBe(100);
  });

  it('applies the balance override without touching the extracted table', () => {
    const table = findUpgradeById('Flamethrower')!;
    const raw = table.stats[FLAMETHROWER.flameRangeTrack!][0];
    const resolved = resolveWeaponStats(FLAMETHROWER, upgrades())!.flameRange!;

    expect(FLAME_RANGE_MULTIPLIER).toBe(1.7);
    expect(resolved).toBeCloseTo(raw * FLAME_RANGE_MULTIPLIER, 10);
    expect(resolved).toBeGreaterThan(raw);
  });

  it('has the weakest per-hit damage of any weapon', () => {
    const state = upgrades();
    state.primary[1] = 1;
    expect(resolveWeaponStats(FLAMETHROWER, state)!.damage).toBeLessThan(
      resolveWeaponStats(MINIGUN, state)!.damage,
    );
  });
});

describe('range converts to lifetime', () => {
  it('divides range by speed and rounds', () => {
    expect(flameLifetimeMax(100, 10)).toBe(10);
    expect(flameLifetimeMax(150, 10)).toBe(15);
    // 105.5 / 10 = 10.55 -> 11.
    expect(flameLifetimeMax(105.5, 10)).toBe(11);
  });

  it('lives long enough to cover its boosted range', () => {
    const low = resolveWeaponStats(FLAMETHROWER, upgrades())!;
    const high = resolveWeaponStats(FLAMETHROWER, upgrades(10))!;
    // 170 / 10 = 17 frames; 255 / 10 = 25.5 -> 26.
    expect(flameLifetimeMax(low.flameRange!, FLAMETHROWER.bulletSpeed)).toBe(17);
    expect(flameLifetimeMax(high.flameRange!, FLAMETHROWER.bulletSpeed)).toBe(26);
  });

  it('upgrading buys reach, spent as time', () => {
    expect(flameLifetimeMax(150, 10)).toBeGreaterThan(flameLifetimeMax(100, 10));
  });
});

describe('countCrowd', () => {
  it('counts the flame itself', () => {
    // The AS3 walks the whole array without excluding self, so distance 0
    // always counts — a solitary flame scores 1, never 0.
    expect(countCrowd({ x: 0, y: 0 }, [{ x: 0, y: 0 }])).toBe(1);
  });

  it('counts neighbours inside the radius and ignores those outside', () => {
    const self = { x: 0, y: 0 };
    const bullets = [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 49, y: 0 },
      { x: 50, y: 0 },
      { x: 500, y: 0 },
    ];
    // Strictly less than 50, so the one exactly at 50 is out.
    expect(countCrowd(self, bullets)).toBe(3);
    expect(FLAME_CROWD_RADIUS).toBe(50);
  });
});

describe('the density rule', () => {
  it('cuts a lone flame short almost immediately', () => {
    // Crowd of 1 -> lifetime becomes 1, from a max of 10.
    const flame = createFlame(10);
    expect(lifespan(flame, 1)).toBeLessThan(5);
  });

  it('lets a crowded flame live its full life', () => {
    expect(lifespan(createFlame(10), CROWDED)).toBeGreaterThan(9);
  });

  it('a lone flame lives a fraction as long as a crowded one', () => {
    expect(lifespan(createFlame(10), 1) * 3).toBeLessThan(lifespan(createFlame(10), CROWDED));
  });

  it('takes effect at five neighbours, not four', () => {
    expect(lifespan(createFlame(10), FLAME_CROWD_MIN - 1)).toBeLessThan(9);
    expect(lifespan(createFlame(10), FLAME_CROWD_MIN)).toBeGreaterThan(9);
  });

  it('marks a thinned flame as dead so it stops growing', () => {
    let flame: FlameState | null = createFlame(10);
    for (let i = 0; i < 3 && flame; i += 1) flame = advanceFlame(flame, FRAME, 4);
    expect(flame?.deadFlame).toBe(true);
  });

  it('checks density exactly once', () => {
    // A flame that starts alone but is later surrounded keeps its short life;
    // the check does not re-run.
    let flame: FlameState | null = createFlame(10);
    for (let i = 0; i < 3 && flame; i += 1) flame = advanceFlame(flame, FRAME, 1);
    expect(flame).toBeNull();
  });

  it('does not thin before two frames have passed', () => {
    const flame = advanceFlame(createFlame(10), FRAME, 1);
    expect(flame!.thinned).toBe(false);
    expect(flame!.deadFlame).toBe(false);
  });
});

describe('the range multiplier survives thinning', () => {
  /**
   * Total distance a flame covers before burning out.
   *
   * Stepped at a tenth of a frame: at whole frames the burnout lands mid-step
   * and the rounding swamps the ratio being measured (a 1.7x change reads as
   * 2.0x). The flame's own behaviour is unchanged — only the sampling is finer.
   */
  function reach(lifetimeMax: number, crowd: number, multiplier: number): number {
    const step = FRAME / 10;
    let flame: FlameState | null = createFlame(lifetimeMax, multiplier);
    let steps = 0;
    while (flame && steps < 5000) {
      flame = advanceFlame(flame, step, crowd);
      steps += 1;
    }
    return (steps / 10) * FLAMETHROWER.bulletSpeed;
  }

  it('reproduces the steady-fire crowd of three', () => {
    // reload 3.15 frames at speed 10 puts consecutive flames 31.5 units apart,
    // so only the flame either side falls inside the 50-unit radius. Crowd is
    // 3 — under the threshold — so in practice *every* flame is thinned and
    // lifetimeMax is never reached.
    const spacing = 3.15 * FLAMETHROWER.bulletSpeed;
    expect(spacing).toBeCloseTo(31.5, 10);
    expect(countCrowd({ x: 0, y: 0 }, [
      { x: -spacing, y: 0 },
      { x: 0, y: 0 },
      { x: spacing, y: 0 },
      { x: 2 * spacing, y: 0 },
    ])).toBe(3);
  });

  it('extends a thinned flame, which is the case that matters', () => {
    // This is the regression: scaling lifetimeMax alone did nothing visible,
    // because the density rule overwrites lifetime two frames in.
    const plain = reach(10, 3, 1);
    const boosted = reach(10, 3, FLAME_RANGE_MULTIPLIER);
    expect(boosted).toBeGreaterThan(plain);
    expect(boosted / plain).toBeCloseTo(FLAME_RANGE_MULTIPLIER, 1);
  });

  it('extends an unthinned flame by the same factor', () => {
    const plain = reach(10, CROWDED, 1);
    const boosted = reach(17, CROWDED, FLAME_RANGE_MULTIPLIER);
    expect(boosted / plain).toBeCloseTo(FLAME_RANGE_MULTIPLIER, 1);
  });

  it('defaults to no change when no multiplier is given', () => {
    expect(createFlame(10).rangeMultiplier).toBe(1);
    expect(reach(10, 3, 1)).toBe(reach(10, 3, 1));
  });
});

describe('growth', () => {
  it('starts at scale 1 and the base radius', () => {
    const flame = createFlame(10);
    expect(flame.scale).toBe(1);
    expect(flame.radius).toBe(FLAME_BASE_RADIUS);
  });

  it('grows 0.2 per frame of age', () => {
    expect(flameScale(0)).toBe(1);
    expect(flameScale(5)).toBeCloseTo(2, 6);
    expect(flameScale(10)).toBeCloseTo(3, 6);
  });

  it('triples its hit radius over a full life', () => {
    let flame: FlameState | null = createFlame(10);
    let last = flame.radius;
    for (let i = 0; i < 9 && flame; i += 1) {
      flame = advanceFlame(flame, FRAME, CROWDED);
      if (flame) last = flame.radius;
    }
    expect(last).toBeGreaterThan(FLAME_BASE_RADIUS * 2.5);
  });

  it('widens the jet towards its far end', () => {
    let flame: FlameState | null = createFlame(10);
    const radii: number[] = [];
    for (let i = 0; i < 8 && flame; i += 1) {
      flame = advanceFlame(flame, FRAME, CROWDED);
      if (flame) radii.push(flame.radius);
    }
    for (let i = 1; i < radii.length; i += 1) {
      expect(radii[i]).toBeGreaterThan(radii[i - 1]);
    }
  });

  it('freezes a thinned flame at its current size', () => {
    let flame: FlameState | null = createFlame(20);
    for (let i = 0; i < 3 && flame; i += 1) flame = advanceFlame(flame, FRAME, 4);
    const frozen = flame!.radius;
    flame = advanceFlame(flame!, FRAME, 4);
    expect(flame?.radius).toBe(frozen);
  });

  it('is frame-rate independent', () => {
    let at30: FlameState | null = createFlame(10);
    for (let i = 0; i < 5 && at30; i += 1) at30 = advanceFlame(at30, 1000 / 30, CROWDED);

    let at60: FlameState | null = createFlame(10);
    for (let i = 0; i < 10 && at60; i += 1) at60 = advanceFlame(at60, 1000 / 60, CROWDED);

    expect(at60!.radius).toBeCloseTo(at30!.radius, 6);
    expect(at60!.lifetime).toBeCloseTo(at30!.lifetime, 6);
  });
});

describe('tank-velocity inheritance', () => {
  const stats = resolveWeaponStats(FLAMETHROWER, upgrades())!;

  it('adds the tank velocity to the flame', () => {
    const still = fire(createFiringState(), FLAMETHROWER, stats, {
      ...context,
      random: () => 0.5,
    });
    const moving = fire(createFiringState(), FLAMETHROWER, stats, {
      ...context,
      random: () => 0.5,
      tankXVel: 6,
      tankYVel: 0,
    });
    expect(moving[0].xVel).toBeCloseTo(still[0].xVel + 6, 6);
  });

  it('reversing pulls the jet in', () => {
    const reversing = fire(createFiringState(), FLAMETHROWER, stats, {
      ...context,
      random: () => 0.5,
      tankXVel: -6,
    });
    expect(reversing[0].xVel).toBeLessThan(FLAMETHROWER.bulletSpeed);
  });

  it('leaves other weapons unaffected', () => {
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    const [bullet] = fire(createFiringState(), CANNON, cannon, {
      ...context,
      tankXVel: 6,
      tankYVel: 6,
    });
    expect(bullet.xVel).toBeCloseTo(CANNON.bulletSpeed, 6);
    expect(bullet.yVel).toBeCloseTo(0, 6);
  });
});

describe('the muzzle', () => {
  const stats = resolveWeaponStats(FLAMETHROWER, upgrades())!;

  it('uses a flat 16 along the turret axis, with no half-width', () => {
    // The third muzzle combination: turret direction like the default, flat
    // offset like the Shotgun.
    const [flame] = fire(createFiringState(), FLAMETHROWER, stats, {
      ...context,
      random: () => 0.5,
    });
    expect(flame.x).toBeCloseTo(context.x + 16, 6);
    expect(flame.y).toBeCloseTo(context.y, 6);
  });

  it('does not add the radius, unlike the Cannon', () => {
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    const [shell] = fire(createFiringState(), CANNON, cannon, context);
    expect(shell.x).toBeCloseTo(context.x + 16 + CANNON.bulletRadius, 6);
  });
});

describe('burning several enemies at once', () => {
  const flame: BulletState = {
    x: 100,
    y: 100,
    xVel: 0,
    yVel: 0,
    rotation: 0,
    radius: 30,
    damage: 0.28,
    explosion: false,
    explosionRadius: 0,
    penetrates: true,
  };

  const cluster: HitTarget[] = [
    { x: 100, y: 100, radius: 13 },
    { x: 120, y: 100, radius: 13 },
    { x: 700, y: 700, radius: 13 },
  ];

  it('hits everything it overlaps, not just the first', () => {
    expect(findAllHits(flame, cluster)).toEqual([0, 1]);
  });

  it('honours the per-frame burn filter', () => {
    // Models `enemy.onFire`: an enemy already burned this frame is skipped.
    expect(findAllHits(flame, cluster, (_t, i) => i !== 0)).toEqual([1]);
  });

  it('grows into more targets as it ages', () => {
    const spread: HitTarget[] = [{ x: 135, y: 100, radius: 13 }];
    expect(findAllHits({ ...flame, radius: 10 }, spread)).toHaveLength(0);
    expect(findAllHits({ ...flame, radius: 30 }, spread)).toHaveLength(1);
  });
});

describe('damage', () => {
  const stats = resolveWeaponStats(FLAMETHROWER, upgrades())!;
  const channel = damageTypeOf(FLAMETHROWER.bulletClass!);

  it('is tiny per tick but lands every frame', () => {
    const dealt = applyBulletDamage(
      100,
      stats.damage,
      resolveDamageMultipliers('Basic'),
      channel,
    ).damageDealt;
    expect(dealt).toBe(0.28);
  });

  it('is halved against Medic, which resists FireLava', () => {
    // Medic: strengths ["FireLava", 0.5, "Food", 0.25].
    const medic = resolveDamageMultipliers('Medic');
    expect(medic.FireLava).toBe(0.5);
    expect(
      applyBulletDamage(100, stats.damage, medic, channel).damageDealt,
    ).toBeCloseTo(0.14, 10);
  });

  it('out-damages the Cannon against a crowd it can sustain fire on', () => {
    // One flame alive ~10 frames, hitting 3 enemies each frame, is 8.4 total
    // against the Cannon's 7 on one target — and the Flamethrower fires four
    // times as often.
    const perFlame = stats.damage * 10 * 3;
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    expect(perFlame).toBeGreaterThan(cannon.damage);
  });
});
