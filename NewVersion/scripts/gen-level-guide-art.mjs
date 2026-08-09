#!/usr/bin/env node
/**
 * Generates `src/game/levels/levelGuideArt.ts` — the frame layers of the level
 * guide widget's seven clips.
 *
 *   node scripts/gen-level-guide-art.mjs [--check]
 *
 * Derived from `SPRITE_SHAPES` rather than hand-listed, for the reason
 * `gen-resistance-icons.mjs` gives: a re-export cannot leave this quietly
 * stale.
 *
 * Frame counts are asserted per clip against what the AS3 asks for by
 * `gotoAndStop`, so a clip that changes shape fails here rather than rendering
 * a wrong frame. `ButtonLevelGuideArrow` is the one worth stating: `:240-248`
 * picks `1 + valueToAdd` or `2 + valueToAdd`, where `valueToAdd` is 0 for Left
 * and 4 for Right — hence 8 frames, four states per direction.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SHAPE_IDS, SPRITE_SHAPES } from './lib/sprite-shapes.mjs';
import { LEVEL_GUIDE_SPRITE_IDS } from './lib/level-guide-sprites.mjs';

const SHAPE_ID_SET = new Set(SHAPE_IDS);

/**
 * A static clip's single frame, in draw order.
 *
 * `emit-sprite-shapes.mjs:36-42` omits `timeline` when every frame draws the
 * same thing — "a clip whose every frame draws the same thing is not an
 * animation". `BackgroundLevelGuide` is exactly that, so it arrives with no
 * timeline and has to be read off `places` instead.
 *
 * **`places` is not a shape list.** The background's is `[1430, 1432, 1433]`,
 * and `1432` is a nested *sprite* holding `1431`. `shapeIdsForSprites` resolves
 * that but returns a Set, which loses the stacking order — fine for deciding
 * what to copy, wrong for deciding what to draw on top of what. So this expands
 * in place and keeps the order.
 */
function staticFrame(spriteId, seen = new Set()) {
  if (seen.has(spriteId)) return [];
  seen.add(spriteId);
  const out = [];
  for (const place of SPRITE_SHAPES[spriteId]?.places ?? []) {
    if (SHAPE_ID_SET.has(place)) out.push(place);
    else if (SPRITE_SHAPES[place]) out.push(...staticFrame(place, seen));
  }
  return out;
}

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const check = process.argv.includes('--check');

/** symbol -> [name, expected frame count]. */
const CLIPS = {
  1434: ['Background', 1],
  196: ['Arrow', 8],
  1452: ['AutoSelect', 4],
  1437: ['Info', 2],
  1442: ['Previous', 3],
  1447: ['Last', 3],
  1457: ['Upcoming', 3],
};

const clips = LEVEL_GUIDE_SPRITE_IDS.map((id) => {
  const sprite = SPRITE_SHAPES[id];
  const [name, expected] = CLIPS[id] ?? [`symbol${id}`, null];
  if (!sprite) {
    console.error(`Sprite ${id} (${name}) is not in SPRITE_SHAPES — run sprites:data first.`);
    process.exit(1);
  }
  if (expected !== null && sprite.frameCount !== expected) {
    console.error(
      `Sprite ${id} (${name}) has ${sprite.frameCount} frames, expected ${expected}.`,
    );
    process.exit(1);
  }
  // A static clip has no `timeline`; its one frame comes from `places`.
  const timeline = sprite.timeline ?? [staticFrame(id)];
  return { id, name, timeline };
});

const shapeIds = [...new Set(clips.flatMap((c) => c.timeline.flat()))].sort((a, b) => a - b);

const content = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run level-guide-art:data
 *
 * The level guide widget's clips, frame by frame. See
 * scripts/gen-level-guide-art.mjs for the frame layouts.
 *
 * Frame numbers are the AS3's own \`gotoAndStop\` arguments — 1-based.
 */

/** SWF shape ids for one frame, back to front. */
export type GuideFrameLayers = readonly number[];

export interface LevelGuideClip {
  /** SWF symbol id, as named in the AS3 \`[Embed]\` line. */
  symbol: number;
  /** Frame 1 first — index 0 is \`gotoAndStop(1)\`. */
  frames: readonly GuideFrameLayers[];
}

export const LEVEL_GUIDE_CLIPS: Readonly<Record<string, LevelGuideClip>> = Object.freeze({
${clips
  .map(
    (c) => `  ${c.name}: {
    symbol: ${c.id},
    frames: [
${c.timeline.map((layers) => `      [${layers.join(', ')}],`).join('\n')}
    ],
  },`,
  )
  .join('\n')}
});

/** Every shape id the widget draws — what the asset sync must have copied. */
export const LEVEL_GUIDE_SHAPE_IDS: readonly number[] = Object.freeze(
  ${JSON.stringify(shapeIds)},
);
`;

const outPath = join(projectRoot, 'src/game/levels/levelGuideArt.ts');

if (check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('levelGuideArt.ts is out of date. Run: npm run level-guide-art:data');
    process.exit(1);
  }
  console.log('levelGuideArt.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote levelGuideArt.ts — ${clips.length} clips, ${shapeIds.length} distinct shapes.`,
);
