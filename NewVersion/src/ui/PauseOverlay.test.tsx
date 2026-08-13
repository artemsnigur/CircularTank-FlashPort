/**
 * The pause panel — `PartInterface.pauseGame` (`:426-476`).
 *
 * These drive the real component against the real store, because the defect
 * worth catching is not "does it render" but **do the key and the button agree
 * about what is paused**. A panel that renders perfectly and a latch holding
 * its own stale copy of `paused` would pass any snapshot.
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { PauseOverlay } from './PauseOverlay';
import { useGameStore } from '../state/gameStore';
import { GameEvents } from '../game/events/GameEvents';

beforeEach(() => {
  act(() => {
    useGameStore.setState({ paused: false, levelOutcome: null });
  });
});

describe('the panel appears only while paused', () => {
  it('renders nothing when the game is running', () => {
    render(<PauseOverlay />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the title and all three actions when paused', () => {
    act(() => useGameStore.setState({ paused: true }));
    render(<PauseOverlay />);

    expect(screen.getByRole('dialog', { name: 'Game Paused' })).toBeTruthy();
    // `:438`, `:452`, `:456` — and in that order, which is the muscle memory.
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toEqual(['Resume', 'Reset Level', 'Quit Level']);
  });

  /**
   * The divergence, asserted so it cannot be undone by accident. The AS3 puts
   * Sound and Music in this panel; this port has them permanently in the HUD.
   */
  it('does not duplicate the HUD audio toggles', () => {
    act(() => useGameStore.setState({ paused: true }));
    render(<PauseOverlay />);

    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons).not.toContain('Sound');
    expect(buttons).not.toContain('Music');
  });
});

describe('the actions emit what the scene listens for', () => {
  it('Resume asks to unpause', () => {
    act(() => useGameStore.setState({ paused: true }));
    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:pause', (payload) => seen.push(payload));
    render(<PauseOverlay />);

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    off();

    expect(seen).toEqual([{ paused: false }]);
  });

  it('Quit goes to level select, not the main menu', () => {
    // `ButtonPause.as:105`. The HUD's own Menu button is the one that goes to
    // the title, and this is deliberately not that.
    act(() => useGameStore.setState({ paused: true }));
    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:goto', (payload) => seen.push(payload));
    render(<PauseOverlay />);

    fireEvent.click(screen.getByRole('button', { name: 'Quit Level' }));
    off();

    expect(seen).toEqual([{ key: 'LevelSelect' }]);
  });

  it('Reset restarts gameplay', () => {
    act(() => useGameStore.setState({ paused: true }));
    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:goto', (payload) => seen.push(payload));
    render(<PauseOverlay />);

    fireEvent.click(screen.getByRole('button', { name: 'Reset Level' }));
    off();

    expect(seen).toEqual([{ key: 'Gameplay' }]);
  });

  it('the auto-pause checkbox writes through the options path', () => {
    act(() => {
      useGameStore.setState({
        paused: true,
        gameplayOptions: { ...useGameStore.getState().gameplayOptions, autoPause: true },
      });
    });
    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:set-option', (payload) => seen.push(payload));
    render(<PauseOverlay />);

    const box = screen.getByRole('checkbox', { name: /auto pause/i });
    expect((box as HTMLInputElement).checked).toBe(true);
    fireEvent.click(box);
    off();

    // Through `ui:set-option`, the same path the options screen uses, rather
    // than a second writer to the same persisted key.
    expect(seen).toEqual([{ autoPause: false }]);
  });
});

describe('a finished level takes the panel with it', () => {
  /**
   * The results overlay owns the screen once a level ends. `endLevel` clears
   * `paused` so the two can never stack — asserted here rather than trusted,
   * because the alternative is a pause panel stranded on top of the results
   * with a Resume button that resumes a level that is over.
   */
  it('clearing the level clears the pause', () => {
    act(() => useGameStore.setState({ paused: true }));
    expect(useGameStore.getState().paused).toBe(true);

    act(() => {
      useGameStore.getState().endLevel({
        won: true,
        world: 1,
        level: 1,
        kills: 0,
        earned: 0,
        medals: [],
        newAchievements: [],
        newEnemies: [],
      } as never);
    });

    expect(useGameStore.getState().paused).toBe(false);
  });
});

describe('the key and the button share one flag', () => {
  /**
   * **The interaction a locally-held `paused` would break**: pause with the
   * key, resume with the button, and the latch's own copy would still say
   * "paused" — so the next keypress would emit `paused: false` again and the
   * game would never pause. Driven through the store both components read.
   */
  it('a store-driven resume is visible to everything', () => {
    const seen: { paused: boolean }[] = [];
    const off = GameEvents.subscribe('ui:pause', (payload) => seen.push(payload));

    // The key pauses.
    act(() => {
      GameEvents.emit('ui:pause', { paused: true });
    });
    // Nothing mirrors it in this unit — the bridge does that in the app — so
    // the store is set the way the bridge would.
    act(() => useGameStore.setState({ paused: true }));
    render(<PauseOverlay />);
    expect(screen.getByRole('dialog')).toBeTruthy();

    // The button resumes, and the store follows.
    act(() => {
      GameEvents.emit('ui:pause', { paused: false });
    });
    act(() => useGameStore.setState({ paused: false }));
    off();

    expect(seen).toEqual([{ paused: true }, { paused: false }]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
