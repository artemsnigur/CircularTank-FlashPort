/**
 * Does the shop-preview parser read `ScreenUpgrades.as` correctly?
 *
 * Driven against the **real** AS3 file, not a fixture, for the same reason
 * `mp3-probe.test.mjs` asserts against the real asset folder: a fixture pins
 * the parser against a copy of the source and would keep passing after the
 * source moved.
 *
 * Every assertion below names the AS3 line it came from, and the expected
 * values were read off that line **by hand** before the parser was trusted.
 * That hand-check is what found three defects the first version had — see the
 * "corrections" block at the bottom, which pins them so they cannot come back.
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { parseUpgradePreviews } from './lib/parse-upgrade-previews.mjs';

// Vitest rewrites `import.meta.url`, so resolve from the project root — the
// same fix `mp3-probe.test.mjs:13-16` documents.
const source = readFileSync(
  resolve(process.cwd(), '../SWFimported/scripts/ScreenUpgrades.as'),
  'utf8',
);

/** `changeContent()` — `:738` to just before `update()` at `:1613`. */
const RANGE = { from: 738, to: 1612 };
const rows = parseUpgradePreviews(source, RANGE);
const display = rows.filter((r) => !r.clears);
const at = (line) => rows.find((r) => r.line === line);

describe('the block is read whole', () => {
  it('finds every assignment, and classifies each one', () => {
    // 158 `infoText<n>.text =` assignments exist in the range; 32 of them are
    // the measure-then-set scaffolding this parser drops, leaving 126.
    expect(rows).toHaveLength(126);
    expect(display.length).toBe(102);
    expect(rows.filter((r) => r.clears).length).toBe(24);

    // Nothing may fall through unclassified: a row with no label and no clear
    // flag would be a line the parser matched and then failed to understand.
    const unclassified = display.filter((r) => r.label === null);
    expect(unclassified, 'matched but not understood').toEqual([]);
  });

  it('uses only the six known transforms', () => {
    const kinds = new Set(display.map((r) => r.transform));
    // Sorted, and `perSecond` precedes `percent`: an uppercase `S` (83) sorts
    // before a lowercase `c` (99). Spelled out because the natural reading is
    // the other way round and this expectation was written wrong first time.
    expect([...kinds].sort()).toEqual([
      'damagePerSecond',
      'perSecond',
      'percent',
      'raw',
      'seconds1',
      'seconds2',
    ]);
  });
});

/**
 * One assertion per distinct label — all 21 — each against the AS3 line it was
 * read from.
 *
 * A count ("21 labels found") would pass with every field wrong. These pin the
 * track, the transform, the index offset and the unit, which together are the
 * whole of what the extraction has to get right.
 */
describe('every label extracts the values on its AS3 line', () => {
  const cases = [
    // [line, label, category, upgradeIndex, track, transform, offsets, units]
    [783, 'Max Speed: ', 'misc', 1, 1, 'perSecond', [0], [' PX/Sec']],
    [787, 'Reflect Chance: ', 'misc', 2, 1, 'percent', [-1], ['%']],
    [791, 'Reduce: ', 'misc', 3, 1, 'percent', [-1], ['% Damage']],
    [795, 'Reload: ', 'misc', 4, 1, 'seconds1', [-1], [' Sec/Kill']],
    [803, 'Acceleration: ', 'misc', 1, 2, 'perSecond', [0], [' PX/Sec']],
    [959, 'Damage: ', 'primary', 4, 2, 'damagePerSecond', [-1], [' HP', '/Sec']],
    // A **default**: no `selectedWeapon ==` guard, so it applies to every
    // primary. Its category comes from the table it reads
    // (`upgradeArraysArray2`), not from a guard — which is what keeps the
    // secondary-only defaults off primaries.
    [975, 'Explosion: ', 'primary', null, 3, 'raw', [-1], [' PX']],
    [979, 'Range: ', 'primary', 4, 3, 'raw', [-1], [' PX']],
    [983, 'Bullets: ', 'primary', 5, 4, 'raw', [-1], []],
    [987, 'Poison Dmg: ', 'primary', 8, 4, 'raw', [-1], [' HP/Sec']],
    [991, 'Pieces: ', 'primary', 10, 3, 'raw', [-1], []],
    [995, 'Targets: ', 'primary', 12, 3, 'raw', [-1], []],
    [1003, 'Time: ', 'primary', 6, 4, 'seconds2', [-1], [' Sec']],
    [1007, 'Poison Time: ', 'primary', 8, 3, 'seconds2', [-1], [' Sec']],
    [1252, 'Shield Time: ', 'secondary', 7, 2, 'seconds2', [-1], [' Sec']],
    [1265, 'Freeze: ', 'secondary', 5, 3, 'seconds2', [-1], [' Sec']],
    [1293, 'Icicles: ', 'secondary', 5, 4, 'raw', [-1], []],
    [1301, 'Rockets: ', 'secondary', 8, 4, 'raw', [-1], []],
    [1305, 'Lava Dmg: ', 'secondary', 10, 4, 'raw', [-1], [' HP/Sec']],
    [1317, 'Spikes: ', 'secondary', 6, 5, 'raw', [-1], []],
    // The secondary-only default — `upgradeArraysArray3`.
    [1321, 'Trail Time: ', 'secondary', null, 5, 'seconds2', [-1], [' Sec']],
  ];

  it.each(cases)(
    ':%i %s',
    (line, label, category, upgradeIndex, track, transform, offsets, units) => {
      const row = at(line);
      expect(row, `no row parsed at :${line}`).toBeDefined();
      expect(row.label).toBe(label);
      expect(row.category).toBe(category);
      expect(row.upgradeIndex).toBe(upgradeIndex);
      expect(row.track).toBe(track);
      expect(row.transform).toBe(transform);
      expect(row.readOffsets).toEqual(offsets);
      expect(row.units).toEqual(units);
    },
  );

  it('covers all 21 distinct labels', () => {
    expect(new Set(display.map((r) => r.label)).size).toBe(21);
    // …and the cases above name every one of them, so none can be added to the
    // AS3 and quietly go unpinned.
    expect(new Set(cases.map((c) => c[1])).size).toBe(21);
  });
});

/**
 * The three defects hand-verification found, pinned so they cannot return.
 *
 * Each looked like a working parser until a specific line was read by hand.
 * That is the whole argument for not trusting a regex sweep wholesale, and it
 * is why these are separate assertions rather than a comment.
 */
describe('corrections found by reading the source, not the output', () => {
  /**
   * **1. Measure-then-set scaffolding.** `:857` assigns a bare label so `:858`
   * can read `infoText1.length` for column sizing; `:859` then assigns the real
   * value. Taking the first would emit a label with no number.
   */
  it('drops the label-only measuring assignment and keeps the real one', () => {
    expect(at(857), ':857 is scaffolding').toBeUndefined();
    expect(at(859).label, ':859 is the real assignment').toBe('Max Speed: ');
    expect(at(859).track).toBe(1);
  });

  /**
   * **2. A third index form.** `[level + 1]` appears 4 times, only in the
   * not-yet-owned branch. The first regex allowed `- 1` and a bare index only,
   * so these read as zero-value lines.
   *
   * Pinned as a pair with the owned branch on the *same* upgrade and slot, so
   * "everything is +1" fails as loudly as "nothing is".
   */
  it('reads the not-owned branch as level + 1', () => {
    expect(at(859).readOffsets, 'not owned: next level only').toEqual([1]);
    expect(at(814).readOffsets, 'owned: current and next').toEqual([0, 1]);
    expect(display.filter((r) => r.readOffsets.includes(1))).toHaveLength(4);
  });

  /**
   * **3. `upgradeIndex: null` is a default, not a failure.** `:1019` overrides
   * damage for the Flamethrower (`selectedWeapon == 4`) and `:1023` is the
   * `else` every other weapon takes. Reading the unattributed rows as parse
   * errors is what made this look like 10 missing upgrades.
   */
  it('separates a per-upgrade override from the category default', () => {
    expect(at(1019).upgradeIndex, 'Flamethrower override').toBe(4);
    expect(at(1019).transform).toBe('damagePerSecond');

    expect(at(1023).upgradeIndex, 'the default for every other weapon').toBeNull();
    expect(at(1023).transform).toBe('raw');

    // Same label, same slot — so the pair is genuinely one rule with an
    // exception, not two unrelated lines.
    expect(at(1019).label).toBe(at(1023).label);
    expect(at(1019).slot).toBe(at(1023).slot);
  });
});
