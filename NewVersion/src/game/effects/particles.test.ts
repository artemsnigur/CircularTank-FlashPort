/**
 * Particle physics, and the two carve-outs most likely to be tidied away.
 *
 * Nothing here asserts what a spawn produced. Velocity, lifetime and angle all
 * carry a `Math.random()` term, so such an assertion would pin the generator
 * rather than the port — the line drawn when this was scoped. What is asserted:
 * the update function over given state, and the two tables, the way `propArt`
 * is checked against its source.
 */
import { describe, expect, it } from 'vitest';
import {
  ALPHA_LINEAR,
  ALPHA_SQUARED,
  DEBRIS_PRESET,
  PARTICLE_PRESETS,
  alphaFor,
  isDead,
  presetFor,
  spawnParticles,
  tickParticle,
  tickParticles,
} from './particles';
import type { Particle } from './particles';

const make = (over: Partial<Particle> = {}): Particle => ({
  type: 'BulletDestroy',
  x: 0, y: 0, moveAngle: 0, rotation: 0,
  velocity: 2, friction: 0.5,
  lifeTime: 10, lifeTimeMax: 10,
  scaleMax: 2, scaleMin: 0.2, killVelocity: 0,
  scale: 2, alpha: 1,
  ...over,
});

describe('one frame of a particle', () => {
  it('decays velocity by friction and moves along the movement angle', () => {
    const next = tickParticle(make({ velocity: 2, friction: 0.5, moveAngle: 0 }));
    expect(next.velocity).toBeCloseTo(1.5, 10);
    expect(next.x).toBeCloseTo(1.5, 10);
    expect(next.y).toBeCloseTo(0, 10);
  });

  it('floors velocity at zero rather than going negative', () => {
    // `:6964` — the AS3 tests `velocity - friction > 0` before subtracting.
    const next = tickParticle(make({ velocity: 0.2, friction: 0.5 }));
    expect(next.velocity).toBe(0);
  });

  it('shrinks as it ages, from scaleMax at spawn to scaleMin at death', () => {
    // Easy to invert: the interpolation is on *remaining* life, so a fresh
    // particle is at scaleMax and a dying one at scaleMin.
    const fresh = tickParticle(make({ lifeTime: 10, lifeTimeMax: 10 }));
    const old = tickParticle(make({ lifeTime: 1, lifeTimeMax: 10 }));
    expect(fresh.scale).toBeGreaterThan(old.scale);
    expect(old.scale).toBeCloseTo(0.2, 10);
  });

  it('counts down one frame at a time', () => {
    expect(tickParticle(make({ lifeTime: 10 })).lifeTime).toBe(9);
  });
});

/**
 * The Poison carve-out, against a type on the same condition.
 */
describe('velocity-zero removal, and the one type exempt from it', () => {
  it('a normal particle dies the moment friction stops it', () => {
    // `killVelocity` is 0 for debris and BulletDestroy, so reaching a standstill
    // removes them even with lifetime left.
    const stopped = make({ type: 'BulletDestroy', velocity: 0, killVelocity: 0, lifeTime: 5 });
    expect(isDead(stopped)).toBe(true);
  });

  it('but Poison survives it — it spawns stopped and would never appear', () => {
    // `:6996` excludes ParticlePoison from the velocity test. Poison's preset is
    // velocity 0 with killVelocity 0, so the general rule would remove it on its
    // first tick. The only symptom of dropping this clause is one effect
    // silently missing, which is why it is asserted beside the rule it escapes
    // rather than alone.
    const poison = make({ type: 'Poison', velocity: 0, killVelocity: 0, lifeTime: 5 });
    expect(isDead(poison)).toBe(false);
    expect(isDead({ ...poison, type: 'PoisonBoss' })).toBe(false);
  });

  it('and Poison still dies when its lifetime runs out', () => {
    // The exemption is from one condition, not from removal.
    expect(isDead(make({ type: 'Poison', velocity: 0, lifeTime: 0 }))).toBe(true);
  });

  it('the two spawn stopped, which is what makes the exemption load-bearing', () => {
    expect(PARTICLE_PRESETS.Poison.velocity).toBe(0);
    expect(PARTICLE_PRESETS.Poison.killVelocity).toBe(0);
    expect(PARTICLE_PRESETS.PoisonBoss.velocity).toBe(0);
  });
});

/**
 * The alpha rules, against a type that has none.
 */
describe('four types fade, twenty-eight do not', () => {
  it('Heal fades linearly where BulletDestroy holds full opacity', () => {
    expect(alphaFor('Heal', 10, 20)).toBeCloseTo(0.375, 10);
    expect(alphaFor('BulletDestroy', 10, 20)).toBe(1);
  });

  it('Strength and Weakness fade on the square, not linearly', () => {
    // `:6990` squares the ratio, so they hold longer and then vanish quickly.
    // A tidy-up to one shared linear fade passes a test that only checks "fades".
    expect(alphaFor('Strength', 10, 20)).toBeCloseTo(0.25, 10);
    expect(alphaFor('Weakness', 10, 20)).toBeCloseTo(0.25, 10);
    expect(alphaFor('Strength', 10, 20)).not.toBeCloseTo(alphaFor('Heal', 10, 20), 6);
  });

  it('the fading set is four of the thirty-two, and named', () => {
    // Guards the generalisation directly: giving every particle a fade would
    // look like an improvement and be wrong for the rest.
    expect([...ALPHA_LINEAR]).toEqual(['Heal', 'HealBoss']);
    expect([...ALPHA_SQUARED]).toEqual(['Strength', 'Weakness']);
    for (const type of ['BulletDestroy', 'Immune', 'Smoke', 'Magic', 'Reflect', 'Poison']) {
      expect(alphaFor(type, 5, 10), type).toBe(1);
    }
  });

  it('and a ticked particle carries the rule its type has', () => {
    const heal = tickParticle(make({ type: 'Heal', lifeTime: 20, lifeTimeMax: 20 }));
    const debris = tickParticle(make({ type: 'BulletDestroy', lifeTime: 20, lifeTimeMax: 20 }));
    expect(heal.alpha).toBeLessThan(1);
    expect(debris.alpha).toBe(1);
  });
});

describe('the preset table', () => {
  it('falls back to the debris preset for any enemy colour', () => {
    // The AS3 spells this as a long negative check with a colour switch inside.
    // Anything not named is debris, and the sprite is the colour.
    const green = presetFor('EnemyGreen');
    expect(green.sprite).toBe('Green');
    expect(green.killVelocity).toBe(0);
    expect(green.velocity).toBe(1.5);
  });

  it('carries the AS3 debris figures unscaled', () => {
    /*
     * `:820-825`, stated from the source rather than read back out of the
     * module — T219 scaled velocity and lifetime and T220 reverted it, so
     * these are the numbers that say which of the two is in force. A future
     * retune has to edit this test deliberately, which is the point.
     */
    expect(DEBRIS_PRESET.velocity).toBe(1.5);
    expect(DEBRIS_PRESET.velocityRandom).toBe(1);
    expect(DEBRIS_PRESET.friction).toBe(0.2);
    expect(DEBRIS_PRESET.lifeTime).toBe(5);
    expect(DEBRIS_PRESET.lifeTimeRandom).toBe(10);
    expect(DEBRIS_PRESET.scaleMax).toBe(2);
    expect(DEBRIS_PRESET.scaleMin).toBe(0.2);
  });

  it('muzzle flares and Reflect face the angle they were given', () => {
    // They are oriented decals, not debris: velocity 0, friction 0, and the
    // rotation comes from `startAngle` rather than the movement angle.
    for (const type of ['MuzzleFlareSmall', 'MuzzleFlareMedium', 'MuzzleFlareBig', 'Reflect']) {
      const preset = PARTICLE_PRESETS[type];
      expect(preset.facesStartAngle, type).toBe(true);
      expect(preset.velocity, type).toBe(0);
    }
  });

  it('Strength and Weakness bunch toward the centre', () => {
    // `randomDistance` scales the spawn offset by `1 - r * r` — the only two
    // types that do, and 30 of the 64 call sites are these.
    expect(PARTICLE_PRESETS.Strength.randomDistance).toBe(true);
    expect(PARTICLE_PRESETS.Weakness.randomDistance).toBe(true);
    expect(PARTICLE_PRESETS.Immune.randomDistance).toBeUndefined();
  });
});

describe('a batch', () => {
  it('spawns the count asked for', () => {
    expect(spawnParticles({ type: 'BulletDestroy', count: 6, x: 0, y: 0 })).toHaveLength(6);
  });

  it('drops the dead and keeps the living', () => {
    const alive = make({ lifeTime: 5, velocity: 3, friction: 0.1 });
    const expiring = make({ lifeTime: 1, velocity: 3, friction: 0.1 });
    expect(tickParticles([alive, expiring])).toHaveLength(1);
  });
});
