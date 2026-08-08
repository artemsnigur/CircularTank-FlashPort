/**
 * Which badge frame a resistance draws, and what it is called on screen.
 *
 * Ported from three copies of one rule, which is why it lives here as a table
 * rather than as a cascade at each site:
 *
 *   `PartInfoText.as:404-437`   strengths  -> frames 2-9
 *   `PartInfoText.as:456-497`   weaknesses -> frames 10-17
 *   `ScreenEnemies.as:336-374`  the same mapping again, and additionally the
 *                               *labels* (`:339` `"Explosions"`, `:344`
 *                               `"Fire & lava"`, ...) for each icon's tooltip
 *
 * `ScreenStatus.as:725-843` is a fourth copy. All four agree, and the order is
 * the same in every one: Explosions, FireLava, Bullets, Poison, Laser, Ice,
 * Food, Magic. That order **is** the frame numbering, so it is expressed once
 * here and the frames are derived from it rather than being eight more
 * literals to keep in step.
 */
import type { DamageType, Resistance } from './enemyStatsData';

/**
 * The eight damage types in badge-frame order — `PartInfoText.as:407-435`.
 *
 * Not `DamageType`'s own order: that type is alphabetical, and using it here
 * would silently renumber every frame. The two are deliberately different and
 * `resistanceIcons.test.ts` pins this one against the AS3 cascade.
 */
export const ICON_ORDER: readonly DamageType[] = [
  'Explosions',
  'FireLava',
  'Bullets',
  'Poison',
  'Laser',
  'Ice',
  'Food',
  'Magic',
];

/**
 * `ScreenEnemies.as:339-374` — the tooltip label for each icon.
 *
 * Only `FireLava` differs from its key; the rest are the key spelled out. Kept
 * as a full map anyway, because a map with one interesting entry reads as a
 * table and a special-case reads as a bug.
 */
export const DAMAGE_TYPE_LABELS: Readonly<Record<DamageType, string>> = {
  Explosions: 'Explosions',
  FireLava: 'Fire & lava',
  Bullets: 'Bullets',
  Poison: 'Poison',
  Laser: 'Laser',
  Ice: 'Ice',
  Food: 'Food',
  Magic: 'Magic',
};

/**
 * `gotoAndStop(1)` — the empty badge.
 *
 * **This is a rendered state, not the absence of one.** `ScreenEnemies.as:384-391`
 * and `:444-451` add a *single* frame-1 icon when an enemy has no strengths (or
 * no weaknesses) at all, so the row reads as "none" rather than collapsing to
 * nothing. Eleven of the 20 enemy types hit at least one of those branches.
 */
export const NONE_FRAME = 1;

/** Strength badges start at frame 2, weaknesses at frame 10. */
const FIRST_STRENGTH_FRAME = 2;
const FIRST_WEAKNESS_FRAME = 10;

export type ResistanceKind = 'strength' | 'weakness';

/**
 * The `gotoAndStop` argument for one resistance.
 *
 * Throws on an unknown type rather than falling back to frame 1: a silent
 * fallback would render the "none" badge for a resistance that exists, which
 * looks like correct data about a different enemy.
 */
export function iconFrame(damageType: DamageType, kind: ResistanceKind): number {
  const index = ICON_ORDER.indexOf(damageType);
  if (index < 0) throw new Error(`No badge frame for damage type ${damageType}`);
  return (kind === 'strength' ? FIRST_STRENGTH_FRAME : FIRST_WEAKNESS_FRAME) + index;
}

/** One badge as a screen draws it. */
export interface ResistanceBadge {
  frame: number;
  /** `null` for the "none" badge, which has no type and no percentage. */
  damageType: DamageType | null;
  label: string;
  /**
   * `Number(array[i * 2 + 1]) * 100 + "%"` — `ScreenEnemies.as:380`.
   *
   * Empty for the "none" badge, which the AS3 gives no `TextField` at all
   * (`:385-391` adds the icon and nothing else).
   */
  percent: string;
}

/**
 * A row of badges for one side of an enemy's resistance table.
 *
 * Always at least one entry: an empty list yields the single "none" badge, per
 * the AS3 branches cited on `NONE_FRAME`.
 */
export function resistanceBadges(
  resistances: readonly Resistance[],
  kind: ResistanceKind,
): ResistanceBadge[] {
  if (resistances.length === 0) {
    return [{ frame: NONE_FRAME, damageType: null, label: 'None', percent: '' }];
  }
  return resistances.map((r) => ({
    frame: iconFrame(r.damageType, kind),
    damageType: r.damageType,
    label: DAMAGE_TYPE_LABELS[r.damageType],
    // `* 100` on a float lands on 24.999999999999996 for some values, so the
    // AS3's implicit string coercion is reproduced with an explicit round.
    // Every value in `enemyStatsData.ts` is a multiple of 0.05, so this cannot
    // hide a meaningful fraction.
    percent: `${Math.round(r.value * 100)}%`,
  }));
}
