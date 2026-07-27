/**
 * Invisibility, and what it stops an enemy taking part in.
 *
 * ── The flag has reach well outside the enemy ─────────────────────────────
 * `invisible` is checked at eight places in `PartGameArea.as`, and at every one
 * of them it is paired with `teleporting` in the same condition:
 *
 *   :1058  handleMines      mines do not detonate on it
 *   :4115  tankAttack       magic-cannon *acquisition* filter
 *   :5552  handleEnemies    bullet collision
 *   :6195  handleEnemies    ground-hazard collision (lava, mines, traps)
 *   :6437  handleEnemies    explosion collision
 *   :1716  handleBullets    magic round drops its current target
 *   :1743  handleBullets    magic round steers toward its target
 *   :1766  handleBullets    magic round sets its rotation
 *
 * Because the two flags always travel together, this exposes one predicate —
 * `isTargetable` — rather than a Ghost-specific boolean. `Teleporting` then
 * inherits all eight sites by setting its own flag, with no rediscovery.
 *
 * ── Two enemies, two different shapes ─────────────────────────────────────
 * They are not the same mechanic with different triggers, which is what a
 * glance at the names suggests:
 *
 *   Ghost        timer counts *down* from 150; at zero it toggles visibility
 *                and resets. A flat 5s-on, 5s-off blink that ignores the
 *                player entirely.
 *   ScaredGhost  timer counts *up* to 150, and invisibility is the default
 *                state of the counting phase. Damage resets it to zero, so the
 *                enemy hides for a full five seconds after *every* hit.
 *
 * Both spawn visible with the timer at its maximum, so Ghost's first blink is
 * five seconds away and ScaredGhost starts in its visible resting state.
 */

/** Frames per blink phase — `PartGameArea.as:3019` and `:3154`. */
export const GHOST_TIMER_MAX = 150;

export interface VisibilityState {
  invisible: boolean;
  /** Counts down for Ghost, up for ScaredGhost. */
  ghostTimer: number;
  ghostTimerMax: number;
}

export function createVisibilityState(): VisibilityState {
  return { invisible: false, ghostTimer: GHOST_TIMER_MAX, ghostTimerMax: GHOST_TIMER_MAX };
}

/**
 * Ghost's blink — `:4812-4830`.
 *
 * Skipped entirely while frozen, so a frozen Ghost holds whatever visibility it
 * had rather than continuing to flicker.
 */
export function tickGhostBlink(
  state: VisibilityState,
  frames: number,
  frozen: boolean,
): VisibilityState {
  if (frozen) return state;

  if (state.ghostTimer > 0) {
    return { ...state, ghostTimer: Math.max(0, state.ghostTimer - frames) };
  }
  return { ...state, ghostTimer: state.ghostTimerMax, invisible: !state.invisible };
}

/**
 * ScaredGhost's flinch — `:4832-4850`.
 *
 * The AS3 triggers on `damageIndicator >= 19`, which is the hit-flash counter
 * set to 20 on damage — a "was hit in the last frame or two" test rather than a
 * hook. The port uses the shared observer's `healthDropped` instead: simpler,
 * one damage-detection idiom fewer, and differing only in edge timing.
 *
 * Note the timer counts **up** and invisibility is the counting phase, so this
 * is not Ghost's mechanic with a different trigger — being hit restarts a full
 * five seconds of hiding, and it is visible only once the timer is full.
 */
export function tickScaredGhost(
  state: VisibilityState,
  frames: number,
  tookDamage: boolean,
  frozen: boolean,
): VisibilityState {
  if (frozen) return state;

  const ghostTimer = tookDamage ? 0 : state.ghostTimer;

  if (ghostTimer < state.ghostTimerMax) {
    return {
      ...state,
      ghostTimer: Math.min(state.ghostTimerMax, ghostTimer + frames),
      invisible: true,
    };
  }
  return { ...state, ghostTimer: state.ghostTimerMax, invisible: false };
}

/** The minimum an enemy must expose for the targeting guards. */
export interface Targetable {
  invisible: boolean;
  teleporting: boolean;
}

/**
 * Whether bullets, blasts, mines and homing rounds can interact with it.
 *
 * One predicate for both flags, because the AS3 never checks either alone.
 */
export function isTargetable(enemy: Targetable): boolean {
  return !enemy.invisible && !enemy.teleporting;
}

const BLINKS = new Set(['Ghost']);
const HIDES_WHEN_HURT = new Set(['ScaredGhost']);

export function blinksOnTimer(enemyType: string): boolean {
  return BLINKS.has(enemyType);
}

export function hidesWhenHurt(enemyType: string): boolean {
  return HIDES_WHEN_HURT.has(enemyType);
}
