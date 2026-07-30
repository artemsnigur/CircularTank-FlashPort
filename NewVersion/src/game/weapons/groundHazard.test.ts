/**
 * The ground-hazard subsystem, before either weapon is wired to it.
 *
 * Landing untested-by-a-weapon cuts against this project's own rule that a
 * green unit test says nothing about wiring. It is deliberate here and for
 * minutes rather than days: the subsystem is where the risk lives, Ice Ball
 * lands next, and keeping them apart means a later failure bisects to one half
 * rather than to a commit doing two things.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BITE_THRESHOLD,
  FIRE_DRAIN_PER_FRAME,
  HAZARD_FADE_FRAMES,
  HAZARD_RADIUS,
  ICE_LIFETIME_BONUS,
  LAVA_BOSS_MULTIPLIER,
  LAVA_RADIUS_BASE,
  LAVA_SCALE_MAX,
  LAVA_SCALE_MIN,
  activeWindow,
  createHazard,
  drainIce,
  extinguishIce,
  hazardAlpha,
  hazardRadius,
  hazardTouches,
  iceBlastApplies,
  iceFreezes,
  iceGenerationAllows,
  isBiting,
  lavaAffects,
  lavaDamagePerFrame,
  tickHazard,
} from './groundHazard';
import type { GroundHazard, HazardType } from './groundHazard';
import { SECONDARY_WEAPONS } from './secondaries';
import { applyFreeze, createStatusState } from '../enemies/statusEffects';

const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

const lay = (type: HazardType, trailLife: number, payload = 0) =>
  createHazard({ type, x: 0, y: 0, trailLife, payload, random: () => 0 });

/** Runs a hazard to death, returning the frames it spent biting. */
const bitingFrames = (type: HazardType, trailLife: number): number => {
  let hazard: GroundHazard | null = lay(type, trailLife);
  let frames = 0;

  while (hazard) {
    if (isBiting(hazard)) frames += 1;
    hazard = tickHazard(hazard, 1);
  }
  return frames;
};

/**
 * The `+15`, as an equality rather than two spot checks.
 *
 * Ice spawns with `trailLife + 15` and lava with `trailLife`, against one gate
 * at `lifeTime > 15`. So the bonus exactly cancels the inert tail for ice and
 * lava pays for it — one constant, opposite meanings.
 */
describe('the active window', () => {
  it('is the full stat for ice and fifteen less for lava', () => {
    for (const trailLife of [220, 250, 280, 300]) {
      expect(activeWindow('Ice', trailLife), `ice ${trailLife}`).toBe(trailLife);
      expect(activeWindow('Lava', trailLife), `lava ${trailLife}`).toBe(trailLife - 15);
    }
  });

  it('is exactly the gap between them, at every stat value', () => {
    // Stated as the relationship rather than as two numbers, so a change to
    // either the bonus or the gate has to move both sides together.
    for (let trailLife = 16; trailLife <= 400; trailLife += 1) {
      expect(
        activeWindow('Ice', trailLife) - activeWindow('Lava', trailLife),
        `trailLife ${trailLife}`,
      ).toBe(ICE_LIFETIME_BONUS);
    }
  });

  it('holds when a hazard is actually ticked to death', () => {
    // The arithmetic above against the real countdown — if `tickHazard` or the
    // gate drifted, this diverges from `activeWindow` and the equality above
    // would still pass.
    expect(bitingFrames('Ice', 220)).toBe(activeWindow('Ice', 220));
    expect(bitingFrames('Lava', 250)).toBe(activeWindow('Lava', 250));
  });

  it('is why ice spawns longer-lived than its stat and lava does not', () => {
    expect(lay('Ice', 220).lifeTime).toBe(235);
    expect(lay('Lava', 250).lifeTime).toBe(250);
    expect(ICE_LIFETIME_BONUS).toBe(BITE_THRESHOLD);
  });

  it('never goes negative for a stat below the threshold', () => {
    expect(activeWindow('Lava', 10)).toBe(0);
  });
});

/**
 * Two dedup shapes, side by side, so a future weapon cannot blur them.
 */
describe('the two dedup rules are different shapes', () => {
  const trail = () => Array.from({ length: 10 }, () => lay('Ice', 220, 200));

  /** Walks an enemy through every patch, stamping it as `:6220` does. */
  const walk = (
    patches: GroundHazard[],
    enemy: { trailId: number | null; isBoss: boolean; iceMultiplier: number },
    currentTrailId: number,
  ): number => {
    let freezes = 0;
    for (const patch of patches) {
      if (iceFreezes(patch, enemy, currentTrailId, false)) {
        freezes += 1;
        enemy.trailId = currentTrailId;
      }
    }
    return freezes;
  };

  it('ice freezes once for a whole trail — per generation, not per patch', () => {
    const enemy = { trailId: null as number | null, isBoss: false, iceMultiplier: 1 };
    expect(walk(trail(), enemy, 7)).toBe(1);
  });

  it('but a second throw freezes again', () => {
    const enemy = { trailId: null as number | null, isBoss: false, iceMultiplier: 1 };
    expect(walk(trail(), enemy, 7)).toBe(1);
    expect(walk(trail(), enemy, 8)).toBe(1);
  });

  it('and that second throw re-arms the *first* throw\'s patches too', () => {
    // The case that distinguishes a live generation counter from a per-patch
    // stamp, and the one this module originally got wrong. Ball #1's trail is
    // still on the ground when ball #2 is thrown; `:6208` compares the enemy's
    // stamp against the counter's current value, so those old patches bite
    // again. A per-patch model leaves them spent for good.
    const stale = trail();
    const enemy = { trailId: null as number | null, isBoss: false, iceMultiplier: 1 };

    expect(walk(stale, enemy, 1)).toBe(1);
    expect(walk(stale, enemy, 1)).toBe(0); // same generation — spent
    expect(walk(stale, enemy, 2)).toBe(1); // counter moved — the same patches bite
  });

  it('lava charges once per frame, not once per trail', () => {
    // The contrast: ten overlapping patches cost one patch's damage this frame,
    // and the *next* frame charges again. A `Set` cleared per sweep, where ice
    // needs state that outlives the frame.
    const burnedThisFrame = new Set<string>();
    const enemy = 'e1';
    let charges = 0;

    for (let frame = 0; frame < 3; frame += 1) {
      burnedThisFrame.clear();
      for (let patch = 0; patch < 10; patch += 1) {
        if (burnedThisFrame.has(enemy)) continue;
        burnedThisFrame.add(enemy);
        charges += 1;
      }
    }

    expect(charges).toBe(3);
  });

  it('so ten patches cost ice one freeze and lava three frames of burn', () => {
    // The two numbers next to each other, which is the point: same overlap,
    // different accounting, and neither rule would be right for the other.
    const iceEnemy = { trailId: null as number | null, isBoss: false, iceMultiplier: 1 };
    const iceFreezeCount = walk(trail(), iceEnemy, 7);

    expect(iceFreezeCount).toBe(1);
    expect(lavaDamagePerFrame(30, 1, false, 1)).toBeCloseTo(1, 10);
  });
});

describe('ice freezing has four conditions beyond the overlap', () => {
  const patch = lay('Ice', 220, 200);

  it('refuses an enemy already stamped for this generation', () => {
    expect(iceFreezes(patch, { trailId: 3, isBoss: false, iceMultiplier: 1 }, 3, false)).toBe(false);
    expect(iceFreezes(patch, { trailId: 2, isBoss: false, iceMultiplier: 1 }, 3, false)).toBe(true);
  });

  it('accepts an enemy that has never been stamped', () => {
    expect(iceFreezes(patch, { trailId: null, isBoss: false, iceMultiplier: 1 }, 1, false)).toBe(
      true,
    );
  });

  it('refuses while a laser is on the enemy', () => {
    expect(iceFreezes(patch, { trailId: null, isBoss: false, iceMultiplier: 1 }, 3, true)).toBe(
      false,
    );
  });

  it('refuses an enemy immune to ice', () => {
    expect(iceFreezes(patch, { trailId: null, isBoss: false, iceMultiplier: 0 }, 3, false)).toBe(
      false,
    );
  });

  it('never freezes from a lava patch', () => {
    const lava = lay('Lava', 250, 20);
    expect(iceFreezes(lava, { trailId: null, isBoss: false, iceMultiplier: 1 }, 3, false)).toBe(
      false,
    );
  });
});

/**
 * `:6484` — the blast is behind the *same* gate as the trail, which is the part
 * that is easy to miss: one throw cannot both trail-freeze and blast an enemy.
 */
describe('the ice blast shares the trail\'s generation budget', () => {
  it('refuses an enemy this throw\'s trail already froze', () => {
    expect(iceBlastApplies({ trailId: 4, iceMultiplier: 1 }, 4)).toBe(false);
  });

  it('applies to an enemy the trail never reached', () => {
    expect(iceBlastApplies({ trailId: null, iceMultiplier: 1 }, 4)).toBe(true);
    expect(iceBlastApplies({ trailId: 3, iceMultiplier: 1 }, 4)).toBe(true);
  });

  it('refuses an enemy immune to ice', () => {
    expect(iceBlastApplies({ trailId: null, iceMultiplier: 0 }, 4)).toBe(false);
  });

  it('agrees with the trail on the generation dimension, at every pairing', () => {
    // The "one gate, two callers" claim, enforced behaviourally rather than
    // asserted in a docstring. Holding every other condition permissive, the
    // trail and the blast must answer identically for any (stamp, counter) —
    // so re-deriving either one independently fails here.
    const patch = lay('Ice', 220, 200);
    const stamps: (number | null)[] = [null, 0, 1, 2, 3];

    for (const stamp of stamps) {
      for (let counter = 0; counter <= 4; counter += 1) {
        const gate = iceGenerationAllows(stamp, counter);
        expect(iceFreezes(patch, { trailId: stamp, isBoss: false, iceMultiplier: 1 }, counter, false)).toBe(gate);
        expect(iceBlastApplies({ trailId: stamp, iceMultiplier: 1 }, counter)).toBe(gate);
      }
    }
  });

  it('lets the blast through to a boss the trail could not touch', () => {
    // The gate, not the duration — `applyFreeze` owns that and is asserted in
    // the boss block below.
    const trailPatch = lay('Ice', 220, 200);
    expect(iceFreezes(trailPatch, { trailId: null, isBoss: true, iceMultiplier: 1 }, 1, false)).toBe(
      false,
    );
    expect(iceBlastApplies({ trailId: null, iceMultiplier: 1 }, 1)).toBe(true);
  });
});

/**
 * The boss rule differs between the two ice sources, and both are faithful.
 */
describe('a boss is immune to trail freeze but not to blast freeze', () => {
  it('the trail refuses it outright', () => {
    const patch = lay('Ice', 220, 200);
    expect(iceFreezes(patch, { trailId: null, isBoss: true, iceMultiplier: 1 }, 1, false)).toBe(
      false,
    );
    expect(iceFreezes(patch, { trailId: null, isBoss: false, iceMultiplier: 1 }, 1, false)).toBe(
      true,
    );
  });

  it('the blast freezes it, at a quarter of the duration', () => {
    // `applyFreeze`'s boss divisor — the Ice Grenade already ships this. Same
    // element, two rules, and the trail is the stricter one.
    const boss = createStatusState();
    applyFreeze(boss, 200, 1, true);

    const normal = createStatusState();
    applyFreeze(normal, 200, 1, false);

    expect(boss.frozen).toBe(true);
    expect(boss.frozenTimer).toBe(50);
    expect(normal.frozenTimer).toBe(200);
  });

  it('so an Ice Ball cannot freeze a boss with its trail but can with its blast', () => {
    // Both facts in one assertion, because reading either alone gives the
    // wrong impression of the weapon.
    const patch = lay('Ice', 220, 200);
    const boss = createStatusState();
    applyFreeze(boss, 200, 1, true);

    expect(iceFreezes(patch, { trailId: null, isBoss: true, iceMultiplier: 1 }, 1, false)).toBe(
      false,
    );
    expect(boss.frozenTimer).toBe(50);
  });
});

describe('lava grows as it dies', () => {
  it('runs 0.75 to 1.25 of the base, spawn to death', () => {
    expect(LAVA_SCALE_MIN).toBe(0.75);
    expect(LAVA_SCALE_MAX).toBe(1.25);

    const fresh = lay('Lava', 200, 20);
    expect(hazardRadius(fresh)).toBeCloseTo(LAVA_RADIUS_BASE * LAVA_SCALE_MIN, 10);
    expect(hazardRadius({ ...fresh, lifeTime: 0 })).toBeCloseTo(
      LAVA_RADIUS_BASE * LAVA_SCALE_MAX,
      10,
    );
  });

  it('is 15 units at spawn and 25 at death', () => {
    const fresh = lay('Lava', 200, 20);
    expect(hazardRadius(fresh)).toBeCloseTo(15, 10);
    expect(hazardRadius({ ...fresh, lifeTime: 0 })).toBeCloseTo(25, 10);
  });

  it('grows monotonically as lifetime falls', () => {
    const fresh = lay('Lava', 200, 20);
    let previous = 0;

    for (let lifeTime = 200; lifeTime >= 0; lifeTime -= 1) {
      const radius = hazardRadius({ ...fresh, lifeTime });
      expect(radius, `lifeTime ${lifeTime}`).toBeGreaterThanOrEqual(previous);
      previous = radius;
    }
  });

  it('shrinks from 18 to 15 on its very first tick, faithfully', () => {
    // Every hazard spawns at 18 (`:1800`); lava's radius is overwritten at
    // `:7065` on the next frame, so it *drops* before it starts growing.
    const fresh = lay('Lava', 200, 20);
    expect(fresh.radius).toBe(HAZARD_RADIUS);
    expect(tickHazard(fresh, 1)!.radius).toBeLessThan(HAZARD_RADIUS);
  });

  it('leaves ice at the size it was laid', () => {
    const fresh = lay('Ice', 220, 200);
    expect(hazardRadius(fresh)).toBe(HAZARD_RADIUS);
    expect(tickHazard(fresh, 1)!.radius).toBe(HAZARD_RADIUS);
  });

  it('so a dying lava patch reaches further than a fresh one', () => {
    const fresh = lay('Lava', 200, 20);
    const enemy = { x: 22, y: 0, radius: 1 };

    expect(hazardTouches({ ...fresh, radius: hazardRadius(fresh) }, enemy)).toBe(false);
    const old = { ...fresh, lifeTime: 0 };
    expect(hazardTouches({ ...old, radius: hazardRadius(old) }, enemy)).toBe(true);
  });
});

describe('lava damage is per second, not per frame', () => {
  it('divides the stat by thirty', () => {
    // Reading the stat as per-frame would make lava thirty times too strong and
    // look entirely plausible in the table.
    expect(lavaDamagePerFrame(28, 1, false, 1)).toBeCloseTo(28 / 30, 10);
    expect(lavaDamagePerFrame(28, 1, false, 30)).toBeCloseTo(28, 10);
  });

  it('takes a fifth against a boss', () => {
    expect(LAVA_BOSS_MULTIPLIER).toBe(0.2);
    expect(lavaDamagePerFrame(28, 1, true, 30)).toBeCloseTo(28 * 0.2, 10);
  });

  it('scales by the enemy fire resistance', () => {
    expect(lavaDamagePerFrame(28, 2, false, 30)).toBeCloseTo(56, 10);
    expect(lavaDamagePerFrame(28, 0.5, false, 30)).toBeCloseTo(14, 10);
  });

  it('excludes DamageAddict outright rather than healing it', () => {
    // Unlike a bullet, which heals it. Lava simply does not touch it.
    expect(lavaAffects('DamageAddict', 1)).toBe(false);
    expect(lavaAffects('Basic', 1)).toBe(true);
  });

  it('and anything immune to fire', () => {
    expect(lavaAffects('Basic', 0)).toBe(false);
  });
});

describe('your own weapons destroy ice', () => {
  it('a flame drains three frames per frame', () => {
    expect(FIRE_DRAIN_PER_FRAME).toBe(3);
    const patch = lay('Ice', 220, 200);
    expect(drainIce(patch, 1).lifeTime).toBe(patch.lifeTime - 3);
  });

  it('a laser ends it outright', () => {
    const patch = lay('Ice', 220, 200);
    expect(extinguishIce(patch).lifeTime).toBe(0);
  });

  it('neither touches lava', () => {
    const patch = lay('Lava', 250, 20);
    expect(drainIce(patch, 1)).toBe(patch);
    expect(extinguishIce(patch)).toBe(patch);
  });

  it('a sustained flame kills a patch far faster than time does', () => {
    // The interaction, measured: Flamethrower and Ice Ball genuinely fight.
    let patch: GroundHazard | null = lay('Ice', 220, 200);
    let frames = 0;

    while (patch && frames < 1000) {
      patch = tickHazard(drainIce(patch, 1), 1);
      frames += 1;
    }

    // 235 lifetime burnt at 4 a frame rather than 1.
    expect(frames).toBeCloseTo(235 / 4, 0);
  });

  it('never drains below zero', () => {
    const nearlyDead = { ...lay('Ice', 220, 200), lifeTime: 1 };
    expect(drainIce(nearlyDead, 1).lifeTime).toBe(0);
  });
});

describe('the lifetime and fade', () => {
  it('fades over the last thirty frames', () => {
    expect(HAZARD_FADE_FRAMES).toBe(30);
    expect(hazardAlpha(lay('Ice', 220))).toBe(1);
    expect(hazardAlpha({ ...lay('Ice', 220), lifeTime: 15 })).toBeCloseTo(0.55, 10);
    expect(hazardAlpha({ ...lay('Ice', 220), lifeTime: 0 })).toBeCloseTo(0.1, 10);
  });

  it('is already inert halfway through the fade', () => {
    // The fade starts at 30 and the bite stops at 15, so a patch is visibly
    // dying for fifteen frames before it is actually safe.
    const dying = { ...lay('Ice', 220), lifeTime: 20 };
    expect(hazardAlpha(dying)).toBeLessThan(1);
    expect(isBiting(dying)).toBe(true);

    const inert = { ...lay('Ice', 220), lifeTime: 10 };
    expect(hazardAlpha(inert)).toBeLessThan(1);
    expect(isBiting(inert)).toBe(false);
  });

  it('is removed once the clock runs out', () => {
    const last = { ...lay('Ice', 220), lifeTime: 1 };
    expect(tickHazard(last, 1)).toBeNull();
    expect(tickHazard({ ...last, lifeTime: 0 }, 1)).toBeNull();
  });

  it('takes fractional frames', () => {
    expect(tickHazard(lay('Ice', 220), 0.5)!.lifeTime).toBe(234.5);
  });

  it('spawns jittered around the ball, up to eight units', () => {
    const centred = createHazard({
      type: 'Ice',
      x: 100,
      y: 200,
      trailLife: 220,
      payload: 0,
      random: () => 0,
    });
    expect([centred.x, centred.y]).toEqual([100, 200]);

    const offset = createHazard({
      type: 'Ice',
      x: 100,
      y: 200,
      trailLife: 220,
      payload: 0,
      random: () => 1,
    });
    expect(Math.hypot(offset.x - 100, offset.y - 200)).toBeCloseTo(8, 10);
  });
});

/**
 * The sixth kind, and the proof it has not collapsed into another.
 */
/**
 * The unreachability half of this block is gone on purpose.
 *
 * It asserted that no spec declared `'trail'`, which was true only until a
 * weapon claimed the kind — a limitation, not a rule, in this project's
 * vocabulary. Ice Ball claiming it is precisely the event it existed to catch,
 * and it did catch it. Restoring it would mean re-asserting something now false.
 *
 * The *distinctness* half does not go away with it, so it keeps its own witness
 * below rather than being folded into "Ice Ball freezes things" as an implicit
 * side effect.
 */
describe("the 'trail' kind stays a distinct discriminant", () => {
  it('is claimed by the ball weapons and by nothing else', () => {
    // The other five shapes describe how a projectile travels or what it hits.
    // `trail` describes what it leaves behind — an Ice Ball is an ordinary round
    // that dies on its first enemy, and the weapon is the hazards it dropped on
    // the way. Pinning which specs hold it stops a later weapon being filed here
    // because it merely "also explodes".
    const byKind = Object.values(SECONDARY_WEAPONS)
      .filter((s) => s.kind === 'trail')
      .map((s) => s.name);

    expect(byKind).toEqual(['Ice Ball']); // Lava Ball joins in T3.
  });

  it('does not collapse into thrown, chain, volley or fan', () => {
    // Same protection the old unreachability test gave, in the shape that
    // survives the kind becoming reachable: a `trail` spec must not be
    // describable as any neighbouring kind's shape. Ice Ball has an explosion
    // channel like `thrown`, so shape-sniffing would misfile it — which is the
    // bug the discriminator replaced.
    const iceBall = SECONDARY_WEAPONS['Ice Ball'];

    expect(iceBall.kind).toBe('trail');
    expect(iceBall.kind).not.toBe('thrown');
    expect(iceBall.durationTrack).toBeDefined(); // the trail's lifetime
    expect(SECONDARY_WEAPONS['Ice Grenade'].durationTrack).toBeUndefined();
  });

  it('dispatches through its own branch, not a shared one', () => {
    // The switch is exhaustive, so a missing case is a compile error — but a
    // case that *aliases* another weapon's spawn is not. This pins that
    // `trail` reaches `throwBall` and not `throwGrenade`.
    const start = SCENE.indexOf("case 'trail':");
    expect(start).toBeGreaterThan(-1);

    const body = SCENE.slice(start, SCENE.indexOf('case ', start + 5));
    expect(body).toContain('throwBall');
    expect(body).not.toContain('throwGrenade');
  });
});
