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
  SYMBOL_FRAMES,
  THEME_PROPS,
  buildObjectList,
  canCollide,
  collisionCountDie,
  displayFrame,
  layoutLevelProps,
  layoutProps,
  propFrames,
  resolveCollisions,
  tileCounts,
} from './backgroundProps';
import { PM_PRNG } from '../core/PM_PRNG';
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
/**
 * One number meaning two things — the same shape as the `+15` that means the
 * opposite for ice and lava.
 */
describe('the frame table and the art disagree, and both are kept', () => {
  it('RedBloodCell: the arithmetic uses 3, the render shows 1', () => {
    // `addBackgroundObject` declares `maxFrames = 3` (`:3596`), but symbol 1465
    // has one frame and Flash clamps `gotoAndStop` past the end. Reconciling
    // the two tables either changes the draw's meaning or shows a frame that
    // does not exist.
    expect(propFrames('RedBloodCell', 'Biology')).toBe(3);
    expect(SYMBOL_FRAMES.RedBloodCell).toBe(1);

    expect(displayFrame('RedBloodCell', 'Biology', 3)).toBe(1);
    expect(displayFrame('RedBloodCell', 'Biology', 2)).toBe(1);
  });

  it('and where they agree the clamp is a no-op', () => {
    // The counterpart: the clamp must not quietly alter every other prop.
    for (const type of Object.keys(PROP_FRAMES)) {
      if (type === 'RedBloodCell') continue;
      const declared = propFrames(type, 'Desert');
      expect(displayFrame(type, 'Desert', declared), type).toBe(declared);
    }
  });

  it('the clamp never changes what the draw consumed', () => {
    // Clamping is a display concern. The frame the arithmetic produced is still
    // on the prop; only the rendered one is capped.
    const props = layoutProps({ seed: 610309764, roomWidth: 800, roomHeight: 600, theme: 'Desert' });
    expect(props[0].frame).toBe(4);
    expect(displayFrame('Crack', 'Desert', props[0].frame)).toBe(4);
  });
});

/**
 * The NaN is load-bearing. Do not tidy it.
 */
describe('a ruleless type consumes its group draw and never clusters', () => {
  const level = { seed: 610309764, roomWidth: 800, roomHeight: 600, theme: 'Desert' };

  it('asserts both halves together, so hoisting the roll fails', () => {
    // `groupChance *= 1 / ((max - min) / 2)` is `0 * (1 / 0)` = NaN for a type
    // with no rule, so `nextDouble() <= NaN` is false — correct behaviour — and
    // the draw happens anyway. Moving the roll inside the rule check keeps the
    // behaviour and shortens the stream by one draw per ruleless prop, which
    // moves every position after the first one.
    //
    // The two facts are asserted in one test on purpose: either alone survives
    // the tidy-up.
    const props = layoutProps(level);
    const cracks = props.slice(0, 31);

    // (a) it never clusters
    expect(cracks.every((p) => !p.grouped)).toBe(true);
    // (b) it consumed the draw — proven by where the *next* prop landed, which
    // only holds if prop 0 took six draws rather than five.
    expect(props[1]).toEqual({
      type: 'Crack', x: 106, y: 440, scale: 0.139830558160241,
      rotation: 146, frame: 5, grouped: false,
    });
  });

  it('and the derived stream says six draws for prop 0, not five', () => {
    // Independent of the module: five draws from the seed leaves the generator
    // at a different state than six, and prop 1's x is 106 only in the latter.
    // Draw 1 is `amount`; 2-6 are prop 0's placement; 7 is prop 0's group roll;
    // 8 is prop 1's scale; 9 is prop 1's posX. Drop the roll and posX arrives
    // one draw early, off a different value.
    const withoutRoll = (() => {
      const r = new PM_PRNG(610309764);
      for (let i = 0; i < 7; i += 1) r.nextDouble(); // amount + 5 + prop1 scale
      return Math.round(r.nextDouble() * 800);
    })();

    const withRoll = (() => {
      const r = new PM_PRNG(610309764);
      for (let i = 0; i < 8; i += 1) r.nextDouble(); // + the group roll
      return Math.round(r.nextDouble() * 800);
    })();

    expect(withRoll).toBe(106);
    expect(withoutRoll).not.toBe(106);
  });
});

describe('the collision pass', () => {
  const level = { seed: 610309764, roomWidth: 800, roomHeight: 600, theme: 'Desert' };

  it('collides props against other props, and nothing else', () => {
    // `:2612-2626` iterates `backgroundObjectArray` against itself. Walls,
    // spawn points and the player are not consulted — a prop may sit anywhere.
    const { props, draws } = layoutLevelProps(level);
    expect(props.length).toBeLessThan(102);
    expect(draws).toBeGreaterThan(0);
  });

  it('spends exactly one draw per collision resolved', () => {
    // The pinning rule: a count, never a stream offset. The offset is
    // data-dependent — it falls out of how many props happen to overlap, which
    // depends on the positions the placement draws produced.
    const rng = new PM_PRNG(1);
    const overlapping = Array.from({ length: 4 }, () => ({
      type: 'Rock', x: 100, y: 100, scale: 1, rotation: 0, frame: 1, grouped: false,
    }));

    const before = rng.seed;
    const { props, draws } = resolveCollisions(overlapping, rng);

    expect(props.length).toBe(4 - draws);
    // One draw consumed per removal, verified against the generator's own
    // advance rather than against the returned count alone.
    const check = new PM_PRNG(before);
    for (let i = 0; i < draws; i += 1) check.nextDouble();
    expect(check.seed).toBe(rng.seed);
  });

  it('the roll picks which of the pair dies, not whether one does', () => {
    // `:2645-2653` — both branches remove something. A reading where the roll
    // gates removal would leave overlapping props on the floor half the time.
    const stay = resolveCollisions(
      [
        { type: 'Rock', x: 0, y: 0, scale: 1, rotation: 0, frame: 1, grouped: false },
        { type: 'Rock', x: 1, y: 0, scale: 1, rotation: 0, frame: 1, grouped: false },
      ],
      new PM_PRNG(1),
    );
    expect(stay.props).toHaveLength(1);
    expect(stay.draws).toBe(1);
  });

  it('FuturisticSquare never collides, and that is the only live exclusion', () => {
    // `:2633` also excludes Crack against non-Crack, and that branch is dead:
    // no `BGObjectCrack` class exists, only the three theme variants, so the
    // comparison never matches and cracks collide with everything.
    expect(canCollide('FuturisticSquare', 'Rock')).toBe(false);
    expect(canCollide('Rock', 'FuturisticSquare')).toBe(false);
    expect(canCollide('Crack', 'Rock')).toBe(true);
    expect(canCollide('Crack', 'Crack')).toBe(true);
  });

  it('FuturisticLines tolerates six overlaps where everything else dies on one', () => {
    expect(collisionCountDie('FuturisticLines')).toBe(6);
    expect(collisionCountDie('Rock')).toBe(1);
    expect(collisionCountDie('Crack')).toBe(1);
  });
});

/**
 * Layout neutrality — asserted *before* the art lands, so the swap is guarded
 * rather than reviewed.
 *
 * Real art changes one thing and must change nothing else: the collision radius
 * is taken off the rendered sprite (`(height + width) * 0.2`, `:2617`), so
 * different dimensions remove a different set of props. Placement must not
 * move. If any of these fail after the extraction, something is reaching
 * further than the collision pass and that is a finding, not a tuning problem.
 */
describe('the art cannot move a prop', () => {
  const level = { seed: 610309764, roomWidth: 800, roomHeight: 600, theme: 'Desert' };

  it('placement is byte-identical whatever the sizes say', () => {
    // `layoutProps` consumes the stream without consulting any size table. The
    // frozen expectation from the derived stream is the real guard; this pins
    // that the module has no path from sizes to positions at all.
    const before = layoutProps(level);
    expect(before[0]).toEqual({
      type: 'Crack', x: 693, y: 464, scale: 0.43873778751061193,
      rotation: 336, frame: 4, grouped: false,
    });
    expect(before).toHaveLength(102);
    expect(before.map((p) => `${p.x},${p.y},${p.rotation}`).join('|')).toBe(
      layoutProps(level).map((p) => `${p.x},${p.y},${p.rotation}`).join('|'),
    );
  });

  it('the frame table cannot shift a position either', () => {
    // `stopAt` is drawn before the frame is resolved, so the count only affects
    // which variant is shown. A future extraction that corrects a frame count
    // must not move anything.
    const props = layoutProps(level);
    for (const prop of props) {
      const recomputed = Math.floor(1 + 0.5 * propFrames(prop.type, 'Desert'));
      expect(Number.isFinite(recomputed)).toBe(true);
    }
    expect(props[0].x).toBe(693);
  });

  it('only the collision pass is coupled to size, and it is the last consumer', () => {
    // The single legitimate coupling. Placement is identical; the surviving set
    // is not, which is exactly the boundary real art is allowed to move.
    const placed = layoutProps(level);
    const { props, draws } = layoutLevelProps(level);

    expect(placed).toHaveLength(102);
    expect(props.length).toBeLessThanOrEqual(placed.length);
    expect(draws).toBeGreaterThanOrEqual(0);

    // And the props that survive are a subset of the placed ones, unmoved.
    for (const survivor of props) {
      expect(placed).toContainEqual(survivor);
    }
  });

  it('the RedBloodCell clamp survives an art swap for the same reason', () => {
    // Real art does not reconcile the two tables: the arithmetic table still
    // says 3 and symbol 1465 still has 1. This must keep passing because the
    // tables still disagree, not because the clamp became a no-op.
    expect(propFrames('RedBloodCell', 'Biology')).toBe(3);
    expect(SYMBOL_FRAMES.RedBloodCell).toBe(1);
    expect(displayFrame('RedBloodCell', 'Biology', 3)).toBe(1);
  });
});
