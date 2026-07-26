#!/usr/bin/env node
/**
 * Audits JPEXS-exported MP3s for the header problems that make Flash-era sound
 * exports misbehave in browser decoders.
 *
 *   node scripts/audit-mp3.mjs [dir] [--json <path>] [--quiet]
 *
 * Defaults to auditing src/assets/audio. Exits non-zero if any file has an
 * error-level issue, so it can be wired into CI.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { probeMp3 } from './lib/mp3-probe.mjs';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

function parseArgs(argv) {
  const args = { dir: null, json: null, quiet: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--json') args.json = argv[++i];
    else if (a === '--quiet') args.quiet = true;
    else if (!a.startsWith('--')) args.dir = a;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const dir = resolve(projectRoot, args.dir ?? 'src/assets/audio');

let entries;
try {
  entries = readdirSync(dir).filter((f) => f.toLowerCase().endsWith('.mp3')).sort();
} catch {
  console.error(`Cannot read ${dir}. Run "npm run assets:sync" first.`);
  process.exit(1);
}

if (entries.length === 0) {
  console.error(`No .mp3 files in ${dir}.`);
  process.exit(1);
}

const results = entries.map((name) => {
  const full = join(dir, name);
  const buf = readFileSync(full);
  return { ...probeMp3(buf, { name }), path: full, size: statSync(full).size };
});

const errors = results.filter((r) => r.issues.some((i) => i.level === 'error'));
const warns = results.filter((r) => r.issues.some((i) => i.level === 'warn'));

if (!args.quiet) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`\nMP3 audit — ${results.length} file(s) in ${basename(dir)}/\n`);
  console.log(
    `${pad('file', 38)}${pad('kbps', 10)}${pad('Hz', 8)}${pad('ch', 6)}${pad('sec', 8)}${pad('tag', 7)}flags`,
  );
  console.log('-'.repeat(100));
  for (const r of results) {
    const flags = r.issues
      .filter((i) => i.level !== 'info')
      .map((i) => i.code)
      .join(',');
    console.log(
      pad(r.name.slice(0, 37), 38) +
        pad(r.bitrates.join('/') || '-', 10) +
        pad(r.sampleRates[0] ?? '-', 8) +
        pad(r.channelModes[0] ?? '-', 6) +
        pad(r.durationSeconds.toFixed(3), 8) +
        pad(r.vbrTag ?? '-', 7) +
        (flags || 'ok'),
    );
  }

  // Roll the per-file issues up into a distribution, which is what actually
  // tells you whether the export pipeline is sound.
  const byCode = new Map();
  for (const r of results) {
    for (const i of r.issues) {
      const key = `${i.level}:${i.code}`;
      if (!byCode.has(key)) byCode.set(key, { ...i, count: 0, example: r.name });
      byCode.get(key).count += 1;
    }
  }
  console.log('\nSummary');
  console.log('-'.repeat(100));
  const rates = new Map();
  for (const r of results) {
    const k = `${r.sampleRates[0]} Hz ${r.channelModes[0]} ${r.bitrates.join('/')} kbps`;
    rates.set(k, (rates.get(k) ?? 0) + 1);
  }
  for (const [k, n] of [...rates].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(4)}x  ${k}`);
  }
  console.log('');
  for (const issue of [...byCode.values()].sort((a, b) => b.count - a.count)) {
    console.log(`  [${issue.level}] ${issue.code} — ${issue.count} file(s), e.g. ${issue.example}`);
    console.log(`         ${issue.message}`);
  }
  console.log(
    `\n${results.length} file(s): ${errors.length} with errors, ${warns.length} with warnings.\n`,
  );
}

if (args.json) {
  const out = resolve(projectRoot, args.json);
  writeFileSync(out, `${JSON.stringify({ dir, results }, null, 2)}\n`);
  if (!args.quiet) console.log(`Wrote ${out}`);
}

process.exit(errors.length > 0 ? 1 : 0);
