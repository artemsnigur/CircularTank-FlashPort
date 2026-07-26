/**
 * Constants lifted from the AS3 source. Keep the AS3 origin in a comment on
 * every value so a fresh session can re-verify it against SWFimported/scripts.
 */

/** Scene registry keys. Strings, because Phaser's scene API is string-keyed. */
export const SceneKeys = {
  Boot: 'Boot',
  Preload: 'Preload',
  MainMenu: 'MainMenu',
  LevelSelect: 'LevelSelect',
  Upgrades: 'Upgrades',
  Gameplay: 'Gameplay',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];

/**
 * Level archetypes — ScreenGame.as `levelDataModelW1..W9`, column 7.
 * Each row is [roomW, roomH, ...4 reserved, type, difficultyTier, world, seed].
 */
export const LevelTypes = ['Normal', 'Flag', 'Tower', 'Defense', 'Boss'] as const;
export type LevelType = (typeof LevelTypes)[number];

/**
 * Difficulty setting — `ScreenLevelSelect.levelDifficulty`, compared as a
 * string throughout the AS3 (e.g. PartGameArea.as:2307). "Easy" never appears
 * as a literal there; it is the implicit else branch where every multiplier
 * stays 1.
 */
export const Difficulties = ['Easy', 'Medium', 'Hard'] as const;
export type Difficulty = (typeof Difficulties)[number];

/**
 * Enemy variant tier — `enemy.enemyLevel`, also a string in the AS3.
 * "B" is a boss, which is deliberately exempt from the difficulty health and
 * damage multipliers (PartGameArea.getTotalHealth) and scaled by
 * `ScreenGame.bossAmount` instead.
 */
export const EnemyLevels = ['1', '2', '3', 'B'] as const;
export type EnemyLevel = (typeof EnemyLevels)[number];

/** World themes — ScreenGame.as levelDataModel column 9. */
export const Worlds = [
  'Desert',
  'Grass',
  'BlueDirt',
  'Beach',
  'Concrete',
  'Biology',
  'Hell',
  'MagicStone',
  'Futuristic',
] as const;
export type World = (typeof Worlds)[number];

/**
 * Room sizes that actually appear in the level tables, in design units.
 * Useful as a sanity bound when porting PartGameArea's camera clamping.
 */
export const ROOM_SIZES: ReadonlyArray<readonly [number, number]> = [
  [640, 400],
  [800, 600],
  [900, 720],
  [640, 640],
  [640, 960],
];

/** Physics/gameplay tuning that the placeholder scene needs. */
export const PLAYER_SPEED_UNITS_PER_SEC = 260;
export const PLAYER_DRAG = 1400;
