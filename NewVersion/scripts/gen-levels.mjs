#!/usr/bin/env node
/**
 * Generates `src/game/levels/levelData.ts` from the `levelDataModelW1..W9`
 * tables in SWFimported/scripts/ScreenGame.as.
 *
 *   node scripts/gen-levels.mjs [--source <dir>] [--check]
 *
 * This is *ScreenGame* data. It covers all three interleaved per-world arrays
 * that make up `worldModels` — `levelDataModelW*`, `enemyModelW*` and
 * `flagModelW*` — flattened into one record per level, since they are always
 * indexed together by the same (world, level) pair.
 *
 * levelDataModel row layout, from `worldModels[world * 3 - 2][level - 1][n]`:
 *   0  room width         PartGameArea camera clamping
 *   1  room height
 *   2  enemy amount       ButtonLevelGuideInfo.as:85 reads [0] of enemyModel,
 *                         these four are unused in the decompiled sources
 *   3-5 reserved (always 0 in every row)
 *   6  level mode         "Normal" | "Flag" | "Tower" | "Defense" | "Boss"
 *   7  upgrade limit      1-10, the highest upgrade level this level allows.
 *                         **Not a difficulty tier**, which is what this map used
 *                         to say. Both AS3 reads name it `selectedUpgradeLimit`
 *                         (`ScreenGame.as:365`, `ScreenLevelSelect.as:1203`) and
 *                         there is no third read by that grep; its range is
 *                         exactly 1..10 across all 405 rows, matching
 *                         `MAX_UPGRADE_LEVEL`. Enemy tiers are a different thing
 *                         entirely — the "1"/"2"/"3"/"B" suffix on the enemy
 *                         model, already ported as `enemyLevel`.
 *   8  world theme        "Desert" | "Grass" | ...
 *   9  PRNG seed          feeds PM_PRNG for deterministic prop placement
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import * as design from './lib/campaign-design.mjs';
import { buildCampaign } from './lib/campaign-build.mjs';
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
const file = join(sourceRoot, 'scripts/ScreenGame.as');

if (!existsSync(file)) {
  console.error(`ScreenGame.as not found at ${file}.`);
  process.exit(1);
}

// The decompiler wraps these very long literals across lines; join everything
// so the row regex can work on a single string.
const src = readFileSync(file, 'utf8');

/**
 * `flagModelW<n>` rows: [flagCount, moneyPerFlag].
 *
 * Non-Flag levels are [0, 0]. PartGameArea.as:2371 reads column 1 as the
 * flag's money value; PartTutorial's CollectFlags condition reads column 0.
 */
function parseFlagModel(world) {
  const declRe = new RegExp(
    `public static var flagModelW${world}\\s*:Array\\s*=\\s*\\[([\\s\\S]*?)\\];`,
  );
  const decl = declRe.exec(src);
  if (!decl) return null;

  const body = decl[1].replace(/\s+/g, '');
  return [...body.matchAll(/\[([^[\]]*)\]/g)].map((m) => {
    const [count, money] = m[1].split(',').map(Number);
    return { flagCount: count, flagMoney: money };
  });
}

const WORLD_COUNT = 9;
const worlds = [];
let reservedAlwaysZero = true;
const modes = new Set();
const themes = new Set();
const enemyTypes = new Set();
const enemyLevels = new Set();

/**
 * `enemyModelW<n>` rows: [totalEnemies, spawnInterval, "Name<level>", count, …].
 *
 * `ScreenEnemies.updateEnemies` derives the pair count as `(length - 2) / 2`
 * and strips the trailing character off each name to get the enemy level.
 *
 * Column 1 is the base spawn interval in frames at 30 fps —
 * `ScreenGame.as:473` assigns it to `reloadTimeEnemyMax`. It is easy to miss
 * because the assignment reads from `enemyModelCurrent`, a mutable working
 * copy of the row, rather than from `enemyModel*` directly.
 */
function parseEnemyModel(world) {
  const declRe = new RegExp(
    `public static var enemyModelW${world}\\s*:Array\\s*=\\s*\\[([\\s\\S]*?)\\];`,
  );
  const decl = declRe.exec(src);
  if (!decl) return null;

  const body = decl[1].replace(/\s+/g, '');
  return [...body.matchAll(/\[([^[\]]*)\]/g)].map((m) => {
    const cells = m[1].split(',');
    const totalEnemies = Number(cells[0]);
    const spawnInterval = Number(cells[1]);
    const composition = [];
    for (let i = 2; i + 1 < cells.length; i += 2) {
      const raw = cells[i].replace(/"/g, '');
      const level = raw.slice(-1);
      const type = raw.slice(0, -1);
      enemyTypes.add(type);
      enemyLevels.add(level);
      composition.push({ type, level, count: Number(cells[i + 1]) });
    }
    return { totalEnemies, spawnInterval, composition };
  });
}

for (let w = 1; w <= WORLD_COUNT; w += 1) {
  const declRe = new RegExp(
    `public static var levelDataModelW${w}\\s*:Array\\s*=\\s*\\[([\\s\\S]*?)\\];`,
  );
  const decl = declRe.exec(src);
  if (!decl) {
    console.error(`Could not find levelDataModelW${w}.`);
    process.exit(1);
  }

  const body = decl[1].replace(/\s+/g, '');
  const rowRe =
    /\[(-?\d+),(-?\d+),(-?\d+),(-?\d+),(-?\d+),(-?\d+),"([^"]+)",(-?\d+),"([^"]+)",(-?\d+)\]/g;

  const enemyRows = parseEnemyModel(w);
  if (!enemyRows) {
    console.error(`Could not find enemyModelW${w}.`);
    process.exit(1);
  }

  const flagRows = parseFlagModel(w);
  if (!flagRows) {
    console.error(`Could not find flagModelW${w}.`);
    process.exit(1);
  }

  const levels = [];
  let rowIndex = -1;
  for (const m of body.matchAll(rowRe)) {
    rowIndex += 1;
    const [, width, height, r2, r3, r4, r5, mode, upgradeLimit, theme, seed] = m;
    if (Number(r2) !== 0 || Number(r3) !== 0 || Number(r4) !== 0 || Number(r5) !== 0) {
      reservedAlwaysZero = false;
    }
    modes.add(mode);
    themes.add(theme);
    const enemyRow = enemyRows[rowIndex];
    const flagRow = flagRows[rowIndex];
    levels.push({
      roomWidth: Number(width),
      roomHeight: Number(height),
      mode,
      upgradeLimit: Number(upgradeLimit),
      theme,
      seed: Number(seed),
      totalEnemies: enemyRow?.totalEnemies ?? 0,
      spawnInterval: enemyRow?.spawnInterval ?? 0,
      enemies: enemyRow?.composition ?? [],
      flagCount: flagRow?.flagCount ?? 0,
      flagMoney: flagRow?.flagMoney ?? 0,
    });
  }

  if (enemyRows.length !== levels.length) {
    console.warn(
      `  ! world ${w}: ${levels.length} level rows but ${enemyRows.length} enemy rows`,
    );
  }

  if (levels.length === 0) {
    console.error(`levelDataModelW${w} parsed to zero rows — row shape changed?`);
    process.exit(1);
  }
  worlds.push(levels);
}

const total = worlds.reduce((n, w) => n + w.length, 0);
const seeds = new Set(worlds.flatMap((w) => w.map((l) => l.seed)));

const q = (v) => JSON.stringify(v);

function assert(cond, message) {
  if (!cond) throw new Error(`campaign invariant failed: ${message}`);
}

/**
 * The theme blocks, parsed from `campaignThemes.ts`.
 *
 * That module is the specification and carries the tests, so it is read rather
 * than restated — a settled boundary written in two places drifts, which is
 * what happened to the plan document's own copy. Parsed because Node's ESM
 * loader will not take a TS file that imports its neighbours without
 * extensions.
 */
const themeForCampaignLevel = (() => {
  const text = readFileSync(
    join(projectRoot, 'src/game/levels/campaignThemes.ts'),
    'utf8',
  );
  const open = text.indexOf('{', text.indexOf('=', text.indexOf('export const CAMPAIGN_THEMES')));
  let depth = 0;
  let literal = '';
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) {
        literal = text.slice(open, i + 1);
        break;
      }
    }
  }
  const table = JSON.parse(
    literal
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '')
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
      .replace(/([{,]\s*)(\d+)\s*:/g, '$1"$2":')
      .replace(/'([^']*)'/g, '"$1"')
      .replace(/,(\s*[}\]])/g, '$1'),
  );

  const used = Object.values(table).flatMap((blocks) => blocks.map((b) => b.theme));
  assert(used.length === 9, `theme blocks name ${used.length} themes, expected 9`);
  assert(new Set(used).size === 9, 'a theme is used by two blocks');

  return (world, level) => {
    const blocks = table[world] ?? [];
    let found = null;
    for (const block of blocks) if (block.from <= level) found = block.theme;
    assert(found !== null, `no theme for ${world}-${level}`);
    return found;
  };
})();

/**
 * The twenty types in the order the AS3 first fields them.
 *
 * Derived by walking the transcription, not listed: the redesign's rule 2 is
 * that this order survives, and a hand-typed copy could not enforce it.
 */
const introOrder = (() => {
  const seen = new Set();
  const order = [];
  for (const world of worlds) {
    for (const level of world) {
      for (const e of level.enemies) {
        if (!seen.has(e.type)) {
          seen.add(e.type);
          order.push(e.type);
        }
      }
    }
  }
  assert(order.length === 20, `found ${order.length} enemy types, expected 20`);
  return order;
})();

/**
 * Tier shares for a new world, averaged over the old worlds it replaces.
 *
 * So the escalation curve is inherited from the original rather than drawn
 * fresh — new world 1 plays like old worlds 1-2, new world 4 like old 7-9.
 */
const tierMix = (world) => {
  const counts = { 1: 0, 2: 0, 3: 0 };
  let total = 0;
  for (const source of design.TIER_SOURCE[world]) {
    for (const level of worlds[source - 1]) {
      for (const e of level.enemies) {
        if (e.level === 'B') continue;
        counts[e.level] += e.count;
        total += e.count;
      }
    }
  }
  assert(total > 0, `world ${world} has no tier data`);
  return { t1: counts[1] / total, t2: counts[2] / total, t3: counts[3] / total };
};
const out = [];
out.push('/**');
out.push(' * GENERATED FILE — do not edit by hand.');
out.push(' * Regenerate with: npm run levels:data');
out.push(' *');
out.push(' * The `levelDataModelW1..W9` tables from SWFimported/scripts/ScreenGame.as.');
out.push(' * Extracted ahead of the ScreenGame port because ScreenLevelSelect needs each');
out.push(" * level's mode to compute progress totals.");
out.push(' *');
out.push(' * Columns 2-5 of every source row are zero and carry no meaning, so they are');
out.push(' * dropped here rather than preserved as unnamed noise.');
out.push(' */');
out.push('');
out.push("import { tuneLevel } from '../config/campaignTuning';");
out.push('');
out.push('/** Level archetype — column 6. */');
out.push(
  `export type LevelMode = ${[...modes].sort().map(q).join(' | ')};`,
);
out.push('');
out.push('/** World theme — column 8. Drives background art and prop selection. */');
out.push(`export type LevelTheme = ${[...themes].sort().map(q).join(' | ')};`);
out.push('');
out.push('/** Enemy type name with its level suffix stripped, e.g. "Basic". */');
out.push(`export type EnemyTypeName = ${[...enemyTypes].sort().map(q).join(' | ')};`);
out.push('');
out.push('/** Trailing character of the name in the enemy model: tier or "B" for boss. */');
out.push(`export type EnemyLevelSuffix = ${[...enemyLevels].sort().map(q).join(' | ')};`);
out.push('');
out.push('export interface LevelEnemy {');
out.push('  type: EnemyTypeName;');
out.push('  level: EnemyLevelSuffix;');
out.push('  count: number;');
out.push('}');
out.push('');
out.push('export interface LevelSpec {');
out.push('  /** Room size in design units; the camera scrolls within this. */');
out.push('  roomWidth: number;');
out.push('  roomHeight: number;');
out.push('  mode: LevelMode;');
out.push('  /**');
out.push('   * levelDataModel column 7 — the highest upgrade level this level allows.');
out.push('   *');
out.push('   * **Not a difficulty tier.** Both AS3 reads name it `selectedUpgradeLimit`');
out.push('   * (`ScreenGame.as:365`, `ScreenLevelSelect.as:1203`), and its range across');
out.push('   * all 405 rows is exactly 1..10 — `MAX_UPGRADE_LEVEL`. Enemy tiers are the');
out.push('   * separate `enemyLevel` suffix on the enemy model.');
out.push('   *');
out.push('   * **Nothing reads this, by decision — divergence `A11`.** The mechanic it');
out.push('   * belongs to (`ScreenGame.as:578-580` temporarily strips upgrade levels above');
out.push('   * the cap, restoring them after the level) is **deliberately not ported**:');
out.push('   * this port lets the player use their full upgrades everywhere and handles');
out.push('   * balance by other means. The number is not displayed either — a cap that');
out.push('   * constrains nothing would mislead.');
out.push('   *');
out.push('   * Kept anyway, and this is the part to leave alone: dropping a column whose');
out.push('   * meaning is known is how `enemyModel[1]` was nearly lost. `A11` records what');
out.push('   * reinstating it would take.');
out.push('   */');
out.push('  upgradeLimit: number;');
out.push('  theme: LevelTheme;');
out.push('  /**');
out.push('   * Seed for PM_PRNG. Determines background prop placement, so it must be');
out.push('   * fed to the generator exactly — see src/game/core/PM_PRNG.ts.');
out.push('   */');
out.push('  seed: number;');
out.push('  /**');
out.push('   * enemyModel column 0 — the kill target shown as "Kill N Enemies"');
out.push('   * (PartInterface.as:1003), scaled by the difficulty amount multiplier.');
out.push('   */');
out.push('  totalEnemies: number;');
out.push('  /**');
out.push('   * enemyModel column 1 — base frames between spawns at 30 fps.');
out.push('   * ScreenGame.as:473 assigns this to `reloadTimeEnemyMax`.');
out.push('   */');
out.push('  spawnInterval: number;');
out.push('  /** Enemy composition, from the name/count pairs in the enemy model row. */');
out.push('  enemies: readonly LevelEnemy[];');
out.push('  /** flagModel column 0 — flags to collect. 0 outside Flag levels. */');
out.push('  flagCount: number;');
out.push('  /** flagModel column 1 — money awarded per flag (PartGameArea.as:2371). */');
out.push('  flagMoney: number;');
out.push('}');
out.push('');
out.push('');
out.push('/**');
out.push(` * The AS3's own ${WORLD_COUNT} worlds and ${total} levels — a pure transcription.`);
out.push(' *');
out.push(' * **This is the record, not the campaign.** The game plays `LEVELS` below,');
out.push(' * which is 4 worlds of 45 built from these rows plus the redesign\'s own');
out.push(' * rules. Keeping the original intact is what lets `roomSizeSource.test.ts`');
out.push(' * go on checking the port against `ScreenGame.as`, and what any future');
out.push(' * question about "what did the original do here" is answered from.');
out.push(' */');
out.push('export const AS3_LEVELS: readonly (readonly LevelSpec[])[] = [');
for (const levels of worlds) {
  out.push('  [');
  for (const l of levels) {
    const enemies = l.enemies
      .map((e) => `{ type: ${q(e.type)}, level: ${q(e.level)}, count: ${e.count} }`)
      .join(', ');
    out.push(
      `    { roomWidth: ${l.roomWidth}, roomHeight: ${l.roomHeight}, mode: ${q(l.mode)}, ` +
        `upgradeLimit: ${l.upgradeLimit}, theme: ${q(l.theme)}, seed: ${l.seed}, ` +
        `totalEnemies: ${l.totalEnemies}, spawnInterval: ${l.spawnInterval}, ` +
        `enemies: [${enemies}], ` +
        `flagCount: ${l.flagCount}, flagMoney: ${l.flagMoney} },`,
    );
  }
  out.push('  ],');
}
out.push('];');
out.push('');

// ── The campaign the game plays ────────────────────────────────────────────
const campaign = buildCampaign({
  as3Flat: worlds.flat(),
  design,
  themeFor: themeForCampaignLevel,
  introOrder,
  tierMix,
});

{
  const built = campaign.reduce((n, w) => n + w.length, 0);
  assert(campaign.length === design.WORLDS, `campaign has ${campaign.length} worlds`);
  assert(built === design.TOTAL_LEVELS, `campaign has ${built} levels`);

  // Every level's wave adds up to its kill target, or it cannot be finished.
  for (const [wi, w] of campaign.entries()) {
    for (const [li, l] of w.entries()) {
      const sum = l.enemies.reduce((n, e) => n + e.count, 0);
      assert(sum === l.totalEnemies, `${wi + 1}-${li + 1}: wave ${sum} vs target ${l.totalEnemies}`);
      assert(l.enemies.length > 0, `${wi + 1}-${li + 1} has no enemies`);
      const entryCap =
        l.mode === 'Boss' ? design.MAX_BOSS_LEVEL_ENTRIES : design.MAX_WAVE_ENTRIES;
      assert(
        l.enemies.length <= entryCap,
        `${wi + 1}-${li + 1} (${l.mode}) has ${l.enemies.length} entries, cap ${entryCap}`,
      );
      assert(l.enemies.every((e) => e.count >= 1), `${wi + 1}-${li + 1} has an empty entry`);
      assert(l.theme !== undefined && l.theme !== null, `${wi + 1}-${li + 1} has no theme`);
    }
  }

  // Every type debuts, in the original's order, and never before its level.
  const firstSeen = new Map();
  campaign.forEach((w, wi) =>
    w.forEach((l, li) => {
      for (const e of l.enemies) {
        if (!firstSeen.has(e.type)) firstSeen.set(e.type, wi * design.PER_WORLD + li + 1);
      }
    }),
  );
  assert(
    firstSeen.size === introOrder.length,
    `${firstSeen.size} types reach the campaign, expected ${introOrder.length}`,
  );
  const seenOrder = [...firstSeen.entries()].sort((a, b) => a[1] - b[1]).map(([t]) => t);
  assert(
    seenOrder.join() === introOrder.join(),
    `debut order drifted:\n  got  ${seenOrder.join()}\n  want ${introOrder.join()}`,
  );

  const modes = {};
  for (const w of campaign) for (const l of w) modes[l.mode] = (modes[l.mode] ?? 0) + 1;
  for (const [mode, n] of Object.entries({ Normal: 40, Flag: 40, Tower: 20, Defense: 40, Boss: 40 })) {
    assert(modes[mode] === n, `${mode}: ${modes[mode]} levels, expected ${n}`);
  }
}

out.push('/**');
out.push(' * The campaign the game plays — 4 worlds of 45.');
out.push(' *');
out.push(' * GENERATED from `AS3_LEVELS` above plus the redesign\'s rules:');
out.push(' * `scripts/lib/campaign-design.mjs` for the mode layout, boss schedule and');
out.push(' * debut cadence, `campaignThemes.ts` for the theme blocks, and');
out.push(' * `scripts/lib/campaign-build.mjs` for the wave compositions.');
out.push(' *');
out.push(' * Enemy counts, spawn intervals, seeds and flag numbers are taken from the');
out.push(' * old level at the same fraction of the campaign, so the pacing is inherited');
out.push(' * rather than invented. The compositions are new, because the roster at a');
out.push(' * given point is different — the debuts were compressed.');
out.push(' */');
out.push('export const LEVELS: readonly (readonly LevelSpec[])[] = [');
for (const levels of campaign) {
  out.push('  [');
  for (const l of levels) {
    const enemies = l.enemies
      .map((e) => `{ type: ${q(e.type)}, level: ${q(e.level)}, count: ${e.count} }`)
      .join(', ');
    out.push(
      `    { roomWidth: ${l.roomWidth}, roomHeight: ${l.roomHeight}, mode: ${q(l.mode)}, ` +
        `upgradeLimit: ${l.upgradeLimit}, theme: ${q(l.theme)}, seed: ${l.seed}, ` +
        `totalEnemies: ${l.totalEnemies}, spawnInterval: ${l.spawnInterval}, ` +
        `enemies: [${enemies}], ` +
        `flagCount: ${l.flagCount}, flagMoney: ${l.flagMoney} },`,
    );
  }
  out.push('  ],');
}
out.push('];');
out.push('');
out.push('export const WORLD_COUNT = LEVELS.length;');
out.push('');
out.push('/** Levels in a world (1-based world number). */');
out.push('export const levelsInWorld = (world: number): number => LEVELS[world - 1]?.length ?? 0;');
out.push('');
out.push('/**');
out.push(' * Level spec by 1-based world and level, or undefined when out of range.');
out.push(' *');
out.push(' * `LEVELS` is the redesigned campaign and already carries its own room');
out.push(' * sizes, so the only thing applied here is the density tuning');
out.push(' * (`config/campaignTuning.ts`, `D-3`).');
out.push(' *');
out.push(' * `levelSizeOverrides.ts` used to be applied here too. It listed fifteen');
out.push(' * world-1 rooms that the port played at a different size from the AS3, and');
out.push(' * the campaign now sets every room from its mode — so the list described a');
out.push(' * divergence from a table nothing plays. It was retired rather than left to');
out.push(' * rot, which its own "every override is used" test would have caught anyway.');
out.push(' *');
out.push(' * **`AS3_LEVELS` and this are different campaigns**, not two views of one. A');
out.push(' * test whose claim is about `ScreenGame.as` reads `AS3_LEVELS`; one about');
out.push(' * what the game plays reads this.');
out.push(' */');
out.push('export function getLevel(world: number, level: number): LevelSpec | undefined {');
out.push('  const spec = LEVELS[world - 1]?.[level - 1];');
out.push('  return spec === undefined ? undefined : tuneLevel(spec);');
out.push('}');
out.push('');

const content = `${out.join('\n')}\n`;
const outPath = join(projectRoot, 'src/game/levels/levelData.ts');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('levelData.ts is out of date. Run: npm run levels:data');
    process.exit(1);
  }
  console.log('levelData.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote levelData.ts — AS3 record: ${WORLD_COUNT} worlds, ${total} levels, ` +
    `${seeds.size} distinct seeds. Campaign: ${design.WORLDS} worlds, ` +
    `${design.TOTAL_LEVELS} levels, modes ${[...modes].sort().join('/')}.`,
);
if (!reservedAlwaysZero) {
  console.warn('  ! columns 2-5 were not all zero; they may carry meaning after all.');
}
