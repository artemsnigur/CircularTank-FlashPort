/**
 * The sample set the Preload scene loads to prove the pipeline end to end.
 *
 * Deliberately small: this is a pipeline smoke test, not the real level
 * loader. Once level data is ported, per-world manifests should replace it.
 */
import { audioUrl, imageUrl, shapeUrl } from './registry';
import { PROJECTILE_SHAPE_FILES } from './projectileArt';

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
/**
 * Particle art — one shape per frame of the 32 `Particle*` clips, keyed
 * `particle-<shapeId>` so `particleArt.ts`'s frame map resolves straight to a
 * texture.
 *
 * Rasterised at `PARTICLE_RASTER_SCALE` times the SVG's authored size, because
 * the gameplay camera zooms and debris is the one effect the player sees at
 * close range on every hit — a 1x raster visibly softens there.
 *
 * **The draw must divide by it.** A particle's `scale` is authored against the
 * symbol's own size, so drawing an oversampled texture at that scale renders it
 * oversampled *large*. This shipped wrong for one pass: debris came out roughly
 * the size of the enemy that threw it, which no unit test could see — the
 * spawn inputs were correct and only the raster was not. `GameplayScene` now
 * divides by this constant at the draw, which is why it is exported rather than
 * being a bare 3 in the sizes below.
 */
/**
 * Enemy and tank art — one shape per frame of the 40 `Enemy*` clips and the
 * three `Tank*` parts, keyed `unit-<shapeId>` so `enemyArt.ts` and `tankArt.ts`
 * resolve straight to a texture.
 *
 * Rasterised at `UNIT_RASTER_SCALE` times the authored size, and **the draw
 * divides by it**. The same coupling `PARTICLE_RASTER_SCALE` names, and worth
 * naming twice: the tank's previous `TANK_DIAMETER = 58` came from exactly this
 * confusion left unnamed — a 29-unit authored body rasterised large, then drawn
 * at the raster size, which doubled both the sprite and the radius taken from
 * it. An unnamed scale factor is how that happens.
 */
export const UNIT_RASTER_SCALE = 4;

export const UNIT_SHAPES: readonly ShapeAsset[] = [
  shape('unit-3', '3.svg', 116, 116, 'Enemy or tank clip frame'),
  shape('unit-4', '4.svg', 117, 117, 'Enemy or tank clip frame'),
  shape('unit-6', '6.svg', 84, 84, 'Enemy or tank clip frame'),
  shape('unit-7', '7.svg', 76, 68, 'Enemy or tank clip frame'),
  shape('unit-8', '8.svg', 84, 84, 'Enemy or tank clip frame'),
  shape('unit-9', '9.svg', 84, 84, 'Enemy or tank clip frame'),
  shape('unit-10', '10.svg', 84, 84, 'Enemy or tank clip frame'),
  shape('unit-11', '11.svg', 80, 76, 'Enemy or tank clip frame'),
  shape('unit-12', '12.svg', 90, 90, 'Enemy or tank clip frame'),
  shape('unit-13', '13.svg', 84, 84, 'Enemy or tank clip frame'),
  shape('unit-14', '14.svg', 84, 83, 'Enemy or tank clip frame'),
  shape('unit-15', '15.svg', 80, 92, 'Enemy or tank clip frame'),
  shape('unit-16', '16.svg', 84, 84, 'Enemy or tank clip frame'),
  shape('unit-17', '17.svg', 106, 68, 'Enemy or tank clip frame'),
  shape('unit-208', '208.svg', 388, 388, 'Enemy or tank clip frame'),
  shape('unit-209', '209.svg', 300, 300, 'Enemy or tank clip frame'),
  shape('unit-210', '210.svg', 250, 250, 'Enemy or tank clip frame'),
  shape('unit-211', '211.svg', 228, 228, 'Enemy or tank clip frame'),
  shape('unit-271', '271.svg', 404, 404, 'Enemy or tank clip frame'),
  shape('unit-273', '273.svg', 84, 84, 'Enemy or tank clip frame'),
  shape('unit-275', '275.svg', 324, 324, 'Enemy or tank clip frame'),
  shape('unit-277', '277.svg', 364, 364, 'Enemy or tank clip frame'),
  shape('unit-278', '278.svg', 364, 364, 'Enemy or tank clip frame'),
  shape('unit-280', '280.svg', 364, 364, 'Enemy or tank clip frame'),
  shape('unit-281', '281.svg', 364, 364, 'Enemy or tank clip frame'),
  shape('unit-283', '283.svg', 76, 76, 'Enemy or tank clip frame'),
  shape('unit-284', '284.svg', 76, 76, 'Enemy or tank clip frame'),
  shape('unit-286', '286.svg', 324, 324, 'Enemy or tank clip frame'),
  shape('unit-287', '287.svg', 324, 324, 'Enemy or tank clip frame'),
  shape('unit-289', '289.svg', 68, 68, 'Enemy or tank clip frame'),
  shape('unit-290', '290.svg', 68, 68, 'Enemy or tank clip frame'),
  shape('unit-292', '292.svg', 76, 76, 'Enemy or tank clip frame'),
  shape('unit-293', '293.svg', 76, 76, 'Enemy or tank clip frame'),
  shape('unit-295', '295.svg', 324, 324, 'Enemy or tank clip frame'),
  shape('unit-297', '297.svg', 68, 68, 'Enemy or tank clip frame'),
  shape('unit-299', '299.svg', 404, 404, 'Enemy or tank clip frame'),
  shape('unit-301', '301.svg', 84, 84, 'Enemy or tank clip frame'),
  shape('unit-303', '303.svg', 404, 404, 'Enemy or tank clip frame'),
  shape('unit-305', '305.svg', 84, 84, 'Enemy or tank clip frame'),
  shape('unit-307', '307.svg', 324, 324, 'Enemy or tank clip frame'),
  shape('unit-309', '309.svg', 68, 68, 'Enemy or tank clip frame'),
  shape('unit-311', '311.svg', 524, 524, 'Enemy or tank clip frame'),
  shape('unit-313', '313.svg', 108, 108, 'Enemy or tank clip frame'),
  shape('unit-315', '315.svg', 404, 404, 'Enemy or tank clip frame'),
  shape('unit-317', '317.svg', 84, 84, 'Enemy or tank clip frame'),
  shape('unit-319', '319.svg', 364, 364, 'Enemy or tank clip frame'),
  shape('unit-321', '321.svg', 444, 444, 'Enemy or tank clip frame'),
  shape('unit-323', '323.svg', 92, 92, 'Enemy or tank clip frame'),
  shape('unit-325', '325.svg', 284, 284, 'Enemy or tank clip frame'),
  shape('unit-326', '326.svg', 284, 284, 'Enemy or tank clip frame'),
  shape('unit-328', '328.svg', 60, 60, 'Enemy or tank clip frame'),
  shape('unit-329', '329.svg', 60, 60, 'Enemy or tank clip frame'),
  shape('unit-331', '331.svg', 364, 364, 'Enemy or tank clip frame'),
  shape('unit-333', '333.svg', 100, 100, 'Enemy or tank clip frame'),
  shape('unit-335', '335.svg', 484, 484, 'Enemy or tank clip frame'),
  shape('unit-339', '339.svg', 244, 244, 'Enemy or tank clip frame'),
  shape('unit-341', '341.svg', 244, 244, 'Enemy or tank clip frame'),
  shape('unit-343', '343.svg', 52, 52, 'Enemy or tank clip frame'),
  shape('unit-345', '345.svg', 164, 164, 'Enemy or tank clip frame'),
  shape('unit-347', '347.svg', 324, 324, 'Enemy or tank clip frame'),
  shape('unit-349', '349.svg', 68, 68, 'Enemy or tank clip frame'),
  shape('unit-1352', '1352.svg', 68, 68, 'Enemy or tank clip frame'),
  shape('unit-1407', '1407.svg', 76, 76, 'Enemy or tank clip frame'),
  shape('unit-1409', '1409.svg', 52, 52, 'Enemy or tank clip frame'),
  shape('unit-1411', '1411.svg', 36, 36, 'Enemy or tank clip frame'),
  shape('unit-1413', '1413.svg', 76, 76, 'Enemy or tank clip frame'),
  shape('unit-941', '941.svg', 28, 28, 'ItemMoney clip frame'),
  shape('unit-942', '942.svg', 40, 40, 'ItemMoney clip frame'),
  shape('unit-943', '943.svg', 17, 26, 'ItemMoney clip frame'),
  shape('unit-944', '944.svg', 17, 26, 'ItemMoney clip frame'),
  shape('unit-945', '945.svg', 52, 52, 'ItemMoney clip frame'),
  shape('unit-946', '946.svg', 37, 26, 'ItemMoney clip frame'),
  shape('unit-947', '947.svg', 36, 26, 'ItemMoney clip frame'),
  shape('unit-948', '948.svg', 38, 26, 'ItemMoney clip frame'),
  shape('unit-949', '949.svg', 37, 26, 'ItemMoney clip frame'),
  shape('unit-950', '950.svg', 38, 26, 'ItemMoney clip frame'),
  shape('unit-951', '951.svg', 37, 26, 'ItemMoney clip frame'),
  shape('unit-952', '952.svg', 68, 68, 'ItemMoney clip frame'),
  shape('unit-953', '953.svg', 57, 26, 'ItemMoney clip frame'),
  shape('unit-954', '954.svg', 57, 26, 'ItemMoney clip frame'),
  shape('unit-955', '955.svg', 58, 26, 'ItemMoney clip frame'),
  shape('unit-956', '956.svg', 58, 26, 'ItemMoney clip frame'),
  shape('unit-957', '957.svg', 58, 26, 'ItemMoney clip frame'),
  shape('unit-958', '958.svg', 88, 88, 'ItemMoney clip frame'),
  shape('unit-370', '370.svg', 600, 600, 'Indicator clip frame'),
  shape('unit-371', '371.svg', 600, 600, 'Indicator clip frame'),
  shape('unit-1182', '1182.svg', 800, 800, 'Indicator clip frame'),
  shape('unit-1184', '1184.svg', 544, 578, 'Indicator clip frame'),
  shape('unit-1185', '1185.svg', 626, 624, 'Indicator clip frame'),
  shape('unit-1186', '1186.svg', 600, 573, 'Indicator clip frame'),
  shape('unit-1187', '1187.svg', 526, 487, 'Indicator clip frame'),
  shape('unit-1188', '1188.svg', 494, 499, 'Indicator clip frame'),
  shape('unit-1189', '1189.svg', 464, 463, 'Indicator clip frame'),
  // The boss life indicator's `RedCircle` — sprite 1200 places shape 1199,
  // authored 100x100, so 4x is 400. Drawn with `setDisplaySize`, which is
  // absolute and resolution-independent, so the oversample needs no matching
  // divide at the draw — same as the projectile shapes below.
  shape('unit-1199', '1199.svg', 400, 400, 'Indicator clip frame'),
  // `ItemFlag` — sprite 1360 places shape 1359, `frameCount: 1`, so there is no
  // waving animation to defer. Authored 33x33, so 4x is 132.
  shape('unit-1359', '1359.svg', 132, 132, 'ItemFlag'),
  // `WarningEnemy` — sprite 376 places shape 375, `frameCount: 1`. Authored
  // 75x75, so 4x is 300.
  shape('unit-375', '375.svg', 300, 300, 'WarningEnemy'),
  shape('unit-1201', '1201.svg', 2560, 128, 'Indicator clip frame'),
  shape('unit-1315', '1315.svg', 120, 120, 'Indicator clip frame'),
  shape('unit-43', '43.svg', 216, 216, 'Tutorial panel shape'),
  shape('unit-167', '167.svg', 80, 80, 'Tutorial panel shape'),
  shape('unit-187', '187.svg', 64, 64, 'Tutorial panel shape'),
  shape('unit-195', '195.svg', 24, 48, 'Tutorial panel shape'),
  shape('unit-1325', '1325.svg', 640, 320, 'Tutorial panel shape'),
  shape('unit-1326', '1326.svg', 98, 232, 'Tutorial panel shape'),
  shape('unit-1328', '1328.svg', 417, 104, 'Tutorial panel shape'),
  shape('unit-1330', '1330.svg', 417, 104, 'Tutorial panel shape'),
  shape('unit-1332', '1332.svg', 640, 256, 'Tutorial panel shape'),
  shape('unit-1333', '1333.svg', 470, 168, 'Tutorial panel shape'),
  shape('unit-1335', '1335.svg', 470, 168, 'Tutorial panel shape'),
  shape('unit-1337', '1337.svg', 73, 70, 'Tutorial panel shape'),
  shape('unit-1339', '1339.svg', 340, 224, 'Tutorial panel shape'),
  shape('unit-1341', '1341.svg', 340, 224, 'Tutorial panel shape'),
  shape('unit-1342', '1342.svg', 73, 70, 'Tutorial panel shape'),
  shape('unit-1345', '1345.svg', 361, 292, 'Tutorial panel shape'),
  shape('unit-1347', '1347.svg', 361, 292, 'Tutorial panel shape'),
  shape('unit-1348', '1348.svg', 68, 68, 'Tutorial panel shape'),
  shape('unit-1350', '1350.svg', 68, 68, 'Tutorial panel shape'),
  shape('unit-1352', '1352.svg', 68, 68, 'Tutorial panel shape'),
  shape('unit-1354', '1354.svg', 640, 280, 'Tutorial panel shape'),
  shape('unit-1355', '1355.svg', 448, 40, 'Tutorial panel shape'),
  shape('unit-1357', '1357.svg', 448, 40, 'Tutorial panel shape'),
  shape('unit-1359', '1359.svg', 132, 132, 'Tutorial panel shape'),
  shape('unit-1361', '1361.svg', 640, 280, 'Tutorial panel shape'),
  shape('unit-1362', '1362.svg', 504, 40, 'Tutorial panel shape'),
  shape('unit-1365', '1365.svg', 504, 40, 'Tutorial panel shape'),
  shape('unit-1367', '1367.svg', 436, 106, 'Tutorial panel shape'),
  shape('unit-1369', '1369.svg', 117, 117, 'Tutorial panel shape'),
  shape('unit-1371', '1371.svg', 436, 282, 'Tutorial panel shape'),
  shape('unit-1375', '1375.svg', 368, 488, 'Tutorial panel shape'),
  shape('unit-1377', '1377.svg', 549, 104, 'Tutorial panel shape'),
  shape('unit-1379', '1379.svg', 549, 104, 'Tutorial panel shape'),
  shape('unit-1381', '1381.svg', 256, 64, 'Tutorial panel shape'),
  shape('unit-1383', '1383.svg', 64, 64, 'Tutorial panel shape'),
  shape('unit-1385', '1385.svg', 456, 104, 'Tutorial panel shape'),
  shape('unit-1387', '1387.svg', 456, 259, 'Tutorial panel shape'),
  shape('unit-1389', '1389.svg', 104, 64, 'Tutorial panel shape'),
  shape('unit-1391', '1391.svg', 497, 40, 'Tutorial panel shape'),
  shape('unit-1393', '1393.svg', 497, 153, 'Tutorial panel shape'),
  shape('unit-1395', '1395.svg', 320, 64, 'Tutorial panel shape'),
  shape('unit-1397', '1397.svg', 457, 104, 'Tutorial panel shape'),
  shape('unit-1399', '1399.svg', 457, 104, 'Tutorial panel shape'),
  shape('unit-1401', '1401.svg', 208, 136, 'Tutorial panel shape'),
  shape('unit-1403', '1403.svg', 346, 168, 'Tutorial panel shape'),
  shape('unit-1405', '1405.svg', 545, 318, 'Tutorial panel shape'),
] as const;


export const PARTICLE_RASTER_SCALE = 3;

export const PARTICLE_SHAPES: readonly ShapeAsset[] = [
  shape('particle-843', '843.svg', 72, 84, 'Particle clip frame'),
  shape('particle-1060', '1060.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1062', '1062.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1064', '1064.svg', 47, 108, 'Particle clip frame'),
  shape('particle-1065', '1065.svg', 43, 86, 'Particle clip frame'),
  shape('particle-1066', '1066.svg', 40, 69, 'Particle clip frame'),
  shape('particle-1068', '1068.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1070', '1070.svg', 51, 51, 'Particle clip frame'),
  shape('particle-1072', '1072.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1074', '1074.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1076', '1076.svg', 47, 41, 'Particle clip frame'),
  shape('particle-1077', '1077.svg', 51, 45, 'Particle clip frame'),
  shape('particle-1078', '1078.svg', 51, 47, 'Particle clip frame'),
  shape('particle-1080', '1080.svg', 90, 90, 'Particle clip frame'),
  shape('particle-1081', '1081.svg', 90, 90, 'Particle clip frame'),
  shape('particle-1083', '1083.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1085', '1085.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1087', '1087.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1089', '1089.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1091', '1091.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1093', '1093.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1095', '1095.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1097', '1097.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1099', '1099.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1101', '1101.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1103', '1103.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1105', '1105.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1108', '1108.svg', 97, 95, 'Particle clip frame'),
  shape('particle-1109', '1109.svg', 70, 87, 'Particle clip frame'),
  shape('particle-1110', '1110.svg', 159, 129, 'Particle clip frame'),
  shape('particle-1111', '1111.svg', 159, 129, 'Particle clip frame'),
  shape('particle-1114', '1114.svg', 116, 114, 'Particle clip frame'),
  shape('particle-1115', '1115.svg', 84, 104, 'Particle clip frame'),
  shape('particle-1116', '1116.svg', 127, 103, 'Particle clip frame'),
  shape('particle-1117', '1117.svg', 191, 155, 'Particle clip frame'),
  shape('particle-1119', '1119.svg', 78, 76, 'Particle clip frame'),
  shape('particle-1120', '1120.svg', 127, 103, 'Particle clip frame'),
  shape('particle-1122', '1122.svg', 39, 39, 'Particle clip frame'),
  shape('particle-1124', '1124.svg', 42, 42, 'Particle clip frame'),
  shape('particle-1126', '1126.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1128', '1128.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1130', '1130.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1132', '1132.svg', 30, 30, 'Particle clip frame'),
  shape('particle-1337', '1337.svg', 55, 53, 'Particle clip frame'),
] as const;


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

/**
 * Projectile art — one raster per distinct shape, `PROJECTILE_ART` picks which.
 *
 * Built from the generated table rather than hand-listed: the key, file and
 * raster size all come from `assets.swf`, so a hand-written entry here could
 * disagree with the mapping that resolved it. See `scripts/gen-projectile-art.mjs`.
 *
 * **41 entries and no orphans.** Every texture here is referenced by
 * `PROJECTILE_ART`, `PROJECTILE_VARIANTS` or `PROJECTILE_OVERLAYS`, and
 * `projectileArt.test.ts` fails if one stops being — preloading a texture
 * nothing draws makes it look wired when it is not, which is the confusion this
 * project keeps paying for.
 *
 * The two shapes still not here are `BulletLaser`'s second and third frames.
 * The port draws the beam as a line primitive rather than a sprite, so it has
 * no layer to animate; declined rather than deferred (`BACKLOG.md` M1).
 */
export const PROJECTILE_SHAPES: readonly ShapeAsset[] = PROJECTILE_SHAPE_FILES.map((entry) =>
  shape(entry.key, entry.file, entry.width, entry.height, 'Projectile art from assets.swf'),
);

export type SampleFontFamily = (typeof SAMPLE_FONTS)[number]['family'];

/** Total number of discrete loader tasks, for progress reporting. */
export const SAMPLE_ASSET_COUNT =
  SAMPLE_IMAGES.length + SAMPLE_SHAPES.length + SAMPLE_AUDIO.length;
