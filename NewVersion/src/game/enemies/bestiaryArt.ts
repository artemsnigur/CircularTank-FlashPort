/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run bestiary-art:data
 *
 * The 20 `ButtonEnemy<Type>` bestiary tiles, frame by frame. See
 * scripts/gen-bestiary-art.mjs for the layer layout and the checks that keep
 * it true.
 *
 * Frame numbers are the AS3's own `gotoAndStop` arguments — 1-based. Which
 * frame a tile draws is `ButtonEnemy.as:78-112`, and the one that matters
 * here is **frame 4**: every `notDiscovered` branch falls through to it, so an
 * unmet enemy is hidden by the original's own art rather than by a silhouette
 * this port invented.
 */

/** SWF shape ids for one frame, back to front: `[plate, overlay, glyph]`. */
export type BestiaryTileLayers = readonly number[];

export interface BestiaryTileClip {
  /** SWF symbol id, as named in the AS3 `[Embed]` line. */
  symbol: number;
  /** Frame 1 first — index 0 is `gotoAndStop(1)`. */
  frames: readonly BestiaryTileLayers[];
}

/** `ButtonEnemy.as` frame numbers, named so a call site cannot mean 4 by accident. */
export const BESTIARY_TILE_FRAME = Object.freeze({
  /** `:105` — resting. */
  normal: 1,
  /** `:96` — cursor over. */
  hover: 2,
  /** `:90`, and on press at `:47`. */
  selected: 3,
  /** `:109` — not yet discovered. */
  locked: 4,
});

/** The "?" glyph frame 4 draws in place of an enemy, shared by all 20 tiles. */
export const BESTIARY_LOCKED_GLYPH = 739;

export const BESTIARY_TILE_CLIPS: Readonly<Record<string, BestiaryTileClip>> = Object.freeze({
  Basic: {
    symbol: 778,
    frames: [
      [734, 735, 777],
      [737, 735, 777],
      [738, 735, 777],
      [734, 735, 739],
    ],
  },
  Fast: {
    symbol: 750,
    frames: [
      [734, 735, 749],
      [737, 735, 749],
      [738, 735, 749],
      [734, 735, 739],
    ],
  },
  Shooting: {
    symbol: 748,
    frames: [
      [734, 735, 747],
      [737, 735, 747],
      [738, 735, 747],
      [734, 735, 739],
    ],
  },
  Strong: {
    symbol: 746,
    frames: [
      [734, 735, 745],
      [737, 735, 745],
      [738, 735, 745],
      [734, 735, 739],
    ],
  },
  Shrinking: {
    symbol: 770,
    frames: [
      [734, 735, 769],
      [737, 735, 769],
      [738, 735, 769],
      [734, 735, 739],
    ],
  },
  Ghost: {
    symbol: 752,
    frames: [
      [734, 735, 751],
      [737, 735, 751],
      [738, 735, 751],
      [734, 735, 739],
    ],
  },
  Trap: {
    symbol: 744,
    frames: [
      [734, 735, 743],
      [737, 735, 743],
      [738, 735, 743],
      [734, 735, 739],
    ],
  },
  Temperamental: {
    symbol: 742,
    frames: [
      [734, 735, 741],
      [737, 735, 741],
      [738, 735, 741],
      [734, 735, 739],
    ],
  },
  Ninja: {
    symbol: 754,
    frames: [
      [734, 735, 753],
      [737, 735, 753],
      [738, 735, 753],
      [734, 735, 739],
    ],
  },
  Accelerating: {
    symbol: 756,
    frames: [
      [734, 735, 755],
      [737, 735, 755],
      [738, 735, 755],
      [734, 735, 739],
    ],
  },
  Crazy: {
    symbol: 758,
    frames: [
      [734, 735, 757],
      [737, 735, 757],
      [738, 735, 757],
      [734, 735, 739],
    ],
  },
  Medic: {
    symbol: 760,
    frames: [
      [734, 735, 759],
      [737, 735, 759],
      [738, 735, 759],
      [734, 735, 739],
    ],
  },
  ScaredGhost: {
    symbol: 762,
    frames: [
      [734, 735, 761],
      [737, 735, 761],
      [738, 735, 761],
      [734, 735, 739],
    ],
  },
  DamageAddict: {
    symbol: 764,
    frames: [
      [734, 735, 763],
      [737, 735, 763],
      [738, 735, 763],
      [734, 735, 739],
    ],
  },
  Random: {
    symbol: 766,
    frames: [
      [734, 735, 765],
      [737, 735, 765],
      [738, 735, 765],
      [734, 735, 739],
    ],
  },
  Exploding: {
    symbol: 768,
    frames: [
      [734, 735, 767],
      [737, 735, 767],
      [738, 735, 767],
      [734, 735, 739],
    ],
  },
  Tiny: {
    symbol: 740,
    frames: [
      [734, 735, 736],
      [737, 735, 736],
      [738, 735, 736],
      [734, 735, 739],
    ],
  },
  GrapplingHook: {
    symbol: 772,
    frames: [
      [734, 735, 771],
      [737, 735, 771],
      [738, 735, 771],
      [734, 735, 739],
    ],
  },
  Teleporting: {
    symbol: 774,
    frames: [
      [734, 735, 773],
      [737, 735, 773],
      [738, 735, 773],
      [734, 735, 739],
    ],
  },
  Soldier: {
    symbol: 776,
    frames: [
      [734, 735, 775],
      [737, 735, 775],
      [738, 735, 775],
      [734, 735, 739],
    ],
  },
});

/** Every shape id the tiles draw — what the asset sync must have copied. */
export const BESTIARY_TILE_SHAPE_IDS: readonly number[] = Object.freeze(
  [734,735,736,737,738,739,741,743,745,747,749,751,753,755,757,759,761,763,765,767,769,771,773,775,777],
);
