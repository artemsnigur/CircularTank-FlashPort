/**
 * The screen transition.
 *
 * ── Why this is a stylesheet test and not a render test ───────────────────
 * The whole mechanism is "a CSS animation runs when an element mounts". jsdom
 * runs no animations and computes no layout, so rendering a screen and looking
 * for movement would assert nothing. What *can* be held is the shape of the
 * rules the browser acts on — and, more usefully, the three things that would
 * quietly break it.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const CSS = readFileSync('src/styles/global.css', 'utf8');

/*
 * Comments stripped first. This block is documented in prose that names
 * `transform`, `animation` and `.bottom-nav` by hand — a scan reading prose as
 * code has been caught three times in this repo, and here it would report the
 * dock as animated because a comment says it is not.
 */
const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/**
 * The whole body of a rule, **brace-matched**.
 *
 * The obvious `indexOf('}')` is wrong for anything nested, and it failed here
 * first time out: `@keyframes screen-in` closes at its `from` block's brace,
 * so the slice stopped before `to` existed and the assertion read "no
 * `transform: none`" on a stylesheet that has one. The same cut truncated the
 * reduced-motion guard to its first selector.
 *
 * A wrong answer from the instrument rather than from the code, which is the
 * failure mode this project keeps finding — so the helper counts braces.
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

describe('the mount animation', () => {
  it('fades and rises, from a state that applies before the first paint', () => {
    const frames = block('@keyframes screen-in');
    expect(frames).toMatch(/opacity:\s*0/);
    expect(frames).toMatch(/transform:\s*translateY\(10px\) scale\(0\.985\)/);

    // A fill mode that reaches *backwards*. Without one the element paints
    // once at full opacity before the animation's first frame — the same
    // one-frame flash `D-TIP` chased on the cursor tooltip.
    expect(cssCode).toMatch(/animation:\s*screen-in [^;]*\bbackwards\b/);
  });

  /*
   * ── Nothing is held after the animation ends ─────────────────────────────
   *
   * The fill mode must not be `both` or `forwards`. Both hold the `to` state
   * forever, and a *held* `transform: none` does not compute to `none`:
   * measured in Chromium, `getComputedStyle().transform` read
   * `matrix(1, 0, 0, 1, 0, 0)` on every screen once the animation had
   * finished. An identity matrix is still a transform, so each of these
   * bodies — several of which are `container-type: size` — would become the
   * containing block for any `position: fixed` descendant, permanently, for
   * the sake of one frame at the start.
   *
   * **This assertion is a stand-in for a browser and says so.** It cannot see
   * a computed matrix; it can only refuse the fill modes that produce one.
   * `transition.mjs` measured it, and is what found it — the first version of
   * this file asserted `transform: none` inside the keyframe and passed
   * happily while the bug was live.
   */
  it('holds nothing after the animation ends', () => {
    expect(cssCode).not.toMatch(/animation:\s*screen-(?:in|fade) [^;]*\bboth\b/);
    expect(cssCode).not.toMatch(/animation:\s*screen-(?:in|fade) [^;]*\bforwards\b/);

    // The counterpart, so "no fill mode at all" cannot pass: the backwards
    // half is what stops the first-frame flash and must still be there.
    expect(cssCode).toMatch(/animation:\s*screen-in [^;]*\bbackwards\b/);
    expect(cssCode).toMatch(/animation:\s*screen-fade [^;]*\bbackwards\b/);
  });

  it('animates the bar and the body but never the dock', () => {
    /*
     * The bottom bar is the one piece of chrome that is the *same object* on
     * all five screens. A navigation bar that fades out and back in each time
     * you press it reads as a page load, which is the opposite of what this
     * change is for.
     *
     * Driven as a pair on the same rule, because "the dock does not animate"
     * is satisfied by a stylesheet where nothing animates at all.
     */
    const animated = [...cssCode.matchAll(/([^{}]+)\{[^}]*animation:\s*screen-in/g)].map((m) =>
      m[1].trim(),
    );
    expect(animated.join(' ')).toContain('.screen-shell__body');
    expect(animated.join(' ')).toContain('.screen-shell__bar');
    expect(animated.join(' ')).not.toContain('.bottom-nav');
  });

  it('moves the menu`s floating parts and only fades its wallpaper', () => {
    // `.menu-wallpaper` is full-bleed, so `scale(0.985)` would pull its edges
    // in and show a hairline of the Phaser canvas all the way round for the
    // length of the animation. It gets an opacity-only keyframe instead.
    expect(block('.menu-wallpaper')).toMatch(/animation:\s*screen-fade/);
    const fade = block('@keyframes screen-fade');
    expect(fade).not.toMatch(/transform/);

    // And the counterpart: the parts that *should* move do.
    const animated = [...cssCode.matchAll(/([^{}]+)\{[^}]*animation:\s*screen-in/g)]
      .map((m) => m[1].trim())
      .join(' ');
    expect(animated).toContain('.menu-card');
    expect(animated).toContain('.menu-title');
  });

  /*
   * ── Reduced motion, honoured rather than decorative ──────────────────────
   *
   * Someone who has asked their OS to reduce motion has usually asked because
   * motion makes them ill. A 220ms rise on every navigation is exactly the
   * kind of thing that setting means.
   */
  it('turns every one of them off under prefers-reduced-motion', () => {
    /*
     * **Every** reduced-motion block, not the first. The stylesheet has four
     * of them — this rule set is not the only thing in the game that moves —
     * and `block()` returns the one it finds first, which is somebody else's.
     * That read as "`.screen-shell__bar` keeps animating" on a stylesheet
     * where it plainly does not: the instrument pointing at the wrong rule,
     * again.
     */
    const guard = [...cssCode.matchAll(/@media \(prefers-reduced-motion: reduce\)/g)]
      .map((m) => bodyAt(m.index))
      .join(' ');
    expect(guard.length, 'no reduced-motion guard at all').toBeGreaterThan(0);

    // Every selector that opts into an animation must be turned off again —
    // a guard covering four of five is the failure that looks handled.
    const animated = [...cssCode.matchAll(/([^{}]+)\{[^}]*animation:\s*screen-(?:in|fade)/g)]
      .flatMap((m) => m[1].split(','))
      .map((s) => s.trim())
      .filter((s) => s.startsWith('.'));
    expect(animated.length).toBeGreaterThan(3);
    for (const selector of animated) {
      expect(guard, `${selector} keeps animating under reduced motion`).toContain(selector);
    }
    expect(guard).toMatch(/animation:\s*none/);
  });
});
