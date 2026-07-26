/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run upgrades:data
 *
 * Balance tables from SWFimported/scripts/ScreenUpgrades.as.
 */

export type UpgradeCategory = 'misc' | 'primary' | 'secondary';

export interface UpgradeSpec {
  /** AS3 table stem, e.g. "Cannon" from upgradeArrayCannon. */
  id: string;
  /** Display name from the matching name array. */
  name: string;
  category: UpgradeCategory;
  /** Position within its category, 0-based. */
  index: number;
  /**
   * Cost to go from level N to N+1 is `prices[N]`. 10 entries cover
   * levels 0->1 through 9->10. A price of 0 at index 0 means the item is
   * free to unlock, which is how Cannon and Mine start owned.
   */
  prices: readonly number[];
  /** Per-level stat tracks; meaning is weapon-specific. */
  stats: readonly (readonly number[])[];
  /**
   * True when stat tracks have 11 entries and are indexed by level
   * directly (level 0 has a baseline). False when they have 10 and are
   * indexed by level - 1, undefined at level 0.
   */
  statsIncludeLevelZero: boolean;
  /** Level the player starts with — 1 for the free starter items. */
  startLevel: number;
}

/** Every upgrade can be taken to level 10 (levelsMaxArray*). */
export const MAX_UPGRADE_LEVEL = 10;

/** 4 misc upgrades, in AS3 order. */
export const MISC_UPGRADES: readonly UpgradeSpec[] = [
  {
    id: "Speed",
    name: "Tank Speed",
    category: "misc",
    index: 0,
    prices: [2000, 2400, 2900, 3400, 4100, 4900, 5800, 7000, 8400, 10000],
    stats: [
      [3.25, 3.5, 3.75, 4, 4.25, 4.5, 4.75, 5, 5.25, 5.5, 5.75],
      [0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1],
      [0.2, 0.22, 0.24, 0.26, 0.28, 0.3, 0.32, 0.34, 0.36, 0.38, 0.4],
    ],
    statsIncludeLevelZero: true,
    startLevel: 0,
  },
  {
    id: "BulletReflect",
    name: "Bullet Reflection",
    category: "misc",
    index: 1,
    prices: [3000, 3500, 4100, 4800, 5700, 6600, 7800, 9100, 10600, 12500],
    stats: [
      [0.1, 0.125, 0.15, 0.175, 0.2, 0.225, 0.25, 0.275, 0.3, 0.325],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "EnemyAbsorb",
    name: "Enemy Absorption",
    category: "misc",
    index: 2,
    prices: [3000, 3500, 4100, 4800, 5700, 6600, 7800, 9100, 10600, 12500],
    stats: [
      [0.1, 0.15, 0.19, 0.24, 0.28, 0.33, 0.37, 0.42, 0.46, 0.5],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "KillReload",
    name: "Kill Reload",
    category: "misc",
    index: 3,
    prices: [4000, 4600, 5400, 6200, 7200, 8300, 9700, 11100, 13000, 15000],
    stats: [
      [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
];

/** 12 primary upgrades, in AS3 order. */
export const PRIMARY_UPGRADES: readonly UpgradeSpec[] = [
  {
    id: "Cannon",
    name: "Cannon",
    category: "primary",
    index: 0,
    prices: [0, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000],
    stats: [
      [13, 12.8, 12.6, 12.3, 12.1, 11.9, 11.6, 11.4, 11.2, 11],
      [7, 7.33, 7.66, 8, 8.33, 8.66, 9, 9.33, 9.66, 10],
      [30, 33, 36, 39, 42, 45, 48, 51, 54, 57],
    ],
    statsIncludeLevelZero: false,
    startLevel: 1,
  },
  {
    id: "MiniGun",
    name: "MiniGun",
    category: "primary",
    index: 1,
    prices: [1300, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000],
    stats: [
      [1.45, 1.4, 1.35, 1.3, 1.25, 1.2, 1.15, 1.1, 1.05, 1],
      [1.2, 1.35, 1.5, 1.65, 1.8, 1.95, 2.1, 2.25, 2.4, 2.6],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "BigCannon",
    name: "Big Cannon",
    category: "primary",
    index: 2,
    prices: [1600, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000],
    stats: [
      [23.8, 23.6, 23.4, 23.2, 23, 22.8, 22.6, 22.4, 22.2, 22],
      [7, 7.33, 7.66, 8, 8.33, 8.66, 9, 9.33, 9.66, 10],
      [80, 82, 84, 87, 89, 91, 93, 95, 98, 100],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "Flamethrower",
    name: "Flamethrower",
    category: "primary",
    index: 3,
    prices: [1900, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000],
    stats: [
      [3.15, 3.02, 2.89, 2.77, 2.64, 2.52, 2.39, 2.27, 2.14, 2],
      [0.28, 0.31, 0.33, 0.36, 0.38, 0.41, 0.43, 0.46, 0.48, 0.5],
      [100, 105.5, 111.1, 116.65, 122.2, 127.75, 133.3, 138.85, 144.4, 150],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "Shotgun",
    name: "Shotgun",
    category: "primary",
    index: 4,
    prices: [2200, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000],
    stats: [
      [19.5, 19.4, 19.3, 19.2, 19.1, 19, 18.9, 18.8, 18.7, 18.6],
      [2.9, 2.96, 3.03, 3.09, 3.16, 3.23, 3.29, 3.36, 3.43, 3.5],
      [18, 20, 22, 24, 26, 28, 30, 32, 34, 36],
      [5, 5, 5, 7, 7, 7, 9, 9, 9, 9],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "TimedBombCannon",
    name: "Timed Bomb Cannon",
    category: "primary",
    index: 5,
    prices: [2400, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000],
    stats: [
      [9, 8.89, 8.78, 8.67, 8.56, 8.45, 8.34, 8.23, 8.12, 8],
      [8, 8.78, 9.56, 10.34, 11.12, 11.9, 12.68, 13.46, 14.24, 15],
      [110, 111, 112, 113, 114, 115, 116, 117, 118, 120],
      [150, 147, 144, 140, 137, 134, 130, 127, 124, 120],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "GummyBearCannon",
    name: "Gummy Bear Cannon",
    category: "primary",
    index: 6,
    prices: [2700, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000],
    stats: [
      [17, 16.8, 16.6, 16.4, 16.2, 16, 15.8, 15.6, 15.4, 15.2],
      [6, 6.5, 7.1, 7.7, 8.2, 8.8, 9.3, 9.9, 10.4, 11],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "PoisonCannon",
    name: "Poison Cannon",
    category: "primary",
    index: 7,
    prices: [3100, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000],
    stats: [
      [14, 13.8, 13.6, 13.4, 13.2, 13, 12.8, 12.6, 12.4, 12.2],
      [1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8],
      [150, 153.33, 156.66, 160, 163.33, 166.66, 170, 173.33, 176.66, 180],
      [2.5, 2.77, 3.05, 3.32, 3.6, 3.87, 4.15, 4.42, 4.7, 5],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "LaserCannon",
    name: "Laser Cannon",
    category: "primary",
    index: 8,
    prices: [3500, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000],
    stats: [
      [23, 22.8, 22.6, 22.4, 22.2, 22, 21.8, 21.6, 21.4, 21.2],
      [5.5, 6.22, 6.94, 7.66, 8.38, 9.1, 9.82, 10.54, 11.26, 12],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "CakeCannon",
    name: "Cake Cannon",
    category: "primary",
    index: 9,
    prices: [3900, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000],
    stats: [
      [14, 13.8, 13.6, 13.4, 13.2, 13, 12.8, 12.6, 12.4, 12.2],
      [5, 5.66, 6.33, 7, 7.66, 8.33, 9, 9.66, 10.33, 11],
      [6, 6, 6, 7, 7, 7, 7, 8, 8, 8],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "PenetrationCannon",
    name: "Penetration Cannon",
    category: "primary",
    index: 10,
    prices: [4400, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000],
    stats: [
      [19, 18.78, 18.56, 18.34, 18.12, 17.9, 17.68, 17.46, 17.24, 17],
      [6, 6.44, 6.88, 7.22, 7.66, 8, 8.44, 8.88, 9.22, 10],
      [40, 43, 46, 49, 52, 55, 58, 61, 64, 67],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "MagicCannon",
    name: "Magic Cannon",
    category: "primary",
    index: 11,
    prices: [5000, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000],
    stats: [
      [15, 14.8, 14.6, 14.4, 14.2, 14, 13.8, 13.6, 13.4, 13.2],
      [2.2, 2.35, 2.49, 2.64, 2.78, 2.93, 3.07, 3.22, 3.36, 3.5],
      [3, 3, 3, 3, 3, 4, 4, 4, 4, 4],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
];

/** 12 secondary upgrades, in AS3 order. */
export const SECONDARY_UPGRADES: readonly UpgradeSpec[] = [
  {
    id: "Mine",
    name: "Mine",
    category: "secondary",
    index: 0,
    prices: [0, 2500, 3000, 3700, 4500, 5500, 6800, 8300, 10200, 12500],
    stats: [
      [600, 600, 600, 600, 600, 600, 600, 600, 600, 600],
      [26, 27, 28, 29, 30, 31, 32, 33, 34, 35],
      [195, 200, 205, 210, 215, 220, 225, 230, 235, 240],
    ],
    statsIncludeLevelZero: false,
    startLevel: 1,
  },
  {
    id: "Grenade",
    name: "Grenade",
    category: "secondary",
    index: 1,
    prices: [2000, 2500, 3000, 3700, 4500, 5500, 6800, 8300, 10200, 12500],
    stats: [
      [650, 650, 650, 650, 650, 650, 650, 650, 650, 650],
      [22, 23, 24, 25, 26, 27, 28, 29, 30, 31],
      [175, 180, 185, 190, 195, 200, 205, 210, 215, 220],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "IceGrenade",
    name: "Ice Grenade",
    category: "secondary",
    index: 2,
    prices: [2000, 2500, 3000, 3700, 4500, 5500, 6800, 8300, 10200, 12500],
    stats: [
      [400, 400, 400, 400, 400, 400, 400, 400, 400, 400],
      [8, 8.4, 8.9, 9.3, 9.8, 10.3, 10.7, 11.1, 11.6, 12],
      [150, 157, 165, 173, 181, 188, 196, 204, 212, 220],
      [175, 189, 203, 217, 231, 244, 258, 272, 286, 300],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "PoisonGrenade",
    name: "Poison Grenade",
    category: "secondary",
    index: 3,
    prices: [2000, 2500, 3000, 3700, 4500, 5500, 6800, 8300, 10200, 12500],
    stats: [
      [650, 650, 650, 650, 650, 650, 650, 650, 650, 650],
      [4, 4.2, 4.4, 4.6, 4.8, 5.1, 5.3, 5.5, 5.7, 6],
      [175, 180, 185, 190, 195, 200, 205, 210, 215, 220],
      [360, 370, 380, 390, 400, 410, 420, 430, 440, 450],
      [2, 2.03, 2.06, 2.1, 2.13, 2.16, 2.2, 2.23, 2.26, 2.3],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "Icicles",
    name: "Icicles",
    category: "secondary",
    index: 4,
    prices: [2000, 2500, 3000, 3700, 4500, 5500, 6800, 8300, 10200, 12500],
    stats: [
      [400, 400, 400, 400, 400, 400, 400, 400, 400, 400],
      [8, 8.4, 8.9, 9.3, 9.8, 10.3, 10.7, 11.1, 11.6, 12],
      [175, 192, 208, 225, 242, 259, 276, 292, 308, 325],
      [23, 24, 25, 26, 27, 28, 29, 30, 31, 32],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "PoisonSpikes",
    name: "Poison Spikes",
    category: "secondary",
    index: 5,
    prices: [2000, 2500, 3000, 3700, 4500, 5500, 6800, 8300, 10200, 12500],
    stats: [
      [700, 700, 700, 700, 700, 700, 700, 700, 700, 700],
      [6, 6.3, 6.6, 7, 7.3, 7.6, 8, 8.3, 8.6, 9],
      [310, 320, 330, 340, 350, 360, 370, 380, 390, 400],
      [2.52, 2.52, 2.53, 2.53, 2.53, 2.54, 2.54, 2.54, 2.55, 2.55],
      [32, 32, 32, 32, 32, 32, 32, 32, 32, 32],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "Shield",
    name: "Shield",
    category: "secondary",
    index: 6,
    prices: [2500, 3000, 3600, 4300, 5100, 6100, 7300, 8700, 10500, 12500],
    stats: [
      [700, 700, 700, 700, 700, 700, 700, 700, 700, 700],
      [100, 110, 122, 136, 152, 170, 190, 212, 236, 262],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "Rockets",
    name: "Rockets",
    category: "secondary",
    index: 7,
    prices: [2500, 3000, 3600, 4300, 5100, 6100, 7300, 8700, 10500, 12500],
    stats: [
      [700, 700, 700, 700, 700, 700, 700, 700, 700, 700],
      [17, 17.3, 17.6, 18, 18.3, 18.6, 19, 19.3, 19.6, 20],
      [51, 52, 53, 54, 55, 56, 57, 58, 59, 60],
      [3, 3, 3, 3, 4, 4, 4, 5, 5, 5],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "Iceball",
    name: "Ice Ball",
    category: "secondary",
    index: 8,
    prices: [3000, 3500, 4100, 4800, 5700, 6600, 7800, 9100, 10700, 12500],
    stats: [
      [400, 400, 400, 400, 400, 400, 400, 400, 400, 400],
      [14, 14.9, 15.8, 16.7, 17.6, 18.4, 19.3, 20.2, 21.1, 22],
      [100, 104, 109, 113, 118, 122, 127, 131, 136, 140],
      [175, 192, 208, 225, 242, 259, 276, 292, 308, 325],
      [220, 229, 238, 247, 256, 264, 273, 282, 291, 300],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "Lavaball",
    name: "Lava Ball",
    category: "secondary",
    index: 9,
    prices: [3000, 3500, 4100, 4800, 5700, 6600, 7800, 9100, 10700, 12500],
    stats: [
      [700, 700, 700, 700, 700, 700, 700, 700, 700, 700],
      [15, 16.11, 17.22, 18.33, 19.44, 20.55, 21.66, 22.77, 23.88, 25],
      [110, 117, 123, 130, 137, 144, 150, 157, 163, 170],
      [15, 16.4, 17.9, 19.3, 20.8, 22.2, 23.7, 25.1, 26.6, 28],
      [250, 253, 256, 260, 263, 266, 270, 273, 276, 280],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "CrazyCheese",
    name: "Crazy Cheese",
    category: "secondary",
    index: 10,
    prices: [3500, 4000, 4600, 5300, 6200, 7100, 8200, 9400, 10900, 12500],
    stats: [
      [700, 700, 700, 700, 700, 700, 700, 700, 700, 700],
      [16, 16.7, 17.3, 18, 18.7, 19.3, 20, 20.7, 21.3, 22],
      [40, 42.5, 45, 47.5, 50, 52.5, 55, 57.5, 60, 62.5],
      [6, 6, 7, 7, 7, 8, 8, 8, 9, 9],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
  {
    id: "MagicBunny",
    name: "Magic Bunny",
    category: "secondary",
    index: 11,
    prices: [3500, 4000, 4600, 5300, 6200, 7100, 8200, 9400, 10900, 12500],
    stats: [
      [900, 900, 900, 900, 900, 900, 900, 900, 900, 900],
      [16, 17.6, 19.1, 20.7, 22.2, 23.8, 25.3, 26.9, 28.4, 30],
      [5, 5, 5, 5, 5, 6, 6, 6, 6, 6],
    ],
    statsIncludeLevelZero: false,
    startLevel: 0,
  },
];

export const UPGRADES_BY_CATEGORY: Record<UpgradeCategory, readonly UpgradeSpec[]> = {
  misc: MISC_UPGRADES,
  primary: PRIMARY_UPGRADES,
  secondary: SECONDARY_UPGRADES,
};

export const ALL_UPGRADES: readonly UpgradeSpec[] = [
  ...MISC_UPGRADES,
  ...PRIMARY_UPGRADES,
  ...SECONDARY_UPGRADES,
];

