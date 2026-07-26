/**
 * The player profile — the link between the persistence layer and gameplay.
 *
 * These tests exercise the round trip through the *real* codecs rather than
 * stubbing them, because the point of this module is that those codecs are
 * finally reached. A test that mocked `saveSlot` would prove nothing about the
 * gap it was written to close.
 */
import { describe, expect, it } from 'vitest';
import { PlayerProfile, SAVE_STRING_KEY, ACTIVE_SLOT } from './playerProfile';
import {
  LocalStorageBackend,
  MemoryBackend,
  SaveStore,
  saveSlotStoreName,
} from '../save/SaveStore';
import { createInitialSaveSlot } from '../save/saveSlot';
import {
  chooseWeapon,
  createInitialLoadout,
  equipPrimary,
  equipSecondary,
} from '../loadout/loadout';
import { purchaseNextLevel, createInitialUpgradeState } from '../upgrades/upgradeState';
import { findUpgradeById } from '../upgrades/upgradeState';

function freshStore(): SaveStore {
  return new SaveStore(saveSlotStoreName(ACTIVE_SLOT), new MemoryBackend());
}

describe('a new profile', () => {
  it('starts from the initial save slot', () => {
    const profile = new PlayerProfile(freshStore());
    expect(profile.upgrades).toEqual(createInitialSaveSlot().upgrades);
    expect(profile.loadout).toEqual(createInitialLoadout());
  });

  it('starts with the Cannon and the Mine equipped', () => {
    // `ScreenGame.as` initialisers — what gameplay reads on a fresh save.
    const profile = new PlayerProfile(freshStore());
    expect(profile.loadout.primaryWeapon).toBe('Cannon');
    expect(profile.loadout.secondaryWeapon).toBe('Mine');
  });

  it('starts with no money', () => {
    expect(new PlayerProfile(freshStore()).upgrades.money).toBe(0);
  });
});

describe('persistence', () => {
  it('round-trips upgrades through the real codec', () => {
    const store = freshStore();
    const profile = new PlayerProfile(store);

    profile.setUpgrades({ ...profile.upgrades, money: 1234 });
    profile.save(new Date('2026-01-01T00:00:00Z'));

    // A second profile over the same storage sees the saved value.
    const reloaded = new PlayerProfile(store);
    expect(reloaded.upgrades.money).toBe(1234);
  });

  it('round-trips the loadout', () => {
    const store = freshStore();
    const profile = new PlayerProfile(store);

    // Equipping fills the slot; choosing promotes it to the active weapon.
    // Gameplay reads `primaryWeapon`, so both are needed — omitting the second
    // is exactly the bug this caught in GameplayScene.cycleWeapon.
    profile.setLoadout(chooseWeapon(equipPrimary(profile.loadout, 1, 'Laser Cannon'), 1));
    profile.setLoadout(equipSecondary(profile.loadout, 'Grenade'));
    profile.save(new Date('2026-01-01T00:00:00Z'));

    const reloaded = new PlayerProfile(store);
    expect(reloaded.loadout.equippedWeapons[0]).toBe('Laser Cannon');
    expect(reloaded.loadout.primaryWeapon).toBe('Laser Cannon');
    expect(reloaded.loadout.secondaryWeapon).toBe('Grenade');
  });

  it('round-trips purchased upgrade levels', () => {
    const store = freshStore();
    const profile = new PlayerProfile(store);

    // Buy something for real rather than poking the array.
    const funded = { ...createInitialUpgradeState(), money: 100_000 };
    const result = purchaseNextLevel(funded, findUpgradeById('MiniGun')!);
    expect(result.state.primary[1]).toBeGreaterThan(funded.primary[1]);

    profile.setUpgrades(result.state);
    profile.save(new Date('2026-01-01T00:00:00Z'));

    const reloaded = new PlayerProfile(store);
    expect(reloaded.upgrades.primary).toEqual(result.state.primary);
  });

  it('writes nothing until save is called', () => {
    const store = freshStore();
    const profile = new PlayerProfile(store);
    profile.setUpgrades({ ...profile.upgrades, money: 999 });

    expect(new PlayerProfile(store).upgrades.money).toBe(0);
  });

  it('persists across a store rebuilt on the same backend', () => {
    // Models a page reload: same localStorage, brand new SaveStore.
    const backend = new MemoryBackend();
    const name = saveSlotStoreName(ACTIVE_SLOT);

    const first = new PlayerProfile(new SaveStore(name, backend));
    first.setUpgrades({ ...first.upgrades, money: 4321 });
    first.save(new Date('2026-01-01T00:00:00Z'));

    const second = new PlayerProfile(new SaveStore(name, backend));
    expect(second.upgrades.money).toBe(4321);
  });
});

describe('surviving bad data', () => {
  it('falls back to a fresh profile on an undecodable save', () => {
    const store = freshStore();
    store.set(SAVE_STRING_KEY, 'this is not a save string');
    store.flush();

    // Must not throw: refusing to boot is worse than losing one save.
    const profile = new PlayerProfile(store);
    expect(profile.upgrades.money).toBe(0);
    expect(profile.loadout.primaryWeapon).toBe('Cannon');
  });

  it('treats an empty save string as a new player', () => {
    const store = freshStore();
    store.set(SAVE_STRING_KEY, '');
    expect(new PlayerProfile(store).loadout).toEqual(createInitialLoadout());
  });
});

describe('surviving a page reload', () => {
  // Against the *real* backend and jsdom's localStorage, not MemoryBackend —
  // the MemoryBackend tests above would pass even if LocalStorageBackend
  // silently fell back to memory, which is the failure this rules out.
  const storeName = saveSlotStoreName(ACTIVE_SLOT);

  it('leaves bytes in localStorage that a fresh boot reads back', () => {
    window.localStorage.clear();

    const before = new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend()));
    before.setUpgrades({ ...before.upgrades, money: 777 });
    before.save(new Date('2026-01-01T00:00:00Z'));

    // Something is genuinely on disk under the slot's own store name.
    const raw = window.localStorage.getItem(storeName);
    expect(raw).not.toBeNull();
    expect(raw).toContain('m=777');

    // A brand-new profile — as a page reload builds — sees it.
    const after = new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend()));
    expect(after.upgrades.money).toBe(777);
  });

  it('models the scene: opening balance in, new total out', () => {
    window.localStorage.clear();

    // Level one: start from nothing, earn 120, bank it.
    const first = new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend()));
    let currency = first.upgrades.money;
    expect(currency).toBe(0);
    currency += 120;
    first.setUpgrades({ ...first.upgrades, money: currency });
    first.save(new Date('2026-01-01T00:00:00Z'));

    // Reload. Level two opens on the banked total, not on zero — the bug was
    // that the counter reset to 0 and made persistence look broken.
    const second = new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend()));
    currency = second.upgrades.money;
    expect(currency).toBe(120);

    currency += 80;
    second.setUpgrades({ ...second.upgrades, money: currency });
    second.save(new Date('2026-01-02T00:00:00Z'));

    // Assigned, not accumulated — an added total would read 320 here.
    const third = new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend()));
    expect(third.upgrades.money).toBe(200);
  });
});

describe('quitting mid-level forfeits its takings', () => {
  const storeName = saveSlotStoreName(ACTIVE_SLOT);

  /** Models a level: opens on the banked balance, earns, maybe commits. */
  function playLevel(profile: PlayerProfile, earned: number, finished: boolean) {
    const opening = profile.upgrades.money;
    const currency = opening + earned;
    // The scene writes the profile only when the level finishes.
    if (finished) {
      profile.setUpgrades({ ...profile.upgrades, money: currency });
      profile.save(new Date('2026-01-01T00:00:00Z'));
    }
    return { opening, currency };
  }

  it('keeps the earnings when the level is seen through', () => {
    window.localStorage.clear();
    const profile = new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend()));

    playLevel(profile, 150, true);

    expect(
      new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend())).upgrades.money,
    ).toBe(150);
  });

  it('forfeits them when the level is abandoned', () => {
    window.localStorage.clear();
    const profile = new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend()));

    playLevel(profile, 150, false);

    expect(
      new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend())).upgrades.money,
    ).toBe(0);
  });

  it('forfeits only the abandoned level, not the banked balance', () => {
    window.localStorage.clear();
    const profile = new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend()));

    playLevel(profile, 200, true); // banked
    const abandoned = playLevel(profile, 90, false); // quit

    // The HUD showed 290 mid-level; the balance actually held is 200.
    expect(abandoned.currency).toBe(290);
    expect(abandoned.opening).toBe(200);
    expect(
      new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend())).upgrades.money,
    ).toBe(200);
  });

  it('banks on a loss too — finishing is what counts, not winning', () => {
    window.localStorage.clear();
    const profile = new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend()));

    // The scene banks on `outcome.finished`, which covers won and lost alike.
    playLevel(profile, 60, true);

    expect(
      new PlayerProfile(new SaveStore(storeName, new LocalStorageBackend())).upgrades.money,
    ).toBe(60);
  });
});

describe('what gameplay reads', () => {
  it('exposes the same upgrade object gameplay mutates', () => {
    // GameplayScene grants dev weapons by writing into `profile.upgrades`, so
    // the reference has to be live rather than a copy.
    const profile = new PlayerProfile(freshStore());
    const upgrades = profile.upgrades;
    upgrades.primary[1] = 1;
    expect(profile.upgrades.primary[1]).toBe(1);
  });

  it('banks level takings the way the scene does', () => {
    const store = freshStore();
    const profile = new PlayerProfile(store);

    const earned = 250;
    profile.setUpgrades({ ...profile.upgrades, money: profile.upgrades.money + earned });
    profile.save(new Date('2026-01-01T00:00:00Z'));

    expect(new PlayerProfile(store).upgrades.money).toBe(250);
  });
});
