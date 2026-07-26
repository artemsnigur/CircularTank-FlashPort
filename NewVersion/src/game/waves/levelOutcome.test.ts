/**
 * Ending a level — the win/lose decision and the handover countdown.
 */
import { describe, expect, it } from 'vitest';
import {
  canHandOver,
  createLevelOutcome,
  decideOutcome,
  LEVEL_DONE_DELAY_FRAMES,
  outcomeMusic,
  TANK_DEATH_BLAST_RADIUS,
  tickOutcome,
} from './levelOutcome';
import type { LevelOutcomeState, OutcomeInputs } from './levelOutcome';
import { createWaveState, isWaveComplete, registerEnemyKilled } from './waveState';
import { getLevel } from '../levels/levelData';

const FRAME = 1000 / 30;

const alive: OutcomeInputs = { waveComplete: false, tankHp: 100, moneyOnFloor: 0 };

/** Runs frames until the level finishes, returning how many it took. */
function runToFinish(state: LevelOutcomeState, inputs: OutcomeInputs): number {
  let current = state;
  let frames = 0;
  while (!current.finished && frames < 500) {
    current = tickOutcome(current, inputs, FRAME);
    frames += 1;
  }
  return frames;
}

describe('a fresh level', () => {
  it('is undecided', () => {
    const state = createLevelOutcome();
    expect(state.result).toBeNull();
    expect(state.finished).toBe(false);
  });

  it('stays undecided while the wave is running', () => {
    const state = tickOutcome(createLevelOutcome(), alive, FRAME);
    expect(state.result).toBeNull();
    expect(state.finished).toBe(false);
  });

  it('does not count down before it is decided', () => {
    const state = tickOutcome(createLevelOutcome(), alive, FRAME);
    expect(state.doneTimer).toBe(LEVEL_DONE_DELAY_FRAMES);
  });
});

describe('deciding the outcome', () => {
  it('wins when the wave is complete', () => {
    const state = decideOutcome(createLevelOutcome(), { ...alive, waveComplete: true });
    expect(state.result).toBe('won');
  });

  it('loses when the tank is dead', () => {
    const state = decideOutcome(createLevelOutcome(), { ...alive, tankHp: 0 });
    expect(state.result).toBe('lost');
  });

  it('prefers defeat when both land on the same frame', () => {
    // The AS3 sets levelDone then branches on `hp == 0`, so dying as the last
    // enemy falls is a loss.
    const state = decideOutcome(createLevelOutcome(), {
      waveComplete: true,
      tankHp: 0,
      moneyOnFloor: 0,
    });
    expect(state.result).toBe('lost');
  });

  it('never re-decides once settled', () => {
    const won = decideOutcome(createLevelOutcome(), { ...alive, waveComplete: true });
    const after = decideOutcome(won, { ...alive, tankHp: 0 });
    expect(after.result).toBe('won');
  });
});

describe('the collection grace period', () => {
  const cleared: OutcomeInputs = { waveComplete: true, tankHp: 100, moneyOnFloor: 3 };

  it('will not hand over while coins are still on the floor', () => {
    const state = decideOutcome(createLevelOutcome(), cleared);
    expect(canHandOver(state, cleared)).toBe(false);
  });

  it('keeps the level running indefinitely while coins remain', () => {
    let state = createLevelOutcome();
    for (let i = 0; i < 300; i += 1) state = tickOutcome(state, cleared, FRAME);
    expect(state.result).toBe('won');
    expect(state.finished).toBe(false);
  });

  it('hands over once the last coin is collected', () => {
    let state = createLevelOutcome();
    for (let i = 0; i < 60; i += 1) state = tickOutcome(state, cleared, FRAME);
    expect(state.finished).toBe(false);

    const collected = { ...cleared, moneyOnFloor: 0 };
    expect(runToFinish(state, collected)).toBeLessThanOrEqual(
      LEVEL_DONE_DELAY_FRAMES + 1,
    );
  });

  it('skips the wait entirely on defeat', () => {
    // `hp == 0` satisfies the condition on its own, coins or not.
    const dead: OutcomeInputs = { waveComplete: false, tankHp: 0, moneyOnFloor: 5 };
    const state = decideOutcome(createLevelOutcome(), dead);
    expect(canHandOver(state, dead)).toBe(true);
    expect(runToFinish(createLevelOutcome(), dead)).toBeLessThanOrEqual(
      LEVEL_DONE_DELAY_FRAMES + 1,
    );
  });

  it('is not open before the level is decided', () => {
    expect(canHandOver(createLevelOutcome(), alive)).toBe(false);
  });
});

describe('the handover countdown', () => {
  const cleared: OutcomeInputs = { waveComplete: true, tankHp: 100, moneyOnFloor: 0 };

  it('takes fifteen frames — half a second', () => {
    expect(LEVEL_DONE_DELAY_FRAMES).toBe(15);
    expect(runToFinish(createLevelOutcome(), cleared)).toBe(LEVEL_DONE_DELAY_FRAMES);
  });

  it('is frame-rate independent', () => {
    let at60 = createLevelOutcome();
    let frames = 0;
    while (!at60.finished && frames < 500) {
      at60 = tickOutcome(at60, cleared, 1000 / 60);
      frames += 1;
    }
    // Twice the ticks at half the step: same elapsed time.
    expect(frames).toBe(LEVEL_DONE_DELAY_FRAMES * 2);
  });

  it('stays finished once finished', () => {
    let state = createLevelOutcome();
    state = tickOutcome(state, cleared, 10_000);
    expect(state.finished).toBe(true);
    const after = tickOutcome(state, cleared, FRAME);
    expect(after.finished).toBe(true);
    expect(after.result).toBe('won');
  });
});

describe('presentation', () => {
  it('picks the right music', () => {
    expect(outcomeMusic('won')).toBe('Win');
    expect(outcomeMusic('lost')).toBe('Lose');
  });

  it('gives the tank a harmless send-off blast', () => {
    // `[tank.x, tank.y, 150, 0, ...]` — radius 150, damage 0.
    expect(TANK_DEATH_BLAST_RADIUS).toBe(150);
  });
});

describe('counter drift cannot complete a level early', () => {
  it('over-decrementing currentEnemies drives isWaveComplete true', () => {
    // The defect this guards: GameplayScene.removeEnemy called twice for one
    // enemy decremented the wave counter twice while the live list lost one
    // entry, so `currentEnemies` reached zero with enemies still alive.
    const spec = getLevel(1, 1)!;
    const wave = createWaveState(spec);
    wave.enemiesLeft = 0;
    wave.pendingWarnings = 0;
    wave.currentEnemies = 2;

    expect(isWaveComplete(wave)).toBe(false);

    // Two spurious kills for what is really one enemy.
    registerEnemyKilled(wave);
    registerEnemyKilled(wave);
    registerEnemyKilled(wave);

    // The counter alone now lies.
    expect(wave.currentEnemies).toBe(0);
    expect(isWaveComplete(wave)).toBe(true);
  });

  it('the live enemy count vetoes it', () => {
    // Which is why the scene requires `enemies.length === 0` as well: a
    // drifting counter can only delay completion, never trigger it early.
    const spec = getLevel(1, 1)!;
    const wave = createWaveState(spec);
    wave.enemiesLeft = 0;
    wave.pendingWarnings = 0;
    wave.currentEnemies = 0;

    const enemiesOnScreen: number = 1;
    const waveComplete = isWaveComplete(wave) && enemiesOnScreen === 0;
    expect(waveComplete).toBe(false);

    const state = tickOutcome(
      createLevelOutcome(),
      { waveComplete, tankHp: 100, moneyOnFloor: 0 },
      FRAME,
    );
    expect(state.result).toBeNull();
  });
});

describe('against a real wave', () => {
  it('is not complete at the start of a level', () => {
    const spec = getLevel(1, 1)!;
    const wave = createWaveState(spec);
    expect(isWaveComplete(wave)).toBe(false);

    const state = tickOutcome(
      createLevelOutcome(),
      { waveComplete: isWaveComplete(wave), tankHp: 100, moneyOnFloor: 0 },
      FRAME,
    );
    expect(state.result).toBeNull();
  });

  it('completes once the wave is drained', () => {
    const spec = getLevel(1, 1)!;
    const wave = createWaveState(spec);
    wave.enemiesLeft = 0;
    wave.currentEnemies = 0;
    wave.pendingWarnings = 0;

    expect(isWaveComplete(wave)).toBe(true);
    const state = decideOutcome(createLevelOutcome(), {
      waveComplete: true,
      tankHp: 100,
      moneyOnFloor: 0,
    });
    expect(state.result).toBe('won');
  });
});
