/**
 * The shop — `ScreenUpgrades.as`.
 *
 * The grid is React; this scene owns the *transaction*. It reads the profile,
 * publishes a catalogue with every figure precomputed, applies purchases
 * through `purchaseNextLevel`, and persists.
 *
 * ── Why the rules live here and not in the component ──────────────────────
 * React never reads the profile — it is in the Phaser registry — and it must
 * never decide whether something is affordable. `upgradeState` owns the cost
 * curve and the level cap; the screen renders what it is told. A cost computed
 * in the UI would be a second source of truth for 1173 balance values.
 *
 * ── Purchases are authoritative here ──────────────────────────────────────
 * `ui:buy-upgrade` carries only an id. The scene re-reads the live state and
 * calls `purchaseNextLevel`, which refuses when the player cannot afford it,
 * so a stale or forged event cannot produce a negative balance.
 *
 * ── Equipping is authoritative here too ───────────────────────────────────
 * `ButtonEquipSlot` and `ButtonEquip` are the AS3's equip controls, and both
 * are added to the stage only inside `if (levelsArray[selectedWeapon - 1] != 0)`
 * (`ScreenUpgrades.as:1079`, `:1414`) — the owned branch. That `!= 0` is the
 * whole ownership gate; the buttons themselves never check. Reproduced with the
 * check on this side rather than the button's, for the same reason purchases
 * are: hiding a control is not a refusal.
 *
 * ── Not ported ────────────────────────────────────────────────────────────
 * The per-upgrade description text and the stat previews.
 */
import Phaser from 'phaser';
import { SceneKeys } from '../config/constants';
import { GameEvents } from '../events/GameEvents';
import { applyViewportToScene, getViewportController } from '../systems/ViewportController';
import { getPlayerProfile } from '../player/playerProfile';
import { MAX_UPGRADE_LEVEL } from '../upgrades/upgradeData';
import { isPurchasable, purchasableUpgrades, withheldUpgrades } from '../upgrades/purchasable';
import {
  findUpgradeById,
  getLevel,
  nextLevelCost,
  purchaseNextLevel,
} from '../upgrades/upgradeState';
import { getSoundManager } from '../audio/soundService';
import { equipPrimary, equipSecondary, NO_WEAPON } from '../loadout/loadout';
import type { LoadoutState } from '../loadout/loadout';
import { previewLines } from '../upgrades/upgradePreview';

/**
 * Which slot holds a named primary, or null.
 *
 * Display names, because that is what `ScreenGame.equippedWeapons` stores —
 * "Big Cannon", not the `BigCannon` upgrade id.
 */
function slotHolding(loadout: LoadoutState, name: string): 1 | 2 | null {
  if (name === NO_WEAPON) return null;
  if (loadout.equippedWeapons[0] === name) return 1;
  if (loadout.equippedWeapons[1] === name) return 2;
  return null;
}

export class UpgradesScene extends Phaser.Scene {
  private backdrop!: Phaser.GameObjects.TileSprite;

  constructor() {
    super(SceneKeys.Upgrades);
  }

  create(): void {
    const controller = getViewportController(this);
    if (controller) applyViewportToScene(this, controller.current);

    const camera = this.cameras.main;
    this.backdrop = this.add
      .tileSprite(0, 0, camera.width / camera.zoom, camera.height / camera.zoom, 'ground-desert')
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setAlpha(0.25);

    this.publishCatalogue();

    const offBuy = GameEvents.subscribe('ui:buy-upgrade', ({ id }) => this.buy(id));
    const offEquipPrimary = GameEvents.subscribe('ui:equip-primary', ({ slot, id }) =>
      this.equip(id, slot),
    );
    const offEquipSecondary = GameEvents.subscribe('ui:equip-secondary', ({ id }) =>
      this.equip(id, null),
    );
    const offGrant = GameEvents.subscribe('ui:dev-grant-money', ({ amount }) =>
      this.grantMoney(amount),
    );
    const offGoto = GameEvents.subscribe('ui:goto', ({ key }) => {
      if (key !== SceneKeys.Upgrades) this.scene.start(key);
    });
    const onResize = (): void => {
      const c = getViewportController(this);
      if (c) applyViewportToScene(this, c.current);
      this.backdrop.setSize(camera.width / camera.zoom, camera.height / camera.zoom);
    };
    GameEvents.on('viewport:changed', onResize);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      offBuy();
      offEquipPrimary();
      offEquipSecondary();
      offGrant();
      offGoto();
      GameEvents.off('viewport:changed', onResize);
      GameEvents.emit('scene:shutdown', { key: SceneKeys.Upgrades });
    });

    GameEvents.emit('scene:ready', { key: SceneKeys.Upgrades });
  }

  /** Everything the shop rows need, computed from the ported rules. */
  private publishCatalogue(): void {
    const profile = getPlayerProfile(this);
    const state = profile.upgrades;
    const loadout = profile.loadout;

    GameEvents.emit('upgrades:listed', {
      money: state.money,
      // Only what actually does something. ALL_UPGRADES included two misc
      // upgrades with no reader and eleven unported secondaries, all buyable.
      upgrades: purchasableUpgrades().map((spec) => {
        const level = getLevel(state, spec);
        const cost = nextLevelCost(state, spec);
        return {
          id: spec.id,
          name: spec.name,
          category: spec.category,
          level,
          maxLevel: MAX_UPGRADE_LEVEL,
          cost,
          affordable: cost !== null && state.money >= cost,
          owned: level > 0,
          // Matched on the display name, which is what the loadout stores —
          // `ScreenGame.equippedWeapons` holds "Big Cannon", not "BigCannon".
          slot: slotHolding(loadout, spec.name),
          equipped: spec.category === 'secondary' && loadout.secondaryWeapon === spec.name,
          // The five stat lines, computed here because this is where the level
          // and the stat tracks both are. `spec.index` is 0-based; the AS3's
          // `selectedMisc`/`selectedWeapon`/`selectedSecondary` are 1-based, so
          // the +1 is the same offset `upgradePreviewData` records.
          // 0-based here, 1-based in the AS3 selectors — the same offset the
          // preview and description tables are keyed by.
          index: spec.index,
          previews: previewLines(spec, spec.category, spec.index + 1, level),
        };
      }),
      withheld: withheldUpgrades().length,
    });
  }

  /**
   * DEV-AID: adds money and persists it straight away.
   *
   * Deliberately bypasses the "takings bank only when a level finishes" rule.
   * That rule exists so quitting mid-level forfeits its earnings; a dev grant
   * has no level to finish, so routing it through the same path would mean
   * playing one to keep it. Gated on `import.meta.env.DEV`, and the button
   * that emits this is too.
   */
  private grantMoney(amount: number): void {
    if (!import.meta.env.DEV) return;

    const profile = getPlayerProfile(this);
    profile.setUpgrades({ ...profile.upgrades, money: profile.upgrades.money + amount });
    profile.save();

    console.info(`[UpgradesScene] Dev: +${amount} coins, saved.`);
    this.publishCatalogue();
  }

  /**
   * Applies a purchase, or does nothing.
   *
   * `purchaseNextLevel` returns the untouched state when the upgrade is maxed
   * or unaffordable, so an unaffordable click is a no-op rather than an error.
   */
  /**
   * Puts an owned weapon into a slot — `ButtonEquipSlot`/`ButtonEquip`.
   *
   * `slot` names a primary slot, or null for the single secondary slot.
   *
   * Ownership is re-checked against live state rather than trusted from the
   * event, matching `buy`: the catalogue decides what is *shown*, this decides
   * what may be *equipped*, and an id can arrive from a stale screen or a
   * replayed event. Equipping something unbought would let a player fire a
   * weapon they never paid for — `resolveWeaponStats` returns null at level 0,
   * so the tank would silently stop firing instead.
   *
   * There is no unequip, faithfully: `onPressHandler` assigns unconditionally
   * and no AS3 control empties a slot.
   */
  private equip(id: string, slot: 1 | 2 | null): void {
    const spec = findUpgradeById(id);
    if (!spec) {
      console.warn(`[UpgradesScene] Unknown upgrade "${id}".`);
      return;
    }

    const wanted = slot === null ? 'secondary' : 'primary';
    if (spec.category !== wanted) {
      console.warn(`[UpgradesScene] "${id}" is not a ${wanted}.`);
      return;
    }

    const profile = getPlayerProfile(this);
    if (getLevel(profile.upgrades, spec) === 0) {
      console.warn(`[UpgradesScene] "${id}" is not owned; refusing to equip it.`);
      return;
    }

    profile.setLoadout(
      slot === null
        ? equipSecondary(profile.loadout, spec.name)
        : equipPrimary(profile.loadout, slot, spec.name),
    );
    profile.save();

    getSoundManager(this)?.queue('InterfaceButtonClick');
    this.publishCatalogue();
  }

  private buy(id: string): void {
    const spec = findUpgradeById(id);
    if (!spec) {
      console.warn(`[UpgradesScene] Unknown upgrade "${id}".`);
      return;
    }

    // Guarded here as well as in the catalogue, because these are two different
    // rules: the catalogue decides what is *shown*, this decides what may be
    // *bought*. `ui:buy-upgrade` carries an id from anywhere — a stale screen, a
    // replayed event, a console — and hiding a button is not a refusal. Taking
    // money for an upgrade with no reader is the defect; not rendering it is
    // only the visible half.
    if (!isPurchasable(spec)) {
      console.warn(`[UpgradesScene] "${id}" is not purchasable: it has no runtime effect.`);
      return;
    }

    const profile = getPlayerProfile(this);
    const result = purchaseNextLevel(profile.upgrades, spec);
    if (!result.purchased) return;

    profile.setUpgrades(result.state);
    // A purchase is one of the AS3's defined save moments.
    profile.save();

    // `InterfaceButtonMoney` is the AS3's spend sound.
    getSoundManager(this)?.queue('InterfaceButtonMoney');
    this.publishCatalogue();
  }
}
