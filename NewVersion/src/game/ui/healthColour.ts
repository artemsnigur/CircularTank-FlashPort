/**
 * The health bar's colour, interpolated from the fraction of health left.
 *
 * ── Why this is not CSS ──────────────────────────────────────────────────
 * The bar used to paint a red-amber-green gradient sized to the bar's full
 * width, so the colour at any point was a property of *where you looked along
 * the bar* rather than of how much health was left. At full health the bar
 * showed all three colours at once, red end included. That is a different
 * thing from "green at full, red at empty", which is what this computes: one
 * flat colour for the whole fill, chosen by the fraction remaining.
 *
 * A CSS `color-mix()` between two colours would do a two-stop version of this,
 * but the midpoint matters — a straight red-to-green mix passes through a
 * muddy olive at 50%, where the amber stop keeps it legible. Three stops in a
 * function are also testable without a browser, which a `color-mix()` in a
 * stylesheet is not.
 *
 * ── The stops ────────────────────────────────────────────────────────────
 * The same three colours, at the same three positions, as the gradient this
 * replaced (`0%`, `45%`, `100%`). So the colour shown at a given health level
 * is the colour the old bar showed at that point along its length — the
 * mapping changed, the palette did not.
 */

/** A stop on the ramp: `at` is the fraction of health it applies to. */
interface Stop {
  readonly at: number;
  readonly rgb: readonly [number, number, number];
}

/**
 * Empty to full. `at` values must be ascending and span 0..1, which
 * `healthColour` relies on rather than re-checking per call.
 */
export const HEALTH_STOPS: readonly Stop[] = [
  { at: 0, rgb: [180, 35, 29] }, // #b4231d
  { at: 0.45, rgb: [232, 178, 58] }, // #e8b23a
  { at: 1, rgb: [74, 222, 106] }, // #4ade6a
];

/**
 * The fill colour at `fraction` health remaining, as a CSS `rgb(...)`.
 *
 * Values outside 0..1 clamp rather than extrapolating: health can exceed its
 * maximum through an upgrade, and extrapolating the ramp past its green stop
 * would run the colour off into something that is not on the palette at all.
 */
export function healthColour(fraction: number): string {
  const f = Math.min(1, Math.max(0, Number.isFinite(fraction) ? fraction : 0));

  // The last stop at or below `f`. The final stop is never chosen as the
  // *lower* end except at exactly 1, which the clamp below handles.
  let lower = HEALTH_STOPS[0];
  let upper = HEALTH_STOPS[HEALTH_STOPS.length - 1];
  for (let i = 0; i < HEALTH_STOPS.length - 1; i += 1) {
    if (f >= HEALTH_STOPS[i].at && f <= HEALTH_STOPS[i + 1].at) {
      lower = HEALTH_STOPS[i];
      upper = HEALTH_STOPS[i + 1];
      break;
    }
  }

  const span = upper.at - lower.at;
  // A zero-width segment would divide by zero; it can only arise from a
  // malformed stop table, and landing on the lower stop is the sane answer.
  const t = span > 0 ? (f - lower.at) / span : 0;

  const mix = (a: number, b: number): number => Math.round(a + (b - a) * t);
  const r = mix(lower.rgb[0], upper.rgb[0]);
  const g = mix(lower.rgb[1], upper.rgb[1]);
  const b = mix(lower.rgb[2], upper.rgb[2]);

  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * How red the colour reads, as `red - green`.
 *
 * Exported for the test rather than for the game: it is the quantity that has
 * to fall monotonically as health rises, and neither channel does so on its
 * own — red runs 180 up to 232 and back down to 74 across the ramp. Asserting
 * on a single channel would fail on a perfectly good ramp.
 */
export function redness(css: string): number {
  const m = /rgb\((\d+), (\d+), (\d+)\)/.exec(css);
  if (!m) throw new Error(`not an rgb() string: ${css}`);
  return Number(m[1]) - Number(m[2]);
}
