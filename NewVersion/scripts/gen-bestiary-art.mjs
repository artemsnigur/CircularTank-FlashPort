#!/usr/bin/env node
/**
 * Generates `src/game/enemies/bestiaryArt.ts` — the per-frame shape layers of
 * the 20 `ButtonEnemy<Type>` bestiary tiles.
 *
 *   node scripts/gen-bestiary-art.mjs [--source <dir>] [--check]
 *
 * Derived from `SPRITE_SHAPES` (itself generated from `assets.swf`) rather than
 * hand-listed, exactly as `gen-resistance-icons.mjs` is, so a re-export cannot
 * leave this table quietly stale.
 *
 * ── A tile is three stacked shapes ────────────────────────────────────────
 * Every frame is `[plate, overlay, glyph]`:
 *
 *   frame 1  [734, 735, <enemy>]   normal
 *   frame 2  [737, 735, <enemy>]   hover
 *   frame 3  [738, 735, <enemy>]   selected
 *   frame 4  [734, 735, 739]       undiscovered — the normal plate, "?" glyph
 *
 * That uniformity is **checked here, not assumed**: all 20 clips are verified
 * to have four frames of three layers, a shared plate/overlay set, one glyph
 * repeated across frames 1-3, and the same locked frame. A re-export that
 * changed any of it fails this generator instead of producing a table whose
 * frame 4 silently shows the enemy it is meant to hide.
 *
 * Whether centring the layers is enough is the same question `gen-resistance-
 * icons.mjs` answered by measuring, and the answer is checked the same way
 * below: every placement matrix across the 20 clips must be identity scale.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPRITE_SHAPES } from './lib/sprite-shapes.mjs';
import { BESTIARY_SPRITE_IDS } from './lib/bestiary-sprites.mjs';

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

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

/* ── the ids must be the bestiary's own, in its own order ─────────────────── */

/**
 * Cross-checked against `enemyButtonModelArray`, the same array
 * `gen-bestiary.mjs` reads.
 *
 * Without this the hand-kept symbol table could drift from the entry list — a
 * missing type would simply have no tile, and a renamed one would draw nothing,
 * both of which look like a styling problem in the browser rather than a data
 * one here.
 */
const screenEnemies = join(sourceRoot, 'scripts/ScreenEnemies.as');
if (!existsSync(screenEnemies)) fail(`ScreenEnemies.as not found at ${screenEnemies}.`);

const modelMatch = /public static var enemyButtonModelArray\s*:Array\s*=\s*\[([\s\S]*?)\];/.exec(
  readFileSync(screenEnemies, 'utf8'),
);
if (!modelMatch) fail('Could not find enemyButtonModelArray.');

const expectedIds = [...modelMatch[1].matchAll(/"([^"]*)"/g)].map((m) => m[1].replace(/ /g, ''));
const tableIds = Object.keys(BESTIARY_SPRITE_IDS);

const missing = expectedIds.filter((id) => !tableIds.includes(id));
const extra = tableIds.filter((id) => !expectedIds.includes(id));
if (missing.length || extra.length) {
  fail(
    'BESTIARY_SPRITE_IDS does not match enemyButtonModelArray.\n' +
      (missing.length ? `  missing: ${missing.join(', ')}\n` : '') +
      (extra.length ? `  unknown: ${extra.join(', ')}\n` : ''),
  );
}

/* ── frames, in screen order ──────────────────────────────────────────────── */

/** `ButtonEnemy.as` frame numbers, and the order `expectedIds` is already in. */
const FRAME_COUNT = 4;
const LAYERS_PER_FRAME = 3;
const LOCKED_FRAME = 4;

const clips = expectedIds.map((id) => {
  const symbol = BESTIARY_SPRITE_IDS[id];
  const sprite = SPRITE_SHAPES[symbol];
  if (!sprite) fail(`Sprite ${symbol} (${id}) is not in SPRITE_SHAPES — run sprites:data first.`);
  if (sprite.frameCount !== FRAME_COUNT) {
    fail(`${id} (symbol ${symbol}) has ${sprite.frameCount} frames, expected ${FRAME_COUNT}.`);
  }
  const timeline = sprite.timeline;
  if (!timeline || timeline.length !== FRAME_COUNT) {
    fail(`${id} (symbol ${symbol}) has no ${FRAME_COUNT}-frame timeline.`);
  }
  for (const [i, layers] of timeline.entries()) {
    if (layers.length !== LAYERS_PER_FRAME) {
      fail(
        `${id} frame ${i + 1} has ${layers.length} layers, expected ` +
          `${LAYERS_PER_FRAME} ([plate, overlay, glyph]).`,
      );
    }
  }

  // The glyph is layer 3, and frames 1-3 must all show the same one: they
  // differ only in their plate. If they ever did not, "which frame is the
  // enemy" would stop being answerable by the constants below.
  const glyph = timeline[0][2];
  if (timeline[1][2] !== glyph || timeline[2][2] !== glyph) {
    fail(`${id} changes glyph between frames 1-3: ${timeline.map((f) => f[2]).join(', ')}.`);
  }

  // **The withholding guarantee.** The locked frame must not draw the enemy.
  // This is the one check whose failure would be invisible in the UI: a tile
  // that leaks its glyph in frame 4 looks like a perfectly normal tile.
  if (timeline[LOCKED_FRAME - 1][2] === glyph) {
    fail(`${id} frame ${LOCKED_FRAME} draws its own glyph (${glyph}) — it must not.`);
  }

  for (const [shape, scale] of Object.entries(sprite.scales ?? {})) {
    if (scale[0] !== 1 || scale[1] !== 1) {
      fail(
        `${id} places shape ${shape} at scale ${scale.join('x')}; this table assumes ` +
          'identity scale, as gen-resistance-icons.mjs does. Carry the matrix instead.',
      );
    }
  }

  return { id, symbol, timeline, glyph };
});

/** Frame 4's glyph, shared by all 20 — asserted rather than assumed. */
const lockedGlyphs = new Set(clips.map((c) => c.timeline[LOCKED_FRAME - 1][2]));
if (lockedGlyphs.size !== 1) {
  fail(`The locked frame uses ${lockedGlyphs.size} different glyphs: ${[...lockedGlyphs].join(', ')}.`);
}
const [lockedGlyph] = lockedGlyphs;

const shapeIds = [...new Set(clips.flatMap((c) => c.timeline.flat()))].sort((a, b) => a - b);

const content = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run bestiary-art:data
 *
 * The 20 \`ButtonEnemy<Type>\` bestiary tiles, frame by frame. See
 * scripts/gen-bestiary-art.mjs for the layer layout and the checks that keep
 * it true.
 *
 * Frame numbers are the AS3's own \`gotoAndStop\` arguments — 1-based. Which
 * frame a tile draws is \`ButtonEnemy.as:78-112\`, and the one that matters
 * here is **frame ${LOCKED_FRAME}**: every \`notDiscovered\` branch falls through to it, so an
 * unmet enemy is hidden by the original's own art rather than by a silhouette
 * this port invented.
 */

/** SWF shape ids for one frame, back to front: \`[plate, overlay, glyph]\`. */
export type BestiaryTileLayers = readonly number[];

export interface BestiaryTileClip {
  /** SWF symbol id, as named in the AS3 \`[Embed]\` line. */
  symbol: number;
  /** Frame 1 first — index 0 is \`gotoAndStop(1)\`. */
  frames: readonly BestiaryTileLayers[];
}

/** \`ButtonEnemy.as\` frame numbers, named so a call site cannot mean 4 by accident. */
export const BESTIARY_TILE_FRAME = Object.freeze({
  /** \`:105\` — resting. */
  normal: 1,
  /** \`:96\` — cursor over. */
  hover: 2,
  /** \`:90\`, and on press at \`:47\`. */
  selected: 3,
  /** \`:109\` — not yet discovered. */
  locked: ${LOCKED_FRAME},
});

/** The "?" glyph frame ${LOCKED_FRAME} draws in place of an enemy, shared by all ${clips.length} tiles. */
export const BESTIARY_LOCKED_GLYPH = ${lockedGlyph};

export const BESTIARY_TILE_CLIPS: Readonly<Record<string, BestiaryTileClip>> = Object.freeze({
${clips
  .map(
    (c) => `  ${c.id}: {
    symbol: ${c.symbol},
    frames: [
${c.timeline.map((layers) => `      [${layers.join(', ')}],`).join('\n')}
    ],
  },`,
  )
  .join('\n')}
});

/** Every shape id the tiles draw — what the asset sync must have copied. */
export const BESTIARY_TILE_SHAPE_IDS: readonly number[] = Object.freeze(
  ${JSON.stringify(shapeIds)},
);
`;

const outPath = join(projectRoot, 'src/game/enemies/bestiaryArt.ts');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('bestiaryArt.ts is out of date. Run: npm run bestiary-art:data');
    process.exit(1);
  }
  console.log('bestiaryArt.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote bestiaryArt.ts — ${clips.length} tiles, ${FRAME_COUNT} frames each, ` +
    `${shapeIds.length} distinct shapes, locked glyph ${lockedGlyph}.`,
);
