/**
 * Primary weapon -> 1-based `TankTower` frame — `ScreenGame.setVisibleTankWeapon`
 * (`ScreenGame.as:521-570`).
 *
 * **Written as name -> index from the AS3's own chain, not inferred from the
 * order the frames appear in `assets.swf`.** Index and meaning are separately
 * meaningful here: the frames are shapes 6..17 in id order, and the weapons are
 * *not* in that order — Flamethrower is frame 4 while it sits ninth in the
 * port's roster. Deriving this from either list's ordering would produce a
 * table that is right for a few entries and silently wrong for the rest.
 *
 * This lives in `scripts/lib/` rather than in `src/` because it is a
 * **generator input**: `gen-sprite-geometry.mjs` joins it against the SWF's
 * shape bounds to produce the per-weapon turret geometry. The app reads the
 * generated copy, so there is exactly one table.
 */
export const TOWER_FRAME_BY_WEAPON = Object.freeze({
  Cannon: 1,
  MiniGun: 2,
  'Big Cannon': 3,
  Flamethrower: 4,
  Shotgun: 5,
  'Timed Bomb Cannon': 6,
  'Gummy Bear Cannon': 7,
  'Poison Cannon': 8,
  'Laser Cannon': 9,
  'Cake Cannon': 10,
  'Penetration Cannon': 11,
  'Magic Cannon': 12,
});
