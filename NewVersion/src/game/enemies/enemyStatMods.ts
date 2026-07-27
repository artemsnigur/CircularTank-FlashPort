/**
 * Runtime stat modifiers — enemies whose speed changes during a level.
 *
 * Separate from the stat tables because these are *mutations over time*, not
 * resolved values: the table says what an enemy starts at, this says what it
 * becomes. `Temperamental`'s rage and `DamageAddict`'s decay will live here too.
 */

import { ENEMY_STATS } from './enemyStatsData';

/** Frames of undamaged travel to reach full speed — `PartGameArea.as:3076`. */
export const ACCELERATING_TIMER_MAX = 225;
/** The boss takes twice as long — `:3083`. */
export const ACCELERATING_BOSS_TIMER_MAX = 450;

export interface AcceleratingState {
  /** Counts down to zero; zero means fully wound up. */
  speedTimer: number;
  speedTimerMax: number;
}

export function createAcceleratingState(isBoss: boolean): AcceleratingState {
  const speedTimerMax = isBoss ? ACCELERATING_BOSS_TIMER_MAX : ACCELERATING_TIMER_MAX;
  // Starts *at* the maximum, so factor is 0 and the enemy enters at base speed.
  return { speedTimer: speedTimerMax, speedTimerMax };
}

/**
 * Advances the ramp one step.
 *
 * `healthChanged` is deliberately "changed", not "damaged" — `:6695` compares
 * `hp != beforeHP`, so **being healed resets the ramp too**. A Medic topping up
 * an Accelerating enemy therefore keeps it slow, which is why the shared
 * observer on `Enemy` records any change rather than only a drop.
 *
 * Freezing resets it outright (`:6714`), so thawing starts the wind-up again
 * from base speed rather than resuming.
 */
export function tickAccelerating(
  state: AcceleratingState,
  frames: number,
  healthChanged: boolean,
  frozen: boolean,
): AcceleratingState {
  if (frozen || healthChanged) return { ...state, speedTimer: state.speedTimerMax };
  return { ...state, speedTimer: Math.max(0, state.speedTimer - frames) };
}

/** 0 when freshly damaged, 1 when fully wound up — `:6705`. */
export function acceleratingFactor(state: AcceleratingState): number {
  if (state.speedTimerMax <= 0) return 1;
  return 1 - state.speedTimer / state.speedTimerMax;
}

export interface RampedSpeeds {
  moveSpeedMax: number;
  /** Absent in Tower, which owns these through its own ramp. */
  accSpeed?: number;
  rotSpeedMax?: number;
}

/**
 * The speeds an Accelerating enemy has at a given wind-up.
 *
 * ── Two faithful reproductions of original mistakes ───────────────────────
 * Both are deliberate. Neither is a porting error, and neither should be
 * "fixed" without deciding to diverge on purpose.
 *
 * **1. It reads Temperamental's stat row, not its own.** `:6706-6710` say
 * `ScreenGame.enemyTemperamentalStats[3..5]` inside the *Accelerating* branch.
 * Today this changes nothing, because the two rows carry identical movement
 * columns — Temperamental `[6,20,100,1,0.2,2]`, Accelerating `[6,20,120,1,0.2,2]`
 * — so only money and particle differ. `enemyStatMods.test.ts` asserts that
 * equality, so if a re-extraction ever separates them this stops being
 * invisible instead of silently changing how the enemy plays.
 *
 * It also uses the **non-boss** row for bosses: `:6706` has no boss branch,
 * unlike Temperamental's rage a few lines below which picks
 * `enemyTemperamentalBStats` explicitly. Also a no-op today — the boss rows
 * carry the same 1/0.2/2 — and reproduced for the same reason.
 *
 * **2. It reads the raw table, not the difficulty-resolved stats.** Difficulty
 * scales speed by x1.0/1.1/1.2 at spawn, and this overwrites that from frame
 * one. So on Medium an Accelerating enemy spawns at 1.1 and is immediately
 * pulled back to 1.0, and its ceiling is 4.0 rather than 4.4. Unlike the first
 * quirk this **is** observable, and it is still reproduced as-is.
 */
export function acceleratingSpeeds(factor: number, isTower: boolean): RampedSpeeds {
  // The Temperamental row, on purpose — see above.
  const base = ENEMY_STATS.Temperamental.normal;

  const moveSpeedMax = base.moveSpeedMax + factor * base.moveSpeedMax * 3;
  if (isTower) return { moveSpeedMax };

  return {
    moveSpeedMax,
    accSpeed: base.accSpeed + factor * base.accSpeed * 2,
    rotSpeedMax: base.rotSpeedMax + factor * base.rotSpeedMax,
  };
}

/** Enemy types whose speed winds up while they go undamaged. */
const ACCELERATES = new Set(['Accelerating']);

export function acceleratesWhileUndamaged(enemyType: string): boolean {
  return ACCELERATES.has(enemyType);
}
