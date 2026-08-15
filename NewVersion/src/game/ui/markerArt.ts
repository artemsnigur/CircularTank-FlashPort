/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run marker-art:data
 *
 * The two off-screen marker clips, one shape per frame. See
 * scripts/gen-marker-art.mjs for the frame contracts.
 *
 * Frame numbers are the AS3's own `gotoAndStop` arguments — 1-based.
 */

export interface MarkerClip {
  /** SWF symbol id, as named in the AS3 `[Embed]` line. */
  symbol: number;
  /** One shape per frame, frame 1 first. */
  shapes: readonly number[];
}

export const MARKER_CLIPS: Readonly<Record<string, MarkerClip>> = Object.freeze({
  MarkerEnemy: { symbol: 931, shapes: [929, 930] },
  MarkerFlag: { symbol: 940, shapes: [932, 933, 934, 935, 936, 937, 938, 939] },
});

/** Every shape the markers draw — what the asset sync must have copied. */
export const MARKER_SHAPE_IDS: readonly number[] = Object.freeze(
  [929,930,932,933,934,935,936,937,938,939],
);

/**
 * Loader entries, keyed `unit-<shapeId>` like the enemy and tank art so the
 * same preload group covers them.
 *
 * `width`/`height` are the rasterised size — authored size times
 * `UNIT_RASTER_SCALE` — and **the draw divides by that scale**, exactly as
 * every other oversampled group does.
 */
export const MARKER_SHAPE_FILES: readonly {
  key: string;
  file: string;
  width: number;
  height: number;
  /** Authored size, which is what a marker is drawn at. */
  nativeWidth: number;
  nativeHeight: number;
}[] = Object.freeze([
  { key: 'unit-929', file: '929.svg', width: 20, height: 36, nativeWidth: 5, nativeHeight: 9 },
  { key: 'unit-930', file: '930.svg', width: 83.8, height: 84, nativeWidth: 20.95, nativeHeight: 21 },
  { key: 'unit-932', file: '932.svg', width: 66, height: 66, nativeWidth: 16.5, nativeHeight: 16.5 },
  { key: 'unit-933', file: '933.svg', width: 64, height: 80, nativeWidth: 16, nativeHeight: 20 },
  { key: 'unit-934', file: '934.svg', width: 66, height: 66, nativeWidth: 16.5, nativeHeight: 16.5 },
  { key: 'unit-935', file: '935.svg', width: 80, height: 64, nativeWidth: 20, nativeHeight: 16 },
  { key: 'unit-936', file: '936.svg', width: 66, height: 66, nativeWidth: 16.5, nativeHeight: 16.5 },
  { key: 'unit-937', file: '937.svg', width: 64, height: 80, nativeWidth: 16, nativeHeight: 20 },
  { key: 'unit-938', file: '938.svg', width: 66, height: 66, nativeWidth: 16.5, nativeHeight: 16.5 },
  { key: 'unit-939', file: '939.svg', width: 80, height: 64, nativeWidth: 20, nativeHeight: 16 },
]);
