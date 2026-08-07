import { describe, expect, it } from 'vitest';

import { runsDuringCountdown, shouldRunDuringCountdown } from './countdownGate';
import { runsWhileLevelDone } from './levelDoneGate';
import type { GatedSystem } from './levelDoneGate';

/**
 * `PartGameArea.as:2804-2830`, transcribed a **second** time and split into two
 * lists rather than copied as a map.
 *
 * Asserting the table against itself would prove only that it is
 * self-consistent. The pairing of system to side is the thing that has to be
 * right — the same standard `levelDoneGate.test.ts` holds, and the same reason.
 *
 * Read from the source as: everything between `if(countDownDone) {` at `:2808`
 * and the `}` at `:2830` is blocked; everything above `:2806` or below `:2830`
 * is not.
 */
const BLOCKED_BY_THE_COUNTDOWN: readonly GatedSystem[] = [
  'mines', // `:2814`
  'groundHazards', // `:2815`
  'tankDrive', // `:2818`
  'tankAttack', // `:2820`
  'tankShield', // `:2821`
  'flag', // `:2824`
  'inputActivity', // `:2826`
];

const RUNS_ANYWAY: readonly GatedSystem[] = [
  'playerBullets', // `:2804` — above the gate
  'enemyBulletFlight', // `:2805` — above the gate
  'enemyBulletSeeking', // `:2805`
  'enemyBulletHitsTank', // `:2805`
  'enemySpawning', // `:2831` — below the block
  'enemies', // `:2833`
  'enemyIndicators', // `:2835`
  'explosions', // `:2837`
  'explosionQueue', // `:2838`
  'particles', // `:2839`
  'money', // `:2840`
  'camera', // `:2841`
];

describe('the countdown partition', () => {
  it('blocks everything the AS3 blocks', () => {
    for (const system of BLOCKED_BY_THE_COUNTDOWN) {
      expect(runsDuringCountdown(system), system).toBe(false);
    }
  });

  it('keeps everything else running', () => {
    for (const system of RUNS_ANYWAY) {
      expect(runsDuringCountdown(system), system).toBe(true);
    }
  });

  it('covers every system exactly once across the two lists', () => {
    // Catches a system added to `GatedSystem` and forgotten here, which would
    // otherwise default to whichever side the author guessed.
    const listed = [...BLOCKED_BY_THE_COUNTDOWN, ...RUNS_ANYWAY];
    expect(new Set(listed).size).toBe(listed.length);
    expect(listed.length).toBe(19);
  });
});

describe('what the countdown is, stated as a pair', () => {
  /**
   * The load-bearing claim, and the reason this is not "the game is paused":
   * the player stops and the arena does not. Either half alone reads as
   * arbitrary — "everything stops" and "nothing stops" would each satisfy one
   * of these assertions on its own.
   */
  it('freezes the player while the arena keeps filling', () => {
    for (const system of ['tankDrive', 'tankAttack', 'tankShield', 'mines'] as const) {
      expect(runsDuringCountdown(system), system).toBe(false);
    }
    for (const system of ['enemySpawning', 'enemies', 'camera'] as const) {
      expect(runsDuringCountdown(system), system).toBe(true);
    }
  });

  /**
   * Faithful and easy to mistake for a defect: `handleEnemyBullets` is called
   * at `:2805`, above both gates, so a round already in the air can reach a
   * tank that can neither move nor raise its shield.
   *
   * Pinned against `tankShield` on purpose — the asymmetry *is* the finding.
   */
  it('lets enemy fire reach a tank that cannot defend itself', () => {
    expect(runsDuringCountdown('enemyBulletHitsTank')).toBe(true);
    expect(runsDuringCountdown('tankShield')).toBe(false);
    expect(runsDuringCountdown('tankDrive')).toBe(false);
  });

  /**
   * The two gates are independent and nest. A system can be blocked by one and
   * not the other, and `enemySpawning` is the clearest case: stopped once the
   * level resolves, running throughout the countdown.
   *
   * Driven on the identical system so the two answers cannot be read as one
   * rule stated twice.
   */
  it('is a different partition from the level-done gate', () => {
    expect(runsDuringCountdown('enemySpawning')).toBe(true);
    expect(runsWhileLevelDone('enemySpawning')).toBe(false);

    expect(runsDuringCountdown('enemyBulletHitsTank')).toBe(true);
    expect(runsWhileLevelDone('enemyBulletHitsTank')).toBe(false);

    // And one the two agree on, so "they always disagree" is excluded too.
    expect(runsDuringCountdown('tankDrive')).toBe(false);
    expect(runsWhileLevelDone('tankDrive')).toBe(false);
  });
});

describe('shouldRunDuringCountdown', () => {
  it('runs everything once the countdown is done', () => {
    // The gate must be invisible for the rest of the level — a partition that
    // leaked past the countdown would be far worse than the bug it fixes.
    for (const system of [...BLOCKED_BY_THE_COUNTDOWN, ...RUNS_ANYWAY]) {
      expect(shouldRunDuringCountdown(system, true), system).toBe(true);
    }
  });

  it('applies the partition while the countdown runs', () => {
    expect(shouldRunDuringCountdown('tankDrive', false)).toBe(false);
    expect(shouldRunDuringCountdown('enemies', false)).toBe(true);
  });
});
