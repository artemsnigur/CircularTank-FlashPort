/**
 * No screen may place content where it cannot be scrolled to.
 *
 * ── Why this is a rule and not a spelling check ───────────────────────────
 * jsdom has no layout engine, so the actual overflow cannot be measured here —
 * that is what the `--ui` reachability probe in `npm run look` is for, and it is
 * the real evidence. What *this* can do is hold the shared rule that made the
 * bug possible, which is the half a driven check would not catch until someone
 * had already shipped a fifth broken screen.
 *
 * The defect: `.screen` centred content taller than itself, and a centred flex
 * container pushes overflow out of **both** ends. The bottom is scrollable, the
 * top is not — `scrollTop` cannot go negative — so the first rows of the shop
 * were unreachable, and the menu, level select and achievements board each lost
 * their last element the same way.
 *
 * Two naive fixes this is built to reject:
 *
 *   1. Giving one screen `overflow-y: auto` and leaving the centring alone.
 *      That is what `.screen--shop` already had, and it did not work.
 *   2. Fixing the four known screens by hand and leaving the shared rule, so the
 *      next screen with a long list arrives broken.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/styles/global.css'), 'utf8');

/** Every rule block, as `{ selector, body }`. Comments stripped first. */
function rules(source: string): { selector: string; body: string }[] {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, '');
  const out: { selector: string; body: string }[] = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(withoutComments)) !== null) {
    out.push({ selector: match[1].trim(), body: match[2] });
  }
  return out;
}

const declaration = (body: string, property: string): string | null => {
  const found = new RegExp(`(?:^|;)\\s*${property}\\s*:([^;]+)`).exec(body);
  return found ? found[1].trim() : null;
};

const all = rules(css);

/**
 * Page-level containers: `.screen` and its modifiers, and nothing nested.
 *
 * The distinction matters — seven other rules in this file centre content and
 * are correct to. `.level-outcome__actions` centring a row of buttons inside a
 * fixed panel cannot strand anything, because the panel does not scroll and the
 * row cannot exceed it. Only a scrolling page container can put content above
 * its own origin.
 */
const pageContainers = all.filter(
  (rule) => /^\.screen(--[a-z-]+)?$/.test(rule.selector) && rule.selector !== '.screen__header',
);

describe('the screen container can always be scrolled to its content', () => {
  it('finds the page-level selectors', () => {
    // If this drops to one, the modifiers were renamed and the rest of this
    // suite would silently stop covering them.
    expect(pageContainers.length).toBeGreaterThanOrEqual(3);
    expect(pageContainers.map((r) => r.selector)).toContain('.screen');
  });

  /**
   * The base rule owns the scrolling, so every screen inherits it. Asserting it
   * here rather than per-screen is the point: a per-screen fix is defect (2).
   */
  it('scrolls on the base rule, not per screen', () => {
    const base = pageContainers.find((r) => r.selector === '.screen')!;
    expect(declaration(base.body, 'overflow-y'), '.screen must scroll').toBe('auto');
    // Without this a `flex: 1` item refuses to shrink below its content, and the
    // scroll container never engages however the overflow is set.
    expect(declaration(base.body, 'min-height'), 'flex item must be allowed to shrink').toBe('0');
  });

  /**
   * **The assertion that rejects both naive fixes.**
   *
   * Any page container that aligns its content away from the start must do it
   * safely. `center` and `flex-end` both strand content above the scroll origin;
   * `safe center` and `safe flex-end` fall back to `start` when it overflows.
   *
   * Driven over *every* page container, so a screen added later with plain
   * `center` fails here rather than in someone's hands.
   */
  it('never aligns a screen away from the start unsafely', () => {
    const unsafe = pageContainers
      .map((rule) => ({ selector: rule.selector, value: declaration(rule.body, 'justify-content') }))
      .filter(
        (entry) =>
          entry.value !== null &&
          !entry.value.startsWith('safe ') &&
          entry.value !== 'flex-start' &&
          entry.value !== 'start',
      );

    expect(unsafe, 'these can place content above the scroll origin').toEqual([]);
  });

  /**
   * The counterpart. The rule above is satisfied by deleting every
   * `justify-content` in the file, which would leave every screen top-aligned
   * and quietly undo the centred layout the game actually wants.
   *
   * So: at least one screen still centres, and it does so safely.
   */
  it('still centres, safely', () => {
    const base = pageContainers.find((r) => r.selector === '.screen')!;
    expect(declaration(base.body, 'justify-content')).toBe('safe center');

    const menu = pageContainers.find((r) => r.selector === '.screen--menu');
    expect(menu, '.screen--menu should still exist').toBeDefined();
    expect(declaration(menu!.body, 'justify-content')).toBe('safe flex-end');
  });

  /**
   * The seven inner centring rules are deliberately untouched, and this says so
   * — otherwise a later reader applying the rule above too broadly would
   * "fix" layout that was never broken.
   */
  it('leaves inner elements centring normally', () => {
    const inner = all.filter(
      (rule) =>
        !/^\.screen(--[a-z-]+)?$/.test(rule.selector) &&
        declaration(rule.body, 'justify-content') === 'center',
    );
    expect(inner.length, 'inner rules still centre').toBeGreaterThan(0);
  });
});
