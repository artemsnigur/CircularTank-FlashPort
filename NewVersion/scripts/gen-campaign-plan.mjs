/**
 * Writes `docs/CAMPAIGN-REDESIGN-PLAN.md` — the proposed 4-world campaign.
 *
 * ── A generator, and specifically a *checked* one ──────────────────────────
 * The plan is 180 levels of mode, boss count and roster, and every rule in it
 * is arithmetic: 45 levels a world, Tower at exactly half its old rate, Boss
 * at exactly double, twenty enemy debuts in the original's order. Hand-typing
 * a table like that produces a document that is wrong in one cell and read as
 * authoritative — the failure this repo has already paid for twice.
 *
 * So the design lives here as constants, the tables are derived from them, and
 * `assert()` fires before anything is written. A slip in the layout is a
 * non-zero exit, not a plausible-looking row.
 *
 * ── It touches no game code, by construction ──────────────────────────────
 * It reads `levelData.ts` and writes one file under `docs/`. Nothing here is
 * imported by the game. The plan is a proposal awaiting approval; turning it
 * into level data is a separate job with its own gate.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import {
  BIG_BOSS_FROM,
  BIG_BOSS_ROOM,
  BOSS_AMOUNTS,
  BOSS_LEVELS,
  INTRO_LEVELS,
  LAYOUT_ROTATION,
  MAX_BOSS_LEVEL_ENTRIES,
  MAX_WAVE_ENTRIES,
  PER_WORLD,
  ROOMS,
  TIER_SOURCE,
  TOTAL_LEVELS,
  VARIETY_BAND,
  WORLDS,
  layoutFor,
  nonBossLevels,
  varietyAt,
} from './lib/campaign-design.mjs';

/**
 * The design constants live in `lib/campaign-design.mjs`, shared with
 * `gen-levels.mjs`, which writes the data this document describes.
 *
 * They used to be a copy here. A copy is how a document comes to describe a
 * campaign nobody is playing — this one already carried a stale theme table
 * once, which is what moved the themes into `src/` and the rest into a lib.
 */
const TOTAL = TOTAL_LEVELS;

const SRC = 'src/game/levels/levelData.ts';
const OUT = 'docs/CAMPAIGN-REDESIGN-PLAN.md';

function assert(cond, message) {
  if (!cond) throw new Error(`plan invariant failed: ${message}`);
}

/* ── The original, parsed from the generated table ───────────────────────── */

function arrayLiteral(text, name, bracket = '[') {
  const close = bracket === '[' ? ']' : '}';
  const start = text.indexOf(`export const ${name}`);
  if (start === -1) throw new Error(`${name} not found`);
  // From the `=`, not the name: the type annotation carries brackets of its
  // own and scanning from the name found one of those instead.
  const open = text.indexOf(bracket, text.indexOf('=', start));
  if (open === -1) throw new Error(`${name} has no ${bracket} after its =`);
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === bracket) depth += 1;
    else if (text[i] === close) {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  throw new Error(`unterminated ${name}`);
}

/** Object/array literal with bare keys -> JSON. Both tables are uniform. */
function parseLiteral(literal) {
  const json = literal
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    // Numeric keys too — `CAMPAIGN_THEMES` is keyed by world number, and the
    // identifier rule above does not match `1:`. Left out at first, and the
    // parse threw rather than producing a partial table, which is the whole
    // reason the assertions around this exist.
    .replace(/([{,]\s*)(\d+)\s*:/g, '$1"$2":')
    .replace(/'([^']*)'/g, '"$1"')
    .replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(json);
}

// `AS3_LEVELS`, not `LEVELS`: since T252 the latter is the redesigned
// campaign this document describes, and comparing the plan against its own
// output would say nothing. The original is what the redesign is measured
// from.
const OLD = parseLiteral(arrayLiteral(readFileSync(SRC, 'utf8'), 'AS3_LEVELS'));
assert(OLD.length === 9, `expected 9 source worlds, got ${OLD.length}`);

const oldFlat = [];
OLD.forEach((w, wi) =>
  w.forEach((s, li) => oldFlat.push({ world: wi + 1, level: li + 1, g: wi * 45 + li + 1, ...s })),
);
assert(oldFlat.length === 405, `expected 405 source levels, got ${oldFlat.length}`);

/** Debut order — the sequence rule 2 requires the redesign to preserve. */
const seen = new Set();
const OLD_INTROS = [];
for (const s of oldFlat) {
  for (const e of s.enemies) {
    if (seen.has(e.type)) continue;
    seen.add(e.type);
    OLD_INTROS.push({ type: e.type, g: s.g, at: `${s.world}-${s.level}`, mode: s.mode });
  }
}
assert(OLD_INTROS.length === 20, `expected 20 enemy types, got ${OLD_INTROS.length}`);

const oldBossCount = (s) =>
  s.enemies.filter((e) => e.level === 'B').reduce((n, e) => n + e.count, 0);
const oldModeCount = (m) => oldFlat.filter((s) => s.mode === m).length;
const distinctTypes = (s) => new Set(s.enemies.map((e) => e.type)).size;

const OLD_BOSS_LEVELS = oldFlat.filter((s) => s.mode === 'Boss');
const OLD_BOSS_TOTAL = OLD_BOSS_LEVELS.reduce((n, s) => n + oldBossCount(s), 0);
const OLD_NONBOSS = oldFlat.filter((s) => s.mode !== 'Boss');
const OLD_MEAN_TYPES = OLD_NONBOSS.reduce((n, s) => n + distinctTypes(s), 0) / OLD_NONBOSS.length;
const OLD_MAX_ENTRIES = Math.max(...oldFlat.map((s) => s.enemies.length));

/** Tier share of every enemy spawned in a set of worlds, as percentages. */
function tierMix(worlds) {
  const c = { 1: 0, 2: 0, 3: 0, B: 0 };
  let total = 0;
  for (const wi of worlds) {
    for (const s of OLD[wi - 1]) {
      for (const e of s.enemies) {
        c[e.level] += e.count;
        total += e.count;
      }
    }
  }
  return { t1: (c[1] / total) * 100, t2: (c[2] / total) * 100, t3: (c[3] / total) * 100 };
}

const THEMES = (() => {
  const source = readFileSync('src/game/levels/campaignThemes.ts', 'utf8');
  const literal = arrayLiteral(source, 'CAMPAIGN_THEMES', '{');
  const parsed = parseLiteral(literal);

  const out = {};
  for (const [world, blocks] of Object.entries(parsed)) {
    out[Number(world)] = blocks.map((b) => [b.theme, b.from]);
  }
  return out;
})();

assert(Object.keys(THEMES).length === WORLDS, `theme table covers ${Object.keys(THEMES).length} worlds`);
{
  const used = Object.values(THEMES).flatMap((blocks) => blocks.map(([theme]) => theme));
  // Nine, each once: the substance of D-4. A parse that silently produced an
  // empty or partial table would fail right here rather than in the document.
  assert(used.length === 9, `theme blocks name ${used.length} themes, expected 9`);
  assert(new Set(used).size === 9, 'a theme is used by two blocks');
  for (const [world, blocks] of Object.entries(THEMES)) {
    assert(blocks[0][1] === 1, `world ${world} does not start at level 1`);
    for (let i = 1; i < blocks.length; i += 1) {
      assert(blocks[i][1] > blocks[i - 1][1], `world ${world} blocks are not ascending`);
    }
  }
}

/** Mode -> room size. The original already locks Tower, Defense and Boss. */
const introByWorldLevel = new Map();
{
  let n = 0;
  for (const w of [1, 2, 3, 4]) {
    for (const level of INTRO_LEVELS[w]) {
      introByWorldLevel.set(`${w}-${level}`, OLD_INTROS[n]);
      n += 1;
    }
  }
  assert(n === 20, `intro schedule places ${n} types, expected 20`);
}

const NONBOSS_LEVELS = nonBossLevels();
assert(
  NONBOSS_LEVELS.length === layoutFor(1).length,
  `layout has ${layoutFor(1).length} slots for ${NONBOSS_LEVELS.length} non-boss levels`,
);
// `layoutFor` and `varietyAt` come from the shared design; only the theme
// lookup is local, because the blocks are parsed from `campaignThemes.ts`.
assert(LAYOUT_ROTATION > 0, 'the layout rotation is not set');

function themeAt(world, level) {
  let theme = THEMES[world][0][0];
  for (const [name, from] of THEMES[world]) if (level >= from) theme = name;
  return theme;
}

const PLAN = [];
let roster = 0;
for (let world = 1; world <= WORLDS; world += 1) {
  const layout = layoutFor(world);
  let slot = 0;
  for (let level = 1; level <= PER_WORLD; level += 1) {
    const g = (world - 1) * PER_WORLD + level;
    const intro = introByWorldLevel.get(`${world}-${level}`);
    if (intro) roster += 1;

    const bossIndex = BOSS_LEVELS.indexOf(level);
    const isBoss = bossIndex !== -1;
    const mode = isBoss ? 'Boss' : layout[slot];
    if (!isBoss) slot += 1;

    const bosses = isBoss ? BOSS_AMOUNTS[world][bossIndex] : 0;
    const room = isBoss ? (bosses >= BIG_BOSS_FROM ? BIG_BOSS_ROOM : ROOMS.Boss) : ROOMS[mode];

    PLAN.push({
      world,
      level,
      g,
      mode,
      room,
      bosses,
      intro: intro?.type ?? null,
      roster,
      // A boss level's support wave is narrower: the boss row takes an entry
      // of its own, and the original keeps 2-3 support types alongside it.
      types: isBoss ? Math.min(roster, 3) : varietyAt(world, level, roster),
      theme: themeAt(world, level),
      // Pacing reference only: the old level at the same fraction of the
      // campaign. The wave itself is authored to the variety rule.
      source: Math.min(405, Math.max(1, Math.round((g - 0.5) * (405 / TOTAL)))),
    });
  }
  assert(slot === layout.length, `world ${world} filled ${slot} of ${layout.length} layout slots`);
}

/* ── The invariants, checked before a word is written ────────────────────── */

assert(PLAN.length === TOTAL, `plan has ${PLAN.length} levels, expected ${TOTAL}`);

const count = (m) => PLAN.filter((r) => r.mode === m).length;
const NEW_MODES = {
  Normal: count('Normal'),
  Flag: count('Flag'),
  Tower: count('Tower'),
  Defense: count('Defense'),
  Boss: count('Boss'),
};

for (let w = 1; w <= WORLDS; w += 1) {
  const rows = PLAN.filter((r) => r.world === w);
  assert(rows.length === PER_WORLD, `world ${w} has ${rows.length} levels`);
  for (const [m, n] of Object.entries({ Normal: 10, Flag: 10, Tower: 5, Defense: 10, Boss: 10 })) {
    const got = rows.filter((r) => r.mode === m).length;
    assert(got === n, `world ${w} has ${got} ${m} levels, expected ${n}`);
  }
  const towers = rows.filter((r) => r.mode === 'Tower').map((r) => r.level);
  assert(towers.join() === '7,16,25,34,43', `world ${w} Towers at ${towers.join()}`);
}

// Rule 4: Tower at exactly half its old share. Rule 5: Boss at exactly double.
const oldShare = (m) => oldModeCount(m) / oldFlat.length;
const newShare = (m) => NEW_MODES[m] / TOTAL;
const near = (a, b) => Math.abs(a - b) < 1e-9;
assert(near(newShare('Tower'), oldShare('Tower') / 2), 'Tower is not exactly half its old rate');
assert(near(newShare('Boss'), oldShare('Boss') * 2), 'Boss is not exactly double its old rate');
for (const m of ['Normal', 'Flag', 'Defense']) {
  assert(near(newShare(m), oldShare(m)), `${m} share moved, and nothing asked it to`);
}

// Rule 2: the debut order is the original's, and every type debuts once.
const newOrder = PLAN.filter((r) => r.intro).map((r) => r.intro);
assert(newOrder.length === 20, `${newOrder.length} debuts scheduled, expected 20`);
assert(
  newOrder.join() === OLD_INTROS.map((i) => i.type).join(),
  'debut order diverges from the original',
);
// No debut lands on a boss level: a new type wants a level that is about it.
const onBoss = PLAN.filter((r) => r.intro && r.mode === 'Boss').map((r) => `${r.world}-${r.level}`);
assert(onBoss.length === 0, `debuts on boss levels: ${onBoss.join(', ')}`);

const NEW_BOSS_TOTAL = PLAN.reduce((n, r) => n + r.bosses, 0);
{
  const singles = PLAN.filter((r) => r.mode === 'Boss' && r.bosses === 1);
  assert(
    singles.length === 1 && singles[0].world === 1 && singles[0].level === 5,
    `single-boss levels: ${singles.map((r) => `${r.world}-${r.level}`).join(', ') || 'none'}`,
  );
}

assert(NEW_BOSS_TOTAL > OLD_BOSS_TOTAL, 'the campaign does not spawn more bosses');
for (const r of PLAN) {
  if (r.mode !== 'Boss') assert(r.bosses === 0, `${r.world}-${r.level} is not a boss level`);
  // At least one, and exactly one only on 1-5 — the first boss a player meets
  // has to teach the encounter rather than kill them (`campaign-design.mjs`).
  else assert(r.bosses >= 1, `${r.world}-${r.level} spawns ${r.bosses}`);
}
// BossOnlySpecial needs a level with three bosses, and could not be earned in
// world 1 of the original because no world-1 level has three.
const firstThree = PLAN.find((r) => r.bosses >= 3);
assert(firstThree.world === 1, `first 3-boss level is in world ${firstThree.world}`);

const newNonBoss = PLAN.filter((r) => r.mode !== 'Boss');
const NEW_MEAN_TYPES = newNonBoss.reduce((n, r) => n + r.types, 0) / newNonBoss.length;
assert(NEW_MEAN_TYPES > OLD_MEAN_TYPES, 'variety did not increase');
// Every level fields at least two types *once two exist*. 1-1 is the one
// exception and cannot be otherwise: Basic is the only thing that has debuted.
const thin = newNonBoss.filter((r) => r.types < 2 && r.roster >= 2);
assert(thin.length === 0, `single-type levels with a roster to draw on: ${thin.length}`);

const introG = PLAN.filter((r) => r.intro).map((r) => r.g);
const gaps = introG.slice(1).map((g, i) => g - introG[i]);
const OLD_GAPS = OLD_INTROS.slice(1).map((t, i) => t.g - OLD_INTROS[i].g);
assert(Math.max(...gaps) < Math.max(...OLD_GAPS), 'the longest drought did not shrink');

/* ── Medal ceilings: the consequence that is not in the brief ────────────── */

const MEDAL_MODES = {
  Stars: 'Normal',
  Flags: 'Flag',
  Towers: 'Tower',
  Shields: 'Defense',
  Bosses: 'Boss',
};
/** `achievementData.ts:51-65`. Three medals is the most one level can award. */
const REQUIREMENTS = {
  Stars: [60, 120, 180],
  Flags: [60, 120, 180],
  Towers: [60, 120, 180],
  Shields: [60, 120, 180],
  Bosses: [30, 60, 90],
};
const MEDALS_PER_LEVEL = 3;
const medals = Object.entries(MEDAL_MODES).map(([type, mode]) => ({
  type,
  mode,
  oldCeiling: oldModeCount(mode) * MEDALS_PER_LEVEL,
  newCeiling: NEW_MODES[mode] * MEDALS_PER_LEVEL,
  reqs: REQUIREMENTS[type],
}));
const broken = medals.flatMap((m) =>
  m.reqs
    .map((r, i) => ({ id: `${m.type}${i + 1}`, req: r, ceiling: m.newCeiling }))
    .filter((a) => a.req > a.ceiling),
);
assert(broken.length > 0, 'expected the medal ceilings to bite — recheck the thresholds');

/* ── Output ─────────────────────────────────────────────────────────────── */

const pct = (n) => `${(n * 100).toFixed(1)}%`;
const one = (n) => n.toFixed(1);
const L = [];
const w = (...lines) => L.push(...lines);
const introRows = PLAN.filter((r) => r.intro);

w(
  '# Campaign redesign — 9 worlds to 4',
  '',
  '**Generated. Do not edit by hand — run `node scripts/gen-campaign-plan.mjs`.**',
  '',
  '**This is a proposal, not the data.** Nothing under `src/` has changed. Every',
  'number below is derived from the design constants at the top of the generator',
  'and checked by two dozen assertions before the file is written, so a slip in',
  'the layout is a non-zero exit rather than a plausible-looking row.',
  '',
  `${WORLDS} worlds, ${PER_WORLD} levels each, ${TOTAL} levels — down from 9 and 405.`,
  '',
  'Companions: `LEVEL-DOSSIER.md` is the original campaign level by level,',
  '`ENEMY-DOSSIER.md` every enemy stat and multiplier.',
  '',
  '---',
  '',
  '## 1. The mode arithmetic',
  '',
  'Compressing 405 levels into 180 is a factor of 4/9. Held proportional, every',
  'mode keeps its share exactly. Rules 4 and 5 then move two of them:',
  '',
  '| Mode | Original | Share | Proportional at 180 | **This plan** | Share | Rate vs original |',
  '|---|---|---|---|---|---|---|',
);
for (const m of ['Normal', 'Flag', 'Tower', 'Defense', 'Boss']) {
  const prop = Math.round(oldModeCount(m) * (TOTAL / 405));
  const ratio = newShare(m) / oldShare(m);
  const mark = ratio === 1 ? 'unchanged' : `**x${ratio.toFixed(1)}**`;
  w(
    `| ${m} | ${oldModeCount(m)} | ${pct(oldShare(m))} | ${prop} | ` +
      `**${NEW_MODES[m]}** | ${pct(newShare(m))} | ${mark} |`,
  );
}
w(
  `| **Total** | **405** | | **180** | **${TOTAL}** | | |`,
  '',
  '### The two rules cancel exactly, and that is worth saying out loud',
  '',
  'Rule 4 halves Tower: 40 proportional slots become 20, freeing **20**.',
  'Rule 5 doubles Boss: 20 proportional slots become 40, consuming **20**.',
  '',
  'The ledger nets to zero, so Normal, Flag and Defense land on their',
  'proportional 40 apiece. Rule 4 asks for the freed Tower slots to go to "other',
  'existing game modes", and rule 5 is what takes them — Boss being one of them.',
  'At a fixed 180 levels there is no other closed solution: the campaign has no',
  'spare slots, so anything Normal/Flag/Defense gain has to come out of Boss.',
  '',
  '> **Decision D-2 — do you want Normal/Flag/Defense to visibly grow instead?**',
  '> Then Boss cannot double. Trading 6 boss levels back gives Boss 34 and 42',
  '> each of the other three — Boss at x1.7 rather than x2.0. The plan below',
  '> assumes **no**: rule 5 as written, the other three held at their old rate.',
  '',
  '---',
  '',
  '## 2. Where each enemy is introduced',
  '',
  'Rule 2 fixes the **order** and frees the **spacing**. Every type debuts in',
  'exactly the position it held in the original sequence; what changes is that',
  'the droughts between them are gone.',
  '',
  '| # | Enemy | Original | Gap | **New** | Gap | Debut mode |',
  '|---|---|---|---|---|---|---|',
);
introRows.forEach((r, i) => {
  const o = OLD_INTROS[i];
  const og = i === 0 ? '—' : String(o.g - OLD_INTROS[i - 1].g);
  const ng = i === 0 ? '—' : String(r.g - introRows[i - 1].g);
  w(`| ${i + 1} | **${r.intro}** | ${o.at} | ${og} | **${r.world}-${r.level}** | ${ng} | ${r.mode} |`);
});
const meanOld = OLD_GAPS.reduce((a, b) => a + b, 0) / OLD_GAPS.length;
const meanNew = gaps.reduce((a, b) => a + b, 0) / gaps.length;
const oldPerWorld = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(
  (n) => OLD_INTROS.filter((i) => Math.ceil(i.g / 45) === n).length,
);
const newPerWorld = [1, 2, 3, 4].map((n) => introRows.filter((r) => r.world === n).length);
w(
  '',
  '| | Original | This plan |',
  '|---|---|---|',
  `| Longest run with nothing new | **${Math.max(...OLD_GAPS)} levels** | **${Math.max(...gaps)} levels** |`,
  `| Mean gap between debuts | ${one(meanOld)} | ${one(meanNew)} |`,
  `| Last debut | ${OLD_INTROS[19].at} — level ${OLD_INTROS[19].g} of 405 | ` +
    `${introRows[19].world}-${introRows[19].level} — level ${introG[19]} of ${TOTAL} |`,
  `| Debuts per world | ${oldPerWorld.join(', ')} | ${newPerWorld.join(', ')} |`,
  '',
  'After the opening three the cadence is a flat **nine levels**. That is why',
  'the shape of the old back half — 6 new types spread across its last 180',
  'levels — does not survive. Two consequences worth being explicit about:',
  '',
  `- **World 1 carries ${newPerWorld[0]} debuts.** That is the front-loading the original`,
  '  already had (6 in world 1, 9 across the first two), compressed. The player',
  '  meets something new every 8-9 levels for the whole of world 1.',
  `- **World 4 carries ${newPerWorld[3]}, all within its first ${INTRO_LEVELS[4][2]} levels.** Only three types remain`,
  '  in the original ordering after Tiny, and moving one later would break rule',
  '  2. World 4 escalates by **tier and boss count**, not by novelty — and',
  '  Soldier debuting at 4-19 leaves 26 levels of runway to actually use it,',
  '  against the original 9-1 followed by 44 levels of the same roster.',
  '',
  `No debut lands on a boss level, and ${introRows.filter((r) => r.mode === 'Normal' || r.mode === 'Flag').length} of the 20 land on a Normal or`,
  'Flag level — the two modes where a player can look at a new thing without a',
  'lane to hold or a tower to protect.',
  '',
);
w(
  '---',
  '',
  '## 3. The boss schedule',
  '',
  '### Which levels',
  '',
  `**${BOSS_LEVELS.join(', ')}** — the same ten in every world, ${NEW_MODES.Boss} in total.`,
  '',
  "The original's five (9, 18, 27, 36, 45) are **all kept**, and the new five sit",
  'at the midpoint of each gap. Nothing that was a boss stops being one, so a',
  'player who knows the old rhythm still reads it — the spacing just alternates',
  '4 and 5 levels instead of a flat 9.',
  '',
  '### How many bosses on each',
  '',
  `| World | ${BOSS_LEVELS.map((l) => `L${l}`).join(' | ')} | Total |`,
  `|---|${BOSS_LEVELS.map(() => '---').join('|')}|---|`,
);
for (let world = 1; world <= WORLDS; world += 1) {
  const a = BOSS_AMOUNTS[world];
  w(`| **${world}** | ${a.join(' | ')} | ${a.reduce((x, y) => x + y, 0)} |`);
}
const oldPerBoss = OLD_BOSS_TOTAL / OLD_BOSS_LEVELS.length;
const newPerBoss = NEW_BOSS_TOTAL / NEW_MODES.Boss;
w(
  '',
  '| | Original | This plan | Factor |',
  '|---|---|---|---|',
  `| Boss levels | ${OLD_BOSS_LEVELS.length} of 405 (${pct(oldShare('Boss'))}) | ` +
    `${NEW_MODES.Boss} of ${TOTAL} (${pct(newShare('Boss'))}) | **x2.0 by rate** |`,
  `| Bosses spawned across the campaign | ${OLD_BOSS_TOTAL} | ${NEW_BOSS_TOTAL} | ` +
    `x${(NEW_BOSS_TOTAL / OLD_BOSS_TOTAL).toFixed(2)} |`,
  `| Bosses per boss level | ${one(oldPerBoss)} mean, ` +
    `${Math.min(...OLD_BOSS_LEVELS.map(oldBossCount))}-${Math.max(...OLD_BOSS_LEVELS.map(oldBossCount))} | ` +
    `${one(newPerBoss)} mean, ${Math.min(...PLAN.filter((r) => r.bosses).map((r) => r.bosses))}-` +
    `${Math.max(...PLAN.map((r) => r.bosses))} | **x${(newPerBoss / oldPerBoss).toFixed(2)}** |`,
  '',
  '### Decision D-1 — DECIDED and shipped: option A, plus a cap',
  '',
  '**Landed in T247.** The divisor is gone, each boss carries its whole stat',
  'line, and `MAX_BOSSES_ALIVE = 4` in `waveState.ts` keeps at most four on the',
  'map with the rest queuing behind their deaths. Divergence `A95`.',
  '',
  '**The premise this section originally argued was half wrong, and the**',
  '**correction is worth keeping.** The claim was that raising the boss count',
  'would make levels *easier*, because `enemyStats.ts` divided a boss health and',
  'money by the level boss count (`PartInterface.as:971`). That was true of the',
  '**code** and false of the **game**: `bossAmount` reached the resolver only',
  'through `EnemySpawnConfig`, and `Enemy.spawn` — its one and only call site —',
  'has never passed it. Every boss this port has ever spawned already had full',
  'health, so option A changed no observable behaviour. It deleted a rule that',
  'was already inert and made the code say what the game does.',
  '',
  'Five tests drove that divisor at 1, 2, 3 and 4 and all passed — one of them',
  'deliberately on a multi-boss level, because "at 1 the division is invisible',
  'and any implementation passes". None could see that nothing supplied the',
  'number. **A test that constructs its own input cannot detect an input nobody',
  'constructs.**',
  '',
  '**The cap is the part that is genuinely new.** The AS3 spawns every boss back',
  'to back and lets them all live, which it can afford *because* of the divisor.',
  'With each boss whole, ten arriving at once is not a fight. Past four out,',
  '`drawEnemy` falls through to the ordinary weighted draw, so the level keeps',
  'sending support enemies rather than going quiet.',
  '',
  '**Left open on purpose:** boss *money* is no longer divided either, so a',
  'ten-boss level pays ten boss bounties. That follows from option A as',
  'approved; balancing it belongs with the D-3 density pass, not here.',
  '',
  'The three options as they were put, for the record:',
  '',
  '| | Change | At 8 bosses | Note |',
  '|---|---|---|---|',
  '| **A** *(recommended)* | Drop the divisor — each boss keeps full health | 8x total health, 8x money | The honest reading of "more epic and difficult". Biggest balance swing, and the one players will feel. |',
  '| **B** | Divide by `sqrt(bossAmount)` | 2.8x total health | A middle setting, but the number stops being legible from the data. |',
  '| **C** | Keep the divisor, add a per-level `bossHealthScale` column | whatever each level says | Most control, most rows to author, easiest to get inconsistent. |',
  '',
  'All three change `resolveEnemyStats`, not level data. **A** is one line plus a',
  'divergence entry in `AUDIT-2026-07.md`. The boss health wipe reads `maxHealth`',
  'off the enemy (`bossLifeIndicator.ts`) and needs no change under any of them.',
  '',
  '### One thing this schedule fixes for free',
  '',
  '`BossOnlySpecial` ("CHUCK NORRIS") needs a boss level with **three or more**',
  'bosses — `GameplayScene.ts:2116` sets its flag from `bossAmount >= 3`. No',
  'world-1 level in the original has three, so it could not be earned there at',
  `all. Under this plan **${firstThree.world}-${firstThree.level}** is the first 3-boss level and world 1 has`,
  `${BOSS_AMOUNTS[1].filter((n) => n >= 3).length} of them.`,
  '',
  '---',
  '',
  '## 4. Enemy variety on ordinary levels',
  '',
  '| | Original | This plan |',
  '|---|---|---|',
  `| Distinct types on a non-boss level, mean | **${one(OLD_MEAN_TYPES)}** | **${one(NEW_MEAN_TYPES)}** |`,
  `| Range | ${Math.min(...OLD_NONBOSS.map(distinctTypes))}-${Math.max(...OLD_NONBOSS.map(distinctTypes))} | ` +
    `${Math.min(...newNonBoss.map((r) => r.types))}-${Math.max(...newNonBoss.map((r) => r.types))} |`,
  `| Levels fielding a single type | ${OLD_NONBOSS.filter((s) => distinctTypes(s) === 1).length} | ` +
    `${newNonBoss.filter((r) => r.types === 1).length} — only 1-1, where Basic is the whole roster |`,
  '',
  'The target ramps inside each world and across the campaign:',
  '',
  '| World | Types per non-boss level | Actually achieved |',
  '|---|---|---|',
);
for (let world = 1; world <= WORLDS; world += 1) {
  const [lo, hi] = VARIETY_BAND[world];
  const rows = newNonBoss.filter((r) => r.world === world);
  const lim = rows.some((r) => r.roster < hi) ? ' — held down early by the roster' : '';
  w(
    `| ${world} | ${lo} -> ${hi} | ${Math.min(...rows.map((r) => r.types))}-` +
      `${Math.max(...rows.map((r) => r.types))}, mean ${one(rows.reduce((n, r) => n + r.types, 0) / rows.length)}${lim} |`,
  );
}
w(
  '',
  'Two hard limits sit above the band. A level cannot field more types than have',
  'debuted, which binds in world 1 only; and wave entries are capped at',
  `**${MAX_WAVE_ENTRIES}**, because \`levelPreview\` draws one row per entry and the busiest`,
  `level in the original has ${OLD_MAX_ENTRIES}. Six is a layout the level-select panel is known`,
  'to survive; seven is a guess.',
  '',
  `**Boss levels are the exception, at ${MAX_BOSS_LEVEL_ENTRIES}.** A boss level fields up to five`,
  'distinct boss types and each is a row of its own before the support gets one,',
  'so five bosses plus two support is seven — one past what the original ever',
  'asked the panel to draw. It is a separate constant from the number above so',
  'that ordinary levels stay inside what is known to work: if seven rows ever',
  'overflow, only the boss cap moves.',
  '',
  '**Checked on 4-45**, the deepest level in the campaign at ten bosses: seven',
  'rows fit the detail panel with no overflow.',
  '',
  '### Tier mix per world',
  '',
  'Each new world inherits the tier balance of the old worlds it replaces, so the',
  'escalation curve is preserved rather than re-invented:',
  '',
  '| New world | Replaces old | tier 1 | tier 2 | tier 3 |',
  '|---|---|---|---|---|',
);
for (let world = 1; world <= WORLDS; world += 1) {
  const src = TIER_SOURCE[world];
  const m = tierMix(src);
  w(`| ${world} | ${src.join(', ')} | ${m.t1.toFixed(0)}% | ${m.t2.toFixed(0)}% | ${m.t3.toFixed(0)}% |`);
}
w('');
w(
  '---',
  '',
  '## 5. :warning: What a shorter campaign breaks — the medal ceilings',
  '',
  'Fifteen achievements count medals earned in one mode, three medals to a level.',
  'Fewer levels of a mode means a lower ceiling, and several thresholds end up',
  'above it:',
  '',
  '| Group | Mode | Levels | Ceiling (x3) | Thresholds | Status |',
  '|---|---|---|---|---|---|',
);
for (const m of medals) {
  const status = m.reqs
    .map((r, i) =>
      r > m.newCeiling
        ? `**${m.type}${i + 1} impossible**`
        : r === m.newCeiling
          ? `${m.type}${i + 1} needs a perfect run`
          : null,
    )
    .filter(Boolean);
  w(
    `| ${m.type}1-3 | ${m.mode} | ${oldModeCount(m.mode)} -> **${NEW_MODES[m.mode]}** | ` +
      `${m.oldCeiling} -> **${m.newCeiling}** | ${m.reqs.join(' / ')} | ` +
      `${status.length ? status.join('; ') : 'fine'} |`,
  );
}
w(
  '',
  `Unearnable outright: **${broken.map((b) => b.id).join(', ')}**.`,
  '',
  '**No test catches this.** `achievementReachability.test.ts` is titled "every',
  'achievement is reachable" and it feeds the evaluator a fabricated total, so it',
  'proves the rule *fires* — it never asks whether the campaign can supply the',
  'number. That is the shape `CLAUDE.md` tracks under "a guarantee is only worth',
  'what enforces it", and it is worth closing in the same pass:',
  '',
  '- rescale each threshold to the same fraction of the new ceiling — roughly',
  '  **25 / 50 / 80** for Stars, Flags, Shields and Bosses, and **15 / 30 / 40**',
  '  for Towers. `achievementData.ts` restates the number in prose',
  '  ("Earn 60 stars."), so the description has to move with it;',
  '- add a check deriving each ceiling from `LEVELS` and failing when a',
  '  requirement exceeds it, so the next campaign edit cannot quietly reopen it.',
  '',
  '### Other code that assumes nine worlds',
  '',
  '| Where | What it holds | Needs |',
  '|---|---|---|',
  '| `levelData.ts` | the 405-row table | replaced — this is the job |',
  '| `levelProgress.ts:143-145` | `FREE_WORLD_COUNT = 6`, `PREMIUM_WORLD_COUNT = 9` | a new split — 2 of 4? |',
  '| `levelProgress.ts:213` | the hardcoded "World 6  Level 45" completion label | follows the split |',
  '| `levelSizeOverrides.ts` | 15 world-1 room overrides | fold into the new data, then retire the file |',
  '| `achievementData.ts:51-65` | 15 thresholds and their prose | rescale, above |',
  '| `levelUnlock.ts:91`, `WORLD_COUNT` | derived from `LEVELS.length` | **nothing — already derived** |',
  '',
  'Save compatibility is the other open question. A slot stores progress as a',
  'table shaped like the campaign, so every existing save points at worlds that',
  'will no longer exist; the simplest answer is a save-version bump that resets',
  'progress rather than a migration nobody can verify.',
  '',
  '---',
  '',
  '## 6. Every level',
  '',
  '**All nine themes are kept** — D-4, settled after looking at them in the',
  '`#themes` gallery. A world moves through two or three of them in solid',
  'blocks, so the ground changes under the player mid-world rather than at a',
  'boundary they only see in a menu. The blocks come from',
  '`src/game/levels/campaignThemes.ts`, which is the specification and carries',
  'the tests; this document reads it rather than restating it.',
  '',
  '`Types` is the target number of distinct enemy types in the wave and `Roster`',
  'how many have debuted by then. `Source` is the old level at the same fraction',
  'of the campaign — a **pacing reference** for enemy count and spawn interval,',
  'not a wave to copy: composition is authored to the variety rule above.',
  '',
);
for (let world = 1; world <= WORLDS; world += 1) {
  const themes = THEMES[world].map(([t, from]) => `${t} (from ${from})`).join(' -> ');
  w(
    `### World ${world} — ${themes}`,
    '',
    '| Level | Mode | Room | Bosses | New enemy | Types | Roster | Source |',
    '|---|---|---|---|---|---|---|---|',
  );
  for (const r of PLAN.filter((x) => x.world === world)) {
    const src = oldFlat[r.source - 1];
    w(
      `| **${r.world}-${r.level}** | ${r.mode} | ${r.room} | ${r.bosses || '—'} | ` +
        `${r.intro ? `**NEW: ${r.intro}**` : '—'} | ${r.types} | ${r.roster} | ` +
        `${src.world}-${src.level} |`,
    );
  }
  w('');
}
w(
  '---',
  '',
  '## 7. Open decisions',
  '',
  'All six are answered. This is now the record of what was decided, not a set',
  'of open questions.',
  '',
  '| | Question | **Decision** | State |',
  '|---|---|---|---|',
  '| **D-1** | The boss health divisor | **Option A** — dropped, plus a four-alive cap with the rest queuing behind deaths | **Done, T247** (`A95`) |',
  '| **D-2** | Should the freed Tower slots grow Normal/Flag/Defense instead of Boss? | **No** — rule 5 as written; the other three hold their old rate | settled; the tables above reflect it |',
  '| **D-3** | Enemy density on ordinary levels | **+20% enemy count, -30% spawn interval.** Defense levels instead take **-40% interval and +50% enemy move speed** | **Done, T250** (`A96`) — `config/campaignTuning.ts`, live on the current campaign too |',
  '| **D-4** | Nine themes across four worlds | **Keep all nine**, in solid sequential blocks — reversed after seeing them in the `#themes` gallery | **Done, T249.** In `campaignThemes.ts` and in the data since T252; the gallery was retired in T254 |',
  '| **D-5** | Free/premium split | **No premium at all.** All four worlds free; the restriction comes out of the campaign | **Done, T252** (`A98`) |',
  '| **D-6** | Existing saves | **Bump the save version and wipe progress** | **Done, T253** (`A99`) |',
  '',
  '## 8. What happens once this is approved',
  '',
  'In order, one commit each — the boundaries matter, because a boss balance',
  'regression that bisects to "one of these four things" is most of the value of',
  'having bisected at all:',
  '',
  '1. ~~**D-1 alone.** A stat rule with its own tests and no dependency on the',
  '   new data.~~ **Done — T247.**',
  '2. ~~**The theme dev page**, so D-4 can be answered by looking rather than',
  '   guessing.~~ **Done — T248** at `#themes`, and it changed the answer: all',
  '   nine kept, not four. The blocks went into `campaignThemes.ts` (T249) and',
  '   into the data (T252); the gallery came back out in T254, which is the',
  '   whole lifecycle a `DEV-AID:` tag exists to make possible.',
  '2. **The achievement rescale and the new ceiling check**, also alone, and also',
  '   before the data — a check has to exist before the thing it guards.',
  '3. ~~**D-3**, the density layer.~~ **Done — T250.** It applies to the',
  '   current campaign as well, so it is observable now rather than waiting.',
  '4. ~~**The 180-level table.**~~ **Done — T252** (`A98`), generated from',
  '   constants in this file, with a `data:check` that fails when the file and',
  '   the generator disagree. Hand-authoring 180 rows of magic numbers is how a',
  '   campaign ends up with a level nobody can explain.',
  '5. **The world-count consequences** — premium split, completion label,',
  '   retiring `levelSizeOverrides`, the save version.',
  '',
  'Steps 1 and 2 can land before the redesign is finalised; they are corrections',
  'either way.',
  '',
);

writeFileSync(OUT, `${L.join('\n')}\n`, 'utf8');
console.log(
  `${OUT}: ${L.length} lines, ${TOTAL} levels, ${NEW_MODES.Boss} boss levels, ${NEW_BOSS_TOTAL} bosses`,
);
console.log(`  modes: ${Object.entries(NEW_MODES).map(([m, n]) => `${m} ${n}`).join(', ')}`);
console.log(
  `  debut gap: max ${Math.max(...OLD_GAPS)} -> ${Math.max(...gaps)}, mean ${one(meanOld)} -> ${one(meanNew)}`,
);
console.log(`  variety: ${one(OLD_MEAN_TYPES)} -> ${one(NEW_MEAN_TYPES)} types per non-boss level`);
console.log(`  medal thresholds broken by the shorter campaign: ${broken.map((b) => b.id).join(', ')}`);
