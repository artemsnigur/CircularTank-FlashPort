/**
 * A sandbox run must leave the save byte-identical.
 *
 * This is the behavioural half of the sandbox guarantee. `sandboxRun.test.ts`
 * checks the flag's *plumbing* by reading source text, which cannot see whether
 * a forwarded argument is actually honoured. This drives a real `PlayerProfile`
 * over a real `SaveStore` and compares the encoded save string before and after,
 * so "nothing was written" is observed rather than inferred.
 *
 * The bug it replaces was precisely a guarantee nobody had checked: `devLevels`
 * promised world 0 could not pollute a save because `recordLevelResult` no-ops
 * on `progress[-1]`. It did no-op. The money write and the `previousWorld` write
 * were never covered by that, went through, and were persisted.
 */
import { beforeEach, describe, expect, it } from 'vitest';
import { bankLevelOutcome } from './levelBanking';
import { TANK_MAX_HP } from './tankDamage';
import { createLevelFlags } from '../achievements/achievementContext';
import { PlayerProfile } from './playerProfile';
import { MemoryBackend, SaveStore } from '../save/SaveStore';
import {
  createInitialUpgradeState,
  findUpgradeById,
  getLevel,
  maxedUpgradeState,
  purchaseNextLevel,
} from '../upgrades/upgradeState';
import type { UpgradeState } from '../upgrades/upgradeState';

const SAVE_KEY = 'saveString';

function freshProfile(): { profile: PlayerProfile; store: SaveStore } {
  const store = new SaveStore('CircularTankSaveTest', new MemoryBackend());
  return { profile: new PlayerProfile(store), store };
}

/** The whole persisted state, as bytes. Nothing subtler is needed. */
function savedBytes(store: SaveStore): string {
  return store.get<string>(SAVE_KEY, '');
}

function richUpgrades(): UpgradeState {
  const state = createInitialUpgradeState();
  return { ...state, money: 1234 };
}

describe('a real run writes', () => {
  let profile: PlayerProfile;
  let store: SaveStore;

  beforeEach(() => {
    ({ profile, store } = freshProfile());
  });

  it('reports that it wrote, and the save changes', () => {
    const before = savedBytes(store);

    const wrote = bankLevelOutcome(profile, {
      sandbox: false,
      autoSelect: true,
      upgrades: richUpgrades(),
      currency: 4321,
      world: 1,
      level: 9,
      difficulty: 'Easy',
      hp: TANK_MAX_HP,
      levelRecord: { mode: 'Normal' as const, flags: createLevelFlags() },
      kills: 0,
      earned: 0,
    });

    expect(wrote.written).toBe(true);
    expect(savedBytes(store)).not.toBe(before);
  });

  it('persists the money, the result and where the player was', () => {
    bankLevelOutcome(profile, {
      sandbox: false,
      autoSelect: true,
      upgrades: richUpgrades(),
      currency: 4321,
      world: 1,
      level: 9,
      difficulty: 'Easy',
      hp: TANK_MAX_HP,
      levelRecord: { mode: 'Normal' as const, flags: createLevelFlags() },
      kills: 0,
      earned: 0,
    });

    // Re-read through a second profile over the same store: this proves the
    // values survived the encode/decode round trip, not just the in-memory set.
    const reloaded = new PlayerProfile(store);
    expect(reloaded.upgrades.money).toBe(4321);
    expect(reloaded.slot.levelSelect.previousWorld).toBe(1);
    expect(reloaded.slot.levelSelect.previousLevel).toBe(9);
    expect(reloaded.slot.levelSelect.previousLevelWon).toBe(true);
  });
});

describe('a sandbox run writes nothing', () => {
  let profile: PlayerProfile;
  let store: SaveStore;

  beforeEach(() => {
    ({ profile, store } = freshProfile());
  });

  it('leaves an untouched save untouched', () => {
    const before = savedBytes(store);

    const wrote = bankLevelOutcome(profile, {
      sandbox: true,
      autoSelect: true,
      upgrades: richUpgrades(),
      currency: 999_999,
      world: 7,
      level: 42,
      difficulty: 'Easy',
      hp: TANK_MAX_HP,
      levelRecord: { mode: 'Normal' as const, flags: createLevelFlags() },
      kills: 0,
      earned: 0,
    });

    expect(wrote.written).toBe(false);
    expect(savedBytes(store)).toBe(before);
  });

  it('leaves an existing save byte-identical', () => {
    // Establish a real save first, so the comparison is against content rather
    // than against the empty string.
    bankLevelOutcome(profile, {
      sandbox: false,
      autoSelect: true,
      upgrades: richUpgrades(),
      currency: 500,
      world: 1,
      level: 3,
      difficulty: 'Easy',
      hp: TANK_MAX_HP,
      levelRecord: { mode: 'Normal' as const, flags: createLevelFlags() },
      kills: 0,
      earned: 0,
    });
    const before = savedBytes(store);
    expect(before).not.toBe('');

    // Now a dev jump into a world the player has never reached, with a fortune.
    bankLevelOutcome(profile, {
      sandbox: true,
      autoSelect: true,
      upgrades: richUpgrades(),
      currency: 999_999,
      world: 9,
      level: 45,
      difficulty: 'Easy',
      hp: TANK_MAX_HP,
      levelRecord: { mode: 'Normal' as const, flags: createLevelFlags() },
      kills: 0,
      earned: 0,
    });

    expect(savedBytes(store)).toBe(before);
  });

  it('does not invent progress in a world the player never reached', () => {
    bankLevelOutcome(profile, {
      sandbox: false,
      autoSelect: true,
      upgrades: richUpgrades(),
      currency: 500,
      world: 1,
      level: 3,
      difficulty: 'Easy',
      hp: TANK_MAX_HP,
      levelRecord: { mode: 'Normal' as const, flags: createLevelFlags() },
      kills: 0,
      earned: 0,
    });

    bankLevelOutcome(profile, {
      sandbox: true,
      autoSelect: true,
      upgrades: richUpgrades(),
      currency: 999_999,
      world: 9,
      level: 45,
      difficulty: 'Easy',
      hp: TANK_MAX_HP,
      levelRecord: { mode: 'Normal' as const, flags: createLevelFlags() },
      kills: 0,
      earned: 0,
    });

    const reloaded = new PlayerProfile(store);
    expect(reloaded.slot.levelSelect.previousWorld).toBe(1);
    expect(reloaded.slot.levelSelect.previousLevel).toBe(3);
    expect(reloaded.upgrades.money).toBe(500);
  });

  it('does not bank a loss either', () => {
    // Losing used to bank the money too — finishing is what counted, not
    // winning. A sandbox loss must still write nothing.
    bankLevelOutcome(profile, {
      sandbox: false,
      autoSelect: true,
      upgrades: richUpgrades(),
      currency: 500,
      world: 1,
      level: 3,
      difficulty: 'Easy',
      hp: TANK_MAX_HP,
      levelRecord: { mode: 'Normal' as const, flags: createLevelFlags() },
      kills: 0,
      earned: 0,
    });
    const before = savedBytes(store);

    bankLevelOutcome(profile, {
      sandbox: true,
      autoSelect: true,
      upgrades: richUpgrades(),
      currency: 7,
      world: 1,
      level: 9,
      difficulty: 'Easy',
      hp: 0,
      levelRecord: { mode: 'Normal' as const, flags: createLevelFlags() },
      kills: 0,
      earned: 0,
    });

    expect(savedBytes(store)).toBe(before);
  });

  it('leaves the in-memory profile alone too, so a retry starts clean', () => {
    const moneyBefore = profile.upgrades.money;

    bankLevelOutcome(profile, {
      sandbox: true,
      autoSelect: true,
      upgrades: richUpgrades(),
      currency: 999_999,
      world: 9,
      level: 45,
      difficulty: 'Easy',
      hp: TANK_MAX_HP,
      levelRecord: { mode: 'Normal' as const, flags: createLevelFlags() },
      kills: 0,
      earned: 0,
    });

    // Not just unpersisted — unset. Otherwise a later non-sandbox save in the
    // same session would flush the sandbox run's money to disk.
    expect(profile.upgrades.money).toBe(moneyBefore);
  });
});

/**
 * The seam between the equipped grant and the shop.
 *
 * Two separately-true facts that needed joining: a maxed upgrade set is only
 * kept out of the save by the banking guard, and a shop purchase calls
 * `profile.save()` directly, bypassing that guard entirely. If the grant were
 * applied to the profile, visiting the shop after a dev jump would flush a maxed
 * loadout to a real save.
 *
 * It is not, and these pin why: `maxedUpgradeState()` returns a detached object
 * that `GameplayScene` holds in its own field, and every shop write reads
 * `profile.upgrades` rather than the scene's copy. The run's grant and the
 * profile never share a reference.
 */
describe('an equipped dev run cannot leak into the shop', () => {
  it('maxedUpgradeState is detached from the profile', () => {
    const { profile } = freshProfile();
    const realBefore = JSON.stringify(profile.upgrades);

    const granted = maxedUpgradeState(profile.upgrades.money);
    // Mutating the grant as hard as possible must not reach the profile.
    granted.primary[0] = 99;
    granted.money = 999_999;

    expect(JSON.stringify(profile.upgrades)).toBe(realBefore);
    expect(profile.upgrades.primary[0]).not.toBe(99);
  });

  it('a shop purchase after an equipped run persists real upgrades, not maxed ones', () => {
    const { profile, store } = freshProfile();

    // A modest real profile with money to spend.
    profile.setUpgrades({ ...createInitialUpgradeState(), money: 5000 });
    profile.save();

    // The dev run: granted a maxed set, and banked as a sandbox (writes nothing).
    const granted = maxedUpgradeState(profile.upgrades.money);
    bankLevelOutcome(profile, {
      sandbox: true,
      autoSelect: true,
      upgrades: granted,
      currency: 999_999,
      world: 9,
      level: 45,
      difficulty: 'Easy',
      hp: TANK_MAX_HP,
      levelRecord: { mode: 'Normal' as const, flags: createLevelFlags() },
      kills: 0,
      earned: 0,
    });

    // Now the shop, which reads the profile and saves directly — exactly the
    // path that bypasses the banking guard.
    const cannon = findUpgradeById('MiniGun')!;
    const result = purchaseNextLevel(profile.upgrades, cannon);
    expect(result.purchased).toBe(true);
    profile.setUpgrades(result.state);
    profile.save();

    // What landed on disk is the real profile plus that one purchase — not the
    // maxed grant, and not the sandbox run's fortune.
    const reloaded = new PlayerProfile(store);
    expect(reloaded.upgrades.money).toBeLessThan(5000);
    expect(reloaded.upgrades.money).not.toBe(999_999);
    expect(getLevel(reloaded.upgrades, cannon)).toBe(1);
    // Everything else is still at its starting level, i.e. not maxed.
    expect(getLevel(reloaded.upgrades, findUpgradeById('BigCannon')!)).toBe(0);
  });
});

describe('the level guide follows a finished level only when auto-select is on', () => {
  /**
   * `ScreenStatus.as:512-515` — `if (LevelGuide.autoSelect)` re-points the
   * guide at the upcoming level; the `else` branch only refreshes bounds.
   *
   * **Driven as a pair on the same win**, because either half alone passes for
   * the wrong reason: a build that always re-points satisfies the first
   * assertion, and one that never does satisfies the second. The port shipped
   * the "never" version for one commit and it looked entirely plausible — the
   * guide simply sat a level behind with "Previous" lit.
   */
  const win = (autoSelect: boolean) => {
    const { profile } = freshProfile();
    bankLevelOutcome(profile, {
      sandbox: false,
      autoSelect,
      upgrades: richUpgrades(),
      currency: 1234,
      world: 1,
      level: 1,
      difficulty: 'Easy',
      hp: 100,
      levelRecord: { mode: 'Normal', flags: {} as never },
      kills: 10,
      earned: 100,
    });
    return profile;
  };

  it('re-points at the upcoming level when on', () => {
    const guide = win(true).levelGuide;
    expect(guide.type).toBe('Upcoming');
    // 1-1 cleared, so upcoming is 1-2 — and the bound moved with it.
    expect({ world: guide.selectedWorld, level: guide.selectedLevel }).toEqual({
      world: 1,
      level: 2,
    });
  });

  it('leaves the selection alone when off', () => {
    const guide = win(false).levelGuide;
    expect({ world: guide.selectedWorld, level: guide.selectedLevel }).toEqual({
      world: 1,
      level: 1,
    });
    // The bounds still move — they are derived from progress on every read,
    // which is the `else` branch's `setMaxWorld`/`setMaxLevel`.
    expect(guide.maxLevel).toBe(2);
  });
});

/**
 * ── A loss is not a completion, T213 ──────────────────────────────────────
 *
 * `PartGameArea.levelDone` is set inside the wave-complete branch (`:2708`,
 * `:2774`); a death goes down another path and never sets it. Four of the nine
 * Boolean achievements test it.
 *
 * The scene used to pass `completed: true` for any finish. Three of the four
 * were saved by accident — losing puts hp at 0 and the `hp < 95` rule clears
 * their flags — but `Idle` reads `nothingPressed`, which that rule does not
 * touch, so sitting still until the tank died awarded it.
 */
describe('a lost level completes nothing', () => {
  const idleRun = (hp: number) => {
    const store = new SaveStore('idle-run', new MemoryBackend());
    const profile = new PlayerProfile(store);
    return bankLevelOutcome(profile, {
      sandbox: false,
      autoSelect: false,
      upgrades: profile.upgrades,
      currency: 0,
      world: 1,
      level: 1,
      difficulty: 'Easy',
      hp,
      // Never pressed anything — the flag starts true and nothing cleared it.
      levelRecord: { mode: 'Normal' as const, flags: createLevelFlags() },
      kills: 0,
      earned: 0,
    });
  };

  it('does not award Idle for dying without pressing anything', () => {
    expect(idleRun(0).newAchievements).not.toContain('Idle');
  });

  it('still awards it for actually finishing that way', () => {
    /*
     * The counterpart, and the one that makes the negative mean something: on
     * the *identical* input but a surviving hp, Idle is earned. Without this,
     * "Idle is not awarded" would pass just as well if the achievement were
     * unreachable.
     */
    expect(idleRun(TANK_MAX_HP).newAchievements).toContain('Idle');
  });
});
