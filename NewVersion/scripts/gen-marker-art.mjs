#!/usr/bin/env node
/**
 * Generates `src/game/ui/markerArt.ts` — the frames of the two off-screen
 * marker clips.
 *
 *   node scripts/gen-marker-art.mjs [--check]
 *
 * Derived from `SPRITE_SHAPES`, as `gen-bestiary-art.mjs` and
 * `gen-upgrade-art.mjs` are.
 *
 * ── What is checked ───────────────────────────────────────────────────────
 * Both clips are one shape per frame, which makes the frame *count* the whole
 * contract — and both counts are load-bearing in a way that fails silently:
 *
 *  - `MarkerEnemy` must have **2**. Frame 2 is the Defense-mode danger marker
 *    (`PartInterface.as:606`); a one-frame clip would show the ordinary arrow
 *    for an enemy about to cross the line, which is the one case the frame
 *    exists for.
 *  - `MarkerFlag` must have **8**, one per direction. `markTheFlag` indexes
 *    them by compass point (`:340`-`:420`), so a missing frame points the
 *    player the wrong way rather than not at all.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPRITE_SHAPES } from './lib/sprite-shapes.mjs';
import { MARKER_SPRITE_IDS } from './lib/marker-sprites.mjs';

/**
 * Raster scale, matching `UNIT_RASTER_SCALE`. The markers are drawn at their
 * authored size, so the texture is oversampled and the draw divides by this —
 * the same coupling `manifest.ts` names twice, and the one that made the tank
 * come out double size when it was left unnamed.
 */
const RASTER_SCALE = 4;

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const shapesDir = resolve(projectRoot, '../SWFimported/shapes');

/** Authored width/height straight off the SVG root, as gen-projectile-art does. */
function nativeSize(shapeId) {
  const file = join(shapesDir, `${shapeId}.svg`);
  if (!existsSync(file)) return null;
  const svg = readFileSync(file, 'utf8');
  // The word boundary matters: `stroke-width="2px"` would otherwise match
  // first on any shape that carries one.
  const width = /\bwidth="([\d.]+)px"/.exec(svg);
  const height = /\bheight="([\d.]+)px"/.exec(svg);
  if (!width || !height) return null;
  return { width: Number(width[1]), height: Number(height[1]) };
}
const check = process.argv.includes('--check');

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

/** Frame counts the consumers depend on — see the header. */
const EXPECTED_FRAMES = { MarkerEnemy: 2, MarkerFlag: 8 };

const clips = Object.entries(MARKER_SPRITE_IDS).map(([name, symbol]) => {
  const sprite = SPRITE_SHAPES[symbol];
  if (!sprite) fail(`Sprite ${symbol} (${name}) is not in SPRITE_SHAPES — run sprites:data first.`);

  const timeline = sprite.timeline;
  if (!timeline) fail(`${name} (symbol ${symbol}) has no timeline.`);
  if (timeline.length !== EXPECTED_FRAMES[name]) {
    fail(
      `${name} has ${timeline.length} frames, expected ${EXPECTED_FRAMES[name]} — ` +
        'the frame index is a direction, so a missing one aims the marker wrongly.',
    );
  }
  for (const [i, layers] of timeline.entries()) {
    if (layers.length !== 1) {
      fail(`${name} frame ${i + 1} has ${layers.length} shapes; both clips are one per frame.`);
    }
  }

  const shapes = timeline.map((layers) => layers[0]);
  if (new Set(shapes).size !== shapes.length) {
    fail(`${name} repeats a shape across frames: ${shapes.join(', ')}.`);
  }

  for (const [shape, scale] of Object.entries(sprite.matrices ?? {})) {
    if (scale[0] !== 1 || scale[1] !== 1) {
      fail(`${name} places shape ${shape} at scale ${scale.join('x')}; identity is assumed.`);
    }
  }

  return { name, symbol, shapes };
});

const shapeIds = [...new Set(clips.flatMap((c) => c.shapes))].sort((a, b) => a - b);

const files = shapeIds.map((id) => {
  const size = nativeSize(id);
  if (!size) fail(`shapes/${id}.svg is missing or has no px size on its root element.`);
  return {
    key: `unit-${id}`,
    file: `${id}.svg`,
    width: Number((size.width * RASTER_SCALE).toFixed(2)),
    height: Number((size.height * RASTER_SCALE).toFixed(2)),
    native: size,
  };
});

const content = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run marker-art:data
 *
 * The two off-screen marker clips, one shape per frame. See
 * scripts/gen-marker-art.mjs for the frame contracts.
 *
 * Frame numbers are the AS3's own \`gotoAndStop\` arguments — 1-based.
 */

export interface MarkerClip {
  /** SWF symbol id, as named in the AS3 \`[Embed]\` line. */
  symbol: number;
  /** One shape per frame, frame 1 first. */
  shapes: readonly number[];
}

export const MARKER_CLIPS: Readonly<Record<string, MarkerClip>> = Object.freeze({
${clips
  .map((c) => `  ${c.name}: { symbol: ${c.symbol}, shapes: [${c.shapes.join(', ')}] },`)
  .join('\n')}
});

/** Every shape the markers draw — what the asset sync must have copied. */
export const MARKER_SHAPE_IDS: readonly number[] = Object.freeze(
  ${JSON.stringify(shapeIds)},
);

/**
 * Loader entries, keyed \`unit-<shapeId>\` like the enemy and tank art so the
 * same preload group covers them.
 *
 * \`width\`/\`height\` are the rasterised size — authored size times
 * \`UNIT_RASTER_SCALE\` — and **the draw divides by that scale**, exactly as
 * every other oversampled group does.
 */
export const MARKER_SHAPE_FILES: readonly {
  key: string;
  file: string;
  width: number;
  height: number;
  /** Authored size, which is what a marker is drawn at. */
  nativeWidth: number;
  nativeHeight: number;
}[] = Object.freeze([
${files
  .map(
    (f) =>
      `  { key: '${f.key}', file: '${f.file}', width: ${f.width}, height: ${f.height}, ` +
      `nativeWidth: ${f.native.width}, nativeHeight: ${f.native.height} },`,
  )
  .join('\n')}
]);
`;

const outPath = join(projectRoot, 'src/game/ui/markerArt.ts');

if (check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('markerArt.ts is out of date. Run: npm run marker-art:data');
    process.exit(1);
  }
  console.log('markerArt.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote markerArt.ts — ${clips.map((c) => `${c.name} ${c.shapes.length}f`).join(', ')}, ` +
    `${shapeIds.length} shapes.`,
);
