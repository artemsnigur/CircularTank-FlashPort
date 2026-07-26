/**
 * Spawn warnings — the port of `PartGameArea.handleWarnings()` (2450-2476).
 *
 * A warning is a marker shown where an enemy is about to appear. It counts
 * down, shrinking as it goes, and when it reaches zero the enemy spawns there.
 * That delay is what stops enemies materialising on top of the player.
 *
 * The AS3 scales the marker from 1.0 down to 0.3 across a 100-frame life:
 *
 *     scale = timeLeft / 100 * 0.7 + 0.3
 *
 * The divisor is hardcoded to 100 even though `timeLeft` starts at the
 * countdown value during a level's opening, so a warning created mid-countdown
 * can start larger than 1.0. Reproduced.
 */

import type { EnemyLevel } from '../config/constants';
import type { SpawnWall } from '../enemies/enemySpawn';

/** Default warning lifetime in frames at 30 fps. */
export const WARNING_FRAMES = 100;

/** Denominator the scale formula uses, regardless of actual lifetime. */
const SCALE_REFERENCE_FRAMES = 100;

const AS3_FPS = 30;

export interface Warning {
  type: string;
  level: EnemyLevel;
  x: number;
  y: number;
  wall: SpawnWall;
  /** Frames remaining before the enemy spawns. */
  timeLeft: number;
}

export function createWarning(
  spawn: { type: string; level: EnemyLevel; x: number; y: number; wall: SpawnWall },
  timeLeft: number = WARNING_FRAMES,
): Warning {
  return { ...spawn, timeLeft };
}

/** Marker scale for the current countdown position. */
export function warningScale(warning: Warning): number {
  return (warning.timeLeft / SCALE_REFERENCE_FRAMES) * 0.7 + 0.3;
}

export interface WarningTickResult {
  /** Warnings still counting down. */
  pending: Warning[];
  /** Warnings that reached zero this tick and should now spawn. */
  matured: Warning[];
}

/**
 * Advances every warning by `deltaMs`.
 *
 * The AS3 checks `timeLeft == 0` exactly and decrements by one frame, which is
 * safe there because the frame rate is fixed. Here the check is `<= 0` so a
 * long frame cannot step past zero and strand a warning forever.
 */
export function tickWarnings(warnings: readonly Warning[], deltaMs: number): WarningTickResult {
  const frames = (deltaMs / 1000) * AS3_FPS;
  const pending: Warning[] = [];
  const matured: Warning[] = [];

  for (const warning of warnings) {
    if (warning.timeLeft <= 0) {
      matured.push(warning);
      continue;
    }
    const timeLeft = warning.timeLeft - frames;
    if (timeLeft <= 0) matured.push({ ...warning, timeLeft: 0 });
    else pending.push({ ...warning, timeLeft });
  }

  return { pending, matured };
}
