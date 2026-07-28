/**
 * Shield — `PartGameArea.as:4102` (use), `:1008` (timer), `:1555-1610` (effect).
 *
 * ── It reflects; it does not absorb ───────────────────────────────────────
 * The name suggests damage reduction and that is not what it does. While up:
 *
 *   - the tank's hit radius **doubles** for enemy bullets (`:1555`);
 *   - a bullet that reaches it is **turned around** rather than resolved —
 *     re-aimed away from the tank, set to a flat speed 10, given 18 frames of
 *     life and marked `reflected` (`:1592-1602`);
 *   - contact damage from non-bosses is off entirely (`:5273` skips the block),
 *     and a boss connects at the doubled radius for zero damage plus a sound.
 *
 * **A reflected bullet damages nothing.** There is no enemy-collision branch in
 * the enemy-bullet loop, so it simply flies off and expires. The reflect is a
 * removal with a visual, not damage return — worth stating because every reading
 * of the word suggests otherwise.
 *
 * ── One mechanism, two ways in ────────────────────────────────────────────
 * `:1557` is a single condition covering the Shield *and* the `BulletReflect`
 * misc upgrade. Without the shield, `BulletReflect` rolls a probability at the
 * normal radius; with it, reflection is certain at double. They are not two
 * features that resemble each other — they are one branch with two entrances,
 * which is why `reflectChance` below takes both.
 *
 * ── Upgrading buys time, never a shorter wait ─────────────────────────────
 * `upgradeArrayShield` is `[prices, 700 x10, 100..262]`. The cooldown is flat at
 * every level — 700 frames, 23.3 seconds — and only the duration grows, 3.3s to
 * 8.7s. Same deliberate set-piece shape as the Mine's flat 600.
 */

import type { EnemyBulletState } from '../enemies/enemyFiring';

/** Hit-radius multiplier while the shield is up — `:1555`, `:5275`. */
export const SHIELD_RADIUS_MULTIPLIER = 2;

/** Speed a reflected bullet is set to, replacing whatever it had — `:1596`. */
export const REFLECT_SPEED = 10;

/** Frames a reflected bullet survives — `:1599`. */
export const REFLECT_LIFETIME = 18;

/**
 * Frames of fade at the end of the window — `:1013`.
 *
 * `alpha = timer / 120 * 0.9 + 0.1`, so it runs 1.0 down to 0.1 rather than to
 * zero: the shield stays visible until the moment it drops. A fade to zero
 * would read as "already gone" for the last second of a window the player can
 * still use.
 */
export const SHIELD_FADE_FRAMES = 120;

export interface ShieldState {
  on: boolean;
  /** Frames remaining. */
  timer: number;
}

export function createShieldState(): ShieldState {
  return { on: false, timer: 0 };
}

/** Raises the shield for `duration` frames — `:4104-4106`. */
export function raiseShield(duration: number): ShieldState {
  return { on: duration > 0, timer: duration };
}

/**
 * Counts the window down.
 *
 * The AS3 decrements only while `shieldTimer > 0` and drops the shield on the
 * frame it finds the timer already at zero, so a duration of N is N frames of
 * cover and the drop lands on frame N+1. Reproduced rather than tidied to N,
 * because the same one-frame shape appears in the ghost blink and the medic
 * pulse and they should stay comparable.
 */
export function tickShield(state: ShieldState, frames: number): ShieldState {
  if (!state.on) return state;
  if (state.timer <= 0) return { on: false, timer: 0 };
  return { on: true, timer: Math.max(0, state.timer - frames) };
}

/** Opacity of the shield sprite — see `SHIELD_FADE_FRAMES`. */
export function shieldAlpha(state: ShieldState): number {
  if (!state.on) return 0;
  if (state.timer >= SHIELD_FADE_FRAMES) return 1;
  return (state.timer / SHIELD_FADE_FRAMES) * 0.9 + 0.1;
}

/** How far the tank reaches for enemy bullets and boss contact. */
export function shieldRadiusMultiplier(state: ShieldState): number {
  return state.on ? SHIELD_RADIUS_MULTIPLIER : 1;
}

/**
 * Whether an incoming bullet is turned away — `:1557`.
 *
 * The shield makes it certain; `BulletReflect` makes it a roll. Written as one
 * function taking both because the AS3 writes it as one condition, and because
 * splitting it would invite the two to drift.
 *
 * `random` is injected so the roll is testable. The AS3 compares
 * `Math.random() > chance` for the *damage* branch, so the reflect happens on
 * `random() <= chance` — the inversion is easy to get backwards and would make
 * a level-1 upgrade reflect almost everything.
 */
export function reflectChance(
  shielded: boolean,
  bulletReflectChance: number,
  random: () => number = Math.random,
): boolean {
  if (shielded) return true;
  if (bulletReflectChance <= 0) return false;
  return random() <= bulletReflectChance;
}

/**
 * Enemy bullet types that ignore the shield — `:1557`.
 *
 * `EnemyBulletTrap` is exempt from reflection *and* from the doubled radius: it
 * still has to reach the tank's own body to connect, but once there the shield
 * does not stop it. A Trap's mine is not a projectile that can be batted away.
 */
export function isReflectable(bulletClass: string): boolean {
  return bulletClass !== 'EnemyBulletTrap';
}

/**
 * The bullet, turned away — `:1592-1602`.
 *
 * Aimed along the tank-to-bullet bearing, which points outward, so it leaves on
 * the line it arrived on. Speed and lifetime are replaced outright rather than
 * scaled: a slow bullet and a fast one come back identically.
 *
 * `reflected` is what stops it hitting the tank again — the loop's outer guard
 * is `!bullet.reflected && …`, so a reflected round is invisible to the tank for
 * the rest of its short life.
 */
export function reflectBullet(
  bullet: EnemyBulletState,
  tank: { x: number; y: number },
): EnemyBulletState {
  const angle = Math.atan2(bullet.y - tank.y, bullet.x - tank.x);

  return {
    ...bullet,
    rotation: (angle * 180) / Math.PI,
    xVel: Math.cos(angle) * REFLECT_SPEED,
    yVel: Math.sin(angle) * REFLECT_SPEED,
    lifeTime: REFLECT_LIFETIME,
    reflected: true,
  };
}
