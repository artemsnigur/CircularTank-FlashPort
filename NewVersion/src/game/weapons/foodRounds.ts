/**
 * What a bounce *costs* each of the two food rounds.
 *
 * `bulletBounce.ts` owns the geometry, which is byte-identical for both — one
 * `bounceAgainstCamera` call, one `reflect`. Everything below is the part that
 * differs, kept here so the shared half cannot quietly grow a weapon-specific
 * branch: if these two ever need different geometry, it has to be argued for
 * rather than slipped in.
 *
 * The two are near-opposites. A bounce makes a Gummy Bear **stronger** and
 * finite; it makes a Crazy Cheese **no stronger** but re-arms it against every
 * enemy it has already hit.
 */
import type { BounceEdge } from './bulletBounce';

/* ── Gummy Bear ───────────────────────────────────────────────────────────
 *
 * `:1951-1962`, `:1972-1983`, `:1993-2004`. The AS3 carries the state on the
 * sprite's `currentFrame`, 1 through 3, which is doing double duty as both the
 * art and the counter. Ported as a number with the same range, because the
 * damage rule reads it and the cull rule at `:1812` reads it too.
 */

/** A bear starts here and is culled once a bounce takes it past stage 3. */
export const GUMMY_STAGE_MIN = 1;
export const GUMMY_STAGE_MAX = 3;

export interface GummyBounceState {
  stage: number;
  damage: number;
}

/**
 * Advances a bear one bounce — `:1951`, `:1993`.
 *
 * Single edge: step up one stage, and the damage multiplier is applied *after*
 * the step, keyed on the stage it arrived at. `x3` into stage 2 then `x4/3` into
 * stage 3, so a bear that bounces twice deals **4x** its base damage.
 *
 * Corner: jumps straight to stage 3, taking whichever multiplier closes the gap
 * from where it was — `x4` from stage 1, `x4/3` from stage 2. Both land on the
 * same 4x total, so a corner is a shortcut rather than a bonus. That the two
 * routes agree is the thing worth testing; either number alone looks arbitrary.
 */
export function bounceGummy(state: GummyBounceState, edge: BounceEdge): GummyBounceState {
  if (edge === 'corner') {
    const damage =
      state.stage === 1 ? state.damage * 4 : state.stage === 2 ? (state.damage / 3) * 4 : state.damage;
    return { stage: GUMMY_STAGE_MAX, damage };
  }

  const stage = state.stage + 1;
  const damage =
    stage === 2 ? state.damage * 3 : stage === 3 ? (state.damage / 3) * 4 : state.damage;
  return { stage, damage };
}

/**
 * Whether a bear is done bouncing — `:1812`.
 *
 * The cull condition is `currentFrame == 3`, so a bear at stage 3 stops taking
 * the bounce branch and is removed at the border like any other round. Two
 * bounces, then it leaves.
 */
export function gummyIsSpent(state: GummyBounceState): boolean {
  return state.stage >= GUMMY_STAGE_MAX;
}

/* ── Crazy Cheese ─────────────────────────────────────────────────────────
 *
 * `:1963-1970`, `:1984-1991`, `:2005-2012`.
 */

/** `:4216` — three bounces, and it does not scale with level. */
export const CHEESE_BOUNCES = 3;

export interface CheeseBounceState {
  bounces: number;
  /** Enemies already hit by this round; cleared on every bounce. */
  hits: ReadonlySet<number>;
}

/**
 * Spends one bounce — `:1965`, `:1986`, `:2007`.
 *
 * Two things happen and only one is obvious. The counter drops, and the
 * **hit list is emptied**, so a cheese that has already passed through an enemy
 * can hit that same enemy again after touching a wall. The round penetrates
 * (`:5822` keeps it off the `dead = true` list), so without the clear a cheese
 * would go inert against a crowd it had already crossed.
 *
 * A corner does not decrement — it sets the counter to **zero** outright
 * (`:2007`), ending the round however many bounces it had left. A cheese with
 * three bounces that finds a corner first is done immediately.
 */
export function bounceCheese(state: CheeseBounceState, edge: BounceEdge): CheeseBounceState {
  return {
    bounces: edge === 'corner' ? 0 : state.bounces - 1,
    hits: new Set<number>(),
  };
}

/**
 * Whether a cheese is done bouncing — `:1812`'s `bounces < 1`.
 *
 * Strictly less than one, so a round on its last bounce still bounces; it is
 * the *next* border contact that culls it.
 */
export function cheeseIsSpent(state: CheeseBounceState): boolean {
  return state.bounces < 1;
}
