/**
 * Enemy-on-enemy separation — `PartGameArea.as:5174-5221`, the pair loop.
 *
 * **UNWIRED, deliberately.** This is pass (a) of four: the rule, pure and
 * pinned, with no caller. Nothing in the game separates enemies yet, so they
 * still interpenetrate on all 405 levels.
 *
 * **Knip reports this under `Unused files (1)`** — its strongest category, not
 * merely unused exports — and that is the correct answer until pass (c) lands
 * the loop in `GameplayScene`. It is expected, checked, and not evidence of a
 * dead module. Passes: (b) threads `pushVel` through the wall path, (c) wires
 * the pair loop and `safetyDistance`, (d) adds `BossCollision`. See
 * `docs/BACKLOG.md`, "Port enemy-enemy separation".
 *
 * ── Three branches, three quantities, three destinations ──────────────────
 * The single most important thing about this rule is that it is **not** one
 * "resolve the overlap" step. The AS3 has three cases that share a gate and
 * agree on nothing else:
 *
 *   normal <-> normal   a flat **0.5 of position**, written to x/y  (`:5186`)
 *   boss   <-> boss     a **mass-weighted force** into `pushVel`     (`:5199`)
 *   normal <-  boss     the **penetration depth** added to xVel/yVel (`:5210`)
 *
 * A constant, a force and a depth. Collapsing them into one formula — which is
 * what "separate two circles" would naturally produce — changes all three.
 *
 * `pushVel` exists **solely** for the boss-on-boss case. Neither of the other
 * branches writes it.
 *
 * ── Ordered pairs, visited twice ──────────────────────────────────────────
 * `:5174-5177` runs `i` over every enemy and `iii` over every enemy, skipping
 * only `i == iii`. So each unordered pair is processed **twice, with the roles
 * swapped**, and that is load-bearing rather than wasteful:
 *
 * - Two normals of equal size nudge each other 0.5 **each**, so the pair
 *   separates by 1.0 per frame. Halving the loop to `iii > i` halves that.
 * - The boss branch writes *both* bodies on each visit, so a second visit
 *   overwrites the first rather than accumulating.
 *
 * **And the two visits do not always both happen.** The broad phase is
 * direction-dependent — see `withinBroadPhase` — so when the subject is larger
 * than the other body there is a band of real overlaps that only one ordering
 * can see. Measured over 241,816 overlapping configurations spanning radii
 * 5..60 and offsets +-120: **17.2% are visible to exactly one ordering, and
 * none to neither.** So:
 *
 *   - A boss pair always resolves, because whichever visit survives writes
 *     *both* bodies' `pushVel`.
 *   - A mismatched normal pair may be nudged on one side only, and it is the
 *     **smaller** body that gets nudged: the rejection fires when the subject
 *     is the bigger one.
 *
 * This module therefore models **one ordered pair**, `(subject, other)`, and
 * says what happens to each. The caller runs both orderings and must not
 * assume they agree.
 *
 * ── Everything is in radians, and nothing writes rotation ─────────────────
 * `angleBetween` (`:2594`) returns `atan2` radians and the AS3 feeds it
 * straight to `cos`/`sin`. No branch here assigns `rotation`, so the port's
 * degree convention (0 = right, 90 = down) never enters. Do not "convert" —
 * there is nothing to convert.
 */
import { reduceValue } from '../player/tankMovement';

/**
 * One body, as this rule reads it.
 *
 * `radius` is the collision radius; `PartGameArea.as:3318` sets
 * `enemy.radius = enemy.width / 2`, so width and height are `2 * radius` and
 * this type does not carry them separately — see `boxesOverlap`.
 */
export interface SeparationBody {
  x: number;
  y: number;
  radius: number;
  /** `"B"` for a boss; any other string for an ordinary enemy. */
  enemyLevel: string;
  /**
   * `:3354`/`:3358` — `40 + random() * 60`, or `160 + random() * 10` for a
   * boss. Broad-phase padding only, in this rule.
   *
   * **Spawn-time `Math.random()`, deliberately not `PM_PRNG`.** The seeded
   * generator drives background-prop layout and has no resynchronisation: one
   * extra draw shifts the entire remaining stream. See `core/PM_PRNG.ts`.
   */
  safetyDistance: number;
  /** `:5179` — a target mid-teleport is skipped. */
  teleporting?: boolean;
}

/** `:5199-5207` — a velocity to **assign** to `pushVelX`/`pushVelY`. */
export interface PushVelocity {
  pushVelX: number;
  pushVelY: number;
}

/**
 * What one ordered pair does to the subject, and — for the boss case — to the
 * other body as well.
 *
 * Discriminated rather than a bag of optional numbers so the caller cannot
 * apply a position nudge as a velocity, which is exactly the confusion the
 * three branches invite.
 */
export type SeparationEffect =
  | { kind: 'none' }
  /** `:5187-5188` — add straight to the subject's position. */
  | { kind: 'nudge'; dx: number; dy: number }
  /** `:5216-5217` — add to the subject's `xVel`/`yVel`. */
  | { kind: 'velocity'; dxVel: number; dyVel: number }
  /**
   * `:5199-5207` — **assign** to both bodies' `pushVel`.
   *
   * `contactX`/`contactY` is the point on the other body's rim (`:5193-5194`),
   * which the `BossCollision` sound is gated on being on screen. Carried here
   * rather than resolved, because the gate needs live camera values that a pure
   * module has no business knowing — pass (d).
   */
  | {
      kind: 'bossPush';
      subject: PushVelocity;
      other: PushVelocity;
      contactX: number;
      contactY: number;
    };

/** `:5199` — `radius^2 * PI`. Area, standing in for mass. */
export function bodyMass(radius: number): number {
  return radius * radius * Math.PI;
}

/** `:5201` — the total force a boss pair shares out between them. */
export const TOTAL_PUSH_FORCE = 18;

/** `:5187` — the flat distance one ordinary enemy shifts per visit. */
export const NORMAL_NUDGE = 0.5;

/** `:5365-5366` — how much `pushVel` sheds per frame. */
export const PUSH_DECAY = 0.5;

/** `:2345` — plain Euclidean distance. */
export function distanceBetween(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 - x2;
  const dy = y1 - y2;
  return Math.sqrt(dx * dx + dy * dy);
}

/** `:2594` — `atan2(y2 - y1, x2 - x1)`, in radians. */
export function angleBetween(x1: number, y1: number, x2: number, y2: number): number {
  return Math.atan2(y2 - y1, x2 - x1);
}

/**
 * `:2354` — the broad phase, transcribed including its oddities.
 *
 * **Two things about it are wrong-looking and both are faithful.**
 *
 * 1. The parameter list is `(r1x, r1y, r1h, r1w, r2x, r2y, r2w, r2h)` — `h`
 *    and `w` are **transposed** in the first rect relative to the second, and
 *    the body then uses `r1w` on the x axis and `r1h` on the y axis. The call
 *    at `:5179` passes `width + safety` then `height + safety`, so the padded
 *    width lands in `r1h`. For these callers it cannot matter: an enemy's
 *    width equals its height, so the two are the same number. Pinned in the
 *    tests rather than left as a claim.
 * 2. It treats `x`/`y` as a rect's **corner** while enemy coordinates are
 *    **centres**, so both boxes sit half a body off — and because the padding
 *    only ever extends in `+x`/`+y`, the test is **direction-dependent**.
 *
 * Point 2 has a consequence the scoping pass got wrong, so it is spelled out.
 * The rejection `r1x > r2x + r2w` fires when the subject sits further along x
 * than the other body's far edge, i.e. `dx > 2 * otherRadius`. An overlap needs
 * `d < subjectRadius + otherRadius`. Both can hold at once **exactly when the
 * subject is larger than the other body**, so a genuine overlap can be invisible
 * to one ordering while the reverse ordering sees it.
 *
 * Measured rather than reasoned: over 241,816 overlapping configurations
 * (radii 5..60, offsets +-120), **17.2% are seen by exactly one ordering and
 * 0% by neither**. The zero is what keeps this from being a lost collision —
 * both orderings could only reject if `d > 2 * max(radius)`, which contradicts
 * the overlap. `enemySeparation.test.ts` drives that sweep.
 *
 * Transcribed argument-for-argument rather than rewritten as a sane AABB test,
 * because "sane" here would be a different filter and the filter is behaviour.
 */
export function boxesOverlap(
  r1x: number,
  r1y: number,
  r1h: number,
  r1w: number,
  r2x: number,
  r2y: number,
  r2w: number,
  r2h: number,
): boolean {
  return !(r1x + r1w < r2x || r1y + r1h < r2y || r1x > r2x + r2w || r1y > r2y + r2h);
}

/** `:5179` — the broad phase as the pair loop calls it. */
export function withinBroadPhase(subject: SeparationBody, other: SeparationBody): boolean {
  if (other.teleporting === true) return false;

  // `enemy.width` is `2 * radius` — `:3318`. The subject's box is padded by its
  // own `safetyDistance`; the other's is not padded at all.
  const subjectSize = subject.radius * 2 + subject.safetyDistance;
  return boxesOverlap(
    subject.x,
    subject.y,
    subjectSize,
    subjectSize,
    other.x,
    other.y,
    other.radius * 2,
    other.radius * 2,
  );
}

/**
 * `:5182` — the rank gate, and it is deliberately asymmetric.
 *
 * `theEnemy.enemyLevel != "B" || theEnemy2.enemyLevel == "B"`. Read it as: a
 * **boss is never moved by an ordinary enemy**. Bosses shove their way through
 * the crowd; the crowd is shoved by everything. A symmetric "resolve the
 * overlap" would push bosses around and is the obvious way to get this wrong.
 */
export function ranksAllowPush(subject: SeparationBody, other: SeparationBody): boolean {
  return subject.enemyLevel !== 'B' || other.enemyLevel === 'B';
}

/**
 * One ordered pair — `:5179-5221` end to end.
 *
 * Returns what to do to `subject` (and, for a boss pair, to `other`). The
 * caller applies it and runs the opposite ordering separately.
 */
export function separationBetween(
  subject: SeparationBody,
  other: SeparationBody,
): SeparationEffect {
  if (!withinBroadPhase(subject, other)) return { kind: 'none' };
  if (!ranksAllowPush(subject, other)) return { kind: 'none' };

  const distance = distanceBetween(subject.x, subject.y, other.x, other.y);
  if (!(distance < subject.radius + other.radius)) return { kind: 'none' };

  // `:5185` — from the **other** body toward the subject, so the subject is
  // pushed away. Reversing this drives them together, and the symptom is a
  // clump rather than an error.
  const angleTowards = angleBetween(other.x, other.y, subject.x, subject.y);

  // `:5186` — the other body is an ordinary enemy. Combined with the rank gate
  // above, the subject is ordinary too, so this is the normal-vs-normal case.
  if (other.enemyLevel !== 'B') {
    return {
      kind: 'nudge',
      dx: Math.cos(angleTowards) * NORMAL_NUDGE,
      dy: Math.sin(angleTowards) * NORMAL_NUDGE,
    };
  }

  // `:5191` — boss against boss.
  if (subject.enemyLevel === 'B' && other.enemyLevel === 'B') {
    const subjectMass = bodyMass(subject.radius);
    const otherMass = bodyMass(other.radius);
    const total = subjectMass + otherMass;

    // `:5202` — each body's share is `1 - own/total`, i.e. **the other body's**
    // mass share. So the lighter boss is thrown further, which is the right
    // way round and the easy one to invert by "simplifying" to own/total.
    const subjectSpeed = (1 - subjectMass / total) * TOTAL_PUSH_FORCE;
    const otherSpeed = (1 - otherMass / total) * TOTAL_PUSH_FORCE;

    return {
      kind: 'bossPush',
      subject: {
        pushVelX: Math.cos(angleTowards) * subjectSpeed,
        pushVelY: Math.sin(angleTowards) * subjectSpeed,
      },
      // `:5206-5207` — the opposite bearing, written with `+ PI` rather than a
      // negation. Same axis, and kept in that form so the transcription reads
      // against the source.
      other: {
        pushVelX: Math.cos(angleTowards + Math.PI) * otherSpeed,
        pushVelY: Math.sin(angleTowards + Math.PI) * otherSpeed,
      },
      // `:5193-5194` — the contact point on the other body's rim.
      contactX: other.x + Math.cos(angleTowards) * other.radius,
      contactY: other.y + Math.sin(angleTowards) * other.radius,
    };
  }

  // `:5210-5218` — an ordinary enemy shoved by a boss. The magnitude is the
  // **penetration depth**, so it grows with how deep the overlap is, unlike the
  // flat 0.5 above. The AS3 clamps a negative to 0 and then does nothing with
  // it; the narrow-phase test above already guarantees it is positive here, so
  // the clamp is unreachable and the branch is written without it.
  const depth = subject.radius + other.radius - distance;
  return {
    kind: 'velocity',
    dxVel: Math.cos(angleTowards) * depth,
    dyVel: Math.sin(angleTowards) * depth,
  };
}

/**
 * `:5365-5366` — one frame of `pushVel` decay, applied to both components.
 *
 * Linear toward zero and clamped, so it never overshoots into the opposite
 * direction. Runs **after** the pair loop and **before** integration; the
 * ordering is pass (b)/(c) work and is noted here because decaying after
 * integrating would apply a stale velocity for one frame.
 *
 * Shares `reduceValue` with the tank rather than restating it —
 * `PartGameArea.reduceValue` (`:2548`) and `Tank.reduceValue` are the same
 * function, and this project already tracks three cases of one rule living in
 * two places.
 */
export function decayPush(push: PushVelocity): PushVelocity {
  return {
    pushVelX: reduceValue(push.pushVelX, PUSH_DECAY),
    pushVelY: reduceValue(push.pushVelY, PUSH_DECAY),
  };
}
