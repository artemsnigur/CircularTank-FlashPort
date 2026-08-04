/**
 * The particle burst a bullet makes when it hits an enemy — `PartGameArea.as`
 * `:5685-5820`.
 *
 * Forty of the sixty-four `spawnParticle` sites in the AS3 are this one rule,
 * written out once per bullet class. Every copy has the same three parts:
 *
 * 1. **Debris** in the enemy's own colour, thrown back along the bullet's
 *    bearing — but only when the enemy is not immune on that channel.
 * 2. **A `Strength` or `Weakness` cue** when the multiplier is off 1.
 * 3. **`Immune`** instead of both when the multiplier is 0 or less.
 *
 * Extracted rather than transcribed because the alternative is forty branches
 * inside `GameplayScene` that no test can reach. `impactBurst` returns spawn
 * inputs, so the rule can be driven directly.
 *
 * ── Why this keys on the bullet class, not the damage channel ─────────────
 * The AS3 switches on the bullet's *class* (`theBullet == "[object
 * BulletSmall]"`), and the shapes genuinely differ between classes that share a
 * damage channel: `BulletSmall` and `BulletShotgun` are both `Bullets` but
 * throw 1 and 3 debris; `BulletPoisonSpike` and `BulletPoison` are both
 * `Poison` and throw 1 and 3. A port that keyed on `damageType` would be wrong
 * on four of the seven classes while looking entirely plausible.
 *
 * `Bullet` already carries the AS3 class name, so `impactClassOf` reads it
 * straight — the same string `damageTypeOf` keys on, and the four shapes are
 * derived from it rather than declared a second time on each weapon.
 */

import type { SpawnInput } from './particles';
import { impactFeedback } from '../enemies/damageTypes';
import type { DamageMultipliers } from '../enemies/damageTypes';
import type { DamageType } from '../enemies/enemyStatsData';

/**
 * The bullet classes whose impact burst differs.
 *
 * `Standard` is the common shape (`BulletShotgun`, the three food rounds and
 * `BulletPoison`): three debris at `-0.25`, an ungated cue at full size.
 */
export type ImpactClass = 'Small' | 'Standard' | 'Spike' | 'Magic';

/** `:3373` — the cue's cooldown, in frames. Only `BulletSmall` uses it. */
export const STRONG_WEAK_TIMER_MAX = 5;

/** `:4526` — bosses get a larger cue. `enemyLevel == "B"`. */
export const BOSS_CUE_SIZE_BONUS = 0.3;

interface ImpactShape {
  /** Debris particles thrown. `Magic` throws none — `:5806` has no debris. */
  debris: number;
  /**
   * The debris' `addMaxScale`.
   *
   * Ninth positional argument, and the parameter list is
   * `(type, count, x, y, distance, startAngle, randAngle, addVel, addMaxScale,
   * addMinScale)` — so the AS3's `-0.75` shrinks the *upper* bound, not the
   * lower. Counting the arguments matters here: reading it as `addMinScale`
   * inverts which end of the size range moves.
   */
  debrisMaxScale: number;
  /** Added to the cue's `addMaxScale`. `BulletSmall`'s cue is smaller. */
  cueSizeOffset: number;
  /** `addMaxScale` on the `Immune` particle: 1 for `BulletSmall`, else 2. */
  immuneScale: number;
  /** Whether the cue respects `strongWeakTimer`. Only `BulletSmall` does. */
  cooldown: boolean;
}

const SHAPES: Record<ImpactClass, ImpactShape> = {
  // `:5689-5705`.
  Small: { debris: 1, debrisMaxScale: -0.75, cueSizeOffset: -0.3, immuneScale: 1, cooldown: true },
  // `:5712-5738`, `:5777-5790`.
  Standard: { debris: 3, debrisMaxScale: -0.25, cueSizeOffset: 0, immuneScale: 2, cooldown: false },
  // `:5745-5772` — Icicle and Poison Spike throw one, not three.
  Spike: { debris: 1, debrisMaxScale: -0.25, cueSizeOffset: 0, immuneScale: 2, cooldown: false },
  // `:5806-5818` — the magic rounds show a cue and no debris at all.
  Magic: { debris: 0, debrisMaxScale: -0.25, cueSizeOffset: 0, immuneScale: 2, cooldown: false },
};

/**
 * The AS3 classes that take a shape other than `Standard`.
 *
 * Everything absent is `Standard` — `BulletShotgun`, the three food rounds and
 * `BulletPoison`, which is the shape the AS3 writes out most often. Listing the
 * exceptions rather than all fourteen classes means a newly ported round gets
 * the common shape by default, which is right far more often than it is wrong,
 * and wrong visibly rather than silently.
 */
const IMPACT_CLASSES: Readonly<Record<string, ImpactClass>> = {
  BulletSmall: 'Small',
  BulletIcicle: 'Spike',
  BulletPoisonSpike: 'Spike',
  BulletMagic: 'Magic',
  BulletMagicBunny: 'Magic',
};

/** The impact shape for an AS3 bullet class name. */
export function impactClassOf(bulletClass: string): ImpactClass {
  return IMPACT_CLASSES[bulletClass] ?? 'Standard';
}

/**
 * The sound a round makes when it lands — `:5656-5965`.
 *
 * Keyed on the AS3 class name, like `IMPACT_CLASSES` above, because the sounds
 * are finer-grained than the four burst shapes: `BulletSmall` and
 * `BulletShotgun` share `ImpactBullet` but not a shape, while `BulletIcicle`
 * shares the *sound* with them and has its own shape.
 *
 * **Gated on the enemy not being immune**, exactly as the AS3 has it — every
 * push sits inside `if(theEnemy.<channel>DamageMultiplier > 0)`. That is the
 * same condition `impactBurst` already computes for the `Immune` cue, so the
 * sound rides on it rather than re-deriving it.
 *
 * A class absent from this table makes no impact sound, which is a real answer
 * rather than a gap: `BulletFire` and the grenades have none in the original.
 *
 * `ImpactCrazyCheese` is deliberately not here. The asset exists
 * (`101_sndImpactCrazyCheesev1.mp3`) and **no `sfxArray.push` site in the AS3
 * references it by any spelling** — an orphan sound, recorded rather than
 * invented a trigger for.
 */
const IMPACT_SOUNDS: Readonly<Record<string, string>> = {
  BulletSmall: 'ImpactBullet', // `:5660`
  BulletShotgun: 'ImpactBullet', // `:5660`, same branch
  BulletIcicle: 'ImpactBullet', // `:5841`
  BulletPoisonSpike: 'ImpactBullet', // `:5901`
  BulletPoison: 'ImpactBullet', // `:5931`
  BulletGummyBear: 'ImpactGummyBear', // `:5667`
  BulletCake: 'ImpactCake', // `:5674`
  BulletCakePiece: 'ImpactCake', // `:5674`, same branch
  BulletMagic: 'ImpactMagic', // `:5949`
  BulletMagicBunny: 'ImpactMagic', // `:5949`
  BulletBomb: 'ImpactTimedBomb', // `:5828`
  BulletLaser: 'ImpactLaser', // `:5573` — and this one is gated on screen
};

/** The impact sound for an AS3 bullet class, or null where it makes none. */
export function impactSoundFor(bulletClass: string): string | null {
  return IMPACT_SOUNDS[bulletClass] ?? null;
}

export interface ImpactInput {
  impactClass: ImpactClass;
  /** AS3 class name, for the sound table. */
  bulletClass: string;
  /** Where the bullet met the enemy. */
  x: number;
  y: number;
  /** Bearing from enemy to bullet, in degrees — `angleToBullet * 180 / PI`. */
  angleToBullet: number;
  /** The enemy's own debris type — `theEnemy.particle`. */
  enemyParticle: string;
  multipliers: DamageMultipliers;
  /** The channel this round deals on. Untyped rounds pass null. */
  damageType: DamageType | null;
  /** `theEnemy.enemyLevel == "B"`. */
  isBoss: boolean;
  /** `theEnemy.strongWeakTimer` — frames remaining. */
  strongWeakTimer: number;
}

export interface ImpactBurst {
  spawns: SpawnInput[];
  /**
   * The sound to queue, or null. Null covers two different cases on purpose —
   * a class with no impact sound, and an immune hit, which the AS3 silences by
   * putting every push inside the multiplier check.
   */
  sound: string | null;
  /**
   * Whether the caller should arm `strongWeakTimer`.
   *
   * Returned rather than mutated so the rule stays pure. The AS3 arms it at
   * `:5700`, inside the same branch that spawns the cue and only there — an
   * immune hit does not start the cooldown.
   */
  armCooldown: boolean;
}

/**
 * Builds the burst for one bullet-on-enemy impact.
 *
 * Empty `spawns` is a real answer: an untyped round (`damageType: null`) shows
 * no cue, and `Magic` against a normal enemy shows nothing at all.
 */
export function impactBurst(input: ImpactInput): ImpactBurst {
  const shape = SHAPES[input.impactClass];
  const feedback = impactFeedback(input.multipliers, input.damageType);
  const sound = impactSoundFor(input.bulletClass);
  const spawns: SpawnInput[] = [];

  if (feedback === 'Immune') {
    // `:5705` etc. — immunity replaces the burst; no debris, no cue.
    spawns.push({
      type: 'Immune',
      count: 1,
      x: input.x,
      y: input.y,
      distance: 0,
      startAngle: 0,
      randAngle: 0,
      addVel: 0,
      addMaxScale: shape.immuneScale,
    });
    // Immune: no sound either. Every AS3 push sits inside the multiplier
    // check, so silence here is the rule and not an omission.
    return { spawns, armCooldown: false, sound: null };
  }

  if (shape.debris > 0) {
    spawns.push({
      type: input.enemyParticle,
      count: shape.debris,
      x: input.x,
      y: input.y,
      distance: 0,
      // `- 15` with a `30` spread makes the fan symmetric about the bearing.
      startAngle: input.angleToBullet - 15,
      randAngle: 30,
      addVel: 2,
      addMaxScale: shape.debrisMaxScale,
    });
  }

  // `damageType: null` reaches here with `feedback === null`, which is the
  // untyped-round case: debris, no cue. That is the AS3's behaviour for a
  // round whose multiplier is exactly 1, and the port's untyped rounds are
  // indistinguishable from it at this seam.
  if (feedback === null) return { spawns, armCooldown: false, sound };

  // `:5691` — only `BulletSmall` checks the cooldown, and only it arms one.
  if (shape.cooldown && input.strongWeakTimer > 0) {
    return { spawns, armCooldown: false, sound };
  }

  spawns.push({
    type: feedback,
    count: 1,
    x: input.x,
    y: input.y,
    distance: 8,
    startAngle: 0,
    randAngle: 360,
    addVel: 0,
    addMaxScale:
      (input.isBoss ? BOSS_CUE_SIZE_BONUS : 0) + shape.cueSizeOffset,
  });

  return { spawns, armCooldown: shape.cooldown, sound };
}
