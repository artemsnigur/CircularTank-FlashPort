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
