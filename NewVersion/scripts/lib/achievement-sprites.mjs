/**
 * The 36 per-achievement icon clips, by SWF symbol id.
 *
 * ── Derived from the AS3, not hand-listed ─────────────────────────────────
 * Every other `*-sprites.mjs` in this folder is a hand-kept list, because each
 * holds two to seven ids. This one would hold 36, and the mapping is entirely
 * mechanical: `AchievementKills1.as` carries `symbol="symbol1314"` and the
 * class name minus its prefix **is** the achievement id used everywhere else
 * (`achievementData.ts`, the save fields, `ScreenAchievements`). Copying 36
 * pairs by hand is 36 chances to transpose a digit into a picture of the wrong
 * achievement — which nothing downstream could catch, since every id resolves
 * to *a* valid clip.
 *
 * So it reads the `[Embed]` lines. `achievementArt.test.ts` reconciles the
 * result against `ACHIEVEMENTS` in both directions.
 *
 * ── `AchievementBox` is excluded, and is not an achievement ───────────────
 * There are 37 `Achievement*.as` files and 36 achievements. The extra is
 * `AchievementBox` (symbol 1324), the **toast popup's** box art — its only
 * consumer is `PartAchievements.as:32`, not `getDefinitionByName("Achievement" +
 * name)`. Nothing is named "Box", so it could never be reached that way.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Not an achievement — see the header. */
const NOT_AN_ACHIEVEMENT = new Set(['Box']);

/**
 * `{ [achievementId]: symbolId }` for all 36 icons.
 *
 * @param {string} sourceRoot path to `SWFimported`
 */
export function achievementSymbols(sourceRoot) {
  const dir = join(sourceRoot, 'scripts');
  const out = {};
  for (const file of readdirSync(dir)) {
    const named = /^Achievement(.+)\.as$/.exec(file);
    if (!named) continue;
    const id = named[1];
    if (NOT_AN_ACHIEVEMENT.has(id)) continue;
    const embed = /symbol="symbol(\d+)"/.exec(readFileSync(join(dir, file), 'utf8'));
    if (!embed) continue;
    out[id] = Number(embed[1]);
  }
  return out;
}
