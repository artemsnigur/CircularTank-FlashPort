/**
 * DEV-AID: levels for manual QA of enemy behaviour.
 *
 * ── Why these exist ───────────────────────────────────────────────────────
 * Enemy variety is concentrated in worlds the player cannot currently reach.
 * `Exploding` first appears in **world 7**, and `LevelSelectScene` pins world
 * 1, so a mechanic can be finished and be untestable the same day. Rather than
 * unpick the world pin and the unlock rule for every behaviour session, these
 * put the enemies somewhere reachable.
 *
 * Two shapes, because they answer different questions:
 *
 *   level 1        three of *every* type — "does anything look wrong"
 *   levels 2..21   thirty of *one* type — "what exactly does this one do"
 *
 * The isolated levels are the ones to reach for when watching a single
 * behaviour: thirty Teleporters with nothing else on screen makes the pattern
 * obvious in a way a mixed arena never will.
 *
 * These are **not** real levels. Pacing and composition are chosen to make
 * behaviour visible, not to be fair or winnable. They never appear in level
 * select and are stripped from production builds by the `import.meta.env.DEV`
 * guard on both the entry points and the loader.
 *
 * ── World 0 is the sentinel ───────────────────────────────────────────────
 * `getLevel` has no world 0, so nothing in the normal path can collide with
 * these. `recordLevelResult` indexes `progress[world - 1]`, which is
 * `undefined` for world 0 and makes *that one write* a silent no-op.
 * `hasNextLevel` finds nothing either, so the results overlay offers no onward
 * level.
 *
 * ── What actually keeps them off the save ─────────────────────────────────
 * Not the sentinel. This comment used to claim world 0 meant "playing them
 * cannot pollute a save", and that was false in two places the sentinel never
 * reached: the level-end block banked the run's money into the real profile,
 * and `recordLevel` wrote `previousWorld: 0` / `previousLevel` /
 * `previousLevelWon` outside the no-op. Both were persisted. The resume point
 * survived only because `MainMenuScene` happens to fall back on a falsy world.
 *
 * The guarantee now comes from `sandbox` on `ui:start-game`, which every dev
 * entry point sets and which gates the whole persistence block in
 * `GameplayScene`. That covers the dev level picker too, which uses real world
 * numbers and so gets no protection from the sentinel at all.
 */

import { ENEMY_STATS } from '../enemies/enemyStatsData';
import type { LevelSpec } from './levelData';

/** Sentinel world for every dev level. Deliberately outside 1-9. */
export const DEV_WORLD = 0;

/** Level 1 is the mixed arena; the isolated levels start after it. */
export const DEV_COMBINED_LEVEL = 1;
export const DEV_FIRST_SINGLE_LEVEL = 2;

/** Per-type count in the mixed arena. */
export const DEV_COUNT_PER_TYPE = 3;

/**
 * Per-type count in an isolated level.
 *
 * Deliberately under the 35 concurrent cap, so the spawner never stalls and
 * the full set can be on screen together.
 */
export const DEV_SINGLE_TYPE_COUNT = 30;

/**
 * Frames between spawns.
 *
 * Much faster than any real level (45+) because the point is to get the
 * enemies out quickly, not to pace a fight.
 */
const DEV_SPAWN_INTERVAL = 12;

/**
 * Types in a fixed order, so a level number always means the same enemy.
 *
 * Derived from `ENEMY_STATS` rather than hand-written: a type added by a future
 * extraction gets a level automatically. Sorted so the mapping is stable
 * regardless of key order in the generated file.
 */
export function devEnemyTypes(): string[] {
  return Object.keys(ENEMY_STATS).sort();
}

/** Level number for a given type's isolated level, or null if unknown. */
export function devLevelForType(type: string): number | null {
  const index = devEnemyTypes().indexOf(type);
  return index === -1 ? null : DEV_FIRST_SINGLE_LEVEL + index;
}

/** The type an isolated level number refers to, or null. */
export function devTypeForLevel(level: number): string | null {
  return devEnemyTypes()[level - DEV_FIRST_SINGLE_LEVEL] ?? null;
}

/** True when this world/level pair is one of the dev levels. */
export function isDevLevel(world: number, level: number): boolean {
  if (world !== DEV_WORLD) return false;
  if (level === DEV_COMBINED_LEVEL) return true;
  return devTypeForLevel(level) !== null;
}

/** Shared shape; only the composition differs between the two kinds. */
function devSpec(enemies: LevelSpec['enemies'], totalEnemies: number): LevelSpec {
  return {
    // The scene uses its own fixed room constants, so these are nominal.
    roomWidth: 640,
    roomHeight: 960,
    // Normal, so clearing the arena ends it and the outcome path is exercised.
    mode: 'Normal',
    // Nominal: nothing reads it yet, and the mechanic it belongs to (per-level
    // upgrade caps) is unported. 1 is the most restrictive real value, so a dev
    // level never claims a laxer cap than any shipped one.
    upgradeLimit: 1,
    theme: 'Desert',
    seed: 1,
    totalEnemies,
    spawnInterval: DEV_SPAWN_INTERVAL,
    enemies,
    // No flags: Flag mode has its own completion rule and would obscure the
    // behaviour being watched.
    flagCount: 0,
    flagMoney: 0,
  };
}

/** Three of every type, for a broad sweep. */
export function createDevTestLevel(): LevelSpec {
  const types = devEnemyTypes();
  return devSpec(
    types.map((type) => ({
      type: type as LevelSpec['enemies'][number]['type'],
      level: '1' as const,
      count: DEV_COUNT_PER_TYPE,
    })),
    types.length * DEV_COUNT_PER_TYPE,
  );
}

/** Thirty of one type, for watching a single behaviour. */
export function createSingleTypeLevel(type: string): LevelSpec {
  return devSpec(
    [
      {
        type: type as LevelSpec['enemies'][number]['type'],
        level: '1',
        count: DEV_SINGLE_TYPE_COUNT,
      },
    ],
    DEV_SINGLE_TYPE_COUNT,
  );
}

/**
 * The spec for a dev level number, or null when it is not one.
 *
 * The single entry point the scene uses, so there is one place that decides
 * what a dev level number means.
 */
export function devLevelSpec(world: number, level: number): LevelSpec | null {
  if (world !== DEV_WORLD) return null;
  if (level === DEV_COMBINED_LEVEL) return createDevTestLevel();

  const type = devTypeForLevel(level);
  return type === null ? null : createSingleTypeLevel(type);
}
