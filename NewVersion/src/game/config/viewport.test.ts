import { describe, expect, it } from 'vitest';
import {
  computeSafeRect,
  computeViewport,
  DESIGN_WIDTH,
  MAX_LOGICAL_HEIGHT,
  MAX_PIXEL_RATIO,
  MIN_LOGICAL_HEIGHT,
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
