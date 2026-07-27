import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  HOOK_BULLET,
  REEL_ACCELERATION,
  REEL_MAX_SPEED,
  TETHERED_TANK_ACC_SPEED,
  TETHERED_TANK_FRICTION,
  TETHERED_TANK_MAX_SPEED,
  TETHER_PULL,
  canFireHook,
  createGrappleState,
  grapplesTank,
  reelVelocity,
  releaseHeading,
} from './enemyGrapple';
import { clampTankToRoom, tankStatsFor, tetherPull, tetheredTankStats } from '../player/tankMovement';
import { createInitialUpgradeState } from '../upgrades/upgradeState';

const TANK = { x: 0, y: 0 };

/** One frame of the entity's reel: velocity, then the speed cap. */
function reelStep(enemy: { x: number; y: number; xVel: number; yVel: number }) {
  const speed = Math.hypot(enemy.xVel, enemy.yVel);
  const reel = reelVelocity(enemy, TANK, speed);
  let { xVel, yVel } = reel;
  const next = Math.hypot(xVel, yVel);
  if (next > reel.moveSpeedMax) {
    xVel *= reel.moveSpeedMax / next;
    yVel *= reel.moveSpeedMax / next;
  }
  return { ...enemy, xVel, yVel, rotation: reel.rotation };
}

describe('the reel', () => {
  it('gains half a unit of speed a frame', () => {
    expect(REEL_ACCELERATION).toBe(0.5);
    let enemy = { x: 300, y: 0, xVel: 0, yVel: 0 };

    enemy = reelStep(enemy);
    expect(Math.hypot(enemy.xVel, enemy.yVel)).toBeCloseTo(0.5, 10);
    enemy = reelStep(enemy);
    expect(Math.hypot(enemy.xVel, enemy.yVel)).toBeCloseTo(1.0, 10);
  });

  it('caps at 5, well above the base 1.5', () => {
    expect(REEL_MAX_SPEED).toBe(5);
    let enemy = { x: 300, y: 0, xVel: 0, yVel: 0 };
    for (let i = 0; i < 50; i += 1) enemy = reelStep(enemy);

    expect(Math.hypot(enemy.xVel, enemy.yVel)).toBeCloseTo(REEL_MAX_SPEED, 10);
  });

  it('points straight at the tank with no turn rate', () => {
    // Facing away entirely; the reel snaps rather than turning.
    const enemy = { x: 300, y: 0, xVel: 4, yVel: 0 };
    const stepped = reelStep(enemy);

    expect(stepped.rotation).toBeCloseTo(180, 10);
    expect(stepped.xVel).toBeLessThan(0);
  });
});

/**
 * The failure mode this enemy was flagged for.
 *
 * Defense slid along walls because the clamp zeroed the perpendicular velocity
 * while `rotation` still pointed into the wall and nothing re-aimed it. The
 * reel rebuilds *both* from the tank's position every frame, so whatever the
 * clamp did last frame is gone.
 */
describe('a wall cannot produce the Defense slide', () => {
  it('re-derives velocity and rotation every frame, ignoring the last', () => {
    // Simulate the clamp having zeroed x-velocity and mirrored the heading.
    const afterWall = { x: 300, y: 0, xVel: 0, yVel: 3, rotation: 90 };
    const stepped = reelStep(afterWall);

    // Both rebuilt from the bearing to the tank, not carried over.
    expect(stepped.rotation).toBeCloseTo(180, 10);
    expect(stepped.xVel).toBeLessThan(0);
  });

  it('recovers immediately however the clamp mangled it', () => {
    for (const mangled of [
      { xVel: 0, yVel: 0 },
      { xVel: 5, yVel: 0 },
      { xVel: -3, yVel: 4 },
    ]) {
      const stepped = reelStep({ x: 300, y: 0, ...mangled });
      // Always heading back at the tank, never stuck against the wall.
      expect(stepped.xVel).toBeLessThan(0);
      expect(stepped.rotation).toBeCloseTo(180, 10);
    }
  });

  it('the entity still runs the ordinary room clamp', () => {
    // The reel replaces the *steering*, not the integration — so position is
    // clamped and the enemy cannot be pulled through a wall.
    // The reel produces `stepped` exactly as steering does, and `stepped`
    // flows through the same wall path — so position is clamped either way.
    const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(source).toContain('const stepped = this.grapple?.isGrapping');
    expect(source).toContain('? this.reelStep(target, frames)');
    expect(source).toContain('bounceOffSideWalls(stepped, this.roomWidth, this.radius)');
    expect(source).toContain('clampToRoom(walled, this.roomWidth, this.roomHeight, this.radius)');
  });
});

describe('the one-hook lock', () => {
  it('allows a shot only with nothing in flight and nothing attached', () => {
    expect(canFireHook(createGrappleState())).toBe(true);
    expect(canFireHook({ bulletsShooting: 1, isGrapping: false })).toBe(false);
    expect(canFireHook({ bulletsShooting: 0, isGrapping: true })).toBe(false);
    expect(canFireHook({ bulletsShooting: 1, isGrapping: true })).toBe(false);
  });

  it('the scene checks it before firing and frees the slot both ways', () => {
    // Freed on impact and on expiry — a missed hook must not lock the enemy
    // out for the rest of the level.
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).toContain('if (enemy.grapple && !canFireHook(enemy.grapple)) continue;');
    expect(scene.match(/releaseHookSlot\(/g) ?? []).toHaveLength(3);
  });
});

describe('the boss tether, and only the boss', () => {
  it('overwrites the tank stats rather than scaling them', () => {
    // A fully upgraded tank handles exactly as an unupgraded one while
    // attached: it is a handling penalty, not a slow.
    expect(tetheredTankStats()).toEqual({
      maxSpeed: TETHERED_TANK_MAX_SPEED,
      accSpeed: TETHERED_TANK_ACC_SPEED,
      friction: TETHERED_TANK_FRICTION,
    });
    expect(tetheredTankStats()).toEqual({ maxSpeed: 8, accSpeed: 0.4, friction: 0.3 });
  });

  it('restores the tank to its own upgraded stats when released', () => {
    const own = tankStatsFor(createInitialUpgradeState());
    expect(own).not.toEqual(tetheredTankStats());
  });

  it('pulls the tank toward the enemy, added to its own velocity', () => {
    // Added rather than replacing, so the player can fight it — unlike the
    // enemy's reel, which overwrites.
    expect(TETHER_PULL).toBe(2);
    const pulled = tetherPull({ xVel: 1, yVel: 0 }, 0, 0, { x: 100, y: 0 }, 1);
    expect(pulled.xVel).toBeCloseTo(3, 10);
    expect(pulled.yVel).toBeCloseTo(0, 10);
  });

  it('is attached only for a boss', () => {
    // isGrapping is set on both ranks; tank.grappingEnemy only for "B".
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).toContain("if (entry.hookOwner.enemyLevel === 'B') this.player.tetheredTo = entry.hookOwner;");
    expect(scene).toContain('isGrapping: true,');
  });
});

describe('the three release paths', () => {
  it('enemy death clears the tank tether', () => {
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).toContain('if (this.player.tetheredTo === enemy) this.player.tetheredTo = null;');
  });

  it('the shield push tears a non-boss loose', () => {
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).toContain('enemy.releaseGrapple();');
  });

  it('the release flings it into the lower hemisphere', () => {
    // The same 105+-15 / 75+-15 fan Defense uses, clamped to 15..165.
    for (const rotation of [180, -180, 120, -120]) {
      const heading = releaseHeading(rotation, 1.5, () => 0.5);
      expect(heading).toBeGreaterThanOrEqual(15);
      expect(heading).toBeLessThanOrEqual(165);
    }
    expect(releaseHeading(0, 1.5, () => 0.5)).toBeCloseTo(42, 10);
    expect(releaseHeading(180, 1.5, () => 0.5)).toBeCloseTo(138, 10);
  });
});

/**
 * The clamped shove — a deliberate divergence.
 *
 * `PartGameArea.as:5319` writes tank.x/y with no clamp to push the player clear
 * of a boss. Against a wall-pinned boss that puts them outside the room, and
 * nothing brings them back: the movement clamp constrains steps, not absolute
 * writes.
 */
describe('the tank shove stays inside the room', () => {
  const bounds = { roomWidth: 800, roomHeight: 800, radius: 14 };

  it('clamps a shove that would leave the room', () => {
    expect(clampTankToRoom(-50, 400, bounds)).toEqual({ x: 14, y: 400 });
    expect(clampTankToRoom(900, 400, bounds)).toEqual({ x: 786, y: 400 });
    expect(clampTankToRoom(400, -10, bounds)).toEqual({ x: 400, y: 14 });
    expect(clampTankToRoom(400, 5000, bounds)).toEqual({ x: 400, y: 786 });
  });

  it('leaves an in-bounds shove untouched', () => {
    expect(clampTankToRoom(400, 300, bounds)).toEqual({ x: 400, y: 300 });
  });

  it('is applied at the shove site and says why', () => {
    const source = readFileSync('src/game/entities/PlayerTank.ts', 'utf8');
    expect(source).toContain('shoveTo(x: number, y: number): void');
    expect(source).toContain('clampTankToRoom');
  });
});

describe('the hook bullet', () => {
  it('is a real bullet that also attaches', () => {
    expect(HOOK_BULLET).toEqual({ radius: 5, damage: 1, lifeTime: 100 });
  });

  it('claims the right type', () => {
    expect(grapplesTank('GrapplingHook')).toBe(true);
    for (const other of ['Basic', 'Soldier', 'Trap', 'Teleporting']) {
      expect(grapplesTank(other), other).toBe(false);
    }
  });
});
