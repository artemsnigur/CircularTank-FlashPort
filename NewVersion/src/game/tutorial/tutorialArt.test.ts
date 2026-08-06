import { describe, expect, it } from 'vitest';

import { TUTORIAL_CLIPS, panelPosition } from './tutorialArt';

/**
 * Offsets read straight out of `assets.swf`'s PlaceObject matrices, as a
 * **second independent transcription**.
 *
 * "The icons no longer overlap" is satisfied by many wrong layouts, so the
 * composition is pinned against the AS3's own numbers rather than against
 * anything that looks right. These are TWIPS/20, the same conversion the
 * extractor does, taken from the matrix dump.
 */
const AS3_PARTS: Record<string, [number, number, number][]> = {
  // shape, x, y
  Move: [
    [1325, 0, 0],
    [1401, 10, 57],
    [1401, 99, 57],
    [1403, 36.7, 10],
    [1405, 13.65, 10],
  ],
  AimShoot: [
    [1325, 0, 0],
    [1326, 66.3, 33.1],
    [1328, 27.9, 10],
    [1330, 27.9, 10],
  ],
  Objective: [
    [1332, -16, 0],
    [1333, 13.2, 10],
    [1335, 13.2, 10],
  ],
};

describe('the panel composition', () => {
  it('places every part where the AS3 matrix puts it', () => {
    for (const [name, expected] of Object.entries(AS3_PARTS)) {
      const parts = TUTORIAL_CLIPS[name]?.parts ?? [];
      expect(parts.map((p) => [p.shape, p.x, p.y]), name).toEqual(expected);
    }
  });

  it('keeps a shape placed twice as two parts', () => {
    // The display-list parser deduped by shape id; `Move` draws 1401 at two
    // positions — the left and right arrow keys from one glyph. A set-based
    // table silently renders one arrow, which looks like art rather than a bug.
    const move = TUTORIAL_CLIPS['Move'].parts.filter((p) => p.shape === 1401);
    expect(move).toHaveLength(2);
    expect(move[0].x).not.toBe(move[1].x);
  });

  it('does not assume the backdrop sits at the origin', () => {
    // It does not. `Objective`'s backdrop resolves to x = -16 once its own
    // normalisation offset is subtracted — its art extends left of its origin.
    // An "everything starts at 0,0" rule was written here first and was wrong;
    // the panel is positioned by its *anchor*, not by its first part.
    expect(TUTORIAL_CLIPS['Objective'].parts[0].x).toBe(-16);
    expect(TUTORIAL_CLIPS['Move'].parts[0].x).toBe(0);
  });


  it('subtracts each shape`s own normalisation offset', () => {
    // The matrix translate is in shape space; JPEXS re-origins each SVG to its
    // bounding box. `1403` carries a (43.2, 20.95) transform and `1401`
    // carries none, so a single global correction would be wrong for both.
    // Pinned as the pair, on one panel.
    const move = TUTORIAL_CLIPS['Move'].parts;
    expect(move.find((p) => p.shape === 1403)).toMatchObject({ x: 36.7, y: 10 });
    expect(move.filter((p) => p.shape === 1401)[0]).toMatchObject({ x: 10, y: 57 });
  });

});

describe('panelPosition', () => {
  it('anchors Objective to the live viewport bottom and the rest top-left', () => {
    // The AS3's 480 is its frozen stage height — see the module docblock.
    expect(panelPosition('Move', 400)).toEqual({ x: 16, y: 16 });
    expect(panelPosition('Objective', 400).y).toBe(400 - TUTORIAL_CLIPS['Objective'].height - 8);
    expect(panelPosition('Objective', 1000).y).toBe(1000 - TUTORIAL_CLIPS['Objective'].height - 8);
  });
});
