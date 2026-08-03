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
  // 4x upscale of 351 and the default ground everywhere. Still seamless after
  // WebP encoding — edge error 1.98/2.24 against an interior baseline of 3.88,
  // measured, because lossy block encoders get no context from the opposite
  // edge and a broken seam shows as grid lines. 34 KB at q90 (mean error
  // 0.9/255), so the 1024 tile is *smaller* than the 83 KB 256 original.
  img('ground-desert-hi', '351_upscale.webp', 'Desert ground, 1024x1024 upscale of 351'),
  // The remaining eight world tiles, all 256x256 and seamless. IDs run
  // 351,353,...,367 in theme order; each was opened and matched to its theme
  // name rather than inferred from the sequence. Only Desert has an authored
  // upscale — see levels/groundTexture.ts for why the other eight tile at 1.
  //
  // These add 529 KB to the preload — 738 KB for the whole nine-tile set — and
  // every player pays it on first load to reach ground they may never see. Accepted for now — the menu music alone is
  // 844 KB, so this is not the bottleneck — and measured rather than assumed:
  // `groundTexture.test.ts` holds a budget that fails if the set grows. The
  // cheap fix when it matters is WebP, which took the 1024 Desert upscale to
  // 34 KB; these are flat noise and would compress at least as well.
  img('ground-grass', '353.png', 'Grass world ground tile, 256x256'),
  img('ground-bluedirt', '355.png', 'BlueDirt world ground tile, 256x256'),
  img('ground-beach', '357.png', 'Beach world ground tile, 256x256'),
  img('ground-concrete', '359.png', 'Concrete world ground tile, 256x256'),
  img('ground-biology', '361.png', 'Biology world ground tile, 256x256'),
  img('ground-hell', '363.png', 'Hell world ground tile, 256x256'),
  img('ground-magicstone', '365.png', 'MagicStone world ground tile, 256x256'),
  img('ground-futuristic', '367.jpg', 'Futuristic world ground tile, 256x256'),
  // Not a border, despite an earlier label here saying so — rendered and
  // checked: 822/827/.../841 are nine 131x48 ground *detail* patches, one per
  // world palette (sand, pale sand with pebbles, dark teal with grid lines).
  // Nothing draws them yet. The arena boundary is drawn, not textured, because
  // no border art exists in the extraction.
  img('ground-detail-desert', '822.png', 'Desert ground detail patch, 131x48'),
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
 * Background prop art — one shape per variant frame of the 21 `BGObject*`
 * clips, keyed `prop-<shapeId>` so `propArt.ts`'s frame map resolves straight
 * to a texture. Rasterised at 96 because props are drawn at their own `scale`
 * draw, which reaches ~1.0, and a zoomed camera on a 2x screen needs pixels.
 */
export const PROP_SHAPES: readonly ShapeAsset[] = [
  shape('prop-1458', '1458.svg', 187, 151, 'Background prop variant frame'),
  shape('prop-1459', '1459.svg', 187, 151, 'Background prop variant frame'),
  shape('prop-1460', '1460.svg', 182, 158, 'Background prop variant frame'),
  shape('prop-1461', '1461.svg', 208, 186, 'Background prop variant frame'),
  shape('prop-1462', '1462.svg', 213, 208, 'Background prop variant frame'),
  shape('prop-1464', '1464.svg', 50, 48, 'Background prop variant frame'),
  shape('prop-1466', '1466.svg', 65, 66, 'Background prop variant frame'),
  shape('prop-1467', '1467.svg', 65, 64, 'Background prop variant frame'),
  shape('prop-1469', '1469.svg', 51, 53, 'Background prop variant frame'),
  shape('prop-1470', '1470.svg', 49, 48, 'Background prop variant frame'),
  shape('prop-1471', '1471.svg', 51, 48, 'Background prop variant frame'),
  shape('prop-1473', '1473.svg', 52, 39, 'Background prop variant frame'),
  shape('prop-1474', '1474.svg', 45, 38, 'Background prop variant frame'),
  shape('prop-1475', '1475.svg', 49, 36, 'Background prop variant frame'),
  shape('prop-1477', '1477.svg', 46, 38, 'Background prop variant frame'),
  shape('prop-1478', '1478.svg', 38, 36, 'Background prop variant frame'),
  shape('prop-1479', '1479.svg', 38, 33, 'Background prop variant frame'),
  shape('prop-1481', '1481.svg', 46, 69, 'Background prop variant frame'),
  shape('prop-1482', '1482.svg', 37, 96, 'Background prop variant frame'),
  shape('prop-1483', '1483.svg', 102, 75, 'Background prop variant frame'),
  shape('prop-1484', '1484.svg', 76, 68, 'Background prop variant frame'),
  shape('prop-1485', '1485.svg', 86, 57, 'Background prop variant frame'),
  shape('prop-1486', '1486.svg', 42, 65, 'Background prop variant frame'),
  shape('prop-1487', '1487.svg', 37, 63, 'Background prop variant frame'),
  shape('prop-1488', '1488.svg', 38, 71, 'Background prop variant frame'),
  shape('prop-1489', '1489.svg', 33, 56, 'Background prop variant frame'),
  shape('prop-1490', '1490.svg', 60, 64, 'Background prop variant frame'),
  shape('prop-1491', '1491.svg', 52, 54, 'Background prop variant frame'),
  shape('prop-1492', '1492.svg', 54, 53, 'Background prop variant frame'),
  shape('prop-1494', '1494.svg', 60, 60, 'Background prop variant frame'),
  shape('prop-1495', '1495.svg', 60, 60, 'Background prop variant frame'),
  shape('prop-1498', '1498.svg', 161, 108, 'Background prop variant frame'),
  shape('prop-1499', '1499.svg', 166, 139, 'Background prop variant frame'),
  shape('prop-1500', '1500.svg', 172, 112, 'Background prop variant frame'),
  shape('prop-1501', '1501.svg', 220, 190, 'Background prop variant frame'),
  shape('prop-1502', '1502.svg', 140, 105, 'Background prop variant frame'),
  shape('prop-1503', '1503.svg', 135, 131, 'Background prop variant frame'),
  shape('prop-1504', '1504.svg', 101, 147, 'Background prop variant frame'),
  shape('prop-1505', '1505.svg', 94, 157, 'Background prop variant frame'),
  shape('prop-1506', '1506.svg', 162, 152, 'Background prop variant frame'),
  shape('prop-1507', '1507.svg', 137, 136, 'Background prop variant frame'),
  shape('prop-1509', '1509.svg', 35, 32, 'Background prop variant frame'),
  shape('prop-1510', '1510.svg', 39, 34, 'Background prop variant frame'),
  shape('prop-1511', '1511.svg', 39, 32, 'Background prop variant frame'),
  shape('prop-1512', '1512.svg', 35, 32, 'Background prop variant frame'),
  shape('prop-1513', '1513.svg', 39, 34, 'Background prop variant frame'),
  shape('prop-1514', '1514.svg', 39, 32, 'Background prop variant frame'),
  shape('prop-1515', '1515.svg', 35, 32, 'Background prop variant frame'),
  shape('prop-1516', '1516.svg', 39, 34, 'Background prop variant frame'),
  shape('prop-1517', '1517.svg', 39, 32, 'Background prop variant frame'),
  shape('prop-1519', '1519.svg', 37, 76, 'Background prop variant frame'),
  shape('prop-1520', '1520.svg', 35, 76, 'Background prop variant frame'),
  shape('prop-1521', '1521.svg', 75, 43, 'Background prop variant frame'),
  shape('prop-1522', '1522.svg', 85, 36, 'Background prop variant frame'),
  shape('prop-1523', '1523.svg', 53, 56, 'Background prop variant frame'),
  shape('prop-1524', '1524.svg', 50, 58, 'Background prop variant frame'),
  shape('prop-1525', '1525.svg', 64, 62, 'Background prop variant frame'),
  shape('prop-1526', '1526.svg', 63, 57, 'Background prop variant frame'),
  shape('prop-1527', '1527.svg', 56, 62, 'Background prop variant frame'),
  shape('prop-1528', '1528.svg', 54, 59, 'Background prop variant frame'),
  shape('prop-1529', '1529.svg', 67, 66, 'Background prop variant frame'),
  shape('prop-1530', '1530.svg', 56, 56, 'Background prop variant frame'),
  shape('prop-1531', '1531.svg', 85, 67, 'Background prop variant frame'),
  shape('prop-1532', '1532.svg', 70, 91, 'Background prop variant frame'),
  shape('prop-1533', '1533.svg', 66, 83, 'Background prop variant frame'),
  shape('prop-1535', '1535.svg', 42, 39, 'Background prop variant frame'),
  shape('prop-1536', '1536.svg', 46, 38, 'Background prop variant frame'),
  shape('prop-1537', '1537.svg', 49, 38, 'Background prop variant frame'),
  shape('prop-1539', '1539.svg', 42, 42, 'Background prop variant frame'),
  shape('prop-1541', '1541.svg', 170, 166, 'Background prop variant frame'),
  shape('prop-1542', '1542.svg', 285, 160, 'Background prop variant frame'),
  shape('prop-1543', '1543.svg', 135, 274, 'Background prop variant frame'),
  shape('prop-1544', '1544.svg', 94, 168, 'Background prop variant frame'),
  shape('prop-1545', '1545.svg', 321, 165, 'Background prop variant frame'),
  shape('prop-1546', '1546.svg', 220, 180, 'Background prop variant frame'),
  shape('prop-1547', '1547.svg', 210, 180, 'Background prop variant frame'),
  shape('prop-1548', '1548.svg', 222, 162, 'Background prop variant frame'),
  shape('prop-1549', '1549.svg', 140, 75, 'Background prop variant frame'),
  shape('prop-1550', '1550.svg', 269, 220, 'Background prop variant frame'),
  shape('prop-1552', '1552.svg', 170, 166, 'Background prop variant frame'),
  shape('prop-1553', '1553.svg', 285, 160, 'Background prop variant frame'),
  shape('prop-1554', '1554.svg', 135, 274, 'Background prop variant frame'),
  shape('prop-1555', '1555.svg', 94, 168, 'Background prop variant frame'),
  shape('prop-1556', '1556.svg', 321, 165, 'Background prop variant frame'),
  shape('prop-1557', '1557.svg', 220, 180, 'Background prop variant frame'),
  shape('prop-1558', '1558.svg', 210, 180, 'Background prop variant frame'),
  shape('prop-1559', '1559.svg', 222, 162, 'Background prop variant frame'),
  shape('prop-1560', '1560.svg', 140, 75, 'Background prop variant frame'),
  shape('prop-1561', '1561.svg', 269, 220, 'Background prop variant frame'),
  shape('prop-1563', '1563.svg', 170, 166, 'Background prop variant frame'),
  shape('prop-1564', '1564.svg', 285, 160, 'Background prop variant frame'),
  shape('prop-1565', '1565.svg', 135, 274, 'Background prop variant frame'),
  shape('prop-1566', '1566.svg', 94, 168, 'Background prop variant frame'),
  shape('prop-1567', '1567.svg', 321, 165, 'Background prop variant frame'),
  shape('prop-1568', '1568.svg', 220, 180, 'Background prop variant frame'),
  shape('prop-1569', '1569.svg', 210, 180, 'Background prop variant frame'),
  shape('prop-1570', '1570.svg', 222, 162, 'Background prop variant frame'),
  shape('prop-1571', '1571.svg', 140, 75, 'Background prop variant frame'),
  shape('prop-1572', '1572.svg', 269, 220, 'Background prop variant frame'),
  shape('prop-1574', '1574.svg', 69, 91, 'Background prop variant frame'),
  shape('prop-1575', '1575.svg', 85, 85, 'Background prop variant frame'),
  shape('prop-1576', '1576.svg', 104, 113, 'Background prop variant frame'),
  shape('prop-1577', '1577.svg', 106, 89, 'Background prop variant frame'),
  shape('prop-1578', '1578.svg', 111, 97, 'Background prop variant frame'),
  shape('prop-1580', '1580.svg', 48, 38, 'Background prop variant frame'),
  shape('prop-1581', '1581.svg', 32, 44, 'Background prop variant frame'),
  shape('prop-1582', '1582.svg', 51, 36, 'Background prop variant frame'),
  shape('prop-1584', '1584.svg', 44, 43, 'Background prop variant frame'),
  shape('prop-1586', '1586.svg', 44, 43, 'Background prop variant frame'),
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
