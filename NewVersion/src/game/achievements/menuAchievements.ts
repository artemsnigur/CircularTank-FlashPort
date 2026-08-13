/**
 * Achievements earned outside a level — the shop, mainly.
 *
 * ── Why this exists, and that it is a divergence ──────────────────────────
 * **The original never pops these.** `PartAchievements` — the popup layer — is
 * constructed in exactly one place, `ScreenGame.as:385`, and only while a level
 * is running. `ScreenUpgrades.removed:663` calls `updateAchievements()` when you
 * *leave* the shop, which records and saves the result and discards the returned
 * list. So an achievement earned by buying an upgrade is banked silently and
 * never announced.
 *
 * This port announces it. That is a deliberate improvement — a reward the player
 * cannot see is a reward lost — and it is recorded in `docs/AUDIT-2026-07.md`.
 *
 * ── Evaluated on every purchase, not on leaving ───────────────────────────
 * The AS3's hook is the screen's `removed`. Doing the same here would hold the
 * toast until the player walked out of the shop, which is the delay this exists
 * to remove. Evaluation is a walk over ~36 specs against values already in
 * memory, so per-click is affordable.
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
