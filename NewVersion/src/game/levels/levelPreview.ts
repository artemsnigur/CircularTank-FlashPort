/**
 * What the Next Level button's hover panel shows — the `"AllEnemiesInLevel"`
 * branch of `PartInfoText.changeText` (`:222-295`), plus the summary text
 * `ButtonNextLevel.as:335` composes for it.
 *
 * ── The row structure, and that it already matches ────────────────────────
 * The AS3 reads `ScreenGame.worldModels[world * 3 - 3][level - 1]`, a flat row
 * shaped `[totalEnemies, spawnInterval, "Name<lvl>", count, "Name<lvl>", count,
 * …]`, and walks `(length - 2) / 2` pairs from index 2 — name at `i * 2 + 2`,
 * count at `i * 2 + 3` — splitting the trailing character off each name as the
 * enemy level (`:238-248`).
 *
 * `LevelSpec.enemies` is that walk, already done: `gen-levels.mjs:113-121`
 * iterates `for (let i = 2; i + 1 < cells.length; i += 2)` and stores
 * `{ type: raw.slice(0, -1), level: raw.slice(-1), count: Number(cells[i+1]) }`
 * in source order. Same start index, same stride, same split, same order — so
 * this module reads `spec.enemies` directly rather than re-deriving anything,
 * and `levelPreview.test.ts` pins the equivalence against a named level.
 */
import { getLevel } from './levelData';
import type { LevelSpec } from './levelData';
import { getDifficultyProfile } from '../config/difficultyMultipliers';
import { enemyShape } from '../entities/enemyArt';
import { resistanceBadges } from '../enemies/resistanceIcons';
import { ENEMY_STATS } from '../enemies/enemyStatsData';
import type { ResistanceBadge } from '../enemies/resistanceIcons';
import type { Difficulty } from '../config/constants';

/** `:243-247` — the trailing character, as the panel prints it. */
export function levelLabel(level: string): string {
  return level === 'B' ? 'BOSS' : `LVL ${level}`;
}

/**
 * `getBossCount` (`:314-328`) — how many of a level's enemies are bosses.
 *
 * Sums the *counts* of the boss pairs, not the number of boss pairs: a level
 * with one `"BasicB"` row of count 3 has a boss count of 3.
 */
export function bossCount(spec: LevelSpec): number {
  return spec.enemies
    .filter((e) => e.level === 'B')
    .reduce((n, e) => n + e.count, 0);
}

/**
 * `getEnemyAmountArray` (`:94-147`) — per-type counts for the `"N X"` label.
 *
 * ── The difficulty redistribution is dead arithmetic, and that is checked ──
 * The AS3 body is a ratio walk: it raises the level's total by
 * `multiplierAmount<Difficulty>`, then hands out the *extra* enemies one at a
 * time to whichever type currently sits furthest below its original share
 * (`:121-141`). It is the most intricate thing in this branch.
 *
 * It cannot run. `DifficultyMultipliers.as:6` and `:8` both set
 * `multiplierAmountMedium` and `multiplierAmountHard` to **1**, so
 * `getTotalEnemyAmount` (`:341-360`) returns the unchanged total and the
 * distribution loop's bound — `enemyModelCurrent[0] - normalEnemyAmount` — is
 * exactly zero on every one of the 405 levels at every difficulty. The Easy
 * path returns the raw counts outright (`:145`), and the Medium/Hard path
 * with a zero-iteration loop returns the same list (plus one trailing
 * `undefined` from `:137-142` reading past the row, which nothing indexes).
 *
 * So all three difficulties yield the raw per-type counts, and that is what
 * this returns. **The redistribution is deliberately not ported**: it is ~15
 * lines of arithmetic whose output could not be checked against the original,
 * because the original never executes it either.
 *
 * `levelPreview.test.ts` pins `amount === 1` against those two AS3 lines. If
 * anyone ever changes a multiplier, that test fails and names this function —
 * which is the point of writing the assumption down as a check rather than a
 * comment.
 *
 * **`countdownPanel.objectiveText` makes the opposite call on the same
 * constant, and both are right.** There the rule is one `round(total * m)`,
 * correct at any multiplier, so it applies it and says "the multiplier is the
 * rule, and 1 is data". Here the rule is a fifteen-line redistribution that
 * has never executed, so porting it would mean shipping arithmetic that could
 * not be checked against the original. Cheap and verifiable: implement it.
 * Expensive and unobservable: refuse loudly instead of guessing.
 */
export function enemyAmounts(spec: LevelSpec, difficulty: Difficulty): number[] {
  const { amount } = getDifficultyProfile(difficulty);
  if (amount !== 1) {
    throw new Error(
      `enemyAmounts: multiplierAmount is ${amount}, not 1 — ` +
        "PartInfoText.as:121-141's redistribution is unported and would now be reachable.",
    );
  }
  return spec.enemies.map((e) => e.count);
}

/** `:255-261` — a share of the level, to one decimal place. */
function percent(count: number, of: number): string {
  if (of <= 0) return '0%';
  return `${Math.round((count / of) * 1000) / 10}%`;
}

/**
 * The amount label for one row — `:251-263`, four branches.
 *
 * Transcribed as four rather than collapsed: the Boss-mode pair looks like it
 * could fold into the Flag branch, and it cannot — Flag divides by the level's
 * whole total while Boss mode divides by the total **less the bosses**, and the
 * boss row itself is a count rather than a share.
 */
export function amountLabel(
  spec: LevelSpec,
  index: number,
  difficulty: Difficulty,
): string {
  const enemy = spec.enemies[index];

  // `:251` — Normal, Tower and Defense share one branch.
  if (spec.mode === 'Normal' || spec.mode === 'Tower' || spec.mode === 'Defense') {
    return `${enemyAmounts(spec, difficulty)[index]} X`;
  }

  // `:255` — a Flag level's share is of the whole roster.
  if (spec.mode === 'Flag') return percent(enemy.count, spec.totalEnemies);

  // `:259-262` — Boss mode. The bosses are excluded from the denominator, and
  // a boss row prints its count instead of a share.
  if (enemy.level === 'B') return `${enemy.count} X`;
  return percent(enemy.count, spec.totalEnemies - bossCount(spec));
}

/** Drops the `ScreenEnemies`-only "none" badge; see the call site. */
function withoutPlaceholder(badges: ResistanceBadge[]): ResistanceBadge[] {
  return badges.filter((b) => b.damageType !== null);
}

/** One enemy line in the panel. */
export interface LevelPreviewRow {
  type: string;
  /** `"1"`, `"2"`, … or `"B"`. */
  level: string;
  isBoss: boolean;
  /** `"LVL 2"` or `"BOSS"`. */
  levelLabel: string;
  /** `"12 X"` or `"34.5%"`. */
  amountLabel: string;
  /**
   * SWF shape id for the enemy's art — `:271` builds `Enemy<Type>` by name and
   * the boss variant is a separate clip. `undefined` only for a type with no
   * mapping, which `levelPreview.test.ts` asserts never happens across all 405
   * levels rather than leaving it to be discovered as a hole in the panel.
   */
  shape: number | undefined;
  /**
   * `:285` — `addStrengthsAndWeaknessIcons(enemyType, "Small", …)`, the same
   * badges the bestiary draws, at 0.75 scale.
   *
   * **Note these use `IconStrongWeak2` (symbol 1018), not the bestiary's
   * `IconStrongWeak` (1033)** — `addStrengthsAndWeaknessIcons` constructs 1018
   * unconditionally (`:404`, `:456`). The two clips differ on six of sixteen
   * glyphs, so this is the site that finally draws the half T100 synced and
   * left undrawn.
   *
   * Unlike the bestiary these are **not** gated on having met the enemy: the
   * AS3 shows them here regardless, which is the whole point of a preview.
   */
  strengths: ResistanceBadge[];
  weaknesses: ResistanceBadge[];
}

export interface LevelPreview {
  /** `ButtonNextLevel.as:335` — the six summary lines, already joined. */
  summary: string;
  rows: LevelPreviewRow[];
}

/**
 * `ButtonNextLevel.as:299-336` and the panel branch it feeds.
 *
 * Returns `null` when there is no next level. The AS3 sets `nextLevel = 0`
 * at `:207` and calls `changeText` with it anyway, which indexes
 * `worldModels[...][-1]` — this port sends `nextLevel: null` from the scene
 * and hides the control instead, so the branch is unreachable here. Recorded
 * rather than reproduced.
 */
export function levelPreview(
  world: number,
  level: number,
  difficulty: Difficulty,
  objective: string,
  upgradeLimit: number,
): LevelPreview | null {
  const spec = getLevel(world, level);
  if (!spec) return null;

  const summary = [
    `World: ${world}`,
    `Level: ${level}`,
    `Mode: ${spec.mode}`,
    `Difficulty: ${difficulty}`,
    `Upgrade Limit: ${upgradeLimit}`,
    `Objective: ${objective}`,
  ].join('\n');

  const rows = spec.enemies.map((enemy, i) => {
    const isBoss = enemy.level === 'B';
    const stats = ENEMY_STATS[enemy.type];
    return {
      type: enemy.type,
      level: enemy.level,
      isBoss,
      levelLabel: levelLabel(enemy.level),
      amountLabel: amountLabel(spec, i, difficulty),
      shape: enemyShape(enemy.type, isBoss),
      // **No "none" placeholder here.** That badge is added by
      // `ScreenEnemies.as:385-391`, which is the *screen's* code;
      // `addStrengthsAndWeaknessIcons` itself loops the arrays and adds
      // nothing when they are empty (`:403`, `:464`). So a type with no
      // resistances contributes no icons to this panel, where it shows a
      // "none" badge on the bestiary. Same data, two deliberate renderings.
      strengths: withoutPlaceholder(resistanceBadges(stats?.strengths ?? [], 'strength')),
      weaknesses: withoutPlaceholder(resistanceBadges(stats?.weaknesses ?? [], 'weakness')),
    };
  });

  return { summary, rows };
}
