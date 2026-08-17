/**
 * The three glass tiles, driven against each other.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * `.shop-tile`, `.bestiary-tile` and `.world-grid__cell` are the same object
 * in three places: a top-lit radial or steel ramp, a lit top rim, and a shadow
 * under it. They were written one screen at a time over five tasks, and by
 * T180 the shop's was still on the first iteration — a flat white-to-black
 * gradient with one inset line — which read as a darker, flatter tile beside
 * the two built after it. Nobody noticed for four tasks because no screen
 * shows two of them at once.
 *
 * **`.gloss-pill` is what this should eventually be**: one class carrying the
 * surface and nothing else, with consumers adding only size. That refactor
 * touches three screens the maintainer has signed off, so it is not done here.
 * What is done instead is the mechanism that makes the copies *stay* copies —
 * because "keep these in step" written in a comment is a hope, and this repo
 * has a section on the difference.
 *
 * So: this compares the declarations rather than trusting them. It is not a
 * layout check and jsdom computes none; what it holds is that the three agree
 * on the ramp, and that none of them re-grows a hover `transform`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync('src/styles/global.css', 'utf8');

/*
 * Comments stripped first. Every rule below is documented in prose that names
 * the exact properties being searched for — `transform`, `linear-gradient` —
 * and a scan that reads prose as code has already produced a false positive
 * three times in this repo.
 */
const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/** The declaration block of one selector, comments already gone. */
function block(selector: string): string {
  const at = cssCode.indexOf(`${selector} {`);
  expect(at, `${selector} is not in the stylesheet`).toBeGreaterThan(-1);
  return cssCode.slice(at, cssCode.indexOf('}', at));
}

/** Whitespace collapsed, so a reformat is not a failure. */
const squash = (text: string): string => text.replace(/\s+/g, ' ').trim();

/**
 * The steel ramp's three stops.
 *
 * The canonical values are the **bestiary's**, which was the most recent of
 * the three when this landed. All three had drifted apart by a couple of
 * percent on two stops each — 26/20/42, 24/20/42 and 26/22/42 — which is not
 * visible on any one screen and is exactly the kind of difference that becomes
 * permanent once nobody can say which was intended.
 */
const RAMP = /rgb\(148 166 186 \/ 24%\) 0%,\s*rgb\(70 84 102 \/ 20%\) 45%,\s*rgb\(0 0 0 \/ 42%\) 100%/;

const TILES = ['.shop-tile', '.bestiary-tile', '.world-grid__cell'] as const;

describe('the glass tile surface', () => {
  it('is the same steel ramp on all three tiles', () => {
    for (const selector of TILES) {
      expect(block(selector), selector).toMatch(RAMP);
    }
  });

  it('lights each of them from the top rim', () => {
    // The light model, not just the colour: the highlight is at the top
    // because that is where the light is on every screen in this game.
    for (const selector of TILES) {
      expect(block(selector), selector).toMatch(/inset 0 1px 0 rgb\(255 255 255 \/ 2[0-9]%\)|inset 0 1px 0 rgb\(255 255 255 \/ 30%\)/);
    }
  });

  /*
   * ── No tile lifts on hover ───────────────────────────────────────────────
   *
   * The shop's did — `translateY(-1px)` — and it was the last one left. Across
   * a dense grid a tile that moves as the pointer reaches it reads as a
   * twitch; on the shop tile it also nudged the level badge a pixel off the
   * art it labels.
   *
   * Pinned against its counterpart, because "no `transform`" is satisfied by a
   * rule that does nothing at all: each tile must still *respond*, and the
   * response is light.
   */
  it('brightens rather than moving, on all three', () => {
    for (const selector of TILES) {
      const hover =
        selector === '.world-grid__cell'
          ? block(`${selector}:hover:not(:disabled)`)
          : block(`${selector}:hover`);
      expect(hover, `${selector} lifts on hover`).not.toMatch(/transform/);
      expect(squash(hover), `${selector} does not react on hover`).toMatch(
        /filter: brightness/,
      );
    }
  });

  it('keeps transform out of the transition, so a re-added one cannot animate', () => {
    // The declaration that made the jump smooth. Leaving it behind is how the
    // property comes back: a later edit adds `transform` to a hover rule and
    // it eases in, looking deliberate.
    for (const selector of TILES) {
      const rule = squash(block(selector));
      const transition = /transition:([^;]*)/.exec(rule)?.[1] ?? '';
      expect(transition, `${selector} still transitions transform`).not.toMatch(/transform/);
      expect(transition, `${selector} has no transition at all`).toMatch(/filter/);
    }
  });
});
