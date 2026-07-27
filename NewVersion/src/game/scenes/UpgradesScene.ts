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
 * ── Not ported ────────────────────────────────────────────────────────────
 * The two-slot equip UI (`ButtonEquipSlot`), which decides *which* owned
 * primaries go into the tank's two slots. Buying makes a weapon owned; Q in
 * Gameplay still chooses between owned ones. Also the per-upgrade description
 * text and the stat previews.
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
        };
      }),
      withheld: withheldUpgrades().length,
    });
  }

  /**
   * Dev-only: adds money and persists it straight away.
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
