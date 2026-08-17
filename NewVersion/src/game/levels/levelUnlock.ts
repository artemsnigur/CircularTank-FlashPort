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
 * there are **two** tables — earned (`playerProfile.ts:140`) and the
 * session-only visible clone (`playerProfile.ts:164`, resynced at `:175`) — and
 * which one a caller wants differs *within this module*. The gates read earned;
 * the medal counts read visible. Keeping both an argument is what lets one
 * function serve both without reaching for a global and guessing.
 *
 * That split is a deliberate divergence from the AS3, which reads visible for
 * both (`ScreenLevelSelect.as:841`, `:1518`) — see `ProgressView` below and
 * **A6** in `docs/AUDIT-2026-07.md`.
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

import { getLevelValues, isLevelCleared } from './levelProgress';
import { Worlds } from '../config/constants';
import type { ProgressTable } from './levelProgress';
import type { Difficulty } from '../config/constants';
import { LEVELS, levelsInWorld, WORLD_COUNT } from './levelData';
import type { LevelMode } from './levelData';
import { medalTiers } from './medalTiers';
import type { MedalTier } from './medalTiers';

/**
 * A progress table in the role of "what some rule reads".
 *
 * **Both tables exist and both are in use here.** The gates (`cleared`,
 * `unlocked`) take the earned table; `levelUnlockStates`' `display` parameter
 * takes the visible one, and `LevelSelectScene.ts:205-210` passes exactly that
 * pair. The alias names the *role* rather than either table, which is why one
 * type serves both arguments.
 *
 * The AS3 reads `worldsValuesVisibleArrays` for **both** (`ScreenLevelSelect.as:841`
 * for levels, `:1518` for worlds) — a session-only clone of the earned table
 * (`SaveManager.as:656`) that lags it until `ScreenStatus` has played the
 * medal-reveal animation, so there the next level opens when the reveal
 * finishes.
 *
 * **This port splits them deliberately, and it is not a shortcut.** A lagging
 * gate would contradict the results screen: `GameplayScene.ts:980` starts a
 * level from `ui:start-game` with no unlock check at all, so the Next-level
 * button would start a level `LevelSelectScene` refuses — intermittently, and
 * only until someone watched an animation. Full argument in **A6**,
 * `docs/AUDIT-2026-07.md`. The cost is that a level shows fewer medals than it
 * has for the length of one reveal, while already being playable.
 */
export type ProgressView = ProgressTable;

/**
 * Worlds the player can reach.
 *
 * All nine, deliberately. `Main.as:310-320` sets `totalWorlds` to 6 without
 * premium and 9 with, but this port has no premium source — and the original
 * contradicts itself anyway: `ButtonNextLevel` declares its own local
 * `totalWorlds = worldModels.length / 3` at `:104`, `:194` and `:285`,
 * unconditionally 9, and uses it to offer the next world. So finishing 6-45 in
 * the original hands you world 7 regardless of the picker's cap, and
 * `nextLevelAfter` already inherits that side of it.
 *
 * Was two constants that agreed only by convention —
 * `LevelSelectScene.SELECTED_WORLD` and `MainMenuScene.SELECTABLE_WORLDS` —
 * collapsed into one pin, and now into `WORLD_COUNT` itself as the pin comes
 * off.
 */
export const SELECTABLE_WORLDS = WORLD_COUNT;

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

/** One world's row in the picker. */
export interface WorldUnlockState {
  world: number;
  /** Theme name — `Worlds[world - 1]`, what the AS3 labels the world with. */
  name: string;
  unlocked: boolean;
  totalLevels: number;
  /** Levels with any medal on any difficulty. */
  levelsCompleted: number;
  /** The level the player is up to — `levelsCompleted + 1`, capped (`:1565`). */
  frontier: number;
  /** Medal totals for the world, one per tier. See `worldMedalTiers`. */
  bronze: number;
  silver: number;
  gold: number;
}

/**
 * The three medal totals a world button shows — `ScreenLevelSelect.as:1531-1562`.
 *
 * Each is the sum over the world's levels of the best medal count *visible at
 * that tier*, which is the same cascade `getLevelValues` implements:
 *
 *     gold    = Hard only
 *     silver  = max(Hard, Medium)
 *     bronze  = max(Hard, Medium, Easy)
 *
 * ── The AS3's bronze is wrong on a tie, and this corrects it ──────────────
 * The world button does not call `getLevelValues`. It spells the rule out
 * inline, and the bronze branch mishandles equal values:
 *
 *     if      (v0 > v1 && v0 > v2)  bronze += v0;
 *     else if (v1 > v0)             bronze += v1;
 *     else                          bronze += v2;
 *
 * With `v0 = v1 = 3` and `v2 = 1` — three medals on Hard *and* Medium, one on
 * Easy — the first test fails on `3 > 3`, the second fails likewise, and it
 * falls through to `v2`, reporting 1 where the best is 3. It is reachable by
 * any player who clears on Hard and later replays on Easy for a worse score,
 * because `recordLevelResult` only ever raises a slot.
 *
 * Corrected here rather than reproduced. It is display-only, but the level grid
 * shows `getLevelValues`, so reproducing it would make two screens disagree
 * about the same player's medals — worse than the infidelity. Same call as the
 * `:1716` negation fix.
 *
 * This is the third copy of one rule in this file's neighbourhood: the named
 * `getLevelValues` (`:212`, reading the earned table), the inline world-button
 * chain (`:1531`, reading the visible table, with the tie bug), and the
 * `getTotalValues` sum (`:1571`). Grepping the name finds one of the three.
 */
export function worldMedalTiers(
  view: ProgressView,
  world: number,
): { bronze: number; silver: number; gold: number } {
  const levels = levelsInWorld(world);
  let bronze = 0;
  let silver = 0;
  let gold = 0;

  for (let level = 1; level <= levels; level += 1) {
    bronze += getLevelValues(view, world, level, 'Easy');
    silver += getLevelValues(view, world, level, 'Medium');
    gold += getLevelValues(view, world, level, 'Hard');
  }

  return { bronze, silver, gold };
}

/**
 * Every world with its unlock state and progress summary, in picker order.
 *
 * Deliberately takes no difficulty, unlike `levelUnlockStates`. The level grid
 * shows one medal count for the chosen difficulty; a world button shows all
 * three tiers at once (`:1571-1573`), so a difficulty here would be meaningless.
 *
 * The AS3 shows nothing at all for a locked world — number, progress and all
 * three tallies are blanked (`:1520-1524`). The counts are still computed here
 * so the caller decides what to hide; a locked world's numbers are not secret,
 * they are simply zero until something in it is played.
 */
export function worldUnlockStates(view: ProgressView): WorldUnlockState[] {
  return LEVELS.map((levels, index) => {
    const world = index + 1;
    const totalLevels = levels.length;

    let levelsCompleted = 0;
    for (let level = 1; level <= totalLevels; level += 1) {
      if (isLevelCleared(view, world, level)) levelsCompleted += 1;
    }

    return {
      world,
      name: Worlds[index] ?? `World ${world}`,
      unlocked: isWorldUnlocked(view, world),
      totalLevels,
      levelsCompleted,
      // `:1563-1568`. Unlocks are strictly sequential, so completed levels are
      // always a prefix and this is exactly the unlock frontier.
      frontier: Math.min(levelsCompleted + 1, totalLevels),
      ...worldMedalTiers(view, world),
    };
  });
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

  // Both gates, not just the level one. `isLevelUnlocked(view, 5, 1)` is true
  // on a fresh save because level 1 always is, so without this a stale or
  // forged event for 5-1 would start a world the player has never reached.
  // That was unreachable while the port pinned itself to world 1; the picker
  // is what makes it a real request.
  return (
    isWorldUnlocked(view, request.world) &&
    isLevelUnlocked(view, request.world, request.level)
  );
}

/** One level's row in the grid. */
export interface LevelUnlockState {
  level: number;
  mode: LevelMode;
  cleared: boolean;
  unlocked: boolean;
  /**
   * Medals earned, 0-3, as seen from the current difficulty.
   *
   * `getLevelValues` applies the cascade — clearing a level on a harder setting
   * satisfies every easier one, so Easy sees the best of all three slots,
   * Medium the best of the first two, Hard only the first. That is why the row
   * carries a *value* and not just `cleared`: the same level shows 3 on Easy
   * and 0 on Hard until it has been beaten on Hard.
   *
   * **Not what colours the medals** — see `medals` below, and `medalTiers.ts`
   * for why the AS3 does not consult the difficulty for those at all.
   */
  value: number;
  /**
   * One entry per medal shown, best tier first — `medalTiers`.
   *
   * Separate from `value` because they answer different questions: `value` is
   * "how far are you at the setting you have chosen", which the tally line and
   * the accessible name want; this is "what does the tile draw", which
   * `:849-910` derives from all three tiers at once and never from the
   * selected difficulty.
   */
  medals: MedalTier[];
}

/**
 * Every level in a world with its unlock state, in grid order.
 *
 * The grid's shape lives here rather than in the scene so the scene assembles
 * nothing — the previous version built these rows by hand and inlined the
 * unlock rule while doing it, which is how the fourth copy got there.
 *
 * `difficulty` decides what `value` shows, not what `unlocked` means: the AS3
 * gates on any of the three slots (`:842` tests all of them), so a level opened
 * on Easy stays open when the player switches to Hard even though its medal
 * count drops to zero. Keeping both facts on the row is what stops a caller
 * inferring one from the other.
 *
 * An unknown world yields an empty list rather than throwing: a blank grid is a
 * better failure than a crashed screen.
 */
/**
 * @param display the table the **medal counts** are read from, when it differs
 * from the one the gates are read from.
 *
 * This is the visible/earned split — `ScreenLevelSelect.as:841` reads the
 * visible table for both. **This port deliberately splits them**: the gates
 * stay on `view` (earned) and only the displayed medals lag, because
 * `GameplayScene.ts:980` starts a level from `ui:start-game` with no unlock
 * check, so a gate that lagged would disagree with the results screen's
 * Next-level button. See `levels/progressReveal.ts` and the audit.
 *
 * Defaults to `view`, so a caller without a reveal gets the earned counts and
 * nothing changes.
 */
export function levelUnlockStates(
  view: ProgressView,
  world: number,
  difficulty: Difficulty,
  display: ProgressView = view,
): LevelUnlockState[] {
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
      // The only fields that lag — see `display` above.
      value: getLevelValues(display, world, level, difficulty),
      medals: medalTiers(display[world - 1]?.[level - 1] ?? [0, 0, 0]),
    };
  });
}
