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
import { SoundManager } from './SoundManager';
import { PhaserAudioBackend } from './PhaserAudioBackend';
import {
  applyAudioOptions,
  currentAudioOptions,
  readAudioOptions,
  writeAudioOptions,
} from './audioOptions';
import { getOptionsStore } from '../save/optionsStore';

export const SOUND_REGISTRY_KEY = 'soundManager';

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

  const dispose = (): void => {
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
  change: { soundOn?: boolean; musicOn?: boolean },
): void {
  const installed = scene.game.registry.get(SOUND_REGISTRY_KEY) as Installed | undefined;
  if (!installed) return;

  if (change.soundOn !== undefined) installed.manager.soundOn = change.soundOn;
  if (change.musicOn !== undefined) installed.manager.musicOn = change.musicOn;

  installed.saveOptions();
  publishAudioOptions(scene);
}

/** Pushes the current preferences to React. */
export function publishAudioOptions(scene: Phaser.Scene): void {
  const manager = getSoundManager(scene);
  if (!manager) return;
  GameEvents.emit('audio:options', {
    soundOn: manager.soundOn,
    musicOn: manager.musicOn,
  });
}
