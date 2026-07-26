/**
 * A dev-only level containing every enemy type, for manual QA.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * Enemy variety is concentrated in worlds the player cannot currently reach.
 * `Exploding` first appears in **world 7**, and `LevelSelectScene` pins world
 * 1, so the mechanic was untestable the moment it was finished. Teleporting,
 * Medic and the rest are likely the same. Rather than unpick the world pin and
 * the unlock rule for every behaviour session, this puts one of everything in
 * a single arena.
 *
 * It is **not** a real level: pacing, composition and difficulty are chosen to
 * make behaviour visible, not to be fair or winnable. It never appears in level
 * select, records no progress, and is stripped from production builds by the
 * `import.meta.env.DEV` guard on both the entry point and the loader.
 *
 * ── World 0 is the sentinel ───────────────────────────────────────────────
 * `getLevel` has no world 0, so nothing in the normal path can collide with
 * it. `recordLevelResult` indexes `progress[world - 1]`, which is `undefined`
 * for world 0 and makes recording a silent no-op — so playing this cannot
 * pollute a save. `hasNextLevel` asks for level 2 of world 0 and gets nothing,
 * so the results overlay offers no "next level" either.
 */

import { ENEMY_STATS } from '../enemies/enemyStatsData';
import type { LevelSpec } from './levelData';

/** Sentinel world for the dev level. Deliberately outside 1-9. */
export const DEV_WORLD = 0;
export const DEV_LEVEL = 1;

/** How many of each type to include. */
export const DEV_COUNT_PER_TYPE = 3;

/**
 * Frames between spawns.
 *
 * Much faster than any real level (45+) because the point is to get every type
 * on screen quickly, not to pace a fight.
 */
export const DEV_SPAWN_INTERVAL = 12;

/** True when the dev level is the one being asked for. */
export function isDevLevel(world: number, level: number): boolean {
  return world === DEV_WORLD && level === DEV_LEVEL;
}

/**
 * Builds the level: three of every type in the stat tables, tier 1.
 *
 * Reads `ENEMY_STATS` rather than a hand-written list so a type added by a
 * future extraction appears here automatically — the whole point is that it
 * shows *everything*, and a list would drift.
 */
export function createDevTestLevel(): LevelSpec {
  const types = Object.keys(ENEMY_STATS).sort();

  return {
    // The scene uses its own fixed room constants, so these are nominal.
    roomWidth: 640,
    roomHeight: 960,
    // Normal, so clearing the arena ends it and the outcome path is exercised.
    mode: 'Normal',
    tier: 1,
    theme: 'Desert',
    seed: 1,
    totalEnemies: types.length * DEV_COUNT_PER_TYPE,
    spawnInterval: DEV_SPAWN_INTERVAL,
    enemies: types.map((type) => ({
      type: type as LevelSpec['enemies'][number]['type'],
      level: '1' as const,
      count: DEV_COUNT_PER_TYPE,
    })),
    // No flags: Flag mode has its own completion rule and would obscure the
    // thing being tested.
    flagCount: 0,
    flagMoney: 0,
  };
}
