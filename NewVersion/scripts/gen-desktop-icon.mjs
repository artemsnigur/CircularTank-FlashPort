/**
 * Draws `electron/icon.ico` — the desktop build's Windows icon.
 *
 * ── Why this is generated and not an extracted asset ──────────────────────
 * There is no square source to crop. The tank is SVG shapes assembled at
 * runtime, the one authored raster is a wide menu wallpaper, and rasterising
 * the SVGs would mean adding a renderer (`sharp`, `resvg`) to the toolchain to
 * produce a single 256px image. So the icon is drawn here instead: pure Node,
 * no dependencies, and reproducible — run the script, get the same bytes.
 *
 * It is committed rather than built on demand. `electron-builder` reads it as
 * an input, and a build step that generates its own inputs is a build step
 * that fails differently on a clean clone.
 *
 * ── The drawing ──────────────────────────────────────────────────────────
 * The game is a tank that is a circle, seen from above, so the icon is the
 * silhouette from directly overhead: hull ring, turret disc, barrel. Its
 * colours are the menu's — the steel of the wordmark over the deep blue the
 * canvas clears to.
 *
 * Anti-aliasing is 4x4 supersampling of an exact coverage test rather than a
 * blur, because every edge here is an analytic circle or rectangle and
 * sampling them directly is both simpler and sharper than filtering afterwards.
 */
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const SIZE = 256;
const SS = 4; // supersampling factor per axis

/** The menu's palette, so the icon and the first screen agree. */
const DEEP = [11, 13, 18]; // the canvas clear colour
const HULL = [58, 74, 96];
const HULL_EDGE = [126, 148, 176];
const TURRET = [92, 112, 140];
const BARREL = [150, 170, 196];

/** Distance from the icon's centre, in pixels. */
function radius(x, y) {
  return Math.hypot(x - SIZE / 2, y - SIZE / 2);
}

/**
 * The colour at a point, or null for transparent.
 *
 * Ordered back to front: the hull disc, its bright rim, then the barrel, then
 * the turret cap over the barrel's root — the same order the game stacks them.
 */
function sample(x, y) {
  const r = radius(x, y);
  const hullR = SIZE * 0.4;
  const turretR = SIZE * 0.19;

  /*
   * The barrel runs from the centre out **past** the hull's edge.
   *
   * The first version clipped everything to the hull disc, so the barrel only
   * existed in the gap between the turret and the rim and read as a notch cut
   * out of a donut — the icon did not look like a tank at all. Overhanging the
   * hull is what makes the silhouette a gun rather than a ring, and it is what
   * the game's own tank does.
   */
  const along = x - SIZE / 2;
  const across = Math.abs(y - SIZE / 2);
  const onBarrel = along > 0 && along < SIZE * 0.49 && across < SIZE * 0.065;

  // Front to back. The turret cap sits over the barrel's root, so it wins.
  if (r < turretR) return TURRET;
  if (onBarrel) return BARREL;
  if (r > hullR) return null;

  // A bright rim just inside the hull's edge reads as a lit metal lip and
  // keeps the silhouette legible against a dark taskbar.
  if (r > hullR - SIZE * 0.035) return HULL_EDGE;
  return HULL;
}

/** RGBA pixels, supersampled. */
function render() {
  const px = Buffer.alloc(SIZE * SIZE * 4);

  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      let r = 0;
      let g = 0;
      let b = 0;
      let hits = 0;

      for (let sy = 0; sy < SS; sy += 1) {
        for (let sx = 0; sx < SS; sx += 1) {
          const c = sample(x + (sx + 0.5) / SS, y + (sy + 0.5) / SS);
          if (c !== null) {
            r += c[0];
            g += c[1];
            b += c[2];
            hits += 1;
          }
        }
      }

      const i = (y * SIZE + x) * 4;
      const total = SS * SS;
      if (hits === 0) {
        // Transparent, but carry the deep blue underneath so a viewer that
        // ignores alpha shows the menu's colour rather than black.
        px[i] = DEEP[0];
        px[i + 1] = DEEP[1];
        px[i + 2] = DEEP[2];
        px[i + 3] = 0;
      } else {
        px[i] = Math.round(r / hits);
        px[i + 1] = Math.round(g / hits);
        px[i + 2] = Math.round(b / hits);
        px[i + 3] = Math.round((hits / total) * 255);
      }
    }
  }

  return px;
}

// ── PNG container ──────────────────────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function toPng(px) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(SIZE, 0);
  ihdr.writeUInt32BE(SIZE, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  // One filter byte (0 = None) per scanline. Every edge here is already
  // smooth, so a predictor would buy little and cost clarity.
  const raw = Buffer.alloc(SIZE * (SIZE * 4 + 1));
  for (let y = 0; y < SIZE; y += 1) {
    raw[y * (SIZE * 4 + 1)] = 0;
    px.copy(raw, y * (SIZE * 4 + 1) + 1, y * SIZE * 4, (y + 1) * SIZE * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── ICO container ──────────────────────────────────────────────────────────

/**
 * A one-image .ico wrapping the PNG directly.
 *
 * PNG-in-ICO is supported from Windows Vista and is what every modern icon
 * uses at 256px — the older BMP form cannot express 256x256 at all in the
 * directory entry, which is why the width and height bytes below are **0**.
 * That zero means 256; it is not a placeholder.
 */
function toIco(png) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(1, 4); // one image

  const entry = Buffer.alloc(16);
  entry[0] = 0; // width  — 0 means 256
  entry[1] = 0; // height — 0 means 256
  entry[2] = 0; // palette size: not paletted
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4); // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);

  return Buffer.concat([header, entry, png]);
}

const here = dirname(fileURLToPath(import.meta.url));
const out = join(here, '..', 'electron', 'icon.ico');
const ico = toIco(toPng(render()));
writeFileSync(out, ico);
console.log(`icon.ico written — ${SIZE}x${SIZE}, ${ico.length} bytes`);
