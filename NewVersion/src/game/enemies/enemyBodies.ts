/**
 * Body size rules — enemies whose physical size changes during a level.
 *
 * Currently just `Shrinking`, but kept separate from `Enemy` because the size
 * is a pure function of health and the entity should not own the formula.
 */

/**
 * Scale factor for a `Shrinking` enemy — `PartGameArea.as:6774`.
 *
 *     size = 1/3 + 2/3 * (hp / totalHealth)
 *
 * So it spawns at full size and reaches **one third**, not zero, at the point
 * of death. The floor is the interesting part: a linear `hp / total` would
 * shrink it to nothing and make the last hit nearly impossible to land, which
 * is presumably why the original reserved a third.
 *
 * Applied to the collision radius *and* the sprite together in the AS3
 * (`radius`, `scaleX`, `scaleY` on consecutive lines), so a small Shrinking
 * enemy is genuinely harder to hit rather than merely looking it.
 */
export const SHRINK_FLOOR = 1 / 3;

export function shrinkScale(health: number, maxHealth: number): number {
  if (!(maxHealth > 0)) return 1;
  // Health can sit slightly outside [0, max] for a frame — a killing blow
  // overshoots, and a Medic heal is capped only after the fact — so the ratio
  // is clamped rather than trusted.
  const fraction = Math.min(Math.max(health / maxHealth, 0), 1);
  return SHRINK_FLOOR + (1 - SHRINK_FLOOR) * fraction;
}

/** Enemy types whose size tracks their health. */
const SHRINKS = new Set(['Shrinking']);

export function shrinksWithHealth(enemyType: string): boolean {
  return SHRINKS.has(enemyType);
}
