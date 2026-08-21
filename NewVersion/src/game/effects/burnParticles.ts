/**
 * The flame a burning enemy throws — **invented, not ported** (T233).
 *
 * `A82` established there is no burn indicator in the original: `onFire` and
 * `onLava` are same-frame dedup booleans, fire is not a status, and nothing in
 * the 518 symbols could sit on a burning enemy. So an enemy walking through
 * lava died with nothing but a red flash to show for it. This is a deliberate
 * divergence, added because that read as missing feedback.
 *
 * ── The two numbers, and why they are these ───────────────────────────────
 * Fire damage lands **every frame** an enemy overlaps a flame or stands in
 * lava, so emitting per damage tick is 30 particles a second per enemy — the
 * clutter and the cost the request warned about. The cadence is the budget:
 *
 *     one flame per enemy per `BURN_PARTICLE_FRAMES` (4)
 *     each living `6 + random() * 4` frames
 *
 * so a burning enemy sustains about **two** live flames, and twenty of them
 * about forty. For scale, one enemy death already throws nine to fourteen
 * pieces of debris in a single frame. No crowd guard is needed on top; the
 * rate is the guard.
 *
 * The AS3's own poison emitter is the precedent for the shape — `:6375` runs
 * poison's puffs on a 3-frame clock deliberately kept separate from the damage
 * clock, for this exact reason.
 */

/** Frames between flames on one enemy. Poison's is 3; this is deliberately slower. */
export const BURN_PARTICLE_FRAMES = 4;

/** Flames rise: 270 degrees is up, as `:4317`'s heal particle also uses. */
export const BURN_ANGLE_UP = 270;

/** Half the arc a flame may lean from vertical. */
export const BURN_ANGLE_JITTER = 45;

/** The enemy radius `Burn`'s authored scale is sized for. */
export const BURN_REFERENCE_RADIUS = 14;

export interface BurnFlame {
  /** Degrees — the flame's heading and its drawn rotation, which are one here. */
  startAngle: number;
  /** Added to the preset's `scaleMax`, so a boss burns in proportion. */
  addMaxScale: number;
}

/**
 * The next flame for an enemy of this radius.
 *
 * Separated from the timer so the geometry can be driven: the caller owns the
 * cadence (it has the per-enemy counter), and this owns what a flame looks
 * like.
 *
 * `addMaxScale` is **clamped at zero** rather than allowed to go negative. An
 * enemy smaller than the reference radius would otherwise get a flame scaled
 * below the preset's `scaleMin`, and the tick interpolates *from* `scaleMax`
 * *to* `scaleMin` — inverting the two makes a flame grow as it dies, which is
 * the opposite of the read. The same class of bug as the ice block's negative
 * scale (`A81`), caught the same way: by asking what the smallest enemy does.
 */
export function burnFlame(radius: number, random: () => number = Math.random): BurnFlame {
  const jitter = (random() * 2 - 1) * BURN_ANGLE_JITTER;
  const size = Number.isFinite(radius) && radius > 0 ? radius : BURN_REFERENCE_RADIUS;

  return {
    startAngle: BURN_ANGLE_UP + jitter,
    addMaxScale: Math.max(0, size / BURN_REFERENCE_RADIUS - 1),
  };
}

/**
 * Advances one enemy's flame clock. `true` means spawn one this frame.
 *
 * Takes and returns the counter rather than mutating an enemy, so the rule is
 * drivable without one. The caller stores what comes back.
 */
export function tickBurnClock(timer: number): { emit: boolean; timer: number } {
  if (timer > 0) return { emit: false, timer: timer - 1 };
  return { emit: true, timer: BURN_PARTICLE_FRAMES };
}
