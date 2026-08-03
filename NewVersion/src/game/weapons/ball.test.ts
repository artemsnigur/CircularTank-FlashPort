/**
 * Ice Ball — the flight, and the two couplings that only exist once a weapon
 * drives the hazard subsystem.
 *
 * `groundHazard.test.ts` pins the rules in isolation. This file pins the parts
 * that isolation cannot see: that the blast and the trail really do share one
 * generation budget, and that the Ice Grenade reads that budget without
 * spending it.
 *
 * ── The two source-text checks that were here are gone ────────────────────
 * `gates the blast in the scene, ahead of the damage` and `stamps behind an
 * equipped-weapon check` proved a spelling rather than a behaviour — a guard
 * present and never reached satisfied either. Both are now driven against real
 * state in `src/test/sceneHarness.test.ts`.
 *
 * What remains here reads source text only where the claim is genuinely about
 * source shape: that `detonateBall` never calls `takeDamage`, which is an
 * assertion about what a method does *not* contain and has no behavioural form.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  BALL_MUZZLE_OFFSET,
  BALL_RADIUS,
  BALL_SPEED,
  advanceBall,
  ballIsOutOfBounds,
  throwBall,
} from './ball';
import {
  createHazard,
  iceBlastApplies,
  iceFreezes,
  lavaAffects,
  lavaDamagePerFrame,
} from './groundHazard';
import { SECONDARY_WEAPONS, resolveSecondaryStats } from './secondaries';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';

/** An upgrade state with one secondary owned at `level`. */
const owned = (id: string, level: number) => {
  const state = createInitialUpgradeState();
  const secondary = [...state.secondary];
  secondary[findUpgradeById(id)!.index] = level;
  return { ...state, secondary };
};

const statsFor = (id: string, spec: (typeof SECONDARY_WEAPONS)[string], level: number) =>
  resolveSecondaryStats(spec, owned(id, level))!;

const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

const ball = (towerRotation = 0) =>
  throwBall({
    type: 'Ice',
    tankX: 100,
    tankY: 100,
    towerRotation,
    damage: 14,
    explosionRadius: 100,
    payload: 175,
    trailLife: 220,
  });

describe('the ball leaves the muzzle and travels flat', () => {
  it('spawns 16 + radius from the tank, along the tower heading', () => {
    const east = ball(0);
    expect(east.x).toBeCloseTo(100 + BALL_MUZZLE_OFFSET + BALL_RADIUS, 10);
    expect(east.y).toBeCloseTo(100, 10);
  });

  it('carries the full speed, undivided by level', () => {
    expect(Math.hypot(ball(0).xVel, ball(0).yVel)).toBeCloseTo(BALL_SPEED, 10);
    expect(Math.hypot(ball(37).xVel, ball(37).yVel)).toBeCloseTo(BALL_SPEED, 10);
  });

  it('moves speed x frames, with no gravity or drag', () => {
    const start = ball(0);
    const after = advanceBall(start, 3);

    expect(after.x - start.x).toBeCloseTo(BALL_SPEED * 3, 10);
    expect(after.y).toBeCloseTo(start.y, 10);
    // A grenade slows and drops; this does neither, which is why it needs an
    // out-of-bounds cull rather than a lifetime.
    expect(after.xVel).toBe(start.xVel);
  });

  it('is culled once it clears the room', () => {
    const room = { width: 640, height: 400 };
    expect(ballIsOutOfBounds(ball(0), room)).toBe(false);
    expect(ballIsOutOfBounds({ ...ball(0), x: 700 }, room)).toBe(true);
    expect(ballIsOutOfBounds({ ...ball(0), y: -50 }, room)).toBe(true);
  });
});

/**
 * `:6484` — the coupling that isolation cannot show.
 */
describe('one throw is one budget across the trail and the blast', () => {
  const patch = createHazard({ type: 'Ice', x: 0, y: 0, trailLife: 220, payload: 175 });
  const fresh = () => ({ trailId: null as number | null, isBoss: false, iceMultiplier: 1 });

  it('refuses the blast on an enemy this throw already trail-froze', () => {
    const enemy = fresh();
    const generation = 1;

    expect(iceFreezes(patch, enemy, generation, false)).toBe(true);
    enemy.trailId = generation; // as the scene stamps it

    expect(iceBlastApplies(enemy, generation)).toBe(false);
  });

  it('lets the blast through when the trail never reached the enemy', () => {
    expect(iceBlastApplies(fresh(), 1)).toBe(true);
  });

  it('and the next throw re-opens both halves', () => {
    const enemy = fresh();
    enemy.trailId = 1;

    expect(iceBlastApplies(enemy, 2)).toBe(true);
    expect(iceFreezes(patch, enemy, 2, false)).toBe(true);
  });

  // The behavioural version of this lives in `src/test/sceneHarness.test.ts`,
  // which detonates a blast on a stamped enemy and asserts its health is
  // untouched. The source check that stood here proved only that a `continue`
  // appeared before `takeDamage`; a guard present and never reached satisfied
  // it. Retired rather than kept alongside.
});

/**
 * `:6554` — the landmine, and the reason it is not the redundancy it looks like.
 */
describe('only the Ice Ball consumes a generation', () => {
  // Likewise replaced by `sceneHarness.test.ts`, which runs the same blast with
  // Ice Grenade and Ice Ball equipped and shows a later trail still bites in one
  // case and not the other. The retained one-line check that the scene passes
  // the equipped weapon lives there, beside the behaviour it guards.

  it('leaves an enemy the grenade froze still open to a ball trail', () => {
    // The behaviour that check buys. The grenade freezes without stamping, so
    // the enemy's generation is untouched and the ball's trail still bites.
    const enemy = { trailId: null as number | null, isBoss: false, iceMultiplier: 1 };
    const generation = 4;

    // Ice Grenade blast: allowed, and deliberately does not stamp.
    expect(iceBlastApplies(enemy, generation)).toBe(true);

    const patch = createHazard({ type: 'Ice', x: 0, y: 0, trailLife: 220, payload: 175 });
    expect(iceFreezes(patch, enemy, generation, false)).toBe(true);
  });

  it('but the grenade is still *gated* by a live ball generation', () => {
    // The half that is easy to drop: `:6484` has no weapon check, so a grenade
    // thrown while a ball's stamp is current is refused too.
    const enemy = { trailId: 4, iceMultiplier: 1 };
    expect(iceBlastApplies(enemy, 4)).toBe(false);
  });
});

describe('the Ice Ball deals no contact damage', () => {
  it('reaches enemies only through the queued blast', () => {
    // `:4187` explosion = false keeps it off the generic blast path, and
    // `:5917` names BulletIceball in the exclusion list of the direct-damage
    // path that flag selects. Carved out of both, so the hand-queued
    // explosion at `:5895` is the only route.
    const start = SCENE.indexOf('private detonateBall');
    expect(start).toBeGreaterThan(-1);

    const body = SCENE.slice(start, SCENE.indexOf('private layHazard', start));
    expect(body).toContain('spawnExplosion');
    expect(body).not.toContain('takeDamage');
  });

  it('carries the freeze as the blast payload and no effect damage', () => {
    expect(SECONDARY_WEAPONS['Ice Ball'].effectTimeTrack).toBe(3);
    expect(SECONDARY_WEAPONS['Ice Ball'].explosionType).toBe('Ice');
  });
});

/**
 * Lava Ball — the same flight, the opposite weapon.
 *
 * The point of landing it after Ice Ball: it drives the *other* half of the
 * dedup and payload logic, so a change that blurs the two fails here rather
 * than shipping.
 */
describe('Lava Ball is Ice Ball flight with every rule inverted', () => {
  const ice = SECONDARY_WEAPONS['Ice Ball'];
  const lava = SECONDARY_WEAPONS['Lava Ball'];

  it('shares the kind and the flight, and nothing else', () => {
    expect(lava.kind).toBe('trail');
    expect(ice.kind).toBe('trail');

    // Same shape, different channel: ice hand-queues an Ice blast, lava takes
    // the ordinary path with a plain Normal one — `:4187` against `:4195`.
    expect(ice.explosionType).toBe('Ice');
    expect(lava.explosionType).toBe('Normal');
  });

  it('takes its trail payload from a different track than ice', () => {
    // The two payloads are different quantities from different columns, which
    // is exactly the kind of thing that ports term-for-term and silently
    // changes meaning. Ice: frozenTime. Lava: damage per second.
    expect(ice.effectTimeTrack).toBe(3);
    expect(ice.effectDamageTrack).toBeUndefined();

    expect(lava.effectDamageTrack).toBe(3);
    expect(lava.effectTimeTrack).toBeUndefined();

    // Both carry the trail's lifetime in the same place.
    expect(ice.durationTrack).toBe(4);
    expect(lava.durationTrack).toBe(4);
  });

  it('reloads in 700 frames against ice\'s 400', () => {
    expect(statsFor('Lavaball', lava, 1).reloadTimeMax).toBe(700);
    expect(statsFor('Iceball', ice, 1).reloadTimeMax).toBe(400);
  });

  it('reads its trail damage as a rate, not a per-frame figure', () => {
    // `:6263` divides by 30 at the point of use. Level 1 is 15 a second, so a
    // single frame is half a point — not 15, which is what a term-for-term
    // port produces and what a stat table makes look reasonable.
    const perSecond = statsFor('Lavaball', lava, 1).effectDamage;
    expect(perSecond).toBe(15);
    expect(lavaDamagePerFrame(perSecond, 1, false, 1)).toBeCloseTo(0.5, 10);
    expect(lavaDamagePerFrame(perSecond, 1, false, 30)).toBeCloseTo(15, 10);
  });

  it('charges a boss a fifth, where ice refuses a boss outright', () => {
    // The two weapons' boss rules side by side, since neither is guessable from
    // the other: lava is merely weaker, ice is inert.
    const full = lavaDamagePerFrame(30, 1, false, 1);
    expect(lavaDamagePerFrame(30, 1, true, 1)).toBeCloseTo(full * 0.2, 10);

    const patch = createHazard({ type: 'Ice', x: 0, y: 0, trailLife: 220, payload: 175 });
    expect(iceFreezes(patch, { trailId: null, isBoss: true, iceMultiplier: 1 }, 1, false)).toBe(
      false,
    );
  });

  it('does not touch a DamageAddict at all', () => {
    // `:6259` excludes it rather than healing it — unlike a bullet, which it
    // absorbs. A weakness-multiplier port would have got this backwards.
    expect(lavaAffects('DamageAddict', 1)).toBe(false);
    expect(lavaAffects('Normal', 1)).toBe(true);
  });

  it('picks the payload by type at the throw site', () => {
    // The branch that keeps the two tracks apart. Without it both weapons read
    // `effectTime`, and lava's trail would silently deal zero.
    const start = SCENE.indexOf('private throwBall');
    const body = SCENE.slice(start, SCENE.indexOf('private updateBalls', start));

    expect(body).toContain("type === 'Ice' ? this.secondaryStats.effectTime");
    expect(body).toContain('this.secondaryStats.effectDamage');
  });
});

describe('the two trails dedup on opposite shapes, end to end', () => {
  it('ice is once per generation and lava is once per frame', () => {
    // The pairing T1 asked for, now with both weapons real. Ten overlapping
    // patches: ice freezes once no matter how long you stand there, lava
    // charges every frame you do.
    const icePatch = createHazard({ type: 'Ice', x: 0, y: 0, trailLife: 220, payload: 175 });
    const enemy = { trailId: null as number | null, isBoss: false, iceMultiplier: 1 };

    let freezes = 0;
    for (let frame = 0; frame < 3; frame += 1) {
      for (let patch = 0; patch < 10; patch += 1) {
        if (iceFreezes(icePatch, enemy, 1, false)) {
          freezes += 1;
          enemy.trailId = 1;
        }
      }
    }

    // Thirty patch-contacts over three frames, one freeze.
    expect(freezes).toBe(1);

    // The same thirty contacts, on lava: one charge per frame, three total.
    const burned = new Set<string>();
    let charges = 0;
    for (let frame = 0; frame < 3; frame += 1) {
      burned.clear();
      for (let patch = 0; patch < 10; patch += 1) {
        if (burned.has('e1')) continue;
        burned.add('e1');
        charges += 1;
      }
    }
    expect(charges).toBe(3);
  });

  it('clears the lava set per sweep in the scene, not per patch', () => {
    // A `Set` built inside the patch loop would dedup nothing; built outside
    // the frame loop it would charge once ever. It belongs to one sweep.
    const start = SCENE.indexOf('private updateHazards');
    const body = SCENE.slice(start, SCENE.indexOf('private applyHazard', start));

    expect(body).toContain('new Set<Enemy>()');
    // Declared before the patch loop it guards.
    expect(body.indexOf('new Set<Enemy>()')).toBeLessThan(body.indexOf('for (const entry'));
  });
});

describe('the trail is laid every frame, not on impact', () => {
  it('lays before the move, so the first patch sits at the muzzle', () => {
    const start = SCENE.indexOf('private updateBalls');
    const body = SCENE.slice(start, SCENE.indexOf('private detonateBall', start));

    expect(body.indexOf('layHazard')).toBeLessThan(body.indexOf('advanceBall'));
  });

  it('bumps the generation once per throw, not once per patch', () => {
    const start = SCENE.indexOf('private throwBall');
    const body = SCENE.slice(start, SCENE.indexOf('private updateBalls', start));

    expect(body).toContain('this.iceTrailId += 1');
    // The counter must not appear in the per-frame lay path.
    const lay = SCENE.slice(SCENE.indexOf('private layHazard'));
    expect(lay.slice(0, 500)).not.toContain('iceTrailId += 1');
  });
});
