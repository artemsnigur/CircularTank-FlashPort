import { describe, expect, it } from 'vitest';

import {
  FADE_OUT_MS,
  NO_LABEL,
  SLIDE_OUT_DISTANCE,
  SLIDE_OUT_MS,
  countdownLabel,
  modeLabel,
  objectiveText,
} from './countdownPanel';
import { createCountdown, tickCountdown } from './countdown';

describe('the countdown digit', () => {
  /**
   * The label is pinned at the frame numbers from `:723`, `:728`, `:733` and
   * `:738`, and — crucially — **on both sides of each one**. A step function
   * asserted only at its steps passes for any threshold within the band.
   */
  it('steps at the AS3 frames, checked either side', () => {
    expect(countdownLabel(60)).toBe(NO_LABEL);
    expect(countdownLabel(55)).toBe(NO_LABEL);
    expect(countdownLabel(54)).toBe('3');

    expect(countdownLabel(37)).toBe('3');
    expect(countdownLabel(36)).toBe('2');

    expect(countdownLabel(19)).toBe('2');
    expect(countdownLabel(18)).toBe('1');

    expect(countdownLabel(1)).toBe('1');
    expect(countdownLabel(0)).toBe('GO!');
  });

  it('stays on GO! once the counter is spent', () => {
    expect(countdownLabel(-5)).toBe('GO!');
  });

  /**
   * The label and the timer have to agree, so the two are driven together on
   * one countdown rather than asserted apart. This is what would catch the
   * digit being right about frames and wrong about when they occur.
   */
  it('shows each digit at the time the timer reaches it', () => {
    let state = createCountdown();
    let elapsed = 0;
    const seen: { label: string; atMs: number }[] = [];
    let last = countdownLabel(state.framesLeft);

    while (!state.done && elapsed < 5000) {
      elapsed += 1000 / 60;
      state = tickCountdown(state, 1000 / 60).state;
      const label = countdownLabel(state.framesLeft);
      if (label !== last) seen.push({ label, atMs: elapsed });
      last = label;
    }

    expect(seen.map((s) => s.label)).toEqual(['3', '2', '1', 'GO!']);
    // The same 200/800/1400/2000 the gate pass verified, from the other side.
    const frame = 1000 / 60;
    expect(Math.abs(seen[0].atMs - 200)).toBeLessThanOrEqual(frame);
    expect(Math.abs(seen[1].atMs - 800)).toBeLessThanOrEqual(frame);
    expect(Math.abs(seen[2].atMs - 1400)).toBeLessThanOrEqual(frame);
    expect(Math.abs(seen[3].atMs - 2000)).toBeLessThanOrEqual(frame);
  });
});

describe('the objective line', () => {
  const BASE = { totalEnemies: 18, flagCount: 8, bossAmount: 3, amountMultiplier: 1 };

  it('counts enemies on Normal, Tower and Defense', () => {
    for (const mode of ['Normal', 'Tower', 'Defense'] as const) {
      expect(objectiveText({ ...BASE, mode }), mode).toBe('Kill 18 Enemies');
    }
  });

  /**
   * Each mode's own string, driven on the identical input so the three cannot
   * be one rule stated three times.
   */
  it('counts flags on Flag and bosses on Boss', () => {
    expect(objectiveText({ ...BASE, mode: 'Flag' })).toBe('Collect 8 Flags');
    expect(objectiveText({ ...BASE, mode: 'Boss' })).toBe('Kill 3 Bosses');
    expect(objectiveText({ ...BASE, mode: 'Normal' })).toBe('Kill 18 Enemies');
  });

  it('inflects the boss count at exactly one', () => {
    expect(objectiveText({ ...BASE, mode: 'Boss', bossAmount: 1 })).toBe('Kill 1 Boss');
    expect(objectiveText({ ...BASE, mode: 'Boss', bossAmount: 2 })).toBe('Kill 2 Bosses');
  });

  /**
   * The multiplier is 1 on every difficulty in the AS3
   * (`DifficultyMultipliers.as:6`, `:8`), so this asserts the *rule* is applied
   * rather than the value. A non-1 value proves the arithmetic is live; the
   * value-1 case proves today's three difficulties agree, which is what a
   * player sees.
   */
  it('applies the amount multiplier, which is currently 1 everywhere', () => {
    expect(objectiveText({ ...BASE, mode: 'Normal', amountMultiplier: 1 })).toBe(
      'Kill 18 Enemies',
    );
    expect(objectiveText({ ...BASE, mode: 'Normal', amountMultiplier: 1.5 })).toBe(
      'Kill 27 Enemies',
    );
    // Rounded, per `:1007`.
    expect(objectiveText({ ...BASE, mode: 'Normal', amountMultiplier: 1.11 })).toBe(
      'Kill 20 Enemies',
    );
  });

  it('labels the mode', () => {
    expect(modeLabel('Flag')).toBe('Flag Mode');
  });
});

// The reload-bar gate at `:750-752` has no test because it has no port
// equivalent: this port draws no reload bars, only a placeholder magazine
// count. The reasoning is at the foot of `countdownPanel.ts` and at
// `GameplayScene.PLACEHOLDER_AMMO`. A test here would be pinning a rule the
// game cannot reach.

describe('the expiry tweens', () => {
  it('fades over 20 frames and slides over 30, converted', () => {
    // From the AS3 durations at `:68`-`:98`, stated rather than read back.
    expect(FADE_OUT_MS).toBeCloseTo((20 / 30) * 1000, 6);
    expect(SLIDE_OUT_MS).toBe(1000);
    // Every one of the four objects moves by the same delta: 68 -> -100,
    // 60 -> -108, 90 -> -78, 90 -> -78.
    expect(SLIDE_OUT_DISTANCE).toBe(168);
  });
});
