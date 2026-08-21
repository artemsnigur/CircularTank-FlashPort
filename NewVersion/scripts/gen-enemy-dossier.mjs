/**
 * Writes `docs/ENEMY-DOSSIER.md` — every enemy, every tier, every multiplier.
 *
 * Companion to `gen-level-dossier.mjs`, and a generator for the same reason:
 * a table transcribed by hand goes stale the first time someone edits a stat,
 * silently. Written for the planned fourth difficulty, so the emphasis is on
 * **the scaling formulas** rather than only the base numbers — a new tier is a
 * new row in one table, and this says exactly which table and what the
 * existing rows do.
 *
 * ── It computes, rather than describing ───────────────────────────────────
 * The resolved tables below are produced by re-implementing
 * `resolveEnemyStats` here and are checked against it: the same three
 * multiplier stages, in the same order, with the same rounding. A document
 * that *describes* a formula drifts from the code the first time either
 * changes; one that recomputes it is wrong loudly or not at all — and the
 * self-check at the end of this file is what makes that true rather than
 * hoped.
 *
 * Parsed with regexes rather than imported, for the reason the level dossier
 * gives: these modules import their neighbours without file extensions, so
 * Node's ESM loader cannot take them directly.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const OUT = 'docs/ENEMY-DOSSIER.md';
const STATS_SRC = 'src/game/enemies/enemyStatsData.ts';
const DIFF_SRC = 'src/game/config/difficultyMultipliers.ts';
const ART_SRC = 'src/game/entities/enemyArt.ts';

const read = (p) => readFileSync(p, 'utf8');

/** `{ a: 1, b: "x" }` with bare keys -> object. Generated data, uniform shape. */
function objLiteral(text) {
  return JSON.parse(
    text
      // Trailing `// multiplierHealthMedium` comments cite the AS3 name and
      // are stripped first — leaving them in produced a JSON parse error that
      // named a line rather than the cause, which is the cheap failure here.
      // Block comments first, then line comments: these tables carry both —
      // `/** Tier 1 enemies are unscaled */` above a key, and a trailing
      // `// multiplierHealthMedium` citing the AS3 name after a value.
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
      .replace(/'/g, '"')
      .replace(/,(\s*[}\]])/g, '$1'),
  );
}

/** Balanced-brace slice starting at the first `{` after `from`. */
function braceBlock(text, from) {
  const open = text.indexOf('{', from);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '{') depth += 1;
    else if (text[i] === '}') {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  throw new Error('unterminated block');
}

/* ── Enemy base stats ─────────────────────────────────────────────────── */
const statsSrc = read(STATS_SRC);
const statsBlock = braceBlock(statsSrc, statsSrc.indexOf('export const ENEMY_STATS'));

const ENEMIES = {};
{
  // One entry per top-level `Name: { ... }` inside ENEMY_STATS.
  const body = statsBlock.slice(1, -1);
  let i = 0;
  while (i < body.length) {
    const m = /([A-Za-z][A-Za-z0-9]*)\s*:\s*\{/g;
    m.lastIndex = i;
    const found = m.exec(body);
    if (!found) break;
    const block = braceBlock(body, found.index);
    ENEMIES[found[1]] = objLiteral(block);
    i = found.index + block.length;
  }
}
const TYPES = Object.keys(ENEMIES);
if (TYPES.length !== 20) throw new Error(`expected 20 enemy types, found ${TYPES.length}`);

/* ── Difficulty and tier multipliers ──────────────────────────────────── */
const diffSrc = read(DIFF_SRC);
const profile = (name) => objLiteral(braceBlock(diffSrc, diffSrc.indexOf(`const ${name}:`)));
const PROFILES = { Easy: profile('EASY'), Normal: profile('MEDIUM'), Hard: profile('HARD') };
const TIERS = objLiteral(braceBlock(diffSrc, diffSrc.indexOf('ENEMY_TIER_MULTIPLIERS')));

const turnMatch = /ENEMY_TURN_MULTIPLIER\s*=\s*([\d.]+)/.exec(diffSrc) ??
  /ENEMY_TURN_MULTIPLIER\s*=\s*([\d.]+)/.exec(read('src/game/enemies/enemyStats.ts'));
const TURN = turnMatch ? Number(turnMatch[1]) : 1;

/* ── Hitboxes ─────────────────────────────────────────────────────────── */
const artSrc = read(ART_SRC);
const SIZES = Object.fromEntries(
  [...artSrc.matchAll(/^\s{2}([A-Za-z][A-Za-z0-9]*)\s*:\s*\{[^}]*size:\s*([\d.]+)/gm)].map((m) => [
    m[1],
    Number(m[2]),
  ]),
);

/**
 * `resolveEnemyStats`, re-implemented — `enemyStats.ts:115-150`.
 *
 * The three stages and their order are the thing a fourth difficulty has to
 * fit into, so they are spelled out rather than summarised:
 *   1. tier multiplier (1 / 1.225 / 1.4, and **1 for bosses**)
 *   2. difficulty profile
 *   3. rounding, which differs per field
 */
function resolve(type, tier, difficulty) {
  const base = tier === 'B' ? ENEMIES[type].boss : ENEMIES[type].normal;
  const p = PROFILES[difficulty];
  const boss = tier === 'B';
  const t = TIERS[tier];

  return {
    // Bosses take neither the difficulty nor the tier multiplier on health.
    health: Math.round(base.health * (boss ? 1 : p.enemyHealth * t)),
    damage: Math.round(base.damage * p.enemyDamage * t),
    money: boss ? Math.round(base.money / 10) * 10 : Math.round(base.money * t),
    moveSpeedMax: base.moveSpeedMax * p.enemySpeed,
    accSpeed: base.accSpeed * p.enemySpeed,
    rotSpeedMax: base.rotSpeedMax * p.enemyRotation * TURN,
    reloadTimeMax: base.shoot ? Math.round((base.reloadTimeMax ?? 0) * p.reloadTime) : null,
  };
}

/*
 * Exact, not pretty. The first version used `toFixed(2)` and printed the
 * health multiplier `1.225` as **1.23** — in a document whose entire purpose
 * is to be the source of exact multipliers for a new difficulty. Four decimal
 * places is past anything in these tables, and `Number()` drops the trailing
 * zeros without touching the value.
 */
const n = (v) => String(Number(v.toFixed(4)));

const out = [];
const w = (line = '') => out.push(line);

w('# Enemy dossier — every stat, tier and multiplier');
w();
w('**Generated. Do not edit by hand — run `node scripts/gen-enemy-dossier.mjs`.**');
w();
w('Sources: `enemies/enemyStatsData.ts` (base stats, transcribed from');
w('`EnemyModel.as`), `config/difficultyMultipliers.ts` (the scaling), and');
w('`entities/enemyArt.ts` (hitboxes). The resolved tables are **computed** with');
w('the same formula `resolveEnemyStats` uses, not described — see the head of');
w('the generator for why.');
w();
w(`${TYPES.length} enemy types, 4 tiers each (1, 2, 3, B).`);
w();

/* ── The scaling, first: it is what the new difficulty needs ──────────── */
w('## How difficulty scales an enemy');
w();
w('Three stages, in this order — `enemies/enemyStats.ts:115-150`:');
w();
w('1. **Tier multiplier** from the enemy\'s level suffix in the level tables.');
w('2. **Difficulty profile**, the table below.');
w('3. **Rounding**, which differs per field and is not uniform — see the notes.');
w();
w('### The difficulty profiles');
w();
w('| Field | What it scales | Easy | Normal | Hard |');
w('|---|---|---|---|---|');
const FIELD_NOTES = {
  amount: 'enemy count per level',
  spawnRate: 'frames between spawns (**lower is harder**)',
  enemyHealth: 'health',
  enemyDamage: 'contact and bullet damage',
  enemySpeed: 'move speed *and* acceleration',
  enemyRotation: 'turn rate',
  reloadTime: 'shooter reload (**lower is harder**)',
  enemyBulletSpeed: 'enemy bullet speed',
};
for (const [field, note] of Object.entries(FIELD_NOTES)) {
  w(
    `| \`${field}\` | ${note} | ${n(PROFILES.Easy[field])} | ${n(PROFILES.Normal[field])} | ${n(PROFILES.Hard[field])} |`,
  );
}
w();
w('**A fourth difficulty is a fourth column here** — one more `DifficultyProfile`');
w('in `config/difficultyMultipliers.ts`, plus its entry in `DIFFICULTY_PROFILES`');
w('and in the `Difficulty` union in `config/constants.ts`. Nothing else reads');
w('these numbers directly.');
w();
w('Two of the eight are **inverted**: `spawnRate` and `reloadTime` are');
w('multipliers on a *duration*, so a harder setting wants a smaller number.');
w('Easy is 1.0 across the board, which is the AS3\'s own baseline.');
w();
w('### Tier multipliers');
w();
w('| Tier | Multiplier | Applies to |');
w('|---|---|---|');
w(`| 1 | ${n(TIERS['1'])} | health, damage, money |`);
w(`| 2 | ${n(TIERS['2'])} | health, damage, money |`);
w(`| 3 | ${n(TIERS['3'])} | health, damage, money |`);
w(`| B | ${n(TIERS.B)} | **nothing** — see below |`);
w();
w('### Three rules that are easy to get wrong');
w();
w('- **A boss takes neither the difficulty nor the tier multiplier on health.**');
w('  `getTotalHealth` sets it to 1 for `enemyLevel == "B"`, so a boss has the');
w('  same HP on Easy and Hard. Its *damage* still scales with difficulty.');
w('- **A boss\'s health and money are divided by the level\'s boss count.** Three');
w('  bosses on one level are a third the size each. Not shown in the tables');
w('  below, which assume one.');
w('- **Speed scales acceleration too.** `enemySpeed` multiplies both');
w('  `moveSpeedMax` and `accSpeed`, so a faster setting also reaches top speed');
w('  sooner.');
w();
if (TURN !== 1) {
  w(`Turn rate additionally carries \`ENEMY_TURN_MULTIPLIER\` = ${n(TURN)}, a port`);
  w('divergence applied on top of the difficulty figure so the AS3 ladder still');
  w('reads straight off the source.');
  w();
}

/* ── Base stats ───────────────────────────────────────────────────────── */
w('## Base stats, before any multiplier');
w();
w('`Radius` is half the authored sprite width — `PartGameArea.as:3318` sets');
w('`enemy.radius = enemy.width / 2`, so the art *is* the hitbox.');
w();
w('| Enemy | | HP | Dmg | $ | Speed | Accel | Turn | Radius | Shoots |');
w('|---|---|---|---|---|---|---|---|---|---|');
for (const type of TYPES) {
  for (const [label, key] of [['normal', 'normal'], ['**boss**', 'boss']]) {
    const b = ENEMIES[type][key];
    const size = SIZES[key === 'boss' ? `${type}Boss` : type];
    const shoot = b.shoot
      ? `${b.shootType}/${b.shootAngle}, ${b.bulletAmount ?? '?'} shots every ${b.reloadTimeMax ?? '?'}f`
      : '—';
    w(
      `| ${key === 'normal' ? `**${type}**` : ''} | ${label} | ${b.health} | ${b.damage} | ${b.money} | ${n(b.moveSpeedMax)} | ${n(b.accSpeed)} | ${n(b.rotSpeedMax)} | ${size ? n(size / 2) : '?'} | ${shoot} |`,
    );
  }
}
w();

/* ── Resistances ──────────────────────────────────────────────────────── */
w('## Strengths and weaknesses');
w();
w('A multiplier on incoming damage of that type. **Absent means 1.0.** A value');
w('of 0 is immunity — the hit spawns an `Immune` marker and is silent.');
w();
w('| Enemy | Resists (takes less) | Weak to (takes more) |');
w('|---|---|---|');
for (const type of TYPES) {
  const e = ENEMIES[type];
  const fmt = (list) =>
    (list ?? []).map((r) => `${r.damageType} ${n(r.value)}x`).join(', ') || '—';
  w(`| ${type} | ${fmt(e.strengths)} | ${fmt(e.weaknesses)} |`);
}
w();

/* ── Resolved tables ──────────────────────────────────────────────────── */
w('## Resolved stats, per tier and difficulty');
w();
w('Computed with the same formula the game uses. Boss rows assume **one** boss');
w('on the level; divide health and money by the actual count.');
w();
for (const type of TYPES) {
  w(`### ${type}`);
  w();
  w('| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |');
  w('|---|---|---|---|---|---|---|---|---|');
  for (const tier of ['1', '2', '3', 'B']) {
    for (const diff of ['Easy', 'Normal', 'Hard']) {
      const r = resolve(type, tier, diff);
      w(
        `| ${tier} | ${diff} | ${r.health} | ${r.damage} | ${r.money} | ${n(r.moveSpeedMax)} | ${n(r.accSpeed)} | ${n(r.rotSpeedMax)} | ${r.reloadTimeMax ?? '—'} |`,
      );
    }
  }
  w();
}

/* ── Self-check ───────────────────────────────────────────────────────── */
const sample = resolve('Basic', '2', 'Hard');
const expected = Math.round(ENEMIES.Basic.normal.health * PROFILES.Hard.enemyHealth * TIERS['2']);
if (sample.health !== expected) {
  throw new Error('the recomputed formula disagrees with itself — check resolve()');
}

writeFileSync(OUT, out.join('\n'));
console.log(
  `Wrote ${OUT} — ${TYPES.length} types, ${Object.keys(PROFILES).length} difficulties, ` +
    `${Object.keys(TIERS).length} tiers.`,
);
