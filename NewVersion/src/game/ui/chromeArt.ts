/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run chrome-art:data
 *
 * The UI chrome — screen titles, the bottom navigation bar, panels and the
 * action buttons. See scripts/gen-chrome-art.mjs for how the layout is derived
 * and scripts/lib/chrome-sprites.mjs for what each symbol is.
 *
 * **Every screen title in this game is vector art, not text.** That is the
 * whole reason this file exists: the original's headers carry a per-letter
 * gradient inside a black outline, which is a picture, and reproducing it with
 * a web font would be an approximation of something already extracted.
 *
 * Frame numbers are 1-based, as the AS3's own `gotoAndStop` arguments are.
 */

export interface ChromeLayer {
  /** DefineShape id — `shapes/<id>.svg`. */
  shape: number;
  /** Position inside the clip's box, in the SWF's units. */
  x: number;
  y: number;
  /** Drawn size — the shape's exported box times its placement scale. */
  width: number;
  height: number;
}

export interface ChromeFrame {
  frame: number;
  layers: readonly ChromeLayer[];
}

export interface ChromeClip {
  /** SWF symbol id, as named in the AS3 `[Embed]` line. */
  symbol: number;
  /**
   * The clip's natural size — the union of every frame's layers, not frame
   * one's. A button whose active frame is larger must not resize its box when
   * it lights up.
   */
  width: number;
  height: number;
  frames: readonly ChromeFrame[];
}

export const CHROME_CLIPS: Readonly<Record<string, ChromeClip>> = Object.freeze({
  TitleMainMenu: {
    symbol: 394,
    width: 445.25,
    height: 45.7,
    frames: [
      { frame: 1, layers: [{ shape: 393, x: 0, y: 0, width: 445.25, height: 45.7 }] },
    ],
  },
  TitleLevelSelect: {
    symbol: 388,
    width: 402.35,
    height: 45.5,
    frames: [
      { frame: 1, layers: [{ shape: 387, x: 0, y: 0, width: 402.35, height: 45.5 }] },
    ],
  },
  TitleUpgrades: {
    symbol: 386,
    width: 310.65,
    height: 45.7,
    frames: [
      { frame: 1, layers: [{ shape: 385, x: 0, y: 0, width: 310.65, height: 45.7 }] },
    ],
  },
  TitleOptions: {
    symbol: 384,
    width: 263.7,
    height: 46,
    frames: [
      { frame: 1, layers: [{ shape: 383, x: 0, y: 0, width: 263.7, height: 46 }] },
    ],
  },
  TitleEnemies: {
    symbol: 380,
    width: 254.4,
    height: 45.5,
    frames: [
      { frame: 1, layers: [{ shape: 379, x: 0, y: 0, width: 254.4, height: 45.5 }] },
    ],
  },
  TitleAchievements: {
    symbol: 378,
    width: 453,
    height: 45.5,
    frames: [
      { frame: 1, layers: [{ shape: 377, x: 0, y: 0, width: 453, height: 45.5 }] },
    ],
  },
  TitleVictory: {
    symbol: 392,
    width: 253.35,
    height: 45.95,
    frames: [
      { frame: 1, layers: [{ shape: 391, x: 0, y: 0, width: 253.35, height: 45.95 }] },
    ],
  },
  TitleDefeat: {
    symbol: 390,
    width: 223.35,
    height: 45.5,
    frames: [
      { frame: 1, layers: [{ shape: 389, x: 0, y: 0, width: 223.35, height: 45.5 }] },
    ],
  },
  BackgroundBottom: {
    symbol: 848,
    width: 640,
    height: 48,
    frames: [
      { frame: 1, layers: [{ shape: 847, x: 0, y: 0, width: 640, height: 48 }] },
    ],
  },
  ButtonUpgrades: {
    symbol: 456,
    width: 200,
    height: 40,
    frames: [
      { frame: 1, layers: [{ shape: 445, x: 0, y: 0, width: 200, height: 40 }, { shape: 446, x: 32.1, y: 10, width: 135.8, height: 20 }, { shape: 448, x: 32.1, y: 10, width: 135.8, height: 20 }] },
      { frame: 2, layers: [{ shape: 449, x: 0, y: 0, width: 200, height: 40 }, { shape: 446, x: 32.1, y: 10, width: 135.8, height: 20 }, { shape: 448, x: 32.1, y: 10, width: 135.8, height: 20 }] },
      { frame: 3, layers: [{ shape: 450, x: 0, y: 0, width: 200, height: 40 }, { shape: 446, x: 32.1, y: 10, width: 135.8, height: 20 }, { shape: 448, x: 32.1, y: 10, width: 135.8, height: 20 }] },
      { frame: 4, layers: [{ shape: 451, x: 0, y: 0, width: 200, height: 40 }, { shape: 446, x: 32.1, y: 10, width: 135.8, height: 20 }, { shape: 448, x: 32.1, y: 10, width: 135.8, height: 20 }] },
      { frame: 5, layers: [{ shape: 452, x: 0, y: 0, width: 200, height: 40 }, { shape: 446, x: 32.1, y: 10, width: 135.8, height: 20 }, { shape: 448, x: 32.1, y: 10, width: 135.8, height: 20 }] },
      { frame: 6, layers: [{ shape: 453, x: 0, y: 0, width: 200, height: 40 }, { shape: 446, x: 32.1, y: 10, width: 135.8, height: 20 }, { shape: 448, x: 32.1, y: 10, width: 135.8, height: 20 }] },
      { frame: 7, layers: [{ shape: 454, x: 0, y: 0, width: 200, height: 40 }, { shape: 446, x: 32.1, y: 10, width: 135.8, height: 20 }, { shape: 455, x: 32.1, y: 10, width: 135.8, height: 20 }] },
    ],
  },
  ButtonLevelSelect: {
    symbol: 595,
    width: 200,
    height: 40,
    frames: [
      { frame: 1, layers: [{ shape: 445, x: 0, y: 0, width: 200, height: 40 }, { shape: 591, x: 12.05, y: 10.05, width: 175.9, height: 19.9 }, { shape: 593, x: 12.05, y: 10.05, width: 175.9, height: 19.9 }] },
      { frame: 2, layers: [{ shape: 449, x: 0, y: 0, width: 200, height: 40 }, { shape: 591, x: 12.05, y: 10.05, width: 175.9, height: 19.9 }, { shape: 593, x: 12.05, y: 10.05, width: 175.9, height: 19.9 }] },
      { frame: 3, layers: [{ shape: 450, x: 0, y: 0, width: 200, height: 40 }, { shape: 591, x: 12.05, y: 10.05, width: 175.9, height: 19.9 }, { shape: 593, x: 12.05, y: 10.05, width: 175.9, height: 19.9 }] },
      { frame: 4, layers: [{ shape: 454, x: 0, y: 0, width: 200, height: 40 }, { shape: 591, x: 12.05, y: 10.05, width: 175.9, height: 19.9 }, { shape: 594, x: 12.05, y: 10.05, width: 175.9, height: 19.9 }] },
    ],
  },
  ButtonAchievements: {
    symbol: 565,
    width: 41,
    height: 40,
    frames: [
      { frame: 1, layers: [{ shape: 546, x: 0, y: 0, width: 41, height: 40 }, { shape: 561, x: 11, y: 3, width: 18, height: 34 }, { shape: 563, x: 11, y: 3, width: 18, height: 34 }] },
      { frame: 2, layers: [{ shape: 549, x: 0, y: 0, width: 41, height: 40 }, { shape: 561, x: 11, y: 3, width: 18, height: 34 }, { shape: 563, x: 11, y: 3, width: 18, height: 34 }] },
      { frame: 3, layers: [{ shape: 550, x: 0, y: 0, width: 41, height: 40 }, { shape: 561, x: 11, y: 3, width: 18, height: 34 }, { shape: 563, x: 11, y: 3, width: 18, height: 34 }] },
      { frame: 4, layers: [{ shape: 551, x: 0, y: 0, width: 41, height: 40 }, { shape: 561, x: 11, y: 3, width: 18, height: 34 }, { shape: 564, x: 11, y: 3, width: 18, height: 34 }] },
    ],
  },
  ButtonEnemies: {
    symbol: 553,
    width: 41,
    height: 40,
    frames: [
      { frame: 1, layers: [{ shape: 546, x: 0, y: 0, width: 41, height: 40 }, { shape: 187, x: 5, y: 5, width: 30, height: 30 }, { shape: 548, x: 5, y: 5, width: 30, height: 30 }] },
      { frame: 2, layers: [{ shape: 549, x: 0, y: 0, width: 41, height: 40 }, { shape: 187, x: 5, y: 5, width: 30, height: 30 }, { shape: 548, x: 5, y: 5, width: 30, height: 30 }] },
      { frame: 3, layers: [{ shape: 550, x: 0, y: 0, width: 41, height: 40 }, { shape: 187, x: 5, y: 5, width: 30, height: 30 }, { shape: 548, x: 5, y: 5, width: 30, height: 30 }] },
      { frame: 4, layers: [{ shape: 551, x: 0, y: 0, width: 41, height: 40 }, { shape: 187, x: 5, y: 5, width: 30, height: 30 }, { shape: 552, x: 5, y: 5, width: 30, height: 30 }] },
    ],
  },
  ButtonMenu: {
    symbol: 576,
    width: 41,
    height: 40,
    frames: [
      { frame: 1, layers: [{ shape: 546, x: 0, y: 0, width: 41, height: 40 }, { shape: 573, x: 6, y: 9, width: 28, height: 22 }, { shape: 575, x: 6, y: 9, width: 28, height: 22 }] },
      { frame: 2, layers: [{ shape: 549, x: 0, y: 0, width: 41, height: 40 }, { shape: 573, x: 6, y: 9, width: 28, height: 22 }, { shape: 575, x: 6, y: 9, width: 28, height: 22 }] },
      { frame: 3, layers: [{ shape: 550, x: 0, y: 0, width: 41, height: 40 }, { shape: 573, x: 6, y: 9, width: 28, height: 22 }, { shape: 575, x: 6, y: 9, width: 28, height: 22 }] },
    ],
  },
  ButtonOptions: {
    symbol: 582,
    width: 41,
    height: 40,
    frames: [
      { frame: 1, layers: [{ shape: 546, x: 0, y: 0, width: 41, height: 40 }, { shape: 577, x: 4.1, y: 4.05, width: 31.85, height: 31.85 }, { shape: 580, x: 4.1, y: 4.05, width: 31.85, height: 31.85 }] },
      { frame: 2, layers: [{ shape: 549, x: 0, y: 0, width: 41, height: 40 }, { shape: 577, x: 4.1, y: 4.05, width: 31.85, height: 31.85 }, { shape: 580, x: 4.1, y: 4.05, width: 31.85, height: 31.85 }] },
      { frame: 3, layers: [{ shape: 550, x: 0, y: 0, width: 41, height: 40 }, { shape: 577, x: 4.1, y: 4.05, width: 31.85, height: 31.85 }, { shape: 580, x: 4.1, y: 4.05, width: 31.85, height: 31.85 }] },
      { frame: 4, layers: [{ shape: 551, x: 0, y: 0, width: 41, height: 40 }, { shape: 577, x: 4.1, y: 4.05, width: 31.85, height: 31.85 }, { shape: 581, x: 4.1, y: 4.05, width: 31.85, height: 31.85 }] },
    ],
  },
  BackgroundTitle: {
    symbol: 928,
    width: 640,
    height: 88,
    frames: [
      { frame: 1, layers: [{ shape: 167, x: 0, y: 0, width: 640, height: 88 }] },
    ],
  },
  IconShield: {
    symbol: 980,
    width: 20,
    height: 20,
    frames: [
      { frame: 1, layers: [{ shape: 976, x: 0, y: 0, width: 20, height: 20 }, { shape: 977, x: 1, y: 1, width: 18, height: 18 }] },
      { frame: 2, layers: [{ shape: 976, x: 0, y: 0, width: 20, height: 20 }, { shape: 978, x: 1, y: 1, width: 18, height: 18 }] },
      { frame: 3, layers: [{ shape: 976, x: 0, y: 0, width: 20, height: 20 }, { shape: 979, x: 1, y: 1, width: 18, height: 18 }] },
    ],
  },
  BackgroundSquareBig: {
    symbol: 901,
    width: 640,
    height: 344,
    frames: [
      { frame: 1, layers: [{ shape: 900, x: 0, y: 0, width: 640, height: 344 }] },
    ],
  },
  BackgroundWindow: {
    symbol: 905,
    width: 230,
    height: 344,
    frames: [
      { frame: 1, layers: [{ shape: 904, x: 0, y: 0, width: 230, height: 344 }] },
    ],
  },
  BackgroundWindowBar: {
    symbol: 859,
    width: 230,
    height: 32,
    frames: [
      { frame: 1, layers: [{ shape: 856, x: 0, y: 0, width: 230, height: 32 }] },
    ],
  },
  BackgroundUpgradeMenu: {
    symbol: 973,
    width: 640,
    height: 352,
    frames: [
      { frame: 1, layers: [{ shape: 971, x: 0, y: 0, width: 640, height: 352 }] },
    ],
  },
  ButtonPlay: {
    symbol: 29,
    width: 138,
    height: 40,
    frames: [
      { frame: 1, layers: [{ shape: 23, x: 0, y: 0, width: 138, height: 40 }, { shape: 24, x: 39.5, y: 10, width: 59.6, height: 19.9 }, { shape: 26, x: 39.5, y: 10, width: 59.6, height: 19.9 }] },
      { frame: 2, layers: [{ shape: 27, x: 0, y: 0, width: 138, height: 40 }, { shape: 24, x: 39.5, y: 10, width: 59.6, height: 19.9 }, { shape: 26, x: 39.5, y: 10, width: 59.6, height: 19.9 }] },
      { frame: 3, layers: [{ shape: 28, x: 0, y: 0, width: 138, height: 40 }, { shape: 24, x: 39.5, y: 10, width: 59.6, height: 19.9 }, { shape: 26, x: 39.5, y: 10, width: 59.6, height: 19.9 }] },
    ],
  },
  ButtonPlayLevel: {
    symbol: 444,
    width: 222,
    height: 40,
    frames: [
      { frame: 1, layers: [{ shape: 438, x: 0, y: 0, width: 222, height: 40 }, { shape: 439, x: 39.5, y: 10, width: 143.6, height: 19.9 }, { shape: 441, x: 39.5, y: 10, width: 143.6, height: 19.9 }] },
      { frame: 2, layers: [{ shape: 442, x: 0, y: 0, width: 222, height: 40 }, { shape: 439, x: 39.5, y: 10, width: 143.6, height: 19.9 }, { shape: 441, x: 39.5, y: 10, width: 143.6, height: 19.9 }] },
      { frame: 3, layers: [{ shape: 443, x: 0, y: 0, width: 222, height: 40 }, { shape: 439, x: 39.5, y: 10, width: 143.6, height: 19.9 }, { shape: 441, x: 39.5, y: 10, width: 143.6, height: 19.9 }] },
    ],
  },
  ButtonDifficultyEasy: {
    symbol: 545,
    width: 71,
    height: 20,
    frames: [
      { frame: 1, layers: [{ shape: 540, x: 0, y: 0, width: 71, height: 20 }, { shape: 541, x: 19.25, y: 5.05, width: 33.5, height: 9.9 }, { shape: 543, x: 19.25, y: 5.05, width: 33.5, height: 9.9 }] },
      { frame: 2, layers: [{ shape: 544, x: 0, y: 0, width: 71, height: 20 }, { shape: 541, x: 19.25, y: 5.05, width: 33.5, height: 9.9 }, { shape: 543, x: 19.25, y: 5.05, width: 33.5, height: 9.9 }] },
      { frame: 3, layers: [{ shape: 540, x: 0, y: 0, width: 71, height: 20 }, { shape: 541, x: 19.25, y: 5.05, width: 33.5, height: 9.9 }, { shape: 541, x: 19.25, y: 5.05, width: 33.5, height: 9.9 }] },
    ],
  },
  ButtonDifficultyMedium: {
    symbol: 468,
    width: 71,
    height: 20,
    frames: [
      { frame: 1, layers: [{ shape: 463, x: 0, y: 0, width: 71, height: 20 }, { shape: 464, x: 10.8, y: 5, width: 50.2, height: 10 }, { shape: 466, x: 10.8, y: 5, width: 50.2, height: 10 }] },
      { frame: 2, layers: [{ shape: 467, x: 0, y: 0, width: 71, height: 20 }, { shape: 464, x: 10.8, y: 5, width: 50.2, height: 10 }, { shape: 466, x: 10.8, y: 5, width: 50.2, height: 10 }] },
      { frame: 3, layers: [{ shape: 463, x: 0, y: 0, width: 71, height: 20 }, { shape: 464, x: 10.8, y: 5, width: 50.2, height: 10 }, { shape: 464, x: 10.8, y: 5, width: 50.2, height: 10 }] },
    ],
  },
  ButtonDifficultyHard: {
    symbol: 462,
    width: 71,
    height: 20,
    frames: [
      { frame: 1, layers: [{ shape: 457, x: 0, y: 0, width: 71, height: 20 }, { shape: 458, x: 18.6, y: 5.1, width: 34.9, height: 9.9 }, { shape: 460, x: 18.6, y: 5.1, width: 34.9, height: 9.9 }] },
      { frame: 2, layers: [{ shape: 461, x: 0, y: 0, width: 71, height: 20 }, { shape: 458, x: 18.6, y: 5.1, width: 34.9, height: 9.9 }, { shape: 460, x: 18.6, y: 5.1, width: 34.9, height: 9.9 }] },
      { frame: 3, layers: [{ shape: 457, x: 0, y: 0, width: 71, height: 20 }, { shape: 458, x: 18.6, y: 5.1, width: 34.9, height: 9.9 }, { shape: 458, x: 18.6, y: 5.1, width: 34.9, height: 9.9 }] },
    ],
  },
});

/** Every shape the chrome draws — what the asset sync must have copied. */
export const CHROME_SHAPE_IDS: readonly number[] = Object.freeze(
  [23,24,26,27,28,167,187,377,379,383,385,387,389,391,393,438,439,441,442,443,445,446,448,449,450,451,452,453,454,455,457,458,460,461,463,464,466,467,540,541,543,544,546,548,549,550,551,552,561,563,564,573,575,577,580,581,591,593,594,847,856,900,904,971,976,977,978,979],
);
