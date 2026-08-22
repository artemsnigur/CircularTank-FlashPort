import { describe, expect, it } from 'vitest';

import {
  CAMPAIGN_MONEY_MULTIPLIER,
  CAMPAIGN_TUNING,
  campaignMoney,
  tuneLevel,
  tuneSpeeds,
  tuningFor,
} from './campaignTuning';
import { baseDropAmount, dropAmount } from '../items/money';
import { resolveEnemyStats } from '../enemies/enemyStats';
import { AS3_LEVELS, LEVELS, getLevel } from '../levels/levelData';
import type { LevelMode, LevelSpec } from '../levels/levelData';

const MODES: LevelMode[] = ['Normal', 'Flag', 'Tower', 'Defense', 'Boss'];

/**
 * A row of the campaign as authored, before `getLevel` tunes it.
 *
 * `LEVELS` is the campaign — `AS3_LEVELS` is the original, and neither is a
 * view of the other since T252.
 */
const source = (world: number, level: number): LevelSpec => LEVELS[world - 1][level - 1];

describe('the tuning as decided', () => {
  /*
   * `D-3` restated from the decision, not read back out of the table: +20%
   * enemies and -30% spawn interval everywhere, and Defense instead at -40%
   * interval with enemies 50% faster. These five lines are the specification,
   * and a test that asked the module for its own numbers could not tell a
   * correct one from a typo.
   */
  it('is +20% count and -30% interval outside Defense', () => {
    for (const mode of ['Normal', 'Flag', 'Tower', 'Boss'] as LevelMode[]) {
      expect(tuningFor(mode), mode).toEqual({
        enemyCount: 1.2,
        spawnInterval: 0.7,
        enemySpeed: 1,
      });
    }
  });

  it('is -40% interval and +50% speed on Defense', () => {
    expect(tuningFor('Defense')).toEqual({
      enemyCount: 1.2,
      spawnInterval: 0.6,
      enemySpeed: 1.5,
    });
  });

  it('covers every mode', () => {
    // Derived from the mode list, so a sixth mode fails here rather than
    // silently picking up a default nobody chose.
    expect(new Set(Object.keys(CAMPAIGN_TUNING))).toEqual(new Set(MODES));
  });

  it('scales a duration downward, which is the field most easily inverted', () => {
    // `spawnInterval` multiplies *frames between spawns*, so below 1 is faster.
    // Asserted as a direction rather than left to the name.
    for (const mode of MODES) expect(tuningFor(mode).spawnInterval, mode).toBeLessThan(1);
    expect(tuningFor('Defense').spawnInterval).toBeLessThan(tuningFor('Normal').spawnInterval);
  });
});

describe('tuneLevel', () => {
  it('raises the counts and shortens the interval', () => {
    const before = source(1, 1);
    const after = tuneLevel(before);

    expect(before.enemies).toEqual([{ type: 'Basic', level: '1', count: 10 }]);
    expect(after.enemies[0].count).toBe(12);
    // The AS3's own opener, for contrast — same ten Basic, and this table is
    // never tuned.
    expect(AS3_LEVELS[0][0].totalEnemies).toBe(10);
    expect(after.spawnInterval).toBeCloseTo(before.spawnInterval * 0.7, 6);
  });

  /**
   * The invariant that makes a level winnable: the kill target is the sum of
   * what the level actually fields.
   *
   * It holds on all 405 source rows, and scaling the total independently would
   * break it — rounding the counts down and the total up leaves a target that
   * can never be reached. Driven across every level rather than on a sample,
   * because a rounding failure is exactly the kind that hits one row in 405.
   */
  it('keeps the kill target equal to the sum of the wave, on every level', () => {
    for (let w = 1; w <= LEVELS.length; w += 1) {
      for (let l = 1; l <= LEVELS[w - 1].length; l += 1) {
        const spec = getLevel(w, l)!;
        const sum = spec.enemies.reduce((n, e) => n + e.count, 0);
        expect(sum, `${w}-${l}`).toBe(spec.totalEnemies);
      }
    }
  });

  it('leaves boss entries alone', () => {
    /*
     * `bossAmount` is a design number, and 1.2x of three bosses is four — a
     * different fight from the one specified. Driven on a real Boss level, with
     * its ordinary entries beside it so "leaves alone" cannot quietly become
     * "leaves everything alone".
     */
    const before = source(1, 5);
    const after = tuneLevel(before);
    expect(before.mode, 'fixture is a Boss level').toBe('Boss');

    const bossBefore = before.enemies.filter((e) => e.level === 'B');
    const bossAfter = after.enemies.filter((e) => e.level === 'B');
    expect(bossAfter).toEqual(bossBefore);

    const ordinaryBefore = before.enemies.filter((e) => e.level !== 'B');
    const ordinaryAfter = after.enemies.filter((e) => e.level !== 'B');
    for (let i = 0; i < ordinaryBefore.length; i += 1) {
      expect(ordinaryAfter[i].count, ordinaryBefore[i].type).toBe(
        Math.round(ordinaryBefore[i].count * 1.2),
      );
    }
  });

  it('never rounds an entry away', () => {
    // A count of 1 scaled by 1.2 rounds to 1, not 0 — but the floor is what
    // guarantees it for any future multiplier below 1, and losing a type from
    // a composition is silent.
    const spec = tuneLevel({
      ...source(1, 1),
      enemies: [{ type: 'Basic', level: '1', count: 1 }],
      totalEnemies: 1,
    });
    expect(spec.enemies[0].count).toBeGreaterThanOrEqual(1);
  });

  it('gives Defense a shorter interval than the same level would get elsewhere', () => {
    // The mode split, driven on one spec so the only difference is the mode.
    const base = source(1, 3);
    const asDefense = tuneLevel({ ...base, mode: 'Defense' });
    const asNormal = tuneLevel({ ...base, mode: 'Normal' });

    expect(asDefense.spawnInterval).toBeLessThan(asNormal.spawnInterval);
    // ...and the same count, so the two rules stay separable.
    expect(asDefense.totalEnemies).toBe(asNormal.totalEnemies);
  });

  it('is what `getLevel` hands out', () => {
    /*
     * The wiring, not the module. `tuneLevel` being right proves nothing about
     * whether the game plays a tuned level — the defect this project keeps
     * finding. Compared against the untouched source row.
     */
    const played = getLevel(1, 1)!;
    expect(played.totalEnemies).toBe(12);
    expect(played.totalEnemies).toBeGreaterThan(source(1, 1).totalEnemies);
    expect(played.spawnInterval).toBeLessThan(source(1, 1).spawnInterval);
  });
});

describe('tuneSpeeds', () => {
  const stats = { moveSpeedMax: 2, accSpeed: 0.4 };

  it('runs Defense enemies half again as fast, acceleration included', () => {
    // Both fields: scaling top speed alone leaves them taking just as long to
    // get going, which is most of what the Defense rule is for.
    //
    // `toBeCloseTo`, not `toEqual`: `0.4 * 1.5` is 0.6000000000000001. The
    // speeds are floats the AS3 never rounds — `resolveEnemyStats` rounds
    // damage, health and money and deliberately leaves these alone — so the
    // tolerance belongs in the test rather than a rounding step in the code.
    const tuned = tuneSpeeds(stats, 'Defense');
    expect(tuned.moveSpeedMax).toBeCloseTo(3, 10);
    expect(tuned.accSpeed).toBeCloseTo(0.6, 10);
  });

  it('leaves every other mode exactly as it found it', () => {
    // The counterpart, and identity rather than equality — an untouched mode
    // should not even copy.
    for (const mode of ['Normal', 'Flag', 'Tower', 'Boss'] as LevelMode[]) {
      expect(tuneSpeeds(stats, mode), mode).toBe(stats);
    }
  });

  it('carries fields it does not know about through', () => {
    // It runs on a full `ResolvedEnemyStats` at the spawn site, so anything it
    // does not name has to survive — health, damage, the shoot columns.
    const full = { ...stats, health: 10, damage: 5, shootType: 'BulletEnemy' };
    expect(tuneSpeeds(full, 'Defense')).toMatchObject({
      health: 10,
      damage: 5,
      shootType: 'BulletEnemy',
    });
  });
});

describe('the campaign pays what the original did', () => {
  /**
   * Total money a player can earn, assuming everything dies and every flag is
   * collected.
   *
   * Computed with `dropAmount`'s own rules rather than a second copy of them —
   * Flag levels pay nothing on a kill, a Boss level halves its ordinary
   * enemies, and a boss's bounty is split across the level's bosses. Getting
   * any of those wrong here would move the total by tens of percent.
   */
  function campaignTotal(worlds: readonly (readonly LevelSpec[])[], tuned: boolean): number {
    let total = 0;
    for (const world of worlds) {
      for (const authored of world) {
        const spec = tuned ? tuneLevel(authored) : authored;
        const bossAmount =
          spec.enemies.filter((e) => e.level === 'B').reduce((n, e) => n + e.count, 0) || 1;

        if (spec.mode === 'Flag') {
          total += (tuned ? campaignMoney(spec.flagMoney) : spec.flagMoney) * spec.flagCount;
          continue;
        }
        for (const entry of spec.enemies) {
          const stats = resolveEnemyStats(entry.type, entry.level, 'Easy');
          if (!stats) continue;
          const per = tuned
            ? dropAmount({
                money: stats.money,
                isBoss: entry.level === 'B',
                bossAmount,
                mode: spec.mode,
                reachedTank: false,
                tankHp: 100,
              })
            : baseDropAmount({
                money: stats.money,
                isBoss: entry.level === 'B',
                // The AS3 divided a boss's *stat line*; `baseDropAmount` divides
                // the payout. Same result, and this is the original's side of
                // the comparison, so it takes the same divisor.
                bossAmount,
                mode: spec.mode,
                reachedTank: false,
                tankHp: 100,
              });
          total += per * entry.count;
        }
      }
    }
    return total;
  }

  it('lands within 5% of the original 405-level campaign', () => {
    /*
     * The mechanism behind `CAMPAIGN_MONEY_MULTIPLIER`. That constant is
     * pinned rather than derived, so **this is what stops it going stale**: if
     * a future edit changes the campaign's length, its rosters or its flag
     * numbers, the totals drift apart and someone is told to re-measure.
     *
     * 5% because the figure assumes perfect collection on both sides and the
     * multiplier is deliberately rounded to something a person can hold.
     */
    const original = campaignTotal(AS3_LEVELS, false);
    const redesign = campaignTotal(LEVELS, true);

    expect(original, 'the original earns something').toBeGreaterThan(0);
    expect(Math.abs(redesign / original - 1)).toBeLessThan(0.05);
  });

  it('would be less than half of it untuned, which is the reason it exists', () => {
    // The counterpart. Without it, "within 5%" would pass just as well for a
    // campaign that never needed a multiplier at all — and the whole finding
    // is that 180 levels earn 0.48x what 405 did.
    const original = campaignTotal(AS3_LEVELS, false);
    const untuned = campaignTotal(LEVELS, false);

    expect(untuned / original).toBeLessThan(0.6);
    expect(CAMPAIGN_MONEY_MULTIPLIER).toBeGreaterThan(1.5);
  });
});
