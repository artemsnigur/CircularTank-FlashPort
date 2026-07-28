import { describe, expect, it } from 'vitest';
import {
  coerceDifficulty,
  DEFAULT_DIFFICULTY,
  LEVEL_DIFFICULTY_KEY,
  readDifficulty,
  writeDifficulty,
} from './difficultyOption';
import {
  MemoryBackend,
  OPTIONS_STORE,
  SaveStore,
} from '../save/SaveStore';
import { readAudioOptions, writeAudioOptions } from '../audio/audioOptions';

const open = (backend: MemoryBackend) => new SaveStore(OPTIONS_STORE, backend);

describe('the difficulty preference', () => {
  it('starts at Easy', () => {
    expect(DEFAULT_DIFFICULTY).toBe('Easy');
    expect(readDifficulty(open(new MemoryBackend()))).toBe('Easy');
  });

  it('round-trips through the options store', () => {
    const backend = new MemoryBackend();
    writeDifficulty(open(backend), 'Hard');

    expect(readDifficulty(open(backend))).toBe('Hard');
  });

  it('lives in the options store, not the save slot', () => {
    // `SaveManager.as:793` writes it beside the volumes, not into the
    // save-string slot. Putting it in SaveSlotData would change the save format
    // and make a player re-pick after switching slots.
    const backend = new MemoryBackend();
    writeDifficulty(open(backend), 'Medium');

    const raw = backend.read(OPTIONS_STORE);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toMatchObject({ [LEVEL_DIFFICULTY_KEY]: 'Medium' });
  });
});

describe('a bad stored value cannot reach the multipliers', () => {
  it('falls back rather than passing the value through', () => {
    // `getDifficultyProfile` is a record lookup: an unknown key yields
    // undefined and takes every enemy stat to NaN, silently, and only once a
    // level has started.
    for (const bad of ['easy', 'HARD', 'Impossible', '', 3, null, undefined, {}]) {
      expect(coerceDifficulty(bad)).toBe(DEFAULT_DIFFICULTY);
    }
  });

  it('accepts exactly the three real ones', () => {
    for (const good of ['Easy', 'Medium', 'Hard'] as const) {
      expect(coerceDifficulty(good)).toBe(good);
    }
  });

  it('coerces on the way in as well as out', () => {
    const backend = new MemoryBackend();
    const store = open(backend);
    // @ts-expect-error deliberately writing a value the type forbids
    writeDifficulty(store, 'Nightmare');

    expect(readDifficulty(open(backend))).toBe(DEFAULT_DIFFICULTY);
  });
});

/**
 * The hazard `save/optionsStore.ts` exists to prevent.
 *
 * `SaveStore` loads once in its constructor and `flush()` writes the whole
 * object. Two handles are two divergent copies, and the last flush wins.
 */
describe('audio and difficulty share one options store', () => {
  it('two handles lose each other writes — the bug, reproduced', () => {
    // Not the behaviour we ship. This is what a private audio handle would do,
    // and the reason `getOptionsStore` hands out exactly one.
    const backend = new MemoryBackend();

    // Both opened up front, as two long-lived services would be.
    const difficultyHandle = open(backend);
    const audioHandle = open(backend);

    writeDifficulty(difficultyHandle, 'Hard');
    // Audio's cached copy predates that write, so its flush omits the key.
    writeAudioOptions(audioHandle, { soundOn: false, musicOn: true, soundVol: 1, musicVol: 1 });

    expect(readDifficulty(open(backend))).toBe(DEFAULT_DIFFICULTY);
  });

  it('one shared handle keeps both', () => {
    const backend = new MemoryBackend();
    const shared = open(backend);

    writeDifficulty(shared, 'Hard');
    writeAudioOptions(shared, { soundOn: false, musicOn: true, soundVol: 0.5, musicVol: 1 });

    const reloaded = open(backend);
    expect(readDifficulty(reloaded)).toBe('Hard');
    expect(readAudioOptions(reloaded).soundOn).toBe(false);
  });
});
