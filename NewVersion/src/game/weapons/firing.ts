/**
 * Primary-weapon firing — the port of `PartGameArea.tankAttack()`'s framework
 * plus the Cannon branch.
 *
 * ── Scope ─────────────────────────────────────────────────────────────────
 * `tankAttack` is 574 lines because it inlines all 12 primary weapons plus
 * every special. The *framework* around them is small and shared:
 *
 *     if (reloadTime <= 0 && mouse held) {
 *         reloadTime += reloadTimeMax
 *         for (i < bulletCount) { …build a bullet…; place it at the muzzle }
 *     }
 *
 * Each weapon slots into `PRIMARY_WEAPONS` as it is ported; the ones that still
 * need dedicated work are listed above that constant with the mechanic that
 * blocks each.
 *
 * Note `reloadTime += reloadTimeMax` rather than `=`. Holding fire keeps a
 * steady cadence instead of resetting the clock each shot.
 *
 * ── Where a bullet starts ─────────────────────────────────────────────────
 * Two different rules, and the difference is easy to miss (PartGameArea.as:3913
 * and :3918):
 *
 *   default       `tank + cos(tower.rotation) * (16 + width/2)` — every bullet
 *                 of a shot leaves the *same* point, on the turret's axis. The
 *                 per-bullet spread rotation affects velocity only.
 *   Shotgun       `tank + cos(bullet.rotation) * 16` — each pellet leaves from
 *                 its own heading, and the half-width term is dropped.
 *   Flamethrower  `tank + cos(tower.rotation) * 16` — turret axis like the
 *                 default, but flat like the Shotgun.
 *
 * These were originally one flag, on the reasoning that the two differences
 * always travel together. The Flamethrower disproves that, so they are two:
 * `muzzleAlong` picks the direction and `muzzleIncludesRadius` the offset.
 */

import type { UpgradeState } from '../upgrades/upgradeState';
import { findUpgradeById, getStatValue } from '../upgrades/upgradeState';

const AS3_FPS = 30;

/**
 * **Deliberate balance change — not a fidelity issue.**
 *
 * The Flamethrower's reach is multiplied by this on top of `upgradeArray
 * Flamethrower` track 3, taking level 1 from 100 units to 170 and level 10
 * from 150 to 255. Requested because the jet read as too short in play.
 *
 * Applied here rather than in `upgrades/upgradeData.ts` because that file is
 * generated from the AS3 by `scripts/gen-upgrades.mjs` and verified by
 * `npm run data:check` — an edit there would fail the check and be overwritten
 * by the next regeneration. Keeping the extracted table faithful and the
 * divergence explicit means the two never get confused for each other.
 *
 * Everything downstream follows automatically: `flameLifetimeMax` derives the
 * flame's lifetime from range, so the flames simply live proportionally longer.
 */
export const FLAME_RANGE_MULTIPLIER = 1.7;

/** How a weapon builds its projectiles. */
export interface WeaponSpec {
  /** Display name, matching `ScreenGame.primaryWeapon`. */
  name: string;
  /** Upgrade table id, for reading per-level stats. */
  upgradeId: string;
  /** Stat track holding the reload time (AS3 index 1). */
  reloadTrack: number;
  /** Stat track holding the damage (AS3 index 2). */
  damageTrack: number;
  /** Optional track holding the explosion radius (AS3 index 3). */
  explosionTrack?: number;
  bulletRadius: number;
  /** Design units per frame at 30 fps. */
  bulletSpeed: number;
  /** Degrees of random spread applied to each shot. */
  spread: number;
  /** Distance from the tank centre the bullet appears at. */
  muzzleOffset: number;
  /**
   * Fixed pellet count. Ignored when `bulletCountTrack` is set, since that
   * reads the count per upgrade level instead.
   */
  bulletsPerShot: number;
  /** Optional track holding the pellet count (AS3 index 4). */
  bulletCountTrack?: number;
  /**
   * Optional track holding the *total* fan arc in degrees (AS3 index 3). When
   * present, pellets are spread evenly and deterministically across it rather
   * than randomly within `spread`.
   */
  fanArcTrack?: number;
  /** Direction the muzzle offset is taken along. Defaults to `tower`. */
  muzzleAlong?: 'tower' | 'pellet';
  /**
   * Whether the bullet's own radius is added to `muzzleOffset`. Defaults to
   * true; the Shotgun and Flamethrower both use a flat offset.
   */
  muzzleIncludesRadius?: boolean;
  /**
   * Survives impact and keeps flying, damaging each enemy at most once.
   *
   * `PartGameArea.as:5822` is a long exclusion list guarding `dead = true`, and
   * `BulletPenetrate` is one of the names on it — penetration is implemented by
   * *not* killing the bullet rather than by any positive mechanic.
   */
  penetrates?: boolean;
  /**
   * Attaches to the enemy it hits and detonates on a fuse instead of doing
   * anything on impact. See TIMED_BOMB_CANNON.
   */
  attachesBomb?: boolean;
  /** Track holding the fuse length in frames (AS3 index 4). */
  bombTimerTrack?: number;
  /** Leaves poison on the enemy it hits. See POISON_CANNON. */
  appliesPoison?: boolean;
  /** Track holding the poison duration in frames (AS3 index 3). */
  poisonTimeTrack?: number;
  /** Track holding the poison damage **per second** (AS3 index 4). */
  poisonDamageTrack?: number;
  /**
   * Fires short-lived flames rather than projectiles. See FLAMETHROWER and
   * weapons/flames.ts.
   */
  isFlame?: boolean;
  /** Track holding the flame *range* in design units (AS3 index 3). */
  flameRangeTrack?: number;
  /** Adds the tank's own velocity to the muzzle velocity. */
  inheritsTankVelocity?: boolean;
  /** Bursts into a ring of fragments on impact. See CAKE_CANNON. */
  spawnsCakePieces?: boolean;
  /** Track holding the fragment count (AS3 index 3). */
  cakePiecesTrack?: number;
  /**
   * Fires an instantaneous beam rather than a projectile. See LASER_CANNON and
   * weapons/laser.ts; `fire` produces no BulletSpec for these.
   */
  isBeam?: boolean;
  /**
   * Chains between enemies after its first hit. See MAGIC_CANNON and
   * weapons/magic.ts.
   */
  isHoming?: boolean;
  /** Track holding how many enemies one round may damage (AS3 index 3). */
  targetsTrack?: number;
  /** SoundManager logical name. */
  sound: string;
  explosion: boolean;
  /**
   * AS3 projectile class, which decides the damage channel. Defaults to the
   * plain `Bullet`, which is untyped.
   */
  bulletClass?: string;
}

/**
 * Cannon — PartGameArea.as:3751.
 * `upgradeArrayCannon` tracks are [reload, damage, explosionRadius] once the
 * price row is dropped, so they map to tracks 0, 1 and 2 here.
 */
export const CANNON: WeaponSpec = {
  name: 'Cannon',
  upgradeId: 'Cannon',
  reloadTrack: 0,
  damageTrack: 1,
  explosionTrack: 2,
  bulletRadius: 2,
  bulletSpeed: 18,
  spread: 0,
  // The default branch: 16 + half the bullet's width.
  muzzleOffset: 16,
  bulletsPerShot: 1,
  sound: 'WeaponCannon',
  explosion: true,
  /** `new Bullet()` — untyped, but it explodes, so damage goes through
   *  the Explosions channel instead. See weapons/explosions.ts. */
  bulletClass: 'Bullet',
};

/**
 * MiniGun — PartGameArea.as:3764.
 *
 * The complement to the Cannon: it fires `BulletSmall`, which **is** typed
 * (the `Bullets` channel), and does not explode. `upgradeArrayMiniGun` has only
 * two stat tracks — reload and damage — so there is no explosion track.
 *
 * Far higher raw output than the Cannon (~1.2 damage every 1.45 frames against
 * 7 every 13) but it is the first weapon whose damage an enemy can resist:
 * `Strong` halves it, `Ninja` takes it to 0.75x, `Crazy` is weak to it at 1.5x.
 */
export const MINIGUN: WeaponSpec = {
  name: 'MiniGun',
  upgradeId: 'MiniGun',
  reloadTrack: 0,
  damageTrack: 1,
  bulletRadius: 2,
  bulletSpeed: 36,
  // Applied as `rotation - spread/2 + random() * spread`; only Shotgun and
  // Laser Cannon opt out of that general rule (PartGameArea.as:3904).
  spread: 5,
  muzzleOffset: 16,
  bulletsPerShot: 1,
  sound: 'WeaponMinigun',
  explosion: false,
  /** `new BulletSmall()` — typed on the Bullets channel. */
  bulletClass: 'BulletSmall',
};

/**
 * Big Cannon — PartGameArea.as:3776.
 *
 * Not a damage upgrade — its damage curve is **identical** to the Cannon's
 * ([7, 7.33, … 10]). What it buys is area: a 80-100 blast against the Cannon's
 * 30-57, paid for with a much slower reload (23.8 vs 13 frames). Single-target
 * DPS is roughly half the Cannon's; against a cluster it is far better.
 *
 * `BulletBig` is untyped, so like the Cannon its damage arrives through the
 * `Explosions` channel.
 */
export const BIG_CANNON: WeaponSpec = {
  name: 'Big Cannon',
  upgradeId: 'BigCannon',
  reloadTrack: 0,
  damageTrack: 1,
  explosionTrack: 2,
  bulletRadius: 3,
  bulletSpeed: 18,
  spread: 0,
  muzzleOffset: 16,
  bulletsPerShot: 1,
  sound: 'WeaponBigCannon',
  explosion: true,
  bulletClass: 'BulletBig',
};

/**
 * Gummy Bear Cannon — PartGameArea.as:3826.
 *
 * Fires `BulletGummyBear` on the **Food** channel — the third distinct channel
 * in play, after the Cannon's Explosions and the MiniGun's Bullets. No
 * explosion, so `upgradeArrayGummyBearCannon` has only reload and damage.
 */
export const GUMMY_BEAR_CANNON: WeaponSpec = {
  name: 'Gummy Bear Cannon',
  upgradeId: 'GummyBearCannon',
  reloadTrack: 0,
  damageTrack: 1,
  bulletRadius: 6,
  bulletSpeed: 20,
  spread: 5,
  muzzleOffset: 16,
  bulletsPerShot: 1,
  sound: 'WeaponGummyBearCannon',
  explosion: false,
  bulletClass: 'BulletGummyBear',
};

/**
 * Shotgun — PartGameArea.as:3800, with its fan at :3911.
 *
 * The first weapon that fires more than one projectile, and the only one whose
 * spread is **deterministic**: pellets are laid out evenly across a total arc
 * rather than scattered randomly inside it, so the same shot always produces
 * the same pattern.
 *
 *     rotation = tower - arc/2 + arc/(count - 1) * i
 *
 * Both the arc and the count come from stat tracks, and both grow with level:
 * 5 pellets across 18 degrees at level 1, 9 across 36 at level 10. Because
 * every count in the table is odd, one pellet always lands exactly on the
 * turret axis — which is what `PartGameArea.as:3964` keys its muzzle-flare
 * choice off (`bullet.rotation == tower.rotation`).
 *
 * `BulletShotgun` is on the `Bullets` channel, like the MiniGun's `BulletSmall`.
 * Per-pellet damage is low (2.9-3.5); the weapon's output is in landing all of
 * them, which only happens at close range.
 */
export const SHOTGUN: WeaponSpec = {
  name: 'Shotgun',
  upgradeId: 'Shotgun',
  reloadTrack: 0,
  damageTrack: 1,
  fanArcTrack: 2,
  bulletCountTrack: 3,
  bulletRadius: 2,
  bulletSpeed: 36,
  // `bullet.spread = 0` at the AS3 site: the fan replaces random spread rather
  // than compounding with it.
  spread: 0,
  // Flat 16, with no half-width term — see the header.
  muzzleOffset: 16,
  muzzleAlong: 'pellet',
  muzzleIncludesRadius: false,
  // Overridden by bulletCountTrack; the fallback matches level 1.
  bulletsPerShot: 5,
  sound: 'WeaponShotgun',
  explosion: false,
  bulletClass: 'BulletShotgun',
};

/**
 * Penetration Cannon — PartGameArea.as:3876.
 *
 * A Cannon shell that does not stop. It explodes on each enemy it reaches and
 * carries straight on to the next, so a line of enemies takes a chain of
 * separate blasts from one shot.
 *
 * ── Penetration is an omission, not a mechanic ────────────────────────────
 * `PartGameArea.as:5822` sets `theBullet.dead = true` on impact, guarded by a
 * long list of exclusions. `BulletPenetrate` is on that list, so it simply
 * never gets marked dead and keeps flying until it leaves the room.
 *
 * ── What `enemiesArray` is actually for ───────────────────────────────────
 * The bullet carries a list of everything it has already hit (`:3886`), and
 * `:6171` only queues a blast when the enemy is *not* on it. That is not a
 * refinement — it is what stops the round detonating on every single frame it
 * spends inside an enemy's radius. A penetrating bullet overlaps a target for
 * several frames at 18 units/frame, so without the list one shot through one
 * enemy would produce a burst of explosions.
 *
 * Its blast is small (40-67 against the Big Cannon's 80-100) and its damage is
 * mid-range; what it buys is hitting everything along a line.
 */
export const PENETRATION_CANNON: WeaponSpec = {
  name: 'Penetration Cannon',
  upgradeId: 'PenetrationCannon',
  reloadTrack: 0,
  damageTrack: 1,
  explosionTrack: 2,
  bulletRadius: 3,
  bulletSpeed: 18,
  spread: 0,
  muzzleOffset: 16,
  bulletsPerShot: 1,
  // Shares the Cannon's report — the AS3 pushes "WeaponCannon" here.
  sound: 'WeaponCannon',
  explosion: true,
  penetrates: true,
  bulletClass: 'BulletPenetrate',
};

/**
 * Timed Bomb Cannon — PartGameArea.as:3811, attaching at `:5826`.
 *
 * The first weapon that does nothing at all on impact. Its round sticks to the
 * enemy it hits and detonates on a fuse, so the damage arrives 4-5 seconds
 * later, wherever that enemy has walked to by then.
 *
 * ── Nothing happens on contact ────────────────────────────────────────────
 * `explosion` is true, which suppresses direct damage (`:5919` gates that on
 * `explosion == false`); and `:6171` excludes `BulletBomb` from the impact
 * blast every other exploding round gets. So the two damage paths are both
 * closed and the round's entire effect is the attachment.
 *
 * ── It skips enemies that already carry a bomb ────────────────────────────
 * The attach block is guarded by `&& !theEnemy.gotBomb`, and `dead = true`
 * lives *inside* that block. A round that hits an already-bombed enemy
 * therefore neither re-arms it nor stops — it carries on to find an unbombed
 * target. Bombs cannot be stacked or refreshed to hold one enemy indefinitely.
 *
 * The blast itself is large (110-120, plus the host's own radius) and the fuse
 * shortens with level, from 150 frames to 120 — 5 seconds down to 4.
 */
export const TIMED_BOMB_CANNON: WeaponSpec = {
  name: 'Timed Bomb Cannon',
  upgradeId: 'TimedBombCannon',
  reloadTrack: 0,
  damageTrack: 1,
  explosionTrack: 2,
  bombTimerTrack: 3,
  bulletRadius: 6,
  bulletSpeed: 28,
  spread: 0,
  muzzleOffset: 16,
  bulletsPerShot: 1,
  // Shares the Cannon's report, as the Penetration Cannon does.
  sound: 'WeaponCannon',
  explosion: true,
  attachesBomb: true,
  bulletClass: 'BulletBomb',
};

/**
 * Poison Cannon — PartGameArea.as:3836, applying at `:5927`.
 *
 * The inverse of every other weapon: the hit itself is almost irrelevant and
 * the damage arrives afterwards, over time. Direct damage is **1** at level 1
 * — the lowest in the game, a fifth of a MiniGun round — while the poison it
 * leaves does 2.5/second for 5 seconds, so roughly 92% of its output is the
 * damage-over-time.
 *
 * Unusually, both halves run on the same channel: `BulletPoison` is typed
 * `Poison`, and `:5982` scales the direct hit by `poisonMultiplier` too. So an
 * enemy resistant to poison resists the whole weapon, not half of it.
 *
 * ── Poison does not stack ─────────────────────────────────────────────────
 * Re-poisoning an already-poisoned enemy only takes effect when the new dose's
 * *total* damage beats what is left of the old one — see `applyPoison`. Firing
 * this weapon continuously into one target therefore does not compound; it
 * just keeps refreshing the same dose. Its damage is in spreading poison
 * across many enemies, not in concentrating it.
 *
 * An enemy with `poisonMultiplier <= 0` is immune and takes no poison at all.
 */
export const POISON_CANNON: WeaponSpec = {
  name: 'Poison Cannon',
  upgradeId: 'PoisonCannon',
  reloadTrack: 0,
  damageTrack: 1,
  poisonTimeTrack: 2,
  poisonDamageTrack: 3,
  bulletRadius: 4,
  bulletSpeed: 36,
  spread: 5,
  muzzleOffset: 16,
  bulletsPerShot: 1,
  sound: 'WeaponPoisonCannon',
  explosion: false,
  appliesPoison: true,
  bulletClass: 'BulletPoison',
};

/**
 * Flamethrower — PartGameArea.as:3786, with its per-frame behaviour at `:1860`.
 *
 * Fires `BulletFire` on the `FireLava` channel. Almost nothing about it works
 * like the other weapons; see weapons/flames.ts for the lifetime, density and
 * growth rules, which is where the interesting behaviour lives.
 *
 * The headline numbers look feeble — 0.28 damage a shot at level 1, the lowest
 * in the game — but the reload is 3.15 frames and each flame damages **every**
 * enemy it overlaps for **every frame** it is alive, so sustained output
 * against a crowd is high. Track 3 is a range (100-150 units), not a duration.
 *
 * Two behaviours it shares with nothing else:
 *   - it inherits the tank's velocity, so driving forwards throws the jet
 *     further and reversing pulls it in
 *   - flames pass through enemies (`BulletFire` is on the `dead = true`
 *     exclusion list at `:5822`) with no already-hit list, so one flame keeps
 *     burning everything it touches for its whole life
 *
 * ── Fire versus frozen ────────────────────────────────────────────────────
 * A frozen enemy takes **no** fire damage at all (`:6002` requires
 * `frozen == false`); instead the hit knocks 15 frames off its freeze timer
 * (`:5922`). Fire thaws rather than burns. Nothing applies freeze yet, so this
 * is dormant, but it is wired because the timer exists.
 *
 * ── Not ported: the looping sound ─────────────────────────────────────────
 * The AS3 sets `SoundManager.flameThrowerPlay = true` each frame it fires and
 * lets the manager run a sustained loop. There is no looping-SFX path in the
 * port yet, and per docs/AUDIO_PIPELINE.md both looping assets gap and click
 * on repeat until they are re-encoded off MP3. Left silent rather than faked
 * with a per-shot one-shot, which at 3.15 frames would machine-gun.
 */
export const FLAMETHROWER: WeaponSpec = {
  name: 'Flamethrower',
  upgradeId: 'Flamethrower',
  reloadTrack: 0,
  damageTrack: 1,
  flameRangeTrack: 2,
  bulletRadius: 10,
  bulletSpeed: 10,
  spread: 20,
  // Flat 16 along the turret axis, with no half-width term (`:3925`).
  muzzleOffset: 16,
  muzzleIncludesRadius: false,
  bulletsPerShot: 1,
  // Silent for now — see the header.
  sound: '',
  explosion: false,
  isFlame: true,
  penetrates: true,
  inheritsTankVelocity: true,
  bulletClass: 'BulletFire',
};

/**
 * Cake Cannon — PartGameArea.as:3864, bursting at `:6132`.
 *
 * A slow, fat round that shatters into a deterministic ring of fragments
 * around whatever it hits. Both the round and its fragments run on the `Food`
 * channel, like the Gummy Bear Cannon.
 *
 * The fragment count comes from a stat track (6 at level 1, rising to 8), and
 * **fragments spawn fragments** — see weapons/cake.ts, which is where the
 * cascade and its per-frame guard are documented. Against a single enemy the
 * ring mostly flies off into empty room; against a packed crowd it chains.
 *
 * Only the first split halves damage: the parent's 5 becomes 2.5 per fragment,
 * and any fragment that bursts passes 2.5 on unchanged.
 */
export const CAKE_CANNON: WeaponSpec = {
  name: 'Cake Cannon',
  upgradeId: 'CakeCannon',
  reloadTrack: 0,
  damageTrack: 1,
  cakePiecesTrack: 2,
  bulletRadius: 10,
  bulletSpeed: 24,
  spread: 0,
  muzzleOffset: 16,
  bulletsPerShot: 1,
  sound: 'WeaponCakeCannon',
  explosion: false,
  spawnsCakePieces: true,
  bulletClass: 'BulletCake',
};

/**
 * Laser Cannon — PartGameArea.as:3849.
 *
 * The one weapon with nothing in flight: it lays a 1000-unit segment from the
 * muzzle, damages every enemy on it, and is finished in the frame it fired.
 * All of the geometry and the one-frame rule live in weapons/laser.ts.
 *
 * `BulletLaser` is typed on the `Laser` channel — see the note in
 * damageTypes.ts, which previously recorded this incorrectly.
 *
 * Only two stat tracks: reload (23 down to 21.2) and damage (5.5 up to 12).
 * There is no range track, because 1000 units crosses any room in the game.
 */
export const LASER_CANNON: WeaponSpec = {
  name: 'Laser Cannon',
  upgradeId: 'LaserCannon',
  reloadTrack: 0,
  damageTrack: 1,
  bulletRadius: 12,
  // Nothing moves; the segment is laid down whole.
  bulletSpeed: 0,
  spread: 0,
  muzzleOffset: 16,
  bulletsPerShot: 1,
  sound: 'WeaponLaser',
  explosion: false,
  isBeam: true,
  bulletClass: 'BulletLaser',
};

/**
 * Magic Cannon — PartGameArea.as:3889.
 *
 * The last primary, and the one whose behaviour is least like its description.
 * It is **not** a homing missile: it flies straight until it hits something,
 * and only then starts seeking. All of the chaining rules are in
 * weapons/magic.ts, including a deliberate divergence from an AS3 bug.
 *
 * Low damage (2.2 rising to 3.5) spread across three targets — four from level
 * 6 — so its value is entirely in reaching enemies the player never aimed at.
 */
export const MAGIC_CANNON: WeaponSpec = {
  name: 'Magic Cannon',
  upgradeId: 'MagicCannon',
  reloadTrack: 0,
  damageTrack: 1,
  targetsTrack: 2,
  bulletRadius: 8,
  bulletSpeed: 14,
  spread: 0,
  // `:3935` — 12 plus the half-width, unlike the usual 16.
  muzzleOffset: 12,
  bulletsPerShot: 1,
  sound: 'WeaponMagicCannon',
  explosion: false,
  isHoming: true,
  bulletClass: 'BulletMagic',
};

/**
 * Weapons ported so far, by display name.
 *
 * ── The one still outstanding ─────────────────────────────────────────────
 * Graded by dependency rather than by how unusual each sounds — see the
 * "Calling something blocked" section of CLAUDE.md for why that distinction
 * cost three wrong flags.
 *
 *   Magic Cannon       needs homing steering and target selection; the
 *                      already-hit list it also wants already exists
 */
export const PRIMARY_WEAPONS: Readonly<Record<string, WeaponSpec>> = {
  Cannon: CANNON,
  MiniGun: MINIGUN,
  'Big Cannon': BIG_CANNON,
  'Gummy Bear Cannon': GUMMY_BEAR_CANNON,
  Shotgun: SHOTGUN,
  'Penetration Cannon': PENETRATION_CANNON,
  'Timed Bomb Cannon': TIMED_BOMB_CANNON,
  'Poison Cannon': POISON_CANNON,
  Flamethrower: FLAMETHROWER,
  'Cake Cannon': CAKE_CANNON,
  'Laser Cannon': LASER_CANNON,
  'Magic Cannon': MAGIC_CANNON,
};

export function getWeapon(name: string): WeaponSpec | undefined {
  return PRIMARY_WEAPONS[name];
}

export interface WeaponStats {
  /** Frames between shots at 30 fps. */
  reloadTimeMax: number;
  damage: number;
  explosionRadius: number;
  /** Pellets per shot, when the weapon reads it from a track. */
  bulletCount?: number;
  /** Total fan arc in degrees, when the weapon reads it from a track. */
  fanArc?: number;
  /** Fuse length in frames, for a bomb-attaching weapon. */
  bombTimer?: number;
  /** Poison duration in frames, before the enemy's own scaling. */
  poisonTime?: number;
  /** Poison damage per second, before the enemy's own scaling. */
  poisonDamage?: number;
  /** Flame range in design units, converted to a lifetime at spawn. */
  flameRange?: number;
  /** Fragments produced on impact, for the Cake Cannon. */
  cakePieces?: number;
  /** Enemies one homing round may damage before it dies. */
  targets?: number;
}

/**
 * Resolves a weapon's per-level stats from the player's upgrades.
 *
 * Returns null when the weapon is unowned (level 0) — its stat tracks have no
 * level-0 entry, which is the case the AS3 guards for at every call site.
 */
export function resolveWeaponStats(
  spec: WeaponSpec,
  upgrades: UpgradeState,
): WeaponStats | null {
  const upgrade = findUpgradeById(spec.upgradeId);
  if (!upgrade) return null;

  const reloadTimeMax = getStatValue(upgrades, upgrade, spec.reloadTrack);
  const damage = getStatValue(upgrades, upgrade, spec.damageTrack);
  if (reloadTimeMax === null || damage === null) return null;

  const explosionRadius =
    spec.explosionTrack === undefined
      ? 0
      : (getStatValue(upgrades, upgrade, spec.explosionTrack) ?? 0);

  const stats: WeaponStats = { reloadTimeMax, damage, explosionRadius };

  if (spec.bulletCountTrack !== undefined) {
    stats.bulletCount =
      getStatValue(upgrades, upgrade, spec.bulletCountTrack) ?? spec.bulletsPerShot;
  }
  if (spec.fanArcTrack !== undefined) {
    stats.fanArc = getStatValue(upgrades, upgrade, spec.fanArcTrack) ?? 0;
  }
  if (spec.bombTimerTrack !== undefined) {
    stats.bombTimer = getStatValue(upgrades, upgrade, spec.bombTimerTrack) ?? 0;
  }
  if (spec.poisonTimeTrack !== undefined) {
    stats.poisonTime = getStatValue(upgrades, upgrade, spec.poisonTimeTrack) ?? 0;
  }
  if (spec.poisonDamageTrack !== undefined) {
    stats.poisonDamage = getStatValue(upgrades, upgrade, spec.poisonDamageTrack) ?? 0;
  }
  if (spec.targetsTrack !== undefined) {
    stats.targets = getStatValue(upgrades, upgrade, spec.targetsTrack) ?? 0;
  }
  if (spec.cakePiecesTrack !== undefined) {
    stats.cakePieces = getStatValue(upgrades, upgrade, spec.cakePiecesTrack) ?? 0;
  }
  if (spec.flameRangeTrack !== undefined) {
    // Balance override — see FLAME_RANGE_MULTIPLIER.
    const raw = getStatValue(upgrades, upgrade, spec.flameRangeTrack) ?? 0;
    stats.flameRange = raw * FLAME_RANGE_MULTIPLIER;
  }

  return stats;
}

/** A projectile as `tankAttack` configures it, before it starts flying. */
export interface BulletSpec {
  x: number;
  y: number;
  /** Degrees. */
  rotation: number;
  xVel: number;
  yVel: number;
  speed: number;
  radius: number;
  damage: number;
  explosion: boolean;
  explosionRadius: number;
  /** Carried through from the spec so the entity knows to survive impact. */
  penetrates: boolean;
  /** Non-zero when this round attaches a bomb rather than exploding. */
  bombTimer: number;
  /** Freeze duration in frames; 0 when this round leaves no freeze. */
  freezeTime: number;
  /** Poison duration in frames; 0 when this round leaves no poison. */
  poisonTime: number;
  /** Poison damage per second. */
  poisonDamage: number;
  /** Fragments to produce on impact; 0 when this round does not burst. */
  cakePieces: number;
  /** Enemies this round may chain through; 0 when it does not home. */
  targets: number;
  /**
   * Locked to one enemy at launch and never re-acquiring — Rockets (`:1762`).
   *
   * Distinct from `targets`, which is Magic's chain: that one *searches* as it
   * flies. A seeking round is committed to whatever it was given and flies
   * straight once it loses it.
   */
  seeking?: boolean;
}

export interface FiringState {
  /** Frames until the weapon can fire again. AS3 `ScreenGame.reloadTime`. */
  reloadTime: number;
}

export function createFiringState(): FiringState {
  return { reloadTime: 0 };
}

/** Counts the reload timer down. Call once per frame. */
export function tickFiring(state: FiringState, deltaMs: number): void {
  const frames = (deltaMs / 1000) * AS3_FPS;
  state.reloadTime = Math.max(0, state.reloadTime - frames);
}

export interface FireContext {
  /** Tank centre. */
  x: number;
  y: number;
  /** Turret facing in degrees — the tower aims independently of the body. */
  towerRotation: number;
  random?: () => number;
  /**
   * The tank's own velocity in units per frame. Only the Flamethrower adds it
   * (`:3947`), so driving forwards throws the jet further and reversing pulls
   * it in. Ignored by every other weapon.
   */
  tankXVel?: number;
  tankYVel?: number;
}

/**
 * Fires if the weapon is ready, returning the bullets produced.
 *
 * Returns an empty array when still reloading, so the caller can call this
 * unconditionally while the fire button is held.
 */
export function fire(
  state: FiringState,
  spec: WeaponSpec,
  stats: WeaponStats,
  context: FireContext,
): BulletSpec[] {
  if (state.reloadTime > 0) return [];

  const {
    x,
    y,
    towerRotation,
    random = Math.random,
    tankXVel = 0,
    tankYVel = 0,
  } = context;
  const inheritX = spec.inheritsTankVelocity ? tankXVel : 0;
  const inheritY = spec.inheritsTankVelocity ? tankYVel : 0;

  // Accumulate rather than assign, so cadence does not drift.
  state.reloadTime += stats.reloadTimeMax;

  const count = stats.bulletCount ?? spec.bulletsPerShot;
  const fanArc = stats.fanArc ?? 0;
  // `arc / (count - 1)` would divide by zero at a single pellet. The AS3 has
  // the same hole and never falls in it: the Shotgun's count track is
  // [5,5,5,7,7,7,9,9,9,9], so it is never below 5. Guarded rather than relied
  // on, since a future fan weapon might not be so lucky.
  const fanning = fanArc > 0 && count > 1;

  const bullets: BulletSpec[] = [];
  for (let i = 0; i < count; i += 1) {
    const rotation = fanning
      ? towerRotation - fanArc / 2 + (fanArc / (count - 1)) * i
      : spec.spread === 0
        ? towerRotation
        : towerRotation - spec.spread / 2 + random() * spec.spread;

    const radians = (rotation * Math.PI) / 180;

    // See the header: direction and offset are independent.
    const muzzleRadians =
      spec.muzzleAlong === 'pellet' ? radians : (towerRotation * Math.PI) / 180;
    const offset =
      spec.muzzleIncludesRadius === false
        ? spec.muzzleOffset
        : spec.muzzleOffset + spec.bulletRadius;

    bullets.push({
      x: x + Math.cos(muzzleRadians) * offset,
      y: y + Math.sin(muzzleRadians) * offset,
      rotation,
      xVel: Math.cos(radians) * spec.bulletSpeed + inheritX,
      yVel: Math.sin(radians) * spec.bulletSpeed + inheritY,
      speed: spec.bulletSpeed,
      radius: spec.bulletRadius,
      damage: stats.damage,
      explosion: spec.explosion,
      explosionRadius: stats.explosionRadius,
      penetrates: spec.penetrates ?? false,
      bombTimer: spec.attachesBomb ? (stats.bombTimer ?? 0) : 0,
      freezeTime: 0,
      seeking: false,
      poisonTime: spec.appliesPoison ? (stats.poisonTime ?? 0) : 0,
      poisonDamage: spec.appliesPoison ? (stats.poisonDamage ?? 0) : 0,
      cakePieces: spec.spawnsCakePieces ? (stats.cakePieces ?? 0) : 0,
      targets: spec.isHoming ? (stats.targets ?? 0) : 0,
    });
  }

  return bullets;
}
