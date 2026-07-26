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
import { SoundManager } from './SoundManager';
import { PhaserAudioBackend } from './PhaserAudioBackend';

export const SOUND_REGISTRY_KEY = 'soundManager';

interface Installed {
  manager: SoundManager;
  backend: PhaserAudioBackend;
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

  const installed: Installed = { manager, backend, dispose };
  scene.game.registry.set(SOUND_REGISTRY_KEY, installed);
  return installed;
}

/** Null before the Preload scene has run. */
export function getSoundManager(scene: Phaser.Scene): SoundManager | null {
  const installed = scene.game.registry.get(SOUND_REGISTRY_KEY) as Installed | undefined;
  return installed?.manager ?? null;
}
