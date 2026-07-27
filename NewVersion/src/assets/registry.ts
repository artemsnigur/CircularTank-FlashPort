/**
 * Build-time registry of every extracted SWF asset.
 *
 * Files live in src/assets/ (not public/) on purpose: going through Vite means
 * each one gets a content hash, is verified to exist at build time, and shows
 * up in the bundle report. A typo in an asset name fails the build instead of
 * 404-ing on a phone.
 *
 * Filenames are the raw JPEXS exports — the leading number is the SWF library
 * ID, which cross-references SWFimported/symbolClass/symbols.csv. Never rename
 * them; use the `key` helpers below if you want a friendlier handle.
 *
 * Populate the folders with: npm run assets:sync
 */

type UrlMap = Record<string, string>;

function byFilename(modules: Record<string, unknown>): UrlMap {
  const out: UrlMap = {};
  for (const [path, url] of Object.entries(modules)) {
    const filename = path.slice(path.lastIndexOf('/') + 1);
    out[filename] = url as string;
  }
  return out;
}

/** filename (e.g. "351.png") -> hashed URL */
export const imageUrls: UrlMap = byFilename(
  import.meta.glob('./images/*.{png,jpg,jpeg,gif,webp}', {
    eager: true,
    query: '?url',
    import: 'default',
  }),
);

/** filename (e.g. "112_MusicMenu.mp3") -> hashed URL */
export const audioUrls: UrlMap = byFilename(
  import.meta.glob('./audio/*.mp3', { eager: true, query: '?url', import: 'default' }),
);

/** filename (e.g. "3.svg") -> hashed URL */
export const shapeUrls: UrlMap = byFilename(
  import.meta.glob('./shapes/*.svg', { eager: true, query: '?url', import: 'default' }),
);

export class MissingAssetError extends Error {
  constructor(kind: string, filename: string, available: string[]) {
    const hint =
      available.length === 0
        ? 'The folder is empty — run "npm run assets:sync".'
        : `Available: ${available.slice(0, 8).join(', ')}${available.length > 8 ? ', …' : ''}`;
    super(`Unknown ${kind} asset "${filename}". ${hint}`);
    this.name = 'MissingAssetError';
  }
}

function resolve(map: UrlMap, kind: string, filename: string): string {
  const url = map[filename];
  if (url === undefined) throw new MissingAssetError(kind, filename, Object.keys(map));
  return url;
}

export const imageUrl = (filename: string): string => resolve(imageUrls, 'image', filename);
export const audioUrl = (filename: string): string => resolve(audioUrls, 'audio', filename);
export const shapeUrl = (filename: string): string => resolve(shapeUrls, 'shape', filename);

/** Counts, for the dev diagnostics panel. */
export const assetCounts = {
  images: Object.keys(imageUrls).length,
  audio: Object.keys(audioUrls).length,
  shapes: Object.keys(shapeUrls).length,
};
