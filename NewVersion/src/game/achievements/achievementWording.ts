/**
 * Descriptions that no longer match what the port requires.
 *
 * ── Why this file exists ──────────────────────────────────────────────────
 * `achievementData.ts` is **generated** from `ScreenAchievements.as`, so the
 * strings in it are the original's. T214 deliberately dropped one of the
 * original's requirements, which left three of those strings describing a rule
 * the game no longer enforces — and a description that overstates what is
 * needed is worse than no description, because a player who reads it will not
 * attempt the thing they would actually be rewarded for.
 *
 * Editing the generated file would be undone by the next
 * `npm run achievements:data`, so the corrections live here and
 * `achievementListing` applies them. Same arrangement as `upgradeBlurbs.ts`,
 * and for the same reason.
 *
 * ── What changed, and why ─────────────────────────────────────────────────
 * `PartGameArea.as:2764` clears the four "clean run" flags when
 * `ScreenGame.hp < 95`, so the three weapon-choice achievements each also
 * demanded a near-flawless run. That is what "and get 3 medals" meant.
 *
 * **Measured, and it is not a reasonable ask**: on level 1-1, standing still
 * and firing, the tank goes from 100 hp to 94 in four seconds. Contact damage
 * is continuous, so surviving a whole Defense level within a 5-point budget is
 * close to impossible — the achievement was technically reachable and
 * practically not. The port now asks only what each title is about: the
 * weapons used.
 *
 * The rest of each string is the original's, verbatim.
 *
 * ── One of the three also changes mode (T215) ─────────────────────────────
 * `DefensiveBombs` now requires a **Tower** level where the AS3 asks for a
 * Defense one, by request. That is a rule change rather than a rewording, so
 * the string here says "tower level" — a description naming the wrong mode
 * would send a player to spend a level earning nothing.
 */

/** Ids whose generated description no longer matches the rule. */
export const REWORDED_ACHIEVEMENTS: Readonly<Record<string, string>> = Object.freeze({
  FlagNoWeapons: 'Win a flag level without using any weapons.',
  DefensiveBombs: 'Win a tower level by using the timed bomb cannon and no special weapons.',
  BossOnlySpecial: 'Win a boss level with 3 bosses, without using any primary weapons.',
});

/**
 * The description to show for an achievement.
 *
 * Falls through to the generated string, so an id with no correction here is
 * unaffected — which is all but three of the thirty-six.
 */
export function describeAchievement(id: string, generated: string): string {
  return REWORDED_ACHIEVEMENTS[id] ?? generated;
}
