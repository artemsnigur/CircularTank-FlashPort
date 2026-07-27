/**
 * The sample set the Preload scene loads to prove the pipeline end to end.
 *
 * Deliberately small: this is a pipeline smoke test, not the real level
 * loader. Once level data is ported, per-world manifests should replace it.
 */
import { audioUrl, imageUrl, shapeUrl } from './registry';

export interface ImageAsset {
  key: string;
  file: string;
  url: string;
  /** What this was in the SWF, for traceability. */
  note: string;
}

export interface ShapeAsset extends ImageAsset {
  /** SVGs are rasterised at load time; size in design units. */
  width: number;
  height: number;
}

export interface AudioAsset {
  key: string;
  file: string;
  url: string;
  note: string;
  /**
   * Duration in seconds derived from the MP3 frame headers by
   * `npm run audio:audit`. The runtime self-test compares the browser's
   * decoded duration against this to detect decoder-level drift.
   */
  expectedDuration: number;
  /** Music loops are the case where leading silence becomes audible. */
  loops: boolean;
}

const img = (key: string, file: string, note: string): ImageAsset => ({
  key,
  file,
  url: imageUrl(file),
  note,
});

const shape = (
  key: string,
  file: string,
  width: number,
  height: number,
  note: string,
): ShapeAsset => ({ key, file, url: shapeUrl(file), width, height, note });

const snd = (
  key: string,
  file: string,
  expectedDuration: number,
  loops: boolean,
  note: string,
): AudioAsset => ({ key, file, url: audioUrl(file), expectedDuration, loops, note });

export const SAMPLE_IMAGES: readonly ImageAsset[] = [
  img('ground-desert', '351.png', 'Desert ground tile, 256x256, tiles seamlessly'),
  // 4x upscale of 351, still seamless (edge error 2.0 against an interior
  // baseline of 3.8) and alpha-stripped — it arrived RGBA with every pixel
  // opaque, which cost 28% of the file for nothing. 571 KB is heavy: larger
  // than the whole app bundle, so it is used on named levels, not by default.
  img('ground-desert-hi', '351_upscale.png', 'Desert ground, 1024x1024 upscale of 351'),
  img('ground-grass', '353.png', 'Grass world ground tile'),
  img('ground-edge', '822.png', 'Room border strip (bottom edge)'),
  img('menu-backdrop', '970.png', 'Brushed-metal menu backdrop, 640x352'),
  img('cursor', '166_CustomCursor.png', 'CustomCursor — symbol 166 in symbols.csv'),
] as const;

export const SAMPLE_SHAPES: readonly ShapeAsset[] = [
  // Rasterised well above their authored size so they stay crisp when the
  // camera zooms in on high-DPR screens.
  shape('tank-body', '3.svg', 116, 116, 'TankBody vector (symbol 5 draws this shape)'),
  shape('particle-dot', '1.svg', 40, 40, 'Filled circle — particle/projectile base'),
] as const;

/**
 * Audio sample set. Durations came from `npm run audio:audit` — every file in
 * this export is CBR 80 kbps / 44.1 kHz / mono with no Xing/LAME header.
 */
export const SAMPLE_AUDIO: readonly AudioAsset[] = [
  snd('sfx-click', '139_sndInterfaceButtonClick.mp3', 0.1567, false, 'UI click — 6 frames'),
  snd('sfx-cannon', '140_sndWeaponCannon.mp3', 0.6269, false, 'Primary cannon fire — 24 frames'),
  snd('music-menu', '112_MusicMenu.mp3', 86.4914, true, 'Menu music — 3311 frames, loops'),
] as const;

export const SAMPLE_FONTS = [
  {
    /** CSS family name; namespaced so it cannot collide with a real system font. */
    family: 'SWFMainFont',
    file: '50_Main_font_JG.ttf',
    note: 'Custom display face. Internal name "JG", 581 glyphs — titles and headings.',
  },
  {
    family: 'SWFMainFont2',
    file: '49_Main_font2_Arial.ttf',
    note: 'Flash-embedded Arial (3130 glyphs, 821 KB). See docs/TEXT_RENDERING.md.',
  },
] as const;

export type SampleFontFamily = (typeof SAMPLE_FONTS)[number]['family'];

/** Total number of discrete loader tasks, for progress reporting. */
export const SAMPLE_ASSET_COUNT =
  SAMPLE_IMAGES.length + SAMPLE_SHAPES.length + SAMPLE_AUDIO.length;
