/**
 * Verifies the asset pipeline resolves at build time. If `npm run assets:sync`
 * was never run, or a filename in the sample manifest is wrong, this fails
 * here instead of 404-ing silently on a device.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import {
  assetCounts,
  audioUrl,
  audioUrls,
  imageUrl,
  imageUrls,
  MissingAssetError,
  shapeUrl,
  shapeUrls,
} from './registry';
type UrlMap = Record<string, string>;
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

/**
 * "Never rename an extracted file. A test enforces this."
 *
 * It did not. The check above covers the sample manifest — **7 entries against
 * 160 files on disk**, about 4% of the claim — so renaming any of the other 153,
 * including 26 of the 31 images and nearly all 123 MP3s, passed green. The
 * leading number is the SWF library ID and the only link back to
 * `symbolClass/symbols.csv`; losing it is unrecoverable without a re-export.
 *
 * These widen it to the full extraction by walking the `import.meta.glob` maps
 * rather than a hand-listed manifest, so a newly synced file is covered the
 * moment it appears.
 *
 * They do **not** retire knip's findings for `imageUrls`/`audioUrls`/
 * `shapeUrls`. knip is configured so test files are not consumers — that is the
 * whole point of the configuration — so importing them here changes nothing,
 * and all three remain correctly flagged as having no production consumer.
 */
describe('every extracted file keeps its SWF library ID', () => {
  const ID = /^(\d+)(?:[_.]|$)/;

  const groups: [string, UrlMap][] = [
    ['images', imageUrls],
    ['audio', audioUrls],
    ['shapes', shapeUrls],
  ];

  it.each(groups)('%s filenames all start with their library ID', (label, urls) => {
    const names = Object.keys(urls);
    // Guard against a vacuous pass: an empty glob would satisfy every
    // assertion below without checking anything.
    expect(names.length, `${label} glob resolved nothing — run npm run assets:sync`).toBeGreaterThan(0);

    for (const name of names) {
      expect(name, `${name} has lost its SWF library ID prefix`).toMatch(ID);
    }
  });

  it('covers the whole extraction, not a sample', () => {
    const total = Object.keys(imageUrls).length + Object.keys(audioUrls).length + Object.keys(shapeUrls).length;
    // The number this check used to cover was 7. Asserting the real floor stops
    // it quietly narrowing back to a handful.
    expect(total).toBeGreaterThanOrEqual(120);
  });

  /**
   * The link itself, in both directions.
   *
   * JPEXS exports two shapes of filename, and only one of them has a symbol:
   *
   *   `166_CustomCursor.png`   a named character — id AND name in symbols.csv
   *   `351.png`                an unnamed character — id is not in the table
   *
   * Measured across the current extraction: 118 named files, all 118 present in
   * `symbols.csv`, all 118 names matching; 43 bare files, none present, as
   * expected. A first draft of this asserted every file resolved and failed on
   * those 43 — the assumption was wrong, not the export.
   *
   * So the check is on the named ones, and it verifies the **name** as well as
   * the id. An id that survives a rename while pointing at a different symbol
   * is exactly as broken as a lost id, and only comparing names catches it.
   */
  /**
   * Files we produced, which are not SWF exports.
   *
   * The `<id>_<Name>` convention means the suffix is the symbol's name in
   * `symbols.csv`, so a derived file lands in that shape without being a named
   * character — `351_upscale.png` is a 4x upscale of the unnamed `351.png`, and
   * there is no symbol 351 to match. Exempting it silently would open the
   * convention to anything with an underscore, so it is declared here instead
   * and checked separately below.
   */
  const DERIVED_ASSETS: ReadonlySet<string> = new Set(['351_upscale.png']);

  it('every derived asset is real and derives from a file that exists', () => {
    const images = new Set(Object.keys(imageUrls));
    for (const file of DERIVED_ASSETS) {
      // Not stale: a declaration for a file nobody ships is a lie about what
      // the exemption covers.
      expect(images.has(file), `${file} is declared derived but is not in the registry`).toBe(true);

      // The id prefix must name a file that actually exists, so a derived asset
      // cannot invent a library ID that links to nothing.
      const id = /^(\d+)_/.exec(file)?.[1];
      expect(id, `${file} has no library-ID prefix`).toBeTruthy();
      const hasSource = [...images].some((f) => new RegExp(`^${id}\.[a-z0-9]+$`, 'i').test(f));
      expect(hasSource, `${file} claims to derive from ${id}, which is not extracted`).toBe(true);
    }
  });

  it('every named file matches symbols.csv on both id and name', () => {
    const csv = readFileSync('../SWFimported/symbolClass/symbols.csv', 'utf8');
    const byId = new Map<string, string>();
    for (const line of csv.split(/\r?\n/)) {
      const m = /^(\d+);"(.+)"$/.exec(line);
      if (m) byId.set(m[1]!, m[2]!);
    }
    expect(byId.size, 'symbols.csv parsed as empty').toBeGreaterThan(400);

    const named = /^(\d+)_(.+?)\.[a-z0-9]+$/i;
    const problems: string[] = [];
    let checked = 0;

    for (const file of [
      ...Object.keys(imageUrls),
      ...Object.keys(audioUrls),
      ...Object.keys(shapeUrls),
    ]) {
      if (DERIVED_ASSETS.has(file)) continue; // ours, not JPEXS's — see above
      const m = named.exec(file);
      if (!m) continue; // bare id — an unnamed character, nothing to link to
      checked += 1;
      const [, id, name] = m;
      const symbol = byId.get(id!);
      if (!symbol) problems.push(`${file}: id ${id} is not in symbols.csv`);
      else if (!name!.startsWith(symbol)) {
        problems.push(`${file}: id ${id} is "${symbol}" in symbols.csv`);
      }
    }

    expect(checked, 'no named files found — the extraction looks wrong').toBeGreaterThan(100);
    expect(problems, problems.join('\n')).toEqual([]);
  });
});

/**
 * The other 42 files — and why the previous check was not "100%".
 *
 * The `symbols.csv` cross-check covers the 118 *named* files. Reporting that as
 * full coverage would redefine the denominator from "every extracted file" to
 * "every named file" — the same move as counting 29/557 against a total that
 * quietly excludes what is inconvenient. The unnamed files (`351.png`,
 * `169.mp3`) carry the same SWF library ID and the registry resolves them by it;
 * there is simply no symbol table to check them against.
 *
 * So the table for those is the extraction itself. `SWFimported/` is read-only
 * and is the source `assets:sync` copies from, which makes "the synced filename
 * equals the extracted filename" checkable for **every** file, named or not.
 * This is the mechanism that lets `CLAUDE.md`'s sentence stay absolute.
 *
 * Note this is strictly stronger than the id-prefix check above: renaming
 * `351.png` to `352.png` keeps a valid-looking prefix and passes that, while
 * pointing at a different character.
 */
describe('every synced file still matches the extraction it came from', () => {
  // `sounds` becomes `audio` on the way in — see scripts/sync-assets.mjs.
  const PAIRS: [synced: string, source: string][] = [
    ['images', 'images'],
    ['audio', 'sounds'],
    ['shapes', 'shapes'],
    ['fonts', 'fonts'],
  ];

  it.each(PAIRS)('src/assets/%s files all come from a tracked source', (synced, source) => {
    const syncedDir = `src/assets/${synced}`;
    const sourceDir = `../SWFimported/${source}`;
    // `src/assets/` is gitignored, so every file in it must be reproducible
    // from something that is tracked: the extraction, or the assets we
    // authored. A file from neither is untracked and would vanish on a fresh
    // clone — which is exactly what this check exists to prevent, so the
    // authored root is added to the sources rather than exempted from them.
    const authoredDir = `assets-authored/${synced}`;
    if (!existsSync(syncedDir)) {
      throw new Error(`${syncedDir} is missing — run npm run assets:sync`);
    }

    const inSource = new Set(readdirSync(sourceDir));
    const inAuthored = existsSync(authoredDir) ? new Set(readdirSync(authoredDir)) : new Set();
    const names = readdirSync(syncedDir);
    expect(names.length, `${syncedDir} is empty — run npm run assets:sync`).toBeGreaterThan(0);

    const strays = names.filter((n) => !inSource.has(n) && !inAuthored.has(n));
    expect(
      strays,
      `renamed or unknown in ${syncedDir}: ${strays.join(', ')}. The leading number ` +
        `is the SWF library ID; it must match SWFimported/${source} exactly.`,
    ).toEqual([]);
  });

  it('covers every extracted file, named or not', () => {
    // Guards the denominator. Shapes are curated (5 of 1015 by default), so the
    // floor is the other three folders plus whatever shapes are present.
    const total = PAIRS.reduce((sum, [synced]) => sum + readdirSync(`src/assets/${synced}`).length, 0);
    expect(total).toBeGreaterThanOrEqual(158);
  });
});
