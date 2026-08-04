/**
 * Coin art — `ItemMoney` (symbol 959), fifteen frames, one per denomination.
 *
 * Selected by `gotoAndStop` at `PartGameArea.as:536-601`, where the AS3 writes
 * out all fifteen `itemType == "MoneyN"` branches in denomination order.
 *
 * ── Each frame is two shapes, and the bodies are shared ───────────────────
 * A coin is a **body** plus a **numeral overlay** on a second depth. Only five
 * distinct bodies exist across the fifteen frames — 7, 10, 13, 17 and 22 units
 * wide — so Money10 through Money75 are the same disc with different numerals.
 *
 * That structure is why this table was rebuilt. The frame parser used for
 * `propArt` and `particleArt` recorded "shapes placed on this frame", which is
 * not what a frame shows: Flash keeps objects across frames, so a frame that
 * replaced only the numeral recorded only the numeral. It produced a coin
 * ladder where Money5 was 4.2 units and Money1 was 7 — non-monotonic, which is
 * what gave it away. The corrected parser tracks depth to character and
 * snapshots the display list per frame. `propArt` and `particleArt` were
 * re-checked against it and are unaffected; every one of their frames replaces
 * a single shape.
 *
 * ── `size` is the collision radius, doubled ───────────────────────────────
 * `:611` sets `item.radius = item.width / 2`, the same rule as enemies
 * (`entities/enemyArt.ts`). It is the **body's** width, since that is the
 * sprite's own extent — the numeral is smaller and sits inside it.
 */
export interface MoneyClip {
  /** Shape id of the disc. */
  body: number;
  /** Shape id of the numeral, or null where the value needs none. */
  overlay: number | null;
  /** Authored body width. Halved, this is the radius — `:611`. */
  size: number;
}

/** Denomination -> art. Keys are the fifteen values in `DENOMINATIONS`. */
export const MONEY_CLIPS: Readonly<Record<number, MoneyClip>> = {
  1: { body: 941, overlay: null, size: 7 },
  2: { body: 942, overlay: 943, size: 10 },
  5: { body: 942, overlay: 944, size: 10 },
  10: { body: 945, overlay: 946, size: 13 },
  15: { body: 945, overlay: 947, size: 13 },
  20: { body: 945, overlay: 948, size: 13 },
  25: { body: 945, overlay: 949, size: 13 },
  50: { body: 945, overlay: 950, size: 13 },
  75: { body: 945, overlay: 951, size: 13 },
  100: { body: 952, overlay: 953, size: 17 },
  150: { body: 952, overlay: 954, size: 17 },
  200: { body: 952, overlay: 955, size: 17 },
  250: { body: 952, overlay: 956, size: 17 },
  500: { body: 952, overlay: 957, size: 17 },
  1000: { body: 958, overlay: null, size: 22 },
};

/** The collision radius for a denomination — `:611`, `item.width / 2`. */
export function coinRadius(value: number): number {
  const clip = MONEY_CLIPS[value];
  // Unknown values cannot arise: `decomposeMoney` only ever emits members of
  // `DENOMINATIONS`, and `money.test.ts` asserts that. Throwing rather than
  // defaulting keeps a future denomination from silently taking someone
  // else's hitbox — the invented-constant failure this port has already had.
  if (!clip) throw new Error(`no coin art for value ${value}`);
  return clip.size / 2;
}

/** Every shape the fifteen frames draw, for the asset manifest. */
export const MONEY_SHAPES: readonly number[] = [
  941, 942, 943, 944, 945, 946, 947, 948, 949, 950, 951, 952, 953, 954, 955, 956, 957, 958,
];
