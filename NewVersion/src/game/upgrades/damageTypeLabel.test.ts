/**
 * The shop's damage-type line, against `ScreenUpgrades.handleDamageTypeUI`.
 *
 * Every expected value here comes from the **AS3 line**, not from the module —
 * a table test that reads its own table proves only that the file parses. The
 * groupings below are transcribed from the source's `||` chains, so a
 * mistranscribed index fails rather than being copied into the assertion.
 */
import { describe, expect, it } from 'vitest';

import { damageTypeLabel } from './damageTypeLabel';

describe('primaries — ScreenUpgrades.as:1779-1812', () => {
  /**
   * The source groups indices onto one label; this restates the groups rather
   * than the map, so the two have to agree.
   */
  const groups: [string, number[]][] = [
    // `:1779` — selectedWeapon == 1 || 3 || 6 || 11
    ['Explosion Damage', [1, 3, 6, 11]],
    // `:1784` — == 2 || 5
    ['Bullet Damage', [2, 5]],
    // `:1789` — == 4
    ['Fire/Lava Damage', [4]],
    // `:1793` — == 7 || 10
    ['Food Damage', [7, 10]],
    // `:1798` — == 8
    ['Poison Damage', [8]],
    // `:1803` — == 9
    ['Laser Damage', [9]],
    // `:1808` — == 12
    ['Magic Damage', [12]],
  ];

  it.each(groups)('labels %s', (label, indices) => {
    for (const i of indices) expect(damageTypeLabel('primary', i), `weapon ${i}`).toBe(label);
  });

  it('covers all twelve, with no index left over', () => {
    // The counterpart to the groups above: they could all pass while an index
    // was missing from every one of them.
    const covered = groups.flatMap(([, indices]) => indices).sort((a, b) => a - b);
    expect(covered).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });
});

describe('secondaries — ScreenUpgrades.as:1814-1851', () => {
  const groups: [string, number[]][] = [
    // `:1816` — selectedSecondary == 1 || 2 || 8
    ['Explosion Damage', [1, 2, 8]],
    // `:1821` — == 3 || 5 || 9
    ['Ice Damage', [3, 5, 9]],
    // `:1826` — == 4 || 6
    ['Poison Damage', [4, 6]],
    // `:1832` — == 7. The one secondary that deals none: the Shield.
    ['No Damage', [7]],
    // `:1837` — == 10
    ['Fire/Lava Damage', [10]],
    // `:1842` — == 11
    ['Food Damage', [11]],
    // `:1847` — == 12
    ['Magic Damage', [12]],
  ];

  it.each(groups)('labels %s', (label, indices) => {
    for (const i of indices) expect(damageTypeLabel('secondary', i), `secondary ${i}`).toBe(label);
  });

  it('covers all twelve, with no index left over', () => {
    const covered = groups.flatMap(([, indices]) => indices).sort((a, b) => a - b);
    expect(covered).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  /**
   * The two chains disagree on the same index, and that is the point of
   * keying by category rather than by number alone.
   *
   * Weapon 3 is a Big Cannon (Explosion); secondary 3 is an Ice Grenade. A
   * lookup that dropped the category would be right for one of them and
   * silently wrong for the other — the kind of defect that reads as correct on
   * whichever screen you happen to check.
   */
  it('disagrees with the primary chain at the same index', () => {
    expect(damageTypeLabel('secondary', 3)).toBe('Ice Damage');
    expect(damageTypeLabel('primary', 3)).toBe('Explosion Damage');
  });
});

describe('misc — ScreenUpgrades.as:1769-1776', () => {
  it('is No Damage for every index, with no per-upgrade branch', () => {
    // `upgradeType == 1` sets the text before testing anything, so all four
    // read the same. Driven across the range rather than at one index, which
    // is what separates "no branch" from "the branch I happened to pick".
    for (const i of [1, 2, 3, 4]) expect(damageTypeLabel('misc', i), `misc ${i}`).toBe('No Damage');
  });
});

describe('the gaps', () => {
  /**
   * `null` where the AS3 prints nothing new.
   *
   * The chains have no `else`, so out of range the original leaves the *last*
   * selection's text on screen. This returns `null` instead and the panel
   * renders nothing — `A29`. Pinned so the reading is deliberate rather than
   * an accident of `Record` lookup.
   */
  it('returns null outside a category`s range', () => {
    expect(damageTypeLabel('primary', 13)).toBeNull();
    expect(damageTypeLabel('primary', 0)).toBeNull();
    expect(damageTypeLabel('secondary', 13)).toBeNull();
  });

  it('returns null for a category the source has no chain for', () => {
    // The counterpart: a lookup that answered *something* for an unknown
    // category would put a confident wrong label on any future group.
    expect(damageTypeLabel('cosmetic', 1)).toBeNull();
  });
});
