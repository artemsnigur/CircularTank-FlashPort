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
