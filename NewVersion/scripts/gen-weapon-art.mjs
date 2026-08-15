#!/usr/bin/env node
/**
 * Generates `src/game/ui/weaponArt.ts` — the 25 frames of `WeaponInterface`
 * (symbol 1198), the HUD's weapon icon.
 *
 *   node scripts/gen-weapon-art.mjs [--check]
 *
 * Derived from `SPRITE_SHAPES`, as `gen-marker-art.mjs` and `gen-upgrade-art.mjs`
 * are.
 *
 * ── Every frame is a socket plus one glyph ────────────────────────────────
 * Shape 596 is a 30x30 socket that persists on depth 1 for the whole clip;
 * each frame swaps a single weapon glyph over it. That is only visible to the
 * *accumulating* frame parser — "shapes placed on this frame" would report the
 * glyph alone from frame 2 on and lose the socket entirely. See the audit's
 * "How to read a DefineSprite's frames".
 *
 * ── Why the offsets exist, and why centring is wrong ──────────────────────
 * **Every placement inside 1198 is identity: scale 1, no rotation, translate
 * (0, 0)** — measured off the SWF's own MATRIX records, all 35 of them, not
 * assumed. Both shapes therefore sit at the *clip origin*, which means they
 * align by each shape's **own origin** and not by its bounding box.
 *
 * That distinction is the whole reason this generator is not a copy of
 * `gen-marker-art.mjs`. JPEXS exports each shape with its origin recorded as
 * the translate of the root `<g>`, and for these glyphs it is usually **not**
 * the box centre: 21 of the 24 are off-centre, worst of them `Cannon` (619) at
 * (-3.05, +3.05) — 4.31 units diagonally on a 30-unit socket, 14%. Stacking
 * the layers centred, the way `UpgradeIcon` legitimately does for the shop
 * tiles, would hang the default weapon's barrel out of its socket and read as
 * bad art rather than as a bug.
 *
 * So `dx`/`dy` below are `boxCentre - origin`: where an image's centre must go
 * relative to the anchor point, in authored units.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { SPRITE_SHAPES } from './lib/sprite-shapes.mjs';
import { WEAPON_PANEL_SPRITE_ID } from './lib/weapon-panel-sprites.mjs';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const shapesDir = resolve(projectRoot, '../SWFimported/shapes');

const check = process.argv.includes('--check');

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

/**
 * `WeaponInterface.update`'s `gotoAndStop` ladder has 25 arms — 1 `None`, 12
 * primaries, 12 secondaries. The frame index *is* the weapon, so a clip with a
 * different count means the mapping in `weaponPanel.ts` is aimed at the wrong
 * pictures rather than at none.
 */
const EXPECTED_FRAMES = 25;

/** Shape 596, the socket every frame draws under its glyph. */
const EXPECTED_SOCKET = 596;

const round = (value) => Number(value.toFixed(2));

/**
 * A shape's box and origin, straight off the SVG root and its first `<g>`.
 *
 * The origin is JPEXS's own record of where the SWF's (0,0) sits inside the
 * exported box, which is the only thing that makes two shapes placed at the
 * same point line up the way Flash drew them.
 */
function shapeGeometry(shapeId) {
  const file = join(shapesDir, `${shapeId}.svg`);
  if (!existsSync(file)) fail(`shapes/${shapeId}.svg is missing — run assets:sync --all?`);
  const svg = readFileSync(file, 'utf8');

  // The word boundary matters: `stroke-width="2px"` would otherwise match
  // first on any shape that carries one.
  const width = /\bwidth="([\d.]+)px"/.exec(svg);
  const height = /\bheight="([\d.]+)px"/.exec(svg);
  if (!width || !height) fail(`shapes/${shapeId}.svg has no px size on its root element.`);

  // Identity scale and no skew, then the translate — anything else would mean
  // JPEXS baked a transform the offsets below cannot express.
  const origin = /<g transform="matrix\(1\.0, 0\.0, 0\.0, 1\.0, ([-\d.]+), ([-\d.]+)\)"/.exec(svg);
  if (!origin) fail(`shapes/${shapeId}.svg has no identity-matrix root group to read an origin from.`);

  const box = { width: Number(width[1]), height: Number(height[1]) };
  return {
    ...box,
    dx: round(box.width / 2 - Number(origin[1])),
    dy: round(box.height / 2 - Number(origin[2])),
  };
}

const sprite = SPRITE_SHAPES[WEAPON_PANEL_SPRITE_ID];
if (!sprite) fail(`Sprite ${WEAPON_PANEL_SPRITE_ID} is not in SPRITE_SHAPES — run sprites:data first.`);

const timeline = sprite.timeline;
if (!timeline) fail(`Symbol ${WEAPON_PANEL_SPRITE_ID} has no timeline.`);
if (timeline.length !== EXPECTED_FRAMES) {
  fail(
    `WeaponInterface has ${timeline.length} frames, expected ${EXPECTED_FRAMES} — ` +
      'the frame index is the weapon, so a wrong count aims every icon elsewhere.',
  );
}

// Identity scale on every placement. The offsets below are translations only;
// a scaled placement would silently draw a glyph at the wrong size.
for (const [shape, scale] of Object.entries(sprite.scales ?? {})) {
  if (scale[0] !== 1 || scale[1] !== 1) {
    fail(`WeaponInterface places shape ${shape} at scale ${scale.join('x')}; identity is assumed.`);
  }
}

const frames = timeline.map((layers, index) => {
  const frame = index + 1;
  if (layers[0] !== EXPECTED_SOCKET) {
    fail(`Frame ${frame} does not start with the socket ${EXPECTED_SOCKET}: [${layers.join(', ')}].`);
  }
  // Frame 1 is the bare socket — `showWeapon == "None"` (`WeaponInterface.as:57`).
  if (frame === 1 ? layers.length !== 1 : layers.length !== 2) {
    fail(
      `Frame ${frame} has ${layers.length} layers; frame 1 is the bare socket ` +
        'and every other frame is the socket plus exactly one glyph.',
    );
  }
  return { frame, layers: layers.map((shape) => ({ shape, ...shapeGeometry(shape) })) };
});

const glyphs = frames.flatMap((f) => f.layers.slice(1).map((l) => l.shape));
if (new Set(glyphs).size !== glyphs.length) {
  fail(`Two frames share a glyph: ${glyphs.join(', ')} — each weapon has its own picture.`);
}

const shapeIds = [...new Set(frames.flatMap((f) => f.layers.map((l) => l.shape)))].sort(
  (a, b) => a - b,
);

const socket = shapeGeometry(EXPECTED_SOCKET);

const content = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run weapon-art:data
 *
 * The 25 frames of \`WeaponInterface\` (symbol ${WEAPON_PANEL_SPRITE_ID}) — the HUD's weapon
 * icon. See scripts/gen-weapon-art.mjs for the frame contracts and for where
 * the layer offsets come from.
 *
 * Frame numbers are the AS3's own \`gotoAndStop\` arguments — 1-based. Which
 * weapon each frame belongs to is \`weaponPanel.ts\`, transcribed from
 * \`WeaponInterface.update\`; this file is only the pictures.
 */

export interface WeaponArtLayer {
  /** DefineShape id — \`shapes/<id>.svg\`. */
  shape: number;
  /** Authored size, in the SWF's units. */
  width: number;
  height: number;
  /**
   * Where this layer's **centre** goes, relative to the icon's anchor.
   *
   * \`boxCentre - origin\`. Non-zero for 21 of the 24 glyphs, because Flash
   * places every layer at the clip origin and a shape's origin is rarely its
   * box centre — centring the layers instead would misplace \`Cannon\` by 4.31
   * units on a 30-unit socket.
   */
  dx: number;
  dy: number;
}

export interface WeaponArtFrame {
  /** 1-25, the \`gotoAndStop\` argument. */
  frame: number;
  /** The socket first, then the weapon's glyph. Frame 1 is the socket alone. */
  layers: readonly WeaponArtLayer[];
}

/** The SWF symbol, as named in \`WeaponInterface.as\`'s \`[Embed]\` line. */
export const WEAPON_PANEL_SYMBOL = ${WEAPON_PANEL_SPRITE_ID};

/** Shape ${EXPECTED_SOCKET}, the plate under every glyph — ${socket.width}x${socket.height}. */
export const WEAPON_SOCKET_SHAPE = ${EXPECTED_SOCKET};
export const WEAPON_SOCKET_SIZE = ${socket.width};

export const WEAPON_ART_FRAMES: readonly WeaponArtFrame[] = Object.freeze([
${frames
  .map(
    (f) =>
      `  { frame: ${f.frame}, layers: [` +
      f.layers
        .map(
          (l) =>
            `{ shape: ${l.shape}, width: ${l.width}, height: ${l.height}, dx: ${l.dx}, dy: ${l.dy} }`,
        )
        .join(', ') +
      `] },`,
  )
  .join('\n')}
]);

/** Every shape the icon draws — what the asset sync must have copied. */
export const WEAPON_SHAPE_IDS: readonly number[] = Object.freeze(
  ${JSON.stringify(shapeIds)},
);
`;

const outPath = join(projectRoot, 'src/game/ui/weaponArt.ts');

if (check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('weaponArt.ts is out of date. Run: npm run weapon-art:data');
    process.exit(1);
  }
  console.log('weaponArt.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
const offCentre = frames.flatMap((f) => f.layers.slice(1)).filter((l) => l.dx !== 0 || l.dy !== 0);
console.log(
  `Wrote weaponArt.ts — ${frames.length} frames, ${shapeIds.length} shapes, ` +
    `${offCentre.length} of ${glyphs.length} glyphs off-centre.`,
);
