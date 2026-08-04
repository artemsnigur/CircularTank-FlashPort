import { describe, expect, it } from 'vitest';

import { BOSS_CUE_SIZE_BONUS, impactBurst, impactClassOf } from './impactCue';
import type { ImpactClass, ImpactInput } from './impactCue';
import { BULLET_DAMAGE_TYPES, resolveDamageMultipliers } from '../enemies/damageTypes';
import type { DamageType } from '../enemies/enemyStatsData';

/**
 * `Strong` resists bullets and `Ninja` is weak to fire — see `damageTypes`.
 * Both are used as the two ends of the same rule throughout, so a change that
 * blurred `Strength` into `Weakness` fails rather than passing quietly.
 */
function input(over: Partial<ImpactInput> = {}): ImpactInput {
  return {
    impactClass: 'Standard',
    x: 100,
    y: 200,
    angleToBullet: 45,
    enemyParticle: 'RedBits',
    multipliers: resolveDamageMultipliers('Basic'),
    damageType: 'Bullets',
    isBoss: false,
    strongWeakTimer: 0,
    ...over,
  };
}

const cueOf = (over: Partial<ImpactInput>): string | undefined =>
  impactBurst(input(over)).spawns.find((s) => s.type !== over.enemyParticle && s.type !== 'RedBits')
    ?.type;

const debrisOf = (over: Partial<ImpactInput>) =>
  impactBurst(input(over)).spawns.filter((s) => s.type === (over.enemyParticle ?? 'RedBits'));

describe('impactBurst — which cue', () => {
  it('shows Strength where the enemy resists and Weakness where it does not', () => {
    const strong = resolveDamageMultipliers('Strong');
    const ninja = resolveDamageMultipliers('Ninja');

    // Asserted as a pair on one channel each so the two cannot swap: a rule
    // that returned 'Strength' for both would pass the first line alone.
    expect(cueOf({ multipliers: strong, damageType: 'Bullets' })).toBe('Strength');
    expect(cueOf({ multipliers: ninja, damageType: 'FireLava' })).toBe('Weakness');
  });

  it('shows no cue at all on a neutral multiplier', () => {
    // The counterpart to both lines above: same call shape, multiplier of 1.
    expect(cueOf({ multipliers: resolveDamageMultipliers('Basic') })).toBeUndefined();
  });

  it('replaces the whole burst with Immune, rather than adding to it', () => {
    const immune = { ...resolveDamageMultipliers('Basic'), Poison: 0 };
    const burst = impactBurst(input({ multipliers: immune, damageType: 'Poison' }));

    expect(burst.spawns.map((s) => s.type)).toEqual(['Immune']);
    // The debris is what an immune hit loses, and the reason is that the AS3's
    // `else` covers both — pinned here because "Immune is present" would pass
    // even if the debris had leaked through beside it.
    expect(debrisOf({ multipliers: immune, damageType: 'Poison' })).toHaveLength(0);
  });

  it('throws debris but no cue for an untyped round', () => {
    const burst = impactBurst(input({ damageType: null }));
    expect(burst.spawns.map((s) => s.type)).toEqual(['RedBits']);
  });
});

describe('impactBurst — the per-class shapes', () => {
  it('gives Small one debris and Standard three, on the same channel', () => {
    // `BulletSmall` and `BulletShotgun` are both `Bullets`. This pair is the
    // reason `ImpactClass` exists: keying on `damageType` collapses them.
    expect(debrisOf({ impactClass: 'Small' })[0]?.count).toBe(1);
    expect(debrisOf({ impactClass: 'Standard' })[0]?.count).toBe(3);
  });

  it('gives Spike one debris and Standard three, on the Poison channel too', () => {
    // The second collapse the class name prevents: `BulletPoisonSpike` against
    // `BulletPoison`.
    const poison = { damageType: 'Poison' as DamageType };
    expect(debrisOf({ ...poison, impactClass: 'Spike' })[0]?.count).toBe(1);
    expect(debrisOf({ ...poison, impactClass: 'Standard' })[0]?.count).toBe(3);
  });

  it('gives Magic a cue and no debris, where every other class throws some', () => {
    const strong = resolveDamageMultipliers('Strong');
    expect(debrisOf({ impactClass: 'Magic', multipliers: strong })).toHaveLength(0);
    expect(cueOf({ impactClass: 'Magic', multipliers: strong })).toBe('Strength');

    // Beside its counterpart, so "no debris" cannot be an artefact of the
    // `Strong` multiplier or the helper.
    expect(debrisOf({ impactClass: 'Spike', multipliers: strong })).toHaveLength(1);
  });

  it('shrinks Small`s debris further than every other class', () => {
    // -0.75 against -0.25, and it is `addMaxScale` in both — the ninth
    // positional argument. Asserted as the exact figures rather than "smaller".
    expect(debrisOf({ impactClass: 'Small' })[0]?.addMaxScale).toBe(-0.75);
    expect(debrisOf({ impactClass: 'Standard' })[0]?.addMaxScale).toBe(-0.25);
  });

  it('marks Small immune at scale 1 and every other class at 2', () => {
    const immune = { ...resolveDamageMultipliers('Basic'), Bullets: 0 };
    const scaleFor = (impactClass: ImpactClass): number | undefined =>
      impactBurst(input({ impactClass, multipliers: immune })).spawns[0]?.addMaxScale;

    expect(scaleFor('Small')).toBe(1);
    expect(scaleFor('Standard')).toBe(2);
    expect(scaleFor('Spike')).toBe(2);
    expect(scaleFor('Magic')).toBe(2);
  });
});

describe('impactBurst — the cue cooldown', () => {
  const strong = resolveDamageMultipliers('Strong');

  it('suppresses Small`s cue while the timer runs, and Standard`s never', () => {
    // The whole point of the cooldown is that it applies to one class. Pinned
    // against the class it does not apply to, on identical inputs.
    expect(cueOf({ impactClass: 'Small', multipliers: strong, strongWeakTimer: 3 })).toBeUndefined();
    expect(cueOf({ impactClass: 'Standard', multipliers: strong, strongWeakTimer: 3 })).toBe(
      'Strength',
    );
  });

  it('still throws Small`s debris while the cue is suppressed', () => {
    // `:5689` spawns the debris before the timer test, so a suppressed cue is
    // not a suppressed impact. The bug this catches is hoisting the guard.
    expect(debrisOf({ impactClass: 'Small', multipliers: strong, strongWeakTimer: 3 })).toHaveLength(
      1,
    );
  });

  it('asks the caller to arm the timer only when Small actually showed a cue', () => {
    const armed = (over: Partial<ImpactInput>): boolean => impactBurst(input(over)).armCooldown;

    expect(armed({ impactClass: 'Small', multipliers: strong })).toBe(true);
    // Suppressed: already running.
    expect(armed({ impactClass: 'Small', multipliers: strong, strongWeakTimer: 3 })).toBe(false);
    // No cue to cool down — a neutral multiplier.
    expect(armed({ impactClass: 'Small' })).toBe(false);
    // `:5700` sits in the cue branch, so an immune hit does not arm it either.
    expect(
      armed({
        impactClass: 'Small',
        multipliers: { ...resolveDamageMultipliers('Basic'), Bullets: 0 },
      }),
    ).toBe(false);
    // And no other class ever arms it, however clear the cue.
    expect(armed({ impactClass: 'Standard', multipliers: strong })).toBe(false);
  });
});

describe('impactBurst — cue geometry', () => {
  const strong = resolveDamageMultipliers('Strong');
  const cue = (over: Partial<ImpactInput>) =>
    impactBurst(input(over)).spawns.find((s) => s.type === 'Strength');

  it('gives a boss a larger cue than the same hit on a normal enemy', () => {
    expect(cue({ multipliers: strong, isBoss: true })?.addMaxScale).toBe(BOSS_CUE_SIZE_BONUS);
    expect(cue({ multipliers: strong, isBoss: false })?.addMaxScale).toBe(0);
  });

  it('applies Small`s smaller cue on top of the boss bonus, not instead of it', () => {
    // `strongWeakAddSize - 0.3` at `:5698`, where `strongWeakAddSize` is
    // already 0.3 for a boss — so a boss hit by the minigun lands back at 0,
    // the same size a normal enemy gets from every other class.
    expect(cue({ impactClass: 'Small', multipliers: strong, isBoss: true })?.addMaxScale).toBe(0);
    expect(cue({ impactClass: 'Small', multipliers: strong, isBoss: false })?.addMaxScale).toBe(
      -0.3,
    );
  });

  it('fans debris symmetrically about the bullet`s bearing', () => {
    // `angle - 15` with a 30° spread. Asserted as the computed pair rather
    // than "within 15 degrees", since both figures are known here.
    const debris = debrisOf({ angleToBullet: 45 })[0];
    expect(debris?.startAngle).toBe(30);
    expect(debris?.randAngle).toBe(30);
  });

  it('throws the cue in a full circle and the debris in a narrow arc', () => {
    expect(cue({ multipliers: strong })?.randAngle).toBe(360);
    expect(debrisOf({ multipliers: strong })[0]?.randAngle).toBe(30);
    // The cue starts off the impact point; the debris starts on it.
    expect(cue({ multipliers: strong })?.distance).toBe(8);
    expect(debrisOf({ multipliers: strong })[0]?.distance).toBe(0);
  });
});

describe('impactClassOf', () => {
  it('separates the two Bullets classes and the two Poison classes', () => {
    // The pairs the damage channel collapses. Each is asserted beside its
    // twin, because "BulletSmall is Small" alone would still pass if every
    // class mapped to Small.
    expect(impactClassOf('BulletSmall')).toBe('Small');
    expect(impactClassOf('BulletShotgun')).toBe('Standard');
    expect(impactClassOf('BulletPoisonSpike')).toBe('Spike');
    expect(impactClassOf('BulletPoison')).toBe('Standard');
  });

  it('gives every class the port knows about a shape', () => {
    // Keyed on the same table `damageTypeOf` reads, so a round added there
    // cannot reach the burst with no shape at all — it lands on `Standard`,
    // which this pins as deliberate rather than accidental.
    for (const bulletClass of Object.keys(BULLET_DAMAGE_TYPES)) {
      expect(impactClassOf(bulletClass)).toBeTruthy();
    }
    expect(impactClassOf('BulletCake')).toBe('Standard');
  });

  it('falls through to Standard for a name it does not know', () => {
    expect(impactClassOf('BulletNotPortedYet')).toBe('Standard');
  });
});
