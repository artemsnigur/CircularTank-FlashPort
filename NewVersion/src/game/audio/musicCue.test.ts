import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { MUSIC_BY_MODE, musicForMode, musicForOutcome } from './musicCue';
import { MUSIC } from '../../assets/audioManifest';
import { MUSIC_CROSSFADE_MS } from './SoundManager';

/**
 * The AS3's own list, transcribed a second time from `SoundManager.as:975`'s
 * `music == "X"` chain and `ScreenGame.as:378`.
 *
 * A second independent reading on purpose. The mode name and the track name
 * being identical is exactly the sort of index-and-meaning coincidence that
 * makes a derived mapping look correct — asserting `MUSIC_BY_MODE` against
 * itself would prove only that it is self-consistent.
 */
const AS3_TRACKS = ['Boss', 'Defense', 'Flag', 'Lose', 'Menu', 'Normal', 'Tower', 'Win'];

describe('the level track is the level mode', () => {
  it('maps each of the five modes to its own track', () => {
    expect(musicForMode('Normal')).toBe('Normal');
    expect(musicForMode('Boss')).toBe('Boss');
    expect(musicForMode('Flag')).toBe('Flag');
    expect(musicForMode('Tower')).toBe('Tower');
    expect(musicForMode('Defense')).toBe('Defense');
  });

  it('names only tracks the manifest actually has', () => {
    // The check that makes going through a table worth anything. A sixth mode
    // added without a track, or a track renamed, fails here rather than
    // compiling and playing silence.
    // `MusicName` includes 'None', which is not a track — compared as strings
    // so the check is about the manifest rather than about the union.
    const known = new Set<string>(MUSIC.map((track) => track.name));
    for (const track of Object.values(MUSIC_BY_MODE)) {
      expect(known.has(track), `no track named ${track}`).toBe(true);
    }
  });

  it('covers every mode with no gaps and no extras', () => {
    expect(Object.keys(MUSIC_BY_MODE).sort()).toEqual([
      'Boss',
      'Defense',
      'Flag',
      'Normal',
      'Tower',
    ]);
  });

  it('agrees with a second reading of the AS3 track list', () => {
    // The five in-level tracks, plus Menu, Win and Lose, are all eight.
    const fromMap = new Set<string>([
      ...Object.values(MUSIC_BY_MODE),
      'Menu',
      musicForOutcome('won'),
      musicForOutcome('lost'),
    ]);
    expect([...fromMap].sort()).toEqual(AS3_TRACKS);
  });
});

describe('the outcome tracks', () => {
  it('gives a win and a loss different tracks', () => {
    // `:2792` and `:2788`. Pinned as the pair — a single mapping that returned
    // the same track for both would pass either line alone.
    expect(musicForOutcome('won')).toBe('Win');
    expect(musicForOutcome('lost')).toBe('Lose');
    expect(musicForOutcome('won')).not.toBe(musicForOutcome('lost'));
  });
});

describe('the crossfade matches the original', () => {
  it('crossfades rather than cutting, over 30 frames', () => {
    // Checked against the AS3 rather than kept because it was already there:
    // `SoundManager.as:278` is `Tween(..., Strong.easeOut, 1, 0, 30, false)`,
    // and `false` means frames, not seconds — 30 frames is 1s at 30fps. Two
    // channels cross-mix (`:940-944`), so it is a genuine crossfade and a hard
    // cut would be the divergence.
    expect(MUSIC_CROSSFADE_MS).toBe(1000);
  });
});

describe('every music trigger is reached', () => {
  const read = (...parts: string[]): string =>
    readFileSync(join(import.meta.dirname, '..', ...parts), 'utf8');
  const GAMEPLAY = read('scenes', 'GameplayScene.ts');
  const MENU = read('scenes', 'MainMenuScene.ts');

  it('sets Menu on the menu, the mode at level start and the outcome at the end', () => {
    // Source-shape check, flagged as such — it proves the calls are written,
    // never that they run. The driven proof is the coverage sweep, which sees
    // music only because `setMusic` now records into the queue history.
    //
    // Worth stating plainly: all three of these were **already wired** before
    // this pass. They were reported as missing twice, once from a `head -6`
    // that truncated the grep and once from a sweep whose instrument could not
    // observe music at all.
    expect(MENU).toContain("setMusic('Menu')");
    expect(GAMEPLAY).toContain('setMusic(musicForMode(');
    expect(GAMEPLAY).toContain('setMusic(outcomeMusic(');
  });
});
