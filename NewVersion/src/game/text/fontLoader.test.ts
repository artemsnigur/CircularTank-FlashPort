/**
 * Regression tests for the boot-stranding bug.
 *
 * A rejecting `document.fonts.load()` used to propagate out of the async
 * `Scene.create()`, which Phaser does not await — so the game silently never
 * left the Boot scene and the UI showed "Loading" forever. The contract these
 * tests pin down is simply: `loadGameFonts` never rejects.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { loadGameFonts } from './fontLoader';

const FONTS = [
  { family: 'SWFMainFont', file: '50_Main_font_JG.ttf' },
  { family: 'SWFMainFont2', file: '49_Main_font2_Arial.ttf' },
];

/** Minimal stand-in for the parts of FontFaceSet we use. */
function makeFontSet(overrides: {
  load?: (spec: string) => Promise<unknown>;
  check?: (spec: string) => boolean;
  ready?: Promise<unknown>;
}): FontFaceSet {
  return {
    load: overrides.load ?? (() => Promise.resolve([])),
    check: overrides.check ?? (() => true),
    ready: overrides.ready ?? Promise.resolve(),
  } as unknown as FontFaceSet;
}

const distinctMeasure = () => ({ measured: 300, fallback: 200 });
const fallbackMeasure = () => ({ measured: 200, fallback: 200 });

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadGameFonts', () => {
  it('reports both fonts as loaded when everything resolves', async () => {
    const reports = await loadGameFonts(FONTS, {
      fontSet: makeFontSet({}),
      measure: distinctMeasure,
    });

    expect(reports).toHaveLength(2);
    expect(reports.every((r) => r.loaded && r.distinctFromFallback)).toBe(true);
  });

  it('does not reject when a font fails to parse', async () => {
    // This is the exact failure that stranded the boot: Chrome rejects
    // document.fonts.load() for a face its sanitizer refuses.
    const fontSet = makeFontSet({
      load: (spec) =>
        spec.includes('SWFMainFont2')
          ? Promise.reject(new Error('OTS parsing error: invalid sfntVersion'))
          : Promise.resolve([]),
      check: (spec) => !spec.includes('SWFMainFont2'),
    });

    const reports = await loadGameFonts(FONTS, { fontSet, measure: distinctMeasure });

    expect(reports).toHaveLength(2);
    expect(reports.find((r) => r.family === 'SWFMainFont')?.loaded).toBe(true);
    expect(reports.find((r) => r.family === 'SWFMainFont2')?.loaded).toBe(false);
  });

  it('does not let one bad font take down the others', async () => {
    const fontSet = makeFontSet({
      load: () => Promise.reject(new Error('network error')),
      check: () => false,
    });

    // Resolves rather than throwing — that is the whole point.
    await expect(
      loadGameFonts(FONTS, { fontSet, measure: fallbackMeasure }),
    ).resolves.toHaveLength(2);
  });

  it('resolves within the timeout when a font never settles', async () => {
    vi.useFakeTimers();
    try {
      const fontSet = makeFontSet({
        load: () => new Promise(() => undefined), // never settles
        check: () => false,
      });

      const pending = loadGameFonts(FONTS, {
        fontSet,
        measure: fallbackMeasure,
        timeoutMs: 1000,
      });

      await vi.advanceTimersByTimeAsync(1500);
      const reports = await pending;

      expect(reports).toHaveLength(2);
      expect(reports.every((r) => !r.loaded)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('does not reject when document.fonts.ready itself rejects', async () => {
    const fontSet = makeFontSet({ ready: Promise.reject(new Error('boom')) });
    await expect(
      loadGameFonts(FONTS, { fontSet, measure: distinctMeasure }),
    ).resolves.toHaveLength(2);
  });

  it('survives a throwing check()', async () => {
    const fontSet = makeFontSet({
      check: () => {
        throw new SyntaxError('bad font shorthand');
      },
    });

    const reports = await loadGameFonts(FONTS, { fontSet, measure: distinctMeasure });
    expect(reports.every((r) => !r.loaded)).toBe(true);
  });

  it('flags a font that loaded but was silently substituted', async () => {
    // check() says yes, but the measured width equals the fallback — the face
    // did not actually apply.
    const reports = await loadGameFonts(FONTS, {
      fontSet: makeFontSet({ check: () => true }),
      measure: fallbackMeasure,
    });

    expect(reports.every((r) => r.loaded)).toBe(true);
    expect(reports.every((r) => !r.distinctFromFallback)).toBe(true);
  });

  it('degrades cleanly when the platform has no FontFaceSet', async () => {
    const reports = await loadGameFonts(FONTS, { fontSet: null });
    expect(reports).toHaveLength(2);
    expect(reports.every((r) => !r.loaded)).toBe(true);
  });
});
