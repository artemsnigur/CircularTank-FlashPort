#!/usr/bin/env node
/**
 * Generates `src/game/upgrades/upgradeDescriptionData.ts` from
 * `ButtonUpgradeInfo.as` — the text the shop's info tooltip shows.
 *
 *   node scripts/gen-upgrade-descriptions.mjs [--source <dir>] [--check]
 *
 * ── These are the descriptions M2 concluded did not exist ─────────────────
 * `BACKLOG.md` M2 records "there are no descriptions; `ScreenUpgrades.as` has no
 * description table". That is true of `ScreenUpgrades.as` and **incomplete about
 * the game**: the descriptions live here, in the tooltip trigger, one per
 * upgrade. M2's real finding stands — the shop's five *stat lines* are computed,
 * not written — but "the original has no description text" was too strong.
 *
 * The strings are attributed the same way the preview extraction attributes its
 * lines: by the enclosing `selectedMisc`/`selectedWeapon`/`selectedSecondary`
 * guard, since the assignments carry no upgrade name themselves.
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
const file = join(sourceRoot, 'scripts/ButtonUpgradeInfo.as');

if (!existsSync(file)) {
  console.error(`ButtonUpgradeInfo.as not found at ${file}.`);
  process.exit(1);
}

const CATEGORY_BY_SELECTOR = {
  selectedMisc: 'misc',
  selectedWeapon: 'primary',
  selectedSecondary: 'secondary',
};

/**
 * Turns an AS3 string literal's escapes into the characters they stand for.
 *
 * **This is the bug the driven pass caught.** The first version handled `\'`
 * only, so every `\n` survived as a literal backslash-n and the shop's
 * tooltips read `...towards the crosshair.\nThe ice grenade explodes...` on
 * screen. Nothing in typecheck, lint or the suite could see it — the string was
 * a valid string, just the wrong one — and it is only visible in a frame.
 *
 * One pass over the alternation rather than a chain of `.replace`s: chained
 * replaces double-unescape, so `\\n` (a literal backslash followed by n) would
 * become a newline.
 */
function unescapeAs3(literal) {
  const map = { n: '\n', r: '\r', t: '\t' };
  return literal.replace(/\\(.)/g, (_, ch) => map[ch] ?? ch);
}

const lines = readFileSync(file, 'utf8').split('\n');
const rows = [];
const guards = [];
let depth = 0;

for (const line of lines) {
  // Qualified here — `ScreenUpgrades.selectedMisc` — where the preview block
  // inside `ScreenUpgrades` itself refers to the bare name.
  const guard = /(?:else )?if\((?:ScreenUpgrades\.)?(selected(?:Misc|Weapon|Secondary)) == (\d+)\)/.exec(line);
  if (guard) {
    // `entered` for the same reason `parse-upgrade-previews.mjs` needs it: the
    // decompiler puts the brace on the next line, so a pop test at push time
    // fires immediately and orphans everything inside.
    guards.push({
      category: CATEGORY_BY_SELECTOR[guard[1]],
      index: Number(guard[2]),
      depth,
      entered: false,
    });
  }

  const assignment = /theText = "((?:[^"\\]|\\.)*)"/.exec(line);
  if (assignment && assignment[1] !== '') {
    const active = guards[guards.length - 1];
    if (active) {
      rows.push({
        category: active.category,
        index: active.index,
        text: unescapeAs3(assignment[1]),
      });
    }
  }

  depth += (line.match(/\{/g) ?? []).length;
  depth -= (line.match(/\}/g) ?? []).length;
  const top = guards[guards.length - 1];
  if (top && !top.entered && depth > top.depth) top.entered = true;
  while (
    guards.length > 0 &&
    guards[guards.length - 1].entered &&
    depth <= guards[guards.length - 1].depth
  ) {
    guards.pop();
  }
}

if (rows.length === 0) {
  console.error('No descriptions parsed — the guard shape changed?');
  process.exit(1);
}

const seen = new Set();
const unique = [];
for (const row of rows) {
  const key = `${row.category}|${row.index}`;
  if (seen.has(key)) continue;
  seen.add(key);
  unique.push(row);
}

unique.sort(
  (a, b) => a.category.localeCompare(b.category) || a.index - b.index,
);

const content = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run upgrade-descriptions:data
 *
 * The shop's info-tooltip text, from \`ButtonUpgradeInfo.as\`. One per upgrade,
 * keyed by category and the AS3's 1-based selector index.
 *
 * See scripts/gen-upgrade-descriptions.mjs for why these are not in
 * \`ScreenUpgrades.as\` and why M2 recorded them as absent.
 */

export interface UpgradeDescription {
  category: 'misc' | 'primary' | 'secondary';
  /** 1-based, as \`selectedMisc\`/\`selectedWeapon\`/\`selectedSecondary\` are. */
  index: number;
  text: string;
}

export const UPGRADE_DESCRIPTIONS: readonly UpgradeDescription[] = Object.freeze([
${unique
  .map(
    (r) =>
      `  { category: '${r.category}', index: ${r.index}, text: ${JSON.stringify(r.text)} },`,
  )
  .join('\n')}
]);
`;

const outPath = join(projectRoot, 'src/game/upgrades/upgradeDescriptionData.ts');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error(
      'upgradeDescriptionData.ts is out of date. Run: npm run upgrade-descriptions:data',
    );
    process.exit(1);
  }
  console.log('upgradeDescriptionData.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
const byCategory = unique.reduce((acc, r) => ({ ...acc, [r.category]: (acc[r.category] ?? 0) + 1 }), {});
console.log(
  `Wrote upgradeDescriptionData.ts — ${unique.length} descriptions ` +
    `(${Object.entries(byCategory).map(([k, v]) => `${v} ${k}`).join(', ')}).`,
);
