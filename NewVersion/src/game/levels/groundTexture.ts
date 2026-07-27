/**
 * Which ground texture a level draws, and at what scale.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * `351_upscale.png` is a 4x upscale of the Desert tile (1024x1024 against
 * 256x256). Resolution does not change how big a room is — that is
 * `roomWidth`/`roomHeight` — so the only question it answers is how the floor
 * *looks*. There are two defensible answers and they look different, so both
 * are wired, on different levels, to be compared side by side in game.
 *
 *   1-1  same layout, 4x pixel density   `tileScale` 0.25
 *        One tile still covers 256 design units, so the repeat pattern is
 *        identical to today and only the sharpness changes. Safe: no art
 *        direction is altered.
 *
 *   1-6  one non-repeating image         `tileScale` 1
 *        One texel per design unit, so the tile covers 1024x1024 units and the
 *        800x600 room fits inside it with no repetition at all. Removes the
 *        tiling pattern, but renders every ground feature 4x larger than the
 *        original art intended.
 *
 * Everything else keeps the extracted 256x256 tile.
 *
 * ── The 1024 figure is load-bearing for 1-6 ───────────────────────────────
 * "Non-repeating" holds only while the room fits inside one tile. At 800x600 it
 * does, with room to spare; a larger room would silently start repeating and
 * the comparison would stop meaning anything. `groundTexture.test.ts` asserts
 * that rather than trusting it.
 */

/** Design units covered by one tile of the upscaled texture at scale 1. */
export const UPSCALE_TEXTURE_SIZE = 1024;

/** Design units covered by one tile of the original texture at scale 1. */
export const BASE_TEXTURE_SIZE = 256;

export interface GroundChoice {
  /** Texture key, as registered in `assets/manifest.ts`. */
  key: string;
  /**
   * Multiplier applied to the texture when tiling.
   *
   * `1` draws one texel per design unit. `0.25` shrinks a 1024 texture so it
   * occupies the 256 units the original tile did.
   */
  tileScale: number;
  /** Why this level differs, for the comparison. Absent on the default. */
  note?: string;
}

export const DEFAULT_GROUND: GroundChoice = { key: 'ground-desert', tileScale: 1 };

/**
 * The two comparison levels, keyed `world-level`.
 *
 * Explicit rather than derived: this is an A/B for a pending decision, not a
 * rule, and naming the levels keeps it obvious that everything else is
 * untouched.
 */
const COMPARISON: Readonly<Record<string, GroundChoice>> = {
  // Option 1 — sharper, identical layout.
  '1-1': {
    key: 'ground-desert-hi',
    tileScale: BASE_TEXTURE_SIZE / UPSCALE_TEXTURE_SIZE,
    note: '4x density, same 256-unit tiling',
  },
  // Option 2 — no repetition, features 4x larger.
  '1-6': {
    key: 'ground-desert-hi',
    tileScale: 1,
    note: 'single 1024-unit texture, no repeat',
  },
};

export function groundFor(world: number, level: number): GroundChoice {
  return COMPARISON[`${world}-${level}`] ?? DEFAULT_GROUND;
}

/** The levels carrying a non-default ground, for tests and tooling. */
export function comparisonLevels(): string[] {
  return Object.keys(COMPARISON);
}
