/**
 * Assembles a complete save slot — all 63 fields — from the ported slices.
 *
 * This is the TypeScript equivalent of `SaveManager.updateSaveStringSlot()` and
 * the reading half of `loadVarsFromSaveString()`, minus the AS3's habit of
 * scattering the work across a dozen static classes.
 *
 * ── Field order ───────────────────────────────────────────────────────────
 * Fields are emitted in `SAVE_SLOT_FIELDS` order rather than by concatenating
 * the slices, so the output matches `updateSaveStringSlot` exactly regardless
 * of how the individual encoders happen to order their own output. Any field
 * a slice fails to produce is caught by `assertSlotComplete`.
 *
 * ── The two computed fields ───────────────────────────────────────────────
 * `dt` and `wl` belong to no class; the AS3 computes them at save time from
 * `setDateAndTime()` and `setWorldAndLevel()`. They are supplied here through
 * `SaveSlotContext` so a save is reproducible in a test.
 */

import { SAVE_SLOT_FIELDS } from './saveSchema';
import {
  buildSlotBody,
  parseSlotFields,
  writeSlot,
} from './saveString';
import type { SaveField } from './saveString';
import { formatSaveDateTime } from './saveCodec';

import { decodeUpgradeFields, encodeUpgradeFields } from '../upgrades/upgradeSave';
import { createInitialUpgradeState } from '../upgrades/upgradeState';
import type { UpgradeState } from '../upgrades/upgradeState';

import { decodeLoadoutFields, encodeLoadoutFields } from '../loadout/loadoutSave';
import { createInitialLoadout } from '../loadout/loadout';
import type { LoadoutState } from '../loadout/loadout';

import {
  decodeLevelSelectFields,
  encodeLevelSelectFields,
} from '../levels/levelProgressSave';
import { createInitialLevelSelectData } from '../levels/levelProgressSave';
import type { LevelSelectSaveData } from '../levels/levelProgressSave';
import { formatWorldAndLevel } from '../levels/levelProgress';

import {
  decodeEnemyKnowledgeFields,
  encodeEnemyKnowledgeFields,
} from '../enemies/enemyKnowledgeSave';
import { createInitialKnownEnemies } from '../enemies/enemyKnowledge';

import {
  decodeAchievementFields,
  encodeAchievementFields,
} from '../achievements/achievementSave';
import type { AchievementSaveData } from '../achievements/achievementSave';
import { createInitialStates } from '../achievements/achievementState';

import { decodeTutorialFields, encodeTutorialFields } from '../tutorial/tutorialSave';
import { createInitialTutorialState } from '../tutorial/tutorialState';
import type { TutorialState } from '../tutorial/tutorialState';

import { decodeMainFlagFields, encodeMainFlagFields } from '../onboarding/mainFlagsSave';
import { createInitialMainFlags } from '../onboarding/mainFlags';
import type { MainFlags } from '../onboarding/mainFlags';

export const DATE_TIME_KEY = 'dt';
export const WORLD_AND_LEVEL_KEY = 'wl';

/** Everything one save slot holds. */
export interface SaveSlotData {
  upgrades: UpgradeState;
  loadout: LoadoutState;
  levelSelect: LevelSelectSaveData;
  knownEnemies: string[];
  achievements: AchievementSaveData;
  tutorial: TutorialState;
  mainFlags: MainFlags;
}

/** Inputs the two computed fields need. */
export interface SaveSlotContext {
  /** Injectable so a save is reproducible; defaults to now. */
  now?: Date;
  /** `Main.extraStuff` — changes the world count and the completion label. */
  hasPremium?: boolean;
}

export function createInitialSaveSlot(): SaveSlotData {
  return {
    upgrades: createInitialUpgradeState(),
    loadout: createInitialLoadout(),
    levelSelect: createInitialLevelSelectData(),
    knownEnemies: createInitialKnownEnemies(),
    achievements: {
      states: createInitialStates(),
      totals: { enemyKills: 0, moneyEarned: 0 },
    },
    tutorial: createInitialTutorialState(),
    mainFlags: createInitialMainFlags(),
  };
}

/** Worlds a save can reach — Main.as sets 9 with premium, 6 without. */
function worldCount(hasPremium: boolean): number {
  return hasPremium ? 9 : 6;
}

/**
 * Encodes a slot into ordered fields, exactly as `updateSaveStringSlot` writes
 * them.
 */
export function encodeSaveSlot(
  data: SaveSlotData,
  context: SaveSlotContext = {},
): SaveField[] {
  const { now = new Date(), hasPremium = false } = context;

  const produced = new Map<string, string>();
  const add = (fields: readonly SaveField[]): void => {
    for (const field of fields) produced.set(field.key, field.value);
  };

  add(encodeUpgradeFields(data.upgrades));
  add(encodeLoadoutFields(data.loadout));
  add(encodeLevelSelectFields(data.levelSelect));
  add(encodeEnemyKnowledgeFields(data.knownEnemies));
  add(encodeAchievementFields(data.achievements));
  add(encodeTutorialFields(data.tutorial));
  add(encodeMainFlagFields(data.mainFlags));

  produced.set(DATE_TIME_KEY, formatSaveDateTime(now));
  produced.set(
    WORLD_AND_LEVEL_KEY,
    formatWorldAndLevel(data.levelSelect.progress, worldCount(hasPremium), hasPremium),
  );

  // Emit in schema order so the result matches the AS3 byte for byte.
  return SAVE_SLOT_FIELDS.map((spec) => ({
    key: spec.key,
    value: produced.get(spec.key) ?? '',
  }));
}

/** Reads a slot back. Every slice falls back to its own defaults. */
export function decodeSaveSlot(fields: readonly SaveField[]): SaveSlotData {
  return {
    upgrades: decodeUpgradeFields(fields),
    loadout: decodeLoadoutFields(fields),
    levelSelect: decodeLevelSelectFields(fields),
    knownEnemies: decodeEnemyKnowledgeFields(fields),
    achievements: decodeAchievementFields(fields),
    tutorial: decodeTutorialFields(fields),
    mainFlags: decodeMainFlagFields(fields),
  };
}

/** The progress label stored in `wl`, without encoding a whole slot. */
export function readWorldAndLevel(fields: readonly SaveField[]): string | undefined {
  return fields.find((f) => f.key === WORLD_AND_LEVEL_KEY)?.value;
}

/** The timestamp stored in `dt`. */
export function readSaveDateTime(fields: readonly SaveField[]): string | undefined {
  return fields.find((f) => f.key === DATE_TIME_KEY)?.value;
}

/** Writes a slot into a save string, replacing whatever was there. */
export function writeSaveSlot(
  saveString: string,
  slot: number,
  data: SaveSlotData,
  context: SaveSlotContext = {},
): string {
  return writeSlot(saveString, slot, buildSlotBody(encodeSaveSlot(data, context)));
}

/** Reads a slot out of a save string. */
export function readSaveSlot(saveString: string, slot: number): SaveSlotData {
  return decodeSaveSlot(parseSlotFields(saveString, slot));
}

/**
 * Throws when the encoder did not produce every field the schema declares.
 *
 * Exists because a missing field is silent otherwise: it would encode as an
 * empty value and decode to a default, losing the player's data with no error.
 */
export function assertSlotComplete(fields: readonly SaveField[]): void {
  const produced = new Set(fields.map((f) => f.key));
  const missing = SAVE_SLOT_FIELDS.filter((spec) => !produced.has(spec.key)).map((s) => s.key);
  if (missing.length > 0) {
    throw new Error(`Save slot is missing ${missing.length} field(s): ${missing.join(', ')}`);
  }
}
