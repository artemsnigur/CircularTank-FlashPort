/**
 * The prop art map, against the frame table it has to agree with.
 *
 * Generated from `assets.swf`, so the risk is not arithmetic — it is that the
 * generation drifted from the tables in `backgroundProps.ts` that the layout
 * already depends on. These assert the two agree.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { PROP_CLIPS, clipFor, propShape } from './propArt';
import { PROP_FRAMES, SYMBOL_FRAMES, THEME_PROPS, displayFrame } from './backgroundProps';

const SHAPES = new Set(readdirSync('../SWFimported/shapes'));

describe('every clip resolves to real art', () => {
  it('has all 21 clips', () => {
    expect(Object.keys(PROP_CLIPS)).toHaveLength(21);
  });

  it('every frame of every clip names a shape that exists', () => {
    for (const [name, clip] of Object.entries(PROP_CLIPS)) {
      for (const shape of clip.frames) {
        expect(SHAPES.has(`${shape}.svg`), `${name} -> ${shape}.svg`).toBe(true);
      }
    }
  });

  it('every type in every theme table has a clip', () => {
    // The join that would silently fall back to a dot if the two tables drifted.
    for (const [theme, table] of Object.entries(THEME_PROPS)) {
      for (const [type] of table.proportions) {
        expect(clipFor(type, theme), `${type} @ ${theme}`).toBeDefined();
      }
    }
  });
});

describe('the art agrees with the frame tables', () => {
  it('clip frame counts match SYMBOL_FRAMES, which is what the clamp uses', () => {
    // SYMBOL_FRAMES was hand-read from the sprite definitions before the map
    // existed. This is the independent check that it was read correctly.
    for (const [theme, table] of Object.entries(THEME_PROPS)) {
      for (const [type] of table.proportions) {
        const clip = PROP_CLIPS[clipFor(type, theme)!];
        const declared = displayFrame(type, theme, Number.MAX_SAFE_INTEGER);
        expect(clip.frames.length, `${type} @ ${theme}`).toBe(declared);
      }
    }
  });

  it('RedBloodCell still has one frame where the arithmetic says three', () => {
    // The extraction did not reconcile the tables, and must not: the AS3's 3 is
    // what the draw consumes, and the art still has 1.
    expect(PROP_FRAMES.RedBloodCell).toBe(3);
    expect(SYMBOL_FRAMES.RedBloodCell).toBe(1);
    expect(PROP_CLIPS.RedBloodCell.frames).toHaveLength(1);
    expect(propShape('RedBloodCell', 'Biology', displayFrame('RedBloodCell', 'Biology', 3)))
      .toBe(PROP_CLIPS.RedBloodCell.frames[0]);
  });

  it('a frame past the end clamps rather than returning undefined', () => {
    // The clamp and this map are separate sources, so this indexes defensively.
    expect(propShape('RedBloodCell', 'Biology', 99)).toBe(PROP_CLIPS.RedBloodCell.frames[0]);
    expect(propShape('Nonexistent', 'Desert', 1)).toBeUndefined();
  });
});
