import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS } from './achievementData';
import type { AchievementSpec } from './achievementData';
import {
  ACHIEVEMENT_SAVE_KEYS,
  createInitialStates,
  decodeState,
  DIFFICULTY_STATE,
  encodeState,
  evaluate,
  getAchievement,
  NOT_EARNED,
  updateAchievements,
  winStateFor,
  wouldWin,
} from './achievementState';
import { SAVE_SLOT_FIELDS } from '../save/saveSchema';

const spec = (id: string): AchievementSpec => {
  const found = getAchievement(id);
  if (!found) throw new Error(`No achievement ${id}`);
  return found;
};

describe('achievement data', () => {
  it('has all 36 achievements from achievementPlacementArray', () => {
    expect(ACHIEVEMENTS).toHaveLength(36);
  });

  it('gives every achievement a unique id, title and description', () => {
    const ids = ACHIEVEMENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const a of ACHIEVEMENTS) {
      expect(a.title.length, a.id).toBeGreaterThan(0);
      expect(a.description.length, a.id).toBeGreaterThan(0);
    }
  });

  it('only uses the three types achievementCheck handles', () => {
    for (const a of ACHIEVEMENTS) {
      expect(['Number', 'Boolean', 'NumberArray']).toContain(a.type);
    }
  });

  it('gives Number and NumberArray achievements a positive requirement', () => {
    for (const a of ACHIEVEMENTS) {
      if (a.type !== 'Boolean') expect(a.requirement, a.id).toBeGreaterThan(0);
    }
  });

  it('preserves known values from the AS3 tables', () => {
    expect(spec('Kills1')).toMatchObject({
      type: 'Number',
      requirement: 100,
      title: 'GRAVEYARD',
      difficultyMatters: false,
    });
    expect(spec('Money3').requirement).toBe(1000000);
    expect(spec('BossOnlySpecial')).toMatchObject({
      type: 'Boolean',
      difficultyMatters: true,
    });
  });
});

describe('initial state', () => {
  it('starts every achievement at -1', () => {
    const states = createInitialStates();
    expect(Object.keys(states)).toHaveLength(36);
    for (const value of Object.values(states)) expect(value).toBe(NOT_EARNED);
  });
});

describe('winStateFor', () => {
  it('is 0 when difficulty does not matter, so it can only be won once', () => {
    expect(winStateFor(spec('Kills1'), 'Hard')).toBe(0);
  });

  it('is the difficulty rank when difficulty matters', () => {
    expect(winStateFor(spec('BossOnlySpecial'), 'Easy')).toBe(1);
    expect(winStateFor(spec('BossOnlySpecial'), 'Medium')).toBe(2);
    expect(winStateFor(spec('BossOnlySpecial'), 'Hard')).toBe(3);
  });

  it('maps difficulties the way ScreenAchievements does', () => {
    expect(DIFFICULTY_STATE).toEqual({ Easy: 1, Medium: 2, Hard: 3 });
  });
});

describe('evaluate — Number', () => {
  const kills1 = spec('Kills1');

  it('does not fire below the requirement', () => {
    expect(evaluate(kills1, 99, NOT_EARNED, 'Easy').won).toBe(false);
  });

  it('fires exactly at the requirement', () => {
    expect(evaluate(kills1, 100, NOT_EARNED, 'Easy')).toEqual({ won: true, newState: 0 });
  });

  it('fires above the requirement', () => {
    expect(evaluate(kills1, 5000, NOT_EARNED, 'Easy').won).toBe(true);
  });

  it('cannot be won twice when difficulty is irrelevant', () => {
    expect(evaluate(kills1, 10000, 0, 'Hard').won).toBe(false);
  });
});

describe('evaluate — Boolean', () => {
  const peaceful = spec('FlagNoWeapons');

  it('does not fire on false', () => {
    expect(evaluate(peaceful, false, NOT_EARNED, 'Hard').won).toBe(false);
  });

  it('fires on true, recording the difficulty', () => {
    expect(evaluate(peaceful, true, NOT_EARNED, 'Medium')).toEqual({ won: true, newState: 2 });
  });

  it('treats any truthy value as true, matching AS3 Boolean()', () => {
    expect(evaluate(peaceful, 1, NOT_EARNED, 'Easy').won).toBe(true);
    expect(evaluate(peaceful, 0, NOT_EARNED, 'Easy').won).toBe(false);
  });

  it('upgrades from a lower difficulty', () => {
    // Earned on Easy (1), now cleared on Hard (3).
    expect(evaluate(peaceful, true, 1, 'Hard')).toEqual({ won: true, newState: 3 });
  });

  it('does not downgrade when re-earned on an easier difficulty', () => {
    expect(evaluate(peaceful, true, 3, 'Easy').won).toBe(false);
  });

  it('does not re-fire on the same difficulty', () => {
    expect(evaluate(peaceful, true, 2, 'Medium').won).toBe(false);
  });
});

describe('evaluate — NumberArray', () => {
  const tiered = ACHIEVEMENTS.find((a) => a.type === 'NumberArray');
  if (!tiered) throw new Error('expected at least one NumberArray achievement');
  const need = tiered.requirement;

  it('awards 3 when the hard tier clears the requirement', () => {
    expect(evaluate(tiered, [need, 0, 0], NOT_EARNED, 'Easy')).toEqual({
      won: true,
      newState: 3,
    });
  });

  it('awards 2 when only the medium tier clears it', () => {
    expect(evaluate(tiered, [0, need, 0], NOT_EARNED, 'Easy').newState).toBe(2);
  });

  it('awards 1 when only the easy tier clears it', () => {
    expect(evaluate(tiered, [0, 0, need], NOT_EARNED, 'Easy').newState).toBe(1);
  });

  it('checks hardest first, so a higher tier wins outright', () => {
    expect(evaluate(tiered, [need, need, need], NOT_EARNED, 'Easy').newState).toBe(3);
  });

  it('does not fire when no tier clears the requirement', () => {
    // winStateValue lands at -1, which cannot beat a currentState of -1.
    expect(evaluate(tiered, [0, 0, 0], NOT_EARNED, 'Hard').won).toBe(false);
  });

  it('ignores the current difficulty entirely', () => {
    const onHard = evaluate(tiered, [0, 0, need], NOT_EARNED, 'Hard');
    const onEasy = evaluate(tiered, [0, 0, need], NOT_EARNED, 'Easy');
    expect(onHard).toEqual(onEasy);
  });

  it('upgrades an existing lower state', () => {
    expect(evaluate(tiered, [need, 0, 0], 1, 'Easy')).toEqual({ won: true, newState: 3 });
  });

  it('does not fire when the derived state is not an improvement', () => {
    expect(evaluate(tiered, [0, 0, need], 3, 'Easy').won).toBe(false);
  });

  it('falls back to zero counts for a malformed value', () => {
    expect(evaluate(tiered, 5, NOT_EARNED, 'Easy').won).toBe(false);
  });
});

describe('wouldWin', () => {
  it('is a pure query and does not mutate state', () => {
    const states = createInitialStates();
    expect(wouldWin('Kills1', 100, states, 'Easy')).toBe(true);
    expect(states.Kills1).toBe(NOT_EARNED);
  });

  it('returns false for an unknown id, matching the AS3 null guard', () => {
    expect(wouldWin('NoSuchAchievement', 999, createInitialStates(), 'Easy')).toBe(false);
  });
});

describe('updateAchievements', () => {
  it('collects everything newly earned in one pass', () => {
    const states = createInitialStates();
    const result = updateAchievements(
      states,
      (s) => (s.id.startsWith('Kills') ? 10000 : 0),
      'Easy',
    );

    expect(result.newlyEarned).toEqual(['Kills1', 'Kills2', 'Kills3']);
    expect(result.states.Kills1).toBe(0);
  });

  it('does not mutate the states it was given', () => {
    const states = createInitialStates();
    updateAchievements(states, () => 999999, 'Hard');
    expect(states.Kills1).toBe(NOT_EARNED);
  });

  it('returns nothing on a second identical pass', () => {
    const first = updateAchievements(createInitialStates(), () => 999999, 'Easy');
    const second = updateAchievements(first.states, () => 999999, 'Easy');
    expect(second.newlyEarned).toEqual([]);
  });

  it('reports upgrades on a harder difficulty as newly earned', () => {
    const onEasy = updateAchievements(createInitialStates(), () => true, 'Easy');
    const onHard = updateAchievements(onEasy.states, () => true, 'Hard');

    // Only the difficulty-sensitive ones can upgrade.
    const sensitive = ACHIEVEMENTS.filter((a) => a.difficultyMatters).map((a) => a.id);
    expect(onHard.newlyEarned.every((id) => sensitive.includes(id))).toBe(true);
    expect(onHard.newlyEarned.length).toBeGreaterThan(0);
  });

  it('preserves display order', () => {
    const result = updateAchievements(createInitialStates(), () => 999999, 'Hard');
    const order = ACHIEVEMENTS.map((a) => a.id);
    const earnedOrder = result.newlyEarned;
    const expectedOrder = order.filter((id) => earnedOrder.includes(id));
    expect(earnedOrder).toEqual(expectedOrder);
  });
});

describe('save encoding', () => {
  it('shifts -1 to 0 so the state fits one digit', () => {
    expect(encodeState(NOT_EARNED)).toBe(0);
    expect(encodeState(0)).toBe(1);
    expect(encodeState(3)).toBe(4);
  });

  it('round-trips every reachable state', () => {
    for (const state of [-1, 0, 1, 2, 3]) {
      expect(decodeState(encodeState(state))).toBe(state);
    }
  });

  it('has a save key for every achievement', () => {
    for (const a of ACHIEVEMENTS) {
      expect(ACHIEVEMENT_SAVE_KEYS[a.id], a.id).toBeDefined();
    }
    expect(Object.keys(ACHIEVEMENT_SAVE_KEYS)).toHaveLength(36);
  });

  it('uses keys that all exist in the save schema', () => {
    // Guards the hand-listed abbreviations against the extracted field table.
    const schemaKeys = new Set(SAVE_SLOT_FIELDS.map((f) => f.key));
    for (const [id, key] of Object.entries(ACHIEVEMENT_SAVE_KEYS)) {
      expect(schemaKeys.has(key), `${id} -> ${key}`).toBe(true);
    }
  });

  it('covers every achievement field the schema declares', () => {
    // 38 achievement-owned fields = 36 states + enemyKills + moneyEarned.
    const owned = SAVE_SLOT_FIELDS.filter((f) => f.owner === 'ScreenAchievements');
    expect(owned).toHaveLength(38);

    const mapped = new Set(Object.values(ACHIEVEMENT_SAVE_KEYS));
    const unmapped = owned.map((f) => f.key).filter((k) => !mapped.has(k));
    expect(unmapped.sort()).toEqual(['ek', 'me']);
  });
});
