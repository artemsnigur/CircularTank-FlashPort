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
import { LEVELS, getLevel } from './levelData';
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
    const spec = getLevel(1, 9)!;
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
    const spec = getLevel(1, 2)!;
    expect(spec.mode).toBe('Normal');
    expect(amountLabel(spec, 0, 'Easy')).toBe('12 X');
    expect(amountLabel(spec, 1, 'Easy')).toBe('6 X');
  });

  it('Flag prints a share of the whole roster', () => {
    // 1-3: Flag, Basic 10 and Fast 4 of 14.
    const spec = getLevel(1, 3)!;
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
    const spec = getLevel(1, 9)!;
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
    const spec = getLevel(1, 3)!;
    // Fast is 4 of 14; construct the exact-half case from 1-5 instead.
    const half = getLevel(1, 5)!;
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
    const spec = getLevel(1, 2)!;
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
    const spec = getLevel(1, 2)!;
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

describe('the whole preview for a named level', () => {
  /**
   * **Against 1-9's actual roster, entry for entry** — not "a list renders".
   * Boss mode, four rows, mixed level labels, and two rows sharing a
   * percentage, so a builder that deduplicated or reordered fails.
   */
  it('builds level 1-9 exactly', () => {
    const preview = levelPreview(1, 9, 'Easy', 'Kill 1 Boss', 2)!;

    expect(preview.summary).toBe(
      'World: 1\nLevel: 9\nMode: Boss\nDifficulty: Easy\nUpgrade Limit: 2\nObjective: Kill 1 Boss',
    );

    expect(
      preview.rows.map((r) => [r.type, r.levelLabel, r.amountLabel, r.isBoss]),
    ).toEqual([
      ['Basic', 'BOSS', '1 X', true],
      ['Fast', 'LVL 1', '36.8%', false],
      ['Basic', 'LVL 1', '31.6%', false],
      ['Shooting', 'LVL 1', '31.6%', false],
    ]);

    // The boss row draws the boss clip, which is a *different* shape from the
    // ordinary one — the two `Basic` rows must not resolve to the same art.
    expect(preview.rows[0].shape).toBe(enemyShape('Basic', true));
    expect(preview.rows[2].shape).toBe(enemyShape('Basic', false));
    expect(preview.rows[0].shape).not.toBe(preview.rows[2].shape);
  });

  /**
   * Badges come through unfiltered by "met", and **without** the bestiary's
   * "none" placeholder — `addStrengthsAndWeaknessIcons` adds no icon for an
   * empty list (`:403`, `:464`); the placeholder is `ScreenEnemies.as:385-391`.
   */
  it('shows resistances with no placeholder and no knowledge gate', () => {
    const preview = levelPreview(1, 9, 'Easy', 'Kill 1 Boss', 2)!;
    const basic = preview.rows[2];
    // Basic has neither strengths nor weaknesses — so no badges at all.
    expect(basic.strengths).toEqual([]);
    expect(basic.weaknesses).toEqual([]);

    // The counterpart, on a level with a type that does have them: 1-13 is
    // Defense with Strong 10 / Basic 8 / Shooting 6, and Strong resists
    // Explosions and Bullets.
    const withBadges = levelPreview(1, 13, 'Easy', 'Kill 24 Enemies', 2)!;
    const strong = withBadges.rows.find((r) => r.type === 'Strong')!;
    expect(strong.amountLabel, 'Defense counts rather than shares').toBe('10 X');
    expect(strong.strengths.map((b) => b.label)).toEqual(['Explosions', 'Bullets']);
    expect(strong.strengths.every((b) => b.damageType !== null)).toBe(true);
  });

  it('returns null for a level that does not exist', () => {
    expect(levelPreview(99, 1, 'Easy', '', 1)).toBeNull();
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
        const preview = levelPreview(w + 1, l + 1, 'Hard', 'x', 1);
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
    const a = previewForLevel(1, 2, 'Easy')!;
    const b = previewForLevel(1, 3, 'Easy')!;

    expect(a.summary).toContain('Level: 2');
    expect(b.summary).toContain('Level: 3');
    expect(a.summary).not.toBe(b.summary);

    expect(a.summary).toContain('Mode: Normal');
    expect(b.summary).toContain('Mode: Flag');
    // …and the rows differ too, not just the heading.
    expect(a.rows.map((r) => r.amountLabel)).toEqual(['12 X', '6 X']);
    expect(b.rows.map((r) => r.amountLabel)).toEqual(['71.4%', '28.6%']);
  });

  /** Asking twice returns equal content — pure, so re-hover is not a fresh answer. */
  it('is stable for the same level', () => {
    expect(previewForLevel(1, 2, 'Easy')).toEqual(previewForLevel(1, 2, 'Easy'));
  });

  /** The objective is wired, not blank — the field the three callers shared. */
  it('fills the objective from the level, per mode', () => {
    expect(previewForLevel(1, 2, 'Easy')!.summary).toContain('Objective: Kill 18 Enemies');
    expect(previewForLevel(1, 3, 'Easy')!.summary).toContain('Objective: Collect 10 Flags');
    expect(previewForLevel(1, 9, 'Easy')!.summary).toContain('Objective: Kill 1 Boss');
  });

  it('returns null for a level that does not exist', () => {
    expect(previewForLevel(99, 1, 'Easy')).toBeNull();
  });
});
