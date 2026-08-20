/**
 * What the achievements screen shows — `ScreenAchievements.as`.
 *
 * A pure projection of the profile's states onto `ACHIEVEMENTS`, so the
 * withholding rule and the counting can be driven without a scene. Same shape
 * as `buildBestiaryListing`, and for the same reason: React must never reach
 * into a scene, so the scene publishes a finished listing.
 *
 * ── The screen is a board, not a paged list ───────────────────────────────
 * Each spec carries `x`/`y` from the AS3's `achievementPlacementArray` — 36
 * entries laid on a fixed grid spanning x 55..355, y 120..400. There is no
 * paging to port; the original places every achievement at once. That was
 * worth checking rather than assuming a list, since a paged reimplementation
 * would look reasonable and lose the layout entirely.
 *
 * ── An unearned achievement still shows its description ───────────────────
 * Unlike the bestiary, which withholds what an unmet enemy is, the AS3's
 * achievements screen names the goal — that is the point of showing it. So
 * `description` is always populated and only `earned` varies.
 */

import { describeAchievement } from './achievementWording';
import { ACHIEVEMENTS } from './achievementData';
import type { AchievementSpec } from './achievementData';
import type { AchievementStates } from './achievementState';
import type { AchievementStats } from './achievementStats';

export interface AchievementEntry {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  /** True once the state is 0 or better — `-1` is the unearned default. */
  earned: boolean;
  /**
   * The difficulty it was earned on: 1 Easy, 2 Medium, 3 Hard; 0 when the
   * achievement does not record one. Null when unearned.
   */
  difficulty: number | null;
  /** Whether a higher difficulty can still improve it. */
  difficultyMatters: boolean;
}

export interface AchievementListing {
  entries: readonly AchievementEntry[];
  earnedCount: number;
  total: number;
  /**
   * The right-hand window — `:725-780`. Optional because the listing is also
   * built from states alone in tests and on the results screen, where there is
   * no progress table to total.
   */
  stats?: AchievementStats;
}

function toEntry(spec: AchievementSpec, state: number | undefined): AchievementEntry {
  // `-1` is the AS3's unearned default and `undefined` is a state the profile
  // has never written; both mean the same thing to a screen.
  const value = state ?? -1;
  const earned = value >= 0;

  return {
    id: spec.id,
    title: spec.title,
    description: describeAchievement(spec.id, spec.description),
    x: spec.x,
    y: spec.y,
    earned,
    difficulty: earned ? value : null,
    difficultyMatters: spec.difficultyMatters,
  };
}

export function buildAchievementListing(
  states: AchievementStates,
  stats?: AchievementStats,
): AchievementListing {
  const entries = ACHIEVEMENTS.map((spec) => toEntry(spec, states[spec.id]));
  return {
    entries,
    earnedCount: entries.filter((entry) => entry.earned).length,
    total: entries.length,
    stats,
  };
}
