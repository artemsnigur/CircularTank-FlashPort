import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  SPIKE_MUZZLE_OFFSET,
  SPIKE_RADIUS,
  SPIKE_SPEED,
  fanBearings,
  spawnFan,
} from './radialFan';
import { ICICLES, POISON_SPIKES, resolveSecondaryStats } from './secondaries';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';

const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

const owned = (id: string, level: number) => {
  const state = createInitialUpgradeState();
  const secondary = [...state.secondary];
  secondary[findUpgradeById(id)!.index] = level;
  return { ...state, secondary };
};

/** Distinct bearings, normalised so 360 and 0 count as one. */
const distinct = (degrees: number[]) =>
  new Set(degrees.map((d) => ((d % 360) + 360) % 360)).size;

/**
 * The doubled bearing is faithful, not a bug.
 *
 * `360 / (count - 1) * c` over `c = 0 … count - 1` puts the last spike on 360
 * degrees, which is 0 — the first spike's bearing. These tests pin that so a
 * future tidy-up to `360 / count` fails loudly.
 */
describe('the fan doubles one bearing', () => {
  it('emits N spikes across N-1 distinct directions', () => {
    for (const count of [23, 24, 28, 32]) {
      const bearings = fanBearings(count);

      expect(bearings, `${count} spikes`).toHaveLength(count);
      expect(distinct(bearings), `${count} spikes`).toBe(count - 1);
    }
  });

  it('the duplicate is the first and last, on 0 and 360', () => {
    const bearings = fanBearings(23);

    expect(bearings[0]).toBe(0);
    expect(bearings[bearings.length - 1]).toBeCloseTo(360, 10);
  });

  it('spaces the rest evenly by 360 / (count - 1)', () => {
    const bearings = fanBearings(9);
    expect(bearings).toEqual([0, 45, 90, 135, 180, 225, 270, 315, 360]);
  });

  it('is not 360 / count — the tidier formula the AS3 does not use', () => {
    // The distinction, stated as an assertion: the correct-looking version
    // would give 8 distinct bearings from 8 spikes and no duplicate.
    const bearings = fanBearings(8);

    expect(bearings[1]).toBeCloseTo(360 / 7, 10);
    expect(bearings[1]).not.toBeCloseTo(360 / 8, 6);
    expect(distinct(bearings)).toBe(7);
  });

  it('the doubled pair share a spawn point, so they travel as one', () => {
    const spikes = spawnFan({ tankX: 100, tankY: 200, count: 23, damage: 5 });
    const first = spikes[0];
    const last = spikes[spikes.length - 1];

    expect(last.x).toBeCloseTo(first.x, 10);
    expect(last.y).toBeCloseTo(first.y, 10);
    expect(last.xVel).toBeCloseTo(first.xVel, 10);
    expect(last.yVel).toBeCloseTo(first.yVel, 10);
  });

  it('degenerate counts do not divide by zero', () => {
    // Unreachable — the lowest table value is 23 — but a hand-edited stat row
    // should give one spike rather than NaN.
    expect(fanBearings(1)).toEqual([0]);
    expect(fanBearings(0)).toEqual([]);
    expect(fanBearings(2)).toEqual([0, 360]);
  });
});

describe('the spikes themselves', () => {
  const spikes = spawnFan({ tankX: 0, tankY: 0, count: 23, damage: 9 });

  it('are radius 6 at speed 20, at every level', () => {
    expect(SPIKE_RADIUS).toBe(6);
    expect(SPIKE_SPEED).toBe(20);
    for (const spike of spikes) {
      expect(spike.radius).toBe(6);
      expect(Math.hypot(spike.xVel, spike.yVel)).toBeCloseTo(20, 10);
    }
  });

  it('start at the muzzle, on their own bearing', () => {
    const offset = SPIKE_MUZZLE_OFFSET + SPIKE_RADIUS;
    for (const spike of spikes) {
      expect(Math.hypot(spike.x, spike.y)).toBeCloseTo(offset, 10);
    }
  });

  it('never explode', () => {
    for (const spike of spikes) {
      expect(spike.explosion).toBe(false);
      expect(spike.explosionRadius).toBe(0);
    }
  });

  it('pierce, burst, home and attach nothing', () => {
    // The whole point of the map: these are plain rounds. A non-zero here would
    // silently opt them into another weapon's behaviour.
    for (const spike of spikes) {
      expect(spike.penetrates).toBe(false);
      expect(spike.bombTimer).toBe(0);
      expect(spike.cakePieces).toBe(0);
      expect(spike.targets).toBe(0);
    }
  });

  it('carry only the payload they were given', () => {
    const icy = spawnFan({ tankX: 0, tankY: 0, count: 3, damage: 1, freezeTime: 200 });
    expect(icy[0].freezeTime).toBe(200);
    expect(icy[0].poisonTime).toBe(0);

    const toxic = spawnFan({
      tankX: 0,
      tankY: 0,
      count: 3,
      damage: 1,
      poisonTime: 360,
      poisonDamage: 2.5,
    });
    expect(toxic[0].freezeTime).toBe(0);
    expect(toxic[0].poisonTime).toBe(360);
    expect(toxic[0].poisonDamage).toBe(2.5);
  });
});

describe('Icicles buys quantity', () => {
  it('reads the table at level 1', () => {
    const stats = resolveSecondaryStats(ICICLES, owned('Icicles', 1))!;

    expect(stats.reloadTimeMax).toBe(400);
    expect(stats.damage).toBe(8);
    expect(stats.effectTime).toBe(175);
    expect(stats.count).toBe(23);
  });

  it('and at level 10', () => {
    const stats = resolveSecondaryStats(ICICLES, owned('Icicles', 10))!;

    expect(stats.reloadTimeMax).toBe(400);
    expect(stats.damage).toBe(12);
    expect(stats.effectTime).toBe(325);
    expect(stats.count).toBe(32);
  });

  it('keeps the shortest secondary cooldown in the game, flat', () => {
    for (let level = 1; level <= 10; level += 1) {
      expect(
        resolveSecondaryStats(ICICLES, owned('Icicles', level))!.reloadTimeMax,
        `level ${level}`,
      ).toBe(400);
    }
  });

  it('leaves a freeze and no poison', () => {
    const stats = resolveSecondaryStats(ICICLES, owned('Icicles', 1))!;
    expect(stats.effectDamage).toBe(0);
  });
});

describe('Poison Spikes buys duration', () => {
  it('reads the table at level 1', () => {
    const stats = resolveSecondaryStats(POISON_SPIKES, owned('PoisonSpikes', 1))!;

    expect(stats.reloadTimeMax).toBe(700);
    expect(stats.damage).toBe(6);
    expect(stats.effectTime).toBe(310);
    expect(stats.effectDamage).toBe(2.52);
    expect(stats.count).toBe(32);
  });

  it('and at level 10', () => {
    const stats = resolveSecondaryStats(POISON_SPIKES, owned('PoisonSpikes', 10))!;

    expect(stats.reloadTimeMax).toBe(700);
    expect(stats.damage).toBe(9);
    expect(stats.effectTime).toBe(400);
    expect(stats.effectDamage).toBe(2.55);
    expect(stats.count).toBe(32);
  });

  it('fires a flat 32 at every level, unlike Icicles', () => {
    // The two split here: one buys more spikes, the other longer poison.
    for (let level = 1; level <= 10; level += 1) {
      expect(
        resolveSecondaryStats(POISON_SPIKES, owned('PoisonSpikes', level))!.count,
        `level ${level}`,
      ).toBe(32);
    }
    expect(resolveSecondaryStats(ICICLES, owned('Icicles', 1))!.count).toBe(23);
    expect(resolveSecondaryStats(ICICLES, owned('Icicles', 10))!.count).toBe(32);
  });

  it('waits nearly twice as long as Icicles', () => {
    expect(resolveSecondaryStats(POISON_SPIKES, owned('PoisonSpikes', 1))!.reloadTimeMax).toBe(700);
    expect(resolveSecondaryStats(ICICLES, owned('Icicles', 1))!.reloadTimeMax).toBe(400);
  });

  it('is null when unowned, like every secondary', () => {
    expect(resolveSecondaryStats(POISON_SPIKES, createInitialUpgradeState())).toBeNull();
    expect(resolveSecondaryStats(ICICLES, createInitialUpgradeState())).toBeNull();
  });
});

/**
 * The map said these need no F0 subsystem. This is that claim, asserted.
 */
describe('neither weapon reaches a subsystem it does not need', () => {
  const body = (() => {
    const start = SCENE.indexOf('private fireSpikes()');
    return SCENE.slice(start, SCENE.indexOf('private placeMine()', start));
  })();

  it('no bounce', () => {
    expect(body).not.toContain('bounce');
  });

  it('no ground hazard', () => {
    expect(body).not.toContain('ground');
    expect(body).not.toContain('trail');
  });

  it('no target selection', () => {
    expect(body).not.toContain('targetEnemy');
    expect(body).not.toContain('closest');
    expect(body).not.toContain('findEnemies');
  });

  it('spawns ordinary bullets that the normal paths carry', () => {
    expect(body).toContain('this.bullets.push(');
    expect(body).toContain('new Bullet(');
  });

  it('the fan module imports nothing but the bullet spec type', () => {
    const source = readFileSync('src/game/weapons/radialFan.ts', 'utf8');
    const imports = source.match(/^import .*$/gm) ?? [];
    expect(imports).toHaveLength(1);
    expect(imports[0]).toContain("from './firing'");
  });
});

describe('the freeze lands through the shared timer', () => {
  it('applies on impact, scaled and boss-quartered', () => {
    // The same `applyFreeze` the Ice Grenade's blast calls, so the two stack by
    // one rule rather than two.
    expect(SCENE).toContain('if (bullet.appliesFreeze && enemy.damageMultipliers.Ice > 0)');
    expect(SCENE).toContain("enemy.enemyLevel === 'B',");
  });

  it('an Icicle is the first bullet to carry a freeze', () => {
    const bullets = readFileSync('src/game/weapons/bullets.ts', 'utf8');
    expect(bullets).toContain('freezeTime?: number;');
    expect(bullets).toContain('Mirrors `poisonTime`');
  });

  it('marks the Temperamental achievement, as the Ice Grenade does', () => {
    expect(
      (SCENE.match(/this\.levelFlags\.temperamentalFrozen = true;/g) ?? []).length,
    ).toBe(2);
  });
});
