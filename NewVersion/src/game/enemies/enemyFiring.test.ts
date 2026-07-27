/**
 * Enemy shooting — the Basic/Front slice.
 */
import { describe, expect, it } from 'vitest';
import type { EnemyBulletState, ShooterOrigin } from './enemyFiring';
import {
  FOLLOWING_BOSS_BULLET,
  FOLLOWING_BOSS_TURN_RATE,
  FOLLOWING_BULLET,
  FOLLOWING_TURN_RATE,
  BACKTRAP_SPACING,
  SUPPORTED_SHOOT_ANGLES,
  SUPPORTED_SHOOT_TYPES,
  TRAP_BULLET,
  bulletClassFor,
  createBackTrapShot,
  homeTowardTank,
  turnRateFor,
  advanceEnemyBullet,
  applyBulletToTank,
  BASIC_BULLET_DAMAGE,
  BASIC_BULLET_LIFETIME,
  BASIC_BULLET_RADIUS,
  BASIC_BULLET_SPEED,
  bulletAlpha,
  canShoot,
  BASIC_BULLET,
  BASIC_BOSS_BULLET,
  createCircleShot,
  createFrontShot,
  createShooter,
  createVolley,
  hitsTank,
  initialReloadTime,
  registerShot,
  tickShooter,
} from './enemyFiring';
import { resolveEnemyStats } from './enemyStats';
import { TANK_MAX_HP } from '../player/tankDamage';
import { getLevel } from '../levels/levelData';

const FRAME = 1000 / 30;
const bounds = { roomWidth: 640, roomHeight: 960 };

describe('the stats come from the tables', () => {
  it('Shooting is a Basic/Front shooter', () => {
    const stats = resolveEnemyStats('Shooting', '1', 'Easy')!;
    expect(stats.shoot).toBe(true);
    expect(stats.shootType).toBe('Basic');
    expect(stats.shootAngle).toBe('Front');
    expect(stats.reloadTimeMax).toBeGreaterThan(0);
  });

  it('Basic enemies do not shoot', () => {
    expect(resolveEnemyStats('Basic', '1', 'Easy')!.shoot).toBe(false);
  });

  it('harder difficulties reload faster', () => {
    const easy = resolveEnemyStats('Shooting', '1', 'Easy')!.reloadTimeMax!;
    const hard = resolveEnemyStats('Shooting', '1', 'Hard')!.reloadTimeMax!;
    expect(hard).toBeLessThan(easy);
  });
});

describe('the reload clock', () => {
  it('starts randomised, never already loaded', () => {
    // Without this every enemy of a wave fires in unison; the +10 floor stops
    // a shooter arriving ready.
    for (const roll of [0, 0.5, 1]) {
      const initial = initialReloadTime(120, () => roll);
      expect(initial).toBeGreaterThanOrEqual(10);
      expect(initial).toBeLessThanOrEqual(120);
    }
  });

  it('spreads shooters out rather than syncing them', () => {
    const values = new Set([0.1, 0.4, 0.9].map((r) => initialReloadTime(120, () => r)));
    expect(values.size).toBe(3);
  });

  it('blocks until it reaches zero, then fires', () => {
    let shooter = createShooter(30, () => 1); // initial 30
    expect(canShoot(shooter, false)).toBe(false);

    for (let i = 0; i < 30; i += 1) shooter = tickShooter(shooter, FRAME);
    expect(canShoot(shooter, false)).toBe(true);
  });

  it('resets to the full interval after firing', () => {
    let shooter = createShooter(30, () => 0);
    for (let i = 0; i < 30; i += 1) shooter = tickShooter(shooter, FRAME);
    shooter = registerShot(shooter);
    expect(shooter.reloadTime).toBe(30);
    expect(canShoot(shooter, false)).toBe(false);
  });

  it('is frame-rate independent', () => {
    let at60 = createShooter(30, () => 1);
    for (let i = 0; i < 60; i += 1) at60 = tickShooter(at60, 1000 / 60);
    expect(at60.reloadTime).toBe(0);
  });

  it('a frozen enemy does not shoot', () => {
    // Freeze stops shooting as well as movement.
    let shooter = createShooter(10, () => 0);
    for (let i = 0; i < 20; i += 1) shooter = tickShooter(shooter, FRAME);
    expect(canShoot(shooter, false)).toBe(true);
    expect(canShoot(shooter, true)).toBe(false);
  });
});

describe('the shot', () => {
  const origin = { x: 300, y: 300, rotation: 0, radius: 13 };

  it('leaves the enemy edge, not its centre', () => {
    const bullet = createFrontShot(origin, BASIC_BULLET)[0];
    expect(bullet.x).toBeCloseTo(300 + 13 + BASIC_BULLET_RADIUS, 6);
    expect(bullet.y).toBeCloseTo(300, 6);
  });

  it('travels along the enemy facing', () => {
    const bullet = createFrontShot({ ...origin, rotation: 90 }, BASIC_BULLET)[0];
    expect(bullet.xVel).toBeCloseTo(0, 6);
    expect(bullet.yVel).toBeCloseTo(BASIC_BULLET_SPEED, 6);
  });

  it('carries the Basic stats', () => {
    const bullet = createFrontShot(origin, BASIC_BULLET)[0];
    expect(bullet.damage).toBe(BASIC_BULLET_DAMAGE);
    expect(bullet.lifeTime).toBe(BASIC_BULLET_LIFETIME);
  });

  it('is sped up on harder difficulties', () => {
    const easy = createFrontShot(origin, BASIC_BULLET, 1)[0];
    const hard = createFrontShot(origin, BASIC_BULLET, 1.3)[0];
    expect(Math.hypot(hard.xVel, hard.yVel)).toBeCloseTo(
      Math.hypot(easy.xVel, easy.yVel) * 1.3,
      6,
    );
  });
});

describe('the Circle pattern', () => {
  const origin = { x: 300, y: 300, rotation: 0, radius: 13 };

  it('fires one bullet per bulletAmount', () => {
    expect(createCircleShot(origin, BASIC_BULLET, 6, () => 0)).toHaveLength(6);
    expect(createCircleShot(origin, BASIC_BULLET, 1, () => 0)).toHaveLength(1);
  });

  it('spaces them evenly around a full turn', () => {
    const rotations = createCircleShot(origin, BASIC_BULLET, 6, () => 0).map((b) => b.rotation);
    for (let i = 1; i < rotations.length; i += 1) {
      expect(rotations[i] - rotations[i - 1]).toBeCloseTo(60, 10);
    }
  });

  it('starts from a random angle, so volleys cannot be dodged by standing still', () => {
    const a = createCircleShot(origin, BASIC_BULLET, 6, () => 0)[0].rotation;
    const b = createCircleShot(origin, BASIC_BULLET, 6, () => 0.5)[0].rotation;
    expect(a).not.toBeCloseTo(b, 3);
  });

  it('ignores the enemy facing entirely', () => {
    // Unlike Front, a Circle volley is the same wherever the enemy points.
    const facingEast = createCircleShot(origin, BASIC_BULLET, 4, () => 0).map((b) => b.rotation);
    const facingSouth = createCircleShot(
      { ...origin, rotation: 90 },
      BASIC_BULLET,
      4,
      () => 0,
    ).map((b) => b.rotation);
    expect(facingSouth).toEqual(facingEast);
  });

  it('sends every bullet at full speed', () => {
    for (const b of createCircleShot(origin, BASIC_BULLET, 6, () => 0.3)) {
      expect(Math.hypot(b.xVel, b.yVel)).toBeCloseTo(BASIC_BULLET_SPEED, 6);
    }
  });

  it('never produces zero bullets from a bad count', () => {
    expect(createCircleShot(origin, BASIC_BULLET, 0, () => 0)).toHaveLength(1);
  });
});

describe('the boss bullet', () => {
  const origin = { x: 0, y: 0, rotation: 0, radius: 10 };

  it('hits harder but expires far sooner', () => {
    const boss = createFrontShot(origin, BASIC_BOSS_BULLET)[0];
    const basic = createFrontShot(origin, BASIC_BULLET)[0];
    expect(boss.damage).toBe(basic.damage * 2);
    expect(boss.lifeTime).toBeLessThan(basic.lifeTime / 5);
    expect(boss.radius).toBeGreaterThan(basic.radius);
  });
});

describe('createVolley dispatch', () => {
  const origin = { x: 0, y: 0, rotation: 0, radius: 10 };

  it('matches every ported enemy to a volley', () => {
    // Crazy and Random are Circle; Shooting and Ninja are Front.
    for (const type of ['Shooting', 'Ninja', 'Crazy', 'Random']) {
      const stats = resolveEnemyStats(type, '1', 'Easy')!;
      const volley = createVolley(
        origin,
        stats.shootType,
        stats.shootAngle,
        stats.bulletAmount ?? 1,
        () => 0.5,
      );
      expect(volley.length, type).toBeGreaterThan(0);
    }
  });

  it('produces nothing for an unported combination', () => {
    // GrapplingHook fires a tether, still unported, and must stay harmless
    // rather than throw or fire a wrong-looking shot. Soldier was here until
    // Following landed, and Trap until BackTrap did — one name left.
    for (const type of ['GrapplingHook']) {
      const stats = resolveEnemyStats(type, '1', 'Easy')!;
      expect(
        createVolley(origin, stats.shootType, stats.shootAngle, stats.bulletAmount ?? 1, () => 0.5),
        type,
      ).toHaveLength(0);
    }
  });

  it('Crazy throws a six-bullet ring', () => {
    const stats = resolveEnemyStats('Crazy', '1', 'Easy')!;
    expect(stats.shootAngle).toBe('Circle');
    expect(
      createVolley(origin, stats.shootType, stats.shootAngle, stats.bulletAmount ?? 1, () => 0),
    ).toHaveLength(6);
  });
});

describe('flight', () => {
  const bullet = () =>
    createFrontShot({ x: 320, y: 480, rotation: 0, radius: 13 }, BASIC_BULLET)[0];

  it('moves along its velocity', () => {
    const next = advanceEnemyBullet(bullet(), bounds, FRAME)!;
    expect(next.x).toBeCloseTo(bullet().x + BASIC_BULLET_SPEED, 6);
  });

  it('dies past the room edge, allowing for its own radius', () => {
    // The bound is roomWidth + radius, so a bullet at 639 travelling 4 reaches
    // 643 and is still inside 644 — it survives one more frame.
    expect(advanceEnemyBullet({ ...bullet(), x: 639 }, bounds, FRAME)).not.toBeNull();
    expect(advanceEnemyBullet({ ...bullet(), x: 645 }, bounds, FRAME)).toBeNull();
  });

  it('dies when its lifetime runs out', () => {
    const old = { ...bullet(), lifeTime: 0.5, xVel: 0, yVel: 0 };
    expect(advanceEnemyBullet(old, bounds, FRAME)).toBeNull();
  });

  it('fades over the last ten frames', () => {
    expect(bulletAlpha({ ...bullet(), lifeTime: 900 })).toBe(1);
    expect(bulletAlpha({ ...bullet(), lifeTime: 10 })).toBeCloseTo(1, 6);
    expect(bulletAlpha({ ...bullet(), lifeTime: 0 })).toBeCloseTo(0.3, 6);
  });

  it('is frame-rate independent', () => {
    let at30 = bullet();
    for (let i = 0; i < 10; i += 1) at30 = advanceEnemyBullet(at30, bounds, 1000 / 30)!;
    let at60 = bullet();
    for (let i = 0; i < 20; i += 1) at60 = advanceEnemyBullet(at60, bounds, 1000 / 60)!;
    expect(at60.x).toBeCloseTo(at30.x, 6);
  });
});

describe('hitting the tank', () => {
  const bullet = createFrontShot({ x: 100, y: 100, rotation: 0, radius: 0 }, BASIC_BULLET)[0];

  it('needs the radii to overlap', () => {
    expect(hitsTank(bullet, { x: bullet.x + 16, y: 100, radius: 13 })).toBe(true);
    expect(hitsTank(bullet, { x: bullet.x + 20, y: 100, radius: 13 })).toBe(false);
  });

  it('floors health at zero rather than going negative', () => {
    // `:1574` sets exactly 0 when a hit would overkill.
    expect(applyBulletToTank(1, 5)).toBe(0);
    expect(applyBulletToTank(100, 1)).toBe(99);
  });
});

describe('defeat is now reachable', () => {
  it('contact alone could never kill the tank on level 1-1', () => {
    // 10 enemies, each dying on contact, capped the level's damage at 50.
    const spec = getLevel(1, 1)!;
    const contact = resolveEnemyStats('Basic', '1', 'Easy')!.damage;
    expect(spec.totalEnemies * contact).toBeLessThan(TANK_MAX_HP);
  });

  it('ranged fire removes the cap', () => {
    // A shooter survives its own shots, so its output is bounded only by time.
    const stats = resolveEnemyStats('Shooting', '1', 'Easy')!;
    const shotsToKill = Math.ceil(TANK_MAX_HP / BASIC_BULLET_DAMAGE);
    const framesToKill = shotsToKill * stats.reloadTimeMax!;
    expect(framesToKill).toBeGreaterThan(0);
    expect(Number.isFinite(framesToKill)).toBe(true);
  });
});

/* ── Following (Soldier) ─────────────────────────────────────────────────── */

const TANK = { x: 0, y: 0 };

function shotAt(bearingDegrees: number, distance = 300): EnemyBulletState {
  const radians = (bearingDegrees * Math.PI) / 180;
  return {
    x: Math.cos(radians) * distance,
    y: Math.sin(radians) * distance,
    // Fired *toward* the tank, which is what Soldier does: `Front` sends the
    // round along the enemy's facing, and the enemy steers at the tank.
    rotation: bearingDegrees + 180,
    xVel: Math.cos(radians) * 4,
    yVel: Math.sin(radians) * 4,
    radius: 4,
    damage: 1,
    lifeTime: 90,
    lifeTimeMax: 90,
  };
}

const home = (b: EnemyBulletState, frames: number, rate = FOLLOWING_TURN_RATE) => {
  let state = b;
  for (let i = 0; i < frames; i += 1) {
    state = homeTowardTank(state, TANK, rate, 1);
    state = { ...state, x: state.x + state.xVel, y: state.y + state.yVel };
  }
  return state;
};

describe('the Following bullet', () => {
  it('carries the stats from the fire site', () => {
    expect(FOLLOWING_BULLET).toEqual({ radius: 4, damage: 1, lifeTime: 90 });
    expect(FOLLOWING_BOSS_BULLET).toEqual({ radius: 6, damage: 2, lifeTime: 90 });
    // 90 frames at speed 4 is 360 units of travel — short enough to outrun.
    expect(FOLLOWING_BULLET.lifeTime).toBe(90);
  });

  it('is buildable, which is what flips Soldier to implemented', () => {
    expect(bulletClassFor('Following')).toBe(FOLLOWING_BULLET);
    expect(bulletClassFor('FollowingBoss')).toBe(FOLLOWING_BOSS_BULLET);
    expect(turnRateFor('Following')).toBe(1.2);
    expect(turnRateFor('FollowingBoss')).toBe(1.5);
    expect(turnRateFor('Basic')).toBeNull();
  });
});

describe('homing converges on the tank', () => {
  it('closes in from every bearing', () => {
    for (const bearing of [0, 45, 90, 135, 180, -45, -90, -135]) {
      const start = shotAt(bearing);
      const after = home(start, 89);
      const startDistance = Math.hypot(start.x, start.y);
      const endDistance = Math.hypot(after.x, after.y);

      expect(endDistance, `bearing ${bearing}`).toBeLessThan(startDistance);
    }
  });

  it('turns at most 1.2 degrees a frame, and 1.5 for a boss', () => {
    const start: EnemyBulletState = { ...shotAt(0), rotation: 90 };
    const one = homeTowardTank(start, TANK, FOLLOWING_TURN_RATE, 1);
    expect(Math.abs(one.rotation - start.rotation)).toBeCloseTo(1.2, 10);

    const boss = homeTowardTank(start, TANK, FOLLOWING_BOSS_TURN_RATE, 1);
    expect(Math.abs(boss.rotation - start.rotation)).toBeCloseTo(1.5, 10);
  });

  it('preserves speed exactly — it steers, it does not accelerate', () => {
    let state = shotAt(30);
    const speed = Math.hypot(state.xVel, state.yVel);
    for (let i = 0; i < 50; i += 1) {
      state = homeTowardTank(state, TANK, FOLLOWING_TURN_RATE, 1);
      expect(Math.hypot(state.xVel, state.yVel)).toBeCloseTo(speed, 10);
    }
  });

  it('flies straight when there is no tank', () => {
    // `tank != null && stage.contains(tank)` — a destroyed tank stops the
    // homing rather than freezing the round.
    const start = shotAt(0);
    expect(homeTowardTank(start, null, FOLLOWING_TURN_RATE, 1)).toBe(start);
  });
});

/**
 * The linked bugs.
 *
 * The AS3 reverses the bearing arguments *and* turns backwards, which compose
 * into correct homing. A third bug compares degrees against radians in the
 * snap-to-exact branch, which is what stops that branch assigning the reversed
 * bearing and sending the round away on final approach.
 *
 * These assert the composed behaviour, so correcting any one in isolation
 * fails here rather than in play.
 */
describe('the reversed bearing and the backwards turn cancel', () => {
  it('turning "away" from the away-bearing is turning toward the tank', () => {
    // Bullet due east of the tank, travelling north-east. The away-bearing is
    // 0; a naive "turn toward the bearing" would rotate it to 0 and send it
    // further out. It goes the other way.
    const state: EnemyBulletState = { ...shotAt(0), rotation: -45 };
    const after = homeTowardTank(state, TANK, FOLLOWING_TURN_RATE, 1);

    expect(after.rotation).toBeCloseTo(-46.2, 10);
    // Away from 0, so toward 180 — which points at the tank.
    expect(Math.abs(after.rotation)).toBeGreaterThan(Math.abs(state.rotation));
  });

  it('the snap branch is unreachable in practice', () => {
    // Threshold is 1.2 degrees converted to radians = 0.0209, compared against
    // a difference in degrees. Fixing the units alone would let it fire — and
    // it assigns the *away* bearing.
    const threshold = (FOLLOWING_TURN_RATE / 180) * Math.PI;
    expect(threshold).toBeCloseTo(0.0209, 4);
    expect(threshold).toBeLessThan(FOLLOWING_TURN_RATE / 50);

    // A round one degree off still takes the ordinary turn, not the snap.
    const nearlyAligned: EnemyBulletState = { ...shotAt(0), rotation: 1 };
    const after = homeTowardTank(nearlyAligned, TANK, FOLLOWING_TURN_RATE, 1);
    expect(after.rotation).not.toBe(0);
    expect(after.rotation).toBeCloseTo(2.2, 10);
  });

  it('latches outward when fired exactly away — the one case the snap reaches', () => {
    // Difference exactly zero is below even the radians threshold, so the snap
    // fires and assigns the away-bearing: the round flies off and never turns
    // back. Unreachable from Soldier, which fires along its facing toward the
    // tank, but it is what the three bugs produce together and correcting any
    // one of them changes it.
    const outward: EnemyBulletState = { ...shotAt(0), rotation: 0 };
    const after = home(outward, 60);

    expect(after.rotation).toBe(0);
    expect(Math.hypot(after.x, after.y)).toBeGreaterThan(300);
  });

  it('a round already pointing at the tank keeps pointing at it', () => {
    // The end state the composition has to produce: heading 180 against an
    // away-bearing of 0 is the maximum difference, and it must stay there
    // rather than oscillate outward.
    const aimed: EnemyBulletState = { ...shotAt(0), rotation: 180 };
    const after = home(aimed, 20);
    expect(Math.hypot(after.x, after.y)).toBeLessThan(300);
  });
});

/* ── Trap ────────────────────────────────────────────────────────────────── */

const TRAP_ORIGIN: ShooterOrigin = { x: 400, y: 300, rotation: 0, radius: 12 };

describe('the Trap hazard', () => {
  it('is a stationary one-shot, not a projectile', () => {
    expect(TRAP_BULLET).toEqual({ radius: 6, damage: 2, lifeTime: 300 });
    expect(bulletClassFor('Trap')).toBe(TRAP_BULLET);
    // Bigger and harder-hitting than a bullet.
    expect(TRAP_BULLET.radius).toBeGreaterThan(BASIC_BULLET.radius);
    expect(TRAP_BULLET.damage).toBeGreaterThan(BASIC_BULLET.damage);
  });

  it('never moves', () => {
    for (const trap of createBackTrapShot(TRAP_ORIGIN, TRAP_BULLET, 3)) {
      expect(trap.xVel).toBe(0);
      expect(trap.yVel).toBe(0);
    }
  });
});

describe('the BackTrap fan', () => {
  it('drops one behind the enemy', () => {
    const [trap] = createBackTrapShot(TRAP_ORIGIN, TRAP_BULLET, 1);
    // Facing 0 (east), so the single trap goes due west of the enemy.
    expect(trap.rotation).toBe(180);
    expect(trap.x).toBeCloseTo(400 - 12, 10);
    expect(trap.y).toBeCloseTo(300, 10);
  });

  it('places at the enemy radius alone, so the trap overlaps its layer', () => {
    // Every other pattern uses enemy.radius + bullet.radius to clear its owner.
    // This one does not, which is what makes a trap look placed rather than
    // fired.
    const [trap] = createBackTrapShot(TRAP_ORIGIN, TRAP_BULLET, 1);
    const distance = Math.hypot(trap.x - TRAP_ORIGIN.x, trap.y - TRAP_ORIGIN.y);
    expect(distance).toBeCloseTo(TRAP_ORIGIN.radius, 10);
    expect(distance).toBeLessThan(TRAP_ORIGIN.radius + TRAP_BULLET.radius);
  });

  it('spaces a boss volley 20 degrees apart, centred on the rear', () => {
    const traps = createBackTrapShot(TRAP_ORIGIN, TRAP_BULLET, 3);
    expect(traps).toHaveLength(3);
    expect(BACKTRAP_SPACING).toBe(20);

    expect(traps.map((t) => t.rotation)).toEqual([160, 180, 200]);
    // Symmetric about the rear bearing.
    expect(traps[1].rotation).toBe(180);
  });

  it('follows the enemy facing', () => {
    const facingNorth = { ...TRAP_ORIGIN, rotation: -90 };
    const [trap] = createBackTrapShot(facingNorth, TRAP_BULLET, 1);
    // Facing up, so the trap lands below.
    expect(trap.rotation).toBe(90);
    expect(trap.y).toBeCloseTo(300 + 12, 10);
  });

  it('reaches Trap through createVolley', () => {
    const volley = createVolley(TRAP_ORIGIN, 'Trap', 'BackTrap', 1, () => 0.5);
    expect(volley).toHaveLength(1);
    expect(volley[0].lifeTime).toBe(300);
  });
});

/**
 * The removal path, which is the one that could leak invisibly.
 *
 * A trap has speed 0, so the room-bounds cull in `advanceEnemyBullet` can never
 * fire for it — a trap dropped inside the room stays inside the room forever.
 * Lifetime is therefore the *only* thing that removes it, and if that were
 * wrong the traps would simply accumulate with nothing on screen to say so.
 */
describe('a trap expires only by lifetime', () => {
  const ROOM = { roomWidth: 800, roomHeight: 800 };

  it('survives 299 frames and is gone on the 300th', () => {
    // The full countdown, not a sampled one — the point is that nothing else
    // removes it along the way.
    let state: EnemyBulletState | null = createBackTrapShot(TRAP_ORIGIN, TRAP_BULLET, 1)[0];

    for (let frame = 1; frame < 300; frame += 1) {
      state = advanceEnemyBullet(state!, ROOM, 1000 / 30);
      expect(state, `frame ${frame}`).not.toBeNull();
    }

    expect(advanceEnemyBullet(state!, ROOM, 1000 / 30)).toBeNull();
  });

  it('does not drift a single unit over its whole life', () => {
    let state: EnemyBulletState | null = createBackTrapShot(TRAP_ORIGIN, TRAP_BULLET, 1)[0];
    const origin = { x: state.x, y: state.y };

    for (let frame = 0; frame < 299; frame += 1) {
      state = advanceEnemyBullet(state!, ROOM, 1000 / 30);
    }

    expect(state!.x).toBe(origin.x);
    expect(state!.y).toBe(origin.y);
  });

  it('cannot be culled by the room bounds, however small the room', () => {
    // A room barely larger than the trap: it is still inside, so the bounds
    // check never fires and lifetime remains the only exit.
    const trap = createBackTrapShot({ ...TRAP_ORIGIN, x: 20, y: 20 }, TRAP_BULLET, 1)[0];
    expect(advanceEnemyBullet(trap, { roomWidth: 40, roomHeight: 40 }, 1000 / 30)).not.toBeNull();
  });
});

describe('Trap is now buildable, which flips the board', () => {
  it('the shoot type and pattern are both supported', () => {
    expect(SUPPORTED_SHOOT_TYPES).toContain('Trap');
    expect(SUPPORTED_SHOOT_ANGLES).toContain('BackTrap');
  });

  it('a real Trap enemy resolves to a full volley', () => {
    const stats = resolveEnemyStats('Trap', '1', 'Easy')!;
    expect(stats.shootType).toBe('Trap');
    expect(stats.shootAngle).toBe('BackTrap');

    const volley = createVolley(
      TRAP_ORIGIN,
      stats.shootType,
      stats.shootAngle,
      stats.bulletAmount ?? 1,
      () => 0.5,
    );
    expect(volley).toHaveLength(1);
  });
});
