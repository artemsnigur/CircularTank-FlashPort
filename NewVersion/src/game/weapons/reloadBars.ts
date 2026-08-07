/**
 * The two reload bars — `PartInterface.drawReloadBars` (`:746-778`).
 *
 * ── These are not an ammo readout, and the port's placeholder implied one ─
 * **The original has no magazine.** `ammo`, `magazine` and `clipSize` appear
 * **zero** times in `ScreenGame.as`, `PartGameArea.as` and `PartInterface.as`.
 * What the interface draws is two 4x80 white rectangles that fill as a
 * *cooldown* elapses — `reloadTime` counting down to zero — and nothing counts
 * rounds anywhere.
 *
 * So `PLACEHOLDER_AMMO = 12` was not a placeholder *value* awaiting a real
 * count; the `{ current, capacity }` shape it fed was a placeholder *concept*.
 * "12/12" described a magazine the game does not have. That is why this ports
 * to a fill fraction and the `ammo:changed` event is retired rather than
 * populated.
 *
 * ── What `:750-752` actually gates ────────────────────────────────────────
 * `if (this.countDown > 0) height1 = 0`.
 *
 * `countDown` here is **the opening countdown** — `PartInterface.countDown`,
 * 60 frames down to 0, the "3 / 2 / 1 / GO!" ported in T67/T68. It is *not* a
 * reload countdown, despite sitting in `drawReloadBars` and despite the name.
 *
 * And it is **display only**. It does not change reload timing, does not gate
 * input, and does not touch the secondary. The primary bar simply reads empty
 * until GO!, then jumps to full — because at level start `reloadTime` is 0, so
 * `:758-760`'s `height1 = 80` takes over the moment the gate lifts.
 *
 * ── Only the primary is gated, and two weapons are excluded ───────────────
 * `height2` (`:766-772`) has **no countdown branch at all** — the secondary's
 * bar shows its real state throughout, including during the countdown. That
 * asymmetry looks like an oversight and is reproduced.
 *
 * `:754` additionally excludes `MiniGun` and `Flamethrower` from the *filling*
 * branch, so a continuous-fire weapon shows a permanently full bar rather than
 * a bar flickering at its fire rate.
 */

/** `:756` — the bar is 80px tall in the AS3. Kept as the source of the ratio. */
export const AS3_BAR_HEIGHT = 80;

/**
 * `:754` — weapons whose primary bar never shows a reload.
 *
 * Both fire continuously, so their `reloadTime` is a per-shot cadence rather
 * than a cooldown worth watching; the AS3 shows them full.
 */
export const CONTINUOUS_FIRE_WEAPONS: readonly string[] = ['MiniGun', 'Flamethrower'];

export interface PrimaryBarInput {
  /** True while the opening countdown is still running — `countDown > 0`. */
  countdownRunning: boolean;
  reloadTime: number;
  reloadTimeMax: number;
  weaponName: string;
}

/**
 * How full the primary bar is, 0-1 — `:750-761`.
 *
 * The AS3 computes `80 - reloadTime / reloadTimeMax * 80`, i.e. the bar *fills*
 * as the cooldown drains. Returned as a fraction rather than pixels so the
 * renderer is free to size it; `AS3_BAR_HEIGHT` records what the original used.
 */
export function primaryBarFill(input: PrimaryBarInput): number {
  const { countdownRunning, reloadTime, reloadTimeMax, weaponName } = input;

  // `:750-752` — the opening countdown wins over everything below it.
  if (countdownRunning) return 0;

  // `:754` — the filling branch is skipped entirely for continuous fire, so
  // the `else` at `:758` gives a full bar.
  if (CONTINUOUS_FIRE_WEAPONS.includes(weaponName)) return 1;

  // `:758-760` — not reloading means full.
  if (reloadTime <= 0) return 1;

  // A zero max would be a division by zero in the AS3 too (NaN, then a bar of
  // NaN height). Treated as "nothing to show" rather than reproducing a NaN.
  if (reloadTimeMax <= 0) return 1;

  return clamp01(1 - reloadTime / reloadTimeMax);
}

export interface SecondaryBarInput {
  reloadTime: number;
  reloadTimeMax: number;
}

/**
 * How full the secondary bar is, 0-1 — `:766-772`.
 *
 * **Deliberately takes no countdown flag.** `:766` has no such branch, so the
 * secondary shows its real state during the opening countdown while the primary
 * reads empty. Adding the parameter "for symmetry" would be the tidy-up that
 * breaks it.
 */
export function secondaryBarFill(input: SecondaryBarInput): number {
  const { reloadTime, reloadTimeMax } = input;
  if (reloadTime <= 0) return 1;
  if (reloadTimeMax <= 0) return 1;
  return clamp01(1 - reloadTime / reloadTimeMax);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}
