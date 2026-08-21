/**
 * The installer, driven against a real `location.hash` and the real store.
 *
 * The pure table is covered in `navigation/menuRoute.test.ts`. What is left
 * here is the wiring, which is where this project's gameplay bugs have all
 * lived: whether the subscription fires, what it writes, and whether the two
 * directions form a loop.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { installMenuRoute, bootScene } from './menuRoute';
import { useGameStore } from './gameStore';
import { GameEvents } from '../game/events/GameEvents';
import { SceneKeys } from '../game/config/constants';

let teardown: () => void = () => {};

beforeEach(() => {
  window.location.hash = '';
  useGameStore.getState().setActiveScene(null);
  teardown = installMenuRoute();
});

afterEach(() => {
  teardown();
  window.location.hash = '';
});

describe('the store writes the hash', () => {
  it('writes a slug when a menu becomes active', () => {
    useGameStore.getState().setActiveScene(SceneKeys.Upgrades);
    expect(window.location.hash).toBe('#upgrades');

    // And follows a second move, rather than only the first.
    useGameStore.getState().setActiveScene(SceneKeys.Options);
    expect(window.location.hash).toBe('#options');
  });

  it('leaves the last menu in place when a level starts', () => {
    /*
     * The gameplay exception, and the reason `routeForScene` returning null
     * must mean "leave it alone" rather than "clear it". The stale slug is
     * load-bearing: it is what a refresh mid-level lands on.
     */
    useGameStore.getState().setActiveScene(SceneKeys.LevelSelect);
    expect(window.location.hash).toBe('#levels');

    useGameStore.getState().setActiveScene(SceneKeys.Gameplay);
    expect(window.location.hash).toBe('#levels');

    // Which is exactly what the boot path then reads.
    expect(bootScene()).toBe(SceneKeys.LevelSelect);
  });

  it('leaves it in place on teardown too, rather than clearing it', () => {
    // A scene torn down sets `activeScene` to null; that is not a navigation.
    useGameStore.getState().setActiveScene(SceneKeys.Bestiary);
    useGameStore.getState().setActiveScene(null);
    expect(window.location.hash).toBe('#bestiary');
  });

  it('does not stack a history entry per menu', () => {
    // `replaceState`, so Back leaves the app rather than walking every screen
    // the player passed through on the way in.
    const replace = vi.spyOn(window.history, 'replaceState');
    useGameStore.getState().setActiveScene(SceneKeys.Enemies);
    expect(replace).toHaveBeenCalledTimes(1);
    replace.mockRestore();
  });
});

describe('the hash drives the store', () => {
  it('emits `ui:goto` when the hash names a different menu', () => {
    const seen: string[] = [];
    const off = GameEvents.subscribe('ui:goto', ({ key }) => seen.push(key));

    useGameStore.getState().setActiveScene(SceneKeys.MainMenu);
    window.location.hash = '#achievements';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(seen).toEqual([SceneKeys.Achievements]);
    off();
  });

  it('stays silent when the hash already agrees with the store', () => {
    /*
     * The loop closed at its source. Writing the hash fires `hashchange`, and
     * a listener that emitted unconditionally would send `ui:goto` for the
     * scene that had just become active — every scene guards against that, but
     * relying on seven separate guards staying written is not a mechanism.
     *
     * Pinned beside the case above, which is the same call with the store on a
     * different screen: without that pair, "emits nothing" would pass for a
     * listener that never emits at all.
     */
    const seen: string[] = [];
    const off = GameEvents.subscribe('ui:goto', ({ key }) => seen.push(key));

    useGameStore.getState().setActiveScene(SceneKeys.Upgrades);
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(seen).toEqual([]);
    off();
  });

  it('ignores a hash that names no menu', () => {
    const seen: string[] = [];
    const off = GameEvents.subscribe('ui:goto', ({ key }) => seen.push(key));

    useGameStore.getState().setActiveScene(SceneKeys.MainMenu);
    window.location.hash = '#not-a-screen';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(seen).toEqual([]);
    off();
  });

  it('stops listening once torn down', () => {
    // Whether the teardown works is the difference between a test suite that
    // leaks listeners across files and one that does not.
    const seen: string[] = [];
    const off = GameEvents.subscribe('ui:goto', ({ key }) => seen.push(key));

    teardown();
    window.location.hash = '#options';
    window.dispatchEvent(new HashChangeEvent('hashchange'));

    expect(seen).toEqual([]);
    off();
  });
});

describe('bootScene', () => {
  it('reads the live hash, and falls back to the main menu', () => {
    window.location.hash = '#upgrades';
    expect(bootScene()).toBe(SceneKeys.Upgrades);

    window.location.hash = '';
    expect(bootScene()).toBe(SceneKeys.MainMenu);
  });
});
