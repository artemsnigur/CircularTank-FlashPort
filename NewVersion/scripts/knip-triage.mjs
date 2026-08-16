#!/usr/bin/env node
/**
 * Sorts `knip`'s unused-export list into the four buckets T152 triaged it with.
 *
 *   npx knip --no-progress --reporter json > knip.json
 *   node scripts/knip-triage.mjs knip.json [bucket]
 *
 * ── Why this exists rather than a number in a doc ─────────────────────────
 * knip answers "nothing outside a test imports this", which is one question
 * covering four situations that want opposite actions:
 *
 *   src-importer  a non-test module *does* import it — look, knip disagrees
 *   test-only     imported by a test and nothing else — category 1 or 2 in
 *                 KNIP.md: an unwired feature, or a constant a test asserts
 *   internal      used only inside its own file — drop the `export`
 *   dead          referenced nowhere at all — delete it, or keep it on purpose
 *
 * Reading the flat list, all 545 findings look like "delete me", and two of
 * these four buckets say the opposite. `KNIP.md` records what each one meant.
 *
 * ── It resolves imports; it does not grep for names ───────────────────────
 * The first version matched the symbol name across the tree and put 60
 * findings in `src-importer`. Almost all were collisions — `Point`, `Room` and
 * `FlamePoint` are each declared in more than one module — and acting on that
 * list would have been acting on noise. This resolves each import specifier to
 * a file and reads the import clause, which took the same bucket from 60 to 1.
 *
 * Its own limits, since it is an instrument and this project counts those:
 * a re-export chain (`export { x } from './y'`) is not followed, `import * as`
 * is treated as importing everything, and "used in its own file" is a word
 * match outside comment lines — enough to sort a worklist, not enough to
 * delete from without reading the code.
 */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..').replace(/\\/g, '/');
const knip = JSON.parse(readFileSync(process.argv[2], 'utf8'));

const files = [];
(function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full);
    else if (/\.(ts|tsx)$/.test(entry)) files.push(full.replace(/\\/g, '/'));
  }
})(join(root, 'src'));

const text = new Map(files.map((f) => [f, readFileSync(f, 'utf8')]));
const isTest = (f) => /\.test\.tsx?$/.test(f);

/** file -> Map(resolvedTarget -> Set(importedNames)) */
const imports = new Map();
const IMPORT = /import\s+(type\s+)?([\s\S]*?)\s+from\s+['"]([^'"]+)['"]/g;

function resolveSpec(fromFile, spec) {
  if (!spec.startsWith('.')) return null;
  const base = resolve(dirname(fromFile), spec).replace(/\\/g, '/');
  for (const ext of ['.ts', '.tsx', '/index.ts', '/index.tsx']) {
    if (existsSync(base + ext)) return base + ext;
  }
  return existsSync(base) ? base : null;
}

for (const f of files) {
  const map = new Map();
  for (const m of text.get(f).matchAll(IMPORT)) {
    const target = resolveSpec(f, m[3]);
    if (!target) continue;
    const clause = m[2];
    const names = new Set();
    const braces = /\{([\s\S]*)\}/.exec(clause);
    if (braces) {
      for (const part of braces[1].split(',')) {
        const name = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0].trim();
        if (name) names.add(name);
      }
    }
    // `import * as ns` and default imports reach every export.
    if (/\*\s+as\s+/.test(clause) || /^\s*\w+\s*(,|$)/.test(clause.replace(/\{[\s\S]*\}/, '')))
      names.add('*');
    const existing = map.get(target) ?? new Set();
    for (const n of names) existing.add(n);
    map.set(target, existing);
  }
  imports.set(f, map);
}

const rows = [];
for (const issue of knip.issues) {
  const own = `${root}/${issue.file}`.replace(/\\/g, '/');
  const entries = [
    ...issue.exports.map((e) => ({ ...e, kind: 'value' })),
    ...issue.types.map((e) => ({ ...e, kind: 'type' })),
  ];
  for (const e of entries) {
    const testImporters = [];
    const srcImporters = [];
    for (const f of files) {
      const names = imports.get(f)?.get(own);
      if (!names) continue;
      if (names.has(e.name) || names.has('*')) (isTest(f) ? testImporters : srcImporters).push(f);
    }
    // Internal use: the name on any line of its own file other than its
    // declaration line.
    const lines = text.get(own).split('\n');
    const word = new RegExp(`\\b${e.name.replace(/[$]/g, '\\$')}\\b`);
    const internal = lines.filter((l, i) => i + 1 !== e.line && word.test(l)).length;

    const bucket = srcImporters.length
      ? 'src-importer'
      : testImporters.length
        ? 'test-only'
        : internal > 0
          ? 'internal'
          : 'dead';
    rows.push({
      file: issue.file,
      name: e.name,
      kind: e.kind,
      line: e.line,
      internal,
      tests: testImporters.length,
      src: srcImporters.length,
      srcImporters,
      bucket,
    });
  }
}

const by = (b) => rows.filter((r) => r.bucket === b);
console.log(`total ${rows.length}`);
for (const b of ['src-importer', 'test-only', 'internal', 'dead']) {
  console.log(`  ${b}: ${by(b).length}`);
}

const want = process.argv[3];
if (want) {
  for (const r of by(want)) {
    const extra = r.srcImporters.map((f) => f.split('/src/')[1]).join(', ');
    console.log(`${r.kind}\t${r.file}:${r.line}\t${r.name}\tinternal=${r.internal} tests=${r.tests}${extra ? ` src=[${extra}]` : ''}`);
  }
}
