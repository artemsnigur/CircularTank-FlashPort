/**
 * How many medals a finished level awards — `ScreenStatus.as:246-257`.
 *
 * ── The whole rule is remaining HP ────────────────────────────────────────
 *     hp >= 95  ->  3
 *     hp >= 75  ->  2
 *     hp >= 1   ->  1
 *     otherwise ->  0
 *
 * Out of `TANK_MAX_HP`, which is 100 in both the original and the port, so the
 * thresholds port as literals rather than as fractions. Nothing else feeds it:
 * not time, not kills, not accuracy, not difficulty. The difficulty decides
 * *which slot* the count is written to (`recordLevelResult`), never the count.
 *
 * ── Why this replaced `won ? 1 : 0` ───────────────────────────────────────
 * The port awarded exactly one medal for every win. That is a legal value, so
 * nothing looked broken — the level unlocked, the grid filled in, the medal
 * appeared. But it caps a perfect run at a third of its worth, and **15 of the
 * 36 achievements are medal-count thresholds** (60, 150 and 450 across five
 * level modes), so all fifteen were reachable only at a third of the intended
 * rate.
 *
 * `won` is no longer an input to the count at all: a loss ends with `hp === 0`,
 * which this already maps to 0. Keeping both would have been two sources of
 * truth for the same fact.
 */

/** Medals for a win with no damage taken — `ScreenStatus.as:248`. */
export const MEDAL_HP_GOLD = 95;
/** Medals for a win at high health — `:252`. */
export const MEDAL_HP_SILVER = 75;
/** Any survival at all scores — `:256`. */
export const MEDAL_HP_BRONZE = 1;

/**
 * Medals earned for finishing with `hp` health remaining.
 *
 * Negative or fractional HP is handled by the same comparisons the AS3 uses;
 * the port clamps HP to 0 on death, so the below-zero case should be
 * unreachable, and it maps to 0 either way.
 */
export function medalsForHp(hp: number): number {
  if (hp >= MEDAL_HP_GOLD) return 3;
  if (hp >= MEDAL_HP_SILVER) return 2;
  if (hp >= MEDAL_HP_BRONZE) return 1;
  return 0;
}
