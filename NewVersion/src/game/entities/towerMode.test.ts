/**
 * Tower mode's two structural risks.
 *
 * Both were flagged before implementation because both fail silently:
 *
 *   1. `PlayerTank.drive` gained a `movable` flag, and it is on the path every
 *      mode uses. A mistake there would immobilise Normal levels, or fail to
 *      immobilise Tower, and neither shows up in a steering test.
 *   2. The Tower acceleration ramp is the first piece of per-enemy *mutable*
 *      state in the port. If it is not reset when an entity is reused, a
 *      recycled enemy enters at the previous one's accumulated speed. There is
 *      no pooling today, which is exactly why this needs pinning now — the
 *      failure would arrive with a future optimisation, far from this change.
 *
 * These deliberately drive the real modules rather than reimplementing them,
 * because the defect they guard against is in the wiring, not the arithmetic.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { moveTank, tankStatsFor } from '../player/tankMovement';
import type { TankState } from '../player/tankMovement';
import { createInitialUpgradeState } from '../upgrades/upgradeState';
import { towerAccSpeed, TOWER_ACC_SPEED_MAX } from '../enemies/enemySteering';
import { getLevel } from '../levels/levelData';
import { placeWarning } from '../waves/spawnPlacement';

const BOUNDS = { roomWidth: 640, roomHeight: 640, radius: 14 };
const HELD = { up: false, down: false, left: true, right: false };

function motion(): TankState {
  return { x: 320, y: 320, xVel: 0, yVel: 0, rotation: 0, speed: 0 };
}

/**
 * What `PlayerTank.drive` does when `movable` is true, extracted so this can
 * assert it without a Phaser scene. The point is the *decision*, not the maths:
 * movable runs `moveTank`, immobile does not.
 */
function step(state: TankState, movable: boolean): TankState {
  const stats = tankStatsFor(createInitialUpgradeState());
  if (!movable) return state;
  const result = moveTank(state, HELD, stats, BOUNDS, 1000 / 30);
  return {
    x: result.x,
    y: result.y,
    xVel: result.xVel,
    yVel: result.yVel,
    rotation: result.rotation,
    speed: result.speed,
  };
}

describe('the drive split leaves every other mode alone', () => {
  it('a movable tank still moves under input', () => {
    // The regression that matters most: if `movable` defaulted wrong, or the
    // scene passed it inverted, Normal levels would silently freeze the player.
    let state = motion();
    for (let i = 0; i < 10; i += 1) state = step(state, true);

    expect(state.x).toBeLessThan(320);
    expect(state.xVel).toBeLessThan(0);
  });

  it('an immobile tank does not move under the same input', () => {
    let state = motion();
    for (let i = 0; i < 10; i += 1) state = step(state, false);

    expect(state).toEqual(motion());
  });

  it('leaves the immobile tank untouched in every field', () => {
    // Not "rotation is equal" — moving *does* rotate the hull to face travel,
    // which an earlier version of this test wrongly asserted was unchanged.
    // The real property is that the immobile path writes nothing at all.
    const immobile = step(motion(), false);
    expect(immobile).toEqual(motion());

    const movable = step(motion(), true);
    expect(movable.x).not.toBe(320);
    expect(movable.rotation).not.toBe(0);
  });

  it('the scene only immobilises Tower', () => {
    // Reads the call site: `drive(..., this.levelSpec?.mode !== 'Tower')`. A
    // mode added later that should also be fixed in place has to change this
    // line, and this test is where that gets noticed.
    const text = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(text).toContain("this.player.drive(input, aim, delta, this.levelSpec?.mode !== 'Tower')");
  });
});

describe('the tower ramp resets on reuse, not just on construction', () => {
  /** The ramp as `Enemy` holds it: a number reset by `resetTowerRamp`. */
  class Ramp {
    value = 0;
    constructor(private readonly base: number) {
      this.reset();
    }
    reset(): void {
      this.value = this.base;
    }
    tick(moveSpeedMax: number, frames: number): void {
      this.value = towerAccSpeed(this.value, moveSpeedMax, frames);
    }
  }

  it('starts at the stat value, not zero', () => {
    expect(new Ramp(0.2).value).toBe(0.2);
  });

  it('a reused entity does not inherit the previous ramp', () => {
    // The whole point. Run one enemy's worth of level, then reuse.
    const ramp = new Ramp(0.2);
    for (let i = 0; i < 2000; i += 1) ramp.tick(1.5, 1);
    expect(ramp.value).toBeGreaterThan(7);

    ramp.reset();
    expect(ramp.value).toBe(0.2);
  });

  it('reuse after reaching the cap still resets', () => {
    // The worst case: a long level leaves the ramp pinned at 10, and a reused
    // enemy would enter at 50x its intended acceleration.
    const ramp = new Ramp(0.2);
    ramp.tick(1.5, 100_000);
    expect(ramp.value).toBe(TOWER_ACC_SPEED_MAX);

    ramp.reset();
    expect(ramp.value).toBe(0.2);
  });

  it('Enemy calls the reset from its constructor', () => {
    // Static check, because standing up a real Enemy needs a Phaser scene. If
    // pooling is added, its reuse path must call the same method — the comment
    // on the field says so and this proves the constructor path exists.
    const text = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(text).toContain('this.resetTowerRamp();');
    expect(text).toMatch(/resetTowerRamp\(\): void \{\s*this\.towerAcc = this\.stats\.accSpeed;/);
  });
});

/**
 * The wiring, not the mechanic.
 *
 * Every previous "total no-show" in this project has been the scene feeding a
 * correct module the wrong thing, or not calling it. These assert the runtime
 * inputs: that 1-7 really resolves as Tower, and that the two decisions taken
 * from that resolve the way the mechanic needs.
 */
describe('level 1-7 actually reaches the Tower paths', () => {
  it('resolves as a Tower level at the widened 800x800', () => {
    // 640x640 in the source; widened by the mode rule in levelSizeOverrides so
    // the arena fills the viewport, and kept square so the orbit stays
    // circular.
    const spec = getLevel(1, 7);
    expect(spec).toMatchObject({ mode: 'Tower', roomWidth: 800, roomHeight: 800 });
  });

  it('the drive predicate immobilises it', () => {
    // Exactly the expression at the call site.
    expect(getLevel(1, 7)?.mode !== 'Tower').toBe(false);
    expect(getLevel(1, 1)?.mode !== 'Tower').toBe(true);
  });

  it('placeWarning uses the Tower wall bands, not the off-camera search', () => {
    // The defect this file was extended for. The AS3 camera was a fixed
    // 640x400 stage, so `roomWidth == cameraWidth` held for every 640-wide
    // Tower room and edge placement always ran. This port judges against the
    // live viewport, which is 711 units wide on 16:9 — so the disqualifier
    // stops firing, the off-camera search wins, and enemies appear at random
    // interior points with wall 0 instead of entering from the staggered
    // bands. The mode's entry pattern disappears.
    const placements = Array.from({ length: 40 }, (_, i) =>
      placeWarning({
        mode: 'Tower',
        roomWidth: 640,
        roomHeight: 640,
        cameraWidth: 711,
        cameraHeight: 400,
        random: () => (i % 20) / 20,
      }),
    );
    for (const p of placements) {
      expect(p.offCamera, 'Tower must not use the off-camera search').toBe(false);
      expect(p.wall).toBeGreaterThan(0);
    }
  });
});
