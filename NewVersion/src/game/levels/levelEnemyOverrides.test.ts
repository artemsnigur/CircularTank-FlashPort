import { describe, expect, it } from 'vitest';

import { BOSS_COUNT_OVERRIDES, applyBossCountOverride } from './levelEnemyOverrides';
import { LEVELS, getLevel } from './levelData';
import type { LevelSpec } from './levelData';
import { bossCount } from './levelPreview';

/** The generated row, before any override — the AS3 as transcribed. */
const sourceRow = (world: number, level: number) => LEVELS[world - 1][level - 1];

describe('the boss-count overrides', () => {
  it('predicts the source count it is diverging from', () => {
    /*
     * The rule that keeps this from being an escape hatch. `from` is what the
     * AS3 currently holds; if a re-extraction changes 1-18, this fails and
     * names the level rather than silently masking the change.
     */
    for (const o of BOSS_COUNT_OVERRIDES) {
      const row = sourceRow(o.world, o.level);
      const entry = row.enemies.find((e) => e.level === 'B' && e.type === o.type);

      expect(entry, `${o.world}-${o.level} has no ${o.type} boss`).toBeDefined();
      expect(entry!.count, `${o.world}-${o.level} source count`).toBe(o.from);
    }
  });

  it('is used — every entry actually changes the level it names', () => {
    // The other half: an entry left behind after the data catches up fails
    // here, so the list cannot rot into decoration.
    for (const o of BOSS_COUNT_OVERRIDES) {
      expect(o.to, `${o.world}-${o.level} is a no-op`).not.toBe(o.from);
      expect(bossCount(getLevel(o.world, o.level)!)).toBe(
        bossCount(sourceRow(o.world, o.level)) + (o.to - o.from),
      );
    }
  });
});

describe('1-18 plays with three bosses', () => {
  it('is the count `BossOnlySpecial` requires, where the source had one', () => {
    /*
     * The point of the divergence, stated as the number the achievement gates
     * on. `threeBosses` is hard: a level with one or two can never earn CHUCK
     * NORRIS however well it is played.
     */
    expect(bossCount(sourceRow(1, 18))).toBe(1);
    expect(bossCount(getLevel(1, 18)!)).toBe(3);
    expect(getLevel(1, 18)!.mode).toBe('Boss');
  });

  it('raises the level total with the roster, rather than eating two enemies', () => {
    /*
     * `levelPreview` works out the ordinary-enemy share as
     * `totalEnemies - bossCount`, so leaving the total alone would have taken
     * two ordinary enemies away to pay for the bosses — a change nobody asked
     * for, hidden inside one that was.
     */
    const before = sourceRow(1, 18);
    const after = getLevel(1, 18)!;

    expect(after.totalEnemies).toBe(before.totalEnemies + 2);
    expect(after.totalEnemies - bossCount(after)).toBe(
      before.totalEnemies - bossCount(before),
    );
  });

  it('leaves every other level alone', () => {
    // The counterpart to all of the above: 404 levels must be untouched, and
    // by reference, which also pins that the accessor stays off the hot path.
    for (const [w, l] of [
      [1, 17],
      [1, 19],
      [1, 1],
      [2, 18],
    ]) {
      expect(bossCount(getLevel(w, l)!), `${w}-${l}`).toBe(bossCount(sourceRow(w, l)));
      expect(applyBossCountOverride(sourceRow(w, l), w, l)).toBe(sourceRow(w, l));
    }
  });
});

describe('applyBossCountOverride guards its own assumptions', () => {
  it('does nothing when the source count is not what the entry predicted', () => {
    /*
     * A mismatch is a *test* failure, not a runtime one — the entry above is
     * what makes it loud. Here it must degrade to the untouched spec rather
     * than throwing, because the alternative is a black screen on level load.
     */
    const drifted: LevelSpec = {
      ...sourceRow(1, 18),
      enemies: [{ type: 'Fast', level: 'B', count: 2 }],
    };
    expect(applyBossCountOverride(drifted, 1, 18)).toBe(drifted);
  });

  it('does nothing when the named type is not on the level', () => {
    const missing: LevelSpec = {
      ...sourceRow(1, 18),
      enemies: [{ type: 'Basic', level: '1', count: 9 }],
    };
    expect(applyBossCountOverride(missing, 1, 18)).toBe(missing);
  });
});
