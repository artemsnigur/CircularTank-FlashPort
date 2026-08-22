import { describe, expect, it } from 'vitest';
import {
  bossCountFor,
  bossesOut,
  canSpawn,
  canSpawnBoss,
  computeSpawnInterval,
  createWaveState,
  drawEnemy,
  isWaveComplete,
  MAX_BOSSES_ALIVE,
  MAX_ENEMIES,
  registerEnemyKilled,
  registerEnemySpawned,
  registerSpawn,
  tickWave,
} from './waveState';
import type { WaveState } from './waveState';
import { AS3_LEVELS, getLevel } from '../levels/levelData';
import type { LevelMode, LevelSpec } from '../levels/levelData';

const FRAME = 1000 / 30;

/*
 * These deliberately go through `getLevel`, not `LEVELS` — the header below
 * explains why, and T250 makes it matter more: the accessor now applies the
 * `D-3` density tuning, so this is the level as the scene receives it.
 *
 * The consequence is that no assertion here may hardcode a count. Several did
 * — 12 Basic, 6 Fast, an interval of 45.53 — and they were pinning the
 * fixture's size while claiming to test the spawner. They read the spec now.
 */
const spec1 = () => guard(getLevel(1, 1)!, 'Normal', 1);
const spec2 = () => guard(getLevel(1, 4)!, 'Normal', 2);
const world1Level1 = () => createWaveState(spec1());
const world1Level2 = () => createWaveState(spec2());

/**
 * Asserts a fixture is the shape the tests below need, and returns it.
 *
 * **Added because a fixture changed meaning underneath these tests.** They used
 * 1-2, which was a Normal level in the AS3's campaign and is a **Flag** level
 * in the redesigned one (T252). Flag mode never consumes its pool, so
 * `while (state.remainingTotal > 0)` stopped terminating and the whole suite
 * hung — no failure, no message, just a run that never ended.
 *
 * A level number is not a stable description of a level. Naming what the
 * fixture has to be turns that into one failed assertion in one file.
 */
function guard(spec: LevelSpec, mode: LevelMode, entries: number): LevelSpec {
  expect(spec.mode, `fixture should be a ${mode} level`).toBe(mode);
  expect(spec.enemies.length, `fixture should have ${entries} entries`).toBe(entries);
  return spec;
}

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
  // 1-5 is the campaign's first boss level: one boss and two support types.
  // The entry count is guarded so a composition change fails here rather than
  // in whichever assertion happens to read `enemies[1]`.
  const bossLevel = () => guard(getLevel(1, 5)!, 'Boss', 3);

  it('is a Boss level with a boss in its composition', () => {
    // Guards the fixture: if 1-9 ever stops being a Boss level the tests below
    // would pass vacuously against the arena rule instead.
    const spec = bossLevel();
    expect(spec.mode).toBe('Boss');
    expect(spec.enemies.filter((e) => e.level === 'B')).toHaveLength(1);
  });

  it('derives the boss count from the composition', () => {
    // From the spec's own `B` entry, not a literal: the campaign sets boss
    // counts per level and 1-5 fields two. What must hold is that the
    // derivation agrees with the row, whatever the row says.
    const spec = bossLevel();
    const declared = spec.enemies
      .filter((e) => e.level === 'B')
      .reduce((n, e) => n + e.count, 0);

    expect(declared, 'the fixture has bosses at all').toBeGreaterThan(0);
    expect(bossCountFor(spec)).toBe(declared);
  });

  it('carries a non-zero bossAmount without being told one', () => {
    const spec = bossLevel();
    expect(createWaveState(spec).bossAmount).toBe(bossCountFor(spec));
    expect(createWaveState(spec).bossAmount).toBeGreaterThan(0);
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
    const spec = spec2();
    const state = createWaveState(spec);

    // Mirrors the spec entry for entry. Not a tautology: `createWaveState` is
    // the module under test and the spec is its input, from `levelData`.
    expect(state.pool).toEqual(
      spec.enemies.map((e) => ({ type: e.type, level: e.level, remaining: e.count })),
    );
    expect(state.pool).toHaveLength(2);
    expect(state.remainingTotal).toBe(spec.totalEnemies);
    expect(state.enemiesLeft).toBe(spec.totalEnemies);
  });

  it('takes the spawn interval from enemyModel column 1', () => {
    // The column I previously mis-read as unused; ScreenGame.as:473 assigns it
    // to reloadTimeEnemyMax.
    //
    // Two claims, kept apart. The AS3's own numbers are asserted against the
    // **source table**, because that is what "enemyModel column 1" means; the
    // carry-through is asserted against whatever the accessor hands over, so it
    // survives the `D-3` tuning that now shortens it.
    expect(AS3_LEVELS[0][0].spawnInterval).toBeCloseTo(45.53, 5);
    expect(AS3_LEVELS[0][1].spawnInterval).toBe(42);

    expect(world1Level1().reloadTimeEnemyMax).toBeCloseTo(spec1().spawnInterval, 5);
    expect(world1Level2().reloadTimeEnemyMax).toBeCloseTo(spec2().spawnInterval, 5);
    // ...and the tuning is really in the path, or the two lines above agree
    // about an untouched number and prove nothing.
    expect(world1Level1().reloadTimeEnemyMax).toBeLessThan(AS3_LEVELS[0][0].spawnInterval);
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
    const spec = spec1();
    const state = createWaveState(spec);
    drawEnemy(state, undefined, () => 0.5);

    expect(state.pool[0].remaining).toBe(spec.enemies[0].count - 1);
    expect(state.remainingTotal).toBe(spec.totalEnemies - 1);
  });

  it('respects the composition weighting', () => {
    // The first pool entry occupies the first `count / total` of the range and
    // the last occupies the end of it. Named from the spec, not written out:
    // which type is first is a property of the level, and this test is about
    // the weighting.
    const spec = spec2();
    const [first, last] = [spec.enemies[0].type, spec.enemies[spec.enemies.length - 1].type];
    expect(first, 'the fixture has two different types').not.toBe(last);

    expect(drawEnemy(createWaveState(spec), undefined, () => 0.1)?.type).toBe(first);
    expect(drawEnemy(createWaveState(spec), undefined, () => 0.9)?.type).toBe(last);
  });

  it('drains a level to exactly its composition', () => {
    const spec = spec2();
    const state = createWaveState(spec);
    const drawn: Record<string, number> = {};

    let rolls = 0;
    while (state.remainingTotal > 0) {
      const enemy = drawEnemy(state, undefined, () => (rolls++ * 0.37) % 1);
      if (!enemy) break;
      drawn[enemy.type] = (drawn[enemy.type] ?? 0) + 1;
    }

    expect(drawn).toEqual(Object.fromEntries(spec.enemies.map((e) => [e.type, e.count])));
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
    const spec = spec2();
    const state = createWaveState(spec);
    state.mode = 'Flag';
    drawEnemy(state, { countsByType: {} }, () => 0.1);

    expect(state.remainingTotal).toBe(spec.totalEnemies);
    expect(state.pool[0].remaining).toBe(spec.enemies[0].count);
  });

  it('skips a type that is already over-represented', () => {
    const spec = spec2();
    const [first, last] = [spec.enemies[0].type, spec.enemies[spec.enemies.length - 1].type];

    const state = createWaveState(spec);
    state.mode = 'Flag';
    // Flood the arena with the type a roll of 0.1 would otherwise draw, so the
    // balanced branch has to pass over it.
    const drawn = drawEnemy(state, { countsByType: { [first]: 35 } }, () => 0.1);
    expect(drawn?.type).toBe(last);
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

describe('at most four bosses are out at once (A95)', () => {
  /**
   * A ten-boss level with support, and a three-boss one to sit beside it.
   *
   * The pair is the point. "Only four spawned" proves nothing on its own — a
   * gate that never opens gives the same answer — so every cap assertion below
   * has a counterpart on a level *under* the cap, where nothing may be
   * withheld.
   */
  const bossLevel = (bosses: number) =>
    createWaveState({
      ...getLevel(1, 5)!,
      mode: 'Boss',
      enemies: [
        { type: 'Basic', level: 'B', count: bosses },
        { type: 'Fast', level: '1', count: 20 },
      ],
    });

  /** Draws n times with a fixed roll and reports what came out. */
  const draw = (state: WaveState, times: number): string[] => {
    const out: string[] = [];
    for (let i = 0; i < times; i += 1) {
      const drawn = drawEnemy(state, { countsByType: {} }, () => 0.1);
      out.push(drawn ? `${drawn.type}:${drawn.level}` : 'null');
    }
    return out;
  };

  /**
   * Four is a decision, not a ported number, so it is pinned to make a change
   * to it deliberate — the `TANK_ROT_SPEED_MAX` lesson. There is no AS3 value
   * to check it against: the original has no cap at all.
   */
  it('caps at four', () => {
    expect(MAX_BOSSES_ALIVE).toBe(4);
  });

  it('withholds the fifth boss on a ten-boss level', () => {
    const state = bossLevel(10);
    expect(state.bossAmount).toBe(10);

    const drawn = draw(state, 8);
    expect(state.bossAmountSpawned).toBe(MAX_BOSSES_ALIVE);
    expect(drawn.slice(0, 4)).toEqual(Array(4).fill('Basic:B'));
    // The counterpart to "no more bosses": the level does not go quiet. Once
    // capped it keeps feeding support enemies instead of drawing nothing.
    expect(drawn.slice(4)).toEqual(Array(4).fill('Fast:1'));
  });

  it('withholds nothing on a three-boss level', () => {
    const state = bossLevel(3);
    const drawn = draw(state, 4);

    expect(state.bossAmountSpawned).toBe(3);
    expect(drawn.slice(0, 3)).toEqual(Array(3).fill('Basic:B'));
    expect(drawn[3]).toBe('Fast:1');
  });

  it('releases exactly one more boss per death', () => {
    const state = bossLevel(10);
    draw(state, 4);
    expect(bossesOut(state)).toBe(4);

    registerEnemyKilled(state, true);
    expect(bossesOut(state)).toBe(3);

    expect(draw(state, 1)).toEqual(['Basic:B']);
    expect(state.bossAmountSpawned).toBe(5);
    // ...and one only: back at the cap, the next draw is support again.
    expect(draw(state, 1)).toEqual(['Fast:1']);
  });

  it('draws nothing at all when the cap bites and there is no support', () => {
    const state = createWaveState({
      ...getLevel(1, 5)!,
      mode: 'Boss',
      enemies: [{ type: 'Basic', level: 'B', count: 10 }],
    });

    expect(draw(state, 4)).toEqual(Array(4).fill('Basic:B'));
    expect(draw(state, 3)).toEqual(Array(3).fill('null'));
  });

  /**
   * The failure the cap could plausibly introduce: bosses that never all come
   * out, so the level cannot be finished. Driven end to end rather than
   * reasoned about — spawn, kill, repeat, until the quota is met or the loop
   * gives up.
   */
  it('still delivers all ten, and the level completes', () => {
    const state = bossLevel(10);
    let guard = 0;

    while (state.bossAmountKilled < state.bossAmount && guard < 500) {
      guard += 1;
      const drawn = drawEnemy(state, { countsByType: {} }, () => 0.1);
      if (drawn?.level === 'B') continue;
      // Nothing new to draw, or support drawn: kill whatever boss is out.
      if (bossesOut(state) > 0) registerEnemyKilled(state, true);
    }

    expect(guard, 'the loop finished rather than timing out').toBeLessThan(500);
    expect(state.bossAmountSpawned).toBe(10);
    expect(state.bossAmountKilled).toBe(10);
    expect(isWaveComplete(state)).toBe(true);
  });

  it('never lets more than four be out at any point of that run', () => {
    const state = bossLevel(10);
    let peak = 0;

    for (let i = 0; i < 200 && state.bossAmountKilled < 10; i += 1) {
      const drawn = drawEnemy(state, { countsByType: {} }, () => 0.1);
      peak = Math.max(peak, bossesOut(state));
      if (drawn?.level !== 'B' && bossesOut(state) > 0) {
        registerEnemyKilled(state, true);
      }
    }

    expect(peak).toBe(MAX_BOSSES_ALIVE);
  });

  /**
   * The gate's negative, driven against its positive on the same state: an
   * identical wave in Normal mode may never draw a boss, and in Boss mode may.
   */
  it('gates on the mode, and says yes in the mode it gates for', () => {
    const state = bossLevel(10);
    expect(canSpawnBoss(state)).toBe(true);

    state.mode = 'Normal';
    expect(canSpawnBoss(state)).toBe(false);
  });

  /**
   * The boundary, from both sides on the identical state.
   *
   * This is what proves the number is load-bearing rather than decorative, and
   * it is why there is no mutation probe here: a cap that did not exist would
   * answer `true` at four, and a cap of three would answer `false` at three.
   * Only four passes both halves.
   */
  it('opens at three out and closes at four', () => {
    const state = bossLevel(10);

    draw(state, 3);
    expect(bossesOut(state)).toBe(3);
    expect(canSpawnBoss(state), 'room for one more at three out').toBe(true);

    draw(state, 1);
    expect(bossesOut(state)).toBe(4);
    expect(canSpawnBoss(state), 'and none at four').toBe(false);
  });

  it('says no once the quota is spawned, even with room on the map', () => {
    const state = bossLevel(2);
    draw(state, 2);

    expect(bossesOut(state)).toBeLessThan(MAX_BOSSES_ALIVE);
    expect(canSpawnBoss(state)).toBe(false);
  });
});

describe('spawn bookkeeping', () => {
  it('resets the timer and counts a pending warning', () => {
    const state = world1Level2();
    registerSpawn(state);

    expect(state.pendingWarnings).toBe(1);
    expect(state.enemiesLeft).toBe(spec2().totalEnemies - 1);
    expect(state.reloadTimeEnemy).toBeGreaterThan(0);
    expect(canSpawn(state)).toBe(false);
  });

  it('does not decrement enemiesLeft in Flag mode', () => {
    const spec = spec2();
    const state = createWaveState(spec);
    state.mode = 'Flag';
    registerSpawn(state);
    expect(state.enemiesLeft).toBe(spec.totalEnemies);
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
    const spec = spec2();
    const state = createWaveState(spec);
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

    expect(spawned).toBe(spec.totalEnemies);
    expect(counts).toEqual(
      Object.fromEntries(spec.enemies.map((e) => [e.type, e.count])),
    );
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
