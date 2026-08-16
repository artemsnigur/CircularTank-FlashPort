/**
 * Laser Cannon — `PartGameArea.as:3849` (spawn), `:5560` (collision),
 * `:1699` (removal), and `circleToLineCollision` at `:7353`.
 *
 * The only weapon with no projectile. Firing lays down a **1000-unit line
 * segment** from the muzzle, tests every enemy against it once, and is done.
 * There is nothing in flight and nothing to dodge — the beam either caught you
 * on the frame it fired or it did not.
 *
 * ── One frame of damage ───────────────────────────────────────────────────
 * The collision is gated on `canDamage && currentFrame == 1`, and `:1699`
 * clears `canDamage` on the very next pass of `handleBullets`. The sprite then
 * plays out its animation and is removed. So the beam damages on exactly the
 * frame it spawns, however long the visual lingers.
 *
 * ── It hits everything on the line ────────────────────────────────────────
 * The enemy loop is the outer one, so every enemy is tested against the same
 * segment. A beam through a queue of enemies damages all of them at once —
 * this is the game's only true pierce-everything weapon, and unlike the
 * Penetration Cannon it needs no already-hit list because it only ever fires
 * once.
 *
 * ── Two things it does that nothing else does ─────────────────────────────
 *   - **Instant thaw.** A frozen enemy has `frozenTimer` set to 0 outright
 *     (`:5577`), where fire only knocks 15 frames off. The laser also still
 *     damages, where fire does not.
 *   - **Clears ground hazards.** `:7083` runs the same segment test against
 *     ground items and zeroes their lifetime. Not ported — no ground hazards
 *     exist yet — but it is the reason the beam is tested twice in the AS3.
 *
 * ── The spread rule that is a no-op ───────────────────────────────────────
 * `:3938` gives the Laser its own line, `tower.rotation - spread/2 +
 * random()*spread`, which reads like a special case. Its `spread` is 0, so it
 * evaluates to the turret rotation exactly. This was once recorded as a reason
 * the weapon needed dedicated work; it is dead arithmetic.
 */

/** `bullet.radius = 12` — added to each enemy's radius for the segment test. */
export const LASER_RADIUS = 12;

/** Distance from the tank centre the beam starts. */
export const LASER_START_OFFSET = 16;

/** `endX = tank + cos(rot) * (16 + 1000)` — the beam is 1000 units long. */
export const LASER_LENGTH = 1000;

interface Point {
  x: number;
  y: number;
}

export interface LaserBeam {
  start: Point;
  end: Point;
  radius: number;
}

/**
 * The segment a shot lays down, from the turret rotation in degrees.
 *
 * Note this is *not* where the sprite goes: `:3930` places the visual at
 * `8 + width/2`, while the collision segment starts at a flat 16. Two
 * different offsets for two different jobs.
 */
export function createBeam(x: number, y: number, towerRotation: number): LaserBeam {
  const radians = (towerRotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);

  return {
    start: { x: x + cos * LASER_START_OFFSET, y: y + sin * LASER_START_OFFSET },
    end: {
      x: x + cos * (LASER_START_OFFSET + LASER_LENGTH),
      y: y + sin * (LASER_START_OFFSET + LASER_LENGTH),
    },
    radius: LASER_RADIUS,
  };
}

interface CircleLineResult {
  /** The segment lies entirely within the circle. */
  inside: boolean;
  /** The segment crosses the circle's edge. */
  intersects: boolean;
  /** Enter and exit coincide. */
  tangent: boolean;
  /** `intersects || inside` — the only field the damage path reads. */
  collision: boolean;
  enter: Point | null;
  exit: Point | null;
}

/**
 * `circleToLineCollision` — segment AB against the circle at C with radius r.
 *
 * A faithful port of the AS3's quadratic, including two quirks worth keeping:
 *
 *   - `deter <= 0` is treated as **no collision**, so a beam exactly tangent to
 *     an enemy misses. Using `< 0` would make grazing shots connect and is the
 *     obvious "fix" — it would also be wrong.
 *   - the containment branch reports `inside` when one root is below 0 and the
 *     other above 1, i.e. the segment is swallowed by the circle. That still
 *     counts as a collision.
 */
export function circleToLineCollision(
  a: Point,
  b: Point,
  c: Point,
  r = 1,
): CircleLineResult {
  const result: CircleLineResult = {
    inside: false,
    tangent: false,
    intersects: false,
    collision: false,
    enter: null,
    exit: null,
  };

  const dx = b.x - a.x;
  const dy = b.y - a.y;

  const qa = dx * dx + dy * dy;
  const qb = 2 * (dx * (a.x - c.x) + dy * (a.y - c.y));
  const qc =
    c.x * c.x + c.y * c.y + a.x * a.x + a.y * a.y - 2 * (c.x * a.x + c.y * a.y) - r * r;

  const deter = qb * qb - 4 * qa * qc;

  if (deter > 0) {
    const e = Math.sqrt(deter);
    const u1 = (-qb + e) / (2 * qa);
    const u2 = (-qb - e) / (2 * qa);

    if ((u1 < 0 || u1 > 1) && (u2 < 0 || u2 > 1)) {
      // Both roots off the segment: either it misses entirely, or the whole
      // segment sits inside the circle.
      result.inside = !((u1 < 0 && u2 < 0) || (u1 > 1 && u2 > 1));
    } else {
      if (u2 >= 0 && u2 <= 1) {
        result.enter = { x: a.x + dx * u2, y: a.y + dy * u2 };
      }
      if (u1 >= 0 && u1 <= 1) {
        result.exit = { x: a.x + dx * u1, y: a.y + dy * u1 };
      }
      result.intersects = true;
      if (
        result.enter !== null &&
        result.exit !== null &&
        result.enter.x === result.exit.x &&
        result.enter.y === result.exit.y
      ) {
        result.tangent = true;
      }
    }
  }

  result.collision = result.intersects || result.inside;
  return result;
}

export interface BeamTarget {
  x: number;
  y: number;
  radius: number;
}

/**
 * Indices of every target the beam catches.
 *
 * The enemy's radius and the beam's are summed, exactly as the AS3 passes
 * `theEnemy.radius + theBullet.radius`.
 */
export function findBeamHits(
  beam: LaserBeam,
  targets: readonly BeamTarget[],
  canHit?: (target: BeamTarget, index: number) => boolean,
): number[] {
  const hits: number[] = [];
  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    if (canHit && !canHit(target, i)) continue;
    const result = circleToLineCollision(
      beam.start,
      beam.end,
      { x: target.x, y: target.y },
      target.radius + beam.radius,
    );
    if (result.collision) hits.push(i);
  }
  return hits;
}
