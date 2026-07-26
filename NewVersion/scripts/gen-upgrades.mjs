#!/usr/bin/env node
/**
 * Generates `src/game/upgrades/upgradeData.ts` from
 * SWFimported/scripts/ScreenUpgrades.as.
 *
 *   node scripts/gen-upgrades.mjs [--source <dir>] [--check]
 *
 * Joins three sets of statics:
 *
 *   upgradeArraysArray1/2/3   ordered lists of upgrade tables per category
 *   upgradeArray<Name>        [prices[10], ...statTracks]
 *   misc/primary/secondaryNameArray   display names, in the same order
 *
 * 28 upgrades x up to 6 numeric tracks is ~1,500 balance numbers. Extracting
 * beats transcribing.
 *
 * ── Stat track indexing ───────────────────────────────────────────────────
 * Tracks come in two shapes and they are indexed differently:
 *
 *   11 entries -> indexed by level directly, 0..10, so level 0 has a baseline
 *                 value. Only `upgradeArraySpeed` is like this
 *                 (Tank.as:64 `upgradeArraySpeed[1][levelsArrayMisc[0]]`).
 *   10 entries -> indexed by level - 1, valid 1..10; level 0 means "not owned"
 *                 and callers guard for it
 *                 (PartGameArea.as:1557 checks `levelsArrayMisc[1] == 0` before
 *                 reading `upgradeArrayBulletReflect[1][level - 1]`).
 *
 * The shape is recorded per upgrade as `statsIncludeLevelZero` so consumers do
 * not have to rediscover it.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
const file = join(sourceRoot, 'scripts/ScreenUpgrades.as');

if (!existsSync(file)) {
  console.error(`ScreenUpgrades.as not found at ${file}.`);
  process.exit(1);
}
const src = readFileSync(file, 'utf8');

/**
 * Collapses whitespace, but only outside quoted strings — display names like
 * "Tank Speed" and "Big Cannon" contain spaces that must survive.
 */
function stripWhitespaceOutsideQuotes(text) {
  let out = '';
  let inQuotes = false;
  for (const char of text) {
    if (char === '"') {
      inQuotes = !inQuotes;
      out += char;
    } else if (inQuotes || !/\s/.test(char)) {
      out += char;
    }
  }
  return out;
}

/** `public static var <name>:Array = [...];` -> normalised literal text. */
function arrayLiteral(name) {
  const re = new RegExp(`public static var ${name}\\s*:Array\\s*=\\s*(\\[[\\s\\S]*?\\]);`);
  const m = re.exec(src);
  return m ? stripWhitespaceOutsideQuotes(m[1]) : null;
}

/** Splits a literal of nested arrays into its top-level `[...]` groups. */
function topLevelGroups(literal) {
  const inner = literal.slice(1, -1);
  const groups = [];
  let depth = 0;
  let start = -1;
  for (let i = 0; i < inner.length; i += 1) {
    if (inner[i] === '[') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (inner[i] === ']') {
      depth -= 1;
      if (depth === 0) groups.push(inner.slice(start + 1, i));
    }
  }
  return groups;
}

const numbers = (csv) =>
  csv
    .split(',')
    .filter((s) => s.length > 0)
    .map(Number);

const strings = (csv) => [...csv.matchAll(/"([^"]*)"/g)].map((m) => m[1]);

/** Ordered upgrade table identifiers referenced by an upgradeArraysArrayN. */
function tableOrder(containerName) {
  const literal = arrayLiteral(containerName);
  if (!literal) return null;
  return literal.slice(1, -1).split(',');
}

const CATEGORIES = [
  { id: 'misc', container: 'upgradeArraysArray1', names: 'miscNameArray', levels: 'levelsArrayMisc' },
  { id: 'primary', container: 'upgradeArraysArray2', names: 'primaryNameArray', levels: 'levelsArray' },
  {
    id: 'secondary',
    container: 'upgradeArraysArray3',
    names: 'secondaryNameArray',
    levels: 'levelsArraySecondary',
  },
];

const result = [];
let totalNumbers = 0;

for (const category of CATEGORIES) {
  const order = tableOrder(category.container);
  if (!order) {
    console.error(`Could not read ${category.container}.`);
    process.exit(1);
  }

  const nameLiteral = arrayLiteral(category.names);
  const displayNames = nameLiteral ? strings(nameLiteral) : [];
  if (displayNames.length !== order.length) {
    console.warn(
      `  ! ${category.id}: ${order.length} tables but ${displayNames.length} names`,
    );
  }

  const startLevelsLiteral = arrayLiteral(category.levels);
  const startLevels = startLevelsLiteral ? numbers(startLevelsLiteral.slice(1, -1)) : [];

  const entries = order.map((tableName, index) => {
    const literal = arrayLiteral(tableName);
    if (!literal) {
      console.error(`Could not read ${tableName}.`);
      process.exit(1);
    }
    const groups = topLevelGroups(literal).map(numbers);
    const [prices, ...stats] = groups;
    totalNumbers += groups.reduce((n, g) => n + g.length, 0);

    if (prices.length !== 10) {
      console.warn(`  ! ${tableName}: ${prices.length} prices, expected 10`);
    }
    const lengths = new Set(stats.map((s) => s.length));
    if (lengths.size > 1) {
      console.warn(`  ! ${tableName}: mixed stat track lengths ${[...lengths].join('/')}`);
    }

    const statsIncludeLevelZero = stats.length > 0 && stats[0].length === 11;

    return {
      id: tableName.replace(/^upgradeArray/, ''),
      name: displayNames[index] ?? tableName,
      prices,
      stats,
      statsIncludeLevelZero,
      startLevel: startLevels[index] ?? 0,
    };
  });

  result.push({ category: category.id, entries });
}

/* ── emit ─────────────────────────────────────────────────────────────────── */

const q = (v) => JSON.stringify(v);
const out = [];
out.push('/**');
out.push(' * GENERATED FILE — do not edit by hand.');
out.push(' * Regenerate with: npm run upgrades:data');
out.push(' *');
out.push(' * Balance tables from SWFimported/scripts/ScreenUpgrades.as.');
out.push(' */');
out.push('');
out.push("export type UpgradeCategory = 'misc' | 'primary' | 'secondary';");
out.push('');
out.push('export interface UpgradeSpec {');
out.push('  /** AS3 table stem, e.g. "Cannon" from upgradeArrayCannon. */');
out.push('  id: string;');
out.push('  /** Display name from the matching name array. */');
out.push('  name: string;');
out.push('  category: UpgradeCategory;');
out.push('  /** Position within its category, 0-based. */');
out.push('  index: number;');
out.push('  /**');
out.push('   * Cost to go from level N to N+1 is `prices[N]`. 10 entries cover');
out.push('   * levels 0->1 through 9->10. A price of 0 at index 0 means the item is');
out.push('   * free to unlock, which is how Cannon and Mine start owned.');
out.push('   */');
out.push('  prices: readonly number[];');
out.push('  /** Per-level stat tracks; meaning is weapon-specific. */');
out.push('  stats: readonly (readonly number[])[];');
out.push('  /**');
out.push('   * True when stat tracks have 11 entries and are indexed by level');
out.push('   * directly (level 0 has a baseline). False when they have 10 and are');
out.push('   * indexed by level - 1, undefined at level 0.');
out.push('   */');
out.push('  statsIncludeLevelZero: boolean;');
out.push('  /** Level the player starts with — 1 for the free starter items. */');
out.push('  startLevel: number;');
out.push('}');
out.push('');
out.push('/** Every upgrade can be taken to level 10 (levelsMaxArray*). */');
out.push('export const MAX_UPGRADE_LEVEL = 10;');
out.push('');

for (const { category, entries } of result) {
  const constName = `${category.toUpperCase()}_UPGRADES`;
  out.push(`/** ${entries.length} ${category} upgrades, in AS3 order. */`);
  out.push(`export const ${constName}: readonly UpgradeSpec[] = [`);
  for (const [index, e] of entries.entries()) {
    out.push('  {');
    out.push(`    id: ${q(e.id)},`);
    out.push(`    name: ${q(e.name)},`);
    out.push(`    category: ${q(category)},`);
    out.push(`    index: ${index},`);
    out.push(`    prices: [${e.prices.join(', ')}],`);
    out.push('    stats: [');
    for (const track of e.stats) out.push(`      [${track.join(', ')}],`);
    out.push('    ],');
    out.push(`    statsIncludeLevelZero: ${e.statsIncludeLevelZero},`);
    out.push(`    startLevel: ${e.startLevel},`);
    out.push('  },');
  }
  out.push('];');
  out.push('');
}

out.push('export const UPGRADES_BY_CATEGORY: Record<UpgradeCategory, readonly UpgradeSpec[]> = {');
out.push('  misc: MISC_UPGRADES,');
out.push('  primary: PRIMARY_UPGRADES,');
out.push('  secondary: SECONDARY_UPGRADES,');
out.push('};');
out.push('');
out.push('export const ALL_UPGRADES: readonly UpgradeSpec[] = [');
out.push('  ...MISC_UPGRADES,');
out.push('  ...PRIMARY_UPGRADES,');
out.push('  ...SECONDARY_UPGRADES,');
out.push('];');
out.push('');

const content = `${out.join('\n')}\n`;
const outPath = join(projectRoot, 'src/game/upgrades/upgradeData.ts');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('upgradeData.ts is out of date. Run: npm run upgrades:data');
    process.exit(1);
  }
  console.log('upgradeData.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote upgradeData.ts — ${result.map((r) => `${r.entries.length} ${r.category}`).join(', ')}, ` +
    `${totalNumbers} balance values.`,
);
