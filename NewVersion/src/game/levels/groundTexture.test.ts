import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BASE_TEXTURE_SIZE,
  DEFAULT_GROUND,
  EXTRACTED_GROUND,
  UPSCALE_TEXTURE_SIZE,
  groundFor,
} from './groundTexture';
import { SAMPLE_IMAGES } from '../../assets/manifest';

describe('the ground every level draws', () => {
  it('is the upscaled tile, at the extractions own repeat size', () => {
    // The property that made this safe to apply to all 405 levels rather than
    // a chosen few: one repeat still covers 256 design units, so the layout is
    // unchanged and only pixel density differs.
    expect(DEFAULT_GROUND.key).toBe('ground-desert-hi');
    expect(UPSCALE_TEXTURE_SIZE * DEFAULT_GROUND.tileScale).toBe(BASE_TEXTURE_SIZE);
  });

  it('is the same on every level', () => {
    // The 1-1 / 1-6 comparison is over. If a per-level rule ever comes back
    // (themes, most likely), this is the test that will need rewriting, which
    // is the point — the uniformity should not lapse silently.
    for (let world = 1; world <= 9; world += 1) {
      for (let level = 1; level <= 45; level += 1) {
        expect(groundFor(world, level), `${world}-${level}`).toBe(DEFAULT_GROUND);
      }
    }
  });

  it('keeps the extracted tile available as the fallback', () => {
    expect(EXTRACTED_GROUND).toEqual({ key: 'ground-desert', tileScale: 1 });
  });

  it('both keys are in the manifest, so something preloads them', () => {
    const keys = new Set(SAMPLE_IMAGES.map((a) => a.key));
    expect(keys.has(DEFAULT_GROUND.key)).toBe(true);
    expect(keys.has(EXTRACTED_GROUND.key)).toBe(true);
  });
});

describe('the asset behind it', () => {
  const file = readFileSync('src/assets/images/351_upscale.webp');

  it('is a WebP, not the PNG it started as', () => {
    // RIFF....WEBP
    expect(file.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(file.subarray(8, 12).toString('ascii')).toBe('WEBP');
  });

  it('is still 1024x1024, read from the file', () => {
    // UPSCALE_TEXTURE_SIZE is the arithmetic the tile scale depends on. If the
    // asset is replaced at another size the ground silently draws at the wrong
    // repeat, so this is read rather than trusted.
    //
    // Lossy VP8 stores 14-bit width/height at byte 26 of the VP8 chunk.
    expect(file.subarray(12, 16).toString('ascii')).toBe('VP8 ');
    const width = file.readUInt16LE(26) & 0x3fff;
    const height = file.readUInt16LE(28) & 0x3fff;
    expect([width, height]).toEqual([UPSCALE_TEXTURE_SIZE, UPSCALE_TEXTURE_SIZE]);
  });

  it('is smaller than the 256x256 tile it replaces', () => {
    // The point of the encoding change: 4x the resolution for less than half
    // the bytes, so the size objection to shipping it everywhere is gone. It
    // was 571 KB as a PNG, which was larger than the entire app bundle.
    const original = readFileSync('src/assets/images/351.png');
    expect(file.byteLength).toBeLessThan(original.byteLength);
    expect(file.byteLength).toBeLessThan(60_000);
  });
});
