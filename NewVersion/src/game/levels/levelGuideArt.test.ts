/**
 * The level guide widget's art, and that the sync actually copied it.
 */
import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { LEVEL_GUIDE_CLIPS, LEVEL_GUIDE_SHAPE_IDS } from './levelGuideArt';
import { shapeUrls } from '../../assets/registry';

describe('the seven clips', () => {
  /**
   * Frame counts stated, not derived — each is what an AS3 `gotoAndStop`
   * argument reaches, so a clip that changes shape fails here rather than
   * silently rendering frame 1 forever.
   */
  it('has the frame count each AS3 call site expects', () => {
    expect(
      Object.fromEntries(
        Object.entries(LEVEL_GUIDE_CLIPS).map(([name, c]) => [name, c.frames.length]),
      ),
    ).toEqual({
      Background: 1,
      // `ButtonLevelGuideArrow.as:240-248` — `1 + valueToAdd` / `2 + valueToAdd`
      // with `valueToAdd` 0 for Left and 4 for Right.
      Arrow: 8,
      // `ButtonLevelGuideAutoSelect.as:75-92` — on/off x idle/hover.
      AutoSelect: 4,
      Info: 2,
      Previous: 3,
      Last: 3,
      Upcoming: 3,
    });
  });

  /**
   * The three preset buttons are art variants of one behaviour class, so their
   * clips must have the *same shape* and *different shapes* — same frame
   * structure, no shared artwork. A copy-paste that pointed two of them at one
   * symbol would pass a frame-count check and render identical buttons.
   */
  it('gives the three presets distinct art with identical structure', () => {
    const presets = ['Previous', 'Last', 'Upcoming'] as const;
    const structures = presets.map((p) =>
      LEVEL_GUIDE_CLIPS[p].frames.map((f) => f.length).join(','),
    );
    expect(new Set(structures).size, 'same structure').toBe(1);

    const symbols = presets.map((p) => LEVEL_GUIDE_CLIPS[p].symbol);
    expect(new Set(symbols).size, 'different symbols').toBe(3);

    // Disjoint *between* clips — not "all ids distinct", which is false and
    // legitimately so: each preset reuses one shape across its own idle and
    // hover frames (`Previous` draws 1438 in both).
    const sets = presets.map((p) => new Set(LEVEL_GUIDE_CLIPS[p].frames.flat()));
    for (let a = 0; a < sets.length; a += 1) {
      for (let b = a + 1; b < sets.length; b += 1) {
        const shared = [...sets[a]].filter((id) => sets[b].has(id));
        expect(shared, `${presets[a]} vs ${presets[b]}`).toEqual([]);
      }
    }
    // …and the within-clip reuse is real, so the check above is not vacuous.
    const previous = LEVEL_GUIDE_CLIPS.Previous.frames.flat();
    expect(new Set(previous).size).toBeLessThan(previous.length);
  });

  /**
   * `BackgroundLevelGuide` is static, so `sprite-shapes.mjs` omits its
   * `timeline` by design and the generator reads `places` instead — expanding
   * the nested sprite `1432` into `1431` **in draw order**. Pinned because a
   * Set-based resolution would produce the same three ids in the wrong order,
   * which is invisible until the panel renders inside out.
   */
  it('expands the static background in draw order', () => {
    expect(LEVEL_GUIDE_CLIPS.Background.frames).toEqual([[1430, 1431, 1433]]);
  });
});

describe('the shapes exist and shipped', () => {
  /** The orphan check, both directions, as the previous two art passes did it. */
  it('draws only listed shapes, and lists only drawn ones', () => {
    const drawn = [
      ...new Set(Object.values(LEVEL_GUIDE_CLIPS).flatMap((c) => c.frames.flat())),
    ].sort((a, b) => a - b);
    expect(drawn).toEqual([...LEVEL_GUIDE_SHAPE_IDS]);
  });

  it('has every shape in the extraction and in the synced registry', () => {
    const missing = LEVEL_GUIDE_SHAPE_IDS.filter(
      (id) => !existsSync(`../SWFimported/shapes/${id}.svg`),
    );
    expect(missing, 'shape ids with no SVG in SWFimported/shapes').toEqual([]);

    // The registry, not the filesystem: that is what the widget resolves
    // through, so a file on disk but outside the glob would still 404.
    const unsynced = LEVEL_GUIDE_SHAPE_IDS.filter((id) => !(`${id}.svg` in shapeUrls));
    expect(unsynced, 'shape ids the asset sync did not curate').toEqual([]);
  });

  it('is 30 shapes, so the sweep is not vacuous', () => {
    expect(LEVEL_GUIDE_SHAPE_IDS.length).toBe(30);
  });
});
