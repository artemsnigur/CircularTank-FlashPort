#!/usr/bin/env node
/**
 * Generates `src/game/enemies/enemyStatsData.ts` from the 40 `enemy*Stats`
 * tables in SWFimported/scripts/ScreenGame.as.
 *
 *   node scripts/gen-enemy-stats.mjs [--source <dir>] [--check]
 *
 * 20 enemy types x 2 variants (normal and the `B` boss form).
 *
 * ── Column layout ─────────────────────────────────────────────────────────
 * Recovered from `PartGameArea.spawnEnemy` (around line 3266), which is the
 * only place the arrays are unpacked:
 *
 *    0  damage        x difficultyDamage x tier, rounded
 *    1  health        x difficultyHealth x tier, rounded
 *                     bosses additionally divide by ScreenGame.bossAmount
 *    2  money         x tier, rounded
 *                     bosses divide by bossAmount then round to the nearest 10
 *    3  moveSpeedMax  x difficultySpeed
 *    4  accSpeed      x difficultySpeed
 *    5  rotSpeedMax   x difficultyRotation
 *    6  particle      particle colour key, e.g. "EnemyGreen"
 *    7  shoot         boolean
 *
 * Shooting types carry four more, read only when `shoot` is true:
 *
 *    8  shootType     "Basic" | "BasicBoss" | "Trap" | "Hook" | "Following" | ...
 *    9  shootAngle    "Front" | "FrontAmount" | "Circle" | "BackTrap" | "FrontSides"
 *   10  reloadTimeMax x difficultyReloadTime, rounded
 *   11  bulletAmount
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
const file = join(sourceRoot, 'scripts/ScreenGame.as');

if (!existsSync(file)) {
  console.error(`ScreenGame.as not found at ${file}.`);
  process.exit(1);
}
const src = readFileSync(file, 'utf8');

/** Parses one AS3 literal cell into a JS value. */
function cell(text) {
  const trimmed = text.trim();
  if (trimmed === 'true') return true;
  if (trimmed === 'false') return false;
  if (trimmed.startsWith('"')) return trimmed.slice(1, -1);
  return Number(trimmed);
}

const NON_SHOOTER_COLUMNS = 8;
const SHOOTER_COLUMNS = 12;

const entries = new Map();
const particles = new Set();
const shootTypes = new Set();
const shootAngles = new Set();
const damageTypes = new Set();

/**
 * `enemy<Type>Strengths` / `enemy<Type>Weaknesses` — flat [type, value, …]
 * pairs, e.g. `["Explosions", 0.5, "Bullets", 0.5]`.
 *
 * PartGameArea.as:3376-3455 starts every multiplier at 1, then **subtracts**
 * each strength value and **adds** each weakness value. So a 0.5 strength
 * halves that damage type and a 0.75 weakness makes it 1.75x.
 *
 * The lookup uses the *base* type name with spaces stripped, so boss variants
 * share their base type's table — there is no `enemy<Type>BStrengths`.
 */
function parseResistances(kind) {
  const table = new Map();
  const re = new RegExp(
    `public static var enemy(\\w+?)${kind}\\s*:Array\\s*=\\s*\\[([^\\]]*)\\];`,
    'g',
  );
  for (const m of src.matchAll(re)) {
    const [, type, body] = m;
    const cells = body.split(',').map((c) => c.trim()).filter((c) => c.length > 0);
    const pairs = [];
    for (let i = 0; i + 1 < cells.length; i += 2) {
      const damageType = cells[i].replace(/"/g, '');
      damageTypes.add(damageType);
      pairs.push({ damageType, value: Number(cells[i + 1]) });
    }
    if (pairs.length > 0) table.set(type, pairs);
  }
  return table;
}

const strengths = parseResistances('Strengths');
const weaknesses = parseResistances('Weaknesses');

for (const m of src.matchAll(
  /public static var enemy(\w+?)(B?)Stats\s*:Array\s*=\s*\[([^\]]*)\];/g,
)) {
  const [, type, bossSuffix, body] = m;
  const cells = body.split(',').map(cell);

  if (cells.length !== NON_SHOOTER_COLUMNS && cells.length !== SHOOTER_COLUMNS) {
    console.warn(`  ! enemy${type}${bossSuffix}Stats has ${cells.length} columns; skipped`);
    continue;
  }

  const shoot = Boolean(cells[7]);
  if (shoot && cells.length !== SHOOTER_COLUMNS) {
    console.warn(`  ! enemy${type}${bossSuffix}Stats claims to shoot but has no shoot columns`);
  }
  if (!shoot && cells.length !== NON_SHOOTER_COLUMNS) {
    console.warn(`  ! enemy${type}${bossSuffix}Stats has shoot columns but shoot is false`);
  }

  particles.add(cells[6]);

  const stats = {
    damage: cells[0],
    health: cells[1],
    money: cells[2],
    moveSpeedMax: cells[3],
    accSpeed: cells[4],
    rotSpeedMax: cells[5],
    particle: cells[6],
    shoot,
  };

  if (shoot) {
    stats.shootType = cells[8];
    stats.shootAngle = cells[9];
    stats.reloadTimeMax = cells[10];
    stats.bulletAmount = cells[11];
    shootTypes.add(cells[8]);
    shootAngles.add(cells[9]);
  }

  if (!entries.has(type)) entries.set(type, {});
  entries.get(type)[bossSuffix === 'B' ? 'boss' : 'normal'] = stats;
}

const types = [...entries.keys()].sort();
const missingVariant = types.filter((t) => !entries.get(t).normal || !entries.get(t).boss);
if (missingVariant.length > 0) {
  console.warn(`  ! types missing a variant: ${missingVariant.join(', ')}`);
}

/* ── emit ─────────────────────────────────────────────────────────────────── */

const q = (v) => JSON.stringify(v);
const out = [];
out.push('/**');
out.push(' * GENERATED FILE — do not edit by hand.');
out.push(' * Regenerate with: npm run enemy-stats:data');
out.push(' *');
out.push(' * The 40 `enemy*Stats` tables from SWFimported/scripts/ScreenGame.as, one per');
out.push(' * enemy type per variant. Column meanings come from PartGameArea.spawnEnemy;');
out.push(' * see enemyStats.ts for how the difficulty and tier multipliers are applied.');
out.push(' */');
out.push('');
out.push('/** Particle colour key used when the enemy is hit or dies. */');
out.push(`export type EnemyParticle = ${[...particles].sort().map(q).join(' | ')};`);
out.push('');
out.push('/** Bullet behaviour, read only when `shoot` is true. */');
out.push(`export type EnemyShootType = ${[...shootTypes].sort().map(q).join(' | ')};`);
out.push('');
out.push('/** Firing pattern. */');
out.push(`export type EnemyShootAngle = ${[...shootAngles].sort().map(q).join(' | ')};`);
out.push('');
out.push('export interface EnemyBaseStats {');
out.push('  /** Contact damage, before difficulty and tier scaling. */');
out.push('  damage: number;');
out.push('  health: number;');
out.push('  /** Money dropped on death. */');
out.push('  money: number;');
out.push('  moveSpeedMax: number;');
out.push('  accSpeed: number;');
out.push('  rotSpeedMax: number;');
out.push('  particle: EnemyParticle;');
out.push('  shoot: boolean;');
out.push('  shootType?: EnemyShootType;');
out.push('  shootAngle?: EnemyShootAngle;');
out.push('  /** Frames between shots at 30 fps, before the reload-time multiplier. */');
out.push('  reloadTimeMax?: number;');
out.push('  bulletAmount?: number;');
out.push('}');
out.push('');
out.push('/** The eight damage channels an enemy can resist or be vulnerable to. */');
out.push(`export type DamageType = ${[...damageTypes].sort().map(q).join(' | ')};`);
out.push('');
out.push('/** One entry of a strengths or weaknesses table. */');
out.push('export interface Resistance {');
out.push('  damageType: DamageType;');
out.push('  /** Subtracted from the multiplier for a strength, added for a weakness. */');
out.push('  value: number;');
out.push('}');
out.push('');
out.push('export interface EnemyVariants {');
out.push('  normal: EnemyBaseStats;');
out.push('  /** The `B` table — used when a level spawns this type as a boss. */');
out.push('  boss: EnemyBaseStats;');
out.push('  /**');
out.push('   * Damage types this enemy resists. Shared by both variants: the AS3');
out.push('   * looks these up by base type name, so a boss inherits them.');
out.push('   */');
out.push('  strengths: Resistance[];');
out.push('  /** Damage types this enemy takes extra from. */');
out.push('  weaknesses: Resistance[];');
out.push('}');
out.push('');
out.push(`/** ${types.length} enemy types, ${types.length * 2} tables. */`);
out.push('export const ENEMY_STATS: Readonly<Record<string, EnemyVariants>> = {');
for (const type of types) {
  const variants = entries.get(type);
  out.push(`  ${type}: {`);
  for (const key of ['normal', 'boss']) {
    const s = variants[key];
    if (!s) continue;
    const parts = [
      `damage: ${s.damage}`,
      `health: ${s.health}`,
      `money: ${s.money}`,
      `moveSpeedMax: ${s.moveSpeedMax}`,
      `accSpeed: ${s.accSpeed}`,
      `rotSpeedMax: ${s.rotSpeedMax}`,
      `particle: ${q(s.particle)}`,
      `shoot: ${s.shoot}`,
    ];
    if (s.shoot) {
      parts.push(
        `shootType: ${q(s.shootType)}`,
        `shootAngle: ${q(s.shootAngle)}`,
        `reloadTimeMax: ${s.reloadTimeMax}`,
        `bulletAmount: ${s.bulletAmount}`,
      );
    }
    out.push(`    ${key}: { ${parts.join(', ')} },`);
  }

  const render = (list) =>
    (list ?? [])
      .map((r) => `{ damageType: ${q(r.damageType)}, value: ${r.value} }`)
      .join(', ');
  out.push(`    strengths: [${render(strengths.get(type))}],`);
  out.push(`    weaknesses: [${render(weaknesses.get(type))}],`);
  out.push('  },');
}
out.push('};');
out.push('');
out.push('/** Every enemy type that has a stat table. */');
out.push(`export const ENEMY_STAT_TYPES: readonly string[] = [${types.map(q).join(', ')}];`);
out.push('');

const content = `${out.join('\n')}\n`;
const outPath = join(projectRoot, 'src/game/enemies/enemyStatsData.ts');

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('enemyStatsData.ts is out of date. Run: npm run enemy-stats:data');
    process.exit(1);
  }
  console.log('enemyStatsData.ts is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
const shooters = types.filter((t) => entries.get(t).normal?.shoot).length;
const withResistances = types.filter(
  (t) => strengths.has(t) || weaknesses.has(t),
).length;
console.log(
  `Wrote enemyStatsData.ts — ${types.length} types (${types.length * 2} stat tables), ` +
    `${shooters} that shoot, ${particles.size} particle keys, ` +
    `${withResistances} with strengths/weaknesses across ${damageTypes.size} damage types.`,
);

const unknownType = [...strengths.keys(), ...weaknesses.keys()].filter(
  (t) => !entries.has(t),
);
if (unknownType.length > 0) {
  console.warn(`  ! resistance tables for unknown types: ${[...new Set(unknownType)].join(', ')}`);
}
