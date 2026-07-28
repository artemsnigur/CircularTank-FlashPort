/**
 * Rockets — `PartGameArea.as:4108-4172` (fire), `:1762-1783` (flight).
 *
 * ── Locked at launch, never re-acquired ───────────────────────────────────
 * Each rocket is assigned one enemy when it spawns and steers at that enemy
 * every frame. When the target becomes invalid — dead, invisible, teleporting —
 * `:1775` and `:1780` set `targetEnemy = null` and **there is no search block**.
 * The rocket keeps its last velocity and flies straight off the map.
 *
 * That is the whole difference from Magic, which shipped alongside it and looks
 * similar. Magic's `:1714` block *does* search, and re-searches whenever its
 * target goes invalid — but only after its first hit, and it excludes enemies
 * it has already chained through. Structurally the two are not variants of one
 * rule: Magic has a search loop and Rockets simply do not have one.
 *
 * ── One target each, and only that target ─────────────────────────────────
 * `:5647` restricts a rocket's collision to its own target — with an exception
 * once the target is lost, after which it hits whatever it runs into. So a
 * rocket flies *through* enemies on its way to the one it wants.
 *
 * ── The volley picks nearest-first from the tank ──────────────────────────
 * `:4113-4141` walks every enemy, keeps the on-screen and targetable ones, and
 * insertion-sorts them by `distance - radius` measured from the **tank**. Magic
 * measures from the *bullet*; the metric is the same expression, the origin is
 * not.
 *
 * `rocketCount` is then clamped to however many were found, and a volley with
 * nothing to shoot at refunds the cooldown (`:4169`) — see `updateSecondary`.
 */

import { findMagicTarget } from './magic';
import type { MagicTarget } from './magic';

/** `rocket.radius = 3` — `:4153`. */
export const ROCKET_RADIUS = 3;

/** `rocket.speed = 16` — `:4154`. */
export const ROCKET_SPEED = 16;

/** Muzzle offset, added to the rocket's radius — `:4159`. */
export const ROCKET_MUZZLE_OFFSET = 16;

/**
 * Indices of the `count` nearest eligible targets, nearest first.
 *
 * ── Built from `findMagicTarget` rather than beside it ────────────────────
 * The AS3 insertion-sorts with `distanceBetween(...) - enemy.radius`, which is
 * exactly the expression `findMagicTarget` already implements and tests. Calling
 * it `count` times with the previous picks excluded produces the same ordering,
 * and `count` never exceeds 5.
 *
 * Writing a parallel sort containing that same subtraction would be the
 * one-rule-two-copies shape this codebase keeps paying for — and the copy would
 * be the one nobody notices when the metric changes.
 */
export function nearestTargets(
  from: { x: number; y: number },
  targets: readonly MagicTarget[],
  count: number,
  isEligible?: (target: MagicTarget, index: number) => boolean,
): number[] {
  const picked: number[] = [];

  for (let n = 0; n < count; n += 1) {
    const next = findMagicTarget(
      from,
      targets,
      (target, index) =>
        !picked.includes(index) && (isEligible ? isEligible(target, index) : true),
    );
    // Nothing eligible left — the volley is shorter than the stat asks for.
    if (next === -1) break;
    picked.push(next);
  }

  return picked;
}
