/**
 * Ground hazards — the trails Ice Ball and Lava Ball lay behind them.
 *
 * `PartGameArea.as:1784-1809` (spawn), `:6197-6300` (contact), `:7050-7098`
 * (expiry). Genuinely new plumbing: nothing in the port has a persistent world
 * object with a lifetime before this.
 *
 * ── Laid every frame, not on impact ───────────────────────────────────────
 * The spawn block sits inside the bullet loop *immediately before*
 * `theBullet.x += theBullet.xVel`, so a ball drops one hazard on every frame it
 * lives. At speed 12 with radius 18 the patches overlap roughly 3:1 and read as
 * a continuous trail rather than a dotted line.
 *
 * ── The inert tail, and the `+15` that cancels it ─────────────────────────
 * Contact is gated on `lifeTime > 15` (`:6200`), so the last 15 frames of every
 * hazard are visible and harmless. Ice is spawned with `trailLife + 15`
 * (`:1789`) and lava with `trailLife` exactly (`:1795`) — so **ice bites for its
 * full table value and lava for 15 frames less than its table says**. One
 * constant, opposite meanings, and the sort of thing that transcribes silently
 * if you copy the two spawn lines without reading the gate. `activeWindow`
 * below states it as an equality.
 *
 * ── Two dedup shapes, deliberately not one ────────────────────────────────
 * The two hazards do not share a "have I already hit this enemy" rule, and
 * collapsing them would be wrong in both directions:
 *
 *   Lava  `onLava` — a **same-frame** flag (`:6250`). Standing in ten
 *         overlapping patches costs one patch's damage that frame, and the
 *         next frame it charges again. Per source, per frame.
 *   Ice   `trailID` against the ball's `iceTrailID` (`:6208`, `:6220`) — **once
 *         per throw**. Walk the length of an entire trail and you freeze once;
 *         a second ball freezes you again. Not per patch, not per frame.
 *
 * The port already models same-frame dedup as a `Set` scoped to one sweep
 * (`GameplayScene`'s `burnedThisFrame`), which is what lava wants. Ice needs
 * per-enemy state that outlives the frame, so it carries the trail id.
 */

/** Both types spawn at this size — `:1800`. Lava then overrides it as it ages. */
export const HAZARD_RADIUS = 18;

/**
 * A hazard stops biting with this many frames left — `:6200`.
 *
 * Also exactly the fade-out region's overlap: the last 30 frames fade, and the
 * last 15 of those are inert, so a patch is visibly dying before it is safe.
 */
export const BITE_THRESHOLD = 15;

/** Frames of fade at the end — `:7056`. */
export const HAZARD_FADE_FRAMES = 30;

/** Added to an ice trail's lifetime, and only ice's — `:1789`. */
export const ICE_LIFETIME_BONUS = 15;

/** Lava's scale runs from this at spawn to `LAVA_SCALE_MAX` at death — `:1797`. */
export const LAVA_SCALE_MIN = 0.75;
export const LAVA_SCALE_MAX = 1.25;

/**
 * Lava's radius base — `:7065`.
 *
 * Deliberately 20 rather than the 18 every hazard spawns with, so a lava patch's
 * radius drops to 15 on its very first tick before beginning to grow. Faithful:
 * the AS3 sets 18 at `:1800` and overwrites it at `:7065` on the next frame.
 */
export const LAVA_RADIUS_BASE = 20;

/** A boss takes a fifth of lava's damage — `:6257`. */
export const LAVA_BOSS_MULTIPLIER = 0.2;

/** A flame overlapping ice drains this many frames of it per frame — `:7078`. */
export const FIRE_DRAIN_PER_FRAME = 3;

/** Random placement jitter around the ball — `:1801`. */
export const HAZARD_SPAWN_JITTER = 8;

const AS3_FPS = 30;

export type HazardType = 'Ice' | 'Lava';

export interface GroundHazard {
  type: HazardType;
  x: number;
  y: number;
  radius: number;
  lifeTime: number;
  /** Spawn lifetime, kept for lava's growth curve — `:7062` divides by it. */
  lifeTimeMax: number;
  /**
   * Ice: frames of freeze to apply. Lava: damage **per second**.
   *
   * One field because the two never coexist on one hazard, and naming it for
   * either would mislead about the other.
   */
  payload: number;
  /**
   * Which throw laid this — ice only, 0 for lava.
   *
   * The ball increments a counter per use and stamps every patch of its trail
   * with it, which is what makes the freeze once-per-throw rather than
   * once-per-patch.
   */
  trailId: number;
}

export interface HazardSpawn {
  type: HazardType;
  x: number;
  y: number;
  /** The weapon's trail-life stat, *before* ice's bonus. */
  trailLife: number;
  payload: number;
  trailId?: number;
  /** Injectable for tests; the AS3 jitters position by up to 8 units. */
  random?: () => number;
}

/**
 * Lays one patch — `:1786-1808`.
 *
 * Ice takes the `+15`; lava does not. See `activeWindow` for what that buys.
 */
export function createHazard(spawn: HazardSpawn): GroundHazard {
  const random = spawn.random ?? Math.random;
  const lifeTime =
    spawn.type === 'Ice' ? spawn.trailLife + ICE_LIFETIME_BONUS : spawn.trailLife;

  const distance = random() * HAZARD_SPAWN_JITTER;
  const angle = random() * 2 * Math.PI;

  return {
    type: spawn.type,
    x: spawn.x + Math.cos(angle) * distance,
    y: spawn.y + Math.sin(angle) * distance,
    radius: HAZARD_RADIUS,
    lifeTime,
    lifeTimeMax: lifeTime,
    payload: spawn.payload,
    trailId: spawn.trailId ?? 0,
  };
}

/**
 * How many frames a hazard of this type actually bites, given its stat.
 *
 * The whole point of the `+15`, as an equality rather than two spawn lines:
 *
 *     activeWindow('Ice',  n) === n
 *     activeWindow('Lava', n) === n - 15
 *
 * Ice's bonus exactly cancels the inert tail; lava pays for it.
 */
export function activeWindow(type: HazardType, trailLife: number): number {
  const spawned = type === 'Ice' ? trailLife + ICE_LIFETIME_BONUS : trailLife;
  return Math.max(0, spawned - BITE_THRESHOLD);
}

/** Whether this hazard still harms anything — `:6200`. */
export function isBiting(hazard: GroundHazard): boolean {
  return hazard.lifeTime > BITE_THRESHOLD;
}

/**
 * Lava's size for its current age — `:7062-7065`.
 *
 * Runs `scaleMin` at spawn to `scaleMax` at death, so a lava patch **expands as
 * it burns down** and is at its most dangerous just before it vanishes. Ice
 * keeps the size it was laid at.
 */
export function hazardRadius(hazard: GroundHazard): number {
  if (hazard.type !== 'Lava') return hazard.radius;

  const remaining = hazard.lifeTimeMax === 0 ? 0 : hazard.lifeTime / hazard.lifeTimeMax;
  const scale = LAVA_SCALE_MAX - (LAVA_SCALE_MAX - LAVA_SCALE_MIN) * remaining;
  return LAVA_RADIUS_BASE * scale;
}

/** Opacity over the last 30 frames — `:7056`. Same curve Shield uses over 120. */
export function hazardAlpha(hazard: GroundHazard): number {
  if (hazard.lifeTime >= HAZARD_FADE_FRAMES) return 1;
  return (hazard.lifeTime / HAZARD_FADE_FRAMES) * 0.9 + 0.1;
}

/**
 * Advances one hazard. Returns null once it should be removed — `:7053-7098`.
 *
 * Lava's radius is recomputed here rather than at the contact site, matching
 * where the AS3 writes it, so a patch's reach and its drawn size cannot drift.
 */
export function tickHazard(hazard: GroundHazard, frames: number): GroundHazard | null {
  if (hazard.lifeTime <= 0) return null;

  const lifeTime = Math.max(0, hazard.lifeTime - frames);
  if (lifeTime <= 0) return null;

  const next: GroundHazard = { ...hazard, lifeTime };
  return { ...next, radius: hazardRadius(next) };
}

/** Overlap test — `:6202`. Uses the hazard's *current* radius. */
export function hazardTouches(
  hazard: GroundHazard,
  enemy: { x: number; y: number; radius: number },
): boolean {
  return (
    Math.hypot(hazard.x - enemy.x, hazard.y - enemy.y) < enemy.radius + hazard.radius
  );
}

/**
 * Lava damage for one frame — `:6263`.
 *
 * The stat is per **second**: the AS3 divides by 30 at the point of use, so a
 * `damage` of 28 is 28 a second rather than 28 a frame. Reading it as per-frame
 * would make lava thirty times too strong and look plausible in a stat table.
 */
export function lavaDamagePerFrame(
  damagePerSecond: number,
  fireLavaMultiplier: number,
  isBoss: boolean,
  frames: number,
): number {
  const boss = isBoss ? LAVA_BOSS_MULTIPLIER : 1;
  return ((damagePerSecond * fireLavaMultiplier * boss) / AS3_FPS) * frames;
}

/**
 * Whether lava harms this enemy at all — `:6252`, `:6259`.
 *
 * `DamageAddict` is excluded outright rather than healed: unlike a bullet, lava
 * simply does not touch it.
 */
export function lavaAffects(enemyType: string, fireLavaMultiplier: number): boolean {
  if (fireLavaMultiplier <= 0) return false;
  return enemyType !== 'DamageAddict';
}

/**
 * Whether an ice patch may freeze this enemy — `:6208`.
 *
 * Three conditions beyond the overlap, and the boss one is the surprise:
 * **a boss cannot be frozen by a trail at all**, where the Ice Grenade's blast
 * freezes it at quarter duration. Same element, two rules.
 */
export function iceFreezes(
  hazard: GroundHazard,
  enemy: { trailId: number; isBoss: boolean; iceMultiplier: number },
  collidingWithLaser: boolean,
): boolean {
  if (hazard.type !== 'Ice') return false;
  if (enemy.trailId === hazard.trailId) return false;
  if (enemy.isBoss) return false;
  if (collidingWithLaser) return false;
  return enemy.iceMultiplier > 0;
}

/**
 * Ice worn away by the player's own fire — `:7071-7089`.
 *
 * A flame overlapping drains 3 frames per frame on top of the ordinary tick; a
 * laser crossing it kills the patch outright. Flamethrower and Ice Ball
 * actively fight each other, which is a real interaction rather than an
 * oversight — and it only touches ice.
 */
export function drainIce(hazard: GroundHazard, frames: number): GroundHazard {
  if (hazard.type !== 'Ice') return hazard;
  return { ...hazard, lifeTime: Math.max(0, hazard.lifeTime - FIRE_DRAIN_PER_FRAME * frames) };
}

/** A laser crossing an ice patch ends it — `:7085`. */
export function extinguishIce(hazard: GroundHazard): GroundHazard {
  if (hazard.type !== 'Ice') return hazard;
  return { ...hazard, lifeTime: 0 };
}
