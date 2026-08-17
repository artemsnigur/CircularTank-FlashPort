/**
 * The bestiary screen.
 *
 * The assertions that matter are about *withholding*: an unmet enemy must not
 * reveal its name or its description, and the component must not be able to
 * find them on its own. The last one is the real guarantee — a screen that
 * imports `BESTIARY` could render a locked entry correctly today and leak it
 * after any future edit.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const CSS = readFileSync('src/styles/global.css', 'utf8');

/*
 * Comments stripped before any selector scan — a prose-as-code match has been
 * caught three times in this repo, and a rule's own docstring here names the
 * very properties these assertions look for.
 */
const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/** The declaration block of one selector, comments already gone. */
function block(selector: string): string {
  const at = cssCode.indexOf(`${selector} {`);
  expect(at, `${selector} is not in the stylesheet`).toBeGreaterThan(-1);
  return cssCode.slice(at, cssCode.indexOf('}', at));
}
import { BestiaryScreen } from './BestiaryScreen';
import { GameEvents } from '../../game/events/GameEvents';
import { attachStoreBridge, detachStoreBridge } from '../../state/bridge';
import { useGameStore } from '../../state/gameStore';

function enterBestiary(): void {
  act(() => {
    GameEvents.emit('scene:ready', { key: 'Bestiary' });
  });
}

/**
 * Three rows covering the three states the screen has to tell apart: met with
 * resistances, met with none (the frame-1 placeholder), and unmet (no badges
 * at all). The middle one is the case an `entry.strengths.length > 0` guard
 * would get wrong if the listing ever stopped sending the placeholder.
 */
function publishSample(): void {
  act(() => {
    GameEvents.emit('bestiary:listed', {
      entries: [
        {
          id: 'Basic',
          displayName: 'Basic',
          description: 'The most boring enemy.',
          strengths: [{ frame: 1, damageType: null, label: 'None', percent: '' }],
          weaknesses: [{ frame: 1, damageType: null, label: 'None', percent: '' }],
          // Frame 1 of `ButtonEnemyBasic` — [plate, overlay, its own glyph].
          tile: [734, 735, 777],
          stats: { money: 10, health: 12, damage: 5, speed: 45 },
          known: true,
        },
        {
          id: 'Fast',
          displayName: 'Fast',
          description: 'Moves quickly.',
          strengths: [{ frame: 2, damageType: 'Explosions', label: 'Explosions', percent: '25%' }],
          weaknesses: [{ frame: 16, damageType: 'Food', label: 'Food', percent: '75%' }],
          tile: [734, 735, 749],
          // A ranged speed, so the "40-160" form is exercised too.
          stats: { money: 20, health: 8, damage: 6, speed: 60, speedMax: 240 },
          known: true,
        },
        {
          id: 'Ghost',
          displayName: 'Ghost',
          strengths: [],
          weaknesses: [],
          // The locked frame: the "?" glyph 739, never Ghost's own 751.
          tile: [734, 735, 739],
          known: false,
        },
      ],
      knownCount: 2,
      total: 3,
      view: { difficulty: 'Easy', tier: '1' },
    });
  });
}

/**
 * Click a roster tile by its accessible name.
 *
 * The screen is a **selection** now, as `ScreenEnemies` is: one window showing
 * one enemy, not twenty rows each showing their own. So most of the assertions
 * below have to say which enemy they are about, and hovering deliberately is
 * not how you say it — see `A8`.
 */
function selectTile(name: string): void {
  const tile = [...document.querySelectorAll<HTMLButtonElement>('.bestiary-tile')].find(
    (button) => button.getAttribute('aria-label') === name,
  );
  expect(tile, `no roster tile called ${name}`).toBeDefined();
  act(() => {
    tile!.click();
  });
}

describe('the bestiary screen', () => {
  beforeEach(() => {
    attachStoreBridge();
    useGameStore.setState({ activeScene: 'Boot', bestiary: null });
  });
  afterEach(() => {
    detachStoreBridge();
  });

  it('renders nothing while another scene is active', () => {
    publishSample();
    const { container } = render(<BestiaryScreen />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows met enemies with their descriptions', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('The most boring enemy.')).toBeInTheDocument();
  });

  /**
   * The picture, and the one thing it must never be. `739` is the locked "?"
   * glyph; `751` is Ghost's own art, which is in the table but must not reach
   * the browser for an enemy the player has not met.
   *
   * Asserted on the rendered `src`, not on the prop: the whole point of this
   * screen's no-import rule is what ends up in the DOM.
   */
  it('draws a met enemy`s tile and withholds an unmet one`s', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    const sources = Array.from(document.querySelectorAll('.enemy-tile__layer'))
      .map((img) => img.getAttribute('src') ?? '');

    // Matched on the filename, not as a substring: `includes('739')` would
    // also accept `1739.svg`, and there are 1015 shapes to collide with.
    const draws = (shape: number): boolean =>
      sources.some((src) => src.endsWith(`/${shape}.svg`) || src.endsWith(`${shape}.svg`));

    expect(draws(777), 'Basic glyph').toBe(true);
    // Ghost is unmet in the sample, so its own glyph is absent from the DOM.
    expect(draws(751), 'Ghost glyph').toBe(false);

    /*
     * **And so is the locked frame, since T179.** The AS3's frame 4 is plate +
     * overlay + a "?" glyph (739); the tile draws its own plate in CSS now and
     * sets the mark in type, so an unmet enemy contributes *no* shape id at
     * all. That is a stronger form of this screen's whole guarantee than
     * sending the right frame was, so it is asserted rather than left as a
     * side effect.
     */
    expect(draws(739), 'locked glyph').toBe(false);
    expect(document.querySelector('.bestiary-tile--locked .bestiary-tile__unknown')).not.toBeNull();
    // The counterpart: a *known* tile does draw art, or "no art anywhere"
    // would satisfy the line above while breaking the screen.
    expect(document.querySelector('.bestiary-tile:not(.bestiary-tile--locked) .enemy-tile')).not.toBeNull();
  });

  it('names the tile for a screen reader without naming a locked enemy', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    // The tile carries no text, so its label is the only name it has — and for
    // a locked one it must not become "Ghost". Read off the tiles rather than
    // the document, because the window names the selected enemy too and
    // `getByLabelText('Basic')` would now match two things.
    const labels = [...document.querySelectorAll('.bestiary-tile')].map((tile) =>
      tile.getAttribute('aria-label'),
    );
    expect(labels).toEqual(['Basic', 'Fast', 'Not yet encountered']);
  });

  it('shows the selected enemy`s stats, and opens on the first', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    // `selectedEnemy` is seeded from `enemyButtonModelArray[0]`, so the window
    // opens on Basic without a click.
    expect(screen.getByText('12 HP')).toBeInTheDocument();
    expect(screen.getByText('10$')).toBeInTheDocument();
    expect(screen.getByText('45 PX/Sec')).toBeInTheDocument();

    // One window, not one per enemy — which is the whole restructure, and the
    // thing a text query cannot show on its own.
    expect(document.querySelectorAll('.bestiary-stats')).toHaveLength(1);
  });

  it('withholds every number for an unmet enemy, rather than hiding the block', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);
    selectTile('Not yet encountered');

    // The block stays, so the shape of what is unknown is still legible; each
    // value reads `???`. Counting them is the assertion — a single leaked
    // number would still leave three question marks.
    const values = [...document.querySelectorAll('.bestiary-stats dd')].map((n) => n.textContent);
    expect(values).toEqual(['???', '???', '???', '???']);

    // And the counterpart on the same render: Ghost's numbers are not in the
    // document *anywhere*, including the window that just showed Basic's.
    expect(screen.queryByText('12 HP')).not.toBeInTheDocument();
  });

  it('prints a speed range only where the listing sends one', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    // Fast carries `speedMax`; Basic does not. Same component both times, so
    // this separates "handles a range" from "always prints one".
    expect(screen.getByText('45 PX/Sec')).toBeInTheDocument();
    selectTile('Fast');
    expect(screen.getByText('60-240 PX/Sec')).toBeInTheDocument();
    expect(screen.queryByText('45 PX/Sec')).not.toBeInTheDocument();
  });

  it('asks the scene to change the view rather than recomputing', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:bestiary-view', (view) => seen.push(view));
    act(() => {
      screen.getByRole('button', { name: 'Hard' }).click();
    });
    off();

    // The tier rides along unchanged — the screen sends a whole view, not a
    // patch, so a stale half cannot reach the scene.
    expect(seen).toEqual([{ difficulty: 'Hard', tier: '1' }]);
  });

  it('marks the selected difficulty and tier as pressed', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    // Rendered from the listing's own `view`, so the buttons cannot show a
    // selection the numbers beside them were not computed at.
    expect(screen.getByRole('button', { name: 'Easy' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hard' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Boss' })).toHaveAttribute('aria-pressed', 'false');
  });

  /**
   * T159 put these on `.chrome-tab` rather than a near-copy of it; T179 moved
   * them to `.difficulty__button`, the pill the rest of this UI uses for
   * "exactly one of these is chosen".
   *
   * **What is being pinned is unchanged**: a *shared* primitive rather than a
   * fork, and `aria-pressed` rather than `aria-current`. The class the
   * primitive happens to be is the part that moved. Both halves still matter —
   * the class alone would let a future edit swap the semantic to
   * `aria-current` to "match the tabs", which would tell a screen reader these
   * navigate when they filter a table, and the attribute alone would let the
   * styling be quietly forked back into a second set of rules.
   */
  it('styles its selectors with the shared pill primitive, still as toggles', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    const easy = screen.getByRole('button', { name: 'Easy' });
    expect(easy.className).toContain('difficulty__button');
    expect(easy).toHaveAttribute('aria-pressed');
    expect(easy).not.toHaveAttribute('aria-current');

    // The tier row is the same pill in a four-column container, not a second
    // set of rules — asserted because "four of these" is exactly the excuse a
    // fork gets written under.
    const boss = screen.getByRole('button', { name: 'Boss' });
    expect(boss.className).toContain('difficulty__button');
    expect(boss.closest('.bestiary__tiers')).not.toBeNull();
  });

  it('hides the name and description of an unmet enemy', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);
    selectTile('Not yet encountered');

    expect(screen.queryByText('Ghost')).not.toBeInTheDocument();
    expect(screen.getByText('???', { selector: '.bestiary__name' })).toBeInTheDocument();
    expect(screen.getByText('Not yet encountered.')).toBeInTheDocument();
  });

  it('still lists the unmet entry, so the gaps are visible', () => {
    // Filtering them out would make the list grow silently and lose the sense
    // of an incomplete collection, which is the whole point of a bestiary.
    enterBestiary();
    publishSample();
    const { container } = render(<BestiaryScreen />);

    expect(container.querySelectorAll('.bestiary-tile')).toHaveLength(3);
    expect(container.querySelectorAll('.bestiary-tile--locked')).toHaveLength(1);
  });

  it('shows the count as met over total', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    expect(screen.getByText('2 / 3 known')).toBeInTheDocument();
  });

  it('says nothing rather than 0 / 0 before the scene publishes', () => {
    enterBestiary();
    render(<BestiaryScreen />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  /*
   * ── Click selects, hover does not — `A8` ─────────────────────────────────
   *
   * The rule level select was reversed onto in T173, applied here for the same
   * reason: a window that changes as the pointer crosses the grid cannot be
   * read, because reading it means moving the pointer off what you are
   * pointing at.
   *
   * Pinned against its counterpart on the *same* tile, because "hovering does
   * nothing" is satisfied by a screen where clicking does nothing either.
   */
  it('changes the window on click and not on hover', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    const fast = [...document.querySelectorAll<HTMLButtonElement>('.bestiary-tile')].find(
      (button) => button.getAttribute('aria-label') === 'Fast',
    )!;

    act(() => {
      fireEvent.mouseEnter(fast);
    });
    expect(document.querySelector('.bestiary__name')?.textContent).toBe('Basic');

    act(() => {
      fast.click();
    });
    expect(document.querySelector('.bestiary__name')?.textContent).toBe('Fast');
  });

  it('marks the selected tile as pressed, and only that one', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);
    selectTile('Fast');

    const pressed = [...document.querySelectorAll('.bestiary-tile')].filter(
      (tile) => tile.getAttribute('aria-pressed') === 'true',
    );
    expect(pressed).toHaveLength(1);
    expect(pressed[0].getAttribute('aria-label')).toBe('Fast');
    // The class the glow hangs off, so a styled state and the semantic cannot
    // drift apart.
    expect(pressed[0].classList.contains('bestiary-tile--on')).toBe(true);
  });

  /*
   * The hover card — the same `CursorTip` level select and the achievements
   * board use, so the corner flash, the hit-test loop and the reflow-per-hover
   * are fixed once rather than three times.
   */
  it('raises the cursor card on hover and takes it away on leave', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    const basic = document.querySelector<HTMLButtonElement>('.bestiary-tile')!;
    expect(document.querySelector('.cursor-tip')).toBeNull();

    act(() => {
      fireEvent.mouseEnter(basic);
    });
    // Portalled to `<body>`, so deliberately not inside the render container.
    const tip = document.querySelector('.cursor-tip');
    expect(tip).not.toBeNull();
    expect(tip!.querySelector('.cursor-tip__title')?.textContent).toBe('Basic');
    expect(tip!.querySelector('.cursor-tip__note')?.textContent).toContain('12 HP');

    act(() => {
      fireEvent.mouseLeave(basic);
    });
    expect(document.querySelector('.cursor-tip')).toBeNull();
  });

  it('says nothing about an unmet enemy in the card either', () => {
    // The withholding rule reaches the tooltip too — it is a second surface
    // rendering the same row, and a second surface is where a guarantee gets
    // lost. Driven beside the met case above rather than alone.
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    const ghost = [...document.querySelectorAll<HTMLButtonElement>('.bestiary-tile')].find(
      (button) => button.getAttribute('aria-label') === 'Not yet encountered',
    )!;
    act(() => {
      fireEvent.mouseEnter(ghost);
    });

    const tip = document.querySelector('.cursor-tip')!;
    expect(tip.textContent).not.toContain('Ghost');
    expect(tip.querySelector('.cursor-tip__title')?.textContent).toBe('???');
    // No stat line at all, because the listing sent no stats.
    expect(tip.querySelector('.cursor-tip__note')).toBeNull();
  });

  /*
   * ── The layout mechanisms ────────────────────────────────────────────────
   *
   * jsdom computes no layout, so none of this proves the screen fits. It was
   * measured in a browser at six viewports — 20 tiles, ratio 1.000, 5x4, no
   * overlap, nothing clipped — and the numbers are in the commit. What these
   * hold is the shape of the rules that made the measurement come out right.
   */
  it('sizes the window by its height as well as its width', () => {
    /*
     * The defect this pins: `--pane` was `clamp(14rem, 30cqw, 30rem)`, width
     * only. Everything in the window is a multiple of it, so its content runs
     * about 1.28x `--pane` tall — a 303px pane needing 389px inside a 315px
     * window at 1024x480. With `overflow: hidden` that clipped in silence, and
     * it was clean from 1366x768 up, which is exactly why a width-only rule
     * looked correct.
     */
    expect(block('.bestiary')).toMatch(/--pane:\s*min\(clamp\([^)]*\),\s*\d+cqh\)/);
    // `cqh`, not `vh`: the bar and the nav take a far larger fraction of a
    // short window than a tall one, which is the `A32` finding.
    expect(block('.bestiary')).not.toMatch(/--pane:[^;]*vh/);
  });

  it('makes the tiles square by construction, not by a ratio kept in step', () => {
    // `aspect-ratio: 1` on a grid item with a definite width. The alternative
    // — computing a row height from the column count — is a second number that
    // has to be changed whenever the first is, and T173 already found that
    // `aspect-ratio` loses to content, so nothing inside may be in flow.
    expect(block('.bestiary-tile')).toMatch(/aspect-ratio:\s*1;/);
    expect(block('.bestiary__grid')).toMatch(
      /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/,
    );
    // Five columns is `:298`'s `3 + 41 * (i - 5 * ii)`, and the plate's ratio
    // is the grid's — four rows of twenty, erring narrow so the slack shows up
    // as centred space rather than as a spill.
    expect(block('.bestiary__board')).toMatch(/aspect-ratio:\s*1\.24/);
    expect(block('.bestiary__grid')).toMatch(/align-content:\s*center/);
  });

  it('spans the body rather than sitting in pillars', () => {
    // `A32` — the same rule the shop, level select and the board landed on.
    expect(block('.bestiary')).not.toMatch(/max-width/);
    expect(block('.bestiary')).toMatch(/justify-content:\s*space-between/);
  });

  it('cannot reach the bestiary data on its own', () => {
    // The guarantee behind every assertion above. If this component imported
    // BESTIARY it could render a locked row from its own lookup, and the
    // withholding would be one careless edit from failing silently.
    const source = readFileSync('src/ui/screens/BestiaryScreen.tsx', 'utf8');

    // Extended in T143: a picture and a stat block are as leakable as a
    // description, so the art table and the stats formula join the list. Each
    // would let this component answer "what is enemy X" for an X the player has
    // never met.
    for (const forbidden of ['bestiaryData', 'enemyKnowledge', 'bestiaryArt', 'bestiaryStats']) {
      expect(source, forbidden).not.toMatch(new RegExp(`from '[^']*/${forbidden}'`));
    }

    // The counterpart, and the reason the list above is not just decoration:
    // the screen *does* import the leaf that carries the view shapes and the
    // tier labels, and that module holds no enemy data to leak. Without this,
    // the loop would pass just as well on a file that imported nothing at all.
    expect(source).toMatch(/from '[^']*\/bestiaryView'/);

    // And the instrument check, because a regex that matched nothing would
    // make every line above pass. Driven on a fabricated import rather than by
    // editing the real component: the dev server watches that file, and this
    // repo has already lost two hours to a probe that truncated a watched
    // module. A wrong pattern fails here instead.
    const pattern = /from '[^']*\/bestiaryStats'/;
    expect(pattern.test("import { bestiaryStats } from '../../game/enemies/bestiaryStats';")).toBe(
      true,
    );
    expect(pattern.test("import { BESTIARY_TIERS } from '../../game/enemies/bestiaryView';")).toBe(
      false,
    );
  });
});
