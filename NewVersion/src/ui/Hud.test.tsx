/**
 * The end-to-end proof for the event bridge, as an assertion rather than a
 * claim: a Phaser scene emits `currency:earned`, and the React counter shows
 * the new value — no polling, no shared mutable object.
 */
import { act, render, screen } from '@testing-library/react';
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
      GameEvents.emit('wave:changed', { wave: 3, enemiesRemaining: 7 });
    });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7 left')).toBeInTheDocument();
  });

  it('shows the ammo readout only once a weapon has capacity', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);
    expect(screen.queryByText('Cannon')).not.toBeInTheDocument();

    act(() => {
      GameEvents.emit('ammo:changed', { current: 8, capacity: 12, weapon: 'Cannon' });
    });
    rerender(<Hud />);

    expect(screen.getByText('Cannon')).toBeInTheDocument();
    expect(screen.getByText('/12')).toBeInTheDocument();
  });

  it('keeps the weapon name visible across a weapon switch', () => {
    // Regression: GameplayScene.cycleWeapon used to emit `capacity: 0`, which
    // trips AmmoReadout's `capacity <= 0` guard and unmounts the readout — so
    // the weapon name showed on start and vanished for good on the first Q
    // press. Any emit on a switch must carry a non-zero capacity.
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('ammo:changed', { current: 12, capacity: 12, weapon: 'Cannon' });
    });
    rerender(<Hud />);
    expect(screen.getByText('Cannon')).toBeInTheDocument();

    act(() => {
      GameEvents.emit('ammo:changed', { current: 12, capacity: 12, weapon: 'MiniGun' });
    });
    rerender(<Hud />);

    expect(screen.getByText('MiniGun')).toBeInTheDocument();
    expect(screen.queryByText('Cannon')).not.toBeInTheDocument();
  });

  it('hides the readout entirely when capacity drops to zero', () => {
    // Pins the guard that caused the bug above, so the trap stays documented.
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('ammo:changed', { current: 12, capacity: 12, weapon: 'Cannon' });
    });
    rerender(<Hud />);
    expect(screen.getByText('Cannon')).toBeInTheDocument();

    act(() => {
      GameEvents.emit('ammo:changed', { current: 0, capacity: 0, weapon: 'MiniGun' });
    });
    rerender(<Hud />);

    expect(screen.queryByText('MiniGun')).not.toBeInTheDocument();
  });

  it('shows the results overlay when a level ends', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => {
      GameEvents.emit('level:ended', {
        result: 'won',
        level: 3,
        kills: 12,
        currency: 240,
      });
    });
    rerender(<Hud />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Level Cleared')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();
  });

  it('labels a defeat differently', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('level:ended', {
        result: 'lost',
        level: 1,
        kills: 2,
        currency: 10,
      });
    });
    rerender(<Hud />);

    expect(screen.getByText('Tank Destroyed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
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
