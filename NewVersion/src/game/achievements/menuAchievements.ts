/**
 * Achievements earned outside a level — the shop, mainly.
 *
 * ── Why this exists, and that it is faithful ──────────────────────────────
 * **The original pops these too, and this docstring said the opposite until
 * T140.** The corrected reading, which is the one to trust:
 *
 *  - `ScreenUpgrades.as:635` builds a `PartAchievements` on the shop screen,
 *    gated on `achievementPopUp` — the same layer the game screen builds at
 *    `ScreenGame.as:385`. There are **two** construction sites, not one.
 *  - `PartAchievements.update` calls `moveUnseenToQueue()` **every frame**
 *    (`:216`), re-testing every unseen achievement through
 *    `ScreenAchievements.achievementCheck(name, true)` and queueing whatever now
 *    qualifies.
 *
 * So the original announces a shop-earned achievement on the frame the purchase
 * satisfies it. The port does the same on the click, which reaches the same
 * result for less work.
 *
 * `ScreenUpgrades.removed:663` calling `updateAchievements()` and discarding its
 * return is real, but it is the bank-on-exit step behind a popup that has
 * already fired — not evidence that nothing fires.
 *
 * ── What it cannot award ──────────────────────────────────────────────────
 * `achievementValueSource` takes an optional `level` record and the boolean
 * achievements — the in-level ones, "finish without taking damage" and so on —
 * read it; with no level they evaluate `false`. That is correct rather than a
 * limitation: those cannot be earned in a shop, and the level-end path still
 * evaluates them with a real record.
 */
import { achievementValueSource } from './achievementContext';
import type { PlayerProfile } from '../player/playerProfile';
import type { Difficulty } from '../config/constants';

/**
 * Re-evaluates every achievement against the profile as it stands now.
 *
 * Returns the ids newly earned, for the caller to announce. Mutates the
 * profile's achievement states, as the AS3's `updateAchievements` does; the
 * caller owns the save.
 *
 * **The totals are not touched.** `recordAchievements` takes a kills/money
 * delta because the level-end path has one; a purchase does not, so this passes
 * zeroes rather than inventing a number. Passing anything else here would
 * inflate the very totals the Kills and Money achievements read.
 */
export function evaluateMenuAchievements(
  profile: PlayerProfile,
  difficulty: Difficulty,
): string[] {
  return profile.recordAchievements(
    { enemyKills: 0, moneyEarned: 0 },
    achievementValueSource({
      totals: profile.achievements.totals,
      upgrades: profile.upgrades,
      progress: profile.progress,
      // No level: see the header. The in-level booleans evaluate false.
      level: null,
    }),
    difficulty,
  );
}
