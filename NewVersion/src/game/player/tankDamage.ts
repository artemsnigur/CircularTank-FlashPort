/**
 * Enemy-to-tank contact damage — extracted from `PartGameArea`'s enemy
 * behaviour loop (lines 5271-5334).
 *
 * The loop itself remains unported; this is the collision branch only, which is
 * self-contained: it reads the enemy's damage, the tank's push state, and the
 * Enemy Absorption upgrade, and produces a damage number plus a knockback.
 *
 * ── The rule, and its two surprises ───────────────────────────────────────
 *  1. **A non-boss enemy dies on contact and pays no money.** It is a suicide
 *     attack, not a melee exchange — `dead = true; noMoney = true`. Killing
 *     enemies before they reach you is the only way to earn from them.
 *  2. **A boss does not die.** It knocks the tank away at a fixed speed of 8
 *     and sets `pushed`, which quarters incoming contact damage for the next
 *     20 frames — a brief grace window after being hit.
 *
 * Also modelled: the **Enemy Absorption** misc upgrade, which scales contact
 * damage by `1 - absorption`. Not modelled: the shield (`shieldOn`), which
 * blocks contact damage entirely and belongs with the secondary weapons.
 */

import type { UpgradeState } from '../upgrades/upgradeState';
import { findUpgradeById, getStatValue } from '../upgrades/upgradeState';

/** ScreenGame.as:396 — the tank starts every level at full health. */
export const TANK_MAX_HP = 100;

/** Tank.as:23 — collision radius in design units. */
export const TANK_RADIUS = 14;

/** Tank.as:39 — frames the push state lasts. */
export const PUSHED_TIMER_MAX = 20;

/** Speed the tank is flung at when a boss connects. */
export const BOSS_PUSH_SPEED = 8;

/** Damage is quartered while the tank is in its post-push grace window. */
export const PUSHED_DAMAGE_DIVISOR = 4;

export interface ContactParticipants {
  tankX: number;
  tankY: number;
  tankRadius: number;
  enemyX: number;
  enemyY: number;
  enemyRadius: number;
  /** Bosses use a doubled radius when the shield is up; see `shieldOn`. */
  isBoss: boolean;
  shieldOn?: boolean;
}

/**
 * Whether the enemy is touching the tank.
 *
 * With the shield up, only bosses can connect, and at twice the tank's radius.
 */
export function isTouchingTank(participants: ContactParticipants): boolean {
  const { tankX, tankY, tankRadius, enemyX, enemyY, enemyRadius, isBoss } = participants;
  const shieldOn = participants.shieldOn ?? false;

  if (shieldOn && !isBoss) return false;

  const distance = Math.hypot(enemyX - tankX, enemyY - tankY);
  const reach = shieldOn && isBoss ? enemyRadius + tankRadius * 2 : enemyRadius + tankRadius;
  return distance < reach;
}

/**
 * Enemy Absorption multiplier — misc upgrade index 2.
 *
 * Returns 1 at level 0 (not owned). The upgrade's stat track has 10 entries
 * indexed by `level - 1`, which is why the AS3 guards with
 * `levelsArrayMisc[2] != 0` before reading it.
 */
export function absorptionMultiplier(upgrades: UpgradeState): number {
  const absorb = findUpgradeById('EnemyAbsorb');
  if (!absorb) return 1;

  const value = getStatValue(upgrades, absorb, 0);
  if (value === null) return 1;
  return 1 - value;
}

export interface ContactDamageInput {
  enemyDamage: number;
  upgrades: UpgradeState;
  /** True while the tank is in its post-knockback grace window. */
  pushed: boolean;
  shieldOn?: boolean;
}

/**
 * Contact damage after the push grace window and Enemy Absorption.
 *
 * Rounded, matching the AS3. Zero while the shield is up.
 */
export function contactDamage({
  enemyDamage,
  upgrades,
  pushed,
  shieldOn = false,
}: ContactDamageInput): number {
  if (shieldOn) return 0;

  let multiplier = 1;
  if (pushed) multiplier /= PUSHED_DAMAGE_DIVISOR;
  multiplier *= absorptionMultiplier(upgrades);

  return Math.round(enemyDamage * multiplier);
}

export interface ContactResult {
  /** Tank health after the hit, floored at 0. */
  hp: number;
  /** Damage actually dealt. */
  damage: number;
  /** True when the enemy should be removed — non-bosses die on contact. */
  enemyDies: boolean;
  /** True when the enemy dies without paying out. */
  noMoney: boolean;
  /** Knockback applied to the tank; null unless a boss connected. */
  push: { xVel: number; yVel: number; x: number; y: number } | null;
}

/**
 * Resolves one enemy-tank contact.
 *
 * Assumes `isTouchingTank` already returned true.
 */
export function resolveContact(
  participants: ContactParticipants,
  input: ContactDamageInput,
  hp: number,
): ContactResult {
  const damage = contactDamage(input);
  const nextHp = Math.max(0, hp - damage);

  if (!participants.isBoss) {
    // Suicide attack: the enemy is consumed and pays nothing.
    return { hp: nextHp, damage, enemyDies: true, noMoney: true, push: null };
  }

  // A boss survives and flings the tank away along the tank->enemy axis,
  // reversed so the tank moves *from* the enemy.
  const { tankX, tankY, tankRadius, enemyX, enemyY, enemyRadius } = participants;
  const angle = Math.atan2(enemyY - tankY, enemyX - tankX) - Math.PI;

  const distance = Math.hypot(enemyX - tankX, enemyY - tankY);
  const overlapping = distance < tankRadius + enemyRadius - 5;

  return {
    hp: nextHp,
    damage,
    enemyDies: false,
    noMoney: false,
    push: {
      xVel: Math.cos(angle) * BOSS_PUSH_SPEED,
      yVel: Math.sin(angle) * BOSS_PUSH_SPEED,
      // Only un-overlap when genuinely inside, as the AS3 does.
      x: overlapping ? enemyX + Math.cos(angle) * (tankRadius + enemyRadius) : tankX,
      y: overlapping ? enemyY + Math.sin(angle) * (tankRadius + enemyRadius) : tankY,
    },
  };
}
