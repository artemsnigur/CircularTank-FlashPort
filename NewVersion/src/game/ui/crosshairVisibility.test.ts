/**
 * The crosshair's visibility rule — the option that had no consumer (T140).
 *
 * Reported as "crosshair OFF by default doesn't work". It was neither a stale
 * profile nor a misread boolean: `GameplayScene` called `setVisible(true)`, a
 * literal, and `readGameplayOptions(...).crosshair` had **no reader anywhere in
 * `src/`**. The preference persisted, rendered its checkbox, and governed
 * nothing.
 *
 * These drive the rule; `optionConsumers.test.ts` is the mechanism that would
 * have caught the missing reader in the first place.
 */
import { describe, expect, it } from 'vitest';

import { crosshairVisible } from './crosshairVisibility';

describe('the option decides', () => {
  it('draws it when the option is on', () => {
    expect(crosshairVisible({ enabled: true, paused: false })).toBe(true);
  });

  /**
   * **The regression.** Its counterpart sits directly above on the identical
   * input but for `enabled`, because "returns false" is worth nothing from a
   * function that could return false for everything — which is exactly the
   * shape of the bug: a constant where a variable belonged.
   */
  it('hides it when the option is off', () => {
    expect(crosshairVisible({ enabled: false, paused: false })).toBe(false);
  });
});

describe('pausing reverts to the ordinary pointer — PartInterface.as:428', () => {
  it('hides it while paused even with the option on', () => {
    expect(crosshairVisible({ enabled: true, paused: true })).toBe(false);
  });

  it('brings it back on unpause — PartInterface.as:799-802', () => {
    // `unPauseGame` re-installs `MyCursor` *if the option is on*, so resuming
    // must restore it rather than leave the arrow.
    expect(crosshairVisible({ enabled: true, paused: false })).toBe(true);
  });

  it('does not bring it back for a player who turned it off', () => {
    // The carve-out inside the unpause branch: `:799` is an `if`, not an
    // unconditional restore. Without this, "unpause shows it" would be
    // satisfied by an implementation that ignored the option on resume — which
    // is the original bug, one site over.
    expect(crosshairVisible({ enabled: false, paused: true })).toBe(false);
    expect(crosshairVisible({ enabled: false, paused: false })).toBe(false);
  });
});
