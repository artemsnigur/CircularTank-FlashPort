/**
 * The two on-enemy indicators — `handleEnemyIndicators` (`:2478`) and
 * `handleMedicIndicators` (`:2279`).
 *
 * Both are pure rendering over state the port already carries (`gotBomb`,
 * `bombTimer`, `healing`, `healDistance`), which is why this is a table of
 * arithmetic rather than a subsystem. Both sit **outside** the level-done gate
 * (`:2835`-`:2836`), already recorded in `waves/levelDoneGate.ts`.
 *
 * ── Nothing here reads a sprite dimension ─────────────────────────────────
 * Checked before swapping the art in, because the props and the enemy radii
 * both turned out to. They do not: the bomb marker's scale comes from
 * `enemy.radius` against a fixed 75, and the medic ring's from `healDistance`
 * against a fixed 100. The art's own width is used only to draw it at its
 * authored size. So this pass cannot move a hitbox.
 */

/** `:2531` — the divisor in the bomb marker's size term. */
const BOMB_SCALE_DIVISOR = 75;

/** `:3120` — the medic ring is authored for a 100-unit heal radius. */
export const MEDIC_REFERENCE_DISTANCE = 100;

export interface BombIndicatorInput {
  /** The host's collision radius. */
  radius: number;
  /** Frames left on the fuse. */
  bombTimer: number;
  /** Fuse length, so the ratio is meaningful. */
  bombTimerMax: number;
  isBoss: boolean;
}

export interface BombIndicatorView {
  scale: number;
  alpha: number;
  /** 1 for an ordinary enemy, 2 for a boss — `:2532`-`:2538`. */
  frame: 1 | 2;
}

/**
 * How the bomb marker draws this frame — `:2531`-`:2542`.
 *
 * **The scale grows with the fuse and the alpha shrinks with it**, which reads
 * backwards until you watch it: a freshly attached bomb is a large faint ring
 * that tightens and brightens onto the enemy as it counts down. Both terms use
 * the same ratio in opposite directions, so porting one and inverting the other
 * produces something that still animates and means nothing.
 */
export function bombIndicatorView(input: BombIndicatorInput): BombIndicatorView {
  // Guard the ratio rather than the inputs: a zero max is a division by zero
  // that would silently produce NaN scale, and a NaN scale draws nothing at
  // all — the quietest possible failure for a warning marker.
  const ratio = input.bombTimerMax > 0 ? input.bombTimer / input.bombTimerMax : 0;

  return {
    scale:
      input.radius / BOMB_SCALE_DIVISOR + 0.01 + ratio * (0.003 * input.radius + 0.06),
    // `:2542` — 0.2 at full fuse, 1.0 at detonation.
    alpha: 0.2 + 0.8 * (1 - ratio),
    frame: input.isBoss ? 2 : 1,
  };
}

/**
 * The medic ring's scale — `:3120`, fixed at spawn rather than per frame.
 *
 * `handleMedicIndicators` only ever moves the ring to its host; the size is set
 * once when the medic spawns, from that medic's own heal radius. A boss medic
 * reaches 100 where a normal one reaches less, and the ring is authored at the
 * boss size, so this is usually a shrink.
 */
export function medicRingScale(healDistance: number): number {
  return healDistance / MEDIC_REFERENCE_DISTANCE;
}
