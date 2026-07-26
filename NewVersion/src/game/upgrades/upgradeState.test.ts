import { describe, expect, it } from 'vitest';
import {
  ALL_UPGRADES,
  MAX_UPGRADE_LEVEL,
  MISC_UPGRADES,
  PRIMARY_UPGRADES,
  SECONDARY_UPGRADES,
} from './upgradeData';
import {
  canAfford,
  countMaxedPrimary,
  countMaxedSecondary,
  countOwned,
  createInitialUpgradeState,
  findUpgrade,
  findUpgradeById,
  getLevel,
  getStatValue,
  isMaxed,
  isOwned,
  nextLevelCost,
  purchaseNextLevel,
  totalCostToMaxEverything,
} from './upgradeState';
import { evaluate, getAchievement } from '../achievements/achievementState';

const spec = (id: string) => {
  const found = findUpgradeById(id);
  if (!found) throw new Error(`no upgrade ${id}`);
  return found;
};

describe('upgrade data', () => {
  it('has 4 misc, 12 primary and 12 secondary upgrades', () => {
    expect(MISC_UPGRADES).toHaveLength(4);
    expect(PRIMARY_UPGRADES).toHaveLength(12);
    expect(SECONDARY_UPGRADES).toHaveLength(12);
  });

  it('gives every upgrade 10 prices and a unique id', () => {
    const ids = ALL_UPGRADES.map((u) => u.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const u of ALL_UPGRADES) expect(u.prices, u.id).toHaveLength(10);
  });

  it('keeps display names with their spaces intact', () => {
    expect(spec('Speed').name).toBe('Tank Speed');
    expect(spec('BigCannon').name).toBe('Big Cannon');
  });

  it('preserves known balance rows from ScreenUpgrades.as', () => {
    expect(spec('Cannon').prices).toEqual([0, 2000, 2400, 3000, 3700, 4500, 5500, 6700, 8200, 10000]);
    expect(spec('Speed').prices[0]).toBe(2000);
  });

  it('marks only Tank Speed as having a level-0 stat baseline', () => {
    const withLevelZero = ALL_UPGRADES.filter((u) => u.statsIncludeLevelZero);
    expect(withLevelZero.map((u) => u.id)).toEqual(['Speed']);
    for (const u of ALL_UPGRADES) {
      const expected = u.statsIncludeLevelZero ? 11 : 10;
      for (const track of u.stats) expect(track, u.id).toHaveLength(expected);
    }
  });

  it('gives exactly the two free starter items a level of 1', () => {
    const starters = ALL_UPGRADES.filter((u) => u.startLevel === 1);
    expect(starters.map((u) => u.id).sort()).toEqual(['Cannon', 'Mine']);
    for (const u of starters) expect(u.prices[0], u.id).toBe(0);
  });
});

describe('initial state', () => {
  it('starts broke, with Cannon and Mine owned', () => {
    const state = createInitialUpgradeState();
    expect(state.money).toBe(0);
    expect(state.primary).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(state.misc).toEqual([0, 0, 0, 0]);
    expect(state.secondary).toEqual([1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('reports ownership correctly out of the box', () => {
    const state = createInitialUpgradeState();
    expect(isOwned(state, spec('Cannon'))).toBe(true);
    expect(isOwned(state, spec('MiniGun'))).toBe(false);
    expect(countOwned(state, 'primary')).toBe(1);
  });
});

describe('pricing', () => {
  it('charges prices[currentLevel] for the next level', () => {
    const state = createInitialUpgradeState();
    const cannon = spec('Cannon'); // starts at level 1
    expect(nextLevelCost(state, cannon)).toBe(cannon.prices[1]);
  });

  it('charges prices[0] to unlock an unowned item', () => {
    const state = createInitialUpgradeState();
    const miniGun = spec('MiniGun');
    expect(nextLevelCost(state, miniGun)).toBe(miniGun.prices[0]);
  });

  it('returns null once maxed', () => {
    const state = createInitialUpgradeState();
    state.primary[0] = MAX_UPGRADE_LEVEL;
    expect(nextLevelCost(state, spec('Cannon'))).toBeNull();
    expect(canAfford(state, spec('Cannon'))).toBe(false);
  });

  it('lets the free starters be unlocked with no money', () => {
    const state = createInitialUpgradeState();
    state.primary[0] = 0; // pretend Cannon was not granted
    expect(nextLevelCost(state, spec('Cannon'))).toBe(0);
    expect(canAfford(state, spec('Cannon'))).toBe(true);
  });
});

describe('purchaseNextLevel', () => {
  it('deducts the cost and increments the level', () => {
    const state = createInitialUpgradeState();
    state.money = 5000;
    const miniGun = spec('MiniGun');

    const result = purchaseNextLevel(state, miniGun);
    expect(result.purchased).toBe(true);
    expect(result.spent).toBe(miniGun.prices[0]);
    expect(result.state.money).toBe(5000 - miniGun.prices[0]);
    expect(getLevel(result.state, miniGun)).toBe(1);
  });

  it('does not mutate the state it was given', () => {
    const state = createInitialUpgradeState();
    state.money = 5000;
    purchaseNextLevel(state, spec('MiniGun'));
    expect(state.money).toBe(5000);
    expect(state.primary[1]).toBe(0);
  });

  it('refuses when the player cannot afford it', () => {
    const state = createInitialUpgradeState();
    state.money = 10;
    const result = purchaseNextLevel(state, spec('MiniGun'));

    expect(result.purchased).toBe(false);
    expect(result.spent).toBe(0);
    expect(result.state).toBe(state);
  });

  it('never lets money go negative across a long buying spree', () => {
    let state = createInitialUpgradeState();
    state.money = 50000;
    for (let i = 0; i < 200; i += 1) {
      for (const upgrade of ALL_UPGRADES) {
        state = purchaseNextLevel(state, upgrade).state;
        expect(state.money).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it('refuses to go past level 10', () => {
    let state = createInitialUpgradeState();
    state.money = 1_000_000;
    const cannon = spec('Cannon');
    for (let i = 0; i < 20; i += 1) state = purchaseNextLevel(state, cannon).state;

    expect(getLevel(state, cannon)).toBe(MAX_UPGRADE_LEVEL);
    expect(isMaxed(state, cannon)).toBe(true);
    expect(purchaseNextLevel(state, cannon).purchased).toBe(false);
  });

  it('costs the sum of prices[1..9] to take Cannon from 1 to 10', () => {
    let state = createInitialUpgradeState();
    state.money = 1_000_000;
    const cannon = spec('Cannon');
    const expected = cannon.prices.slice(1).reduce((n, p) => n + p, 0);

    for (let i = 0; i < 9; i += 1) state = purchaseNextLevel(state, cannon).state;
    expect(1_000_000 - state.money).toBe(expected);
  });

  it('keeps categories independent', () => {
    const state = createInitialUpgradeState();
    state.money = 100000;
    const result = purchaseNextLevel(state, spec('Speed'));
    expect(result.state.misc[0]).toBe(1);
    expect(result.state.primary).toEqual(state.primary);
    expect(result.state.secondary).toEqual(state.secondary);
  });
});

describe('getStatValue and the two indexing conventions', () => {
  it('indexes Tank Speed directly by level, including level 0', () => {
    // Tank.as:64 reads upgradeArraySpeed[1][levelsArrayMisc[0]] with no guard.
    const state = createInitialUpgradeState();
    expect(getLevel(state, spec('Speed'))).toBe(0);
    expect(getStatValue(state, spec('Speed'), 0)).toBe(3.25);

    state.misc[0] = 10;
    expect(getStatValue(state, spec('Speed'), 0)).toBe(5.75);
  });

  it('indexes the 10-entry tracks by level - 1', () => {
    const state = createInitialUpgradeState();
    state.misc[1] = 1;
    expect(getStatValue(state, spec('BulletReflect'), 0)).toBe(0.1);

    state.misc[1] = 10;
    expect(getStatValue(state, spec('BulletReflect'), 0)).toBe(0.325);
  });

  it('returns null at level 0 for tracks with no level-0 entry', () => {
    // PartGameArea.as:1557 guards with `levelsArrayMisc[1] == 0` for exactly
    // this reason.
    const state = createInitialUpgradeState();
    expect(getStatValue(state, spec('BulletReflect'), 0)).toBeNull();
  });

  it('returns null for a track that does not exist', () => {
    const state = createInitialUpgradeState();
    expect(getStatValue(state, spec('Cannon'), 99)).toBeNull();
  });

  it('never reads out of bounds at any reachable level', () => {
    const state = createInitialUpgradeState();
    for (const upgrade of ALL_UPGRADES) {
      const levels =
        upgrade.category === 'misc'
          ? state.misc
          : upgrade.category === 'primary'
            ? state.primary
            : state.secondary;
      for (let level = 0; level <= MAX_UPGRADE_LEVEL; level += 1) {
        levels[upgrade.index] = level;
        for (let track = 0; track < upgrade.stats.length; track += 1) {
          const value = getStatValue(state, upgrade, track);
          if (value !== null) expect(Number.isFinite(value), `${upgrade.id} L${level}`).toBe(true);
        }
      }
      levels[upgrade.index] = upgrade.startLevel;
    }
  });
});

describe('maxed counts feeding achievements', () => {
  it('counts nothing on a fresh profile', () => {
    const state = createInitialUpgradeState();
    expect(countMaxedPrimary(state)).toBe(0);
    expect(countMaxedSecondary(state)).toBe(0);
  });

  it('counts only level-10 entries', () => {
    const state = createInitialUpgradeState();
    state.primary[0] = 10;
    state.primary[1] = 9;
    state.primary[2] = 10;
    expect(countMaxedPrimary(state)).toBe(2);
  });

  it('drives MaxedPrimary1 end to end', () => {
    const achievement = getAchievement('MaxedPrimary1');
    if (!achievement) throw new Error('MaxedPrimary1 missing');
    expect(achievement.requirement).toBe(1);

    const state = createInitialUpgradeState();
    expect(evaluate(achievement, countMaxedPrimary(state), -1, 'Easy').won).toBe(false);

    state.primary[0] = 10;
    expect(evaluate(achievement, countMaxedPrimary(state), -1, 'Easy')).toEqual({
      won: true,
      newState: 0,
    });
  });

  it('drives MaxedSecondary3, which needs all 12 maxed', () => {
    const achievement = getAchievement('MaxedSecondary3');
    if (!achievement) throw new Error('MaxedSecondary3 missing');

    const state = createInitialUpgradeState();
    state.secondary = state.secondary.map(() => 10);
    expect(countMaxedSecondary(state)).toBe(12);
    expect(evaluate(achievement, countMaxedSecondary(state), -1, 'Easy').won).toBe(true);
  });
});

describe('lookups', () => {
  it('finds by category and index', () => {
    expect(findUpgrade('primary', 0)?.id).toBe('Cannon');
    expect(findUpgrade('misc', 3)?.id).toBe('KillReload');
    expect(findUpgrade('secondary', 11)?.id).toBe('MagicBunny');
    expect(findUpgrade('primary', 99)).toBeUndefined();
  });

  it('finds by id', () => {
    expect(findUpgradeById('MagicCannon')?.category).toBe('primary');
    expect(findUpgradeById('nope')).toBeUndefined();
  });
});

describe('totalCostToMaxEverything', () => {
  it('sums every price in every table', () => {
    const expected = ALL_UPGRADES.reduce(
      (sum, u) => sum + u.prices.reduce((n, p) => n + p, 0),
      0,
    );
    expect(totalCostToMaxEverything()).toBe(expected);
    expect(totalCostToMaxEverything()).toBeGreaterThan(0);
  });
});
