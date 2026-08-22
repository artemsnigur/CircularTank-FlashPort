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
  Enemies: 'Enemies',
  Bestiary: 'Bestiary',
  Options: 'Options',
  Achievements: 'Achievements',
  Gameplay: 'Gameplay',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];

/*
 * Deleted in T152: `LevelTypes` / `LevelType`.
 *
 * A second definition of the same five archetypes, from before the level
 * tables were generated. The live one is `LevelMode` in `levels/levelData.ts`,
 * which is what every mode branch in the port compares against; this pair had
 * no reference left anywhere, including in tests, and a duplicate domain type
 * is the kind of thing that gets imported by mistake years later.
 */

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
/*
 * Deleted in T152, all three together, because they share a cause.
 *
 * `World` was a second name for the theme union that `levels/levelData.ts`
 * declares from the generated tables, unused since those landed.
 *
 * `PLAYER_SPEED_UNITS_PER_SEC = 260` and `PLAYER_DRAG = 1400` were "physics
 * tuning that the placeholder scene needs" — invented numbers with no AS3 line
 * behind them, superseded by the ported movement in `player/tankMovement.ts`
 * and read by nothing since. **These are the shape of the `TANK_RADIUS`
 * hazard inverted**: there, a correct exported constant sat unused beside a
 * wrong derived one in production. Here the unused pair is the invented half,
 * so the fix is the opposite — delete, rather than wire. Both cases look
 * identical in a knip report, which is why the report is a worklist and not a
 * defect list.
 */
