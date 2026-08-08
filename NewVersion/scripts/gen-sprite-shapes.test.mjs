/**
 * Does the sprite -> shape mapping resolve the projectile art?
 *
 * **This is the mapping question only.** Nothing here touches rendering: no
 * manifest entry, no texture key, no `Bullet.ts`. That separation is the point
 * of landing the mapping on its own — "the mapping is wrong" and "the game
 * looks wrong" would otherwise fail together and be awkward to tell apart.
 *
 * The facts asserted below were derived by walking `assets.swf` and then
 * cross-checked against the class `[Embed]` tags, which name the sprite ids
 * independently. Where a number could plausibly be two different things —
 * shapes placed versus timeline frames — both are pinned, because conflating
 * them is the specific mistake this data invites.
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { SHAPE_IDS, SPRITE_SHAPES, shapeIdsForSprites } from './lib/sprite-shapes.mjs';

// Vitest rewrites `import.meta.url` to a non-file scheme for transformed
// modules, so resolve from the project root instead — the same reason and the
// same fix as `mp3-probe.test.mjs:13-16`.
const shapesDir = resolve(process.cwd(), '../SWFimported/shapes');

/**
 * Every projectile class, by the `symbolN` in its own `[Embed]` tag.
 *
 * Restated here rather than imported from `sync-assets.mjs`: this table is the
 * *claim* being tested, and a test that reads its expectation from the code
 * under test asserts nothing. Each id is checkable against the AS3 by grepping
 * `symbol=` in the named class.
 */
const PROJECTILES = {
  Bullet: 264,
  BulletSmall: 217,
  BulletBig: 247,
  BulletFire: 221,
  BulletShotgun: 216,
  BulletBomb: 236,
  BulletGummyBear: 225,
  BulletPoison: 255,
  BulletLaser: 259,
  BulletCake: 242,
  BulletCakePiece: 240,
  BulletPenetrate: 244,
  BulletMagic: 246,
  BulletIcicle: 253,
  BulletPoisonSpike: 249,
  BulletRocket: 251,
  BulletIceball: 263,
  BulletLavaball: 261,
  BulletCrazyCheese: 238,
  BulletMagicBunny: 214,
  ObjectGrenade: 1181,
  ObjectIceGrenade: 1179,
  ObjectPoisonGrenade: 1177,
  ObjectMine: 1143,
  ObjectGroundIce: 1141,
  ObjectGroundLava: 1137,
};

const shapesOf = (name) => shapeIdsForSprites([PROJECTILES[name]]);

describe('every projectile sprite resolves to extracted art', () => {
  it('maps all 26 classes to at least one shape', () => {
    const unresolved = Object.keys(PROJECTILES).filter((n) => shapesOf(n).size === 0);
    expect(unresolved, 'classes whose sprite places no shape').toEqual([]);
    expect(Object.keys(PROJECTILES)).toHaveLength(26);
  });

  /**
   * The whole reason this mapping exists: the art was reported missing because
   * `shapes/<spriteId>.svg` does not exist. It never did — the shapes are under
   * *shape* ids.
   *
   * Both halves are asserted on the same ids, because "every file exists" is
   * satisfied by an empty set. The counterpart is that the **sprite** ids are
   * simultaneously *not* files, which is what makes the indirection real rather
   * than a rename.
   */
  it('resolves to 43 shape files that exist, from sprite ids that do not', () => {
    const shapes = shapeIdsForSprites(Object.values(PROJECTILES));
    expect(shapes.size, 'distinct shapes across all projectiles').toBe(43);

    const missing = [...shapes].filter((id) => !existsSync(join(shapesDir, `${id}.svg`)));
    expect(missing, 'shape ids with no extracted svg').toEqual([]);

    // The counterpart. If sprite ids were also shape files, the mapping would
    // be pointless and this suite would be testing nothing.
    const spritesThatAreFiles = Object.values(PROJECTILES).filter((id) =>
      existsSync(join(shapesDir, `${id}.svg`)),
    );
    expect(spritesThatAreFiles, 'sprite ids must not resolve as shape files').toEqual([]);
  });

  it('reports every projectile sprite as a known sprite', () => {
    for (const [name, id] of Object.entries(PROJECTILES)) {
      expect(SPRITE_SHAPES[id], `${name} (sprite ${id})`).toBeDefined();
    }
  });
});

describe('the specific facts the mapping revealed', () => {
  /**
   * Four primaries share one shape **in the original**.
   *
   * This matters beyond bookkeeping: the port's "all primaries look identical"
   * complaint is *faithful* for exactly these four, and a future pass giving
   * them distinct art would be inventing a difference the AS3 does not have.
   *
   * Asserted as an exact set both ways — the four that share 215, and that no
   * fifth projectile does — so the claim cannot quietly widen.
   */
  it('gives Cannon, MiniGun, Big Cannon and Shotgun the same shape 215', () => {
    for (const name of ['Bullet', 'BulletSmall', 'BulletBig', 'BulletShotgun']) {
      expect([...shapesOf(name)], name).toEqual([215]);
    }

    const alsoUse215 = Object.keys(PROJECTILES).filter((n) => shapesOf(n).has(215));
    expect(alsoUse215.sort()).toEqual(
      ['Bullet', 'BulletBig', 'BulletShotgun', 'BulletSmall'].sort(),
    );
  });

  /**
   * The three grenades do **not** share art — and the port currently draws them
   * with one tint (`GameplayScene.ts:2269`), which is therefore a real
   * infidelity rather than a faithful collapse.
   *
   * Pinned as three distinct ids *and* as a set of size 3, so a mapping that
   * returned the same id three times fails.
   */
  it('gives the three grenades three distinct shapes', () => {
    expect([...shapesOf('ObjectGrenade')]).toEqual([1180]);
    expect([...shapesOf('ObjectIceGrenade')]).toEqual([1178]);
    expect([...shapesOf('ObjectPoisonGrenade')]).toEqual([1176]);

    const all = shapeIdsForSprites([1181, 1179, 1177]);
    expect(all.size, 'three grenades, three shapes').toBe(3);
  });

  /**
   * **Shapes placed and timeline frames are different numbers**, and this is
   * the assertion that stops them being conflated.
   *
   * `BulletBomb` places 10 shapes across 16 frames; `ObjectMine` places 2
   * across 30. Asserting only one of each pair would let a future change swap
   * the meanings without failing anything.
   */
  it('keeps shapes-placed and frameCount apart', () => {
    expect([...shapesOf('BulletBomb')].sort((a, b) => a - b)).toEqual([
      226, 227, 228, 229, 230, 231, 232, 233, 234, 235,
    ]);
    expect(SPRITE_SHAPES[236].frameCount, 'BulletBomb frames').toBe(16);

    expect([...shapesOf('ObjectMine')].sort((a, b) => a - b)).toEqual([702, 1142]);
    expect(SPRITE_SHAPES[1143].frameCount, 'ObjectMine frames').toBe(30);
  });

  /** The other animated projectiles, so their frame counts are on the record. */
  it('records the remaining multi-shape projectiles', () => {
    const expected = {
      BulletFire: { shapes: [218, 219, 220], frames: 3 },
      BulletGummyBear: { shapes: [222, 223, 224], frames: 3 },
      BulletLaser: { shapes: [256, 257, 258], frames: 4 },
      ObjectGroundIce: { shapes: [1138, 1139, 1140], frames: 3 },
      ObjectGroundLava: { shapes: [1134, 1135, 1136], frames: 3 },
    };

    for (const [name, { shapes, frames }] of Object.entries(expected)) {
      expect([...shapesOf(name)].sort((a, b) => a - b), name).toEqual(shapes);
      expect(SPRITE_SHAPES[PROJECTILES[name]].frameCount, `${name} frames`).toBe(frames);
    }
  });

  /** A single-shape projectile, so "everything is animated" cannot pass. */
  it('leaves single-frame projectiles single', () => {
    expect([...shapesOf('BulletRocket')]).toEqual([250]);
    expect(SPRITE_SHAPES[251].frameCount).toBe(1);
  });
});

describe('the mapping is honest about what a placement is', () => {
  /**
   * `places` includes nested sprites and other character types, not only
   * shapes — 1066 placed ids against 1015 shapes across the file. If this ever
   * became "every placement is a shape", `shapeIdsForSprites` would silently
   * start returning sprite ids and the sync would look for files that are not
   * there.
   */
  it('does not treat every placement as a shape', () => {
    const placed = new Set(Object.values(SPRITE_SHAPES).flatMap((s) => s.places));
    const shapes = new Set(SHAPE_IDS);
    const notShapes = [...placed].filter((id) => !shapes.has(id));

    expect(notShapes.length, 'placements that are not shapes').toBeGreaterThan(0);
    expect(placed.size).toBeGreaterThan(shapes.size);
  });

  /**
   * The tag walk found exactly as many shapes as JPEXS exported files.
   *
   * Two independent tools over the same SWF agreeing on 1015 is what makes the
   * walk trustworthy — a parser that silently stopped early would still emit a
   * plausible mapping, and only a count from outside itself can catch that.
   */
  it('finds the same 1015 shapes JPEXS exported', () => {
    expect(SHAPE_IDS).toHaveLength(1015);
    const missing = SHAPE_IDS.filter((id) => !existsSync(join(shapesDir, `${id}.svg`)));
    expect(missing, 'shapes defined in the SWF but not exported').toEqual([]);
  });
});
