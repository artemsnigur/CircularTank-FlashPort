/**
 * The level guide's state — `LevelGuide.as:66-139`.
 *
 * A compact widget on the **shop** screen (`ScreenUpgrades.as:324`, added at
 * `:631-634`) showing which level you are heading into: `World N` / `Level M`,
 * four arrows, three presets, an info tooltip and an auto-select toggle. This
 * module is the part with no pixels in it.
 *
 * ── Read-only, on the earned table ────────────────────────────────────────
 * Every function here *reads* progress and none of them writes it. The AS3
 * reads `ScreenLevelSelect.worldsValuesArrays` (`:97`, `:109`, `:111`) — the
 * **earned** table, not `worldsValuesVisibleArrays` — so this sits on the same
 * side of the A6 split as `isLevelCleared`/`isLevelUnlocked` and introduces no
 * new decision about the reveal. `ProgressTable` is taken by value and returned
 * results are plain data; nothing in this file can unlock a level.
 *
 * ── The bounds are counts, not predecessor tests ──────────────────────────
 * **This is the trap, and it is the reason this module exists rather than the
 * arrows calling `isLevelUnlocked`.**
 *
 *   `isLevelUnlocked(w, l)`  is `isLevelCleared(w, l - 1)` — a *local* test of
 *                            the level before this one.
 *   `maxLevelFor(w)`         is `1 + count of cleared levels in the prefix` —
 *                            a *tally* over the whole world (`:109-116`).
 *
 * On a contiguous progress table these agree, which is exactly what makes the
 * substitution tempting and the bug invisible. They come apart the moment a
 * level is cleared out of order — which this port can already produce, because
 * the dev level jump starts any level directly. Clearing 1-5 on a fresh profile
 * gives `maxLevel = 2` here (one cleared level in the prefix) while
 * `isLevelUnlocked` would call 1-6 open. `levelGuide.test.ts` drives that exact
 * table and requires the count.
 */
import { isLevelCleared } from './levelProgress';
import { LEVELS } from './levelData';
import { SELECTABLE_WORLDS } from './levelUnlock';
import type { ProgressTable, LevelRef } from './levelProgress';

/** `:21` — which rule picks the selection. */
export type LevelGuideType = 'Previous' | 'Upcoming' | 'Last';

/** How far the arrows may travel. */
export interface LevelGuideBounds {
  maxWorld: number;
  maxLevel: number;
}

/** Levels in a world, from the level tables rather than a constant. */
function levelsInWorld(world: number): number {
  return LEVELS[world - 1]?.length ?? 0;
}

/**
 * `setMaxWorld` (`:84-103`) — 1, plus one for every world whose **last** level
 * is cleared.
 *
 * The loop runs `i` over `0 .. totalWorlds - 2` and tests
 * `worldsValuesArrays[i][totalLevelsArray[i] - 1]`, i.e. the final level of
 * world `i + 1`. So finishing a world's last level is what opens the next one
 * to the arrows — the same event `isWorldUnlocked` keys on, counted rather than
 * tested.
 */
export function maxWorldFor(progress: ProgressTable): number {
  let max = 1;
  // `totalWorlds - 1`: the last world has no successor to unlock.
  for (let world = 1; world <= SELECTABLE_WORLDS - 1; world += 1) {
    if (isLevelCleared(progress, world, levelsInWorld(world))) max += 1;
  }
  return max;
}

/**
 * `setMaxLevel(ofWorld)` (`:106-117`) — 1, plus one for every cleared level in
 * the world **except the last**.
 *
 * The exclusion is the loop bound `length - 1`, and it is why a fully cleared
 * world yields `maxLevel === levelsInWorld`, not one more: the last level has
 * nothing after it to unlock.
 *
 * A **count**, deliberately. See the header — substituting `isLevelUnlocked`
 * here is the defect this module is shaped to prevent.
 */
export function maxLevelFor(progress: ProgressTable, ofWorld: number): number {
  let max = 1;
  const total = levelsInWorld(ofWorld);
  for (let level = 1; level <= total - 1; level += 1) {
    if (isLevelCleared(progress, ofWorld, level)) max += 1;
  }
  return max;
}

/** What the last played level was, and whether it was won. */
export interface PreviousLevel {
  world: number;
  level: number;
  won: boolean;
}

/**
 * `getUpcomingWorldAndLevel` (`:66-82`) — the level after the one just played.
 *
 * Three things about it that a plausible rewrite gets wrong:
 *
 * 1. **A loss does not advance.** The guard requires `previousLevelWon`
 *    (`:69`), so losing 1-4 leaves the guide pointing at 1-4 — which the
 *    tooltip says out loud: *"If you didn't win the previous level, the level
 *    guide assumes you are going to play it again"* (`ButtonLevelGuideSelect.as:50`).
 * 2. **It will not advance past the bounds.** `upcomingWorld < maxWorld ||
 *    upcomingLevel < maxLevel` (`:69`) — at the frontier it stays put rather
 *    than pointing at a level the arrows cannot reach.
 * 3. **It rolls into the next world**, but only if there is one (`:76-80`).
 *
 * Takes the bounds as an argument rather than recomputing them: the AS3 reads
 * the statics, and `ButtonLevelGuideSelect.updateState` (`:101`) calls this
 * *without* refreshing them first, so which bounds are in force is a real
 * property of the call site and not an implementation detail to hide.
 */
export function upcomingWorldAndLevel(
  previous: PreviousLevel,
  bounds: LevelGuideBounds,
): LevelRef {
  let world = previous.world;
  let level = previous.level;

  const belowFrontier = world < bounds.maxWorld || level < bounds.maxLevel;
  if (belowFrontier && previous.won) {
    if (level < levelsInWorld(world)) {
      level += 1;
    } else if (world < SELECTABLE_WORLDS) {
      level = 1;
      world += 1;
    }
  }

  return { world, level };
}

/** Everything the widget draws. */
export interface LevelGuideState extends LevelGuideBounds {
  selectedWorld: number;
  selectedLevel: number;
}

/**
 * `updateVariables` (`:119-139`).
 *
 * **`setMaxLevel` is called with `maxWorld`, not with the selected world**
 * (`:122`) — so after any preset the level bound describes the furthest world,
 * whatever is selected. `ButtonLevelGuideArrow.changeValue` (`:206`, `:216`)
 * calls it with `selectedWorld` instead when the world arrows move. The two
 * callers genuinely disagree, and `levelGuide.test.ts` pins both rather than
 * picking whichever looks more sensible.
 */
export function levelGuideSelection(
  type: LevelGuideType,
  progress: ProgressTable,
  previous: PreviousLevel,
): LevelGuideState {
  const maxWorld = maxWorldFor(progress);
  const maxLevel = maxLevelFor(progress, maxWorld);
  const bounds = { maxWorld, maxLevel };

  if (type === 'Previous') {
    return { ...bounds, selectedWorld: previous.world, selectedLevel: previous.level };
  }
  if (type === 'Last') {
    return { ...bounds, selectedWorld: maxWorld, selectedLevel: maxLevel };
  }
  const upcoming = upcomingWorldAndLevel(previous, bounds);
  return { ...bounds, selectedWorld: upcoming.world, selectedLevel: upcoming.level };
}

/**
 * `ButtonLevelGuideArrow.changeValue` (`:196-237`) — one arrow press.
 *
 * Returns the new state, or the input unchanged when the arrow is at its bound.
 * A world step **resets the level to 1 and recomputes the level bound against
 * the newly selected world** (`:205-206`, `:214-215`) — which is the caller
 * that disagrees with `updateVariables`, noted above.
 */
export function stepLevelGuide(
  state: LevelGuideState,
  progress: ProgressTable,
  axis: 'World' | 'Level',
  direction: 'Left' | 'Right',
): LevelGuideState {
  const step = direction === 'Right' ? 1 : -1;

  if (axis === 'World') {
    const next = state.selectedWorld + step;
    if (next < 1 || next > state.maxWorld) return state;
    return {
      ...state,
      selectedWorld: next,
      selectedLevel: 1,
      maxLevel: maxLevelFor(progress, next),
    };
  }

  const next = state.selectedLevel + step;
  if (next < 1 || next > state.maxLevel) return state;
  return { ...state, selectedLevel: next };
}

/**
 * `ButtonLevelGuideArrow.updateState` (`:74-112`) — whether an arrow is live.
 *
 * Extracted so the button renders from a rule rather than restating the
 * comparison; the AS3 spells the same four tests out longhand.
 */
export function canStep(
  state: LevelGuideState,
  axis: 'World' | 'Level',
  direction: 'Left' | 'Right',
): boolean {
  if (axis === 'World') {
    return direction === 'Right'
      ? state.selectedWorld < state.maxWorld
      : state.selectedWorld > 1;
  }
  return direction === 'Right'
    ? state.selectedLevel < state.maxLevel
    : state.selectedLevel > 1;
}

/**
 * `ButtonLevelGuideSelect.updateState` (`:85-120`) — whether **this** preset
 * matches the current selection, so it can render as pressed.
 *
 * ── One predicate per button, not a winner ────────────────────────────────
 * The AS3's `if/else if` chain dispatches on `this.type` — each button asking
 * about *itself* — so it is three independent tests, not a priority order.
 * Two presets are lit simultaneously whenever they agree, which is the normal
 * state early on: on a fresh profile Previous, Upcoming and Last all point at
 * 1-1. A helper returning a single "active preset" would silently pick one and
 * leave the other buttons looking wrong.
 *
 * Compares the *selection* to what the preset would choose rather than
 * remembering which button was last clicked: the arrows move the selection away
 * from a preset without any button knowing, and the AS3 re-derives every frame.
 */
export function isPresetActive(
  state: LevelGuideState,
  previous: PreviousLevel,
  type: LevelGuideType,
): boolean {
  if (type === 'Previous') {
    return state.selectedWorld === previous.world && state.selectedLevel === previous.level;
  }
  if (type === 'Last') {
    return state.selectedWorld === state.maxWorld && state.selectedLevel === state.maxLevel;
  }
  const upcoming = upcomingWorldAndLevel(previous, state);
  return state.selectedWorld === upcoming.world && state.selectedLevel === upcoming.level;
}
