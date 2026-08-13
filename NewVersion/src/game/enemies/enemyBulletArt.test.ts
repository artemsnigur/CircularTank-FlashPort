/**
 * Enemy bullet art — `PartGameArea.as:6918-6964`.
 *
 * Expected values come from the AS3 lines and the sprite->shape mapping, not
 * from the module under test.
 */
import { describe, expect, it } from 'vitest';
import { ENEMY_BULLET_ART, enemyBulletSize, enemyBulletTexture } from './enemyBulletArt';
import { UNIT_SHAPES } from '../../assets/manifest';

const SHOOT_TYPES = ['Basic', 'BasicBoss', 'Trap', 'Hook', 'Following', 'FollowingBoss'] as const;

describe('every enemy bullet class has its own art', () => {
  it('covers all six classes the AS3 constructs', () => {
    // `:6918`, `:6927`, `:6936`, `:6945`, `:6955`, `:6964`.
    expect(Object.keys(ENEMY_BULLET_ART).sort()).toEqual([...SHOOT_TYPES].sort());
  });

  it('gives the six classes six distinct normal textures', () => {
    // The naive wiring this catches is one texture for everything, which is
    // exactly what the red `particle-dot` was. Distinctness is the claim, so it
    // is asserted as a set size rather than per pair.
    const keys = SHOOT_TYPES.map((t) => enemyBulletTexture(t));
    expect(new Set(keys).size).toBe(SHOOT_TYPES.length);
  });

  it('names only textures the manifest loads', () => {
    // The T114/T116 failure mode: a key that resolves to nothing draws Phaser's
    // `__MISSING` texture — black with green lines — and raises no error.
    const loaded = new Set(UNIT_SHAPES.map((a) => a.key));
    for (const type of SHOOT_TYPES) {
      for (const reflected of [false, true]) {
        const key = enemyBulletTexture(type, reflected);
        expect(loaded.has(key ?? ''), `${type} reflected=${reflected} -> ${key}`).toBe(true);
      }
    }
  });
});

describe('frame 2 is the reflected round, not an animation frame', () => {
  it('selects a different frame when reflected', () => {
    // `:1600` `gotoAndStop(2)` beside `:1601` `reflected = true`.
    for (const type of ['Basic', 'BasicBoss', 'Hook', 'Following', 'FollowingBoss'] as const) {
      expect(enemyBulletTexture(type, false)).not.toBe(enemyBulletTexture(type, true));
    }
  });

  it('leaves the single-frame Trap on its only frame — the counterpart', () => {
    // `:6976-6979` adds the Trap to `enemyTrapLayer` with **no** `gotoAndStop`,
    // and its clip has one frame. Driven beside the row above because "reflected
    // differs" must not be satisfied by inventing a frame that does not exist.
    expect(ENEMY_BULLET_ART.Trap.frames).toHaveLength(1);
    expect(enemyBulletTexture('Trap', true)).toBe(enemyBulletTexture('Trap', false));
  });

  it('pins the frame pairs against the sprite mapping', () => {
    // Order is the sprite's own timeline: frame 1 then frame 2.
    expect(ENEMY_BULLET_ART.Basic.frames).toEqual([1173, 1174]);
    expect(ENEMY_BULLET_ART.BasicBoss.frames).toEqual([1164, 1165]);
    expect(ENEMY_BULLET_ART.Hook.frames).toEqual([1167, 1168]);
    expect(ENEMY_BULLET_ART.Following.frames).toEqual([1170, 1171]);
    expect(ENEMY_BULLET_ART.FollowingBoss.frames).toEqual([1161, 1162]);
    expect(ENEMY_BULLET_ART.Trap.frames).toEqual([1159]);
  });
});

describe('size comes from the artwork, not the radius', () => {
  it('uses the authored dimensions', () => {
    // Read off the SVGs. `Hook` is the only non-square clip, which is the case
    // a single "size" number would have flattened.
    expect(enemyBulletSize('Basic')).toEqual({ width: 11, height: 11 });
    expect(enemyBulletSize('BasicBoss')).toEqual({ width: 16, height: 16 });
    expect(enemyBulletSize('Trap')).toEqual({ width: 17, height: 17 });
    expect(enemyBulletSize('Hook')).toEqual({ width: 12, height: 15 });
  });

  it('does not track the AS3 radius, which disagrees', () => {
    // `:6919-6920` gives `Basic` `radius = 4` — an 8-unit diameter against an
    // 11px clip — and `:6937` gives `Trap` `radius = 6` against 17px. Sizing
    // the sprite from the radius is the mistake T85 corrected for projectiles.
    expect(enemyBulletSize('Basic')?.width).not.toBe(4 * 2);
    expect(enemyBulletSize('Trap')?.width).not.toBe(6 * 2);
  });
});

describe('an unknown shootType falls back rather than throwing', () => {
  it('returns undefined so the caller keeps the dot', () => {
    expect(enemyBulletTexture('NotAType')).toBeUndefined();
    expect(enemyBulletSize('NotAType')).toBeUndefined();
    expect(enemyBulletTexture(undefined)).toBeUndefined();
    // The counterpart, on the same call: a real type does resolve, so the
    // undefined above is a real miss and not a function that always fails.
    expect(enemyBulletTexture('Basic')).toBe('unit-1173');
  });
});
