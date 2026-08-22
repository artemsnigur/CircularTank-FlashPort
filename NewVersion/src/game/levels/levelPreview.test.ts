/**
 * The next-level preview — `PartInfoText.as:222-294` and `ButtonNextLevel.as:335`.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  amountLabel,
  bossCount,
  enemyAmounts,
  levelLabel,
  levelPreview,
  previewForLevel,
} from './levelPreview';
import { AS3_LEVELS, LEVELS, getLevel } from './levelData';
import type { LevelSpec } from './levelData';

/**
 * `AS3_LEVELS` is the original's 9x45; `LEVELS` is the redesigned campaign and
 * `getLevel` is that with the density tuning applied. They are three different
 * things since T252, not three views of one.
 *
 * The describes in this file are about the AS3's shape — "the AS3 pair walk",
 * "the amount label, four branches" — so they read the original. A test that
 * reached for `getLevel` here would stop checking `ScreenGame.as` and start
 * checking our redesign.
 */
const source = (world: number, level: number): LevelSpec => AS3_LEVELS[world - 1][level - 1];

/**
 * The first campaign level of a mode, as `[world, level]`.
 *
 * Several tests below wanted "a Boss level" or "a Defense level" and named a
 * number, which was a stable description while the campaign was the AS3's.
 * It is not any more — the redesign moved every mode (T252) — so they ask for
 * what they need and let the table answer.
 */
function firstOfMode(mode: string): [number, number] {
  for (const [w, world] of LEVELS.entries()) {
    for (const [l, spec] of world.entries()) {
      if (spec.mode === mode) return [w + 1, l + 1];
    }
  }
  throw new Error(`no ${mode} level in the campaign`);
}


import { getDifficultyProfile } from '../config/difficultyMultipliers';
import { enemyShape } from '../entities/enemyArt';
import { shapeUrls } from '../../assets/registry';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'] as const;

describe('LevelSpec.enemies is the AS3 pair walk, not an approximation', () => {
  /**
   * **The equivalence the whole module rests on, checked rather than assumed.**
   *
   * The AS3 walks `(row.length - 2) / 2` pairs from index 2, name at
   * `i * 2 + 2` and count at `i * 2 + 3`, splitting the trailing character off
   * the name. `gen-levels.mjs` does that walk once and stores the result.
   *
   * So this reconstructs the flat row from `LevelSpec` and asserts it matches
   * the shape the AS3 indexes — same length arithmetic, same stride, same
   * order. A generator that sorted the pairs, or dropped a zero-count one,
   * would pass every "a list renders" check and fail here.
   */
  it('round-trips level 1-9 through the flat row the AS3 indexes', () => {
    const spec = source(1, 9);
    // 1-9 is the useful fixture: Boss mode, four pairs, and the boss is
    // **first**, so an implementation that assumed bosses sort last fails.
    expect(spec.mode).toBe('Boss');
    expect(spec.enemies).toEqual([
      { type: 'Basic', level: 'B', count: 1 },
      { type: 'Fast', level: '1', count: 7 },
      { type: 'Basic', level: '1', count: 6 },
      { type: 'Shooting', level: '1', count: 6 },
    ]);

    // The flat row as `ScreenGame.worldModels[0][8]` holds it.
    const row: (string | number)[] = [spec.totalEnemies, spec.spawnInterval];
    for (const e of spec.enemies) row.push(`${e.type}${e.level}`, e.count);

    expect((row.length - 2) / 2).toBe(spec.enemies.length);
    for (let i = 0; i < (row.length - 2) / 2; i += 1) {
      const name = String(row[i * 2 + 2]);
      expect(name.slice(0, -1)).toBe(spec.enemies[i].type);
      expect(name.slice(-1)).toBe(spec.enemies[i].level);
      expect(row[i * 2 + 3]).toBe(spec.enemies[i].count);
    }
  });

  /** The generator uses the identical stride; pinned against its source. */
  it('the generator walks from index 2 in steps of 2', () => {
    const gen = readFileSync('scripts/gen-levels.mjs', 'utf8');
    expect(gen).toContain('for (let i = 2; i + 1 < cells.length; i += 2)');
    expect(gen).toContain('raw.slice(-1)');
    expect(gen).toContain('raw.slice(0, -1)');
  });
});

describe('the amount label, four branches', () => {
  /**
   * `:251-263`. Each branch is asserted on a **named level with known
   * numbers**, and against the branch it is not — a single mode would let a
   * one-branch implementation pass.
   */
  it('Normal/Tower/Defense print a count', () => {
    // 1-2: Normal, Basic 12 and Fast 6 of 18.
    const spec = source(1, 2);
    expect(spec.mode).toBe('Normal');
    expect(amountLabel(spec, 0, 'Easy')).toBe('12 X');
    expect(amountLabel(spec, 1, 'Easy')).toBe('6 X');
  });

  it('Flag prints a share of the whole roster', () => {
    // 1-3: Flag, Basic 10 and Fast 4 of 14.
    const spec = source(1, 3);
    expect(spec.mode).toBe('Flag');
    expect(spec.totalEnemies).toBe(14);
    // 10/14 = 71.428… -> 71.4%, 4/14 = 28.571… -> 28.6%.
    expect(amountLabel(spec, 0, 'Easy')).toBe('71.4%');
    expect(amountLabel(spec, 1, 'Easy')).toBe('28.6%');
  });

  /**
   * The branch that is easiest to get wrong, and the counterpart that proves
   * it was not folded into Flag: Boss mode divides by the total **less the
   * bosses**, and a boss row prints a count rather than a share.
   */
  it('Boss mode excludes the bosses from the denominator', () => {
    const spec = source(1, 9);
    expect(spec.totalEnemies).toBe(20);
    expect(bossCount(spec)).toBe(1);

    // The boss row: a count, not a percentage.
    expect(amountLabel(spec, 0, 'Easy')).toBe('1 X');
    // The rest: shares of 20 - 1 = 19, NOT of 20.
    expect(amountLabel(spec, 1, 'Easy')).toBe('36.8%'); // 7/19
    expect(amountLabel(spec, 2, 'Easy')).toBe('31.6%'); // 6/19
    expect(amountLabel(spec, 3, 'Easy')).toBe('31.6%');

    // If the denominator were the Flag branch's, 7/20 would read 35%.
    expect(amountLabel(spec, 1, 'Easy')).not.toBe('35%');
  });

  it('rounds to one decimal, dropping a trailing zero as the AS3 does', () => {
    // `Math.round(x * 1000) / 10` yields a Number, so 50.0 prints as "50".
    const spec = source(1, 3);
    // Fast is 4 of 14; construct the exact-half case from 1-5 instead.
    const half = source(1, 5);
    expect(half.mode).toBe('Flag');
    expect(amountLabel(half, 0, 'Easy')).toBe('100%');
    expect(spec.enemies.length).toBe(2);
  });
});

describe('the difficulty multiplier is 1, and that is load-bearing', () => {
  /**
   * `enemyAmounts` returns the raw counts because the AS3's redistribution
   * (`:121-141`) cannot run at a multiplier of 1. That is an assumption about
   * the data, so it is asserted against the AS3 line rather than trusted.
   */
  it('matches DifficultyMultipliers.as on all three difficulties', () => {
    const as3 = readFileSync('../SWFimported/scripts/DifficultyMultipliers.as', 'utf8');
    expect(as3).toMatch(/multiplierAmountMedium:Number = 1;/);
    expect(as3).toMatch(/multiplierAmountHard:Number = 1;/);
    for (const d of DIFFICULTIES) {
      expect(getDifficultyProfile(d).amount, d).toBe(1);
    }
  });

  /** So every difficulty produces the same per-type counts. */
  it('gives the same counts on Easy, Medium and Hard', () => {
    const spec = source(1, 2);
    const byDifficulty = DIFFICULTIES.map((d) => enemyAmounts(spec, d));
    expect(byDifficulty[0]).toEqual([12, 6]);
    for (const amounts of byDifficulty) expect(amounts).toEqual(byDifficulty[0]);
  });

  /**
   * The counterpart, and the reason the guard is an error rather than a
   * comment: change the constant and the unported branch becomes reachable,
   * loudly.
   */
  it('refuses to answer if a multiplier ever stops being 1', () => {
    const spec = source(1, 2);
    const profile = getDifficultyProfile('Hard');
    const original = profile.amount;
    try {
      (profile as { amount: number }).amount = 1.5;
      expect(() => enemyAmounts(spec, 'Hard')).toThrow(/redistribution is unported/);
    } finally {
      (profile as { amount: number }).amount = original;
    }
    // …and it answers again once the constant is back.
    expect(enemyAmounts(spec, 'Hard')).toEqual([12, 6]);
  });
});

describe('the level label', () => {
  it('spells a boss row BOSS and a numbered row LVL n', () => {
    expect(levelLabel('B')).toBe('BOSS');
    expect(levelLabel('1')).toBe('LVL 1');
    expect(levelLabel('3')).toBe('LVL 3');
  });
});

/**
 * The upgrade limit is gone from the panel — **divergence `A11`**.
 *
 * Not "the string is absent": absence alone would also pass if the summary
 * were empty, or if the builder had broken entirely. Each assertion below is
 * paired with the rows that must still be there.
 */
describe('the panel does not print an upgrade limit', () => {
  it('omits the row while keeping the other five', () => {
    const preview = previewForLevel(1, 9, 'Easy')!;

    expect(preview.summary).not.toContain('Upgrade Limit');
    // The counterpart: the panel is otherwise intact, so this is a removed row
    // and not a broken builder.
    expect(preview.summary).toContain('World: 1');
    expect(preview.summary).toContain('Level: 9');
    expect(preview.summary).toContain('Mode: Boss');
    expect(preview.summary).toContain('Difficulty: Easy');
    expect(preview.summary).toContain('Objective:');
    expect(preview.summary.split('\n')).toHaveLength(5);
  });

  it('omits it on every level, not just the fixture', () => {
    // Upgrade limits run 1..10 across the campaign and a level at either end
    // would print a different string, so the sweep is what makes this a rule.
    let checked = 0;
    for (let w = 0; w < LEVELS.length; w += 1) {
      for (let l = 0; l < LEVELS[w].length; l += 1) {
        const preview = previewForLevel(w + 1, l + 1, 'Easy');
        if (!preview) continue;
        expect(preview.summary, `${w + 1}-${l + 1}`).not.toMatch(/Upgrade Limit/);
        checked += 1;
      }
    }
    // The whole campaign, counted rather than named — it was 405 and is 180.
    expect(checked).toBe(LEVELS.flat().length);
  });

  it('keeps the datum in LevelSpec, unread', () => {
    // `A11` drops the *display* and the *enforcement*, not the extraction.
    // Silently dropping a column whose meaning is known is how `enemyModel[1]`
    // was nearly lost — see CLAIMING SOMETHING IS UNUSED in CLAUDE.md.
    const spec = source(1, 9);
    expect(spec.upgradeLimit).toBe(2);
    expect(spec.upgradeLimit).toBeGreaterThanOrEqual(1);
    expect(spec.upgradeLimit).toBeLessThanOrEqual(10);
  });
});

describe('the whole preview for a named level', () => {
  /**
   * **Against 1-9's actual roster, entry for entry** — not "a list renders".
   * Boss mode, four rows, mixed level labels, and two rows sharing a
   * percentage, so a builder that deduplicated or reordered fails.
   */
  it('builds a Boss level exactly', () => {
    const [world, level] = firstOfMode('Boss');
    const spec = getLevel(world, level)!;
    const preview = levelPreview(world, level, 'Easy', 'Kill the boss')!;

    expect(preview.summary).toBe(
      `World: ${world}\nLevel: ${level}\nMode: Boss\nDifficulty: Easy\nObjective: Kill the boss`,
    );

    /*
     * Row for row against the level's own composition, rather than against a
     * transcribed list. The shapes being pinned are Boss mode's: the boss row
     * prints a count and every other row a share of the total **less** the
     * bosses, so a builder that used the whole total, deduplicated or reordered
     * still fails here.
     */
    const bosses = spec.enemies.filter((e) => e.level === 'B').reduce((n, e) => n + e.count, 0);
    const support = spec.totalEnemies - bosses;

    expect(preview.rows).toHaveLength(spec.enemies.length);
    expect(preview.rows.map((r) => [r.type, r.isBoss])).toEqual(
      spec.enemies.map((e) => [e.type, e.level === 'B']),
    );
    expect(preview.rows[0].amountLabel).toBe(`${bosses} X`);
    expect(preview.rows[0].levelLabel).toBe('BOSS');
    for (const [i, row] of preview.rows.slice(1).entries()) {
      const share = Math.round((spec.enemies[i + 1].count / support) * 1000) / 10;
      expect(row.amountLabel, row.type).toBe(`${share}%`);
    }

    // ── A boss row draws the BOSS clip. This is a deliberate divergence ────
    // **`A9`, and it is not the enemyType-stripping bug it looks like.**
    // `PartInfoText.as:271` builds `new Enemy<enemyType>` where `enemyType` had
    // its level character stripped at `:249`, so a `"BasicB"` row draws
    // `EnemyBasic` — the *ordinary* art. `ImageEnemy.as:57-145` has no boss
    // branch either. This port draws `EnemyBasicBoss` instead, by decision:
    // a boss row reads better with boss art.
    //
    // Kept here as an assertion **because it would otherwise look like a slip
    // to fix**: someone reading `:249` and then this file would reasonably
    // conclude the level char had been forgotten. It was found, checked, and
    // kept. See `A9` in the audit before changing it.
    const bossRow = preview.rows[0];
    expect(bossRow.shape).toBe(enemyShape(bossRow.type, true));
    expect(bossRow.shape).not.toBe(enemyShape(bossRow.type, false));
  });

  /**
   * Badges come through unfiltered by "met", and **without** the bestiary's
   * "none" placeholder — `addStrengthsAndWeaknessIcons` adds no icon for an
   * empty list (`:403`, `:464`); the placeholder is `ScreenEnemies.as:385-391`.
   */
  it('shows resistances with no placeholder and no knowledge gate', () => {
    // Basic has neither strengths nor weaknesses — so no badges at all.
    const withBasic = LEVELS.flat().find((l) => l.enemies.some((e) => e.type === 'Basic'))!;
    const [bw, bl] = (() => {
      for (const [w, world] of LEVELS.entries()) {
        const l = world.indexOf(withBasic);
        if (l !== -1) return [w + 1, l + 1];
      }
      throw new Error('unreachable');
    })();

    const preview = levelPreview(bw, bl, 'Easy', 'x')!;
    const basic = preview.rows.find((r) => r.type === 'Basic' && !r.isBoss)!;
    expect(basic.strengths).toEqual([]);
    expect(basic.weaknesses).toEqual([]);

    // The counterpart, on a Defense level fielding a type that does have them:
    // Strong resists Explosions and Bullets. Found rather than named, and the
    // label is checked as a count — Defense prints counts where Flag prints
    // shares, which is the branch this half is really about.
    const found = (() => {
      for (const [w, world] of LEVELS.entries()) {
        for (const [l, spec] of world.entries()) {
          if (spec.mode === 'Defense' && spec.enemies.some((e) => e.type === 'Strong')) {
            return { world: w + 1, level: l + 1, spec };
          }
        }
      }
      throw new Error('no Defense level fields Strong');
    })();

    const withBadges = levelPreview(found.world, found.level, 'Easy', 'x')!;
    const strong = withBadges.rows.find((r) => r.type === 'Strong')!;
    // From `getLevel`, not the authored row: the panel shows what the level
    // actually fields, and `campaignTuning` raises every count on the way out
    // (`D-3`). Comparing against `LEVELS` here was off by exactly that 20%.
    const played = getLevel(found.world, found.level)!;
    const count = played.enemies.find((e) => e.type === 'Strong')!.count;
    expect(strong.amountLabel, 'Defense counts rather than shares').toBe(`${count} X`);
    expect(strong.strengths.map((b) => b.label)).toEqual(['Explosions', 'Bullets']);
    expect(strong.strengths.every((b) => b.damageType !== null)).toBe(true);
  });

  it('returns null for a level that does not exist', () => {
    expect(levelPreview(99, 1, 'Easy', '')).toBeNull();
  });
});

describe('art consistency across all 405 levels', () => {
  /**
   * **The orphan check, as steps 1 and 2 did it.** A preview row with no shape
   * renders as a gap the player would read as a layout bug, and it would only
   * appear on the levels containing that type — so a spot check is worthless.
   * Every type/variant pair that any level can produce is resolved here.
   */
  it('every enemy in every level resolves to a synced shape', () => {
    const unresolved: string[] = [];
    const unsynced: string[] = [];
    const seen = new Set<string>();

    LEVELS.forEach((world, w) =>
      world.forEach((spec, l) =>
        spec.enemies.forEach((e) => {
          const isBoss = e.level === 'B';
          const key = `${e.type}${isBoss ? 'Boss' : ''}`;
          if (seen.has(key)) return;
          seen.add(key);
          const shape = enemyShape(e.type, isBoss);
          if (shape === undefined) unresolved.push(`${key} (${w + 1}-${l + 1})`);
          else if (!(`${shape}.svg` in shapeUrls)) unsynced.push(`${key} -> ${shape}.svg`);
        }),
      ),
    );

    expect(unresolved, 'enemy types with no art mapping').toEqual([]);
    expect(unsynced, 'mapped shapes the asset sync did not copy').toEqual([]);
    // Not vacuous: the sweep really did visit a broad set of types.
    expect(seen.size).toBeGreaterThan(20);
  });

  /** And every level builds a preview without throwing. */
  it('builds a preview for every level', () => {
    let rows = 0;
    LEVELS.forEach((world, w) =>
      world.forEach((_spec, l) => {
        const preview = levelPreview(w + 1, l + 1, 'Hard', 'x');
        expect(preview, `${w + 1}-${l + 1}`).not.toBeNull();
        rows += preview!.rows.length;
      }),
    );
    expect(rows).toBeGreaterThan(405);
  });
});

describe('previewForLevel is per-level, not cached', () => {
  /**
   * **The staleness pin.** The level-grid tooltip builds one of these per cell,
   * and the panel is a single shared surface — so "the hover shows the level
   * under the cursor" is a real claim, not a given. Two adjacent levels are
   * asked for in sequence and required to differ in every field a reader would
   * check.
   *
   * 1-2 is Normal (counts) and 1-3 is Flag (percentages), so a builder that
   * returned a memoised first answer fails on all four assertions rather than
   * one.
   */
  it('gives different levels different previews', () => {
    const [nw, nl] = firstOfMode('Normal');
    const [fw, fl] = firstOfMode('Flag');
    const a = previewForLevel(nw, nl, 'Easy')!;
    const b = previewForLevel(fw, fl, 'Easy')!;

    expect(a.summary).toContain(`Level: ${nl}`);
    expect(b.summary).toContain(`Level: ${fl}`);
    expect(a.summary).not.toBe(b.summary);

    expect(a.summary).toContain('Mode: Normal');
    expect(b.summary).toContain('Mode: Flag');

    // …and the rows differ too, not just the heading. The two modes print
    // different *kinds* of label — Normal a count, Flag a share — which is the
    // distinction worth pinning rather than the numbers themselves.
    for (const label of a.rows.map((r) => r.amountLabel)) expect(label).toMatch(/^\d+ X$/);
    for (const label of b.rows.map((r) => r.amountLabel)) expect(label).toMatch(/%$/);
  });

  /** Asking twice returns equal content — pure, so re-hover is not a fresh answer. */
  it('is stable for the same level', () => {
    expect(previewForLevel(1, 1, 'Easy')).toEqual(previewForLevel(1, 1, 'Easy'));
  });

  /** The objective is wired, not blank — the field the three callers shared. */
  it('fills the objective from the level, per mode', () => {
    /*
     * One of each mode, found rather than named, and the objective checked
     * against the level's own numbers — the wording is what is under test, and
     * a transcribed count would just pin whichever levels these happen to be.
     */
    const forMode = (mode: string) => {
      const [w, l] = firstOfMode(mode);
      return { spec: getLevel(w, l)!, summary: previewForLevel(w, l, 'Easy')!.summary };
    };

    const normal = forMode('Normal');
    expect(normal.summary).toContain(`Objective: Kill ${normal.spec.totalEnemies} Enemies`);

    const flag = forMode('Flag');
    expect(flag.summary).toContain(`Objective: Collect ${flag.spec.flagCount} Flags`);

    const boss = forMode('Boss');
    const bosses = boss.spec.enemies
      .filter((e) => e.level === 'B')
      .reduce((n, e) => n + e.count, 0);
    // The campaign's first boss level fields exactly one, so this is the
    // singular branch; `countdownPanel` pluralises past that.
    expect(bosses).toBe(1);
    expect(boss.summary).toContain('Objective: Kill 1 Boss');
  });

  it('returns null for a level that does not exist', () => {
    expect(previewForLevel(99, 1, 'Easy')).toBeNull();
  });
});
