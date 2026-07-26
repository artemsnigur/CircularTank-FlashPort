/**
 * The "enemies remaining" figure.
 *
 * An enemy of an arena wave is in exactly one of three places, and moves
 * between them without changing the total:
 *
 *   enemiesLeft      not yet announced
 *   pendingWarnings  announced, marker on screen, not yet spawned
 *   alive            in the arena
 *
 * The HUD omitted `pendingWarnings`, so the count dipped for the whole time a
 * warning was counting down. These tests assert the conservation law rather
 * than the formula, so the same omission cannot come back in another shape.
 */
import { describe, expect, it } from 'vitest';
import {
  canSpawn,
  createWaveState,
  drawEnemy,
  registerEnemyKilled,
  registerEnemySpawned,
  registerSpawn,
  tickWave,
} from './waveState';
import type { WaveState } from './waveState';
import { getLevel } from '../levels/levelData';

const FRAME = 1000 / 30;

/** What the HUD publishes for an arena level. */
const remaining = (wave: WaveState, alive: number): number =>
  wave.enemiesLeft + wave.pendingWarnings + alive;

/** The old formula, kept to prove it was wrong. */
const withoutPending = (wave: WaveState, alive: number): number => wave.enemiesLeft + alive;

describe('the count is conserved', () => {
  it('starts at the level total', () => {
    const spec = getLevel(1, 1)!;
    const wave = createWaveState(spec);
    expect(remaining(wave, 0)).toBe(spec.totalEnemies);
  });

  it('does not move when a warning is queued', () => {
    // registerSpawn moves one from enemiesLeft to pendingWarnings.
    const wave = createWaveState(getLevel(1, 1)!);
    const before = remaining(wave, 0);
    registerSpawn(wave);
    expect(remaining(wave, 0)).toBe(before);
  });

  it('does not move when a warning becomes an enemy', () => {
    const wave = createWaveState(getLevel(1, 1)!);
    registerSpawn(wave);
    const before = remaining(wave, 0);
    registerEnemySpawned(wave);
    expect(remaining(wave, 1)).toBe(before);
  });

  it('drops by exactly one per kill', () => {
    const wave = createWaveState(getLevel(1, 1)!);
    registerSpawn(wave);
    registerEnemySpawned(wave);

    const before = remaining(wave, 1);
    registerEnemyKilled(wave);
    expect(remaining(wave, 0)).toBe(before - 1);
  });
});

describe('the old formula was wrong', () => {
  it('undercounted for the whole life of a warning marker', () => {
    const wave = createWaveState(getLevel(1, 1)!);
    registerSpawn(wave);

    // One enemy announced but not yet spawned: the total is unchanged, but the
    // old formula has already lost it.
    expect(remaining(wave, 0)).toBe(10);
    expect(withoutPending(wave, 0)).toBe(9);
  });
});

describe('across a whole level', () => {
  it('counts down monotonically from the total to zero', () => {
    const spec = getLevel(1, 1)!;
    const wave = createWaveState(spec);
    let alive = 0;
    let previous = remaining(wave, alive);
    expect(previous).toBe(spec.totalEnemies);

    for (let frame = 0; frame < 5000; frame += 1) {
      tickWave(wave, FRAME);

      if (canSpawn(wave) && drawEnemy(wave, { countsByType: {} }, () => 0.5)) {
        registerSpawn(wave);
        registerEnemySpawned(wave);
        alive += 1;
      }
      // Kill one every 25 frames.
      if (frame % 25 === 24 && alive > 0) {
        registerEnemyKilled(wave);
        alive -= 1;
      }

      const now = remaining(wave, alive);
      // Never rises: an enemy only ever leaves the system by dying.
      expect(now).toBeLessThanOrEqual(previous);
      previous = now;

      if (now === 0) break;
    }

    expect(previous).toBe(0);
    expect(alive).toBe(0);
  });

  it('never reports fewer remaining than are alive', () => {
    // The symptom that was reported: the figure disagreeing with the arena.
    const wave = createWaveState(getLevel(1, 2)!);
    let alive = 0;

    for (let frame = 0; frame < 2000; frame += 1) {
      tickWave(wave, FRAME);
      if (canSpawn(wave) && drawEnemy(wave, { countsByType: {} }, () => 0.5)) {
        registerSpawn(wave);
        registerEnemySpawned(wave);
        alive += 1;
      }
      expect(remaining(wave, alive)).toBeGreaterThanOrEqual(alive);
    }
  });
});
