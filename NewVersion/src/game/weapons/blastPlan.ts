/**
 * What a blast does to one enemy — `PartGameArea.as:6437-6620`.
 *
 * Split out of `GameplayScene.spawnExplosion` so the two rules that had only
 * ever been asserted as source text can be driven for real:
 *
 *  - the ice **generation gate** (`:6484`), which refuses damage *and* status
 *    together, because the `hp -=` sits inside that branch;
 *  - the **stamp**, which only the Ice Ball may write (`:6554`).
 *
 * The scene keeps the effects — spawning the sprite, queueing the sound,
 * removing the dead. This decides, and deciding is the part that was wrong
 * twice and untestable both times.
 */
import type { DamageMultipliers } from '../enemies/damageTypes';
import type { ExplosionState } from './explosions';
import { blastDamage } from './explosions';
import { iceBlastApplies } from './groundHazard';

/** Just enough of an enemy for the decision. */
export interface BlastSubject {
  /** `:6437` — an invisible or teleporting enemy is untouched. */
  targetable: boolean;
  /** The Ice Ball generation this enemy was last frozen by, or null. */
  trailId: number | null;
  multipliers: DamageMultipliers;
}

export interface BlastContext {
  /** The scene's live `iceTrailID`. */
  iceTrailId: number;
  /**
   * The **equipped** secondary's name, not the explosion's source.
   *
   * `:6554` tests `ScreenGame.secondaryWeapon`, and the distinction is load
   * bearing: `ExplosionIce` has two producers and only the ball owns a
   * generation. Ported literally — see the stamp rule below.
   */
  equippedSecondary: string | undefined;
}

export type BlastOutcome =
  /** The generation gate refused this enemy: no damage, no status, no stamp. */
  | { applies: false }
  | {
      applies: true;
      damage: number;
      /** Frames of freeze, or 0. */
      freezeTime: number;
      /** Poison payload, or null. */
      poison: { time: number; damage: number } | null;
      /** Whether to write this enemy's generation stamp — `:6554`. */
      stampGeneration: boolean;
    };

/**
 * Decides one enemy's share of one blast.
 *
 * Order matters and mirrors the source: the gate first (`:6484`), then the
 * status (`:6607`), then the damage. A caller that damages before consulting
 * this would reproduce every freeze assertion and still be wrong.
 */
export function planBlastOn(
  explosion: ExplosionState,
  subject: BlastSubject,
  context: BlastContext,
): BlastOutcome {
  if (!subject.targetable) return { applies: false };

  // `:6484` — every `ExplosionIce` is behind the generation gate, the Ice
  // Grenade's included. A grenade thrown while a ball's stamp is current is
  // refused exactly as the ball's own blast would be.
  if (
    explosion.type === 'Ice' &&
    !iceBlastApplies(
      { trailId: subject.trailId, iceMultiplier: subject.multipliers.Ice },
      context.iceTrailId,
    )
  ) {
    return { applies: false };
  }

  const effectTime = explosion.effectTime ?? 0;
  const carries = effectTime > 0;

  return {
    applies: true,
    damage: blastDamage(explosion, subject.multipliers),
    freezeTime: carries && explosion.type === 'Ice' ? effectTime : 0,
    poison:
      carries && explosion.type === 'Poison'
        ? { time: effectTime, damage: explosion.effectDamage ?? 0 }
        : null,
    // `:6554` — only the Ice Ball consumes a generation. Stamping on a grenade
    // would spend the ball's budget on a weapon that never earned it, and
    // silently disarm the next Ice Ball trail to touch this enemy.
    stampGeneration: explosion.type === 'Ice' && context.equippedSecondary === 'Ice Ball',
  };
}
