#!/usr/bin/env node
/**
 * Generates `src/game/enemies/bestiaryData.ts` from
 * SWFimported/scripts/ScreenEnemies.as.
 *
 *   node scripts/gen-bestiary.mjs [--source <dir>] [--check]
 *
 * Joins `enemyButtonModelArray` (display names, in screen order) with the 20
 * `descriptionText<Name>` statics. The link between them is that the id is the
 * display name with spaces removed — "Scared Ghost" -> descriptionTextScaredGhost
 * — which is also the enemy type name used in the level tables, so the same id
 * keys both.
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
const file = join(sourceRoot, 'scripts/ScreenEnemies.as');

if (!existsSync(file)) {
  console.error(`ScreenEnemies.as not found at ${file}.`);
  process.exit(1);
}
const src = readFileSync(file, 'utf8');

/* ── display names, in screen order ───────────────────────────────────────── */

const modelMatch = /public static var enemyButtonModelArray\s*:Array\s*=\s*\[([\s\S]*?)\];/.exec(
  src,
);
if (!modelMatch) {
  console.error('Could not find enemyButtonModelArray.');
  process.exit(1);
}
const displayNames = [...modelMatch[1].matchAll(/"([^"]*)"/g)].map((m) => m[1]);

/* ── descriptions ─────────────────────────────────────────────────────────── */

const descriptions = new Map();
for (const m of src.matchAll(
  /public static var descriptionText(\w+)\s*:String\s*=\s*"((?:[^"\\]|\\.)*)"/g,
)) {
  // AS3 escapes an apostrophe as \' inside a double-quoted string; JSON does not.
  descriptions.set(m[1], m[2].replace(/\\'/g, "'").replace(/\\"/g, '"'));
}

const entries = displayNames.map((displayName) => {
  const id = displayName.replace(/\s+/g, '');
  const description = descriptions.get(id);
  if (description === undefined) console.warn(`  ! no descriptionText${id}`);
  return { id, displayName, description: description ?? '' };
});

const unused = [...descriptions.keys()].filter((k) => !entries.some((e) => e.id === k));
if (unused.length > 0) console.warn(`  ! descriptions with no button entry: ${unused.join(', ')}`);

/* ── emit ─────────────────────────────────────────────────────────────────── */

const q = (v) => JSON.stringify(v);
const out = [];
out.push('/**');
out.push(' * GENERATED FILE — do not edit by hand.');
out.push(' * Regenerate with: npm run bestiary:data');
out.push(' *');
out.push(' * The enemy bestiary from SWFimported/scripts/ScreenEnemies.as.');
out.push(' *');
out.push(' * `id` is the display name with spaces removed, which is also the enemy type');
out.push(' * name in the level tables (levelData.ts `EnemyTypeName`), so one id keys both');
out.push(' * the bestiary and a level\'s enemy composition.');
out.push(' */');
out.push('');
out.push('export interface BestiaryEntry {');
out.push('  /** Matches EnemyTypeName in levelData.ts. */');
out.push('  id: string;');
out.push('  /** Name as shown on the enemies screen; three ids contain a space. */');
out.push('  displayName: string;');
out.push('  description: string;');
out.push('}');
out.push('');
out.push(`/** ${entries.length} enemy types, in enemyButtonModelArray order. */`);
out.push('export const BESTIARY: readonly BestiaryEntry[] = [');
for (const e of entries) {
  out.push(
    `  { id: ${q(e.id)}, displayName: ${q(e.displayName)}, description: ${q(e.description)} },`,
  );
}
out.push('];');
out.push('');
out.push('/** ScreenEnemies.as `knownEnemiesArray` initialiser — Basic is known up front. */');
out.push('export const INITIAL_KNOWN_ENEMIES: readonly string[] = ["Basic"];');
out.push('');

const content = `${out.join('\n')}\n`;
const outPath = join(projectRoot, 'src/game/enemies/bestiaryData.ts');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('bestiaryData.ts is out of date. Run: npm run bestiary:data');
    process.exit(1);
  }
  console.log('bestiaryData.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote bestiaryData.ts — ${entries.length} enemies, ` +
    `${entries.filter((e) => e.displayName.includes(' ')).length} with spaced display names.`,
);
