import { describe, expect, it } from 'vitest';
import {
  decodeTutorialFields,
  encodeTutorialFields,
  TUTORIAL_COMPLETED_KEY,
  TUTORIAL_DONE_KEY,
  TUTORIAL_UNSEEN_KEY,
} from './tutorialSave';
import { createInitialTutorialState } from './tutorialState';
import type { TutorialState } from './tutorialState';
import { SAVE_SLOT_FIELDS } from '../save/saveSchema';
import { buildSlotBody, EMPTY_SAVE_STRING, parseSlotFields, writeSlot } from '../save/saveString';
import { encodeAchievementFields } from '../achievements/achievementSave';
import { createInitialStates } from '../achievements/achievementState';
import { createInitialLevelSelectData, encodeLevelSelectFields } from '../levels/levelProgressSave';
import { encodeUpgradeFields } from '../upgrades/upgradeSave';
import { createInitialUpgradeState } from '../upgrades/upgradeState';

describe('tutorial save round trip', () => {
  it('emits the four fields the schema declares for PartTutorial', () => {
    const fields = encodeTutorialFields(createInitialTutorialState());
    expect(fields).toHaveLength(4);

    const schemaKeys = SAVE_SLOT_FIELDS.filter((f) => f.owner === 'PartTutorial').map(
      (f) => f.key,
    );
    expect(fields.map((f) => f.key).sort()).toEqual(schemaKeys.sort());
  });

  it('round-trips a fresh profile', () => {
    const state = createInitialTutorialState();
    expect(decodeTutorialFields(encodeTutorialFields(state))).toEqual(state);
  });

  it('round-trips a partly-played profile', () => {
    const state: TutorialState = {
      on: false,
      completed: false,
      unseen: ['CollectFlags', 'Weakness'],
      queue: ['Pause'],
      done: ['Move', 'AimShoot', 'KillEnemies', 'Objective'],
    };
    expect(decodeTutorialFields(encodeTutorialFields(state))).toEqual(state);
  });

  it('round-trips a completed profile', () => {
    const state: TutorialState = {
      on: false,
      completed: true,
      unseen: [],
      queue: [],
      done: ['Move', 'AimShoot'],
    };
    expect(decodeTutorialFields(encodeTutorialFields(state))).toEqual(state);
  });

  it('encodes lists as comma-separated names', () => {
    const state = createInitialTutorialState();
    const unseen = encodeTutorialFields(state).find((f) => f.key === TUTORIAL_UNSEEN_KEY);
    expect(unseen?.value).toBe(state.unseen.join(','));
  });

  it('encodes an empty list as an empty string and reads it back as []', () => {
    const state: TutorialState = { ...createInitialTutorialState(), done: [] };
    const done = encodeTutorialFields(state).find((f) => f.key === TUTORIAL_DONE_KEY);
    expect(done?.value).toBe('');
    expect(decodeTutorialFields(encodeTutorialFields(state)).done).toEqual([]);
  });

  it('encodes completion as 1 or 0', () => {
    const state = createInitialTutorialState();
    const off = encodeTutorialFields(state).find((f) => f.key === TUTORIAL_COMPLETED_KEY);
    expect(off?.value).toBe('0');

    const on = encodeTutorialFields({ ...state, completed: true }).find(
      (f) => f.key === TUTORIAL_COMPLETED_KEY,
    );
    expect(on?.value).toBe('1');
  });

  it('does not persist tutorialOn, which a level start sets', () => {
    const decoded = decodeTutorialFields(
      encodeTutorialFields({ ...createInitialTutorialState(), on: true }),
    );
    expect(decoded.on).toBe(false);
  });

  it('survives a trip through the save-string container', () => {
    const state: TutorialState = {
      ...createInitialTutorialState(),
      done: ['Move', 'AimShoot'],
      queue: ['KillEnemies'],
    };
    const text = writeSlot(EMPTY_SAVE_STRING, 1, buildSlotBody(encodeTutorialFields(state)));
    expect(decodeTutorialFields(parseSlotFields(text, 1))).toEqual(state);
  });

  it('falls back to defaults when fields are absent', () => {
    expect(decodeTutorialFields([])).toEqual(createInitialTutorialState());
  });

  it('discards names that are not known tutorial steps', () => {
    // A save from an older build could name a step that no longer exists;
    // carrying it through would put the queue in a state no branch handles.
    const decoded = decodeTutorialFields([
      { key: TUTORIAL_DONE_KEY, value: 'Move,GhostStep,AimShoot' },
    ]);
    expect(decoded.done).toEqual(['Move', 'AimShoot']);
  });

  it('completes the save slice — 50 of 63 fields now wired', () => {
    const all = [
      ...encodeAchievementFields({
        states: createInitialStates(),
        totals: { enemyKills: 0, moneyEarned: 0 },
      }),
      ...encodeLevelSelectFields(createInitialLevelSelectData()),
      ...encodeUpgradeFields(createInitialUpgradeState()),
      ...encodeTutorialFields(createInitialTutorialState()),
    ];

    expect(all).toHaveLength(50);
    expect(new Set(all.map((f) => f.key)).size).toBe(50);

    const text = writeSlot(EMPTY_SAVE_STRING, 2, buildSlotBody(all));
    expect(decodeTutorialFields(parseSlotFields(text, 2))).toEqual(
      createInitialTutorialState(),
    );
  });
});
