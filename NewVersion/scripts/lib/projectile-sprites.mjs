/**
 * Every projectile class, by the `symbolN` in its own `[Embed]` tag.
 *
 * These are **sprite** character ids, not shape ids. The shapes each one places
 * are derived from the SWF (`sprite-shapes.mjs`), so this table is the only
 * hand-maintained part of the chain — and every row is checkable in one step:
 * `grep symbol= SWFimported/scripts/<class>.as`.
 *
 * It lives here rather than in `sync-assets.mjs` because three things now need
 * it — the sync's curated shape list, the generated runtime art table, and the
 * test that pins them — and a second copy is how `countCrowd` and `canAfford`
 * drifted from their callers.
 *
 * Order is the AS3's own: primaries as `ScreenUpgrades.primaryNameArray` lists
 * them, then secondaries as `secondaryNameArray` does.
 */
export const PROJECTILE_SPRITES = Object.freeze({
  /* ── Primaries — PartGameArea `new Bullet*()` ─────────────────────────── */
  Bullet: 264, // Cannon
  BulletSmall: 217, // MiniGun
  BulletBig: 247, // Big Cannon
  BulletFire: 221, // Flamethrower
  BulletShotgun: 216, // Shotgun
  BulletBomb: 236, // Timed Bomb Cannon
  BulletGummyBear: 225, // Gummy Bear Cannon
  BulletPoison: 255, // Poison Cannon
  BulletLaser: 259, // Laser Cannon
  BulletCake: 242, // Cake Cannon
  BulletCakePiece: 240, // Cake Cannon fragments
  BulletPenetrate: 244, // Penetration Cannon
  BulletMagic: 246, // Magic Cannon

  /* ── Secondaries ──────────────────────────────────────────────────────── */
  BulletIcicle: 253, // Icicles
  BulletPoisonSpike: 249, // Poison Spikes
  BulletRocket: 251, // Rockets
  BulletIceball: 263, // Ice Ball
  BulletLavaball: 261, // Lava Ball
  BulletCrazyCheese: 238, // Crazy Cheese
  BulletMagicBunny: 214, // Magic Bunny
  ObjectGrenade: 1181, // Grenade
  ObjectIceGrenade: 1179, // Ice Grenade
  ObjectPoisonGrenade: 1177, // Poison Grenade
  ObjectMine: 1143, // Mine
  ObjectGroundIce: 1141, // Ice Ball ground patch
  ObjectGroundLava: 1137, // Lava Ball ground patch
});

/** Just the ids, for `shapeIdsForSprites`. */
export const PROJECTILE_SPRITE_IDS = Object.freeze(Object.values(PROJECTILE_SPRITES));
