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
import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { orphanedFiles, plannedWrites } from './lib/asset-prune.mjs';
import { shapeIdsForSprites } from './lib/sprite-shapes.mjs';
import { PROJECTILE_SPRITE_IDS } from './lib/projectile-sprites.mjs';
import { ICON_SPRITE_IDS } from './lib/icon-sprites.mjs';
import { LEVEL_GUIDE_SPRITE_IDS } from './lib/level-guide-sprites.mjs';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

/**
 * source folder under SWFimported -> destination folder under src/assets.
 * `audio` is renamed from `sounds` to match the folder layout in the brief.
 */
const FOLDER_MAP = [
  { from: 'images', to: 'images', exts: ['.png', '.jpg', '.jpeg', '.gif', '.webp'] },
  { from: 'fonts', to: 'fonts', exts: ['.ttf', '.otf', '.woff', '.woff2'] },
  { from: 'sounds', to: 'audio', exts: ['.mp3', '.ogg', '.wav'] },
  { from: 'shapes', to: 'shapes', exts: ['.svg'], curated: true },
];

/**
 * Assets we authored, as against the JPEXS extraction.
 *
 * `SWFimported/` is read-only by contract and the pre-commit hook enforces it,
 * so a file we made cannot live there. `src/assets/` is gitignored because it
 * is this script's output, so anything only stored there is untracked and a
 * fresh clone would reference an asset that does not exist. This directory is
 * the tracked middle: copied into the same `src/assets/` tree, so nothing
 * downstream knows the difference.
 *
 * Copied second, and deliberately allowed to overwrite: an authored file with
 * the same name as an extracted one is a considered replacement, not an
 * accident. The run reports any such shadowing rather than doing it quietly.
 */
const AUTHORED_ROOT = join(projectRoot, 'assets-authored');

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
  // Particles — 32 Particle* clips, one shape per variant frame.
  '843.svg',
  '1060.svg',
  '1062.svg',
  '1064.svg',
  '1065.svg',
  '1066.svg',
  '1068.svg',
  '1070.svg',
  '1072.svg',
  '1074.svg',
  '1076.svg',
  '1077.svg',
  '1078.svg',
  '1080.svg',
  '1081.svg',
  '1083.svg',
  '1085.svg',
  '1087.svg',
  '1089.svg',
  '1091.svg',
  '1093.svg',
  '1095.svg',
  '1097.svg',
  '1099.svg',
  '1101.svg',
  '1103.svg',
  '1105.svg',
  '1108.svg',
  '1109.svg',
  '1110.svg',
  '1111.svg',
  '1114.svg',
  '1115.svg',
  '1116.svg',
  '1117.svg',
  '1119.svg',
  '1120.svg',
  '1122.svg',
  '1124.svg',
  '1126.svg',
  '1128.svg',
  '1130.svg',
  '1132.svg',
  '1337.svg',
  // Enemy and tank art (T34) — 40 `Enemy*` clips and the three `Tank*` parts.
  '3.svg',
  '4.svg',
  '6.svg',
  '7.svg',
  '8.svg',
  '9.svg',
  '10.svg',
  '11.svg',
  '12.svg',
  '13.svg',
  '14.svg',
  '15.svg',
  '16.svg',
  '17.svg',
  '208.svg',
  '209.svg',
  '210.svg',
  '211.svg',
  '271.svg',
  '273.svg',
  '275.svg',
  '277.svg',
  '278.svg',
  '280.svg',
  '281.svg',
  '283.svg',
  '284.svg',
  '286.svg',
  '287.svg',
  '289.svg',
  '290.svg',
  '292.svg',
  '293.svg',
  '295.svg',
  '297.svg',
  '299.svg',
  '301.svg',
  '303.svg',
  '305.svg',
  '307.svg',
  '309.svg',
  '311.svg',
  '313.svg',
  '315.svg',
  '317.svg',
  '319.svg',
  '321.svg',
  '323.svg',
  '325.svg',
  '326.svg',
  '328.svg',
  '329.svg',
  '331.svg',
  '333.svg',
  '335.svg',
  '339.svg',
  '341.svg',
  '343.svg',
  '345.svg',
  '347.svg',
  '349.svg',
  '1352.svg',
  '1407.svg',
  '1409.svg',
  '1411.svg',
  '1413.svg',

  // Coin art (T36) — ItemMoney's fifteen frames, five bodies and ten numerals.
  '941.svg',
  '942.svg',
  '943.svg',
  '944.svg',
  '945.svg',
  '946.svg',
  '947.svg',
  '948.svg',
  '949.svg',
  '950.svg',
  '951.svg',
  '952.svg',
  '953.svg',
  '954.svg',
  '955.svg',
  '956.svg',
  '957.svg',
  '958.svg',

  // Indicator art (T43) — WarningTimedBomb, IndicatorMedic, IndicatorIce,
  // DefenseEnemyBottomIndicator, WeaponReloadIndicator.
  '370.svg',
  '371.svg',
  '1182.svg',
  '1184.svg',
  '1185.svg',
  '1186.svg',
  '1187.svg',
  '1188.svg',
  '1189.svg',
  '1201.svg',
  '1315.svg',

  // Tutorial panels (T48) — twelve composed clips.
  '43.svg',
  '167.svg',
  '187.svg',
  '195.svg',
  '1325.svg',
  '1326.svg',
  '1328.svg',
  '1330.svg',
  '1332.svg',
  '1333.svg',
  '1335.svg',
  '1337.svg',
  '1339.svg',
  '1341.svg',
  '1342.svg',
  '1345.svg',
  '1347.svg',
  '1348.svg',
  '1350.svg',
  '1352.svg',
  '1354.svg',
  '1355.svg',
  '1357.svg',
  '1359.svg',
  '1361.svg',
  '1362.svg',
  '1365.svg',
  '1367.svg',
  '1369.svg',
  '1371.svg',
  '1375.svg',
  '1377.svg',
  '1379.svg',
  '1381.svg',
  '1383.svg',
  '1385.svg',
  '1387.svg',
  '1389.svg',
  '1391.svg',
  '1393.svg',
  '1395.svg',
  '1397.svg',
  '1399.svg',
  '1401.svg',
  '1403.svg',
  '1405.svg',

  // Background props — 21 BGObject clips, one shape per variant frame.
  // Generated from assets.swf: each DefineSprite frame places exactly one
  // DefineShape, and these are those shapes. See levels/propArt.ts.
  '1458.svg',
  '1459.svg',
  '1460.svg',
  '1461.svg',
  '1462.svg',
  '1464.svg',
  '1466.svg',
  '1467.svg',
  '1469.svg',
  '1470.svg',
  '1471.svg',
  '1473.svg',
  '1474.svg',
  '1475.svg',
  '1477.svg',
  '1478.svg',
  '1479.svg',
  '1481.svg',
  '1482.svg',
  '1483.svg',
  '1484.svg',
  '1485.svg',
  '1486.svg',
  '1487.svg',
  '1488.svg',
  '1489.svg',
  '1490.svg',
  '1491.svg',
  '1492.svg',
  '1494.svg',
  '1495.svg',
  '1498.svg',
  '1499.svg',
  '1500.svg',
  '1501.svg',
  '1502.svg',
  '1503.svg',
  '1504.svg',
  '1505.svg',
  '1506.svg',
  '1507.svg',
  '1509.svg',
  '1510.svg',
  '1511.svg',
  '1512.svg',
  '1513.svg',
  '1514.svg',
  '1515.svg',
  '1516.svg',
  '1517.svg',
  '1519.svg',
  '1520.svg',
  '1521.svg',
  '1522.svg',
  '1523.svg',
  '1524.svg',
  '1525.svg',
  '1526.svg',
  '1527.svg',
  '1528.svg',
  '1529.svg',
  '1530.svg',
  '1531.svg',
  '1532.svg',
  '1533.svg',
  '1535.svg',
  '1536.svg',
  '1537.svg',
  '1539.svg',
  '1541.svg',
  '1542.svg',
  '1543.svg',
  '1544.svg',
  '1545.svg',
  '1546.svg',
  '1547.svg',
  '1548.svg',
  '1549.svg',
  '1550.svg',
  '1552.svg',
  '1553.svg',
  '1554.svg',
  '1555.svg',
  '1556.svg',
  '1557.svg',
  '1558.svg',
  '1559.svg',
  '1560.svg',
  '1561.svg',
  '1563.svg',
  '1564.svg',
  '1565.svg',
  '1566.svg',
  '1567.svg',
  '1568.svg',
  '1569.svg',
  '1570.svg',
  '1571.svg',
  '1572.svg',
  '1574.svg',
  '1575.svg',
  '1576.svg',
  '1577.svg',
  '1578.svg',
  '1580.svg',
  '1581.svg',
  '1582.svg',
  '1584.svg',
  '1586.svg',
]);

/**
 * Projectile shapes, derived rather than listed.
 *
 * `PROJECTILE_SPRITE_IDS` is the one hand-kept table (each row greppable as
 * `symbol=` in its AS3 class); the shapes underneath come from the SWF. All 43
 * are copied, including the animation frames pass (b) does not draw yet, so
 * pass (c) needs no asset work.
 */
for (const id of shapeIdsForSprites(PROJECTILE_SPRITE_IDS)) {
  CURATED_SHAPES.add(`${id}.svg`);
}

/**
 * Strength/weakness badges — derived the same way, from `ICON_SPRITE_IDS`.
 *
 * 27 shapes across the two clips: 15 shared, 6 unique to each. Both are copied
 * although only `IconStrongWeak` (1033) is drawn today; see `icon-sprites.mjs`.
 */
for (const id of shapeIdsForSprites(ICON_SPRITE_IDS)) {
  CURATED_SHAPES.add(`${id}.svg`);
}

/**
 * The level guide widget — same derivation again, from
 * `LEVEL_GUIDE_SPRITE_IDS`. 30 shapes across seven clips.
 */
for (const id of shapeIdsForSprites(LEVEL_GUIDE_SPRITE_IDS)) {
  CURATED_SHAPES.add(`${id}.svg`);
}

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

// ── Authored assets ──────────────────────────────────────────────────────
// Copied after the extraction so a deliberate replacement wins, and reported
// when it shadows an extracted file so the override is never silent.
for (const group of FOLDER_MAP) {
  const src = join(AUTHORED_ROOT, group.from);
  if (!existsSync(src)) continue;

  const dest = join(destRoot, group.to);
  if (!args.dryRun) mkdirSync(dest, { recursive: true });

  const files = readdirSync(src, { withFileTypes: true })
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((n) => group.exts.some((ext) => n.toLowerCase().endsWith(ext)));

  let authoredCopied = 0;
  for (const name of files) {
    const shadowed = existsSync(join(sourceRoot, group.from, name));
    if (shadowed) {
      console.log(`  note  authored ${group.from}/${name} replaces the extracted file`);
    }
    if (!args.dryRun) {
      cpSync(join(src, name), join(dest, name), { preserveTimestamps: true });
    }
    authoredCopied += 1;
  }

  if (files.length > 0) {
    copied += authoredCopied;
    console.log(
      `  authored ${group.from.padEnd(8)} -> src/assets/${group.to.padEnd(8)} ` +
        `${String(authoredCopied).padStart(4)} copied`,
    );
  }
}

// ── Prune ────────────────────────────────────────────────────────────────
// Deletes destination files this run would not have written.
//
// **Why it deletes by default.** `src/assets/` is a build artifact: gitignored
// and reproducible in full by re-running this script, so nothing tracked can be
// lost. Leaving stale files is the more damaging default, because
// `registry.ts:28` globs the folder **eagerly** — a file nothing references is
// still bundled and shipped.
//
// **The prune set is derived from the same inputs the copy loops use**, not
// from a separate list. That is what keeps the authored overlay safe: a naive
// "delete anything not in SWFimported" would remove every authored file on
// every run, which is the failure `docs/BACKLOG.md` L1 warns about by name.
//
// The rule itself is `lib/asset-prune.mjs` so it can be driven without touching
// a filesystem; this is only the walk and the reporting.
let pruned = 0;
const prunedNames = [];

for (const group of FOLDER_MAP) {
  const dest = join(destRoot, group.to);
  if (!existsSync(dest)) continue;

  const extractedDir = join(sourceRoot, group.from);
  const authoredDir = join(AUTHORED_ROOT, group.from);
  const names = (dir) =>
    existsSync(dir)
      ? readdirSync(dir, { withFileTypes: true })
          .filter((e) => e.isFile())
          .map((e) => e.name)
      : [];

  const planned = plannedWrites(
    names(extractedDir),
    names(authoredDir),
    group.curated && !args.all ? CURATED_SHAPES : null,
  );
  const orphans = orphanedFiles(names(dest), planned, group.exts);

  for (const name of orphans) {
    if (!args.dryRun) rmSync(join(dest, name));
    prunedNames.push(`${group.to}/${name}`);
  }
  pruned += orphans.length;
}

if (pruned > 0) {
  console.log(`\n  ${args.dryRun ? '[dry run] would prune' : 'pruned'} ${pruned} stale file(s):`);
  for (const name of prunedNames.slice(0, 20)) console.log(`    - ${name}`);
  if (prunedNames.length > 20) console.log(`    … and ${prunedNames.length - 20} more`);
}

console.log(
  `\n${args.dryRun ? '[dry run] ' : ''}${copied} file(s) copied, ${skipped} already current` +
    (pruned ? `, ${pruned} pruned` : '') +
    (missing ? `, ${missing} source folder(s) missing` : '') +
    '.',
);
console.log(
  'Filenames are unchanged: the leading number is the SWF library ID, ' +
    'cross-referenced in SWFimported/symbolClass/symbols.csv.',
);
