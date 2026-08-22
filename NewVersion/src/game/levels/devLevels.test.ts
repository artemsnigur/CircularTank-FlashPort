/**
 * The dev all-enemy level.
 *
 * Its whole value is showing *every* type, so the tests check that it really
 * does — and that using it cannot damage a real save.
 */
import { describe, expect, it } from 'vitest';
import {
  createDevTestLevel,
  createSingleTypeLevel,
  DEV_COMBINED_LEVEL,
  DEV_COUNT_PER_TYPE,
  DEV_SINGLE_TYPE_COUNT,
  DEV_WORLD,
  devEnemyTypes,
  devFirstThemeLevel,
  devLevelForTheme,
  devLevelForType,
  devLevelSpec,
  devThemeForLevel,
  devTypeForLevel,
  isDevLevel,
} from './devLevels';
import { themeOrder } from './devThemes';
import { ENEMY_STATS } from '../enemies/enemyStatsData';
import { resolveEnemyStats } from '../enemies/enemyStats';
import { createEmptyProgress, isLevelCleared, recordLevelResult } from './levelProgress';
import { getLevel } from './levelData';
import { MAX_ENEMIES } from '../waves/waveState';
import {
  canSpawn,
  createWaveState,
  drawEnemy,
  isWaveComplete,
  registerEnemyKilled,
  registerEnemySpawned,
  registerSpawn,
  tickWave,
} from '../waves/waveState';

const FRAME = 1000 / 30;

describe('composition', () => {
  const spec = createDevTestLevel();

  it('contains every enemy type in the stat tables', () => {
    const types = spec.enemies.map((e) => e.type).sort();
    expect(types).toEqual(Object.keys(ENEMY_STATS).sort());
  });

  it('has three of each', () => {
    for (const entry of spec.enemies) expect(entry.count, entry.type).toBe(DEV_COUNT_PER_TYPE);
    expect(spec.totalEnemies).toBe(Object.keys(ENEMY_STATS).length * DEV_COUNT_PER_TYPE);
  });

  it('is a Normal level so the completion path still applies', () => {
    expect(spec.mode).toBe('Normal');
    expect(spec.flagCount).toBe(0);
  });

  it('spawns far faster than a real level', () => {
    expect(spec.spawnInterval).toBeLessThan(getLevel(1, 1)!.spawnInterval);
  });
});

describe('every type can actually spawn', () => {
  it('resolves stats for all of them at tier 1', () => {
    // A type whose stats fail to resolve is silently skipped by Enemy.spawn,
    // which would make it invisible in exactly the level meant to show it.
    for (const entry of createDevTestLevel().enemies) {
      expect(resolveEnemyStats(entry.type, entry.level, 'Easy'), entry.type).not.toBeNull();
    }
  });

  it('draws every type when the pool is drained', () => {
    const wave = createWaveState(createDevTestLevel());
    const seen = new Set<string>();

    let rolls = 0;
    while (wave.remainingTotal > 0 && rolls < 5000) {
      const drawn = drawEnemy(wave, undefined, () => (rolls++ * 0.37) % 1);
      if (!drawn) break;
      seen.add(drawn.type);
    }

    expect(seen.size).toBe(Object.keys(ENEMY_STATS).length);
  });

  it('gets them all on screen while the player keeps killing', () => {
    // The concurrent cap is 35, and this level holds 60. Without kills the
    // spawner stalls at the cap with types still undrawn — which is correct
    // behaviour, and is what a player does anyway.
    const wave = createWaveState(createDevTestLevel());
    const seen = new Set<string>();
    let alive = 0;

    for (let frame = 0; frame < 6000 && seen.size < 20; frame += 1) {
      tickWave(wave, FRAME);
      if (canSpawn(wave)) {
        const drawn = drawEnemy(wave, { countsByType: {} }, () => (frame * 0.37) % 1);
        if (drawn) {
          registerSpawn(wave);
          registerEnemySpawned(wave);
          seen.add(drawn.type);
          alive += 1;
        }
      }
      // A kill every few frames, so the cap cannot hold the spawner shut.
      if (frame % 5 === 4 && alive > 0) {
        registerEnemyKilled(wave);
        alive -= 1;
      }
    }

    expect(seen.size).toBe(Object.keys(ENEMY_STATS).length);
  });
});

describe('the theme levels', () => {
  it('gives every theme its own level, and round-trips', () => {
    const levels = themeOrder().map((theme) => devLevelForTheme(theme));
    expect(new Set(levels).size).toBe(themeOrder().length);
    for (const theme of themeOrder()) {
      expect(devThemeForLevel(devLevelForTheme(theme)!)).toBe(theme);
    }
  });

  /*
   * The collision this numbering exists to avoid. The theme levels start
   * immediately after the isolated enemy levels, so a literal offset would be
   * correct today and would overlap the moment a twenty-first enemy type
   * arrived — `devLevelSpec` would then answer one number with two meanings.
   *
   * Driven as disjointness of the two sets rather than as "the constant is
   * right", because the constant is the thing under suspicion.
   */
  it('never shares a level number with an enemy level', () => {
    const enemyLevels = devEnemyTypes().map((t) => devLevelForType(t)!);
    const themeLevels = themeOrder().map((t) => devLevelForTheme(t)!);

    expect(new Set([...enemyLevels, ...themeLevels]).size).toBe(
      enemyLevels.length + themeLevels.length,
    );
    // And they abut rather than leaving a gap that `isDevLevel` would reject.
    expect(Math.min(...themeLevels)).toBe(Math.max(...enemyLevels) + 1);
    expect(devFirstThemeLevel()).toBe(Math.min(...themeLevels));
  });

  it('builds a spec carrying that theme, through the shared entry point', () => {
    for (const theme of themeOrder()) {
      const spec = devLevelSpec(DEV_WORLD, devLevelForTheme(theme)!);
      expect(spec, theme).not.toBeNull();
      expect(spec!.theme, theme).toBe(theme);
      // The bigger room, so more ground is on screen than the dev default.
      expect(spec!.roomWidth).toBe(900);
      expect(spec!.roomHeight).toBe(720);
    }
  });

  /**
   * The failure mode an "empty arena" walks straight into.
   *
   * `isWaveComplete` on a Normal level is `enemiesLeft <= 0 && currentEnemies
   * <= 0 && ...`, so a level with nothing in it is complete on the first frame
   * and hands over to the results overlay before the ground is ever looked at.
   * Pinned against exactly that: the same spec with its enemies removed.
   */
  it('does not finish the instant it starts, where an empty one would', () => {
    const spec = devLevelSpec(DEV_WORLD, devFirstThemeLevel())!;
    expect(isWaveComplete(createWaveState(spec))).toBe(false);

    const empty = { ...spec, enemies: [], totalEnemies: 0 };
    expect(isWaveComplete(createWaveState(empty)), 'the counterpart').toBe(true);
  });

  it('scatters identically on every visit', () => {
    // A fixed seed, so two themes compared on different days differ by their
    // art and by nothing else. `PM_PRNG` takes this straight from the spec.
    const first = devLevelSpec(DEV_WORLD, devFirstThemeLevel())!;
    const again = devLevelSpec(DEV_WORLD, devFirstThemeLevel())!;
    expect(first.seed).toBe(again.seed);
  });

  it('is not a theme level for a number past the last theme', () => {
    expect(devThemeForLevel(devFirstThemeLevel() + themeOrder().length)).toBeNull();
    expect(devThemeForLevel(devFirstThemeLevel() - 1)).toBeNull();
    // Beside the positive on an adjacent number, so "returns null" is a rule
    // here rather than something this function does for everything.
    expect(devThemeForLevel(devFirstThemeLevel())).toBe(themeOrder()[0]);
  });

  it('does not answer a theme for a real world', () => {
    expect(devLevelSpec(1, devFirstThemeLevel())).toBeNull();
  });
});

describe('it cannot pollute a save', () => {
  it('world 0 is not a real world', () => {
    expect(getLevel(DEV_WORLD, DEV_COMBINED_LEVEL)).toBeUndefined();
  });

  it('recording a result for it is a no-op', () => {
    // recordLevelResult indexes progress[world - 1]; world 0 gives undefined
    // and it returns the table untouched.
    const before = createEmptyProgress();
    const after = recordLevelResult(before, DEV_WORLD, DEV_COMBINED_LEVEL, 'Easy', 3);
    expect(after).toBe(before);
    expect(isLevelCleared(after, 1, 1)).toBe(false);
  });

  it('offers no next level', () => {
    expect(getLevel(DEV_WORLD, DEV_COMBINED_LEVEL + 1)).toBeUndefined();
  });
});

describe('the sentinel', () => {
  it('covers the combined level and every isolated one', () => {
    expect(isDevLevel(DEV_WORLD, DEV_COMBINED_LEVEL)).toBe(true);
    for (const type of devEnemyTypes()) {
      expect(isDevLevel(DEV_WORLD, devLevelForType(type)!), type).toBe(true);
    }
  });

  it('rejects real worlds and levels past the last theme', () => {
    expect(isDevLevel(1, 1)).toBe(false);
    expect(isDevLevel(7, 1)).toBe(false);
    expect(isDevLevel(DEV_WORLD, 0)).toBe(false);

    /*
     * The end of the range, which moved when the theme levels were added
     * (T248). It used to sit at `DEV_FIRST_SINGLE_LEVEL + types`, which is now
     * the *first* theme level — so this assertion was the old boundary and had
     * to move rather than be deleted, or nothing would check that the range
     * ends anywhere at all.
     *
     * Both sides, on adjacent numbers: the last theme is a dev level and the
     * one after it is not. A range that never ends passes the first half.
     */
    const lastTheme = devFirstThemeLevel() + themeOrder().length - 1;
    expect(isDevLevel(DEV_WORLD, lastTheme), 'the last theme').toBe(true);
    expect(isDevLevel(DEV_WORLD, lastTheme + 1), 'one past it').toBe(false);
  });
});

describe('the isolated levels', () => {
  it('gives every type its own level', () => {
    const levels = devEnemyTypes().map((t) => devLevelForType(t));
    expect(new Set(levels).size).toBe(devEnemyTypes().length);
    expect(levels.every((l) => l !== null)).toBe(true);
  });

  it('maps level numbers back to the same type', () => {
    // A round trip, so a level number always means the same enemy.
    for (const type of devEnemyTypes()) {
      expect(devTypeForLevel(devLevelForType(type)!)).toBe(type);
    }
  });

  it('holds thirty of one type and nothing else', () => {
    const spec = createSingleTypeLevel('Teleporting');
    expect(spec.enemies).toHaveLength(1);
    expect(spec.enemies[0]).toMatchObject({ type: 'Teleporting', count: DEV_SINGLE_TYPE_COUNT });
    expect(spec.totalEnemies).toBe(DEV_SINGLE_TYPE_COUNT);
  });

  it('stays under the concurrent cap so the spawner never stalls', () => {
    // The combined level relies on the player killing to keep spawning; an
    // isolated one should be able to put its whole set on screen at once.
    expect(DEV_SINGLE_TYPE_COUNT).toBeLessThan(MAX_ENEMIES);
  });

  it('spawns its full set without any kills', () => {
    const wave = createWaveState(createSingleTypeLevel('Ghost'));
    let spawned = 0;

    for (let frame = 0; frame < 4000 && spawned < DEV_SINGLE_TYPE_COUNT; frame += 1) {
      tickWave(wave, FRAME);
      if (canSpawn(wave) && drawEnemy(wave, { countsByType: {} }, () => 0.5)) {
        registerSpawn(wave);
        registerEnemySpawned(wave);
        spawned += 1;
      }
    }

    expect(spawned).toBe(DEV_SINGLE_TYPE_COUNT);
  });

  it('resolves stats for every isolated type', () => {
    for (const type of devEnemyTypes()) {
      const spec = createSingleTypeLevel(type);
      expect(resolveEnemyStats(spec.enemies[0].type, '1', 'Easy'), type).not.toBeNull();
    }
  });
});

describe('devLevelSpec is the single entry point', () => {
  it('returns the combined arena for level 1', () => {
    expect(devLevelSpec(DEV_WORLD, DEV_COMBINED_LEVEL)!.enemies.length).toBe(
      devEnemyTypes().length,
    );
  });

  it('returns a single-type arena for the rest', () => {
    const level = devLevelForType('Medic')!;
    const spec = devLevelSpec(DEV_WORLD, level)!;
    expect(spec.enemies).toHaveLength(1);
    expect(spec.enemies[0].type).toBe('Medic');
  });

  it('returns null for anything that is not a dev level', () => {
    expect(devLevelSpec(1, 1)).toBeNull();
    expect(devLevelSpec(DEV_WORLD, 999)).toBeNull();
  });
});
