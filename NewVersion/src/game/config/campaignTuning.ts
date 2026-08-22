/**
 * Campaign-wide density tuning — decision `D-3`.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * The redesign compresses 405 levels into 180
 * (`docs/CAMPAIGN-REDESIGN-PLAN.md`). Fewer levels carrying the same content
 * means each has to be worth more, so every level gets more enemies arriving
 * faster, and **Defense levels get their own, harsher rule**: they are the mode
 * that is already a continuous assault, and the one where "intense" is the
 * point rather than a side effect.
 *
 * ── A layer, not an edit to the level data ────────────────────────────────
 * Applied by `getLevel` on the way out, exactly where `levelSizeOverrides`
 * applies, and for the same three reasons:
 *
 *   - `LEVELS` stays a pure transcription of the AS3, so `levels:data:check`
 *     keeps working and the source of truth stays checkable;
 *   - it survives the campaign rewrite. Baking +20% into the 9x45 table would
 *     have to be unpicked and redone when the 180-level table lands;
 *   - **everything downstream agrees automatically.** The kill target, the
 *     level-select preview's per-type counts and the wave the scene actually
 *     spawns all read the same spec, so the HUD cannot say 30 while the arena
 *     holds 36.
 *
 * That last point is why this is not applied in `createWaveState`, which was
 * the smaller change: the wave would have been tuned and every readout of it
 * would not.
 *
 * ── Two things it deliberately does not touch ─────────────────────────────
 * **Boss counts.** A `B` entry passes through unscaled — `bossAmount` is a
 * design number set per level by the redesign's boss schedule, and 1.2x of
 * three bosses is four, which is a different fight from the one that was
 * specified.
 *
 * **Dev levels.** They come from `devLevelSpec`, not `getLevel`, so they are
 * untouched. A QA level exists to make one behaviour visible and does not want
 * a fifth more of it arriving 30% sooner.
 */

import type { LevelMode, LevelSpec } from '../levels/levelData';

/** The three levers, as multipliers on the level's own numbers. */
export interface ModeTuning {
  /**
   * Multiplies each non-boss entry's count, and therefore the kill target.
   */
  enemyCount: number;
  /**
   * Multiplies frames between spawns. **Below 1 is faster** — it scales a
   * duration, the same inversion `spawnRate` has in the difficulty profiles,
   * and the easiest field here to get backwards.
   */
  spawnInterval: number;
  /**
   * Multiplies enemy move speed **and acceleration**.
   *
   * Both, because `enemySpeed` in the difficulty profiles does both
   * (`ENEMY-DOSSIER.md`), and scaling top speed alone would leave enemies
   * taking just as long to get going — which is most of what "intense" means
   * on a Defense lane.
   */
  enemySpeed: number;
}

/** Unchanged, for the modes with no special rule of their own. */
const BASE: ModeTuning = {
  enemyCount: 1.2,
  spawnInterval: 0.7,
  enemySpeed: 1,
};

/**
 * Per-mode tuning. Every mode is listed, including the ones that take `BASE`
 * unchanged — a `Record<LevelMode, …>` rather than a lookup with a fallback,
 * so a new mode is a compile error rather than a silent default.
 */
export const CAMPAIGN_TUNING: Readonly<Record<LevelMode, ModeTuning>> = {
  Normal: BASE,
  Flag: BASE,
  Tower: BASE,
  Boss: BASE,
  /**
   * Defense: faster still, and the enemies themselves are quicker.
   *
   * `computeSpawnInterval` already drops the flat base term for this mode, so
   * a Defense level opens faster than any other before this multiplier is
   * applied at all — the 0.6 compounds with that rather than replacing it.
   */
  Defense: { enemyCount: 1.2, spawnInterval: 0.6, enemySpeed: 1.5 },
};

/** The tuning for a mode. */
export function tuningFor(mode: LevelMode): ModeTuning {
  return CAMPAIGN_TUNING[mode];
}

/**
 * A count scaled and kept sane.
 *
 * Rounded, and floored at 1: an entry that exists in the data is an enemy the
 * level is meant to field, and rounding a 1 down to 0 would silently delete a
 * type from a composition — including, on a Flag or Boss level, one the
 * balanced draw expects to be there.
 */
function scaleCount(count: number, by: number): number {
  return Math.max(1, Math.round(count * by));
}

/**
 * The level as it is played — counts and spawn interval tuned.
 *
 * `totalEnemies` is recomputed as the **sum of the scaled entries** rather than
 * scaled on its own. The two are equal on all 405 source rows (checked), and
 * scaling them independently would break that: rounding each count up and the
 * total down leaves a level whose kill target can never be reached, which is
 * unwinnable rather than merely wrong.
 */
export function tuneLevel(spec: LevelSpec): LevelSpec {
  const tuning = tuningFor(spec.mode);

  const enemies = spec.enemies.map((entry) =>
    entry.level === 'B' ? entry : { ...entry, count: scaleCount(entry.count, tuning.enemyCount) },
  );

  return {
    ...spec,
    enemies,
    totalEnemies: enemies.reduce((sum, entry) => sum + entry.count, 0),
    // Frames, so a fraction is meaningful and is not rounded here — the AS3's
    // own intervals are fractional too (45.53 on 1-1).
    spawnInterval: spec.spawnInterval * tuning.spawnInterval,
  };
}

/**
 * Every payout is worth this much more than the tables say — decision `D-3`.
 *
 * ── Why the campaign needs it ─────────────────────────────────────────────
 * Income scales with levels played, and the campaign went from 405 levels to
 * 180 while upgrade prices stayed where they were. **Measured** across every
 * level, assuming everything is killed and every flag collected:
 *
 *   | | total money |
 *   |---|---|
 *   | the AS3's 405 levels | 1,581,846 |
 *   | the 180-level campaign, untouched | 762,638 (0.48x) |
 *   | with this multiplier | 1,563,408 (0.99x) |
 *
 * So a player would have finished the redesign with under half the money the
 * original gave them, against the same shop. This closes it.
 *
 * ── A pinned number, not a derived one ────────────────────────────────────
 * It could be computed from the two tables at build time, and deliberately is
 * not: a multiplier that silently re-tunes itself whenever a level's roster
 * changes is one nobody can reason about, and a balance change would arrive
 * with no commit that made it. `campaignTuning.test.ts` measures the campaign
 * instead and fails if the totals drift more than 5% apart — so the number is
 * stable until someone is told to re-measure it.
 *
 * 2.05 rather than the exact 2.074, because the difference is 1% and a figure
 * a person can hold is worth more than the last percent of a total that
 * already assumes perfect collection.
 */
export const CAMPAIGN_MONEY_MULTIPLIER = 2.05;

/**
 * A payout scaled for the campaign's length.
 *
 * Applied to **everything the player earns** — enemy drops through
 * `dropAmount`, flag rewards at the capture site — so the two cannot drift
 * apart into a campaign that pays well for kills and badly for flags.
 *
 * Rounded, because money is whole and `decomposeMoney` splits an integer into
 * coins; floored at 1 for a positive input, so a scaled-up amount can never
 * round to nothing.
 */
export function campaignMoney(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.max(1, Math.round(amount * CAMPAIGN_MONEY_MULTIPLIER));
}

/** The subset of resolved stats this layer changes. */
export interface TunableSpeeds {
  moveSpeedMax: number;
  accSpeed: number;
}

/**
 * Enemy speeds for the mode being played.
 *
 * Applied at spawn rather than inside `resolveEnemyStats`, which stays a port
 * of the AS3's stat block with nothing of ours folded into it. Keeping the
 * divergence in its own named function is what lets the stat tests go on
 * asserting the original's numbers.
 */
export function tuneSpeeds<T extends TunableSpeeds>(stats: T, mode: LevelMode): T {
  const { enemySpeed } = tuningFor(mode);
  if (enemySpeed === 1) return stats;

  return {
    ...stats,
    moveSpeedMax: stats.moveSpeedMax * enemySpeed,
    accSpeed: stats.accSpeed * enemySpeed,
  };
}
