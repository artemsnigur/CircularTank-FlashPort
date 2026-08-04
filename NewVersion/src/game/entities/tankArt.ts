/**
 * Tank art — the three parts, their frames, and which frame each one shows.
 *
 * The tank is not one sprite. `Tank.as:54-63` builds it from two children in a
 * fixed order — `addChild(body)` then `addChild(tower)`, so the turret draws on
 * top — and `TankShield` joins them when the shield is up.
 *
 * ── Two rotation conventions on one object ────────────────────────────────
 * This is the part with the most room to go quietly wrong, so both are stated
 * here and pinned against each other in `tankArt.test.ts`:
 *
 *   hull    `180 - atan2(xVel, yVel) * 180 / PI`   (`Tank.as:242`, `:264`)
 *   turret  `atan2(mouseY - y, mouseX - x) * 180 / PI`  (`Tank.as:74`)
 *
 * Neither is implemented here. `rotateTank` in `player/tankMovement.ts` already
 * carries the hull rule and `turretBearingDegrees` sits beside it, so the two
 * conventions live in one module and `tankMovement.test.ts` drives both. A copy
 * of either in this file would be the one-rule-two-copies trap the audit
 * records three times over — and the copy would be the one a reader "fixes".
 *
 * They are **not the same convention with different inputs**. The hull's
 * `atan2` takes its arguments *swapped* — x first — and is subtracted from 180,
 * which puts 0 degrees at north and runs clockwise. The turret's is the
 * ordinary form, 0 degrees at east. Porting either one's formula to the other
 * rotates that part by 90 degrees and mirrors it, which on a round tank looks
 * like "slightly off" rather than like a bug.
 *
 * Two further differences, both easy to normalise away by accident:
 *
 * - The hull turns at most `rotSpeedMax` (20) degrees per frame and **only
 *   while `speed > 0`** (`Tank.as:260`), so a stopped tank holds whatever
 *   facing it had. The turret is assigned outright every frame.
 * - The hull's goal is its *velocity*; the turret's is the *pointer*. A tank
 *   reversing away from the crosshair has them pointing opposite ways, which
 *   is correct and looks wrong.
 */

/** `assets.swf` character ids for the three parts. */
export const TANK_SYMBOLS = { body: 5, tower: 18, shield: 212 } as const;

/**
 * `TankBody` frames — `Tank.as:57-61`.
 *
 * Frame 2 is Tower mode, where the tank is fixed in place and the AS3 swaps the
 * body art for it. Frame 1 is every other mode.
 *
 * **Frame 2 is a two-layer frame, and this array does not express that.** The
 * sprite's display list on frame 2 is `[4, 3]` — shape 4 is added at a second
 * depth while the frame-1 body stays underneath. Every other clip in this port
 * replaces its single shape, which is why the flat array works everywhere else.
 * Nothing is wrong today because only `TANK_BODY_FRAMES[0]` is read; the port
 * has no Tower-mode body switch yet. **Whoever wires one must draw both shapes,
 * not just shape 4.** Found in T36 while correcting the frame parser — the
 * earlier one recorded "shapes placed on this frame" rather than the
 * accumulated display list, which is not what a frame shows.
 */
export const TANK_BODY_FRAMES: readonly number[] = [3, 4];

/** `TankShield` frames; `:1035` selects frame 4 as the struck state. */
export const TANK_SHIELD_FRAMES: readonly number[] = [208, 209, 210, 211];

/** `TankTower` frames, in `assets.swf` order — one per primary weapon. */
export const TANK_TOWER_FRAMES: readonly number[] = [
  6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17,
];

/** Authored widths, in design units. `body` halved is `Tank.radius`. */
export const TANK_SIZES = { body: 29, tower: 21, shield: 97.1 } as const;

/**
 * Primary weapon -> 1-based turret frame — `ScreenGame.setVisibleTankWeapon`
 * (`ScreenGame.as:521-570`).
 *
 * **Written as name -> index from the AS3's own chain, not inferred from the
 * order the frames appear in `assets.swf`.** Index and meaning are separately
 * meaningful here, which is the pairing that has gone wrong before: the frames
 * are 6..17 in id order, and the weapons are *not* in that order — Flamethrower
 * is frame 4 while it sits ninth in the port's roster, and Big Cannon is 3
 * where the roster has it third but for unrelated reasons. Deriving this from
 * either list's ordering would produce a table that is right for a few entries
 * and silently wrong for the rest.
 */
export const TOWER_FRAME_BY_WEAPON: Readonly<Record<string, number>> = {
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
};

/** The turret shape for a primary weapon, or the Cannon's when unrecognised. */
export function towerShape(weaponName: string): number {
  const frame = TOWER_FRAME_BY_WEAPON[weaponName] ?? 1;
  return TANK_TOWER_FRAMES[frame - 1] ?? TANK_TOWER_FRAMES[0];
}
