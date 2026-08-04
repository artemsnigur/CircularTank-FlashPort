import { describe, expect, it } from 'vitest';

import {
  HELD_SPAWN_RELOAD,
  gateSpawnReload,
  secondaryReloadRuns,
  tutorialHoldsPlay,
} from './tutorialGates';
import { createInitialTutorialState } from './tutorialState';
import type { TutorialState } from './tutorialState';
import { canSpawn, createWaveState, tickWave } from '../waves/waveState';
import { getLevel } from '../levels/levelData';

/** A tutorial mid-first-step: running, not finished, AimShoot still pending. */
const holding = (): TutorialState => ({ ...createInitialTutorialState(), on: true });

/** The same tutorial one step later. */
const released = (): TutorialState => ({
  ...createInitialTutorialState(),
  on: true,
  done: ['Move', 'AimShoot'],
});

/** A player who turned the tutorial off. */
const disabled = (): TutorialState => ({ ...createInitialTutorialState(), on: false });

/** A player who finished it long ago. */
const finished = (): TutorialState => ({
  ...createInitialTutorialState(),
  on: false,
  completed: true,
});

describe('the gate engages and releases', () => {
  it('holds while AimShoot is pending and releases once it is done', () => {
    // **Asserted as a pair on the same state shape.** A gate that never
    // releases and a gate that never engages both look correct in isolation;
    // only the transition distinguishes them.
    expect(tutorialHoldsPlay(holding())).toBe(true);
    expect(tutorialHoldsPlay(released())).toBe(false);
  });

  it('applies to both sites through one condition', () => {
    // `:4259` and `:7153` carry the same three-part test. Derived from one
    // function so they cannot drift; asserted on both sides of the transition.
    expect(secondaryReloadRuns(holding())).toBe(false);
    expect(secondaryReloadRuns(released())).toBe(true);

    expect(gateSpawnReload(999, holding())).toBe(HELD_SPAWN_RELOAD);
    expect(gateSpawnReload(999, released())).toBe(999);
  });
});

describe('the tutorial-off path is untouched', () => {
  /**
   * **The regression this pass could cause, and the one no tutorial-focused
   * test would think to check.** Every gate is `!done("AimShoot")`, which is
   * true for a disabled tutorial too — so the guard has to test `on` first or
   * it silently holds spawning for players who never opted in.
   */
  it('never holds play for a disabled or completed tutorial', () => {
    expect(tutorialHoldsPlay(disabled())).toBe(false);
    expect(tutorialHoldsPlay(finished())).toBe(false);

    // Both have AimShoot *undone*, which is the trap: the naive condition
    // would hold for both. Stated explicitly so the reason is visible.
    expect(disabled().done).not.toContain('AimShoot');
    expect(finished().done).not.toContain('AimShoot');
  });

  it('leaves the spawn timer and the reload exactly as they are', () => {
    for (const state of [disabled(), finished()]) {
      expect(gateSpawnReload(42, state)).toBe(42);
      expect(secondaryReloadRuns(state)).toBe(true);
    }
  });
});

describe('the spawn hold is a substitution, not a suppress flag', () => {
  const wave = (): ReturnType<typeof createWaveState> => createWaveState(getLevel(1, 1)!);

  it('pins the countdown one frame above the threshold rather than off', () => {
    // `:7155` sets 1, not 0 and not a flag. The value is the mechanism.
    const state = wave();
    state.reloadTimeEnemy = 999;
    tickWave(state, 1000 / 30, true);

    expect(state.reloadTimeEnemy).toBe(HELD_SPAWN_RELOAD);
    expect(canSpawn(state)).toBe(false);
  });

  it('releases on the very next frame, not after a fresh interval', () => {
    // **The boundary a boolean suppress gets wrong.** Held, the timer sits at
    // 1; released, one tick takes it to 0 and spawning resumes immediately. A
    // suppress flag would leave the timer wherever the last real reset put it
    // — up to a full interval — delaying the first enemy after the player
    // fires, at exactly the moment they are watching.
    const state = wave();
    state.reloadTimeEnemy = 999;

    tickWave(state, 1000 / 30, true);
    expect(canSpawn(state)).toBe(false);

    tickWave(state, 1000 / 30, false);
    expect(state.reloadTimeEnemy).toBe(0);
    expect(canSpawn(state)).toBe(true);
  });

  it('still counts down normally when not held', () => {
    // The control: the gate must be invisible to an ordinary wave.
    const state = wave();
    state.reloadTimeEnemy = 10;
    tickWave(state, 1000 / 30, false);

    expect(state.reloadTimeEnemy).toBeLessThan(10);
    expect(state.reloadTimeEnemy).not.toBe(HELD_SPAWN_RELOAD);
  });

  it('defaults to not holding, so every existing caller is unchanged', () => {
    const held = wave();
    const plain = wave();
    held.reloadTimeEnemy = 10;
    plain.reloadTimeEnemy = 10;

    tickWave(held, 1000 / 30, false);
    tickWave(plain, 1000 / 30);

    expect(plain.reloadTimeEnemy).toBe(held.reloadTimeEnemy);
  });
});
