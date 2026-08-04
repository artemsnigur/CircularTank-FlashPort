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
import { nextLevelAfter, recordLevelResult } from '../levels/levelProgress';
import { discoverEnemies } from '../enemies/enemyKnowledge';
import { updateAchievements } from '../achievements/achievementState';
import type { AchievementValueSource } from '../achievements/achievementState';
import type { AchievementSaveData } from '../achievements/achievementSave';
import { isHintDone, markHintDone } from '../onboarding/mainFlags';
import type { MainFlags, UiHintId } from '../onboarding/mainFlags';
import type { TutorialState } from '../tutorial/tutorialState';
import type { ProgressTable } from '../levels/levelProgress';
import type { Difficulty } from '../config/constants';

export const PROFILE_REGISTRY_KEY = 'playerProfile';

/** Only slot 1 is reachable until a slot-select screen exists. */
/**
 * The slot used when none is chosen.
 *
 * No longer pinned: `PlayerProfile` carries its own slot and writes at that
 * index, so **store N holds its data at slot N** rather than every store
 * holding it at slot 1. That mattered the moment a screen started reading other
 * slots — summarising store 2 at index 1 would have shown "empty" for a save
 * that exists, which is the "offers slot 2, loads slot 1" failure one step
 * removed.
 *
 * It stays as the default because nothing selects a slot yet.
 */
export const ACTIVE_SLOT = 1;

/** Key the encoded save string lives under inside the slot's store. */
export const SAVE_STRING_KEY = 'saveString';

export class PlayerProfile {
  private readonly store: SaveStore;
  private data: SaveSlotData;

  /**
   * Which of the three save slots this profile occupies.
   *
   * Deliberately **not** `slot`: that name is already taken by the getter
   * returning this profile's `SaveSlotData`. Two different things called `slot`
   * on one class is how the last collision of this kind went wrong.
   */
  readonly slotNumber: number;

  constructor(store: SaveStore, slotNumber: number = ACTIVE_SLOT) {
    this.store = store;
    this.slotNumber = slotNumber;
    this.data = PlayerProfile.load(store, slotNumber);
  }

  /**
   * Reads the slot, falling back to a fresh profile.
   *
   * A decode failure must not stop the game booting — the same reasoning
   * `SaveStore.load` uses for corrupt JSON. Losing one save is bad; refusing
   * to start is worse.
   */
  private static load(store: SaveStore, slot: number): SaveSlotData {
    const saveString = store.get<string>(SAVE_STRING_KEY, '');
    if (!saveString) return createInitialSaveSlot();

    try {
      return readSaveSlot(saveString, slot);
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

  get achievements(): AchievementSaveData {
    return this.data.achievements;
  }

  /**
   * Banks a level's kills and takings into the running totals, then evaluates.
   *
   * ── Level end, not per kill ───────────────────────────────────────────────
   * `PartGameArea.moveTempVariablesWhenCompleted` (`:216-219`) adds the level's
   * accumulators once, when it finishes. Incrementing per kill would look
   * equivalent and is not: a level abandoned partway would keep its kills, and
   * the Kills achievements would count runs the player walked out of.
   *
   * Returns the ids newly earned, for the reveal pages.
   */
  recordAchievements(
    totalsDelta: { enemyKills: number; moneyEarned: number },
    getValue: AchievementValueSource,
    difficulty: Difficulty,
  ): string[] {
    const totals = {
      enemyKills: this.data.achievements.totals.enemyKills + totalsDelta.enemyKills,
      moneyEarned: this.data.achievements.totals.moneyEarned + totalsDelta.moneyEarned,
    };

    const result = updateAchievements(this.data.achievements.states, getValue, difficulty);
    this.data = { ...this.data, achievements: { states: result.states, totals } };
    return result.newlyEarned;
  }

  get mainFlags(): MainFlags {
    return this.data.mainFlags;
  }

  get tutorial(): TutorialState {
    return this.data.tutorial;
  }

  /**
   * Records a one-shot UI hint as seen — `Main.h<Name> = true`.
   *
   * Returns whether anything changed, so a caller can skip the save when the
   * hint was already done. The AS3 calls `SaveManager.saveOtherHelpers()` on
   * every press regardless (`ButtonGameDifficulty.as:42`); writing only on a
   * change is the same end state without re-encoding the slot for nothing.
   */
  markUiHint(id: UiHintId): boolean {
    if (isHintDone(this.data.mainFlags, id)) return false;
    this.data = { ...this.data, mainFlags: markHintDone(this.data.mainFlags, id) };
    return true;
  }

  /**
   * Records a level result and remembers where the player was.
   *
   * `recordLevelResult` only ever raises a slot, so replaying a level on an
   * easier difficulty cannot erase a better score.
   *
   * ── Bestiary discovery rides along here ───────────────────────────────
   * `ScreenStatus.as:411-423` calls `ScreenEnemies.updateEnemies` from the
   * post-level screen, and three details of that are easy to get wrong:
   *
   *   - it is gated on `ScreenGame.hp > 0`, so **only a win discovers**;
   *   - it reads the level *table*, not the enemies that were spawned;
   *   - it looks at the **next** level, not the one just played.
   *
   * So this is a preview of what is coming, granted as a reward for winning —
   * not a record of what was fought. Wiring it to enemy spawns would produce a
   * working call with the wrong meaning, which is the failure mode this
   * codebase keeps hitting.
   *
   * Returns the display names newly discovered, for a caller that wants to
   * announce them. Nothing shows them yet: the AS3 renders them as reveal
   * pages interleaved with achievements, which needs `ScreenStatus`.
   */
  recordLevel(
    world: number,
    level: number,
    difficulty: Difficulty,
    value: number,
    won: boolean,
  ): string[] {
    // Dev levels sit in sentinel world 0, where `nextLevelAfter` is null — so
    // a sandbox run cannot teach the bestiary anything, same as it cannot
    // record progress.
    const upcoming = won ? nextLevelAfter(world, level) : null;
    const discovery = upcoming
      ? discoverEnemies(this.data.knownEnemies, upcoming.world, upcoming.level)
      : null;

    this.data = {
      ...this.data,
      knownEnemies: discovery ? discovery.known : this.data.knownEnemies,
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

    return discovery ? discovery.newlyDiscovered : [];
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
      const next = writeSaveSlot(previous, this.slotNumber, this.data, { now });
      this.store.set(SAVE_STRING_KEY, next);
      this.store.flush();
    } catch (error) {
      // A full quota or a failed encode must not take gameplay down.
      console.warn('[PlayerProfile] Save failed; progress kept in memory.', error);
    }
  }
}

/** Builds a profile backed by real storage. */
export function createPlayerProfile(slot: number = ACTIVE_SLOT): PlayerProfile {
  return new PlayerProfile(
    new SaveStore(saveSlotStoreName(slot), new LocalStorageBackend()),
    slot,
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
