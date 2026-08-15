/**
 * The HUD weapon icon's rules — `WeaponInterface.update` and the two
 * `PartInterface` rules around it.
 *
 * Expected values come from the AS3's `gotoAndStop` arguments and from the SVG
 * geometry, not from the modules under test. The frame numbers especially: a
 * table that agreed with itself would pass any "every weapon has a picture"
 * test while showing the wrong picture for all of them.
 */
import { describe, expect, it } from 'vitest';

import {
  EMPTY_SLOT,
  ICON_SCALE,
  NONE_FRAME,
  SPECIAL_ALPHA_READY,
  SPECIAL_ALPHA_RELOADING,
  UNUSED_ICON_SCALE,
  WEAPON_FRAME,
  otherSlotWeapon,
  specialIconAlpha,
  weaponFrame,
  weaponLayers,
} from './weaponPanel';
import { WEAPON_ART_FRAMES, WEAPON_SOCKET_SHAPE, WEAPON_SOCKET_SIZE } from './weaponArt';
import { PRIMARY_UPGRADES, SECONDARY_UPGRADES } from '../upgrades/upgradeData';
import { shapeUrl } from '../../assets/registry';

describe('the frame table', () => {
  /**
   * Four spot values read off `WeaponInterface.as` rather than off the map.
   *
   * The ends of both ranges, because an off-by-one in either direction is the
   * plausible error: a table shifted by one still looks like a table.
   */
  it('matches the AS3 gotoAndStop arguments at both ends of both ranges', () => {
    expect(weaponFrame('Cannon')).toBe(2); // `:63`, first primary
    expect(weaponFrame('Magic Cannon')).toBe(13); // `:107`, last primary
    expect(weaponFrame('Mine')).toBe(14); // `:112`, first secondary
    expect(weaponFrame('Magic Bunny')).toBe(25); // `:156`, last secondary
  });

  it('gives the empty slot frame 1, the bare socket', () => {
    // `:57-59` — "None" is a real branch, not a fallthrough.
    expect(weaponFrame('None')).toBe(NONE_FRAME);
    expect(NONE_FRAME).toBe(1);
  });

  it('treats a missing secondary as the socket too', () => {
    // The port's "no secondary" is null; the AS3 gets there by having no arm
    // for it, leaving a never-moved clip on frame 1.
    expect(weaponFrame(null)).toBe(NONE_FRAME);
    expect(weaponFrame(undefined)).toBe(NONE_FRAME);
  });

  /**
   * The counterpart to every assertion above: the map must cover the port's
   * own weapon list exactly, in both directions.
   *
   * One direction alone is worthless. "Every weapon has a frame" passes on a
   * map with twelve spare entries; "every frame is a weapon" passes on a map
   * missing half the roster. Together they force a bijection.
   */
  it('covers every weapon the port can equip, and nothing else', () => {
    const names = [...PRIMARY_UPGRADES, ...SECONDARY_UPGRADES].map((u) => u.name);

    for (const name of names) {
      expect(WEAPON_FRAME[name], `${name} has no frame`).toBeGreaterThan(NONE_FRAME);
    }
    expect(Object.keys(WEAPON_FRAME).sort()).toEqual([...names].sort());
  });

  it('assigns 24 distinct frames, so no two weapons share a picture', () => {
    const frames = Object.values(WEAPON_FRAME);
    expect(new Set(frames).size).toBe(frames.length);
    expect(frames.length).toBe(24);
  });

  it('numbers the primaries and secondaries in the AS3 ladder order', () => {
    // The order is `ScreenUpgrades.primaryNameArray` / `secondaryNameArray`,
    // which `upgradeData.ts` already carries. Derived here and compared, rather
    // than the map being *built* from it — a table generated from the array
    // could not disagree with it, and disagreement is the thing worth catching.
    expect(PRIMARY_UPGRADES.map((u) => WEAPON_FRAME[u.name])).toEqual([
      2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ]);
    expect(SECONDARY_UPGRADES.map((u) => WEAPON_FRAME[u.name])).toEqual([
      14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25,
    ]);
  });
});

describe('the art the frames resolve to', () => {
  it('draws the socket alone for an empty slot', () => {
    const layers = weaponLayers(null);
    expect(layers).toHaveLength(1);
    expect(layers[0].shape).toBe(WEAPON_SOCKET_SHAPE);
  });

  it('draws the socket under exactly one glyph for a weapon', () => {
    const layers = weaponLayers('Cannon');
    expect(layers).toHaveLength(2);
    expect(layers[0].shape).toBe(WEAPON_SOCKET_SHAPE);
    // Shape 619, off the SWF timeline for frame 2.
    expect(layers[1].shape).toBe(619);
  });

  /**
   * The offset finding, pinned at the value that motivated it.
   *
   * Every placement inside symbol 1198 is identity with translate (0, 0), so
   * the layers align by each shape's **origin**. `Cannon`'s origin is (13.35,
   * 7.25) in a 20.6x20.6 box, giving a centre offset of (-3.05, +3.05) — 4.31
   * units on a 30-unit socket. Stacking the layers centred, which is what the
   * shop tiles legitimately do, would put the barrel there instead.
   */
  it('offsets a glyph by its origin, not by its box centre', () => {
    const glyph = weaponLayers('Cannon')[1];
    expect(glyph.dx).toBeCloseTo(-3.05, 2);
    expect(glyph.dy).toBeCloseTo(3.05, 2);
    expect(Math.hypot(glyph.dx, glyph.dy)).toBeCloseTo(4.31, 2);
  });

  /**
   * The counterpart, on the identical mechanism: two glyphs *are* centred on
   * their origin, so a generator that simply zeroed every offset — or one that
   * offset everything — would fail one of these two assertions.
   */
  it('leaves an already-centred glyph alone', () => {
    for (const name of ['Mine', 'Shield']) {
      const glyph = weaponLayers(name)[1];
      expect(glyph.dx, name).toBe(0);
      expect(glyph.dy, name).toBe(0);
    }
  });

  it('never moves the socket, which is centred on its own origin', () => {
    for (const frame of WEAPON_ART_FRAMES) {
      expect(frame.layers[0].shape).toBe(WEAPON_SOCKET_SHAPE);
      expect(frame.layers[0].dx).toBe(0);
      expect(frame.layers[0].dy).toBe(0);
    }
    expect(WEAPON_SOCKET_SIZE).toBe(30);
  });

  /**
   * Every shape, not the handful the component tests happen to render.
   *
   * `shapeUrl` throws `MissingAssetError` on a shape the sync has not copied,
   * so an id that never reached `src/assets/shapes` would take the HUD down —
   * but only for the weapon that uses it, and only once a player equips it.
   * A test that drew `Cannon` would never see it. This is the check the audit's
   * "A synced asset is not a loaded asset" section asks for, one weapon at a
   * time.
   */
  it('every frame resolves to shapes the asset sync has copied', () => {
    // The negative control, on the same resolver: an id that is not there must
    // throw, or the loop below is 50 assertions that nothing ever fails.
    expect(() => shapeUrl('999999.svg')).toThrow();

    for (const frame of WEAPON_ART_FRAMES) {
      for (const layer of frame.layers) {
        expect(() => shapeUrl(`${layer.shape}.svg`), `frame ${frame.frame}`).not.toThrow();
      }
    }
  });

  it('has one frame per gotoAndStop argument', () => {
    expect(WEAPON_ART_FRAMES).toHaveLength(25);
    expect(WEAPON_ART_FRAMES.map((f) => f.frame)).toEqual(
      Array.from({ length: 25 }, (_, i) => i + 1),
    );
  });
});

describe('the unused slot preview', () => {
  it('shows the slot that is not in hand', () => {
    // `WeaponInterface.as:44-51`, both arms.
    expect(otherSlotWeapon(['Cannon', 'MiniGun'], 1)).toBe('MiniGun');
    expect(otherSlotWeapon(['Cannon', 'MiniGun'], 2)).toBe('Cannon');
  });

  /**
   * `PartInterface.as:242` — the instance is only built when both slots hold a
   * weapon. Driven on both slots, because a guard that only looked at one
   * would pass the first of these and fail silently on the second.
   */
  it('shows nothing when either slot is empty', () => {
    expect(otherSlotWeapon(['Cannon', EMPTY_SLOT], 1)).toBeNull();
    expect(otherSlotWeapon([EMPTY_SLOT, 'MiniGun'], 2)).toBeNull();
    expect(otherSlotWeapon([EMPTY_SLOT, EMPTY_SLOT], 1)).toBeNull();
  });

  it('is drawn smaller than the weapon in hand', () => {
    // `:28` against `:33` — the ratio is what makes it read as a preview.
    expect(UNUSED_ICON_SCALE).toBe(0.75);
    expect(ICON_SCALE).toBe(1.25);
    expect(UNUSED_ICON_SCALE).toBeLessThan(ICON_SCALE);
  });
});

describe('the special icon dims while it reloads', () => {
  it('is solid when ready and a quarter when not', () => {
    // `:643` against `:648` — the pair is the whole rule, so both are pinned
    // against the AS3's literals rather than against each other.
    expect(specialIconAlpha(true)).toBe(1);
    expect(specialIconAlpha(false)).toBe(0.25);
    expect(SPECIAL_ALPHA_READY).toBe(1);
    expect(SPECIAL_ALPHA_RELOADING).toBe(0.25);
  });
});
