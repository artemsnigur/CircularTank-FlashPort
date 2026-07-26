#!/usr/bin/env node
/**
 * Generates / refreshes PROGRESS.md from the decompiled AS3 sources.
 *
 *   node scripts/gen-progress.mjs [--source <dir>] [--check]
 *
 * Re-running is safe: statuses already recorded in PROGRESS.md are parsed back
 * out and preserved, so this can be re-run after a fresh JPEXS export without
 * losing porting progress. `--check` exits non-zero if the file is out of date
 * instead of writing it.
 *
 * Status vocabulary (keep it short — more becomes noise):
 *   not started     no TypeScript equivalent exists yet
 *   ported          rewritten in TS/Phaser, behaviour not yet verified
 *   tested          has a test, or has been verified in the running game
 *   not applicable  deliberately never being ported (asset stub, dead code,
 *                   third-party telemetry, superseded by engine features).
 *                   Excluded from the totals entirely — otherwise the ~120
 *                   such classes would depress the percentage forever and
 *                   the tracker would stop meaning anything.
 */
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

const STATUSES = ['not started', 'ported', 'tested', 'not applicable'];

/**
 * Optional marker meaning "reachable from src/main.tsx", appended as
 * `— tested · wired`. Only meaningful on `ported`/`tested`; ignored elsewhere.
 */
const WIRED = 'wired';

/** Statuses that count as real, finished-or-started porting work. */
const STARTED_STATUSES = new Set(['ported', 'tested']);

/**
 * Ordered: the first matching rule wins, so put specific prefixes above
 * general ones.
 */
const CATEGORIES = [
  {
    id: 'thirdparty',
    title: 'Third-party libraries — do not port',
    note:
      'Google Analytics, the FGL sponsor SDK, and the Flash `fl.*`/`mx.*` runtime. ' +
      'Replace with modern equivalents or drop entirely; none of these should be ' +
      'translated line by line.',
    match: (path) => /^(com|fl|mx|FGL)[\\/]/.test(path),
  },
  {
    id: 'core',
    title: 'Core systems',
    note: 'The spine of the port. Everything else depends on these.',
    match: (_p, name) =>
      [
        'Main',
        'Functions',
        'Debug',
        'FPS',
        'SaveManager',
        'SoundManager',
        'StatisticsManager',
        'DifficultyMultipliers',
        'PM_PRNG',
        'PremiumContentStuff',
        'SponsorIntro',
      ].includes(name),
  },
  {
    id: 'screens',
    title: 'Screens and screen parts',
    note: 'Map onto Phaser scenes plus React screens. See docs/TEXT_RENDERING.md for the split.',
    match: (_p, name) => /^(Screen|Part)/.test(name),
  },
  {
    id: 'player',
    title: 'Player tank',
    match: (_p, name) => /^Tank/.test(name) || name === 'Crosshair' || name === 'CustomCursor',
  },
  {
    id: 'enemies',
    title: 'Enemies',
    note: 'Each type has a matching `*Boss` variant; port the base first.',
    match: (_p, name) => /^(Enemy|Warning|ImageEnemy|MarkerEnemy|Crown)/.test(name),
  },
  {
    id: 'projectiles',
    title: 'Projectiles, weapons and objects',
    match: (_p, name) => /^(Bullet|Object|Weapon|PremiumWeapon)/.test(name),
  },
  {
    id: 'achievements',
    title: 'Achievements',
    match: (_p, name) => /^Achievement/.test(name),
  },
  {
    id: 'tutorial',
    title: 'Tutorial',
    match: (_p, name) => /^(Tutorial|GlowTutorial|ShadowTutorial)/.test(name),
  },
  {
    id: 'fx',
    title: 'Particles and effects',
    match: (_p, name) =>
      /^(Particle|Explosion|Indicator|WinParticle|RedCircle|Glow)/.test(name),
  },
  {
    id: 'audio',
    title: 'Sound and music triggers',
    note:
      'These are one-line asset wrappers in AS3. They do not need porting one by one — ' +
      'replace the lot with a keyed manifest driving Phaser\'s sound manager.',
    match: (_p, name) => /^(snd|Music)/.test(name),
  },
  {
    id: 'background',
    title: 'Background props and terrain',
    match: (_p, name) => /^(BGObject|GameBG|BackgroundBottom|InterfaceBG|TopLayer)/.test(name),
  },
  {
    id: 'ui',
    title: 'UI widgets',
    note: 'Most of these become React components rather than Phaser display objects.',
    match: (_p, name) =>
      /^(Button|Background|Title|Slider|Icon|Marker|Shadow|Window|BottomBar|Logo|SplashScreen|SponsorLogo|Arrow|Item|Loading|Premium|LevelGuide|Defense|WeaponInterface|WeaponReload|WeaponSlot)/.test(
        name,
      ),
  },
  { id: 'misc', title: 'Uncategorised', match: () => true },
];

function parseArgs(argv) {
  const args = { source: null, check: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--source') args.source = argv[++i];
    else if (argv[i] === '--check') args.check = true;
  }
  return args;
}

function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, base, out);
    else if (entry.name.endsWith('.as')) out.push(relative(base, full));
  }
  return out;
}

/** Pulls `ClassName -> status` out of an existing PROGRESS.md. */
/**
 * How many recorded statuses may vanish in one regeneration before it aborts.
 *
 * A regeneration that clears most of the file is a bug in this script, not an
 * intent. It has happened: a refactor left the parser returning strings while
 * the consumer read `.status` off them, so every class silently became
 * `not started` and the next run wrote that over 643 hand-maintained entries.
 * There is no VCS here, and ~115 `not applicable` markings were lost for good.
 */
const MAX_STATUS_LOSS = 5;

/** Aborts when a regeneration would drop more recorded statuses than allowed. */
function assertNoMassStatusLoss(existing, entries) {
  // Compare only *recorded* statuses. `existing` holds every parsed line,
  // including the `not started` default, so counting its full size against
  // non-default entries would report a loss on every healthy run.
  const had = [...existing.values()].filter((v) => v.status !== 'not started').length;
  const kept = entries.filter((e) => e.status !== 'not started').length;
  const lost = had - kept;
  if (had > 0 && lost > MAX_STATUS_LOSS) {
    throw new Error(
      `Refusing to write: ${lost} of ${had} recorded statuses would be lost ` +
        `(kept ${kept}). This almost always means the parser and the writer ` +
        `disagree about the line format. Fix the round trip, or raise ` +
        `MAX_STATUS_LOSS deliberately if the loss is intended.`,
    );
  }
}

function readExistingStatuses(path) {
  const statuses = new Map();
  if (!existsSync(path)) return statuses;
  const lineRe = /^- \[[ x]\] `([^`]+)`\s+—\s+(.+?)\s*$/;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = lineRe.exec(line);
    if (!m) continue;
    const [status, ...rest] = m[2].split('·').map((part) => part.trim());
    if (!STATUSES.includes(status)) continue;
    statuses.set(m[1], { status, wired: rest.includes(WIRED) });
  }
  return statuses;
}

function classNameOf(relPath) {
  const parts = relPath.split(/[\\/]/);
  return parts[parts.length - 1].replace(/\.as$/, '');
}

function categorise(relPath) {
  const name = classNameOf(relPath);
  const normalised = relPath.split(sep).join('/');
  for (const category of CATEGORIES) {
    if (category.match(normalised, name)) return category;
  }
  return CATEGORIES[CATEGORIES.length - 1];
}

function bar(done, total, width = 24) {
  if (total === 0) return '─'.repeat(width);
  const filled = Math.round((done / total) * width);
  return '█'.repeat(filled) + '░'.repeat(width - filled);
}

const args = parseArgs(process.argv.slice(2));
const sourceRoot = resolve(
  projectRoot,
  args.source ?? process.env.SWF_IMPORTED_DIR ?? '../SWFimported',
);
const scriptsDir = join(sourceRoot, 'scripts');

if (!existsSync(scriptsDir)) {
  console.error(`No AS3 sources at ${scriptsDir}. Pass --source <dir> or set SWF_IMPORTED_DIR.`);
  process.exit(1);
}

const outPath = join(projectRoot, 'PROGRESS.md');
const existing = readExistingStatuses(outPath);

const files = walk(scriptsDir).sort((a, b) =>
  classNameOf(a).localeCompare(classNameOf(b), 'en'),
);

// Class names are not unique across packages — `Debug` exists both at the top
// level and as com/google/analytics/debug/Debug. Statuses are therefore keyed
// by a label that falls back to the full path for any name that collides,
// otherwise two unrelated classes would share one status.
const nameCounts = new Map();
for (const relPath of files) {
  const name = classNameOf(relPath);
  nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
}

const grouped = new Map(CATEGORIES.map((c) => [c.id, []]));
for (const relPath of files) {
  const category = categorise(relPath);
  const name = classNameOf(relPath);
  const posix = relPath.split(sep).join('/');
  const label = nameCounts.get(name) > 1 ? posix.replace(/\.as$/, '') : name;
  grouped.get(category.id).push({
    name,
    label,
    relPath: posix,
    lines: readFileSync(join(scriptsDir, relPath), 'utf8').split('\n').length,
    status: existing.get(label)?.status ?? 'not started',
    wired: existing.get(label)?.wired ?? false,
  });
}

assertNoMassStatusLoss(
  existing,
  CATEGORIES.flatMap((c) => grouped.get(c.id)),
);

const portable = CATEGORIES.filter((c) => c.id !== 'thirdparty');
const countWhere = (predicate) =>
  portable.reduce((n, c) => n + grouped.get(c.id).filter(predicate).length, 0);

// "not applicable" is excluded from both numerator and denominator, so the
// percentage reflects work actually outstanding.
const notApplicable = countWhere((e) => e.status === 'not applicable');
const totalPortable = countWhere((e) => e.status !== 'not applicable');
const donePortable = countWhere((e) => STARTED_STATUSES.has(e.status));
const testedPortable = countWhere((e) => e.status === 'tested');

const lines = [];
lines.push('# Port progress');
lines.push('');
lines.push(
  '<!-- Generated by `npm run progress`. Statuses are preserved across regeneration —',
);
lines.push('     edit the status text on a line and re-run; do not hand-edit the structure. -->');
lines.push('');
lines.push(
  `Tracking the rewrite of ${files.length} decompiled ActionScript 3 classes ` +
    `(\`SWFimported/scripts\`) into TypeScript/Phaser.`,
);
lines.push('');
lines.push(
  `**${donePortable} / ${totalPortable}** game classes started · ` +
    `**${testedPortable}** verified · ` +
    `${notApplicable} marked not applicable · ` +
    `${grouped.get('thirdparty').length} third-party classes excluded.`,
);
lines.push('');
lines.push('```');
lines.push(`${bar(donePortable, totalPortable)}  ${((donePortable / totalPortable) * 100).toFixed(1)}%`);
lines.push('```');
lines.push('');
lines.push('## How to use this file');
lines.push('');
lines.push('Set a class to `ported` when its TypeScript equivalent exists, and `tested` when');
lines.push('its behaviour has been verified (a unit test, or confirmed in the running game).');
lines.push('Statuses are the four literals `not started`, `ported`, `tested` and');
lines.push('`not applicable`; anything else is reset on the next regeneration.');
lines.push('');
lines.push('Use `not applicable` for classes that will deliberately never be ported — asset');
lines.push('stubs, dead code, third-party telemetry, or anything the engine already provides.');
lines.push('They are excluded from every total, so the percentages stay meaningful.');
lines.push('');
lines.push('Append ` · wired` to a `ported`/`tested` line once the class actually does');
lines.push('its job in the running game — not merely when something imports it. A sweep');
lines.push('found 22 modules that were ported, tested and called by nothing, and wiring');
lines.push('the save layer then made most of them *reachable* while leaving them inert:');
lines.push('achievements are serialised but never evaluated, tutorial state is persisted');
lines.push('but no tutorial runs. Reachability is the floor, not the bar.');
lines.push('');
lines.push('The flag is filled in as classes get wired, not backfilled, so its absence');
lines.push('means "not recorded yet" rather than "not wired".');
lines.push('');
lines.push('Starting a fresh session? Read `README.md` first, then the "Core systems" section');
lines.push('below — everything else hangs off those.');
lines.push('');
lines.push('## Contents');
lines.push('');
for (const category of CATEGORIES) {
  const entries = grouped.get(category.id);
  if (entries.length === 0) continue;
  const done = entries.filter((e) => STARTED_STATUSES.has(e.status)).length;
  const outstanding = entries.filter((e) => e.status !== 'not applicable').length;
  // Mirror GitHub's heading slugs: lowercase, drop anything that is not
  // alphanumeric/space/hyphen (so an em dash vanishes and leaves its two
  // surrounding spaces), then turn each remaining space into a hyphen.
  const anchor = category.title
    .toLowerCase()
    .replace(/[^a-z0-9 -]/g, '')
    .replace(/ /g, '-');
  lines.push(`- [${category.title}](#${anchor}) — ${done}/${outstanding}`);
}
lines.push('');

for (const category of CATEGORIES) {
  const entries = grouped.get(category.id);
  if (entries.length === 0) continue;

  const done = entries.filter((e) => STARTED_STATUSES.has(e.status)).length;
  const na = entries.filter((e) => e.status === 'not applicable').length;
  const outstanding = entries.length - na;
  lines.push(`## ${category.title}`);
  lines.push('');
  if (category.note) {
    lines.push(`> ${category.note}`);
    lines.push('');
  }
  lines.push(
    `\`${bar(done, outstanding)}\` ${done}/${outstanding}` +
      (na > 0 ? ` · ${na} not applicable` : ''),
  );
  lines.push('');
  for (const entry of entries) {
    // Ticked means "resolved": either verified, or deliberately never porting
    // it. `ported` stays unticked because it is still awaiting verification.
    const box = entry.status === 'tested' || entry.status === 'not applicable' ? 'x' : ' ';
    // The flag only means anything for something that has been ported at all.
    const wired =
      entry.wired && (entry.status === 'ported' || entry.status === 'tested')
        ? ` · ${WIRED}`
        : '';
    lines.push(`- [${box}] \`${entry.label}\` — ${entry.status}${wired}`);
  }
  lines.push('');
}

lines.push('---');
lines.push('');
lines.push('## Skeleton work (not AS3 classes)');
lines.push('');
lines.push('- [x] Vite + React + TypeScript scaffold, `strict: true`');
lines.push('- [x] Phaser 3 mounted in React, single instance under StrictMode');
lines.push('- [x] Asset sync from `SWFimported/` preserving SWF library IDs');
lines.push('- [x] React ↔ Phaser event bridge + Zustand store');
lines.push('- [x] Scale strategy (RESIZE, fixed 640-unit design width) + safe-area handling');
lines.push('- [x] Font loading and text-rendering policy');
lines.push('- [x] Preloader with a sample asset set');
lines.push('- [x] MP3 pipeline audit + runtime audio self-test');
lines.push('- [x] Placeholder gameplay scene with WASD movement');
lines.push('- [x] ESLint + Vitest + `dev`/`build`/`test` scripts');
lines.push('');
lines.push('### Partially ported — blocked, not forgotten');
lines.push('');
lines.push('- `SaveManager` — the **save-string half is complete**: storage layer, codec,');
lines.push('  slot container, the 63-field schema, and all 63 fields wired up. The `pw`');
lines.push('  key collision is fixed (`previousWorld` moved to `prw`).');
lines.push('  `save/saveSlot.ts` assembles a whole slot in schema order and reads it');
lines.push('  back — `encodeSaveSlot` / `decodeSaveSlot` are the equivalents of');
lines.push('  `updateSaveStringSlot` and `loadVarsFromSaveString`.');
lines.push('  Still to do: the local-SharedObject path (`initGame`, `loadGame`, the');
lines.push('  per-area `saveX()` writers) which stores fields individually rather than');
lines.push('  as a save string, and which needs the owning classes wired to their');
lines.push('  ported state. Server sync (`getServerSaveString`,');
lines.push('  `submitSaveSlotToServer`) is sponsor API and will not be ported.');
lines.push('  Server sync (`getServerSaveString`, `submitSaveSlotToServer`) is sponsor');
lines.push('  API and will not be ported.');
lines.push('');
lines.push('- `ScreenAchievements` — the 36-achievement data table, the state model and');
lines.push('  `achievementCheck`/`updateAchievements` evaluation are ported and tested.');
lines.push('  The screen *rendering* (`placeAchievements`, `addText`) is not: it becomes');
lines.push('  a React screen. The value sources (`PartGameArea.temp*`,');
lines.push('  `ScreenUpgrades.tempWeaponsMaxed`, …) are injected, so they can be wired');
lines.push('  in as each owner is ported.');
lines.push('');
lines.push('- `ScreenLevelSelect` — the progress table, difficulty cascade, current-level');
lines.push('  lookup and `getTotalValues` (which feeds the 15 NumberArray achievements)');
lines.push('  are ported and tested, along with its 4 save fields. The screen itself');
lines.push('  (world carousel, level buttons, tweens, particles) becomes a React screen');
lines.push('  and is not ported.');
lines.push('');
lines.push('- `ScreenUpgrades` — the economy is ported and tested: 28 upgrade tables');
lines.push('  (1,173 balance values), level/price semantics, purchase, stat lookup and');
lines.push('  the maxed-weapon counts that feed the MaxedPrimary/MaxedSecondary');
lines.push('  achievements, plus its 4 save fields. The shop screen itself becomes a');
lines.push('  React screen and is not ported.');
lines.push('');
lines.push('- `PartTutorial` — the 12-step queue state machine is ported and tested');
lines.push('  (unseen/queue/done lists, trigger conditions, the context-dependent steps');
lines.push('  that return to unseen between levels), plus its 4 save fields. Trigger');
lines.push('  conditions that read unported classes are injected via `TutorialContext`.');
lines.push('  The on-screen presentation (images, slide tweens, positions) is not ported.');
lines.push('');
lines.push('- `ScreenEnemies` — the 20-entry bestiary and the `updateEnemies` discovery');
lines.push('  logic are ported and tested, plus its 1 save field. Note `knownEnemiesArray`');
lines.push('  stores *display* names ("Scared Ghost"), not ids, because the AS3 rewrites');
lines.push('  three of them to match the button labels. The enemies screen and the');
lines.push('  strength/weakness grid become React and are not ported.');
lines.push('');
lines.push('- `Main` — status stays **not started**: the document class itself (screen');
lines.push('  routing, the display list, sponsor/API plumbing) is untouched. What exists');
lines.push('  is its 7 persisted flags in `onboarding/mainFlags.ts` — the six one-shot');
lines.push('  UI hints plus the one-time premium cash grant — with their save fields.');
lines.push('');
lines.push('- `ScreenGame` — **all its data tables are extracted**; what remains is the');
lines.push('  level-running loop and screen plumbing, so the status stays');
lines.push('  **not started**. Done so far:');
lines.push('    - all three per-world arrays flattened into `levels/levelData.ts`:');
lines.push('      `levelDataModelW*`, `enemyModelW*` and `flagModelW*` — 405 levels with');
lines.push('      room size, mode, theme, PRNG seed, enemy composition and flag data');
lines.push('    - the 40 `enemy*Stats` tables in `enemies/enemyStatsData.ts`, with');
lines.push('      `enemies/enemyStats.ts` applying the difficulty and tier multipliers');
lines.push('      (the port of `PartGameArea.spawnEnemy`\'s stat block)');
lines.push('    - the weapon loadout in `loadout/loadout.ts` with its 3 save fields');
lines.push('  Still untouched: the game loop, wave spawning, and the ~90 remaining');
lines.push('  statics that drive them.');
lines.push('');
lines.push('- `PartGameArea` — **not started**, and mostly not separable. Ported so far:');
lines.push('    - `enemies/enemySpawn.ts` — the geometry tail of `spawnEnemy`');
lines.push('    - `enemies/enemySteering.ts` — turn-toward-target, accelerate, clamp,');
lines.push('      integrate (extracted from the behaviour loop, see below)');
lines.push('    - `waves/waveState.ts` — `spawnWarnings`\' pacing and its');
lines.push('      draw-without-replacement pool, including the Flag/Boss balancing');
lines.push('    - `waves/spawnPlacement.ts` — off-camera search plus edge fallback');
lines.push('    - `waves/warnings.ts` — `handleWarnings`\' countdown');
lines.push('    - `weapons/firing.ts` — `tankAttack`\'s framework plus 4 of the 12');
lines.push('      primaries: **Cannon**, **MiniGun**, **Big Cannon** and');
lines.push('      **Gummy Bear Cannon**, covering three damage channels');
lines.push('      (Explosions, Bullets, Food) and both damage paths.');
lines.push('      The remaining 8 each carry their own mechanic and need dedicated');
lines.push('      sessions: Shotgun (deterministic fan), Flamethrower (lifetime +');
lines.push('      inherited velocity + loop sound), Laser Cannon (beam, own spread,');
lines.push('      owns the Laser channel), Magic Cannon (homing with a target');
lines.push('      budget), Timed Bomb Cannon (attaches and detonates on a timer),');
lines.push('      Poison Cannon (status effect), Cake Cannon (spawns secondary');
lines.push('      projectiles), Penetration Cannon (passes through, tracks hits).');
lines.push('      No secondaries are ported.');
lines.push('    - `weapons/bullets.ts` — straight-line flight and the hit test');
lines.push('    - `enemies/damageTypes.ts` — the strength/weakness system: 8 damage');
lines.push('      channels, per-type resistance tables, and the projectile -> channel');
lines.push('      map. Untyped rounds bypass it, as in the AS3.');
lines.push('    - `weapons/explosions.ts` — blast radius, flat (no-falloff) damage,');
lines.push('      multi-target hits and the one-frame `canDamage` window. **The');
lines.push('      Cannon is complete**: it explodes rather than dealing direct');
lines.push('      damage, so its damage runs through the `Explosions` channel.');
lines.push('    - `player/tankDamage.ts` — enemy contact damage, the Enemy Absorption');
lines.push('      upgrade, and boss knockback');
lines.push('  Together these close the core loop both ways: paced spawning of a');
lines.push('  level\'s real composition, a tank that drives and fires, enemies that');
lines.push('  die and pay out, and enemies that damage the tank on contact.');
lines.push('  **The enemy behaviour loop is 2,545 lines (PartGameArea.as:4499-7044)**');
lines.push('  and interleaves steering with damage, freezing, poison, burning,');
lines.push('  teleporting, healing, bullet collision, death, money drops and the');
lines.push('  strength/weakness system — it is not separable as a unit and none of it');
lines.push('  is ported. Damage types and explosions now *are* applied, so the');
lines.push('  remaining 8 primaries are no longer blocked on data — each still needs');
lines.push('  its own branch of `tankAttack` porting. Outstanding: homing, bullet');
lines.push('  reflection, penetration, the shield, status effects (fire, poison,');
lines.push('  freeze) and the Ice/Poison explosion variants that carry them,');
lines.push('  `DamageAddict` (healed by damage), boss knockback fed back into the');
lines.push('  tank\'s velocity, and defeat/victory handling.');
lines.push('');
lines.push('- [ ] Convert the two TTFs to WOFF2 (821 KB + 201 KB as-is)');
lines.push('- [ ] Touch controls (virtual stick + fire button)');
lines.push('- [ ] Per-world asset manifests replacing the sample set');
lines.push('- [ ] `npx cap add ios` / `npx cap add android`');
lines.push('');

const content = `${lines.join('\n')}\n`;

if (args.check) {
  const current = existsSync(outPath) ? readFileSync(outPath, 'utf8') : '';
  if (current !== content) {
    console.error('PROGRESS.md is out of date. Run: npm run progress');
    process.exit(1);
  }
  console.log('PROGRESS.md is up to date.');
  process.exit(0);
}

writeFileSync(outPath, content);
console.log(
  `Wrote PROGRESS.md — ${files.length} classes across ${
    CATEGORIES.filter((c) => grouped.get(c.id).length > 0).length
  } sections ` + `(${statSync(outPath).size} bytes).`,
);
