/**
 * The stacked-face pattern — every control that swaps clip art between states.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * Five controls each wrote their own `--hover { position: absolute }`, and
 * `.chrome-art` sets `position: relative` at the *same* specificity. So whether
 * a stack worked came down to whether that screen's CSS block happened to be
 * pasted before or after the chrome block. **Four of the five were before it**:
 * their hover frames stayed in flow and rendered underneath the resting one, so
 * hovering grew a second button below the first.
 *
 * The fix moved the positioning into `.chrome-stack .chrome-art--face`, which
 * is (0,2,0) and therefore wins wherever it sits. These tests hold the two
 * halves that make it work — the class pairing in the markup, and the selector
 * in the stylesheet.
 *
 * **Neither is a layout check.** jsdom computes none, so a stack that is
 * correctly classed and still visually broken would pass here; that was
 * verified by measuring boxes in a browser, and the numbers are in the commit.
 */
import { readFileSync } from 'node:fs';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BottomNav } from './BottomNav';
import { AudioToggles } from './AudioToggles';

const CSS = readFileSync('src/styles/global.css', 'utf8');

/**
 * The stylesheet with its comments removed.
 *
 * **The second time this exact fault has been caught in this repo.** T154 fixed
 * `buttonSounds.test.ts`, which found "components that render controls" by
 * matching `<button` over raw source and so counted a component whose docstring
 * merely *mentioned* one. The scan below found `.thing__face--hover` — a
 * selector that exists only inside the comment explaining why the rule it names
 * was removed.
 *
 * A scan that reads prose as code produces a false positive here and would as
 * easily produce a false negative, which is the direction that matters.
 */
const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * Every `.chrome-stack` in a tree must class its extra faces, or they fall out
 * of the stack. The resting face is the one in flow and is deliberately bare.
 */
function unstackedFaces(root: HTMLElement): string[] {
  const bad: string[] = [];
  for (const stack of root.querySelectorAll('.chrome-stack')) {
    const faces = [...stack.querySelectorAll('.chrome-art')];
    faces.slice(1).forEach((face, i) => {
      if (!face.classList.contains('chrome-art--face')) {
        bad.push(`${stack.className.split(' ')[0]} face ${i + 2}`);
      }
    });
  }
  return bad;
}

describe('the stacking primitive', () => {
  it('positions faces through a two-class selector, so source order cannot decide it', () => {
    // The mechanism itself. `.chrome-art` sets `position: relative`; this must
    // out-specify it rather than merely follow it.
    expect(CSS).toMatch(/\.chrome-stack \.chrome-art--face \{[^}]*position: absolute/);
    expect(CSS).toMatch(/\.chrome-art \{[^}]*position: relative/);
  });

  it('no screen re-declares a face position of its own', () => {
    // The regression in one line: a screen-local `--hover { position: … }` is
    // how all five copies came to exist, and how four of them silently lost.
    const strays = [...cssCode.matchAll(/\.[\w-]*face[\w-]*\s*\{[^}]*position:\s*absolute/g)]
      .map((m) => m[0].split('{')[0].trim())
      .filter((selector) => !selector.includes('.chrome-art--face'));

    expect(strays, 'these should use .chrome-stack .chrome-art--face').toEqual([]);
  });
});

describe('the controls that use it', () => {
  /*
   * ── The bottom bar left this primitive in T183 ───────────────────────────
   *
   * It was the largest consumer: six buttons, three stacked faces each. The
   * bar is `.gloss-pill` and a label now (`A41`), so what is pinned here is
   * that it draws **no** chrome at all — a half-migrated bar with one stray
   * `<ChromeArt>` would look almost right and would be the thing nobody spots.
   *
   * The primitive itself is unchanged and still has a consumer; the audio
   * toggles below are it, and they are what keeps this file meaningful.
   */
  it('no longer stacks anything in the bottom bar', () => {
    const { container } = render(<BottomNav current="LevelSelect" />);
    expect(container.querySelectorAll('.chrome-stack')).toHaveLength(0);
    expect(container.querySelectorAll('.chrome-art')).toHaveLength(0);
    // The counterpart: the bar did render, so "no chrome" is not "no bar".
    expect(container.querySelectorAll('.nav-pill').length).toBe(6);
  });

  it('classes every extra face on the audio toggles', () => {
    const { container } = render(<AudioToggles />);
    expect(unstackedFaces(container)).toEqual([]);
    expect(container.querySelectorAll('.chrome-stack')).toHaveLength(2);
  });
});
