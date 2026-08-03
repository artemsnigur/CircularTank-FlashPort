/**
 * knip must still be able to see unwired code.
 *
 * `KNIP.md` documents a canary — pick an export whose only importer is its own
 * test and confirm knip still flags it — and says to verify rather than assume.
 * That instruction was followed exactly once, by hand.
 *
 * Then installing `@playwright/test` for the smoke check silently re-enabled
 * knip's test-file entry points. Findings dropped from 247 to 50, every
 * genuinely-unwired export disappeared from the report, and **`knip.json` was
 * untouched** — so a config diff would have shown nothing. It went unnoticed for
 * four commits and was caught only because someone happened to re-run the check
 * by hand.
 *
 * A documented canary is a canary that runs when someone remembers, which is the
 * exact failure this repo has spent a day removing. So it runs here, wherever
 * the suite runs, and fails loudly.
 *
 * ── Why these six ─────────────────────────────────────────────────────────
 * Each is exported, imported **only** by its own test file, and has no
 * production consumer. Under a correct configuration every one must appear in
 * knip's unused-exports report. If any stops appearing, either it was genuinely
 * wired (delete it from this list and celebrate) or knip has gone blind again.
 *
 * `PM_PRNG.ts` was checked separately as an unused *file* — the only module in
 * the project with no import path at all, exercising a different part of knip's
 * analysis from the export scan. D1 wired it, so that assertion is now inverted:
 * it must **not** appear.
 */
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';

/**
 * Exported, test-only, no production consumer. Verified by hand at the time of
 * writing; `docs/AUDIT-2026-07.md` records why each is dead.
 *
 * **These rotate, and a green-to-red here is not automatically a fault.** A
 * canary stops being flagged for two opposite reasons — knip went blind, or the
 * export got wired — and this file cannot tell them apart, which is why the
 * failure message names both. Confirm which happened before editing the list.
 *
 * `discoverEnemies` was replaced by `isEnemyKnown` when bestiary discovery was
 * wired into `PlayerProfile.recordLevel`: the canary fired on the commit that
 * wired it, which is the mechanism behaving correctly. `isEnemyKnown` and its
 * neighbours go the same way when the bestiary screen lands.
 *
 * `countMaxedPrimary` and `getAchievementTiers` went the same way when
 * `achievementContext` gave the 36 achievements a value source — both fired on
 * that commit, both were genuinely wired, and both were replaced here rather
 * than excused. `countOwned` and `hintsCompleted` are their successors.
 *
 * `applyFreeze` was the fourth, and the most useful of them: it fired when the
 * Ice Grenade landed, which was the first thing in the port to deal Ice damage.
 * The canary marked the exact commit where a documented gap closed.
 * `createQuitFlags` replaces it.
 */
const CANARIES = [
  'countOwned',
  'bombFuseRemaining',
  'createQuitFlags',
  'isEnemyKnown',
  'hintsCompleted',
  'getTotalValues',
];

/** One knip run shared by every assertion — it takes a few seconds. */
function knipReport() {
  try {
    return execFileSync('npx', ['knip', '--no-progress'], {
      cwd: process.cwd(),
      encoding: 'utf8',
      shell: true,
      // knip exits non-zero when it has findings, which is the normal case.
    });
  } catch (error) {
    const out = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    if (out.trim().length > 0) return out;
    throw error;
  }
}

describe('knip can still see unwired exports', () => {
  const report = knipReport();

  it('produced a report at all', () => {
    // Guards against the whole check passing vacuously because knip failed to
    // run — an empty report would satisfy nothing below on its own.
    expect(report, 'knip produced no output').toMatch(/Unused exports/);
  });

  it.each(CANARIES)('%s is still reported as unused', (symbol) => {
    expect(
      report.includes(symbol),
      `${symbol} is no longer flagged. Either it was wired — in which case remove ` +
        'it from CANARIES — or knip has gone blind. The usual cause is a newly ' +
        "installed package enabling one of knip's plugins, which re-adds test " +
        'files as entry points. Check KNIP.md for the four load-bearing settings.',
    ).toBe(true);
  });

  it('no longer reports PM_PRNG.ts as unreachable — it was wired', () => {
    // This asserted the opposite until D1 landed. `PM_PRNG.ts` was the only
    // module in the project with no import path at all, and it exercised a
    // different analysis path from the export scan above: unused *files*.
    //
    // `levels/backgroundProps.ts` imports it now, so the canary fired for the
    // fifth time on a genuine wiring event rather than on knip going blind.
    // Kept as the inverse rather than deleted — if the importer is ever removed
    // the module goes back to unreachable, and this is where that shows up.
    expect(report).not.toContain('PM_PRNG.ts');
  });

  it('finds far more than the broken configuration did', () => {
    // The regression showed up as 247 -> 50. A floor well above 50 catches the
    // same class of failure even if every named canary above were wired.
    const match = /Unused exports \((\d+)\)/.exec(report);
    expect(match, 'could not read the unused-export count').not.toBeNull();
    expect(Number(match[1])).toBeGreaterThan(150);
  });
});
