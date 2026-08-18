/**
 * Level select's two columns — T157.
 *
 * ── What this is really guarding ──────────────────────────────────────────
 * The original **selects** a level and then needs `ButtonPlayLevel` to start
 * it. The port diverged from that for a long time — `A8`, a cell click
 * launched immediately — and T173 reversed the decision. So the first block
 * here now asserts the *inverse* of what it used to: a tile selects, `PLAY
 * LEVEL` starts, and hover does nothing at all.
 *
 * The old assertions are kept as their opposites rather than deleted, because
 * click-to-launch is exactly what a well-meaning revert would reintroduce.
 */
import { readFileSync } from 'node:fs';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LevelSelectScreen } from './LevelSelectScreen';
import { GameEvents } from '../../game/events/GameEvents';
import { useGameStore } from '../../state/gameStore';
import type { LevelListing } from '../../state/gameStore';

const initial = useGameStore.getState();

/**
 * World 1's first four levels, with three open — enough for a frontier.
 *
 * **The modes here have to be the real ones.** The tiles take their label from
 * this listing, but the detail panel looks the level up in `LEVELS` through
 * `previewForLevel`. An invented mode makes the two disagree and the test
 * assert against fiction — which is how the first version of this file failed:
 * it called level 2 a Flag level, and the panel correctly said Normal.
 * World 1 runs Normal, Normal, Flag, Normal, Flag.
 */
const LISTING: LevelListing = {
  world: 1,
  worldName: 'Desert',
  levels: [
    // `medals` is what the tiles draw and `value` is the per-difficulty count;
    // level 2 carries a mixed row on purpose, because a component that painted
    // every medal one colour would pass a uniform fixture.
    {
      level: 1,
      mode: 'Normal',
      cleared: true,
      unlocked: true,
      value: 3,
      medals: ['bronze', 'bronze', 'bronze'],
    },
    {
      level: 2,
      mode: 'Normal',
      cleared: true,
      unlocked: true,
      value: 2,
      medals: ['gold', 'silver', 'bronze'],
    },
    { level: 3, mode: 'Flag', cleared: false, unlocked: true, value: 0, medals: [] },
    {
      level: 4,
      mode: 'Normal',
      cleared: false,
      unlocked: false,
      value: 0,
      medals: [],
    },
  ],
};

beforeEach(() => {
  useGameStore.setState(initial, true);
  // Set directly rather than emitting `scene:ready`: that route needs the
  // bridge attached, and this file is testing the screen, not the wiring.
  useGameStore.setState({
    activeScene: 'LevelSelect',
    levelList: LISTING,
    // `selected` non-zero means the grid rather than the world picker.
    worldList: { selected: 1, worlds: [] },
    difficulty: 'Medium',
  });
});

afterEach(() => {
  GameEvents.removeAllListeners();
});

/**
 * ── `A8` reversed — the grid selects, PLAY LEVEL starts ────────────────────
 *
 * This block used to assert the opposite, and read "the grid still starts a
 * level on click — divergence A8". That was an accurate description of a
 * deliberate decision, not a bug; T173 reversed the decision at the
 * maintainer's direction, back to the AS3's four steps.
 *
 * Kept as the inverse rather than deleted, because a click that launches is
 * exactly what a well-meaning revert would reintroduce.
 */
describe('the grid selects a level; it does not start one', () => {
  it('starts nothing when a tile is clicked', () => {
    const started: unknown[] = [];
    GameEvents.subscribe('ui:start-game', (payload) => started.push(payload));

    render(<LevelSelectScreen />);
    screen.getByRole('button', { name: /Level 2, Normal/ }).click();

    expect(started).toEqual([]);
  });

  it('points the panel at the clicked level instead', () => {
    // The counterpart: "starts nothing" is also satisfied by a dead tile.
    render(<LevelSelectScreen />);
    act(() => {
      screen.getByRole('button', { name: /Level 2, Normal/ }).click();
    });

    const panel = screen.getByRole('complementary', { name: 'Level detail' });
    expect(panel).toHaveTextContent('Level 2');
    expect(screen.getByRole('button', { name: /Level 2, Normal/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  /**
   * **Hover must not move the selection.** It did, and the panel changed under
   * the cursor on the way to anywhere else. Driven on the same element as the
   * click above, so "hover does nothing" cannot pass by the tile being inert.
   */
  it('ignores hover and focus entirely', () => {
    render(<LevelSelectScreen />);
    const panel = screen.getByRole('complementary', { name: 'Level detail' });
    const tile = screen.getByRole('button', { name: /Level 2, Normal/ });

    act(() => {
      fireEvent.mouseEnter(tile);
      tile.focus();
    });

    // Still the level guide's fallback, not the hovered one.
    expect(panel).toHaveTextContent('Level 3');
    expect(tile).toHaveAttribute('aria-pressed', 'false');
  });

  it('leaves a locked tile inert', () => {
    const started: unknown[] = [];
    GameEvents.subscribe('ui:start-game', (payload) => started.push(payload));

    render(<LevelSelectScreen />);
    screen.getByRole('button', { name: /Level 4, locked/ }).click();

    expect(started).toEqual([]);
    expect(screen.getByRole('complementary', { name: 'Level detail' })).toHaveTextContent(
      'Level 3',
    );
  });
});

describe('the detail column', () => {
  it('describes the furthest open level before anything is pointed at', () => {
    render(<LevelSelectScreen />);
    const panel = screen.getByRole('complementary', { name: 'Level detail' });

    // Level 3 is the last unlocked one — the level the player is here to play.
    // `Level 3`, not `Level 1-3`: `:421` sets `levelText` to the level alone,
    // and the world is named over the grid beside it.
    expect(panel).toHaveTextContent('Level 3');
    expect(panel).toHaveTextContent(/Flag mode/i);
  });

  /**
   * **The guide's level wins over the frontier** —
   * `selectFromLevelGuide` (`:583-595`). The scene applies the AS3's two
   * conditions and publishes `guideLevel`; the screen honours it.
   *
   * The two agree whenever the guide is on `Upcoming`, which is why the old
   * frontier-only fallback looked correct. They diverge the moment the player
   * moves the guide in the shop, so the fixture puts it somewhere the frontier
   * is not — otherwise this passes on a screen that ignores it entirely.
   */
  it('opens on the level guide`s level, not the furthest open one', () => {
    useGameStore.setState({ levelList: { ...LISTING, guideLevel: 1 } });

    render(<LevelSelectScreen />);
    const panel = screen.getByRole('complementary', { name: 'Level detail' });

    expect(panel).toHaveTextContent('Level 1');
    // The frontier is 3, and it must not be what is shown.
    expect(panel).not.toHaveTextContent('Level 3');
  });

  it('falls back to the frontier when the guide points elsewhere', () => {
    // The counterpart: `guideLevel` absent is the AS3 declining to move the
    // selection, and the panel must still describe something.
    useGameStore.setState({ levelList: { ...LISTING, guideLevel: undefined } });

    render(<LevelSelectScreen />);
    const panel = screen.getByRole('complementary', { name: 'Level detail' });

    expect(panel).toHaveTextContent('Level 3');
  });

  it('follows a click to another level', () => {
    render(<LevelSelectScreen />);
    const panel = screen.getByRole('complementary', { name: 'Level detail' });

    act(() => {
      screen.getByRole('button', { name: /Level 2, Normal/ }).click();
    });

    expect(panel).toHaveTextContent('Level 2');
    // The mode changes with it — Flag on the frontier, Normal here — which is
    // what separates "the panel followed" from "the panel is stuck on one
    // level and happens to name it".
    expect(panel).toHaveTextContent(/Normal mode/i);
  });

  it('offers PLAY LEVEL for the level it names, as a second route not a gate', () => {
    const started: unknown[] = [];
    GameEvents.subscribe('ui:start-game', (payload) => started.push(payload));

    render(<LevelSelectScreen />);
    screen.getByRole('button', { name: 'Play level 1-3' }).click();

    expect(started).toEqual([{ world: 1, level: 3, difficulty: 'Medium' }]);
  });

  it('names its objective and its enemies', () => {
    render(<LevelSelectScreen />);
    const panel = screen.getByRole('complementary', { name: 'Level detail' });

    expect(panel).toHaveTextContent('Objective');
    expect(panel).toHaveTextContent('Enemies');
    // 1-3 is a real level, so the roster cannot be empty — an empty one would
    // mean the preview lookup silently failed and the panel rendered its
    // fallback dash.
    expect(panel.querySelectorAll('.levels__enemy').length).toBeGreaterThan(0);
  });
});

describe('the difficulty buttons', () => {
  it('marks the set difficulty, and names each one for a screen reader', () => {
    render(<LevelSelectScreen />);

    // The word is inside the artwork, so the accessible name is the only text.
    const medium = screen.getAllByRole('button', { name: 'Medium' })[0];
    expect(medium).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getAllByRole('button', { name: 'Easy' })[0]).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  /**
   * The pills are CSS since T170 — `ButtonDifficultyEasy`'s three clips are no
   * longer drawn. The rule they carried survives the swap and is what this
   * pins: `ButtonGameDifficulty:73`'s frame 3 is **selected**, not pressed, so
   * the state lives on the resting control.
   *
   * Both directions, because a picker stuck in one state passes either
   * assertion alone.
   */
  it('marks the selected difficulty and only that one', () => {
    render(<LevelSelectScreen />);

    const medium = screen.getAllByRole('button', { name: 'Medium' })[0];
    const easy = screen.getAllByRole('button', { name: 'Easy' })[0];

    expect(medium).toHaveAttribute('aria-pressed', 'true');
    expect(medium.className).toContain('difficulty__button--on');
    expect(easy).toHaveAttribute('aria-pressed', 'false');
    expect(easy.className).not.toContain('difficulty__button--on');
  });

  it('draws no clip art for them at all', () => {
    // The counterpart to the swap: the class could be right while the old
    // pictures were still rendered underneath.
    const { container } = render(<LevelSelectScreen />);
    expect(container.querySelectorAll('.difficulty .chrome-art')).toHaveLength(0);
  });
});

/**
 * ── The layout, and what these can and cannot see — T170 ───────────────────
 *
 * **The stylesheet is read, not rendered.** jsdom has no layout engine and
 * resolves no `calc()`, so a `--cell` that computed to nonsense would pass
 * every line below. The fit was **measured in headless Chromium** against the
 * production build, driving the real screen at eight viewports from 1024x480
 * to 3840x2160 and comparing `scrollHeight` with `clientHeight` on
 * `.screen-shell__body`, plus rectangle intersection between every cell and
 * the panels beside it. All eight equal, 0 overlaps. Numbers in the commit.
 *
 * **Against the production build, and that mattered.** The first run used the
 * dev server, where `DevLevelJump` renders — a whole section, not a button. On
 * a 1024x480 viewport it took the entire body and the layout row measured 0px
 * tall, so every reading was of a screen that does not ship.
 */
describe('the level layout is built not to scroll', () => {
  /**
   * Comments stripped — the third instance of this trap in the repo is
   * documented on the shop's suite, and the same scan is used here.
   */
  const css = readFileSync('src/styles/global.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  const block = (selector: string): string => {
    const literal = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = new RegExp(`${literal}\\s*\\{([^}]*)\\}`).exec(css);
    expect(found, `${selector} is missing`).not.toBeNull();
    return found![1];
  };

  it('takes the scroll off the body rather than hoping it never overflows', () => {
    const body = block('.screen--levels .screen-shell__body');

    expect(body).toMatch(/overflow:\s*hidden/);
    // `.screen-shell__body` sets `overflow-y: auto`; both are one class, so the
    // override has to out-specify it rather than merely follow it.
    expect(css).toMatch(/\.screen-shell__body \{[^}]*overflow-y: auto/);
    // And the DEV jump is a sibling, so the layout gets a row rather than the
    // whole body — the shop overflowed by exactly its DEV button's height.
    expect(body).toMatch(/grid-template-rows:\s*minmax\(0, 1fr\) auto/);
  });

  /**
   * The cell measures the **plate**, not the window.
   *
   * `cqh` here resolves to `.levels__grid-panel`, whose height is whatever the
   * column leaves after the heading and the button — which is exactly the
   * height the grid has to fit into. Measuring the viewport instead makes the
   * cell a function of space the grid does not own, and the bar and nav take a
   * far larger fraction of a short window than a tall one.
   */
  it('sizes the cell from the plate it sits on', () => {
    expect(block('.levels__grid-panel')).toMatch(/container-type:\s*size/);

    const grid = block('.level-grid');
    expect(grid).toMatch(/--cell:\s*clamp\([^;]*min\([^;]*cqh[^;]*cqw[^;]*\)/);
    expect(grid).not.toMatch(/--cell:[^;]*\dvh/);
  });

  it('lays the world out nine across, as the original does', () => {
    // 45 levels a world, nine to a row, so five rows.
    const grid = block('.level-grid');
    expect(grid).toMatch(/grid-template-columns:\s*repeat\(9, minmax\(0, var\(--cell\)\)\)/);
  });

  /**
   * `minmax(0, ...)` on the tracks, and a cell that can be narrower than
   * `--cell`. Without both, a grid wider than its plate overflows and draws
   * over the button under it — which is what the browser run caught here
   * before the tracks could give way.
   */
  it('shrinks the cells rather than overflowing the plate', () => {
    const cell = block('.level-grid__cell');

    expect(cell).toMatch(/max-width:\s*var\(--cell\)/);
    expect(cell).toMatch(/aspect-ratio:\s*1/);
    expect(cell).not.toMatch(/height:\s*var\(--cell\)/);
    // And its parts measure the real cell, not the variable.
    expect(cell).toMatch(/container-type:\s*inline-size/);
    expect(block('.level-grid__number')).toMatch(/font-size:\s*\d+cqw/);
  });

  /*
   * ── PLAY LEVEL sits above the medals — T190 ─────────────────────────────
   *
   * T189 anchored it to the panel's floor with `margin-top: auto`, on a
   * misread request; T190 undid both halves. The order is the level's
   * identity, the action, then what is known about it.
   *
   * Pinned as a *relative* order rather than an index, so inserting another
   * row between them fails and adding one at the end does not — the contract
   * is "the button is above the medals", not "the button is child three".
   */
  it('puts PLAY LEVEL above the medals', () => {
    render(<LevelSelectScreen />);

    const panel = document.querySelector('.levels__detail')!;
    const children = [...panel.children];
    const play = children.findIndex((el) => el.classList.contains('levels__play'));
    const medals = children.findIndex((el) => el.classList.contains('levels__medal-row'));

    expect(play, 'no PLAY LEVEL button in the panel').toBeGreaterThan(-1);
    expect(medals, 'no medal row in the panel').toBeGreaterThan(-1);
    expect(play).toBeLessThan(medals);
  });

  it('no longer anchors PLAY LEVEL to the panel floor', () => {
    // The other half of T189, and it has to go too: left behind, the anchor
    // would push the button back down past the medals the moment the panel
    // had spare height, which is every viewport from 1366x768 up.
    expect(block('.gloss-pill.levels__play')).not.toMatch(/margin-top:\s*auto/);
  });

  it('spans the screen rather than capping and centring it', () => {
    // `A32`: a `max-width` here reads as black pillars on a 2K display.
    const levels = block('.levels');

    expect(levels).not.toMatch(/max-width:\s*\d+px/);
    expect(levels).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) var\(--pane\)/);
    /*
     * Both terms of the lever, and the `min()` that joins them. T188 added the
     * height cap after a per-panel clipping check — new to this harness, and
     * the third one to need it — found `.levels__detail` cutting its own
     * roster by 61-119px at the three shortest viewports, silently, because
     * the panel is `overflow: hidden` and the *body* never scrolled.
     *
     * Asserting only the `cqw` half would pass on exactly the version that
     * clipped.
     */
    expect(levels).toMatch(/--pane:\s*min\(clamp\([^;]*cqw[^;]*\),\s*\d+cqh\)/);
    // `cqh`, not `vh` — the `A32` finding: the bar and the nav take a far
    // larger fraction of a short window than a tall one.
    expect(levels).not.toMatch(/--pane:[^;]*vh/);
  });

  /**
   * Everything in the window is a fraction of `--pane`. A fixed `px` padding,
   * gap or type size stays put while the panel grows on a large display, and
   * the result is a big panel with cramped contents that nobody files as a bug.
   */
  it('leaves no fixed padding, gap or text size in the window', () => {
    const fixed: string[] = [];
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map((m) => ({ selector: m[1].trim(), body: m[2] }))
      .filter((r) => /^\.(levels__(detail|name|mode|label|objective|enemy|enemies)|difficulty)/.test(r.selector));

    expect(rules.length, 'the window`s rules were renamed').toBeGreaterThanOrEqual(6);
    for (const { selector, body } of rules) {
      for (const [, property, value] of body.matchAll(
        /(?:^|;)\s*(padding|gap|font-size)\s*:([^;]+)/g,
      )) {
        const scales =
          value.includes('var(--pane') || /(?:^|\s)0(?:\s|$)|em\b|%/.test(value.trim());
        if (!scales) fixed.push(`${selector} { ${property}:${value.trim()} }`);
      }
    }
    expect(fixed, 'these stay put while the window grows').toEqual([]);
  });

  /**
   * The two buttons that adopted the shared pill must override it with **two**
   * classes. Both rules are (0,1,0), so a single class leaves the winner to
   * source order — the failure this project has shipped five times.
   */
  it('overrides the shared pill by specificity, not by position', () => {
    expect(css).toContain('.gloss-pill.levels__play {');
    expect(css).toContain('.gloss-pill.levels__world-button {');
    expect(css).not.toMatch(/\n\.levels__play \{/);
    expect(css).not.toMatch(/\n\.levels__world-button \{/);

    // PLAY LEVEL is red, and it is the loudest thing on the screen.
    expect(block('.gloss-pill.levels__play')).toMatch(/background-image:\s*linear-gradient/);
  });

  it('gives each difficulty its own selected colour', () => {
    // Amber, silver and gold. Collapsing them onto one accent would lose which
    // tier is set at a glance, which is the whole job of the frame it replaced.
    for (const tier of ['easy', 'medium', 'hard']) {
      expect(css, tier).toContain(`.difficulty__button--${tier}.difficulty__button--on {`);
    }
  });
});

/**
 * ── The medals, the dev tool and the picker's exit — T172 ──────────────────
 */
describe('the medals on a tile', () => {
  const medalsOf = (level: number): string[] =>
    [
      ...document
        .querySelector(`[aria-label^="Level ${level},"] .level-grid__medals`)!
        .querySelectorAll('.level-grid__medal'),
      // `getAttribute`, not `className`: the medals are `<svg>` now, and
      // `SVGElement.className` is an `SVGAnimatedString` whose `toString` is
      // `[object SVGAnimatedString]` — every tier read as empty, uniformly,
      // which is the shape of a check that returns the same wrong answer for
      // every input.
      // The tier class is `medal--x`, not `level-grid__medal--x`: T188 gave
      // the detail panel a much larger copy of this row and the *colour* is
      // shared between the two sizes, so neither block owns it. Anchored on a
      // word boundary so a future `something__medal--x` cannot match here.
    ].map((n) => /(?:^|\s)medal--(\w+)/.exec(n.getAttribute('class') ?? '')?.[1] ?? '');

  /*
   * ── The panel draws the same row, bigger — T188 ─────────────────────────
   *
   * One component at two sizes. What is worth pinning is not that the panel
   * has icons, but that it shows **the selected level's** medals in **that
   * level's shape** and shares the tier colours with the tile — three separate
   * ways a second copy of this row would go wrong quietly.
   */
  const panelMedals = (): string[] =>
    [...document.querySelectorAll('.levels__medals .levels__medal')].map(
      (n) => /(?:^|\s)medal--(\w+)/.exec(n.getAttribute('class') ?? '')?.[1] ?? '',
    );

  it('shows the selected level`s medals in the detail panel', () => {
    render(<LevelSelectScreen />);
    // Level 2's fixture is gold/silver/bronze — the same three the tile shows,
    // which is the point: two renderings of one fact cannot disagree.
    act(() => {
      screen.getByRole('button', { name: /^Level 2,/ }).click();
    });
    expect(panelMedals()).toEqual(medalsOf(2));
    expect(panelMedals()).toEqual(['gold', 'silver', 'bronze']);
  });

  it('keeps three sockets even with nothing earned, so the panel cannot resize', () => {
    /*
     * A panel that grew a row as the selection moved would change height under
     * the pointer, and this screen's whole layout guarantee is that it never
     * scrolls. Level 3's fixture has `medals: []` — level 1's is three bronze,
     * which is why this picks the third.
     */
    render(<LevelSelectScreen />);
    act(() => {
      screen.getByRole('button', { name: /^Level 3,/ }).click();
    });
    // Three, from the same constant the component counts with.
    expect(panelMedals()).toHaveLength(3);
    expect(panelMedals().every((tier) => tier === '')).toBe(true);
  });

  it('draws the panel medal in the level`s own mode shape', () => {
    // `:874` builds the icon from the mode before `:898` sets its tier, so a
    // Boss level earns skulls. The panel must ask the same question the tile
    // does, not default to a star.
    render(<LevelSelectScreen />);
    const boss = screen.getAllByRole('button', { name: /^Level \d+,/ }).find((b) =>
      (b.getAttribute('aria-label') ?? '').includes('Boss'),
    );
    if (boss) {
      act(() => {
        boss.click();
      });
      const tileShape = boss.querySelector('.level-grid__medal')?.innerHTML;
      const panelShape = document.querySelector('.levels__medal')?.innerHTML;
      expect(panelShape).toBe(tileShape);
    }
  });

  /**
   * **Coloured per medal, not per level** — `:849-910`. Level 2's fixture is
   * gold/silver/bronze on purpose: a component that painted the whole row one
   * colour would pass any uniform fixture, and the AS3's rule is exactly that
   * the three can differ.
   */
  it('paints each medal with its own tier', () => {
    render(<LevelSelectScreen />);
    expect(medalsOf(2)).toEqual(['gold', 'silver', 'bronze']);
  });

  it('paints a single-tier row uniformly', () => {
    // The counterpart: mixed rows working does not prove uniform ones do.
    render(<LevelSelectScreen />);
    expect(medalsOf(1)).toEqual(['bronze', 'bronze', 'bronze']);
  });

  /**
   * Three glyphs always, so the tile does not change height between an earned
   * and an unearned level. The unearned ones carry no tier class.
   */
  it('keeps three slots when none are earned', () => {
    render(<LevelSelectScreen />);
    expect(medalsOf(3)).toEqual(['', '', '']);
  });

  /**
   * **The regression this replaced.** The tiles used to draw `value`, the count
   * at the *selected* difficulty, so a level taken 3-medal on Easy read as zero
   * while `HARD` was set. The fixture's difficulty is Medium and level 1's
   * `value` is 3 — so a component still reading `value` would coincidentally
   * pass the count assertions above. Changing the difficulty must not move the
   * medals at all.
   */
  it('ignores the selected difficulty', () => {
    useGameStore.setState({ difficulty: 'Hard' });
    render(<LevelSelectScreen />);
    expect(medalsOf(1)).toEqual(['bronze', 'bronze', 'bronze']);
  });
});

describe('what is no longer on the screen', () => {
  it('has no dev level jump', () => {
    // Removed outright in T172: it broke the layout on a dev server, taking the
    // whole body at short viewports and pushing SELECT WORLD off. Asserted as
    // an absence so it does not quietly return.
    const { container } = render(<LevelSelectScreen />);
    expect(container.querySelector('.dev-jump')).toBeNull();
    expect(screen.queryByText(/jump to any level/i)).toBeNull();
  });

  it('offers no way out of the world picker but the bottom bar', () => {
    // `ScreenLevelSelect` has `bWorldSelect` for going *up* from a grid and
    // nothing for leaving the world list. The port's extra Back was a second
    // exit beside the bar's Menu button.
    useGameStore.setState({ worldList: { selected: 0, worlds: [] } });
    render(<LevelSelectScreen />);

    expect(screen.queryByRole('button', { name: /back/i })).toBeNull();
  });
});

/**
 * ── The cursor tooltip and the world band — T174 ───────────────────────────
 *
 * The tooltip's *position* is written to `style.transform` by a ref and never
 * passes through React, so jsdom cannot see it move. What it can see is the
 * structure that makes the move safe — and one line of that structure,
 * `pointer-events: none`, is the whole difference between a tooltip and a
 * flicker loop, so it is asserted rather than trusted.
 *
 * The behaviour was driven in a browser: pointer parked on a tile for two
 * seconds gave 1 mouseover and 1 mouseout (a loop shows as dozens), the hit
 * test under the cursor returned the tile rather than the tooltip, and a tile
 * on the far side of the grid reported one distinct box throughout.
 */
describe('the cursor tooltip', () => {
  const css = readFileSync('src/styles/global.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

  it('is absent until the pointer is on an unlocked tile', () => {
    render(<LevelSelectScreen />);
    expect(document.querySelector('.cursor-tip')).toBeNull();
  });

  it('appears on hover and names the level', () => {
    render(<LevelSelectScreen />);

    act(() => {
      fireEvent.mouseEnter(screen.getByRole('button', { name: /Level 2, Normal/ }));
    });

    const tip = document.querySelector('.cursor-tip');
    expect(tip).not.toBeNull();
    expect(tip).toHaveTextContent('Level 1-2');
    expect(tip).toHaveTextContent(/Normal mode/i);
  });

  it('goes away again on leave', () => {
    render(<LevelSelectScreen />);
    const tile = screen.getByRole('button', { name: /Level 2, Normal/ });

    act(() => {
      fireEvent.mouseEnter(tile);
    });
    act(() => {
      fireEvent.mouseLeave(tile);
    });

    expect(document.querySelector('.cursor-tip')).toBeNull();
  });

  /**
   * **The flicker loop, as a rule.**
   *
   * The card is drawn a few pixels from the cursor. Without this the pointer
   * lands on the tooltip rather than the tile, the tile's `mouseleave` fires,
   * the tooltip unmounts, the pointer is over the tile again — a loop as fast
   * as the browser can dispatch, which reads as violent twitching.
   */
  /**
   * The roster, as pictures — `addEnemyImages` (`:1112-1160`). A name alone
   * told you nothing recognisable mid-hover, which is what this replaced.
   */
  it('shows the level`s enemies with their art', () => {
    render(<LevelSelectScreen />);

    act(() => {
      fireEvent.mouseEnter(screen.getByRole('button', { name: /Level 2, Normal/ }));
    });

    const tip = document.querySelector('.cursor-tip')!;
    expect(tip.querySelectorAll('.cursor-tip__enemy').length).toBeGreaterThan(0);
    // The picture, not just the row — an empty card would pass the line above.
    expect(tip.querySelectorAll('.enemy-tile__layer').length).toBeGreaterThan(0);
  });

  it('gives each enemy its share and its tier', () => {
    render(<LevelSelectScreen />);

    act(() => {
      fireEvent.mouseEnter(screen.getByRole('button', { name: /Level 2, Normal/ }));
    });

    const card = document.querySelector('.cursor-tip__enemy')!;
    expect(card.querySelector('.cursor-tip__amount')?.textContent).toBeTruthy();
    expect(card.querySelector('.cursor-tip__tier')?.textContent).toBeTruthy();
  });

  /**
   * **The corner flash, as a rule.**
   *
   * The card mounts before any `mousemove` reaches it, so a plain `useEffect`
   * — which runs *after* paint — left one painted frame at (0, 0). The fix is
   * two-part and both halves are asserted: a layout effect places it before
   * that paint, and it stays `visibility: hidden` until placed, for the case a
   * layout effect cannot cover (a hover with no pointer position on record).
   *
   * Driven in a browser across 76 sampled frames: zero visible at the origin,
   * and the first visible frame already carried a real `translate3d`.
   */
  it('stays hidden until it has been placed', () => {
    expect(css).toMatch(/\.cursor-tip \{[^}]*visibility:\s*hidden/);
    expect(css).toMatch(/\.cursor-tip--placed \{[^}]*visibility:\s*visible/);

    const source = readFileSync('src/ui/CursorTooltip.tsx', 'utf8');
    // Before paint, not after — this is the half that stops the flash in the
    // ordinary case, and `useEffect` here is the bug.
    expect(source).toContain('useLayoutEffect');
    expect(source).not.toMatch(/[^a-zA-Z]useEffect\(/);
    expect(source).toContain("classList.add('cursor-tip--placed')");
  });

  /**
   * `visibility`, not `display`. The component measures its own box to decide
   * which side of the cursor to sit on, and a `display: none` box has no
   * dimensions to measure — it would flip on every first hover.
   */
  it('hides in a way that still has a measurable box', () => {
    const tip = /\.cursor-tip \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(tip).not.toMatch(/display:\s*none/);
  });

  it('cannot take the hit test from the tile beneath it', () => {
    expect(css).toMatch(/\.cursor-tip \{[^}]*pointer-events:\s*none/);
  });

  /**
   * Out of flow, or every hover reflows the grid it sits in. It is portalled to
   * `<body>` for a second reason the stylesheet cannot show: the shell's body
   * sets `container-type: size`, which implies `contain: layout` and makes it
   * the containing block for fixed descendants — as well as clipping them.
   */
  it('is fixed, layered and portalled out of the grid', () => {
    expect(css).toMatch(/\.cursor-tip \{[^}]*position:\s*fixed/);
    expect(css).toMatch(/\.cursor-tip \{[^}]*z-index:\s*\d+/);
    expect(readFileSync('src/ui/CursorTooltip.tsx', 'utf8')).toContain('document.body');
  });

  /**
   * The counterpart to "it moves by transform": it must not also be positioned
   * by `left`/`top`, which would re-layout on every pointer event and undo the
   * whole point.
   */
  it('moves by transform alone', () => {
    const tip = /\.cursor-tip \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(tip).toMatch(/top:\s*0/);
    expect(tip).toMatch(/left:\s*0/);

    const source = readFileSync('src/ui/CursorTooltip.tsx', 'utf8');
    expect(source).toContain('style.transform');
    expect(source).not.toMatch(/style\.(left|top)\s*=/);
  });
});

describe('the world band', () => {
  it('names the world by number, as `:1184` does', () => {
    render(<LevelSelectScreen />);
    expect(screen.getByRole('heading', { name: 'World 1' })).toBeInTheDocument();
    // The theme name stays beside it — the port's addition, not the AS3's.
    expect(document.querySelector('.levels__world-theme')).toHaveTextContent('Desert');
  });

  it('paints the world`s own texture behind it', () => {
    const { container } = render(<LevelSelectScreen />);
    const band = container.querySelector<HTMLElement>('.levels__world');

    // `bgFadeText` frame `1 + world`, so world 1 is the second frame. Just that
    // a texture is painted: the resolved URL is a hashed asset path.
    expect(band?.style.backgroundImage).toContain('url(');
  });
});

describe('the tile hover', () => {
  const css = readFileSync('src/styles/global.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const hover = /\.level-grid__cell:hover:not\(:disabled\) \{([^}]*)\}/.exec(css)?.[1] ?? '';

  /**
   * Hover must not move the tile. It lifted it a pixel, which across a grid
   * the pointer crosses several times a second reads as a twitch — and the
   * transition animated that on 45 elements.
   */
  it('changes light, not position', () => {
    expect(hover).not.toBe('');
    expect(hover).not.toMatch(/transform:/);
    expect(hover).toMatch(/filter:\s*brightness/);
  });

  /**
   * **SELECT WORLD does not lift either**, matching the tiles above it.
   *
   * `.gloss-pill` raises its consumers a pixel on hover, which is right for the
   * menu's PLAY and wrong for the one button under a grid that deliberately
   * does not move.
   *
   * Measured in a browser: rest 1279.61, hover 1279.61, held 1280.62 — no
   * lift, and the press still dips.
   */
  it('does not lift SELECT WORLD on hover', () => {
    expect(css).toMatch(
      // Anchored on the last selector in the group, so the assertion does not
      // depend on how the pair is wrapped across lines.
      /\.gloss-pill\.levels__world-button:focus-visible \{[^}]*transform:\s*none/,
    );
  });

  /**
   * The press must survive the override. `.gloss-pill:active` is (0,2,0) and
   * the hover override is (0,3,0), so without an equally specific `:active`
   * rule the override would keep winning while the button was held — killing
   * the dip on the one interaction that should have it.
   */
  it('keeps the press dip at matching specificity', () => {
    expect(css).toMatch(
      /\.gloss-pill\.levels__world-button:active \{[^}]*transform:\s*translateY/,
    );
  });

  /**
   * And the override is **scoped**: the shared recipe still lifts, so the
   * menu's PLAY button is untouched. Deleting the lift from `.gloss-pill`
   * itself would have been the easy fix and the wrong one.
   */
  it('leaves the shared pill`s lift alone', () => {
    expect(css).toMatch(/\.gloss-pill:hover,[^{]*\{[^}]*transform:\s*translateY\(-1px\)/);
  });

  it('keeps a border on the resting tile, so a hover colour cannot resize it', () => {
    // A border added only on hover shifts every tile after it in the grid.
    const base = /\n\.level-grid__cell \{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(base).toMatch(/border:\s*1px solid/);
    expect(hover).toMatch(/border-color:/);
    expect(hover).not.toMatch(/border-width:|border:\s*\d/);
  });
});

/**
 * ── The world picker — T177 ────────────────────────────────────────────────
 *
 * Layout measured in a browser across six viewports from 1024x480 to
 * 3840x2160: nine cards, `scrollHeight === clientHeight`, no horizontal
 * overflow, zero card/card and card/header intersections, and zero difficulty
 * pickers. Cards run 333x90 to 1259x601. Numbers in the commit.
 */
describe('the world picker', () => {
  const WORLDS = [
    {
      world: 1,
      name: 'Desert',
      unlocked: true,
      frontier: 3,
      totalLevels: 45,
      levelsCompleted: 2,
      bronze: 6,
      silver: 0,
      gold: 0,
    },
    {
      world: 2,
      name: 'Forest',
      unlocked: false,
      frontier: 1,
      totalLevels: 45,
      levelsCompleted: 0,
      bronze: 0,
      silver: 0,
      gold: 0,
    },
  ];

  beforeEach(() => {
    useGameStore.setState({ worldList: { selected: 0, worlds: WORLDS } });
  });

  /**
   * **The request, and the reason it is right.** The tiles show all three
   * medal tiers at once, so no difficulty is read or displayed on this view —
   * a picker here offered a choice that changed nothing on screen.
   */
  it('shows no difficulty buttons', () => {
    const { container } = render(<LevelSelectScreen />);

    expect(container.querySelector('.difficulty')).toBeNull();
    for (const name of ['Easy', 'Medium', 'Hard']) {
      expect(screen.queryByRole('button', { name }), name).toBeNull();
    }
  });

  it('still offers them on the grid, where they mean something', () => {
    // The counterpart: hiding them everywhere would also pass the test above.
    useGameStore.setState({ worldList: { selected: 1, worlds: WORLDS } });
    render(<LevelSelectScreen />);

    expect(screen.getAllByRole('button', { name: 'Hard' }).length).toBeGreaterThan(0);
  });

  it('lists every world, locked and open', () => {
    render(<LevelSelectScreen />);

    expect(screen.getByRole('button', { name: /World 1, Desert/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /World 2, locked/ })).toBeInTheDocument();
  });

  /**
   * `:1541` puts the number top-left and `:1570` the `Level N/45` line
   * top-right, both over the world's own terrain.
   */
  it('gives an open world its number, progress and texture', () => {
    const { container } = render(<LevelSelectScreen />);
    const card = container.querySelector('.world-grid__cell:not([disabled])')!;

    expect(card.querySelector('.world-grid__number')).toHaveTextContent('1');
    expect(card.querySelector('.world-grid__progress')).toHaveTextContent('Level 3/45');
    expect(
      card.querySelector<HTMLElement>('.world-grid__scene')?.style.backgroundImage,
    ).toContain('url(');
  });

  /**
   * `:1571-1573` — three tallies, each `earned/total` against 45 levels x 3
   * medals. All three tiers at once is the whole point: it is what makes a
   * difficulty selector redundant here.
   */
  it('tallies all three tiers against the world total', () => {
    const { container } = render(<LevelSelectScreen />);
    const card = container.querySelector('.world-grid__cell:not([disabled])')!;
    const counts = [...card.querySelectorAll('.world-tally__count')].map((n) => n.textContent);

    expect(counts).toEqual(['0/135', '0/135', '6/135']);
    expect(card.querySelector('.world-tally--gold')).not.toBeNull();
    expect(card.querySelector('.world-tally--silver')).not.toBeNull();
    expect(card.querySelector('.world-tally--bronze')).not.toBeNull();
  });

  /**
   * `:1521-1524` blanks the number, the progress line and every tally on a
   * locked world. Asserted as absence, because "shows a padlock" is also true
   * of a card that leaked its contents behind one.
   */
  it('blanks a locked world entirely', () => {
    const { container } = render(<LevelSelectScreen />);
    const locked = container.querySelector('.world-grid__cell--locked')!;

    expect(locked.querySelector('.world-grid__number')).toBeNull();
    expect(locked.querySelector('.world-grid__progress')).toBeNull();
    expect(locked.querySelector('.world-tally')).toBeNull();
    expect(locked.querySelector('.world-grid__lock')).not.toBeNull();
  });

  it('opens a world on click, and a locked one not at all', () => {
    const picked: unknown[] = [];
    GameEvents.subscribe('ui:select-world', (p) => picked.push(p));

    render(<LevelSelectScreen />);
    act(() => {
      screen.getByRole('button', { name: /World 1, Desert/ }).click();
    });
    act(() => {
      screen.getByRole('button', { name: /World 2, locked/ }).click();
    });

    expect(picked).toEqual([{ world: 1 }]);
  });
});

describe('the world grid`s layout rules', () => {
  const css = readFileSync('src/styles/global.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const block = (selector: string): string => {
    const literal = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = new RegExp(`${literal}\\s*\\{([^}]*)\\}`).exec(css);
    expect(found, `${selector} is missing`).not.toBeNull();
    return found![1];
  };

  /**
   * Nine worlds in a fixed 3x3 that shares out the plate, so the grid fills it
   * exactly and can never need a scrollbar. `:1510` steps `xPos` by 135 and
   * wraps every third button.
   */
  it('is three across and shares the height between three rows', () => {
    const grid = block('.world-grid');
    expect(grid).toMatch(/grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
    expect(grid).toMatch(/grid-template-rows:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  });

  it('measures the plate, not the window', () => {
    // Same rule as the level grid: the bar and nav take a far larger share of a
    // short viewport, so a `vh` measurement overshoots there.
    expect(block('.levels--picker')).toMatch(/container-type:\s*size/);
    expect(block('.world-grid__cell')).toMatch(/container-type:\s*inline-size/);
  });

  /**
   * The card's parts are shares of the card, and every one is capped. At 3840
   * a card measures 1259px across, where a bare `15cqw` numeral is 189px.
   */
  it('caps the type so a huge card does not give a huge numeral', () => {
    expect(block('.world-grid__number')).toMatch(/font-size:\s*clamp\([^;]*cqw[^;]*\)/);
    expect(block('.world-tally')).toMatch(/font-size:\s*clamp\([^;]*cqw[^;]*\)/);
  });

  it('does not lift a card on hover', () => {
    // Consistent with the level tiles and SELECT WORLD — nothing on this screen
    // moves under the pointer.
    const hover = block('.world-grid__cell:hover:not(:disabled)');
    expect(hover).not.toMatch(/transform:/);
    expect(hover).toMatch(/filter:\s*brightness/);
  });
});
