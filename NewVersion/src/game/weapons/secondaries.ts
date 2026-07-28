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

 *   Rockets                 multiple homing projectiles with target selection
 *   Ice Ball, Lava Ball     rolling projectiles that persist and pierce
 *   Magic Bunny             homing pet with its own steering loop
 *   Crazy Cheese            spawns a temporary allied entity
 *   (Shield is ported — see weapons/shield.ts)
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

/**
 * How a secondary reads its stats and announces itself.
 *
 * ── Only the reload track is universal ────────────────────────────────────
 * Every secondary has a cooldown; almost nothing else is shared. Mine has
 * damage and an explosion radius, Shield has neither and carries a duration
 * instead, Icicles has a spike count, the balls carry a trail lifetime. The
 * tracks are therefore optional and named for what they hold, rather than
 * assumed present at fixed indices.
 *
 * This was fitted to Mine when Mine was the only one, which made damage and
 * explosion look mandatory. Shield is the first that has neither, and the other
 * ten each want a track this shape does not have — so widening it now rather
 * than special-casing one secondary against a Mine-shaped interface.
 */
export interface SecondarySpec {
  /** Display name, matching `ScreenGame.secondaryWeapon`. */
  name: string;
  upgradeId: string;
  /** Stat track holding the reload time (AS3 index 1). Every secondary has one. */
  reloadTrack: number;
  /** Stat track holding the damage (AS3 index 2), where there is damage. */
  damageTrack?: number;
  /** Stat track holding the explosion radius (AS3 index 3), where it explodes. */
  explosionTrack?: number;
  /** Stat track holding a duration in frames — Shield's window. */
  durationTrack?: number;
  /** Stat track holding a status duration the blast applies — Ice/Poison. */
  effectTimeTrack?: number;
  /** Stat track holding poison's per-tick damage. */
  effectDamageTrack?: number;
  /** Explosion channel the blast uses. `Normal` unless stated. */
  explosionType?: 'Normal' | 'Ice' | 'Poison';
  /** Stat track holding how many projectiles one use fires — the spike fans. */
  countTrack?: number;
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

/**
 * Shield — `PartGameArea.as:4102`.
 *
 * The only secondary with no projectile at all: it sets a timed state on the
 * tank. Track 1 is a *duration*, not damage — see `weapons/shield.ts` for what
 * the window actually does, which is reflect rather than absorb.
 */
export const SHIELD: SecondarySpec = {
  name: 'Shield',
  upgradeId: 'Shield',
  reloadTrack: 0,
  durationTrack: 1,
  sound: 'Shield',
};

/**
 * Grenade — `PartGameArea.as:4003`.
 *
 * A thrown object with a fuse; see `weapons/grenade.ts` for the flight. The
 * blast is an ordinary `Normal` explosion, which is why this one needs no
 * status payload and the other two do.
 */
export const GRENADE: SecondarySpec = {
  name: 'Grenade',
  upgradeId: 'Grenade',
  reloadTrack: 0,
  damageTrack: 1,
  explosionTrack: 2,
  sound: 'GrenadeThrow',
};

/**
 * Ice Grenade — `PartGameArea.as:4010`.
 *
 * Grenade's flight exactly, with an `Ice` blast that freezes. **Its cooldown is
 * 400, not the 650 the other two share** — the only stat-shape difference
 * between the three variants and the easiest to miss. Damage is traded away for
 * the freeze: 8-12 against the plain Grenade's 22-31.
 */
export const ICE_GRENADE: SecondarySpec = {
  name: 'Ice Grenade',
  upgradeId: 'IceGrenade',
  reloadTrack: 0,
  damageTrack: 1,
  explosionTrack: 2,
  effectTimeTrack: 3,
  explosionType: 'Ice',
  sound: 'GrenadeThrow',
};

/**
 * Poison Grenade — `PartGameArea.as:4018`.
 *
 * The lowest direct damage of the three (4-6) because the poison does the work
 * over time: 360-450 frames of it at 2-2.3 a tick.
 */
export const POISON_GRENADE: SecondarySpec = {
  name: 'Poison Grenade',
  upgradeId: 'PoisonGrenade',
  reloadTrack: 0,
  damageTrack: 1,
  explosionTrack: 2,
  effectTimeTrack: 3,
  effectDamageTrack: 4,
  explosionType: 'Poison',
  sound: 'GrenadeThrow',
};

/**
 * Icicles — `PartGameArea.as:4061`.
 *
 * A radial burst that freezes. Buys **quantity** as it levels: 23 spikes rising
 * to 32, on the shortest secondary cooldown in the game at 400 flat.
 */
export const ICICLES: SecondarySpec = {
  name: 'Icicles',
  upgradeId: 'Icicles',
  reloadTrack: 0,
  damageTrack: 1,
  effectTimeTrack: 2,
  countTrack: 3,
  sound: 'FireSpikes',
};

/**
 * Poison Spikes — `PartGameArea.as:4065`.
 *
 * The same burst, poisoning instead. Buys **duration** rather than quantity:
 * the count is a flat 32 at every level while the poison time grows, and the
 * cooldown is 700 against Icicles' 400.
 */
export const POISON_SPIKES: SecondarySpec = {
  name: 'Poison Spikes',
  upgradeId: 'PoisonSpikes',
  reloadTrack: 0,
  damageTrack: 1,
  effectTimeTrack: 2,
  effectDamageTrack: 3,
  countTrack: 4,
  sound: 'FireSpikes',
};

/** Secondaries ported so far, by display name. See the header for the rest. */
export const SECONDARY_WEAPONS: Readonly<Record<string, SecondarySpec>> = {
  Mine: MINE,
  Shield: SHIELD,
  Grenade: GRENADE,
  'Ice Grenade': ICE_GRENADE,
  'Poison Grenade': POISON_GRENADE,
  Icicles: ICICLES,
  'Poison Spikes': POISON_SPIKES,
};

export function getSecondary(name: string): SecondarySpec | undefined {
  return SECONDARY_WEAPONS[name];
}

export interface SecondaryStats {
  /** Frames between uses at 30 fps. */
  reloadTimeMax: number;
  /** Zero where the spec declares no damage track. */
  damage: number;
  /** Zero where the spec declares no explosion track. */
  explosionRadius: number;
  /** Frames the effect lasts, where the spec declares a duration track. */
  duration: number;
  /** Frames of freeze or poison the blast applies. */
  effectTime: number;
  /** Poison's per-tick damage. Zero for Ice, which passes 0 in the AS3 too. */
  effectDamage: number;
  /** Projectiles one use fires. Zero where the weapon fires a single thing. */
  count: number;
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

  // The reload is the one track every secondary has, and its absence is what
  // "unowned" looks like: `getStatValue` returns null at level 0.
  const reloadTimeMax = getStatValue(upgrades, upgrade, spec.reloadTrack);
  if (reloadTimeMax === null) return null;

  // A declared track that does not resolve is a data error, not an unowned
  // weapon, so it fails rather than quietly reading zero — a zero explosion
  // radius is a blast that hits nothing and a zero duration is a shield that
  // never comes up.
  const optional = (track: number | undefined): number | null => {
    if (track === undefined) return 0;
    return getStatValue(upgrades, upgrade, track);
  };

  const damage = optional(spec.damageTrack);
  const explosionRadius = optional(spec.explosionTrack);
  const duration = optional(spec.durationTrack);
  const effectTime = optional(spec.effectTimeTrack);
  const effectDamage = optional(spec.effectDamageTrack);
  const count = optional(spec.countTrack);
  if (
    damage === null ||
    explosionRadius === null ||
    duration === null ||
    effectTime === null ||
    effectDamage === null ||
    count === null
  ) {
    return null;
  }

  return {
    reloadTimeMax,
    damage,
    explosionRadius,
    duration,
    effectTime,
    effectDamage,
    count,
  };
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
