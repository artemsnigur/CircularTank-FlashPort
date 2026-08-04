/**
 * The two places the tutorial holds gameplay back — `PartGameArea.as:4259` and
 * `:7153`.
 *
 * Both are the same condition: **while the tutorial is running and `AimShoot`
 * has not been done**, the game waits. It is the whole extent of the tutorial's
 * control over play — it does not gate input, force a weapon, or restrict
 * movement.
 *
 * ── Why this is its own module and its own commit ─────────────────────────
 * These two change systems that are already ported, pinned and green. Every
 * other tutorial change can only make the tutorial wrong; these can make
 * *spawning* wrong, for a player who never sees a tutorial. Kept separate so a
 * defect bisects here rather than inside a rendering commit.
 *
 * Applied inside the systems they gate rather than bolted onto the update —
 * `waves/levelDoneGate.ts` is the precedent, and the reason is the same: a
 * guard at the call site applies to every branch, including the ones whose
 * rule it contradicts.
 *
 * ── `reloadTimeEnemy = 1` is a substitution, not a suppress flag ──────────
 * This is the part a port gets wrong by reading it as "spawning off".
 *
 * `reloadTimeEnemy` is a **countdown**, and `spawnWarnings` fires when it
 * reaches 0 (`:7157`). The tutorial gate sets it to **1** at the top of that
 * same function (`:7155`), so each frame runs: pin to 1 → the `<= 0` test
 * fails → the `else if` decrements it to 0 (`:7331`) → next frame pins it to 1
 * again.
 *
 * **So it holds the timer one frame *above* the threshold, and release is
 * immediate.** The moment `AimShoot` is done the gate stops firing, the timer
 * is already at 0, and the next spawn happens on that frame.
 *
 * A boolean suppress produces identical behaviour while held and differs at the
 * boundary: the timer would still be wherever the last real reset left it —
 * up to a full spawn interval — so the first enemy after the player fires
 * would be delayed by a second or more. That difference is invisible except at
 * the one moment the tutorial hands control back, which is exactly when the
 * player is watching.
 */

import type { TutorialState } from './tutorialState';
import { isTutorialDone } from './tutorialState';

/**
 * `:7153` / `:4259` — whether the tutorial is currently holding play.
 *
 * False whenever the tutorial is off or finished, which is the case that
 * matters most: **a player who has disabled the tutorial must see none of
 * this.** Both AS3 sites carry the same three-part condition and this is it,
 * in one place, so the two cannot drift apart.
 */
export function tutorialHoldsPlay(state: TutorialState): boolean {
  return state.on && !state.completed && !isTutorialDone(state, 'AimShoot');
}

/** `:7155` — the value the spawn countdown is pinned to while held. */
export const HELD_SPAWN_RELOAD = 1;

/**
 * The spawn countdown for this frame — `:7153-7155`.
 *
 * Returns the value unchanged when the tutorial is not holding, so the wave
 * system behaves exactly as it does today for every player who is not in the
 * middle of the tutorial's first step.
 */
export function gateSpawnReload(current: number, state: TutorialState): number {
  return tutorialHoldsPlay(state) ? HELD_SPAWN_RELOAD : current;
}

/**
 * Whether the secondary's reload may tick this frame — `:4259`.
 *
 * The AS3 writes it as the `else if` of a chain, so the reload runs when the
 * tutorial is off, **or** completed, **or** past `AimShoot`. Inverted here into
 * a positive so the call site reads as a permission rather than a negation.
 */
export function secondaryReloadRuns(state: TutorialState): boolean {
  return !tutorialHoldsPlay(state);
}
