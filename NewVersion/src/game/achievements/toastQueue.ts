/**
 * The in-game achievement toast — `PartAchievements.handleAchievementQueue`
 * (`:262-274`) and `showAchievementFromQueue` (`:112-132`).
 *
 * ── One at a time, drained from a queue ───────────────────────────────────
 * `:265` takes the next entry **only when nothing is currently showing**
 * (`achievementCurrent == ""`), and `:116-117` reads `achievementArrayQueue[0]`
 * and splices it off. So six achievements earned at once produce six *sequential*
 * toasts, never six on screen together.
 *
 * The port stacked them instead: `.hud-toasts` is a flex column, so they did
 * not overlap each other — but the column grew downward from the top centre
 * with no bound, straight through the centred results panel. That is the T74
 * finding, and its recorded description ("unbounded stacking with no offset")
 * was wrong in both halves: they *were* offset from one another, and the count
 * was not the mechanism. **Two centred overlays were.**
 *
 * ── Top right, not top centre ─────────────────────────────────────────────
 * `:125-126` sets `theXPos = 640 - achievementImage.width - 16` and
 * `theYPos = 16` — right-aligned with a 16px margin on the AS3's 640-wide
 * stage. A centred column was a port invention, and it is what put the toast on
 * top of the panel; a single top-right toast cannot reach a centred one.
 *
 * ── The sound belongs here ────────────────────────────────────────────────
 * `:120` pushes `Achievement` inside `showAchievementFromQueue` — bound to a
 * toast being *shown*, not to one being *earned*. It was recorded as blocked on
 * "the in-game toast queue"; this is that queue.
 */

import type { AchievementToast } from '../../state/gameStore';

/**
 * Which toast is on screen, and what is waiting — `:265`.
 *
 * The head of the list is the one showing. Modelled as a view over the queue
 * rather than as two fields so there is no way for them to disagree about
 * whether something is showing.
 */
export function showingToast(queue: readonly AchievementToast[]): AchievementToast | null {
  return queue.length > 0 ? queue[0] : null;
}

/** Everything behind the head — shown one after another, never together. */
export function queuedBehind(queue: readonly AchievementToast[]): readonly AchievementToast[] {
  return queue.slice(1);
}

/**
 * True when a newly-pushed toast should sound — `:120`.
 *
 * A toast sounds when it *starts showing*, so an arrival that goes straight to
 * the head sounds immediately and one that lands behind another does not sound
 * until it is promoted. Expressed as a predicate over the queue *before* the
 * push, because that is the only moment the distinction exists.
 */
export function pushBecomesVisible(queueBefore: readonly AchievementToast[]): boolean {
  return queueBefore.length === 0;
}
