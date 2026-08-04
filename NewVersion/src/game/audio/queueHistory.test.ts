import { beforeEach, describe, expect, it } from 'vitest';

import {
  clearQueueHistory,
  enableQueueHistory,
  peakPerFrame,
  queueHistory,
  queuedNames,
  recordQueued,
  unresolvedNames,
} from './queueHistory';

/**
 * ── The boundary, stated where the assertions are ─────────────────────────
 * These prove the recorder records. Nothing here plays a sound, and a green run
 * of this file is **not** evidence that any audio is audible — volume, mute, a
 * suspended `AudioContext` and a failed decode all leave the history identical.
 * `audioSelfTest.ts` is the check for that half.
 */

beforeEach(() => {
  clearQueueHistory();
  enableQueueHistory();
});

describe('the record', () => {
  it('keeps every attempt in order, including repeats', () => {
    recordQueued('Coin', true, 1);
    recordQueued('Coin', true, 1);
    recordQueued('EnemySquish', true, 2);

    // Repeats are kept deliberately — collapsing them here would hide the
    // over-firing case entirely, which is half of what this exists for.
    expect(queuedNames()).toEqual(['Coin', 'Coin', 'EnemySquish']);
  });

  it('records an unresolved name rather than dropping it', () => {
    // The `EnemyShoot` failure mode. `queue()` warns and returns for a name the
    // manifest does not know, which is indistinguishable from a trigger that
    // was never written. Asserted beside a resolved name so "records
    // everything" cannot degenerate into "records nothing about resolution".
    recordQueued('Coin', true, 1);
    recordQueued('NotARealSound', false, 1);

    expect(unresolvedNames()).toEqual(['NotARealSound']);
    expect(queueHistory()).toHaveLength(2);
  });

  it('reports no unresolved names when every one resolved', () => {
    recordQueued('Coin', true, 1);
    expect(unresolvedNames()).toEqual([]);
  });

  it('records nothing until enabled', () => {
    // It ships behind `import.meta.env.DEV`; a production build must not
    // accumulate rows forever.
    clearQueueHistory();
    // Re-import semantics: `enableQueueHistory` is sticky within a module
    // instance, so this asserts the clear rather than the disabled state, and
    // the disabled path is covered by the guard in `recordQueued` itself.
    expect(queueHistory()).toEqual([]);
  });
});

describe('peakPerFrame — the dedup assertion', () => {
  it('is 1 when a name fires once per frame across many frames', () => {
    for (let frame = 1; frame <= 10; frame += 1) recordQueued('EnemySquish', true, frame);
    expect(peakPerFrame('EnemySquish')).toBe(1);
  });

  it('counts ten deaths in one frame as ten attempts, not one', () => {
    // `SoundManager.as:1080` resets `sfxPlayedArray` each drain and skips a
    // name already played, so ten enemies dying in one frame is **one**
    // `EnemySquish` for the player. The `Set` downstream enforces that.
    //
    // This counts *attempts* on purpose. A call site firing ten times a frame
    // is a real defect even though the player hears one sound, and asserting
    // on plays would make that invisible — which is exactly how a dedup
    // regression would hide.
    for (let i = 0; i < 10; i += 1) recordQueued('EnemySquish', true, 7);
    expect(peakPerFrame('EnemySquish')).toBe(10);
  });

  it('takes the busiest frame, not the last or the average', () => {
    recordQueued('Coin', true, 1);
    recordQueued('Coin', true, 2);
    recordQueued('Coin', true, 2);
    recordQueued('Coin', true, 2);
    recordQueued('Coin', true, 3);

    expect(peakPerFrame('Coin')).toBe(3);
  });

  it('does not let one name`s burst count toward another', () => {
    // The bug that would make every assertion in a driven scenario pass.
    for (let i = 0; i < 5; i += 1) recordQueued('Coin', true, 4);
    recordQueued('EnemySquish', true, 4);

    expect(peakPerFrame('Coin')).toBe(5);
    expect(peakPerFrame('EnemySquish')).toBe(1);
  });

  it('is 0 for a name that never fired', () => {
    expect(peakPerFrame('NeverQueued')).toBe(0);
  });
});
