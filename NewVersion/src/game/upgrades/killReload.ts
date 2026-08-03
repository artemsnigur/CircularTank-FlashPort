/**
 * Kill Reload — `PartGameArea.as:6849-6859`.
 *
 * **It does not reload a weapon.** The name is the misleading part: every kill
 * takes 2-11 frames off `ScreenGame.reloadTimeSecondary`, the *secondary*
 * cooldown, and touches the primary not at all. A player reading the shop entry
 * reasonably expects a magazine refill on kill; what they buy is a secondary
 * that comes back faster the more they kill.
 *
 * ── Where it sits, and why that decides what counts as a kill ─────────────
 * The block is inside `if(dead == true)` (`:6825`), the single place an enemy
 * death is resolved, and it is gated on **nothing else**. Not on the damage
 * source, not on `noMoney` (the money payout two lines above *is* gated on it —
 * `:6842` — and this deliberately is not), not on enemy type, not on level mode.
 *
 * So it fires on anything that sets `dead`, which includes a **lava trail kill**
 * (`:6282` sets the same flag from the ground-contact loop, in the same
 * per-enemy iteration). An enemy that walks into lava thrown ten seconds ago and
 * dies to it still shortens the secondary cooldown. That is the case worth
 * naming because it is the one the port could plausibly have got wrong: it needs
 * the hazard sweep's kills to route through the same site bullets use.
 *
 * Ice trails cannot trigger it — they freeze and never damage — and the fire
 * drain at `:7078` erodes the *patch*, not the enemy. Lava is the only hazard
 * that kills, so it is the only one that pays.
 *
 * ── The two spellings agree exactly ──────────────────────────────────────
 * The AS3 writes the clamp as a branch:
 *
 *     if (reloadTimeSecondary - amount > 0) reloadTimeSecondary -= amount;
 *     else                                  reloadTimeSecondary = 0;
 *
 * which is `Math.max(0, r - a)` at every input, including `r - a === 0` where
 * the branch takes the `else` and both give 0. Written as the clamp here, with
 * the equivalence asserted rather than assumed.
 */
import type { UpgradeState } from './upgradeState';
import { findUpgradeById, getStatValue } from './upgradeState';

/** `levelsArrayMisc[3]`, and `upgradeArrayKillReload[1]` is its only stat. */
const KILL_RELOAD_ID = 'KillReload';
const KILL_RELOAD_TRACK = 0;

/**
 * Frames a single kill takes off the secondary cooldown — 0 when unowned.
 *
 * `:6849` gates the whole block on `levelsArrayMisc[3] != 0`, so an unowned
 * upgrade is not "zero frames", it is no rule at all. Both spellings behave the
 * same here because the subtraction is a no-op at 0; returning 0 keeps the
 * caller branch-free.
 */
export function killReloadBonus(upgrades: UpgradeState): number {
  const upgrade = findUpgradeById(KILL_RELOAD_ID);
  if (!upgrade) return 0;
  return getStatValue(upgrades, upgrade, KILL_RELOAD_TRACK) ?? 0;
}

/**
 * Applies one kill's worth of cooldown relief — `:6851-6858`.
 *
 * Deliberately takes and returns the cooldown rather than mutating a state
 * object, so the ordinary reload (`tickFiring`) and this can be driven against
 * each other without either owning the other's clock.
 *
 * Three properties worth knowing, all asserted in the tests:
 *
 *  - **It does not bank.** A kill on a ready secondary (`reloadTime` already 0)
 *    leaves it at 0. There is no credit carried into the next use.
 *  - **It stacks within a frame.** The AS3 runs this per enemy inside the enemy
 *    loop, so five kills on one frame take five times the bonus off. Nothing
 *    dedups it.
 *  - **It composes with the ordinary reload** rather than replacing it — the
 *    cooldown is still ticking down on its own while kills chip at it.
 */
export function applyKillReload(reloadTime: number, bonus: number): number {
  return Math.max(0, reloadTime - bonus);
}
