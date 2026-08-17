/**
 * What level select opens on — `ScreenLevelSelect.as`'s entry rules.
 *
 * Two decisions, extracted from `LevelSelectScene` so they can be driven. Both
 * were wrong in the port and both were invisible to the suite, because a scene
 * needs a live Phaser game to construct and the only thing a test could reach
 * was the source text.
 *
 * ── The rules, and where they come from ───────────────────────────────────
 * **Which world.** `selectedWorld` is a static declared `= 1` (`:41`), and on
 * every entry `:383` re-points it at `LevelGuide.selectedWorld`. Then `:431`
 * branches: `if (selectedWorld != 0) changeToLevelsFunction()`. Since the level
 * guide's world is 1-based and never 0, **entry always opens a grid**. The
 * picker is somewhere you go, via `ButtonWorldSelect`.
 *
 * **Which level.** `selectFromLevelGuide` (`:583-595`) points the selection at
 * `LevelGuide.selectedLevel`, guarded by two conditions on `:587`: the guide's
 * world must be the open one, and that level must not be locked. If either
 * fails the AS3 leaves the selection alone.
 */
import { isWorldUnlocked, worldUnlockStates } from './levelUnlock';
import type { ProgressTable } from './levelProgress';

/** The AS3's `selectedWorld = 0` — the picker, not a world. */
export const PICKER = 0;

/**
 * The world whose grid opens — `:383`.
 *
 * @param guideWorld `LevelGuide.selectedWorld`, the same value the shop's
 *   guide widget steps.
 *
 * **Never returns `PICKER`.** That is the whole correction: the port used to
 * open the world list on every visit, justified as matching `removed()`
 * (`:630`) — which sets `selectedWorld = 0` only inside
 * `if (progressWorld != 0)`, the single case where a world was just finished.
 * A conditional read as unconditional made the exception the rule.
 */
export function entryWorld(progress: ProgressTable, guideWorld: number): number {
  if (guideWorld >= 1 && isWorldUnlocked(progress, guideWorld)) return guideWorld;

  /*
   * Clamped rather than trusted. The guide derives from progress and should
   * never point past it, but this is the one place a stale value would open a
   * grid the player cannot play — and returning `PICKER` here would reinstate
   * the bug for anyone who hit it.
   */
  const open = worldUnlockStates(progress).filter((w) => w.unlocked);
  return open.at(-1)?.world ?? 1;
}

/** The shape `guideLevelFor` needs from a published row. */
export interface UnlockedRow {
  level: number;
  unlocked: boolean;
}

/**
 * The level the grid opens pointing at, or `undefined` to leave it alone —
 * `selectFromLevelGuide` (`:583-595`).
 *
 * `undefined` is the AS3's own outcome rather than a missing value: `:587`
 * tests both conditions before assigning, and does nothing when either fails.
 */
export function guideLevelFor(
  openWorld: number,
  guide: { selectedWorld: number; selectedLevel: number },
  levels: readonly UnlockedRow[],
): number | undefined {
  if (guide.selectedWorld !== openWorld) return undefined;
  const row = levels.find((l) => l.level === guide.selectedLevel);
  return row?.unlocked === true ? guide.selectedLevel : undefined;
}
