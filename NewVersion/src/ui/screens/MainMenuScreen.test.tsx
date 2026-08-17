/**
 * The main menu's floating layout — T164.
 *
 * ── What these can and cannot see ─────────────────────────────────────────
 * jsdom computes no layout, so nothing here proves the composition *looks*
 * right. That was done by screenshotting the running page and comparing it
 * with the reference capture, over several rounds; the numbers and what each
 * round corrected are in the commit.
 *
 * What is checkable is the structure the composition rests on: the wallpaper,
 * the floating logo, the toggles and the card all exist, the picture is painted
 * as a background rather than as an image element, the online column is gone,
 * and the slots come from real save data rather than from a hard-coded row.
 */
import { readFileSync } from 'node:fs';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MainMenuScreen } from './MainMenuScreen';
import { GameEvents } from '../../game/events/GameEvents';
import { useGameStore } from '../../state/gameStore';

const initial = useGameStore.getState();

const SLOTS = [
  { slot: 1, hasData: true, progress: 'World 1 - 3', dateTime: '16/Aug/26/03:31', premium: false },
  { slot: 2, hasData: false, premium: false },
  { slot: 3, hasData: false, premium: false },
];

beforeEach(() => {
  useGameStore.setState(initial, true);
  useGameStore.setState({
    activeScene: 'MainMenu',
    phase: 'ready',
    slotPickerOpen: false,
    slotList: SLOTS,
  });
});

afterEach(() => {
  GameEvents.removeAllListeners();
});

describe('the layout', () => {
  it('is a wallpaper with a floating logo and card over it', () => {
    const { container } = render(<MainMenuScreen />);

    expect(container.querySelector('.menu-wallpaper')).not.toBeNull();
    expect(container.querySelector('.menu-title')).not.toBeNull();
    expect(container.querySelector('.menu-card')).not.toBeNull();
    expect(container.querySelector('.menu-toggles')).not.toBeNull();
  });
});

describe('the wordmark', () => {
  /**
   * It was `<ChromeArt clip="TitleMainMenu">` — an `<img>` — until T165. Now
   * it is a heading, which is both what it *is* and what makes it scale.
   */
  it('is a real heading, not a picture of one', () => {
    const { container } = render(<MainMenuScreen />);

    expect(screen.getByRole('heading', { name: /circular tank/i })).toBeInTheDocument();
    expect(screen.queryByRole('img', { name: /circular tank/i })).toBeNull();
    // The counterpart to the heading assertion: a heading whose text came from
    // an `alt` would satisfy the first line alone.
    expect(container.querySelector('.menu-title')?.textContent).toContain('CIRCULAR TANK');
  });

  /**
   * The two-copy structure, and the reason it needs a test.
   *
   * `background-clip: text` needs `color: transparent`, and a `text-shadow` on
   * transparent text shows *through* the glyphs — so the metal and the
   * extrusion cannot be one element. The cost is the word appearing twice in
   * the DOM, and the second copy must be hidden from the accessibility tree or
   * the heading announces "circular tank circular tank".
   *
   * `getByRole('heading', { name })` computes the real accessible name, so
   * dropping the `aria-hidden` fails this rather than merely looking untidy.
   */
  it('renders the word twice but announces it once', () => {
    const { container } = render(<MainMenuScreen />);

    expect(container.querySelectorAll('.menu-title span')).toHaveLength(2);
    expect(container.querySelector('.menu-title__gloss')?.getAttribute('aria-hidden')).toBe('true');
    // The exact name, not a substring: a doubled name would still match /…/i.
    expect(screen.getByRole('heading', { name: 'CIRCULAR TANK' })).toBeInTheDocument();
  });

  /**
   * Both copies come from one constant. They are two elements holding the same
   * string, and a hand-edited pair would drift — the visible result being a
   * gloss layer spelling something slightly different from the body under it,
   * which reads as a rendering fault rather than a typo.
   */
  it('keeps the two copies identical', () => {
    const { container } = render(<MainMenuScreen />);
    const [solid, gloss] = [...container.querySelectorAll('.menu-title span')];

    expect(solid?.textContent).toBe(gloss?.textContent);
  });
});

describe('the art the menu no longer uses', () => {
  /**
   * T165's actual claim: the wordmark and PLAY are **CSS**, so no extracted
   * clip is rendered on this screen at all.
   *
   * Asserting the absence of `.chrome-art` is the whole check in one line —
   * it covers both replacements and any third that gets added back later. The
   * toggles are the deliberate exception and are checked below, which is what
   * stops this from being satisfied by a blank screen.
   */
  it('renders no clip art outside the audio toggles', () => {
    const { container } = render(<MainMenuScreen />);
    const outside = [...container.querySelectorAll('.chrome-art')].filter(
      (node) => !node.closest('.menu-toggles'),
    );

    expect(outside.map((n) => n.getAttribute('data-clip'))).toEqual([]);
  });

  it('still draws the toggles from the original art', () => {
    const { container } = render(<MainMenuScreen />);
    // The counterpart. Without this, deleting every ChromeArt on the screen
    // would pass the test above.
    expect(
      container.querySelectorAll('.menu-toggles .chrome-art').length,
    ).toBeGreaterThan(0);
  });
});

describe('the wallpaper', () => {
  /**
   * The picture is a **background image on the block**, not a `<ChromeArt>`.
   *
   * That is not a style preference: the exported SVGs carry no `viewBox` and
   * their drawing fills only part of the canvas, so an `<img>` could not be
   * made to fill the block by any sizing. Asserting the block carries a
   * background keeps a future edit from "tidying" it back into a ChromeArt and
   * silently reintroducing the banding.
   */
  it('paints the wallpaper as a background rather than an image element', () => {
    const { container } = render(<MainMenuScreen />);
    const wallpaper = container.querySelector<HTMLElement>('.menu-wallpaper');

    // Just that a picture is painted: the resolved URL is a hashed asset path,
    // so matching its extension would assert on Vite's output naming.
    expect(wallpaper?.style.backgroundImage).toContain('url(');
    // And *not* as a ChromeArt: an `<img>` of these SVGs letterboxes at any
    // size, which is the banding this layout exists to remove. See `A27`.
    expect(container.querySelector('[data-clip="BackgroundMainMenu"]')).toBeNull();
  });
});

describe('the card', () => {
  it('has one heading, and no online-saves column', () => {
    render(<MainMenuScreen />);
    expect(screen.getByRole('heading', { name: 'Local saves' })).toBeInTheDocument();
    // Dropped outright in T164: the feature is not ported, and a panel whose
    // only content was saying so was carrying that news for nobody.
    expect(screen.queryByRole('heading', { name: 'Online saves' })).toBeNull();
    expect(screen.queryByText(/armor games/i)).toBeNull();
  });

  it('lists the real slots, filled and empty', () => {
    render(<MainMenuScreen />);

    // A filled slot names itself and its progress; the empty ones read as new
    // games. Both in one assertion, because a column that rendered only one
    // kind would pass either alone.
    expect(screen.getByRole('button', { name: /Load slot 1/ })).toBeInTheDocument();
    expect(screen.getByText('World 1 - 3')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /New game in slot/ })).toHaveLength(2);
    // Every slot names itself, filled or not — the card lists them as boxes.
    expect(screen.getByText('Slot 2')).toBeInTheDocument();
  });

  it('offers to delete a filled slot and not an empty one', () => {
    render(<MainMenuScreen />);
    expect(screen.getAllByRole('button', { name: /Delete slot/ })).toHaveLength(1);
  });

  it('starts a game from PLAY', () => {
    const started: unknown[] = [];
    GameEvents.subscribe('ui:start-game', (payload) => started.push(payload));

    render(<MainMenuScreen />);
    screen.getByRole('button', { name: /play|continue/i }).click();

    expect(started).toHaveLength(1);
  });

  /**
   * PLAY carries its word as text now rather than as `ButtonPlay`'s art, and
   * the two names must agree.
   *
   * The visible label and the accessible name are written separately — the
   * label is one word, the name adds the level being resumed — which is
   * exactly the shape that drifts. WCAG 2.5.3 wants the visible text to be
   * *contained in* the accessible name, so a voice-control user saying what
   * they can see actually presses it.
   */
  it('reads its own label out of the button', () => {
    render(<MainMenuScreen />);
    const play = screen.getByRole('button', { name: /play|continue/i });
    const visible = play.querySelector('.menu-play__label')?.textContent ?? '';

    expect(visible).not.toBe('');
    expect(play.getAttribute('aria-label')?.toLowerCase()).toContain(visible.toLowerCase());
  });

  it('loads a slot when one is chosen', () => {
    const chosen: unknown[] = [];
    GameEvents.subscribe('ui:select-slot', (payload) => chosen.push(payload));

    render(<MainMenuScreen />);
    screen.getByRole('button', { name: /Load slot 1/ }).click();

    expect(chosen).toEqual([{ slot: 1 }]);
  });
});

describe('the audio toggles', () => {
  it('float over the picture', () => {
    const { container } = render(<MainMenuScreen />);
    const toggles = container.querySelector('.menu-toggles');

    expect(toggles).not.toBeNull();
    expect(toggles?.querySelector('[role="group"]')).not.toBeNull();
  });
});

describe('the secondary navigation is gone', () => {
  /**
   * The original's menu has no destination buttons at all — PLAY is the only
   * way in, and the in-game bottom bar reaches every other screen. The port
   * carried a cluster of them and they are deliberately gone, so this asserts
   * their absence rather than leaving it to be re-added as an improvement.
   *
   * T164 removed the dev affordances too: the screen is meant to stay clean,
   * and a developer can still reach those scenes from the level select.
   */
  it('offers no Level Select, Upgrades or Bestiary button', () => {
    render(<MainMenuScreen />);

    for (const name of ['Level Select', 'Upgrades', 'Bestiary', 'Achievements']) {
      expect(screen.queryByRole('button', { name }), name).toBeNull();
    }
  });
});

/**
 * ── The card scales from one variable ───────────────────────────────────────
 *
 * **These read the stylesheet. That proves the rule is written, never that it
 * computes** — jsdom has no layout engine and no `calc()` resolution, so a
 * `--card-w` that resolved to nonsense would pass everything here. The sizes
 * at 400px and at 2560px were measured in a browser and the numbers are in the
 * commit; this holds the shape that made them proportional.
 *
 * Worth having anyway, because the failure it guards is a silent one: the card
 * grows, one hard-coded `padding: 32px` stays put, and the result is a large
 * panel with cramped-looking contents that nobody reads as a bug.
 */
describe('the card derives its spacing from its width', () => {
  const css = readFileSync('src/styles/global.css', 'utf8');

  /** Rule blocks in the menu family, comments stripped. */
  const cardRules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .map((m) => ({ selector: m[1].trim(), body: m[2] }))
    .filter((rule) => /^\.menu-(card|slot|play)/.test(rule.selector));

  it('finds the rules it means to govern', () => {
    // If a rename empties this, every assertion below passes vacuously.
    expect(cardRules.length).toBeGreaterThanOrEqual(8);
  });

  it('sets one lever, and clamps it', () => {
    const card = cardRules.find((r) => r.selector === '.menu-card');

    expect(card?.body).toMatch(/--card-w:\s*min\(clamp\(/);
    // The viewport floor. `clamp()`'s lower bound is a *minimum*, so on a
    // narrow phone the card would insist on 400px and overhang the screen.
    expect(card?.body).toContain('100vw');
    expect(card?.body).toMatch(/width:\s*var\(--card-w\)/);
  });

  /**
   * The three the maintainer named. A fixed length in any of them is the
   * defect: it is what stops the inside of the card growing with the outside.
   */
  it('leaves no fixed padding, gap or text size inside it', () => {
    const fixed: string[] = [];

    for (const { selector, body } of cardRules) {
      for (const [, property, value] of body.matchAll(
        /(?:^|;)\s*(padding|gap|font-size)\s*:([^;]+)/g,
      )) {
        const scales =
          value.includes('var(--card-w)') || /(?:^|\s)0(?:\s|$)|em\b|%/.test(value.trim());
        if (!scales) fixed.push(`${selector} { ${property}:${value.trim()} }`);
      }
    }

    expect(fixed, 'these stay put while the card grows').toEqual([]);
  });

  /**
   * The counterpart, and the reason the rule above is not enough on its own:
   * it is satisfied by deleting every `padding` and `gap` in the card. So the
   * lever must actually be *used*, in more than the one place that defines it.
   */
  it('actually uses the lever throughout', () => {
    const users = cardRules.filter((r) => r.body.includes('calc(var(--card-w)'));
    expect(users.length).toBeGreaterThanOrEqual(6);
  });
});

/**
 * The two pure-CSS controls. Same limit as above — the stylesheet is read, not
 * rendered — so these pin the handful of declarations whose *absence* is
 * invisible in a diff and obvious on screen.
 */
describe('the wordmark and PLAY are built, not drawn', () => {
  const css = readFileSync('src/styles/global.css', 'utf8');

  const block = (selector: string): string => {
    const literal = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = new RegExp(`${literal}\\s*\\{([^}]*)\\}`).exec(css);
    expect(found, `${selector} is missing`).not.toBeNull();
    return found![1];
  };

  /**
   * The gloss layer is transparent text over a gradient. Without the clip it
   * is a solid rectangle sitting on the logo — the single most visible way
   * this can break, and one character to lose.
   */
  it('clips the wordmark gradient to the glyphs, with a prefix', () => {
    const gloss = block('.menu-title__gloss');

    expect(gloss).toMatch(/background-image:\s*linear-gradient/);
    expect(gloss).toContain('-webkit-background-clip: text');
    expect(gloss).toContain('background-clip: text');
    // The transparent fill is what lets the clipped background show at all.
    expect(gloss).toMatch(/color:\s*transparent/);
  });

  it('hides the gradient layer where clipping is unsupported', () => {
    // Otherwise the fallback is worse than no gradient: an opaque bar over the
    // title, rather than the plain extruded wordmark underneath.
    expect(css).toMatch(
      /@supports not \(\(background-clip: text\) or \(-webkit-background-clip: text\)\)/,
    );
  });

  /**
   * The extrusion is in `em`, which is the whole reason the logo survives a
   * `font-size` that ranges over 3.4x. In `px` it would be a deep 3D block on
   * a phone and a hairline on a 2K monitor.
   */
  it('scales the wordmark depth with the type', () => {
    const solid = block('.menu-title__solid');

    expect(solid).toMatch(/text-shadow:[^;]*em/);
    expect(solid).not.toMatch(/text-shadow:[^;]*\dpx/);
    expect(solid).toMatch(/-webkit-text-stroke:\s*[\d.]+em/);
  });

  it('builds the pill out of gradients and inset light', () => {
    const play = block('.gloss-pill');

    expect(play).toMatch(/background-image:\s*linear-gradient/);
    // The lit top rim and the shaded bottom — the pair is what gives the pill
    // thickness. One without the other reads as a flat capsule.
    expect(play).toMatch(/inset 0 1px 0 rgb\(255 255 255/);
    expect(play).toMatch(/inset 0 -[\d.]+em [\d.]+em [^,]*rgb\(0 0 0/);
    // And it lifts off the card rather than sitting flush.
    expect(play).toMatch(/\n\s*0 [\d.]+em [\d.]+em rgb\(0 0 0/);
  });

  it('gives the pill a specular sweep as its own layer', () => {
    // A gradient stop cannot curve; the pseudo-element's elliptical radius is
    // what makes the highlight read as a reflection instead of a band.
    const sweep = block('.gloss-pill::before');

    expect(sweep).toMatch(/border-radius:[^;]*\//);
    expect(sweep).toMatch(/background-image:\s*linear-gradient/);
    expect(sweep).toContain('pointer-events: none');
  });

  it('responds to hover and press differently', () => {
    // A button that only brightens on press still looks like it is floating.
    expect(css).toMatch(/\.gloss-pill:active \{[^}]*transform:\s*translateY\(/);
    expect(css).toMatch(/\.gloss-pill:hover,\s*\n\.gloss-pill:focus-visible \{/);
    expect(css).toMatch(/\.gloss-pill:focus-visible \{[^}]*outline:/);
  });
});
