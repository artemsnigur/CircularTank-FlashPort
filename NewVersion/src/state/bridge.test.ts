/**
 * The bridge is the thing that would silently break the HUD, so it gets the
 * most direct coverage: emit a game event, assert the store changed.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GameEvents } from '../game/events/GameEvents';
import { attachStoreBridge, detachStoreBridge } from './bridge';
import { useGameStore } from './gameStore';

const initial = useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initial, true);
  attachStoreBridge();
});

afterEach(() => {
  detachStoreBridge();
  GameEvents.removeAllListeners();
});

describe('attachStoreBridge', () => {
  it('is idempotent — a second call does not double-subscribe', () => {
    attachStoreBridge();
    attachStoreBridge();

    GameEvents.emit('currency:earned', { amount: 5, total: 5 });
    expect(useGameStore.getState().currency).toBe(5);

    // If listeners had stacked, the running total would still be applied once
    // (it is absolute, not additive) — so assert the listener count directly.
    expect(GameEvents.listenerCount('currency:earned')).toBe(1);
  });

  it('updates the currency counter from a gameplay event', () => {
    GameEvents.emit('currency:earned', { amount: 5, total: 5 });
    expect(useGameStore.getState().currency).toBe(5);

    GameEvents.emit('currency:earned', { amount: 5, total: 10 });
    expect(useGameStore.getState().currency).toBe(10);
  });

  it('uses the running total, so a dropped event cannot desync the HUD', () => {
    GameEvents.emit('currency:earned', { amount: 5, total: 5 });
    // Pretend the "total: 10" event was lost.
    GameEvents.emit('currency:earned', { amount: 5, total: 15 });
    expect(useGameStore.getState().currency).toBe(15);
  });

  it('tracks loading progress and completion', () => {
    GameEvents.emit('preload:progress', { value: 0.42 });
    expect(useGameStore.getState().progress).toBeCloseTo(0.42);
    expect(useGameStore.getState().phase).toBe('loading');

    GameEvents.emit('preload:complete', { durationMs: 120, assetCount: 10 });
    expect(useGameStore.getState().progress).toBe(1);
    expect(useGameStore.getState().phase).toBe('ready');
  });

  it('clamps out-of-range progress', () => {
    GameEvents.emit('preload:progress', { value: 1.4 });
    expect(useGameStore.getState().progress).toBe(1);
    GameEvents.emit('preload:progress', { value: -0.2 });
    expect(useGameStore.getState().progress).toBe(0);
  });

  it('surfaces a load error with the failing file', () => {
    GameEvents.emit('preload:error', { file: 'ground-desert', reason: '404' });
    expect(useGameStore.getState().phase).toBe('error');
    expect(useGameStore.getState().loadError).toContain('ground-desert');
  });

  it('mirrors health and the reload bars', () => {
    GameEvents.emit('player:damaged', { amount: 30, health: 70, maxHealth: 100 });
    expect(useGameStore.getState().health).toBe(70);

    GameEvents.emit('reload:changed', { primary: 0.25, secondary: 1, weapon: 'Shotgun', secondaryName: null });
    expect(useGameStore.getState()).toMatchObject({
      reloadPrimary: 0.25,
      reloadSecondary: 1,
      weapon: 'Shotgun',
      secondaryName: null,
    });
  });

  it('never lets health go negative', () => {
    GameEvents.emit('player:damaged', { amount: 500, health: -40, maxHealth: 100 });
    expect(useGameStore.getState().health).toBe(0);
  });

  it('de-dupes achievement toasts so a level restart cannot stack them', () => {
    GameEvents.emit('achievement:unlocked', { id: 'first-coins', title: 'Pocket Change' });
    GameEvents.emit('achievement:unlocked', { id: 'first-coins', title: 'Pocket Change' });
    expect(useGameStore.getState().achievements).toHaveLength(1);
  });

  it('tracks the active scene, ignoring a late shutdown from a previous scene', () => {
    GameEvents.emit('scene:ready', { key: 'MainMenu' });
    expect(useGameStore.getState().activeScene).toBe('MainMenu');

    GameEvents.emit('scene:ready', { key: 'Gameplay' });
    GameEvents.emit('scene:shutdown', { key: 'MainMenu' }); // arrives out of order
    expect(useGameStore.getState().activeScene).toBe('Gameplay');
  });

  it('stops updating the store once detached', () => {
    detachStoreBridge();
    GameEvents.emit('currency:earned', { amount: 99, total: 99 });
    expect(useGameStore.getState().currency).toBe(0);
  });
});
