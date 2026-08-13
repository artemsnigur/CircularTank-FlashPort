/**
 * The flash at the barrel — `PartGameArea.as:3960-3972`.
 *
 * Three sizes, chosen by the *primary weapon's name* rather than by any stat.
 * The AS3 writes the choice out as a chain of string comparisons at the fire
 * site; this is the same table, keyed on the same names.
 *
 * ── The Shotgun's extra condition ─────────────────────────────────────────
 * `:3964` reads
 *
 *     primaryWeapon == "Cannon"
 *     || primaryWeapon == "Shotgun" && bullet.rotation == tank.tower.rotation
 *     || primaryWeapon == "Timed Bomb Cannon" || ...
 *
 * so the Shotgun flashes **once per volley, not once per pellet** — only the
 * round travelling straight down the barrel gets one. Every other weapon in the
 * table matches unconditionally. That is why `muzzleFlareFor` takes the round's
 * bearing and the turret's: dropping the pair would put eight flares on top of
 * each other on every shotgun blast, which reads as one very bright flare and
 * is the kind of wrong that looks deliberate.
 *
 * ── Names not in the table get no flare ───────────────────────────────────
 * `undefined` is a faithful answer, not a gap: the AS3's chain has no `else`,
 * and the weapons it omits — the Flame Thrower, the Laser Cannon, the Rocket
 * Launcher — are exactly the ones whose own effect already covers the barrel.
 */

import type { SpawnInput } from './particles';
import { barrelReach } from '../entities/tankArt';

/** `:3960`, `:3964`, `:3968` — the three tiers, by primary weapon name. */
const FLARE_BY_WEAPON: Readonly<Record<string, string>> = {
  MiniGun: 'MuzzleFlareSmall',
  'Gummy Bear Cannon': 'MuzzleFlareSmall',
  'Poison Cannon': 'MuzzleFlareSmall',
  Cannon: 'MuzzleFlareMedium',
  Shotgun: 'MuzzleFlareMedium',
  'Timed Bomb Cannon': 'MuzzleFlareMedium',
  'Cake Cannon': 'MuzzleFlareMedium',
  'Big Cannon': 'MuzzleFlareBig',
  'Penetration Cannon': 'MuzzleFlareBig',
};

/**
 * How far along the round's bearing the flare sits — **divergence `A10`**.
 *
 * `:3962` uses a flat `10` from the tank centre for every weapon. This reads
 * the equipped weapon's **own barrel** instead: `barrelReach` is the distance
 * from the turret's registration point to the end of its art, straight off the
 * shape's authored bounds.
 *
 * ── What the measurement actually showed ──────────────────────────────────
 * Eleven of the twelve turrets reach **10.5**, the Gummy Bear reaches 11.3 and
 * the Magic Cannon 17.9. So the AS3's flat `10` was very nearly right, and the
 * divergence here is small in magnitude for most weapons — half a unit — while
 * being correct for the two that differ. **That is the honest size of it**: the
 * per-weapon read is what stops the Gummy Bear and any future long gun being
 * wrong, not a large visible change on the Cannon.
 *
 * The visible fix is not this number at all, it is the **anchor**: the flare's
 * registration point is its flat base (`PARTICLE_ANCHORS`), and the port was
 * drawing it centred, burying half of every flare inside the tank. Position and
 * anchor are separate quantities and both had to be right.
 *
 * The earlier `TANK_SIZES.body / 2 + 1.5` is gone. It put the flare on the
 * *hull* edge at 16, which is 5.5 units past where any of these barrels end —
 * the flare floated clear of the gun.
 *
 * Full rationale: `docs/AUDIT-2026-07.md`, `A10`.
 */
export function muzzleFlareOffset(weaponName: string): number {
  return barrelReach(weaponName);
}

/** `:3962`'s value, kept as documentation. Nothing reads it at runtime. */
export const AS3_MUZZLE_FLARE_OFFSET = 10;

export interface MuzzleFlareInput {
  weaponName: string;
  /** The tank's centre; the offset is applied from here. */
  tankX: number;
  tankY: number;
  /** The round's bearing in degrees — `bullet.rotation`. */
  rotation: number;
  /** The turret's bearing in degrees, for the Shotgun's single-flare rule. */
  towerRotation: number;
}

/** The flare for one round, or undefined when this weapon shows none. */
export function muzzleFlareFor(input: MuzzleFlareInput): SpawnInput | undefined {
  const type = FLARE_BY_WEAPON[input.weaponName];
  if (type === undefined) return undefined;

  // One flare per volley for the Shotgun — see the note above.
  if (input.weaponName === 'Shotgun' && input.rotation !== input.towerRotation) {
    return undefined;
  }

  const radians = (input.rotation * Math.PI) / 180;
  const offset = muzzleFlareOffset(input.weaponName);
  return {
    type,
    count: 1,
    x: input.tankX + Math.cos(radians) * offset,
    y: input.tankY + Math.sin(radians) * offset,
    // `distance: 0` and `randAngle: 0` — the flare does not scatter; it points
    // where the round went and stays put.
    distance: 0,
    startAngle: input.rotation,
    randAngle: 0,
  };
}
