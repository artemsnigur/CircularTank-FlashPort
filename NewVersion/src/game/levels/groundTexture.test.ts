import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BASE_TEXTURE_SIZE,
  DEFAULT_GROUND,
  UPSCALE_TEXTURE_SIZE,
  comparisonLevels,
  groundFor,
} from './groundTexture';
import { getLevel } from './levelData';
import { SAMPLE_IMAGES } from '../../assets/manifest';

describe('the comparison levels', () => {
  it('1-1 keeps the original tiling at 4x density', () => {
    const g = groundFor(1, 1);
    expect(g.key).toBe('ground-desert-hi');
    // One repeat must still cover 256 design units, or the layout has changed
    // and this stops being a like-for-like sharpness comparison.
    expect(UPSCALE_TEXTURE_SIZE * g.tileScale).toBe(BASE_TEXTURE_SIZE);
  });

  it('1-6 draws one texel per design unit', () => {
    const g = groundFor(1, 6);
    expect(g.key).toBe('ground-desert-hi');
    expect(g.tileScale).toBe(1);
  });

  it("1-6's room actually fits inside a single tile", () => {
    // The whole claim for option 2 is "no repetition". That holds only while
    // the room is no larger than the texture — a bigger room would repeat and
    // the comparison would quietly become meaningless. 1-6 is 800x600 since
    // the world-1 standardisation, so this also pins that dependency.
    const spec = getLevel(1, 6)!;
    expect(spec.roomWidth).toBeLessThanOrEqual(UPSCALE_TEXTURE_SIZE);
    expect(spec.roomHeight).toBeLessThanOrEqual(UPSCALE_TEXTURE_SIZE);
    expect([spec.roomWidth, spec.roomHeight]).toEqual([800, 600]);
  });

  it('changes nothing else', () => {
    expect(comparisonLevels().sort()).toEqual(['1-1', '1-6']);

    const untouched: string[] = [];
    for (let world = 1; world <= 9; world += 1) {
      for (let level = 1; level <= 45; level += 1) {
        if (world === 1 && (level === 1 || level === 6)) continue;
        if (groundFor(world, level) !== DEFAULT_GROUND) untouched.push(`${world}-${level}`);
      }
    }
    expect(untouched).toEqual([]);
  });

  it('the default is still the extracted tile', () => {
    expect(DEFAULT_GROUND).toEqual({ key: 'ground-desert', tileScale: 1 });
  });
});

describe('the keys resolve', () => {
  it('every key used here is in the manifest', () => {
    const keys = new Set(SAMPLE_IMAGES.map((a) => a.key));
    expect(keys.has(DEFAULT_GROUND.key)).toBe(true);
    for (const id of comparisonLevels()) {
      const [w, l] = id.split('-').map(Number);
      const key = groundFor(w, l).key;
      expect(keys.has(key), `${key} is not in SAMPLE_IMAGES, so nothing preloads it`).toBe(true);
    }
  });

  it('the upscale really is 1024x1024, read from the file', () => {
    // UPSCALE_TEXTURE_SIZE is arithmetic everything above depends on. If the
    // asset is ever replaced at a different size, both options silently draw
    // at the wrong scale — 1-1 would stop matching the original tiling and
    // 1-6 would start repeating. Read the PNG header rather than trust it.
    const file = readFileSync('src/assets/images/351_upscale.png');
    expect(file.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const width = file.readUInt32BE(16);
    const height = file.readUInt32BE(20);
    expect([width, height]).toEqual([UPSCALE_TEXTURE_SIZE, UPSCALE_TEXTURE_SIZE]);

    // Colour type 2 = RGB. It arrived as 6 (RGBA) with every pixel opaque,
    // which cost 28% of the file for nothing.
    expect(file.readUInt8(25), 'expected RGB; the alpha strip has been undone').toBe(2);
  });
});
