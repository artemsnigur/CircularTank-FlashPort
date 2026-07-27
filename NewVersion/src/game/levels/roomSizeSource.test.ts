/**
 * Every room size in the port, checked against `ScreenGame.as` itself.
 *
 * ── Why this is not covered by `levels:data:check` ────────────────────────
 * That check regenerates `levelData.ts` and compares, so it catches a stale or
 * hand-edited file. It cannot catch the generator reading the *wrong columns* —
 * it would reproduce the same mistake and agree with itself. The room size was
 * hardcoded to 640x960 for every level for weeks precisely because nothing
 * compared the played size against the source.
 *
 * So this parses the AS3 tables independently, with no shared code with
 * `gen-levels.mjs`, and asserts the port plays what the original specified.
 *
 * Row shape (`ScreenGame.as:54`):
 *
 *     [roomWidth, roomHeight, 0, 0, 0, 0, mode, tier, theme, seed]
 *
 * Columns 0 and 1 are the ones this file is about. The four zeroes are unused
 * in every row of all nine tables — asserted below rather than assumed, since
 * "unused" has been wrong before in this project.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { LEVELS, WORLD_COUNT, getLevel, levelsInWorld } from './levelData';
import {
  LEVEL_SIZE_OVERRIDES,
  OVERRIDDEN_MODES,
  findSizeOverride,
} from './levelSizeOverrides';

const SOURCE = readFileSync('../SWFimported/scripts/ScreenGame.as', 'utf8');

/** One row of a level table, as read straight from the AS3. */
interface SourceRow {
  width: number;
  height: number;
  spare: number[];
}

/**
 * The rows of `levelDataModelW<world>`, parsed from the source text.
 *
 * The declarations wrap across lines mid-array, so whitespace is stripped
 * before splitting. Deliberately hand-rolled rather than importing anything
 * from the generator: a shared parser would make this test agree with a bug.
 */
function parseWorld(world: number): SourceRow[] {
  const marker = `levelDataModelW${world}:Array = [`;
  const start = SOURCE.indexOf(marker);
  if (start === -1) throw new Error(`${marker} not found in ScreenGame.as`);

  const from = start + marker.length;
  const end = SOURCE.indexOf('];', from);
  if (end === -1) throw new Error(`unterminated levelDataModelW${world}`);

  const body = SOURCE.slice(from, end).replace(/\s+/g, '');

  return [...body.matchAll(/\[([^\]]+)\]/g)].map((match) => {
    const cells = match[1].split(',');
    return {
      width: Number(cells[0]),
      height: Number(cells[1]),
      spare: cells.slice(2, 6).map(Number),
    };
  });
}

const WORLDS = Array.from({ length: 9 }, (_, i) => i + 1);

describe('the parse itself is sound', () => {
  it('finds all nine tables', () => {
    for (const world of WORLDS) {
      expect(parseWorld(world).length, `world ${world}`).toBeGreaterThan(0);
    }
  });

  it('reads 45 rows per world, 405 in total', () => {
    // If the regex stopped early this would be the first thing to break, so it
    // guards every assertion below against passing on a truncated parse.
    const total = WORLDS.reduce((sum, world) => sum + parseWorld(world).length, 0);
    for (const world of WORLDS) expect(parseWorld(world), `world ${world}`).toHaveLength(45);
    expect(total).toBe(405);
  });

  it('reads the first row of world 1 as the known 640x400', () => {
    // A fixed anchor from ScreenGame.as:54. If the column order were
    // misread, every comparison below would still pass by agreeing with the
    // same mistake — this is the one value checked against a literal.
    expect(parseWorld(1)[0]).toMatchObject({ width: 640, height: 400 });
    expect(parseWorld(1)[1]).toMatchObject({ width: 900, height: 720 });
  });
});

describe('every level plays at the size the original specified', () => {
  it('matches all 405 rooms, world by world', () => {
    const mismatches: string[] = [];

    for (const world of WORLDS) {
      const rows = parseWorld(world);
      rows.forEach((row, index) => {
        const level = index + 1;
        const spec = LEVELS[world - 1]?.[index];
        if (!spec) {
          mismatches.push(`${world}-${level}: missing from LEVELS`);
          return;
        }
        if (spec.roomWidth !== row.width || spec.roomHeight !== row.height) {
          mismatches.push(
            `${world}-${level}: port ${spec.roomWidth}x${spec.roomHeight}, ` +
              `source ${row.width}x${row.height}`,
          );
        }
      });
    }

    expect(mismatches).toEqual([]);
  });

  it('would notice if the port disagreed', () => {
    // A comparison that passes proves nothing until it can fail. Checking
    // world 1's source rows against world 2's ported levels must produce
    // mismatches; if it does not, the comparison is vacuous and every
    // assertion above is worthless.
    const rows = parseWorld(1);
    const wrongWorld = LEVELS[1];
    const disagreements = rows.filter(
      (row, i) =>
        wrongWorld[i] !== undefined &&
        (wrongWorld[i].roomWidth !== row.width || wrongWorld[i].roomHeight !== row.height),
    );

    expect(disagreements.length).toBeGreaterThan(0);
  });

  it('has the same number of levels per world as the source', () => {
    expect(WORLD_COUNT).toBe(9);
    for (const world of WORLDS) {
      expect(levelsInWorld(world), `world ${world}`).toBe(parseWorld(world).length);
    }
  });
});

/**
 * The deliberate divergences, and why this section makes the check stronger.
 *
 * `LEVELS` above is still asserted to match the AS3 exactly — that never
 * relaxes. What the game actually *plays* comes from `getLevel`, which applies
 * `LEVEL_SIZE_OVERRIDES`. So the played size is checked too, against the source
 * plus an override that had to predict the exact value it replaced.
 *
 * The alternative — excusing levels from the comparison — would turn a proof
 * into a rubber stamp. Every assertion here exists to stop that.
 */
describe('deliberate room-size divergences', () => {
  it('every level plays either its source size or a declared override', () => {
    const wrong: string[] = [];

    for (const world of WORLDS) {
      parseWorld(world).forEach((row, index) => {
        const level = index + 1;
        const played = getLevel(world, level);
        if (!played) {
          wrong.push(`${world}-${level}: getLevel returned nothing`);
          return;
        }
        const override = findSizeOverride(world, level);

        if (!override) {
          if (played.roomWidth !== row.width || played.roomHeight !== row.height) {
            wrong.push(
              `${world}-${level}: plays ${played.roomWidth}x${played.roomHeight}, ` +
                `source ${row.width}x${row.height}, and no override declares it`,
            );
          }
          return;
        }

        // An override only excuses the divergence it predicted.
        if (override.from[0] !== row.width || override.from[1] !== row.height) {
          wrong.push(
            `${world}-${level}: override claims the source is ` +
              `${override.from[0]}x${override.from[1]}, but it is ${row.width}x${row.height}`,
          );
        }
        if (played.roomWidth !== override.to[0] || played.roomHeight !== override.to[1]) {
          wrong.push(
            `${world}-${level}: override says play ${override.to[0]}x${override.to[1]}, ` +
              `but it plays ${played.roomWidth}x${played.roomHeight}`,
          );
        }
      });
    }

    expect(wrong).toEqual([]);
  });

  it('leaves the raw table untouched', () => {
    // The override is applied at the accessor. If it ever mutated LEVELS, the
    // source comparison above would start passing for the wrong reason.
    const raw = LEVELS[0][0];
    expect([raw.roomWidth, raw.roomHeight]).toEqual([640, 400]);
    expect(getLevel(1, 1)).toMatchObject({ roomWidth: 800, roomHeight: 600 });
  });

  it('has no override that changes nothing', () => {
    // A no-op entry would misrepresent what diverges, and would survive a
    // re-extraction that made it wrong. The six world-1 levels already at
    // 800x600 are deliberately absent from the table for this reason.
    for (const o of LEVEL_SIZE_OVERRIDES) {
      expect(
        `${o.from[0]}x${o.from[1]}`,
        `override ${o.world}-${o.level} is a no-op`,
      ).not.toBe(`${o.to[0]}x${o.to[1]}`);
    }
  });

  it('has no stale override for a level that already matches', () => {
    // Guards the list against rotting: if a re-extraction brought a level to
    // the overridden size, the entry must be deleted rather than left.
    for (const o of LEVEL_SIZE_OVERRIDES) {
      const row = parseWorld(o.world)[o.level - 1];
      expect(
        [row.width, row.height],
        `override ${o.world}-${o.level} no longer diverges from the source`,
      ).not.toEqual([o.to[0], o.to[1]]);
    }
  });

  it('stays inside the declared scope: world 1, Normal and Flag only', () => {
    // Stops the table growing into a general escape hatch. A Tower or Defense
    // entry, or anything outside world 1, fails here.
    for (const o of LEVEL_SIZE_OVERRIDES) {
      expect(o.world, `override ${o.world}-${o.level} is outside world 1`).toBe(1);
      const mode = LEVELS[o.world - 1][o.level - 1].mode;
      expect(OVERRIDDEN_MODES, `override ${o.world}-${o.level} is a ${mode} level`).toContain(mode);
    }
  });

  it('covers every world-1 Normal and Flag level, one way or the other', () => {
    // The rule is "all of them are 800x600". A level running a size experiment
    // is the one sanctioned exception, and it has to be *declared* as one —
    // this reads the reason rather than hardcoding which level is exempt, so
    // an untagged divergence still fails.
    const missed: string[] = [];
    LEVELS[0].forEach((spec, index) => {
      if (!OVERRIDDEN_MODES.includes(spec.mode)) return;
      const level = index + 1;
      if (findSizeOverride(1, level)?.reason === 'experiment') return;

      const played = getLevel(1, level)!;
      if (played.roomWidth !== 800 || played.roomHeight !== 600) {
        missed.push(`1-${level} (${spec.mode}) plays ${played.roomWidth}x${played.roomHeight}`);
      }
    });
    expect(missed).toEqual([]);
  });

  it('has no experiments left running', () => {
    // The 1600x1200 trial on 1-1 was reverted after testing. An experiment
    // left in place is the failure this asserts against — it would look like a
    // decision while actually being an unfinished trial. The machinery stays,
    // because it is what let the standardisation rule remain exactly
    // assertable while one was running.
    const experiments = LEVEL_SIZE_OVERRIDES.filter((o) => o.reason === 'experiment');
    expect(experiments.map((o) => `${o.world}-${o.level}`)).toEqual([]);
  });

  it('requires any future experiment to explain itself', () => {
    // Still bites when one is added, rather than going quiet with the list.
    for (const o of LEVEL_SIZE_OVERRIDES) {
      if (o.reason !== 'experiment') continue;
      expect(o.note, `experiment ${o.world}-${o.level} has no note`).toBeTruthy();
    }
  });

  it('covers all eighteen: twelve overridden, six already correct', () => {
    // The exact split, so neither category can grow quietly.
    const standard = LEVEL_SIZE_OVERRIDES.filter((o) => o.reason === 'standard');
    expect(standard).toHaveLength(12);
    const alreadyCorrect = LEVELS[0].filter(
      (spec, i) =>
        OVERRIDDEN_MODES.includes(spec.mode) &&
        !findSizeOverride(1, i + 1) &&
        spec.roomWidth === 800 &&
        spec.roomHeight === 600,
    );
    expect(alreadyCorrect).toHaveLength(6);
    expect(standard.length + alreadyCorrect.length).toBe(18);
  });

  it('leaves Tower, Boss and Defense at their extracted sizes', () => {
    LEVELS[0].forEach((spec, index) => {
      if (OVERRIDDEN_MODES.includes(spec.mode)) return;
      const played = getLevel(1, index + 1)!;
      expect(
        [played.roomWidth, played.roomHeight],
        `1-${index + 1} (${spec.mode}) must not be standardised`,
      ).toEqual([spec.roomWidth, spec.roomHeight]);
    });
  });

  it('changes exactly twelve levels', () => {
    // Six of the eighteen were already 800x600. The exact figure, so a silent
    // widening of the table shows up as a failed count rather than a bigger
    // number nobody reads.
    expect(LEVEL_SIZE_OVERRIDES).toHaveLength(12);
  });
});

describe('the four spare columns', () => {
  it('are zero in every row of every world', () => {
    // Recorded rather than assumed. If a future extraction finds a non-zero
    // here, this fails and the column means something — which is the outcome
    // the `enemyModel` column-1 mistake taught us to leave a tripwire for.
    for (const world of WORLDS) {
      parseWorld(world).forEach((row, index) => {
        expect(row.spare, `${world}-${index + 1}`).toEqual([0, 0, 0, 0]);
      });
    }
  });
});

describe('the distinct sizes are a fact about the data, not a maintained list', () => {
  it('derives exactly five, and they come from the source', () => {
    // `constants.ts` used to carry a hand-written ROOM_SIZES list that nothing
    // read and nothing checked. Deleted; this is the replacement, and it is
    // computed from the AS3 rather than transcribed from it.
    const fromSource = new Set(
      WORLDS.flatMap((world) => parseWorld(world).map((r) => `${r.width}x${r.height}`)),
    );
    const fromPort = new Set(
      LEVELS.flat().map((spec) => `${spec.roomWidth}x${spec.roomHeight}`),
    );

    expect([...fromSource].sort()).toEqual([...fromPort].sort());
    expect(fromPort.size).toBe(5);
    expect([...fromPort].sort()).toEqual(
      ['640x400', '640x640', '640x960', '800x600', '900x720'].sort(),
    );
  });
});
