#!/usr/bin/env node
/**
 * Count-first search, because `grep | head -N` has produced four wrong
 * conclusions in this project.
 *
 *   npm run sweep -- "setMusic\(" src
 *   npm run sweep -- "sfxArray\.push" ../SWFimported/scripts
 *
 * ── Why this exists when a CLAUDE.md rule already did ─────────────────────
 * The rule ("head truncates, it does not filter") has been written down since
 * T20 and the mistake has been made four times since — once *one pass after*
 * restating it. That is not a knowledge problem, so a fifth warning would not
 * help.
 *
 * **The structural part is the ordering.** The total count is printed on the
 * first line, before any match, followed by per-file counts. Truncating the
 * output — by `head`, by a scrollback limit, by a tool showing the first N
 * lines — therefore cannot hide the total, which is exactly what went wrong
 * every time: `head -6` showed six test files, hid three production call sites,
 * and the conclusion drawn was "zero production callers".
 *
 * It cannot stop anyone reaching for raw grep. It makes the safe form the short
 * form, which is the most that can be done here.
 *
 * ── Searched in Node, not shelled out ─────────────────────────────────────
 * Two reasons, both learned while writing this: `rg` is not on PATH in this
 * environment, and passing a regex through a shell re-parses it — the first
 * version reported **0 matches for a pattern with six**, which is precisely the
 * silently-wrong count this file exists to prevent.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const [pattern, ...paths] = process.argv.slice(2);
if (!pattern) {
  console.error('usage: npm run sweep -- <pattern> [path...]');
  process.exit(2);
}

const where = paths.length > 0 ? paths : ['.'];
const SKIP = new Set(['node_modules', '.git', 'dist', '.look', 'coverage']);
const TEXT = /\.(ts|tsx|mjs|js|json|md|as|csv|html|css)$/;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (TEXT.test(entry.name)) out.push(full);
  }
  return out;
}

const re = new RegExp(pattern);
const lines = [];
for (const root of where) {
  const files = statSync(root).isDirectory() ? walk(root) : [root];
  for (const file of files) {
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((line, i) => {
        if (re.test(line)) lines.push(`${file}:${i + 1}:${line.trim()}`);
      });
  }
}

// THE COUNT COMES FIRST. Everything below may be truncated safely.
console.log(`${lines.length} match(es) for /${pattern}/ in ${where.join(' ')}`);

const byFile = new Map();
for (const line of lines) {
  const file = line.slice(0, line.indexOf(':'));
  byFile.set(file, (byFile.get(file) ?? 0) + 1);
}
console.log(`${byFile.size} file(s):`);
for (const [file, count] of [...byFile].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${file}`);
}

console.log('');
for (const line of lines) console.log(line);
