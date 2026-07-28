/**
 * Scene-side access to the chosen difficulty — the seam between the stored
 * preference, the save-slot hint flag, and React.
 *
 * `difficultyOption.ts` is the pure read/write; this is the wiring, kept out of
 * it so the option can be tested without a `Phaser.Scene`.
 *
 * ── Two different stores, one press ───────────────────────────────────────
 * Pressing a difficulty button touches both halves of the AS3's persistence:
 *
 *   `ScreenLevelSelect.levelDifficulty`  -> the options SharedObject
 *   `Main.hDifficultyChosen`             -> the save slot's helper flags
 *
 * `ButtonGameDifficulty.as:40-43` does exactly that, and the ordering there is
 * the detail worth keeping: the flag write sits inside `if (currentFrame != 3)`
 * — the frame meaning "this button is already the selected one" — so
 * **re-pressing the active difficulty does not consume the hint.** Only an
 * actual change counts as the player having made a choice.
 */

import type Phaser from 'phaser';
import { GameEvents } from '../events/GameEvents';
import { getOptionsStore } from '../save/optionsStore';
import { getPlayerProfile } from '../player/playerProfile';
import { readDifficulty, writeDifficulty } from './difficultyOption';
import { getCurrentWorldAndLevel } from './levelProgress';
import { SELECTABLE_WORLDS } from './levelUnlock';
import { shouldShowHint } from '../onboarding/mainFlags';
import type { Difficulty } from '../config/constants';

/** The difficulty every launch from this scene should use. */
export function getDifficulty(scene: Phaser.Scene): Difficulty {
  return readDifficulty(getOptionsStore(scene));
}

/**
 * Whether the "pick a difficulty" helper should be showing.
 *
 * Delegates to `shouldShowHint`, which carries the AS3's own two conditions:
 * the tutorial must be running, and the player must have reached world > 1 or
 * level >= 4 (`ScreenLevelSelect.as:1029`).
 *
 * ── It is false today, and that is faithful ───────────────────────────────
 * `TutorialState.on` starts false and nothing turns it on yet, so this returns
 * false for every player. That is the correct behaviour for an unported
 * tutorial, not a stub: the *flag* is still recorded on a real press, so a
 * player who picks a difficulty now will never be shown the hint once the
 * tutorial does land.
 */
export function difficultyHintPending(scene: Phaser.Scene): boolean {
  const profile = getPlayerProfile(scene);
  return shouldShowHint(profile.mainFlags, 'DifficultyChosen', {
    tutorialOn: profile.tutorial.on,
    currentWorldAndLevel: getCurrentWorldAndLevel(profile.progress, SELECTABLE_WORLDS),
  });
}

/** Pushes the current difficulty to React. */
export function publishDifficulty(scene: Phaser.Scene): void {
  GameEvents.emit('difficulty:changed', {
    difficulty: getDifficulty(scene),
    hintPending: difficultyHintPending(scene),
  });
}

/**
 * Applies a difficulty choice and republishes.
 *
 * Returns whether the difficulty actually changed — the same distinction
 * `ButtonGameDifficulty` draws with `currentFrame != 3`, and the reason the
 * hint is only consumed on a real change.
 *
 * The store write is unconditional even when unchanged, so a value that was
 * only ever a default becomes an explicit one; the *hint* write is not.
 */
export function chooseDifficulty(scene: Phaser.Scene, difficulty: Difficulty): boolean {
  const store = getOptionsStore(scene);
  const changed = readDifficulty(store) !== difficulty;

  writeDifficulty(store, difficulty);

  if (changed) {
    const profile = getPlayerProfile(scene);
    // Only a real change counts as "the player chose"; re-pressing the active
    // button leaves the hint pending.
    if (profile.markUiHint('DifficultyChosen')) profile.save();
  }

  publishDifficulty(scene);
  return changed;
}
