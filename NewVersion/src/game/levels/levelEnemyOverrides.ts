/**
 * Deliberate enemy-roster divergences from `ScreenGame.as`.
 *
 * Same shape and same reasoning as `levelSizeOverrides.ts`: `LEVELS` in the
 * generated `levelData.ts` stays a pure transcription of the AS3, and
 * `getLevel` applies these on the way out — so `npm run levels:data` remains a
 * function of the source alone and what the game plays is still what the
 * source-verification tests check.
 *
 * An override does not say "ignore this level". It says **"the source says
 * `from`, and we play `to` instead"**, and `from` is asserted against the
 * generated table on every run. So a re-extraction that changes 1-18 stops
 * matching and fails, rather than silently masking the change; and an entry
 * left behind after the data catches up fails the "every override is used"
 * test, so the list cannot rot.
 */

import type { LevelSpec } from './levelData';

interface BossCountOverride {
  world: number;
  level: number;
  /** The enemy type carrying the `B` tier on this level. */
  type: string;
  /** The count the AS3 specifies. Asserted against the generated table. */
  from: number;
  /** The count the game plays instead. */
  to: number;
  why: string;
}

/**
 * The list. One entry today.
 *
 * **1-18 exists to make `BossOnlySpecial` reachable.** "CHUCK NORRIS" asks for
 * a boss level won with **three** bosses and three medals, using no primary
 * weapon — and `threeBosses` is a hard gate, so a level with one or two bosses
 * can never earn it however well it is played. Of world 1's boss levels, 1-18
 * is the one with a single boss and the room to hold three: 900x720, the
 * larger of the two sizes world 1 uses.
 *
 * `totalEnemies` moves with the roster, because `levelPreview` subtracts the
 * boss count from the total to work out the ordinary-enemy share — leaving the
 * total alone would quietly take two ordinary enemies away instead.
 */
export const BOSS_COUNT_OVERRIDES: readonly BossCountOverride[] = [
  {
    world: 1,
    level: 18,
    type: 'Fast',
    from: 1,
    to: 3,
    why: 'three bosses is what BossOnlySpecial ("CHUCK NORRIS") requires',
  },
];

/** The override for a level, or undefined. Exported for the tests. */
export function findBossCountOverride(
  world: number,
  level: number,
): BossCountOverride | undefined {
  return BOSS_COUNT_OVERRIDES.find((o) => o.world === world && o.level === level);
}

/**
 * Applies the roster override for a level, or returns the spec untouched.
 *
 * Leaves the spec **identical by reference** when there is no override, which
 * is what keeps this off the hot path for the other 404 levels.
 *
 * A mismatched `from` returns the spec unchanged rather than throwing: the
 * failure belongs in a test, where it names the level, not in a level load,
 * where it would be a black screen. `levelEnemyOverrides.test.ts` is what makes
 * the mismatch loud.
 */
export function applyBossCountOverride(
  spec: LevelSpec,
  world: number,
  level: number,
): LevelSpec {
  const override = findBossCountOverride(world, level);
  if (!override) return spec;

  const index = spec.enemies.findIndex(
    (e) => e.level === 'B' && e.type === override.type,
  );
  if (index === -1) return spec;
  if (spec.enemies[index].count !== override.from) return spec;

  const enemies = [...spec.enemies];
  enemies[index] = { ...enemies[index], count: override.to };

  return {
    ...spec,
    enemies,
    totalEnemies: spec.totalEnemies + (override.to - override.from),
  };
}
