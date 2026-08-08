/**
 * Port of the bestiary-discovery logic in
 * `SWFimported/scripts/ScreenEnemies.as`.
 *
 * The enemies screen itself (buttons, strength/weakness grid, tweens) becomes a
 * React screen. What is ported is `updateEnemies`, which decides which enemy
 * types the player has met and returns the newly-discovered ones so the UI can
 * flag them.
 *
 * ── A naming wrinkle ──────────────────────────────────────────────────────
 * `knownEnemiesArray` stores **display names**, not ids: the AS3 rewrites three
 * of them on the way in —
 *
 *     "ScaredGhost"   -> "Scared Ghost"
 *     "DamageAddict"  -> "Damage Addict"
 *     "GrapplingHook" -> "Grappling Hook"
 *
 * so that they match `enemyButtonModelArray`. That means the *saved* strings
 * contain spaces, and the save field is comma-separated — safe only because no
 * display name contains a comma. Preserved exactly, since changing it would
 * invalidate the `kea` save field.
 */

import { BESTIARY, INITIAL_KNOWN_ENEMIES } from './bestiaryData';
import { ENEMY_STATS } from './enemyStatsData';
import { resistanceBadges } from './resistanceIcons';
import type { ResistanceBadge } from './resistanceIcons';
import { getLevel } from '../levels/levelData';

const DISPLAY_NAME_BY_ID = new Map(BESTIARY.map((e) => [e.id, e.displayName]));
const ID_BY_DISPLAY_NAME = new Map(BESTIARY.map((e) => [e.displayName, e.id]));

/** Enemy id (level-table form) -> display name (stored form). */
export function toDisplayName(id: string): string {
  return DISPLAY_NAME_BY_ID.get(id) ?? id;
}

/** Display name (stored form) -> enemy id. */
export function toEnemyId(displayName: string): string | undefined {
  return ID_BY_DISPLAY_NAME.get(displayName);
}

export function createInitialKnownEnemies(): string[] {
  return [...INITIAL_KNOWN_ENEMIES];
}

export interface DiscoveryResult {
  /** Display names newly added by this call — the AS3 `newEnemiesArray`. */
  newlyDiscovered: string[];
  /** Updated list. A new array; the input is not mutated. */
  known: string[];
}

/**
 * `ScreenEnemies.updateEnemies(world, level)` — records every enemy type
 * appearing in a level and reports which were new.
 *
 * The AS3 reads `worldModels[world * 3 - 3][level - 1]`, walks the
 * name/count pairs, and strips the trailing level character off each name. That
 * decomposition is already done in `levelData.ts`, so this works from
 * `LevelSpec.enemies` instead.
 *
 * Note enemy *level* is deliberately ignored: meeting "Basic2" marks "Basic"
 * known, exactly as the original does.
 */
export function discoverEnemies(
  known: readonly string[],
  world: number,
  level: number,
): DiscoveryResult {
  const spec = getLevel(world, level);
  if (!spec) return { newlyDiscovered: [], known: [...known] };

  const next = [...known];
  const newlyDiscovered: string[] = [];

  for (const enemy of spec.enemies) {
    const displayName = toDisplayName(enemy.type);
    if (next.includes(displayName)) continue;
    next.push(displayName);
    newlyDiscovered.push(displayName);
  }

  return { newlyDiscovered, known: next };
}

/** True when the player has met this enemy. Accepts an id or a display name. */
export function isEnemyKnown(known: readonly string[], idOrDisplayName: string): boolean {
  return known.includes(toDisplayName(idOrDisplayName));
}

/** Bestiary entries the player has unlocked, in screen order. */
export function knownBestiary(known: readonly string[]): typeof BESTIARY {
  return BESTIARY.filter((entry) => known.includes(entry.displayName));
}

/** How many of the 20 types the player has met. */
export function knownCount(known: readonly string[]): number {
  return knownBestiary(known).length;
}

/** One row of the bestiary as the screen renders it. */
export interface BestiaryRow {
  id: string;
  displayName: string;
  /** Absent until met — an unmet entry must not describe itself. */
  description?: string;
  /**
   * Resistance badges — `ScreenEnemies.as:329-451`, one row each.
   *
   * **Empty means unmet, never "resists nothing".** A met enemy with no
   * strengths still carries a single frame-1 "none" badge (`:385-391`), so the
   * screen can tell the two apart from the array alone and needs no second
   * flag to decide whether to draw the row.
   */
  strengths: ResistanceBadge[];
  weaknesses: ResistanceBadge[];
  known: boolean;
}

export interface BestiaryListing {
  entries: BestiaryRow[];
  knownCount: number;
  total: number;
}

/**
 * The full bestiary with each entry marked met or not.
 *
 * `knownBestiary` returns only what is known, which is the wrong shape for a
 * screen that shows unmet entries as silhouettes: filtering them out would make
 * the list grow silently and lose the sense of an incomplete collection.
 *
 * **The withholding happens here, not in the view.** An unmet row carries no
 * description at all, so the string never reaches the browser and no styling
 * mistake can reveal it. `BestiaryScreen` has a test asserting it cannot import
 * the bestiary data itself, which is what makes that guarantee hold.
 */
export function buildBestiaryListing(known: readonly string[]): BestiaryListing {
  return {
    entries: BESTIARY.map((entry) => {
      const met = isEnemyKnown(known, entry.id);
      // Resistances are withheld on exactly the same condition as the
      // description, and for the same reason: what an unmet enemy resists is
      // the substance of what the bestiary is hiding. Sending the badges and
      // letting the component skip them would put the answer in the store,
      // where the screen's own docstring says it must not be.
      //
      // `resistanceBadges` always returns at least one badge — the "none"
      // placeholder at `ScreenEnemies.as:385-391` — so an empty array here
      // means *unknown*, never "has no strengths". The two are different
      // states and the screen renders them differently.
      const stats = met ? ENEMY_STATS[entry.id] : undefined;
      return {
        id: entry.id,
        displayName: entry.displayName,
        ...(met ? { description: entry.description } : {}),
        strengths: stats ? resistanceBadges(stats.strengths, 'strength') : [],
        weaknesses: stats ? resistanceBadges(stats.weaknesses, 'weakness') : [],
        known: met,
      };
    }),
    // Counted through `knownCount` rather than `known.length`: the saved list is
    // free-form text from an older build and may hold a name that is not a
    // bestiary entry, which would push the count past the denominator.
    knownCount: knownCount(known),
    total: BESTIARY.length,
  };
}
