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

/**
 * Pause must not survive the scene it describes.
 *
 * The bug these were written for: **Reset Level restarted the level and left
 * the pause panel on screen.** `paused` lives in the store so the key and the
 * Resume button can agree about it, and a scene restart went straight past it.
 */
describe('a scene transition clears the pause', () => {
  beforeEach(() => {
    useGameStore.setState({ paused: true });
  });

  it('Reset Level: gameplay coming back up unpauses', () => {
    // `scene.restart()` re-runs `create`, which re-emits `scene:ready`.
    GameEvents.emit('scene:ready', { key: 'Gameplay' });

    expect(useGameStore.getState().activeScene).toBe('Gameplay');
    expect(useGameStore.getState().paused).toBe(false);
  });

  it('Quit Level: leaving for another scene unpauses too', () => {
    // The same defect one step out, and the nastier half: the overlay is hidden
    // outside gameplay, so a flag left true here would sit unnoticed until the
    // *next* level opened already paused.
    GameEvents.emit('scene:ready', { key: 'LevelSelect' });

    expect(useGameStore.getState().paused).toBe(false);
  });

  it('a shutdown clears it as well', () => {
    GameEvents.emit('scene:ready', { key: 'Gameplay' });
    useGameStore.setState({ paused: true });
    GameEvents.emit('scene:shutdown', { key: 'Gameplay' });

    expect(useGameStore.getState().activeScene).toBeNull();
    expect(useGameStore.getState().paused).toBe(false);
  });

  /**
   * The counterpart, so "clears the pause" is not satisfied by a store that
   * can never hold one: an ordinary gameplay event leaves it alone.
   */
  it('an ordinary gameplay event does not clear it', () => {
    GameEvents.emit('currency:earned', { amount: 1, total: 1 });

    expect(useGameStore.getState().paused).toBe(true);
  });
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

    GameEvents.emit('reload:changed', {
      primary: 0.25,
      secondary: 1,
      weapon: 'Shotgun',
      secondaryName: null,
      equipped: ['Shotgun', 'MiniGun'],
      slot: 1,
      secondaryReady: true,
    });
    expect(useGameStore.getState()).toMatchObject({
      reloadPrimary: 0.25,
      reloadSecondary: 1,
      weapon: 'Shotgun',
      secondaryName: null,
      // The weapon panel's three additions ride the same event, so the bridge
      // forwarding the payload whole is what these pin.
      equippedWeapons: ['Shotgun', 'MiniGun'],
      weaponSlot: 1,
      secondaryReady: true,
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
