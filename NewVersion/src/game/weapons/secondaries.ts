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
 * ── Scope: all twelve secondaries ─────────────────────────────────────────
 * Mine, Shield, Grenade, Ice Grenade, Poison Grenade, Icicles, Poison Spikes,
 * Magic Bunny, Rockets, Crazy Cheese, Ice Ball, Lava Ball. Twelve is the whole
 * set — `ScreenGame.secondaryWeapon` names no others.
 *
 * Not all of the behaviour lives here. Shield is a timed state on the tank
 * (`weapons/shield.ts`), the balls are in `weapons/ball.ts`, and the two
 * bouncing food rounds share `weapons/bulletBounce.ts` with the Gummy Bear
 * Cannon. This file owns the specs and their stat-track wiring.
 *
 * Mine is the free starter — price[0] is 0 and `startLevel` is 1, exactly
 * parallel to the Cannon among primaries.
 *
 * **What cannot drift, and what can.** `SecondaryKind` (`:113`) has seven
 * members and `GameplayScene.useSecondary` (`:3345`) switches over all seven
 * with no `default` and a `boolean` return, so an eighth *kind* is a compile
 * error rather than a weapon that silently spawns nothing. **That guarantee is
 * about kinds, not counts** — a thirteenth secondary reusing an existing kind
 * would compile, and the name list above is hand-maintained. Nothing enforces
 * it against `SECONDARIES`.
 *
 * ── The 20-second cooldown is not a typo ──────────────────────────────────
 * `upgradeArrayMine[1]` is a flat `[600 … 600]` — 600 frames at 30 fps, so 20
 * real seconds, and it never improves with level. Secondaries are deliberate
 * set-pieces rather than a second trigger to hold down.
 */

import type { UpgradeState } from '../upgrades/upgradeState';
import { findUpgradeById, getStatValue } from '../upgrades/upgradeState';
import type { ExplosionSpec } from './explosions';

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
  /**
   * Stat track holding "how many", which each kind reads differently.
   *
   * The spike fans read it as projectiles per use; Magic Bunny reads it as
   * enemies one round may chain through. Both are the AS3's own count stat for
   * that weapon, so one track serves — but the two meanings are not
   * interchangeable, which is why `kind` decides what to do with it rather
   * than the presence of the track alone.
   */
  countTrack?: number;
  /**
   * Total arc a fan is spread across, in degrees.
   *
   * Only Crazy Cheese has one: the spike fans are radial, covering the full
   * 360 with no stat to read, so before this the `fan` kind never needed an
   * arc. Absent means radial — which is why this is optional rather than
   * defaulted to 360, since a 0 would silently collapse a fan to a single
   * bearing and look like a stat that had not been wired.
   */
  spreadTrack?: number;
  /**
   * What this secondary *does*, and therefore which spawn path runs.
   *
   * Explicit rather than inferred from which tracks are present. The dispatch
   * was a nested ternary reading spec shape — a count meant a fan, an explosion
   * channel meant a throw — and that was already ambiguous at five branches:
   * Magic Bunny has a count and is not a fan. Naming the kind means adding a
   * secondary cannot silently land in another one's path.
   */
  kind: SecondaryKind;
  /** SoundManager logical name, played on use. */
  sound: string;
}

/**
 * The five shapes a secondary takes.
 *
 * Not one per weapon — the three grenades share `thrown`, the two spike weapons
 * share `fan`. A new secondary either matches one of these or needs a sixth,
 * and being forced to say which is the point.
 */
export type SecondaryKind =
  /** Dropped in place, armed until something walks into it. Mine. */
  | 'mine'
  /** A timed state on the tank, no projectile at all. Shield. */
  | 'shield'
  /** Thrown at the cursor with a fuse. The three grenades. */
  | 'thrown'
  /** A radial burst of ordinary rounds. Icicles, Poison Spikes. */
  | 'fan'
  /** One round that chains between enemies. Magic Bunny. */
  | 'chain'
  /** N homing rounds, one locked to each of the N nearest enemies. Rockets. */
  | 'volley'
  /**
   * A projectile that lays persistent ground hazards as it flies.
   *
   * Ice Ball, Lava Ball. Distinct from every other kind by *what it leaves
   * behind* rather than how it travels or what it hits — the ball itself is an
   * ordinary round that dies on its first enemy.
   */
  | 'trail';

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
  kind: 'mine',
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
  kind: 'shield',
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
  kind: 'thrown',
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
  kind: 'thrown',
  sound: 'GrenadeThrow',
};

/**
 * Ice Ball — `PartGameArea.as:4174-4189`.
 *
 * A ball thrown along the tower's heading at a flat speed 12, laying an ice
 * patch on **every frame it lives** (`:1784`) and detonating into an `Ice` blast
 * on contact. The trail is the weapon; the blast is the smaller half.
 *
 * Three things make it unlike every secondary before it:
 *
 *  - **It deals no contact damage at all.** `:4187` sets `explosion = false`,
 *    which routes it away from the generic blast path, and `:5917` then excludes
 *    `BulletIceball` by name from the direct-damage path that `explosion == false`
 *    normally selects. Carved out of both, it reaches enemies only through the
 *    blast `:5895` queues by hand.
 *  - **Its trail and its blast share one budget.** Both sit behind the same
 *    generation gate (`groundHazard.ts`'s `iceGenerationAllows`), so a single
 *    throw cannot both trail-freeze and blast the same enemy.
 *  - **A boss is immune to the trail but not the blast** (`:6208` against
 *    `:6564`), the blast freezing it at a quarter duration.
 *
 * `durationTrack` is the trail's lifetime and is the stat that matters most:
 * 220-300 frames, plus the 15 the gate eats — see `activeWindow`.
 */
export const ICE_BALL: SecondarySpec = {
  name: 'Ice Ball',
  upgradeId: 'Iceball',
  reloadTrack: 0,
  damageTrack: 1,
  explosionTrack: 2,
  effectTimeTrack: 3,
  durationTrack: 4,
  explosionType: 'Ice',
  kind: 'trail',
  sound: 'Ball',
};

/**
 * Lava Ball — `PartGameArea.as:4190-4200`.
 *
 * Ice Ball's flight exactly, and the opposite weapon. Where ice freezes once per
 * throw and does nothing else, lava damages continuously and never stops:
 *
 *  - **`explosion = true`** (`:4195`), so it takes the ordinary blast path
 *    instead of ice's hand-queued one, and the blast is a plain `Normal`.
 *  - **Its trail damages per second, not per hit.** `:6263` divides by 30 at
 *    the point of use, so track 3's 15-28 is a rate. Reading it as per-frame
 *    would make lava thirty times too strong and look plausible in a table.
 *  - **Its dedup is per-frame, not per-throw.** `onLava` (`:6250`) is cleared
 *    each sweep, so ten overlapping patches cost one patch's damage this frame
 *    and charge again next frame. Ice's rule would be wrong here and vice
 *    versa — `groundHazard.ts` keeps them side by side for that reason.
 *  - **A boss takes a fifth** (`:6257`), and `DamageAddict` is excluded
 *    outright rather than healed (`:6259`) — unlike a bullet, lava does not
 *    touch it.
 *
 * The cooldown is 700 against Ice Ball's 400, the widest gap between two
 * otherwise identically-shaped secondaries.
 */
export const LAVA_BALL: SecondarySpec = {
  name: 'Lava Ball',
  upgradeId: 'Lavaball',
  reloadTrack: 0,
  damageTrack: 1,
  explosionTrack: 2,
  effectDamageTrack: 3,
  durationTrack: 4,
  explosionType: 'Normal',
  kind: 'trail',
  sound: 'Ball',
};

/**
 * Crazy Cheese — `PartGameArea.as:4208-4231`.
 *
 * A fan of bouncing, penetrating rounds on the **Food** channel. Its spawn is
 * the Shotgun's deterministic fan exactly — `tower - arc/2 + arc/(count-1)*i`,
 * the same `count - 1` denominator, so the outermost rounds sit *on* the arc's
 * edges rather than inside it. That is why the kind is `fan` and not something
 * new: what makes this weapon unusual is what its bullets do after they leave,
 * not how they leave.
 *
 * Three bullet behaviours, none of them new to the port on their own:
 *
 *  - **Penetrates** (`:5822` keeps it off the `dead = true` list), tracking
 *    what it has already hit in `enemiesArray` — the mechanism Penetration
 *    Cannon and Magic already use.
 *  - **Bounces three times** off the camera's edges (`:4216`, `:1903`), sharing
 *    that geometry with the Gummy Bear Cannon. A bounce empties its hit list,
 *    so it can cross the same crowd again.
 *  - **A boss takes a fifth** (`:6051`), the same 0.2 divisor Lava Ball uses.
 *
 * `countTrack` is a projectile count here, as with the spikes — not a chain
 * length. Magic Bunny is the weapon that made that ambiguity worth a
 * discriminator.
 */
export const CRAZY_CHEESE: SecondarySpec = {
  name: 'Crazy Cheese',
  upgradeId: 'CrazyCheese',
  reloadTrack: 0,
  damageTrack: 1,
  // `:4222` — `upgradeArrayCrazyCheese[3]`, the arc: 40 degrees at level 1 to
  // 62.5 at level 10. AS3 index 3 is port track 2, the price column dropped.
  //
  // This was missing for two commits and the weapon fired **nine rounds on one
  // bearing**, stacked exactly and rendering as a single round. The arc was
  // written into the docstring above at the same time the field was left unset,
  // so the documentation described behaviour no code produced.
  spreadTrack: 2,
  countTrack: 3,
  kind: 'fan',
  sound: 'CrazyCheese',
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
  kind: 'thrown',
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
  kind: 'fan',
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
  kind: 'fan',
  sound: 'FireSpikes',
};

/**
 * Magic Bunny — `PartGameArea.as:4233`.
 *
 * Mechanically `BulletMagic` — same radius, spread, `neverHitTarget`, the same
 * chain-homing block at `:1714` — and numerically nothing like it:
 *
 *              Magic Cannon      Magic Bunny
 *   reload     15 -> 13.2        900 flat
 *   damage     2.2 -> 3.5        16 -> 30
 *   targets    3 -> 4            5 -> 6
 *   speed      14                10
 *   muzzle     12 + w/2          16 + w/2
 *
 * A near-continuous stream of pinpricks against one round every thirty seconds
 * that chains through six enemies for real damage. The longest cooldown in the
 * game.
 *
 * `:1748` also turns the *sprite* to face travel, for the Bunny alone. The port
 * does not rotate bullet sprites at all, so that is left out rather than given
 * machinery nothing else uses.
 */
export const MAGIC_BUNNY: SecondarySpec = {
  name: 'Magic Bunny',
  upgradeId: 'MagicBunny',
  reloadTrack: 0,
  damageTrack: 1,
  countTrack: 2,
  kind: 'chain',
  sound: 'MagicBunny',
};

/**
 * Rockets — `PartGameArea.as:4108`.
 *
 * Fires up to `count` homing rounds, one locked to each of the nearest
 * on-screen enemies. Distinct from Magic Bunny's chaining: those are separate
 * rounds each committed to one enemy, not one round passing between several.
 *
 * The volley is clamped to however many targets exist, and a press with none
 * refunds its cooldown — the only secondary that can decline, and the reason
 * the gate moved above the dispatch.
 */
export const ROCKETS: SecondarySpec = {
  name: 'Rockets',
  upgradeId: 'Rockets',
  reloadTrack: 0,
  damageTrack: 1,
  explosionTrack: 2,
  countTrack: 3,
  kind: 'volley',
  sound: 'Rockets',
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
  'Magic Bunny': MAGIC_BUNNY,
  Rockets: ROCKETS,
  // Appended as ported, which is why this list is not the upgrade table's order.
  'Ice Ball': ICE_BALL,
  'Lava Ball': LAVA_BALL,
  'Crazy Cheese': CRAZY_CHEESE,
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
  /** Total fan arc in degrees. Zero for a radial fan, which has no arc stat. */
  spread: number;
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
  const spread = optional(spec.spreadTrack);
  if (
    damage === null ||
    explosionRadius === null ||
    duration === null ||
    effectTime === null ||
    effectDamage === null ||
    count === null ||
    spread === null
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
    spread,
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
 * Builds the mine a placement produces.
 *
 * The cooldown gate used to live here, mirroring `fire()`. It moved up to
 * `GameplayScene.updateSecondary` when Rockets arrived: `:3979-3986` gates once
 * above the weapon dispatch, and a weapon that *declines* — Rockets, when
 * nothing is targetable — still has to have burnt the achievement flags. A
 * per-weapon gate cannot express that.
 */
export function placeMine(
  stats: SecondaryStats,
  position: { x: number; y: number },
): MineState {
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
