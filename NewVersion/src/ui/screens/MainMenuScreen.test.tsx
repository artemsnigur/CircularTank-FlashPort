/**
 * The main menu — T160, and the bug that shipped with it.
 *
 * ── What these can and cannot see ─────────────────────────────────────────
 * The failure was **layout**: the scene art kept `position: relative` from
 * `.chrome-art` and an inline `aspect-ratio` from the component, stayed in
 * flow at full body height, and pushed every control past the bottom of a
 * body with `overflow: hidden`. jsdom computes no layout, so **no test here
 * could have caught that** — it was found by measuring boxes in a real
 * browser, and the fix was verified the same way.
 *
 * What is checkable is the *structure* the fix depends on: the art is wrapped,
 * so the positioning lives on an element this screen owns rather than in a
 * specificity contest with `.chrome-art`. That is a real invariant — break it
 * and the layout breaks again — and it is the half of the bug that a static
 * check can hold.
 */
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { MainMenuScreen } from './MainMenuScreen';
import { GameEvents } from '../../game/events/GameEvents';
import { useGameStore } from '../../state/gameStore';

const initial = useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initial, true);
  useGameStore.setState({ activeScene: 'MainMenu', phase: 'ready', slotPickerOpen: false });
});

afterEach(() => {
  GameEvents.removeAllListeners();
});

describe('the scene art is wrapped, not styled directly', () => {
  /**
   * The invariant the fix rests on.
   *
   * `ChromeArt` always carries `.chrome-art` — which sets `position: relative`
   * and is declared after every screen's rules — and an inline `aspect-ratio`
   * that no stylesheet can override. So a screen that needs a clip to fill an
   * absolutely-positioned box must put the positioning on a wrapper. Asserting
   * the two are different elements is what stops the next edit collapsing them.
   */
  it('puts .menu-scene on a wrapper rather than on the art itself', () => {
    const { container } = render(<MainMenuScreen />);

    const scene = container.querySelector('.menu-scene');
    expect(scene, '.menu-scene should exist').not.toBeNull();
    expect(
      scene?.classList.contains('chrome-art'),
      '.menu-scene must not be the ChromeArt element — see the header',
    ).toBe(false);

    // And the art is inside it, so the wrapper actually wraps something.
    expect(scene?.querySelector('.chrome-art')).not.toBeNull();
  });

  it('draws the cover picture', () => {
    const { container } = render(<MainMenuScreen />);
    expect(container.querySelector('[data-clip="BackgroundMainMenu"]')).not.toBeNull();
  });
});

describe('the menu still offers its controls', () => {
  /**
   * The regression in plain terms: the report was "I only see the background
   * picture". These do not prove anything is *visible* — jsdom has no layout —
   * but they do prove the controls are rendered, which separates "the CSS
   * hid them" from "the component stopped emitting them". Those two were the
   * competing hypotheses, and it was the first.
   */
  it('renders Play, the saves panel and the audio toggles', () => {
    render(<MainMenuScreen />);

    expect(screen.getByRole('button', { name: /play|continue/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save slots' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Audio' })).toBeInTheDocument();
  });

  it('keeps every destination reachable', () => {
    render(<MainMenuScreen />);

    for (const name of ['Level Select', 'Upgrades', 'Bestiary', 'Options', 'Achievements']) {
      expect(screen.getByRole('button', { name }), name).toBeInTheDocument();
    }
  });

  it('starts a game from Play', () => {
    const started: unknown[] = [];
    GameEvents.subscribe('ui:start-game', (payload) => started.push(payload));

    render(<MainMenuScreen />);
    screen.getByRole('button', { name: /play|continue/i }).click();

    expect(started).toHaveLength(1);
  });
});
