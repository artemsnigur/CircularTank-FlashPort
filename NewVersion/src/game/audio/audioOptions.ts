/**
 * Sound and music preferences, persisted the way the AS3 persists them.
 *
 * `SaveManager.as:846-863` writes `soundOn`, `musicOn`, `soundVol` and
 * `musicVol` into a **separate SharedObject** — `CircularTankOptions`, not the
 * save-string slot — and reads them back at `:860-863`. That separation is
 * faithful and useful: preferences survive a save wipe, and toggling sound does
 * not touch the 63-field slot.
 *
 * `SaveStore.OPTIONS_STORE` already carried that name. It was on the audit's
 * dead-module list — ported, tested, and opened by nothing — so this wires an
 * existing module rather than adding one.
 *
 * ── Why this is more than a persisted flag ────────────────────────────────
 * `SoundManager.applyVolumes()` existed and was never called, so every volume
 * and mute field was computed each frame and reached no sound. A toggle written
 * before that was fixed would have flipped a boolean, saved it, reloaded it
 * correctly — and changed nothing audible. The seam is the point, not the
 * state.
 */
import type { SaveStore } from '../save/SaveStore';
import type { SoundManager } from './SoundManager';

/** Keys verbatim from `SaveManager.as:846-849`. */
export const SOUND_ON_KEY = 'soundOn';
export const MUSIC_ON_KEY = 'musicOn';
export const SOUND_VOL_KEY = 'soundVol';
export const MUSIC_VOL_KEY = 'musicVol';

export interface AudioOptions {
  soundOn: boolean;
  musicOn: boolean;
  soundVol: number;
  musicVol: number;
}

/** `SaveManager.as:831-834` — the reset defaults. */
export const DEFAULT_AUDIO_OPTIONS: AudioOptions = {
  soundOn: true,
  musicOn: true,
  soundVol: 1,
  musicVol: 1,
};

/**
 * ── The slider ↔ toggle coupling — DECIDED T111, ported faithfully ────────
 *
 * **There is exactly one volume value in the original.** `SoundManager.soundVol`.
 * The AS3 never distinguishes "the volume the player chose" from "the volume
 * right now" — muting *overwrites* the single value with 0, and unmuting
 * overwrites it with 1. So "muted but volume remembered" was not a state the
 * original could reach, and it is not one this port reaches any more.
 *
 * Two AS3 sites apply the rule, and **both matter** — an earlier note here said
 * the original "always reconciled with the slider on screen", which was wrong
 * and was the stated reason this stayed unported:
 *
 * - **`ButtonToggleSound.as:43-52`** (and `ButtonToggleMusic.as:43-52`) — the
 *   standalone toggle, *with no slider anywhere*: flips `soundOn`, then writes
 *   `soundVol = 1` when turning on and `soundVol = 0` when turning off. This is
 *   the AS3 counterpart of this port's `AudioToggles` on the HUD and main menu,
 *   so those surfaces are **not** port-invented UI needing their own decision.
 * - **`ScreenOptions.as:233-256`** — per-frame reconciliation while Options is
 *   open:
 *     `:235-244`  while dragging: `soundOn = (sliderValue != 0)`
 *     `:246-249`  idle, `vol == 0` and on  -> slider jumps to **1**, button to
 *                 the bar's right end (it visibly moves)
 *     `:251-254`  idle, `vol > 0` and off  -> slider forced to **0**, button to
 *                 x = 0 (it visibly moves)
 *     `:256`      `soundVol = sliderValue`, unconditionally
 *
 * `:150-151` initialises each slider from `SoundManager.soundVol`, so a stored
 * mid-volume shows as itself — it is only destroyed by a mute round-trip, not
 * by opening the screen.
 *
 * ── How the two sites become one rule here ────────────────────────────────
 * This port is event-driven and republishes after every change, where the AS3
 * polls every frame. `coupleAudioChange` carries the *change-time* half (the
 * toggle's writes, and the dragging branch); `reconcileAudioOptions` carries the
 * *idle* half (`:246-254`), which is needed exactly where the AS3's polling
 * would have caught up — at load, against state written under the old model.
 *
 * Applying the change-time rule at `setAudioOption` covers every surface at
 * once, because all four writers converge there. That is the port's equivalent
 * of the AS3 having the rule in both the button and the screen.
 *
 * **A consequence worth knowing:** `SoundManager.handleLoops` gates on `soundOn`
 * explicitly. That gate was added (T83) *because* this port had dropped the
 * AS3's `soundVol == 0 whenever off` invariant. The invariant is now restored,
 * so the gate is belt-and-braces rather than load-bearing. It is kept — a loop
 * silenced two ways is not a defect, and removing it would be an unrelated risk
 * taken for tidiness.
 */
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

/**
 * `ScreenOptions.as:246-254` — the idle reconciliation, as a pure function.
 *
 * On with a zero volume becomes on at **full**; off with any volume becomes off
 * at **zero**. Everything else is left exactly as it is, which is what keeps a
 * stored 0.5 alive across a load (`:150-151`).
 *
 * **This is also the migration.** Under the port's previous independent model,
 * `soundOn: true, soundVol: 0` was reachable and persisted — a silent game with
 * the sound toggle showing "on". Running the AS3's own reconciliation over
 * whatever is in storage resolves it to on-at-full, which is what the original
 * would have done the moment the Options screen rendered. No bespoke migration
 * step, no version flag: the rule that makes the state unreachable is the same
 * rule that repairs it.
 */
export function reconcileAudioOptions(options: AudioOptions): AudioOptions {
  const soundVol = options.soundOn
    ? options.soundVol === 0
      ? 1
      : options.soundVol
    : 0;
  const musicVol = options.musicOn
    ? options.musicVol === 0
      ? 1
      : options.musicVol
    : 0;
  return { ...options, soundVol, musicVol };
}

/**
 * The change-time half: `ButtonToggleSound.as:43-52` and
 * `ScreenOptions.as:235-244`.
 *
 * Takes the current options and a partial change, and returns the change with
 * the coupled field filled in:
 *
 * - a change to `soundOn` sets `soundVol` to 1 (on) or 0 (off) — the toggle's
 *   own writes, which the AS3 does with no slider present
 * - a change to `soundVol` sets `soundOn` to `vol !== 0` — the dragging branch
 *
 * A change carrying *both* is left alone: the caller has already said what it
 * wants both fields to be, and overriding it would make the two orderings
 * disagree. Nothing in the port emits that today; it is defined rather than
 * left to fall out of the branch order.
 */
export function coupleAudioChange(
  change: Partial<AudioOptions>,
): Partial<AudioOptions> {
  const coupled: Partial<AudioOptions> = { ...change };

  if (change.soundOn !== undefined && change.soundVol === undefined) {
    coupled.soundVol = change.soundOn ? 1 : 0;
  } else if (change.soundVol !== undefined && change.soundOn === undefined) {
    coupled.soundOn = clamp01(change.soundVol) !== 0;
  }

  if (change.musicOn !== undefined && change.musicVol === undefined) {
    coupled.musicVol = change.musicOn ? 1 : 0;
  } else if (change.musicVol !== undefined && change.musicOn === undefined) {
    coupled.musicOn = clamp01(change.musicVol) !== 0;
  }

  return coupled;
}

export function readAudioOptions(store: SaveStore): AudioOptions {
  // Reconciled on the way out, so state written under the old independent model
  // cannot surface as on-but-silent. See `reconcileAudioOptions`.
  return reconcileAudioOptions({
    soundOn: store.get<boolean>(SOUND_ON_KEY, DEFAULT_AUDIO_OPTIONS.soundOn),
    musicOn: store.get<boolean>(MUSIC_ON_KEY, DEFAULT_AUDIO_OPTIONS.musicOn),
    soundVol: clamp01(store.get<number>(SOUND_VOL_KEY, DEFAULT_AUDIO_OPTIONS.soundVol)),
    musicVol: clamp01(store.get<number>(MUSIC_VOL_KEY, DEFAULT_AUDIO_OPTIONS.musicVol)),
  });
}

export function writeAudioOptions(store: SaveStore, options: AudioOptions): void {
  store.set(SOUND_ON_KEY, options.soundOn);
  store.set(MUSIC_ON_KEY, options.musicOn);
  store.set(SOUND_VOL_KEY, clamp01(options.soundVol));
  store.set(MUSIC_VOL_KEY, clamp01(options.musicVol));
  store.flush();
}

/**
 * Copies options onto the manager.
 *
 * The manager's fields are the AS3 statics, so this is the whole of "applying"
 * a preference — `handleMusicChange` tears music down when `musicOn` is false
 * and `applyVolumes` scales what remains, both per frame.
 */
export function applyAudioOptions(manager: SoundManager, options: AudioOptions): void {
  manager.soundOn = options.soundOn;
  manager.musicOn = options.musicOn;
  manager.soundVol = clamp01(options.soundVol);
  manager.musicVol = clamp01(options.musicVol);
}

export function currentAudioOptions(manager: SoundManager): AudioOptions {
  return {
    soundOn: manager.soundOn,
    musicOn: manager.musicOn,
    soundVol: manager.soundVol,
    musicVol: manager.musicVol,
  };
}

/**
 * Deliberately no store-opening helper here any more.
 *
 * This used to return its own `SaveStore(OPTIONS_STORE, …)`. That was safe only
 * while audio was the sole occupant of the options SharedObject; difficulty now
 * shares it, and `SaveStore` caches at construction and flushes the whole
 * object, so a private handle would drop the other's keys. See
 * `save/optionsStore.ts` for the shared handle and the failure it prevents.
 */
