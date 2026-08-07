import { describe, expect, it } from 'vitest';

import { pushBecomesVisible, queuedBehind, showingToast } from './toastQueue';
import type { AchievementToast } from '../../state/gameStore';

const toast = (id: string): AchievementToast => ({ id, title: id, at: 0 });

describe('one toast shows at a time', () => {
  /**
   * `:265` dequeues only when nothing is showing, and `:116-117` takes the
   * head. Six earned together are six *sequential* toasts.
   *
   * **This is the case a naive fix passes and this one does not.** Offsetting
   * the second toast, or capping the stack at two or three, still leaves more
   * than one on screen — so the assertion is on the *count showing*, driven at
   * one, two and six, not on where any of them sits.
   */
  it('shows exactly one however many are queued', () => {
    for (const size of [1, 2, 6]) {
      const queue = Array.from({ length: size }, (_, i) => toast(`a${i}`));
      const showing = showingToast(queue);

      expect(showing, `${size} queued`).not.toBeNull();
      expect(showing!.id, `${size} queued`).toBe('a0');
      // The counterpart: everything else is *waiting*, not shown. Without this
      // "return the head" would pass while the component still rendered all six.
      expect(queuedBehind(queue), `${size} queued`).toHaveLength(size - 1);
    }
  });

  it('shows nothing when the queue is empty', () => {
    expect(showingToast([])).toBeNull();
    expect(queuedBehind([])).toHaveLength(0);
  });

  /**
   * Dismissing the head promotes the next — the port's equivalent of
   * `achievementCurrent` returning to `""`.
   *
   * Driven across the whole drain so a fix that promotes once and then stalls
   * fails. A cap-based fix has no promotion at all and never reaches `a5`.
   */
  it('drains the whole queue one at a time, in order', () => {
    let queue = ['a0', 'a1', 'a2', 'a3', 'a4', 'a5'].map(toast);
    const seen: string[] = [];

    while (queue.length > 0) {
      const showing = showingToast(queue);
      seen.push(showing!.id);
      queue = queuedBehind(queue) as AchievementToast[];
    }

    expect(seen).toEqual(['a0', 'a1', 'a2', 'a3', 'a4', 'a5']);
  });
});

describe('the Achievement sound follows the toast, not the unlock', () => {
  /**
   * `:120` sits inside `showAchievementFromQueue`, so a toast sounds when it
   * *starts showing*.
   *
   * Pinned as a pair on one sequence: the first arrival sounds because it goes
   * straight to the head; the second does not, because it lands behind. "Always
   * sounds" and "never sounds" each satisfy one half alone.
   */
  it('sounds an arrival that shows immediately and not one that queues', () => {
    const empty: AchievementToast[] = [];
    const occupied = [toast('a0')];

    expect(pushBecomesVisible(empty), 'first arrival').toBe(true);
    expect(pushBecomesVisible(occupied), 'arrives behind another').toBe(false);
  });
});
