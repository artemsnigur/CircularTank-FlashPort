/**
 * The shop window's damage-type line — `ScreenUpgrades.handleDamageTypeUI`
 * (`:1767-1853`).
 *
 * The AS3 prints this in red (`16711680`, `:584`) under the selected upgrade's
 * name, with a matching icon frame beside it. It is a **lookup, not a
 * derivation**: the source is a flat chain of `selectedWeapon == N` tests, so
 * this is that chain transcribed rather than anything inferred from the
 * weapon's bullet class.
 *
 * That distinction is the reason this file exists instead of a call into
 * `damageTypes.ts`. `BULLET_DAMAGE_TYPES` maps a *bullet class* to a damage
 * type, which is a different key: reaching it would need a weapon → bullet
 * mapping that the port does not have, and inventing one to feed a label would
 * be guessing at a table the source states outright.
 *
 * ── The indices are 1-based, and that is the AS3's ────────────────────────
 * `selectedWeapon` / `selectedSecondary` are 1-based (`:192`, `:746` treat 0 as
 * "nothing selected"). `UpgradeSpec.index` is 0-based, so callers pass
 * `index + 1`. Getting this off by one silently mislabels every weapon — each
 * would show its neighbour's damage type, which looks plausible on every row.
 */

/** Categories as `ShopCatalogue` spells them, against the AS3's `upgradeType`. */
export type UpgradeCategory = 'primary' | 'secondary' | 'misc';

/**
 * `:1771` — every misc upgrade is `"No Damage"`, with no per-index branch.
 * Speed, reflect, absorb and kill-reload do not deal damage, so the AS3 does
 * not test which one is selected.
 */
const MISC_LABEL = 'No Damage';

/** `:1779-1812` — `upgradeType == 2`, keyed by `selectedWeapon`. */
const PRIMARY: Readonly<Record<number, string>> = {
  1: 'Explosion Damage',
  2: 'Bullet Damage',
  3: 'Explosion Damage',
  4: 'Fire/Lava Damage',
  5: 'Bullet Damage',
  6: 'Explosion Damage',
  7: 'Food Damage',
  8: 'Poison Damage',
  9: 'Laser Damage',
  10: 'Food Damage',
  11: 'Explosion Damage',
  12: 'Magic Damage',
};

/** `:1814-1851` — `upgradeType == 3`, keyed by `selectedSecondary`. */
const SECONDARY: Readonly<Record<number, string>> = {
  1: 'Explosion Damage',
  2: 'Explosion Damage',
  3: 'Ice Damage',
  4: 'Poison Damage',
  5: 'Ice Damage',
  6: 'Poison Damage',
  7: 'No Damage',
  8: 'Explosion Damage',
  9: 'Ice Damage',
  10: 'Fire/Lava Damage',
  11: 'Food Damage',
  12: 'Magic Damage',
};

/**
 * The label for one upgrade, or `null` when the source prints nothing.
 *
 * **`null` is a real answer, not a fallback.** The AS3's chains have no `else`,
 * so an index outside its category's range leaves `damageTypeText` holding
 * whatever the *previous* selection put there. Returning `null` and rendering
 * nothing is the port's reading of that — see `A29`; the alternative would be
 * to reproduce a stale-text bug.
 *
 * @param category which chain to read — the AS3's `upgradeType`
 * @param oneBasedIndex `UpgradeSpec.index + 1`
 */
export function damageTypeLabel(category: string, oneBasedIndex: number): string | null {
  if (category === 'misc') return MISC_LABEL;
  if (category === 'primary') return PRIMARY[oneBasedIndex] ?? null;
  if (category === 'secondary') return SECONDARY[oneBasedIndex] ?? null;
  return null;
}
