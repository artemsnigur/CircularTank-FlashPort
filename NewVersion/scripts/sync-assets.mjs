#!/usr/bin/env node
/**
 * Copies extracted SWF assets into src/assets/, preserving the original
 * filenames so every file can still be traced back to
 * SWFimported/symbolClass/symbols.csv by its SWF library ID.
 *
 *   node scripts/sync-assets.mjs [--source <dir>] [--all] [--force] [--dry-run]
 *
 * --all    also copies every vector shape (1000+ SVGs, ~4 MB) instead of just
 *          the curated set below. Eagerly globbing all of them slows the dev
 *          server, so the default keeps the working set small.
 * --force  re-copies files even when size and mtime match.
 *
 * Copy, not symlink: symlinks on Windows need Developer Mode or elevation, and
 * Vite's watcher handles real files more predictably.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

/**
 * source folder under SWFimported -> destination folder under src/assets.
 * `audio` is renamed from `sounds` to match the folder layout in the brief.
 */
const FOLDER_MAP = [
  { from: 'images', to: 'images', exts: ['.png', '.jpg', '.jpeg', '.gif'] },
  { from: 'fonts', to: 'fonts', exts: ['.ttf', '.otf', '.woff', '.woff2'] },
  { from: 'sounds', to: 'audio', exts: ['.mp3', '.ogg', '.wav'] },
  { from: 'shapes', to: 'shapes', exts: ['.svg'], curated: true },
];

/**
 * Shapes actually referenced by the skeleton. Extend as classes get ported.
 * Keys are SWF shape character IDs.
 */
const CURATED_SHAPES = new Set([
  '1.svg', // filled circle  — projectile / particle base
  '3.svg', // tank body      — used by the placeholder Gameplay scene
  '4.svg', // green burst    — pickup marker
  '19.svg', // thin ring     — LoadingRing (symbol 20)
  '21.svg',
]);

function parseArgs(argv) {
  const args = { source: null, all: false, force: false, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--source') args.source = argv[++i];
    else if (a === '--all') args.all = true;
    else if (a === '--force') args.force = true;
    else if (a === '--dry-run') args.dryRun = true;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

const sourceRoot = resolve(
  projectRoot,
  args.source ?? process.env.SWF_IMPORTED_DIR ?? '../SWFimported',
);

if (!existsSync(sourceRoot)) {
  console.error(
    `SWFimported not found at ${sourceRoot}.\n` +
      'Pass --source <dir> or set SWF_IMPORTED_DIR.',
  );
  process.exit(1);
}

const destRoot = resolve(projectRoot, 'src/assets');
let copied = 0;
let skipped = 0;
let missing = 0;

for (const group of FOLDER_MAP) {
  const src = join(sourceRoot, group.from);
  const dest = join(destRoot, group.to);

  if (!existsSync(src)) {
    console.warn(`  skip  ${group.from}/ (not present in source)`);
    missing += 1;
    continue;
  }
  if (!args.dryRun) mkdirSync(dest, { recursive: true });

  const useCurated = group.curated && !args.all;
  const files = readdirSync(src, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => group.exts.some((ext) => n.toLowerCase().endsWith(ext)))
    .filter((n) => !useCurated || CURATED_SHAPES.has(n));

  let groupCopied = 0;
  let groupSkipped = 0;

  for (const name of files) {
    const srcFile = join(src, name);
    const destFile = join(dest, name);
    const srcStat = statSync(srcFile);

    if (!args.force && existsSync(destFile)) {
      const destStat = statSync(destFile);
      if (destStat.size === srcStat.size && destStat.mtimeMs >= srcStat.mtimeMs) {
        groupSkipped += 1;
        continue;
      }
    }
    if (!args.dryRun) cpSync(srcFile, destFile, { preserveTimestamps: true });
    groupCopied += 1;
  }

  copied += groupCopied;
  skipped += groupSkipped;
  const note = useCurated ? ` (curated set — pass --all for all ${readdirSync(src).length})` : '';
  console.log(
    `  ${group.from.padEnd(8)} -> src/assets/${group.to.padEnd(8)} ` +
      `${String(groupCopied).padStart(4)} copied, ${String(groupSkipped).padStart(4)} up to date${note}`,
  );
}

console.log(
  `\n${args.dryRun ? '[dry run] ' : ''}${copied} file(s) copied, ${skipped} already current` +
    (missing ? `, ${missing} source folder(s) missing` : '') +
    '.',
);
console.log(
  'Filenames are unchanged: the leading number is the SWF library ID, ' +
    'cross-referenced in SWFimported/symbolClass/symbols.csv.',
);
