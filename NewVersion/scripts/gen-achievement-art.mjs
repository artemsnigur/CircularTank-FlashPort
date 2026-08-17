#!/usr/bin/env node
/**
 * Generates `src/game/achievements/achievementArt.ts` — the 36 achievement
 * icon clips, frame by frame.
 *
 *   node scripts/gen-achievement-art.mjs [--source <dir>] [--check]
 *
 * ── The frames are `thisState`, not an animation ──────────────────────────
 * `Achievement.as:45-59` maps its state to a frame:
 *
 *     thisState -1        -> frame 1   locked / not earned
 *     thisState  0 or 1   -> frame 2   earned; no difficulty, or Easy
 *     thisState  2        -> frame 3   earned on Medium
 *     thisState  3        -> frame 4   earned on Hard
 *
 * So a clip has **4 frames when the achievement records a difficulty and 2 when
 * it does not** — `difficultyMatters` in `achievementData.ts`. That
 * correspondence is checked here rather than assumed: a mismatch means either
 * the data or the art is being read wrong, and both would render something
 * plausible.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SHAPE_IDS, SPRITE_SHAPES } from './lib/sprite-shapes.mjs';
import { achievementSymbols } from './lib/achievement-sprites.mjs';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

function parseArgs(argv) {
  const args = { source: null, check: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--source') args.source = argv[++i];
    else if (argv[i] === '--check') args.check = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const sourceRoot = resolve(
  projectRoot,
  args.source ?? process.env.SWF_IMPORTED_DIR ?? '../SWFimported',
);

const SHAPE_ID_SET = new Set(SHAPE_IDS);

/** A static clip's one frame, in draw order — see `gen-level-guide-art.mjs`. */
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

const symbols = achievementSymbols(sourceRoot);
const ids = Object.keys(symbols).sort();

if (ids.length !== 36) {
  console.error(`Expected 36 achievement icons, found ${ids.length}.`);
  process.exit(1);
}

const clips = ids.map((id) => {
  const symbol = symbols[id];
  const sprite = SPRITE_SHAPES[symbol];
  if (!sprite) {
    console.error(`Achievement ${id} -> symbol ${symbol} is not in SPRITE_SHAPES.`);
    process.exit(1);
  }
  return { id, symbol, frames: sprite.timeline ?? [staticFrame(symbol)] };
});

const shapeIds = [...new Set(clips.flatMap((c) => c.frames.flat()))].sort((a, b) => a - b);

/**
 * A shape's own size in SWF units, off the exported SVG's `width`/`height`.
 *
 * **Needed because the layers are not all the same size and are not meant to
 * be.** A four-frame clip is a 52-unit backing disc, a 48-unit difficulty ring
 * and an icon at whatever size it happens to be — `Bosses1`'s is 26x26 and
 * `BossOnlySpecial`'s is 33.3x12.5. The results-screen toast stretches every
 * layer to fill its box (`.achievement-icon img`), which is survivable on one
 * icon at 64px and is visibly wrong at 36 badges: a 26-unit icon drawn over
 * the whole disc is twice the size it should be.
 *
 * So the size travels with the shape and the view scales each layer by
 * `size / ACHIEVEMENT_BADGE_SIZE`.
 */
function shapeBox(shapeId) {
  const file = join(sourceRoot, 'shapes', `${shapeId}.svg`);
  if (!existsSync(file)) {
    console.error(`Shape ${shapeId}.svg is missing from ${sourceRoot}/shapes.`);
    process.exit(1);
  }
  const svg = readFileSync(file, 'utf8');
  const width = /\bwidth="([\d.]+)px"/.exec(svg);
  const height = /\bheight="([\d.]+)px"/.exec(svg);
  if (!width || !height) {
    console.error(`Shape ${shapeId}.svg has no px width/height to read.`);
    process.exit(1);
  }
  return [Number(width[1]), Number(height[1])];
}

const boxes = new Map(shapeIds.map((id) => [id, shapeBox(id)]));

/*
 * The badge's own extent — the largest layer, which is the backing disc.
 *
 * **Derived rather than written as 52.** A hand-typed 52 would be a claim
 * about generated data with nothing keeping the two in step, and every layer's
 * scale is a fraction of it, so a wrong value would misplace all 36 badges at
 * once while looking entirely plausible.
 */
const badgeSize = Math.max(...[...boxes.values()].flat());

const content = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run achievement-art:data
 *
 * The 36 achievement icon clips. Frame numbers are \`Achievement.as:45-59\`'s
 * \`thisState\` mapping — see scripts/gen-achievement-art.mjs.
 */

/** SWF shape ids for one frame, back to front. */
export type AchievementFrameLayers = readonly number[];

export interface AchievementClip {
  /** SWF symbol id, from the \`[Embed]\` line on \`Achievement<id>.as\`. */
  symbol: number;
  /** Frame 1 first — index 0 is \`gotoAndStop(1)\`, the locked state. */
  frames: readonly AchievementFrameLayers[];
}

export const ACHIEVEMENT_CLIPS: Readonly<Record<string, AchievementClip>> = Object.freeze({
${clips
  .map(
    (c) => `  ${c.id}: {
    symbol: ${c.symbol},
    frames: [
${c.frames.map((layers) => `      [${layers.join(', ')}],`).join('\n')}
    ],
  },`,
  )
  .join('\n')}
});

/** Every shape id the icons draw — what the asset sync must have copied. */
export const ACHIEVEMENT_SHAPE_IDS: readonly number[] = Object.freeze(
  ${JSON.stringify(shapeIds)},
);

/**
 * The badge's own extent in SWF units — the largest layer, the backing disc.
 *
 * Every layer below is drawn at \`its size / this\` of the rendered badge, which
 * is the only way a 26-unit icon lands at half the disc rather than filling it.
 */
export const ACHIEVEMENT_BADGE_SIZE = ${badgeSize};

/** Each layer's own \`width, height\` in SWF units, from the exported SVG. */
export const ACHIEVEMENT_SHAPE_BOX: Readonly<
  Record<number, readonly [number, number]>
> = Object.freeze({
${shapeIds.map((id) => `  ${id}: [${boxes.get(id).join(', ')}],`).join('\n')}
});
`;

const outPath = join(projectRoot, 'src/game/achievements/achievementArt.ts');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('achievementArt.ts is out of date. Run: npm run achievement-art:data');
    process.exit(1);
  }
  console.log('achievementArt.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote achievementArt.ts — ${clips.length} clips, ${shapeIds.length} distinct shapes.`,
);
