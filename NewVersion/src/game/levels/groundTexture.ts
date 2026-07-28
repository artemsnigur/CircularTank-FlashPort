/**
 * The ground texture a level draws, and the scale it is tiled at.
 *
 * ── Keyed by theme, not by world number ───────────────────────────────────
 * `LevelSpec.theme` is `levelDataModel` column 8, carried per level. Every
 * world happens to use one theme today and world N's theme is `Worlds[N - 1]`
 * exactly — verified across all 405 rows — but the data says *theme*, so this
 * reads the theme. A world whose levels disagreed would then render correctly
 * rather than uniformly wrong.
 *
 * ── Why the Desert upscale is the default for world 1 ─────────────────────
 * `351_upscale.webp` is a 4x upscale of the extracted Desert tile — 1024x1024
 * against 256x256 — drawn at `tileScale 0.25` so one repeat still covers the
 * same 256 design units. The layout is therefore identical to the extraction
 * and only the pixel density changes.
 *
 * It was chosen over drawing the same texture at 1:1, which removed tile
 * repetition entirely but rendered every ground feature 4x larger than the art
 * intended. Both were live on 1-1 and 1-6 to be compared; this one won.
 *
 * ── The other eight are the extracted 256 tiles, and that is a known gap ───
 * Only Desert has an authored upscale, so worlds 2-9 tile the raw 256x256
 * extraction at `tileScale 1`. The *layout* is right everywhere — one repeat
 * covers 256 design units either way — but world 1 resolves sharper than the
 * rest on a high-density display.
 *
 * That asymmetry is deliberate rather than overlooked. Dropping Desert to
 * match would regress a change that was compared in game and chosen; upscaling
 * the other eight is eight more authored assets and belongs in its own pass.
 * The recipe is in `assets-authored/README.md`, and `UPSCALED_THEMES` below is
 * the list to extend — adding a file and a manifest entry is all it takes,
 * because the scale is derived from which set the theme is in.
 *
 * ── The tile is not oversized ─────────────────────────────────────────────
 * A 256-unit tile occupies `256 x zoom` device pixels, and the landscape zoom
 * is `renderHeight / 400`. That is 691 px on a 1080p display, 922 on 1440p and
 * **1382 on 4K or any dpr-2 panel** — so 1024 is already below what a
 * high-density display resolves, and cropping it would soften the ground
 * rather than cost nothing. The file is small because of the encoding (34 KB
 * WebP), not because of a lower resolution.
 */

import type { LevelTheme } from './levelData';

/** Design units covered by one tile of an upscaled texture at scale 1. */
export const UPSCALE_TEXTURE_SIZE = 1024;

/** Design units one repeat should cover — the extracted tile's size. */
export const BASE_TEXTURE_SIZE = 256;

/** `tileScale` that makes a 1024 texture occupy the original 256 units. */
export const UPSCALE_TILE_SCALE = BASE_TEXTURE_SIZE / UPSCALE_TEXTURE_SIZE;

export interface GroundChoice {
  /** Texture key, as registered in `assets/manifest.ts`. */
  key: string;
  /**
   * Multiplier applied to the texture when tiling.
   *
   * `0.25` shrinks a 1024 texture so it occupies the 256 units the original
   * tile did, keeping the repeat identical to the extraction. `1` for a tile
   * that is already 256.
   */
  tileScale: number;
}

/**
 * Texture key per theme.
 *
 * The SWF library IDs run 351, 353, …, 367 in theme order, and each was opened
 * and checked against its theme name rather than inferred from the sequence:
 * 355 is blue, 357 pale sand, 359 grey, 361 magenta cell-like, 363 dark red,
 * 365 purple stone, 367 dark teal panels.
 */
export const GROUND_KEYS: Record<LevelTheme, string> = {
  Desert: 'ground-desert', // 351
  Grass: 'ground-grass', // 353
  BlueDirt: 'ground-bluedirt', // 355
  Beach: 'ground-beach', // 357
  Concrete: 'ground-concrete', // 359
  Biology: 'ground-biology', // 361
  Hell: 'ground-hell', // 363
  MagicStone: 'ground-magicstone', // 365
  Futuristic: 'ground-futuristic', // 367
};

/**
 * Themes with an authored 1024 upscale, which therefore tile at 0.25.
 *
 * A set rather than a per-theme scale field, so adding an upscale is one entry
 * here and cannot leave a 1024 texture tiling at scale 1 — which would render
 * every ground feature 4x too large, the treatment that lost the comparison.
 */
export const UPSCALED_THEMES: ReadonlySet<LevelTheme> = new Set<LevelTheme>(['Desert']);

/** Key of the upscaled variant for a theme that has one. */
const upscaleKey = (theme: LevelTheme): string => `${GROUND_KEYS[theme]}-hi`;

/** Fallback when a level carries a theme with no tile — should be unreachable. */
export const DEFAULT_GROUND: GroundChoice = {
  key: upscaleKey('Desert'),
  tileScale: UPSCALE_TILE_SCALE,
};

/** The extracted 256x256 Desert tile, kept as the fallback and for reference. */
export const EXTRACTED_GROUND: GroundChoice = { key: GROUND_KEYS.Desert, tileScale: 1 };

/** The ground for a theme. */
export function groundForTheme(theme: LevelTheme): GroundChoice {
  if (!GROUND_KEYS[theme]) return DEFAULT_GROUND;

  return UPSCALED_THEMES.has(theme)
    ? { key: upscaleKey(theme), tileScale: UPSCALE_TILE_SCALE }
    : { key: GROUND_KEYS[theme], tileScale: 1 };
}

/**
 * The ground for a level.
 *
 * Takes the theme rather than looking it up, so a caller that already has the
 * `LevelSpec` — every caller does — cannot pass a world/level pair that
 * disagrees with the spec it is drawing.
 */
export function groundFor(theme: LevelTheme | undefined): GroundChoice {
  return theme ? groundForTheme(theme) : DEFAULT_GROUND;
}
