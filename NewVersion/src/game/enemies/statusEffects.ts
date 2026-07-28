/**
 * Per-enemy status effects — poison, attached bombs, and freeze.
 *
 * Extracted from the enemy behaviour loop: the bomb countdown at
 * `PartGameArea.as:6312`, the freeze countdown at `:6326`, and the poison
 * damage-over-time at `:6366`. Application sites are `:5831` (bomb), `:5849`
 * (freeze) and `:5902` (poison).
 *
 * ── Why these three live together ─────────────────────────────────────────
 * They are the same mechanism with different payloads: a per-enemy counter
 * that survives across frames, ticks down, and does something on the way. That
 * counter is the one piece of infrastructure the Timed Bomb Cannon and the
 * Poison Cannon were both blocked on, and Ice Grenade, Poison Grenade, Icicles
 * and Poison Spikes need it too.
 *
 * Everything here is pure and frame-rate independent. Timers are in AS3 frames
 * at 30 fps and are decremented by fractional frames, matching how the rest of
 * the port handles `deltaMs`.
 *
 * ── Three different scaling rules, deliberately ───────────────────────────
 * Each effect scales against its own resistance channel, and none of them the
 * same way. This is faithful, not a simplification:
 *
 *   poison   `time * (0.5 + m/2)` AND `damage * (0.5 + m/2)` — applied to both
 *            terms, so a 1.5x multiplier is 1.25x on each and ~1.56x overall
 *   freeze   `time * m` — plain, and quartered outright against a boss
 *   bomb     no scaling at all; the blast resolves through the normal
 *            Explosions channel when it goes off
 *
 * ── Not ported ────────────────────────────────────────────────────────────
 * `DamageAddict`/`DamageAddictB`, which are *healed* by poison via
 * `hitDamageAddict` rather than damaged, and every particle/indicator spawn
 * (the ice overlay, the poison motes, the strength/weakness pips). Those are
 * cosmetic or belong to enemies not yet ported.
 */

import type { ExplosionSpec } from '../weapons/explosions';

const AS3_FPS = 30;

/** Every timer an enemy can be carrying. All in frames at 30 fps. */
export interface StatusState {
  /** Gate for the poison branch; false once the timer has drained. */
  onPoison: boolean;
  poisonTimer: number;
  /**
   * Damage per **second**, not per frame — the AS3 applies
   * `poisonDamage / 30` each frame, so the stored figure is a rate.
   */
  poisonDamage: number;

  /** True while a Timed Bomb Cannon round is riding this enemy. */
  gotBomb: boolean;
  bombTimer: number;
  /** Kept for the shrinking on-enemy indicator, which reads the ratio. */
  bombTimerMax: number;
  bombRadius: number;
  bombDamage: number;

  frozen: boolean;
  frozenTimer: number;
}

export function createStatusState(): StatusState {
  return {
    onPoison: false,
    poisonTimer: 0,
    poisonDamage: 0,
    gotBomb: false,
    bombTimer: 0,
    bombTimerMax: 0,
    bombRadius: 0,
    bombDamage: 0,
    frozen: false,
    frozenTimer: 0,
  };
}

/** The poison scaling factor, applied to duration *and* damage. */
export function poisonScale(poisonMultiplier: number): number {
  return 0.5 + poisonMultiplier / 2;
}

export interface PoisonSource {
  /** Frames of poison at a neutral multiplier. */
  poisonTime: number;
  /** Damage per second at a neutral multiplier. */
  poisonDamage: number;
}

/**
 * Applies poison, or refuses.
 *
 * Two rules worth keeping straight:
 *
 *   - An enemy with `poisonMultiplier <= 0` is **immune** and cannot be
 *     poisoned at all (`:5899`). Nothing is applied, not even a zero-damage
 *     timer.
 *   - Poison does not stack, and does not blindly refresh. A second
 *     application replaces the first only when its *total remaining damage*
 *     (`time * damage`) would be greater (`:5908`). A long weak poison
 *     therefore survives a short strong one.
 *
 * Returns true when the state changed.
 */
export function applyPoison(
  state: StatusState,
  source: PoisonSource,
  poisonMultiplier: number,
): boolean {
  if (poisonMultiplier <= 0) return false;

  const scale = poisonScale(poisonMultiplier);
  const timer = Math.round(source.poisonTime * scale);
  const damage = source.poisonDamage * scale;

  if (!state.onPoison) {
    state.onPoison = true;
    state.poisonTimer = timer;
    state.poisonDamage = damage;
    return true;
  }

  // The AS3 compares the *unrounded* incoming product against the stored one.
  const incoming = source.poisonTime * scale * source.poisonDamage * scale;
  if (incoming > state.poisonTimer * state.poisonDamage) {
    state.poisonTimer = timer;
    state.poisonDamage = damage;
    return true;
  }

  return false;
}

export interface BombSource {
  /** Fuse length in frames — `upgradeArrayTimedBombCannon` track 3. */
  bombTimer: number;
  explosionRadius: number;
  damage: number;
}

/**
 * Attaches a bomb, or refuses if one is already riding this enemy.
 *
 * The whole attach block is guarded by `&& !theEnemy.gotBomb` (`:5826`), so a
 * bomb never replaces or refreshes an existing one — the first fuse runs to
 * completion untouched. That also means the *bullet* survives a hit on an
 * already-bombed enemy, since `theBullet.dead = true` sits inside the same
 * block; it flies on looking for an unbombed target.
 *
 * Returns true when the bomb was attached.
 */
export function applyBomb(state: StatusState, source: BombSource): boolean {
  if (state.gotBomb) return false;

  state.gotBomb = true;
  state.bombTimerMax = source.bombTimer;
  state.bombTimer = source.bombTimer;
  state.bombRadius = source.explosionRadius;
  state.bombDamage = source.damage;
  return true;
}

/**
 * Freezes, scaled by the enemy's Ice multiplier and quartered against a boss
 * (`:5852`). Unlike poison this always overwrites, so a refresh is a straight
 * reset rather than a comparison.
 */
/**
 * ── The Tower ramp reset lives in `Enemy.freeze`, not here ────────────────
 * `PartGameArea.as:5864`, `:6228` and `:6572` each set `accSpeed = 0` under
 * `levelMode == "Tower"`, immediately after their `frozen = true`. That needs
 * the *enemy*, not the status record, so it cannot live in this function —
 * `Enemy.freeze` wraps both and is the only thing gameplay calls.
 *
 * This note used to say the step was unimplemented because nothing froze yet.
 * Something does now, and it is implemented; the pointer is kept because the
 * split is not obvious from either side alone.
 */
export function applyFreeze(
  state: StatusState,
  frozenTime: number,
  iceMultiplier: number,
  isBoss: boolean,
): void {
  state.frozen = true;
  state.frozenTimer = Math.round((frozenTime * iceMultiplier) / (isBoss ? 4 : 1));
}

/** Where the enemy is, for placing a bomb blast. */
export interface StatusHost {
  x: number;
  y: number;
  radius: number;
}

export interface StatusTickResult {
  /** Poison damage this tick, already at the enemy's scaled rate. */
  damage: number;
  /** Blasts to spawn — a bomb whose fuse ran out. */
  explosions: ExplosionSpec[];
}

/**
 * Advances every timer by one step and reports what came of it.
 *
 * Mutates `state`, which is deliberate: an enemy owns exactly one of these and
 * copying it every frame for every enemy would be pure waste.
 */
export function tickStatuses(
  state: StatusState,
  host: StatusHost,
  deltaMs: number,
): StatusTickResult {
  const frames = (deltaMs / 1000) * AS3_FPS;
  const result: StatusTickResult = { damage: 0, explosions: [] };

  if (state.onPoison) {
    if (state.poisonTimer > 0) {
      // Damage only for the frames the timer actually covers, so a long delta
      // cannot collect more poison than the effect had left to give.
      const active = Math.min(frames, state.poisonTimer);
      result.damage += (state.poisonDamage / AS3_FPS) * active;
      state.poisonTimer -= frames;
    }

    if (state.poisonTimer <= 0) {
      state.onPoison = false;
      state.poisonTimer = 0;
      state.poisonDamage = 0;
    }
  }

  if (state.gotBomb) {
    state.bombTimer -= frames;
    if (state.bombTimer <= 0) {
      state.gotBomb = false;
      state.bombTimer = 0;
      result.explosions.push({
        x: host.x,
        y: host.y,
        // Enlarged by the host's own radius — `:6318`.
        radius: state.bombRadius + host.radius,
        damage: state.bombDamage,
        type: 'Normal',
        smallSound: true,
      });
    }
  }

  if (state.frozen) {
    state.frozenTimer -= frames;
    if (state.frozenTimer <= 0) {
      state.frozen = false;
      state.frozenTimer = 0;
    }
  }

  return result;
}

/** Fraction of the fuse remaining, for the shrinking bomb indicator. */
export function bombFuseRemaining(state: StatusState): number {
  if (!state.gotBomb || state.bombTimerMax <= 0) return 0;
  return Math.max(0, Math.min(1, state.bombTimer / state.bombTimerMax));
}
