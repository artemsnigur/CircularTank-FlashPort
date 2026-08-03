/**
 * Background prop layout — `PartGameArea.as:1102` (`createBackground`).
 *
 * The layout maths only: which props, how many, where, at what scale, rotation
 * and variant frame. No rendering and no collision pass — see the notes at the
 * foot for what is deliberately absent.
 *
 * This is the first production reader of `LevelSpec.seed`, and the reason D1
 * was decided in favour of restoring the original lineage. Every value below
 * comes off one `PM_PRNG` seeded from that column (`:1184-1185`), consumed in a
 * fixed order.
 *
 * ── Why draw order is the whole problem ───────────────────────────────────
 * A Lehmer generator has no resynchronisation. One extra or missing
 * `nextDouble()` shifts the entire remaining stream, so a layout that is
 * correct in every formula and wrong by one draw matches nothing — while
 * looking completely plausible. The order is therefore pinned as a *sequence*
 * in `backgroundProps.test.ts`, against a stream derived by hand from the AS3
 * formulas rather than from this code.
 *
 * ── `randomOrder` is dead, and that removes a draw ────────────────────────
 * `:1188` declares `randomOrder = false` and **nothing assigns it again** — it
 * is a function-local, so that is exhaustive rather than a name-grep floor. So
 * the `typeNumber` draw at `:1288` never executes and every prop is
 * `objectList[0]`, the first name in the theme's table.
 *
 * That makes the per-prop sequence **five draws, not six**. Anyone reading
 * `:1281-1288` as the spec will consume one draw too many per prop and produce
 * a layout that diverges from the second prop onward.
 *
 * The proportion walk is *not* dead with it: its count for index 0 is read as
 * `maxCountPossible` and caps group size.
 */
import type { LevelSpec } from './levelData';
import { PM_PRNG } from '../core/PM_PRNG';

/** `:1134`. */
const IMAGE_SIZE = 256;

/**
 * Variant frames per prop, from `addBackgroundObject` (`:3526-3660`).
 *
 * `stopAt` picks one via `gotoAndStop(floor(1 + stopAt * maxFrames))`
 * (`:3551`), so a wrong count here silently collapses that draw's effect
 * without changing the stream — the same silent-zero shape as Lava Ball's
 * payload track.
 *
 * Keyed by type, with the two theme overrides the AS3 applies.
 *
 * **One number here disagrees with the art.** `RedBloodCell` is declared 3 but
 * its symbol (`assets.swf` character 1465) has **1** frame; Flash clamps
 * `gotoAndStop` past the end, so it always shows frame 1. The AS3's number is
 * kept because it is what the arithmetic uses — see the frame-count note in
 * `docs/AUDIT-2026-07.md`. It matters only once rendering lands.
 */
export const PROP_FRAMES: Readonly<Record<string, number>> = {
  Rock: 3,
  Crack: 10,
  FlowerWhite: 1,
  FlowerRed: 1,
  FlowerPurple: 1,
  Seastuff: 5,
  Trash: 15,
  Diamond: 3,
  Skeleton: 16,
  Dirt: 5,
  RedBloodCell: 3,
  WhiteBloodCell: 3,
  Bacteria: 2,
  FuturisticLines: 10,
  FuturisticSquare: 2,
};

/** `:3544` — Beach rocks are a different clip with nine frames, not three. */
const FRAME_OVERRIDES: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  Rock: { Beach: 9 },
};

export function propFrames(type: string, theme: string): number {
  return FRAME_OVERRIDES[type]?.[theme] ?? PROP_FRAMES[type] ?? 1;
}

/**
 * Frames the **art** actually has, read from the sprite definitions in
 * `assets.swf` rather than from `addBackgroundObject`'s table.
 *
 * These are not always the same number, and where they differ the AS3's table
 * is the one the *arithmetic* uses while the art is what Flash could *show* —
 * `gotoAndStop` past the end of a clip is a no-op, so the display clamps.
 *
 * `RedBloodCell` is the live case: declared 3, has 1. One number meaning two
 * things, the same shape as the `+15` that means opposite things for ice and
 * lava. Keep both tables; do not reconcile them.
 */
export const SYMBOL_FRAMES: Readonly<Record<string, number>> = {
  Rock: 3,
  Crack: 10,
  FlowerWhite: 1,
  FlowerRed: 1,
  FlowerPurple: 1,
  Seastuff: 5,
  Trash: 15,
  Diamond: 3,
  Skeleton: 16,
  Dirt: 5,
  RedBloodCell: 1,
  WhiteBloodCell: 3,
  Bacteria: 2,
  FuturisticLines: 10,
  FuturisticSquare: 2,
};

const SYMBOL_OVERRIDES: Readonly<Record<string, Readonly<Record<string, number>>>> = {
  Rock: { Beach: 9 },
};

/**
 * The frame actually shown — `:3551` through Flash's clamp.
 *
 * The draw and the arithmetic are unchanged; only the displayed frame is
 * capped. Rendering must call this rather than trusting `propFrames`, or
 * `RedBloodCell` asks for frame 3 of a one-frame clip.
 */
export function displayFrame(type: string, theme: string, frame: number): number {
  const available = SYMBOL_OVERRIDES[type]?.[theme] ?? SYMBOL_FRAMES[type] ?? 1;
  return Math.min(frame, available);
}

/** One theme's table — `:1190-1243`. Weights are proportions, not counts. */
export interface ThemeProps {
  /** `[name, weight]` pairs, in the AS3's declared order. Order is load-bearing. */
  proportions: ReadonlyArray<readonly [string, number]>;
  /** Props **per background tile**, before the tile multiply at `:1244`. */
  minPerTile: number;
  maxPerTile: number;
}

export const THEME_PROPS: Readonly<Record<string, ThemeProps>> = {
  Desert: { proportions: [['Crack', 0.3], ['Rock', 0.7]], minPerTile: 8, maxPerTile: 9 },
  Grass: {
    proportions: [['FlowerWhite', 0.33], ['FlowerRed', 0.33], ['FlowerPurple', 0.33]],
    minPerTile: 10,
    maxPerTile: 11,
  },
  BlueDirt: { proportions: [['Crack', 0.2], ['Rock', 0.8]], minPerTile: 9, maxPerTile: 10 },
  Beach: { proportions: [['Rock', 0.8], ['Seastuff', 0.2]], minPerTile: 4, maxPerTile: 5 },
  Concrete: { proportions: [['Crack', 0.6], ['Trash', 0.4]], minPerTile: 6, maxPerTile: 7 },
  MagicStone: { proportions: [['Diamond', 0.5], ['Dirt', 0.5]], minPerTile: 9, maxPerTile: 10 },
  Hell: { proportions: [['Rock', 0.8], ['Skeleton', 0.2]], minPerTile: 6, maxPerTile: 7 },
  Biology: {
    proportions: [['RedBloodCell', 0.45], ['WhiteBloodCell', 0.3], ['Bacteria', 0.25]],
    minPerTile: 6,
    maxPerTile: 7,
  },
  Futuristic: {
    proportions: [['FuturisticSquare', 0.5], ['FuturisticLines', 0.5]],
    minPerTile: 9,
    maxPerTile: 10,
  },
};

/** Group clustering per type — `:1306-1369`. Absent means "never groups". */
export interface GroupRule {
  minCount: number;
  maxCount: number;
  chance: number;
  minDistance: number;
  maxDistance: number;
}

export const GROUP_RULES: Readonly<Record<string, GroupRule>> = {
  Rock: { minCount: 3, maxCount: 7, chance: 0.3, minDistance: 15, maxDistance: 60 },
  FlowerWhite: { minCount: 3, maxCount: 7, chance: 0.4, minDistance: 30, maxDistance: 100 },
  FlowerRed: { minCount: 3, maxCount: 7, chance: 0.4, minDistance: 30, maxDistance: 100 },
  FlowerPurple: { minCount: 3, maxCount: 7, chance: 0.4, minDistance: 30, maxDistance: 100 },
  Trash: { minCount: 3, maxCount: 6, chance: 0.5, minDistance: 15, maxDistance: 45 },
  Diamond: { minCount: 3, maxCount: 7, chance: 0.3, minDistance: 20, maxDistance: 80 },
  Skeleton: { minCount: 2, maxCount: 3, chance: 0.2, minDistance: 40, maxDistance: 60 },
  Dirt: { minCount: 2, maxCount: 4, chance: 0.3, minDistance: 30, maxDistance: 80 },
  RedBloodCell: { minCount: 3, maxCount: 5, chance: 0.6, minDistance: 60, maxDistance: 100 },
  WhiteBloodCell: { minCount: 3, maxCount: 5, chance: 0.6, minDistance: 60, maxDistance: 100 },
  Bacteria: { minCount: 3, maxCount: 5, chance: 0.6, minDistance: 60, maxDistance: 100 },
  FuturisticSquare: { minCount: 2, maxCount: 5, chance: 0.3, minDistance: 30, maxDistance: 120 },
};

export interface PlacedProp {
  type: string;
  x: number;
  y: number;
  scale: number;
  /** Degrees. */
  rotation: number;
  /** 1-based variant frame — `:3551`. */
  frame: number;
  /** True when this prop came out of a cluster rather than a solo placement. */
  grouped: boolean;
}

/** Background tiles across and down — `:1135-1136`. */
export function tileCounts(roomWidth: number, roomHeight: number): { x: number; y: number } {
  return {
    x: Math.floor(roomWidth / IMAGE_SIZE) + 1,
    y: Math.floor(roomHeight / IMAGE_SIZE) + 1,
  };
}

/**
 * The proportion walk — `:1256-1273`.
 *
 * Turns `[name, weight]` into `[name, count]` by walking every prop slot and
 * advancing to the next type once the current one's share is met. Returned as
 * pairs because that is what `typeNumber` indexes: `objectList[n * 2]` is the
 * name and `[n * 2 + 1]` the count. **The halving in `typeNumber`'s formula is
 * over name/count pairs, not over the name/weight input** — the two arrays
 * have the same shape and completely different contents, and collapsing them
 * is the mistake this returns pairs to make visible.
 *
 * A single-type theme skips the walk entirely (`:1275`), taking all of `amount`.
 */
export function buildObjectList(
  proportions: ReadonlyArray<readonly [string, number]>,
  amount: number,
): Array<[string, number]> {
  if (proportions.length <= 1) {
    return proportions.length === 1 ? [[proportions[0][0], amount]] : [];
  }

  const list: Array<[string, number]> = proportions.map(([name]) => [name, 0]);
  const objectTypes = proportions.length;
  let objectCount = 0;
  let currentType = 1;

  for (let f = 0; f < amount; f += 1) {
    const proportionCurrent = objectCount / amount;
    const proportionMax = proportions[currentType - 1][1];
    if (currentType === objectTypes || proportionCurrent < proportionMax) {
      objectCount += 1;
      list[currentType - 1][1] += 1;
    } else {
      objectCount = 1;
      currentType += 1;
      list[currentType - 1][1] += 1;
    }
  }
  return list;
}

/** A point inside a circle — `:711-717`. Two draws, in this order. */
function randomPointInCircle(
  rng: PM_PRNG,
  centreX: number,
  centreY: number,
  radius: number,
): { x: number; y: number } {
  let a = rng.nextDouble();
  let b = rng.nextDouble();
  // `:717` — the pair is sorted so `a <= b`. Easy to drop when transcribing,
  // and it changes both the angle and the radius rather than just one.
  if (b < a) {
    const c = b;
    b = a;
    a = c;
  }
  return {
    x: centreX + b * radius * Math.cos((2 * Math.PI * a) / b),
    y: centreY + b * radius * Math.sin((2 * Math.PI * a) / b),
  };
}

export interface PropLayoutInput {
  seed: number;
  roomWidth: number;
  roomHeight: number;
  theme: string;
}

/**
 * Lays out one level's props — `:1184-1420`.
 *
 * Deterministic in the seed alone, given a room size and theme. Returns the
 * props rather than drawing them, so the sequence can be asserted without a
 * scene.
 */
export function layoutProps(input: PropLayoutInput): PlacedProp[] {
  return placeProps(new PM_PRNG(input.seed), input);
}

function placeProps(rng: PM_PRNG, input: PropLayoutInput): PlacedProp[] {
  const table = THEME_PROPS[input.theme];
  if (!table) return [];

  const tiles = tileCounts(input.roomWidth, input.roomHeight);
  const scaleBy = tiles.x * tiles.y;
  const minAmount = Math.round(table.minPerTile * scaleBy);
  const maxAmount = Math.round(table.maxPerTile * scaleBy);

  // Draw 1 — `:1246`.
  const amount = minAmount + Math.round(rng.nextDouble() * (maxAmount - minAmount));

  const objectList = buildObjectList(table.proportions, amount);
  const placed: PlacedProp[] = [];

  for (let u = 0; u < amount; u += 1) {
    // Draws 2-6, in this exact order — `:1281-1285`.
    const scale = rng.nextDouble();
    const posX = Math.round(rng.nextDouble() * input.roomWidth);
    const posY = Math.round(rng.nextDouble() * input.roomHeight);
    const rotation = Math.round(rng.nextDouble() * 360);
    const stopAt = rng.nextDouble();

    // No `typeNumber` draw: `randomOrder` is permanently false, so this is
    // always index 0. See the header.
    const typeNumber = 0;
    const entry = objectList[typeNumber];
    if (!entry) break;
    const [type, maxCountPossible] = entry;

    const rule = GROUP_RULES[type];
    // `:1370` — `groupChance *= 1 / ((maxCount - minCount) / 2)`. For a type
    // with no rule that is `0 * (1 / 0)` = NaN, so the comparison below is
    // false and it never groups. **The draw still happens**, which is why the
    // roll sits outside the rule check rather than inside it.
    const groupChance = rule ? rule.chance * (1 / ((rule.maxCount - rule.minCount) / 2)) : NaN;

    // Draw 7 — consumed whether or not the type can group.
    //
    // DELIBERATELY UN-TIDY. The obvious cleanup is to roll only when `rule`
    // exists, since a ruleless type can never cluster anyway. That keeps the
    // behaviour and breaks the layout: the roll is one draw, and dropping it
    // shifts every position after the first ruleless prop. The NaN above is
    // load-bearing — it produces the right answer (never clusters) *and*
    // consumes the right draw. Pinned in `backgroundProps.test.ts` under
    // "a ruleless type consumes its group draw and never clusters", which was
    // verified to fail when the roll is hoisted.
    const groupRoll = rng.nextDouble();
    const addAsGroup = groupRoll <= groupChance;

    let countToPlace = 1;
    let groupDistance = 0;

    if (addAsGroup && rule) {
      // Draw 8, only on a successful group roll.
      const groupSizeFactor = rng.nextDouble();
      countToPlace = Math.floor(
        rule.minCount + groupSizeFactor * (rule.maxCount - rule.minCount + 1),
      );
      if (countToPlace >= maxCountPossible) countToPlace = maxCountPossible;
      groupDistance = rule.minDistance + groupSizeFactor * (rule.maxDistance - rule.minDistance);
    }

    entry[1] -= countToPlace;
    if (entry[1] === 0) objectList.splice(typeNumber, 1);

    // `:1398` — the outer counter skips the props this iteration placed.
    u += countToPlace - 1;

    for (let member = 0; member < countToPlace; member += 1) {
      if (!addAsGroup) {
        placed.push({
          type,
          x: posX,
          y: posY,
          scale,
          rotation,
          frame: Math.floor(1 + stopAt * propFrames(type, input.theme)),
          grouped: false,
        });
        continue;
      }

      // Five draws per group member — two inside the circle pick, then scale,
      // rotation and stopAt again. The cluster's *centre* values are not reused.
      const point = randomPointInCircle(rng, posX, posY, groupDistance);
      const memberScale = rng.nextDouble();
      const memberRotation = Math.round(rng.nextDouble() * 360);
      const memberStopAt = rng.nextDouble();

      placed.push({
        type,
        x: point.x,
        y: point.y,
        scale: memberScale,
        rotation: memberRotation,
        frame: Math.floor(1 + memberStopAt * propFrames(type, input.theme)),
        grouped: true,
      });
    }
  }

  return placed;
}


/**
 * Placeholder art dimensions, per type.
 *
 * The AS3 takes the collision radius off the **rendered sprite**:
 * `(object.height + object.width) * 0.2` (`:2617`), so it depends on the art
 * and on the prop's own scale. With placeholders these are invented, which
 * means **the collision pass removes a different set of props than the original
 * did, and consumes a different number of draws.**
 *
 * That is contained rather than corrosive: the pass is the *last* consumer of
 * the generator (`:1418`, and nothing after it draws), so a different draw
 * count here shifts nothing else. It is the one part of this subsystem whose
 * output real art will change, and the reason the placement stream is pinned
 * separately from the collision result.
 */
export const PLACEHOLDER_SIZE: Readonly<Record<string, number>> = {
  Rock: 40,
  Crack: 60,
  FlowerWhite: 24,
  FlowerRed: 24,
  FlowerPurple: 24,
  Seastuff: 32,
  Trash: 36,
  Diamond: 28,
  Skeleton: 48,
  Dirt: 40,
  RedBloodCell: 30,
  WhiteBloodCell: 34,
  Bacteria: 26,
  FuturisticLines: 64,
  FuturisticSquare: 44,
};

/** `:2617` — width and height are the *scaled* display size. */
export function propRadius(prop: PlacedProp): number {
  const base = (PLACEHOLDER_SIZE[prop.type] ?? 32) * prop.scale;
  return (base + base) * 0.2;
}

/**
 * Collisions a prop must accumulate before one of the pair is removed.
 *
 * `:2621` — `FuturisticLines` tolerates six; everything else dies on the first.
 */
export function collisionCountDie(type: string): number {
  return type === 'FuturisticLines' ? 6 : 1;
}

/**
 * Whether two props are allowed to collide at all — `:2633`.
 *
 * **`FuturisticSquare` never collides**, on either side of the pair. That is the
 * only live exclusion.
 *
 * The source also excludes `BGObjectCrack` against non-Crack in both
 * directions, and that branch is **dead**: no class of that name exists. The
 * three Crack clips are `BGObjectCrackDesert`, `BGObjectCrackBlueDirt` and
 * `BGObjectCrackConcrete`, so `object == "[object BGObjectCrack]"` never
 * matches and cracks collide with everything. Reproduced as written — cracks
 * collide — rather than as apparently intended.
 */
export function canCollide(a: string, b: string): boolean {
  return a !== 'FuturisticSquare' && b !== 'FuturisticSquare';
}

export interface CollisionResult {
  props: PlacedProp[];
  /** Draws consumed — one per collision resolved. Data-dependent by nature. */
  draws: number;
}

/**
 * Removes overlapping props — `:2603-2664`.
 *
 * One `nextDouble()` per collision **resolved**, and the roll decides *which*
 * of the pair goes, not *whether* one goes: below 0.5 removes the outer prop,
 * at or above removes the inner one (`:2645-2653`). Removal is unconditional
 * once the count is reached.
 *
 * `removeMethod` is dead. `:2622` sets it to `"Object"` for `FuturisticLines`,
 * then `:2640` unconditionally reassigns `"Random"` before any read, and
 * `if(removeMethod)` is a truthy-string test that always passes — so the
 * `else` branch at `:2660` is unreachable and `FuturisticLines`' only surviving
 * difference is its tolerance of six.
 */
export function resolveCollisions(input: PlacedProp[], rng: PM_PRNG): CollisionResult {
  const props = [...input];
  let draws = 0;

  for (let i = 0; i < props.length; i += 1) {
    const object = props[i];
    const radius = propRadius(object);
    const die = collisionCountDie(object.type);
    let collisions = 0;

    for (let ii = 0; ii < props.length; ii += 1) {
      if (i === ii) continue;
      const other = props[ii];

      if (
        canCollide(object.type, other.type) &&
        Math.hypot(object.x - other.x, object.y - other.y) < radius + propRadius(other)
      ) {
        collisions += 1;
      }

      if (collisions >= die) {
        draws += 1;
        // Which one, not whether.
        if (rng.nextDouble() < 0.5) props.splice(i, 1);
        else props.splice(ii, 1);
        i -= 1;
        break;
      }
    }
  }

  return { props, draws };
}

/**
 * A level's finished prop layout — placement then collision removal, on one
 * generator, in the AS3's order (`:1279-1418`).
 */
export function layoutLevelProps(input: PropLayoutInput): CollisionResult {
  const rng = new PM_PRNG(input.seed);
  const placed = placeProps(rng, input);
  return resolveCollisions(placed, rng);
}

/** Convenience wrapper for a level row. */
export function layoutPropsForLevel(spec: LevelSpec): PlacedProp[] {
  return layoutProps({
    seed: spec.seed,
    roomWidth: spec.roomWidth,
    roomHeight: spec.roomHeight,
    theme: spec.theme,
  });
}

/*
 * ── Deliberately absent, and what discharges each ────────────────────────
 *
 * **Rendering.** Nothing here creates a sprite. Step 3.
 *
 * **`removeBackgroundObjectsColliding` (`:2603`).** It draws from this same
 * generator — one `nextDouble() < 0.5` per colliding pair (`:2646`) — so it is
 * *inside* this sequence, not a pass that runs after it. Its draw count depends
 * on how many props collide, which depends on the positions the draws above
 * produced, so **the stream position after it is data-dependent and must never
 * be pinned as a fixed offset.** When it lands it gets asserted as "one draw
 * per collision resolved".
 *
 * **Real art.** Placeholders carry the real frame counts above so the `stopAt`
 * draw is exercised, but no art exists yet. Owed: the 21 `BGObject*` clips
 * embedded in `assets.swf` (~100 frames across them), which needs an extraction
 * step that is scoped but not built. Discharged when those land and
 * `propFrames` is checked against them — see the `RedBloodCell` note above,
 * which is the one place the AS3's number and the art already disagree.
 */
