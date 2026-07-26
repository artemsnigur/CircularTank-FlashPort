/**
 * Port of the shop/upgrade logic in `SWFimported/scripts/ScreenUpgrades.as`.
 *
 * The screen itself (weapon carousel, damage-type UI, tweens) becomes a React
 * screen. What is ported is the economy: what things cost, what the player
 * owns, and what stats a given level yields.
 *
 * ── Level semantics ───────────────────────────────────────────────────────
 *   level 0        not owned. Misc upgrades sit here until bought; weapons are
 *                  locked.
 *   level 1..10    owned, at that upgrade level. 10 is max (`levelsMaxArray*`,
 *                  every entry 10).
 *
 * Cannon and Mine start at level 1 with a `prices[0]` of 0 — they are the free
 * starter weapons, which is why `levelsArray` and `levelsArraySecondary` both
 * begin `[1, 0, 0, ...]`.
 *
 * ── Cost ──────────────────────────────────────────────────────────────────
 * Going from level N to N+1 costs `prices[N]`. Both AS3 purchase paths
 * (`ButtonBuy` for the 0->1 unlock, `ButtonUpgrade` for 1->10) deduct
 * `prices[currentLevel]` and then increment. ButtonBuy hardcodes `prices[0]`
 * in its affordability check, which is correct precisely because it only ever
 * handles the unlock.
 */

import {
  ALL_UPGRADES,
  MAX_UPGRADE_LEVEL,
  MISC_UPGRADES,
  PRIMARY_UPGRADES,
  SECONDARY_UPGRADES,
  UPGRADES_BY_CATEGORY,
} from './upgradeData';
import type { UpgradeCategory, UpgradeSpec } from './upgradeData';

/** `ScreenUpgrades.money` plus the three level arrays. */
export interface UpgradeState {
  money: number;
  /** Parallel to PRIMARY_UPGRADES — AS3 `levelsArray`. */
  primary: number[];
  /** Parallel to MISC_UPGRADES — AS3 `levelsArrayMisc`. */
  misc: number[];
  /** Parallel to SECONDARY_UPGRADES — AS3 `levelsArraySecondary`. */
  secondary: number[];
}

/** ScreenUpgrades.as static initialisers. */
export function createInitialUpgradeState(): UpgradeState {
  return {
    money: 0,
    primary: PRIMARY_UPGRADES.map((u) => u.startLevel),
    misc: MISC_UPGRADES.map((u) => u.startLevel),
    secondary: SECONDARY_UPGRADES.map((u) => u.startLevel),
  };
}

function levelsFor(state: UpgradeState, category: UpgradeCategory): number[] {
  return category === 'misc' ? state.misc : category === 'primary' ? state.primary : state.secondary;
}

/** Current level of one upgrade, or 0 when the index is out of range. */
export function getLevel(state: UpgradeState, spec: UpgradeSpec): number {
  return levelsFor(state, spec.category)[spec.index] ?? 0;
}

export function isMaxed(state: UpgradeState, spec: UpgradeSpec): boolean {
  return getLevel(state, spec) >= MAX_UPGRADE_LEVEL;
}

export function isOwned(state: UpgradeState, spec: UpgradeSpec): boolean {
  return getLevel(state, spec) > 0;
}

/**
 * Cost of the next level, or `null` when already maxed.
 *
 * `prices[currentLevel]` — index by the level you are leaving, not the one you
 * are buying.
 */
export function nextLevelCost(state: UpgradeState, spec: UpgradeSpec): number | null {
  const level = getLevel(state, spec);
  if (level >= MAX_UPGRADE_LEVEL) return null;
  return spec.prices[level] ?? null;
}

export function canAfford(state: UpgradeState, spec: UpgradeSpec): boolean {
  const cost = nextLevelCost(state, spec);
  return cost !== null && state.money >= cost;
}

export interface PurchaseResult {
  /** False when maxed or unaffordable; `state` is then returned unchanged. */
  purchased: boolean;
  state: UpgradeState;
  /** Amount deducted. 0 when nothing was bought. */
  spent: number;
}

/**
 * Buys the next level. Covers both AS3 paths — the 0->1 unlock and a 1->10
 * upgrade are the same operation with different starting levels.
 *
 * Unlike the AS3 this refuses to proceed when the player cannot afford it,
 * rather than relying on the caller having checked. The original guards at the
 * call site (`if (this.canAfford)`), so behaviour matches for every legitimate
 * path while removing the chance of a negative balance.
 */
export function purchaseNextLevel(state: UpgradeState, spec: UpgradeSpec): PurchaseResult {
  const cost = nextLevelCost(state, spec);
  if (cost === null || state.money < cost) {
    return { purchased: false, state, spent: 0 };
  }

  const next: UpgradeState = {
    money: state.money - cost,
    primary: [...state.primary],
    misc: [...state.misc],
    secondary: [...state.secondary],
  };
  levelsFor(next, spec.category)[spec.index] = getLevel(state, spec) + 1;

  return { purchased: true, state: next, spent: cost };
}

/**
 * Value of stat track `track` at the upgrade's current level.
 *
 * Handles both indexing conventions (see `statsIncludeLevelZero` in
 * upgradeData.ts). Returns `null` at level 0 for tracks that have no level-0
 * entry, which is the case the AS3 guards for by hand at every call site.
 */
export function getStatValue(
  state: UpgradeState,
  spec: UpgradeSpec,
  track: number,
): number | null {
  const values = spec.stats[track];
  if (!values) return null;

  const level = getLevel(state, spec);
  const index = spec.statsIncludeLevelZero ? level : level - 1;
  if (index < 0 || index >= values.length) return null;
  return values[index];
}

/**
 * `ScreenUpgrades.setTempVar("tempPrimaryWeaponsMaxed")` — how many primary
 * weapons sit at level 10.
 *
 * The AS3 compares `== 10`; this uses `>=` so a future max-level change cannot
 * silently stop counting.
 */
export function countMaxed(state: UpgradeState, category: UpgradeCategory): number {
  return levelsFor(state, category).filter((level) => level >= MAX_UPGRADE_LEVEL).length;
}

/** Value source for the MaxedPrimary1-3 achievements. */
export const countMaxedPrimary = (state: UpgradeState): number => countMaxed(state, 'primary');
/** Value source for the MaxedSecondary1-3 achievements. */
export const countMaxedSecondary = (state: UpgradeState): number => countMaxed(state, 'secondary');

/** How many upgrades in a category the player owns at all. */
export function countOwned(state: UpgradeState, category: UpgradeCategory): number {
  return levelsFor(state, category).filter((level) => level > 0).length;
}

/** Lookup by category and 0-based index. */
export function findUpgrade(
  category: UpgradeCategory,
  index: number,
): UpgradeSpec | undefined {
  return UPGRADES_BY_CATEGORY[category][index];
}

/** Lookup by AS3 table stem, e.g. "Cannon". Ids are unique across categories. */
export function findUpgradeById(id: string): UpgradeSpec | undefined {
  return ALL_UPGRADES.find((u) => u.id === id);
}

/**
 * Total cost of taking everything from its starting level to 10 — the sum
 * `ScreenUpgrades.calculateTotalPrice()` traces to the debug console.
 */
export function totalCostToMaxEverything(): number {
  return ALL_UPGRADES.reduce(
    (sum, spec) => sum + spec.prices.reduce((n, price) => n + price, 0),
    0,
  );
}
