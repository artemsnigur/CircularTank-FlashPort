/**
 * One frame of every ground hazard — erosion, then contact.
 *
 * Extracted from `GameplayScene.updateHazards`/`applyHazard` for the reason T5
 * extracted `stepBullet` and `planBlastOn`: a private method reading
 * `this.enemies` cannot be driven, and the rules here now include two that had
 * never run at all.
 *
 * ── Two phases, in the AS3's order ────────────────────────────────────────
 * The original splits this across two functions that run at different points in
 * the frame:
 *
 *   `handleGround`  (`:7050`)  age, lava's growth, **fire drain and laser
 *                              extinguish**, then removal.
 *   `handleEnemies` (`:6197`)  contact — freeze or burn — gated on
 *                              `lifeTime > 15`.
 *
 * They are one pass here, in that order, because nothing between them in the
 * AS3 touches a hazard. One thing *does* sit between them and is worth knowing:
 * `tankAttack` spawns the laser (`:2821` against `:2815`). So `handleGround`
 * only ever sees beams from **previous** frames, while the `collidingWithLaser`
 * flag `handleEnemies` reads is set from **this** frame's beam. See
 * `SweepContext.beam` — the port does not reproduce that half-frame skew, and
 * the difference is recorded rather than hidden.
 */
import type { GroundHazard } from './groundHazard';
import {
  drainIce,
  extinguishIce,
  hazardTouches,
  iceFreezes,
  isBiting,
  lavaAffects,
  lavaDamagePerFrame,
  tickHazard,
} from './groundHazard';
import { findBeamHits } from './laser';
import type { LaserBeam } from './laser';

/** Just enough of an enemy for the hazard rules. */
export interface SweepEnemy {
  targetable: boolean;
  x: number;
  y: number;
  radius: number;
  trailId: number | null;
  isBoss: boolean;
  enemyType: string;
  iceMultiplier: number;
  fireLavaMultiplier: number;
}

/** A flame's position and reach, for the fire drain — `:7072`. */
interface FlamePoint {
  x: number;
  y: number;
  radius: number;
}

export interface SweepContext {
  frames: number;
  /** The scene's live `iceTrailID`. */
  iceTrailId: number;
  /**
   * Enemy indices the beam is currently on — the AS3's `collidingWithLaser`.
   *
   * Per-enemy and same-frame, reset at `:4507` and set at `:5574`. It is *not*
   * a property of any patch, which is the distinction that makes this and the
   * patch sweep below two rules rather than one.
   */
  laserTouched?: ReadonlySet<number>;
  /**
   * The live beam, for the patch sweep at `:7083`, or null when not firing.
   *
   * Passing hazards through `findBeamHits` needs no new geometry: the AS3 runs
   * the same `circleToLineCollision` against patches that it runs against
   * enemies, and a `GroundHazard` is already `{ x, y, radius }`.
   */
  beam?: LaserBeam | null;
  /** Live flames, for the 3-frames-per-frame ice drain at `:7078`. */
  flames?: readonly FlamePoint[];
}

/** Something a hazard did to an enemy this frame. */
export type SweepEffect =
  | { kind: 'freeze'; enemy: number; frames: number; enemyType: string }
  | { kind: 'lava'; enemy: number; damage: number };

export interface SweepResult {
  /** Survivors, aged and eroded. Index-aligned with nothing — rebuild from it. */
  hazards: GroundHazard[];
  /** Indices into the *input* array that did not survive, for sprite teardown. */
  removed: number[];
  effects: SweepEffect[];
  /** Enemy indices to stamp with the current generation — `:6220`. */
  stamped: number[];
}

/**
 * Ages, erodes and applies every hazard.
 *
 * Returns rather than mutates so the caller keeps ownership of sprites and
 * enemies, and so this can be driven with plain objects.
 */
export function sweepHazards(
  hazards: readonly GroundHazard[],
  enemies: readonly SweepEnemy[],
  context: SweepContext,
): SweepResult {
  const survivors: GroundHazard[] = [];
  const removed: number[] = [];
  const effects: SweepEffect[] = [];
  const stamped: number[] = [];

  // `:6250` — `onLava` is per source *per frame*, so ten overlapping patches
  // cost one patch's damage this frame and charge again next frame. Ice's rule
  // is per generation and lives on the enemy; the two must not be merged.
  const burned = new Set<number>();

  // `:7083` — which patches the beam crosses. One query for the whole sweep,
  // since the beam does not move between patches.
  const burntByBeam = new Set<number>();
  if (context.beam) {
    for (const index of findBeamHits(context.beam, hazards)) burntByBeam.add(index);
  }

  for (let index = 0; index < hazards.length; index += 1) {
    let hazard = hazards[index];

    // ── Erosion first, as `handleGround` does it ──────────────────────────
    // Both only touch ice; lava is immune to fire and to the beam.
    if (hazard.type === 'Ice') {
      for (const flame of context.flames ?? []) {
        if (Math.hypot(hazard.x - flame.x, hazard.y - flame.y) < flame.radius + hazard.radius) {
          hazard = drainIce(hazard, context.frames);
        }
      }
      // `:7085` sets `lifeTime = 0` and the next block splices it out in the
      // same iteration, so a beamed patch never gets a contact pass.
      if (burntByBeam.has(index)) hazard = extinguishIce(hazard);
    }

    const ticked = tickHazard(hazard, context.frames);
    if (!ticked) {
      removed.push(index);
      continue;
    }

    survivors.push(ticked);
    if (!isBiting(ticked)) continue;

    // ── Contact, as the `handleEnemies` ground loop does it ───────────────
    for (let e = 0; e < enemies.length; e += 1) {
      const enemy = enemies[e];
      if (!enemy.targetable) continue;
      if (!hazardTouches(ticked, enemy)) continue;

      if (ticked.type === 'Ice') {
        const underBeam = context.laserTouched?.has(e) ?? false;
        if (
          !iceFreezes(
            ticked,
            { trailId: enemy.trailId, isBoss: enemy.isBoss, iceMultiplier: enemy.iceMultiplier },
            context.iceTrailId,
            underBeam,
          )
        ) {
          continue;
        }

        stamped.push(e);
        effects.push({
          kind: 'freeze',
          enemy: e,
          frames: ticked.payload,
          enemyType: enemy.enemyType,
        });
        continue;
      }

      if (burned.has(e)) continue;
      if (!lavaAffects(enemy.enemyType, enemy.fireLavaMultiplier)) continue;
      burned.add(e);

      effects.push({
        kind: 'lava',
        enemy: e,
        damage: lavaDamagePerFrame(
          ticked.payload,
          enemy.fireLavaMultiplier,
          enemy.isBoss,
          context.frames,
        ),
      });
    }
  }

  return { hazards: survivors, removed, effects, stamped };
}
