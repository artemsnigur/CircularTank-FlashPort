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
    expect(container.querySelector('.menu-logo')).not.toBeNull();
    expect(container.querySelector('.menu-card')).not.toBeNull();
    expect(container.querySelector('.menu-toggles')).not.toBeNull();
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
