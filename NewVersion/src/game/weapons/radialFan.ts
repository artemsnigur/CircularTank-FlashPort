/**
 * The radial burst both spike weapons fire — `PartGameArea.as:4058-4098`.
 *
 * Icicles and Poison Spikes are one weapon with two payloads: same radius 6,
 * same speed 20, same `explosion = false`, same ordinary bullet travel, killed
 * at the border by the normal path. Neither bounces, lays a trail or targets
 * anything. Only what they leave in an enemy differs.
 *
 * ── The doubled bearing is faithful, not a bug ────────────────────────────
 *     spike.rotation = 360 / (spikeCount - 1) * c;   // c = 0 ... spikeCount-1
 *
 * At `c = spikeCount - 1` that is exactly 360 degrees, which is 0 — the same
 * bearing as the first spike. **N spikes produce N-1 distinct bearings with one
 * doubled**, and the doubled pair share a spawn point too, so they travel as
 * one.
 *
 * It is the fan formula — endpoints inclusive, correct for an arc — applied to
 * a full circle, where the endpoints coincide. Reproduced rather than corrected:
 * unlike the camera-HUD case in `grenade.ts`, there is no missing artefact here
 * and no reinterpretation to make. The AS3 and the port compute the same thing
 * from the same inputs, so "fixing" it would be a silent balance change to a
 * weapon that fires 23 to 32 spikes, where one duplicate is invisible in play
 * and plainly visible in a diff. `fanBearings` is tested for exactly N-1
 * distinct values so a future tidy-up fails loudly.
 */

import type { BulletSpec } from './firing';

/** Every spike is this size, at every level — `:4077`, `:4086`. */
export const SPIKE_RADIUS = 6;

/** And this fast — `:4078`, `:4087`. */
export const SPIKE_SPEED = 20;

/** Muzzle offset, added to the spike's radius — `:4092`. */
export const SPIKE_MUZZLE_OFFSET = 16;

/**
 * Bearings in degrees, in fire order, including the duplicate.
 *
 * A count of 1 would divide by zero in the AS3; it never happens, because the
 * lowest table value is 23. Guarded anyway so a hand-edited stat row produces
 * one spike rather than `NaN`.
 */
export function fanBearings(count: number): number[] {
  if (count <= 1) return count === 1 ? [0] : [];

  const step = 360 / (count - 1);
  return Array.from({ length: count }, (_, c) => step * c);
}

interface FanPayload {
  damage: number;
  /** Frames of freeze this spike leaves. Icicles only. */
  freezeTime?: number;
  /** Frames of poison, and its per-tick damage. Poison Spikes only. */
  poisonTime?: number;
  poisonDamage?: number;
}

export interface FanInput extends FanPayload {
  tankX: number;
  tankY: number;
  count: number;
}

/**
 * Builds the whole burst.
 *
 * Position and heading both come from the same bearing, so the duplicate pair
 * overlap exactly — as they do in the original.
 */
export function spawnFan(input: FanInput): BulletSpec[] {
  const offset = SPIKE_MUZZLE_OFFSET + SPIKE_RADIUS;

  return fanBearings(input.count).map((degrees) => {
    const radians = (degrees * Math.PI) / 180;

    return {
      x: input.tankX + Math.cos(radians) * offset,
      y: input.tankY + Math.sin(radians) * offset,
      xVel: Math.cos(radians) * SPIKE_SPEED,
      yVel: Math.sin(radians) * SPIKE_SPEED,
      rotation: degrees,
      speed: SPIKE_SPEED,
      radius: SPIKE_RADIUS,
      damage: input.damage,
      // `:4079`, `:4088` — neither spike explodes; the payload is the point.
      explosion: false,
      explosionRadius: 0,
      // No spike pierces, bursts, homes or attaches anything.
      penetrates: false,
      bombTimer: 0,
      cakePieces: 0,
      targets: 0,
      freezeTime: input.freezeTime ?? 0,
      poisonTime: input.poisonTime ?? 0,
      poisonDamage: input.poisonDamage ?? 0,
    };
  });
}
