/**
 * Wires the ported `SoundManager` into the running game.
 *
 * The AS3 SoundManager is a persistent display object driven by ENTER_FRAME,
 * so it ticks once per frame regardless of which screen is showing. The
 * equivalent here is `Phaser.Core.Events.PRE_STEP` on the Game, which fires
 * once per frame independently of scene lifecycle — a scene-level `update()`
 * would stop ticking during transitions and strand a fading loop at whatever
 * volume it happened to be at.
 *
 * Stored on the game registry rather than a module singleton, matching
 * ViewportController: nothing must outlive a `game.destroy()`.
 */
import Phaser from 'phaser';
import { GameEvents } from '../events/GameEvents';
import type { GameEventMap } from '../events/GameEvents';
import { SoundManager } from './SoundManager';
import { PhaserAudioBackend } from './PhaserAudioBackend';
import {
  applyAudioOptions,
  coupleAudioChange,
  currentAudioOptions,
  readAudioOptions,
  writeAudioOptions,
} from './audioOptions';
import { getOptionsStore } from '../save/optionsStore';
import { installAudioUnlock } from './audioUnlock';
import type { ResumableContext } from './audioUnlock';

const SOUND_REGISTRY_KEY = 'soundManager';

interface Installed {
  manager: SoundManager;
  backend: PhaserAudioBackend;
  /** Persists whatever the manager currently holds. */
  saveOptions: () => void;
  dispose: () => void;
}

/**
 * Creates the manager and starts ticking it. Call once, from the first scene
 * that has finished preloading.
 */
export function installSoundManager(scene: Phaser.Scene): Installed {
  const existing = scene.game.registry.get(SOUND_REGISTRY_KEY) as Installed | undefined;
  if (existing) return existing;

  const backend = new PhaserAudioBackend(scene);
  const manager = new SoundManager({ backend });

  // Preferences load before the first tick, so a muted player never hears a
  // frame of audio they turned off. `SaveManager.as:860-863` reads these at
  // startup for the same reason.
  const optionsStore = getOptionsStore(scene);
  applyAudioOptions(manager, readAudioOptions(optionsStore));

  const tick = (_time: number, delta: number): void => {
    manager.update(delta);
  };
  scene.game.events.on(Phaser.Core.Events.PRE_STEP, tick);

  // The UI's hover/click sounds arrive here rather than calling `queue`
  // directly, because React holds no `Scene`. One subscriber for all 39
  // controls — see `ui/buttonSounds.ts` for why it is delegated.
  const offUiSound = GameEvents.subscribe('ui:sound', ({ name }) => manager.queue(name));

  /*
   * Keep the Web Audio context running — T238, and see `audioUnlock.ts` for
   * why Phaser's own unlock is not sufficient.
   *
   * The context is read through a thunk because Phaser's manager may not have
   * one (the HTML5 fallback and the no-audio stub both lack it), and because
   * it can be replaced.
   */
  const offUnlock = installAudioUnlock(() => {
    const sound = scene.game.sound as { context?: ResumableContext };
    return sound.context ?? null;
  });

  const dispose = (): void => {
    offUnlock();
    offUiSound();
    scene.game.events.off(Phaser.Core.Events.PRE_STEP, tick);
    backend.destroy();
    scene.game.registry.remove(SOUND_REGISTRY_KEY);
  };

  scene.game.events.once(Phaser.Core.Events.DESTROY, dispose);

  const saveOptions = (): void => {
    writeAudioOptions(optionsStore, currentAudioOptions(manager));
  };

  const installed: Installed = { manager, backend, saveOptions, dispose };
  scene.game.registry.set(SOUND_REGISTRY_KEY, installed);
  return installed;
}

/** Null before the Preload scene has run. */
export function getSoundManager(scene: Phaser.Scene): SoundManager | null {
  const installed = scene.game.registry.get(SOUND_REGISTRY_KEY) as Installed | undefined;
  return installed?.manager ?? null;
}

/**
 * Applies an audio preference, persists it, and republishes the new state.
 *
 * All three in one call deliberately: a toggle that changes the manager but
 * does not persist looks fixed until reload, and one that persists without
 * republishing leaves the UI showing the old value. Both are the kind of
 * partial wiring this project keeps finding.
 */
export function setAudioOption(
  scene: Phaser.Scene,
  // Taken from the event map rather than restated, so adding a field to
  // `ui:set-audio` is a compile error here instead of a silently ignored key.
  change: GameEventMap['ui:set-audio'],
): void {
  const installed = scene.game.registry.get(SOUND_REGISTRY_KEY) as Installed | undefined;
  if (!installed) return;

  // The slider and its toggle are **one control** — `ButtonToggleSound.as:43-52`
  // (toggle, no slider on screen) and `ScreenOptions.as:235-244` (dragging).
  // Applied here rather than at each surface because all four writers converge
  // on this function: the HUD toggles, the main menu's, the Options screen's and
  // the volume sliders. Putting it at one of them would couple one surface and
  // leave the others independent, which is the state this replaced.
  const coupled = coupleAudioChange(change);

  if (coupled.soundOn !== undefined) installed.manager.soundOn = coupled.soundOn;
  if (coupled.musicOn !== undefined) installed.manager.musicOn = coupled.musicOn;
  // Clamped here rather than trusted from the caller — `SliderObject.as:46-55`
  // clamps at the control, but this is a bus event and anything can emit it.
  if (coupled.soundVol !== undefined) installed.manager.soundVol = clamp01(coupled.soundVol);
  if (coupled.musicVol !== undefined) installed.manager.musicVol = clamp01(coupled.musicVol);

  installed.saveOptions();
  publishAudioOptions(scene);
}

const clamp01 = (value: number): number => {
  // NaN would sail through Math.max/min and poison every later multiplication,
  // so it is mapped to 0 rather than propagated.
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
};

/** Pushes the current preferences to React. */
export function publishAudioOptions(scene: Phaser.Scene): void {
  const manager = getSoundManager(scene);
  if (!manager) return;
  GameEvents.emit('audio:options', {
    soundOn: manager.soundOn,
    musicOn: manager.musicOn,
    soundVol: manager.soundVol,
    musicVol: manager.musicVol,
  });
}
