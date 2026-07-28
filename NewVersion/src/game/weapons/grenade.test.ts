import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  FRICTION_BASE,
  FRICTION_PER_200_UNITS,
  GRENADE_FUSE_FRAMES,
  MIN_SPEED,
  MUZZLE_OFFSET,
  SPEED_DIVISOR,
  STOP_SPEED,
  bounceGrenade,
  grenadeVelocity,
  throwGrenade,
  tickGrenade,
} from './grenade';
import { GRENADE, resolveSecondaryStats } from './secondaries';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';

const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

const owned = (level: number) => {
  const state = createInitialUpgradeState();
  const secondary = [...state.secondary];
  secondary[findUpgradeById('Grenade')!.index] = level;
  return { ...state, secondary };
};

/** Thrown east from the origin at a chosen distance. */
const thrown = (distance: number) =>
  throwGrenade({
    tankX: 0,
    tankY: 0,
    towerRotation: 0,
    targetX: MUZZLE_OFFSET + 3 + distance,
    targetY: 0,
    radius: 3,
  });

describe('the launch', () => {
  it('leaves the muzzle, not the tank centre', () => {
    const g = throwGrenade({
      tankX: 100,
      tankY: 50,
      towerRotation: 0,
      targetX: 400,
      targetY: 50,
      radius: 3,
    });

    expect(g.x).toBeCloseTo(100 + MUZZLE_OFFSET + 3, 10);
    expect(g.y).toBeCloseTo(50, 10);
  });

  it('travels along the tower, not toward the cursor', () => {
    // `spread = 0`, so the heading is the tower angle exactly. Aiming off-axis
    // changes how *far* it goes, never which way.
    const g = throwGrenade({
      tankX: 0,
      tankY: 0,
      towerRotation: 90,
      targetX: 300,
      targetY: 0,
      radius: 3,
    });

    expect(g.angle).toBeCloseTo(Math.PI / 2, 10);
    const { xVel, yVel } = grenadeVelocity(g);
    expect(xVel).toBeCloseTo(0, 8);
    expect(yVel).toBeGreaterThan(0);
  });

  it('divides the distance by 9.35 for speed', () => {
    expect(SPEED_DIVISOR).toBe(9.35);
    expect(thrown(935).speed).toBeCloseTo(100, 10);
  });

  it('floors the speed at 2.1 for a throw at your own feet', () => {
    expect(MIN_SPEED).toBe(2.1);
    // 0 distance would give speed 0 and a grenade that never leaves the muzzle.
    expect(thrown(0).speed).toBe(2.1);
    expect(thrown(1).speed).toBe(2.1);
    // 19.6 units is where the divisor overtakes the floor.
    expect(thrown(100).speed).toBeGreaterThan(2.1);
  });

  it('scales friction with the same distance, so the two fight', () => {
    // A longer throw starts faster *and* decelerates harder. That is what makes
    // it land near the cursor rather than sailing past.
    expect(FRICTION_BASE).toBe(0.101);
    expect(FRICTION_PER_200_UNITS).toBe(0.0014);

    const near = thrown(0);
    const far = thrown(1000);

    expect(near.friction).toBeCloseTo(0.101, 10);
    expect(far.friction).toBeCloseTo(0.101 + 0.0014 * 5, 10);
    expect(far.speed).toBeGreaterThan(near.speed);
    expect(far.friction).toBeGreaterThan(near.friction);
  });

  it('measures the distance from the muzzle', () => {
    // `:4033` measures grenade-to-target, not tank-to-target. Measuring from
    // the tank would over-throw by the muzzle offset on every shot.
    const g = thrown(935);
    expect(g.speed).toBeCloseTo(100, 10);
  });
});

describe('the flight', () => {
  it('burns one frame of fuse per frame', () => {
    expect(GRENADE_FUSE_FRAMES).toBe(50);
    let g = thrown(500);
    for (let i = 0; i < 10; i += 1) g = tickGrenade(g, 1).state;
    expect(g.timeLeft).toBe(40);
  });

  it('decays speed by (1 - friction) each frame', () => {
    const g = thrown(500);
    const after = tickGrenade(g, 1).state;
    expect(after.speed).toBeCloseTo(g.speed * (1 - g.friction), 10);
  });

  it('snaps to zero rather than creeping below 0.5', () => {
    expect(STOP_SPEED).toBe(0.5);

    let g = { ...thrown(0), speed: 0.55, friction: 0.101 };
    // 0.55 * 0.899 = 0.494, under the floor.
    g = tickGrenade(g, 1).state;
    expect(g.speed).toBe(0);
  });

  it('keeps a speed that stays above the floor', () => {
    const g = tickGrenade({ ...thrown(0), speed: 1, friction: 0.101 }, 1).state;
    expect(g.speed).toBeCloseTo(0.899, 10);
  });

  it('stops moving once stopped, and still detonates on time', () => {
    let g = { ...thrown(0), speed: 0.55 };
    let detonated = false;
    for (let i = 0; i < GRENADE_FUSE_FRAMES; i += 1) {
      const tick = tickGrenade(g, 1);
      g = tick.state;
      detonated = detonated || tick.detonated;
    }

    expect(g.speed).toBe(0);
    expect(detonated).toBe(true);
  });

  it('spins with the speed, and the spin is not the heading', () => {
    const g = thrown(500);
    const after = tickGrenade(g, 1).state;

    expect(after.spin).toBeCloseTo(after.speed * 3, 10);
    // Reading `rotation` as the heading would send every grenade somewhere
    // random — the AS3 overwrites it with Math.random() * 360.
    expect(after.angle).toBe(g.angle);
  });

  it('takes fractional frames', () => {
    const g = tickGrenade(thrown(500), 0.5).state;
    expect(g.timeLeft).toBe(GRENADE_FUSE_FRAMES - 0.5);
  });
});

describe('detonation', () => {
  it('fires exactly once, when the fuse runs out', () => {
    let g = thrown(500);
    const fired: number[] = [];

    for (let frame = 1; frame <= 60; frame += 1) {
      const tick = tickGrenade(g, 1);
      g = tick.state;
      if (tick.detonated) fired.push(frame);
    }

    expect(fired).toEqual([GRENADE_FUSE_FRAMES]);
  });

  it('is the only way it goes off — contact does nothing', () => {
    // `:2082`'s else is the single exit; the grenade rolls straight through
    // enemies for its whole life. A contact branch would be an invention.
    const scene = SCENE.slice(SCENE.indexOf('private updateGrenades('));
    const body = scene.slice(0, scene.indexOf('private placeMine('));

    expect(body).toContain('if (ticked.detonated) {');
    expect(body).not.toContain('findEnemiesInBlast');
    expect(body).not.toContain('this.hitEnemy(');
    expect(body).not.toContain('hitsTank');
  });

  it('blasts where it stopped, not where it was thrown', () => {
    expect(SCENE).toContain(
      'this.spawnExplosion({ ...entry.blast, x: ticked.state.x, y: ticked.state.y });',
    );
  });
});

describe('the wall bounce', () => {
  const room = { roomWidth: 800, roomHeight: 600 };
  const at = (x: number, y: number, degrees: number) => ({
    ...thrown(500),
    x,
    y,
    angle: (degrees * Math.PI) / 180,
  });

  it('mirrors across the vertical on a side wall', () => {
    // Heading 45 into the left wall comes back at 135.
    const bounced = bounceGrenade(at(1, 300, 45), room);

    expect(bounced.x).toBe(3);
    expect((bounced.angle * 180) / Math.PI).toBeCloseTo(135, 10);
  });

  it('handles the right wall the same way', () => {
    const bounced = bounceGrenade(at(799, 300, 45), room);

    expect(bounced.x).toBe(797);
    expect((bounced.angle * 180) / Math.PI).toBeCloseTo(135, 10);
  });

  it('mirrors across the horizontal on the top or bottom', () => {
    const top = bounceGrenade(at(400, 1, 45), room);
    expect(top.y).toBe(3);
    expect((top.angle * 180) / Math.PI).toBeCloseTo(-45, 10);

    const bottom = bounceGrenade(at(400, 599, -45), room);
    expect(bottom.y).toBe(597);
    expect((bottom.angle * 180) / Math.PI).toBeCloseTo(45, 10);
  });

  it('handles a negative heading into a side wall', () => {
    const bounced = bounceGrenade(at(1, 300, -45), room);
    expect((bounced.angle * 180) / Math.PI).toBeCloseTo(-135, 10);
  });

  it('leaves a grenade inside the room alone', () => {
    const inside = at(400, 300, 45);
    expect(bounceGrenade(inside, room)).toEqual(inside);
  });

  /**
   * A corner does not compose, and that is faithful.
   *
   * The AS3 captures the heading once before both wall tests, so the horizontal
   * mirror overwrites the vertical one using the *pre-bounce* angle.
   */
  it('a corner gives -original, not the composed reflection', () => {
    const bounced = bounceGrenade(at(1, 1, 45), room);

    expect(bounced.x).toBe(3);
    expect(bounced.y).toBe(3);
    // Composed would be 225 (equivalently -135); the AS3 gives -45.
    expect((bounced.angle * 180) / Math.PI).toBeCloseTo(-45, 10);
  });
});

describe('the stat table', () => {
  it('reads reload, damage and blast radius', () => {
    const stats = resolveSecondaryStats(GRENADE, owned(1))!;

    expect(stats.reloadTimeMax).toBe(650);
    expect(stats.damage).toBe(22);
    expect(stats.explosionRadius).toBe(175);
  });

  it('grows damage and radius, never the cooldown', () => {
    const maxed = resolveSecondaryStats(GRENADE, owned(10))!;

    expect(maxed.reloadTimeMax).toBe(650);
    expect(maxed.damage).toBe(31);
    expect(maxed.explosionRadius).toBe(220);
  });

  it('is null when unowned', () => {
    expect(resolveSecondaryStats(GRENADE, createInitialUpgradeState())).toBeNull();
  });
});

describe('the camera correction is deliberately absent', () => {
  it('is explained where it would have gone', () => {
    const source = readFileSync('src/game/weapons/grenade.ts', 'utf8');
    expect(source).toContain('The camera correction is deliberately not ported');
    expect(source).toContain('400 - cameraPosY');
  });

  it('could not fire: the aim point is always inside the view', () => {
    // `pointerWorldPoint` is camera.getWorldPoint of a pointer inside the
    // canvas, and the HUD is DOM over the canvas rather than a band carved out
    // of the world view. There is nowhere to aim that cannot be seen.
    expect(SCENE).toContain('return this.cameras.main.getWorldPoint(pointer.x, pointer.y');
    const throwBody = SCENE.slice(SCENE.indexOf('private throwGrenade()'));
    expect(throwBody.slice(0, throwBody.indexOf('private updateGrenades'))).not.toContain(
      'cameraPos',
    );
  });
});
