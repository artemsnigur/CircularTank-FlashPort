/**
 * Verifies the asset pipeline resolves at build time. If `npm run assets:sync`
 * was never run, or a filename in the sample manifest is wrong, this fails
 * here instead of 404-ing silently on a device.
 */
import { describe, expect, it } from 'vitest';
import { assetCounts, audioUrl, imageUrl, MissingAssetError, shapeUrl } from './registry';
import { SAMPLE_AUDIO, SAMPLE_FONTS, SAMPLE_IMAGES, SAMPLE_SHAPES } from './manifest';

describe('asset registry', () => {
  it('has synced assets present', () => {
    expect(assetCounts.images).toBeGreaterThan(0);
    expect(assetCounts.audio).toBeGreaterThan(0);
    expect(assetCounts.shapes).toBeGreaterThan(0);
  });

  it('resolves every image in the sample manifest', () => {
    for (const asset of SAMPLE_IMAGES) {
      expect(asset.url, asset.file).toBeTypeOf('string');
      expect(asset.url.length).toBeGreaterThan(0);
    }
  });

  it('resolves every shape and audio file in the sample manifest', () => {
    for (const asset of [...SAMPLE_SHAPES, ...SAMPLE_AUDIO]) {
      expect(asset.url, asset.file).toBeTypeOf('string');
      expect(asset.url.length).toBeGreaterThan(0);
    }
  });

  it('keeps original SWF filenames so assets stay traceable to symbols.csv', () => {
    // The leading digits are the SWF library ID. Losing them breaks the only
    // link back to symbolClass/symbols.csv.
    for (const asset of [...SAMPLE_IMAGES, ...SAMPLE_AUDIO, ...SAMPLE_SHAPES]) {
      expect(asset.file, `${asset.file} should start with its SWF library ID`).toMatch(/^\d+/);
    }
    for (const font of SAMPLE_FONTS) {
      expect(font.file).toMatch(/^\d+/);
    }
  });

  it('uses unique loader keys', () => {
    const keys = [...SAMPLE_IMAGES, ...SAMPLE_AUDIO, ...SAMPLE_SHAPES].map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('throws a directed error for an unknown asset instead of returning undefined', () => {
    expect(() => imageUrl('does-not-exist.png')).toThrow(MissingAssetError);
    expect(() => audioUrl('nope.mp3')).toThrow(/Unknown audio asset/);
    expect(() => shapeUrl('nope.svg')).toThrow(/Unknown shape asset/);
  });
});
