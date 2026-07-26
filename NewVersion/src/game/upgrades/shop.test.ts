/**
 * The shop transaction, as UpgradesScene performs it.
 *
 * `upgradeState` already has 40 tests on the rules; these cover the path the
 * scene actually takes — buy, persist, reload — and the ownership rule Q uses.
 */
import { describe, expect, it } from 'vitest';
import {
  findUpgradeById,
  getLevel,
  nextLevelCost,
  purchaseNextLevel,
  createInitialUpgradeState,
} from './upgradeState';
import { ALL_UPGRADES, MAX_UPGRADE_LEVEL, PRIMARY_UPGRADES } from './upgradeData';
import { PlayerProfile, ACTIVE_SLOT } from '../player/playerProfile';
import { MemoryBackend, SaveStore, saveSlotStoreName } from '../save/SaveStore';
import { resolveWeaponStats, PRIMARY_WEAPONS, getWeapon } from '../weapons/firing';

const storeName = saveSlotStoreName(ACTIVE_SLOT);

describe('the catalogue', () => {
  it('covers all 28 upgrades across three categories', () => {
    expect(ALL_UPGRADES).toHaveLength(28);
    const byCategory = ALL_UPGRADES.reduce<Record<string, number>>((acc, u) => {
      acc[u.category] = (acc[u.category] ?? 0) + 1;
      return acc;
    }, {});
    expect(byCategory).toEqual({ primary: 12, secondary: 12, misc: 4 });
  });

  it('starts with only the free starters owned', () => {
    const state = createInitialUpgradeState();
    const owned = ALL_UPGRADES.filter((u) => getLevel(state, u) > 0).map((u) => u.name);
    // Cannon and Mine ship at level 1; everything else must be bought.
    expect(owned).toEqual(['Cannon', 'Mine']);
  });

  it('prices the next level, and nothing at the cap', () => {
    const state = createInitialUpgradeState();
    const cannon = findUpgradeById('Cannon')!;
    expect(nextLevelCost(state, cannon)).toBeGreaterThan(0);

    const maxed = { ...state, primary: [...state.primary] };
    maxed.primary[0] = MAX_UPGRADE_LEVEL;
    expect(nextLevelCost(maxed, cannon)).toBeNull();
  });
});

describe('buying', () => {
  it('refuses when the player cannot afford it', () => {
    const state = createInitialUpgradeState();
    expect(state.money).toBe(0);
    const result = purchaseNextLevel(state, findUpgradeById('MiniGun')!);
    expect(result.purchased).toBe(false);
    expect(result.state.money).toBe(0);
  });

  it('deducts exactly the quoted cost', () => {
    const spec = findUpgradeById('MiniGun')!;
    const funded = { ...createInitialUpgradeState(), money: 100_000 };
    const quoted = nextLevelCost(funded, spec)!;

    const result = purchaseNextLevel(funded, spec);
    expect(result.purchased).toBe(true);
    expect(result.spent).toBe(quoted);
    expect(result.state.money).toBe(100_000 - quoted);
  });

  it('raises the level by one', () => {
    const spec = findUpgradeById('MiniGun')!;
    const funded = { ...createInitialUpgradeState(), money: 100_000 };
    expect(getLevel(funded, spec)).toBe(0);
    expect(getLevel(purchaseNextLevel(funded, spec).state, spec)).toBe(1);
  });

  it('cannot exceed the cap however much money there is', () => {
    const spec = findUpgradeById('Cannon')!;
    let state = { ...createInitialUpgradeState(), money: 10_000_000 };
    for (let i = 0; i < 30; i += 1) state = purchaseNextLevel(state, spec).state;
    expect(getLevel(state, spec)).toBe(MAX_UPGRADE_LEVEL);
  });

  it('never produces a negative balance', () => {
    let state = { ...createInitialUpgradeState(), money: 3000 };
    for (const spec of ALL_UPGRADES) {
      for (let i = 0; i < 3; i += 1) state = purchaseNextLevel(state, spec).state;
    }
    expect(state.money).toBeGreaterThanOrEqual(0);
  });
});

describe('purchases persist', () => {
  it('survives a reload through the real codec', () => {
    const backend = new MemoryBackend();
    const first = new PlayerProfile(new SaveStore(storeName, backend));

    first.setUpgrades({ ...first.upgrades, money: 100_000 });
    const spec = findUpgradeById('Shotgun')!;
    first.setUpgrades(purchaseNextLevel(first.upgrades, spec).state);
    first.save(new Date('2026-01-01T00:00:00Z'));

    const second = new PlayerProfile(new SaveStore(storeName, backend));
    expect(getLevel(second.upgrades, spec)).toBe(1);
    expect(second.upgrades.money).toBeLessThan(100_000);
  });
});

describe('ownership gates the weapon ring', () => {
  /** What cycleWeapon does: walk to the next weapon with resolvable stats. */
  function nextOwned(state: ReturnType<typeof createInitialUpgradeState>, from: string) {
    const names = Object.keys(PRIMARY_WEAPONS);
    const current = names.indexOf(from);
    for (let step = 1; step <= names.length; step += 1) {
      const candidate = getWeapon(names[(current + step) % names.length])!;
      if (resolveWeaponStats(candidate, state)) return candidate.name;
    }
    return null;
  }

  it('a fresh player cycles only the Cannon', () => {
    const state = createInitialUpgradeState();
    expect(nextOwned(state, 'Cannon')).toBe('Cannon');
  });

  it('skips past unowned weapons rather than stopping at one', () => {
    // Regression: the old cycle tried a single candidate and returned if it
    // was unowned, so one gap blocked everything past it.
    const state = createInitialUpgradeState();
    const penetration = PRIMARY_UPGRADES.findIndex((u) => u.id === 'PenetrationCannon');
    state.primary[penetration] = 1;

    // MiniGun through Cake are all unowned; the walk must reach Penetration.
    expect(nextOwned(state, 'Cannon')).toBe('Penetration Cannon');
  });

  it('includes a weapon as soon as it is bought', () => {
    let state = { ...createInitialUpgradeState(), money: 100_000 };
    expect(nextOwned(state, 'Cannon')).toBe('Cannon');

    state = purchaseNextLevel(state, findUpgradeById('MiniGun')!).state;
    expect(nextOwned(state, 'Cannon')).toBe('MiniGun');
  });
});
