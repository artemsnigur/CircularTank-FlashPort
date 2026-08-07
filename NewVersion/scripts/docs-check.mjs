/**
 * Cross-document consistency for figures that appear in more than one doc.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * `CLAUDE.md` forbids editing a doc with an unchecked scripted replace, because
 * a missed anchor returns the original string and reports success. That rule
 * has now been broken twice by the same author who wrote the warning down, and
 * "write it down harder" has visibly failed — which is the exact argument the
 * audit makes for mechanisms over sentences.
 *
 * **A hook cannot enforce the rule as stated.** Which tool wrote a file is not
 * observable from the result; there is no artefact to detect. So this guards
 * the *hazard* instead of the *tool*: a replace that half-applies leaves the
 * duplicated figure disagreeing between documents, and that is observable.
 *
 * The sound-coverage number is the case that prompted it — one figure across
 * five sites in two files, hand-synced twice, once with `sed -i`.
 *
 * ── What it checks, and what it does not ──────────────────────────────────
 * Each participating document carries a marker:
 *
 *     <!-- docs-check: sound-coverage = 47-48 of 67 -->
 *
 * Every marker with the same key must carry the same value, and a key must
 * appear in at least two documents or it is guarding nothing.
 *
 * **It does not check the prose against the marker.** A document whose marker
 * is right and whose body still says something else passes. That is a real
 * limit and is stated rather than papered over: the marker catches a *partial*
 * sync across files, which is the failure that happened, not every possible
 * staleness.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');

const DOCS = ['docs/HANDOFF.md', 'docs/BACKLOG.md', 'docs/AUDIT-2026-07.md'];

const MARKER = /<!--\s*docs-check:\s*([\w-]+)\s*=\s*(.+?)\s*-->/g;

/** key -> [{ file, value }] */
const found = new Map();

for (const rel of DOCS) {
  const text = readFileSync(resolve(ROOT, rel), 'utf8');
  for (const [, key, value] of text.matchAll(MARKER)) {
    if (!found.has(key)) found.set(key, []);
    found.get(key).push({ file: rel, value });
  }
}

const problems = [];

for (const [key, entries] of found) {
  const values = new Set(entries.map((e) => e.value));
  if (values.size > 1) {
    problems.push(
      `"${key}" disagrees across documents:\n` +
        entries.map((e) => `    ${e.file}: ${e.value}`).join('\n'),
    );
  }
  if (entries.length < 2) {
    problems.push(
      `"${key}" appears in only ${entries[0].file}. A marker in one document ` +
        `guards nothing — either add it where the figure is duplicated, or drop it.`,
    );
  }
}

if (problems.length > 0) {
  console.error('docs-check: cross-document figures disagree.\n');
  for (const p of problems) console.error(`  ${p}\n`);
  console.error('  Fix every copy, not just the one you were looking at.');
  process.exit(1);
}

const keys = [...found.keys()];
console.log(
  keys.length === 0
    ? 'docs-check: no markers found (nothing duplicated is being guarded).'
    : `docs-check: ${keys.length} cross-document figure(s) agree — ${keys.join(', ')}.`,
);
