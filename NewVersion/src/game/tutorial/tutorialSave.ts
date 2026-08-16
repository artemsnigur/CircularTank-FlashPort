/**
 * The `PartTutorial` slice of the save format — 4 of the 63 slot fields.
 *
 * The three lists travel as comma-separated names via
 * `stringArrayToShortString`. Note that decoding uses the AS3's own splitter,
 * which drops a trailing empty element — harmless here because tutorial ids
 * never contain commas and an empty list encodes to "".
 */

import { booleanToNumber, numberToBoolean, shortStringToStringArray, stringArrayToShortString } from '../save/saveCodec';
import { readField } from '../save/saveString';
import type { SaveField } from '../save/saveString';
import { TUTORIAL_IDS } from './tutorialData';
import type { TutorialId } from './tutorialData';
import { createInitialTutorialState } from './tutorialState';
import type { TutorialState } from './tutorialState';

export const TUTORIAL_COMPLETED_KEY = 'tc';
export const TUTORIAL_UNSEEN_KEY = 'tau';
const TUTORIAL_QUEUE_KEY = 'taq';
export const TUTORIAL_DONE_KEY = 'tad';

const VALID_IDS = new Set<string>(TUTORIAL_IDS);

/** Drops anything that is not a known tutorial id. */
function toTutorialIds(values: readonly string[]): TutorialId[] {
  return values.filter((value): value is TutorialId => VALID_IDS.has(value));
}

export function encodeTutorialFields(state: TutorialState): SaveField[] {
  return [
    { key: TUTORIAL_COMPLETED_KEY, value: String(booleanToNumber(state.completed)) },
    { key: TUTORIAL_UNSEEN_KEY, value: stringArrayToShortString(state.unseen) },
    { key: TUTORIAL_QUEUE_KEY, value: stringArrayToShortString(state.queue) },
    { key: TUTORIAL_DONE_KEY, value: stringArrayToShortString(state.done) },
  ];
}

/**
 * Reads the slice back.
 *
 * Unknown names are discarded rather than trusted: a save written by an older
 * build could name a step that no longer exists, and carrying it through would
 * put the queue into a state no branch handles.
 */
export function decodeTutorialFields(fields: readonly SaveField[]): TutorialState {
  const defaults = createInitialTutorialState();

  const list = (key: string, fallback: TutorialId[]): TutorialId[] => {
    const raw = readField(fields, key);
    if (raw === undefined) return [...fallback];
    return toTutorialIds(shortStringToStringArray(raw));
  };

  const completedRaw = readField(fields, TUTORIAL_COMPLETED_KEY);
  const completed =
    completedRaw === undefined ? defaults.completed : numberToBoolean(Number(completedRaw));

  return {
    // `tutorialOn` is not saved; it is set when a level starts.
    on: defaults.on,
    completed,
    unseen: list(TUTORIAL_UNSEEN_KEY, defaults.unseen),
    queue: list(TUTORIAL_QUEUE_KEY, defaults.queue),
    done: list(TUTORIAL_DONE_KEY, defaults.done),
  };
}
