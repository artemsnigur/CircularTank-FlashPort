/**
 * Secondary weapons — `PartGameArea.tankAttack()`'s second firing block
 * (line 3979) plus the Mine branch, and `handleMines` (line 1045).
 *
 * ── A separate subsystem, not a second primary ────────────────────────────
 * The secondary has its own reload clock (`ScreenGame.reloadTimeSecondary`),
 * its own trigger (`Main.space`, where the primary uses `Main.mouse`), and its
 * own upgrade tables. The framework shape is otherwise identical to the
 * primary's, so `FiringState`/`tickFiring` are reused rather than duplicated:
 *
 *     if (reloadTimeSecondary <= 0 && Main.space) {
 *         reloadTimeSecondary += reloadTimeMaxSecondary
 *         …build the secondary…
 *     }
 *
 * ── Scope: Mine only ──────────────────────────────────────────────────────
 * Mine is the free starter secondary — price[0] is 0 and `startLevel` is 1,
 * exactly parallel to the Cannon among primaries. It is also the only one of
 * the twelve that needs nothing unported: it places a static object that
 * detonates into an ordinary `Normal` explosion, which is already ported.
 *
 * The other eleven each need work this file does not do:
 *
 *   Grenade, Ice Grenade,   thrown arcs with a flight timer and a landing
 *   Poison Grenade          position, plus Ice/Poison explosion status effects
 *   Rockets                 multiple homing projectiles with target selection
 *   Icicles, Poison Spikes  fan of persistent ground hazards with lifetimes
 *   Ice Ball, Lava Ball     rolling projectiles that persist and pierce
 *   Magic Bunny             homing pet with its own steering loop
 *   Crazy Cheese            spawns a temporary allied entity
 *   Shield                  a timed damage-blocking state on the tank, not a
 *                           projectile at all (see player/tankDamage.ts's
 *                           `shieldOn` parameter, already stubbed for it)
 *
 * ── The 20-second cooldown is not a typo ──────────────────────────────────
 * `upgradeArrayMine[1]` is a flat `[600 … 600]` — 600 frames at 30 fps, so 20
 * real seconds, and it never improves with level. Secondaries are deliberate
 * set-pieces rather than a second trigger to hold down.
 */

import type { UpgradeState } from '../upgrades/upgradeState';
import { findUpgradeById, getStatValue } from '../upgrades/upgradeState';
import type { ExplosionSpec } from './explosions';
import type { FiringState } from './firing';

/** How a secondary reads its stats and announces itself. */
export interface SecondarySpec {
  /** Display name, matching `ScreenGame.secondaryWeapon`. */
  name: string;
  upgradeId: string;
  /** Stat track holding the reload time (AS3 index 1). */
  reloadTrack: number;
  /** Stat track holding the damage (AS3 index 2). */
  damageTrack: number;
  /** Stat track holding the explosion radius (AS3 index 3). */
  explosionTrack: number;
  /** SoundManager logical name, played on use. */
  sound: string;
}

/**
 * Mine — PartGameArea.as:3987.
 *
 * Dropped at the tank's own position, then armed indefinitely until something
 * walks into it.
 */
export const MINE: SecondarySpec = {
  name: 'Mine',
  upgradeId: 'Mine',
  reloadTrack: 0,
  damageTrack: 1,
  explosionTrack: 2,
  sound: 'PlaceMine',
};

/** Secondaries ported so far, by display name. See the header for the rest. */
export const SECONDARY_WEAPONS: Readonly<Record<string, SecondarySpec>> = {
  Mine: MINE,
};

export function getSecondary(name: string): SecondarySpec | undefined {
  return SECONDARY_WEAPONS[name];
}

export interface SecondaryStats {
  /** Frames between uses at 30 fps. */
  reloadTimeMax: number;
  damage: number;
  explosionRadius: number;
}

/**
 * Per-level stats for a secondary, or null when unowned.
 *
 * Mine cannot actually be unowned — it starts at level 1 — but the other
 * eleven can, and the AS3 guards every secondary branch the same way.
 */
export function resolveSecondaryStats(
  spec: SecondarySpec,
  upgrades: UpgradeState,
): SecondaryStats | null {
  const upgrade = findUpgradeById(spec.upgradeId);
  if (!upgrade) return null;

  const reloadTimeMax = getStatValue(upgrades, upgrade, spec.reloadTrack);
  const damage = getStatValue(upgrades, upgrade, spec.damageTrack);
  const explosionRadius = getStatValue(upgrades, upgrade, spec.explosionTrack);
  if (reloadTimeMax === null || damage === null || explosionRadius === null) return null;

  return { reloadTimeMax, damage, explosionRadius };
}

/**
 * A placed mine. `radius` is the *trigger* radius, not the blast — the AS3
 * hard-codes it at the placement site rather than reading it from the table.
 */
export interface MineState {
  x: number;
  y: number;
  /** `mine.radius = 12` — PartGameArea.as:3990. Fixed at every upgrade level. */
  radius: number;
  damage: number;
  explosionRadius: number;
}

/** `mine.radius = 12`, set literally at the placement site. */
export const MINE_TRIGGER_RADIUS = 12;

/**
 * Places a mine if the secondary is off cooldown, or returns null.
 *
 * Mirrors `fire()` in firing.ts, including `+=` on the reload rather than `=`.
 */
export function placeMine(
  state: FiringState,
  stats: SecondaryStats,
  position: { x: number; y: number },
): MineState | null {
  if (state.reloadTime > 0) return null;

  state.reloadTime += stats.reloadTimeMax;

  return {
    x: position.x,
    y: position.y,
    radius: MINE_TRIGGER_RADIUS,
    damage: stats.damage,
    explosionRadius: stats.explosionRadius,
  };
}

/** What `handleMines` checks each enemy for before testing distance. */
export interface MineTarget {
  x: number;
  y: number;
  radius: number;
  /**
   * Both come from status effects in the unported enemy loop; an enemy in
   * either state walks over a mine without setting it off.
   */
  invisible?: boolean;
  teleporting?: boolean;
}

export interface MineSweepResult {
  /** Mines still armed, in their original order. */
  mines: MineState[];
  /** Blasts to spawn, one per mine that went off. */
  detonations: ExplosionSpec[];
}

/**
 * `handleMines` — detonates every mine an eligible enemy is touching.
 *
 * The AS3 keeps iterating the enemy list after splicing the mine out, and
 * relies on `if (stage.contains(theMine))` to stop the *same* mine queuing a
 * second explosion once it has been removed from the display list. That guard
 * is load-bearing rather than defensive: without it, a mine caught between two
 * enemies would blast twice. Breaking out of the inner loop on the first
 * trigger reaches the same result directly.
 *
 * `smallSound` is false, so a mine plays the big boom — unlike a bullet impact.
 */
export function sweepMines(
  mines: readonly MineState[],
  targets: readonly MineTarget[],
): MineSweepResult {
  const remaining: MineState[] = [];
  const detonations: ExplosionSpec[] = [];

  for (const mine of mines) {
    const trigger = targets.find((target) => {
      if (target.invisible || target.teleporting) return false;
      const distance = Math.hypot(target.x - mine.x, target.y - mine.y);
      return distance <= mine.radius + target.radius;
    });

    if (!trigger) {
      remaining.push(mine);
      continue;
    }

    detonations.push({
      x: mine.x,
      y: mine.y,
      radius: mine.explosionRadius,
      damage: mine.damage,
      type: 'Normal',
      smallSound: false,
    });
  }

  return { mines: remaining, detonations };
}
