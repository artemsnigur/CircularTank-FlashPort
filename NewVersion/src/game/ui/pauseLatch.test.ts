/**
 * The pause latch — `PartGameArea.as:2682-2703`.
 *
 * The rule is three lines and one boolean, and the failure it prevents is only
 * visible over **time**: a held key toggling every frame. So most of these
 * drive many frames rather than asserting a single call, which is the only way
 * the difference between "toggles once" and "toggles sixty times" shows up.
 */
import { describe, expect, it } from 'vitest';

import { createPauseLatch, stepPauseLatch } from './pauseLatch';
import type { PauseInputs, PauseLatchState } from './pauseLatch';

const inputs = (over: Partial<PauseInputs> = {}): PauseInputs => ({
  keyHeld: false,
  focused: true,
  autoPause: true,
  levelFinished: false,
  ...over,
});

/** Runs N frames of identical input, counting toggles. */
function run(state: PauseLatchState, frames: number, over: Partial<PauseInputs> = {}) {
  let current = state;
  let toggles = 0;
  for (let i = 0; i < frames; i += 1) {
    const next = stepPauseLatch(current, inputs(over));
    if (next.toggled) toggles += 1;
    current = next;
  }
  return { state: current, toggles };
}

describe('the latch', () => {
  it('starts armed and unpaused', () => {
    expect(createPauseLatch()).toEqual({ canPause: true, paused: false });
  });

  /** **The defect this file exists for.** */
  it('toggles once for a key held sixty frames, not sixty times', () => {
    const held = run(createPauseLatch(), 60, { keyHeld: true });
    expect(held.toggles).toBe(1);
    expect(held.state.paused).toBe(true);
    expect(held.state.canPause).toBe(false);
  });

  it('re-arms on release and toggles again on the next press', () => {
    // Press, hold, release, press again — the ordinary way a player unpauses.
    let state = run(createPauseLatch(), 10, { keyHeld: true }).state;
    expect(state.paused).toBe(true);

    state = run(state, 5, { keyHeld: false }).state;
    expect(state.canPause).toBe(true);
    expect(state.paused, 'releasing must not toggle by itself').toBe(true);

    const second = run(state, 10, { keyHeld: true });
    expect(second.toggles).toBe(1);
    expect(second.state.paused).toBe(false);
  });

  it('does not re-arm while the key is still down', () => {
    // The counterpart to the release test: 200 frames of holding is still one
    // toggle, however long the player leans on the key.
    const held = run(createPauseLatch(), 200, { keyHeld: true });
    expect(held.toggles).toBe(1);
  });
});

describe('the auto-pause arm — `:2682`', () => {
  it('pauses when focus is lost', () => {
    const lost = run(createPauseLatch(), 5, { focused: false });
    expect(lost.toggles).toBe(1);
    expect(lost.state.paused).toBe(true);
  });

  /**
   * The trailing `!gamePaused` in the AS3 condition. Losing focus while already
   * paused must do nothing, and — the case that actually bites — **staying**
   * unfocused must not toggle back and forth as the latch re-arms each frame.
   */
  it('never resumes, however long focus stays away', () => {
    const away = run(createPauseLatch(), 300, { focused: false });
    expect(away.toggles).toBe(1);
    expect(away.state.paused).toBe(true);
  });

  it('does nothing when the option is off', () => {
    const off = run(createPauseLatch(), 60, { focused: false, autoPause: false });
    expect(off.toggles).toBe(0);
    expect(off.state.paused).toBe(false);

    // Its counterpart on identical input: with the option on, the same frames
    // pause. Without this pair, "does nothing" would be satisfied by a rule
    // that never fires at all.
    const on = run(createPauseLatch(), 60, { focused: false, autoPause: true });
    expect(on.toggles).toBe(1);
  });

  it('leaves the key arm working while unfocused', () => {
    // Auto-pauses on frame 1, then the player presses the key to resume even
    // though the window is still not focused.
    const state = run(createPauseLatch(), 3, { focused: false }).state;
    expect(state.paused).toBe(true);

    const pressed = run(state, 3, { focused: false, keyHeld: true });
    expect(pressed.toggles).toBe(1);
    expect(pressed.state.paused).toBe(false);
  });
});

describe('a finished level is not pausable — port-only', () => {
  /**
   * `GameplayScene.ts:4819` pauses the scene to hold the results overlay, so a
   * toggle here would resume a scene that must stay paused.
   */
  it('ignores the key entirely once the level is over', () => {
    const finished = run(createPauseLatch(), 60, { keyHeld: true, levelFinished: true });
    expect(finished.toggles).toBe(0);
    expect(finished.state.paused).toBe(false);

    // The counterpart on the identical input: unfinished, it fires. "Ignores
    // it" has to be the *gate's* doing, not the rule failing generally.
    const live = run(createPauseLatch(), 60, { keyHeld: true, levelFinished: false });
    expect(live.toggles).toBe(1);
  });

  it('ignores the auto arm too', () => {
    // The guard sits inside the rule rather than at the emit, so it covers
    // every arm — including ones added later.
    const finished = run(createPauseLatch(), 60, { focused: false, levelFinished: true });
    expect(finished.toggles).toBe(0);
  });

  it('does not silently re-arm across the end of a level', () => {
    // Key down when the level ends. The gate must not hand back an armed latch,
    // or the next level starts one keystroke ahead of the player.
    const mid = stepPauseLatch({ canPause: false, paused: false }, inputs({
      keyHeld: true,
      levelFinished: true,
    }));
    expect(mid.canPause).toBe(false);
    expect(mid.toggled).toBe(false);
  });
});
