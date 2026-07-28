import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BASE_TEXTURE_SIZE,
  DEFAULT_GROUND,
  EXTRACTED_GROUND,
  GROUND_KEYS,
  UPSCALED_THEMES,
  UPSCALE_TEXTURE_SIZE,
  UPSCALE_TILE_SCALE,
  groundFor,
  groundForTheme,
} from './groundTexture';
import { LEVELS } from './levelData';
import type { LevelTheme } from './levelData';
import { Worlds } from '../config/constants';
import { SAMPLE_IMAGES } from '../../assets/manifest';

const THEMES = Object.keys(GROUND_KEYS) as LevelTheme[];

describe('one tile per theme', () => {
  it('covers all nine, with no theme sharing a key', () => {
    expect(THEMES).toHaveLength(9);
    expect(new Set(Object.values(GROUND_KEYS)).size).toBe(9);
  });

  it('names exactly the themes the level tables use', () => {
    // Derived from the data rather than hand-listed: a regenerated table that
    // introduced a tenth theme would fail here instead of silently drawing the
    // fallback for it.
    const used = new Set(LEVELS.flat().map((spec) => spec.theme));
    expect([...used].sort()).toEqual([...THEMES].sort());
  });

  it('matches the world names, which is what the picker labels worlds with', () => {
    // Theme is per-level data and world order is a separate constant; they
    // agree across all 405 rows today, and the picker would look wrong if they
    // stopped.
    expect([...Worlds]).toEqual(
      LEVELS.map((world) => world[0].theme),
    );
  });

  it('gives every world of the campaign a distinct ground', () => {
    const keys = LEVELS.map((world) => groundForTheme(world[0].theme).key);
    expect(new Set(keys).size).toBe(9);
  });
});

describe('the repeat size is the same for every theme', () => {
  it('an upscaled tile shrinks to the extractions own 256 units', () => {
    // The property that made the upscale safe to apply at all: one repeat still
    // covers 256 design units, so the layout is unchanged and only pixel
    // density differs.
    expect(UPSCALE_TEXTURE_SIZE * UPSCALE_TILE_SCALE).toBe(BASE_TEXTURE_SIZE);
  });

  it('a 256 tile draws at scale 1, so both cover 256 units', () => {
    for (const theme of THEMES) {
      const ground = groundForTheme(theme);
      const size = UPSCALED_THEMES.has(theme) ? UPSCALE_TEXTURE_SIZE : BASE_TEXTURE_SIZE;
      expect(size * ground.tileScale, theme).toBe(BASE_TEXTURE_SIZE);
    }
  });

  it('the scale follows the upscale set rather than being set per theme', () => {
    // So adding an upscale cannot leave a 1024 texture tiling at scale 1, which
    // would draw every ground feature 4x too large — the treatment that lost
    // the in-game comparison.
    for (const theme of THEMES) {
      const expected = UPSCALED_THEMES.has(theme) ? UPSCALE_TILE_SCALE : 1;
      expect(groundForTheme(theme).tileScale, theme).toBe(expected);
    }
  });
});

describe('which themes have an authored upscale', () => {
  it('is Desert alone, and the other eight are the raw extraction', () => {
    // A known gap, not an oversight — see the module header. World 1 resolves
    // sharper than the rest on a high-density display.
    expect([...UPSCALED_THEMES]).toEqual(['Desert']);
    expect(groundForTheme('Desert')).toEqual({ key: 'ground-desert-hi', tileScale: 0.25 });
    expect(groundForTheme('Hell')).toEqual({ key: 'ground-hell', tileScale: 1 });
  });

  it('an upscaled theme keys off its base name plus -hi', () => {
    for (const theme of UPSCALED_THEMES) {
      expect(groundForTheme(theme).key).toBe(`${GROUND_KEYS[theme]}-hi`);
    }
  });
});

describe('the fallback', () => {
  it('is used when a level carries no theme at all', () => {
    // Dev levels are synthetic specs; a missing theme must draw something
    // rather than crash the scene on an undefined texture key.
    expect(groundFor(undefined)).toBe(DEFAULT_GROUND);
  });

  it('is the Desert upscale', () => {
    expect(DEFAULT_GROUND).toEqual({ key: 'ground-desert-hi', tileScale: UPSCALE_TILE_SCALE });
  });

  it('keeps the extracted tile available for reference', () => {
    expect(EXTRACTED_GROUND).toEqual({ key: 'ground-desert', tileScale: 1 });
  });
});

describe('every key is preloaded', () => {
  it('all nine themes, the upscale and the fallback are in the manifest', () => {
    // A key with no manifest entry is a missing texture at runtime, which
    // Phaser renders as a green box rather than failing loudly.
    const keys = new Set(SAMPLE_IMAGES.map((a) => a.key));

    for (const theme of THEMES) {
      expect(keys.has(groundForTheme(theme).key), theme).toBe(true);
    }
    expect(keys.has(DEFAULT_GROUND.key)).toBe(true);
    expect(keys.has(EXTRACTED_GROUND.key)).toBe(true);
  });

  it('the scene draws the level own theme, not a world number', () => {
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).toContain('groundFor(this.levelSpec?.theme)');
    // And after resolveLevelSpec, or every level would draw the fallback.
    expect(scene.indexOf('this.resolveLevelSpec();')).toBeLessThan(
      scene.indexOf('groundFor(this.levelSpec?.theme)'),
    );
  });
});

/**
 * The startup cost of nine grounds.
 *
 * `PreloadScene` loads every `SAMPLE_IMAGES` entry before the menu appears, so
 * each tile is paid on first load whether or not the player reaches that world.
 * A budget rather than a comment, because a comment saying "keep this small"
 * enforces nothing.
 */
describe('the ground tiles stay within their preload budget', () => {
  const bytes = (key: string): number => {
    const asset = SAMPLE_IMAGES.find((a) => a.key === key);
    if (!asset) throw new Error(`No manifest entry for ${key}`);
    return readFileSync(`src/assets/images/${asset.file}`).byteLength;
  };

  it('is under 800 KB for all nine plus the upscale', () => {
    // 738 KB today, measured — the eight raw PNGs are 604 KB of it. The
    // headroom is deliberate slack, not room to grow: adding a tenth tile or
    // swapping one for something larger should be a decision, and this is what
    // makes it one. WebP is the fix when it binds — it took the 1024 Desert
    // upscale to 34 KB, and these are flat noise.
    const keys = new Set([
      ...Object.values(GROUND_KEYS),
      ...[...UPSCALED_THEMES].map((t) => `${GROUND_KEYS[t]}-hi`),
    ]);
    const total = [...keys].reduce((sum, key) => sum + bytes(key), 0);

    expect(total).toBeGreaterThan(700_000);
    expect(total).toBeLessThan(800_000);
  });

  it('the upscale is smaller than the tile it upscales', () => {
    // 4x the resolution for less than half the bytes — which is why the other
    // eight being raw PNGs is the expensive half of the set, not the upscale.
    expect(bytes('ground-desert-hi')).toBeLessThan(bytes('ground-desert'));
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
