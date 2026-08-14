/**
 * The bestiary tiles — `ButtonEnemy<Type>`, and what they must not show.
 *
 * The generator already refuses to emit a table whose locked frame draws its
 * own enemy (`gen-bestiary-art.mjs`), so these do not repeat that check. What
 * they add is the properties a *consumer* depends on: that every entry has a
 * tile, that the art is actually on disk, and — the pair that matters — that
 * met tiles are all different from each other while locked tiles are all the
 * same.
 *
 * That pair is the point. "Locked tiles hide the enemy" is worth nothing on its
 * own: a table where every tile was the "?" glyph would satisfy it perfectly
 * and show nothing at all. Driven against its counterpart, it says the art
 * distinguishes 20 enemies when met and distinguishes none when not.
 */
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { BESTIARY } from './bestiaryData';
import {
  BESTIARY_LOCKED_GLYPH,
  BESTIARY_TILE_CLIPS,
  BESTIARY_TILE_FRAME,
  BESTIARY_TILE_SHAPE_IDS,
} from './bestiaryArt';
import { shapeUrls } from '../../assets/registry';

const layersOf = (id: string, frame: number): readonly number[] =>
  BESTIARY_TILE_CLIPS[id].frames[frame - 1];

describe('coverage', () => {
  it('has a tile for every bestiary entry', () => {
    // The join that would otherwise fail silently: a missing id renders no
    // picture at all, which reads as a CSS problem rather than a data one.
    for (const entry of BESTIARY) {
      expect(BESTIARY_TILE_CLIPS[entry.id], entry.id).toBeDefined();
    }
    expect(Object.keys(BESTIARY_TILE_CLIPS)).toHaveLength(BESTIARY.length);
  });

  it('ships every shape the tiles draw', () => {
    // `ResistanceIcon` proved this matters: a shape that is in the table but
    // not in `src/assets/` renders as a broken image, and nothing in the type
    // system notices.
    for (const id of BESTIARY_TILE_SHAPE_IDS) {
      expect(existsSync(`../SWFimported/shapes/${id}.svg`), `${id} extracted`).toBe(true);
      expect(`${id}.svg` in shapeUrls, `${id} synced`).toBe(true);
    }
  });
});

describe('what a tile reveals', () => {
  const glyph = (id: string, frame: number): number => layersOf(id, frame)[2];

  it('gives every met enemy a distinct picture', () => {
    const glyphs = BESTIARY.map((e) => glyph(e.id, BESTIARY_TILE_FRAME.normal));

    expect(new Set(glyphs).size).toBe(BESTIARY.length);
    expect(glyphs).not.toContain(BESTIARY_LOCKED_GLYPH);
  });

  /** The counterpart, on the same 20 inputs. */
  it('gives every unmet enemy the same picture', () => {
    const locked = BESTIARY.map((e) => layersOf(e.id, BESTIARY_TILE_FRAME.locked));

    // One distinct triple across all 20 — so the tile of an unmet enemy cannot
    // be told from any other unmet enemy's, by a player or by a pixel.
    expect(new Set(locked.map((l) => l.join(','))).size).toBe(1);
    for (const layers of locked) {
      expect(layers[2]).toBe(BESTIARY_LOCKED_GLYPH);
    }
  });

  it('keeps the plate and overlay, so a locked tile still looks like a tile', () => {
    // `ButtonEnemy.as:109` goes to frame 4, which is the *normal* plate with
    // the "?" glyph — not an empty box. Losing the first two layers would be a
    // plausible-looking "simplification" that changes what the screen looks
    // like on a fresh profile, where 19 of 20 rows are locked.
    const normal = layersOf('Basic', BESTIARY_TILE_FRAME.normal);
    const locked = layersOf('Basic', BESTIARY_TILE_FRAME.locked);

    expect(locked.slice(0, 2)).toEqual(normal.slice(0, 2));
    expect(locked).toHaveLength(3);
  });
});
