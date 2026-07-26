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
  DEV_FIRST_SINGLE_LEVEL,
  DEV_SINGLE_TYPE_COUNT,
  DEV_WORLD,
  devEnemyTypes,
  devLevelForType,
  devLevelSpec,
  devTypeForLevel,
  isDevLevel,
} from './devLevels';
import { ENEMY_STATS } from '../enemies/enemyStatsData';
import { resolveEnemyStats } from '../enemies/enemyStats';
import { createEmptyProgress, isLevelCleared, recordLevelResult } from './levelProgress';
import { getLevel } from './levelData';
import { MAX_ENEMIES } from '../waves/waveState';
import {
  canSpawn,
  createWaveState,
  drawEnemy,
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

  it('rejects real worlds and levels past the last type', () => {
    expect(isDevLevel(1, 1)).toBe(false);
    expect(isDevLevel(7, 1)).toBe(false);
    expect(isDevLevel(DEV_WORLD, DEV_FIRST_SINGLE_LEVEL + devEnemyTypes().length)).toBe(false);
    expect(isDevLevel(DEV_WORLD, 0)).toBe(false);
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
