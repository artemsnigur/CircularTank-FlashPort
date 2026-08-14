/**
 * The minimap's geometry — `PartInterface.drawMinimap` (`:652-694`).
 *
 * Expected values are computed by hand from the AS3 expressions, never read
 * back out of `minimap.ts`. Where a figure looks arbitrary the arithmetic is
 * written beside it, because "80 / roomWidth" is the sort of term that stays
 * plausible while being wrong by a factor.
 */
import { describe, expect, it } from 'vitest';

import {
  MINIMAP_BOSS_DOT,
  MINIMAP_DOT,
  MINIMAP_ENEMY,
  MINIMAP_SIZE,
  MINIMAP_TANK,
  MINIMAP_VIEWPORT_ALPHA,
  clampToPanel,
  dotSize,
  marker,
  minimapPlan,
  viewportRect,
} from './minimap';

/** A room twice the camera's width and four times its height. */
const room = { width: 1280, height: 1600 };

describe('the panel', () => {
  it('is the AS3`s 80 square', () => {
    // `:658` `drawRect(0, 0, 80, 80)`. Stated from the source: every other
    // figure in this file is a fraction of it, so a change here silently
    // rescales the whole map.
    expect(MINIMAP_SIZE).toBe(80);
  });
});

describe('the viewport rectangle', () => {
  it('places the camera by its share of the room', () => {
    // Camera at (640, 800) in a 1280x1600 room is halfway in both axes, so the
    // rect starts at 40,40 — half of 80.
    const rect = viewportRect({ x: 640, y: 800, width: 640, height: 400 }, room);

    expect(rect.x).toBe(40);
    expect(rect.y).toBe(40);
  });

  it('sizes it by the camera`s share of the room', () => {
    // 80 * 640 / 1280 = 40 wide; 80 * 400 / 1600 = 20 tall.
    const rect = viewportRect({ x: 0, y: 0, width: 640, height: 400 }, room);

    expect(rect.width).toBe(40);
    expect(rect.height).toBe(20);
  });

  it('fills the panel when the camera sees the whole room', () => {
    // The counterpart to both tests above, and the case a scale factor applied
    // to the wrong axis still passes the first one.
    const rect = viewportRect({ x: 0, y: 0, width: 900, height: 720 }, { width: 900, height: 720 });

    expect(rect).toEqual({ x: 0, y: 0, width: MINIMAP_SIZE, height: MINIMAP_SIZE });
  });

  it('treats a negative camera position as the AS3`s container offset', () => {
    // `:669` wraps `Math.abs` around `cameraPosX`, which is negative in the
    // original because it is the *layer* offset rather than a world point.
    // Phaser hands us a positive `worldView.x`, so this only matters if a
    // caller ever passes the AS3 form — and then it must not land off-panel.
    const positive = viewportRect({ x: 640, y: 800, width: 640, height: 400 }, room);
    const negative = viewportRect({ x: -640, y: -800, width: 640, height: 400 }, room);

    expect(negative).toEqual(positive);
  });

  /**
   * **The live-camera consequence.** A 640x400 room on a tall phone gives a
   * logical camera height near 1385, so the faithful rect is 277 tall in an
   * 80px box. The AS3 masks it; `clampToPanel` is that mask.
   */
  it('computes a rect larger than the panel, and the clamp is what hides it', () => {
    const camera = { x: 0, y: 0, width: 640, height: 1385 };
    const small = { width: 640, height: 400 };

    // 80 * 1385 / 400 = 277 — the honest figure, kept inspectable.
    expect(viewportRect(camera, small).height).toBe(277);
    expect(clampToPanel(viewportRect(camera, small)).height).toBe(MINIMAP_SIZE);
  });

  it('leaves a rect that already fits completely alone', () => {
    // The counterpart: the clamp must not be a blanket shrink. Without this,
    // "clamps to 80" would be satisfied by a function that returned the panel
    // every time.
    const rect = viewportRect({ x: 640, y: 800, width: 640, height: 400 }, room);

    expect(clampToPanel(rect)).toEqual(rect);
  });

  it('keeps a rect starting inside the panel from running past its edge', () => {
    // x 60 + width 40 would reach 100; the mask cuts it at 80.
    expect(clampToPanel({ x: 60, y: 0, width: 40, height: 10 })).toEqual({
      x: 60,
      y: 0,
      width: 20,
      height: 10,
    });
  });
});

describe('the markers', () => {
  it('centres a dot on the thing it marks', () => {
    // Tank at the room's centre: 80/2 = 40, less half of the 4px dot = 38.
    const dot = marker(640, 800, room);

    expect(dot).toEqual({ x: 38, y: 38, width: MINIMAP_DOT, height: MINIMAP_DOT });
  });

  it('gives a boss a dot twice the size, still centred', () => {
    // `:682` — 8px, offset by 4 rather than 2. Both halves matter: the size
    // alone would hang the dot down-right of the boss.
    const dot = marker(640, 800, room, MINIMAP_BOSS_DOT);

    expect(dot).toEqual({ x: 36, y: 36, width: MINIMAP_BOSS_DOT, height: MINIMAP_BOSS_DOT });
  });

  it('picks the size from whether it is a boss', () => {
    expect(dotSize(true)).toBe(MINIMAP_BOSS_DOT);
    expect(dotSize(false)).toBe(MINIMAP_DOT);
  });

  it('puts a corner enemy in the corresponding corner', () => {
    // The origin case, where an inverted axis or a swapped room dimension
    // still passes the centred-dot test above.
    expect(marker(0, 0, room)).toMatchObject({ x: -2, y: -2 });
    expect(marker(room.width, room.height, room)).toMatchObject({ x: 78, y: 78 });
  });

  it('scales the two axes independently', () => {
    // The room is 1280x1600, so the same world coordinate must land at
    // different panel coordinates on each axis: 320 -> 20 across, 320 -> 16
    // down. A single shared scale factor passes every test above and fails
    // this one.
    const dot = marker(320, 320, room);

    expect(dot.x).toBe(20 - MINIMAP_DOT / 2);
    expect(dot.y).toBe(16 - MINIMAP_DOT / 2);
  });
});

describe('a degenerate room', () => {
  it('collapses to the origin rather than producing Infinity', () => {
    // A zero-sized room is a data fault; painting the whole panel with one dot
    // would read as a rendering bug and send the next reader to the wrong file.
    expect(marker(10, 10, { width: 0, height: 0 })).toMatchObject({ x: -2, y: -2 });
    expect(viewportRect({ x: 0, y: 0, width: 640, height: 400 }, { width: 0, height: 0 })).toEqual({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
    });
  });
});

/**
 * The plan is what the scene paints, so this is where the *picture* is pinned
 * rather than the arithmetic. `GameplayScene.drawMinimap` is a loop over these
 * fills and nothing else, which is what makes a driven test possible at all.
 */
describe('the draw plan', () => {
  const base = {
    camera: { x: 0, y: 0, width: 640, height: 400 },
    room,
    enemies: [],
    flag: null,
    tank: { x: 640, y: 800 },
  };

  it('draws ground, viewport, enemies, flag, then tank', () => {
    // `:657` -> `:668` -> `:672` -> `:687` -> `:692`. **The order is the
    // rule**: the tank goes last so an enemy standing on it cannot hide it,
    // and the translucent viewport goes under the dots so it tints the ground
    // instead of washing them out.
    const plan = minimapPlan({
      ...base,
      enemies: [{ x: 100, y: 100, boss: false }, { x: 200, y: 200, boss: true }],
      flag: { x: 300, y: 300 },
    });

    expect(plan.map((f) => f.kind)).toEqual([
      'ground',
      'viewport',
      'enemy',
      'boss',
      'flag',
      'tank',
    ]);
  });

  it('omits the flag when there is none', () => {
    // The counterpart: every other mode passes `null`, and a flag dot on a
    // Boss level would be a black square marking nothing.
    expect(minimapPlan(base).map((f) => f.kind)).toEqual(['ground', 'viewport', 'tank']);
  });

  it('paints the tank white and the enemies red', () => {
    // Colour is what tells the player which dot is theirs; swapping them is
    // invisible to every geometry test above.
    const plan = minimapPlan({ ...base, enemies: [{ x: 100, y: 100, boss: false }] });

    expect(plan.find((f) => f.kind === 'tank')?.colour).toBe(MINIMAP_TANK);
    expect(plan.find((f) => f.kind === 'enemy')?.colour).toBe(MINIMAP_ENEMY);
    expect(plan.find((f) => f.kind === 'viewport')?.alpha).toBe(MINIMAP_VIEWPORT_ALPHA);
    // And everything else is opaque — `:657` and `:672` take no alpha.
    expect(plan.filter((f) => f.kind !== 'viewport').every((f) => f.alpha === 1)).toBe(true);
  });

  it('clips every fill to the panel, dots included', () => {
    // A dot is centred, so one on the room's edge hangs 2px outside. The AS3
    // masks it (`:286`); dropping the clip on dots would let them bleed over
    // whatever the panel sits on.
    const plan = minimapPlan({
      ...base,
      enemies: [{ x: 0, y: 0, boss: false }],
      tank: { x: room.width, y: room.height },
    });

    for (const fill of plan) {
      expect(fill.rect.x, fill.kind).toBeGreaterThanOrEqual(0);
      expect(fill.rect.y, fill.kind).toBeGreaterThanOrEqual(0);
      expect(fill.rect.x + fill.rect.width, fill.kind).toBeLessThanOrEqual(MINIMAP_SIZE);
      expect(fill.rect.y + fill.rect.height, fill.kind).toBeLessThanOrEqual(MINIMAP_SIZE);
    }
  });

  it('keeps one dot per enemy, however many there are', () => {
    // The wave system puts up to `maxEnemies` on the field; a plan that
    // deduplicated by position would quietly hide a stack.
    const enemies = Array.from({ length: 12 }, (_, i) => ({ x: 100, y: 100 + i, boss: false }));

    expect(minimapPlan({ ...base, enemies }).filter((f) => f.kind === 'enemy')).toHaveLength(12);
  });
});
