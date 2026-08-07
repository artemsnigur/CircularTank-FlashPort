/**
 * When the `Burning` loop is asserted — `PartGameArea.as:6002-6006`.
 *
 * ── It is a keep-alive, not a start ───────────────────────────────────────
 * `SoundManager.burningPlay` is cleared at the end of every `handleLoops`
 * (`SoundManager.as:1040-1041`), so the flag means *"something is burning this
 * frame"*, never *"start burning"*. A caller that fires once on the triggering
 * event and then stops gets one frame of volume ramp followed by a fade-out,
 * which sounds like a click rather than a loop. Both call sites therefore sit
 * on per-frame paths and re-assert for as long as the condition holds.
 *
 * ── Two sources, one loop ─────────────────────────────────────────────────
 * The AS3 sets `burningPlay` from two places, and they are not variants of one
 * rule — they have different owners and different dedup:
 *
 *   `:6006`  a `BulletFire` overlapping an enemy. Per flame, per enemy, every
 *            frame the flame lives. This module's predicate.
 *   `:6261`  an enemy standing in lava. Deduped per enemy per frame by
 *            `onLava` (`:6250`), which the port carries as `sweepHazards`'s
 *            `burned` set.
 *
 * The lava side is **not** routed through here on purpose. `:6259` gates the
 * sound, `onLava` and the damage on a single `if`, and the port already spends
 * that `if` in `lavaAffects` (`weapons/groundHazard.ts`) to decide whether the
 * damage lands at all — so a `{ kind: 'lava' }` effect existing *is* the
 * condition being met. Re-testing it beside the emit would be a second copy of
 * a rule that already has a home, which is how `countCrowd` and `canAfford`
 * drifted from their callers (`docs/AUDIT-2026-07.md`, "One rule, two copies").
 *
 * What keeps the two honest is a test rather than a sentence: `burningLoop.test.ts`
 * drives this predicate and `lavaAffects` across all 20 stat types and requires
 * them to agree. They are allowed to be two functions; they are not allowed to
 * disagree about who burns.
 */

import { isImmuneToDamage } from '../enemies/enemyStatMods';

/**
 * Whether a flame landing on this enemy sounds the loop — `:6002`, `:6004`.
 *
 * ── The exclusion is audible, not cosmetic ────────────────────────────────
 * `:6004` is an **if/else**, not a guard. A `DamageAddict` takes the `else` at
 * `:6029` into `hitDamageAddict` and never reaches `burningPlay`, so it burns
 * in silence while every other burnable type sounds.
 *
 * That branch is genuinely reachable, which is what makes dropping the
 * exclusion a real defect rather than dead arithmetic: `DamageAddict` declares
 * no strengths and no weaknesses (`enemyStatsData.ts:80-85`), so its `FireLava`
 * multiplier resolves to the neutral **1** and clears `:6002`'s `> 0`. Without
 * the second half of this expression it would sound like anything else.
 *
 * ── One name covers the AS3's two ─────────────────────────────────────────
 * `:6004` excludes `"DamageAddict"` **and** `"DamageAddictB"`, which are two
 * distinct `enemyType` strings in the original (`:3168` spawns the boss variant
 * with `enemyDamageAddictBStats`). The port has no second string: boss-ness is
 * `enemyLevel === 'B'` over the 20 base names in `ENEMY_STAT_TYPES`, so one
 * comparison covers both. `isImmuneToDamage` and `lavaAffects` already collapse
 * the pair the same way — this follows that precedent rather than adding a
 * comparison against a string the port cannot produce.
 *
 * Expressed through `isImmuneToDamage` rather than naming the type again: that
 * predicate *is* this AS3 condition (its own docstring cites the same
 * per-damage-site `enemyType != "DamageAddict"` guard), so the two cannot drift.
 */
export function flameBurnSounds(enemyType: string, fireLavaMultiplier: number): boolean {
  return fireLavaMultiplier > 0 && !isImmuneToDamage(enemyType);
}
