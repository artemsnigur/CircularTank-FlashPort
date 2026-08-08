/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run projectiles:data
 *
 * Which texture each projectile class draws, and at what size, resolved from
 * assets.swf. See scripts/gen-projectile-art.mjs for why the size comes from
 * the SWF's own placement matrix rather than from `bulletRadius`.
 *
 * Sizes are **design units** — the shape's authored size times the placement
 * matrix. They are a *visual* dimension and deliberately unrelated to the
 * collision radius, exactly as in the original.
 */

export interface ProjectileArt {
  /** Texture key, shared by every class that places the same shape. */
  key: string;
  /** Display width in design units. */
  width: number;
  /** Display height in design units. */
  height: number;
}

/**
 * By AS3 class name, as `Bullet` is constructed with.
 *
 * Four classes intentionally share `projectile-215` at different sizes — that
 * is the original's own arrangement, not a gap.
 */
export const PROJECTILE_ART: Readonly<Record<string, ProjectileArt>> = Object.freeze({
  Bullet: { key: 'projectile-215', width: 8, height: 4 }, // sprite 264 -> shape 215
  BulletSmall: { key: 'projectile-215', width: 16, height: 3 }, // sprite 217 -> shape 215
  BulletBig: { key: 'projectile-215', width: 12, height: 6 }, // sprite 247 -> shape 215
  BulletFire: { key: 'projectile-218', width: 34, height: 34 }, // sprite 221 -> shape 218, 1 of 3 across 3 frames
  BulletShotgun: { key: 'projectile-215', width: 16, height: 3 }, // sprite 216 -> shape 215
  BulletBomb: { key: 'projectile-226', width: 11.75, height: 11.75 }, // sprite 236 -> shape 226, 1 of 10 across 16 frames
  BulletGummyBear: { key: 'projectile-222', width: 21, height: 11.6 }, // sprite 225 -> shape 222, 1 of 3 across 3 frames
  BulletPoison: { key: 'projectile-254', width: 12.05, height: 12.1 }, // sprite 255 -> shape 254
  BulletLaser: { key: 'projectile-256', width: 1008, height: 24 }, // sprite 259 -> shape 256, 1 of 3 across 4 frames
  BulletCake: { key: 'projectile-241', width: 21, height: 21 }, // sprite 242 -> shape 241
  BulletCakePiece: { key: 'projectile-239', width: 11, height: 8.75 }, // sprite 240 -> shape 239
  BulletPenetrate: { key: 'projectile-243', width: 12, height: 6 }, // sprite 244 -> shape 243
  BulletMagic: { key: 'projectile-245', width: 20, height: 20 }, // sprite 246 -> shape 245
  BulletIcicle: { key: 'projectile-252', width: 20.5, height: 8.05 }, // sprite 253 -> shape 252
  BulletPoisonSpike: { key: 'projectile-248', width: 19.55, height: 10 }, // sprite 249 -> shape 248
  BulletRocket: { key: 'projectile-250', width: 16.2, height: 7.2 }, // sprite 251 -> shape 250
  BulletIceball: { key: 'projectile-262', width: 31, height: 31 }, // sprite 263 -> shape 262
  BulletLavaball: { key: 'projectile-260', width: 31, height: 31 }, // sprite 261 -> shape 260
  BulletCrazyCheese: { key: 'projectile-237', width: 21, height: 16.5 }, // sprite 238 -> shape 237
  BulletMagicBunny: { key: 'projectile-213', width: 27.1, height: 17.3 }, // sprite 214 -> shape 213
  ObjectGrenade: { key: 'projectile-1180', width: 13.05, height: 16.9 }, // sprite 1181 -> shape 1180
  ObjectIceGrenade: { key: 'projectile-1178', width: 13.05, height: 16.9 }, // sprite 1179 -> shape 1178
  ObjectPoisonGrenade: { key: 'projectile-1176', width: 13.05, height: 16.9 }, // sprite 1177 -> shape 1176
  ObjectMine: { key: 'projectile-702', width: 21, height: 21 }, // sprite 1143 -> shape 702, 1 of 2 across 30 frames
  ObjectGroundIce: { key: 'projectile-1138', width: 40, height: 40 }, // sprite 1141 -> shape 1138, 1 of 3 across 3 frames
  ObjectGroundLava: { key: 'projectile-1134', width: 39.95, height: 40 }, // sprite 1137 -> shape 1134, 1 of 3 across 3 frames
});

/** One raster per distinct shape, for the preloader. */
export const PROJECTILE_SHAPE_FILES: readonly {
  key: string;
  file: string;
  width: number;
  height: number;
}[] = Object.freeze([
  { key: 'projectile-1134', file: '1134.svg', width: 159.8, height: 160 },
  { key: 'projectile-1138', file: '1138.svg', width: 160, height: 160 },
  { key: 'projectile-1176', file: '1176.svg', width: 52.2, height: 67.6 },
  { key: 'projectile-1178', file: '1178.svg', width: 52.2, height: 67.6 },
  { key: 'projectile-1180', file: '1180.svg', width: 52.2, height: 67.6 },
  { key: 'projectile-213', file: '213.svg', width: 108.4, height: 69.2 },
  { key: 'projectile-215', file: '215.svg', width: 64, height: 12 },
  { key: 'projectile-218', file: '218.svg', width: 136, height: 136 },
  { key: 'projectile-222', file: '222.svg', width: 84, height: 46.4 },
  { key: 'projectile-226', file: '226.svg', width: 47, height: 47 },
  { key: 'projectile-237', file: '237.svg', width: 84, height: 66 },
  { key: 'projectile-239', file: '239.svg', width: 44, height: 35 },
  { key: 'projectile-241', file: '241.svg', width: 84, height: 84 },
  { key: 'projectile-243', file: '243.svg', width: 48, height: 24 },
  { key: 'projectile-245', file: '245.svg', width: 80, height: 80 },
  { key: 'projectile-248', file: '248.svg', width: 78.2, height: 40 },
  { key: 'projectile-250', file: '250.svg', width: 64.8, height: 28.8 },
  { key: 'projectile-252', file: '252.svg', width: 82, height: 32.2 },
  { key: 'projectile-254', file: '254.svg', width: 48.2, height: 48.4 },
  { key: 'projectile-256', file: '256.svg', width: 4032, height: 96 },
  { key: 'projectile-260', file: '260.svg', width: 124, height: 124 },
  { key: 'projectile-262', file: '262.svg', width: 124, height: 124 },
  { key: 'projectile-702', file: '702.svg', width: 84, height: 84 },
]);
