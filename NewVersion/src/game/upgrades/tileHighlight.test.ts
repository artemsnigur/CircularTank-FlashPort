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
import { EQUIPPED_HIGHLIGHT_SHAPES, withoutEquippedHighlight } from './tileHighlight';

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
    expect(withoutEquippedHighlight([601, 621, 602])).toEqual([621]);
  });

  it('leaves an unequipped tile completely alone', () => {
    // The counterpart to the line above: a filter that stripped a shape from
    // the ordinary frame would show up as a missing disc on 27 of 28 tiles.
    expect(withoutEquippedHighlight([596, 621])).toEqual([596, 621]);
    expect(withoutEquippedHighlight([596, 639])).toEqual([596, 639]);
  });

  it('keeps a multi-part glyph whole', () => {
    // `TimedBombCannon` frame 3 draws its picture in two shapes. A filter
    // keyed on position rather than on identity would drop one of them.
    expect(withoutEquippedHighlight([601, 630, 631, 602])).toEqual([630, 631]);
  });

  it('never empties a frame', () => {
    // The failure that would read as "the shop lost its art": every real frame
    // must still have something to draw after the strip.
    for (const [id, clip] of Object.entries(UPGRADE_TILE_CLIPS)) {
      for (const [i, frame] of clip.frames.entries()) {
        expect(withoutEquippedHighlight(frame).length, `${id} frame ${i + 1}`).toBeGreaterThan(0);
      }
    }
  });
});
