/**
 * The equipped highlight, and the assumption its derivation rests on.
 *
 * `EQUIPPED_HIGHLIGHT_SHAPES` intersects "what the equipped frame adds over the
 * owned frame" across every equippable clip. That is only the right answer if
 * the clips agree, so the agreement is driven here rather than assumed — the
 * intersection would quietly narrow to nothing if one clip differed, and a
 * no-op filter looks exactly like a working one from the tile.
 */
import { describe, expect, it } from 'vitest';

import { UPGRADE_TILE_CLIPS, UPGRADE_TILE_REST_FRAME } from './upgradeArt';
import { readFileSync } from 'node:fs';

import {
  EQUIPPED_HIGHLIGHT_SHAPES,
  TILE_PLATE_SHAPES,
  tileGlyphLayers,
} from './tileHighlight';

const equippable = Object.entries(UPGRADE_TILE_CLIPS).filter(([, c]) => c.equippable);

describe('the derivation', () => {
  it('finds the red disc and the ring, and nothing else', () => {
    // The figures come from reading the generated table, not from the module:
    // 23 of the 24 equippable clips swap 596 for this pair.
    expect([...EQUIPPED_HIGHLIGHT_SHAPES].sort((a, b) => a - b)).toEqual([601, 602]);
  });

  it('has 24 equippable clips to intersect, not one', () => {
    // An intersection over a single clip is that clip's frame diff, which would
    // pass the assertion above while proving nothing about the others.
    expect(equippable).toHaveLength(24);
  });

  it.each(equippable)('%s adds exactly the shared pair when equipped', (_id, clip) => {
    const owned = new Set(clip.frames[UPGRADE_TILE_REST_FRAME.owned - 1]);
    const added = clip.frames[UPGRADE_TILE_REST_FRAME.equipped - 1].filter((s) => !owned.has(s));

    expect(added.sort((a, b) => a - b)).toEqual([601, 602]);
  });

  /**
   * The counterpart. The four misc upgrades cannot be equipped, so they have
   * no such frame — and if they were folded into the intersection it would
   * collapse to the empty set and the filter would silently stop working.
   */
  it('leaves the four non-equippable clips out of it', () => {
    const misc = Object.entries(UPGRADE_TILE_CLIPS).filter(([, c]) => !c.equippable);

    expect(misc).toHaveLength(4);
    for (const [id, clip] of misc) {
      const owned = new Set(clip.frames[UPGRADE_TILE_REST_FRAME.owned - 1]);
      const equipped = clip.frames[UPGRADE_TILE_REST_FRAME.equipped - 1] ?? [];
      // Their frame 4 is a hover/pressed state, not an equipped one, so it
      // does not carry the pair — which is why including them would break it.
      const added = equipped.filter((s) => !owned.has(s));
      expect(added, id).not.toEqual([601, 602]);
    }
  });
});

describe('stripping it', () => {
  it('removes the pair and keeps the weapon', () => {
    // Flamethrower's equipped frame — `[601, 621, 602]` in `upgradeArt.ts`.
    expect(tileGlyphLayers([601, 621, 602])).toEqual([621]);
  });

  it('removes the plain plate from an unequipped tile too', () => {
    // Changed in T182: the backing disc is a 30x30 shape and the shop draws
    // tiles up to 176px, so it is CSS now (`A40`). What must survive is the
    // glyph, and only the glyph.
    expect(tileGlyphLayers([596, 621])).toEqual([621]);
    expect(tileGlyphLayers([596, 639])).toEqual([639]);
  });

  it('strips the plate on the two clips whose plate is their own shape', () => {
    // The reason the rule is positional rather than a list: `EnemyAbsorb` and
    // GummyBear do not use `596`. A hand-written `[596, 601]` would leave a
    // pixelated disc on exactly those two and nowhere else — the sort of gap
    // nobody finds by looking at the grid.
    expect(TILE_PLATE_SHAPES.has(680), 'EnemyAbsorb plate').toBe(true);
    expect(TILE_PLATE_SHAPES.has(634), 'GummyBear plate').toBe(true);
    // And the counterpart: a glyph is not in the set, or "strip layer 0" would
    // be indistinguishable from "strip everything".
    expect(TILE_PLATE_SHAPES.has(597), 'the Cannon glyph').toBe(false);
    expect(TILE_PLATE_SHAPES.has(621), 'the Flamethrower glyph').toBe(false);
  });

  /*
   * ── The positional rule, checked against the art ─────────────────────────
   *
   * `TILE_PLATE_SHAPES` is "layer 0 of every rest frame", which is only safe
   * while layer 0 is never content. That is an assumption about generated
   * data, so it is driven rather than asserted: every shape in the set must be
   * a **single-path 30x30 disc** in the export. A glyph is four paths of real
   * colours (`597`) and would fail this immediately.
   */
  it('only ever calls a single-path 30x30 disc a plate', () => {
    expect(TILE_PLATE_SHAPES.size, 'no plates derived at all').toBeGreaterThan(0);

    for (const shape of TILE_PLATE_SHAPES) {
      const svg = readFileSync(`../SWFimported/shapes/${shape}.svg`, 'utf8');
      expect(svg, `${shape} is not 30 units wide`).toMatch(/width="30\.0px"/);
      expect(svg, `${shape} is not 30 units tall`).toMatch(/height="30\.0px"/);
      expect(
        svg.match(/<path/g)?.length ?? 0,
        `${shape} has more than one path, so it is not a plain plate`,
      ).toBe(1);
    }
  });

  it('keeps a multi-part glyph whole', () => {
    // `TimedBombCannon` frame 3 draws its picture in two shapes. A filter
    // keyed on position rather than on identity would drop one of them.
    expect(tileGlyphLayers([601, 630, 631, 602])).toEqual([630, 631]);
  });

  it('never empties a frame', () => {
    // The failure that would read as "the shop lost its art": every real frame
    // must still have something to draw after the strip. `tileGlyphLayers`
    // falls back to the unstripped layers rather than returning nothing, so
    // this holds even if a future clip puts its glyph at layer 0.
    for (const [id, clip] of Object.entries(UPGRADE_TILE_CLIPS)) {
      for (const [i, frame] of clip.frames.entries()) {
        expect(tileGlyphLayers(frame).length, `${id} frame ${i + 1}`).toBeGreaterThan(0);
      }
    }
  });
});
