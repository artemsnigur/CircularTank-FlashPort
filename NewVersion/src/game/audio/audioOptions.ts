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
 * ── OPEN AND UNDECIDED: the slider ↔ toggle coupling (`ScreenOptions.as:233-278`)
 *
 * In the AS3 these four fields are **not** independent. Each slider and its
 * on/off button are one control, reconciled every frame:
 *
 *   `:235-244`  while dragging: `soundOn = (sliderValue != 0)`
 *   `:246-249`  not dragging, `vol == 0` and on  -> slider jumps to **1**
 *   `:251-254`  not dragging, `vol > 0` and off  -> slider forced to **0**
 *
 * So the original has no "muted but volume remembered" state at all: turning
 * sound off zeroes the volume, and turning it back on restores it to *full*,
 * not to what the player had chosen.
 *
 * **This port keeps them independent, and that is the shipped behaviour** — the
 * toggle changes `soundOn` and leaves the volume alone. Adopting `:251-254`
 * would discard a chosen volume on every mute, and it would do so from the HUD
 * and the main menu, where `AudioToggles` renders but no slider is visible. The
 * original always reconciled with the slider on screen.
 *
 * That is a behaviour decision about a control that already ships and persists,
 * so it is **not being made here**. See `docs/HANDOFF.md` §5.
 *
 * One thing the coupling *did* provide has been replaced explicitly rather than
 * left to chance: it guaranteed `soundVol == 0` whenever sound was off, which is
 * why the AS3 never gates a loop on `soundOn`. `SoundManager.handleLoops` now
 * applies that gate itself — see the comment there.
 */
const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export function readAudioOptions(store: SaveStore): AudioOptions {
  return {
    soundOn: store.get<boolean>(SOUND_ON_KEY, DEFAULT_AUDIO_OPTIONS.soundOn),
    musicOn: store.get<boolean>(MUSIC_ON_KEY, DEFAULT_AUDIO_OPTIONS.musicOn),
    soundVol: clamp01(store.get<number>(SOUND_VOL_KEY, DEFAULT_AUDIO_OPTIONS.soundVol)),
    musicVol: clamp01(store.get<number>(MUSIC_VOL_KEY, DEFAULT_AUDIO_OPTIONS.musicVol)),
  };
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
