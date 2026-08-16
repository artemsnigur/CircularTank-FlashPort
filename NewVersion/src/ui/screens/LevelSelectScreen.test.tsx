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
    expect(panel).toHaveTextContent('Level 1-3');
    expect(panel).toHaveTextContent(/Flag mode/i);
  });

  it('follows the pointer to another level', () => {
    render(<LevelSelectScreen />);
    const panel = screen.getByRole('complementary', { name: 'Level detail' });

    act(() => {
      screen.getByRole('button', { name: /Level 2, Normal/ }).focus();
    });

    expect(panel).toHaveTextContent('Level 1-2');
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

  it('draws the selected one at frame 3 and the others at 1', () => {
    // `ButtonGameDifficulty:73` against `:87`. Both, because a picker stuck on
    // one frame passes either assertion alone.
    render(<LevelSelectScreen />);

    const medium = screen.getAllByRole('button', { name: 'Medium' })[0];
    const easy = screen.getAllByRole('button', { name: 'Easy' })[0];

    expect(medium.querySelector('.chrome-art')?.getAttribute('data-frame')).toBe('3');
    expect(easy.querySelector('.chrome-art')?.getAttribute('data-frame')).toBe('1');
  });
});
