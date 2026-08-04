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

/** `:3962` — the flare sits this far along the round's own bearing. */
export const MUZZLE_FLARE_OFFSET = 10;

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
  return {
    type,
    count: 1,
    x: input.tankX + Math.cos(radians) * MUZZLE_FLARE_OFFSET,
    y: input.tankY + Math.sin(radians) * MUZZLE_FLARE_OFFSET,
    // `distance: 0` and `randAngle: 0` — the flare does not scatter; it points
    // where the round went and stays put.
    distance: 0,
    startAngle: input.rotation,
    randAngle: 0,
  };
}
