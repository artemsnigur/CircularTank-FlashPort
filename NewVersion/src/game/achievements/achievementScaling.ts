/**
 * Medal thresholds rescaled for a 180-level campaign, and the ceiling that
 * makes them checkable.
 *
 * ── The problem ───────────────────────────────────────────────────────────
 * Fifteen achievements count medals earned in one mode, three medals to a
 * level, so each has a hard ceiling: `levels of that mode x 3`. The AS3's
 * thresholds were written for 90 levels of each mode (270 medals) and 45 Boss
 * levels (135). The redesign leaves 40 Normal, 40 Flag, 40 Defense, 40 Boss
 * and **20 Tower**, which caps four of them at 120 and Tower at 60.
 *
 * Five of the fifteen become mathematically unearnable at those numbers —
 * `Stars3`, `Flags3`, `Shields3`, `Towers2`, `Towers3` — and two more would
 * need a flawless run of every level in the mode.
 *
 * ── An override, because the data is the AS3 ──────────────────────────────
 * `achievementData.ts` is generated from `ScreenAchievements.as` and editing it
 * would be undone by the next `npm run achievements:data`. Same arrangement as
 * `levelSizeOverrides.ts` and `achievementWording.ts`: the generated file stays
 * the original's record, and the divergence lives here.
 *
 * ── The thresholds keep the original's *fractions* ────────────────────────
 * The AS3's three tiers sit at 2/9, 4/9 and 6/9 of their ceiling — 60/120/180
 * of 270, and 30/60/90 of 135, which are the same three fractions. That is the
 * property worth preserving rather than the absolute numbers: the top tier has
 * always meant "two thirds of everything", and it still does.
 *
 * Rounded to readable figures, because a threshold is shown to the player in
 * prose ("Earn 25 stars.") and 26.67 is not a target anyone aims at.
 *
 * ── The check is the point ────────────────────────────────────────────────
 * `achievementReachability.test.ts` is titled "every achievement is reachable"
 * and feeds the evaluator a fabricated total, so it proves the rule *fires* and
 * never asks whether the campaign can supply the number. `medalCeiling` is what
 * closes that: it counts the live campaign, so a future edit that halves a mode
 * fails a test rather than silently orphaning three achievements.
 */

import { LEVELS } from '../levels/levelData';
import { TOTALS_TYPE_TO_MODE } from '../levels/levelProgress';
import type { TotalsType } from '../levels/levelProgress';

/** Medals one level can award — three, on every mode. */
export const MEDALS_PER_LEVEL = 3;

/**
 * The AS3's own thresholds, kept as documentation. Nothing reads them at
 * runtime; `achievementScaling.test.ts` uses them to show the fractions this
 * table preserves.
 */
export const AS3_MEDAL_REQUIREMENTS: Readonly<Record<TotalsType, readonly number[]>> = {
  Stars: [60, 120, 180],
  Flags: [60, 120, 180],
  Towers: [60, 120, 180],
  Shields: [60, 120, 180],
  Bosses: [30, 60, 90],
};

/**
 * What the port asks for, by group and tier.
 *
 * Four groups share one ladder because they now share a ceiling — 40 levels
 * each. Tower is half that, and gets its own.
 */
export const SCALED_MEDAL_REQUIREMENTS: Readonly<Record<TotalsType, readonly number[]>> = {
  Stars: [25, 50, 80],
  Flags: [25, 50, 80],
  Towers: [15, 30, 40],
  Shields: [25, 50, 80],
  Bosses: [25, 50, 80],
};

/** `Stars2` -> `{ type: 'Stars', tier: 2 }`, or null for any other id. */
export function parseMedalId(id: string): { type: TotalsType; tier: number } | null {
  const match = /^([A-Za-z]+)([123])$/.exec(id);
  if (!match) return null;

  const type = match[1];
  if (!(type in TOTALS_TYPE_TO_MODE)) return null;
  return { type: type, tier: Number(match[2]) };
}

/**
 * The threshold this port requires, or the generated one for anything that is
 * not a medal achievement.
 *
 * Falls through rather than throwing: twenty-one of the thirty-six are Number
 * or Boolean achievements with nothing to rescale, and they must be unaffected.
 */
export function requirementFor(spec: { id: string; requirement: number }): number {
  const medal = parseMedalId(spec.id);
  if (!medal) return spec.requirement;
  return SCALED_MEDAL_REQUIREMENTS[medal.type][medal.tier - 1] ?? spec.requirement;
}

/**
 * The most medals the campaign can award in one group.
 *
 * **Counts the campaign as it is**, not a constant, which is the whole reason
 * this exists — `LEVELS` is what the game plays, so halving a mode moves this
 * and the test that reads it.
 */
export function medalCeiling(type: TotalsType): number {
  const mode = TOTALS_TYPE_TO_MODE[type];
  let levels = 0;
  for (const world of LEVELS) {
    for (const spec of world) if (spec.mode === mode) levels += 1;
  }
  return levels * MEDALS_PER_LEVEL;
}

/**
 * The description with its number brought in line.
 *
 * The generated strings read "Earn 60 stars.", so a threshold change that left
 * the prose alone would tell the player to earn more than the achievement
 * wants — the failure `achievementWording.ts` was written for, in the other
 * direction.
 *
 * A replace rather than a rebuild, so the rest of each string stays the
 * original's verbatim. `achievementScaling.test.ts` asserts that every one of
 * the fifteen actually contains its own number, which is what makes the
 * replace safe; a string that stopped naming it would fail there rather than
 * silently keeping the old figure.
 */
export function scaleDescription(id: string, generated: string, requirement: number): string {
  const medal = parseMedalId(id);
  if (!medal) return generated;

  const scaled = SCALED_MEDAL_REQUIREMENTS[medal.type][medal.tier - 1];
  if (scaled === undefined || scaled === requirement) return generated;

  return generated.replace(String(requirement), String(scaled));
}
