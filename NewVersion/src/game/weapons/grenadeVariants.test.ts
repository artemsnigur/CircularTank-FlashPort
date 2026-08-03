/**
 * The Ice and Poison grenades — Grenade's flight with a status payload.
 *
 * The flight itself is covered in `grenade.test.ts`; nothing about it differs.
 * What differs is the blast, and the one stat that is not a pure swap.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  GRENADE,
  ICE_GRENADE,
  POISON_GRENADE,
  SECONDARY_WEAPONS,
  resolveSecondaryStats,
} from './secondaries';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import {
  applyPoison,
  createStatusState,
  tickStatuses,
} from '../enemies/statusEffects';
import { explosionChannel } from './explosions';

const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

const owned = (id: string, level: number) => {
  const state = createInitialUpgradeState();
  const secondary = [...state.secondary];
  secondary[findUpgradeById(id)!.index] = level;
  return { ...state, secondary };
};

describe('all three are the same throw', () => {
  it('are registered as secondaries', () => {
    expect(Object.keys(SECONDARY_WEAPONS)).toContain('Ice Grenade');
    expect(Object.keys(SECONDARY_WEAPONS)).toContain('Poison Grenade');
  });

  it('share one throw path in the scene', () => {
    // One flight, three payloads. A second throw implementation is how the
    // variants would drift apart.
    // The dispatch is a switch on the declared kind now; the three grenades
    // are the only specs carrying `thrown`, so they are the only things that
    // reach `throwGrenade`.
    expect(SCENE).toContain("case 'thrown':");
    for (const spec of [GRENADE, ICE_GRENADE, POISON_GRENADE]) {
      expect(spec.kind, spec.name).toBe('thrown');
    }
    expect((SCENE.match(/private throwGrenade\(\)/g) ?? []).length).toBe(1);
  });

  it('read the same tracks for reload, damage and radius', () => {
    for (const spec of [GRENADE, ICE_GRENADE, POISON_GRENADE]) {
      expect(spec.reloadTrack, spec.name).toBe(0);
      expect(spec.damageTrack, spec.name).toBe(1);
      expect(spec.explosionTrack, spec.name).toBe(2);
    }
  });
});

/**
 * The one thing that is not a pure swap.
 */
describe('Ice Grenade has its own cooldown', () => {
  it('is 400, not the 650 the other two share', () => {
    expect(resolveSecondaryStats(ICE_GRENADE, owned('IceGrenade', 1))!.reloadTimeMax).toBe(400);
    expect(resolveSecondaryStats(GRENADE, owned('Grenade', 1))!.reloadTimeMax).toBe(650);
    expect(
      resolveSecondaryStats(POISON_GRENADE, owned('PoisonGrenade', 1))!.reloadTimeMax,
    ).toBe(650);
  });

  it('stays 400 at every level, like the other flat cooldowns', () => {
    for (let level = 1; level <= 10; level += 1) {
      expect(
        resolveSecondaryStats(ICE_GRENADE, owned('IceGrenade', level))!.reloadTimeMax,
        `level ${level}`,
      ).toBe(400);
    }
  });
});

describe('damage is traded for the effect', () => {
  it('falls as the payload grows', () => {
    // 22-31 plain, 8-12 Ice, 4-6 Poison — the effect does the work.
    const at1 = (spec: typeof GRENADE, id: string) =>
      resolveSecondaryStats(spec, owned(id, 1))!;

    expect(at1(GRENADE, 'Grenade').damage).toBe(22);
    expect(at1(ICE_GRENADE, 'IceGrenade').damage).toBe(8);
    expect(at1(POISON_GRENADE, 'PoisonGrenade').damage).toBe(4);
  });

  it('gives Ice a freeze time and no per-tick damage', () => {
    const stats = resolveSecondaryStats(ICE_GRENADE, owned('IceGrenade', 1))!;

    expect(stats.effectTime).toBe(175);
    // The AS3 queues 0 in that slot for Ice.
    expect(stats.effectDamage).toBe(0);
  });

  it('gives Poison both', () => {
    const stats = resolveSecondaryStats(POISON_GRENADE, owned('PoisonGrenade', 1))!;

    expect(stats.effectTime).toBe(360);
    expect(stats.effectDamage).toBe(2);
  });

  it('leaves the plain Grenade with no payload at all', () => {
    const stats = resolveSecondaryStats(GRENADE, owned('Grenade', 1))!;

    expect(stats.effectTime).toBe(0);
    expect(stats.effectDamage).toBe(0);
  });
});

describe('the blast carries the payload', () => {
  it('routes each variant to its own channel', () => {
    expect(ICE_GRENADE.explosionType).toBe('Ice');
    expect(POISON_GRENADE.explosionType).toBe('Poison');
    expect(GRENADE.explosionType).toBeUndefined();

    expect(explosionChannel('Ice')).toBe('Ice');
    expect(explosionChannel('Poison')).toBe('Poison');
  });

  it('the scene puts the stats on the explosion', () => {
    expect(SCENE).toContain("type: this.secondary?.explosionType ?? 'Normal',");
    expect(SCENE).toContain('effectTime: this.secondaryStats.effectTime,');
    expect(SCENE).toContain('effectDamage: this.secondaryStats.effectDamage,');
  });

  it('the blast loop applies it before the damage', () => {
    // `:6484`/`:6607` — the status lands first, so an enemy killed by the blast
    // still spent a frame affected.
    const body = SCENE.slice(SCENE.indexOf('private applyBlastStatus('));
    // Freeze goes through `Enemy.freeze`, which also zeroes the Tower ramp;
    // poison has no such companion so it calls the status function directly.
    expect(body).toContain('enemy.freeze(');
    expect(body).toContain('applyPoison(');

    // The damage now comes from `planBlastOn`'s answer rather than being
    // computed inline, so the anchor moved with T5's extraction. The ordering
    // claim is unchanged.
    const loop = SCENE.slice(SCENE.indexOf('for (const enemy of caught) {'));
    const status = loop.indexOf('this.applyBlastStatus(');
    const damage = loop.indexOf('enemy.takeDamage(plan.damage)');

    expect(status).toBeGreaterThan(-1);
    expect(damage).toBeGreaterThan(-1);
    expect(status).toBeLessThan(damage);
  });

  it('a Normal blast applies nothing', () => {
    // Every explosion the port had before these two carries no payload, and
    // must keep behaving exactly as it did.
    const body = SCENE.slice(SCENE.indexOf('private applyBlastStatus('));
    expect(body).toContain('if (explosion.effectTime === undefined || explosion.effectTime <= 0) return;');
  });
});

describe('stacking reuses the existing rules', () => {
  it('a stronger poison replaces a weaker one', () => {
    // `applyPoison` compares the *products* — the grenade's long weak poison
    // against a short strong one — and keeps whichever is worth more.
    const status = createStatusState();

    applyPoison(status, { poisonTime: 30, poisonDamage: 1 }, 1);
    const weak = status.poisonTimer;

    applyPoison(status, { poisonTime: 360, poisonDamage: 2 }, 1);
    expect(status.poisonTimer).toBeGreaterThan(weak);
  });

  it('a weaker poison does not overwrite a stronger one', () => {
    const status = createStatusState();

    applyPoison(status, { poisonTime: 360, poisonDamage: 2 }, 1);
    const strong = status.poisonTimer;

    applyPoison(status, { poisonTime: 30, poisonDamage: 1 }, 1);
    expect(status.poisonTimer).toBe(strong);
  });

  it('the grenade poison actually ticks damage', () => {
    // End to end through the shared timer: the payload the blast passes is the
    // one the enemy bleeds from.
    const status = createStatusState();
    applyPoison(status, { poisonTime: 360, poisonDamage: 2 }, 1);

    let bled = 0;
    // 60 frames at 30 fps — two seconds of a 12-second poison.
    for (let i = 0; i < 60; i += 1) {
      bled += tickStatuses(status, { x: 0, y: 0, radius: 10 }, 1000 / 30).damage;
    }

    // Two seconds at 2 damage a second, scaled by a multiplier of 1.
    expect(bled).toBeCloseTo(4, 6);
  });
});
