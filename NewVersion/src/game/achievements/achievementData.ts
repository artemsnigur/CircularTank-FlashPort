/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run achievements:data
 *
 * Extracted from SWFimported/scripts/ScreenAchievements.as by joining
 * achievementPlacementArray with the per-achievement obtain* and *Data tables.
 */

/** How `achievementCheck` evaluates the achievement. */
export type AchievementType = 'Number' | 'Boolean' | 'NumberArray';

export interface AchievementSpec {
  /** AS3 name, e.g. "Kills1". Also the save-field stem. */
  id: string;
  type: AchievementType;
  /** obtain<Id>[1] — threshold for Number/NumberArray types. */
  requirement: number;
  title: string;
  description: string;
  /**
   * achievement<Id>Data[2]. When true the earned state records the
   * difficulty (1/2/3) and the achievement can be re-earned at a higher one;
   * when false it is a flat 0.
   */
  difficultyMatters: boolean;
  /** Grid position on the achievements screen, from achievementPlacementArray. */
  x: number;
  y: number;
}

/** 36 achievements, in display order. */
export const ACHIEVEMENTS: readonly AchievementSpec[] = [
  { id: "Kills1", type: "Number", requirement: 100, title: "GRAVEYARD", description: "Kill 100 enemies.", difficultyMatters: false, x: 55, y: 120 },
  { id: "Kills2", type: "Number", requirement: 1000, title: "DIE HARD", description: "Kill 1,000 enemies.", difficultyMatters: false, x: 115, y: 120 },
  { id: "Kills3", type: "Number", requirement: 10000, title: "TERMINATOR", description: "Kill 10,000 enemies.", difficultyMatters: false, x: 175, y: 120 },
  { id: "Money1", type: "Number", requirement: 10000, title: "INCOME", description: "Earn $10,000.", difficultyMatters: false, x: 235, y: 120 },
  { id: "Money2", type: "Number", requirement: 100000, title: "MONEY, MONEY, MONEY", description: "Earn $100,000.", difficultyMatters: false, x: 295, y: 120 },
  { id: "Money3", type: "Number", requirement: 1000000, title: "MILLIONARE", description: "Earn $1,000,000.", difficultyMatters: false, x: 355, y: 120 },
  { id: "MaxedPrimary1", type: "Number", requirement: 1, title: "TOP GUN", description: "Upgrade 1 primary weapon\nto level 10.", difficultyMatters: false, x: 55, y: 176 },
  { id: "MaxedPrimary2", type: "Number", requirement: 5, title: "BECOMING POWERFUL", description: "Upgrade 5 primary weapons\nto level 10.", difficultyMatters: false, x: 115, y: 176 },
  { id: "MaxedPrimary3", type: "Number", requirement: 10, title: "TO THE MAX", description: "Upgrade 10 primary weapons\nto level 10.", difficultyMatters: false, x: 175, y: 176 },
  { id: "MaxedSecondary1", type: "Number", requirement: 1, title: "MAXIMUM DANGER", description: "Upgrade 1 secondary weapon\nto level 10.", difficultyMatters: false, x: 235, y: 176 },
  { id: "MaxedSecondary2", type: "Number", requirement: 5, title: "ADVANCED EQUIPMENT", description: "Upgrade 5 secondary weapons\nto level 10.", difficultyMatters: false, x: 295, y: 176 },
  { id: "MaxedSecondary3", type: "Number", requirement: 10, title: "FULLY LOADED", description: "Upgrade 10 secondary weapons\nto level 10.", difficultyMatters: false, x: 355, y: 176 },
  { id: "PoisonDoctor", type: "Boolean", requirement: 0, title: "THE DOCTOR IS SICK", description: "Poison a medic enemy.", difficultyMatters: false, x: 55, y: 232 },
  { id: "FreezeTemperamental", type: "Boolean", requirement: 0, title: "COOL DOWN", description: "Freeze an angry temperamental enemy.", difficultyMatters: false, x: 115, y: 232 },
  { id: "TrapMine", type: "Boolean", requirement: 0, title: "TASTE YOUR OWN MEDICINE", description: "Kill a trap enemy with a mine.", difficultyMatters: false, x: 175, y: 232 },
  { id: "AddictedCake", type: "Boolean", requirement: 0, title: "ADDICTED TO CAKE", description: "Shoot a damage addict enemy with cake.", difficultyMatters: false, x: 235, y: 232 },
  { id: "Racing", type: "Boolean", requirement: 0, title: "ARE WE RACING?", description: "Reach the bottom of a defense level before any enemies do it.", difficultyMatters: false, x: 295, y: 232 },
  { id: "Idle", type: "Boolean", requirement: 0, title: "IDLE", description: "Do nothing, in any level, until the level ends.", difficultyMatters: false, x: 355, y: 232 },
  { id: "Stars1", type: "NumberArray", requirement: 60, title: "TWINKLE TWINKLE", description: "Earn 60 stars.", difficultyMatters: true, x: 55, y: 288 },
  { id: "Stars2", type: "NumberArray", requirement: 120, title: "SHINING STARS", description: "Earn 120 stars.", difficultyMatters: true, x: 115, y: 288 },
  { id: "Stars3", type: "NumberArray", requirement: 180, title: "SHOOT FOR THE STARS", description: "Earn 180 stars.", difficultyMatters: true, x: 175, y: 288 },
  { id: "Flags1", type: "NumberArray", requirement: 60, title: "FLAG COLLECTOR", description: "Earn 60 flags.", difficultyMatters: true, x: 235, y: 288 },
  { id: "Flags2", type: "NumberArray", requirement: 120, title: "WAVING THE FLAGS", description: "Earn 120 flags.", difficultyMatters: true, x: 295, y: 288 },
  { id: "Flags3", type: "NumberArray", requirement: 180, title: "VEXILLOLOGIST", description: "Earn 180 flags.", difficultyMatters: true, x: 355, y: 288 },
  { id: "Towers1", type: "NumberArray", requirement: 60, title: "TOWER DEFENSE", description: "Earn 60 towers.", difficultyMatters: true, x: 55, y: 344 },
  { id: "Towers2", type: "NumberArray", requirement: 120, title: "CAN'T TOUCH THIS", description: "Earn 120 towers.", difficultyMatters: true, x: 115, y: 344 },
  { id: "Towers3", type: "NumberArray", requirement: 180, title: "EYE OF SAURON", description: "Earn 180 towers.", difficultyMatters: true, x: 175, y: 344 },
  { id: "Shields1", type: "NumberArray", requirement: 60, title: "BODYGUARD", description: "Earn 60 shields.", difficultyMatters: true, x: 235, y: 344 },
  { id: "Shields2", type: "NumberArray", requirement: 120, title: "EFFECTIVE SECURITY", description: "Earn 120 shields.", difficultyMatters: true, x: 295, y: 344 },
  { id: "Shields3", type: "NumberArray", requirement: 180, title: "YOU SHALL NOT PASS", description: "Earn 180 shields.", difficultyMatters: true, x: 355, y: 344 },
  { id: "Bosses1", type: "NumberArray", requirement: 30, title: "ARE YOU MAD BOSS?", description: "Earn 30 bosses.", difficultyMatters: true, x: 55, y: 400 },
  { id: "Bosses2", type: "NumberArray", requirement: 60, title: "BOSSY", description: "Earn 60 bosses.", difficultyMatters: true, x: 115, y: 400 },
  { id: "Bosses3", type: "NumberArray", requirement: 90, title: "LIKE A BOSS!", description: "Earn 90 bosses.", difficultyMatters: true, x: 175, y: 400 },
  { id: "FlagNoWeapons", type: "Boolean", requirement: 0, title: "PEACEFUL", description: "Win a flag level and get 3 medals, without using any weapons.", difficultyMatters: true, x: 235, y: 400 },
  { id: "DefensiveBombs", type: "Boolean", requirement: 0, title: "KABOOM!", description: "Win a defense level and get 3 medals, by using the timed bomb cannon and no special weapons.", difficultyMatters: true, x: 295, y: 400 },
  { id: "BossOnlySpecial", type: "Boolean", requirement: 0, title: "CHUCK NORRIS", description: "Win a boss level with 3 bosses, and get 3 medals without using any primary weapons.", difficultyMatters: true, x: 355, y: 400 },
];

export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"];

