/**
 * The pause trigger — `PartGameArea.as:2682-2703`.
 *
 * ── There is no pause button in the original ──────────────────────────────
 * Pause is a **key**: `Main.keyP || Main.keyEsc`, plus an auto-pause when the
 * window loses focus. The four `ButtonPause*` classes are the buttons *inside*
 * the pause panel — Resume, Reset Level, Quit Level — not the thing that opens
 * it.
 *
 * ── `canPause` is an edge detector, and it is the whole point of this file ──
 * The AS3 runs this in `update`, i.e. **every frame**, against a key that is
 * *held*:
 *
 *     if (canPause && (keyP || keyEsc || auto)) { toggle(); canPause = false; }
 *     else if (!canPause && !(keyP || keyEsc)) { canPause = true; }
 *
 * So a press toggles once and re-arms only when both keys are released. Without
 * the latch a held key toggles pause on every frame — sixty times a second,
 * which reads as the game flickering rather than as a stuck key. This is
 * extracted and tested rather than left inline for exactly that reason: it is
 * one boolean, and getting it wrong is invisible in code review and obvious in
 * play.
 *
 * ── The auto arm only ever pauses ─────────────────────────────────────────
 * `optionAutoPauseOn && !Main.gameActive && !gamePaused` — the trailing
 * `!gamePaused` means losing focus can pause but never resume. Returning to a
 * paused game leaves it paused, which is what a player expects and is easy to
 * lose by simplifying the condition to `auto && !focused`.
 */

export interface PauseLatchState {
  /** `PartGameArea.canPause` — armed, i.e. the keys have been released. */
  canPause: boolean;
  /** `PartGameArea.gamePaused`. */
  paused: boolean;
}

export interface PauseInputs {
  /** P or Escape held this frame — the AS3's `keyP || keyEsc`. */
  keyHeld: boolean;
  /** The window has focus — the AS3's `Main.gameActive`. */
  focused: boolean;
  /** `ScreenOptions.optionAutoPauseOn`. */
  autoPause: boolean;
  /**
   * **Port-only.** The results overlay has finished the level and paused the
   * scene itself (`GameplayScene.ts:4819`), so a pause toggle here would
   * `resume()` a scene that must stay paused and drop the player back into a
   * level that is over.
   *
   * The AS3 needs no equivalent because it *changes screen* on a finish rather
   * than pausing in place, so `PartGameArea.update` is no longer running by
   * then. Gated here, inside the rule, rather than at the call site: a guard
   * bolted onto the emit would also swallow the auto-pause arm and anything
   * else added later — the failure `CLAUDE.md` records for `AmmoReadout` and
   * `isWaveComplete`.
   */
  levelFinished: boolean;
}

export interface PauseLatchResult extends PauseLatchState {
  /** True on the frame the toggle fires — the caller emits on this. */
  toggled: boolean;
}

/** A fresh latch: armed, unpaused. `PartGameArea` starts `canPause` true. */
export function createPauseLatch(): PauseLatchState {
  return { canPause: true, paused: false };
}

/**
 * One frame of `:2682-2703`.
 *
 * Returns the next state and whether the caller should emit. Pure, so the
 * held-key case can be driven for as many frames as it takes to prove the
 * latch holds — which no amount of reading the condition can.
 */
export function stepPauseLatch(
  state: PauseLatchState,
  inputs: PauseInputs,
): PauseLatchResult {
  // The port-only gate. Note it leaves `canPause` alone: a key held across the
  // moment a level ends must not arrive re-armed on the next level.
  if (inputs.levelFinished) return { ...state, toggled: false };

  // `:2682` — the auto arm carries its own `!gamePaused`, so it can only ever
  // pause. The key arm toggles both ways.
  const autoWants = inputs.autoPause && !inputs.focused && !state.paused;

  if (state.canPause && (inputs.keyHeld || autoWants)) {
    return { canPause: false, paused: !state.paused, toggled: true };
  }

  // `:2700` — re-arm on release. **Only the keys re-arm it**, not focus: the
  // AS3 tests `!(keyP || keyEsc)` and says nothing about `gameActive`.
  if (!state.canPause && !inputs.keyHeld) {
    return { ...state, canPause: true, toggled: false };
  }

  return { ...state, toggled: false };
}
