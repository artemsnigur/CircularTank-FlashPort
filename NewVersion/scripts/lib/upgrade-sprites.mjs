/**
 * The 28 shop tile clips, by SWF symbol id.
 *
 * Hand-kept like `bestiary-sprites.mjs` and for the same reason: the id only
 * exists on the AS3 class's `[Embed(... symbol="symbolNNN")]` line. Each row is
 * greppable as `symbol=` in `SWFimported/scripts/Button<Category><Name>.as`.
 *
 * ── Two clip shapes, and the frame grid behind them ───────────────────────
 * The 24 weapons extend `ButtonWeapon` and carry **9** frames; the 4 misc
 * upgrades extend `ButtonMisc` and carry **6**. Both are a grid of state x
 * interaction, read off the `gotoAndStop` calls:
 *
 *   ButtonWeapon (`:145-206`)        rest  hover  pressed
 *     owned, not equipped              1     2      3
 *     owned, equipped                  4     5      6
 *     not owned                        7     8      9
 *
 *   ButtonMisc (`:129-160`)          rest  hover  pressed
 *     owned                            1     2      3
 *     not owned                        4     5      6
 *
 * **The not-owned row uses a different glyph** — 605 where Big Cannon's owned
 * rows use 597 — so the original already draws an unowned weapon as its own
 * picture rather than dimming the owned one. That is worth knowing before
 * anyone reaches for a CSS filter.
 *
 * Keyed by `upgradeData.ts` id, so one key reaches the tile, the spec, the
 * stat tracks and the preview lines.
 */
export const UPGRADE_SPRITE_IDS = Object.freeze({
  /* misc — ButtonMisc*, 6 frames */
  Speed: 695,
  BulletReflect: 688,
  EnemyAbsorb: 685,
  KillReload: 692,

  /* primaries — ButtonPrimary*, 9 frames */
  Cannon: 733,
  MiniGun: 643,
  BigCannon: 606,
  Flamethrower: 640,
  Shotgun: 638,
  TimedBombCannon: 633,
  GummyBearCannon: 636,
  PoisonCannon: 609,
  LaserCannon: 629,
  CakeCannon: 618,
  PenetrationCannon: 612,
  MagicCannon: 615,

  /* secondaries — ButtonSecondary*, 9 frames */
  Mine: 704,
  Grenade: 731,
  IceGrenade: 716,
  PoisonGrenade: 713,
  Icicles: 710,
  PoisonSpikes: 707,
  Shield: 701,
  Rockets: 698,
  Iceball: 728,
  Lavaball: 725,
  CrazyCheese: 722,
  MagicBunny: 719,
});
