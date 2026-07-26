#!/usr/bin/env node
/**
 * Generates `src/assets/audioManifest.ts` from the decompiled AS3.
 *
 *   node scripts/gen-audio-manifest.mjs [--source <dir>] [--check]
 *
 * Three facts have to be joined to build the manifest, and all three live in
 * different files. Transcribing ~115 branches by hand would silently introduce
 * errors, so this extracts them mechanically instead:
 *
 *   1. SoundManager.as  `private var coinv1:sndCoinv1 = new sndCoinv1();`
 *                       -> field name -> AS3 class name
 *   2. SoundManager.as  playSound()'s `else if (soundName == "Coin")` chain
 *                       -> logical name -> ordered variant fields + the
 *                          `randomNum <` thresholds that pick between them
 *   3. sndCoinv1.as     `[Embed(source="/_assets/138_sndCoinv1.mp3")]`
 *                       -> AS3 class name -> the actual mp3 filename
 *
 * The output is a typed manifest keyed by the *logical* names that ~180 call
 * sites across the AS3 already push into `SoundManager.sfxArray`, so ported
 * gameplay code keeps using the same names the original does.
 *
 * `--check` exits non-zero if the committed manifest is stale.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const scriptsDir = join(sourceRoot, 'scripts');

if (!existsSync(scriptsDir)) {
  console.error(`No AS3 sources at ${scriptsDir}.`);
  process.exit(1);
}

const soundManagerSrc = readFileSync(join(scriptsDir, 'SoundManager.as'), 'utf8');

/* ── 1. field name -> AS3 class name ──────────────────────────────────────── */

const fieldToClass = new Map();
for (const m of soundManagerSrc.matchAll(
  /private var (\w+)\s*:\s*(\w+)\s*=\s*new \2\(\)\s*;/g,
)) {
  fieldToClass.set(m[1], m[2]);
}

/* ── 2. AS3 class name -> mp3 filename ────────────────────────────────────── */

const classToFile = new Map();
for (const entry of readdirSync(scriptsDir)) {
  if (!entry.endsWith('.as')) continue;
  if (!/^(snd|Music)/.test(entry)) continue;
  const src = readFileSync(join(scriptsDir, entry), 'utf8');
  const embed = /\[Embed\(source="\/_assets\/([^"]+)"\)\]/.exec(src);
  if (embed) classToFile.set(entry.replace(/\.as$/, ''), embed[1]);
}

/* ── 3. playSound()'s logical-name chain ──────────────────────────────────── */

/** Slices out a balanced `{ ... }` block starting at the first `{` after `from`. */
function extractBlock(src, from) {
  const start = src.indexOf('{', from);
  if (start < 0) return '';
  let depth = 0;
  for (let i = start; i < src.length; i += 1) {
    if (src[i] === '{') depth += 1;
    else if (src[i] === '}') {
      depth -= 1;
      if (depth === 0) return src.slice(start + 1, i);
    }
  }
  return '';
}

const playSoundAt = soundManagerSrc.indexOf('private function playSound(');
if (playSoundAt < 0) {
  console.error('Could not locate playSound() in SoundManager.as.');
  process.exit(1);
}
const playSoundBody = extractBlock(soundManagerSrc, playSoundAt);

/**
 * Split the `soundName == "X"` chain into per-name blocks. Every branch has the
 * same shape, so slicing on the comparison and taking the following balanced
 * block is reliable.
 */
const sfx = [];
const branchRe = /soundName\s*==\s*"([^"]+)"/g;
for (const match of [...playSoundBody.matchAll(branchRe)]) {
  const logicalName = match[1];
  const block = extractBlock(playSoundBody, match.index + match[0].length);

  const thresholds = [...block.matchAll(/randomNum\s*<\s*([\d.]+)/g)].map((m) =>
    Number.parseFloat(m[1]),
  );
  const fields = [...block.matchAll(/theSound\s*=\s*this\.(\w+)\s*;/g)].map((m) => m[1]);

  if (fields.length === 0) {
    console.warn(`  ! "${logicalName}" selects no sound; skipped.`);
    continue;
  }
  if (thresholds.length !== 0 && thresholds.length !== fields.length - 1) {
    console.warn(
      `  ! "${logicalName}" has ${thresholds.length} threshold(s) for ${fields.length} ` +
        'variant(s); shape not recognised, review by hand.',
    );
  }

  const variants = fields.map((field) => {
    const className = fieldToClass.get(field);
    const file = className ? classToFile.get(className) : undefined;
    if (!className) console.warn(`  ! no declaration for field "${field}"`);
    else if (!file) console.warn(`  ! no [Embed] for class "${className}"`);
    return { field, className: className ?? null, file: file ?? null };
  });

  sfx.push({ logicalName, thresholds, variants });
}

/* ── 4. music tracks, from playMusicOnChannel() ───────────────────────────── */

const musicAt = soundManagerSrc.indexOf('private function playMusicOnChannel(');
const musicBody = musicAt >= 0 ? extractBlock(soundManagerSrc, musicAt) : '';
const music = [];
for (const match of [...musicBody.matchAll(/music\s*==\s*"([^"]+)"/g)]) {
  const name = match[1];
  const block = extractBlock(musicBody, match.index + match[0].length);
  const field = /track\s*=\s*this\.(\w+)\s*;/.exec(block)?.[1];
  const className = field ? fieldToClass.get(field) : undefined;
  const file = className ? classToFile.get(className) : undefined;
  if (file) music.push({ name, className, file });
  else console.warn(`  ! music "${name}" did not resolve to a file`);
}

/* ── 5. continuous loops, referenced directly rather than via playSound ───── */

const loops = [];
for (const [field, label] of [
  ['flameThrowerLoop', 'FlameThrower'],
  ['burningLoop', 'Burning'],
]) {
  const className = fieldToClass.get(field);
  const file = className ? classToFile.get(className) : undefined;
  if (file) loops.push({ name: label, field, className, file });
  else console.warn(`  ! loop "${label}" did not resolve to a file`);
}

/* ── 6. emit ──────────────────────────────────────────────────────────────── */

const usedFiles = new Set([
  ...sfx.flatMap((s) => s.variants.map((v) => v.file)),
  ...music.map((m) => m.file),
  ...loops.map((l) => l.file),
]);
usedFiles.delete(null);

const allSoundFiles = existsSync(join(sourceRoot, 'sounds'))
  ? readdirSync(join(sourceRoot, 'sounds')).filter((f) => f.endsWith('.mp3'))
  : [];
const orphans = allSoundFiles.filter((f) => !usedFiles.has(f)).sort();

const q = (s) => JSON.stringify(s);
const out = [];
out.push('/* eslint-disable */');
out.push('/**');
out.push(' * GENERATED FILE — do not edit by hand.');
out.push(' * Regenerate with: npm run audio:manifest');
out.push(' *');
out.push(' * Extracted from SWFimported/scripts/SoundManager.as (the playSound() and');
out.push(' * playMusicOnChannel() dispatch chains) joined with the [Embed] declarations on');
// NB: no "snd*/Music*" here — the "*/" would terminate this block comment.
out.push(' * the individual sound and music asset classes.');
out.push(' *');
out.push(' * Logical names are the strings ~180 AS3 call sites push into');
out.push(' * `SoundManager.sfxArray`, so ported gameplay code keeps using them verbatim.');
out.push(' */');
out.push('');
out.push('export interface SfxVariant {');
out.push('  /** Original mp3 filename; the leading number is the SWF library ID. */');
out.push('  file: string;');
out.push('  /** AS3 class this came from, for traceability. */');
out.push('  className: string;');
out.push('}');
out.push('');
out.push('export interface SfxEntry {');
out.push('  /** Logical name used at AS3 call sites, e.g. "Coin". */');
out.push('  name: string;');
out.push('  variants: SfxVariant[];');
out.push('  /**');
out.push('   * Upper bounds compared against a single `Math.random()` draw, in order,');
out.push('   * exactly as playSound() does. Empty when there is only one variant.');
out.push('   */');
out.push('  thresholds: number[];');
out.push('}');
out.push('');
out.push('/** Literal union so callers cannot request a track that does not exist. */');
out.push(
  `export type MusicTrackName = ${music.map((m) => q(m.name)).join(' | ') || 'never'};`,
);
out.push('');
out.push('export interface TrackEntry<TName extends string = string> {');
out.push('  name: TName;');
out.push('  file: string;');
out.push('  className: string;');
out.push('}');
out.push('');
out.push(`/** ${sfx.length} logical SFX names covering ${
  new Set(sfx.flatMap((s) => s.variants.map((v) => v.file))).size
} mp3 files. */`);
out.push('export const SFX: readonly SfxEntry[] = [');
for (const entry of sfx) {
  const variants = entry.variants
    .filter((v) => v.file)
    .map((v) => `{ file: ${q(v.file)}, className: ${q(v.className)} }`)
    .join(', ');
  out.push(
    `  { name: ${q(entry.logicalName)}, variants: [${variants}], ` +
      `thresholds: [${entry.thresholds.join(', ')}] },`,
  );
}
out.push('];');
out.push('');
out.push('/** The 8 music tracks, lazy-loaded: together they are 4.8 MB, 87% of all audio. */');
out.push('export const MUSIC: readonly TrackEntry<MusicTrackName>[] = [');
for (const m of music) {
  out.push(`  { name: ${q(m.name)}, file: ${q(m.file)}, className: ${q(m.className)} },`);
}
out.push('];');
out.push('');
out.push('/** Continuous loops with their own volume envelopes (SoundManager.handleLoops). */');
out.push('export const LOOPS: readonly TrackEntry[] = [');
for (const l of loops) {
  out.push(`  { name: ${q(l.name)}, file: ${q(l.file)}, className: ${q(l.className)} },`);
}
out.push('];');
out.push('');
out.push('/**');
out.push(' * mp3s present in the export but referenced by no AS3 class. Deliberately not');
out.push(' * loaded — left here so they are recorded rather than silently dropped.');
out.push(' */');
out.push(`export const ORPHAN_FILES: readonly string[] = [${orphans.map(q).join(', ')}];`);
out.push('');

const content = `${out.join('\n')}\n`;
const outPath = join(projectRoot, 'src/assets/audioManifest.ts');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('audioManifest.ts is out of date. Run: npm run audio:manifest');
    process.exit(1);
  }
  console.log('audioManifest.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote src/assets/audioManifest.ts — ${sfx.length} logical SFX ` +
    `(${new Set(sfx.flatMap((s) => s.variants.map((v) => v.file))).size} files), ` +
    `${music.length} music tracks, ${loops.length} loops, ${orphans.length} orphans.`,
);
