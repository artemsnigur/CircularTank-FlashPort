/**
 * Wave spawning — the port of `PartGameArea.spawnWarnings()` (lines 7122-7327)
 * minus its display work.
 *
 * ── The spawn pool ────────────────────────────────────────────────────────
 * `enemyModelCurrent` in the AS3 is a **mutable copy** of the level's enemy
 * model row. Each spawn decrements that type's remaining count *and* the
 * running total, so type selection is a weighted draw **without replacement**:
 * a level with 12 Basic and 6 Fast spawns those exact counts, in a random
 * order weighted by what is left.
 *
 * Flag and Boss levels are the exception — they do not decrement, so they
 * spawn indefinitely and instead cap how many of one type may be alive at
 * once. Both branches are ported.
 *
 * ── Pacing ────────────────────────────────────────────────────────────────
 * The interval between spawns is not constant. It grows with how crowded the
 * arena already is, and then *shrinks* over the last ten enemies so a level
 * ends in a rush rather than a trickle.
 */

import type { LevelMode, LevelSpec } from '../levels/levelData';
import type { EnemyLevel } from '../config/constants';

/** ScreenGame.as:45 — hard cap on enemies alive plus pending. */
export const MAX_ENEMIES = 35;

/** SWF frame rate; all the interval maths is in frames. */
const AS3_FPS = 30;

/** One entry of the mutable spawn pool. */
export interface PoolEntry {
  type: string;
  level: EnemyLevel;
  /** Decremented on each spawn in the non-Flag/Boss path. */
  remaining: number;
}

export interface WaveState {
  mode: LevelMode;
  /** Mutable copy of the level's composition — AS3 `enemyModelCurrent`. */
  pool: PoolEntry[];
  /** AS3 `enemyModelCurrent[0]` — total still to draw. */
  remainingTotal: number;
  /** AS3 `ScreenGame.enemiesLeft`. */
  enemiesLeft: number;
  /** AS3 `ScreenGame.currentEnemies` — alive right now. */
  currentEnemies: number;
  /** Frames until the next spawn is allowed. AS3 `reloadTimeEnemy`. */
  reloadTimeEnemy: number;
  /** Base interval in frames — enemyModel column 1. */
  reloadTimeEnemyMax: number;
  /** Pending warnings not yet turned into enemies. */
  pendingWarnings: number;
  maxEnemies: number;
  bossAmount: number;
  bossAmountSpawned: number;
  bossAmountKilled: number;
  /** True once the level's opening countdown has finished. */
  countDownDone: boolean;
}

export function createWaveState(spec: LevelSpec, bossAmount = 0): WaveState {
  return {
    mode: spec.mode,
    pool: spec.enemies.map((entry) => ({
      type: entry.type,
      level: entry.level,
      remaining: entry.count,
    })),
    remainingTotal: spec.totalEnemies,
    enemiesLeft: spec.totalEnemies,
    currentEnemies: 0,
    reloadTimeEnemy: 0,
    reloadTimeEnemyMax: spec.spawnInterval,
    pendingWarnings: 0,
    maxEnemies: MAX_ENEMIES,
    bossAmount,
    bossAmountSpawned: 0,
    bossAmountKilled: 0,
    countDownDone: false,
  };
}

/**
 * `spawnWarnings`'s guard — whether a spawn may happen this frame.
 *
 * Four conditions, all of which must hold:
 *   - the spawn timer has run down
 *   - there is something left to spawn (mode-dependent; Flag spawns forever)
 *   - the arena is not at its cap
 *   - in Boss mode, not every boss has already been killed
 */
export function canSpawn(state: WaveState): boolean {
  if (state.reloadTimeEnemy > 0) return false;

  const somethingLeft =
    state.enemiesLeft - state.pendingWarnings > 0 ||
    (state.mode === 'Boss' && state.enemiesLeft - state.bossAmountSpawned > 0) ||
    state.mode === 'Flag';
  if (!somethingLeft) return false;

  if (state.pendingWarnings + state.currentEnemies === state.maxEnemies) return false;

  if (state.mode === 'Boss' && state.bossAmount <= state.bossAmountKilled) return false;

  return true;
}

/**
 * Frames to wait before the next spawn.
 *
 * Defense levels omit the flat base term, so they open much faster — the mode
 * is a continuous assault rather than a paced wave.
 */
export function computeSpawnInterval(state: WaveState): number {
  const crowding =
    ((state.pendingWarnings + state.currentEnemies) / state.maxEnemies) *
    5 *
    state.reloadTimeEnemyMax;

  let interval =
    state.mode === 'Defense'
      ? Math.round(crowding)
      : Math.round(state.reloadTimeEnemyMax + crowding);

  // Endgame rush: with ten or fewer left, the interval shrinks sharply.
  const outstanding = state.enemiesLeft - state.pendingWarnings;
  if (outstanding <= 10) {
    interval = Math.round(interval / (1 + (10 - outstanding) / 6));
  }

  return interval;
}

export interface DrawnEnemy {
  type: string;
  level: EnemyLevel;
}

export interface LivePopulation {
  /** How many of each type are alive or pending, by type name. */
  countsByType: Readonly<Record<string, number>>;
}

/**
 * Picks the next enemy type.
 *
 * Non-Flag/Boss: a weighted draw over the remaining counts, consuming one.
 * Flag/Boss: the same weighting, but a type is skipped while its share of the
 * live population already meets its share of the composition — which keeps a
 * long Flag level from drifting into all-of-one-type. Nothing is consumed, so
 * those modes spawn indefinitely.
 *
 * Boss entries (`level === 'B'`) are never drawn here; `drawBoss` handles them.
 */
export function drawEnemy(
  state: WaveState,
  population: LivePopulation = { countsByType: {} },
  random: () => number = Math.random,
): DrawnEnemy | null {
  const balanced = state.mode === 'Boss' || state.mode === 'Flag';

  // Boss mode spawns the boss itself until the quota is met.
  if (state.mode === 'Boss' && state.bossAmountSpawned < state.bossAmount) {
    return drawBoss(state);
  }

  const roll = random();
  let cumulative = 0;

  const drawable = state.pool.filter((entry) => entry.level !== 'B');
  const liveDenominator =
    state.maxEnemies - state.bossAmount + state.bossAmountKilled || 1;

  for (let i = 0; i < drawable.length; i += 1) {
    const entry = drawable[i];
    const share = state.remainingTotal > 0 ? entry.remaining / state.remainingTotal : 0;

    if (balanced) {
      const live = population.countsByType[entry.type] ?? 0;
      const liveShare = live / liveDenominator;
      const isLast = i === drawable.length - 1;
      if ((liveShare < share && roll <= cumulative + share) || isLast) {
        return { type: entry.type, level: entry.level };
      }
    } else if (roll <= cumulative + share) {
      entry.remaining -= 1;
      state.remainingTotal -= 1;
      return { type: entry.type, level: entry.level };
    }

    cumulative += share;
  }

  return null;
}

/** Boss mode's dedicated branch: draw a `B` entry and count it. */
function drawBoss(state: WaveState): DrawnEnemy | null {
  const entry = state.pool.find((e) => e.level === 'B' && e.remaining > 0);
  if (!entry) return null;

  entry.remaining -= 1;
  state.remainingTotal -= 1;
  state.bossAmountSpawned += 1;
  return { type: entry.type, level: entry.level };
}

/** Records that a warning was queued: resets the timer and counts it. */
export function registerSpawn(state: WaveState): void {
  state.reloadTimeEnemy = computeSpawnInterval(state);
  state.pendingWarnings += 1;

  // Flag and Boss levels never run dry, so their remaining count is untouched.
  if (state.mode !== 'Flag' && state.mode !== 'Boss') {
    state.enemiesLeft -= 1;
  }
}

/** A warning matured into an enemy. */
export function registerEnemySpawned(state: WaveState): void {
  state.pendingWarnings = Math.max(0, state.pendingWarnings - 1);
  state.currentEnemies += 1;
}

/** An enemy died. */
export function registerEnemyKilled(state: WaveState, wasBoss = false): void {
  state.currentEnemies = Math.max(0, state.currentEnemies - 1);
  if (wasBoss) state.bossAmountKilled += 1;
}

/** Advances the spawn timer. Call once per frame. */
export function tickWave(state: WaveState, deltaMs: number): void {
  const frames = (deltaMs / 1000) * AS3_FPS;
  state.reloadTimeEnemy = Math.max(0, state.reloadTimeEnemy - frames);
}

/** True once nothing is left to spawn and the arena is clear. */
export function isWaveComplete(state: WaveState): boolean {
  if (state.mode === 'Flag') return false;
  return (
    state.enemiesLeft <= 0 && state.currentEnemies <= 0 && state.pendingWarnings <= 0
  );
}
