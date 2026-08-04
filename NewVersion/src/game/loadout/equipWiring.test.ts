/**
 * The equip screen's wiring, and the three gameplay rules it changes.
 *
 * The model is pure and covered in `loadout.test.ts`. This covers the seam: who
 * is allowed to equip, what the shop publishes, and the parts of
 * `GameplayScene` that stop being safe once slots can actually differ.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  chooseWeapon,
  createInitialLoadout,
  equipPrimary,
  equipSecondary,
  nextSlot,
  NO_WEAPON,
  resolveActivePrimary,
  resolveActiveSlot,
} from './loadout';
import { PlayerProfile, ACTIVE_SLOT } from '../player/playerProfile';
import { MemoryBackend, SaveStore, saveSlotStoreName } from '../save/SaveStore';
import {
  createInitialUpgradeState,
  findUpgradeById,
  getLevel,
  purchaseNextLevel,
} from '../upgrades/upgradeState';
import { PRIMARY_UPGRADES } from '../upgrades/upgradeData';
import { resolveWeaponStats, PRIMARY_WEAPONS, getWeapon } from '../weapons/firing';

const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
const SHOP = readFileSync('src/game/scenes/UpgradesScene.ts', 'utf8');

const profile = (backend = new MemoryBackend()) =>
  new PlayerProfile(new SaveStore(saveSlotStoreName(ACTIVE_SLOT), backend));

describe('ownership is the gate, and it is re-checked on this side', () => {
  it('only Cannon and Mine start owned', () => {
    // The `cycleWeapon` comment used to claim MiniGun was granted so it could
    // be tried. Its startLevel is 0 and it costs 1300 — it is bought like the
    // rest.
    const state = createInitialUpgradeState();
    const owned = PRIMARY_UPGRADES.filter((u) => getLevel(state, u) > 0).map((u) => u.id);

    expect(owned).toEqual(['Cannon']);
    expect(getLevel(state, findUpgradeById('MiniGun')!)).toBe(0);
    expect(findUpgradeById('MiniGun')!.prices[0]).toBe(1300);
  });

  it('level 0 is exactly what makes a weapon unfireable', () => {
    // The same test the shop's `owned` flag uses, and the reason equipping an
    // unbought weapon would silently stop the tank firing rather than error.
    const fresh = createInitialUpgradeState();
    const bigCannon = getWeapon('Big Cannon')!;

    expect(resolveWeaponStats(bigCannon, fresh)).toBeNull();

    const bought = purchaseNextLevel(
      { ...fresh, money: 999_999 },
      findUpgradeById('BigCannon')!,
    );
    expect(bought.purchased).toBe(true);
    expect(resolveWeaponStats(bigCannon, bought.state)).not.toBeNull();
  });

  it('the scene refuses an unowned id rather than trusting the event', () => {
    // Same policy as `buy`: hiding a control is not a refusal, and the id can
    // arrive from a stale screen or a replayed event.
    expect(SHOP).toContain("if (getLevel(profile.upgrades, spec) === 0) {");
    expect(SHOP).toContain('is not owned; refusing to equip it');
    // And it must be the right kind of upgrade for the slot asked for.
    expect(SHOP).toContain("const wanted = slot === null ? 'secondary' : 'primary';");
  });

  it('there is no unequip event at all', () => {
    // `ButtonEquipSlot.onPressHandler` assigns unconditionally; nothing in the
    // AS3 empties a slot. An unequip control would be an invention.
    const events = readFileSync('src/game/events/GameEvents.ts', 'utf8');
    expect(events).toContain("'ui:equip-primary'");
    expect(events).toContain("'ui:equip-secondary'");
    expect(events).not.toContain("'ui:unequip");
  });
});

describe('what the shop publishes', () => {
  it('marks which slot holds each primary, by display name', () => {
    // The loadout stores "Big Cannon", the upgrade id is "BigCannon". Matching
    // on the id would report every primary as unequipped.
    expect(SHOP).toContain('slot: slotHolding(loadout, spec.name)');
    expect(SHOP).toContain("loadout.equippedWeapons[0] === name");
  });

  it('marks the equipped secondary, and only for secondaries', () => {
    expect(SHOP).toContain(
      "equipped: spec.category === 'secondary' && loadout.secondaryWeapon === spec.name",
    );
  });

  it('republishes after an equip, so the buttons move', () => {
    const body = SHOP.slice(SHOP.indexOf('private equip('), SHOP.indexOf('private buy('));
    expect(body).toContain('profile.setLoadout(');
    expect(body).toContain('profile.save();');
    expect(body).toContain('this.publishCatalogue();');
  });

  it('persists immediately, as SaveManager.saveEquips does', () => {
    const backend = new MemoryBackend();
    const first = profile(backend);

    first.setLoadout(equipPrimary(first.loadout, 2, 'Shotgun'));
    first.save(new Date('2026-01-01T00:00:00Z'));

    expect(profile(backend).loadout.equippedWeapons).toEqual(['Cannon', 'Shotgun']);
  });

  it('a secondary choice round-trips too', () => {
    const backend = new MemoryBackend();
    const first = profile(backend);

    first.setLoadout(equipSecondary(first.loadout, 'Mine'));
    first.save(new Date('2026-01-01T00:00:00Z'));

    expect(profile(backend).loadout.secondaryWeapon).toBe('Mine');
  });
});

/**
 * The equip-then-play-the-old-weapon bug.
 *
 * `ButtonEquipSlot` writes a slot and never touches `primaryWeapon`, so the two
 * disagree the moment an equip screen exists. `ScreenGame.as:460` re-derives on
 * every level start; the port read the stored value.
 */
describe('the level start re-derives the weapon', () => {
  it('plays what is in the slot, not what the save last named', () => {
    const stale = {
      ...equipPrimary(createInitialLoadout(), 1, 'Shotgun'),
      primaryWeapon: 'Cannon',
    };

    expect(stale.primaryWeapon).toBe('Cannon');
    expect(resolveActivePrimary(stale)).toBe('Shotgun');
  });

  it('the scene uses the derived value', () => {
    expect(SCENE).toContain('this.currentSlot = resolveActiveSlot(this.profile.loadout);');
    // Matched on the operand rather than the whole line. It pinned the exact
    // call and broke in T41 when `?primary=` added a `devPrimary ??` in front —
    // a correct change reportable only as a failure, which is the known cost of
    // pinning a spelling. The rule that survives is that the *derived* value is
    // what reaches `getWeapon`, and that the stored field is never read back.
    expect(SCENE).toContain('resolveActivePrimary(this.profile.loadout)');
    expect(SCENE).toMatch(/this\.weapon = getWeapon\([^)]*resolveActivePrimary/);
    // The stored field must not be read back for this.
    expect(SCENE).not.toContain('getWeapon(this.profile.loadout.primaryWeapon)');
  });

  it('survives a save round trip with a slot-1 equip', () => {
    const backend = new MemoryBackend();
    const first = profile(backend);

    first.setLoadout(equipPrimary(first.loadout, 1, 'Shotgun'));
    first.save(new Date('2026-01-01T00:00:00Z'));

    const reloaded = profile(backend).loadout;
    expect(reloaded.equippedWeapons[0]).toBe('Shotgun');
    expect(resolveActivePrimary(reloaded)).toBe('Shotgun');
  });
});

/**
 * Q, as `ScreenGame.update` has it.
 */
describe('the weapon toggle in the scene', () => {
  it('refuses when the other slot is empty, changing nothing at all', () => {
    // Not the weapon, not the slot, not the reload, not even a sound. The early
    // return is before every one of those.
    const body = SCENE.slice(SCENE.indexOf('private cycleWeapon()'));
    const guard = body.indexOf('if (target === null) return;');

    expect(guard).toBeGreaterThan(-1);
    for (const effect of [
      'this.currentSlot = target;',
      'this.weapon = next;',
      'this.firing.reloadTime = stats.reloadTimeMax;',
      "queue('WeaponChange')",
      "GameEvents.emit('ammo:changed'",
    ]) {
      expect(body.indexOf(effect), effect).toBeGreaterThan(guard);
    }
  });

  it('pays the incoming weapon full reload, not zero and not the old one', () => {
    // The AS3 writes reloadTime twice and the second overwrites the first, so
    // only the incoming weapon's max survives (:506/:511 after chooseWeapon).
    expect(SCENE).toContain('this.firing.reloadTime = stats.reloadTimeMax;');
    // The two earlier readings, both wrong.
    const body = SCENE.slice(SCENE.indexOf('private cycleWeapon()'));
    expect(body).not.toContain('this.firing = createFiringState()');
  });

  it('switches without changing what is in the slots', () => {
    // Switching is not equipping: chooseWeapon moves the active weapon, the
    // contents stay put.
    const both = equipPrimary(createInitialLoadout(), 2, 'Shotgun');
    const switched = chooseWeapon(both, 2);

    expect(switched.equippedWeapons).toEqual(both.equippedWeapons);
    expect(switched.primaryWeapon).toBe('Shotgun');
  });

  it('no longer walks every ported primary', () => {
    // The ring made the slots decorative. It is gone, and so is the import it
    // needed.
    const body = SCENE.slice(SCENE.indexOf('private cycleWeapon()'));
    expect(body).not.toContain('Object.keys(PRIMARY_WEAPONS)');
    expect(SCENE).not.toContain('  PRIMARY_WEAPONS,');
    // Still twelve of them; the toggle just does not iterate them.
    expect(Object.keys(PRIMARY_WEAPONS).length).toBeGreaterThan(2);
  });

  it('a default loadout cannot toggle at all', () => {
    // One weapon, one slot. The player has to visit the shop for a second.
    const fresh = createInitialLoadout();
    expect(resolveActiveSlot(fresh)).toBe(1);
    expect(nextSlot(fresh, 1)).toBeNull();
  });

  it('two equipped weapons toggle back and forth forever', () => {
    let state = equipPrimary(createInitialLoadout(), 2, 'Shotgun');
    let slot = resolveActiveSlot(state);

    for (const expected of [2, 1, 2, 1] as const) {
      const target = nextSlot(state, slot);
      expect(target).toBe(expected);
      slot = target!;
      state = chooseWeapon(state, slot);
    }
    expect(state.primaryWeapon).toBe('Cannon');
    expect(state.equippedWeapons).toEqual(['Cannon', 'Shotgun']);
  });

  it('refuses a slot holding something unfireable', () => {
    // An equipped-but-unowned weapon cannot happen through the UI, but a
    // hand-edited save could carry one, and firing must not silently stop.
    const fresh = createInitialUpgradeState();
    expect(resolveWeaponStats(getWeapon('Shotgun')!, fresh)).toBeNull();
    expect(SCENE).toContain('which cannot be fired');
  });

  it('the slot is scene state, never read from the save', () => {
    // The save stores slot *contents*; which one is in hand is derived at level
    // start and toggled in play.
    expect(SCENE).toContain('private currentSlot: 1 | 2 = 1;');
    expect(NO_WEAPON).toBe('None');
  });
});
