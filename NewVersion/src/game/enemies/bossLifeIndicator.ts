/**
 * The boss life indicator's geometry — `PartInterface.handleLifeIndicators`
 * (`:872-995`).
 *
 * A red disc sits under each boss, revealed as a pie wedge that grows clockwise
 * from 12 o'clock as the boss loses health. At full health nothing shows; at
 * zero the whole disc is red.
 *
 * ── The denominator is already ported, so it is read, not recomputed ──────
 * `:971` computes `round(enemyStats[1] * multiplierHealth / ScreenGame.bossAmount)`
 * with `multiplierHealth` **forced to 1 for a boss** (`:951-963`). That is
 * exactly `resolveEnemyStats`' rule — `enemyStats.ts:87` exempts bosses from the
 * difficulty multiplier and `:91-95` divides by `bossAmount` — so the number is
 * already sitting on the enemy as `maxHealth`.
 *
 * Recomputing it here would be a second copy of a rule this port has once, which
 * is the shape the audit tracks under "one rule, two copies" (`countCrowd`,
 * `canAfford`, `flagReward`). The AS3 recomputes only because it has no such
 * field. `bossLifeIndicator.test.ts` pins the equivalence against the stat
 * table on a multi-boss level rather than taking it on trust.
 */

/** `:923` — the art is a 100px disc, so a boss of radius r scales by r/50. */
export const RED_CIRCLE_ART_RADIUS = 50;

/**
 * `:977` — the sweep starts at 270°, which is straight up.
 *
 * Flash and Phaser both put +y downward, so `(cos 270, sin 270)` is `(0, -1)`.
 * Increasing the angle from there runs 270 -> 360 -> `(1, 0)`, i.e. rightward:
 * **clockwise on screen** in both. The constant ports unchanged, and
 * `bossLifeIndicator.test.ts` drives the direction rather than trusting that.
 */
export const WIPE_START_DEGREES = 270;

/**
 * `:972` — how much of the disc is revealed, in degrees.
 *
 * `360 * (1 - hp / totalHealth)`: 0 at full health, 360 at zero. Clamped,
 * because `hp` can exceed `maxHealth` briefly if a Medic heals a boss
 * (`enemyHealing.ts`) and can go negative on an overkill hit — the AS3 does
 * neither and would draw a wedge past a full turn or a negative sweep.
 */
export function wipeDegrees(hp: number, totalHealth: number): number {
  if (!(totalHealth > 0)) return 360;
  const fraction = Math.min(1, Math.max(0, hp / totalHealth));
  return 360 * (1 - fraction);
}

/** The sweep's end angle, in degrees. */
export function wipeEndDegrees(hp: number, totalHealth: number): number {
  return WIPE_START_DEGREES + wipeDegrees(hp, totalHealth);
}

/** `:924-925` — the disc's scale for a boss of this radius. */
export function discScale(radius: number): number {
  return radius / RED_CIRCLE_ART_RADIUS;
}

/**
 * Whether a boss should carry an indicator this frame.
 *
 * Two gates, and both matter:
 *
 * - **`levelMode === 'Boss'`** (`:1066`). A Normal level *can* contain a boss
 *   row — 1-9 does not, but the level tables allow it — and the AS3 draws no
 *   indicator there. Gating on "has a boss" instead would add the ring to
 *   levels the original leaves plain.
 * - **`enemyLevel === 'B'`** (`:889`). Ordinary enemies on a Boss level get
 *   nothing.
 */
export function wantsIndicator(levelMode: string, enemyLevel: string): boolean {
  return levelMode === 'Boss' && enemyLevel === 'B';
}
