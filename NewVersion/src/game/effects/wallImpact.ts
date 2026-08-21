/**
 * The debris a round throws when it hits a wall — `PartGameArea.as:1815-1837`.
 *
 * The original does have this, and it is more specific than "sparks at the
 * impact": four edge cases, each with its own fan, and a corner that produces
 * **two** bursts rather than one.
 *
 *     left    partX = 0            startAngle 0     spraying right, into the room
 *     right   partX = roomWidth    startAngle 180   spraying left
 *     top     partY = 0            startAngle 90    spraying down
 *     bottom  partY = roomHeight   startAngle 270   spraying up
 *
 * All four are `BulletDestroy`, three pieces, `distance` 10, `randAngle` 90 —
 * so each fan spans 90 degrees centred on the inward normal.
 *
 * ── Two details that a paraphrase loses ───────────────────────────────────
 * **The clamp.** `partX`/`partY` start at the round's own position, which is
 * *outside* the room by the time the crossing is noticed. Each branch replaces
 * the coordinate **on its own axis only**, so the burst sits on the wall in
 * one axis and at the round's real height (or width) in the other. Without it
 * the debris appears in the void beyond the wall.
 *
 * **The two `if`s are not chained.** `:1817` and `:1827` are separate
 * statements, each with its own `else if`, so a round leaving through a corner
 * satisfies one from each and spawns twice — six pieces where every other
 * impact throws three.
 *
 * And the two do not land in the same place. The X block spawns *before* the
 * Y block clamps `partY`, so at a corner the first burst sits on the vertical
 * wall at the round's raw height — still outside the room — while the second,
 * reading the `partX` the first already clamped, is on the corner itself.
 * "Both at the corner" is the intuitive reading and it is wrong; the test
 * pins the asymmetry, which is the sort of thing a tidy-up would erase.
 *
 * ── What is deliberately not here ─────────────────────────────────────────
 * `:1812`'s exclusion list — laser, the three grenades, an unspent gummy bear,
 * an unspent Crazy Cheese. None of them can reach this in the port: the laser
 * spawns no travelling round, grenades are their own objects, and a bouncer
 * with bounces left takes the bounce branch instead of the cull. The list is
 * a *consequence* of the port's structure rather than a rule it has to
 * restate, which is why there is no gate here.
 */

import type { SpawnInput } from './particles';

/** `:1821` etc. — the fan is 90 degrees wide whichever wall was struck. */
export const WALL_FAN_DEGREES = 90;

/** `:1821` — three pieces per wall, and a corner throws two lots. */
export const WALL_PIECES = 3;

/** `:1821` — the `distance` argument; debris starts spread along its heading. */
export const WALL_SPREAD = 10;

export interface WallImpactInput {
  /** The round's position **after** the step that took it out of the room. */
  x: number;
  y: number;
  /** Its collision radius — the same margin `advanceBullet` culls on. */
  radius: number;
  roomWidth: number;
  roomHeight: number;
}

/**
 * The bursts for one wall impact — empty when the round is still inside.
 *
 * Empty is a real answer and the caller must handle it: `advanceBullet` also
 * returns null for a round removed for another reason, and firing a burst for
 * those would put debris in the middle of the arena.
 */
export function wallImpactBursts(input: WallImpactInput): SpawnInput[] {
  const { x, y, radius, roomWidth, roomHeight } = input;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return [];

  const bursts: SpawnInput[] = [];

  // `partX`/`partY` start at the round and are clamped per axis, exactly as
  // `:1816` sets them before either branch runs.
  let partX = x;
  let partY = y;

  const burst = (px: number, py: number, startAngle: number): SpawnInput => ({
    type: 'BulletDestroy',
    count: WALL_PIECES,
    x: px,
    y: py,
    distance: WALL_SPREAD,
    startAngle,
    randAngle: WALL_FAN_DEGREES,
  });

  if (x < -radius) {
    partX = 0;
    bursts.push(burst(partX, partY, 0));
  } else if (x > roomWidth + radius) {
    partX = roomWidth;
    bursts.push(burst(partX, partY, 180));
  }

  // Separate `if`, not an `else` — a corner exit spawns from both, and this
  // one sees the `partX` the block above may have already clamped.
  if (y < -radius) {
    partY = 0;
    bursts.push(burst(partX, partY, 90));
  } else if (y > roomHeight + radius) {
    partY = roomHeight;
    bursts.push(burst(partX, partY, 270));
  }

  return bursts;
}
