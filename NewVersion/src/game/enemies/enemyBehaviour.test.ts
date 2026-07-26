/**
 * The enemy behaviour report.
 *
 * The point of this module is to be honest about what is built, so the tests
 * mostly guard against it *overstating* — a status board that drifts optimistic
 * is worse than none.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SPECIAL_MECHANICS,
  behaviourTotals,
  describeAllEnemies,
  describeEnemy,
  isRangedImplemented,
} from './enemyBehaviour';
import { ENEMY_STATS } from './enemyStatsData';
import { resolveEnemyStats } from './enemyStats';

describe('coverage', () => {
  it('reports every enemy type exactly once', () => {
    const all = describeAllEnemies();
    expect(all).toHaveLength(Object.keys(ENEMY_STATS).length);
    expect(new Set(all.map((r) => r.type)).size).toBe(all.length);
  });

  it('totals add up', () => {
    const all = describeAllEnemies();
    const t = behaviourTotals(all);
    expect(t.implemented + t.partial + t.dataOnly).toBe(t.total);
  });
});

describe('ranged support is derived, not declared', () => {
  it('is true only when both the bullet class and the pattern are supported', () => {
    // Shooting: Basic + Front — both supported.
    expect(isRangedImplemented(resolveEnemyStats('Shooting', '1', 'Easy'))).toBe(true);
    // Crazy: Basic + Circle — both supported after this pass.
    expect(isRangedImplemented(resolveEnemyStats('Crazy', '1', 'Easy'))).toBe(true);
    // Soldier: Following — bullet class not ported.
    expect(isRangedImplemented(resolveEnemyStats('Soldier', '1', 'Easy'))).toBe(false);
    // Trap: BackTrap — pattern not ported.
    expect(isRangedImplemented(resolveEnemyStats('Trap', '1', 'Easy'))).toBe(false);
  });

  it('is false for anything that does not shoot', () => {
    expect(isRangedImplemented(resolveEnemyStats('Basic', '1', 'Easy'))).toBe(false);
  });
});

describe('status is not optimistic', () => {
  it('a type with an unported mechanic is never "implemented"', () => {
    for (const r of describeAllEnemies()) {
      if (r.missingMechanic) expect(r.status, r.type).not.toBe('implemented');
    }
  });

  it('a shooter whose pattern is unported is never "implemented"', () => {
    for (const r of describeAllEnemies()) {
      if (r.shoots && !r.rangedImplemented) expect(r.status, r.type).not.toBe('implemented');
    }
  });

  it('every "implemented" type really has nothing outstanding', () => {
    for (const r of describeAllEnemies().filter((x) => x.status === 'implemented')) {
      expect(r.missingMechanic, r.type).toBeNull();
      if (r.shoots) expect(r.rangedImplemented, r.type).toBe(true);
    }
  });
});

/**
 * The guard that would have caught four invented mechanics.
 *
 * Special behaviour in the AS3 is always a branch keyed on the type name or on
 * the display class. Reading those branch names straight out of the source
 * makes "does this mechanic exist" a mechanical question instead of a
 * recollection, which is the only reason the board can be trusted.
 */
describe('every declared mechanic exists in the AS3', () => {
  const source = readFileSync('../SWFimported/scripts/PartGameArea.as', 'utf8');

  /** Types the source actually branches on, by either idiom. */
  const branched = new Set<string>([
    ...[...source.matchAll(/enemyType == "([A-Za-z]+?)B?"/g)].map((m) => m[1]),
    ...[...source.matchAll(/\[object Enemy([A-Za-z]+?)(?:Boss)?\]/g)].map((m) => m[1]),
  ]);

  it('finds the branch idioms at all', () => {
    // If a JPEXS re-export changed the formatting, every check below would
    // pass vacuously. Ghost and Teleporting are one per idiom.
    expect(branched.has('Ghost')).toBe(true);
    expect(branched.has('Teleporting')).toBe(true);
  });

  it.each(Object.entries(SPECIAL_MECHANICS))(
    '%s has a real branch, so "%s" is a finding and not a guess',
    (type) => {
      expect(
        branched.has(type),
        `SPECIAL_MECHANICS declares a mechanic for "${type}", but PartGameArea.as ` +
          `has no "enemyType == \\"${type}\\"" or "[object Enemy${type}]" branch. ` +
          `A type with no branch has no mechanic — its behaviour is its stat row ` +
          `and its firing pattern. Verify against the source before adding an entry.`,
      ).toBe(true);
    },
  );
});

describe('the current picture', () => {
  it('Shooting is fully implemented', () => {
    const r = describeEnemy('Shooting');
    expect(r.status).toBe('implemented');
    expect(r.rangedImplemented).toBe(true);
  });

  it('Crazy is complete — Circle volleys are its whole character', () => {
    // "Shoots bursts of bullets in all directions" (bestiary): shootAngle
    // Circle, bulletAmount 6. There is no steering mechanic to miss.
    const r = describeEnemy('Crazy');
    expect(r).toMatchObject({ status: 'implemented', rangedImplemented: true });
    expect(r.missingMechanic).toBeNull();
  });

  it('Ninja and Random are complete for the same reason', () => {
    expect(describeEnemy('Ninja').status).toBe('implemented');
    expect(describeEnemy('Random').status).toBe('implemented');
  });

  it('Tiny is complete — it is small, and that is all', () => {
    const r = describeEnemy('Tiny');
    expect(r).toMatchObject({ status: 'implemented', shoots: false });
    expect(r.missingMechanic).toBeNull();
  });

  it('Soldier is data-only — homing is not ported', () => {
    // Reported by the derived ranged check (shootType "Following"), not by a
    // hand-written entry, so it clears itself when that bullet class lands.
    const r = describeEnemy('Soldier');
    expect(r).toMatchObject({ status: 'data-only', rangedImplemented: false });
    expect(r.missingMechanic).toBeNull();
  });

  it('stands at 9 implemented, 0 partial, 11 data-only of 20', () => {
    // The exact figure, not a comparative: it is knowable, and a board that
    // moves without anyone noticing is the failure this module exists to stop.
    //
    // `partial` is empty, and that is a real result rather than a rounding
    // artefact: it needed a type with both a working firing pattern and an
    // unported mechanic, and the only three types in that bucket were Crazy,
    // Ninja and Random — whose mechanics turned out not to exist. Every
    // remaining mechanic belongs to a type whose shooting is also unported.
    expect(behaviourTotals(describeAllEnemies())).toEqual({
      implemented: 9,
      partial: 0,
      dataOnly: 11,
      total: 20,
    });
  });
});
