/**
 * `resetOptions` — `SaveManager.resetOptions()` (`:1142-1147`).
 *
 * The one control on the options screen that cannot be undone by clicking it
 * again, so what it does and — more importantly — what it does *not* reach are
 * both driven here rather than described.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import type Phaser from 'phaser';

import { resetOptions, setGameplayOption } from './optionsService';
import { DEFAULT_GAMEPLAY_OPTIONS, readGameplayOptions } from './gameplayOptions';
import { DEFAULT_AUDIO_OPTIONS, readAudioOptions } from '../audio/audioOptions';
import { getOptionsStore } from '../save/optionsStore';
import { OPTIONS_STORE, saveSlotStoreName } from '../save/SaveStore';
import { GameEvents } from '../events/GameEvents';

/**
 * A scene is only a registry as far as this module is concerned — the options
 * store, the profile and the sound manager are all fetched from it. Building
 * the real thing would drag a `Phaser.Game` and a canvas into a test about
 * four booleans and two numbers.
 */
function fakeScene(): Phaser.Scene {
  const registry = new Map<string, unknown>();
  return {
    game: {
      registry: {
        get: (key: string) => registry.get(key),
        set: (key: string, value: unknown) => registry.set(key, value),
      },
    },
  } as unknown as Phaser.Scene;
}

beforeEach(() => {
  localStorage.clear();
});

describe('resetOptions', () => {
  it('puts every gameplay preference back to its default', () => {
    const scene = fakeScene();
    // Move all five off their defaults first, or a reset would be
    // indistinguishable from doing nothing at all.
    setGameplayOption(scene, {
      crosshair: !DEFAULT_GAMEPLAY_OPTIONS.crosshair,
      autoPause: !DEFAULT_GAMEPLAY_OPTIONS.autoPause,
      autoSelect: !DEFAULT_GAMEPLAY_OPTIONS.autoSelect,
      achievementPopUp: !DEFAULT_GAMEPLAY_OPTIONS.achievementPopUp,
    });
    expect(readGameplayOptions(getOptionsStore(scene))).not.toEqual(DEFAULT_GAMEPLAY_OPTIONS);

    resetOptions(scene);

    expect(readGameplayOptions(getOptionsStore(scene))).toEqual(DEFAULT_GAMEPLAY_OPTIONS);
  });

  it('resets the audio settings too, because `:1144` clears the whole store', () => {
    /*
     * The AS3 line is `optionsSave.clear()`, not a selective rewrite, and this
     * port keeps sound and music in that same store. Resetting the checkboxes
     * and leaving the volumes alone would be a *narrower* reset than the
     * original's — the kind of quiet difference that never gets noticed.
     */
    const scene = fakeScene();
    const store = getOptionsStore(scene);
    store.set('soundOn', false);
    store.set('musicOn', false);
    store.set('soundVol', 0.13);
    store.set('musicVol', 0.02);
    store.flush();

    resetOptions(scene);

    expect(readAudioOptions(getOptionsStore(scene))).toEqual(DEFAULT_AUDIO_OPTIONS);
  });

  it('persists, so the reset survives a reload', () => {
    // The failure this catches is a reset that changes the live values and
    // never writes: it looks like it worked and comes back on next launch.
    const scene = fakeScene();
    setGameplayOption(scene, { crosshair: !DEFAULT_GAMEPLAY_OPTIONS.crosshair });
    resetOptions(scene);

    /*
     * Asserted on the **stored** key names, which are the AS3's own
     * (`optionCrosshairOn`, not `crosshair`) — `gameplayOptions.ts` maps
     * between them. Reading back through `readGameplayOptions` would pass even
     * if the mapping changed on both sides at once; the raw JSON is what a
     * previous build's save actually contains.
     */
    const raw = JSON.parse(localStorage.getItem(OPTIONS_STORE) ?? '{}') as Record<
      string,
      unknown
    >;
    expect(raw.optionCrosshairOn).toBe(DEFAULT_GAMEPLAY_OPTIONS.crosshair);
    expect(raw.soundVol).toBe(DEFAULT_AUDIO_OPTIONS.soundVol);
    expect(raw.musicOn).toBe(DEFAULT_AUDIO_OPTIONS.musicOn);
  });

  it('republishes both, so the screen re-renders from the store', () => {
    const scene = fakeScene();
    const seen: string[] = [];
    const offOptions = GameEvents.subscribe('options:changed', () => seen.push('options'));
    const offAudio = GameEvents.subscribe('audio:options', () => seen.push('audio'));

    resetOptions(scene);

    offOptions();
    offAudio();
    // Both, not one: the screen shows five switches from the first and two
    // switches plus two sliders from the second, and a reset that republished
    // only one half would leave the other showing stale values.
    expect(seen).toContain('options');
    expect(seen).toContain('audio');
  });

  /*
   * ── The counterpart, and the reason this test file exists ────────────────
   *
   * `resetOptions` is preferences. `SaveManager.resetOptions` never touches
   * `gameSave`, and neither may this: money, progress, medals and the
   * known-enemy list all survive. Deleting a slot is a different control on a
   * different screen (`ui:delete-slot`).
   *
   * Driven rather than asserted in a comment, because "it only writes the
   * options store" is exactly the kind of claim that stays true until someone
   * adds a convenient `localStorage.clear()`.
   */
  it('does not touch a save slot', () => {
    const scene = fakeScene();
    localStorage.setItem(saveSlotStoreName(1), JSON.stringify({ money: 4200 }));
    localStorage.setItem(saveSlotStoreName(3), JSON.stringify({ money: 7 }));

    resetOptions(scene);

    expect(JSON.parse(localStorage.getItem(saveSlotStoreName(1)) ?? 'null')).toEqual({
      money: 4200,
    });
    expect(JSON.parse(localStorage.getItem(saveSlotStoreName(3)) ?? 'null')).toEqual({ money: 7 });
  });
});
