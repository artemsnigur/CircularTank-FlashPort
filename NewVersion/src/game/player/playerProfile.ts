/**
 * The live player profile — upgrades, loadout, progress — and its persistence.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * A reachability sweep found 22 ported, tested modules that nothing ever
 * called: the whole save layer, the loadout model, level progress,
 * achievements, the tutorial. They were correct and inert. `GameplayScene`
 * meanwhile built a throwaway `createInitialUpgradeState()` on every restart
 * and hardcoded which weapons the player owned.
 *
 * This module is the missing link. It holds one `SaveSlotData` — the same
 * structure `saveSlot.ts` encodes — for the running session, so gameplay reads
 * the player's real upgrades and loadout instead of inventing them.
 *
 * ── One slot, for now ─────────────────────────────────────────────────────
 * The AS3 has three save slots plus a slot-select screen. Nothing selects a
 * slot yet, so this pins slot 1. `saveSlot.ts` already handles all three; when
 * the select screen lands it passes a different index and nothing else changes.
 *
 * ── Held in the game registry, not a module singleton ─────────────────────
 * Same reasoning as `ViewportController`: a module-level singleton would
 * survive React StrictMode's create/destroy cycle and leak one game's profile
 * into the next. The registry is per-`Phaser.Game`, which is the right
 * lifetime.
 */

import type Phaser from 'phaser';
import { LocalStorageBackend, SaveStore, saveSlotStoreName } from '../save/SaveStore';
import { createInitialSaveSlot, readSaveSlot, writeSaveSlot } from '../save/saveSlot';
import { EMPTY_SAVE_STRING } from '../save/saveString';
import type { SaveSlotData } from '../save/saveSlot';
import type { UpgradeState } from '../upgrades/upgradeState';
import type { LoadoutState } from '../loadout/loadout';
import { recordLevelResult } from '../levels/levelProgress';
import type { ProgressTable } from '../levels/levelProgress';
import type { Difficulty } from '../config/constants';

export const PROFILE_REGISTRY_KEY = 'playerProfile';

/** Only slot 1 is reachable until a slot-select screen exists. */
export const ACTIVE_SLOT = 1;

/** Key the encoded save string lives under inside the slot's store. */
export const SAVE_STRING_KEY = 'saveString';

export class PlayerProfile {
  private readonly store: SaveStore;
  private data: SaveSlotData;

  constructor(store: SaveStore) {
    this.store = store;
    this.data = PlayerProfile.load(store);
  }

  /**
   * Reads the slot, falling back to a fresh profile.
   *
   * A decode failure must not stop the game booting — the same reasoning
   * `SaveStore.load` uses for corrupt JSON. Losing one save is bad; refusing
   * to start is worse.
   */
  private static load(store: SaveStore): SaveSlotData {
    const saveString = store.get<string>(SAVE_STRING_KEY, '');
    if (!saveString) return createInitialSaveSlot();

    try {
      return readSaveSlot(saveString, ACTIVE_SLOT);
    } catch (error) {
      console.warn('[PlayerProfile] Save slot could not be decoded; starting fresh.', error);
      return createInitialSaveSlot();
    }
  }

  get upgrades(): UpgradeState {
    return this.data.upgrades;
  }

  get loadout(): LoadoutState {
    return this.data.loadout;
  }

  get slot(): SaveSlotData {
    return this.data;
  }

  /** Replaces the upgrade state — money spent, a level bought. */
  setUpgrades(upgrades: UpgradeState): void {
    this.data = { ...this.data, upgrades };
  }

  setLoadout(loadout: LoadoutState): void {
    this.data = { ...this.data, loadout };
  }

  get progress(): ProgressTable {
    return this.data.levelSelect.progress;
  }

  /**
   * Records a level result and remembers where the player was.
   *
   * `recordLevelResult` only ever raises a slot, so replaying a level on an
   * easier difficulty cannot erase a better score.
   */
  recordLevel(
    world: number,
    level: number,
    difficulty: Difficulty,
    value: number,
    won: boolean,
  ): void {
    this.data = {
      ...this.data,
      levelSelect: {
        ...this.data.levelSelect,
        progress: recordLevelResult(
          this.data.levelSelect.progress,
          world,
          level,
          difficulty,
          value,
        ),
        previousWorld: world,
        previousLevel: level,
        previousLevelWon: won,
      },
    };
  }

  /**
   * Encodes and persists the profile.
   *
   * Deliberately explicit rather than automatic on every mutation: the AS3
   * writes the save at defined moments (level end, a purchase), and writing on
   * every field change would encode the whole slot dozens of times a second.
   */
  save(now?: Date): void {
    try {
      // `writeSlot` *edits* a save string — it looks for the slot's
      // parentheses and returns the input untouched when there are none. An
      // empty string therefore silently saves nothing, so a first save has to
      // start from the `()()()` skeleton rather than from ''.
      const previous = this.store.get<string>(SAVE_STRING_KEY, '') || EMPTY_SAVE_STRING;
      const next = writeSaveSlot(previous, ACTIVE_SLOT, this.data, { now });
      this.store.set(SAVE_STRING_KEY, next);
      this.store.flush();
    } catch (error) {
      // A full quota or a failed encode must not take gameplay down.
      console.warn('[PlayerProfile] Save failed; progress kept in memory.', error);
    }
  }
}

/** Builds a profile backed by real storage. */
export function createPlayerProfile(): PlayerProfile {
  return new PlayerProfile(
    new SaveStore(saveSlotStoreName(ACTIVE_SLOT), new LocalStorageBackend()),
  );
}

/**
 * The profile for this game instance, created on first use.
 *
 * Scenes call this rather than constructing their own, so every scene sees the
 * same upgrades and loadout.
 */
export function getPlayerProfile(scene: Phaser.Scene): PlayerProfile {
  const existing = scene.game.registry.get(PROFILE_REGISTRY_KEY) as
    | PlayerProfile
    | undefined;
  if (existing) return existing;

  const profile = createPlayerProfile();
  scene.game.registry.set(PROFILE_REGISTRY_KEY, profile);
  return profile;
}
