/**
 * Flamethrower projectiles — `PartGameArea.as:3786` (spawn) and `:1860`
 * (per-frame lifetime, thinning and growth).
 *
 * A flame is not a bullet that travels until it hits something. It is a puff
 * with a short life that **grows** as it ages, passes through everything, and
 * dies on a timer rather than on impact.
 *
 * ── Range is stored, lifetime is derived ──────────────────────────────────
 * `upgradeArrayFlamethrower` track 3 is a *range* in design units (100-150),
 * not a duration. The AS3 converts it at spawn:
 *
 *     lifetimeMax = Math.round(range / speed)
 *
 * At speed 10 that is 10 frames at level 1 and 15 at level 10 — a third of a
 * second to half a second. Upgrading the Flamethrower buys reach, and reach is
 * spent as time.
 *
 * ── The density rule, which is the whole weapon ───────────────────────────
 * Two frames after spawning, a flame counts how many bullets sit within 50
 * units of it (itself included). If that count is **under 5** it sets its
 * remaining lifetime to the count and marks itself a `deadFlame`
 * (`:1878-1888`).
 *
 * So a lone flame gets a crowd of 1 and dies on the next frame, having barely
 * left the muzzle. Only a dense stream survives long enough to reach anything.
 * Tap-firing a Flamethrower does almost nothing; holding it produces a jet.
 * That is a deliberate mechanic, not an optimisation — and it is why the
 * weapon's low per-hit damage is not the whole story.
 *
 * ── Growth ────────────────────────────────────────────────────────────────
 * While not a `deadFlame`, scale climbs by 0.2 per frame of age and the hit
 * radius tracks it (`radius = 10 * scaleX`). A flame at the end of a full life
 * is three times its starting size and hits a correspondingly wider area, so
 * the far end of the jet is broader than the muzzle. A thinned flame stops
 * growing and stays small.
 *
 * ── Deliberate divergence: the thinning trigger ───────────────────────────
 * The AS3 tests `lifetime == lifetimeMax - 2`, an exact integer-frame
 * comparison that a fractional delta would step straight over. This tracks age
 * and a `thinned` flag instead, firing once at the first tick at or past two
 * frames old. Same behaviour at 30 fps, and it cannot be skipped at 60 or 144.
 */

const AS3_FPS = 30;

/** `bullet.radius = 10` at spawn, before any growth. */
export const FLAME_BASE_RADIUS = 10;

/** Bullets within this distance count towards the crowd. */
export const FLAME_CROWD_RADIUS = 50;

/** Below this many neighbours, a flame is cut short. */
export const FLAME_CROWD_MIN = 5;

/** Scale added per frame of age, while the flame is still growing. */
export const FLAME_GROWTH_PER_FRAME = 0.2;

/** Age at which the crowd is counted, in frames. */
export const FLAME_THIN_AGE = 2;

export interface FlameState {
  /** Frames of life remaining. */
  lifetime: number;
  lifetimeMax: number;
  /**
   * Balance multiplier on the flame's total reach.
   *
   * Must be applied to the *thinned* lifetime as well as to `lifetimeMax`. At
   * a steady stream, flames sit `reload * speed` = 31.5 units apart, so each
   * counts a crowd of 3 — under `FLAME_CROWD_MIN` — and every flame is
   * thinned. `lifetimeMax` is therefore almost never reached in practice, and
   * scaling it alone changes nothing visible.
   */
  rangeMultiplier: number;
  /** True once thinned by the density rule; stops the flame growing. */
  deadFlame: boolean;
  /** Frames elapsed since spawn. */
  age: number;
  /** Whether the one-shot density check has run. */
  thinned: boolean;
  scale: number;
  radius: number;
}

/**
 * Frames a flame lives, from the weapon's *range* stat.
 *
 * `Math.round(range / speed)` — see the header.
 */
export function flameLifetimeMax(range: number, speed: number): number {
  return Math.round(range / speed);
}

export function createFlame(lifetimeMax: number, rangeMultiplier = 1): FlameState {
  return {
    lifetime: lifetimeMax,
    lifetimeMax,
    rangeMultiplier,
    deadFlame: false,
    age: 0,
    thinned: false,
    scale: 1,
    radius: FLAME_BASE_RADIUS,
  };
}

export interface FlamePoint {
  x: number;
  y: number;
}

/**
 * Neighbours within `FLAME_CROWD_RADIUS`, counting the flame itself.
 *
 * The AS3 walks the whole bullet array and does not exclude the flame being
 * tested, so its own distance of 0 always counts — a solitary flame scores 1,
 * never 0.
 */
export function countCrowd(self: FlamePoint, bullets: readonly FlamePoint[]): number {
  let count = 0;
  for (const other of bullets) {
    if (Math.hypot(other.x - self.x, other.y - self.y) < FLAME_CROWD_RADIUS) count += 1;
  }
  return count;
}

/** Scale for a given age, per `1 + (lifetimeMax - lifetime) * 0.2`. */
export function flameScale(age: number): number {
  return 1 + age * FLAME_GROWTH_PER_FRAME;
}

/**
 * Advances a flame by one step, returning null once it has burnt out.
 *
 * `crowd` is the neighbour count from `countCrowd`, and is only consulted on
 * the tick where the density check fires. Callers that cannot supply it (tests
 * of pure growth, say) may pass a count at or above `FLAME_CROWD_MIN` to opt
 * out of thinning.
 */
export function advanceFlame(
  flame: FlameState,
  deltaMs: number,
  crowd: number,
): FlameState | null {
  const frames = (deltaMs / 1000) * AS3_FPS;
  const next: FlameState = { ...flame, age: flame.age + frames };

  // One-shot density check, two frames after spawn.
  if (!next.thinned && next.age >= FLAME_THIN_AGE) {
    next.thinned = true;
    if (crowd < FLAME_CROWD_MIN) {
      // The AS3 sets `lifetime = closeFireballs` outright. Scaling that raw
      // count by the multiplier would under-deliver, because the flame has
      // already flown for FLAME_THIN_AGE frames that are not part of the
      // remaining budget. Scale the *total* life and subtract what is spent,
      // so reach ends up multiplied in this branch exactly as it does when a
      // flame survives on lifetimeMax.
      const totalLife = (FLAME_THIN_AGE + crowd) * next.rangeMultiplier;
      next.lifetime = Math.max(0, totalLife - FLAME_THIN_AGE);
      next.deadFlame = true;
    }
  }

  next.lifetime -= frames;
  if (next.lifetime <= 0) return null;

  // A thinned flame is frozen at whatever size it had reached.
  if (!next.deadFlame) {
    next.scale = flameScale(next.age);
    next.radius = FLAME_BASE_RADIUS * next.scale;
  }

  return next;
}
