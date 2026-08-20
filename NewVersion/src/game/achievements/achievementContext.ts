/**
 * Where each achievement's current value comes from.
 *
 * `updateAchievements` has always taken an `AchievementValueSource` and walked
 * all 36 specs with it. **Nothing implemented that function**, so the whole
 * evaluation half was correct, tested and unreachable. This is it.
 *
 * ── The five families ─────────────────────────────────────────────────────
 *   Kills1-3            running `enemyKills` total
 *   Money1-3            running `moneyEarned` total
 *   MaxedPrimary1-3     primaries at level 10
 *   MaxedSecondary1-3   secondaries at level 10
 *   Stars/Flags/Towers/Shields/Bosses 1-3   medal totals per mode, three tiers
 *   the nine Booleans   per-level flags, below
 *
 * Every id in `ACHIEVEMENTS` is covered, and an unknown id throws rather than
 * returning 0. A silent zero would read as "not earned yet" forever, which is
 * indistinguishable from working — the exact failure this file exists to end.
 *
 * ── The post-level path only ──────────────────────────────────────────────
 * The AS3's `achievementCheck` takes a `checkEveryFrame` flag, and it is not a
 * performance switch: the false path **clears every temp flag it reads**
 * (`ScreenAchievements.as:394-572`) while the true path leaves them, and the
 * medal achievements read a live in-level running total on the true path
 * against whole-game totals on the false one. Only the false path is modelled
 * here. The in-game toast is a separate pass.
 */

import { ACHIEVEMENTS } from './achievementData';
import type { AchievementSpec } from './achievementData';
import type { AchievementValue, AchievementValueSource } from './achievementState';
import type { AchievementTotals } from './achievementSave';
import { countMaxedPrimary, countMaxedSecondary } from '../upgrades/upgradeState';
import type { UpgradeState } from '../upgrades/upgradeState';
import { getAchievementTiers, TOTALS_TYPE_TO_MODE } from '../levels/levelProgress';
import type { ProgressTable, TotalsType } from '../levels/levelProgress';
import type { LevelMode } from '../levels/levelData';

/**
 * The per-level one-shot flags — `PartGameArea`'s `temp*` statics.
 *
 * Thirteen exist in the original; the two numeric ones are not here.
 * `tempEnemyKills` is the level's kill count, which the port already carries as
 * `GameplayScene.kills`, and `tempValuesEarned` feeds only the live toast.
 *
 * Reset at level start and on quit (`resetTempVariables`, `:220-285`), and
 * cleared again by the post-level check as it reads them.
 */
export interface LevelAchievementFlags {
  /** `:6364` — poison applied to a Medic. */
  doctorPoisoned: boolean;
  /** `:6324` — freeze applied to a Temperamental. */
  temperamentalFrozen: boolean;
  /** `:6628` — a Mine's blast killed a Trap enemy. */
  trapEnemyMineKill: boolean;
  /** `:5678` — cake hit a DamageAddict. */
  damageAddictEnemyCake: boolean;
  /** `Tank.as:210` — the tank reached the bottom of a Defense lane. */
  hitBottom: boolean;
  /** `:2828` — cleared the moment any input is pressed. Starts **true**. */
  nothingPressed: boolean;
  /** `:3739`, `:3985` — cleared on firing anything. Starts **true**. */
  noWeaponsUsed: boolean;
  /** `:3732` — a Timed Bomb was fired. */
  timedBombsFired: boolean;
  /** `:3736`, `:3984` — anything other than a Timed Bomb was fired. */
  otherThanTimedBombsFired: boolean;
  /** `:3738` — cleared on firing a primary. Starts **true**. */
  onlySpecialWeapons: boolean;
  /**
   * `:305-308` — the level spawns three or more bosses.
   *
   * Set once at level start from `ScreenGame.bossAmount`, **not** by watching
   * three bosses be alive together. It is a property of the level, so a Boss
   * level with two bosses can never earn BossOnlySpecial however it is played.
   */
  threeBosses: boolean;
}

/**
 * Level-start values — `resetTempVariables("LevelStart")`.
 *
 * Three start **true** and are cleared by doing something: a player who never
 * presses a key keeps `nothingPressed`, one who never fires keeps
 * `noWeaponsUsed`, one who fires only secondaries keeps `onlySpecialWeapons`.
 * Getting these backwards would make the three achievements unreachable rather
 * than trivially earned, which is the quieter failure.
 */
export function createLevelFlags(): LevelAchievementFlags {
  return {
    doctorPoisoned: false,
    temperamentalFrozen: false,
    trapEnemyMineKill: false,
    damageAddictEnemyCake: false,
    hitBottom: false,
    nothingPressed: true,
    noWeaponsUsed: true,
    timedBombsFired: false,
    otherThanTimedBombsFired: false,
    onlySpecialWeapons: true,
    threeBosses: false,
  };
}

/**
 * Quit values — `resetTempVariables("Quit")`.
 *
 * Not the same as a level start: the three that begin true are set **false**
 * here, so abandoning a level cannot bank an achievement for having done
 * nothing in it. That asymmetry is the whole point of the second branch.
 */
export function createQuitFlags(): LevelAchievementFlags {
  return {
    ...createLevelFlags(),
    nothingPressed: false,
    noWeaponsUsed: false,
    onlySpecialWeapons: false,
  };
}

/**
 * What the finished level contributes.
 *
 * Null when the evaluation is not level-end — after a shop purchase, say, where
 * only the Maxed achievements can move. The nine Booleans then read false,
 * which is what the AS3 produces too: its flags were cleared by the previous
 * level-end check.
 */
export interface LevelRecord {
  mode: LevelMode;
  /**
   * `PartGameArea.levelDone` — the level was actually completed.
   *
   * Four of the nine Booleans require it. Distinct from "survived": a level can
   * end with the tank alive and the wave unfinished if the player quits.
   */
  completed: boolean;
  flags: LevelAchievementFlags;
}

export interface AchievementInputs {
  totals: AchievementTotals;
  upgrades: UpgradeState;
  progress: ProgressTable;
  level: LevelRecord | null;
}

/** Ids whose value is a per-level Boolean, and the condition behind each. */
const BOOLEAN_SOURCES: Readonly<Record<string, (level: LevelRecord) => boolean>> = {
  // `ScreenAchievements.as:388-400`. No mode or completion condition.
  PoisonDoctor: (l) => l.flags.doctorPoisoned,
  FreezeTemperamental: (l) => l.flags.temperamentalFrozen,
  TrapMine: (l) => l.flags.trapEnemyMineKill,
  AddictedCake: (l) => l.flags.damageAddictEnemyCake,

  // `:443` — the flag is set by the tank in any mode, the achievement only
  // counts it in Defense.
  Racing: (l) => l.mode === 'Defense' && l.flags.hitBottom,

  // `:458` — completing the level while never pressing anything.
  Idle: (l) => l.completed && l.flags.nothingPressed,

  // `:527` — a Flag level completed without firing a shot.
  FlagNoWeapons: (l) => l.completed && l.mode === 'Flag' && l.flags.noWeaponsUsed,

  /*
   * `:544` — Timed Bombs and *nothing else*. The second flag must be false,
   * which is the only place a flag is required unset.
   *
   * ── Divergence: Tower, where the AS3 says Defense (T215) ───────────────
   * `ScreenAchievements.as:547` reads `levelMode == "Defense"`, and the port
   * matched it. Changed to `Tower` by request — a design decision, not a
   * correction, and worth being explicit about because everything around it
   * checked out:
   *
   *   - the AS3 has both modes as distinct strings, 28 uses of "Defense" and
   *     31 of "Tower", so this is not one name for one idea;
   *   - the port's level table maps mode **row for row** with the AS3 —
   *     world 1 level 7 is `Tower` (640x640) and level 11 is `Defense`
   *     (640x960) in both — so no swap crept in at generation;
   *   - every other mode-bearing achievement was re-checked against its own
   *     `case` block and all eight agree with the original (T215).
   *
   * So this is the one place the port deliberately asks for a different mode
   * than the original, and `achievementWording.ts` says "tower level" to
   * match.
   */
  DefensiveBombs: (l) =>
    l.completed &&
    l.mode === 'Tower' &&
    l.flags.timedBombsFired &&
    !l.flags.otherThanTimedBombsFired,

  // `:562` — a Boss level cleared on secondaries alone, with three bosses out.
  BossOnlySpecial: (l) =>
    l.completed && l.mode === 'Boss' && l.flags.onlySpecialWeapons && l.flags.threeBosses,
};

/** Ids whose value is a medal-total triple, mapped to the mode they count. */
const TIER_SOURCES: Readonly<Record<string, TotalsType>> = Object.fromEntries(
  Object.keys(TOTALS_TYPE_TO_MODE).flatMap((type) =>
    [1, 2, 3].map((tier) => [`${type}${tier}`, type]),
  ),
);

/** Ids whose value is a plain running number. */
const NUMBER_SOURCES: Readonly<Record<string, (inputs: AchievementInputs) => number>> = {
  Kills1: (i) => i.totals.enemyKills,
  Kills2: (i) => i.totals.enemyKills,
  Kills3: (i) => i.totals.enemyKills,
  Money1: (i) => i.totals.moneyEarned,
  Money2: (i) => i.totals.moneyEarned,
  Money3: (i) => i.totals.moneyEarned,
  MaxedPrimary1: (i) => countMaxedPrimary(i.upgrades),
  MaxedPrimary2: (i) => countMaxedPrimary(i.upgrades),
  MaxedPrimary3: (i) => countMaxedPrimary(i.upgrades),
  MaxedSecondary1: (i) => countMaxedSecondary(i.upgrades),
  MaxedSecondary2: (i) => countMaxedSecondary(i.upgrades),
  MaxedSecondary3: (i) => countMaxedSecondary(i.upgrades),
};

/**
 * The value source for one evaluation pass.
 *
 * Throws on an id it does not recognise. That is deliberate: `updateAchievements`
 * walks `ACHIEVEMENTS`, so an id reaching here and finding nothing means the
 * data and this file have diverged, and the only alternative — returning 0 —
 * would present a permanently unearnable achievement as merely unearned.
 */
export function achievementValueSource(inputs: AchievementInputs): AchievementValueSource {
  return (spec: AchievementSpec): AchievementValue => {
    const number = NUMBER_SOURCES[spec.id];
    if (number) return number(inputs);

    const tierType = TIER_SOURCES[spec.id];
    if (tierType) return getAchievementTiers(inputs.progress, tierType);

    const boolean = BOOLEAN_SOURCES[spec.id];
    if (boolean) return inputs.level ? boolean(inputs.level) : false;

    throw new Error(`[achievements] No value source for "${spec.id}".`);
  };
}

/** Every id this module can supply, for the completeness test. */
export const COVERED_IDS: readonly string[] = [
  ...Object.keys(NUMBER_SOURCES),
  ...Object.keys(TIER_SOURCES),
  ...Object.keys(BOOLEAN_SOURCES),
];

/** Ids in the data that nothing here supplies. Empty, and a test says so. */
export function uncoveredIds(): string[] {
  const covered = new Set(COVERED_IDS);
  return ACHIEVEMENTS.filter((spec) => !covered.has(spec.id)).map((spec) => spec.id);
}
