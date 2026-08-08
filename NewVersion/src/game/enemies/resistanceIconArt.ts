/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run resistance-icons:data
 *
 * The strength/weakness badge clips, frame by frame. See
 * scripts/gen-resistance-icons.mjs for how the frames are laid out and why
 * stacking the layers centred reproduces the original exactly.
 *
 * Frame numbers are the AS3's own `gotoAndStop` arguments — 1-based, and
 * mapped from a damage type by `resistanceIcons.ts`.
 */

/** SWF shape ids for one frame, back to front. */
export type IconFrameLayers = readonly number[];

export interface ResistanceIconClip {
  /** SWF symbol id, as named in the AS3 `[Embed]` line. */
  symbol: number;
  /** Frame 1 first — index 0 is `gotoAndStop(1)`. */
  frames: readonly IconFrameLayers[];
}

export const RESISTANCE_ICON_CLIPS: Readonly<Record<string, ResistanceIconClip>> =
  Object.freeze({
    IconStrongWeak2: {
      symbol: 1018,
      frames: [
        [997],
        [998, 999, 1000],
        [998, 1001, 1000],
        [998, 1002, 1000],
        [998, 1003, 1000],
        [998, 1004, 1000],
        [998, 1005, 1000],
        [998, 1006, 1000],
        [998, 1007, 1000],
        [1008, 1009, 1010],
        [1008, 1011, 1010],
        [1008, 1012, 1010],
        [1008, 1013, 1010],
        [1008, 1014, 1010],
        [1008, 1015, 1010],
        [1008, 1016, 1010],
        [1008, 1017, 1010],
      ],
    },
    IconStrongWeak: {
      symbol: 1033,
      frames: [
        [997],
        [998, 999, 1000],
        [998, 1027, 1000],
        [998, 1002, 1000],
        [998, 1003, 1000],
        [998, 1004, 1000],
        [998, 1005, 1000],
        [998, 1028, 1000],
        [998, 1029, 1000],
        [1008, 1009, 1010],
        [1008, 1030, 1010],
        [1008, 1012, 1010],
        [1008, 1013, 1010],
        [1008, 1014, 1010],
        [1008, 1015, 1010],
        [1008, 1031, 1010],
        [1008, 1032, 1010],
      ],
    },
  });

/** Every shape id either clip draws — what the asset sync must have copied. */
export const RESISTANCE_ICON_SHAPE_IDS: readonly number[] = Object.freeze(
  [997,998,999,1000,1001,1002,1003,1004,1005,1006,1007,1008,1009,1010,1011,1012,1013,1014,1015,1016,1017,1027,1028,1029,1030,1031,1032],
);
