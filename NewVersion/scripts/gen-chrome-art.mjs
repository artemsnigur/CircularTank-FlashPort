#!/usr/bin/env node
/**
 * Generates `src/game/ui/chromeArt.ts` — the UI chrome symbols, laid out.
 *
 *   node scripts/gen-chrome-art.mjs [--check]
 *
 * ── This one places its layers; the earlier art tables only sized theirs ──
 * `gen-weapon-art.mjs` aligns two shapes by their own origins, and can, because
 * **every placement inside symbol 1198 is `translate(0, 0)`** — measured, and
 * asserted there. That is not true of the chrome: `ButtonUpgrades` places its
 * plate at the origin and its label at `(100, 20)`, and `BackgroundTitle`
 * places a 20x20 tile at `scale(32, 4.4)`. Across the whole file, 537
 * placements on 87 sprites carry a translation.
 *
 * So this reads the **whole matrix** — which is why `gen-sprite-shapes.mjs`
 * started recording one in T154 — and emits a box-model layout instead of a
 * centre offset:
 *
 *     left = tx - originX * scaleX      width  = boxWidth  * scaleX
 *     top  = ty - originY * scaleY      height = boxHeight * scaleY
 *
 * where `origin` is where the SWF's (0,0) sits inside JPEGS's exported box.
 * Every layer is then positioned against the clip's own bounding box, so a
 * consumer draws one `position: relative` box and absolutely-positioned images
 * inside it, with no arithmetic of its own.
 *
 * ── The box spans every frame, not frame 1 ───────────────────────────────
 * A button's pressed or active frame can be a different size from its resting
 * one. Sizing the clip from frame 1 would make the element resize as it changes
 * state, which reflows whatever sits beside it; taking the union means the box
 * is stable and the frames move inside it.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPRITE_SHAPES, SHAPE_IDS } from './lib/sprite-shapes.mjs';
import { CHROME_SPRITE_IDS } from './lib/chrome-sprites.mjs';

const isShape = new Set(SHAPE_IDS);

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const shapesDir = resolve(projectRoot, '../SWFimported/shapes');

const check = process.argv.includes('--check');

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const round = (value) => Number(value.toFixed(2));

/**
 * A shape's exported box and the position of the SWF origin inside it.
 *
 * The root `<g>` transform is JPEXS's record of that origin. It is required
 * rather than defaulted: a shape whose export shape changed would otherwise be
 * laid out against an assumed (0, 0) and land somewhere plausible and wrong.
 */
function shapeGeometry(shapeId) {
  const file = join(shapesDir, `${shapeId}.svg`);
  if (!existsSync(file)) fail(`shapes/${shapeId}.svg is missing — run assets:sync?`);
  const svg = readFileSync(file, 'utf8');

  const width = /\bwidth="([\d.]+)px"/.exec(svg);
  const height = /\bheight="([\d.]+)px"/.exec(svg);
  if (!width || !height) fail(`shapes/${shapeId}.svg has no px size on its root element.`);

  const origin = /<g transform="matrix\(1\.0, 0\.0, 0\.0, 1\.0, ([-\d.]+), ([-\d.]+)\)"/.exec(svg);
  if (!origin) {
    fail(`shapes/${shapeId}.svg has no identity-matrix root group to read an origin from.`);
  }

  return {
    width: Number(width[1]),
    height: Number(height[1]),
    originX: Number(origin[1]),
    originY: Number(origin[2]),
  };
}

/**
 * The frames a symbol shows, as lists of shape ids.
 *
 * `timeline` is only emitted when the picture varies between frames, so a
 * single-frame clip — every title, and most plates — falls back to its
 * placement list. Both are the *accumulated* display list, per the audit's
 * "How to read a DefineSprite's frames".
 */
function framesOf(sprite, name) {
  if (sprite.timeline) return sprite.timeline;
  if (!sprite.places || sprite.places.length === 0) fail(`${name} places no shapes at all.`);
  return [sprite.places];
}

/**
 * Places one id — a shape, or a **nested sprite** whose own layers are placed
 * through it.
 *
 * Nesting is not an edge case here: `ButtonUpgrades` places a plate shape and a
 * *label clip* (447) at `(100, 20)`, and `ButtonLevelSelect` does the same with
 * 592. Treating those ids as shapes is what the first run of this generator
 * did, and it failed loudly on a missing `shapes/447.svg` — which is the good
 * outcome, because the alternative reading is that the button simply has no
 * label and nobody notices until a frame is looked at.
 *
 * Transforms compose by multiplication, which is only this simple because
 * rotation is rejected below: a child at `(ltx, lty)` inside a parent placed at
 * `(tx, ty)` with scale `s` lands at `tx + ltx * s`.
 *
 * **A nested clip contributes its frame 1.** These are resting-state
 * decorations — a label, a glyph — and the parent's frame index means the
 * parent's own timeline, not a synchronised child.
 */
function placeId(id, transform, name, seen) {
  const { sx, sy, tx, ty } = transform;

  if (isShape.has(id)) {
    const geometry = shapeGeometry(id);
    return [
      {
        shape: id,
        left: tx - geometry.originX * sx,
        top: ty - geometry.originY * sy,
        width: geometry.width * sx,
        height: geometry.height * sy,
      },
    ];
  }

  const nested = SPRITE_SHAPES[id];
  if (!nested) fail(`${name} places ${id}, which is neither a shape nor a sprite.`);
  if (seen.has(id)) fail(`${name} nests sprite ${id} inside itself.`);

  const inner = framesOf(nested, `${name} > ${id}`)[0];
  return inner.flatMap((childId) => {
    const [csx = 1, csy = 1, ctx = 0, cty = 0, r0 = 0, r1 = 0] = nested.matrices?.[childId] ?? [];
    if (r0 !== 0 || r1 !== 0) {
      fail(`${name} > ${id} places ${childId} with a rotation; the box model cannot express one.`);
    }
    return placeId(
      childId,
      { sx: sx * csx, sy: sy * csy, tx: tx + ctx * sx, ty: ty + cty * sy },
      name,
      new Set([...seen, id]),
    );
  });
}

const clips = Object.entries(CHROME_SPRITE_IDS).map(([name, symbol]) => {
  const sprite = SPRITE_SHAPES[symbol];
  if (!sprite) fail(`Sprite ${symbol} (${name}) is not in SPRITE_SHAPES — run sprites:data first.`);

  const frames = framesOf(sprite, name).map((layers, index) => ({
    frame: index + 1,
    layers: layers.flatMap((id) => {
      const [scaleX = 1, scaleY = 1, tx = 0, ty = 0, rotate0 = 0, rotate1 = 0] =
        sprite.matrices?.[id] ?? [];

      // Rotation exists in this file (281 placements across 6 sprites) and the
      // box model below cannot express one. None of the chrome uses it; the
      // check is here so that stops being an assumption.
      if (rotate0 !== 0 || rotate1 !== 0) {
        fail(`${name} places ${id} with a rotation; the layout here cannot express it.`);
      }

      return placeId(id, { sx: scaleX, sy: scaleY, tx, ty }, name, new Set([symbol]));
    }),
  }));

  // The union box, across every frame — see the header.
  const all = frames.flatMap((f) => f.layers);
  const minLeft = Math.min(...all.map((l) => l.left));
  const minTop = Math.min(...all.map((l) => l.top));
  const width = Math.max(...all.map((l) => l.left + l.width)) - minLeft;
  const height = Math.max(...all.map((l) => l.top + l.height)) - minTop;

  return {
    name,
    symbol,
    width: round(width),
    height: round(height),
    frames: frames.map((f) => ({
      frame: f.frame,
      layers: f.layers.map((l) => ({
        shape: l.shape,
        x: round(l.left - minLeft),
        y: round(l.top - minTop),
        width: round(l.width),
        height: round(l.height),
      })),
    })),
  };
});

for (const clip of clips) {
  if (clip.width <= 0 || clip.height <= 0) fail(`${clip.name} has a degenerate box.`);
}

const shapeIds = [
  ...new Set(clips.flatMap((c) => c.frames.flatMap((f) => f.layers.map((l) => l.shape)))),
].sort((a, b) => a - b);

const clipEntry = (clip) => {
  const frames = clip.frames
    .map((f) => {
      const layers = f.layers
        .map((l) => `{ shape: ${l.shape}, x: ${l.x}, y: ${l.y}, width: ${l.width}, height: ${l.height} }`)
        .join(', ');
      return `      { frame: ${f.frame}, layers: [${layers}] },`;
    })
    .join('\n');
  return `  ${clip.name}: {
    symbol: ${clip.symbol},
    width: ${clip.width},
    height: ${clip.height},
    frames: [
${frames}
    ],
  },`;
};

const content = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run chrome-art:data
 *
 * The UI chrome — screen titles, the bottom navigation bar, panels and the
 * action buttons. See scripts/gen-chrome-art.mjs for how the layout is derived
 * and scripts/lib/chrome-sprites.mjs for what each symbol is.
 *
 * **Every screen title in this game is vector art, not text.** That is the
 * whole reason this file exists: the original's headers carry a per-letter
 * gradient inside a black outline, which is a picture, and reproducing it with
 * a web font would be an approximation of something already extracted.
 *
 * Frame numbers are 1-based, as the AS3's own \`gotoAndStop\` arguments are.
 */

export interface ChromeLayer {
  /** DefineShape id — \`shapes/<id>.svg\`. */
  shape: number;
  /** Position inside the clip's box, in the SWF's units. */
  x: number;
  y: number;
  /** Drawn size — the shape's exported box times its placement scale. */
  width: number;
  height: number;
}

export interface ChromeFrame {
  frame: number;
  layers: readonly ChromeLayer[];
}

export interface ChromeClip {
  /** SWF symbol id, as named in the AS3 \`[Embed]\` line. */
  symbol: number;
  /**
   * The clip's natural size — the union of every frame's layers, not frame
   * one's. A button whose active frame is larger must not resize its box when
   * it lights up.
   */
  width: number;
  height: number;
  frames: readonly ChromeFrame[];
}

export const CHROME_CLIPS: Readonly<Record<string, ChromeClip>> = Object.freeze({
${clips.map(clipEntry).join('\n')}
});

/** Every shape the chrome draws — what the asset sync must have copied. */
export const CHROME_SHAPE_IDS: readonly number[] = Object.freeze(
  ${JSON.stringify(shapeIds)},
);
`;

const outPath = join(projectRoot, 'src/game/ui/chromeArt.ts');

if (check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('chromeArt.ts is out of date. Run: npm run chrome-art:data');
    process.exit(1);
  }
  console.log('chromeArt.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
const frameTotal = clips.reduce((sum, c) => sum + c.frames.length, 0);
console.log(
  `Wrote chromeArt.ts — ${clips.length} clips, ${frameTotal} frames, ${shapeIds.length} shapes.`,
);
