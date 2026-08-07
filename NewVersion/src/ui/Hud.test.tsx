/**
 * The end-to-end proof for the event bridge, as an assertion rather than a
 * claim: a Phaser scene emits `currency:earned`, and the React counter shows
 * the new value — no polling, no shared mutable object.
 */
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Hud } from './Hud';
import { GameEvents } from '../game/events/GameEvents';
import { attachStoreBridge, detachStoreBridge } from '../state/bridge';
import { useGameStore } from '../state/gameStore';

const initial = useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initial, true);
  attachStoreBridge();
});

afterEach(() => {
  detachStoreBridge();
  GameEvents.removeAllListeners();
});

/** Puts the store in the state the HUD renders in. */
function enterGameplay(): void {
  act(() => {
    GameEvents.emit('scene:ready', { key: 'Gameplay' });
  });
}

describe('Hud', () => {
  it('shows the currency counter updating from a Phaser event', () => {
    enterGameplay();
    render(<Hud />);

    expect(screen.getByText('0')).toBeInTheDocument();

    act(() => {
      GameEvents.emit('currency:earned', { amount: 5, total: 5 });
    });
    expect(screen.getByText('5')).toBeInTheDocument();

    act(() => {
      GameEvents.emit('currency:earned', { amount: 5, total: 10 });
    });
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('opens on the saved balance rather than zero', () => {
    // Regression: GameplayScene.create emitted a hardcoded `total: 0`, which
    // overwrote the real opening balance until the first coin corrected it —
    // indistinguishable from the save having failed to load.
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('currency:earned', { amount: 0, total: 500 });
    });
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('drops back to the banked balance when a level is abandoned', () => {
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('currency:earned', { amount: 0, total: 200 });
      GameEvents.emit('currency:earned', { amount: 90, total: 290 });
    });
    expect(screen.getByText('290')).toBeInTheDocument();

    // Shutdown without finishing restores the figure actually held.
    act(() => {
      GameEvents.emit('currency:earned', { amount: 0, total: 200 });
    });
    expect(screen.getByText('200')).toBeInTheDocument();
  });

  it('renders health as an accessible progress bar', () => {
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('player:damaged', { amount: 25, health: 75, maxHealth: 100 });
    });

    const bar = screen.getByRole('progressbar', { name: /tank health/i });
    expect(bar).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByText('75/100')).toBeInTheDocument();
  });

  it('shows the wave counter and remaining enemies', () => {
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('wave:changed', {
        wave: 3,
        enemiesRemaining: 7,
        mode: 'Normal',
        flagsRemaining: 0,
      });
    });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7 left')).toBeInTheDocument();
  });

  it('shows both reload bars once a secondary is equipped, and one before', () => {
    // The secondary bar is conditional on *having a secondary* — the only
    // conditional part of the readout. Pinned as a pair so "always two" and
    // "always one" both fail.
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 1,
        secondary: 1,
        weapon: 'Cannon',
        secondaryName: null,
      });
    });
    rerender(<Hud />);
    expect(screen.getAllByRole('progressbar', { name: /reload/i })).toHaveLength(1);
    expect(screen.getByText('Cannon')).toBeInTheDocument();

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 1,
        secondary: 0.5,
        weapon: 'Cannon',
        secondaryName: 'Mine',
      });
    });
    rerender(<Hud />);
    expect(screen.getAllByRole('progressbar', { name: /reload/i })).toHaveLength(2);
    expect(screen.getByText('Mine')).toBeInTheDocument();
  });

  it('renders the fill it is given, at both ends and in between', () => {
    // A bar that ignored its input would still mount and still show the weapon
    // name, so the readout being present proves nothing on its own.
    enterGameplay();
    const { rerender } = render(<Hud />);

    for (const [fill, expected] of [[0, '0'], [0.5, '50'], [1, '100']] as const) {
      act(() => {
        GameEvents.emit('reload:changed', {
          primary: fill,
          secondary: 1,
          weapon: 'Cannon',
          secondaryName: null,
        });
      });
      rerender(<Hud />);
      expect(
        screen.getByRole('progressbar', { name: /Cannon reload/i }),
      ).toHaveAttribute('aria-valuenow', expected);
    }
  });

  it('keeps the weapon name visible across a weapon switch, at an empty bar', () => {
    // Regression, and the reason the old `capacity <= 0` guard is gone.
    // `cycleWeapon` pays the incoming weapon a full reload, so the bar is
    // **empty** on the frame after a switch — exactly the state that used to
    // unmount the whole readout and take the weapon name with it.
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 1,
        secondary: 1,
        weapon: 'Cannon',
        secondaryName: null,
      });
    });
    rerender(<Hud />);
    expect(screen.getByText('Cannon')).toBeInTheDocument();

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 0,
        secondary: 1,
        weapon: 'MiniGun',
        secondaryName: null,
      });
    });
    rerender(<Hud />);

    expect(screen.getByText('MiniGun')).toBeInTheDocument();
    expect(screen.queryByText('Cannon')).not.toBeInTheDocument();
  });

  // Deleted in T78: `it('hides the readout entirely when capacity drops to zero')`.
  //
  // **The audit predicted this deletion.** Under *"Two tests pin defects as
  // specification"* it recorded that the test pinned the `capacity <= 0` guard
  // — a guard whose reach was the whole component when its reason was only
  // "there is no magazine to show" — and that narrowing it "would now fail a
  // green test". The guard is gone with the magazine it described, so the test
  // goes with it rather than being adapted. The behaviour it was protecting is
  // now the case directly above, from the opposite side: an empty bar must
  // *keep* the readout mounted.

  it('shows the results overlay when a level ends', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => {
      GameEvents.emit('level:ended', {
        result: 'won',
        world: 1,
        level: 3,
        kills: 12,
        currency: 240,
        nextLevel: { world: 1, level: 4 },
        medals: 3,
        newAchievements: [],
        newEnemies: [],
      });
    });
    rerender(<Hud />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Level Cleared')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();
  });

  it('offers the next level after a win', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('level:ended', {
        result: 'won',
        world: 1,
        level: 3,
        kills: 5,
        currency: 100,
        nextLevel: { world: 1, level: 4 },
        medals: 3,
        newAchievements: [],
        newEnemies: [],
      });
    });
    rerender(<Hud />);

    expect(screen.getByRole('button', { name: /next level/i })).toBeInTheDocument();
  });

  it('offers no next level when there is none', () => {
    // A loss unlocks nothing, so there is nothing to move on to. Note this is
    // *not* the world-boundary case: 1-45 does have a successor, 2-1. An
    // earlier version of this comment said it did not, which described the
    // `level + 1` bug rather than a rule.
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('level:ended', {
        result: 'lost',
        world: 1,
        level: 3,
        kills: 5,
        currency: 100,
        nextLevel: null,
        medals: 3,
        newAchievements: [],
        newEnemies: [],
      });
    });
    rerender(<Hud />);

    expect(screen.queryByRole('button', { name: /next level/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('starts the level the scene named, rolling over into the next world', () => {
    // The overlay used to emit `level + 1`, so finishing 1-45 would have asked
    // for the non-existent 1-46. The scene resolves the target now, and this
    // asserts the button sends it verbatim rather than deriving anything.
    enterGameplay();
    const started: Array<{ world: number; level: number; difficulty: string }> = [];
    const off = GameEvents.subscribe('ui:start-game', (p) => void started.push(p));
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('level:ended', {
        result: 'won',
        world: 1,
        level: 45,
        kills: 9,
        currency: 300,
        nextLevel: { world: 2, level: 1 },
        medals: 3,
        newAchievements: [],
        newEnemies: [],
      });
    });
    rerender(<Hud />);
    fireEvent.click(screen.getByRole('button', { name: /next level/i }));
    off();

    // The difficulty rides along from the store, defaulting to Easy here.
    expect(started).toEqual([{ world: 2, level: 1, difficulty: 'Easy' }]);
  });

  it('labels a defeat differently', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('level:ended', {
        result: 'lost',
        world: 1,
        level: 1,
        kills: 2,
        currency: 10,
        nextLevel: null,
        medals: 3,
        newAchievements: [],
        newEnemies: [],
      });
    });
    rerender(<Hud />);

    expect(screen.getByText('Tank Destroyed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('keeps the enemy counter clear of coin pickups', () => {
    // Regression: collect() emitted wave:changed carrying the *pickup* count,
    // so grabbing a coin turned the enemy counter into a coin counter.
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('wave:changed', {
        wave: 3,
        enemiesRemaining: 9,
        mode: 'Normal',
        flagsRemaining: 0,
      });
      GameEvents.emit('currency:earned', { amount: 5, total: 5 });
    });

    expect(screen.getByText('9 left')).toBeInTheDocument();
  });

  it('shows a flag counter only on Flag levels', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('wave:changed', {
        wave: 3,
        enemiesRemaining: 4,
        mode: 'Normal',
        flagsRemaining: 0,
      });
    });
    rerender(<Hud />);
    expect(screen.queryByText('flags left')).not.toBeInTheDocument();

    act(() => {
      GameEvents.emit('wave:changed', {
        wave: 3,
        enemiesRemaining: 4,
        mode: 'Flag',
        flagsRemaining: 7,
      });
    });
    rerender(<Hud />);

    expect(screen.getByText('flags left')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    // Flag levels spawn forever, so the enemy figure is what is on screen.
    expect(screen.getByText('4 on screen')).toBeInTheDocument();
  });

  it('surfaces an achievement toast', () => {
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('achievement:unlocked', { id: 'first-coins', title: 'Pocket Change' });
    });

    expect(screen.getByText('Pocket Change')).toBeInTheDocument();
  });

  it('hides the in-game HUD outside the Gameplay scene', () => {
    act(() => {
      GameEvents.emit('scene:ready', { key: 'MainMenu' });
      GameEvents.emit('currency:earned', { amount: 5, total: 5 });
    });
    render(<Hud />);

    expect(screen.queryByText('coins')).not.toBeInTheDocument();
  });
});
