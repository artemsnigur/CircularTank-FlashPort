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
 * `gen-levels.mjs`, and asserts the transcription matches the original.
 *
 * ── What it checks, since the campaign replaced the AS3's 405 levels ──────
 * `AS3_LEVELS`, not `LEVELS`. The game plays a redesigned 4x45 campaign whose
 * rooms are authored from each level's mode (`campaign-design.mjs`), so asking
 * whether *it* matches `ScreenGame.as` is a question with no meaning. What
 * still matters, and matters more now that nothing else reads it, is that the
 * **record** is faithful: it is the reference every future question about the
 * original is answered from, and a silent transcription bug in a table nobody
 * plays would go unnoticed forever.
 *
 * `levelSizeOverrides.ts` is gone with the campaign (T252). It enumerated
 * fifteen world-1 rooms the port played at a different size, and the campaign
 * now sets every room itself — so the list described a divergence from a table
 * nothing plays.
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
import { AS3_LEVELS } from './levelData';

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

describe('the AS3 record carries the size the original specified', () => {
  it('matches all 405 rooms, world by world', () => {
    const mismatches: string[] = [];

    for (const world of WORLDS) {
      const rows = parseWorld(world);
      rows.forEach((row, index) => {
        const level = index + 1;
        const spec = AS3_LEVELS[world - 1]?.[index];
        if (!spec) {
          mismatches.push(`${world}-${level}: missing from AS3_LEVELS`);
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
    const wrongWorld = AS3_LEVELS[1];
    const disagreements = rows.filter(
      (row, i) =>
        wrongWorld[i] !== undefined &&
        (wrongWorld[i].roomWidth !== row.width || wrongWorld[i].roomHeight !== row.height),
    );

    expect(disagreements.length).toBeGreaterThan(0);
  });

  it('has the same number of levels per world as the source', () => {
    // `WORLD_COUNT` and `levelsInWorld` describe the **campaign** now, so they
    // are the wrong thing to ask — the record is what has nine worlds of 45.
    expect(AS3_LEVELS).toHaveLength(9);
    for (const world of WORLDS) {
      expect(AS3_LEVELS[world - 1], `world ${world}`).toHaveLength(parseWorld(world).length);
    }
  });
});
