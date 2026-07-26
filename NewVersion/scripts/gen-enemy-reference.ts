/**
 * Generates `docs/ENEMIES.md` — the per-type reference for enemies that are
 * actually built.
 *
 * ── Why this is generated, and generated from the *port* ──────────────────
 * A hand-written version of this document is a list of claims about numbers,
 * and this project has now had two rounds of exactly that going bad: enemy
 * stat columns described as unused when they were load-bearing, and four
 * enemy mechanics described in `SPECIAL_MECHANICS` that did not exist in the
 * source at all. Both survived because prose is not checkable.
 *
 * So every figure here is read out of the modules the game runs on:
 *
 *   stats          enemyStatsData.ts   (generated from ScreenGame.as)
 *   resistances    damageTypes.ts      (the 8-channel multiplier resolution)
 *   counters       firing.ts           (weapon -> bullet class -> channel)
 *   mechanics      enemyBehaviour.ts   (pinned to AS3 branches by its tests)
 *   plain terms    bestiaryData.ts     (the game's own in-fiction text)
 *
 * No figure is retyped, so the numbers cannot drift from the code. When a new
 * type reaches `implemented` it appears here on the next run with correct
 * numbers and no editing.
 *
 * The one consequence worth knowing: this describes **what the port does**,
 * not what the SWF does. Where the port is incomplete the document says so
 * rather than quietly printing the AS3's intent — which is the property that
 * makes it useful for QA.
 *
 * Usage:
 *   npm run enemies:doc          rewrite docs/ENEMIES.md
 *   npm run enemies:doc:check    fail if it is stale (CI / data:check)
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ENEMY_STATS } from '../src/game/enemies/enemyStatsData';
import type { EnemyBaseStats, DamageType } from '../src/game/enemies/enemyStatsData';
import {
  SPECIAL_MECHANICS,
  describeAllEnemies,
} from '../src/game/enemies/enemyBehaviour';
import type { EnemyBehaviourReport } from '../src/game/enemies/enemyBehaviour';
import { resolveDamageMultipliers, damageTypeOf } from '../src/game/enemies/damageTypes';
import { PRIMARY_WEAPONS } from '../src/game/weapons/firing';
import type { WeaponSpec } from '../src/game/weapons/firing';
import { BESTIARY } from '../src/game/enemies/bestiaryData';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, '../docs/ENEMIES.md');

/** The SWF runs at 30 fps; every frame count in the tables is at that rate. */
const AS3_FPS = 30;

/** Statuses worth documenting. Anything else has nothing to describe yet. */
const DOCUMENTED: ReadonlySet<string> = new Set(['implemented', 'partial']);

/**
 * The damage channel a primary weapon resolves on.
 *
 * `damageTypeOf` returns null for the four untyped projectiles — `Bullet`,
 * `BulletBig`, `BulletPenetrate`, `BulletBomb` — and all four explode, so
 * their damage arrives on `Explosions`. There is no weapon that is both
 * typed and exploding, so this mapping is exact rather than a best guess.
 */
function weaponChannel(spec: WeaponSpec): DamageType | null {
  return damageTypeOf(spec.bulletClass ?? '') ?? (spec.explosion ? 'Explosions' : null);
}

/**
 * Weapons grouped by the channel they damage on.
 *
 * Seeded with **all eight** channels, including any no primary covers. Ice is
 * the live case: no primary deals it, so dropping empty channels would have
 * silently hidden an enemy's Ice weakness rather than pointing at the
 * secondaries. An empty row is information; a missing row is a trap.
 */
function weaponsByChannel(): Map<DamageType, string[]> {
  const byChannel = new Map<DamageType, string[]>();
  for (const channel of allChannels()) byChannel.set(channel, []);

  for (const spec of Object.values(PRIMARY_WEAPONS)) {
    const channel = weaponChannel(spec);
    if (channel === null) continue;
    byChannel.get(channel)?.push(spec.name);
  }
  return byChannel;
}

/**
 * The eight damage channels, read off a resolved multiplier set rather than
 * retyped, so adding a channel cannot leave this behind.
 */
function allChannels(): DamageType[] {
  return Object.keys(resolveDamageMultipliers('Basic')).sort() as DamageType[];
}

/** `1.5` -> `1.5x`, `0.75` -> `0.75x`, trimming the pointless trailing zeros. */
function times(value: number): string {
  return `${Number(value.toFixed(3))}x`;
}

/** Frames at 30 fps rendered as both, since the tables are in frames. */
function frames(count: number): string {
  return `${count} frames (${Number((count / AS3_FPS).toFixed(2))}s)`;
}

function describeFiring(stats: EnemyBaseStats): string {
  if (!stats.shoot) return '**Ranged:** none — contact damage only.';

  const pattern =
    stats.shootAngle === 'Circle'
      ? `${stats.bulletAmount ?? 1} bullets in a full ring from a random start angle`
      : stats.shootAngle === 'Front'
        ? 'a single bullet along its facing'
        : `${stats.shootAngle} (pattern not ported)`;

  return (
    `**Ranged:** ${pattern}, once every ${frames(stats.reloadTimeMax ?? 0)}. ` +
    `Bullet class \`${stats.shootType}\`.`
  );
}

/**
 * The counter table: every primary weapon against this enemy.
 *
 * Sorted best-first, because the question this answers is "what do I bring".
 */
function counterTable(type: string): string {
  const multipliers = resolveDamageMultipliers(type);
  const byChannel = weaponsByChannel();

  const rows = [...byChannel.entries()]
    .map(([channel, weapons]) => ({
      channel,
      weapons,
      multiplier: multipliers[channel],
    }))
    .sort((a, b) => b.multiplier - a.multiplier || a.channel.localeCompare(b.channel));

  const verdict = (m: number): string =>
    m > 1 ? '**weak**' : m < 1 ? 'resists' : 'neutral';

  const lines = [
    '| Channel | Effect | Primary weapons |',
    '| --- | --- | --- |',
    ...rows.map(
      (r) =>
        `| ${r.channel} | ${times(r.multiplier)} ${verdict(r.multiplier)} | ` +
        `${r.weapons.length > 0 ? r.weapons.join(', ') : '_no primary — secondaries only_'} |`,
    ),
  ];

  return lines.join('\n');
}

/** A one-line "bring this, not that" summary above the table. */
function counterSummary(type: string): string {
  const multipliers = resolveDamageMultipliers(type);
  const byChannel = weaponsByChannel();

  const best: string[] = [];
  const worst: string[] = [];
  /** Channels it is vulnerable on that no primary can deliver. */
  const unreachable: DamageType[] = [];

  for (const [channel, weapons] of byChannel) {
    if (multipliers[channel] > 1) {
      if (weapons.length > 0) best.push(...weapons);
      else unreachable.push(channel);
    }
    if (multipliers[channel] < 1) worst.push(...weapons);
  }

  const parts: string[] = [];
  if (best.length > 0) parts.push(`**Counter with** ${best.join(', ')}.`);
  if (worst.length > 0) parts.push(`**Avoid** ${worst.join(', ')}.`);
  if (unreachable.length > 0) {
    parts.push(
      `Also weak to ${unreachable.join(', ')}, which no primary deals — that is a secondary.`,
    );
  }
  if (parts.length === 0) {
    return 'No resistances or weaknesses — every primary does full damage.';
  }
  return parts.join(' ');
}

function statsTable(normal: EnemyBaseStats, boss: EnemyBaseStats): string {
  const rows: [string, string, string][] = [
    ['Health', `${normal.health}`, `${boss.health}`],
    ['Contact damage', `${normal.damage}`, `${boss.damage}`],
    ['Money dropped', `${normal.money}`, `${boss.money}`],
    ['Max speed', `${normal.moveSpeedMax}`, `${boss.moveSpeedMax}`],
    ['Acceleration', `${normal.accSpeed}`, `${boss.accSpeed}`],
    ['Turn rate (deg/frame)', `${normal.rotSpeedMax}`, `${boss.rotSpeedMax}`],
  ];

  if (normal.shoot || boss.shoot) {
    rows.push(
      ['Reload', normal.reloadTimeMax ? frames(normal.reloadTimeMax) : '—',
        boss.reloadTimeMax ? frames(boss.reloadTimeMax) : '—'],
      ['Bullets per volley', `${normal.bulletAmount ?? '—'}`, `${boss.bulletAmount ?? '—'}`],
      ['Bullet class', normal.shootType ?? '—', boss.shootType ?? '—'],
      ['Firing pattern', normal.shootAngle ?? '—', boss.shootAngle ?? '—'],
    );
  }

  return [
    '| Stat | Normal | Boss |',
    '| --- | --- | --- |',
    ...rows.map(([label, a, b]) => `| ${label} | ${a} | ${b} |`),
  ].join('\n');
}

function bestiaryText(type: string): string {
  return BESTIARY.find((e) => e.id === type)?.description ?? '_No bestiary entry._';
}

function section(report: EnemyBehaviourReport): string {
  const variants = ENEMY_STATS[type_(report)];
  const { normal, boss } = variants;
  const mechanic = SPECIAL_MECHANICS[report.type];

  // "none declared", not "none exists". SPECIAL_MECHANICS is a hand-maintained
  // list of *unported* mechanics, so its absence means either "no mechanic" or
  // "the mechanic is ported" — this line used to conflate the two and published
  // "PartGameArea.as has no branch for this type" for Exploding, which has two.
  //
  // It also cannot be a claim about the source. The branch survey behind it
  // matches two idioms and a third exists (`instance.enemy == "X"`), and the
  // AS3 inlines helper bodies, so any name- or pattern-based sweep returns a
  // floor rather than a count. Say what was searched and what was found.
  const mechanicLine = mechanic
    ? `**Special mechanic:** ${mechanic} — **not ported yet**, so it currently behaves without it.`
    : '**Special mechanic:** none recorded as outstanding. Either this type has no ' +
      'special behaviour, or it has some and that behaviour is already ported — ' +
      '`Exploding` is the second case. No unported mechanic was *found* for it by ' +
      "`enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms " +
      'and is a floor, not a census.';

  return [
    `### ${report.type}`,
    '',
    `_${bestiaryText(report.type)}_`,
    '',
    mechanicLine,
    '',
    describeFiring(normal),
    '',
    '**Counters**',
    '',
    counterSummary(report.type),
    '',
    counterTable(report.type),
    '',
    '**Stats**',
    '',
    statsTable(normal, boss),
  ].join('\n');
}

/** Narrow the report's `type` back to a key of ENEMY_STATS. */
function type_(report: EnemyBehaviourReport): keyof typeof ENEMY_STATS {
  return report.type as keyof typeof ENEMY_STATS;
}

function render(): string {
  const all = describeAllEnemies();
  const shown = all.filter((r) => DOCUMENTED.has(r.status));

  // Without this, a break upstream that emptied the board would render a
  // document with no entries, and `--check` would happily confirm the empty
  // file was up to date. A check that cannot fail is worse than no check.
  if (shown.length === 0) {
    throw new Error(
      'No enemy types are marked implemented or partial. That is almost certainly ' +
        'a fault in describeAllEnemies() rather than the real state of the port.',
    );
  }

  const header = [
    '# Enemy reference',
    '',
    '<!-- GENERATED FILE — do not edit by hand.',
    '     Regenerate with: npm run enemies:doc',
    '     Source of every figure: src/game/enemies/ and src/game/weapons/firing.ts.',
    '     See scripts/gen-enemy-reference.ts for why this is generated. -->',
    '',
    `Covers the **${shown.length} of ${all.length}** enemy types whose behaviour is built.`,
    'Types still marked `data-only` are omitted deliberately: they spawn and steer,',
    'but nothing that distinguishes them is implemented, so an entry would describe',
    'intent rather than the game.',
    '',
    'Every number is read from the modules the game runs on, not retyped — so this',
    'file cannot drift from the code. Frame counts are at the SWF\'s 30 fps.',
    '',
    'Stats shown are the **base table values**. At runtime they are scaled by',
    'difficulty and by the level\'s tier (`resolveEnemyStats`), so a world-7 Basic',
    'is not a world-1 Basic.',
    '',
    '## Contents',
    '',
    ...shown.map((r) => `- [${r.type}](#${r.type.toLowerCase()})`),
    '',
    '---',
    '',
    '',
  ].join('\n');

  return `${header}${shown.map(section).join('\n\n---\n\n')}\n`;
}

function main(): void {
  const check = process.argv.includes('--check');
  const next = render();

  if (check) {
    const current = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (current !== next) {
      console.error('docs/ENEMIES.md is stale. Run: npm run enemies:doc');
      process.exit(1);
    }
    console.log('docs/ENEMIES.md is up to date.');
    return;
  }

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, next);
  console.log(`Wrote ${OUT}`);
}

main();
