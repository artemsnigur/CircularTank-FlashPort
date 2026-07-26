/**
 * The `ScreenEnemies` slice of the save format — the last single field, `kea`.
 *
 * Stores display names comma-separated. Three of them contain a space
 * ("Scared Ghost", "Damage Addict", "Grappling Hook"), which the format
 * tolerates because it splits on commas only.
 */

import { shortStringToStringArray, stringArrayToShortString } from '../save/saveCodec';
import { readField } from '../save/saveString';
import type { SaveField } from '../save/saveString';
import { BESTIARY } from './bestiaryData';
import { createInitialKnownEnemies } from './enemyKnowledge';

export const KNOWN_ENEMIES_KEY = 'kea';

const VALID_DISPLAY_NAMES = new Set(BESTIARY.map((e) => e.displayName));

export function encodeEnemyKnowledgeFields(known: readonly string[]): SaveField[] {
  return [{ key: KNOWN_ENEMIES_KEY, value: stringArrayToShortString(known) }];
}

/**
 * Reads the slice back, discarding names that are not in the bestiary.
 *
 * Worth doing: an unknown name would render as a blank bestiary row rather than
 * failing loudly, and the list is also the source for "how many types have you
 * met" counters.
 */
export function decodeEnemyKnowledgeFields(fields: readonly SaveField[]): string[] {
  const raw = readField(fields, KNOWN_ENEMIES_KEY);
  if (raw === undefined) return createInitialKnownEnemies();

  const names = shortStringToStringArray(raw).filter((name) => VALID_DISPLAY_NAMES.has(name));
  // An empty or fully-invalid list still leaves Basic known, as the AS3
  // initialiser does — the bestiary screen assumes at least one entry.
  return names.length > 0 ? names : createInitialKnownEnemies();
}
