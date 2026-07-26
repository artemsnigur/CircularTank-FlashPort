/**
 * Field table for one save-slot in the save string, transcribed from
 * `SaveManager.updateSaveStringSlot()` in SWFimported/scripts/SaveManager.as.
 *
 * GENERATED-ADJACENT: the key list was extracted mechanically from the AS3 to
 * avoid transcription errors across 63 fields. It is committed rather than
 * regenerated at build time because it is a format specification, not a
 * derived artefact — it must not change when the AS3 folder does.
 *
 * Every owning class here is still `not started` in PROGRESS.md, which is why
 * this file describes the format rather than reading or writing game state.
 * As each screen is ported, wire its fields up and delete the corresponding
 * entry from the "unported owners" note below.
 *
 * DEVIATION: the AS3 wrote `pw=` for BOTH `primaryWeapon` and `previousWorld`,
 * which made the latter unrecoverable (see saveString.ts). With no legacy
 * transfer codes to support, `previousWorld` has been moved to `prw` so every
 * key here is unique.
 */

/** How a field is encoded on the way into the save string. */
export type SaveFieldCodec =
  | 'raw' // String(value)
  | 'boolean' // booleanToNumber
  | 'alphabet' // numberArrayToAlphabetShortString
  | 'csv' // stringArrayToShortString
  | 'digits3' // numberArrayToShortString(..., 3)
  | 'plusOne' // value + 1, used by every achievement counter
  | 'computed'; // produced by a helper, e.g. dt / wl

export interface SaveFieldSpec {
  /** Key as it appears in the save string. */
  key: string;
  /** AS3 expression this field is written from. */
  source: string;
  /** Class that owns the value; null once it has been ported. */
  owner: string;
  codec: SaveFieldCodec;
}

/** All 63 fields, in the exact order updateSaveStringSlot() writes them. */
export const SAVE_SLOT_FIELDS: readonly SaveFieldSpec[] = [
  { key: "m", source: "ScreenUpgrades.money", owner: "ScreenUpgrades", codec: 'raw' },
  { key: "la", source: "numberArrayToAlphabetShortString(ScreenUpgrades.levelsArray)", owner: "ScreenUpgrades", codec: 'alphabet' },
  { key: "lam", source: "numberArrayToAlphabetShortString(ScreenUpgrades.levelsArrayMisc)", owner: "ScreenUpgrades", codec: 'alphabet' },
  { key: "las", source: "numberArrayToAlphabetShortString(ScreenUpgrades.levelsArraySecondary)", owner: "ScreenUpgrades", codec: 'alphabet' },
  { key: "ew", source: "stringArrayToShortString(ScreenGame.equippedWeapons)", owner: "ScreenGame", codec: 'csv' },
  { key: "pw", source: "ScreenGame.primaryWeapon", owner: "ScreenGame", codec: 'raw' },
  { key: "sw", source: "ScreenGame.secondaryWeapon", owner: "ScreenGame", codec: 'raw' },
  { key: "wva", source: "numberArrayToShortString(ScreenLevelSelect.worldsValuesArrays,3)", owner: "ScreenLevelSelect", codec: 'digits3' },
  { key: "prw", source: "ScreenLevelSelect.previousWorld", owner: "ScreenLevelSelect", codec: 'raw' },
  { key: "pl", source: "ScreenLevelSelect.previousLevel", owner: "ScreenLevelSelect", codec: 'raw' },
  { key: "plw", source: "booleanToNumber(ScreenLevelSelect.previousLevelWon)", owner: "ScreenLevelSelect", codec: 'boolean' },
  { key: "kea", source: "stringArrayToShortString(ScreenEnemies.knownEnemiesArray)", owner: "ScreenEnemies", codec: 'csv' },
  { key: "ek", source: "(ScreenAchievements.enemyKills + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "me", source: "(ScreenAchievements.moneyEarned + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ak1s", source: "(ScreenAchievements.achievementKills1State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ak2s", source: "(ScreenAchievements.achievementKills2State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ak3s", source: "(ScreenAchievements.achievementKills3State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "am1s", source: "(ScreenAchievements.achievementMoney1State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "am2s", source: "(ScreenAchievements.achievementMoney2State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "am3s", source: "(ScreenAchievements.achievementMoney3State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "amp1s", source: "(ScreenAchievements.achievementMaxedPrimary1State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "amp2s", source: "(ScreenAchievements.achievementMaxedPrimary2State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "amp3s", source: "(ScreenAchievements.achievementMaxedPrimary3State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ams1s", source: "(ScreenAchievements.achievementMaxedSecondary1State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ams2s", source: "(ScreenAchievements.achievementMaxedSecondary2State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ams3s", source: "(ScreenAchievements.achievementMaxedSecondary3State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "apds", source: "(ScreenAchievements.achievementPoisonDoctorState + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "afts", source: "(ScreenAchievements.achievementFreezeTemperamentalState + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "atms", source: "(ScreenAchievements.achievementTrapMineState + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "aacs", source: "(ScreenAchievements.achievementAddictedCakeState + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ars", source: "(ScreenAchievements.achievementRacingState + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ais", source: "(ScreenAchievements.achievementIdleState + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "as1s", source: "(ScreenAchievements.achievementStars1State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "as2s", source: "(ScreenAchievements.achievementStars2State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "as3s", source: "(ScreenAchievements.achievementStars3State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "af1s", source: "(ScreenAchievements.achievementFlags1State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "af2s", source: "(ScreenAchievements.achievementFlags2State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "af3s", source: "(ScreenAchievements.achievementFlags3State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "at1s", source: "(ScreenAchievements.achievementTowers1State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "at2s", source: "(ScreenAchievements.achievementTowers2State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "at3s", source: "(ScreenAchievements.achievementTowers3State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ash1s", source: "(ScreenAchievements.achievementShields1State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ash2s", source: "(ScreenAchievements.achievementShields2State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ash3s", source: "(ScreenAchievements.achievementShields3State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ab1s", source: "(ScreenAchievements.achievementBosses1State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ab2s", source: "(ScreenAchievements.achievementBosses2State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "ab3s", source: "(ScreenAchievements.achievementBosses3State + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "afnws", source: "(ScreenAchievements.achievementFlagNoWeaponsState + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "adbs", source: "(ScreenAchievements.achievementDefensiveBombsState + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "aboss", source: "(ScreenAchievements.achievementBossOnlySpecialState + 1)", owner: "ScreenAchievements", codec: 'plusOne' },
  { key: "tc", source: "booleanToNumber(PartTutorial.tutorialCompleted)", owner: "PartTutorial", codec: 'boolean' },
  { key: "tau", source: "stringArrayToShortString(PartTutorial.tutorialArrayUnseen)", owner: "PartTutorial", codec: 'csv' },
  { key: "taq", source: "stringArrayToShortString(PartTutorial.tutorialArrayQueue)", owner: "PartTutorial", codec: 'csv' },
  { key: "tad", source: "stringArrayToShortString(PartTutorial.tutorialArrayDone)", owner: "PartTutorial", codec: 'csv' },
  { key: "ubl", source: "booleanToNumber(Main.uihButtonLevel)", owner: "Main", codec: 'boolean' },
  { key: "ubpl", source: "booleanToNumber(Main.uihButtonPlayLevel)", owner: "Main", codec: 'boolean' },
  { key: "ubnl", source: "booleanToNumber(Main.uihButtonNextLevel)", owner: "Main", codec: 'boolean' },
  { key: "ubsp", source: "booleanToNumber(Main.uihButtonSquarePage)", owner: "Main", codec: 'boolean' },
  { key: "ubu", source: "booleanToNumber(Main.uihButtonUpgrades)", owner: "Main", codec: 'boolean' },
  { key: "hdc", source: "booleanToNumber(Main.hDifficultyChosen)", owner: "Main", codec: 'boolean' },
  { key: "emg", source: "booleanToNumber(Main.extraMoneyGiven)", owner: "Main", codec: 'boolean' },
  { key: "dt", source: "setDateAndTime()", owner: "(computed)", codec: 'computed' },
  { key: "wl", source: "setWorldAndLevel()", owner: "(computed)", codec: 'computed' },
];

/** Classes that must be ported before the slot can actually be read or written. */
export const UNPORTED_OWNERS: readonly string[] = [
  "ScreenUpgrades", // 4 field(s)
  "ScreenGame", // 3 field(s)
  "ScreenLevelSelect", // 4 field(s)
  "ScreenEnemies", // 1 field(s)
  "ScreenAchievements", // 38 field(s)
  "PartTutorial", // 4 field(s)
  "Main", // 7 field(s)
];
