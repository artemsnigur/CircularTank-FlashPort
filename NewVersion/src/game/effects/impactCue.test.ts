import { describe, expect, it } from 'vitest';

import { BOSS_CUE_SIZE_BONUS, impactBurst, impactClassOf, impactSoundFor } from './impactCue';
import { SFX } from '../../assets/audioManifest';
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
    bulletClass: 'BulletShotgun',
    // An enemy at the origin with a radius of 10, so a bearing of 0 puts the
    // impact at exactly `(10, 0)` and the rim arithmetic is readable.
    enemyX: 0,
    enemyY: 0,
    enemyRadius: 10,
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

describe('impactBurst — where the burst is placed', () => {
  it('puts the burst on the enemy`s rim, not at its centre', () => {
    // `:5654` — `enemy + cos/sin(angleToBullet) * radius`. The port passed the
    // bullet's own position until T220, which is the same point only when the
    // round happens to stop on the surface.
    const debris = debrisOf({ angleToBullet: 0 })[0];
    expect(debris?.x).toBeCloseTo(10, 6);
    expect(debris?.y).toBeCloseTo(0, 6);

    // The counterpart, on the identical call: a quarter turn round moves it to
    // the other axis. A rule that ignored the bearing would pass the pair
    // above and fail here.
    const above = debrisOf({ angleToBullet: 90 })[0];
    expect(above?.x).toBeCloseTo(0, 6);
    expect(above?.y).toBeCloseTo(10, 6);
  });

  it('scales the rim with the enemy, so a boss is struck further out', () => {
    // The reason `ImpactInput` takes a centre and a radius rather than a point:
    // the same bearing on a bigger body is a different place.
    expect(debrisOf({ angleToBullet: 0, enemyRadius: 40 })[0]?.x).toBeCloseTo(40, 6);
    expect(debrisOf({ angleToBullet: 0, enemyRadius: 10 })[0]?.x).toBeCloseTo(10, 6);
  });

  it('places the cue on the same rim point as the debris', () => {
    // One `impactX` serves every spawn in the AS3's burst. Two points would
    // put the marker somewhere the impact is not.
    const strong = resolveDamageMultipliers('Strong');
    const burst = impactBurst(input({ multipliers: strong, angleToBullet: 0 }));
    const xs = new Set(burst.spawns.map((s) => s.x));
    expect(burst.spawns).toHaveLength(2);
    expect([...xs]).toEqual([10]);
  });
});

describe('impactBurst — the classes the AS3 gives no burst', () => {
  const strong = resolveDamageMultipliers('Strong');

  it('gives fire and penetrating rounds nothing at all', () => {
    /*
     * Neither class appears in any of the 65 `spawnParticle` sites — the
     * `:5684-5792` chain stops after `BulletPoison`. Before T220 both fell
     * through to `Standard`, and fire overlaps its target *every frame*, so it
     * was throwing three pieces and a cue per enemy per frame.
     */
    expect(impactBurst(input({ impactClass: 'None', multipliers: strong })).spawns).toEqual([]);

    // The counterpart on the identical input: `None` returning nothing is only
    // meaningful beside a class that returns something for the same enemy.
    expect(
      impactBurst(input({ impactClass: 'Standard', multipliers: strong })).spawns.length,
    ).toBe(2);
  });

  it('shows no Immune marker for them either, where every cued class does', () => {
    const immune = { ...resolveDamageMultipliers('Basic'), Bullets: 0 };
    expect(impactBurst(input({ impactClass: 'None', multipliers: immune })).spawns).toEqual([]);
    expect(
      impactBurst(input({ impactClass: 'Standard', multipliers: immune })).spawns.map((s) => s.type),
    ).toEqual(['Immune']);
  });

  it('maps the two silent classes and leaves their neighbours cued', () => {
    expect(impactClassOf('BulletFire')).toBe('None');
    expect(impactClassOf('BulletPenetrate')).toBe('None');
    // Beside a class that shares the fall-through they used to take.
    expect(impactClassOf('BulletCake')).toBe('Standard');
  });
});

describe('impactBurst — the timed bomb', () => {
  it('throws three pieces and no cue as it sticks', () => {
    // `:5828`. The bomb deals no direct damage, so this is the only trace the
    // hit leaves — and it has no Strength or Weakness marker beside it.
    const strong = resolveDamageMultipliers('Strong');
    const burst = impactBurst(input({ impactClass: 'Bomb', multipliers: strong }));

    expect(burst.spawns.map((s) => s.type)).toEqual(['RedBits']);
    expect(burst.spawns[0]?.count).toBe(3);
    // The counterpart: the same multiplier on a cued class does show one.
    expect(cueOf({ impactClass: 'Standard', multipliers: strong })).toBe('Strength');
  });

  it('still bursts on an enemy immune to it, where every other class does not', () => {
    /*
     * `:5828` is guarded on `!theEnemy.gotBomb` and nothing else — the bomb
     * attaches to anything it can reach. Every other class puts its whole
     * burst inside `if(multiplier > 0)`, which is the line below.
     */
    const immune = { ...resolveDamageMultipliers('Basic'), Bullets: 0 };
    expect(debrisOf({ impactClass: 'Bomb', multipliers: immune })).toHaveLength(1);
    expect(debrisOf({ impactClass: 'Standard', multipliers: immune })).toHaveLength(0);
  });

  it('keeps its sound on an immune enemy, unlike a bullet', () => {
    const immune = { ...resolveDamageMultipliers('Basic'), Bullets: 0 };
    expect(
      impactBurst(input({ bulletClass: 'BulletBomb', impactClass: 'Bomb', multipliers: immune }))
        .sound,
    ).toBe('ImpactTimedBomb');
    expect(impactBurst(input({ bulletClass: 'BulletSmall', multipliers: immune })).sound).toBeNull();
  });
});

describe('impactBurst — Crazy Cheese', () => {
  const strong = resolveDamageMultipliers('Strong');

  it('throws one small piece like the minigun, with a full-size cue unlike it', () => {
    /*
     * `:5966-5978`. It half resembles both of the shapes it sat between, which
     * is why it is its own: `BulletSmall`'s single `-0.75` piece, and
     * `Standard`'s undiminished cue. It fell through to `Standard` before T220
     * and threw three.
     */
    expect(debrisOf({ impactClass: 'Cheese', multipliers: strong })[0]?.count).toBe(1);
    expect(debrisOf({ impactClass: 'Cheese', multipliers: strong })[0]?.addMaxScale).toBe(-0.75);
    expect(debrisOf({ impactClass: 'Standard', multipliers: strong })[0]?.count).toBe(3);
  });

  it('does not take the minigun`s smaller cue or its cooldown', () => {
    const cueSize = (impactClass: ImpactClass): number | undefined =>
      impactBurst(input({ impactClass, multipliers: strong })).spawns.find(
        (s) => s.type === 'Strength',
      )?.addMaxScale;

    expect(cueSize('Cheese')).toBe(0);
    expect(cueSize('Small')).toBe(-0.3);

    // And the cooldown, which only `BulletSmall` respects.
    expect(cueOf({ impactClass: 'Cheese', multipliers: strong, strongWeakTimer: 3 })).toBe(
      'Strength',
    );
    expect(cueOf({ impactClass: 'Small', multipliers: strong, strongWeakTimer: 3 })).toBeUndefined();
  });

  it('maps to its own shape rather than the fall-through', () => {
    expect(impactClassOf('BulletCrazyCheese')).toBe('Cheese');
    expect(impactClassOf('BulletBomb')).toBe('Bomb');
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

describe('impactSoundFor', () => {
  it('gives two classes that share a shape different sounds, and vice versa', () => {
    // The reason this is its own table rather than a field on ImpactShape:
    // the sounds cut across the four burst shapes in both directions.
    expect(impactSoundFor('BulletSmall')).toBe(impactSoundFor('BulletShotgun'));
    expect(impactClassOf('BulletSmall')).not.toBe(impactClassOf('BulletShotgun'));

    expect(impactSoundFor('BulletGummyBear')).not.toBe(impactSoundFor('BulletCake'));
    expect(impactClassOf('BulletGummyBear')).toBe(impactClassOf('BulletCake'));
  });

  it('returns null for a class the AS3 gives no impact sound', () => {
    // A real answer, not a gap — `BulletFire` and the grenades have none.
    expect(impactSoundFor('BulletFire')).toBeNull();
    expect(impactSoundFor('ObjectGrenade')).toBeNull();
  });

  it('silences the sound on an immune hit, alongside the debris', () => {
    // Every AS3 push sits inside `if(multiplier > 0)`, so immunity takes the
    // sound with it. Pinned against the same hit on a non-immune enemy, which
    // is the only way this reads as a rule rather than as an accident.
    const immune = { ...resolveDamageMultipliers('Basic'), Bullets: 0 };
    expect(impactBurst(input({ bulletClass: 'BulletSmall', multipliers: immune })).sound).toBeNull();
    expect(impactBurst(input({ bulletClass: 'BulletSmall' })).sound).toBe('ImpactBullet');
  });

  it('names only sounds the manifest knows', () => {
    // The EnemyShoot failure mode, at build time.
    const known = new Set(SFX.map((e) => e.name));
    for (const bulletClass of Object.keys(BULLET_DAMAGE_TYPES)) {
      const sound = impactSoundFor(bulletClass);
      if (sound) expect(known.has(sound), `${bulletClass} -> ${sound}`).toBe(true);
    }
  });
});
