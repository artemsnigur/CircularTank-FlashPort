/**
 * The six gameplay options, their first-run defaults, and the two that differ
 * from the original — divergence `A13`.
 *
 * **Nothing pinned these before T135.** Both defaults were changed and all 3042
 * tests stayed green, which is exactly the state a value should not be in: the
 * table is transcribed from `SaveManager.as:824-831` and a silent edit to it
 * changes what every new player gets.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { MemoryBackend, SaveStore } from '../save/SaveStore';
import {
  ACHIEVEMENT_POPUP_KEY,
  AS3_DEFAULT_GAMEPLAY_OPTIONS,
  CROSSHAIR_KEY,
  DEFAULT_GAMEPLAY_OPTIONS,
  TUTORIAL_ON_KEY,
  optionsInitiated,
  readGameplayOptions,
  writeGameplayOptions,
} from './gameplayOptions';

let backend: MemoryBackend;

beforeEach(() => {
  backend = new MemoryBackend();
});

const store = () => new SaveStore('opts', backend);

describe('the AS3 baseline', () => {
  /**
   * Stated from the source, not read back out of the module. `:824-831` sets
   * every one of the six to `true` on a first run.
   */
  it('is all six on', () => {
    expect(AS3_DEFAULT_GAMEPLAY_OPTIONS).toEqual({
      crosshair: true,
      autoPause: true,
      windowUL: true,
      autoSelect: true,
      achievementPopUp: true,
      tutorialOn: true,
    });
  });
});

describe('the shipped defaults — divergence A13', () => {
  it('turns off the crosshair and the tutorial, and nothing else', () => {
    expect(DEFAULT_GAMEPLAY_OPTIONS.crosshair).toBe(false);
    expect(DEFAULT_GAMEPLAY_OPTIONS.tutorialOn).toBe(false);

    // The counterpart, and the reason this is a two-key divergence rather than
    // "the defaults changed": everything else still matches the AS3. A blanket
    // edit — all false, or a stray flip — passes the two lines above and fails
    // here.
    const { crosshair: _c, tutorialOn: _t, ...rest } = DEFAULT_GAMEPLAY_OPTIONS;
    const { crosshair: _ac, tutorialOn: _at, ...as3Rest } = AS3_DEFAULT_GAMEPLAY_OPTIONS;
    expect(rest).toEqual(as3Rest);
  });

  it('differs from the original in exactly two keys', () => {
    const differing = (Object.keys(DEFAULT_GAMEPLAY_OPTIONS) as (keyof typeof DEFAULT_GAMEPLAY_OPTIONS)[])
      .filter((key) => DEFAULT_GAMEPLAY_OPTIONS[key] !== AS3_DEFAULT_GAMEPLAY_OPTIONS[key]);

    expect(differing.sort()).toEqual(['crosshair', 'tutorialOn']);
  });
});

describe('reading', () => {
  it('gives the defaults on a store that has never been written', () => {
    const fresh = store();
    expect(optionsInitiated(fresh)).toBe(false);
    expect(readGameplayOptions(fresh)).toEqual(DEFAULT_GAMEPLAY_OPTIONS);
  });

  /**
   * The branch `readGameplayOptions` documents: once initiated, a stored
   * `false` is the player's answer and must survive. With the crosshair now
   * defaulting off, the mirror case matters more than it did — a player who
   * turns it **on** must not have it reset by the default.
   */
  it('keeps a value the player chose against the default', () => {
    const written = store();
    writeGameplayOptions(written, { ...DEFAULT_GAMEPLAY_OPTIONS, crosshair: true });
    // `writeGameplayOptions` sets; the caller flushes. Reopening without this
    // reads the backend, which has not been written yet.
    written.flush();

    const reopened = store();
    expect(optionsInitiated(reopened)).toBe(true);
    expect(readGameplayOptions(reopened).crosshair).toBe(true);
    // And the other direction on a key that defaults on.
    expect(readGameplayOptions(reopened).autoPause).toBe(true);
  });

  it('keeps a stored false rather than treating it as absent', () => {
    const written = store();
    writeGameplayOptions(written, { ...DEFAULT_GAMEPLAY_OPTIONS, achievementPopUp: false });
    written.flush();

    expect(readGameplayOptions(store()).achievementPopUp).toBe(false);
  });

  it('writes under the AS3 key names', () => {
    // The keys are the original `SharedObject` field names; renaming one would
    // orphan every existing player's preference.
    const written = store();
    writeGameplayOptions(written, DEFAULT_GAMEPLAY_OPTIONS);

    expect(written.has(CROSSHAIR_KEY)).toBe(true);
    expect(written.has(TUTORIAL_ON_KEY)).toBe(true);
    expect(written.has(ACHIEVEMENT_POPUP_KEY)).toBe(true);
    expect(CROSSHAIR_KEY).toBe('optionCrosshairOn');
    expect(ACHIEVEMENT_POPUP_KEY).toBe('achievementPopUp');
  });
});
