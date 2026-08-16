/**
 * The post-level page stack — `ScreenStatus.as:405-432`.
 *
 * ── One screen, three page types ──────────────────────────────────────────
 * `pagesArray` starts as `["Standard"]` and has pages appended: one per
 * achievement newly earned, then one per enemy newly discovered.
 *
 *     pagesArray = ["Standard"]
 *     if (newAchievements.length) push each as "Achievement"    (:405-409)
 *     if (hp > 0 && newEnemies.length) push each as "Enemy"     (:410-429)
 *     pagesTotal = pages.length
 *
 * ── It opens on the LAST page, not the first ──────────────────────────────
 * `:431-432` sets both `pageCurrent` and `pageNext` to `pagesTotal`. So the
 * player lands on the newest reveal and pages **backwards** toward the results.
 * That is what "newest-first" means here — not that the list is reversed, but
 * that the cursor starts at the end of it.
 *
 * The order of the array is therefore still results → achievements → enemies,
 * and only the starting index is different. Reversing the array instead would
 * look identical on the first page and wrong on every other.
 *
 * ── There is no "past the last page" ──────────────────────────────────────
 * `ButtonSquarePage` hides the back arrow at page 1 and the forward arrow at
 * `pagesTotal` (`:175-191`), and `pagesTotal` is where the screen opens — so
 * the forward arrow is hidden on arrival and the only way to move is back.
 *
 * The exit buttons live on the Standard page alone (`:939-960` adds Play Again
 * and Next Level only when the page type is Standard), so **the player must
 * page back to the results to continue**. The reveals cannot be skipped past;
 * they can only be walked through. Nothing auto-advances and nothing responds
 * to a tap outside the arrows.
 */

import { getAchievement } from '../achievements/achievementState';
import { BESTIARY } from '../enemies/bestiaryData';


interface StandardPage {
  type: 'Standard';
}

export interface AchievementPage {
  type: 'Achievement';
  id: string;
  title: string;
  description: string;
  /** Whether the achievement records the difficulty it was earned on. */
  difficultyMatters: boolean;
}

/**
 * `Achievement.as:60-81` needs `earned` and the difficulty to compose its
 * tooltip and pick its icon frame. On this screen both are known: the page only
 * exists because the achievement was **just earned**, and the difficulty is the
 * one the level was played on — `ScreenStatus.as:986-998` reads
 * `ScreenLevelSelect.levelDifficulty` for exactly that.
 *
 * Derived at the render site rather than baked into the page, because the page
 * is built before the results overlay knows which difficulty it is showing.
 */
export const ACHIEVEMENT_PAGE_EARNED = true;

interface EnemyPage {
  type: 'Enemy';
  /** Display name as `discoverEnemies` produced it — "Scared Ghost", not "ScaredGhost". */
  displayName: string;
  description: string;
}

export type StatusPage = StandardPage | AchievementPage | EnemyPage;

export interface StatusPagesInput {
  /** Achievement ids, in the order `updateAchievements` earned them. */
  newAchievements: readonly string[];
  /** Enemy **display names**, as `discoverEnemies` returns them. */
  newEnemies: readonly string[];
}

/**
 * Looks an enemy up by the display name discovery produced.
 *
 * `discoverEnemies` already maps ids to display names — "ScaredGhost" becomes
 * "Scared Ghost" — and `BESTIARY` carries both, so this matches on
 * `displayName` rather than re-deriving it. Doing the mapping twice is how the
 * two spellings drift apart.
 */
function enemyPage(displayName: string): EnemyPage | null {
  const entry = BESTIARY.find((e) => e.displayName === displayName);
  if (!entry) return null;
  return { type: 'Enemy', displayName: entry.displayName, description: entry.description };
}

/**
 * Builds the stack, always with the results page first.
 *
 * An id or name with no matching spec is dropped rather than shown blank: a
 * page with no content is worse than one fewer page, and the only way to get
 * one is a data mismatch that a test should be catching instead.
 */
export function buildStatusPages(input: StatusPagesInput): StatusPage[] {
  const pages: StatusPage[] = [{ type: 'Standard' }];

  for (const id of input.newAchievements) {
    const spec = getAchievement(id);
    if (!spec) continue;
    pages.push({
      type: 'Achievement',
      id: spec.id,
      title: spec.title,
      // The AS3 shows `achievement<Name>Data[1]`, which is this string. Its
      // newlines are escaped in the generated data.
      description: spec.description.replace(/\\n/g, ' '),
      difficultyMatters: spec.difficultyMatters,
    });
  }

  for (const name of input.newEnemies) {
    const page = enemyPage(name);
    if (page) pages.push(page);
  }

  return pages;
}

/**
 * The page the screen opens on.
 *
 * ── DELIBERATE DIVERGENCE (T44) ───────────────────────────────────────────
 * **The AS3 opens on the *last* page** — `pageCurrent = pagesTotal` at `:431`
 * — so a player who has just unlocked an enemy lands on that reveal and pages
 * backwards to their score. This port opens on the **results**.
 *
 * The original's order is coherent for a game where the reveal *is* the
 * reward: you finished the level, here is the new thing. The port surfaces the
 * score as primary feedback instead, and moves the reveal to a pop-up over the
 * top with a summary line left behind on the results.
 *
 * Requested by the user after it misread as a bug twice in development — a
 * first clear shows "NEW ENEMY" where a score is expected, and it cost two
 * harness misdiagnoses. **The reveal content is untouched**; only where it
 * appears in the sequence has changed. Recorded in `docs/AUDIT-2026-07.md`.
 *
 * Kept as a named function rather than inlining `0`, so the divergence has a
 * place to be read and reverted.
 */
export function initialPageIndex(_pages: readonly StatusPage[]): number {
  return 0;
}

/**
 * The reveal pages, in order — everything after the results.
 *
 * The pop-up's content. Split out here rather than sliced at the call site so
 * the "results is page 0" assumption lives in one file with the divergence
 * note, not in the component.
 */
export function revealPages(pages: readonly StatusPage[]): readonly StatusPage[] {
  return pages.slice(1);
}

/**
 * One line summarising what the reveals contained, for the results footer.
 *
 * **The information has to survive the pop-up being dismissed.** In the AS3 it
 * could not be missed, because it was a page you had to walk through; as a
 * dismissible overlay it can be, so the results keep a record of it.
 *
 * Returns null when there is nothing to say, which is the common case.
 */
export function unlockSummary(pages: readonly StatusPage[]): string | null {
  const reveals = revealPages(pages);
  if (reveals.length === 0) return null;

  const names = reveals.map((page) =>
    page.type === 'Enemy' ? page.displayName : page.type === 'Achievement' ? page.title : '',
  );
  return `Unlocked: ${names.filter(Boolean).join(', ')}`;
}
