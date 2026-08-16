/**
 * The main menu's fixed stage — T163.
 *
 * ── What these can and cannot see ─────────────────────────────────────────
 * jsdom computes no layout, so nothing here proves the composition *looks*
 * right. That was done by screenshotting the running page and comparing it
 * with the reference capture, over several rounds; the numbers and what each
 * round corrected are in the commit.
 *
 * What is checkable is the structure the composition rests on: the stage
 * exists, the picture is painted on the block rather than stretched behind
 * everything, both save columns are present, and the slots come from real save
 * data rather than from a hard-coded row.
 */
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

describe('the stage', () => {
  it('is one fixed box holding the band, the picture and the saves', () => {
    const { container } = render(<MainMenuScreen />);

    expect(container.querySelector('.stage')).not.toBeNull();
    expect(container.querySelector('.stage__band')).not.toBeNull();
    expect(container.querySelector('.stage__scene')).not.toBeNull();
    expect(container.querySelector('.stage__saves')).not.toBeNull();
  });

  it('names the wordmark, whose letters are paths', () => {
    render(<MainMenuScreen />);
    expect(screen.getByRole('img', { name: 'Circular Tank' })).toBeInTheDocument();
  });

  /**
   * The picture is a **background image on the block**, not a `<ChromeArt>`.
   *
   * That is not a style preference: the exported SVGs carry no `viewBox` and
   * their drawing fills only part of the canvas, so an `<img>` could not be
   * made to fill the block by any sizing. Asserting the block carries a
   * background keeps a future edit from "tidying" it back into a ChromeArt and
   * silently reintroducing the banding.
   */
  it('paints the illustration onto the scene block', () => {
    const { container } = render(<MainMenuScreen />);
    const scene = container.querySelector<HTMLElement>('.stage__scene');

    // Just that a picture is painted: the resolved URL is a hashed asset
    // path, so matching its extension would assert on Vite's output naming.
    expect(scene?.style.backgroundImage).toContain('url(');
    // Narrowly: no ChromeArt *of the scene clip*. The toggles are ChromeArt
    // and live inside this block quite legitimately.
    expect(scene?.querySelector('[data-clip="BackgroundMainMenu"]')).toBeNull();
  });
});

describe('the save columns', () => {
  it('shows both, as the original does', () => {
    render(<MainMenuScreen />);
    expect(screen.getByRole('heading', { name: 'Online saves' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Local saves' })).toBeInTheDocument();
  });

  it('lists the real slots, filled and empty', () => {
    render(<MainMenuScreen />);

    // A filled slot names itself and its progress; the empty ones read as new
    // games. Both in one assertion, because a column that rendered only one
    // kind would pass either alone.
    expect(screen.getByRole('button', { name: /Load slot 1/ })).toBeInTheDocument();
    expect(screen.getByText('World 1 - 3')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /New game in slot/ })).toHaveLength(2);
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

  it('loads a slot when one is chosen', () => {
    const chosen: unknown[] = [];
    GameEvents.subscribe('ui:select-slot', (payload) => chosen.push(payload));

    render(<MainMenuScreen />);
    screen.getByRole('button', { name: /Load slot 1/ }).click();

    expect(chosen).toEqual([{ slot: 1 }]);
  });
});

describe('the audio toggles', () => {
  it('are on the stage, over the picture', () => {
    const { container } = render(<MainMenuScreen />);
    const toggles = container.querySelector('.stage__toggles');

    expect(toggles).not.toBeNull();
    expect(toggles?.querySelector('[role="group"]')).not.toBeNull();
  });
});

describe('the secondary navigation is gone', () => {
  /**
   * The original's menu has no destination buttons at all — PLAY is the only
   * way in, and the in-game bottom bar reaches every other screen. The port
   * carried a cluster of them and it is deliberately removed, so this asserts
   * their absence rather than leaving it to be re-added as an improvement.
   *
   * The dev affordances are exempt: they are behind `import.meta.env.DEV` and
   * never ship.
   */
  it('offers no Level Select, Upgrades or Bestiary button', () => {
    render(<MainMenuScreen />);

    for (const name of ['Level Select', 'Upgrades', 'Bestiary', 'Achievements']) {
      expect(screen.queryByRole('button', { name }), name).toBeNull();
    }
  });
});
