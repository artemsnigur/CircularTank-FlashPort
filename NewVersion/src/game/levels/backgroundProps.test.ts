/**
 * The prop draw sequence, pinned against a hand-derived stream.
 *
 * ── How the expected values were produced ────────────────────────────────
 * **Not by running this code.** The MINSTD recurrence (`s = s * 16807 % 2^31-1`)
 * was implemented independently from its published definition, and the AS3
 * expressions at `:1246`, `:1256-1273`, `:1281-1285`, `:1370-1380` and
 * `:711-725` were transcribed onto it by hand. The numbers below are that
 * derivation's output.
 *
 * That matters more than it sounds. A Lehmer generator has no
 * resynchronisation: one extra or missing `nextDouble()` shifts the entire
 * remaining stream, so an implementation wrong by one draw produces a layout
 * that is plausible everywhere and correct nowhere. An expectation captured
 * from this module's own output would agree with it in exactly that case,
 * which is the case worth catching.
 *
 * The generator underneath is separately verified against Park & Miller's
 * published check value in `core/PM_PRNG.test.ts`. So the stream is ground
 * truth and what is under test here is purely **consumption order**.
 */
import { describe, expect, it } from 'vitest';
import {
  GROUP_RULES,
  PROP_FRAMES,
  THEME_PROPS,
  buildObjectList,
  layoutProps,
  propFrames,
  tileCounts,
} from './backgroundProps';
import { getLevel } from './levelData';

/** Level 1-1 as the port ships it: Desert, 800x600 after the world-1 override. */
const LEVEL_1_1 = { seed: 610309764, roomWidth: 800, roomHeight: 600, theme: 'Desert' };

describe('the level row feeds the layout', () => {
  it('uses the real seed and theme from level 1-1', () => {
    // The point of D1: `LevelSpec.seed` finally has a production reader, and it
    // is the discovered one — `createBackground` — not a manufactured site.
    const spec = getLevel(1, 1)!;
    expect(spec.seed).toBe(LEVEL_1_1.seed);
    expect(spec.theme).toBe(LEVEL_1_1.theme);
  });

  it('tiles the room at 256 and adds one', () => {
    // `:1135-1136`. 800/256 = 3.125 -> 3, +1 = 4.
    expect(tileCounts(800, 600)).toEqual({ x: 4, y: 3 });
    expect(tileCounts(640, 400)).toEqual({ x: 3, y: 2 });
  });
});

describe('the hand-derived stream for level 1-1', () => {
  const props = layoutProps(LEVEL_1_1);

  it('draws the amount first, giving 102 props', () => {
    // 12 tiles, Desert 8-9 per tile -> min 96, max 108.
    // draw 1 = 0.509575696899358 -> 96 + round(0.5095... * 12) = 102.
    expect(props).toHaveLength(102);
  });

  it('places the first prop at the derived position, scale, rotation and frame', () => {
    // Draws 2-6: scale, posX, posY, rotation, stopAt — in that order.
    expect(props[0]).toEqual({
      type: 'Crack',
      x: 693,
      y: 464,
      scale: 0.43873778751061193,
      rotation: 336,
      frame: 4,
      grouped: false,
    });
  });

  it('and the next three, which is where a one-draw error would show', () => {
    // A missing or extra draw per prop leaves prop 0 plausible and every prop
    // after it wrong, so the sequence matters more than any single value.
    expect(props.slice(1, 4)).toEqual([
      { type: 'Crack', x: 106, y: 440, scale: 0.139830558160241, rotation: 146, frame: 5, grouped: false },
      { type: 'Crack', x: 694, y: 591, scale: 0.616996910710352, rotation: 74, frame: 3, grouped: false },
      { type: 'Crack', x: 436, y: 1, scale: 0.2051850213693385, rotation: 325, frame: 6, grouped: false },
    ]);
  });

  it('is reproducible from the seed alone', () => {
    expect(layoutProps(LEVEL_1_1)).toEqual(props);
  });

  it('gives a different layout for a different seed', () => {
    const other = layoutProps({ ...LEVEL_1_1, seed: 1189992843 });
    expect(other[0]).not.toEqual(props[0]);
  });
});

/**
 * The proportion walk, against the thing it is constantly mistaken for.
 */
describe('the proportion walk builds name/count pairs, not name/weight', () => {
  it('turns Desert 0.3/0.7 into 31 and 71 out of 102', () => {
    // The counts the walk at `:1256-1273` produces for level 1-1. Derived by
    // hand alongside the stream above.
    expect(buildObjectList(THEME_PROPS.Desert.proportions, 102)).toEqual([
      ['Crack', 31],
      ['Rock', 71],
    ]);
  });

  it('the output is counts, and the input is weights — different arrays, same shape', () => {
    // The distinction `typeNumber` depends on. `objectList[n * 2 + 1]` is a
    // *count*; `objectProportions[n * 2 + 1]` is a *weight*. Both are flat
    // pair arrays of equal length, so a "simplification" that indexes one as
    // the other type-checks, runs, and silently caps group sizes at 0.3.
    const weights = THEME_PROPS.Desert.proportions;
    const counts = buildObjectList(weights, 102);

    expect(weights.map(([, w]) => w)).toEqual([0.3, 0.7]);
    expect(counts.map(([, c]) => c)).toEqual([31, 71]);
    expect(counts).toHaveLength(weights.length);
  });

  it('always sums to the amount, at every theme and size', () => {
    // The invariant that makes it a partition rather than a rounding exercise.
    for (const [theme, table] of Object.entries(THEME_PROPS)) {
      for (const amount of [1, 7, 50, 102, 333]) {
        const total = buildObjectList(table.proportions, amount).reduce((s, [, c]) => s + c, 0);
        expect(total, `${theme} @ ${amount}`).toBe(amount);
      }
    }
  });

  it('a single-type theme skips the walk entirely', () => {
    // `:1275` takes the whole amount rather than walking proportions.
    expect(buildObjectList([['Rock', 1]], 40)).toEqual([['Rock', 40]]);
  });
});

/**
 * `randomOrder` is dead, so the sixth draw never happens.
 */
describe('the type advances by exhaustion, never by a draw', () => {
  const props = layoutProps(LEVEL_1_1);

  it('lays the walk counts exactly: 31 Crack then 71 Rock', () => {
    // `randomOrder` is false (`:1188`, never reassigned, and a function-local
    // so that is exhaustive), so `typeNumber` is always 0. The type changes
    // only when index 0's count reaches zero and the pair is spliced out —
    // which is why the layout is all Crack, then all Rock, never interleaved.
    expect(props.filter((q) => q.type === 'Crack')).toHaveLength(31);
    expect(props.filter((q) => q.type === 'Rock')).toHaveLength(71);
    expect(props.findIndex((q) => q.type === 'Rock')).toBe(31);
    expect(props.slice(0, 31).every((q) => q.type === 'Crack')).toBe(true);
  });

  it('matches the proportion walk it was built from', () => {
    // The counterpart: the walk's output and the placed layout must agree, or
    // one of the two is reading the pairs wrongly.
    for (const [name, count] of buildObjectList(THEME_PROPS.Desert.proportions, 102)) {
      expect(props.filter((q) => q.type === name), name).toHaveLength(count);
    }
  });

  it('so the type draw is absent, not merely constant', () => {
    // If the draw happened and its result were discarded, the stream would
    // advance and every later prop would move. Prop 1's derived values come
    // from a stream where no sixth draw was consumed.
    expect(props[1].x).toBe(106);
    expect(props[1].y).toBe(440);
  });
});
describe('the variant frame is exercised, not inert', () => {
  it('spreads frames across the range for a ten-frame prop', () => {
    // `stopAt` picks via `floor(1 + stopAt * maxFrames)` (`:3551`). A
    // placeholder with one frame would make every result 1 and hide a broken
    // draw — the silent-zero shape. Crack has ten.
    const frames = new Set(layoutProps(LEVEL_1_1).map((p) => p.frame));
    expect(frames.size).toBeGreaterThan(1);
    for (const f of frames) {
      expect(f).toBeGreaterThanOrEqual(1);
      expect(f).toBeLessThanOrEqual(PROP_FRAMES.Crack);
    }
  });

  it('carries the real counts from the art, including the Beach override', () => {
    // Cross-checked against the sprite definitions in assets.swf.
    expect(propFrames('Rock', 'Desert')).toBe(3);
    expect(propFrames('Rock', 'Beach')).toBe(9);
    expect(propFrames('Skeleton', 'Hell')).toBe(16);
    expect(propFrames('FlowerWhite', 'Grass')).toBe(1);
  });
});

describe('the group roll is consumed even by types that cannot group', () => {
  const props = layoutProps(LEVEL_1_1);

  it('Crack has no rule, so none of its 31 cluster', () => {
    // `groupChance` for a ruleless type is `0 * (1 / 0)` = NaN, and
    // `nextDouble() <= NaN` is false. The draw still happens.
    expect(GROUP_RULES.Crack).toBeUndefined();
    expect(props.slice(0, 31).every((q) => !q.grouped)).toBe(true);
  });

  it('Rock does, and 22 of the 71 land as cluster members', () => {
    // The counterpart to the line above: same stream, same loop, and the only
    // difference is whether the type has a rule.
    expect(GROUP_RULES.Rock).toBeDefined();
    expect(props.filter((q) => q.grouped)).toHaveLength(22);
    expect(props.findIndex((q) => q.grouped)).toBe(47);
  });

  it('a cluster member takes five fresh draws, not the centre values', () => {
    // `:1404-1412` — a member re-draws scale, rotation and stopAt after the
    // two-draw circle pick, so it does not inherit the centre it was placed
    // around. Reusing the centre would be the natural shortcut and would
    // consume three draws fewer per member.
    expect(props[47]).toEqual({
      type: 'Rock',
      x: 631.3698433260352,
      y: 437.7031390860134,
      scale: 0.6674999527947512,
      rotation: 242,
      frame: 2,
      grouped: true,
    });
  });

  it('and dropping the roll would move every prop after the first', () => {
    expect(props[1].scale).toBeCloseTo(0.139830558160241, 15);
  });
});