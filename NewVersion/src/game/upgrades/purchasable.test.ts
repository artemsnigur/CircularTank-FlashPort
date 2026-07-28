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

describe('the money sinks', () => {
  it('KillReload is still not purchasable', () => {
    expect(isPurchasable(findUpgradeById('KillReload')!)).toBe(false);
    expect(purchasableUpgrades().map((u) => u.id)).not.toContain('KillReload');
  });

  it('BulletReflect is sold now that it has a reader', () => {
    // It came off the withheld list when Shield shipped: `:1557` is one
    // condition covering the shield and the upgrade, so porting one ported the
    // other's only read site. This is the inverse test below firing for real.
    expect(isPurchasable(findUpgradeById('BulletReflect')!)).toBe(true);
    expect(purchasableUpgrades().map((u) => u.id)).toContain('BulletReflect');
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

  it('the remaining four are not', () => {
    const sold = SECONDARY_UPGRADES.filter(isPurchasable).map((u) => u.id);
    expect(sold).toEqual([
      'Mine',
      'Grenade',
      'IceGrenade',
      'PoisonGrenade',
      'Icicles',
      'PoisonSpikes',
      'Shield',
      'MagicBunny',
    ]);
    expect(SECONDARY_UPGRADES).toHaveLength(12);
  });

  it('Shield appeared on its own when it was ported', () => {
    // Nothing in purchasable.ts was edited to sell it. Adding it to
    // SECONDARY_WEAPONS was the whole change — which is the property this
    // derivation exists for, observed rather than asserted.
    const shield = findUpgradeById('Shield')!;
    expect(isPurchasable(shield)).toBe(true);
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
    BulletReflect: 'src/game/weapons/shield.ts',
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
    // The inverse, which is the half that caught this for real: BulletReflect
    // gained a reader when Shield landed, this failed, and it was sold rather
    // than left shelved. KillReload is the one still waiting.
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

  it('withholds 5 of 28 today — 4 secondaries and 1 misc', () => {
    // The exact figure, so a change to what the shop sells is visible in a diff
    // rather than discovered in play. Was 13: Shield came off when it landed,
    // BulletReflect came off with it, and the three grenades came off on their
    // own as each was registered, then the two spike weapons and Magic Bunny.
    expect(withheldUpgrades()).toHaveLength(5);
    expect(purchasableUpgrades()).toHaveLength(ALL_UPGRADES.length - 5);
  });
});
