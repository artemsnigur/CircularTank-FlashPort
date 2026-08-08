/**
 * Does every projectile draw its own art, and can the wiring fail quietly?
 *
 * Pass (a) proved the sprite → shape mapping in isolation. This is the other
 * half: that the mapping reaches a texture, that no two weapons silently share
 * one when the AS3 gives them different shapes, and that a missing entry cannot
 * fall back to the old shared circle unnoticed.
 */
import { describe, expect, it } from 'vitest';

import { PROJECTILE_ART, PROJECTILE_SHAPE_FILES, PROJECTILE_VARIANTS } from './projectileArt';
import { bounceGummy } from '../game/weapons/foodRounds';
import { PROJECTILE_SHAPES } from './manifest';

/**
 * Every class `GameplayScene` can hand to `new Bullet(...)`.
 *
 * Restated rather than derived from `PROJECTILE_ART`'s own keys — a test that
 * reads its expectation from the table under test proves only that the table
 * equals itself. These names come from `weapons/firing.ts`'s `bulletClass`
 * fields and the secondary spawn paths.
 */
const CONSTRUCTED_CLASSES = [
  'Bullet',
  'BulletSmall',
  'BulletBig',
  'BulletFire',
  'BulletShotgun',
  'BulletBomb',
  'BulletGummyBear',
  'BulletPoison',
  'BulletCake',
  'BulletCakePiece',
  'BulletPenetrate',
  'BulletMagic',
  'BulletIcicle',
  'BulletPoisonSpike',
  'BulletRocket',
  'BulletIceball',
  'BulletLavaball',
  'BulletCrazyCheese',
  'BulletMagicBunny',
];

describe('every projectile resolves to real art', () => {
  /**
   * The fallback in `Bullet`'s constructor is `particle-dot`, the shared circle
   * this pass exists to remove. It is reachable, so it must be unreachable *in
   * practice* — and that is a claim about coverage, not about the fallback.
   *
   * Without this, adding a weapon and forgetting its art would look completely
   * normal: a round would fire, fly and hit, drawn as a pale circle exactly as
   * everything did before.
   */
  it('has an entry for every class the scene constructs', () => {
    const missing = CONSTRUCTED_CLASSES.filter((name) => PROJECTILE_ART[name] === undefined);
    expect(missing, 'classes that would fall back to particle-dot').toEqual([]);
  });

  it('never resolves to the shared circle', () => {
    for (const name of CONSTRUCTED_CLASSES) {
      expect(PROJECTILE_ART[name].key, name).not.toBe('particle-dot');
      expect(PROJECTILE_ART[name].key, name).toMatch(/^projectile-\d+$/);
    }
  });

  /**
   * Every key a class asks for must be a texture the preloader actually loads.
   *
   * This is the seam a unit test usually cannot see: the table could be
   * internally perfect and name a key nothing loads, and the game would draw
   * a green "missing texture" box. Driven against the real manifest export, not
   * a copy of it.
   */
  it('names only textures the manifest loads', () => {
    const loaded = new Set(PROJECTILE_SHAPES.map((asset) => asset.key));
    for (const name of CONSTRUCTED_CLASSES) {
      expect(loaded.has(PROJECTILE_ART[name].key), `${name} -> ${PROJECTILE_ART[name].key}`).toBe(
        true,
      );
    }
    expect(PROJECTILE_SHAPES).toHaveLength(PROJECTILE_SHAPE_FILES.length);
  });
});

describe('weapons the AS3 draws differently are drawn differently', () => {
  /**
   * **The naive-wiring assertion.** A lookup keyed on the wrong thing — the
   * weapon's damage type, its category, or a partial map with a shared default
   * — collapses distinct weapons onto one appearance. That is invisible in a
   * screenshot of a single weapon and is exactly what this pass is fixing.
   *
   * "Appearance" is the key *and* the size together, because four classes
   * legitimately share a key at different sizes.
   */
  it('gives 19 constructed classes distinct appearances, bar the AS3 own sharers', () => {
    const appearance = (name: string): string => {
      const art = PROJECTILE_ART[name];
      return `${art.key}@${art.width}x${art.height}`;
    };

    const byAppearance = new Map<string, string[]>();
    for (const name of CONSTRUCTED_CLASSES) {
      const seen = byAppearance.get(appearance(name)) ?? [];
      seen.push(name);
      byAppearance.set(appearance(name), seen);
    }

    const collisions = [...byAppearance.entries()].filter(([, names]) => names.length > 1);

    // MiniGun and Shotgun genuinely place shape 215 at the same 1x1 in the AS3
    // (`sprite 217` and `sprite 216`), so they are the one permitted pair.
    expect(collisions.map(([, names]) => names.sort())).toEqual([
      ['BulletShotgun', 'BulletSmall'],
    ]);
  });

  /**
   * Shape 215's four sharers, pinned at their exact sizes.
   *
   * The AS3 distinguishes them *only* by a non-uniform placement matrix, which
   * the port's previous uniform `radius * 4` could not express — it drew
   * Cannon, MiniGun and Shotgun identically. Exact values, because they are
   * knowable: 16x3 authored, times the measured matrix.
   */
  it('keeps the four shape-215 sharers distinguishable by size', () => {
    expect(PROJECTILE_ART.Bullet).toEqual({ key: 'projectile-215', width: 8, height: 4 });
    expect(PROJECTILE_ART.BulletSmall).toEqual({ key: 'projectile-215', width: 16, height: 3 });
    expect(PROJECTILE_ART.BulletBig).toEqual({ key: 'projectile-215', width: 12, height: 6 });
    expect(PROJECTILE_ART.BulletShotgun).toEqual({ key: 'projectile-215', width: 16, height: 3 });

    // The counterpart: they really do share one texture, so this is a sizing
    // distinction and not four separate assets. If a future pass gave them
    // distinct art it would be inventing a difference the original lacks.
    const keys = new Set(
      ['Bullet', 'BulletSmall', 'BulletBig', 'BulletShotgun'].map((n) => PROJECTILE_ART[n].key),
    );
    expect(keys.size, 'one shared texture').toBe(1);
  });

  /**
   * The infidelity pass (a) uncovered, now closed: the three grenades have
   * three distinct shapes in the SWF, and the port drew them with one tint.
   */
  it('gives the three grenades three distinct textures', () => {
    const keys = ['ObjectGrenade', 'ObjectIceGrenade', 'ObjectPoisonGrenade'].map(
      (n) => PROJECTILE_ART[n].key,
    );
    expect(keys).toEqual(['projectile-1180', 'projectile-1178', 'projectile-1176']);
    expect(new Set(keys).size, 'three distinct').toBe(3);
  });
});

describe('the art table stays honest about size', () => {
  /** No zero or negative dimension — a 0-wide sprite is invisible, not small. */
  it('gives every entry a positive size', () => {
    for (const [name, art] of Object.entries(PROJECTILE_ART)) {
      expect(art.width, `${name} width`).toBeGreaterThan(0);
      expect(art.height, `${name} height`).toBeGreaterThan(0);
    }
  });

  /**
   * Rasters are supersampled relative to the drawn size, never smaller.
   *
   * A texture rasterised below its display size is the one failure that looks
   * fine in a desktop screenshot and blurs on a phone, which is the platform
   * this port ships to.
   */
  it('rasterises every shape at or above the largest size it is drawn at', () => {
    const rasterByKey = new Map(PROJECTILE_SHAPE_FILES.map((s) => [s.key, s]));

    for (const [name, art] of Object.entries(PROJECTILE_ART)) {
      const raster = rasterByKey.get(art.key);
      expect(raster, `${name} raster`).toBeDefined();
      expect(raster!.width, `${name} raster width`).toBeGreaterThanOrEqual(art.width);
      expect(raster!.height, `${name} raster height`).toBeGreaterThanOrEqual(art.height);
    }
  });
});

describe('frames the AS3 selects rather than plays', () => {
  /**
   * Exactly four classes carry selectable frames, and the membership is the
   * claim worth pinning — not the count.
   *
   * The other three multi-shape sprites (`BulletBomb`, `ObjectMine`,
   * `BulletLaser`) genuinely animate and are deliberately absent: they are
   * multi-layer composites and are deferred. If one of them appeared here it
   * would mean someone had wired an animation as a static variant pick, which
   * looks correct in a screenshot and is wrong in motion.
   */
  it('offers variants for exactly the four gotoAndStop classes', () => {
    expect(Object.keys(PROJECTILE_VARIANTS).sort()).toEqual([
      'BulletFire',
      'BulletGummyBear',
      'ObjectGroundIce',
      'ObjectGroundLava',
    ]);
  });

  /**
   * Three distinct frames each, all loaded, none collapsing to one texture.
   *
   * A naive wiring that pointed every variant at frame 1 would satisfy "the
   * class has variants" and render identically forever; requiring three
   * distinct keys is what catches it.
   */
  it('gives each of them three distinct, loaded frames', () => {
    const loaded = new Set(PROJECTILE_SHAPES.map((asset) => asset.key));

    for (const [name, frames] of Object.entries(PROJECTILE_VARIANTS)) {
      expect(frames, name).toHaveLength(3);
      expect(new Set(frames.map((f) => f.key)).size, `${name} distinct`).toBe(3);
      for (const frame of frames) {
        expect(loaded.has(frame.key), `${name} -> ${frame.key}`).toBe(true);
        expect(frame.width, `${name} ${frame.key} width`).toBeGreaterThan(0);
      }
    }
  });

  /**
   * Frame 1 is what `PROJECTILE_ART` carries, so a class that never changes
   * variant draws the same thing either way.
   *
   * This is the seam between the two tables: they could drift and nothing else
   * here would notice.
   */
  it('starts every variant class on the frame PROJECTILE_ART names', () => {
    for (const [name, frames] of Object.entries(PROJECTILE_VARIANTS)) {
      expect(frames[0].key, name).toBe(PROJECTILE_ART[name].key);
    }
  });

  /**
   * `BulletGummyBear`'s frames are indexed by bounce stage, and the stage is
   * also what scales damage — x1, x3, x4 (`foodRounds.ts`, from `:1954`,
   * `:1958`, `:1996`). Three stages, three frames, so the index cannot run off
   * the end at stage 3.
   *
   * Driven against the real `bounceGummy` rather than a restated table: the
   * point is that the visual and the mechanic share one number.
   */
  it('has one gummy frame per bounce stage the damage rule can reach', () => {
    let state = { stage: 1, damage: 10 };
    const damages = [state.damage];

    // 'side' is a single-edge bounce — `bulletBounce.ts:108` reserves 'corner'
    // for the both-axes case, which is the shortcut straight to stage 3.
    state = bounceGummy(state, 'side');
    damages.push(state.damage);
    state = bounceGummy(state, 'side');
    damages.push(state.damage);

    // The mechanic, pinned beside the visual it drives — x1, x3, x4.
    expect(damages).toEqual([10, 30, 40]);
    expect(state.stage).toBe(3);
    expect(PROJECTILE_VARIANTS.BulletGummyBear[state.stage - 1]).toBeDefined();
  });
});
