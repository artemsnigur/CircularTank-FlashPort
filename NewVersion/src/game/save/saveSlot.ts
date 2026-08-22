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
import { buildSlotBody, parseSlotFields, partOfSaveString, writeSlot } from './saveString';
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
import { formatWorldAndLevel, REACHABLE_WORLDS } from '../levels/levelProgress';

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

/**
 * Worlds a save can reach — the whole campaign, `D-5`.
 *
 * `Main.as` sets 9 with premium and 6 without. The port has no premium source,
 * and the redesigned campaign is four worlds and free; see
 * `levelProgress.REACHABLE_WORLDS` for why the split went rather than being
 * rescaled. `hasPremium` is still read from a slot and still pays the one-time
 * money grant (`onboarding/mainFlags.ts`) — it simply no longer gates levels.
 */
function worldCount(): number {
  return REACHABLE_WORLDS;
}

/**
 * Encodes a slot into ordered fields, exactly as `updateSaveStringSlot` writes
 * them.
 */
export function encodeSaveSlot(
  data: SaveSlotData,
  context: SaveSlotContext = {},
): SaveField[] {
  // `hasPremium` is deliberately not destructured any more: since `D-5` it
  // gates nothing here, and an unused binding is how a dead rule looks alive.
  // It stays on `SaveSlotContext` because the slot format carries the flag and
  // `onboarding/mainFlags.ts` still pays the one-time grant from it.
  const { now = new Date() } = context;

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
    formatWorldAndLevel(data.levelSelect.progress, worldCount()),
  );

  // Emit in schema order so the result matches the AS3 byte for byte.
  const encoded = SAVE_SLOT_FIELDS.map((spec) => ({
    key: spec.key,
    value: produced.get(spec.key) ?? '',
  }));

  // The `?? ''` above is the data-loss path: a slice that produced nothing
  // yields an empty value, which decodes to a default and is gone. The guard
  // was written for exactly this and was never installed here, so the hazard
  // its docstring describes was the live behaviour.
  assertSlotComplete(encoded);
  return encoded;
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
 * Whether a slot has ever been written — `SaveManager.checkIfSlotHasData` (`:56`).
 *
 * The AS3 walks the string counting `(`, and when it reaches the slot's opening
 * parenthesis asks whether the very next character is `)`. An empty slot is
 * exactly `()`; anything else is data. Reproduced through `partOfSaveString` so
 * the two share one notion of where a slot starts and ends, rather than a second
 * hand-rolled scanner that could disagree about a malformed string.
 *
 * **Emptiness is structural, not semantic.** A slot holding only default values
 * still counts as having data, because it was written. That matches the AS3 —
 * the check is for a *saved game*, not for progress — and it is what a
 * slot-select screen needs: "slot 2 is in use" rather than "slot 2 is
 * interesting".
 */
export function slotHasData(saveString: string, slot: number): boolean {
  const body = partOfSaveString(saveString, slot);
  // `partOfSaveString` returns '' for a slot that is not there at all, which is
  // the same answer as an empty one for this question.
  return body.length > 2;
}

/**
 * Throws when the encoder did not really produce every field.
 *
 * A missing field is silent otherwise: it encodes as an empty value and decodes
 * to a default, losing the player's data with no error.
 *
 * ── This checked the wrong thing, and could never fire ────────────────────
 * It used to compare *key presence* against the schema. `encodeSaveSlot` builds
 * its result by mapping over `SAVE_SLOT_FIELDS`, so every key is present by
 * construction and the check was vacuous — installing it as written would have
 * been a no-op that looked like a fix. The failure it describes is the
 * `?? ''` fallback in that map firing, i.e. a **value** the slices never
 * supplied.
 *
 * ── Which empties are legitimate is derived, not listed ───────────────────
 * The five `csv` fields hold lists, and an empty list encodes to `''` honestly
 * — `tad` does so on a fresh profile today. Reading that from the schema's own
 * `codec` means a new list field is covered automatically, where a hand-kept
 * allow-list would need remembering. Everything else empty is a bug.
 *
 * Throwing is the safe failure. `PlayerProfile.save` catches and keeps the
 * previous save string, so a bad encode costs the player their most recent
 * progress rather than a field they will never get back.
 */
export function assertSlotComplete(fields: readonly SaveField[]): void {
  const produced = new Map(fields.map((f) => [f.key, f.value]));

  const missing: string[] = [];
  const blank: string[] = [];
  for (const spec of SAVE_SLOT_FIELDS) {
    if (!produced.has(spec.key)) {
      missing.push(spec.key);
      continue;
    }
    // A list may be empty; anything else empty means a slice produced nothing.
    if (spec.codec !== 'csv' && produced.get(spec.key) === '') blank.push(spec.key);
  }

  const problems = [
    missing.length > 0 ? `missing ${missing.length}: ${missing.join(', ')}` : '',
    blank.length > 0 ? `empty ${blank.length}: ${blank.join(', ')}` : '',
  ].filter(Boolean);

  if (problems.length > 0) {
    throw new Error(
      `Save slot would lose data — ${problems.join('; ')}. ` +
        'Refusing to write; the previous save is kept.',
    );
  }
}
