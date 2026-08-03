/**
 * Background prop art — which shape each clip's variant frames draw.
 *
 * Generated from `assets.swf` rather than hand-listed: every `DefineSprite`
 * frame of the 21 `BGObject*` clips places exactly one `DefineShape`, so a
 * frame maps to a single shape id and JPEXS's `shapes/<id>.svg` is the art.
 * Frames that place nothing hold the previous shape, which is why some lists
 * repeat an id — `Skeleton` has 16 frames from 12 placements.
 *
 * The keys are the AS3 class names minus the `BGObject` prefix. `propType`
 * maps a layout type plus theme onto one of them, because `Rock` and `Crack`
 * are one type each in the layout tables and several clips in the art.
 */
export interface PropClip {
  /** `assets.swf` character id, for tracing back. */
  symbol: number;
  /** Shape id per 1-based frame. */
  frames: readonly number[];
}

export const PROP_CLIPS: Readonly<Record<string, PropClip>> = {
  Bacteria: { symbol: 1468, frames: [1466, 1467] },
  CrackBlueDirt: { symbol: 1551, frames: [1541, 1542, 1543, 1544, 1545, 1546, 1547, 1548, 1549, 1550] },
  CrackConcrete: { symbol: 1562, frames: [1552, 1553, 1554, 1555, 1556, 1557, 1558, 1559, 1560, 1561] },
  CrackDesert: { symbol: 1573, frames: [1563, 1564, 1565, 1566, 1567, 1568, 1569, 1570, 1571, 1572] },
  Diamond: { symbol: 1583, frames: [1580, 1581, 1582] },
  DirtMagicStone: { symbol: 1579, frames: [1574, 1575, 1576, 1577, 1578] },
  FlowerPurple: { symbol: 1585, frames: [1584] },
  FlowerRed: { symbol: 1587, frames: [1586] },
  FlowerWhite: { symbol: 1540, frames: [1539] },
  FuturisticLines: { symbol: 1508, frames: [1498, 1499, 1500, 1501, 1502, 1503, 1504, 1505, 1506, 1507] },
  FuturisticSquare: { symbol: 1496, frames: [1494, 1495] },
  FuturisticTriangle: { symbol: 1497, frames: [1494, 1495] },
  RedBloodCell: { symbol: 1465, frames: [1464] },
  RockBeach: { symbol: 1518, frames: [1509, 1510, 1511, 1512, 1513, 1514, 1515, 1516, 1517] },
  RockBlueDirt: { symbol: 1480, frames: [1477, 1478, 1479] },
  RockDesert: { symbol: 1538, frames: [1535, 1536, 1537] },
  RockHell: { symbol: 1476, frames: [1473, 1474, 1475] },
  Seastuff: { symbol: 1463, frames: [1458, 1459, 1460, 1461, 1462] },
  Skeleton: { symbol: 1493, frames: [1481, 1482, 1483, 1484, 1485, 1486, 1486, 1487, 1487, 1488, 1488, 1489, 1489, 1490, 1491, 1492] },
  Trash: { symbol: 1534, frames: [1519, 1520, 1521, 1522, 1523, 1524, 1525, 1526, 1527, 1528, 1529, 1530, 1531, 1532, 1533] },
  WhiteBloodCell: { symbol: 1472, frames: [1469, 1470, 1471] },
};

/** Layout type + theme -> clip name. `:3526-3660`'s dispatch, as data. */
const CLIP_FOR: Readonly<Record<string, string | Readonly<Record<string, string>>>> = {
  Rock: { Desert: 'RockDesert', BlueDirt: 'RockBlueDirt', Beach: 'RockBeach', Hell: 'RockHell' },
  Crack: { Desert: 'CrackDesert', BlueDirt: 'CrackBlueDirt', Concrete: 'CrackConcrete' },
  Dirt: 'DirtMagicStone',
  FlowerWhite: 'FlowerWhite',
  FlowerRed: 'FlowerRed',
  FlowerPurple: 'FlowerPurple',
  Seastuff: 'Seastuff',
  Trash: 'Trash',
  Diamond: 'Diamond',
  Skeleton: 'Skeleton',
  RedBloodCell: 'RedBloodCell',
  WhiteBloodCell: 'WhiteBloodCell',
  Bacteria: 'Bacteria',
  FuturisticLines: 'FuturisticLines',
  FuturisticSquare: 'FuturisticSquare',
};

export function clipFor(type: string, theme: string): string | undefined {
  const entry = CLIP_FOR[type];
  if (entry === undefined) return undefined;
  return typeof entry === 'string' ? entry : entry[theme];
}

/**
 * The shape a prop draws, or undefined if the type has no clip for that theme.
 *
 * `frame` is 1-based and already clamped by `displayFrame`; this indexes
 * defensively anyway, because the clamp and this table are separate sources.
 */
export function propShape(type: string, theme: string, frame: number): number | undefined {
  const name = clipFor(type, theme);
  if (!name) return undefined;
  const clip = PROP_CLIPS[name];
  if (!clip) return undefined;
  return clip.frames[Math.min(Math.max(frame, 1), clip.frames.length) - 1];
}

/**
 * Authored size of each prop shape, in design units, read from the SVG headers
 * JPEXS exported.
 *
 * **This is what a prop is actually the size of.** They range from 10.8 to 107
 * units wide, and the first render of this subsystem rasterised every one of
 * them at a flat 96x96 — so a rock authored at 13.95x12.95 was drawn at nearly
 * seven times its size, with its aspect ratio destroyed. That was the size half
 * of the first bug this port ever found by looking at it.
 */
export const SHAPE_SIZE: Readonly<Record<number, readonly [number, number]>> = {
  1458: [62.45, 50.35],
  1459: [62.45, 50.35],
  1460: [60.50, 52.80],
  1461: [69.30, 62.00],
  1462: [70.90, 69.30],
  1464: [16.60, 16.00],
  1466: [21.60, 21.90],
  1467: [21.60, 21.25],
  1469: [17.05, 17.60],
  1470: [16.20, 16.10],
  1471: [17.10, 16.10],
  1473: [17.30, 12.90],
  1474: [14.90, 12.80],
  1475: [16.30, 12.00],
  1477: [15.40, 12.50],
  1478: [12.50, 11.85],
  1479: [12.70, 10.90],
  1481: [15.20, 23.00],
  1482: [12.30, 31.85],
  1483: [34.10, 24.90],
  1484: [25.30, 22.60],
  1485: [28.60, 19.10],
  1486: [13.90, 21.80],
  1487: [12.20, 21.05],
  1488: [12.50, 23.80],
  1489: [11.05, 18.75],
  1490: [20.00, 21.40],
  1491: [17.50, 18.00],
  1492: [18.00, 17.80],
  1494: [20.00, 20.00],
  1495: [20.00, 20.00],
  1498: [53.80, 36.00],
  1499: [55.50, 46.40],
  1500: [57.40, 37.40],
  1501: [73.50, 63.50],
  1502: [46.60, 34.90],
  1503: [45.00, 43.80],
  1504: [33.80, 49.10],
  1505: [31.50, 52.30],
  1506: [54.10, 50.80],
  1507: [45.60, 45.30],
  1509: [11.70, 10.65],
  1510: [13.15, 11.35],
  1511: [13.05, 10.60],
  1512: [11.70, 10.65],
  1513: [13.15, 11.35],
  1514: [13.05, 10.60],
  1515: [11.70, 10.65],
  1516: [13.15, 11.35],
  1517: [13.05, 10.60],
  1519: [12.25, 25.30],
  1520: [11.80, 25.30],
  1521: [25.10, 14.35],
  1522: [28.35, 11.90],
  1523: [17.70, 18.60],
  1524: [16.70, 19.20],
  1525: [21.30, 20.80],
  1526: [21.00, 19.10],
  1527: [18.70, 20.80],
  1528: [18.00, 19.70],
  1529: [22.30, 21.90],
  1530: [18.75, 18.80],
  1531: [28.45, 22.45],
  1532: [23.40, 30.25],
  1533: [21.90, 27.70],
  1535: [13.95, 12.95],
  1536: [15.30, 12.60],
  1537: [16.20, 12.70],
  1539: [14.10, 14.10],
  1541: [56.50, 55.50],
  1542: [95.00, 53.50],
  1543: [45.00, 91.50],
  1544: [31.50, 56.00],
  1545: [107.00, 55.00],
  1546: [73.50, 60.00],
  1547: [70.00, 60.00],
  1548: [74.00, 54.00],
  1549: [46.50, 25.00],
  1550: [89.80, 73.30],
  1552: [56.50, 55.50],
  1553: [95.00, 53.50],
  1554: [45.00, 91.50],
  1555: [31.50, 56.00],
  1556: [107.00, 55.00],
  1557: [73.50, 60.00],
  1558: [70.00, 60.00],
  1559: [74.00, 54.00],
  1560: [46.50, 25.00],
  1561: [89.80, 73.30],
  1563: [56.50, 55.50],
  1564: [95.00, 53.50],
  1565: [45.00, 91.50],
  1566: [31.50, 56.00],
  1567: [107.00, 55.00],
  1568: [73.50, 60.00],
  1569: [70.00, 60.00],
  1570: [74.00, 54.00],
  1571: [46.50, 25.00],
  1572: [89.80, 73.30],
  1574: [22.90, 30.30],
  1575: [28.30, 28.30],
  1576: [34.60, 37.70],
  1577: [35.50, 29.60],
  1578: [37.00, 32.40],
  1580: [16.10, 12.80],
  1581: [10.80, 14.60],
  1582: [17.00, 12.00],
  1584: [14.70, 14.20],
  1586: [14.70, 14.20],
};

/** Authored size for a prop, or a square fallback if the shape is unknown. */
export function shapeSize(shape: number | undefined): readonly [number, number] {
  return (shape !== undefined && SHAPE_SIZE[shape]) || [32, 32];
}
