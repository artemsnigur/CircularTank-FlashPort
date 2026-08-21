/**
 * Writes `docs/LEVEL-DOSSIER.md` — every world, level, mode and enemy wave.
 *
 * A **generator rather than a hand-written dump**, because the point of the
 * document is to be re-read after the data changes. A 405-level table
 * transcribed by hand is out of date the first time someone edits a row, and
 * silently so.
 *
 * ── It reads the generated table, not the accessor ────────────────────────
 * `LEVELS` in `levelData.ts` is a pure transcription of the AS3, and
 * `getLevel` applies the divergences in `levelSizeOverrides.ts` on the way
 * out. This parses the literal, so what it prints is the **source** data — and
 * the overrides are listed separately at the end rather than silently folded
 * in. A redesign wants to see both, and which is which.
 *
 * Parsed with a regex rather than imported: `levelData.ts` imports its
 * neighbours without file extensions, so Node's ESM loader cannot take it
 * directly, and the alternative — standing up the whole Vite pipeline for a
 * docs script — is more machinery than the job needs. The table is generated
 * output with a uniform shape, which is what makes that safe here and would
 * not make it safe on hand-written source.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const SRC = 'src/game/levels/levelData.ts';
const OUT = 'docs/LEVEL-DOSSIER.md';

/** Pulls one `export const NAME ... = [ ... ];` array literal out of a module. */
function arrayLiteral(text, name) {
  const start = text.indexOf(`export const ${name}`);
  if (start === -1) throw new Error(`${name} not found in ${SRC}`);
  // From the `=`, not the declaration: the type annotation
  // `readonly (readonly LevelSpec[])[]` contains brackets of its own, and
  // scanning from the name found one of those instead — a parse that yielded
  // zero worlds rather than failing, which is why the count is asserted below.
  const open = text.indexOf('[', text.indexOf('=', start));
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === '[') depth += 1;
    else if (text[i] === ']') {
      depth -= 1;
      if (depth === 0) return text.slice(open, i + 1);
    }
  }
  throw new Error(`unterminated ${name}`);
}

/** Object literal with bare keys -> JSON. The table is generated, so uniform. */
function parseLiteral(literal) {
  const json = literal
    .replace(/\/\/[^\n]*/g, '')
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)\s*:/g, '$1"$2":')
    .replace(/,(\s*[}\]])/g, '$1');
  return JSON.parse(json);
}

const source = readFileSync(SRC, 'utf8');
const LEVELS = parseLiteral(arrayLiteral(source, 'LEVELS'));

const total = LEVELS.reduce((n, w) => n + w.length, 0);
if (LEVELS.length !== 9 || total !== 405) {
  throw new Error(`expected 9 worlds and 405 levels, found ${LEVELS.length} and ${total}`);
}

/* ── Derived facts ────────────────────────────────────────────────────────
 * "Where does this enemy first appear" is not in the data; it is the thing a
 * redesign most needs and the thing hardest to see by reading 405 rows.
 */
const firstSeen = new Map(); // "Type" -> "w-l"
const firstSeenBoss = new Map();
const usage = new Map(); // "Type" -> { levels, total, worlds:Set }

LEVELS.forEach((world, wi) => {
  world.forEach((level, li) => {
    const id = `${wi + 1}-${li + 1}`;
    for (const e of level.enemies) {
      if (!firstSeen.has(e.type)) firstSeen.set(e.type, id);
      if (e.level === 'B' && !firstSeenBoss.has(e.type)) firstSeenBoss.set(e.type, id);
      const u = usage.get(e.type) ?? { levels: 0, total: 0, worlds: new Set() };
      u.levels += 1;
      u.total += e.count;
      u.worlds.add(wi + 1);
      usage.set(e.type, u);
    }
  });
});

const bosses = (level) => level.enemies.filter((e) => e.level === 'B').reduce((n, e) => n + e.count, 0);
const roster = (level) =>
  level.enemies
    .map((e) => `${e.count}x ${e.type}${e.level === 'B' ? ' **[BOSS]**' : ` (t${e.level})`}`)
    .join(', ');

const out = [];
const w = (line = '') => out.push(line);

w('# Level dossier — every world, level, mode and wave');
w();
w('**Generated. Do not edit by hand — run `node scripts/gen-level-dossier.mjs`.**');
w();
w('Source: `src/game/levels/levelData.ts`, which is a pure transcription of');
w('`ScreenGame.as`. Deliberate divergences are applied by `getLevel` at read');
w('time and are listed at the end rather than folded in here, so this document');
w('shows what the original specifies.');
w();
w(`${LEVELS.length} worlds, ${total} levels.`);
w();

/* ── Summary by world ─────────────────────────────────────────────────── */
w('## Worlds at a glance');
w();
w('| World | Theme | Levels | Modes | Enemy types | Bosses | New types here |');
w('|---|---|---|---|---|---|---|');

const introducedIn = new Map(); // world -> [types]
for (const [type, id] of firstSeen) {
  const world = Number(id.split('-')[0]);
  introducedIn.set(world, [...(introducedIn.get(world) ?? []), type]);
}

LEVELS.forEach((world, wi) => {
  const modes = {};
  const types = new Set();
  let bossTotal = 0;
  for (const level of world) {
    modes[level.mode] = (modes[level.mode] ?? 0) + 1;
    for (const e of level.enemies) types.add(e.type);
    bossTotal += bosses(level);
  }
  const modeText = Object.entries(modes)
    .sort((a, b) => b[1] - a[1])
    .map(([m, n]) => `${m} ${n}`)
    .join(', ');
  const fresh = (introducedIn.get(wi + 1) ?? []).join(', ') || '—';
  w(
    `| **${wi + 1}** | ${world[0].theme} | ${world.length} | ${modeText} | ${types.size} | ${bossTotal} | ${fresh} |`,
  );
});
w();

/* ── Enemy introduction order ─────────────────────────────────────────── */
w('## Enemy roster — where each type enters');
w();
w('`First seen` is the earliest level containing the type at any tier;');
w('`first boss` is the earliest level containing it as a boss. `Levels` counts');
w('the levels it appears in, `total` the sum of its counts across all of them.');
w();
w('| Enemy | First seen | First boss | Levels | Total spawned | Worlds |');
w('|---|---|---|---|---|---|');

const byFirst = [...firstSeen.entries()].sort((a, b) => {
  const [aw, al] = a[1].split('-').map(Number);
  const [bw, bl] = b[1].split('-').map(Number);
  return aw - bw || al - bl;
});
for (const [type, id] of byFirst) {
  const u = usage.get(type);
  w(
    `| ${type} | ${id} | ${firstSeenBoss.get(type) ?? '—'} | ${u.levels} | ${u.total} | ${[...u.worlds].sort((x, y) => x - y).join(', ')} |`,
  );
}
w();

/* ── Mode totals ──────────────────────────────────────────────────────── */
w('## Modes');
w();
const modeTotals = {};
for (const world of LEVELS) for (const l of world) modeTotals[l.mode] = (modeTotals[l.mode] ?? 0) + 1;
w('| Mode | Levels | Share |');
w('|---|---|---|');
for (const [mode, n] of Object.entries(modeTotals).sort((a, b) => b[1] - a[1])) {
  w(`| ${mode} | ${n} | ${((n / total) * 100).toFixed(1)}% |`);
}
w();

/* ── Structure ────────────────────────────────────────────────────────────
 * The regularities, computed rather than eyeballed. A redesign that keeps
 * 405 levels' worth of content in four worlds needs to know which of these
 * are rules and which are coincidences, and the only honest way to say is to
 * check every row.
 */
w('## Structural rules, checked against all 405 rows');
w();

const bossLevels = [];
LEVELS.forEach((world, wi) => {
  world.forEach((l, li) => {
    if (l.mode === 'Boss') bossLevels.push({ world: wi + 1, level: li + 1 });
  });
});
const bossSlots = [...new Set(bossLevels.map((b) => b.level))].sort((a, b) => a - b);
const bossRegular = bossSlots.join(', ') === '9, 18, 27, 36, 45';

w(`- **Every world has exactly ${LEVELS[0].length} levels**: ${LEVELS.every((x) => x.length === 45) ? 'true of all 9' : 'NOT uniform'}.`);
w(
  `- **Boss levels sit at ${bossSlots.join(', ')}** in every world` +
    `${bossRegular ? ' — every ninth level, no exceptions' : ' — irregular'}. ` +
    `${bossLevels.length} boss levels in total.`,
);
w(`- **One theme per world**: ${LEVELS.every((wo) => new Set(wo.map((l) => l.theme)).size === 1) ? 'true of all 9' : 'NOT uniform'}.`);

const sizes = new Map();
for (const world of LEVELS) for (const l of world) {
  const k = `${l.roomWidth}x${l.roomHeight}`;
  sizes.set(k, (sizes.get(k) ?? 0) + 1);
}
w(
  `- **${sizes.size} distinct room sizes** across the game: ` +
    [...sizes.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} (${n})`).join(', ') +
    '.',
);

const introPerWorld = LEVELS.map((_, wi) => (introducedIn.get(wi + 1) ?? []).length);
w(
  `- **New enemy types per world**: ${introPerWorld.join(', ')}. ` +
    `The last four worlds introduce ${introPerWorld.slice(5).reduce((a, b) => a + b, 0)} between them, ` +
    `against ${introPerWorld.slice(0, 5).reduce((a, b) => a + b, 0)} in the first five.`,
);

const gaps = byFirst.map(([type, id], i) => {
  if (i === 0) return null;
  const abs = (s2) => { const [a, b] = s2.split('-').map(Number); return (a - 1) * 45 + b; };
  return { type, gap: abs(id) - abs(byFirst[i - 1][1]) };
}).filter(Boolean);
const worstGap = gaps.reduce((a, b) => (a.gap >= b.gap ? a : b));
w(
  `- **Longest run with no new enemy**: ${worstGap.gap} levels, ending when ` +
    `${worstGap.type} arrives. Mean gap between introductions is ` +
    `${(gaps.reduce((n, g) => n + g.gap, 0) / gaps.length).toFixed(1)} levels.`,
);

const tiers = new Set();
for (const world of LEVELS) for (const l of world) for (const e of l.enemies) tiers.add(e.level);
w(`- **Enemy tiers in use**: ${[...tiers].sort().join(', ')} (\`B\` is the boss tier).`);
w();

/* ── The full table ───────────────────────────────────────────────────── */
w('## Every level');
w();
w('`Room` is in design units. `Interval` is frames between spawns at 30fps.');
w('`Cap` is the upgrade-level cap the AS3 records — **the port ignores it**');
w('(divergence `A11`), so it is informational. Flag columns are 0 outside Flag');
w('levels.');
w();

LEVELS.forEach((world, wi) => {
  w(`### World ${wi + 1} — ${world[0].theme}`);
  w();
  w('| Level | Mode | Room | Enemies | Interval | Cap | Bosses | Flags | $/flag | Wave composition |');
  w('|---|---|---|---|---|---|---|---|---|---|');
  world.forEach((l, li) => {
    const id = `${wi + 1}-${li + 1}`;
    const newHere = [...firstSeen.entries()].filter(([, at]) => at === id).map(([t]) => t);
    const note = newHere.length ? ` <br>**NEW: ${newHere.join(', ')}**` : '';
    w(
      `| **${id}** | ${l.mode} | ${l.roomWidth}x${l.roomHeight} | ${l.totalEnemies} | ${l.spawnInterval} | ${l.upgradeLimit} | ${bosses(l) || '—'} | ${l.flagCount || '—'} | ${l.flagMoney || '—'} | ${roster(l)}${note} |`,
    );
  });
  w();
});

/* ── Divergences ──────────────────────────────────────────────────────── */
w('## Divergences applied on top of this data');
w();
w('`getLevel` applies these at read time, so the game plays them and the table');
w('above does not show them. See `src/game/levels/levelSizeOverrides.ts`.');
w();
const ov = readFileSync('src/game/levels/levelSizeOverrides.ts', 'utf8');

/*
 * `to:` is often a **named constant**, not a literal pair.
 *
 * The first version matched `to: [w, h]` only, found nothing, and printed
 * "None recorded" — a clean, decisive, wrong answer about a list with twelve
 * entries in it. Caught by reading the override file rather than by the
 * script, so the count is now asserted against the number of `{ world:` rows
 * the file declares: a regex that stops matching fails loudly instead of
 * reporting an empty list.
 */
const consts = new Map(
  [...ov.matchAll(/const\s+([A-Z][A-Z0-9_]*)\s*(?::[^=]+)?=\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/g)].map(
    (m) => [m[1], `${m[2]}x${m[3]}`],
  ),
);
const size = (raw) => {
  const pair = raw.match(/\[\s*(\d+)\s*,\s*(\d+)\s*\]/);
  if (pair) return `${pair[1]}x${pair[2]}`;
  return consts.get(raw.trim()) ?? `\`${raw.trim()}\``;
};

const rows = [
  ...ov.matchAll(
    /\{\s*world:\s*(\d+),\s*level:\s*(\d+),\s*from:\s*([^,]+(?:,\s*\d+\s*\])?),\s*to:\s*([^,]+(?:,\s*\d+\s*\])?),\s*reason:\s*'(\w+)'/g,
  ),
];
const declared = (ov.match(/\{\s*world:\s*\d+,\s*level:/g) ?? []).length;
if (rows.length !== declared) {
  throw new Error(
    `override parse mismatch: matched ${rows.length} of ${declared} declared rows — ` +
      'the shape of levelSizeOverrides.ts changed and this regex has stopped seeing it',
  );
}

if (rows.length === 0) w('_None recorded._');
else {
  w(`${rows.length} level(s) play at a size other than the one the AS3 specifies.`);
  w();
  w('| Level | Source size | Played size | Reason |');
  w('|---|---|---|---|');
  for (const m of rows) w(`| ${m[1]}-${m[2]} | ${size(m[3])} | ${size(m[4])} | ${m[5]} |`);
}
w();

writeFileSync(OUT, out.join('\n'));
console.log(
  `Wrote ${OUT} — ${LEVELS.length} worlds, ${total} levels, ${firstSeen.size} enemy types.`,
);
