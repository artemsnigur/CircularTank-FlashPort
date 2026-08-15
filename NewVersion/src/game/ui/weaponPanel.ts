/**
 * Which picture the HUD's weapon icons show — `WeaponInterface.update`
 * (`WeaponInterface.as:38-158`) and the rules `PartInterface` applies around it.
 *
 * The pictures themselves are `weaponArt.ts`, generated from the SWF. This file
 * is the transcription: frame numbers, which instance shows what, and the two
 * pieces of state that change an icon without changing its frame.
 *
 * ── One clip, three instances ─────────────────────────────────────────────
 * `PartInterface` builds three `WeaponInterface`s and separates them with two
 * public flags (`:106`, `:116`, `:130`):
 *
 * | instance | shows | scale |
 * |---|---|---|
 * | `weaponInterface` | `equippedWeapons[currentWeapon - 1]` | 1.25 (`:33`) |
 * | `weaponInterfaceUnused` | **the other** primary slot (`:44-51`) | 0.75 (`:28`) |
 * | `weaponInterfaceSpecial` | `secondaryWeapon` (`:110-157`) | 1.25 |
 */

import { WEAPON_ART_FRAMES } from './weaponArt';
import type { WeaponArtLayer } from './weaponArt';

/** `WeaponInterface.as:57` — the bare socket, and the empty slot's picture. */
export const NONE_FRAME = 1;

/**
 * Weapon name to `gotoAndStop` argument, straight off the ladder at
 * `WeaponInterface.as:57-157`.
 *
 * **The keys are display names and the spacing is load-bearing** — "Big
 * Cannon", not "BigCannon". The AS3 compares `ScreenGame.equippedWeapons`
 * entries as strings and this port stores the same values; `loadout.ts` says
 * why at length, and `weaponPanel.test.ts` requires this map to agree with
 * `upgradeData.ts` in both directions.
 */
export const WEAPON_FRAME: Readonly<Record<string, number>> = Object.freeze({
  // Frames 2-13: the primaries, in `ScreenUpgrades.primaryNameArray` order.
  Cannon: 2,
  MiniGun: 3,
  'Big Cannon': 4,
  Flamethrower: 5,
  Shotgun: 6,
  'Timed Bomb Cannon': 7,
  'Gummy Bear Cannon': 8,
  'Poison Cannon': 9,
  'Laser Cannon': 10,
  'Cake Cannon': 11,
  'Penetration Cannon': 12,
  'Magic Cannon': 13,
  // Frames 14-25: the secondaries, in `secondaryNameArray` order.
  Mine: 14,
  Grenade: 15,
  'Ice Grenade': 16,
  'Poison Grenade': 17,
  Icicles: 18,
  'Poison Spikes': 19,
  Shield: 20,
  Rockets: 21,
  'Ice Ball': 22,
  'Lava Ball': 23,
  'Crazy Cheese': 24,
  'Magic Bunny': 25,
});

/**
 * The frame for a weapon name, or the empty socket.
 *
 * `null` is this port's "no secondary equipped", and the AS3's own handling of
 * that case lands in the same place by a different route: the special's ladder
 * (`:110-157`) has **no `None` arm at all**, so a clip whose weapon matches
 * nothing simply stays where it is — frame 1 on a clip that has never moved.
 * An unmatched *name* would likewise hold its last frame there and returns the
 * socket here; that difference is unreachable, because `loadout.ts` validates
 * every stored name against `upgradeData.ts` before it can be equipped.
 */
export function weaponFrame(name: string | null | undefined): number {
  if (!name) return NONE_FRAME;
  return WEAPON_FRAME[name] ?? NONE_FRAME;
}

/** The layers to draw for a weapon — socket first, then its glyph. */
export function weaponLayers(name: string | null | undefined): readonly WeaponArtLayer[] {
  const frame = weaponFrame(name);
  // Frames are 1-based and the table is dense from 1, so this cannot miss;
  // the fallback keeps a corrupted table from throwing inside a render.
  return WEAPON_ART_FRAMES[frame - 1]?.layers ?? WEAPON_ART_FRAMES[0].layers;
}

/** `ScreenGame.equippedWeapons` — two primary slots, either possibly empty. */
export const EMPTY_SLOT = 'None';

/**
 * What the *unused* icon shows — the primary that is not in hand.
 *
 * Two AS3 rules, and both matter:
 *
 *  - `WeaponInterface.as:44-51` picks the opposite slot: slot 2 in hand shows
 *    slot 1, otherwise slot 1 in hand shows slot 2.
 *  - `PartInterface.as:242` only *builds* the instance when **both** slots hold
 *    a weapon. With one weapon equipped there is nothing to preview, and an
 *    empty socket sitting beside the real one would read as a second weapon.
 *
 * Returns `null` for "draw nothing", which is the port's equivalent of the
 * instance never being added to the display list.
 */
export function otherSlotWeapon(
  equipped: readonly [string, string],
  slotInHand: number,
): string | null {
  if (equipped[0] === EMPTY_SLOT || equipped[1] === EMPTY_SLOT) return null;
  return slotInHand === 2 ? equipped[0] : equipped[1];
}

/* ── The two states that change an icon without changing its frame ───────── */

/** `:33` — the primary and special icons are drawn at 1.25x. */
export const ICON_SCALE = 1.25;
/** `:28` — the unused slot's preview is drawn at 0.75x, so it reads as second. */
export const UNUSED_ICON_SCALE = 0.75;

/** `PartInterface.as:643` — the special is solid the moment it is ready. */
export const SPECIAL_ALPHA_READY = 1;
/** `:648` — and dimmed to a quarter while its cooldown runs. */
export const SPECIAL_ALPHA_RELOADING = 0.25;

/**
 * The special icon's opacity — `handleReloadIndicator` (`:637-649`).
 *
 * **Driven by the cooldown, not by the bar's fill.** The AS3 tests
 * `reloadTimeSecondary <= 0` directly, and `secondaryBarFill` also returns a
 * full bar when `reloadTimeMax <= 0` — so reading readiness off the fill would
 * light the icon up for a weapon that has no cooldown configured rather than
 * for one that has finished it. The scene sends the predicate itself.
 */
export function specialIconAlpha(ready: boolean): number {
  return ready ? SPECIAL_ALPHA_READY : SPECIAL_ALPHA_RELOADING;
}
