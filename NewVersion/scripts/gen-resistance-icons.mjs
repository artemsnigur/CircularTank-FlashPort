#!/usr/bin/env node
/**
 * Generates `src/game/enemies/resistanceIconArt.ts` — the per-frame shape
 * layers of the two strength/weakness badge clips.
 *
 *   node scripts/gen-resistance-icons.mjs [--check]
 *
 * Derived from `SPRITE_SHAPES` (itself generated from `assets.swf`) rather than
 * hand-listed, so a re-export cannot leave this table quietly stale.
 *
 * ── Each badge is three stacked shapes, and stacking them centred is exact ──
 * A frame is not one picture: frames 2-9 are `[998, glyph, 1000]` and frames
 * 10-17 are `[1008, glyph, 1010]` — a coloured disc, the damage-type glyph, and
 * a ring over the top. Frame 1 is the lone `997`, the "none" badge.
 *
 * Whether centring is enough was **measured, not assumed**: all 32 matrices
 * across the two clips are identity scale with a zero offset, so there is no
 * per-layer placement to carry. That is a property of these two clips, not a
 * general one — `gen-sprite-shapes.mjs` keeps scale precisely because four
 * weapon clips are told apart by it and nothing else.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPRITE_SHAPES } from './lib/sprite-shapes.mjs';
import { ICON_SPRITE_IDS } from './lib/icon-sprites.mjs';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const check = process.argv.includes('--check');

/** `IconStrongWeak2` and `IconStrongWeak`, in `ICON_SPRITE_IDS` order. */
const NAMES = { 1018: 'IconStrongWeak2', 1033: 'IconStrongWeak' };

const clips = ICON_SPRITE_IDS.map((id) => {
  const sprite = SPRITE_SHAPES[id];
  if (!sprite) {
    console.error(`Sprite ${id} is not in SPRITE_SHAPES — run sprites:data first.`);
    process.exit(1);
  }
  if (sprite.frameCount !== 17) {
    console.error(
      `Sprite ${id} has ${sprite.frameCount} frames, expected 17 ` +
        '(1 blank + 8 strengths + 8 weaknesses).',
    );
    process.exit(1);
  }
  return { id, name: NAMES[id] ?? `symbol${id}`, timeline: sprite.timeline };
});

const content = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run resistance-icons:data
 *
 * The strength/weakness badge clips, frame by frame. See
 * scripts/gen-resistance-icons.mjs for how the frames are laid out and why
 * stacking the layers centred reproduces the original exactly.
 *
 * Frame numbers are the AS3's own \`gotoAndStop\` arguments — 1-based, and
 * mapped from a damage type by \`resistanceIcons.ts\`.
 */

/** SWF shape ids for one frame, back to front. */
export type IconFrameLayers = readonly number[];

export interface ResistanceIconClip {
  /** SWF symbol id, as named in the AS3 \`[Embed]\` line. */
  symbol: number;
  /** Frame 1 first — index 0 is \`gotoAndStop(1)\`. */
  frames: readonly IconFrameLayers[];
}

export const RESISTANCE_ICON_CLIPS: Readonly<Record<string, ResistanceIconClip>> =
  Object.freeze({
${clips
  .map(
    (c) => `    ${c.name}: {
      symbol: ${c.id},
      frames: [
${c.timeline.map((layers) => `        [${layers.join(', ')}],`).join('\n')}
      ],
    },`,
  )
  .join('\n')}
  });

/** Every shape id either clip draws — what the asset sync must have copied. */
export const RESISTANCE_ICON_SHAPE_IDS: readonly number[] = Object.freeze(
  ${JSON.stringify(
    [
      ...new Set(clips.flatMap((c) => c.timeline.flat())),
    ].sort((a, b) => a - b),
  )},
);
`;

const outPath = join(projectRoot, 'src/game/enemies/resistanceIconArt.ts');

if (check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('resistanceIconArt.ts is out of date. Run: npm run resistance-icons:data');
    process.exit(1);
  }
  console.log('resistanceIconArt.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote resistanceIconArt.ts — ${clips.length} clips, 17 frames each, ` +
    `${new Set(clips.flatMap((c) => c.timeline.flat())).size} distinct shapes.`,
);
