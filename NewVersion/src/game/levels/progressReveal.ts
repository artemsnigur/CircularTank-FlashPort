/**
 * The level-select medal reveal — `ScreenLevelSelect.progressLevelButtons`
 * (`:518-545`) and the two `Unlock` pushes at `:768` and `:1475`.
 *
 * ── What is being revealed ────────────────────────────────────────────────
 * Two tables: `worldsValuesArrays` (earned) and `worldsValuesVisibleArrays` (a
 * session-only clone that lags it). `ScreenStatus.as:356` snapshots visible from
 * earned *before* `:357-359` raises the slot, so after a win the pair differs by
 * exactly that result, and this animates the difference away.
 *
 * ── Why the port keeps the unlock rules on the earned table ───────────────
 * **A deliberate divergence, and the reason is a defect this would otherwise
 * introduce.** The AS3's unlock rules read the *visible* table (`:841`,
 * `:1518`), so a level opens when its reveal finishes. This port's results
 * screen has a Next-level button that goes straight to `ui:start-game`, which
 * `GameplayScene.ts:980` starts with **no unlock check at all** — only
 * `LevelSelectScene` gates. Reading visible in the gate would let the Next
 * button start a level that level select refuses, for as long as the reveal had
 * not been watched. Two routes, one save, disagreeing.
 *
 * So: **the reveal is presentation, and the gates stay on earned.** Recorded in
 * `docs/AUDIT-2026-07.md`, and pinned by the regression assertions in
 * `levelUnlock.test.ts` that predate this module.
 */

import { cloneProgress } from './levelProgress';
import type { LevelValues, ProgressTable } from './levelProgress';

const AS3_FPS = 30;

/**
 * `:1378` — one medal every **seven** frames.
 *
 * `progressTimer` ticks each frame (`:1377`) and an icon is placed only at
 * `1`, `8`, `15` — a stride of 7, confirmed by `progressTimerMax =
 * iconsToAdd * 7 - 7` at `:1371`.
 *
 * **Not one per frame.** `:532` sets `progressTimerOn` and nothing else, and
 * reading that as the pace gives 33ms a medal — a three-medal reveal over in a
 * tenth of a second, which is no animation at all. The stride is seven frames
 * away from the flag that starts it, which is exactly the kind of thing this
 * project keeps finding by reading past the line it first landed on.
 */
export const REVEAL_STEP_FRAMES = 7;
export const REVEAL_STEP_MS = (REVEAL_STEP_FRAMES / AS3_FPS) * 1000;

/** A level whose visible medals are behind its earned ones. */
export interface PendingReveal {
  world: number;
  level: number;
  /** Difficulty slot — index into `LevelValues`. */
  slot: number;
  from: number;
  to: number;
}

/**
 * Every slot where visible lags earned, in table order — `:523-529`.
 *
 * The AS3 walks levels then the three difficulty slots and takes the first
 * mismatch as `levelToChange`. This returns all of them so a caller can animate
 * them in order rather than one per pass; the order is identical.
 */
export function pendingReveals(
  earned: ProgressTable,
  visible: ProgressTable,
): PendingReveal[] {
  const pending: PendingReveal[] = [];

  earned.forEach((world, w) => {
    world.forEach((values, l) => {
      const shown = visible[w]?.[l] ?? ([0, 0, 0] as LevelValues);
      values.forEach((value, slot) => {
        // `:529` — any difference, in either direction. A lower earned value
        // cannot happen (`recordLevelResult` only ever raises), so this is
        // effectively "earned is ahead", but the AS3 tests inequality and so
        // does this.
        if (value !== shown[slot]) {
          pending.push({ world: w + 1, level: l + 1, slot, from: shown[slot], to: value });
        }
      });
    });
  });

  return pending;
}

/** True when nothing is left to animate — the AS3's `progressTimerOn` false. */
export function revealComplete(earned: ProgressTable, visible: ProgressTable): boolean {
  return pendingReveals(earned, visible).length === 0;
}

export interface RevealStep {
  visible: ProgressTable;
  /** The slot that moved, or null when nothing did. */
  moved: PendingReveal | null;
  /**
   * A level crossed from "no medals at all" to "some" on this step.
   *
   * `:768` and `:1475` push `Unlock` beside `spawnLockParticle` at exactly this
   * moment — the latch opening, not the medal counting up. A level going 1 -> 2
   * medals is not an unlock and must stay silent.
   */
  unlocked: boolean;
}

/**
 * Advances the visible table one step toward earned — `:531-545`.
 *
 * Returns a **new** table; the input is not mutated, so a caller holding the
 * previous state for comparison keeps it.
 */
export function stepReveal(earned: ProgressTable, visible: ProgressTable): RevealStep {
  const [next] = pendingReveals(earned, visible);
  if (!next) return { visible, moved: null, unlocked: false };

  const updated = cloneProgress(visible);
  const row = updated[next.world - 1][next.level - 1];
  const before = totalOf(row);

  // One medal at a time, toward the earned value — `:535`'s `valuesToAdd`
  // counts up rather than assigning, which is what makes it an animation.
  row[next.slot] += Math.sign(next.to - row[next.slot]);

  return {
    visible: updated,
    moved: { ...next, from: next.from, to: next.to },
    // The latch: this level had nothing and now has something.
    unlocked: before === 0 && totalOf(row) > 0,
  };
}

function totalOf(values: LevelValues): number {
  return values[0] + values[1] + values[2];
}
