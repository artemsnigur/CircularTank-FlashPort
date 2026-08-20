/**
 * Can every achievement actually be earned?
 *
 * ── What this adds that the existing tests do not ─────────────────────────
 * `achievementContext.test.ts` proves every id has a **value source**
 * (`uncoveredIds()` is empty), and `achievementState.test.ts` proves the
 * state machine promotes correctly. Neither asks the question a player asks:
 * *is there an input that earns this one?*
 *
 * A predicate can be present, wired, covered and unsatisfiable — a mode that
 * never occurs, two flags that cannot both hold, a threshold above any
 * reachable value. That is the failure this file exists for, and it is the
 * class T213 found: `Idle` was reachable but a *lost* level earned it, because
 * `completed` was asserted by the caller rather than derived.
 *
 * ── The shape ─────────────────────────────────────────────────────────────
 * One tailored input per achievement, because they genuinely conflict: a
 * single "everything true" record cannot satisfy both `FlagNoWeapons` (fired
 * nothing, on a Flag level) and `DefensiveBombs` (fired timed bombs, on a
 * Defense level), and a record claiming to be both modes at once would prove
 * nothing about either.
 *
 * Each is asserted twice — it fires on its own input, and it does **not** fire
 * on an empty one. Without the second, a predicate stuck at `true` would pass
 * every check here.
 */
import { describe, expect, it } from 'vitest';

import { ACHIEVEMENTS } from './achievementData';
import { achievementValueSource, createLevelFlags } from './achievementContext';
import type { AchievementInputs, LevelAchievementFlags, LevelRecord } from './achievementContext';
import { updateAchievements } from './achievementState';
import { REWORDED_ACHIEVEMENTS, describeAchievement } from './achievementWording';
import { createInitialUpgradeState, maxedUpgradeState } from '../upgrades/upgradeState';

import { createEmptyProgress, recordLevelResult } from '../levels/levelProgress';
import { getLevel } from '../levels/levelData';
import type { Difficulty } from '../config/constants';
import type { LevelMode } from '../levels/levelData';

const DIFFICULTY: Difficulty = 'Hard';

/** Nothing achieved, nothing played — the counterpart every case is read against. */
function emptyInputs(): AchievementInputs {
  return {
    totals: { enemyKills: 0, moneyEarned: 0 },
    upgrades: createInitialUpgradeState(),
    progress: createEmptyProgress(),
    level: null,
  };
}

/** A finished level of `mode`, with `flags` applied over the level-start set. */
function level(mode: LevelMode, flags: Partial<LevelAchievementFlags> = {}): LevelRecord {
  return { mode, completed: true, flags: { ...createLevelFlags(), ...flags } };
}

/**
 * A progress table with `count` levels of `mode` cleared at three medals on
 * every difficulty.
 *
 * The levels are found in the real table rather than invented: `getTotalValues`
 * looks each one's `mode` up in `levelData`, so recording against an arbitrary
 * coordinate would add nothing to the tally and the test would fail for a
 * reason that has nothing to do with the achievement.
 */
function clearedLevels(mode: LevelMode, count: number) {
  let progress = createEmptyProgress();
  let placed = 0;
  for (let world = 1; world <= 9 && placed < count; world += 1) {
    for (let lvl = 1; lvl <= 45 && placed < count; lvl += 1) {
      if (getLevel(world, lvl)?.mode !== mode) continue;
      for (const difficulty of ['Easy', 'Medium', 'Hard'] as const) {
        progress = recordLevelResult(progress, world, lvl, difficulty, 3);
      }
      placed += 1;
    }
  }
  return progress;
}

/** How many of a thing the hardest tier of an id demands. */
const requirementOf = (id: string): number =>
  ACHIEVEMENTS.find((a) => a.id === id)?.requirement ?? 0;

/**
 * One input per achievement that ought to earn it.
 *
 * The numbers are deliberately generous — this asks *whether* an achievement
 * can be earned, not where its exact threshold sits, which
 * `achievementState.test.ts` already pins per tier.
 */
const EARNING_INPUT: Readonly<Record<string, () => AchievementInputs>> = {
  // ── Running totals ──────────────────────────────────────────────────────
  ...Object.fromEntries(
    ['Kills1', 'Kills2', 'Kills3'].map((id) => [
      id,
      () => ({ ...emptyInputs(), totals: { enemyKills: requirementOf(id) + 1, moneyEarned: 0 } }),
    ]),
  ),
  ...Object.fromEntries(
    ['Money1', 'Money2', 'Money3'].map((id) => [
      id,
      () => ({ ...emptyInputs(), totals: { enemyKills: 0, moneyEarned: requirementOf(id) + 1 } }),
    ]),
  ),

  // ── Upgrades maxed ──────────────────────────────────────────────────────
  ...Object.fromEntries(
    ['MaxedPrimary1', 'MaxedPrimary2', 'MaxedPrimary3'].map((id) => [
      id,
      () => ({ ...emptyInputs(), upgrades: maxedUpgradeState() }),
    ]),
  ),
  ...Object.fromEntries(
    ['MaxedSecondary1', 'MaxedSecondary2', 'MaxedSecondary3'].map((id) => [
      id,
      () => ({ ...emptyInputs(), upgrades: maxedUpgradeState() }),
    ]),
  ),

  // ── Medal tallies, one group per mode ──────────────────────────────────
  ...Object.fromEntries(
    (
      [
        ['Stars', 'Normal'],
        ['Flags', 'Flag'],
        ['Towers', 'Tower'],
        ['Shields', 'Defense'],
        ['Bosses', 'Boss'],
      ] as const
    ).flatMap(([prefix, mode]) =>
      [1, 2, 3].map((tier) => {
        const id = `${prefix}${tier}`;
        return [
          id,
          () => ({ ...emptyInputs(), progress: clearedLevels(mode, requirementOf(id) + 2) }),
        ];
      }),
    ),
  ),

  // ── The nine per-level Booleans ────────────────────────────────────────
  PoisonDoctor: () => ({ ...emptyInputs(), level: level('Normal', { doctorPoisoned: true }) }),
  FreezeTemperamental: () => ({
    ...emptyInputs(),
    level: level('Normal', { temperamentalFrozen: true }),
  }),
  TrapMine: () => ({ ...emptyInputs(), level: level('Normal', { trapEnemyMineKill: true }) }),
  AddictedCake: () => ({
    ...emptyInputs(),
    level: level('Normal', { damageAddictEnemyCake: true }),
  }),
  // Set by the tank in any mode; only counted on Defense.
  Racing: () => ({ ...emptyInputs(), level: level('Defense', { hitBottom: true }) }),
  // `nothingPressed` starts true, so the level-start set is already the case.
  Idle: () => ({ ...emptyInputs(), level: level('Normal') }),
  FlagNoWeapons: () => ({ ...emptyInputs(), level: level('Flag') }),
  // Tower, not Defense — the T215 divergence. If this is ever changed back,
  // the mode here and the predicate must move together or the sweep passes
  // while the achievement is unreachable in the game.
  DefensiveBombs: () => ({
    ...emptyInputs(),
    level: level('Tower', { timedBombsFired: true, otherThanTimedBombsFired: false }),
  }),
  BossOnlySpecial: () => ({
    ...emptyInputs(),
    level: level('Boss', { onlySpecialWeapons: true, threeBosses: true }),
  }),
};

const earned = (inputs: AchievementInputs): string[] =>
  updateAchievements({}, achievementValueSource(inputs), DIFFICULTY).newlyEarned;

describe('every achievement is reachable', () => {
  it('has an earning input for every id in the data', () => {
    /*
     * Derived from `ACHIEVEMENTS`, not a copied count — a new achievement
     * fails here until someone works out how it is earned, which is the point
     * at which that is easiest to get right.
     */
    const missing = ACHIEVEMENTS.filter((a) => !EARNING_INPUT[a.id]).map((a) => a.id);
    expect(missing, 'no earning input written for these').toEqual([]);

    const extra = Object.keys(EARNING_INPUT).filter(
      (id) => !ACHIEVEMENTS.some((a) => a.id === id),
    );
    expect(extra, 'earning inputs for ids that do not exist').toEqual([]);
  });

  for (const spec of ACHIEVEMENTS) {
    it(`${spec.id} (${spec.title}) fires on an input that should earn it`, () => {
      expect(earned(EARNING_INPUT[spec.id]())).toContain(spec.id);
    });
  }

  it('earns nothing at all from a blank slate', () => {
    /*
     * The counterpart to all 36 above. A predicate returning `true`
     * unconditionally, or a threshold of zero, would pass every test in this
     * file without it.
     */
    expect(earned(emptyInputs())).toEqual([]);
  });

  it('earns nothing from a level that was not completed', () => {
    /*
     * T213. Four Booleans require `completed`; three are additionally
     * protected by the `hp < 95` rule clearing their flags, but `Idle` reads
     * `nothingPressed`, which that rule does not touch. So a level record with
     * every flag set but `completed: false` must earn none of the four.
     */
    const unfinished: LevelRecord = {
      mode: 'Defense',
      completed: false,
      flags: { ...createLevelFlags(), timedBombsFired: true, hitBottom: true },
    };
    const ids = earned({ ...emptyInputs(), level: unfinished });

    expect(ids).not.toContain('Idle');
    expect(ids).not.toContain('DefensiveBombs');
    expect(ids).not.toContain('FlagNoWeapons');
    expect(ids).not.toContain('BossOnlySpecial');

    // And its counterpart: `Racing` does *not* test completion in the AS3
    // (`:443`), so it still fires here. That is what makes the four above a
    // real rule rather than "nothing fires when completed is false".
    expect(ids).toContain('Racing');
  });
});

/**
 * The descriptions must not describe a rule the game no longer has — T214.
 *
 * `achievementData.ts` is generated from the AS3, so its strings still say
 * "and get 3 medals" for the three weapon-choice achievements. That clause was
 * the `hp < 95` gate, which is gone. A description that overstates the
 * requirement is worse than none: a player who reads it will not attempt the
 * thing they would actually be rewarded for.
 */
describe('the wording matches the rule', () => {
  it('drops the medal clause from the three that no longer need it', () => {
    for (const id of ['FlagNoWeapons', 'DefensiveBombs', 'BossOnlySpecial']) {
      const spec = ACHIEVEMENTS.find((a) => a.id === id)!;
      // The generated string still carries it — if that ever stops being true
      // this override is obsolete and should go.
      expect(spec.description, id + ' generated').toMatch(/3 medals/);
      expect(describeAchievement(id, spec.description), id + ' shown').not.toMatch(/3 medals/);
    }
  });

  it('leaves every other description exactly as generated', () => {
    // The counterpart: an override that rewrote everything would pass above.
    const changed = ACHIEVEMENTS.filter(
      (a) => describeAchievement(a.id, a.description) !== a.description,
    ).map((a) => a.id);
    expect(changed.sort()).toEqual(['BossOnlySpecial', 'DefensiveBombs', 'FlagNoWeapons']);
  });

  it('overrides nothing that is not an achievement', () => {
    for (const id of Object.keys(REWORDED_ACHIEVEMENTS)) {
      expect(ACHIEVEMENTS.some((a) => a.id === id), id).toBe(true);
    }
  });
});
