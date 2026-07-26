/**
 * Flag levels — placement, arming, capture, and the completion rule.
 */
import { describe, expect, it } from 'vitest';
import {
  canCaptureFlag,
  FLAG_ARM_FRAMES,
  FLAG_MAX_CANDIDATES,
  flagCandidates,
  flagDistance,
  flagReward,
  placeFlag,
  tickFlag,
} from './flag';
import { createWaveState, isWaveComplete, registerFlagCaptured } from './waveState';
import { getLevel } from '../levels/levelData';

const FRAME = 1000 / 30;
const room = { roomWidth: 640, roomHeight: 960, flagRadius: 12 };
const centre = { tankX: 320, tankY: 480, ...room };

describe('placement', () => {
  it('lands between a quarter and a half of the room width away', () => {
    expect(flagDistance(640, () => 0)).toBe(310); // 320 - 10 - 0
    expect(flagDistance(640, () => 1)).toBe(150); // 320 - 10 - 160
  });

  it('measures the distance from the tank, not the room centre', () => {
    const flag = placeFlag({ ...centre, tankX: 100, tankY: 200, random: () => 0.5 })!;
    const fromTank = Math.hypot(flag.x - 100, flag.y - 200);
    expect(fromTank).toBeCloseTo(flagDistance(640, () => 0.5), 6);
  });

  it('keeps every candidate inside the room', () => {
    for (const tank of [
      { tankX: 20, tankY: 20 },
      { tankX: 620, tankY: 940 },
      { tankX: 320, tankY: 480 },
    ]) {
      for (const c of flagCandidates({ ...centre, ...tank, random: () => 0.3 })) {
        expect(c.x).toBeGreaterThanOrEqual(room.flagRadius);
        expect(c.x).toBeLessThanOrEqual(room.roomWidth - room.flagRadius);
        expect(c.y).toBeGreaterThanOrEqual(room.flagRadius);
        expect(c.y).toBeLessThanOrEqual(room.roomHeight - room.flagRadius);
      }
    }
  });

  it('stops once it has ten candidates', () => {
    expect(flagCandidates({ ...centre, random: () => 0.5 }).length).toBeLessThanOrEqual(
      FLAG_MAX_CANDIDATES,
    );
  });

  it('returns null rather than throwing when nothing fits', () => {
    // A room narrower than the flag leaves no legal position. The AS3 would
    // index an empty array here.
    expect(
      placeFlag({
        tankX: 0,
        tankY: 0,
        roomWidth: 4,
        roomHeight: 4,
        flagRadius: 50,
        random: () => 0.5,
      }),
    ).toBeNull();
  });

  it('arms a fresh flag', () => {
    expect(placeFlag({ ...centre, random: () => 0.5 })!.timer).toBe(FLAG_ARM_FRAMES);
  });
});

describe('arming', () => {
  const flag = { x: 320, y: 480, radius: 12, timer: FLAG_ARM_FRAMES };
  const tankOnTop = { x: 320, y: 480, radius: 13 };

  it('cannot be captured while arming, even from on top of it', () => {
    expect(canCaptureFlag(flag, tankOnTop)).toBe(false);
  });

  it('becomes capturable after ten frames', () => {
    let current = flag;
    for (let i = 0; i < FLAG_ARM_FRAMES; i += 1) current = tickFlag(current, FRAME);
    expect(current.timer).toBe(0);
    expect(canCaptureFlag(current, tankOnTop)).toBe(true);
  });

  it('is frame-rate independent', () => {
    let at60 = flag;
    for (let i = 0; i < FLAG_ARM_FRAMES * 2; i += 1) at60 = tickFlag(at60, 1000 / 60);
    expect(at60.timer).toBe(0);
  });
});

describe('capture range', () => {
  const armed = { x: 100, y: 100, radius: 12, timer: 0 };

  it('needs the radii to overlap', () => {
    expect(canCaptureFlag(armed, { x: 124, y: 100, radius: 13 })).toBe(true);
    expect(canCaptureFlag(armed, { x: 126, y: 100, radius: 13 })).toBe(false);
  });
});

describe('the completion rule', () => {
  it('a Flag level ends on flags, not on an empty arena', () => {
    const spec = getLevel(1, 4)!;
    const wave = createWaveState(spec);
    if (spec.mode !== 'Flag') return; // guarded below by the explicit test

    expect(wave.flagsLeft).toBeGreaterThan(0);
    expect(isWaveComplete(wave)).toBe(false);
  });

  it('completes once every flag is taken, with enemies still alive', () => {
    const flagLevel = [...Array(60).keys()]
      .map((i) => getLevel(1, i + 1))
      .find((s) => s?.mode === 'Flag')!;

    const wave = createWaveState(flagLevel);
    wave.currentEnemies = 5; // arena deliberately not empty
    expect(isWaveComplete(wave)).toBe(false);

    for (let i = 0; i < flagLevel.flagCount; i += 1) registerFlagCaptured(wave);
    expect(wave.flagsLeft).toBe(0);
    expect(isWaveComplete(wave)).toBe(true);
  });

  it('never drops below zero', () => {
    const flagLevel = [...Array(60).keys()]
      .map((i) => getLevel(1, i + 1))
      .find((s) => s?.mode === 'Flag')!;
    const wave = createWaveState(flagLevel);
    for (let i = 0; i < flagLevel.flagCount + 5; i += 1) registerFlagCaptured(wave);
    expect(wave.flagsLeft).toBe(0);
  });

  it('a Boss level ends on the boss count, not on an empty arena', () => {
    const bossLevel = [...Array(60).keys()]
      .map((i) => getLevel(1, i + 1))
      .find((s) => s?.mode === 'Boss')!;

    const wave = createWaveState(bossLevel, 2);
    wave.currentEnemies = 4;
    expect(isWaveComplete(wave)).toBe(false);

    wave.bossAmountKilled = 2;
    // Regression: this used to require `enemiesLeft <= 0`, which a Boss level
    // never reaches because it spawns indefinitely.
    expect(isWaveComplete(wave)).toBe(true);
  });

  it('leaves the ordinary modes on the arena rule', () => {
    const normal = getLevel(1, 1)!;
    expect(normal.mode).toBe('Normal');
    const wave = createWaveState(normal);
    wave.enemiesLeft = 0;
    wave.currentEnemies = 1;
    expect(isWaveComplete(wave)).toBe(false);
    wave.currentEnemies = 0;
    expect(isWaveComplete(wave)).toBe(true);
  });
});

describe('the live-enemy guard must not veto Flag or Boss', () => {
  // Regression: the scene applied `isWaveComplete(wave) && enemies.length === 0`
  // as a guard against counter drift. Correct for the arena-clearing modes,
  // fatal for Flag and Boss — those spawn indefinitely, so the arena is never
  // empty and the guard blocked completion permanently. The check now lives
  // inside the branch whose rule it guards.
  const flagLevel = () =>
    [...Array(60).keys()].map((i) => getLevel(1, i + 1)).find((s) => s?.mode === 'Flag')!;

  it('completes a Flag level with enemies still on screen', () => {
    const wave = createWaveState(flagLevel());
    wave.flagsLeft = 0;
    expect(isWaveComplete(wave, 12)).toBe(true);
  });

  it('completes a Boss level with enemies still on screen', () => {
    const bossLevel = [...Array(60).keys()]
      .map((i) => getLevel(1, i + 1))
      .find((s) => s?.mode === 'Boss')!;
    const wave = createWaveState(bossLevel, 2);
    wave.bossAmountKilled = 2;
    expect(isWaveComplete(wave, 12)).toBe(true);
  });

  it('still blocks an arena level whose counters drifted', () => {
    const wave = createWaveState(getLevel(1, 1)!);
    wave.enemiesLeft = 0;
    wave.currentEnemies = 0;
    wave.pendingWarnings = 0;

    // Counters say clear, the arena says otherwise. The arena wins.
    expect(isWaveComplete(wave, 3)).toBe(false);
    expect(isWaveComplete(wave, 0)).toBe(true);
  });

  it('level 1-3 specifically: ten flags, then done', () => {
    // The level manual QA failed on.
    const spec = getLevel(1, 3)!;
    expect(spec.mode).toBe('Flag');
    expect(spec.flagCount).toBe(10);

    const wave = createWaveState(spec);
    for (let i = 0; i < 10; i += 1) {
      expect(isWaveComplete(wave, 5)).toBe(false);
      registerFlagCaptured(wave);
    }
    expect(isWaveComplete(wave, 5)).toBe(true);
  });
});

describe('the reward', () => {
  it('reads flagMoney from the level table', () => {
    const flagLevel = [...Array(60).keys()]
      .map((i) => getLevel(1, i + 1))
      .find((s) => s?.mode === 'Flag')!;
    expect(flagReward(flagLevel)).toBe(flagLevel.flagMoney);
    expect(flagReward(flagLevel)).toBeGreaterThan(0);
  });
});
