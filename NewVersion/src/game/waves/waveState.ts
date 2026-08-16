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
import { HELD_SPAWN_RELOAD } from '../tutorial/tutorialGates';
import type { EnemyLevel } from '../config/constants';

/** ScreenGame.as:45 — hard cap on enemies alive plus pending. */
export const MAX_ENEMIES = 35;

/** SWF frame rate; all the interval maths is in frames. */
const AS3_FPS = 30;

/** One entry of the mutable spawn pool. */
interface PoolEntry {
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
  /** AS3 `ScreenGame.flagsLeft` — flags still to capture on a Flag level. */
  flagsLeft: number;
  /** True once the level's opening countdown has finished. */
  /**
   * `PartGameArea.countDownDone` — true once the pre-level countdown finishes.
   *
   * **Read by `spawnPlacement` and never written by this port**, because the
   * countdown itself is unported. It therefore sits permanently false, which
   * is the *pre-countdown* state — every level behaves as though its countdown
   * were still running.
   *
   * **What depends on it being false today.** `spawnPlacement`'s first line is
   * `if (countDownDone) return false` — the off-camera spawn search is skipped
   * once the countdown has finished. Permanently false therefore means the
   * port runs that search on **every** spawn, on every level, where the AS3
   * runs it only during the countdown. So this is an unported subsystem's
   * state leaking into a ported one's behaviour *now*, not merely a missing
   * feature: whoever ports the countdown is changing spawn placement for the
   * whole game, and should expect enemies to start appearing in places they
   * currently cannot.
   *
   * `PartInterface.as:288` is the one place the AS3 sets it early: on world 1
   * level 1, for a tutorial that is on, incomplete and has done nothing yet,
   * the countdown is skipped outright and this is forced true. That line was
   * in scope for T47 and **deliberately not wired**: it is a gate of the same
   * shape as the other two, but it entangles with an unported countdown rather
   * than with the tutorial, and setting it would change spawn placement on 1-1
   * for reasons that have nothing to do with the tutorial. It belongs with
   * whichever pass ports the countdown.
   */
  countDownDone: boolean;
}

/**
 * `ScreenGame.getBossCount()` — `ScreenGame.as:703-716`.
 *
 * Sums the `count` of every composition entry whose enemy level is `B`. The AS3
 * reads the combined name out of the model row and tests its last character
 * (`searchPlace.slice(len - 1, len) == "B"`); the extraction splits that suffix
 * off into `LevelEnemy.level` (`gen-levels.mjs:109-110`), so testing the suffix
 * is the same check.
 *
 * The mode guard is the AS3's too — `ScreenGame.as:371-377` only calls this on a
 * Boss level and pins `bossAmount = 0` everywhere else. That zero is load-bearing
 * for `canSpawn`, which uses `bossAmount <= bossAmountKilled` as a Boss-only gate.
 */
export function bossCountFor(spec: LevelSpec): number {
  if (spec.mode !== 'Boss') return 0;
  return spec.enemies.reduce((sum, entry) => (entry.level === 'B' ? sum + entry.count : sum), 0);
}

/**
 * `bossAmount` is **derived from the spec and cannot be supplied**, which is the
 * fix for a real bug rather than a style preference.
 *
 * It used to be a parameter defaulting to `0`, and `GameplayScene` called
 * `createWaveState(spec)` without it. On a Boss level that made `isWaveComplete`
 * return true on the first frame (`bossAmountKilled >= bossAmount` is `0 >= 0`)
 * while `canSpawn` returned false forever — so all 45 Boss levels auto-won with
 * an empty arena, starting at 1-9. Every Boss test supplied the argument by
 * hand, so the suite never saw it.
 *
 * Defaulting it to `bossCountFor(spec)` fixed the omission. Removing the
 * parameter outright closes the rest: an overridable value is a loaded gun on a
 * quantity that is a pure function of the spec, because the next test to pass
 * its own number re-blinds the suite exactly as before, and it can describe
 * states the game cannot reach — a Boss level whose quota bears no relation to
 * its composition. If a real caller ever needs to override this, give it a named
 * entry point rather than restoring the parameter.
 */
export function createWaveState(spec: LevelSpec): WaveState {
  const bossAmount = bossCountFor(spec);
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
    flagsLeft: spec.flagCount,
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

/**
 * Advances the spawn timer. Call once per frame.
 *
 * `hold` is the tutorial's gate (`:7153`), applied **here rather than at the
 * call site** so it cannot leak onto branches it was never meant to touch —
 * the `levelDoneGate` lesson. It pins the countdown one frame above the
 * threshold instead of suppressing the spawn, which is what makes release
 * immediate; see `tutorial/tutorialGates.ts` for why that difference matters.
 *
 * Defaults to false, so every existing caller and every player with the
 * tutorial off is unchanged.
 */
export function tickWave(state: WaveState, deltaMs: number, hold = false): void {
  if (hold) {
    state.reloadTimeEnemy = HELD_SPAWN_RELOAD;
    return;
  }
  const frames = (deltaMs / 1000) * AS3_FPS;
  state.reloadTimeEnemy = Math.max(0, state.reloadTimeEnemy - frames);
}

/**
 * Whether the level's win condition is met.
 *
 * `PartGameArea.as:2708` is a single expression covering every mode, and the
 * modes do not share a rule:
 *
 *     Normal / Tower / Defense   currentEnemies + enemiesLeft == 0
 *     Flag                       flagsLeft == 0
 *     Boss                       bossAmountKilled == bossAmount
 *
 * That matters because Flag and Boss levels **spawn indefinitely** — neither
 * decrements `enemiesLeft` (see `registerSpawn`), so the arena never empties
 * and the default rule can never fire for them. This previously returned false
 * for Flag by design and, unnoticed, never returned true for Boss either:
 * together that is 135 of the 405 levels unable to finish.
 *
 * ── Why `liveEnemies` belongs in here and not at the call site ────────────
 * `currentEnemies` is a counter and can drift; the scene's actual enemy list
 * is ground truth, so the default branch requires both. That check was
 * originally applied by the caller as `isWaveComplete(wave) && enemies.length
 * === 0`, which silently broke Flag and Boss — their arenas are *never* empty,
 * so a guard meant for the arena-clearing modes vetoed the two modes that do
 * not use the arena rule at all. It only makes sense inside the branch whose
 * rule it guards.
 */
export function isWaveComplete(state: WaveState, liveEnemies = 0): boolean {
  if (state.mode === 'Flag') return state.flagsLeft <= 0;
  if (state.mode === 'Boss') return state.bossAmountKilled >= state.bossAmount;
  return (
    state.enemiesLeft <= 0 &&
    state.currentEnemies <= 0 &&
    state.pendingWarnings <= 0 &&
    liveEnemies <= 0
  );
}

/** A flag was captured — `--ScreenGame.flagsLeft`. */
export function registerFlagCaptured(state: WaveState): void {
  state.flagsLeft = Math.max(0, state.flagsLeft - 1);
}
