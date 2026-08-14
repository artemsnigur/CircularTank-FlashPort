#!/usr/bin/env node
/**
 * Generates `src/game/upgrades/upgradeArt.ts` — the per-frame shape layers of
 * the 28 shop tiles.
 *
 *   node scripts/gen-upgrade-art.mjs [--check]
 *
 * Derived from `SPRITE_SHAPES` rather than hand-listed, as
 * `gen-bestiary-art.mjs` and `gen-resistance-icons.mjs` are.
 *
 * ── What is checked, and why each check is here ───────────────────────────
 * The frame grid is described in `upgrade-sprites.mjs`. This file *verifies*
 * it, because every one of these would render as an ordinary-looking tile:
 *
 *  - **A weapon has 9 frames, a misc upgrade 6.** Mixing them up would make
 *    "frame 7" mean nothing on a misc tile and silently fall back.
 *  - **The equipped row shares the owned row's glyph.** They differ only in
 *    their plate, so if the glyph moved, "equipped" would start drawing a
 *    different weapon.
 *  - **The not-owned row does not use the owned glyph.** The one check whose
 *    failure is invisible: a tile showing owned art for an unowned weapon looks
 *    exactly like a tile.
 *  - **All 28 owned glyphs are distinct.** Two upgrades sharing a picture is a
 *    mis-keyed symbol id, which no amount of staring at the shop would reveal.
 *  - **Identity placement**, the same assumption `gen-resistance-icons.mjs`
 *    measured rather than assumed.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPRITE_SHAPES } from './lib/sprite-shapes.mjs';
import { UPGRADE_SPRITE_IDS } from './lib/upgrade-sprites.mjs';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const check = process.argv.includes('--check');

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

/** `ButtonWeapon.as` / `ButtonMisc.as` — see `upgrade-sprites.mjs`. */
const WEAPON_FRAMES = 9;
const MISC_FRAMES = 6;
/** Index of the glyph inside a frame's layer list, back to front. */
const GLYPH = 1;

const clips = Object.entries(UPGRADE_SPRITE_IDS).map(([id, symbol]) => {
  const sprite = SPRITE_SHAPES[symbol];
  if (!sprite) fail(`Sprite ${symbol} (${id}) is not in SPRITE_SHAPES — run sprites:data first.`);

  const timeline = sprite.timeline;
  if (!timeline) fail(`${id} (symbol ${symbol}) has no timeline.`);

  const frames = timeline.length;
  if (frames !== WEAPON_FRAMES && frames !== MISC_FRAMES) {
    fail(
      `${id} (symbol ${symbol}) has ${frames} frames; expected ` +
        `${WEAPON_FRAMES} (weapon) or ${MISC_FRAMES} (misc).`,
    );
  }
  const equippable = frames === WEAPON_FRAMES;

  for (const [i, layers] of timeline.entries()) {
    if (layers.length < 2) {
      fail(`${id} frame ${i + 1} has ${layers.length} layers; the glyph sits at index ${GLYPH}.`);
    }
  }

  const owned = timeline[0][GLYPH];
  // Rest frames: 1 / 4 / 7 for a weapon, 1 / 4 for a misc upgrade.
  const equipped = equippable ? timeline[3][GLYPH] : null;
  const unowned = timeline[equippable ? 6 : 3][GLYPH];

  if (equippable && equipped !== owned) {
    fail(`${id}: the equipped row draws glyph ${equipped}, not the owned ${owned}.`);
  }
  if (unowned === owned) {
    fail(`${id}: the not-owned row draws the owned glyph (${owned}) — it must not.`);
  }

  for (const [shape, scale] of Object.entries(sprite.scales ?? {})) {
    if (scale[0] !== 1 || scale[1] !== 1) {
      fail(
        `${id} places shape ${shape} at scale ${scale.join('x')}; this table assumes ` +
          'identity scale. Carry the matrix instead.',
      );
    }
  }

  return { id, symbol, timeline, equippable, owned };
});

const glyphs = clips.map((c) => c.owned);
if (new Set(glyphs).size !== clips.length) {
  const seen = new Set();
  const dupes = glyphs.filter((g) => (seen.has(g) ? true : (seen.add(g), false)));
  fail(`Two upgrades share a glyph (${[...new Set(dupes)].join(', ')}) — check the symbol ids.`);
}

const shapeIds = [...new Set(clips.flatMap((c) => c.timeline.flat()))].sort((a, b) => a - b);
const weapons = clips.filter((c) => c.equippable).length;

const content = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run upgrade-art:data
 *
 * The 28 shop tiles, frame by frame. See scripts/gen-upgrade-art.mjs for the
 * frame grid and the checks that keep it true.
 *
 * Frame numbers are the AS3's own \`gotoAndStop\` arguments — 1-based.
 * \`upgradeTileFrame\` picks the resting one for a row's state; hover and
 * pressed are generated and undrawn, because this port lists every upgrade at
 * once instead of selecting one (see \`A16\` for the same call on the bestiary).
 */

/** SWF shape ids for one frame, back to front: \`[plate, glyph, badge?]\`. */
export type UpgradeTileLayers = readonly number[];

export interface UpgradeTileClip {
  /** SWF symbol id, as named in the AS3 \`[Embed]\` line. */
  symbol: number;
  /**
   * True for the 24 weapons, which carry an equipped row; false for the 4 misc
   * upgrades, which cannot be equipped and have six frames rather than nine.
   */
  equippable: boolean;
  /** Frame 1 first — index 0 is \`gotoAndStop(1)\`. */
  frames: readonly UpgradeTileLayers[];
}

/**
 * The resting frame for each state — \`ButtonWeapon.as:193-206\` and
 * \`ButtonMisc.as:129-160\`.
 *
 * Named rather than written as 1/4/7 at the call site, because "frame 7" says
 * nothing about what it draws and \`notOwned\` says all of it.
 */
export const UPGRADE_TILE_REST_FRAME = Object.freeze({
  owned: 1,
  /** Weapons only; a misc tile has no equipped row. */
  equipped: 4,
  /** 7 on a weapon, 4 on a misc upgrade — \`upgradeTileFrame\` resolves it. */
  notOwnedWeapon: 7,
  notOwnedMisc: 4,
});

export const UPGRADE_TILE_CLIPS: Readonly<Record<string, UpgradeTileClip>> = Object.freeze({
${clips
  .map(
    (c) => `  ${c.id}: {
    symbol: ${c.symbol},
    equippable: ${c.equippable},
    frames: [
${c.timeline.map((layers) => `      [${layers.join(', ')}],`).join('\n')}
    ],
  },`,
  )
  .join('\n')}
});

/** Every shape id the tiles draw — what the asset sync must have copied. */
export const UPGRADE_TILE_SHAPE_IDS: readonly number[] = Object.freeze(
  ${JSON.stringify(shapeIds)},
);
`;

const outPath = join(projectRoot, 'src/game/upgrades/upgradeArt.ts');

if (check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('upgradeArt.ts is out of date. Run: npm run upgrade-art:data');
    process.exit(1);
  }
  console.log('upgradeArt.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote upgradeArt.ts — ${clips.length} tiles (${weapons} weapons at ${WEAPON_FRAMES} frames, ` +
    `${clips.length - weapons} misc at ${MISC_FRAMES}), ${shapeIds.length} distinct shapes.`,
);
