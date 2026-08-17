import { describe, it, expect } from 'vitest';
import { buildAchievementStats, MEDAL_TIERS } from './achievementStats';
import { createEmptyProgress, TOTALS_TYPE_TO_MODE } from '../levels/levelProgress';
import { LEVELS } from '../levels/levelData';

const NO_TOTALS = { enemyKills: 0, moneyEarned: 0 };

describe('buildAchievementStats', () => {
  it('stacks the five modes in the order the AS3 draws them', () => {
    // `:727` onward steps y by 32 per row: Stars, Flags, Towers, Shields,
    // Bosses. Stated from the source, not read back off the implementation.
    const rows = buildAchievementStats(createEmptyProgress(), NO_TOTALS).medals;
    expect(rows.map((row) => row.type)).toEqual([
      'Stars',
      'Flags',
      'Towers',
      'Shields',
      'Bosses',
    ]);
    expect(rows.map((row) => row.mode)).toEqual(['Normal', 'Flag', 'Tower', 'Defense', 'Boss']);
    for (const row of rows) expect(row.mode).toBe(TOTALS_TYPE_TO_MODE[row.type]);
  });

  it('runs the tiers bronze, silver, gold — the icon frame order', () => {
    // `gotoAndStop(1 | 2 | 3)` at `:730`, `:733`, `:736`. The reverse of the
    // values triple, where slot 0 is Hard.
    expect([...MEDAL_TIERS]).toEqual(['bronze', 'silver', 'gold']);
  });

  it('passes the two running totals through untouched', () => {
    const stats = buildAchievementStats(createEmptyProgress(), {
      enemyKills: 4821,
      moneyEarned: 930_412,
    });
    expect(stats.enemyKills).toBe(4821);
    expect(stats.moneyEarned).toBe(930_412);
  });

  it('is all zeroes on a fresh profile', () => {
    const rows = buildAchievementStats(createEmptyProgress(), NO_TOTALS).medals;
    for (const row of rows) expect(row.counts).toEqual({ bronze: 0, silver: 0, gold: 0 });
  });

  /*
   * ── The tier mapping, pinned against its opposite ────────────────────────
   *
   * The one thing here that can be transcribed backwards. Bronze counts Easy
   * and gold counts Hard, which reads inverted next to the values triple's
   * `[hard, medium, easy]`. Asserting only the Easy case would pass just as
   * happily with the mapping flipped, because the cascade makes Easy the
   * widest of the three — so each of these drives the *same* profile through
   * both ends and requires them to disagree.
   */
  const firstNormal = LEVELS[0].findIndex((level) => level.mode === 'Normal');
  const stars = (progress: ReturnType<typeof createEmptyProgress>): Record<string, number> =>
    buildAchievementStats(progress, NO_TOTALS).medals[0].counts;

  it('counts an Easy win under bronze and not under gold', () => {
    const progress = createEmptyProgress();
    progress[0][firstNormal] = [0, 0, 2]; // slot 2 is Easy
    expect(stars(progress).bronze).toBe(2);
    expect(stars(progress).gold).toBe(0);
    expect(stars(progress).silver).toBe(0);
  });

  it('counts a Hard win under gold *and* under bronze — the cascade', () => {
    // Not a symmetry: Hard's medals are visible to every tier, because
    // `bestValueFor` widens as the rank falls. Beating a level on Hard earns
    // the bronze tally too, which is why the Easy assertion above needs the
    // gold counterpart beside it to mean anything.
    const progress = createEmptyProgress();
    progress[0][firstNormal] = [3, 0, 0]; // slot 0 is Hard
    expect(stars(progress).gold).toBe(3);
    expect(stars(progress).silver).toBe(3);
    expect(stars(progress).bronze).toBe(3);
  });

  it('keeps a Flag win out of the Stars row', () => {
    const progress = createEmptyProgress();
    const firstFlag = LEVELS[0].findIndex((level) => level.mode === 'Flag');
    progress[0][firstFlag] = [3, 0, 0];
    const rows = buildAchievementStats(progress, NO_TOTALS).medals;
    expect(rows[0].counts.gold).toBe(0); // Stars
    expect(rows[1].counts.gold).toBe(3); // Flags
  });
});
