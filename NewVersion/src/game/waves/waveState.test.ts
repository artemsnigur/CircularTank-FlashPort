import { describe, expect, it } from 'vitest';
import {
  bossCountFor,
  canSpawn,
  computeSpawnInterval,
  createWaveState,
  drawEnemy,
  isWaveComplete,
  MAX_ENEMIES,
  registerEnemyKilled,
  registerEnemySpawned,
  registerSpawn,
  tickWave,
} from './waveState';
import type { WaveState } from './waveState';
import { getLevel } from '../levels/levelData';

const FRAME = 1000 / 30;

const world1Level1 = () => createWaveState(getLevel(1, 1)!);
const world1Level2 = () => createWaveState(getLevel(1, 2)!);

/**
 * The wiring seam, not the module.
 *
 * Every Boss test in this file and in flag.test.ts used to pass `bossAmount`
 * explicitly, which is precisely why the suite stayed green while all 45 Boss
 * levels auto-won: the module was right and the *call* was wrong. These tests
 * therefore build the wave exactly as `GameplayScene` does — from a real level
 * out of `getLevel`, with the quota derived rather than asserted alongside.
 *
 * `createWaveState` no longer takes a `bossAmount` at all, so that particular
 * blindness cannot return by hand. What these still guard is the derivation
 * itself, and the two rules that read it: completion and the spawn gate.
 */
describe('a Boss level built the way the scene builds it', () => {
  const bossLevel = () => getLevel(1, 9)!;

  it('is a Boss level with a boss in its composition', () => {
    // Guards the fixture: if 1-9 ever stops being a Boss level the tests below
    // would pass vacuously against the arena rule instead.
    const spec = bossLevel();
    expect(spec.mode).toBe('Boss');
    expect(spec.enemies.filter((e) => e.level === 'B')).toHaveLength(1);
  });

  it('derives the boss count from the composition', () => {
    expect(bossCountFor(bossLevel())).toBe(1);
  });

  it('carries a non-zero bossAmount without being told one', () => {
    expect(createWaveState(bossLevel()).bossAmount).toBe(1);
  });

  it('is not already complete on the first frame', () => {
    // Was true before the fix: bossAmountKilled >= bossAmount is 0 >= 0.
    expect(isWaveComplete(createWaveState(bossLevel()), 0)).toBe(false);
  });

  it('can still spawn on the first frame', () => {
    // Was false before the fix: canSpawn's Boss gate is
    // bossAmount <= bossAmountKilled, i.e. 0 <= 0, so nothing ever spawned.
    expect(canSpawn(createWaveState(bossLevel()))).toBe(true);
  });

  it('completes only once the boss is actually killed', () => {
    const wave = createWaveState(bossLevel());
    wave.currentEnemies = 4;
    expect(isWaveComplete(wave, 4)).toBe(false);

    wave.bossAmountKilled = wave.bossAmount;
    expect(isWaveComplete(wave, 4)).toBe(true);
  });

  it('leaves non-Boss levels at zero, which canSpawn relies on', () => {
    // The mode guard is the AS3's (ScreenGame.as:371-377). A Normal level whose
    // composition happened to contain a 'B' entry must still report 0.
    const normal = getLevel(1, 1)!;
    expect(normal.mode).not.toBe('Boss');
    expect(createWaveState(normal).bossAmount).toBe(0);
    expect(bossCountFor({ ...normal, enemies: [{ type: 'Basic', level: 'B', count: 3 }] })).toBe(0);
  });
});

describe('createWaveState', () => {
  it('seeds the pool from the level composition', () => {
    const state = world1Level2();
    expect(state.pool).toEqual([
      { type: 'Basic', level: '1', remaining: 12 },
      { type: 'Fast', level: '1', remaining: 6 },
    ]);
    expect(state.remainingTotal).toBe(18);
    expect(state.enemiesLeft).toBe(18);
  });

  it('takes the spawn interval from enemyModel column 1', () => {
    // The column I previously mis-read as unused; ScreenGame.as:473 assigns it
    // to reloadTimeEnemyMax.
    expect(world1Level1().reloadTimeEnemyMax).toBeCloseTo(45.53, 5);
    expect(world1Level2().reloadTimeEnemyMax).toBe(42);
  });

  it('starts ready to spawn immediately', () => {
    const state = world1Level1();
    expect(state.reloadTimeEnemy).toBe(0);
    expect(canSpawn(state)).toBe(true);
  });
});

describe('canSpawn', () => {
  it('blocks while the timer is running', () => {
    const state = world1Level1();
    state.reloadTimeEnemy = 5;
    expect(canSpawn(state)).toBe(false);
  });

  it('blocks at the enemy cap', () => {
    const state = world1Level1();
    state.currentEnemies = MAX_ENEMIES;
    expect(canSpawn(state)).toBe(false);
  });

  it('counts pending warnings toward the cap', () => {
    const state = world1Level1();
    state.currentEnemies = MAX_ENEMIES - 2;
    state.pendingWarnings = 2;
    expect(canSpawn(state)).toBe(false);
  });

  it('blocks when nothing is left to spawn', () => {
    const state = world1Level1();
    state.enemiesLeft = 0;
    expect(canSpawn(state)).toBe(false);
  });

  it('lets Flag levels spawn forever', () => {
    const state = world1Level1();
    state.mode = 'Flag';
    state.enemiesLeft = 0;
    expect(canSpawn(state)).toBe(true);
  });

  it('stops Boss levels once every boss is dead', () => {
    const state = world1Level1();
    state.mode = 'Boss';
    state.bossAmount = 3;
    state.bossAmountKilled = 3;
    expect(canSpawn(state)).toBe(false);
  });
});

describe('computeSpawnInterval', () => {
  it('is the base interval on an empty arena', () => {
    const state = world1Level2();
    expect(computeSpawnInterval(state)).toBe(Math.round(state.reloadTimeEnemyMax));
  });

  it('grows as the arena fills', () => {
    const empty = world1Level2();
    const crowded = world1Level2();
    crowded.currentEnemies = 20;
    crowded.enemiesLeft = 18;

    expect(computeSpawnInterval(crowded)).toBeGreaterThan(computeSpawnInterval(empty));
  });

  it('omits the flat base term in Defense mode, opening faster', () => {
    const normal = world1Level2();
    const defense = world1Level2();
    defense.mode = 'Defense';

    expect(computeSpawnInterval(defense)).toBeLessThan(computeSpawnInterval(normal));
    expect(computeSpawnInterval(defense)).toBe(0); // empty arena, no base term
  });

  it('rushes the last ten enemies', () => {
    const mid = world1Level2();
    mid.enemiesLeft = 18;

    const endgame = world1Level2();
    endgame.enemiesLeft = 2;

    expect(computeSpawnInterval(endgame)).toBeLessThan(computeSpawnInterval(mid));
  });

  it('shortens monotonically as the level empties', () => {
    let previous = Infinity;
    for (let left = 10; left >= 1; left -= 1) {
      const state = world1Level2();
      state.enemiesLeft = left;
      const interval = computeSpawnInterval(state);
      expect(interval).toBeLessThanOrEqual(previous);
      previous = interval;
    }
  });
});

describe('drawEnemy — weighted draw without replacement', () => {
  it('draws the only type in a single-type level', () => {
    const state = world1Level1();
    expect(drawEnemy(state, undefined, () => 0.5)).toEqual({ type: 'Basic', level: '1' });
  });

  it('consumes from the pool', () => {
    const state = world1Level1();
    drawEnemy(state, undefined, () => 0.5);
    expect(state.pool[0].remaining).toBe(9);
    expect(state.remainingTotal).toBe(9);
  });

  it('respects the composition weighting', () => {
    // 12 Basic, 6 Fast: Basic occupies the first 12/18 = 0.667 of the range.
    const state = world1Level2();
    expect(drawEnemy(state, undefined, () => 0.1)?.type).toBe('Basic');

    const other = world1Level2();
    expect(drawEnemy(other, undefined, () => 0.9)?.type).toBe('Fast');
  });

  it('drains a level to exactly its composition', () => {
    const state = world1Level2();
    const drawn: Record<string, number> = {};

    let rolls = 0;
    while (state.remainingTotal > 0) {
      const enemy = drawEnemy(state, undefined, () => (rolls++ * 0.37) % 1);
      if (!enemy) break;
      drawn[enemy.type] = (drawn[enemy.type] ?? 0) + 1;
    }

    expect(drawn).toEqual({ Basic: 12, Fast: 6 });
    expect(state.remainingTotal).toBe(0);
  });

  it('never over-draws a type', () => {
    const state = world1Level2();
    for (let i = 0; i < 100; i += 1) drawEnemy(state, undefined, () => Math.random());
    for (const entry of state.pool) expect(entry.remaining).toBeGreaterThanOrEqual(0);
  });

  it('returns null when the pool is empty', () => {
    const state = world1Level1();
    state.pool.forEach((e) => (e.remaining = 0));
    state.remainingTotal = 0;
    expect(drawEnemy(state, undefined, () => 0.5)).toBeNull();
  });
});

describe('drawEnemy — Flag and Boss modes', () => {
  it('does not consume the pool in Flag mode', () => {
    const state = world1Level2();
    state.mode = 'Flag';
    drawEnemy(state, { countsByType: {} }, () => 0.1);
    expect(state.remainingTotal).toBe(18);
    expect(state.pool[0].remaining).toBe(12);
  });

  it('skips a type that is already over-represented', () => {
    const state = world1Level2();
    state.mode = 'Flag';
    // Basic's share is 12/18; flood the arena with Basic so it is skipped.
    const drawn = drawEnemy(state, { countsByType: { Basic: 35 } }, () => 0.1);
    expect(drawn?.type).toBe('Fast');
  });

  // These build a Boss-mode spec and let the quota derive from its composition,
  // rather than declaring a mode after the fact and asserting a count beside it.
  // The old shape could describe states the game cannot reach — mode Boss with a
  // quota unrelated to the entries — which is how a wrong quota stayed invisible.
  it('spawns bosses until the quota is met', () => {
    const state = createWaveState({
      ...getLevel(1, 1)!,
      mode: 'Boss',
      enemies: [{ type: 'Basic', level: 'B', count: 3 }],
    });

    expect(state.bossAmount).toBe(3);
    expect(drawEnemy(state)).toEqual({ type: 'Basic', level: 'B' });
    expect(state.bossAmountSpawned).toBe(1);
  });

  it('stops drawing bosses once the quota is met', () => {
    const state = createWaveState({
      ...getLevel(1, 1)!,
      mode: 'Boss',
      enemies: [{ type: 'Basic', level: 'B', count: 1 }],
    });
    expect(state.bossAmount).toBe(1);
    drawEnemy(state);

    // Quota met; the normal path runs and finds no non-boss entries.
    expect(state.bossAmountSpawned).toBe(1);
    expect(drawEnemy(state, { countsByType: {} }, () => 0.5)).toBeNull();
  });

  it('never draws a boss entry through the normal path', () => {
    // Stays in the level's own Normal mode, so the quota derives to 0 — the
    // boss path is unreachable and only the normal draw runs.
    const state = createWaveState({
      ...getLevel(1, 1)!,
      enemies: [
        { type: 'Basic', level: '1', count: 5 },
        { type: 'Fast', level: 'B', count: 1 },
      ],
    });
    expect(state.bossAmount).toBe(0);

    for (let i = 0; i < 50; i += 1) {
      const drawn = drawEnemy(state, undefined, () => Math.random());
      if (drawn) expect(drawn.level).not.toBe('B');
    }
  });
});

describe('spawn bookkeeping', () => {
  it('resets the timer and counts a pending warning', () => {
    const state = world1Level2();
    registerSpawn(state);

    expect(state.pendingWarnings).toBe(1);
    expect(state.enemiesLeft).toBe(17);
    expect(state.reloadTimeEnemy).toBeGreaterThan(0);
    expect(canSpawn(state)).toBe(false);
  });

  it('does not decrement enemiesLeft in Flag mode', () => {
    const state = world1Level2();
    state.mode = 'Flag';
    registerSpawn(state);
    expect(state.enemiesLeft).toBe(18);
  });

  it('moves a warning into the live count', () => {
    const state = world1Level2();
    registerSpawn(state);
    registerEnemySpawned(state);

    expect(state.pendingWarnings).toBe(0);
    expect(state.currentEnemies).toBe(1);
  });

  it('decrements the live count on death', () => {
    const state = world1Level2();
    registerSpawn(state);
    registerEnemySpawned(state);
    registerEnemyKilled(state);
    expect(state.currentEnemies).toBe(0);
  });

  it('counts boss kills separately', () => {
    const state = world1Level2();
    state.currentEnemies = 1;
    registerEnemyKilled(state, true);
    expect(state.bossAmountKilled).toBe(1);
  });

  it('never lets counters go negative', () => {
    const state = world1Level2();
    registerEnemyKilled(state);
    registerEnemySpawned(state);
    registerEnemyKilled(state);
    registerEnemyKilled(state);
    expect(state.currentEnemies).toBe(0);
    expect(state.pendingWarnings).toBe(0);
  });
});

describe('tickWave', () => {
  it('counts the timer down in frames', () => {
    const state = world1Level2();
    state.reloadTimeEnemy = 30;
    tickWave(state, 1000); // one second = 30 frames
    expect(state.reloadTimeEnemy).toBeCloseTo(0, 6);
  });

  it('never goes below zero', () => {
    const state = world1Level2();
    state.reloadTimeEnemy = 2;
    tickWave(state, 5000);
    expect(state.reloadTimeEnemy).toBe(0);
  });

  it('is frame-rate independent', () => {
    const at30 = world1Level2();
    at30.reloadTimeEnemy = 60;
    for (let i = 0; i < 30; i += 1) tickWave(at30, 1000 / 30);

    const at60 = world1Level2();
    at60.reloadTimeEnemy = 60;
    for (let i = 0; i < 60; i += 1) tickWave(at60, 1000 / 60);

    expect(at60.reloadTimeEnemy).toBeCloseTo(at30.reloadTimeEnemy, 6);
  });
});

describe('a full level drains', () => {
  it('spawns exactly the composition and completes', () => {
    const state = world1Level2();
    let spawned = 0;
    const counts: Record<string, number> = {};
    let rolls = 0;

    for (let frame = 0; frame < 100000 && !isWaveComplete(state); frame += 1) {
      tickWave(state, FRAME);

      if (canSpawn(state)) {
        const enemy = drawEnemy(state, undefined, () => (rolls++ * 0.41) % 1);
        if (enemy) {
          registerSpawn(state);
          registerEnemySpawned(state);
          counts[enemy.type] = (counts[enemy.type] ?? 0) + 1;
          spawned += 1;
          // Kill it immediately so the arena never caps out.
          registerEnemyKilled(state);
        }
      }
    }

    expect(spawned).toBe(18);
    expect(counts).toEqual({ Basic: 12, Fast: 6 });
    expect(isWaveComplete(state)).toBe(true);
  });

  it('ignores the arena rule on a Flag level', () => {
    // Previously this asserted a Flag level is *never* complete, which pinned
    // a limitation rather than a requirement: `isWaveComplete` had no Flag
    // branch, so 90 levels could not finish. It now ends on flags.
    const state = world1Level2();
    state.mode = 'Flag';
    state.enemiesLeft = 0;
    state.flagsLeft = 3;
    expect(isWaveComplete(state)).toBe(false);

    state.flagsLeft = 0;
    // Complete on flags even with the arena full — Flag levels spawn forever.
    state.currentEnemies = 7;
    expect(isWaveComplete(state)).toBe(true);
  });

  it('ends a Boss level on the boss count', () => {
    const state = world1Level2();
    state.mode = 'Boss';
    state.bossAmount = 2;
    state.currentEnemies = 5;

    expect(isWaveComplete(state)).toBe(false);
    state.bossAmountKilled = 2;
    expect(isWaveComplete(state)).toBe(true);
  });

  it('respects the enemy cap when nothing dies', () => {
    const state = createWaveState({ ...getLevel(1, 2)!, totalEnemies: 200 });
    let alive = 0;

    for (let frame = 0; frame < 100000; frame += 1) {
      tickWave(state, FRAME);
      if (canSpawn(state)) {
        const enemy = drawEnemy(state, undefined, () => 0.5);
        if (!enemy) break;
        registerSpawn(state);
        registerEnemySpawned(state);
        alive += 1;
        expect(alive).toBeLessThanOrEqual(MAX_ENEMIES);
      }
    }

    expect(alive).toBeLessThanOrEqual(MAX_ENEMIES);
  });
});

describe('WaveState shape', () => {
  it('exposes the counters the AS3 keeps on ScreenGame', () => {
    const state: WaveState = world1Level1();
    expect(state).toMatchObject({
      currentEnemies: 0,
      pendingWarnings: 0,
      bossAmountSpawned: 0,
      bossAmountKilled: 0,
      maxEnemies: MAX_ENEMIES,
      countDownDone: false,
    });
  });
});
