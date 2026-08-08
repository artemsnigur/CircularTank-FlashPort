#!/usr/bin/env node
/**
 * Generates `scripts/lib/sprite-shapes.mjs` — which DefineShape ids each
 * DefineSprite places — by walking the SWF tag table directly.
 *
 *   node scripts/gen-sprite-shapes.mjs [--source <dir>] [--check]
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * The AS3 asset classes name a **sprite**: `BulletRocket` carries
 * `[Embed(source="/_assets/assets.swf", symbol="symbol251")]`, and `symbolN`
 * is SWF character id N. JPEXS exported `shapes/<id>.svg` keyed by **shape**
 * id, and a sprite's id is never a shape's id — sprite 251 places shape 250.
 *
 * Nothing in the extraction records that link, so looking up `shapes/251.svg`
 * fails and the art reads as missing. It is not missing: all 43 shapes the 26
 * projectile classes need are already extracted. **A failed lookup was
 * mistaken for absence** — the same error `docs/HANDOFF.md` §4 catalogues
 * elsewhere, and the reason this file exists rather than a re-extraction pass.
 *
 * ── Why parsing the SWF here is reasonable ────────────────────────────────
 * `SWFimported/scripts/_assets/assets.swf` is the very file the `[Embed]` tags
 * name, it ships in the repo, and it is **uncompressed** (`FWS`), so the tag
 * table walks with plain reads — no JPEXS, no GUI, no network. This is the
 * same move as `scripts/lib/mp3-probe.mjs`, which parses MPEG frame headers
 * out of JPEXS output rather than shelling out to a decoder.
 *
 * ── Scope ─────────────────────────────────────────────────────────────────
 * Every sprite in the file is mapped, not only the projectiles — the walk has
 * to visit them all anyway, and a partial map would invite a second pass to
 * widen it. Consuming it is a separate question; today only `sync-assets.mjs`
 * reads it, and only for projectile shapes.
 *
 * The mapping is **placement order with duplicates collapsed**, not a frame
 * timeline: a sprite that shows shape A on frames 1-8 and B on 9-16 yields
 * `[A, B]`. `frameCount` is carried separately so the two are never confused —
 * `BulletBomb` places 10 distinct shapes across 16 frames, and reading either
 * number as the other is wrong in both directions.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderSpriteShapes } from './lib/emit-sprite-shapes.mjs';

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
const swfPath = join(sourceRoot, 'scripts/_assets/assets.swf');

if (!existsSync(swfPath)) {
  console.error(`assets.swf not found at ${swfPath}.`);
  process.exit(1);
}

const swf = readFileSync(swfPath);

// `FWS` is uncompressed; `CWS` (zlib) and `ZWS` (LZMA) are not handled because
// this file is not one of them. Checked rather than assumed: a compressed SWF
// would otherwise parse as garbage and emit a plausible-looking empty mapping.
const signature = swf.toString('latin1', 0, 3);
if (signature !== 'FWS') {
  console.error(
    `assets.swf is "${signature}", not the uncompressed FWS this parser handles. ` +
      'Decompress it first, or teach this script zlib/LZMA.',
  );
  process.exit(1);
}

/* ── Tag codes, from the SWF 19 spec ─────────────────────────────────────── */
const TAG_END = 0;
const TAG_PLACE_OBJECT = 4;
const TAG_PLACE_OBJECT_2 = 26;
const TAG_PLACE_OBJECT_3 = 70;
const TAG_DEFINE_SPRITE = 39;

/**
 * Every tag that defines a shape — the four `DefineShape` versions and the two
 * `DefineMorphShape` ones.
 *
 * Collected rather than inferred from "does `shapes/<id>.svg` exist", so the
 * mapping states what the SWF says instead of what an earlier tool happened to
 * export. The two agree today (1015 either way); if a future extraction drops
 * a file, that becomes a visible mismatch rather than a silent reclassification.
 */
const SHAPE_TAGS = new Set([2, 22, 32, 83, 46, 84]);

/** PlaceObject2/3 flag bit for "this placement names a character id". */
const PLACE_HAS_CHARACTER = 0x02;

/**
 * Start of the tag table.
 *
 * The header is `FWS` + version + fileLength (8 bytes), then a **bit-packed**
 * RECT for the stage bounds, then frameRate and frameCount (4 bytes). The RECT
 * is variable width — 5 bits of `nbits`, then four fields of `nbits` each — so
 * it has to be measured rather than skipped by a constant.
 */
function tagTableStart(buffer) {
  const nbits = buffer[8] >> 3; // top 5 bits of the first RECT byte
  const totalBits = 5 + nbits * 4;
  return 8 + Math.ceil(totalBits / 8) + 4;
}

/**
 * Walks a tag range, recursing into sprite bodies.
 *
 * `owner` is the sprite whose timeline we are inside, or null at the top
 * level. Placements are only meaningful relative to an owner, which is why a
 * top-level PlaceObject contributes nothing here.
 */
function walkTags(buffer, start, end, owner, sprites, shapeIds) {
  let offset = start;

  while (offset + 2 <= end) {
    const header = buffer.readUInt16LE(offset);
    offset += 2;

    const code = header >> 6;
    let length = header & 0x3f;
    // 0x3f means "long form": the real length follows as a uint32.
    if (length === 0x3f) {
      length = buffer.readUInt32LE(offset);
      offset += 4;
    }

    const body = offset;
    offset += length;
    if (offset > end) break;

    if (code === TAG_DEFINE_SPRITE) {
      const id = buffer.readUInt16LE(body);
      const frameCount = buffer.readUInt16LE(body + 2);
      const entry = { frameCount, places: [] };
      sprites.set(id, entry);
      // A sprite's tags live inside its own body, so the recursion bound is
      // this tag's end, not the file's.
      walkTags(buffer, body + 4, offset, entry, sprites, shapeIds);
    } else if (SHAPE_TAGS.has(code)) {
      shapeIds.add(buffer.readUInt16LE(body));
    } else if (owner !== null) {
      if (code === TAG_PLACE_OBJECT) {
        // PlaceObject (v1) always carries a character id first.
        owner.places.push(buffer.readUInt16LE(body));
      } else if (code === TAG_PLACE_OBJECT_2 || code === TAG_PLACE_OBJECT_3) {
        const flags = buffer[body];
        // PlaceObject2: flags(1) + depth(2). PlaceObject3 adds a second flag
        // byte, so its character id sits two bytes further in.
        const idOffset = body + 1 + (code === TAG_PLACE_OBJECT_2 ? 2 : 4);
        if (flags & PLACE_HAS_CHARACTER) {
          owner.places.push(buffer.readUInt16LE(idOffset));
        }
      }
    }

    if (code === TAG_END) break;
  }
}

const sprites = new Map();
const shapeIds = new Set();
walkTags(swf, tagTableStart(swf), swf.length, null, sprites, shapeIds);

if (sprites.size === 0) {
  console.error('No DefineSprite tags found — the tag walk failed, not the file.');
  process.exit(1);
}


/* ── Emit ────────────────────────────────────────────────────────────────── */
const content = renderSpriteShapes(sprites, shapeIds);
const outPath = join(projectRoot, 'scripts/lib/sprite-shapes.mjs');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('sprite-shapes.mjs is out of date. Run: npm run sprites:data');
    process.exit(1);
  }
  console.log('sprite-shapes.mjs is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);

const placed = new Set([...sprites.values()].flatMap((s) => s.places));
const placedShapes = [...placed].filter((id) => shapeIds.has(id)).length;
console.log(
  `Wrote sprite-shapes.mjs — ${sprites.size} sprites, ${shapeIds.size} shapes defined, ` +
    `${placedShapes} of ${placed.size} placed ids are shapes.`,
);
