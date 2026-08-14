/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run upgrade-art:data
 *
 * The 28 shop tiles, frame by frame. See scripts/gen-upgrade-art.mjs for the
 * frame grid and the checks that keep it true.
 *
 * Frame numbers are the AS3's own `gotoAndStop` arguments — 1-based.
 * `upgradeTileFrame` picks the resting one for a row's state; hover and
 * pressed are generated and undrawn, because this port lists every upgrade at
 * once instead of selecting one (see `A16` for the same call on the bestiary).
 */

/** SWF shape ids for one frame, back to front: `[plate, glyph, badge?]`. */
export type UpgradeTileLayers = readonly number[];

export interface UpgradeTileClip {
  /** SWF symbol id, as named in the AS3 `[Embed]` line. */
  symbol: number;
  /**
   * True for the 24 weapons, which carry an equipped row; false for the 4 misc
   * upgrades, which cannot be equipped and have six frames rather than nine.
   */
  equippable: boolean;
  /** Frame 1 first — index 0 is `gotoAndStop(1)`. */
  frames: readonly UpgradeTileLayers[];
}

/**
 * The resting frame for each state — `ButtonWeapon.as:193-206` and
 * `ButtonMisc.as:129-160`.
 *
 * Named rather than written as 1/4/7 at the call site, because "frame 7" says
 * nothing about what it draws and `notOwned` says all of it.
 */
export const UPGRADE_TILE_REST_FRAME = Object.freeze({
  owned: 1,
  /** Weapons only; a misc tile has no equipped row. */
  equipped: 4,
  /** 7 on a weapon, 4 on a misc upgrade — `upgradeTileFrame` resolves it. */
  notOwnedWeapon: 7,
  notOwnedMisc: 4,
});

export const UPGRADE_TILE_CLIPS: Readonly<Record<string, UpgradeTileClip>> = Object.freeze({
  Speed: {
    symbol: 695,
    equippable: false,
    frames: [
      [596, 693],
      [596, 693, 598],
      [690, 693, 683],
      [596, 694],
      [596, 694, 598],
      [599, 694, 600],
    ],
  },
  BulletReflect: {
    symbol: 688,
    equippable: false,
    frames: [
      [596, 686],
      [596, 686, 598],
      [682, 686, 683],
      [596, 687],
      [596, 687, 598],
      [599, 687, 600],
    ],
  },
  EnemyAbsorb: {
    symbol: 685,
    equippable: false,
    frames: [
      [680, 681],
      [596, 681, 598],
      [682, 681, 683],
      [596, 684],
      [596, 684, 598],
      [599, 684, 600],
    ],
  },
  KillReload: {
    symbol: 692,
    equippable: false,
    frames: [
      [596, 689],
      [596, 689, 598],
      [690, 689, 683],
      [596, 691],
      [596, 691, 598],
      [599, 691, 600],
    ],
  },
  Cannon: {
    symbol: 733,
    equippable: true,
    frames: [
      [596, 619],
      [596, 619, 598],
      [599, 619, 600],
      [601, 619, 602],
      [603, 619, 598],
      [604, 619, 600],
      [596, 732],
      [596, 732, 598],
      [599, 732, 600],
    ],
  },
  MiniGun: {
    symbol: 643,
    equippable: true,
    frames: [
      [596, 641],
      [596, 641, 598],
      [599, 641, 600],
      [601, 641, 602],
      [603, 641, 598],
      [604, 641, 600],
      [596, 642],
      [596, 642, 598],
      [599, 642, 600],
    ],
  },
  BigCannon: {
    symbol: 606,
    equippable: true,
    frames: [
      [596, 597],
      [596, 597, 598],
      [599, 597, 600],
      [601, 597, 602],
      [603, 597, 598],
      [604, 597, 600],
      [596, 605],
      [596, 605, 598],
      [599, 605, 600],
    ],
  },
  Flamethrower: {
    symbol: 640,
    equippable: true,
    frames: [
      [596, 621],
      [596, 621, 598],
      [599, 621, 600],
      [601, 621, 602],
      [603, 621, 598],
      [604, 621, 600],
      [596, 639],
      [596, 639, 598],
      [599, 639, 600],
    ],
  },
  Shotgun: {
    symbol: 638,
    equippable: true,
    frames: [
      [596, 622],
      [596, 622, 598],
      [599, 622, 600],
      [601, 622, 602],
      [603, 622, 598],
      [604, 622, 600],
      [596, 637],
      [596, 637, 598],
      [599, 637, 600],
    ],
  },
  TimedBombCannon: {
    symbol: 633,
    equippable: true,
    frames: [
      [596, 630],
      [596, 630, 598],
      [599, 630, 631],
      [601, 630, 602],
      [603, 630, 598],
      [604, 630, 600],
      [596, 632],
      [596, 632, 598],
      [599, 632, 600],
    ],
  },
  GummyBearCannon: {
    symbol: 636,
    equippable: true,
    frames: [
      [634, 624],
      [596, 624, 598],
      [599, 624, 600],
      [601, 624, 602],
      [603, 624, 598],
      [604, 624, 600],
      [596, 635],
      [596, 635, 598],
      [599, 635, 600],
    ],
  },
  PoisonCannon: {
    symbol: 609,
    equippable: true,
    frames: [
      [596, 607],
      [596, 607, 598],
      [599, 607, 600],
      [601, 607, 602],
      [603, 607, 598],
      [604, 607, 600],
      [596, 608],
      [596, 608, 598],
      [599, 608, 600],
    ],
  },
  LaserCannon: {
    symbol: 629,
    equippable: true,
    frames: [
      [596, 627],
      [596, 627, 598],
      [599, 627, 600],
      [601, 627, 602],
      [603, 627, 598],
      [604, 627, 600],
      [596, 628],
      [596, 628, 598],
      [599, 628, 600],
    ],
  },
  CakeCannon: {
    symbol: 618,
    equippable: true,
    frames: [
      [596, 616],
      [596, 616, 598],
      [599, 616, 600],
      [601, 616, 602],
      [603, 616, 598],
      [604, 616, 600],
      [596, 617],
      [596, 617, 598],
      [599, 617, 600],
    ],
  },
  PenetrationCannon: {
    symbol: 612,
    equippable: true,
    frames: [
      [596, 610],
      [596, 610, 598],
      [599, 610, 600],
      [601, 610, 602],
      [603, 610, 598],
      [604, 610, 600],
      [596, 611],
      [596, 611, 598],
      [599, 611, 600],
    ],
  },
  MagicCannon: {
    symbol: 615,
    equippable: true,
    frames: [
      [596, 613],
      [596, 613, 598],
      [599, 613, 600],
      [601, 613, 602],
      [603, 613, 598],
      [604, 613, 600],
      [596, 614],
      [596, 614, 598],
      [599, 614, 600],
    ],
  },
  Mine: {
    symbol: 704,
    equippable: true,
    frames: [
      [596, 702],
      [596, 702, 598],
      [599, 702, 600],
      [601, 702, 602],
      [603, 702, 598],
      [604, 702, 600],
      [596, 703],
      [596, 703, 598],
      [599, 703, 600],
    ],
  },
  Grenade: {
    symbol: 731,
    equippable: true,
    frames: [
      [596, 729],
      [596, 729, 598],
      [599, 729, 600],
      [601, 729, 602],
      [603, 729, 598],
      [604, 729, 600],
      [596, 730],
      [596, 730, 598],
      [599, 730, 600],
    ],
  },
  IceGrenade: {
    symbol: 716,
    equippable: true,
    frames: [
      [596, 714],
      [596, 714, 598],
      [599, 714, 600],
      [601, 714, 602],
      [603, 714, 598],
      [604, 714, 600],
      [596, 715],
      [596, 715, 598],
      [599, 715, 600],
    ],
  },
  PoisonGrenade: {
    symbol: 713,
    equippable: true,
    frames: [
      [596, 711],
      [596, 711, 598],
      [599, 711, 600],
      [601, 711, 602],
      [603, 711, 598],
      [604, 711, 600],
      [596, 712],
      [596, 712, 598],
      [599, 712, 600],
    ],
  },
  Icicles: {
    symbol: 710,
    equippable: true,
    frames: [
      [596, 708],
      [596, 708, 598],
      [599, 708, 600],
      [601, 708, 602],
      [603, 708, 598],
      [604, 708, 600],
      [596, 709],
      [596, 709, 598],
      [599, 709, 600],
    ],
  },
  PoisonSpikes: {
    symbol: 707,
    equippable: true,
    frames: [
      [596, 705],
      [596, 705, 598],
      [599, 705, 600],
      [601, 705, 602],
      [603, 705, 598],
      [604, 705, 600],
      [596, 706],
      [596, 706, 598],
      [599, 706, 600],
    ],
  },
  Shield: {
    symbol: 701,
    equippable: true,
    frames: [
      [596, 699],
      [596, 699, 598],
      [599, 699, 600],
      [601, 699, 602],
      [603, 699, 598],
      [604, 699, 600],
      [596, 700],
      [596, 700, 598],
      [599, 700, 600],
    ],
  },
  Rockets: {
    symbol: 698,
    equippable: true,
    frames: [
      [596, 696],
      [596, 696, 598],
      [599, 696, 600],
      [601, 696, 602],
      [603, 696, 598],
      [604, 696, 600],
      [596, 697],
      [596, 697, 598],
      [599, 697, 600],
    ],
  },
  Iceball: {
    symbol: 728,
    equippable: true,
    frames: [
      [596, 726],
      [596, 726, 598],
      [599, 726, 600],
      [601, 726, 602],
      [603, 726, 598],
      [604, 726, 600],
      [596, 727],
      [596, 727, 598],
      [599, 727, 600],
    ],
  },
  Lavaball: {
    symbol: 725,
    equippable: true,
    frames: [
      [596, 723],
      [596, 723, 598],
      [599, 723, 600],
      [601, 723, 602],
      [603, 723, 598],
      [604, 723, 600],
      [596, 724],
      [596, 724, 598],
      [599, 724, 600],
    ],
  },
  CrazyCheese: {
    symbol: 722,
    equippable: true,
    frames: [
      [596, 720],
      [596, 720, 598],
      [599, 720, 600],
      [601, 720, 602],
      [603, 720, 598],
      [604, 720, 600],
      [596, 721],
      [596, 721, 598],
      [599, 721, 600],
    ],
  },
  MagicBunny: {
    symbol: 719,
    equippable: true,
    frames: [
      [596, 717],
      [596, 717, 598],
      [599, 717, 600],
      [601, 717, 602],
      [603, 717, 598],
      [604, 717, 600],
      [596, 718],
      [596, 718, 598],
      [599, 718, 600],
    ],
  },
});

/** Every shape id the tiles draw — what the asset sync must have copied. */
export const UPGRADE_TILE_SHAPE_IDS: readonly number[] = Object.freeze(
  [596,597,598,599,600,601,602,603,604,605,607,608,610,611,613,614,616,617,619,621,622,624,627,628,630,631,632,634,635,637,639,641,642,680,681,682,683,684,686,687,689,690,691,693,694,696,697,699,700,702,703,705,706,708,709,711,712,714,715,717,718,720,721,723,724,726,727,729,730,732],
);
