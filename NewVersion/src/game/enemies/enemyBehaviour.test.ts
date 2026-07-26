/**
 * The enemy behaviour report.
 *
 * The point of this module is to be honest about what is built, so the tests
 * mostly guard against it *overstating* — a status board that drifts optimistic
 * is worse than none.
 */
import { describe, expect, it } from 'vitest';
import {
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

describe('the current picture', () => {
  it('Shooting is fully implemented', () => {
    const r = describeEnemy('Shooting');
    expect(r.status).toBe('implemented');
    expect(r.rangedImplemented).toBe(true);
  });

  it('Crazy shoots correctly but still lacks its erratic steering', () => {
    const r = describeEnemy('Crazy');
    expect(r.rangedImplemented).toBe(true);
    expect(r.status).toBe('partial');
    expect(r.missingMechanic).toBeTruthy();
  });

  it('Soldier is data-only — homing is not ported', () => {
    expect(describeEnemy('Soldier').status).toBe('data-only');
  });

  it('most types are still data-only', () => {
    // Honest baseline: if this ever passes trivially, the board has drifted.
    const t = behaviourTotals(describeAllEnemies());
    expect(t.dataOnly).toBeGreaterThan(t.implemented);
  });
});
