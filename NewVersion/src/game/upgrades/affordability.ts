/**
 * Publishing `ButtonUpgrades`' affordance hint — the one line every menu scene
 * calls as it opens.
 *
 * ── Why it is a helper and not five copies ────────────────────────────────
 * The AS3's button answers this for itself in `added()`, reading
 * `ScreenUpgrades`' statics (`ButtonUpgrades.as:126-197`). Those are global, so
 * every screen's bar gets the same answer for free.
 *
 * This port has no global the DOM can read: the profile lives in the Phaser
 * registry and React reaches it only through the store. So the answer has to be
 * published, and it has to be published from each screen that shows the bar —
 * which is exactly the shape that invites five slightly different copies of the
 * same three loops. One function, five call sites, one rule underneath
 * (`canAffordAnyUpgrade`, which is itself built on `canAfford`).
 */
import type Phaser from 'phaser';

import { GameEvents } from '../events/GameEvents';
import { getPlayerProfile } from '../player/playerProfile';
import { canAffordAnyUpgrade } from './upgradeState';
import { purchasableUpgrades } from './purchasable';

/**
 * Emits whether anything in the shop is worth opening it for.
 *
 * Scoped to `purchasableUpgrades()`, not every spec: the catalogue already
 * excludes two misc upgrades with no reader and eleven unported secondaries,
 * and a badge pointing at something the shop does not sell would send the
 * player to a screen with nothing on it.
 */
export function publishAffordable(scene: Phaser.Scene): void {
  const profile = getPlayerProfile(scene);
  GameEvents.emit('upgrades:affordable', {
    affordable: canAffordAnyUpgrade(profile.upgrades, purchasableUpgrades()),
  });
}
