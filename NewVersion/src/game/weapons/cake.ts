/**
 * Cake Cannon fragments — `PartGameArea.as:6132`.
 *
 * On **killing** an enemy, a cake round bursts into a ring of `BulletCakePiece`
 * projectiles fired outward from the *enemy*, not from the point of impact.
 *
 * The spawn block at `:6132` sits in the `else` of `:5981`, whose condition is
 * the enemy *surviving* the hit — so a cake that merely wounds does nothing but
 * damage. The upgrade text agrees: "If an enemy is **killed** by a cake or a
 * cake slice, the enemy will shoot cake slices." This module was documented as
 * bursting on impact and the scene did that until T216.
 *
 * ── Pieces spawn pieces ───────────────────────────────────────────────────
 * The spawn block is guarded by `theBullet == BulletCake || theBullet ==
 * BulletCakePiece`, and each piece inherits the parent's `pieces` count. So a
 * fragment that finds another enemy bursts again, and the weapon cascades
 * through a crowd. Only the *first* generation halves its damage
 * (`:6140` — `BulletCake` gives `damage / 2`, a piece passes its own damage
 * along unchanged), so the cascade does not decay after the first split.
 *
 * ── One burst per enemy per frame ─────────────────────────────────────────
 * `enemy.hitByCake` guards the whole block and is reset each frame at `:5556`,
 * alongside `onFire` and `onLava`. It is a same-frame dedup flag, not a status
 * effect. Its second job is subtler: `:5822` includes
 * `(theBullet != BulletCakePiece || !theEnemy.hitByCake)` in the condition that
 * marks a bullet dead, and that line runs *before* the spawn block. So within
 * one frame:
 *
 *   - the first cake projectile to reach an enemy dies and bursts
 *   - every later piece touching that same enemy passes straight through,
 *     neither bursting nor being consumed
 *
 * Without that, a ring of fragments spawned on top of an enemy would each
 * immediately re-burst on it and the count would run away.
 *
 * The ring starts at -90 degrees (straight up) and is evenly spaced, so it is
 * deterministic — no random draw is involved.
 *
 * ── Balance changes ───────────────────────────────────────────────────────
 * Two deliberate divergences from the AS3, both requested rather than traced:
 * `CAKE_EXTRA_PIECES` adds one fragment to every burst, and fragments are
 * `CAKE_PIECE_SIZE_DIVISOR` times smaller than the original radius of 5.
 */

import type { BulletSpec } from './firing';

/**
 * `cakeBullet.radius = 5` in the AS3, divided by CAKE_PIECE_SIZE_DIVISOR.
 *
 * **Deliberate balance change** — the fragments read as too chunky in play.
 */
export const CAKE_PIECE_RADIUS = 5 / 3;

/** How much smaller than the AS3 the fragments are drawn and tested. */
export const CAKE_PIECE_SIZE_DIVISOR = 3;

/**
 * **Deliberate balance change** — one fragment beyond the table's count, so a
 * level-1 burst scatters 7 rather than 6.
 *
 * Applied here rather than in the generated `upgrades/upgradeData.ts`, for the
 * same reason as FLAME_RANGE_MULTIPLIER: that file is regenerated from the AS3
 * and verified by `npm run data:check`.
 */
export const CAKE_EXTRA_PIECES = 1;

/** `cakeBullet.speed = 24`. */
export const CAKE_PIECE_SPEED = 24;

/** The ring's first fragment points straight up. */
export const CAKE_RING_START_DEGREES = -90;

export interface CakeSource {
  /** Fragments to produce, inherited by each generation. */
  pieces: number;
  damage: number;
  /**
   * True for the `BulletCake` round itself, which halves its damage when it
   * splits. Fragments pass their damage on unchanged.
   */
  isParent: boolean;
}

/** The enemy the burst is centred on. */
export interface CakeHost {
  x: number;
  y: number;
  radius: number;
}

/**
 * The ring of fragments a cake round produces on impact.
 *
 * Fragments start just outside the host (`enemy.radius + 5`) so they do not
 * immediately re-test against it, and fly straight outward.
 */
export function spawnCakePieces(source: CakeSource, host: CakeHost): BulletSpec[] {
  const pieces: BulletSpec[] = [];
  if (source.pieces <= 0) return pieces;

  const damage = source.isParent ? source.damage / 2 : source.damage;
  // Balance: one more than the table says. The ring still divides evenly, so
  // the extra fragment simply narrows the spacing rather than leaving a gap.
  const count = source.pieces + CAKE_EXTRA_PIECES;

  for (let q = 0; q < count; q += 1) {
    const degrees = (360 / count) * q + CAKE_RING_START_DEGREES;
    const radians = (degrees * Math.PI) / 180;
    const offset = host.radius + CAKE_PIECE_RADIUS;

    pieces.push({
      x: host.x + Math.cos(radians) * offset,
      y: host.y + Math.sin(radians) * offset,
      rotation: degrees,
      xVel: Math.cos(radians) * CAKE_PIECE_SPEED,
      yVel: Math.sin(radians) * CAKE_PIECE_SPEED,
      speed: CAKE_PIECE_SPEED,
      radius: CAKE_PIECE_RADIUS,
      damage,
      explosion: false,
      explosionRadius: 0,
      penetrates: false,
      bombTimer: 0,
      freezeTime: 0,
      poisonTime: 0,
      poisonDamage: 0,
      // Inherited as the *table* count, not the boosted one, so the bonus is
      // applied once per burst rather than compounding through a cascade.
      cakePieces: source.pieces,
      // Fragments do not home.
      targets: 0,
    });
  }

  return pieces;
}
