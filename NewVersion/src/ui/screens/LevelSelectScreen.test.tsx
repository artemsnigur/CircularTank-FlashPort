/**
 * Level select's two columns — T157.
 *
 * ── What this is really guarding ──────────────────────────────────────────
 * The original **selects** a level and then needs `ButtonPlayLevel` to start
 * it. This port starts one on click (`A8`), and T157 added a detail column
 * with a `PLAY LEVEL` button in it — which is exactly the shape a revert of
 * `A8` would take. So the first test here is that a tile still launches
 * directly, and the rest describe the panel as an *addition* beside it.
 */
import { readFileSync } from 'node:fs';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LevelSelectScreen } from './LevelSelectScreen';
import { GameEvents } from '../../game/events/GameEvents';
import { useGameStore } from '../../state/gameStore';

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
const LISTING = {
  world: 1,
  worldName: 'Desert',
  levels: [
    { level: 1, mode: 'Normal', cleared: true, unlocked: true, value: 3 },
    { level: 2, mode: 'Normal', cleared: true, unlocked: true, value: 2 },
    { level: 3, mode: 'Flag', cleared: false, unlocked: true, value: 0 },
    { level: 4, mode: 'Normal', cleared: false, unlocked: false, value: 0 },
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

describe('the grid still starts a level on click — divergence A8', () => {
  it('launches directly from a tile, with no select step', () => {
    const started: unknown[] = [];
    GameEvents.subscribe('ui:start-game', (payload) => started.push(payload));

    render(<LevelSelectScreen />);
    screen.getByRole('button', { name: /Level 2, Normal/ }).click();

    expect(started).toEqual([{ world: 1, level: 2, difficulty: 'Medium' }]);
  });

  it('leaves a locked tile inert', () => {
    const started: unknown[] = [];
    GameEvents.subscribe('ui:start-game', (payload) => started.push(payload));

    render(<LevelSelectScreen />);
    screen.getByRole('button', { name: /Level 4, locked/ }).click();

    expect(started).toEqual([]);
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

  it('follows the pointer to another level', () => {
    render(<LevelSelectScreen />);
    const panel = screen.getByRole('complementary', { name: 'Level detail' });

    act(() => {
      screen.getByRole('button', { name: /Level 2, Normal/ }).focus();
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

  it('spans the screen rather than capping and centring it', () => {
    // `A32`: a `max-width` here reads as black pillars on a 2K display.
    const levels = block('.levels');

    expect(levels).not.toMatch(/max-width:\s*\d+px/);
    expect(levels).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) var\(--pane\)/);
    expect(levels).toMatch(/--pane:\s*clamp\(/);
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
