/**
 * The screen transition.
 *
 * ── Why this is a stylesheet test and not a render test ───────────────────
 * The whole mechanism is "a CSS animation runs when an element mounts". jsdom
 * runs no animations and computes no layout, so rendering a screen and looking
 * for a blur would assert nothing. What *can* be held is the shape of the
 * rules the browser acts on — and, more usefully, the things that would
 * quietly break it.
 *
 * **Where the limit is, stated rather than implied:** this file can refuse a
 * *cause*. Only a browser can see the *effect*, and `transition.mjs` is what
 * measures it. The distinction earned itself last pass — an earlier version
 * asserted the right declaration inside the keyframe and passed happily while
 * the fill mode made it meaningless.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync('src/styles/global.css', 'utf8');

/*
 * Comments stripped first. This block is documented in prose that names
 * `transform`, `filter`, `animation` and `.bottom-nav` by hand — a scan
 * reading prose as code has been caught three times in this repo, and here it
 * would report a `transform` the rules do not have and the dock as animated
 * because a comment says it is not.
 */
const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * The whole body of a rule, **brace-matched** from a known offset.
 *
 * The obvious `indexOf('}')` is wrong for anything nested and failed here on
 * first use: `@keyframes screen-in` closes at its `from` block's brace, so the
 * slice stopped before `to` existed and the assertion read "no `filter`" on a
 * stylesheet that has one.
 */
function bodyAt(start: number): string {
  let depth = 0;
  for (let i = cssCode.indexOf('{', start); i < cssCode.length; i += 1) {
    if (cssCode[i] === '{') depth += 1;
    else if (cssCode[i] === '}') {
      depth -= 1;
      if (depth === 0) return cssCode.slice(start, i + 1);
    }
  }
  throw new Error(`the rule at ${start} is never closed`);
}

function block(selector: string): string {
  const at = cssCode.indexOf(`${selector} {`);
  expect(at, `${selector} is not in the stylesheet`).toBeGreaterThan(-1);
  return bodyAt(at);
}

/** Every selector that opts into one of the two transition animations. */
function animatedSelectors(): string[] {
  return [...cssCode.matchAll(/([^{}]+)\{[^}]*animation:\s*screen-(?:in|fade)/g)]
    .flatMap((m) => m[1].split(','))
    .map((s) => s.trim())
    .filter((s) => s.startsWith('.'));
}

describe('the mount animation', () => {
  it('pulls into focus and fades, and does not move', () => {
    const frames = block('@keyframes screen-in');
    expect(frames).toMatch(/opacity:\s*0/);
    /*
     * 2px — 8px, then 4px, now 2px, reduced twice because the effect read as
     * harsh rather than slow. The assertion is here so the radius is a
     * decision rather than a drift; the rule's own comment carries the
     * measured frame cost of each.
     */
    expect(frames).toMatch(/filter:\s*blur\(2px\)/);
    expect(frames).toMatch(/filter:\s*blur\(0\)/);

    /*
     * **No `transform`, and this is the point of the change rather than a
     * detail.** The previous pass rose 10px and scaled from 0.985; the
     * movement was what read as heavy, not the duration. A screen that comes
     * into focus without travelling reads as faster at the same 220ms,
     * because there is nothing to track.
     */
    expect(frames).not.toMatch(/transform/);
    expect(block('@keyframes screen-fade')).not.toMatch(/transform/);
  });

  it('is quick — between 120 and 220ms', () => {
    // Tightened from 300 when the duration came down to 170ms: a ceiling that
    // the current value sits far below is not a guard, it is decoration.
    for (const match of cssCode.matchAll(/animation:\s*screen-(?:in|fade) (\d+)ms/g)) {
      expect(Number(match[1])).toBeGreaterThanOrEqual(120);
      expect(Number(match[1])).toBeLessThanOrEqual(220);
    }
  });

  it('eases out rather than running linear', () => {
    /*
     * Asked for by name. A `linear` fade of a blur reads as a wipe — the
     * sharpening arrives at a constant rate, which nothing physical does.
     *
     * A **literal** regex, not one built from a template literal: `\s`
     * written into a template is eaten as a string escape before `RegExp`
     * sees it, and the pattern silently becomes `animation:s*...`, matching
     * nothing. That read as "screen-in has no easing" on a rule that plainly
     * has one — an instrument reporting absence because it was malformed.
     */
    const easings = [
      ...cssCode.matchAll(/animation:\s*screen-(?:in|fade) \d+ms ([^;]+?) backwards/g),
    ].map((m) => m[1].trim());

    // Both animations, or a rule that lost its easing entirely would leave
    // this loop with nothing to check and pass.
    expect(easings).toHaveLength(2);
    for (const easing of easings) {
      expect(easing).not.toMatch(/\blinear\b/);
      expect(easing).toMatch(/cubic-bezier|ease-out/);
    }
  });

  /*
   * ── Nothing is held after the animation ends ─────────────────────────────
   *
   * The fill mode must not be `both` or `forwards`. Both hold the `to` state
   * forever, and **`filter: blur(0)` is not `filter: none`** — a held filter
   * makes its element the containing block for every `position: fixed`
   * descendant, exactly as a held transform does.
   *
   * That is not hypothetical. Last pass this animation used `transform` with a
   * `both` fill, and Chromium reported `getComputedStyle().transform` as
   * `matrix(1, 0, 0, 1, 0, 0)` on every screen after it finished. Swapping the
   * property for `filter` changes nothing about the trap: **it is the fill
   * mode that is the bug.**
   *
   * This assertion is a stand-in for a browser and can only refuse the fill
   * modes that produce a held value. `transition.mjs` is what measures it.
   */
  it('holds nothing after the animation ends', () => {
    expect(cssCode).not.toMatch(/animation:\s*screen-(?:in|fade) [^;]*\bboth\b/);
    expect(cssCode).not.toMatch(/animation:\s*screen-(?:in|fade) [^;]*\bforwards\b/);

    // The counterpart, so "no fill mode at all" cannot pass: the backwards
    // half is what stops the first frame painting sharp and then blurring.
    expect(cssCode).toMatch(/animation:\s*screen-in [^;]*\bbackwards\b/);
    expect(cssCode).toMatch(/animation:\s*screen-fade [^;]*\bbackwards\b/);
  });

  it('animates the bar and the body but never the dock', () => {
    /*
     * The bottom bar is the one piece of chrome that is the *same object* on
     * all five screens. A navigation bar that blurs out and back each time you
     * press it reads as a page load, which is the opposite of the point.
     *
     * Driven as a pair on the same list, because "the dock does not animate"
     * is satisfied by a stylesheet where nothing animates at all.
     */
    const animated = animatedSelectors().join(' ');
    expect(animated).toContain('.screen-shell__body');
    expect(animated).toContain('.screen-shell__bar');
    expect(animated).not.toContain('.bottom-nav');
  });

  it('fades the menu`s wallpaper without blurring it', () => {
    // It is full-bleed, and a blur softens an element's own edges into
    // transparency — which would put a faint halo of the Phaser canvas around
    // all four sides for the length of the animation.
    expect(block('.menu-wallpaper')).toMatch(/animation:\s*screen-fade/);
    expect(block('@keyframes screen-fade')).not.toMatch(/filter/);

    // And the counterpart: the parts that *should* pull into focus do.
    const animated = animatedSelectors().join(' ');
    expect(animated).toContain('.menu-card');
    expect(animated).toContain('.menu-title');
  });

  /*
   * ── Reduced motion, honoured rather than decorative ──────────────────────
   *
   * Someone who has asked their OS to reduce motion has usually asked because
   * motion makes them ill. A blur resolving on every navigation is exactly the
   * kind of thing that setting means.
   */
  it('turns every one of them off under prefers-reduced-motion', () => {
    /*
     * **Every** reduced-motion block, not the first. The stylesheet has four —
     * this rule set is not the only thing in the game that moves — and reading
     * only the first reported `.screen-shell__bar` as unguarded on a
     * stylesheet where it plainly is not.
     */
    const guard = [...cssCode.matchAll(/@media \(prefers-reduced-motion: reduce\)/g)]
      .map((m) => bodyAt(m.index))
      .join(' ');
    expect(guard.length, 'no reduced-motion guard at all').toBeGreaterThan(0);

    // Derived from the stylesheet rather than restated, so a seventh selector
    // cannot be added to the animation without being covered here.
    const animated = animatedSelectors();
    expect(animated.length).toBeGreaterThan(3);
    for (const selector of animated) {
      expect(guard, `${selector} keeps animating under reduced motion`).toContain(selector);
    }
    expect(guard).toMatch(/animation:\s*none/);
  });
});
