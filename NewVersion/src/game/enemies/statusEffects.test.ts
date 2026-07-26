/**
 * Poison, attached bombs and freeze — the shared per-enemy timer.
 */
import { describe, expect, it } from 'vitest';
import {
  applyBomb,
  applyFreeze,
  applyPoison,
  bombFuseRemaining,
  createStatusState,
  poisonScale,
  tickStatuses,
} from './statusEffects';
import type { StatusState } from './statusEffects';
import { resolveDamageMultipliers } from './damageTypes';

const FRAME = 1000 / 30;
const host = { x: 100, y: 200, radius: 13 };

/** Runs `frames` frames and totals what came out. */
function run(state: StatusState, frames: number) {
  let damage = 0;
  const explosions = [];
  for (let i = 0; i < frames; i += 1) {
    const result = tickStatuses(state, host, FRAME);
    damage += result.damage;
    explosions.push(...result.explosions);
  }
  return { damage, explosions };
}

describe('a fresh state', () => {
  it('carries nothing', () => {
    const state = createStatusState();
    expect(state.onPoison).toBe(false);
    expect(state.gotBomb).toBe(false);
    expect(state.frozen).toBe(false);
  });

  it('ticks to nothing', () => {
    const result = tickStatuses(createStatusState(), host, FRAME);
    expect(result).toEqual({ damage: 0, explosions: [] });
  });
});

describe('poison', () => {
  const source = { poisonTime: 60, poisonDamage: 30 };

  it('scales duration and damage by the same factor', () => {
    expect(poisonScale(1)).toBe(1);
    expect(poisonScale(1.5)).toBe(1.25);
    expect(poisonScale(0.5)).toBe(0.75);
  });

  it('applies at a neutral multiplier unchanged', () => {
    const state = createStatusState();
    expect(applyPoison(state, source, 1)).toBe(true);
    expect(state.poisonTimer).toBe(60);
    expect(state.poisonDamage).toBe(30);
    expect(state.onPoison).toBe(true);
  });

  it('refuses outright against an immune enemy', () => {
    const state = createStatusState();
    expect(applyPoison(state, source, 0)).toBe(false);
    expect(state.onPoison).toBe(false);
    expect(state.poisonTimer).toBe(0);
  });

  it('deals its damage as a per-second rate', () => {
    // 30 damage/second for 60 frames = 2 seconds = 60 total.
    const state = createStatusState();
    applyPoison(state, source, 1);
    expect(run(state, 60).damage).toBeCloseTo(60, 6);
  });

  it('stops once the timer drains, however long it is left running', () => {
    const state = createStatusState();
    applyPoison(state, source, 1);
    expect(run(state, 600).damage).toBeCloseTo(60, 6);
    expect(state.onPoison).toBe(false);
    expect(state.poisonDamage).toBe(0);
  });

  it('is frame-rate independent', () => {
    const at30 = createStatusState();
    applyPoison(at30, source, 1);
    let total30 = 0;
    for (let i = 0; i < 60; i += 1) total30 += tickStatuses(at30, host, 1000 / 30).damage;

    const at60 = createStatusState();
    applyPoison(at60, source, 1);
    let total60 = 0;
    for (let i = 0; i < 120; i += 1) total60 += tickStatuses(at60, host, 1000 / 60).damage;

    expect(total60).toBeCloseTo(total30, 6);
  });

  it('cannot over-collect on a huge delta', () => {
    const state = createStatusState();
    applyPoison(state, source, 1);
    // One giant step past the end of the effect.
    expect(tickStatuses(state, host, 10_000).damage).toBeCloseTo(60, 6);
  });

  describe('the 0.5 + m/2 rule compounds', () => {
    it('gives a weakness 1.5625x total damage, not 1.5x', () => {
      // scale 1.25 lands on both duration and damage: 1.25 * 1.25.
      const weak = createStatusState();
      applyPoison(weak, source, 1.5);
      expect(weak.poisonTimer).toBe(75);
      expect(weak.poisonDamage).toBe(37.5);
      expect(run(weak, 200).damage).toBeCloseTo(60 * 1.5625, 4);
    });

    it('gives a resistance 0.5625x', () => {
      const tough = createStatusState();
      applyPoison(tough, source, 0.5);
      expect(run(tough, 200).damage).toBeCloseTo(60 * 0.5625, 4);
    });
  });

  describe('reapplication takes the stronger by total damage', () => {
    it('replaces a weaker existing poison', () => {
      const state = createStatusState();
      applyPoison(state, { poisonTime: 30, poisonDamage: 10 }, 1);
      expect(applyPoison(state, { poisonTime: 60, poisonDamage: 30 }, 1)).toBe(true);
      expect(state.poisonTimer).toBe(60);
      expect(state.poisonDamage).toBe(30);
    });

    it('leaves a stronger existing poison alone', () => {
      const state = createStatusState();
      applyPoison(state, { poisonTime: 60, poisonDamage: 30 }, 1);
      expect(applyPoison(state, { poisonTime: 30, poisonDamage: 10 }, 1)).toBe(false);
      expect(state.poisonTimer).toBe(60);
      expect(state.poisonDamage).toBe(30);
    });

    it('does not stack — two hits are never worse than the better one', () => {
      const once = createStatusState();
      applyPoison(once, { poisonTime: 60, poisonDamage: 30 }, 1);
      const twice = createStatusState();
      applyPoison(twice, { poisonTime: 60, poisonDamage: 30 }, 1);
      applyPoison(twice, { poisonTime: 60, poisonDamage: 30 }, 1);

      expect(run(twice, 200).damage).toBeCloseTo(run(once, 200).damage, 6);
    });

    it('lets a long weak poison survive a short strong one', () => {
      // 100 frames x 10 = 1000 beats 10 frames x 50 = 500.
      const state = createStatusState();
      applyPoison(state, { poisonTime: 100, poisonDamage: 10 }, 1);
      expect(applyPoison(state, { poisonTime: 10, poisonDamage: 50 }, 1)).toBe(false);
      expect(state.poisonTimer).toBe(100);
    });
  });

  it('reads its multiplier off the real enemy tables', () => {
    // poisonMultiplier is not a separate column — it is the Poison channel of
    // the strengths/weaknesses tables, which are already ported.
    const crazy = resolveDamageMultipliers('Crazy');
    expect(crazy.Poison).toBe(0.25); // strengths ["Poison", 0.75]

    const state = createStatusState();
    applyPoison(state, source, crazy.Poison);
    expect(state.poisonTimer).toBe(Math.round(60 * poisonScale(0.25)));
  });
});

describe('attached bombs', () => {
  const source = { bombTimer: 60, explosionRadius: 100, damage: 40 };

  it('attaches with a full fuse', () => {
    const state = createStatusState();
    applyBomb(state, source);
    expect(state.gotBomb).toBe(true);
    expect(state.bombTimer).toBe(60);
    expect(state.bombTimerMax).toBe(60);
  });

  it('does not go off early', () => {
    const state = createStatusState();
    applyBomb(state, source);
    expect(run(state, 59).explosions).toHaveLength(0);
    expect(state.gotBomb).toBe(true);
  });

  it('goes off when the fuse runs out', () => {
    const state = createStatusState();
    applyBomb(state, source);
    const { explosions } = run(state, 61);
    expect(explosions).toHaveLength(1);
    expect(state.gotBomb).toBe(false);
  });

  it('goes off exactly once', () => {
    const state = createStatusState();
    applyBomb(state, source);
    expect(run(state, 300).explosions).toHaveLength(1);
  });

  it('blasts at the host, enlarged by the host radius', () => {
    const state = createStatusState();
    applyBomb(state, source);
    const [blast] = run(state, 61).explosions;
    expect(blast).toEqual({
      x: host.x,
      y: host.y,
      // 100 + the host's own 13.
      radius: 113,
      damage: 40,
      type: 'Normal',
      smallSound: true,
    });
  });

  it('deals no damage itself — everything comes from the blast', () => {
    const state = createStatusState();
    applyBomb(state, source);
    expect(run(state, 300).damage).toBe(0);
  });

  it('refuses to attach to an already-bombed enemy', () => {
    // `:5826` guards the whole attach block with `&& !theEnemy.gotBomb`, so a
    // second bomb neither replaces nor refreshes the first.
    const state = createStatusState();
    expect(applyBomb(state, source)).toBe(true);
    run(state, 50);

    expect(applyBomb(state, source)).toBe(false);
    // The original fuse keeps running rather than resetting to 60.
    expect(state.bombTimer).toBeCloseTo(10, 6);
  });

  it('lets the original fuse finish on its own schedule', () => {
    const state = createStatusState();
    applyBomb(state, source);
    run(state, 50);
    applyBomb(state, source);

    // Would need 60 more frames if the second bomb had reset it; needs ~10.
    expect(run(state, 11).explosions).toHaveLength(1);
  });

  it('can be re-bombed once the first has gone off', () => {
    const state = createStatusState();
    applyBomb(state, source);
    run(state, 61);
    expect(state.gotBomb).toBe(false);
    expect(applyBomb(state, source)).toBe(true);
  });

  it('reports the fuse fraction for the indicator', () => {
    const state = createStatusState();
    expect(bombFuseRemaining(state)).toBe(0);

    applyBomb(state, source);
    expect(bombFuseRemaining(state)).toBe(1);

    run(state, 30);
    expect(bombFuseRemaining(state)).toBeCloseTo(0.5, 2);

    run(state, 40);
    expect(bombFuseRemaining(state)).toBe(0);
  });
});

describe('freeze', () => {
  it('scales plainly by the ice multiplier', () => {
    const state = createStatusState();
    applyFreeze(state, 60, 1.5, false);
    expect(state.frozen).toBe(true);
    // Plain multiplication — not the 0.5 + m/2 rule poison uses.
    expect(state.frozenTimer).toBe(90);
  });

  it('is quartered against a boss', () => {
    const state = createStatusState();
    applyFreeze(state, 60, 1, true);
    expect(state.frozenTimer).toBe(15);
  });

  it('thaws when the timer runs out', () => {
    const state = createStatusState();
    applyFreeze(state, 60, 1, false);
    run(state, 59);
    expect(state.frozen).toBe(true);
    run(state, 2);
    expect(state.frozen).toBe(false);
    expect(state.frozenTimer).toBe(0);
  });

  it('deals no damage', () => {
    const state = createStatusState();
    applyFreeze(state, 60, 1, false);
    expect(run(state, 100).damage).toBe(0);
  });

  it('always overwrites, unlike poison', () => {
    const state = createStatusState();
    applyFreeze(state, 100, 1, false);
    run(state, 50);
    // A weaker refresh still resets it — no strength comparison.
    applyFreeze(state, 20, 1, false);
    expect(state.frozenTimer).toBe(20);
  });
});

describe('effects run independently', () => {
  it('carries poison, a bomb and freeze at once', () => {
    const state = createStatusState();
    applyPoison(state, { poisonTime: 60, poisonDamage: 30 }, 1);
    applyBomb(state, { bombTimer: 30, explosionRadius: 50, damage: 20 });
    applyFreeze(state, 90, 1, false);

    const { damage, explosions } = run(state, 100);
    expect(damage).toBeCloseTo(60, 6);
    expect(explosions).toHaveLength(1);
    expect(state.onPoison).toBe(false);
    expect(state.gotBomb).toBe(false);
    expect(state.frozen).toBe(false);
  });

  it('one effect expiring does not disturb another', () => {
    const state = createStatusState();
    applyPoison(state, { poisonTime: 200, poisonDamage: 30 }, 1);
    applyFreeze(state, 10, 1, false);

    run(state, 20);
    expect(state.frozen).toBe(false);
    expect(state.onPoison).toBe(true);
    expect(state.poisonTimer).toBeGreaterThan(0);
  });
});
