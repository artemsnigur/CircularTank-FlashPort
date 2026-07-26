#!/usr/bin/env node
/**
 * Generates `src/game/achievements/achievementData.ts` from
 * SWFimported/scripts/ScreenAchievements.as.
 *
 *   node scripts/gen-achievements.mjs [--source <dir>] [--check]
 *
 * Three parallel static tables have to be joined, one entry per achievement:
 *
 *   achievementPlacementArray   ["Kills1", x, y]         -> id + display order
 *   obtain<Id>                  ["Number", 100]          -> type + requirement
 *   achievement<Id>Data         ["GRAVEYARD", "...", false] -> title, blurb,
 *                                                            difficultyMatters
 *
 * 36 achievements x 3 tables is exactly the kind of transcription that goes
 * wrong silently, so it is extracted rather than typed out.
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
const file = join(sourceRoot, 'scripts/ScreenAchievements.as');

if (!existsSync(file)) {
  console.error(`ScreenAchievements.as not found at ${file}.`);
  process.exit(1);
}

const src = readFileSync(file, 'utf8');

/** Parses an AS3 array literal of scalars into JS values. */
function parseLiteralArray(text) {
  const out = [];
  const re = /"((?:[^"\\]|\\.)*)"|(-?\d+(?:\.\d+)?)|(true|false)|(null)/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    if (m[1] !== undefined) out.push(m[1].replace(/\\"/g, '"'));
    else if (m[2] !== undefined) out.push(Number(m[2]));
    else if (m[3] !== undefined) out.push(m[3] === 'true');
    else out.push(null);
  }
  return out;
}

/* ── ordered id list from achievementPlacementArray ───────────────────────── */

const placementMatch = /public static var achievementPlacementArray\s*:Array\s*=\s*(\[[\s\S]*?\]);/.exec(
  src,
);
if (!placementMatch) {
  console.error('Could not find achievementPlacementArray.');
  process.exit(1);
}
const ids = [...placementMatch[1].matchAll(/\["([^"]+)"\s*,\s*(-?\d+)\s*,\s*(-?\d+)\]/g)].map(
  (m) => ({ id: m[1], x: Number(m[2]), y: Number(m[3]) }),
);

/* ── join with obtain<Id> and achievement<Id>Data ─────────────────────────── */

const entries = [];
for (const { id, x, y } of ids) {
  const obtainRe = new RegExp(
    `public static var obtain${id}\\s*:Array\\s*=\\s*(\\[[^\\]]*\\]);`,
  );
  const dataRe = new RegExp(
    `public static var achievement${id}Data\\s*:Array\\s*=\\s*(\\[[^\\]]*\\]);`,
  );

  const obtain = obtainRe.exec(src);
  const data = dataRe.exec(src);
  if (!obtain) {
    console.warn(`  ! no obtain${id}; skipped`);
    continue;
  }
  if (!data) {
    console.warn(`  ! no achievement${id}Data; skipped`);
    continue;
  }

  const [type, requirement] = parseLiteralArray(obtain[1]);
  const [title, description, difficultyMatters] = parseLiteralArray(data[1]);

  if (!['Number', 'Boolean', 'NumberArray'].includes(type)) {
    console.warn(`  ! ${id} has unexpected type "${type}"`);
  }

  entries.push({
    id,
    type,
    requirement: requirement ?? 0,
    title,
    description,
    difficultyMatters: Boolean(difficultyMatters),
    x,
    y,
  });
}

/* ── emit ─────────────────────────────────────────────────────────────────── */

const q = (v) => JSON.stringify(v);
const out = [];
// No eslint-disable banner: this output is lint-clean, and an unused directive
// is itself a warning.
out.push('/**');
out.push(' * GENERATED FILE — do not edit by hand.');
out.push(' * Regenerate with: npm run achievements:data');
out.push(' *');
out.push(' * Extracted from SWFimported/scripts/ScreenAchievements.as by joining');
out.push(' * achievementPlacementArray with the per-achievement obtain* and *Data tables.');
out.push(' */');
out.push('');
out.push('/** How `achievementCheck` evaluates the achievement. */');
out.push("export type AchievementType = 'Number' | 'Boolean' | 'NumberArray';");
out.push('');
out.push('export interface AchievementSpec {');
out.push('  /** AS3 name, e.g. "Kills1". Also the save-field stem. */');
out.push('  id: string;');
out.push('  type: AchievementType;');
out.push('  /** obtain<Id>[1] — threshold for Number/NumberArray types. */');
out.push('  requirement: number;');
out.push('  title: string;');
out.push('  description: string;');
out.push('  /**');
out.push('   * achievement<Id>Data[2]. When true the earned state records the');
out.push('   * difficulty (1/2/3) and the achievement can be re-earned at a higher one;');
out.push('   * when false it is a flat 0.');
out.push('   */');
out.push('  difficultyMatters: boolean;');
out.push('  /** Grid position on the achievements screen, from achievementPlacementArray. */');
out.push('  x: number;');
out.push('  y: number;');
out.push('}');
out.push('');
out.push(`/** ${entries.length} achievements, in display order. */`);
out.push('export const ACHIEVEMENTS: readonly AchievementSpec[] = [');
for (const e of entries) {
  out.push(
    `  { id: ${q(e.id)}, type: ${q(e.type)}, requirement: ${e.requirement}, ` +
      `title: ${q(e.title)}, description: ${q(e.description)}, ` +
      `difficultyMatters: ${e.difficultyMatters}, x: ${e.x}, y: ${e.y} },`,
  );
}
out.push('];');
out.push('');
out.push('export type AchievementId = (typeof ACHIEVEMENTS)[number]["id"];');
out.push('');

const content = `${out.join('\n')}\n`;
const outPath = join(projectRoot, 'src/game/achievements/achievementData.ts');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('achievementData.ts is out of date. Run: npm run achievements:data');
    process.exit(1);
  }
  console.log('achievementData.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
const byType = entries.reduce((acc, e) => {
  acc[e.type] = (acc[e.type] ?? 0) + 1;
  return acc;
}, {});
console.log(
  `Wrote achievementData.ts — ${entries.length} achievements ` +
    `(${Object.entries(byType).map(([k, v]) => `${v} ${k}`).join(', ')}, ` +
    `${entries.filter((e) => e.difficultyMatters).length} difficulty-sensitive).`,
);
