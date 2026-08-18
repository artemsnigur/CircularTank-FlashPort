/**
 * Installs the gameplay-options owner — the scene side of `ScreenOptions`.
 *
 * Mirrors `audio/soundService.ts`: React emits `ui:set-option`, this applies
 * it, persists it, and republishes so the checkboxes re-render. React never
 * writes the store and never holds a `Scene`.
 *
 * ── Why applying and persisting are one call ──────────────────────────────
 * The audio equivalent already learned this: a toggle that changes the live
 * value without writing, or writes without republishing, produces a control
 * that looks like it worked and reverts on the next launch — or one that never
 * moves. All three steps happen here so none can be forgotten at a call site.
 */

import type Phaser from 'phaser';

import { GameEvents } from '../events/GameEvents';
import { getOptionsStore } from '../save/optionsStore';
import { getPlayerProfile } from '../player/playerProfile';
import { withTutorialEnabled } from '../tutorial/tutorialState';
import {
  DEFAULT_GAMEPLAY_OPTIONS,
  readGameplayOptions,
  writeGameplayOptions,
  type GameplayOptions,
} from './gameplayOptions';
import { DEFAULT_AUDIO_OPTIONS, applyAudioOptions, writeAudioOptions } from '../audio/audioOptions';
import { getSoundManager } from '../audio/soundService';

/** Reads the stored preferences and publishes them to React. */
export function publishGameplayOptions(scene: Phaser.Scene): GameplayOptions {
  const options = readGameplayOptions(getOptionsStore(scene));
  GameEvents.emit('options:changed', options);
  return options;
}

/**
 * Applies one changed preference, persists it, republishes.
 *
 * The tutorial switch takes an extra step. `withTutorialEnabled` is kept
 * separate from `tutorialDefaultOn` on purpose — the first-run decision and the
 * restore must not collapse into "on every launch" — and it refuses to
 * resurrect a *completed* tutorial, so ticking the box on a finished profile
 * stores `true` and correctly leaves the tutorial off.
 */
/**
 * `SaveManager.resetOptions()` — everything in the options store, back to
 * defaults.
 *
 * ── It is the whole store, and that includes audio ────────────────────────
 * `:1144` is `optionsSave.clear()`, not a selective rewrite, and this port
 * keeps sound and music in the same store (`audioOptions.ts` writes
 * `soundOn`/`musicOn`/`soundVol`/`musicVol` there). So resetting the
 * checkboxes and leaving the volumes where they were would be a *narrower*
 * reset than the original's, which is the kind of quiet difference this
 * project records rather than ships.
 *
 * ── What it does not touch ────────────────────────────────────────────────
 * The game save. `resetOptions` never reaches `gameSave`, so money, progress,
 * medals and the known-enemy list all survive. Deleting a slot is a different
 * control on a different screen (`ui:delete-slot`).
 *
 * Routed through `setGameplayOption` rather than writing directly, because the
 * tutorial switch has a second step — restoring `tutorialOn`'s default has to
 * reach the profile as well as the store, and that rule already lives there.
 */
export function resetOptions(scene: Phaser.Scene): GameplayOptions {
  const store = getOptionsStore(scene);

  writeAudioOptions(store, DEFAULT_AUDIO_OPTIONS);
  const manager = getSoundManager(scene);
  // Apply to the live manager as well as the store: a reset that persisted
  // silence and left the music playing would look like it had not worked.
  if (manager) applyAudioOptions(manager, DEFAULT_AUDIO_OPTIONS);
  /*
   * Published from the values just committed, **not** through
   * `publishAudioOptions`. That reads the live `SoundManager` and returns early
   * when there is not one, so a reset in any context without a manager would
   * write the defaults and never tell React — the sliders would sit at the old
   * numbers until something else republished. Emitting what was written cannot
   * have that gap, and with a manager present the two agree, because
   * `applyAudioOptions` above just put these same values into it.
   */
  GameEvents.emit('audio:options', { ...DEFAULT_AUDIO_OPTIONS });

  // A full spread, so this is a *reset* rather than a merge over whatever the
  // player last set — `{ ...current, ...DEFAULT }` with every key present is
  // the defaults exactly, and `setGameplayOption` flushes and republishes.
  return setGameplayOption(scene, { ...DEFAULT_GAMEPLAY_OPTIONS });
}

export function setGameplayOption(
  scene: Phaser.Scene,
  change: Partial<GameplayOptions>,
): GameplayOptions {
  const store = getOptionsStore(scene);
  const next = { ...readGameplayOptions(store), ...change };

  writeGameplayOptions(store, next);
  store.flush();

  if (change.tutorialOn !== undefined) {
    const profile = getPlayerProfile(scene);
    profile.setTutorial(withTutorialEnabled(profile.tutorial, next.tutorialOn));
  }

  GameEvents.emit('options:changed', next);
  return next;
}
