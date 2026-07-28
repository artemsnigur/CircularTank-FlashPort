/**
 * What the player is allowed to enter — `ScreenLevelSelect.as:842` (levels) and
 * `:1518` (worlds).
 *
 * ── Why this is its own module ────────────────────────────────────────────
 * One rule had four copies: the scene's inline expression, an identical
 * reimplementation inside `levelUnlock.test.ts` that every assertion in that
 * file drove instead of the scene's, and — in the *other* direction — the
 * "cleared" predicate written out longhand inside `getCurrentWorldAndLevel`
 * thirty lines from the `isLevelCleared` that names it.
 *
 * The AS3 has the same habit and worse: the predicate is spelled out at
 * `ScreenLevelSelect.as:255`, `:376`, `:842`, `:1518` and `:1539` and is never
 * given a name anywhere. Grepping an identifier finds none of them, which is why
 * the count kept coming out low.
 *
 * ── The table is a parameter, never fetched ───────────────────────────────
 * Nothing here reaches for `PlayerProfile`. That is deliberate and load-bearing:
 * the AS3 reads the *visible* table, not the earned one, and the port does not
 * have a visible table yet (see `ProgressView` below). Keeping the table an
 * argument means adding one later is a change at the call sites rather than a
 * rewrite here.
 *
 * ── One rule, two scales ──────────────────────────────────────────────────
 * Levels and worlds are the same sentence at different sizes:
 *
 *     level  L  is open  <=>  L is the first, or level L-1 is cleared
 *     world  W  is open  <=>  W is the first, or the *last* level of W-1 is cleared
 *
 * They are written as two functions rather than one generic because the "unit
 * before this one" differs — the previous level, against the previous world's
 * final level — and collapsing that into a parameter would hide the only
 * interesting difference between them.
 */

import { isLevelCleared } from './levelProgress';
import type { ProgressTable } from './levelProgress';
import { levelsInWorld, WORLD_COUNT } from './levelData';
import type { LevelMode } from './levelData';
import { LEVELS } from './levelData';

/**
 * The table an unlock rule reads.
 *
 * Today this is always the earned progress table. The AS3 reads
 * `worldsValuesVisibleArrays` instead (`ScreenLevelSelect.as:841`, `:1518`) — a
 * session-only clone of the earned table (`SaveManager.as:656`) that lags it
 * until `ScreenStatus` has played the medal-reveal animation. So in the original
 * the next level opens when the reveal finishes; here it opens the moment the
 * result is recorded.
 *
 * That difference is invisible in outcome and only exists while an animation
 * that is not ported would be running. The alias exists so the distinction has a
 * name at the seam where a visible table would arrive.
 */
export type ProgressView = ProgressTable;

/**
 * Worlds the player can reach — the AS3's `ScreenLevelSelect.totalWorlds`,
 * pinned to 1 until the world picker is ported.
 *
 * Previously two constants: `LevelSelectScene.SELECTED_WORLD` (which world the
 * grid shows) and `MainMenuScene.SELECTABLE_WORLDS` (how many worlds Play may
 * scan). Both said "1" and each carried a comment claiming to match the other,
 * which is a convention rather than a mechanism — nothing made them agree, and
 * disagreeing would have let Play launch a level the grid cannot display.
 *
 * One count, with the grid showing the highest world it admits. `Main.as` sets
 * the real value to 6 or 9 depending on premium (`levelProgress.ts`
 * `FREE_WORLD_COUNT` / `PREMIUM_WORLD_COUNT`); this replaces it when the picker
 * lands.
 */
export const SELECTABLE_WORLDS = 1;

/**
 * Whether a level can be entered — `ScreenLevelSelect.as:842`.
 *
 *     if (i > 0 && valuesArray[i-1][0] == 0 && [1] == 0 && [2] == 0) isLocked = true
 *
 * `i` is 0-based there, so `i > 0` is this function's `level > 1`, and the
 * triple-zero test is `!isLevelCleared`. Cleared on *any* difficulty counts:
 * the AS3 tests all three slots, so a single Easy win opens the next level for
 * every difficulty.
 */
export function isLevelUnlocked(view: ProgressView, world: number, level: number): boolean {
  if (level <= 1) return true;
  return isLevelCleared(view, world, level - 1);
}

/**
 * Whether a world can be entered — `ScreenLevelSelect.as:1518`.
 *
 * A world opens when the **last** level of the world before it is cleared, not
 * when that world is merely started. `levelsInWorld` supplies that index rather
 * than a hardcoded 45, so a world with a different length cannot silently gate
 * on the wrong level.
 *
 * ── World 1 is a deliberate base case here, and an accident there ─────────
 * The AS3 never states that world 1 is always open. Its loop runs `i` from 0 and
 * reads `worldsValuesVisibleArrays[i - 1]` — index `-1` for world 1, which is
 * `undefined`, so the guard `valuesArray != null` short-circuits and the lock is
 * never applied. The base case is a side effect of an out-of-range read.
 *
 * Written explicitly instead. Relying on the same accident would mean relying on
 * `progress[-1]` being `undefined` in TypeScript too — true today, but true by
 * coincidence rather than by intent, and unreadable to anyone checking whether
 * the first world is reachable.
 *
 * ── Not modelled: the reveal lock ─────────────────────────────────────────
 * The AS3's condition begins `i + 1 == progressWorld ||`, which *locks* the
 * newly earned world so `:755-759` can unlock it with an animation a moment
 * later. That is a transient presentation state belonging to a screen that is
 * not ported; a world earned here is simply open.
 */
export function isWorldUnlocked(view: ProgressView, world: number): boolean {
  if (world <= 1) return true;
  if (world > WORLD_COUNT) return false;

  const previous = world - 1;
  const finalLevel = levelsInWorld(previous);
  if (finalLevel === 0) return false;

  return isLevelCleared(view, previous, finalLevel);
}

/** A request to enter a level, as `ui:start-game` carries it. */
export interface StartRequest {
  world: number;
  level: number;
  /** Dev jump: records nothing, and deliberately ignores the lock. */
  sandbox?: boolean;
}

/**
 * Whether a start request may proceed.
 *
 * Separate from `isLevelUnlocked` because it answers a different question — not
 * "is this level open" but "may *this* request start it" — and because the
 * sandbox exemption is a property of the request, not of the level.
 *
 * ── Why this is a function and not two lines in the scene ─────────────────
 * A scene cannot be instantiated in a test, so a guard living inside one can
 * only be checked by grepping its source, and a regex cannot tell whether a
 * guard that is present is ever reached. Extracting the rule is the same fix
 * `player/levelBanking.ts` got: the decision becomes drivable against a real
 * profile, and the scene keeps only the call.
 */
export function mayStartLevel(view: ProgressView, request: StartRequest): boolean {
  if (request.sandbox) return true;
  return isLevelUnlocked(view, request.world, request.level);
}

/** One level's row in the grid. */
export interface LevelUnlockState {
  level: number;
  mode: LevelMode;
  cleared: boolean;
  unlocked: boolean;
}

/**
 * Every level in a world with its unlock state, in grid order.
 *
 * The grid's shape lives here rather than in the scene so the scene assembles
 * nothing — the previous version built these rows by hand and inlined the
 * unlock rule while doing it, which is how the fourth copy got there.
 *
 * An unknown world yields an empty list rather than throwing: a blank grid is a
 * better failure than a crashed screen.
 */
export function levelUnlockStates(view: ProgressView, world: number): LevelUnlockState[] {
  // Indexed straight off the generated table; levelData.ts is regenerated from
  // the AS3, so helpers must not be added to it by hand.
  const specs = LEVELS[world - 1] ?? [];

  return specs.map((spec, index) => {
    const level = index + 1;
    return {
      level,
      mode: spec.mode,
      cleared: isLevelCleared(view, world, level),
      unlocked: isLevelUnlocked(view, world, level),
    };
  });
}
