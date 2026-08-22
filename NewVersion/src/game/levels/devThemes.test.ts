import { describe, expect, it } from 'vitest';

import { allThemes, orderThemes, themeCards, themeOrder, themeWorlds } from './devThemes';
import { GROUND_KEYS, UPSCALE_TILE_SCALE } from './groundTexture';
import { THEME_PROPS } from './backgroundProps';
import { LEVELS } from './levelData';
import { SAMPLE_IMAGES } from '../../assets/manifest';
import type { LevelTheme } from './levelData';

describe('the theme set', () => {
  it('is every theme that has a ground texture', () => {
    // Derived from the art table, not from the level table. That is the whole
    // point: the redesign drops five themes from `LEVELS` and the gallery has
    // to keep showing them, or it cannot be used to reconsider the choice.
    expect(new Set(allThemes())).toEqual(new Set(Object.keys(GROUND_KEYS)));
    expect(allThemes()).toHaveLength(9);
  });

  it('names a texture the manifest actually loads, for every one', () => {
    /*
     * The `__MISSING` class of bug, and the reason this is asserted rather than
     * assumed: T108 shipped a boss indicator drawing Phaser's missing-texture
     * checkerboard while all 17 of its tests passed, because every one of them
     * was about geometry and none could see which texture the geometry revealed.
     * A gallery whose whole job is showing textures can fail the same way.
     */
    const keys = new Set(SAMPLE_IMAGES.map((asset) => asset.key));
    for (const card of themeCards()) {
      expect(keys.has(card.groundKey), `${card.theme} -> ${card.groundKey}`).toBe(true);
    }
  });
});

describe('the order', () => {
  it('follows the world a theme first appears in', () => {
    /*
     * Derived here a second way — walking `LEVELS` in order — rather than
     * compared against the module's own output, which would be a tautology.
     *
     * It used to read each world's *first* level, which was the same thing
     * when a world had one theme. Since `D-4` a world crosses two or three in
     * blocks (T252), so first-appearance has to be walked rather than sampled.
     */
    const seen = new Set<string>();
    const firstAppearance: string[] = [];
    for (const world of LEVELS) {
      for (const level of world) {
        if (seen.has(level.theme)) continue;
        seen.add(level.theme);
        firstAppearance.push(level.theme);
      }
    }
    expect(themeOrder()).toEqual(firstAppearance);
    expect(firstAppearance).toHaveLength(9);
  });

  /*
   * The half the live data cannot reach: today every theme is used, so
   * `themeOrder()` never exercises the fallback. Driven through `orderThemes`
   * with a lookup that says so.
   */
  it('puts a theme no world uses last, whatever its name', () => {
    const themes = ['Beach', 'Desert', 'Hell'] as LevelTheme[];
    // `Desert` would sort first alphabetically and by world; unused, it sorts
    // last anyway.
    const order = orderThemes(themes, (t) => (t === 'Desert' ? undefined : t === 'Hell' ? 1 : 2));
    expect(order).toEqual(['Hell', 'Beach', 'Desert']);
  });

  it('breaks a tie between two unused themes alphabetically', () => {
    // Two `Infinity` positions subtract to NaN, and a NaN comparator leaves the
    // input order untouched — so this is driven on an input that is already in
    // the *wrong* order. Handed back sorted, the tiebreak ran.
    const order = orderThemes(['Hell', 'Beach'] as LevelTheme[], () => undefined);
    expect(order).toEqual(['Beach', 'Hell']);
  });

  it('is stable across calls', () => {
    // `orderThemes` copies before sorting; without that, `allThemes()`' array
    // would be sorted in place and the second call would start somewhere else.
    expect(themeOrder()).toEqual(themeOrder());
  });
});

describe('the cards', () => {
  /**
   * The invariant the gallery rests on: **every theme repeats over the same
   * number of design units**, so nine swatches drawn at that size are directly
   * comparable.
   *
   * It is not free. `Desert` is a 1024 texture and the other eight are 256, so
   * the equality only holds because the upscale tiles at 0.25 — which is
   * exactly the mistake `groundTexture.ts` records as having lost a comparison
   * (a 1024 tile at scale 1 renders every ground feature 4x too large).
   */
  it('covers the same ground per repeat, on all nine', () => {
    const repeats = new Set(themeCards().map((card) => card.repeatUnits));
    expect(repeats).toEqual(new Set([256]));
  });

  it('reaches that by two different routes, and says which', () => {
    const cards = themeCards();
    const desert = cards.find((c) => c.theme === 'Desert')!;
    const grass = cards.find((c) => c.theme === 'Grass')!;

    // The counterpart that makes the shared 256 above meaningful: the two are
    // not the same texture drawn the same way.
    expect(desert.tileScale).toBe(UPSCALE_TILE_SCALE);
    expect(grass.tileScale).toBe(1);
    expect(desert.groundKey).not.toBe(grass.groundKey);
  });

  it('counts the worlds and levels each theme is used by', () => {
    for (const card of themeCards()) {
      expect(card.worlds, card.theme).toEqual(themeWorlds(card.theme));
      // Counted independently off `LEVELS`. This used to be
      // `worlds.length * 45`, which held while a world had one theme and stops
      // holding the moment a world crosses three of them (T252) — the arithmetic
      // was a description of the old campaign, not of the field.
      const played = LEVELS.flat().filter((l) => l.theme === card.theme).length;
      expect(card.levels, card.theme).toBe(played);
      expect(card.levels, card.theme).toBeGreaterThan(0);
    }

    // Every level belongs to exactly one theme's count.
    const total = themeCards().reduce((n, c) => n + c.levels, 0);
    expect(total).toBe(LEVELS.flat().length);
  });

  it('carries the prop mix for every theme, summing to one', () => {
    for (const card of themeCards()) {
      expect(THEME_PROPS[card.theme], `${card.theme} has props`).toBeDefined();
      expect(card.props.length, card.theme).toBeGreaterThan(0);

      const total = card.props.reduce((sum, p) => sum + p.share, 0);
      // The AS3's own proportions are written to two decimals and three 0.33s
      // do not make 1, so this is a tolerance rather than an equality.
      expect(total, card.theme).toBeCloseTo(1, 1);
      expect(card.perTile[0], card.theme).toBeLessThanOrEqual(card.perTile[1]);
    }
  });
});
