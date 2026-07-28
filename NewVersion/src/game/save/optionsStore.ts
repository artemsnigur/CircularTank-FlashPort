/**
 * The one shared handle on the options SharedObject.
 *
 * ── Why a shared handle, not one per caller ───────────────────────────────
 * `SaveStore` loads its data **once, in the constructor**, and `flush()` writes
 * `JSON.stringify(this.data)` — the whole object, not a patch. So two handles
 * over the same store are not two views of one thing; they are two divergent
 * copies, and whichever flushes last wins.
 *
 * Concretely, with audio and difficulty each opening their own: pick Hard, then
 * toggle sound. Audio's handle was constructed before the difficulty key
 * existed, so its flush writes an object without it and the difficulty silently
 * reverts to Easy. Nothing errors, and it only shows up in the order
 * pick-then-toggle.
 *
 * The AS3 has no such hazard because `SharedObject.getLocal` returns the same
 * object to every caller. This is the equivalent.
 *
 * ── In the registry, not a module singleton ───────────────────────────────
 * Same reasoning as `ViewportController` and `PlayerProfile`: a module-level
 * singleton survives React StrictMode's create/destroy cycle and would leak one
 * game's cached options into the next. The registry is per-`Phaser.Game`, which
 * is the right lifetime.
 */

import type Phaser from 'phaser';
import { LocalStorageBackend, OPTIONS_STORE, SaveStore } from './SaveStore';

export const OPTIONS_STORE_REGISTRY_KEY = 'optionsStore';

/** The options store for this game instance, opened on first use. */
export function getOptionsStore(scene: Phaser.Scene): SaveStore {
  const existing = scene.game.registry.get(OPTIONS_STORE_REGISTRY_KEY) as SaveStore | undefined;
  if (existing) return existing;

  const store = new SaveStore(OPTIONS_STORE, new LocalStorageBackend());
  scene.game.registry.set(OPTIONS_STORE_REGISTRY_KEY, store);
  return store;
}
