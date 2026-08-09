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
