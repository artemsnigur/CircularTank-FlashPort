/**
 * The extracted UI chrome — the table, not the pictures.
 *
 * Expected values come from the SWF and from the AS3 that lays these out, not
 * from `chromeArt.ts`. Two of them are **cross-checks against a different
 * source entirely**, which is the only kind of assertion that can catch a
 * generator whose arithmetic is self-consistent and wrong:
 *
 *  - `ButtonUpgrades` computes to 200 wide. `BottomBar.as:44-48` places the two
 *    tabs at x 5 and x 209 — 204 apart. A 200-wide button with a 4px gap is the
 *    only reading of those two numbers that fits, and neither was used to
 *    produce the other.
 *  - `BackgroundTitle` computes to 640x88 from a **20x20** shape. The SWF
 *    places it at scale (32, 4.4), and 20x32 = 640 is the stage width. A
 *    generator that ignored placement scale — as the shared parser did before
 *    T154 — would report 20x20 here and the title bar would be a small square.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { CHROME_CLIPS, CHROME_SHAPE_IDS } from './chromeArt';
import { shapeUrl } from '../../assets/registry';

const AS3 = '../SWFimported/scripts';

/**
 * The symbol id on a class's `[Embed]` line — the only place the link between
 * an AS3 class and a SWF character exists.
 *
 * Read from the source rather than imported from `chrome-sprites.mjs`, which
 * is what the generator itself reads: comparing the table to its own input
 * proves the generator copied a number, which was never in doubt. The AS3 is
 * the spec, so the AS3 is what the expected value comes from.
 */
function embeddedSymbol(className: string): number {
  const source = readFileSync(`${AS3}/${className}.as`, 'utf8');
  const match = /symbol="symbol(\d+)"/.exec(source);
  expect(match, `${className}.as has no [Embed] symbol`).not.toBeNull();
  return Number(match?.[1]);
}

/** Clip name -> the AS3 class that embeds it. Equal but for the menu title. */
const CLASS_FOR: Readonly<Record<string, string>> = {
  TitleMainMenu: 'Title',
};

describe('the chrome table', () => {
  it('points every clip at the symbol its AS3 class embeds', () => {
    const names = Object.keys(CHROME_CLIPS);
    expect(names.length).toBe(26);

    for (const name of names) {
      expect(CHROME_CLIPS[name].symbol, name).toBe(embeddedSymbol(CLASS_FOR[name] ?? name));
    }
  });

  it('finds a different id for each, so the lookup is not returning one number', () => {
    // The counterpart to the loop above: if `embeddedSymbol` matched the wrong
    // thing — the first `[Embed]` in some shared file, say — every assertion
    // there could pass against one repeated value.
    const symbols = Object.values(CHROME_CLIPS).map((c) => c.symbol);
    expect(new Set(symbols).size).toBe(symbols.length);
  });

  it('numbers frames from 1, densely', () => {
    for (const [name, clip] of Object.entries(CHROME_CLIPS)) {
      expect(clip.frames.length, name).toBeGreaterThan(0);
      expect(clip.frames.map((f) => f.frame)).toEqual(
        Array.from({ length: clip.frames.length }, (_, i) => i + 1),
      );
    }
  });
});

describe('the layout', () => {
  /**
   * The nav tab, against `BottomBar.as` rather than against itself — see the
   * header. The label's position is the part that only the full placement
   * matrix can produce: Flash puts the label *clip* at (100, 20), and the
   * label's own origin sits inside it, which resolves to (32.1, 10).
   */
  it('sizes ButtonUpgrades to the pitch BottomBar.as lays out', () => {
    const tab = CHROME_CLIPS.ButtonUpgrades;
    expect(tab.width).toBe(200);
    expect(tab.height).toBe(40);
    // `BottomBar.as:44` and `:47` — 209 - 5.
    expect(209 - 5).toBeGreaterThanOrEqual(tab.width);

    const [plate, label] = tab.frames[0].layers;
    expect(plate).toMatchObject({ x: 0, y: 0, width: 200, height: 40 });
    expect(label.x).toBeCloseTo(32.1, 2);
    expect(label.y).toBe(10);
  });

  /**
   * The counterpart to the assertion above, on the identical mechanism: a
   * generator that dropped the placement *scale* would report this clip at its
   * shape's own 20x20 and nothing would look obviously broken in the table.
   */
  it('stretches BackgroundTitle from a 20x20 tile to the stage width', () => {
    const bar = CHROME_CLIPS.BackgroundTitle;
    expect(bar.width).toBe(640);
    expect(bar.height).toBe(88);
    // 20 x 32 = 640; 20 x 4.400024 = 88.00048, rounded to 88.
    expect(bar.frames[0].layers).toHaveLength(1);
    expect(bar.frames[0].layers[0].shape).toBe(167);
  });

  /**
   * All eight titles are one line of art tall, within half a unit.
   *
   * The bound is 45.5-46.0, **measured across all eight** — an earlier version
   * of this test said 45.5-45.7 because that was the range of the five titles
   * sampled by hand while planning, and `TitleOptions` is 46. A range taken
   * from a subset is the same failure as a constant copied out of the code:
   * it looks derived and is not.
   *
   * It matters because the screens size these as a row: a title that came out
   * materially taller would mean the extraction had picked up a shadow or a
   * background layer along with the letters.
   */
  it('gives every title one line of height, within half a unit', () => {
    for (const name of Object.keys(CHROME_CLIPS).filter((n) => n.startsWith('Title'))) {
      expect(CHROME_CLIPS[name].height, name).toBeGreaterThanOrEqual(45.5);
      expect(CHROME_CLIPS[name].height, name).toBeLessThanOrEqual(46);
    }
  });

  it('keeps the titles at their own widths, which differ by the word', () => {
    // The counterpart to the height bound: equal heights must not be mistaken
    // for a uniform box. `TitleAchievements` is 453 wide and `TitleDefeat`
    // 223.35, so a screen that centres them cannot assume a shared width.
    expect(CHROME_CLIPS.TitleAchievements.width).toBeCloseTo(453, 2);
    expect(CHROME_CLIPS.TitleDefeat.width).toBeCloseTo(223.35, 2);
  });

  it('keeps every layer inside its clip box', () => {
    // The box is the union of every frame, so nothing may stick out of it —
    // and a layer at a negative offset would mean the union was computed from
    // one frame rather than all of them.
    for (const [name, clip] of Object.entries(CHROME_CLIPS)) {
      for (const frame of clip.frames) {
        for (const layer of frame.layers) {
          const where = `${name} frame ${frame.frame} shape ${layer.shape}`;
          expect(layer.x, where).toBeGreaterThanOrEqual(0);
          expect(layer.y, where).toBeGreaterThanOrEqual(0);
          expect(layer.x + layer.width, where).toBeLessThanOrEqual(clip.width + 0.01);
          expect(layer.y + layer.height, where).toBeLessThanOrEqual(clip.height + 0.01);
        }
      }
    }
  });

  it('draws something on every frame', () => {
    for (const [name, clip] of Object.entries(CHROME_CLIPS)) {
      for (const frame of clip.frames) {
        expect(frame.layers.length, `${name} frame ${frame.frame}`).toBeGreaterThan(0);
      }
    }
  });
});

describe('the shapes it needs', () => {
  it('lists exactly the shapes the frames draw', () => {
    const drawn = new Set(
      Object.values(CHROME_CLIPS).flatMap((c) => c.frames.flatMap((f) => f.layers.map((l) => l.shape))),
    );
    expect([...drawn].sort((a, b) => a - b)).toEqual([...CHROME_SHAPE_IDS]);
  });

  it('resolves every one through the asset registry', () => {
    // The negative control first: without it this loop is 68 assertions that
    // nothing ever fails. `shapeUrl` throws `MissingAssetError` on a shape the
    // sync has not copied, which is how a chrome piece would go missing —
    // silently, and only on the screen that draws it.
    expect(() => shapeUrl('999999.svg')).toThrow();

    for (const shape of CHROME_SHAPE_IDS) {
      expect(() => shapeUrl(`${shape}.svg`), `shape ${shape}`).not.toThrow();
    }
  });

  /**
   * The nested-clip case, pinned because it is the one the first run of the
   * generator got wrong.
   *
   * `ButtonUpgrades` places 447 — a *sprite*, not a shape — so a generator that
   * treated placements as shape ids looked for `shapes/447.svg`, which does not
   * exist. It failed loudly, which was luck: the same mistake on a clip whose
   * id happened to be a real shape would have drawn the wrong picture instead.
   */
  it('resolved the nav tabs through their nested label clips', () => {
    expect(CHROME_SHAPE_IDS).not.toContain(447);
    expect(CHROME_SHAPE_IDS).toContain(446);
    expect(CHROME_CLIPS.ButtonUpgrades.frames[0].layers.map((l) => l.shape)).toContain(446);
  });
});
