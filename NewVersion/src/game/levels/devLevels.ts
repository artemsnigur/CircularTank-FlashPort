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
 *   then one per   an empty arena in one ground theme — "which of these nine
 *   theme          do we keep" (`D-4`; see `devThemes.ts`)
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
import { themeOrder } from './devThemes';
import type { LevelSpec, LevelTheme } from './levelData';

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

/**
 * Where the theme levels start — **derived, never written down.**
 *
 * The isolated levels occupy one slot per enemy type, and that count is itself
 * derived from `ENEMY_STATS`. A literal here would be correct today and would
 * silently collide with a twenty-first enemy type the next time the SWF is
 * re-extracted: the new type's level and the first theme's level would be the
 * same number, and `devLevelSpec` would answer with whichever branch it tested
 * first. Deriving it means the theme levels simply move up.
 */
export function devFirstThemeLevel(): number {
  return DEV_FIRST_SINGLE_LEVEL + devEnemyTypes().length;
}

/** Level number for a theme's empty arena, or null if it is not a theme. */
export function devLevelForTheme(theme: string): number | null {
  const index = themeOrder().indexOf(theme as LevelTheme);
  return index === -1 ? null : devFirstThemeLevel() + index;
}

/** The theme a level number refers to, or null. */
export function devThemeForLevel(level: number): LevelTheme | null {
  return themeOrder()[level - devFirstThemeLevel()] ?? null;
}

/** True when this world/level pair is one of the dev levels. */
export function isDevLevel(world: number, level: number): boolean {
  if (world !== DEV_WORLD) return false;
  if (level === DEV_COMBINED_LEVEL) return true;
  if (devTypeForLevel(level) !== null) return true;
  return devThemeForLevel(level) !== null;
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
 * Room for a theme level — the campaign's most common size, at 120 of 405.
 *
 * Bigger than the dev default so more ground is visible at once, which is the
 * entire point of the level.
 */
export const DEV_THEME_ROOM = { width: 900, height: 720 } as const;

/**
 * Enemies on a theme level, and why it is not zero.
 *
 * Two reasons, and the second is the one that forces a number above zero at
 * all. A ground is being judged partly on whether things **read** against it,
 * so a few enemies is information rather than clutter. And a `Normal` level
 * with nothing in it satisfies `isWaveComplete` on the first frame — an empty
 * arena would hand over to the results overlay before it drew.
 */
export const DEV_THEME_ENEMY_COUNT = 3;

/**
 * Frames between spawns on a theme level.
 *
 * Slow on purpose — the opposite of `DEV_SPAWN_INTERVAL`, which exists to get
 * enemies out fast. Here they should trickle, so the ground is what is on
 * screen.
 */
const DEV_THEME_SPAWN_INTERVAL = 240;

/**
 * An empty arena in one theme, for comparing the nine grounds (`D-4`).
 *
 * Real ground tile, real background props, real camera zoom — the point is to
 * see the theme as a level actually renders it, which no still image or CSS
 * approximation can show. `ThemeGalleryScreen` is the contact sheet; this is
 * the one you walk around in.
 */
export function createThemeLevel(theme: LevelTheme): LevelSpec {
  return {
    ...devSpec(
      [{ type: 'Basic', level: '1', count: DEV_THEME_ENEMY_COUNT }],
      DEV_THEME_ENEMY_COUNT,
    ),
    roomWidth: DEV_THEME_ROOM.width,
    roomHeight: DEV_THEME_ROOM.height,
    spawnInterval: DEV_THEME_SPAWN_INTERVAL,
    theme,
    // `PM_PRNG` seeds the prop layout from this, so a fixed value makes the
    // scatter identical every visit — two themes compared on different days
    // differ by their art and by nothing else.
    seed: 1,
  };
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
  if (type !== null) return createSingleTypeLevel(type);

  const theme = devThemeForLevel(level);
  return theme === null ? null : createThemeLevel(theme);
}
