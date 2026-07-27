import { describe, expect, it } from 'vitest';
import {
  computeSafeRect,
  computeViewport,
  DESIGN_WIDTH,
  MAX_LOGICAL_HEIGHT,
  MAX_PIXEL_RATIO,
  MIN_LOGICAL_HEIGHT,
  roomFillZoom,
  centredCameraBounds,
  outOfBoundsRects,
  marginGradientBands,
} from './viewport';

/** A few real devices, in CSS pixels. */
const DEVICES = {
  iPhoneSE: { cssWidth: 375, cssHeight: 667, pixelRatio: 2 },
  iPhone15Pro: { cssWidth: 393, cssHeight: 852, pixelRatio: 3 },
  pixel8: { cssWidth: 412, cssHeight: 915, pixelRatio: 2.625 },
  iPadMini: { cssWidth: 744, cssHeight: 1133, pixelRatio: 2 },
  iPhone15ProLandscape: { cssWidth: 852, cssHeight: 393, pixelRatio: 3 },
  desktop: { cssWidth: 1440, cssHeight: 900, pixelRatio: 1 },
};

describe('computeViewport', () => {
  it('keeps the design width at exactly 640 units on a normal portrait phone', () => {
    const vp = computeViewport(DEVICES.iPhone15Pro);
    expect(vp.logicalWidth).toBeCloseTo(DESIGN_WIDTH, 5);
  });

  it('renders into a device-pixel backing store, clamped to MAX_PIXEL_RATIO', () => {
    const vp = computeViewport(DEVICES.iPhone15Pro); // dpr 3 -> clamped to 2
    expect(vp.pixelRatio).toBe(MAX_PIXEL_RATIO);
    expect(vp.renderWidth).toBe(393 * MAX_PIXEL_RATIO);
    expect(vp.renderHeight).toBe(852 * MAX_PIXEL_RATIO);
  });

  it('never lets the visible height fall below the original Flash camera height', () => {
    for (const device of Object.values(DEVICES)) {
      const vp = computeViewport(device);
      expect(vp.logicalHeight).toBeGreaterThanOrEqual(MIN_LOGICAL_HEIGHT - 0.001);
    }
  });

  it('never lets the visible height exceed MAX_LOGICAL_HEIGHT', () => {
    const absurdlyTall = computeViewport({ cssWidth: 320, cssHeight: 2000, pixelRatio: 1 });
    expect(absurdlyTall.logicalHeight).toBeLessThanOrEqual(MAX_LOGICAL_HEIGHT + 0.001);
    // Falling back to a height-driven fit means the width is no longer 640.
    expect(absurdlyTall.logicalWidth).toBeLessThan(DESIGN_WIDTH);
  });

  it('widens rather than crops on a landscape phone', () => {
    const vp = computeViewport(DEVICES.iPhone15ProLandscape);
    expect(vp.logicalHeight).toBeCloseTo(MIN_LOGICAL_HEIGHT, 5);
    expect(vp.logicalWidth).toBeGreaterThan(DESIGN_WIDTH);
  });

  it('maps render pixels to design units consistently', () => {
    for (const device of Object.values(DEVICES)) {
      const vp = computeViewport(device);
      expect(vp.logicalWidth * vp.zoom).toBeCloseTo(vp.renderWidth, 5);
      expect(vp.logicalHeight * vp.zoom).toBeCloseTo(vp.renderHeight, 5);
    }
  });

  it('survives a zero-sized container instead of producing NaN', () => {
    const vp = computeViewport({ cssWidth: 0, cssHeight: 0, pixelRatio: 2 });
    expect(Number.isFinite(vp.zoom)).toBe(true);
    expect(vp.zoom).toBeGreaterThan(0);
    expect(Number.isFinite(vp.logicalWidth)).toBe(true);
  });

  it('falls back to 1 for a missing or nonsensical devicePixelRatio', () => {
    expect(computeViewport({ cssWidth: 400, cssHeight: 800, pixelRatio: 0 }).pixelRatio).toBe(1);
    expect(computeViewport({ cssWidth: 400, cssHeight: 800, pixelRatio: NaN }).pixelRatio).toBe(1);
    expect(computeViewport({ cssWidth: 400, cssHeight: 800, pixelRatio: -2 }).pixelRatio).toBe(1);
  });
});

describe('computeSafeRect', () => {
  it('is the whole viewport when there are no insets', () => {
    const vp = computeViewport(DEVICES.iPhoneSE);
    const rect = computeSafeRect(vp);
    expect(rect).toEqual({
      x: 0,
      y: 0,
      width: vp.logicalWidth,
      height: vp.logicalHeight,
    });
  });

  it('converts CSS-pixel insets into design units via the camera zoom', () => {
    const vp = computeViewport(DEVICES.iPhone15Pro);
    // 59pt notch, 34pt home indicator — iPhone 15 Pro portrait.
    const rect = computeSafeRect(vp, { top: 59, right: 0, bottom: 34, left: 0 });

    // At dpr 2 and a 640-unit design width on a 393pt-wide screen, one CSS px
    // is (2 / zoom) design units.
    const unitsPerCssPx = vp.pixelRatio / vp.zoom;
    expect(rect.y).toBeCloseTo(59 * unitsPerCssPx, 5);
    expect(rect.height).toBeCloseTo(vp.logicalHeight - (59 + 34) * unitsPerCssPx, 5);
    expect(rect.width).toBeCloseTo(vp.logicalWidth, 5);
  });

  it('handles landscape side insets', () => {
    const vp = computeViewport(DEVICES.iPhone15ProLandscape);
    const rect = computeSafeRect(vp, { top: 0, right: 59, bottom: 21, left: 59 });
    expect(rect.x).toBeGreaterThan(0);
    expect(rect.width).toBeLessThan(vp.logicalWidth);
  });

  it('degrades to a cramped rect rather than a zero-sized one on absurd insets', () => {
    const vp = computeViewport(DEVICES.iPhoneSE);
    const rect = computeSafeRect(vp, { top: 9999, right: 9999, bottom: 9999, left: 9999 });
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });

  it('ignores negative insets', () => {
    const vp = computeViewport(DEVICES.iPhoneSE);
    const rect = computeSafeRect(vp, { top: -20, right: -20, bottom: -20, left: -20 });
    expect(rect.x).toBe(0);
    expect(rect.y).toBe(0);
  });
});


describe('roomFillZoom', () => {
  /** A 16:9 desktop window at dpr 1 — the common case. */
  const desktop = computeViewport({ cssWidth: 1920, cssHeight: 1080, pixelRatio: 1 });

  it('the landscape branch really does show more than 640 units', () => {
    // The premise of the whole feature, asserted rather than assumed. The zoom
    // is driven by MIN_LOGICAL_HEIGHT here, not by DESIGN_WIDTH, so the player
    // sees a wider strip than the design width.
    expect(desktop.logicalHeight).toBe(400);
    expect(Math.round(desktop.logicalWidth)).toBe(711);
    expect(desktop.logicalWidth).toBeGreaterThan(640);
  });

  it('fills the width for a 640-wide room', () => {
    const zoom = roomFillZoom(desktop, 640);
    // 640 design units must span the whole render width.
    expect(640 * zoom).toBeCloseTo(desktop.renderWidth, 6);
    expect(zoom).toBeGreaterThan(desktop.zoom);
  });

  it('leaves a room that already fills or overflows alone', () => {
    // 800 and 900 exceed the 711-unit view, so they scroll and need nothing.
    expect(roomFillZoom(desktop, 800)).toBe(desktop.zoom);
    expect(roomFillZoom(desktop, 900)).toBe(desktop.zoom);
  });

  it('is a no-op exactly at the boundary', () => {
    expect(roomFillZoom(desktop, desktop.logicalWidth)).toBe(desktop.zoom);
  });

  it('closes a 316-unit gap on 21:9, which is a third of the window', () => {
    const ultrawide = computeViewport({ cssWidth: 3440, cssHeight: 1440, pixelRatio: 1 });
    expect(Math.round(ultrawide.logicalWidth - 640)).toBe(316);
    expect(640 * roomFillZoom(ultrawide, 640)).toBeCloseTo(ultrawide.renderWidth, 6);
  });

  it('trades vertical extent for the fill, and says so in numbers', () => {
    // Zooming in shows less height: 1080 / zoom. The 640x400 room is still
    // taller than that, so it scrolls slightly rather than showing past its
    // own edge — which is the property that makes this safe.
    const zoom = roomFillZoom(desktop, 640);
    const visibleHeight = desktop.renderHeight / zoom;
    expect(Math.round(visibleHeight)).toBe(360);
    expect(visibleHeight).toBeLessThan(400);
  });

  it('refuses nonsense room widths rather than returning Infinity', () => {
    expect(roomFillZoom(desktop, 0)).toBe(desktop.zoom);
    expect(roomFillZoom(desktop, -1)).toBe(desktop.zoom);
    expect(roomFillZoom(desktop, Number.NaN)).toBe(desktop.zoom);
  });
});

/**
 * Camera bounds, asserted through Phaser's own clamp arithmetic.
 *
 * Testing `centredCameraBounds`' return value alone would only prove it does
 * what it says. What matters is what ends up *visible*, which depends on
 * `Camera.clampX` and the `midX`/`worldView` derivation — and that is exactly
 * where the original reasoning went wrong. So this reimplements that chain and
 * asserts the resulting gaps.
 */
describe('centredCameraBounds', () => {
  /** Phaser's Camera.clampX + worldView derivation, from its source. */
  function visibleRange(
    bounds: { x: number; width: number },
    cameraPixels: number,
    zoom: number,
    followWorldX: number,
  ): { from: number; to: number } {
    const displayWidth = Math.floor(cameraPixels / zoom + 0.5);
    const bx = bounds.x + (displayWidth - cameraPixels) / 2;
    const bw = Math.max(bx, bx + bounds.width - displayWidth);
    const wanted = followWorldX - cameraPixels / 2;
    const scrollX = Math.min(Math.max(wanted, bx), bw);
    const midX = scrollX + cameraPixels / 2;
    const from = midX - displayWidth / 2;
    return { from, to: from + displayWidth };
  }

  // A 1920x1080 window: zoom 2.7, so 711 design units are visible.
  const PIXELS = 1920;
  const ZOOM = 1080 / 400;

  it('reproduces the defect it exists to fix', () => {
    // Plain room bounds pin the room flush left and put every unit of slack on
    // the right. This is the reported "cut off on the right side".
    const room = { x: 0, width: 640 };
    const { from, to } = visibleRange(room, PIXELS, ZOOM, 320);

    expect(from).toBeCloseTo(0, 6);
    expect(to - 640).toBe(71);
  });

  it('splits the slack evenly for a Tower room', () => {
    const b = centredCameraBounds(640, 640, PIXELS / ZOOM, 1080 / ZOOM);
    const { from, to } = visibleRange(b, PIXELS, ZOOM, 320);

    const left = 0 - from;
    const right = to - 640;
    expect(left).toBe(right);
    expect(left).toBe(35.5);
  });

  it('splits evenly on an ultrawide window too', () => {
    const zoom = 1440 / 400;
    const pixels = 3440;
    const b = centredCameraBounds(640, 640, pixels / zoom, 1440 / zoom);
    const { from, to } = visibleRange(b, pixels, zoom, 320);

    // Not exactly equal: Phaser floors displayWidth to whole pixels
    // (955.56 -> 956), so up to half a design unit lands on one side. That is
    // rounding, not the asymmetry this fixes — which was 316 units.
    expect(Math.abs((0 - from) - (to - 640))).toBeLessThan(0.5);
    expect(0 - from).toBeCloseTo(157.78, 2);
  });

  it('leaves a room at least as wide as the view completely alone', () => {
    // The 195 levels that already fill must scroll exactly as before, so the
    // fix cannot be observable outside the case it targets.
    const b = centredCameraBounds(900, 720, 711, 400);
    expect(b).toEqual({ x: 0, y: 0, width: 900, height: 720 });
  });

  it('centres on the short axis only', () => {
    // A Tower room is 640 tall against a 400-unit view, so it scrolls
    // vertically and must not be padded.
    const b = centredCameraBounds(640, 640, 711, 400);
    expect(b.y).toBe(0);
    expect(b.height).toBe(640);
    // 711 is passed here, so the pad is exactly (711 - 640) / 2.
    expect(b.x).toBe(-35.5);
  });

  it('handles a room shorter than the view, which desktop does not hit yet', () => {
    // Same bug, other axis. Fixed now rather than left waiting for a window
    // shape that exposes it.
    const b = centredCameraBounds(640, 300, 640, 400);
    expect(b.y).toBeCloseTo(-50, 6);
    expect(b.height).toBe(400);
  });
});

describe('outOfBoundsRects', () => {
  const bounds = (roomW: number, roomH: number, viewW: number, viewH: number) =>
    centredCameraBounds(roomW, roomH, viewW, viewH);

  it('produces nothing when the room fills the view', () => {
    // The 195 wide levels must draw no dimming at all.
    expect(outOfBoundsRects(bounds(900, 720, 711, 400), 900, 720)).toEqual([]);
  });

  it('covers both side strips for a Tower room', () => {
    const b = bounds(640, 640, 711, 400);
    const rects = outOfBoundsRects(b, 640, 640);

    expect(rects).toHaveLength(2);
    expect(rects[0]).toEqual({ x: -35.5, y: 0, width: 35.5, height: 640, edge: 'left' });
    expect(rects[1]).toEqual({ x: 640, y: 0, width: 35.5, height: 640, edge: 'right' });
  });

  it('covers the whole margin and nothing inside the arena', () => {
    const roomW = 640;
    const roomH = 640;
    const b = bounds(roomW, roomH, 956, 400);
    const rects = outOfBoundsRects(b, roomW, roomH);

    const covered = rects.reduce((sum, r) => sum + r.width * r.height, 0);
    const padded = b.width * b.height;
    expect(covered).toBeCloseTo(padded - roomW * roomH, 6);

    // Nothing overlaps the playable area.
    for (const r of rects) {
      const insideX = r.x < roomW && r.x + r.width > 0;
      const insideY = r.y < roomH && r.y + r.height > 0;
      expect(insideX && insideY, `${JSON.stringify(r)} overlaps the arena`).toBe(false);
    }
  });

  it('does not overlap itself, so corners are not double-dimmed', () => {
    // Two overlapping strips would render the corners visibly darker than the
    // sides — the tell that the rects were built as four full-size bands.
    const b = { x: -40, y: -30, width: 720, height: 700 };
    const rects = outOfBoundsRects(b, 640, 640);

    for (let i = 0; i < rects.length; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const c = rects[j];
        const overlaps =
          a.x < c.x + c.width && a.x + a.width > c.x && a.y < c.y + c.height && a.y + a.height > c.y;
        expect(overlaps, `rect ${i} overlaps ${j}`).toBe(false);
      }
    }
  });

  it('handles vertical padding too', () => {
    const b = bounds(640, 300, 640, 400);
    const rects = outOfBoundsRects(b, 640, 300);

    expect(rects).toHaveLength(2);
    expect(rects[0]).toEqual({ x: 0, y: -50, width: 640, height: 50, edge: 'top' });
    expect(rects[1]).toEqual({ x: 0, y: 300, width: 640, height: 50, edge: 'bottom' });
  });
});

describe('marginGradientBands', () => {
  const strip = (edge: 'left' | 'right' | 'top' | 'bottom') =>
    edge === 'left'
      ? { x: -40, y: 0, width: 40, height: 640, edge }
      : edge === 'right'
        ? { x: 640, y: 0, width: 40, height: 640, edge }
        : edge === 'top'
          ? { x: 0, y: -40, width: 640, height: 40, edge }
          : { x: 0, y: 640, width: 640, height: 40, edge };

  it('covers the strip exactly, with no gaps or overlap', () => {
    const bands = marginGradientBands(strip('right'), 24, 0.55);
    expect(bands).toHaveLength(24);
    expect(bands[0].x).toBe(640);
    const last = bands[23];
    expect(last.x + last.width).toBeCloseTo(680, 6);
    expect(bands.reduce((sum, b) => sum + b.width, 0)).toBeCloseTo(40, 6);
  });

  it('is transparent against the arena and darkest at the screen edge', () => {
    // The whole point of the change: a flat fill put a hard line at the arena
    // boundary, which read as a wall. Nearest the arena must be lightest.
    for (const edge of ['left', 'right', 'top', 'bottom'] as const) {
      const bands = marginGradientBands(strip(edge), 8, 0.55);
      const nearArena = edge === 'left' || edge === 'top' ? bands[7] : bands[0];
      const nearScreen = edge === 'left' || edge === 'top' ? bands[0] : bands[7];

      expect(nearArena.alpha, `${edge} near arena`).toBeLessThan(nearScreen.alpha);
      expect(nearArena.alpha, `${edge} near arena`).toBeLessThan(0.1);
    }
  });

  it('never reaches 0 or the peak, so neither edge is hard', () => {
    // Sampled at band centres. A band at exactly 0 would be a wasted draw and
    // one at the peak would put a hard edge back at the screen boundary.
    const bands = marginGradientBands(strip('right'), 24, 0.55);
    for (const b of bands) {
      expect(b.alpha).toBeGreaterThan(0);
      expect(b.alpha).toBeLessThan(0.55);
    }
  });

  it('increases monotonically away from the arena', () => {
    const bands = marginGradientBands(strip('right'), 24, 0.55);
    for (let i = 1; i < bands.length; i += 1) {
      expect(bands[i].alpha).toBeGreaterThan(bands[i - 1].alpha);
    }
  });

  it('slices the correct axis', () => {
    const horizontal = marginGradientBands(strip('right'), 4, 0.55);
    expect(horizontal.every((b) => b.height === 640)).toBe(true);

    const vertical = marginGradientBands(strip('bottom'), 4, 0.55);
    expect(vertical.every((b) => b.width === 640)).toBe(true);
  });

  it('returns nothing for a nonsensical step count', () => {
    expect(marginGradientBands(strip('left'), 0, 0.55)).toEqual([]);
  });
});
