/**
 * Font loading that cannot fail the boot.
 *
 * Extracted from BootScene so it can be unit-tested, and because it was the
 * source of a boot-stranding bug worth naming: `document.fonts.load()` rejects
 * (it does not merely resolve false) when a face fails to fetch *or fails to
 * parse*. Chrome runs every font through the OpenType Sanitizer, and TTFs
 * reconstructed by JPEXS from Flash font assets are exactly the kind of thing
 * it rejects.
 *
 * The original code awaited `Promise.race([Promise.all(loads), timeout])`. A
 * race rejects as soon as any input rejects, so the timeout guarded a hang but
 * not a rejection — and since Phaser does not await `Scene.create()`, the
 * rejection was swallowed and the game silently never left the Boot scene.
 *
 * Contract now: this function **never rejects**. A font that will not load is
 * reported as `loaded: false` and the game continues in a fallback face.
 */
import type { FontReport } from '../events/GameEvents';

export interface FontSpec {
  family: string;
  file: string;
}

export interface LoadFontsOptions {
  /** Per-font budget. A face that never settles must not deadlock boot. */
  timeoutMs?: number;
  /** Injectable for tests. */
  fontSet?: FontFaceSet | null;
  /** Injectable for tests; returns measured vs. fallback widths. */
  measure?: (family: string) => { measured: number; fallback: number };
}

export const DEFAULT_FONT_TIMEOUT_MS = 6000;

/** Sample string with varied glyph widths; a short one can collide by chance. */
const MEASURE_SAMPLE = 'Achievements 0123456789 WTF Cake';
const FALLBACK_FAMILY = 'monospace';

/**
 * Measures a string in a candidate family against a deliberately different
 * fallback.
 *
 * `document.fonts.check()` alone is not enough: it can report true for a face
 * the browser did not actually apply. Identical widths mean the fallback was
 * substituted.
 */
export function measureFamily(
  family: string,
  fallback = FALLBACK_FAMILY,
): { measured: number; fallback: number } {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { measured: 0, fallback: 0 };

  ctx.font = `48px "${family}", ${fallback}`;
  const measured = ctx.measureText(MEASURE_SAMPLE).width;
  ctx.font = `48px ${fallback}`;
  const fallbackWidth = ctx.measureText(MEASURE_SAMPLE).width;

  return { measured, fallback: fallbackWidth };
}

/** Resolves to `null` on timeout instead of rejecting. */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise<T | null>((resolve) => {
    const timer = globalThis.setTimeout(() => resolve(null), ms);
    promise.then(
      (value) => {
        globalThis.clearTimeout(timer);
        resolve(value);
      },
      () => {
        // Swallowed on purpose: a font that will not parse is a degraded
        // appearance, never a failed boot. The verdict is in the report.
        globalThis.clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/**
 * Requests each face, then verifies it actually applied.
 *
 * Fonts are loaded independently rather than as one `Promise.all`, so a single
 * unparseable face cannot take the others down with it.
 */
export async function loadGameFonts(
  fonts: readonly FontSpec[],
  options: LoadFontsOptions = {},
): Promise<FontReport[]> {
  const {
    timeoutMs = DEFAULT_FONT_TIMEOUT_MS,
    fontSet = typeof document !== 'undefined' && 'fonts' in document ? document.fonts : null,
    measure = measureFamily,
  } = options;

  if (!fontSet) {
    return fonts.map((font) => ({
      family: font.family,
      file: font.file,
      loaded: false,
      distinctFromFallback: false,
      measuredWidth: 0,
      fallbackWidth: 0,
    }));
  }

  // `document.fonts.load()` is what forces a lazily-declared @font-face to
  // download. `document.fonts.ready` alone resolves immediately when nothing
  // has requested the face yet — the classic reason a font "is loaded" but the
  // first Phaser Text still renders in a fallback.
  await Promise.all(
    fonts.map((font) => withTimeout(fontSet.load(`16px "${font.family}"`), timeoutMs)),
  );
  await withTimeout(Promise.resolve(fontSet.ready), timeoutMs);

  return fonts.map((font) => {
    let loaded = false;
    try {
      loaded = fontSet.check(`16px "${font.family}"`);
    } catch {
      loaded = false;
    }

    const { measured, fallback } = measure(font.family);
    const distinctFromFallback = measured > 0 && Math.abs(measured - fallback) > 0.5;

    if (!loaded || !distinctFromFallback) {
      // Visible, because the symptom otherwise is just "metrics look slightly
      // off" and nobody notices until layout breaks on a device.
      console.warn(
        `[fonts] "${font.family}" (${font.file}) did not resolve to a distinct face ` +
          `(loaded=${loaded}, distinct=${distinctFromFallback}). Rendering in a fallback. ` +
          'JPEXS-exported TTFs are often rejected by the browser\'s font sanitizer; ' +
          'converting to WOFF2 usually fixes it.',
      );
    }

    return {
      family: font.family,
      file: font.file,
      loaded,
      distinctFromFallback,
      measuredWidth: measured,
      fallbackWidth: fallback,
    };
  });
}
