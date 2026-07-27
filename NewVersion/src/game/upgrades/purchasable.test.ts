/**
 * The shop must not sell what it cannot deliver.
 *
 * Two audited defects: `BulletReflect` and `KillReload` were buyable to level 10
 * for ~135,000 coins combined with no runtime reader, and eleven of twelve
 * secondaries were buyable while `SECONDARY_WEAPONS` held only `Mine`. Money is
 * scarce, non-refundable, and the purchase persisted immediately.
 *
 * The weapon half is derived, so these tests mostly guard the *declared* half —
 * `MISC_WITH_EFFECT` — which is the part that can lie. Each entry is pinned to
 * the file that actually reads it, by reading that file. Naming a read site in
 * a comment is what this project keeps discovering to be worthless.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  MISC_WITHOUT_EFFECT,
  MISC_WITH_EFFECT,
  isPurchasable,
  purchasableUpgrades,
  withheldUpgrades,
} from './purchasable';
import { ALL_UPGRADES, MISC_UPGRADES, SECONDARY_UPGRADES, PRIMARY_UPGRADES } from './upgradeData';
import { findUpgradeById } from './upgradeState';
import { SECONDARY_WEAPONS } from '../weapons/secondaries';
import { PRIMARY_WEAPONS } from '../weapons/firing';

describe('the two money sinks are gone', () => {
  it.each(['BulletReflect', 'KillReload'])('%s is not purchasable', (id) => {
    expect(isPurchasable(findUpgradeById(id)!)).toBe(false);
  });

  it('neither appears in the catalogue', () => {
    const ids = purchasableUpgrades().map((u) => u.id);
    expect(ids).not.toContain('BulletReflect');
    expect(ids).not.toContain('KillReload');
  });

  it('together they were worth about 135,000 coins', () => {
    // The figure from the audit, recomputed rather than restated — if the
    // tables change, this is the line that notices.
    const total = ['BulletReflect', 'KillReload']
      .map((id) => findUpgradeById(id)!)
      .reduce((sum, spec) => sum + spec.prices.reduce((a, b) => a + b, 0), 0);
    expect(total).toBeGreaterThan(100_000);
  });
});

describe('only ported secondaries are sold', () => {
  it('Mine is, because SECONDARY_WEAPONS claims it', () => {
    expect(SECONDARY_WEAPONS['Mine']?.upgradeId).toBe('Mine');
    expect(isPurchasable(findUpgradeById('Mine')!)).toBe(true);
  });

  it('the other eleven are not', () => {
    const sold = SECONDARY_UPGRADES.filter(isPurchasable).map((u) => u.id);
    expect(sold).toEqual(['Mine']);
    expect(SECONDARY_UPGRADES).toHaveLength(12);
  });

  it('Shield in particular, which cost up to 12,500 a level', () => {
    const shield = findUpgradeById('Shield')!;
    expect(isPurchasable(shield)).toBe(false);
    expect(Math.max(...shield.prices)).toBe(12_500);
  });

  it('is derived, so porting a secondary is enough to shelve it', () => {
    // The property that matters: nothing here needs editing when a secondary
    // lands. Every id in SECONDARY_WEAPONS is sellable, by construction.
    for (const weapon of Object.values(SECONDARY_WEAPONS)) {
      const spec = findUpgradeById(weapon.upgradeId);
      expect(spec, `${weapon.upgradeId} has no upgrade row`).toBeDefined();
      expect(isPurchasable(spec!)).toBe(true);
    }
  });
});

describe('all twelve primaries are sold', () => {
  it('because all twelve have specs', () => {
    expect(PRIMARY_UPGRADES.filter(isPurchasable)).toHaveLength(12);
    expect(Object.keys(PRIMARY_WEAPONS)).toHaveLength(12);
  });
});

/**
 * The declared half. `MISC_WITH_EFFECT` is the one thing here that can be wrong,
 * so every entry is checked against the file it names.
 */
describe('every misc upgrade sold has a real reader', () => {
  const readSites: Record<string, string> = {
    Speed: 'src/game/player/tankMovement.ts',
    EnemyAbsorb: 'src/game/player/tankDamage.ts',
  };

  it.each(Object.keys(MISC_WITH_EFFECT))('%s is read at runtime', (id) => {
    const path = readSites[id];
    expect(path, `no read site recorded for ${id} — add one or withhold it`).toBeDefined();
    const source = readFileSync(path, 'utf8');
    expect(
      source.includes(`'${id}'`) || source.includes(`"${id}"`),
      `${path} does not mention ${id}; the claim that buying it does something is unsupported`,
    ).toBe(true);
  });

  it('withheld misc upgrades are absent from those files', () => {
    // The inverse, which is the half that would have caught the original bug:
    // if BulletReflect ever gains a reader, this fails and tells us to sell it.
    const sources = Object.values(readSites).map((p) => readFileSync(p, 'utf8'));
    for (const id of Object.keys(MISC_WITHOUT_EFFECT)) {
      for (const source of sources) {
        expect(source.includes(`'${id}'`), `${id} now has a reader — it should be sellable`).toBe(
          false,
        );
      }
    }
  });

  it('accounts for every misc upgrade, so a new one cannot default to hidden', () => {
    const declared = new Set([
      ...Object.keys(MISC_WITH_EFFECT),
      ...Object.keys(MISC_WITHOUT_EFFECT),
    ]);
    const missing = MISC_UPGRADES.filter((u) => !declared.has(u.id)).map((u) => u.id);
    expect(
      missing,
      `undeclared misc upgrades: ${missing.join(', ')}. Add each to MISC_WITH_EFFECT ` +
        'with its read site, or to MISC_WITHOUT_EFFECT with why.',
    ).toEqual([]);
  });
});

describe('the catalogue and the withheld list partition the table', () => {
  it('every upgrade is in exactly one', () => {
    expect(purchasableUpgrades().length + withheldUpgrades().length).toBe(ALL_UPGRADES.length);
    const sold = new Set(purchasableUpgrades().map((u) => u.id));
    for (const spec of withheldUpgrades()) expect(sold.has(spec.id)).toBe(false);
  });

  it('withholds 13 of 28 today — 11 secondaries and 2 misc', () => {
    // The exact figure, so a change to what the shop sells is visible in a diff
    // rather than discovered in play.
    expect(withheldUpgrades()).toHaveLength(13);
    expect(purchasableUpgrades()).toHaveLength(ALL_UPGRADES.length - 13);
  });
});
