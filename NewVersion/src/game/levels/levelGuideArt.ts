/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run level-guide-art:data
 *
 * The level guide widget's clips, frame by frame. See
 * scripts/gen-level-guide-art.mjs for the frame layouts.
 *
 * Frame numbers are the AS3's own `gotoAndStop` arguments — 1-based.
 */

/** SWF shape ids for one frame, back to front. */
export type GuideFrameLayers = readonly number[];

export interface LevelGuideClip {
  /** SWF symbol id, as named in the AS3 `[Embed]` line. */
  symbol: number;
  /** Frame 1 first — index 0 is `gotoAndStop(1)`. */
  frames: readonly GuideFrameLayers[];
}

export const LEVEL_GUIDE_CLIPS: Readonly<Record<string, LevelGuideClip>> = Object.freeze({
  Background: {
    symbol: 1434,
    frames: [
      [1430, 1431, 1433],
    ],
  },
  Arrow: {
    symbol: 196,
    frames: [
      [187, 188],
      [187, 189],
      [187, 190],
      [187, 191],
      [187, 192],
      [187, 193],
      [187, 194],
      [187, 195],
    ],
  },
  AutoSelect: {
    symbol: 1452,
    frames: [
      [1448, 1449],
      [1448, 1450],
      [1451, 1449],
      [1451, 1450],
    ],
  },
  Info: {
    symbol: 1437,
    frames: [
      [1435],
      [1436],
    ],
  },
  Previous: {
    symbol: 1442,
    frames: [
      [1438, 1439],
      [1438, 1440],
      [1441],
    ],
  },
  Last: {
    symbol: 1447,
    frames: [
      [1443, 1444],
      [1443, 1445],
      [1446],
    ],
  },
  Upcoming: {
    symbol: 1457,
    frames: [
      [1453, 1454],
      [1453, 1455],
      [1456],
    ],
  },
});

/** Every shape id the widget draws — what the asset sync must have copied. */
export const LEVEL_GUIDE_SHAPE_IDS: readonly number[] = Object.freeze(
  [187,188,189,190,191,192,193,194,195,1430,1431,1433,1435,1436,1438,1439,1440,1441,1443,1444,1445,1446,1448,1449,1450,1451,1453,1454,1455,1456],
);
