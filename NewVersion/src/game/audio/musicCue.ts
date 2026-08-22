/**
 * Which music plays when — `SoundManager.changeMusic`.
 *
 * Four triggers, and that is the whole rule set:
 *
 *   `Menu`   on a screen change (`Main.as:855` and six siblings)
 *   *mode*   at level start (`ScreenGame.as:378`)
 *   `Win` / `Lose` at level end (`PartGameArea.as:2792` / `:2788`)
 *   `None`   on quit (`:2854`)
 *
 * ── The level track is the level *mode*, and that is not a coincidence ────
 * `ScreenGame.as:378` reads
 *
 *     SoundManager.changeMusic = ScreenLevelSelect.levelMode;
 *
 * — the mode string *is* the track name. The five in-level tracks are called
 * `Normal`, `Flag`, `Tower`, `Defense` and `Boss` for exactly that reason.
 *
 * **So the mapping is asserted against the AS3's own list rather than derived
 * from either ordering.** It would be tempting to write `setMusic(mode)` and
 * call it done — and today that is even correct — but index-and-meaning
 * coincidences are the shape that produced the `objectList` name/count bug and
 * the `TankTower` frame table. If a track were ever renamed, or a sixth mode
 * added without a track, `setMusic(mode as MusicName)` would compile and fail
 * silently. Going through this table makes that a test failure instead.
 */

import type { MusicName } from './SoundManager';
import { SceneKeys } from '../config/constants';
import type { SceneKey } from '../config/constants';
/**
 * The menu screens that ask for the `Menu` track — `Main.as:855-901`.
 *
 * **Seven screen changes, seven identical assignments.** The port had exactly
 * one, in `MainMenuScene`, so every other menu kept whatever had been playing:
 * quitting a level put the player on Level Select with the *gameplay* track
 * still running, and before `A94`'s pause fix, with nothing running at all.
 *
 * A table with one subscriber rather than seven call sites, for the reason
 * `buttonSounds.ts` gives about its delegated listener: a screen is covered
 * because it is *in the set*, and a screen added tomorrow fails the
 * completeness test rather than joining a blind spot.
 *
 * `Gameplay` is deliberately absent and must stay absent — it requests its own
 * mode track in `create()`, and a `Menu` request racing that would be a
 * coin-flip over which one won.
 */
export const MENU_MUSIC_SCENES: readonly SceneKey[] = [
  SceneKeys.MainMenu,
  SceneKeys.LevelSelect,
  SceneKeys.Upgrades,
  SceneKeys.Enemies,
  SceneKeys.Bestiary,
  SceneKeys.Options,
  SceneKeys.Achievements,
];

/**
 * DEV-AID: screens this port adds that are menus too, and have no AS3 original.
 *
 * **Kept out of `MENU_MUSIC_SCENES` on purpose.** That array is seven because
 * `Main.as:855-901` lists seven, and `musicCue.test.ts` asserts the length
 * against the AS3 — appending to it would have turned a checked fact about the
 * original into a number that follows whatever we add. So the port's own
 * screens live here, and `musicForScene` reads both.
 */
export const DEV_MENU_MUSIC_SCENES: readonly SceneKey[] = [SceneKeys.ThemeGallery];

/** The track a scene asks for on becoming ready, or null to leave it alone. */
export function musicForScene(
  key: SceneKey,
  dev: boolean = import.meta.env.DEV,
): MusicName | null {
  if (MENU_MUSIC_SCENES.includes(key)) return 'Menu';
  // A dev screen is silent in a build that does not have it — which is moot,
  // since its scene is not registered there either, but it keeps this function
  // honest about what production does rather than relying on that.
  return dev && DEV_MENU_MUSIC_SCENES.includes(key) ? 'Menu' : null;
}

import type { LevelMode } from '../levels/levelData';

/**
 * Level mode -> music track. Written out, not cast.
 *
 * Every entry is the same string on both sides, which is the point: the
 * identity is a fact about the AS3 that is *checked*, not an assumption the
 * code relies on.
 */
export const MUSIC_BY_MODE: Readonly<Record<LevelMode, MusicName>> = {
  Normal: 'Normal',
  Flag: 'Flag',
  Tower: 'Tower',
  Defense: 'Defense',
  Boss: 'Boss',
};

/** The track for a level mode. */
export function musicForMode(mode: LevelMode): MusicName {
  return MUSIC_BY_MODE[mode];
}

/**
 * The track for a level outcome — `:2788`, `:2792`.
 *
 * Set inside the same block that sets `levelDone`, so it changes the moment a
 * level resolves rather than when the results screen appears.
 */
export function musicForOutcome(result: 'won' | 'lost'): MusicName {
  return result === 'won' ? 'Win' : 'Lose';
}
