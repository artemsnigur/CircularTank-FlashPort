/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run sprite-geometry:data
 *
 * Registration points and barrel reach, derived from the shape bounds in
 * SWFimported/shapes/*.svg. See scripts/gen-sprite-geometry.mjs for why
 * registration is not the same as centre, and why that matters here.
 */

/** One turret's authored geometry, in design units. */
export interface TowerGeometry {
  /** `assets.swf` shape id — the frame `TankTower` shows for this weapon. */
  shape: number;
  /** Authored canvas size. Drawing this square distorts nine of the twelve. */
  width: number;
  height: number;
  /**
   * The registration point as an origin fraction. `Tank.as:63` adds the
   * turret at (0,0), so this point is the tank's centre — set it as the
   * sprite's origin and the turret pivots where the original pivots.
   */
  originX: number;
  originY: number;
  /**
   * Distance from the tank's centre to the barrel tip, along the turret's
   * bearing. This is where a muzzle flare belongs.
   */
  barrelReach: number;
}

/**
 * Per-weapon turret geometry.
 *
 * Eleven of the twelve reach 10.5 and the Gummy Bear reaches 11.3; the Magic
 * Cannon is the outlier at 17.9. The near-uniformity is why
 * `PartGameArea.as:3962` could spawn every muzzle flare at a flat 10 — that
 * value is the barrel tip to within half a unit for almost every weapon.
 */
export const TOWER_GEOMETRY: Readonly<Record<string, TowerGeometry>> = Object.freeze({
  'Cannon': { shape: 6, width: 21, height: 21, originX: 0.5, originY: 0.5, barrelReach: 10.5 },
  'MiniGun': { shape: 7, width: 19, height: 17, originX: 0.4474, originY: 0.5, barrelReach: 10.5 },
  'Big Cannon': { shape: 8, width: 21, height: 21, originX: 0.5, originY: 0.5, barrelReach: 10.5 },
  'Flamethrower': { shape: 9, width: 21, height: 21, originX: 0.5, originY: 0.5, barrelReach: 10.5 },
  'Shotgun': { shape: 10, width: 21, height: 21, originX: 0.5, originY: 0.5, barrelReach: 10.5 },
  'Timed Bomb Cannon': { shape: 11, width: 20, height: 19, originX: 0.475, originY: 0.5, barrelReach: 10.5 },
  'Gummy Bear Cannon': { shape: 12, width: 22.6, height: 22.6, originX: 0.5, originY: 0.5, barrelReach: 11.3 },
  'Poison Cannon': { shape: 13, width: 21, height: 21, originX: 0.5, originY: 0.5, barrelReach: 10.5 },
  'Laser Cannon': { shape: 14, width: 20.9, height: 20.85, originX: 0.4976, originY: 0.5012, barrelReach: 10.5 },
  'Cake Cannon': { shape: 15, width: 20, height: 23, originX: 0.475, originY: 0.5, barrelReach: 10.5 },
  'Penetration Cannon': { shape: 16, width: 21, height: 21, originX: 0.5, originY: 0.5, barrelReach: 10.5 },
  'Magic Cannon': { shape: 17, width: 26.4, height: 17, originX: 0.322, originY: 0.5, barrelReach: 17.9 },
});

/**
 * Where a particle clip's registration point sits, as an origin fraction.
 *
 * **Only entries that are not centred appear here**, and today that is exactly
 * the three muzzle flares: their registration is the flare's flat base, at
 * local x = 0. Everything absent from this table draws centred, which is what
 * its registration already is.
 *
 * Deliberately excluded, each checked rather than assumed:
 *   shape 843 — sprite 1059 places it at a non-zero translation
 */
export const PARTICLE_ANCHORS: Readonly<Record<string, { originX: number; originY: number }>> =
  Object.freeze({
  MuzzleFlareBig: { originX: 0, originY: 0.5892 },
  MuzzleFlareMedium: { originX: 0, originY: 0.5864 },
  MuzzleFlareSmall: { originX: 0, originY: 0.5881 },
});
