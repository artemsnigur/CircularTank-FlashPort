/**
 * Ice Ball — the flight, and the two couplings that only exist once a weapon
 * drives the hazard subsystem.
 *
 * `groundHazard.test.ts` pins the rules in isolation. This file pins the parts
 * that isolation cannot see: that the blast and the trail really do share one
 * generation budget, and that the Ice Grenade reads that budget without
 * spending it.
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
import { createHazard, iceBlastApplies, iceFreezes } from './groundHazard';
import { SECONDARY_WEAPONS } from './secondaries';

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

  it('gates the blast in the scene, ahead of the damage', () => {
    // The refusal must `continue` past `takeDamage`, not merely skip the
    // freeze: `:6484` puts the `hp -=` inside the same branch. A gate placed
    // after the damage would look identical in every freeze assertion above.
    //
    // A source-shape check, and worth being honest about its limits: it proves
    // the refusal is spelled `continue` ahead of the damage in this loop, not
    // that the loop runs. The behavioural half is the predicate tests above.
    const start = SCENE.indexOf("explosion.type === 'Ice' && !iceBlastApplies");
    expect(start).toBeGreaterThan(-1);

    const body = SCENE.slice(start, SCENE.indexOf('enemy.takeDamage', start));
    expect(body).toContain('continue');
  });
});

/**
 * `:6554` — the landmine, and the reason it is not the redundancy it looks like.
 */
describe('only the Ice Ball consumes a generation', () => {
  it('stamps behind an equipped-weapon check', () => {
    // Both producers of `ExplosionIce` are gated by the counter; only the ball
    // may spend it. Stamping on a grenade would disarm the next Ice Ball trail
    // to touch that enemy — a cross-weapon bug with no local symptom.
    // Anchored inside `applyBlastStatus`, because the trail path stamps too and
    // appears earlier in the file — the two stamps have different guards and
    // matching the wrong one would assert nothing.
    const scope = SCENE.indexOf('private applyBlastStatus');
    expect(scope).toBeGreaterThan(-1);

    const body = SCENE.slice(scope, SCENE.indexOf('private burnEnemy', scope));
    const stamp = body.indexOf('status.trailId = this.iceTrailId');
    expect(stamp).toBeGreaterThan(-1);
    expect(body.slice(Math.max(0, stamp - 120), stamp)).toContain("secondary?.name === 'Ice Ball'");
  });

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
