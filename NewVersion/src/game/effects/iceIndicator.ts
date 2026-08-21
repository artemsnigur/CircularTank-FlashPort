/**
 * The ice block a frozen enemy wears — `IndicatorIce` (symbol 1190).
 *
 * ── It is an overlay, not a tint ──────────────────────────────────────────
 * Worth stating because the obvious port is a cyan `setTint`, and that is not
 * what the original does. `:5869` builds a separate display object on its own
 * `iceIndicatorLayer`, positions it on the enemy each frame, and removes it on
 * the thaw. The enemy's own colours are never touched — a frozen red enemy is
 * still red, under ice.
 *
 * The art was already extracted, synced and registered as `unit-1184` through
 * `unit-1189` before this. **Nothing drew it**, which is this project's most
 * common shape of gap: the asset pipeline finished and the render never
 * started. `manifest.ts` has carried all six since the indicator pass.
 *
 * ── The six frames ────────────────────────────────────────────────────────
 * `:5871-5878` — an ordinary enemy takes one of frames 1-3 and a boss one of
 * 4-6, chosen once at freeze time and never re-rolled. Both are
 * `Math.round(Math.random() * 2 + n)`, which is **not** a uniform draw over
 * three: rounding sends `[0, 0.5)` to the first frame, `[0.5, 1.5)` to the
 * second and `[1.5, 2]` to the third, so the middle frame comes up half the
 * time and the outer two a quarter each. Reproduced rather than corrected —
 * the distribution is the original's and nothing depends on it being flat.
 */

/** `:5872` — ordinary enemies. `:5876` — bosses. */
export const ICE_FRAMES_NORMAL = [1, 2, 3] as const;
export const ICE_FRAMES_BOSS = [4, 5, 6] as const;

/** `:5879-5880` — the block is authored for a 50-unit radius. */
export const ICE_REFERENCE_RADIUS = 50;

/** `:6339` — the last second of the freeze is a fade-and-shrink. */
export const ICE_THAW_FRAMES = 30;

/**
 * The frame this enemy's block draws, 1-6.
 *
 * `random` is injected so the distribution above can be driven at its
 * boundaries rather than sampled and hoped over.
 */
export function pickIceFrame(isBoss: boolean, random: () => number = Math.random): number {
  const base = isBoss ? 4 : 1;
  return Math.round(random() * 2 + base);
}

export interface IceIndicatorInput {
  /** The host's collision radius — `theEnemy.radius`. */
  radius: number;
  /** Frames of freeze left. */
  frozenTimer: number;
}

export interface IceIndicatorView {
  /** Multiplier on the art's authored size. */
  scale: number;
  alpha: number;
}

/**
 * Scale and alpha for one frame of a live freeze — `:6337-6349`.
 *
 * Above `ICE_THAW_FRAMES` the block sits at its full size and full opacity.
 * Below it, **both** ramp down together: the alpha to 0.1 and the scale by a
 * flat 0.1 — note that is 0.1 in absolute scale units, not a tenth of the
 * block, so a small enemy's ice shrinks proportionally more than a boss's.
 * That is the AS3's arithmetic (`normalSize - 0.1 + 0.1 * t`), and it reads as
 * the ice cracking away rather than simply fading.
 */
export function iceIndicatorView(input: IceIndicatorInput): IceIndicatorView {
  const normalSize = input.radius / ICE_REFERENCE_RADIUS;
  const timer = Math.max(0, input.frozenTimer);

  if (timer >= ICE_THAW_FRAMES) return { scale: normalSize, alpha: 1 };

  const t = timer / ICE_THAW_FRAMES;
  return {
    alpha: 0.1 + 0.9 * t,
    /*
     * Clamped at zero, which the AS3 does not do.
     *
     * `normalSize - 0.1` goes negative below a radius of 5, and a negative
     * scale in Flash or in Phaser **mirrors** the art rather than hiding it —
     * so the block would flip at the moment it should be crumbling away.
     *
     * The AS3 has the same hole and never falls in it, because no enemy it
     * spawns is that small. This port has the same enemies, but a `Shrinking`
     * enemy's radius is a *live* value (`:6773` scales it to a third at zero
     * health), and a third of the smallest starting radius is under five. So
     * the case the original could not reach is reachable here.
     */
    scale: Math.max(0, normalSize - 0.1 + 0.1 * t),
  };
}
