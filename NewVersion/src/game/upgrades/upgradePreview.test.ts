/**
 * The shop's stat lines, as strings a player would read.
 *
 * The extraction is pinned separately (`scripts/parse-upgrade-previews.test.mjs`,
 * all 21 labels against their AS3 lines). This is the other half: that the
 * numbers come out right once the transform and the index are applied.
 *
 * Every expected string below was computed by hand from the upgrade's own track
 * and the AS3 expression, not copied from a run.
 */
import { describe, expect, it } from 'vitest';

import { applyTransform, currentIndex, previewLine, previewLines, specFor } from './upgradePreview';
import { findUpgradeById } from './upgradeState';
import { MISC_UPGRADES, PRIMARY_UPGRADES } from './upgradeData';
import { UPGRADE_PREVIEWS } from './upgradePreviewData';

const speed = MISC_UPGRADES[0];
const cannon = findUpgradeById('Cannon')!;
const flamethrower = findUpgradeById('Flamethrower')!;

describe('the six transforms', () => {
  /**
   * Exact values, from the AS3 expressions. `seconds1` and `seconds2` are both
   * "frames to seconds" and differ only in rounding, so they are asserted on
   * the *same* input — the pair is what shows they have not been collapsed.
   */
  it('computes each shape as the AS3 writes it', () => {
    expect(applyTransform('raw', 7)).toBe(7);
    expect(applyTransform('perSecond', 4)).toBe(120); // x30
    expect(applyTransform('percent', 0.125)).toBe(13); // round(12.5)
    expect(applyTransform('seconds1', 45), 'round(45/3)/10').toBe(1.5);
    expect(applyTransform('seconds2', 45), 'round(45/0.3)/100').toBe(1.5);
    expect(applyTransform('damagePerSecond', 0.5)).toBe(15); // round(1500)/100
  });

  it('keeps seconds1 and seconds2 apart where their rounding differs', () => {
    // 46/30 = 1.5333… — one decimal gives 1.5, two give 1.53.
    expect(applyTransform('seconds1', 46)).toBe(1.5);
    expect(applyTransform('seconds2', 46)).toBe(1.53);
  });
});

describe('which level a figure comes from', () => {
  /**
   * **The `statsIncludeLevelZero` case, and the reason a naive fix passes 27
   * upgrades and fails one.**
   *
   * Only `upgradeArraySpeed` carries a level-0 baseline
   * (`gen-upgrades.mjs:12-22`, `Tank.as:64`). An implementation that always
   * reads `level - 1` is right for every other upgrade in the game.
   */
  it('reads Speed one index higher than everything else', () => {
    expect(speed.statsIncludeLevelZero, 'Speed has a level-0 baseline').toBe(true);
    expect(cannon.statsIncludeLevelZero, 'the Cannon does not').toBe(false);

    expect(currentIndex(3, true), 'Speed at level 3').toBe(3);
    expect(currentIndex(3, false), 'Cannon at level 3').toBe(2);
  });

  /**
   * Driven end to end on the two upgrades, at the same level, so the difference
   * shows in the rendered string rather than only in the index.
   *
   * A naive implementation that ignores the flag prints Speed's level-2 figure
   * where its level-3 one belongs — this is the assertion that catches it.
   */
  it('prints Speed from the right row at level 3', () => {
    // `upgradeArraySpeed` track 1 is [3.25, 3.5, 3.75, 4, 4.25, ...] and the
    // line multiplies by 30. At level 3 the level-0 baseline makes index 3 the
    // current row: 4 x 30 = 120, previewing 4.25 x 30 = 127.5.
    expect(previewLine(speed, 'misc', 1, 1, 3)).toBe('Max Speed: 120 PX/Sec  127.5');

    // The counterpart: ignoring `statsIncludeLevelZero` reads index 2 instead,
    // which is a different, wrong string — 3.75 x 30 = 112.5.
    expect(previewLine(speed, 'misc', 1, 1, 3)).not.toBe(
      'Max Speed: 112.5 PX/Sec  120',
    );
  });
});

describe('per-upgrade override versus category default', () => {
  /**
   * `:1019` gives the Flamethrower damage per second; `:1023` is the `else`
   * every other primary takes and prints it flat.
   *
   * Asserted as a pair on the same slot, because either alone is satisfied by a
   * lookup that only ever reads one of the two tables.
   */
  it('resolves the Flamethrower override and the Cannon default', () => {
    const override = specFor('primary', 4, 1);
    const fallback = specFor('primary', 1, 1);

    expect(override?.transform, 'Flamethrower — :1019').toBe('damagePerSecond');
    expect(override?.upgradeIndex, 'is an override, not the default').toBe(4);
    expect(override?.unit).toBe(' HP/Sec');

    expect(fallback?.transform, 'Cannon — the :1023 default').toBe('raw');
    expect(fallback?.upgradeIndex, 'is the default').toBeNull();
    expect(fallback?.unit).toBe(' HP');
  });

  it('renders both, and they differ', () => {
    const cannonDamage = previewLine(cannon, 'primary', 1, 1, 1);
    const flameDamage = previewLine(flamethrower, 'primary', 4, 1, 1);

    // The Cannon's damage track is [7, 7.33, 7.66, ...], printed flat.
    expect(cannonDamage).toBe('Damage: 7 HP  7.33');

    // The Flamethrower reads the same slot through `damagePerSecond`, so its
    // figure is x30 and its unit says so. Computed from its own track, since
    // the point here is that the *transform* differs, not the numbers.
    const flameTrack = flamethrower.stats[1];
    expect(flameDamage).toBe(
      `Damage: ${Math.round(flameTrack[0] * 3000) / 100} HP/Sec  ` +
        `${Math.round(flameTrack[1] * 3000) / 100}`,
    );
    expect(flameDamage).not.toBe(cannonDamage);
    expect(flameDamage, 'the per-second unit is the visible difference').toContain(' HP/Sec');
  });

  /** Every primary except the Flamethrower takes the default. */
  it('gives eleven of twelve primaries the flat damage line', () => {
    const flat = PRIMARY_UPGRADES.filter(
      (u) => specFor('primary', u.index + 1, 1)?.transform === 'raw',
    );
    expect(flat).toHaveLength(PRIMARY_UPGRADES.length - 1);
  });
});

describe('lines that show nothing', () => {
  /**
   * **The clear case.** The AS3 assigns `""` to a slot an upgrade does not use,
   * and the array must still carry it: dropping the entry would shift the
   * remaining lines up a slot and leave the previous upgrade's text on screen.
   */
  it('returns five entries, blank where the upgrade has no such line', () => {
    const lines = previewLines(cannon, 'primary', 1, 1);
    expect(lines).toHaveLength(5);
    // The Cannon has damage, reload and explosion; slots 4 and 5 are not its.
    expect(lines[0]).not.toBe('');
    expect(lines[3], 'slot 4 is blank for the Cannon').toBe('');
    expect(lines[4], 'slot 5 is blank for the Cannon').toBe('');
  });

  /**
   * A secondary-only default must not leak onto a primary.
   *
   * `Freeze:` and `Trail Time:` are defaults in the secondary section only. The
   * first version of the extractor attributed defaults by guard rather than by
   * the table the expression reads, which would have printed "Freeze:" on every
   * primary that had no slot-4 override.
   */
  it('keeps secondary-only defaults off primaries', () => {
    expect(specFor('primary', 1, 4), 'no slot-4 default for primaries').toBeNull();
    expect(specFor('secondary', 1, 4)?.label, 'but secondaries have one').toBe('Freeze: ');
  });
});

describe('an upgrade the player does not own yet', () => {
  /**
   * At level 0 there is no current figure, so the AS3 shows the first level's
   * alone — no second value, and therefore no separator.
   */
  it('shows one figure, not a pair', () => {
    const line = previewLine(cannon, 'primary', 1, 1, 0);
    expect(line).toBe('Damage: 7 HP');
    expect(line, 'no next-level figure').not.toContain('  ');
  });
});

describe("the original's unit typo, reproduced not corrected", () => {
  /**
   * `:1445` prints the Shield's duration with `" HP"` when it is not owned;
   * `:1252` and `:1332` both say `" Sec"` once it is. A duration is not hit
   * points, so this is a typo in the original — and the project's rule is to
   * reproduce it and record it, not to quietly improve it.
   *
   * **Driven as a pair on the same upgrade**, because the whole content of the
   * claim is that the two states disagree. Asserting only the unowned string
   * would pass if every Shield line said " HP".
   *
   * It is also the one place `unitUnowned` is used. That field was dead for a
   * while — the detection looked for a `[level + 1]` read, which only the misc
   * section has — so it carried the quirk in name only. This is what makes that
   * impossible to repeat.
   */
  it('shows Shield Time in HP when unowned and Sec when owned', () => {
    const shield = findUpgradeById('Shield')!;

    expect(previewLine(shield, 'secondary', 7, 1, 0), 'not owned — :1445').toBe(
      'Shield Time: 3.33 HP',
    );
    expect(previewLine(shield, 'secondary', 7, 1, 1), 'owned — :1252/:1332').toContain(' Sec');
  });

  /** Exactly one line in the whole table carries the quirk. */
  it('is the only unit that changes with ownership', () => {
    const odd = UPGRADE_PREVIEWS.filter((s) => s.unitUnowned !== undefined);
    expect(odd.map((s) => s.label)).toEqual(['Shield Time: ']);
  });
});
