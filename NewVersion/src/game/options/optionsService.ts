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
  readGameplayOptions,
  writeGameplayOptions,
  type GameplayOptions,
} from './gameplayOptions';

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
