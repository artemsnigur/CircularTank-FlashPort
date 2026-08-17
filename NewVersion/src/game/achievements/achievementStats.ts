/**
 * The achievements screen's right-hand window — `ScreenAchievements.as:725-780`.
 *
 * Two things sit there and nothing else: the two running totals at the top
 * (`:725`, `:726`) and a 5x3 medal matrix below them (`:727` onward).
 *
 * ── The matrix is modes down and tiers across ─────────────────────────────
 * `:729`, `:735`, `:741` place the bronze, silver and gold icons of one mode at
 * x 426, 504 and 582 — the same y — and the next mode steps y by 32. So a
 * *row* is one mode at three tiers, which is the opposite of the level tile's
 * medals, where a row is one level's three slots.
 *
 * The counts come from `getTotalValues(type, tier)`, the same function the 15
 * `NumberArray` achievements are measured against — so the numbers on this
 * panel and the badges beside it cannot disagree.
 *
 * **Frames 1, 2, 3 are bronze, silver, gold** (`:730`, `:733`, `:736`). That is
 * the reverse of the values triple's slot order, where index 0 is Hard/gold —
 * an easy thing to transcribe backwards, and the reason the order is stated in
 * one place here rather than at each call.
 */
import { getTotalValues, TOTALS_TYPE_TO_MODE } from '../levels/levelProgress';
import type { ProgressTable } from '../levels/levelProgress';
import type { LevelMode } from '../levels/levelData';

/** Bronze, silver, gold — `gotoAndStop(1 | 2 | 3)`. */
export const MEDAL_TIERS = ['bronze', 'silver', 'gold'] as const;
export type MedalTierName = (typeof MEDAL_TIERS)[number];

/**
 * Which difficulty each tier counts, and it is not the obvious mapping.
 *
 * `getTotalValues(type, 1 | 2 | 3)` takes the AS3's difficulty *rank* — Easy 1,
 * Medium 2, Hard 3 (`DIFFICULTY_RANK`) — and the icon frames run bronze, silver,
 * gold over the same 1, 2, 3. So bronze is the Easy tally and gold the Hard
 * one, which reads backwards from the level tiles' `[hard, medium, easy]`
 * triple and is exactly the sort of thing that gets flipped in transcription.
 */
const TIER_DIFFICULTY = {
  bronze: 'Easy',
  silver: 'Medium',
  gold: 'Hard',
} as const;

/** One mode's row: the mode's icon shape and its three tallies. */
export interface MedalRow {
  /** `Stars`, `Flags`, `Towers`, `Shields`, `Bosses` — the AS3's own names. */
  type: string;
  /** What `LevelModeIcon` draws for it. */
  mode: LevelMode;
  counts: Record<MedalTierName, number>;
}

export interface AchievementStats {
  enemyKills: number;
  moneyEarned: number;
  /** Five rows, in the order the AS3 stacks them down the panel. */
  medals: MedalRow[];
}

/**
 * The panel's contents, from a progress table and the two running totals.
 *
 * A pure projection so the arithmetic is testable without a scene — the same
 * reason `buildAchievementListing` is one.
 */
export function buildAchievementStats(
  progress: ProgressTable,
  totals: { enemyKills: number; moneyEarned: number },
): AchievementStats {
  // `:727` onward places Stars, Flags, Towers, Shields, Bosses in this order,
  // stepping y by 32 each time. `TOTALS_TYPE_TO_MODE` already carries the
  // type -> mode mapping the level tables use.
  const order = ['Stars', 'Flags', 'Towers', 'Shields', 'Bosses'] as const;

  return {
    enemyKills: totals.enemyKills,
    moneyEarned: totals.moneyEarned,
    medals: order.map((type) => ({
      type,
      mode: TOTALS_TYPE_TO_MODE[type],
      counts: {
        bronze: getTotalValues(progress, type, TIER_DIFFICULTY.bronze),
        silver: getTotalValues(progress, type, TIER_DIFFICULTY.silver),
        gold: getTotalValues(progress, type, TIER_DIFFICULTY.gold),
      },
    })),
  };
}
