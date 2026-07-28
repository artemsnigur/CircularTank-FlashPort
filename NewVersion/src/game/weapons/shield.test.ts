import { describe, expect, it } from 'vitest';
import {
  REFLECT_LIFETIME,
  REFLECT_SPEED,
  SHIELD_FADE_FRAMES,
  SHIELD_RADIUS_MULTIPLIER,
  createShieldState,
  isReflectable,
  raiseShield,
  reflectBullet,
  reflectChance,
  shieldAlpha,
  shieldRadiusMultiplier,
  tickShield,
} from './shield';
import { SHIELD, resolveSecondaryStats } from './secondaries';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import type { EnemyBulletState } from '../enemies/enemyFiring';

const owned = (level: number) => {
  const state = createInitialUpgradeState();
  const index = findUpgradeById('Shield')!.index;
  const secondary = [...state.secondary];
  secondary[index] = level;
  return { ...state, secondary };
};

const bullet = (over: Partial<EnemyBulletState> = {}): EnemyBulletState => ({
  x: 100,
  y: 0,
  xVel: -3,
  yVel: 0,
  rotation: 180,
  radius: 4,
  damage: 5,
  lifeTime: 90,
  lifeTimeMax: 90,
  ...over,
});

describe('the stat table', () => {
  it('gives a duration, not damage or an explosion', () => {
    const stats = resolveSecondaryStats(SHIELD, owned(1))!;

    expect(stats.duration).toBe(100);
    expect(stats.damage).toBe(0);
    expect(stats.explosionRadius).toBe(0);
  });

  it('grows the window from 100 to 262 frames', () => {
    // 3.3s to 8.7s at 30 fps.
    expect(resolveSecondaryStats(SHIELD, owned(1))!.duration).toBe(100);
    expect(resolveSecondaryStats(SHIELD, owned(10))!.duration).toBe(262);
  });

  it('never shortens the cooldown — flat 700 at every level', () => {
    // The only thing upgrading buys is time on the clock, not a shorter wait.
    // Same deliberate set-piece shape as the Mine's flat 600.
    for (let level = 1; level <= 10; level += 1) {
      expect(resolveSecondaryStats(SHIELD, owned(level))!.reloadTimeMax, `level ${level}`).toBe(
        700,
      );
    }
  });

  it('is null when unowned, like every other secondary', () => {
    expect(resolveSecondaryStats(SHIELD, createInitialUpgradeState())).toBeNull();
  });
});

describe('the window', () => {
  it('starts down', () => {
    expect(createShieldState()).toEqual({ on: false, timer: 0 });
  });

  it('comes up for the duration', () => {
    expect(raiseShield(262)).toEqual({ on: true, timer: 262 });
  });

  it('refuses to come up for no time at all', () => {
    expect(raiseShield(0).on).toBe(false);
  });

  it('counts down and drops the frame after it empties', () => {
    // The AS3 decrements only while timer > 0 and drops on the frame it finds
    // zero, so N frames of cover and the drop lands on N+1. The same one-frame
    // shape as the ghost blink and the medic pulse.
    let state = raiseShield(3);
    for (const expected of [2, 1, 0]) {
      state = tickShield(state, 1);
      expect(state).toEqual({ on: true, timer: expected });
    }
    state = tickShield(state, 1);
    expect(state).toEqual({ on: false, timer: 0 });
  });

  it('does nothing once down', () => {
    const down = createShieldState();
    expect(tickShield(down, 10)).toBe(down);
  });

  it('takes fractional frames, so it is frame-rate independent', () => {
    const state = tickShield(raiseShield(100), 0.5);
    expect(state.timer).toBe(99.5);
  });
});

describe('the fade', () => {
  it('runs over the last 120 frames', () => {
    expect(SHIELD_FADE_FRAMES).toBe(120);
    expect(shieldAlpha(raiseShield(200))).toBe(1);
    expect(shieldAlpha(raiseShield(120))).toBe(1);
  });

  it('follows timer / 120 * 0.9 + 0.1', () => {
    expect(shieldAlpha(raiseShield(60))).toBeCloseTo(0.55, 10);
    expect(shieldAlpha(raiseShield(30))).toBeCloseTo(0.325, 10);
  });

  it('bottoms out at 0.1, not 0', () => {
    // It stays visible until the moment it drops. Fading to zero would read as
    // "already gone" for the last second of a window still in use.
    expect(shieldAlpha({ on: true, timer: 0 })).toBeCloseTo(0.1, 10);
  });

  it('is invisible when down', () => {
    expect(shieldAlpha(createShieldState())).toBe(0);
  });

  it('never rises as the window runs out', () => {
    let previous = Infinity;
    for (let timer = 200; timer >= 0; timer -= 1) {
      const alpha = shieldAlpha({ on: true, timer });
      expect(alpha).toBeLessThanOrEqual(previous);
      previous = alpha;
    }
  });
});

describe('the doubled reach', () => {
  it('is exactly 2x while up', () => {
    expect(SHIELD_RADIUS_MULTIPLIER).toBe(2);
    expect(shieldRadiusMultiplier(raiseShield(100))).toBe(2);
  });

  it('is 1x while down', () => {
    expect(shieldRadiusMultiplier(createShieldState())).toBe(1);
  });
});

/**
 * `:1557` is one condition covering the shield and the BulletReflect upgrade.
 * Written as one function so the two cannot drift.
 */
describe('what gets turned away', () => {
  it('is certain with the shield up, whatever the upgrade says', () => {
    expect(reflectChance(true, 0, () => 1)).toBe(true);
    expect(reflectChance(true, 0.5, () => 1)).toBe(true);
  });

  it('is a roll with the shield down', () => {
    expect(reflectChance(false, 0.3, () => 0.2)).toBe(true);
    expect(reflectChance(false, 0.3, () => 0.9)).toBe(false);
  });

  it('never happens without the upgrade or the shield', () => {
    expect(reflectChance(false, 0, () => 0)).toBe(false);
  });

  it('reflects on random <= chance, not the other way round', () => {
    // The AS3 tests `Math.random() > chance` for the *damage* branch, so the
    // reflect is the complement. Getting it backwards would make a level-1
    // upgrade turn away almost everything.
    expect(reflectChance(false, 0.1, () => 0.05)).toBe(true);
    expect(reflectChance(false, 0.1, () => 0.5)).toBe(false);
  });

  it('exempts the Trap mine', () => {
    // Not a projectile that can be batted away.
    expect(isReflectable('EnemyBulletTrap')).toBe(false);
    for (const other of ['EnemyBulletBasic', 'EnemyBulletFollowing', 'EnemyBulletHook']) {
      expect(isReflectable(other), other).toBe(true);
    }
  });
});

describe('a reflected bullet', () => {
  const tank = { x: 0, y: 0 };

  it('leaves on the line it arrived on, pointing away', () => {
    const away = reflectBullet(bullet({ x: 100, y: 0 }), tank);

    expect(away.rotation).toBeCloseTo(0, 10);
    expect(away.xVel).toBeCloseTo(REFLECT_SPEED, 10);
    expect(away.yVel).toBeCloseTo(0, 10);
  });

  it('works from any bearing', () => {
    for (const [x, y, degrees] of [
      [0, 100, 90],
      [-100, 0, 180],
      [0, -100, -90],
    ]) {
      const away = reflectBullet(bullet({ x, y }), tank);
      expect(away.rotation, `${x},${y}`).toBeCloseTo(degrees, 10);
      // Moving outward: the dot product with the outward direction is positive.
      expect(away.xVel * x + away.yVel * y).toBeGreaterThan(0);
    }
  });

  it('replaces speed and lifetime outright rather than scaling them', () => {
    // A slow bullet and a fast one come back identically.
    const slow = reflectBullet(bullet({ xVel: -0.5, lifeTime: 5 }), tank);
    const fast = reflectBullet(bullet({ xVel: -40, lifeTime: 900 }), tank);

    expect(Math.hypot(slow.xVel, slow.yVel)).toBeCloseTo(REFLECT_SPEED, 10);
    expect(Math.hypot(fast.xVel, fast.yVel)).toBeCloseTo(REFLECT_SPEED, 10);
    expect(slow.lifeTime).toBe(REFLECT_LIFETIME);
    expect(fast.lifeTime).toBe(REFLECT_LIFETIME);
    expect(REFLECT_SPEED).toBe(10);
    expect(REFLECT_LIFETIME).toBe(18);
  });

  it('is marked, which is what stops it hitting the tank again', () => {
    expect(bullet().reflected).toBeUndefined();
    expect(reflectBullet(bullet(), tank).reflected).toBe(true);
  });

  it('keeps its damage — it is removed, not defused', () => {
    // Nothing collides with it afterwards, so the value is inert; carrying it
    // unchanged keeps the state honest rather than implying it was neutralised.
    expect(reflectBullet(bullet({ damage: 7 }), tank).damage).toBe(7);
  });

  it('does not mutate the incoming bullet', () => {
    const incoming = bullet();
    reflectBullet(incoming, tank);
    expect(incoming.reflected).toBeUndefined();
    expect(incoming.xVel).toBe(-3);
  });
});
