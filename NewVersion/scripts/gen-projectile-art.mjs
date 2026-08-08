#!/usr/bin/env node
/**
 * Generates `src/assets/projectileArt.ts` — the texture each projectile class
 * draws, and the size it draws at.
 *
 *   node scripts/gen-projectile-art.mjs [--source <dir>] [--check]
 *
 * Three inputs, none of them hand-written twice:
 *
 *   scripts/lib/projectile-sprites.mjs   class -> sprite id (the one hand-kept
 *                                        table; each row greppable in the AS3)
 *   scripts/lib/sprite-shapes.mjs        sprite -> shapes + placement scale,
 *                                        generated from assets.swf
 *   SWFimported/shapes/<id>.svg          the shape's own authored dimensions
 *
 * ── Why size comes from the SWF and not from `bulletRadius` ───────────────
 * The port currently draws every round at `radius * 4` square — a 4x inflation
 * `docs/AUDIT-2026-07.md` records as **unsourced polish**, added so bullets
 * "read at speed". That was the right call while every bullet was the same
 * circle. It is the wrong call now: the original's own dimensions are
 * available, and they carry information the radius cannot.
 *
 * Shape 215 is the case that proves it. Four weapons place it, and the AS3
 * distinguishes them **only** by a non-uniform placement matrix:
 *
 *   Cannon      0.5  x 1.333  ->  8 x 4     (native 16 x 3)
 *   MiniGun     1    x 1      -> 16 x 3
 *   Big Cannon  0.75 x 2      -> 12 x 6
 *   Shotgun     1    x 1      -> 16 x 3
 *
 * A uniform `radius * 4` cannot express any of that: it renders Cannon,
 * MiniGun and Shotgun as one identical square. So the display size here is
 * `native x matrix`, in design units, and collision radius stays exactly what
 * it was — they were always separate quantities, and the audit's warning about
 * the gap between them is satisfied by making the visual honest rather than by
 * inflating it further.
 *
 * ── Frames: selected, not played ─────────────────────────────────────────
 * Seven sprites place several shapes, and only three of them animate. The other
 * four are pinned by `gotoAndStop` — see `VARIANT_CLASSES` — so their frames go
 * out as `PROJECTILE_VARIANTS`, an ordered list the caller picks from using the
 * state that drives the choice.
 *
 * `PROJECTILE_ART` carries frame 1 for every class — for `BulletBomb` and
 * `ObjectMine` that is the **base** layer, which never changes; their moving
 * half goes out as `PROJECTILE_OVERLAYS`, one entry per timeline frame, `null`
 * where the clip shows the body alone.
 *
 * `BulletLaser` is the third animated clip and is deliberately absent: the port
 * draws the beam as a line primitive rather than a sprite, so it has no layer to
 * overlay. Declined rather than deferred — see `docs/BACKLOG.md` M1.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SPRITE_SHAPES } from './lib/sprite-shapes.mjs';
import { PROJECTILE_SPRITES } from './lib/projectile-sprites.mjs';

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
const shapesDir = join(sourceRoot, 'shapes');

/**
 * Rasterisation multiple over the shape's authored size.
 *
 * `load.svg` bakes a bitmap at the size it is given, so this is resolution, not
 * layout — the display size is set per class at runtime. 4x matches the tank
 * and enemy shapes (`3.svg` is authored at 29 and rasterised at 116) and keeps
 * a 16x3 streak legible when a 3x phone zooms in.
 */
const RASTER_SCALE = 4;

/**
 * Classes whose frames the AS3 *selects* rather than plays.
 *
 * None of these animate. Flash would loop them — no sprite in this file carries
 * a `stop()` frame action — but the AS3 pins each one with `gotoAndStop`, so the
 * frames are a set of alternatives, not a sequence:
 *
 *   BulletFire        `:3798`  gotoAndStop(round(random * 2 + 1))  1 of 3, at spawn
 *   BulletGummyBear   `:3828`  frame 1, then +1 per wall bounce (`:1953`,
 *                              `:1974`) and 3 on a corner (`:2003`) — the
 *                              bounce stage, which also scales damage
 *   ObjectGroundIce   `:1806`  gotoAndStop(round(random * 2 + 1))  1 of 3, at spawn
 *   ObjectGroundLava  `:1806`  same call
 *
 * Emitting them as an ordered list keeps the choice at the call site, where the
 * state that drives it lives. Animating them instead would invent motion the
 * original does not have.
 */
const VARIANT_CLASSES = new Set([
  'BulletFire',
  'BulletGummyBear',
  'ObjectGroundIce',
  'ObjectGroundLava',
]);

/** Authored width/height straight off the SVG root element. */
function nativeSize(shapeId) {
  const file = join(shapesDir, `${shapeId}.svg`);
  if (!existsSync(file)) return null;

  const svg = readFileSync(file, 'utf8');
  const width = /\bwidth="([\d.]+)px"/.exec(svg);
  const height = /\bheight="([\d.]+)px"/.exec(svg);
  if (!width || !height) return null;

  return { width: Number(width[1]), height: Number(height[1]) };
}

const round = (n) => Number(n.toFixed(2));

const classes = [];
const variants = [];
const overlays = [];
const shapeFiles = new Map();
const problems = [];

for (const [className, spriteId] of Object.entries(PROJECTILE_SPRITES)) {
  const sprite = SPRITE_SHAPES[spriteId];
  if (!sprite) {
    problems.push(`${className}: sprite ${spriteId} is not in the mapping`);
    continue;
  }

  // Frame 1's shape — see the header note on animation.
  const shapeId = sprite.places[0];
  const native = nativeSize(shapeId);
  if (native === null) {
    problems.push(`${className}: shape ${shapeId} has no readable svg`);
    continue;
  }

  const [scaleX, scaleY] = sprite.scales?.[shapeId] ?? [1, 1];
  const key = `projectile-${shapeId}`;

  classes.push({
    className,
    spriteId,
    shapeId,
    key,
    width: round(native.width * scaleX),
    height: round(native.height * scaleY),
    frames: sprite.frameCount,
    shapeCount: new Set(sprite.places).size,
  });

  // One raster per shape, shared by every class that places it.
  if (!shapeFiles.has(shapeId)) {
    shapeFiles.set(shapeId, {
      key,
      file: `${shapeId}.svg`,
      width: round(native.width * RASTER_SCALE),
      height: round(native.height * RASTER_SCALE),
    });
  }

  // Selectable frames, for the classes the AS3 pins with `gotoAndStop`. Each
  // frame carries its own size: the shapes differ, and so can their matrices.
  if (VARIANT_CLASSES.has(className)) {
    const frames = [];
    for (const frameShape of new Set(sprite.places)) {
      const frameNative = nativeSize(frameShape);
      if (frameNative === null) {
        problems.push(`${className}: variant shape ${frameShape} has no readable svg`);
        continue;
      }
      const [fx, fy] = sprite.scales?.[frameShape] ?? [1, 1];
      const frameKey = `projectile-${frameShape}`;
      frames.push({
        key: frameKey,
        width: round(frameNative.width * fx),
        height: round(frameNative.height * fy),
      });
      if (!shapeFiles.has(frameShape)) {
        shapeFiles.set(frameShape, {
          key: frameKey,
          file: `${frameShape}.svg`,
          width: round(frameNative.width * RASTER_SCALE),
          height: round(frameNative.height * RASTER_SCALE),
        });
      }
    }
    variants.push({ className, frames });
  }

  // ── A second layer ────────────────────────────────────────────────────
  // Two clips draw *two* shapes at once: a static body with an animated
  // overlay above it. `timeline` is per-depth for exactly this, so the base is
  // layer 0 and the overlay layer 1 — absent on a frame where the clip shows
  // the body alone, which is how `ObjectMine` blinks.
  const timeline = sprite.timeline;
  if (timeline && timeline.some((layers) => layers.length > 1)) {
    const frames = [];
    for (const layers of timeline) {
      const overlayShape = layers[1];
      if (overlayShape === undefined) {
        frames.push(null);
        continue;
      }
      const overlayNative = nativeSize(overlayShape);
      if (overlayNative === null) {
        problems.push(`${className}: overlay shape ${overlayShape} has no readable svg`);
        continue;
      }
      const [ox, oy] = sprite.scales?.[overlayShape] ?? [1, 1];
      const overlayKey = `projectile-${overlayShape}`;
      frames.push({
        key: overlayKey,
        width: round(overlayNative.width * ox),
        height: round(overlayNative.height * oy),
      });
      if (!shapeFiles.has(overlayShape)) {
        shapeFiles.set(overlayShape, {
          key: overlayKey,
          file: `${overlayShape}.svg`,
          width: round(overlayNative.width * RASTER_SCALE),
          height: round(overlayNative.height * RASTER_SCALE),
        });
      }
    }
    overlays.push({ className, frames });
  }
}

if (problems.length > 0) {
  console.error('Could not resolve every projectile:');
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

const artRows = classes.map(
  (c) =>
    `  ${c.className}: { key: '${c.key}', width: ${c.width}, height: ${c.height} },` +
    ` // sprite ${c.spriteId} -> shape ${c.shapeId}` +
    (c.shapeCount > 1 ? `, 1 of ${c.shapeCount} across ${c.frames} frames` : ''),
);

// Built with explicit joins rather than nested template literals: a nested
// backtick inside an outer one is where three escaping slips came from this
// session, and this file is generated code generating generated code.
const variantRows = variants
  .map((entry) => {
    const frames = entry.frames
      .map((f) => `    { key: '${f.key}', width: ${f.width}, height: ${f.height} },`)
      .join('\n');
    return `  ${entry.className}: [\n${frames}\n  ],`;
  })
  .join('\n');

const overlayRows = overlays
  .map((entry) => {
    const frames = entry.frames
      .map((f) =>
        f === null
          ? '    null,'
          : `    { key: '${f.key}', width: ${f.width}, height: ${f.height} },`,
      )
      .join('\n');
    return `  ${entry.className}: [\n${frames}\n  ],`;
  })
  .join('\n');

const fileRows = [...shapeFiles.values()]
  .sort((a, b) => a.key.localeCompare(b.key))
  .map(
    (s) =>
      `  { key: '${s.key}', file: '${s.file}', width: ${s.width}, height: ${s.height} },`,
  );

const content = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run projectiles:data
 *
 * Which texture each projectile class draws, and at what size, resolved from
 * assets.swf. See scripts/gen-projectile-art.mjs for why the size comes from
 * the SWF's own placement matrix rather than from \`bulletRadius\`.
 *
 * Sizes are **design units** — the shape's authored size times the placement
 * matrix. They are a *visual* dimension and deliberately unrelated to the
 * collision radius, exactly as in the original.
 */

export interface ProjectileArt {
  /** Texture key, shared by every class that places the same shape. */
  key: string;
  /** Display width in design units. */
  width: number;
  /** Display height in design units. */
  height: number;
}

/**
 * By AS3 class name, as \`Bullet\` is constructed with.
 *
 * Four classes intentionally share \`projectile-215\` at different sizes — that
 * is the original's own arrangement, not a gap.
 */
export const PROJECTILE_ART: Readonly<Record<string, ProjectileArt>> = Object.freeze({
${artRows.join('\n')}
});

/**
 * Frames the caller chooses between, for the classes the AS3 pins with
 * \`gotoAndStop\` rather than playing.
 *
 * Ordered as the SWF places them, so index 0 is frame 1. **Not an animation**:
 * \`BulletFire\` and both ground patches pick one at random on spawn
 * (\`PartGameArea.as:3798\`, \`:1806\`), and \`BulletGummyBear\`'s index is its
 * bounce stage (\`:3828\`, \`:1953\`, \`:2003\`) — the same stage that scales its
 * damage x1 / x3 / x4.
 */
export const PROJECTILE_VARIANTS: Readonly<Record<string, readonly ProjectileArt[]>> =
  Object.freeze({
${variantRows}
});

/**
 * The moving layer, for the two clips that draw two shapes at once.
 *
 * One entry per timeline frame at 30fps, \`null\` where the clip shows only its
 * body. Both loop from the start; neither is tied to game state.
 *
 *   BulletBomb   a 16-frame ping-pong over a static body — **not** a fuse
 *                countdown. The countdown is a separate \`WarningTimedBomb\`
 *                indicator driven by \`bombTimer / bombTimerMax\`
 *                (\`PartGameArea.as:2531\`, \`:2542\`), already wired.
 *   ObjectMine   a 30-frame blink: body alone for 15 frames, then a second
 *                shape on top for 15. A plain idle loop — the AS3 contains no
 *                frame control for a mine at all, so there is no armed or
 *                triggered state to follow.
 */
export const PROJECTILE_OVERLAYS: Readonly<Record<string, readonly (ProjectileArt | null)[]>> =
  Object.freeze({
${overlayRows}
});

/** One raster per distinct shape, for the preloader. */
export const PROJECTILE_SHAPE_FILES: readonly {
  key: string;
  file: string;
  width: number;
  height: number;
}[] = Object.freeze([
${fileRows.join('\n')}
]);
`;

const outPath = join(projectRoot, 'src/assets/projectileArt.ts');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('projectileArt.ts is out of date. Run: npm run projectiles:data');
    process.exit(1);
  }
  console.log('projectileArt.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote projectileArt.ts — ${classes.length} classes, ${shapeFiles.size} distinct textures, ` +
    `${overlays.length} overlay timelines.`,
);
