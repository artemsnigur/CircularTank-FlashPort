import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * **The instrument's own coverage.**
 *
 * `queueHistory` is only as trustworthy as the set of emit paths that record
 * into it. One path escaping inverted the reading on eight names — `setMusic`
 * bypassed the history, so fully wired music measured as entirely absent, and
 * the failure looked exactly like the thing the instrument detects, which is
 * why it survived two passes.
 *
 * A second escape was then found here: `keepLoopAlive`, which drives the two
 * continuous loops. They were missing from the numerator *and* the denominator,
 * so nothing looked wrong at all.
 *
 * This makes the property checkable instead of remembered: **every method on
 * `SoundManager` that can reach the backend must record.**
 */

const MANAGER = readFileSync(join(import.meta.dirname, 'SoundManager.ts'), 'utf8');

/**
 * The backend methods that produce sound, as declared on `AudioBackend`.
 *
 * Volume and load calls are excluded deliberately — they change how something
 * sounds or make it available, they do not start anything.
 */
const EMITTING_BACKEND_CALLS = ['playSfx', 'playMusic', 'startLoop'] as const;

/**
 * The public entry point that ultimately drives each one, and which must record.
 *
 * Derived by reading the call chain, not by pattern: `playSfx` is reached from
 * `playSounds` which drains what `queue` filled, `playMusic` from
 * `handleMusicChange` which acts on what `setMusic` set, and `startLoop` from
 * `handleLoops` which acts on what `keepLoopAlive` requested.
 */
const RECORDING_ENTRY_POINTS = ['queue', 'setMusic', 'keepLoopAlive'] as const;

/** Body of a method, from its signature to the next same-indent close. */
function methodBody(source: string, name: string): string {
  const start = source.indexOf(`\n  ${name}(`);
  if (start === -1) throw new Error(`no method ${name}() on SoundManager`);
  const end = source.indexOf('\n  }', start);
  return source.slice(start, end);
}

describe('every emit path records into the history', () => {
  it('finds all three entry points', () => {
    // A floor check. If a rename made these unfindable the loop below would
    // pass vacuously, which is the failure mode of every list-driven test.
    for (const name of RECORDING_ENTRY_POINTS) {
      expect(() => methodBody(MANAGER, name), name).not.toThrow();
    }
  });

  it('calls recordQueued in each of them', () => {
    for (const name of RECORDING_ENTRY_POINTS) {
      expect(methodBody(MANAGER, name), `${name}() does not record`).toContain('recordQueued(');
    }
  });

  it('has no emitting backend call outside those three chains', () => {
    // The assertion that catches a *fourth* path. If someone adds
    // `backend.playSfx(...)` somewhere new — a one-shot bypassing the queue,
    // say — the count rises and this fails, rather than the sweep quietly
    // reporting that name as never fired.
    //
    // Counts are exact rather than "at least", because the failure being
    // guarded is an *addition*.
    const counts = Object.fromEntries(
      EMITTING_BACKEND_CALLS.map((call) => [
        call,
        (MANAGER.match(new RegExp(`backend\\.${call}\\(`, 'g')) ?? []).length,
      ]),
    );

    expect(counts).toEqual({ playSfx: 1, playMusic: 2, startLoop: 1 });
  });

  it('records the loop ids by the same name the manifest uses', () => {
    // The loops were also absent from the published name list, so they were
    // missing from the denominator. Recording them under a different spelling
    // would put them back in the numerator only — visible, and permanently
    // "extra", which is the confusing half of the same bug.
    expect(methodBody(MANAGER, 'keepLoopAlive')).toContain('recordQueued(id,');
    expect(MANAGER).toContain('...(Object.keys(this.loops) as LoopId[])');
  });
});

describe('the published name list is the whole denominator', () => {
  it('includes sfx, music and loops', () => {
    const publish = MANAGER.slice(MANAGER.indexOf('publishQueueHistory(['));
    const call = publish.slice(0, publish.indexOf(']);'));
    expect(call).toContain('this.sfxByName.keys()');
    expect(call).toContain('this.musicByName.keys()');
    expect(call).toContain('this.loops');
  });

  it('publishes after the maps are filled, not before', () => {
    // It was in the constructor above both loops in T40 and handed the harness
    // an empty list, which printed no missing names at all. Ordering, so it is
    // checked by position rather than by hoping.
    expect(MANAGER.indexOf('publishQueueHistory([')).toBeGreaterThan(
      MANAGER.indexOf('this.sfxByName.set('),
    );
    expect(MANAGER.indexOf('publishQueueHistory([')).toBeGreaterThan(
      MANAGER.indexOf('this.loops = {'),
    );
  });
});
