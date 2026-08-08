#!/usr/bin/env node
/**
 * Generates `src/game/upgrades/upgradePreviewData.ts` — the shop's stat-preview
 * lines, extracted from `ScreenUpgrades.changeContent()`.
 *
 *   node scripts/gen-upgrade-previews.mjs [--source <dir>] [--check]
 *
 * The parsing lives in `lib/parse-upgrade-previews.mjs` and is tested directly
 * against the AS3; this file only shapes the result into a table.
 *
 * ── Collapsing branches ───────────────────────────────────────────────────
 * The AS3 assigns the same slot several times — once per state branch (owned,
 * not owned, maxed). Across those branches the **label, track and transform are
 * always identical**; only the units differ, because a two-value line carries a
 * separator between the current and next figures.
 *
 * So a slot collapses to one spec, and the units are taken from the
 * **single-value branch**, which is the one without separators mixed in. That
 * is asserted rather than assumed: a branch disagreeing on label, track or
 * transform fails the run.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseUpgradePreviews } from './lib/parse-upgrade-previews.mjs';

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

/** `changeContent()` — `:738` to just before `update()` at `:1613`. */
const RANGE = { from: 738, to: 1612 };

const rows = parseUpgradePreviews(readFileSync(file, 'utf8'), RANGE).filter(
  (r) => !r.clears && !r.literal,
);

/**
 * The unit shown beside a value.
 *
 * Whitespace-only entries are separators between the current and next figures,
 * not units. A non-whitespace continuation is part of the unit — `" HP"` then
 * `"/Sec"` is one `" HP/Sec"` — and a repeat of the same unit is the two-value
 * shape, where one copy is enough.
 */
function unitOf(units) {
  const parts = units.filter((u) => u.trim() !== '');
  if (parts.length === 0) return '';
  if (parts.length > 1 && parts[1].trim() === parts[0].trim()) return parts[0].trimEnd();
  return parts.join('').trimEnd();
}

const groups = new Map();
for (const row of rows) {
  const key = `${row.category ?? ''}|${row.upgradeIndex ?? ''}|${row.slot}`;
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(row);
}

const problems = [];
const specs = [];

for (const [key, members] of groups) {
  const [category, index, slot] = key.split('|');

  // Label, track and transform must agree across every branch of a slot — that
  // is what makes collapsing them to one spec legitimate.
  const signature = new Set(members.map((m) => `${m.label}~${m.track}~${m.transform}`));
  if (signature.size > 1) {
    problems.push(`${key} disagrees across branches: ${[...signature].join(' | ')}`);
    continue;
  }

  // Prefer the single-value branch for units: it is the one whose literals are
  // the unit alone, with no separator mixed in.
  const canonical = members.find((m) => m.readOffsets.length === 1) ?? members[0];

  const unit = unitOf(canonical.units);

  // Recorded rather than corrected. The not-owned Shield line (`:1445`) prints
  // a duration with " HP"; every other Shield branch says " Sec". A typo in the
  // original, and reproducing it is the project's rule — see the audit.
  //
  // Found by comparing units across branches rather than by looking for the
  // `[level + 1]` read: that offset only appears in the *misc* section, so a
  // detection keyed on it silently captured nothing and left this field dead
  // while claiming to carry the quirk.
  // Single-value rows only. A two-value row concatenates the unit twice —
  // "% Damage " then "%" — which differs from the canonical unit without being
  // an anomaly, and comparing against it flagged `Reduce:` as one.
  const odd = members.find((m) => m.readOffsets.length === 1 && unitOf(m.units) !== unit);
  const unownedUnit = odd ? unitOf(odd.units) : null;

  specs.push({
    category: category || null,
    upgradeIndex: index === '' ? null : Number(index),
    slot: Number(slot),
    label: canonical.label,
    // **Shifted into the port's index space.** The AS3 reads
    // `upgradeArray<Name>[n]` where index 0 is the *price* row and the stat
    // tracks follow; `UpgradeSpec.stats` drops prices, so every track sits one
    // lower here. Emitting the AS3 number unchanged made "Damage:" read the
    // explosion track and print 30 where the Cannon deals 7.
    track: canonical.track - 1,
    transform: canonical.transform,
    unit,
    unitUnowned: unownedUnit !== null && unownedUnit !== unit ? unownedUnit : null,
    lines: members.map((m) => m.line),
  });
}

if (problems.length > 0) {
  console.error('Branches disagree, so a slot cannot collapse to one spec:');
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}

specs.sort(
  (a, b) =>
    String(a.category).localeCompare(String(b.category)) ||
    (a.upgradeIndex ?? 0) - (b.upgradeIndex ?? 0) ||
    a.slot - b.slot,
);

const row = (s) => {
  const unowned = s.unitUnowned === null ? '' : `, unitUnowned: ${JSON.stringify(s.unitUnowned)}`;
  return (
    `  { category: ${JSON.stringify(s.category)}, upgradeIndex: ${s.upgradeIndex}, ` +
    `slot: ${s.slot}, label: ${JSON.stringify(s.label)}, track: ${s.track}, ` +
    `transform: '${s.transform}', unit: ${JSON.stringify(s.unit)}${unowned} },` +
    ` // ${s.lines.map((l) => `:${l}`).join(' ')}`
  );
};

const content = `/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run upgrade-previews:data
 *
 * The shop's stat-preview lines, from \`ScreenUpgrades.changeContent()\`
 * (\`:738\`-\`:1612\`). See scripts/gen-upgrade-previews.mjs.
 *
 * **These are not descriptions.** The original has no description text; each
 * line is computed from an upgrade stat track at display time. The arithmetic
 * is \`transform\`, applied by \`upgrades/upgradePreview.ts\`.
 *
 * \`upgradeIndex: null\` is the **category default** — the \`else\` branch every
 * upgrade takes unless it has its own entry. \`:1019\` (Flamethrower) against
 * \`:1023\` (everything else) is the pattern.
 */

/** The six arithmetic shapes the shop uses. */
export type PreviewTransform =
  | 'raw'
  | 'perSecond'
  | 'percent'
  | 'seconds1'
  | 'seconds2'
  | 'damagePerSecond';

export interface PreviewSpec {
  /** null for the category default. */
  category: 'misc' | 'primary' | 'secondary' | null;
  /** 1-based, as the AS3 selectors are. null for the default. */
  upgradeIndex: number | null;
  /** Which of the five lines, 1-5. */
  slot: number;
  label: string;
  /** Index into \`UpgradeSpec.stats\`. */
  track: number;
  transform: PreviewTransform;
  unit: string;
  /**
   * The unit used when the upgrade is not yet owned, when it differs.
   *
   * Only Shield does, and it is a typo in the original: \`:1445\` prints a
   * duration as " HP" where every other Shield branch says " Sec". Reproduced
   * rather than corrected — see \`docs/AUDIT-2026-07.md\`.
   */
  unitUnowned?: string;
}

export const UPGRADE_PREVIEWS: readonly PreviewSpec[] = Object.freeze([
${specs.map(row).join('\n')}
]);
`;

const outPath = join(projectRoot, 'src/game/upgrades/upgradePreviewData.ts');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('upgradePreviewData.ts is out of date. Run: npm run upgrade-previews:data');
    process.exit(1);
  }
  console.log('upgradePreviewData.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
const defaults = specs.filter((s) => s.upgradeIndex === null).length;
console.log(
  `Wrote upgradePreviewData.ts — ${specs.length} lines ` +
    `(${defaults} category defaults, ${specs.length - defaults} per-upgrade overrides).`,
);
