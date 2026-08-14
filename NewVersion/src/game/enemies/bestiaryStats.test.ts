/**
 * The bestiary's stat block — driven against the AS3's own arithmetic and
 * against the resolver the *game* uses.
 *
 * Expected values are computed from `ScreenEnemies.as:509-567` and the stat
 * rows, never read back out of `bestiaryStats.ts`. Where a figure is stated
 * literally below it was worked out by hand from `enemyStatsData.ts`, which is
 * the only way a test of a formula can fail when the formula is wrong.
 */
import { describe, expect, it } from 'vitest';

import { AS3_FPS, bestiaryStats } from './bestiaryStats';
import { ENEMY_STATS } from './enemyStatsData';
import { resolveEnemyStats } from './enemyStats';
import { BESTIARY } from './bestiaryData';
import type { Difficulty, EnemyLevel } from '../config/constants';

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

describe('the Easy tier-1 baseline', () => {
  /**
   * The anchor: on Easy at tier 1 every multiplier is 1, so the screen must
   * print the stat row unchanged. If this drifts, nothing below means anything.
   */
  it('prints the stat row as it stands', () => {
    const base = ENEMY_STATS.Basic.normal;
    const stats = bestiaryStats('Basic', '1', 'Easy')!;

    expect(stats.money).toBe(base.money);
    expect(stats.health).toBe(base.health);
    expect(stats.damage).toBe(base.damage);
    expect(stats.speed).toBe(Math.round(base.moveSpeedMax * AS3_FPS));
  });

  it('converts speed to pixels per second, not per frame', () => {
    // `:551` multiplies by 30 — the fixed rate the original ran at. Dropping it
    // would show "2 PX/Sec" for an enemy that crosses the room in seconds, and
    // would look like a plausible small number rather than an obvious fault.
    const base = ENEMY_STATS.Basic.normal;

    expect(bestiaryStats('Basic', '1', 'Easy')!.speed).toBeGreaterThan(base.moveSpeedMax);
    expect(AS3_FPS).toBe(30);
  });
});

describe('the multipliers', () => {
  it('scales health, damage and speed by difficulty', () => {
    // Hard is 1.4 / 1.4 / 1.2 — `DifficultyMultipliers.as`, stated here rather
    // than read from the profile so a change to the table fails this test.
    const base = ENEMY_STATS.Basic.normal;
    const hard = bestiaryStats('Basic', '1', 'Hard')!;

    expect(hard.health).toBe(Math.round(base.health * 1.4));
    expect(hard.damage).toBe(Math.round(base.damage * 1.4));
    expect(hard.speed).toBe(Math.round(base.moveSpeedMax * AS3_FPS * 1.2));
  });

  it('leaves money alone across difficulties', () => {
    // The counterpart to the line above: `:546` applies only the *tier*
    // multiplier to money. A blanket "scale everything by difficulty" passes
    // the previous test and fails this one.
    const easy = bestiaryStats('Basic', '1', 'Easy')!;

    for (const difficulty of DIFFICULTIES) {
      expect(bestiaryStats('Basic', '1', difficulty)!.money).toBe(easy.money);
    }
  });

  it('scales everything but speed by tier', () => {
    const base = ENEMY_STATS.Basic.normal;
    const tier3 = bestiaryStats('Basic', '3', 'Easy')!;

    expect(tier3.money).toBe(Math.round(base.money * 1.4));
    expect(tier3.health).toBe(Math.round(base.health * 1.4));
    expect(tier3.damage).toBe(Math.round(base.damage * 1.4));
    // Speed has no tier term at `:551` — same enemy, same pace.
    expect(tier3.speed).toBe(bestiaryStats('Basic', '1', 'Easy')!.speed);
  });
});

describe('the boss exception', () => {
  /**
   * `:513` and `:527` set `hpMultiplier = 1` for a boss while leaving damage
   * and speed scaled. Asserted as a *difference between two calls*, so it
   * cannot be satisfied by a build that ignores difficulty everywhere.
   */
  it('gives a boss no health multiplier, but keeps its damage one', () => {
    const easy = bestiaryStats('Basic', 'B', 'Easy')!;
    const hard = bestiaryStats('Basic', 'B', 'Hard')!;

    expect(hard.health).toBe(easy.health);
    expect(hard.damage).toBeGreaterThan(easy.damage);
    expect(hard.damage).toBe(Math.round(ENEMY_STATS.Basic.boss.damage * 1.4));
  });

  it('still scales an ordinary enemy`s health on the same difficulty', () => {
    // The counterpart on the identical input but for the tier: without it,
    // "health does not change" would be satisfied by dropping the multiplier
    // altogether.
    const easy = bestiaryStats('Basic', '1', 'Easy')!;
    const hard = bestiaryStats('Basic', '1', 'Hard')!;

    expect(hard.health).toBeGreaterThan(easy.health);
  });
});

describe('the two speed ranges', () => {
  it('shows Temperamental up to x4, and x3 as a boss', () => {
    const normal = bestiaryStats('Temperamental', '1', 'Easy')!;
    const boss = bestiaryStats('Temperamental', 'B', 'Easy')!;

    expect(normal.speedMax).toBe(normal.speed * 4);
    expect(boss.speedMax).toBe(boss.speed * 3);
  });

  it('shows Accelerating up to x3 either way', () => {
    // `:566` has no boss branch — the same ceiling for both, which is the
    // detail that makes this a per-type table rather than one rule.
    const normal = bestiaryStats('Accelerating', '1', 'Easy')!;
    const boss = bestiaryStats('Accelerating', 'B', 'Easy')!;

    expect(normal.speedMax).toBe(normal.speed * 3);
    expect(boss.speedMax).toBe(boss.speed * 3);
  });

  it('gives every other type a single speed', () => {
    // The counterpart, across all 20: a range on a type that has none would
    // print "40-40" and read as deliberate.
    const ranged = BESTIARY.filter(
      (e) => bestiaryStats(e.id, '1', 'Easy')?.speedMax !== undefined,
    ).map((e) => e.id);

    expect(ranged.sort()).toEqual(['Accelerating', 'Temperamental']);
  });
});

describe('agreement with the game', () => {
  /**
   * **The check that matters most.** Two formulas for the same quantity is how
   * a screen ends up quietly lying about the enemy the player is fighting, so
   * the screen's output is driven against the resolver the spawner uses, across
   * every type, every playable tier and every difficulty.
   *
   * Bosses are excluded deliberately and the next test says why.
   */
  it('matches resolveEnemyStats on every type, tier and difficulty', () => {
    const tiers: EnemyLevel[] = ['1', '2', '3'];
    let compared = 0;

    for (const entry of BESTIARY) {
      for (const tier of tiers) {
        for (const difficulty of DIFFICULTIES) {
          const shown = bestiaryStats(entry.id, tier, difficulty)!;
          const played = resolveEnemyStats(entry.id, tier, difficulty)!;

          expect(shown.health, `${entry.id} ${tier} ${difficulty} health`).toBe(played.health);
          expect(shown.damage, `${entry.id} ${tier} ${difficulty} damage`).toBe(played.damage);
          expect(shown.money, `${entry.id} ${tier} ${difficulty} money`).toBe(played.money);
          // The screen prints per second; the resolver steps per frame.
          expect(shown.speed, `${entry.id} ${tier} ${difficulty} speed`).toBe(
            Math.round(played.moveSpeedMax * AS3_FPS),
          );
          compared += 1;
        }
      }
    }

    // The instrument check: a loop that compared nothing would pass silently.
    expect(compared).toBe(BESTIARY.length * tiers.length * DIFFICULTIES.length);
  });

  /**
   * Where they part, and that it is intended. `resolveEnemyStats` divides a
   * boss's money by the level's boss count and rounds to ten
   * (`PartGameArea.as`); the bestiary is not looking at a level, so
   * `ScreenEnemies.as:546` shows the undivided figure.
   *
   * Pinned rather than described, so the day someone "fixes" the screen to call
   * the resolver, this fails and explains itself.
   */
  it('parts company with it on boss money, on purpose', () => {
    const shown = bestiaryStats('Basic', 'B', 'Easy')!;

    expect(shown.money).toBe(ENEMY_STATS.Basic.boss.money);
    // Health still agrees — the divergence is money alone, not the whole row.
    expect(shown.health).toBe(resolveEnemyStats('Basic', 'B', 'Easy')!.health);
  });
});

describe('a type with no stat row', () => {
  it('returns undefined rather than a plausible zero', () => {
    expect(bestiaryStats('NotAnEnemy', '1', 'Easy')).toBeUndefined();
    // The counterpart: a real id on the same call returns a block.
    expect(bestiaryStats('Basic', '1', 'Easy')).toBeDefined();
  });
});
