/**
 * The tank's red flash when it takes a hit — `PartGameArea.as:2795-2803`.
 *
 * ── It is a ramp, not a flash ─────────────────────────────────────────────
 * `damageIndicator` is **set to 20 on a hit and decremented once per frame**
 * (`:1579` and `:5294` set it; `:2802` decrements). The tint intensity is
 * `damageIndicator / 20 * 0.8`, so it starts at 0.8 and fades to 0.04 over
 * two thirds of a second before `:2795` clears the tint entirely at zero.
 *
 * That distinction is the reason this is a module rather than two lines at the
 * call site. **A tint that never clears and one that clears the same frame
 * look identical in a still**, and a boolean "is damaged" implementation
 * produces a hard on/off that reads as a flicker rather than a hit. The ramp
 * is the whole effect.
 *
 * ── Two writers, one value ────────────────────────────────────────────────
 * `:1579` is an enemy bullet landing; `:5294` is an enemy reaching the tank.
 * Both assign 20 outright rather than adding, so a second hit mid-fade
 * **restarts** the ramp at full rather than stacking — which is what keeps a
 * crowd of enemies from pinning the tank solid red.
 *
 * ── The counterpart ───────────────────────────────────────────────────────
 * Enemies use the same `damageIndicator / 20 * 0.8` rule at `:4516`, already
 * ported as `Enemy.flashDamage`. The difference is that the enemy version is
 * driven by its own timer and carries a Strength/Weakness colour, where the
 * tank's is always red.
 */

/** `:1579` — the value a hit assigns. Also the divisor at `:2801`. */
export const DAMAGE_INDICATOR_FRAMES = 20;

/** `:2801` — the tint's intensity at full. */
export const DAMAGE_TINT_MAX = 0.8;

/** `:2801` — `colorClip(tank, 16711680, ...)`. */
export const DAMAGE_TINT_COLOUR = 0xff0000;

/**
 * The tint strength for a given counter, in 0..1.
 *
 * Zero means no tint at all — `:2795` takes the `uncolorClip` branch rather
 * than tinting by zero, and the two are the same thing to a renderer.
 */
export function damageTintStrength(indicator: number): number {
  if (indicator <= 0) return 0;
  return (indicator / DAMAGE_INDICATOR_FRAMES) * DAMAGE_TINT_MAX;
}

/**
 * Advances the counter one frame — `:2802`.
 *
 * Clamped at zero rather than allowed negative: the AS3 only decrements inside
 * the `!= 0` branch, so it can never go below zero there, and a negative here
 * would produce a *negative* tint strength on the next frame.
 */
export function tickDamageIndicator(indicator: number, frames = 1): number {
  return Math.max(0, indicator - frames);
}

/** A hit — `:1579`, `:5294`. Assigns rather than adds; see the note above. */
export function damageIndicatorOnHit(): number {
  return DAMAGE_INDICATOR_FRAMES;
}
