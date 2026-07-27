/**
 * The ground texture every level draws, and the scale it is tiled at.
 *
 * ── Why the upscale is the default ────────────────────────────────────────
 * `351_upscale.webp` is a 4x upscale of the extracted Desert tile — 1024x1024
 * against 256x256 — drawn at `tileScale 0.25` so one repeat still covers the
 * same 256 design units. The layout is therefore identical to the extraction
 * and only the pixel density changes, which is what makes this safe to apply
 * everywhere rather than per level.
 *
 * It was chosen over the alternative of drawing the same texture at 1:1, which
 * removed tile repetition entirely but rendered every ground feature 4x larger
 * than the art intended. Both were live on 1-1 and 1-6 to be compared; this one
 * won.
 *
 * ── The tile is not oversized ─────────────────────────────────────────────
 * A 256-unit tile occupies `256 x zoom` device pixels, and the landscape zoom
 * is `renderHeight / 400`. That is 691 px on a 1080p display, 922 on 1440p and
 * **1382 on 4K or any dpr-2 panel** — so 1024 is already below what a
 * high-density display resolves, and cropping it would soften the ground
 * rather than cost nothing. The file is small because of the encoding (34 KB
 * WebP), not because of a lower resolution.
 *
 * ── Every level, because every level is Desert ────────────────────────────
 * `GameplayScene` draws `ground-desert` regardless of `LevelSpec.theme`, so
 * all 405 levels currently render on Desert sand and one default covers them.
 * Eight of the nine extracted world tiles are unused. When themes are wired,
 * this is where the per-world choice belongs.
 */

/** Design units covered by one tile of the upscaled texture at scale 1. */
export const UPSCALE_TEXTURE_SIZE = 1024;

/** Design units one repeat should cover — the extracted tile's size. */
export const BASE_TEXTURE_SIZE = 256;

export interface GroundChoice {
  /** Texture key, as registered in `assets/manifest.ts`. */
  key: string;
  /**
   * Multiplier applied to the texture when tiling.
   *
   * `0.25` shrinks the 1024 texture so it occupies the 256 units the original
   * tile did, keeping the repeat identical to the extraction.
   */
  tileScale: number;
}

export const DEFAULT_GROUND: GroundChoice = {
  key: 'ground-desert-hi',
  tileScale: BASE_TEXTURE_SIZE / UPSCALE_TEXTURE_SIZE,
};

/** The extracted 256x256 tile, kept as the fallback and for reference. */
export const EXTRACTED_GROUND: GroundChoice = { key: 'ground-desert', tileScale: 1 };

export function groundFor(_world: number, _level: number): GroundChoice {
  return DEFAULT_GROUND;
}
