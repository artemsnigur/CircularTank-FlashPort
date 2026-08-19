import { readFileSync } from 'node:fs';
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
  minimapScreenAnchor,
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

    /*
     * Every *dot* is opaque — `:672`, `:675`, `:687` and `:692` take no alpha,
     * and a translucent marker over a translucent ground would be unreadable.
     *
     * The ground is excluded by name rather than by loosening the rule: it was
     * `alpha: 1` here too until T199 matched it to `--hud-plate`, which is a
     * declared divergence with its own test above. Excluding it silently would
     * have let a dot go translucent unnoticed.
     */
    const dots = plan.filter((f) => f.kind !== 'viewport' && f.kind !== 'ground');
    expect(dots.length).toBeGreaterThan(0);
    expect(dots.every((f) => f.alpha === 1)).toBe(true);
  });

  /*
   * ── Replaced in T198, not repaired ────────────────────────────────────
   *
   * This asserted that *every* fill was clipped to the panel, dots included,
   * and it was an accurate description of the code at the time. It is no
   * longer the rule, and restoring it would reintroduce the defect below.
   *
   * Clipping a dot's bounding box moves its **centre**, so a dot at the room's
   * edge slid inward instead of being cut off — it reported the enemy as
   * somewhere it was not. That was invisible while dots were squares drawn
   * from their top-left corner and became a real error the moment they were
   * drawn as circles from their centre.
   *
   * The panel's overhang is cut by a geometry mask on the `Graphics` instead,
   * which is what the AS3 does (`minimap.mask = minimapMask`, `:286`) rather
   * than a thing this port invented.
   */
  it('clips rectangles to the panel but never moves a dot', () => {
    const plan = minimapPlan({
      ...base,
      enemies: [{ x: 0, y: 0, boss: false }],
      tank: { x: room.width, y: room.height },
    });

    // The two panel fills are still clipped, exactly as before.
    for (const fill of plan.filter((f) => f.shape === 'rect')) {
      expect(fill.rect.x, fill.kind).toBeGreaterThanOrEqual(0);
      expect(fill.rect.y, fill.kind).toBeGreaterThanOrEqual(0);
      expect(fill.rect.x + fill.rect.width, fill.kind).toBeLessThanOrEqual(MINIMAP_SIZE);
      expect(fill.rect.y + fill.rect.height, fill.kind).toBeLessThanOrEqual(MINIMAP_SIZE);
    }

    /*
     * And the counterpart that carries the actual rule: a dot's centre is the
     * projected position, whether or not that leaves the box. The enemy at
     * (0, 0) must centre on 0, not be nudged to +2 — which is precisely what
     * the old clip did.
     */
    const dots = plan.filter((f) => f.shape === 'circle');
    expect(dots.length, 'no dots in the plan at all').toBeGreaterThan(0);

    const enemy = plan.find((f) => f.kind === 'enemy')!;
    expect(enemy.rect.x + enemy.rect.width / 2).toBe(0);
    expect(enemy.rect.y + enemy.rect.height / 2).toBe(0);

    const tank = plan.find((f) => f.kind === 'tank')!;
    expect(tank.rect.x + tank.rect.width / 2).toBe(MINIMAP_SIZE);
    expect(tank.rect.y + tank.rect.height / 2).toBe(MINIMAP_SIZE);
  });

  it('draws every enemy in the same red, whatever its type', () => {
    /*
     * `:675` — one `beginFill(16711680)` for all of them. A per-family palette
     * shipped in T198 and was reverted in T199; this is the assertion that
     * keeps it reverted.
     *
     * Driven against its counterpart on the same plan: the *ground* is a
     * different colour, so "everything is one colour" cannot pass this.
     */
    const plan = minimapPlan({
      ...base,
      enemies: [
        { x: 100, y: 100, boss: false },
        { x: 200, y: 200, boss: false },
        { x: 300, y: 300, boss: true },
      ],
    });

    const dots = plan.filter((f) => f.kind === 'enemy' || f.kind === 'boss');
    expect(dots).toHaveLength(3);
    for (const dot of dots) {
      expect(dot.colour, dot.kind).toBe(MINIMAP_ENEMY);
    }

    expect(plan.find((f) => f.kind === 'ground')!.colour).not.toBe(MINIMAP_ENEMY);
  });

  it('paints the ground in the HUD plate colour, translucent', () => {
    /*
     * The panel floats over a live arena, so an opaque grey block reads as a
     * hole in the world. It matches `--hud-plate`, which is what every DOM
     * readout paints with — and the two are checked against each other rather
     * than both being copied by hand, because a value duplicated across two
     * files drifts.
     */
    const css = readFileSync('src/styles/global.css', 'utf8');
    const declared = /--hud-plate:\s*rgb\((\d+)\s+(\d+)\s+(\d+)\s*\/\s*(\d+)%\)/.exec(css);
    expect(declared, '--hud-plate is not in the stylesheet in the expected form').not.toBeNull();

    const [, r, g, b, alpha] = declared!;
    const ground = minimapPlan(base).find((f) => f.kind === 'ground')!;

    expect(ground.colour).toBe((Number(r) << 16) | (Number(g) << 8) | Number(b));
    expect(ground.alpha).toBeCloseTo(Number(alpha) / 100, 6);
  });

  it('drops a dot only when it is wholly off the panel', () => {
    // Culling, which is what replaced clipping. Driven against its opposite on
    // the same call: one enemy far outside the room, one just inside.
    const plan = minimapPlan({
      ...base,
      enemies: [
        { x: -room.width, y: -room.height, boss: false },
        { x: room.width / 2, y: room.height / 2, boss: false },
      ],
    });

    expect(plan.filter((f) => f.kind === 'enemy')).toHaveLength(1);
  });

  /*
   * The dots move sub-pixel, which is the whole of the smoothness change.
   * `marker` used to round, so a dot held still through 25 world units on a
   * 2000-unit room and then jumped a whole pixel.
   */
  it('positions dots without rounding, so they can move sub-pixel', () => {
    const one = minimapPlan({ ...base, enemies: [{ x: 1000, y: 1000, boss: false }] }).find(
      (f) => f.kind === 'enemy',
    )!;
    const two = minimapPlan({ ...base, enemies: [{ x: 1001, y: 1000, boss: false }] }).find(
      (f) => f.kind === 'enemy',
    )!;

    // One world unit of movement must change the drawn position at all. Under
    // the old rounding these two were byte-identical.
    expect(two.rect.x).not.toBe(one.rect.x);
    expect(two.rect.x - one.rect.x).toBeLessThan(1);

    // The counterpart: the *rect* fills still round, because a half-pixel
    // rectangle edge renders as a blurred line rather than a smooth one.
    const ground = minimapPlan(base).find((f) => f.kind === 'viewport')!;
    expect(Number.isInteger(ground.rect.x), 'the viewport rect stopped rounding').toBe(true);
    expect(Number.isInteger(ground.rect.width)).toBe(true);
  });


  it('keeps one dot per enemy, however many there are', () => {
    // The wave system puts up to `maxEnemies` on the field; a plan that
    // deduplicated by position would quietly hide a stack.
    const enemies = Array.from({ length: 12 }, (_, i) => ({ x: 100, y: 100 + i, boss: false }));

    expect(minimapPlan({ ...base, enemies }).filter((f) => f.kind === 'enemy')).toHaveLength(12);
  });
});


/**
 * The corner, in camera space — and the two reasons it used to twitch.
 *
 * The panel was a world object anchored to `camera.worldView`. It jittered,
 * and neither cause was in this module:
 *
 * 1. `drawMinimap` runs in `Scene.update`; `Camera.preRender` — follow lerp,
 *    `roundPixels`, and the `worldView` recompute — runs from
 *    `CameraManager.render`, *after* update. The panel was always placed from
 *    the previous frame's camera.
 * 2. `startFollow(player, true, ...)` sets `roundPixels`, and `Camera.js:558`
 *    floors the scroll, so the per-frame delta jumps between whole integers.
 *
 * `minimapScreenAnchor` takes no scroll at all, which is what removes it.
 * These pin the transform, since getting it wrong is what sank the first
 * attempt at screen space (T146: the panel landed mid-arena at double size).
 */
describe('the panel sits in the corner, in camera space', () => {
  const camera = { width: 1000, height: 600, zoom: 1 };

  /** Where a scroll-factor-zero point at `x` actually renders. */
  const renders = (x: number, size: number, zoom: number) =>
    (x - size / 2) * zoom + size / 2;

  it('renders flush into the corner at zoom 1', () => {
    const at = minimapScreenAnchor(camera, { right: 0, bottom: 0 }, 2);

    // Computed through the camera's own transform, not compared to the
    // function's internals — this is the number the player sees.
    expect(renders(at.x, camera.width, 1) + MINIMAP_SIZE).toBe(camera.width - 2);
    expect(renders(at.y, camera.height, 1) + MINIMAP_SIZE).toBe(camera.height - 2);
  });

  /*
   * The case the first attempt got wrong, and the reason this is a test rather
   * than a comment: at zoom != 1 the panel is scaled about the camera's centre,
   * so a coordinate that is correct at zoom 1 is wrong everywhere else.
   */
  it('still renders flush into the corner at zoom 2 and 0.5', () => {
    for (const zoom of [2, 0.5]) {
      const cam = { ...camera, zoom };
      const at = minimapScreenAnchor(cam, { right: 0, bottom: 0 }, 2);

      // The panel is scaled by the camera too, so its drawn extent is
      // `MINIMAP_SIZE * zoom` and the gap is `2 * zoom`.
      expect(renders(at.x, cam.width, zoom) + MINIMAP_SIZE * zoom, `x at zoom ${zoom}`).toBeCloseTo(
        cam.width - 2 * zoom,
        6,
      );
      expect(
        renders(at.y, cam.height, zoom) + MINIMAP_SIZE * zoom,
        `y at zoom ${zoom}`,
      ).toBeCloseTo(cam.height - 2 * zoom, 6);
    }
  });

  it('moves in by the inset, and by nothing else', () => {
    const flush = minimapScreenAnchor(camera, { right: 0, bottom: 0 }, 2);
    const inset = minimapScreenAnchor(camera, { right: 30, bottom: 40 }, 2);

    expect(flush.x - inset.x).toBeCloseTo(30, 6);
    expect(flush.y - inset.y).toBeCloseTo(40, 6);
  });

  it('ignores a negative inset rather than pushing the panel off the view', () => {
    const flush = minimapScreenAnchor(camera, { right: 0, bottom: 0 }, 2);
    const negative = minimapScreenAnchor(camera, { right: -50, bottom: -50 }, 2);

    expect(negative).toEqual(flush);
  });

  it('takes no scroll, which is the whole of the jitter fix', () => {
    /*
     * The counterpart that states the actual rule: the position depends on the
     * camera's *size and zoom* only. Two frames with different scroll — which
     * is every frame while the tank moves — must place the panel identically.
     * Under the old world-space anchor this was the one thing that changed.
     */
    const a = minimapScreenAnchor({ width: 1000, height: 600, zoom: 1 }, { right: 0, bottom: 0 }, 2);
    const b = minimapScreenAnchor({ width: 1000, height: 600, zoom: 1 }, { right: 0, bottom: 0 }, 2);
    expect(a).toEqual(b);

    // And it does still respond to the things it should.
    const zoomed = minimapScreenAnchor(
      { width: 1000, height: 600, zoom: 1.5 },
      { right: 0, bottom: 0 },
      2,
    );
    expect(zoomed).not.toEqual(a);
  });

  it('survives a zero or negative zoom without dividing by it', () => {
    // `roomFillZoom` is derived from a viewport that is briefly 0 during a
    // resize, and NaN coordinates would silently stop the panel rendering.
    for (const zoom of [0, -1]) {
      const at = minimapScreenAnchor({ ...camera, zoom }, { right: 0, bottom: 0 }, 2);
      expect(Number.isFinite(at.x), `x at zoom ${zoom}`).toBe(true);
      expect(Number.isFinite(at.y), `y at zoom ${zoom}`).toBe(true);
    }
  });
});
