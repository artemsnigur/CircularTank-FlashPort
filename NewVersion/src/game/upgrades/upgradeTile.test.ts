/**
 * The shop tile's frame, and the picture it ends up drawing.
 *
 * Expected frame numbers come from `ButtonWeapon.as:193-206` and
 * `ButtonMisc.as:129-160`, not from the module. The glyph assertions go one
 * step further and check what those frames actually *contain*, because a frame
 * number is only as good as the table behind it — and a tile on the wrong frame
 * draws an ordinary-looking picture of the wrong state.
 */
import { describe, expect, it } from 'vitest';

import { UPGRADE_TILE_CLIPS, UPGRADE_TILE_SHAPE_IDS } from './upgradeArt';
import { upgradeTileFrame, upgradeTileLayers } from './upgradeTile';
import { ALL_UPGRADES } from './upgradeData';
import { shapeUrls } from '../../assets/registry';

/** The layer the glyph sits on — the one that says *which* upgrade this is. */
const GLYPH = 1;
const glyphOf = (id: string, state: { owned: boolean; equipped: boolean }): number =>
  upgradeTileLayers(id, state)[GLYPH];

describe('a weapon tile', () => {
  it('rests on frame 1 owned, 4 equipped, 7 unowned', () => {
    expect(upgradeTileFrame('Cannon', { owned: true, equipped: false })).toBe(1);
    expect(upgradeTileFrame('Cannon', { owned: true, equipped: true })).toBe(4);
    expect(upgradeTileFrame('Cannon', { owned: false, equipped: false })).toBe(7);
  });

  /**
   * `:193` asks `levelsArray != 0` **before** it asks about equipping, so the
   * unowned art wins. The port cannot produce this state today; ordering the
   * questions the other way would make it draw as equipped if it ever could.
   */
  it('draws unowned even if something claims it is equipped', () => {
    expect(upgradeTileFrame('Cannon', { owned: false, equipped: true })).toBe(7);
  });
});

describe('a misc tile', () => {
  it('rests on frame 1 owned and 4 unowned', () => {
    expect(upgradeTileFrame('Speed', { owned: true, equipped: false })).toBe(1);
    expect(upgradeTileFrame('Speed', { owned: false, equipped: false })).toBe(4);
  });

  /**
   * The counterpart that stops frame 4 meaning two things. On a weapon 4 is
   * *equipped*; on a misc upgrade it is *not owned*. An implementation that
   * ignored `equippable` would pass every weapon test above and quietly show
   * every owned-and-"equipped" misc upgrade as unowned.
   */
  it('has no equipped row, so equipping cannot move it to frame 4', () => {
    expect(UPGRADE_TILE_CLIPS.Speed.equippable).toBe(false);
    expect(upgradeTileFrame('Speed', { owned: true, equipped: true })).toBe(1);
    // And the two frames genuinely differ, so this is not a no-op.
    expect(glyphOf('Speed', { owned: true, equipped: false })).not.toBe(
      glyphOf('Speed', { owned: false, equipped: false }),
    );
  });
});

describe('what the layers actually draw', () => {
  it('gives owned and equipped the same glyph, on different plates', () => {
    // They differ in their plate alone — `:196` against `:199`. If the glyph
    // moved, equipping a weapon would start drawing a different weapon.
    const owned = upgradeTileLayers('Cannon', { owned: true, equipped: false });
    const equipped = upgradeTileLayers('Cannon', { owned: true, equipped: true });

    expect(equipped[GLYPH]).toBe(owned[GLYPH]);
    expect(equipped[0]).not.toBe(owned[0]);
  });

  it('gives an unowned weapon its own glyph, not the owned one', () => {
    // The original draws a separate picture rather than dimming — worth pinning
    // before someone reaches for a CSS filter and deletes the distinction.
    const owned = glyphOf('Cannon', { owned: true, equipped: false });
    const unowned = glyphOf('Cannon', { owned: false, equipped: false });

    expect(unowned).not.toBe(owned);
  });

  it('gives all 28 upgrades a distinct picture', () => {
    // A mis-keyed symbol id shows a real, plausible tile — of the wrong
    // weapon. Nothing but this would catch it.
    const glyphs = ALL_UPGRADES.map((u) => glyphOf(u.id, { owned: true, equipped: false }));

    expect(glyphs).toHaveLength(28);
    expect(new Set(glyphs).size).toBe(28);
  });
});

describe('coverage', () => {
  it('has a tile for every upgrade in the catalogue', () => {
    for (const upgrade of ALL_UPGRADES) {
      expect(UPGRADE_TILE_CLIPS[upgrade.id], upgrade.id).toBeDefined();
      expect(upgradeTileLayers(upgrade.id, { owned: true, equipped: false }).length).toBeGreaterThan(
        0,
      );
    }
  });

  it('ships every shape the tiles draw', () => {
    for (const id of UPGRADE_TILE_SHAPE_IDS) {
      expect(`${id}.svg` in shapeUrls, `${id} synced`).toBe(true);
    }
  });

  it('returns nothing for an id that has no tile', () => {
    // The counterpart to the coverage sweep: an unknown id must leave a visible
    // gap rather than a wrong picture.
    expect(upgradeTileLayers('NotAnUpgrade', { owned: true, equipped: false })).toEqual([]);
  });
});
