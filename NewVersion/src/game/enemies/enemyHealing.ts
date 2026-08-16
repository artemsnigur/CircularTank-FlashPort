/**
 * Medic's aura — `PartGameArea.as:6718-6771`.
 *
 * ── It heals everything in range, not a chosen target ─────────────────────
 * The AS3 walks the whole enemy array on each tick and heals *every* damaged
 * enemy inside the radius, so a Medic in a crowd tops up all of them at once.
 * There is no nearest-target selection and no randomness.
 *
 * The range test is `distance < healDistance + enemyToHeal.radius` — the
 * **target's** radius, not the Medic's. A big enemy is therefore reachable from
 * further away, and a `Shrinking` one has to come closer as it takes damage.
 *
 * `if (u != i)` excludes the Medic itself, so one cannot sustain itself. Two in
 * range of each other can.
 */


/** Frames between pulses — `PartGameArea.as:3116`. */
export const HEAL_TIMER_MAX = 15;
/** Health restored per pulse, per enemy in range — `:6733`. */
export const HEAL_AMOUNT = 1;

/** Aura radius — `:3106` and `:3112`. */
export function healDistanceFor(isBoss: boolean): number {
  return isBoss ? 100 : 50;
}

export interface HealState {
  healTimer: number;
  healTimerMax: number;
}

export function createHealState(): HealState {
  // Starts at the maximum, so the first pulse is a full cadence away.
  return { healTimer: HEAL_TIMER_MAX, healTimerMax: HEAL_TIMER_MAX };
}

export interface HealTick {
  state: HealState;
  /** True on the frame the aura pulses. */
  pulses: boolean;
}

/**
 * Counts the aura down, reporting the frame it fires.
 *
 * ── The cadence is 16 frames, not the 15 in the constant ──────────────────
 * The AS3 tests `healTimer <= 0` and only decrements otherwise, so the pulse
 * lands on the frame *after* the timer reaches zero: 15 frames of counting plus
 * one to fire. `Ghost`'s blink has the identical shape and the identical
 * off-by-one — 150 in the source, 151 in practice — so this is the loop shape
 * rather than a transcription slip in either.
 */
export function tickHeal(state: HealState, frames: number): HealTick {
  if (state.healTimer <= 0) {
    return { state: { ...state, healTimer: state.healTimerMax }, pulses: true };
  }
  return { state: { ...state, healTimer: Math.max(0, state.healTimer - frames) }, pulses: false };
}

export interface HealCandidate {
  x: number;
  y: number;
  /** The *target's* radius extends the Medic's reach — see the header. */
  radius: number;
}

export function isInHealRange(
  medic: { x: number; y: number },
  target: HealCandidate,
  healDistance: number,
): boolean {
  return Math.hypot(target.x - medic.x, target.y - medic.y) < healDistance + target.radius;
}

/**
 * Health after one pulse, clamped — `:6733-6740`.
 *
 * The AS3 clamps *before* writing (`hp + 1 < total ? hp + 1 : total`) and acts
 * only when `hp < total`, so health never exceeds the maximum even for a frame.
 */
export function healedTo(health: number, maxHealth: number): number {
  if (health >= maxHealth) return health;
  return Math.min(health + HEAL_AMOUNT, maxHealth);
}

/** Enemy types that heal their neighbours. */
const HEALS = new Set(['Medic']);

export function healsOthers(enemyType: string): boolean {
  return HEALS.has(enemyType);
}

