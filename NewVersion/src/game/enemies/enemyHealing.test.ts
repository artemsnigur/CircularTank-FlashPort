import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  HEAL_AMOUNT,
  HEAL_TIMER_MAX,
  createHealState,
  healDistanceFor,
  healedTo,
  healsOthers,
  isInHealRange,
  tickHeal,
} from './enemyHealing';
import {
  acceleratingFactor,
  createAcceleratingState,
  decayPerFrame,
  tickAccelerating,
} from './enemyStatMods';

/** A stand-in for the scene's cross-enemy loop, so it can be exercised here. */
interface FakeEnemy {
  x: number;
  y: number;
  radius: number;
  health: number;
  maxHealth: number;
}

function pulse(medic: FakeEnemy & { healDistance: number }, all: FakeEnemy[]): void {
  for (const target of all) {
    if (target === medic) continue;
    if (target.health >= target.maxHealth) continue;
    if (!isInHealRange(medic, target, medic.healDistance)) continue;
    target.health = healedTo(target.health, target.maxHealth);
  }
}

const hurt = (x: number, health = 5, radius = 12): FakeEnemy => ({
  x,
  y: 0,
  radius,
  health,
  maxHealth: 10,
});

describe('the aura cadence', () => {
  it('pulses every 16 frames, despite the constant being 15', () => {
    // Fires the frame *after* the timer reaches zero — the same loop shape as
    // Ghost's blink, which is 151 frames from a constant of 150.
    expect(HEAL_TIMER_MAX).toBe(15);
    let state = createHealState();
    const fired: number[] = [];

    for (let frame = 1; frame <= 48; frame += 1) {
      const result = tickHeal(state, 1);
      state = result.state;
      if (result.pulses) fired.push(frame);
    }

    expect(fired).toEqual([16, 32, 48]);
  });

  it('starts a full cadence away rather than firing immediately', () => {
    expect(createHealState().healTimer).toBe(HEAL_TIMER_MAX);
    expect(tickHeal(createHealState(), 1).pulses).toBe(false);
  });
});

describe('range', () => {
  it('is 50 normally and 100 for a boss', () => {
    expect(healDistanceFor(false)).toBe(50);
    expect(healDistanceFor(true)).toBe(100);
  });

  it('extends by the *target* radius, not the medic\'s', () => {
    // So a big enemy is reachable from further out, and a Shrinking one has to
    // come closer as it takes damage.
    const medic = { x: 0, y: 0 };
    expect(isInHealRange(medic, { x: 55, y: 0, radius: 12 }, 50)).toBe(true);
    expect(isInHealRange(medic, { x: 55, y: 0, radius: 4 }, 50)).toBe(false);
    expect(isInHealRange(medic, { x: 62, y: 0, radius: 12 }, 50)).toBe(false);
  });
});

describe('who gets healed', () => {
  const medic = { x: 0, y: 0, radius: 12, health: 10, maxHealth: 10, healDistance: 50 };

  it('heals everything in range at once, not the nearest', () => {
    const near = hurt(20);
    const mid = hurt(40);
    const far = hurt(300);
    pulse(medic, [medic, near, mid, far]);

    expect(near.health).toBe(6);
    expect(mid.health).toBe(6);
    expect(far.health).toBe(5);
  });

  it('never heals itself', () => {
    const self = { ...medic, health: 3 };
    pulse(self, [self, hurt(20)]);
    expect(self.health).toBe(3);
  });

  it('but two medics heal each other', () => {
    const a = { x: 0, y: 0, radius: 12, health: 5, maxHealth: 10, healDistance: 50 };
    const b = { x: 20, y: 0, radius: 12, health: 5, maxHealth: 10, healDistance: 50 };
    pulse(a, [a, b]);
    pulse(b, [a, b]);

    expect(a.health).toBe(6);
    expect(b.health).toBe(6);
  });

  it('skips anything already at full health', () => {
    const full = hurt(20, 10);
    pulse(medic, [medic, full]);
    expect(full.health).toBe(10);
  });
});

describe('the clamp', () => {
  it('never exceeds the maximum, even from one below', () => {
    expect(healedTo(9, 10)).toBe(10);
    expect(healedTo(9.5, 10)).toBe(10);
    expect(healedTo(10, 10)).toBe(10);
  });

  it('adds exactly one otherwise', () => {
    expect(HEAL_AMOUNT).toBe(1);
    expect(healedTo(5, 10)).toBe(6);
  });

  it('clamps before the write, as the AS3 does', () => {
    // `hp + 1 < total ? hp + 1 : total` — health never exceeds max even for a
    // frame, which is why shrinkScale's upper clamp is insurance rather than a
    // requirement.
    for (let h = 0; h <= 10; h += 0.5) expect(healedTo(h, 10)).toBeLessThanOrEqual(10);
  });
});

describe('routing through the shared observer', () => {
  it('the scene heals via setHealth, not a direct write', () => {
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).toContain('target.setHealth(healedTo(target.health, target.maxHealth));');
    expect(scene).not.toMatch(/target\.health\s*=/);
  });

  it('a healed Accelerating enemy loses its wind-up', () => {
    // The behaviour the two-flag observer was built for, and the first time it
    // is actually exercised: `:6695` compares `hp != beforeHP`, so a *heal*
    // resets the ramp exactly as damage does.
    let ramp = createAcceleratingState(false);
    for (let i = 0; i < 200; i += 1) ramp = tickAccelerating(ramp, 1, false, false);
    expect(acceleratingFactor(ramp)).toBeGreaterThan(0.8);

    // healthChanged, not healthDropped — this is a heal.
    const healed = tickAccelerating(ramp, 1, true, false);
    expect(acceleratingFactor(healed)).toBe(0);
  });
});

/**
 * The DamageAddict interaction.
 *
 * Emergent from two separately faithful systems: immunity guards decreases
 * only, and the AS3's heal writes `hp += 1` with no immunity check. The result
 * is an enemy that cannot be damaged and stops decaying.
 */
describe('healing a DamageAddict sustains it', () => {
  const healPerFrame = HEAL_AMOUNT / HEAL_TIMER_MAX;

  it('out-heals the bleed on the common difficulties', () => {
    expect(healPerFrame).toBeCloseTo(0.06667, 5);

    const easyTier1 = decayPerFrame(1, 1, false);
    expect(easyTier1).toBe(0.045);
    expect(healPerFrame - easyTier1).toBeCloseTo(0.02167, 5);
    expect(healPerFrame).toBeGreaterThan(easyTier1);
  });

  it('loses to the bleed at the top end and for a boss', () => {
    const hardTier3 = decayPerFrame(1.4, 1.4, false);
    expect(hardTier3).toBeCloseTo(0.07344, 5);
    expect(healPerFrame).toBeLessThan(hardTier3);

    expect(healPerFrame).toBeLessThan(decayPerFrame(1, 1, true));
  });

  it('immunity blocks damage but not the heal', () => {
    // The guard is `next < health && isImmuneToDamage(...)`, so increases pass.
    const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(source).toContain('if (next < this.health && isImmuneToDamage(this.enemyType)) return;');
  });

  it('is recorded at the site so nobody removes it as a bug', () => {
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).toContain('Do not "fix" it by special-casing the pair.');
  });
});

describe('which types heal', () => {
  it('is Medic alone', () => {
    expect(healsOthers('Medic')).toBe(true);
    for (const other of ['Basic', 'Ghost', 'DamageAddict', 'Strong']) {
      expect(healsOthers(other), other).toBe(false);
    }
  });
});
