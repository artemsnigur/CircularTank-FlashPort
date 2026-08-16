/**
 * Flag levels — `PartGameArea.handleFlag` (:2572) and `spawnFlag` (:2359).
 *
 * A Flag level does not end by clearing the arena; enemies keep coming
 * indefinitely. It ends when the player has collected `flagCount` flags, each
 * of which appears somewhere around the tank and has to be driven into while
 * the spawning continues.
 *
 * ── One flag at a time ────────────────────────────────────────────────────
 * `handleFlag` spawns a replacement whenever `flagsLeft > 0` and no flag is on
 * the field, so there is exactly one live flag until the last is taken.
 *
 * ── It arms before it can be taken ────────────────────────────────────────
 * A fresh flag sets `timer = 10` and the pickup test is the `else` branch of
 * `if (timer > 0) --timer`. For a third of a second after appearing it cannot
 * be collected, even if it lands under the tank. Without that, a flag spawning
 * on top of the player would be consumed instantly and the next would appear
 * in the same frame.
 *
 * ── Placement is a ring around the tank, not the room ─────────────────────
 * `spawnFlag` picks a random start angle and a distance between roomWidth/4
 * and roomWidth/2 (less 10), then walks 89 candidate angles in 4-degree steps
 * keeping only those that fall inside the room, stopping once it has 10, and
 * chooses one at random. So a flag is always a deliberate drive away, and
 * never off the edge of a room narrower than the ring.
 *
 * ── Deliberate divergence: the reward ─────────────────────────────────────
 * The AS3 calls `spawnMoney(flag.moneyCount, tank.x, tank.y, false, 100)`,
 * which scatters `ItemMoney` pickups in a ring for the player to collect, and
 * the level will not hand over until they are gone. That 288-line drop system
 * is shared with enemy deaths and is not ported — our enemies pay out directly
 * on death. Flag rewards do the same for consistency: capturing a flag credits
 * `flagMoney` immediately. When `ItemMoney` lands, both paths change together.
 */

import type { LevelSpec } from '../levels/levelData';

/** `this.flag.timer = 10` — frames before a new flag can be picked up. */
export const FLAG_ARM_FRAMES = 10;

/** Candidate angles `spawnFlag` walks, in 4-degree steps. */
const FLAG_ANGLE_STEPS = 89;
const FLAG_ANGLE_STEP_DEGREES = 4;

/** It stops looking once this many valid positions are found. */
export const FLAG_MAX_CANDIDATES = 10;

export interface FlagState {
  x: number;
  y: number;
  radius: number;
  /** Counts down before the flag becomes collectable. */
  timer: number;
}

export interface FlagPlacementContext {
  tankX: number;
  tankY: number;
  roomWidth: number;
  roomHeight: number;
  flagRadius: number;
  random?: () => number;
}

/**
 * How far from the tank a flag lands.
 *
 * `roomWidth / 2 - 10 - random() * roomWidth / 4` — between a quarter and a
 * half of the room's width away, measured from the tank rather than centred on
 * the room.
 */
export function flagDistance(roomWidth: number, random: () => number): number {
  return roomWidth / 2 - 10 - (random() * roomWidth) / 4;
}

/**
 * Valid spawn positions, in the order `spawnFlag` finds them.
 *
 * Exposed separately from `placeFlag` so the candidate walk can be tested
 * without a random draw deciding the answer.
 */
export function flagCandidates(context: FlagPlacementContext): Array<{ x: number; y: number }> {
  const { tankX, tankY, roomWidth, roomHeight, flagRadius, random = Math.random } = context;

  const startAngle = random() * 360;
  const distance = flagDistance(roomWidth, random);
  const found: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < FLAG_ANGLE_STEPS; i += 1) {
    const radians = ((startAngle + i * FLAG_ANGLE_STEP_DEGREES) * Math.PI) / 180;
    const x = tankX + Math.cos(radians) * distance;
    const y = tankY + Math.sin(radians) * distance;

    const outside =
      x < flagRadius || x > roomWidth - flagRadius || y < flagRadius || y > roomHeight - flagRadius;
    if (outside) continue;

    found.push({ x, y });
    if (found.length >= FLAG_MAX_CANDIDATES) break;
  }

  return found;
}

/**
 * Places a new flag, or returns null when no candidate fits.
 *
 * The AS3 would throw on an empty candidate list (it indexes
 * `positionsArray[randomNum]` unconditionally). Returning null instead means a
 * pathological room leaves the flag unplaced for a frame and `handleFlag`
 * simply tries again, rather than taking the scene down.
 */
export function placeFlag(context: FlagPlacementContext): FlagState | null {
  const random = context.random ?? Math.random;
  const candidates = flagCandidates(context);
  if (candidates.length === 0) return null;

  const index = Math.round(random() * (candidates.length - 1));
  const chosen = candidates[index] ?? candidates[0];

  return {
    x: chosen.x,
    y: chosen.y,
    radius: context.flagRadius,
    timer: FLAG_ARM_FRAMES,
  };
}

const AS3_FPS = 30;

/** Counts a flag's arming timer down. */
export function tickFlag(flag: FlagState, deltaMs: number): FlagState {
  if (flag.timer <= 0) return flag;
  const frames = (deltaMs / 1000) * AS3_FPS;
  return { ...flag, timer: Math.max(0, flag.timer - frames) };
}

/**
 * Whether the tank is close enough to take the flag.
 *
 * Gated on the arming timer: the AS3 tests distance only in the `else` of
 * `if (timer > 0)`, so an unarmed flag cannot be collected however close the
 * tank is.
 */
export function canCaptureFlag(
  flag: FlagState,
  tank: { x: number; y: number; radius: number },
): boolean {
  if (flag.timer > 0) return false;
  const distance = Math.hypot(flag.x - tank.x, flag.y - tank.y);
  return distance < flag.radius + tank.radius;
}

/** Money a capture is worth — `selectedFlagModel[level - 1][1]`. */
export function flagReward(spec: LevelSpec): number {
  return spec.flagMoney;
}
