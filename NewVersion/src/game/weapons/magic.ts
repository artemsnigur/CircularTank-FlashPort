/**
 * Magic Cannon homing — `PartGameArea.as:3889` (spawn), `:1714-1751`
 * (retarget and steer), `:5945` (on hit), `:5822` (death).
 *
 * ── It does not home until it has hit something ───────────────────────────
 * The single most misleading thing about this weapon. The whole retargeting
 * block is gated on `neverHitTarget == false`, and `neverHitTarget` starts
 * **true**. So the round flies dead straight out of the muzzle like any other
 * bullet, and only starts seeking once it has hit its first enemy.
 *
 * It is not a homing missile. It is a ricochet that picks its own next victim.
 *
 * ── The chain ─────────────────────────────────────────────────────────────
 * On each hit (`:5945`) the round records the enemy, decrements `targetsLeft`,
 * clears `neverHitTarget`, and drops its current target so the next frame
 * re-acquires. `targetsLeft` is 3 at levels 1-5 and 4 from level 6, so one
 * shot damages three or four separate enemies and then dies.
 *
 * ── Turning is instantaneous ──────────────────────────────────────────────
 * `:1746` assigns velocity straight from the angle to the target at full
 * speed. There is no turn rate and no arc — the round snaps to face its new
 * target the frame it acquires one. That is why it never misses a chain.
 *
 * ── Eligibility ───────────────────────────────────────────────────────────
 * A candidate must be on screen, not invisible, not teleporting, and not
 * already in the round's `enemiesArray`. Distance is measured as
 * `distanceBetween(bullet, enemy) - enemy.radius`, so a large enemy is
 * preferred over a small one at equal centre distance.
 *
 * ── Deliberate divergence: `closestDist` is reset per bullet ──────────────
 * The AS3 declares `closestDist` once at the top of `handleBullets` (`:1674`)
 * and never resets it inside the bullet loop. A second magic round retargeting
 * in the same frame therefore compares its candidates against the *first*
 * round's best distance, and acquires nothing at all if none of them beat it —
 * flying on straight until it leaves the room.
 *
 * That is an uninitialised-variable bug, not a design choice: which rounds
 * misfire depends on their order in `bulletArray`. Reproducing it would make
 * the weapon intermittently fail to chain for no reason a player could read.
 * `findMagicTarget` scopes the comparison to one round, which is what the code
 * plainly intends. Revert by hoisting `closest` out of the function if strict
 * fidelity is ever wanted.
 */

export interface MagicPoint {
  x: number;
  y: number;
}

export interface MagicTarget extends MagicPoint {
  radius: number;
}

/**
 * Index of the nearest eligible target, or -1.
 *
 * `isEligible` carries the on-screen, invisible, teleporting and already-hit
 * checks, all of which need scene state this module deliberately does not see.
 */
export function findMagicTarget(
  from: MagicPoint,
  targets: readonly MagicTarget[],
  isEligible?: (target: MagicTarget, index: number) => boolean,
): number {
  // Scoped to this call — see the divergence note in the header.
  let closest: number | null = null;
  let best = -1;

  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    if (isEligible && !isEligible(target, i)) continue;

    // The AS3 subtracts the enemy's radius, so a bigger enemy at the same
    // centre distance wins.
    const distance = Math.hypot(target.x - from.x, target.y - from.y) - target.radius;
    if (closest === null || distance < closest) {
      closest = distance;
      best = i;
    }
  }

  return best;
}

/**
 * Velocity that points straight at the target at full speed.
 *
 * No turn rate: the AS3 overwrites `xVel`/`yVel` outright every frame a target
 * is held.
 */
export function magicVelocity(
  from: MagicPoint,
  to: MagicPoint,
  speed: number,
): { xVel: number; yVel: number } {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  return { xVel: Math.cos(angle) * speed, yVel: Math.sin(angle) * speed };
}

/**
 * The homing rounds that turn to face where they are going — `:1749`, `:1769`.
 *
 * ── A per-class rule, and the AS3 draws the line in a surprising place ─────
 * All three homing rounds re-aim their *velocity* every frame a target is
 * held. Only two of them re-aim their *art*:
 *
 *     BulletMagicBunny  `:1749` — inside the seeking block, gated on the class
 *     BulletRocket      `:1769` — its own block, alongside the velocity write
 *     BulletMagic       nothing. It keeps the rotation it was fired with.
 *
 * The magic round's omission looks like an oversight and is not treated as
 * one: its art is a symmetrical orb, so a heading would not read on it, while
 * the bunny and the rocket are both plainly directional. Reproduced rather
 * than "fixed" — and stated here because the next reader will otherwise see
 * two of three and assume the third was missed by the port.
 */
const TURNS_WHILE_SEEKING = new Set(['BulletMagicBunny', 'BulletRocket']);

export function turnsWhileSeeking(bulletClass: string): boolean {
  return TURNS_WHILE_SEEKING.has(bulletClass);
}

/**
 * The drawn angle for a heading, in degrees — `angleToTarget * 180 / PI`.
 *
 * The art points along **+x** at rotation 0, the same convention the spawn
 * write at `:3907` uses, so there is no offset to apply.
 *
 * `null` for a round that is not moving, or whose velocity is not finite.
 * `Math.atan2(0, 0)` is `0` rather than `NaN`, so the arithmetic is safe
 * either way — but snapping a stationary round to face right is a visible
 * wrong answer, and leaving its angle alone is the right one. The caller
 * reads `null` as "do not touch it", which also makes a `NaN` velocity from
 * anywhere upstream unable to reach a transform.
 */
export function seekingRotation(xVel: number, yVel: number): number | null {
  if (!Number.isFinite(xVel) || !Number.isFinite(yVel)) return null;
  if (xVel === 0 && yVel === 0) return null;
  return (Math.atan2(yVel, xVel) * 180) / Math.PI;
}

export interface MagicState {
  /** Enemies this round may still damage before it dies. */
  targetsLeft: number;
  /** True until the first hit; gates homing entirely. */
  neverHitTarget: boolean;
}

export function createMagicState(targetsLeft: number): MagicState {
  return { targetsLeft, neverHitTarget: true };
}

/** Whether this round should be seeking a target this frame. */
export function isHoming(state: MagicState): boolean {
  return !state.neverHitTarget && state.targetsLeft > 0;
}

/**
 * Whether a hit consumes the round.
 *
 * `:5822` marks magic dead when `targetsLeft == 1`, evaluated *before* the
 * decrement at `:5951` — so a round on its final target dies with it.
 */
export function isFinalTarget(state: MagicState): boolean {
  return state.targetsLeft <= 1;
}

/** Applies a hit: records it against the budget and drops the current target. */
export function registerMagicHit(state: MagicState): MagicState {
  return {
    targetsLeft: state.targetsLeft - 1,
    neverHitTarget: false,
  };
}
