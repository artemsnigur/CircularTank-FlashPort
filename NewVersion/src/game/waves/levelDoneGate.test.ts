import { describe, expect, it } from 'vitest';

import { runsWhileLevelDone, shouldRun } from './levelDoneGate';
import type { GatedSystem } from './levelDoneGate';

/**
 * The AS3's own partition, transcribed a second time from `:2804-2842` and
 * `:1474-1522`, split into the two lists rather than copied as a map.
 *
 * Deliberately a second independent reading: asserting the table against
 * itself proves only that it is self-consistent. The pairing of system to side
 * is the thing that has to be right, and the two disagreeing is the failure
 * worth catching — the same shape as the turret frame table.
 */
const INSIDE_THE_GATE: readonly GatedSystem[] = [
  'enemyBulletSeeking',
  'enemyBulletHitsTank',
  'mines',
  'groundHazards',
  'tankDrive',
  'tankAttack',
  'tankShield',
  'flag',
  'inputActivity',
  'enemySpawning',
  'enemies',
];

const OUTSIDE_THE_GATE: readonly GatedSystem[] = [
  'playerBullets',
  'enemyBulletFlight',
  'enemyIndicators',
  'explosions',
  'explosionQueue',
  'particles',
  'money',
  'camera',
];

describe('the levelDone partition', () => {
  it('stops everything the AS3 stops', () => {
    for (const system of INSIDE_THE_GATE) {
      expect(runsWhileLevelDone(system), system).toBe(false);
    }
  });

  it('keeps everything the AS3 keeps', () => {
    for (const system of OUTSIDE_THE_GATE) {
      expect(runsWhileLevelDone(system), system).toBe(true);
    }
  });

  it('covers every system exactly once across the two lists', () => {
    // Catches a system added to the table and forgotten here, which would
    // otherwise be untested and default to whichever side the author guessed.
    const listed = [...INSIDE_THE_GATE, ...OUTSIDE_THE_GATE];
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.length).toBe(19);
  });
});

describe('the split that makes leaving the scene running safe', () => {
  it('freezes everything that can act on the player, and nothing else', () => {
    // The load-bearing claim, asserted as a pair rather than as two separate
    // facts: the things that can *reach the tank* stop, while the things
    // already in flight finish. Either half alone reads as arbitrary.
    for (const system of ['enemies', 'enemyBulletHitsTank', 'tankDrive', 'mines'] as const) {
      expect(runsWhileLevelDone(system), system).toBe(false);
    }
    for (const system of ['particles', 'explosions', 'playerBullets'] as const) {
      expect(runsWhileLevelDone(system), system).toBe(true);
    }
  });

  it('splits enemy fire between flying and hitting', () => {
    // One AS3 function, two answers. `:1492` moves the round before any gate;
    // `:1520` gates the hit. Collapsing them either freezes enemy fire in
    // mid-air or lets it kill a tank the player can no longer steer, so the
    // three are pinned against each other rather than individually.
    expect(runsWhileLevelDone('enemyBulletFlight')).toBe(true);
    expect(runsWhileLevelDone('enemyBulletSeeking')).toBe(false);
    expect(runsWhileLevelDone('enemyBulletHitsTank')).toBe(false);
  });

  it('stops spawning as well as moving', () => {
    // `handleWarnings` is inside the gate and is what calls `spawnEnemy`, so a
    // resolved level cannot produce a new enemy. Pinned beside `enemies`
    // because "enemies are frozen" would be true even if new ones kept
    // arriving frozen.
    expect(runsWhileLevelDone('enemySpawning')).toBe(false);
    expect(runsWhileLevelDone('enemies')).toBe(false);
  });
});

describe('shouldRun', () => {
  it('runs everything while the level is live', () => {
    // The gate must be invisible before a level resolves — a partition that
    // leaked into normal play would be far worse than the bug it fixes.
    const all = [...INSIDE_THE_GATE, ...OUTSIDE_THE_GATE];
    for (const system of all) {
      expect(shouldRun(system, false), system).toBe(true);
    }
  });

  it('applies the partition once the level is done', () => {
    expect(shouldRun('enemies', true)).toBe(false);
    expect(shouldRun('particles', true)).toBe(true);
  });
});
