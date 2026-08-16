/**
 * Teleporting — `PartGameArea.as:4920-5022`.
 *
 * ── The flag does more than hide it ───────────────────────────────────────
 * `teleporting` appears 26 times in the AS3. Eight of those are the
 * targetability sites it shares with `invisible`, which `isTargetable` already
 * covers. The other six suppress *simulation*, and `teleporting` appears there
 * alone:
 *
 *   :4528  no steering            :5172/:5179  no enemy-enemy collision
 *   :5368  no position integration :5120       no enemy-avoidance
 *   :4759  off-screen tracking skipped
 *   :4509  damage-flash colour reset
 *
 * So a mid-teleport enemy is frozen in place, unsteered and intangible — not
 * merely untargetable. `isSimulated` is the predicate for that half.
 *
 * ── Two phases of 30 frames ───────────────────────────────────────────────
 * Fading out, then fading in at the destination, so the whole window is 60
 * frames during which the enemy cannot be hit and does not move. The trigger is
 * a plain timer — no distance or health condition — reseeded to
 * `120..150` frames on arrival (`150..225` for a boss).
 */

import type { LevelMode } from '../levels/levelData';

/** Frames per fade — `PartGameArea.as:3237`. */
export const TELE_PHASE_FRAMES = 30;
/** Reseed range after arriving — `:3222` and `:3230`. */
export const TELE_START_MIN = 120;
export const TELE_START_MAX = 150;
const TELE_START_MIN_BOSS = 150;
const TELE_START_MAX_BOSS = 225;

/** Tower: no teleport within this of the tank, centre to centre — `:4938`. */
export const TOWER_MIN_TANK_DISTANCE = 65;
/** Defense: stay this far from both ends of the lane — `:4938`. */
export const DEFENSE_EDGE_MARGIN = 160;
/** Defense: a hop must move at least this far horizontally — `:4997`. */
export const DEFENSE_MIN_HOP = 100;
/** Defense: vertical drift either way — `:5000`. */
const DEFENSE_VERTICAL_DRIFT = 100;
/** Each hop closes to 90% of the current range — `:4956`. */
export const APPROACH_FACTOR = 0.9;

/**
 * Reroll attempts before giving up on a destination.
 *
 * ── Deliberately not the AS3's unbounded loop ─────────────────────────────
 * The original rerolls `while` the point is outside the room. That terminates
 * only because `newDistance` is 90% of the current range and so always shrinks,
 * keeping a valid angle available. The invariant holds there — but it is an
 * invariant about room geometry, and a browser has no business trusting it: one
 * bad interaction with a room-size override and the tab locks up.
 *
 * Capped instead, with the caller skipping the hop for this cycle when the cap
 * is hit. Skipping is safer than clamping to an arbitrary in-bounds point,
 * which could drop an enemy on top of the tank.
 */
export const MAX_DESTINATION_ATTEMPTS = 32;

type TeleportPhase = 'waiting' | 'leaving' | 'arriving';

export interface TeleportState {
  phase: TeleportPhase;
  /** Counts down within the current phase. */
  timer: number;
  /** Frames until the next attempt, while waiting. */
  startTimer: number;
  isBoss: boolean;
}

export function createTeleportState(isBoss: boolean, random: () => number): TeleportState {
  return { phase: 'waiting', timer: 0, startTimer: nextStartDelay(isBoss, random), isBoss };
}

function nextStartDelay(isBoss: boolean, random: () => number): number {
  const min = isBoss ? TELE_START_MIN_BOSS : TELE_START_MIN;
  const max = isBoss ? TELE_START_MAX_BOSS : TELE_START_MAX;
  return min + random() * (max - min);
}

export interface TeleportContext {
  mode: LevelMode;
  x: number;
  y: number;
  tankX: number;
  tankY: number;
  roomHeight: number;
}

/**
 * Whether the mode allows a teleport from here.
 *
 * **A block, not a cancel.** The AS3 re-tests this every frame once the timer
 * has expired, so an enemy that is too close simply does not teleport until it
 * has drifted far enough. The timer is neither reset nor consumed.
 *
 * Tower measures centre to centre, with no radii involved. Defense keeps the
 * hop away from both ends of the lane — the entry band at the top and the
 * defended line at the bottom — so an enemy cannot blink past the line it is
 * meant to cross.
 */
export function canTeleport(context: TeleportContext): boolean {
  if (context.mode === 'Tower') {
    return Math.hypot(context.tankX - context.x, context.tankY - context.y) > TOWER_MIN_TANK_DISTANCE;
  }
  if (context.mode === 'Defense') {
    return (
      context.y > DEFENSE_EDGE_MARGIN &&
      context.roomHeight - context.y > DEFENSE_EDGE_MARGIN
    );
  }
  return true;
}

export interface TeleportTick {
  state: TeleportState;
  /** True on the frame the enemy should vanish and pick a destination. */
  departs: boolean;
  /** True on the frame it lands. */
  arrives: boolean;
}

/**
 * Advances the teleport clock.
 *
 * `allowed` is `canTeleport`'s answer, evaluated by the caller because it needs
 * the tank. Passing false while waiting holds the enemy at the ready — the
 * retry, rather than a cancellation.
 */
export function tickTeleport(
  state: TeleportState,
  frames: number,
  allowed: boolean,
  random: () => number,
): TeleportTick {
  if (state.phase === 'waiting') {
    const startTimer = Math.max(0, state.startTimer - frames);
    if (startTimer > 0 || !allowed) {
      return { state: { ...state, startTimer }, departs: false, arrives: false };
    }
    return {
      state: { ...state, phase: 'leaving', timer: TELE_PHASE_FRAMES, startTimer: 0 },
      departs: true,
      arrives: false,
    };
  }

  const timer = Math.max(0, state.timer - frames);
  if (timer > 0) return { state: { ...state, timer }, departs: false, arrives: false };

  if (state.phase === 'leaving') {
    return {
      state: { ...state, phase: 'arriving', timer: TELE_PHASE_FRAMES },
      departs: false,
      arrives: true,
    };
  }

  return {
    state: {
      ...state,
      phase: 'waiting',
      timer: 0,
      startTimer: nextStartDelay(state.isBoss, random),
    },
    departs: false,
    arrives: false,
  };
}

/** Opacity for the current phase — fades out, then in. */
export function teleportAlpha(state: TeleportState): number {
  if (state.phase === 'leaving') return state.timer / TELE_PHASE_FRAMES;
  if (state.phase === 'arriving') return 1 - state.timer / TELE_PHASE_FRAMES;
  return 1;
}

/** Whether this enemy is mid-teleport, and so untargetable and static. */
export function isTeleporting(state: TeleportState): boolean {
  return state.phase !== 'waiting';
}

export interface DestinationContext extends TeleportContext {
  roomWidth: number;
  radius: number;
  random?: () => number;
}

/**
 * Where the enemy reappears, or null when no valid point was found.
 *
 * Non-Defense keeps the enemy the *same distance from the tank scaled by 0.9*,
 * at a random bearing — so it stays equally close but unpredictably placed, and
 * creeps 10% nearer with every hop. Defense hops sideways instead: a random x at
 * least `DEFENSE_MIN_HOP` away, and a small vertical drift, keeping it in its
 * lane band.
 *
 * Null means the reroll cap was hit; the caller skips this cycle rather than
 * placing the enemy somewhere arbitrary.
 */
export function teleportDestination(
  context: DestinationContext,
): { x: number; y: number } | null {
  const random = context.random ?? Math.random;
  const { radius, roomWidth, roomHeight } = context;

  const inside = (x: number, y: number): boolean =>
    x >= radius && x <= roomWidth - radius && y >= radius && y <= roomHeight - radius;

  if (context.mode === 'Defense') {
    for (let attempt = 0; attempt < MAX_DESTINATION_ATTEMPTS; attempt += 1) {
      const x = radius + random() * (roomWidth - radius * 2);
      if (Math.abs(x - context.x) < DEFENSE_MIN_HOP) continue;

      const y = context.y + (-DEFENSE_VERTICAL_DRIFT + random() * DEFENSE_VERTICAL_DRIFT * 2);
      if (inside(x, y)) return { x, y };
    }
    return null;
  }

  const distance =
    Math.hypot(context.tankX - context.x, context.tankY - context.y) * APPROACH_FACTOR;

  for (let attempt = 0; attempt < MAX_DESTINATION_ATTEMPTS; attempt += 1) {
    const angle = random() * 2 * Math.PI;
    const x = context.tankX + Math.cos(angle) * distance;
    const y = context.tankY + Math.sin(angle) * distance;
    if (inside(x, y)) return { x, y };
  }
  return null;
}

/** Enemy types that teleport. */
const TELEPORTS = new Set(['Teleporting']);

export function teleportsPeriodically(enemyType: string): boolean {
  return TELEPORTS.has(enemyType);
}
