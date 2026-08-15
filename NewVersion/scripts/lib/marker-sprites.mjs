/**
 * The two off-screen marker clips, by SWF symbol id.
 *
 * Hand-kept like `bestiary-sprites.mjs`: the id only exists on the AS3 class's
 * `[Embed(... symbol="symbolNNN")]` line.
 *
 * `MarkerEnemy` has **2** frames — normal, and the Defense-mode danger frame
 * (`PartInterface.as:606-613`). `MarkerFlag` has **8**, one per direction,
 * clockwise from the top-left corner: 1 TL, 2 T, 3 TR, 4 R, 5 BR, 6 B, 7 BL,
 * 8 L. That ordering is read off `markTheFlag`'s `gotoAndStop` calls, not
 * guessed, and `gen-marker-art.mjs` asserts the counts.
 */
export const MARKER_SPRITE_IDS = Object.freeze({
  MarkerEnemy: 931,
  MarkerFlag: 940,
});
