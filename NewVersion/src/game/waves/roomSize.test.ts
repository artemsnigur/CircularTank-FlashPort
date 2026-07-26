/**
 * The room size must come from the level, not from a constant.
 *
 * `GameplayScene` hardcoded `ROOM_WIDTH = 640` / `ROOM_HEIGHT = 960` and fed
 * those to physics bounds, the ground tile, the tank clamp, the camera, bullet
 * culling, pickup scatter and spawn placement. `LevelSpec.roomWidth`/
 * `roomHeight` were extracted for all 405 levels, asserted in
 * `levelProgress.test.ts`, and read by nothing — so every level played at
 * 640x960 when only 90 of them are that size.
 *
 * It also silently disabled a whole subsystem. `spawnPlacement`'s off-camera
 * search is skipped when `roomWidth === cameraWidth || roomHeight ===
 * cameraHeight` (`PartGameArea.as:7245`), and the hardcoded 640 always equalled
 * `CAMERA_WIDTH`, so the search could never run on any level and every enemy in
 * the game entered from a wall.
 *
 * Two halves below: what the room size now does (behaviour), and that the scene
 * actually reads it (the seam). The seam half is a source-shape test because
 * the scene is too heavy to instantiate — same rationale and same technique as
 * `killTally.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { getLevel } from '../levels/levelData';
import { CAMERA_HEIGHT, CAMERA_WIDTH, placeWarning } from './spawnPlacement';

/** What the scene used to pass for every level, regardless of the spec. */
const OLD_HARDCODED = { width: 640, height: 960 };

describe('the level table describes five room sizes, not one', () => {
  it('level 1-1 is 640x400, not the hardcoded 640x960', () => {
    const spec = getLevel(1, 1)!;
    expect({ width: spec.roomWidth, height: spec.roomHeight }).toEqual({
      width: 640,
      height: 400,
    });
  });

  it('level 1-2 is 900x720', () => {
    const spec = getLevel(1, 2)!;
    expect({ width: spec.roomWidth, height: spec.roomHeight }).toEqual({
      width: 900,
      height: 720,
    });
  });

  it('the 405 levels span five distinct sizes', () => {
    const sizes = new Set<string>();
    for (let world = 1; world <= 9; world += 1) {
      for (let level = 1; level <= 45; level += 1) {
        const spec = getLevel(world, level)!;
        sizes.add(`${spec.roomWidth}x${spec.roomHeight}`);
      }
    }
    expect([...sizes].sort()).toEqual([
      '640x400',
      '640x640',
      '640x960',
      '800x600',
      '900x720',
    ]);
  });
});

describe('the off-camera spawn search, fed the way the scene feeds it', () => {
  // 1-2 is the first world-1 level that qualifies: 900x720 Normal, so neither
  // dimension matches the camera and the mode is not Defense.
  const qualifying = () => getLevel(1, 2)!;

  // A constant `random` makes all 25 attempts pick the same point, so it has to
  // be one that is genuinely off-camera. At 900x720 the visible band is
  // x in (130, 770) and y in (160, 560); 0.05 gives (45, 36), outside both.
  const place = (roomWidth: number, roomHeight: number, mode = qualifying().mode) =>
    placeWarning({ mode, roomWidth, roomHeight, random: () => 0.05 });

  it('can place off-camera when given the level\'s real room', () => {
    const spec = qualifying();
    expect(place(spec.roomWidth, spec.roomHeight).offCamera).toBe(true);
  });

  it('never places off-camera at the old hardcoded size', () => {
    // 640 === CAMERA_WIDTH, so canSearchOffCamera short-circuits. This is the
    // defect, pinned: with the old constants the search was unreachable on
    // every one of the 405 levels.
    expect(OLD_HARDCODED.width).toBe(CAMERA_WIDTH);
    expect(place(OLD_HARDCODED.width, OLD_HARDCODED.height).offCamera).toBe(false);
  });

  it('still declines when a real room does match the camera — the AS3 rule', () => {
    // 1-1 is 640x400, which is exactly the camera. Nothing is off-camera there,
    // and PartGameArea.as:7245 disqualifies it. Faithful, not a regression.
    const spec = getLevel(1, 1)!;
    expect(spec.roomWidth).toBe(CAMERA_WIDTH);
    expect(spec.roomHeight).toBe(CAMERA_HEIGHT);
    expect(place(spec.roomWidth, spec.roomHeight).offCamera).toBe(false);
  });

  it('declines in Defense mode whatever the room', () => {
    const spec = qualifying();
    expect(place(spec.roomWidth, spec.roomHeight, 'Defense').offCamera).toBe(false);
  });
});

/**
 * The seam. Source-shape rather than behaviour: `GameplayScene` needs a live
 * Phaser game to construct, so what is pinned is that it resolves the spec and
 * uses the result, rather than reaching for a constant.
 */
describe('GameplayScene reads the room from the spec', () => {
  const source = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

  it('resolves the level before it sizes the world', () => {
    // Ordering is the whole fix: startWave() used to resolve the spec, and it
    // runs after physics bounds, the ground tile and the tank are built.
    const resolve = source.indexOf('this.resolveLevelSpec()');
    const bounds = source.indexOf('this.physics.world.setBounds(');
    expect(resolve).toBeGreaterThan(-1);
    expect(bounds).toBeGreaterThan(-1);
    expect(resolve).toBeLessThan(bounds);
  });

  it('takes both dimensions from LevelSpec', () => {
    expect(source).toContain('spec?.roomWidth ?? FALLBACK_ROOM.width');
    expect(source).toContain('spec?.roomHeight ?? FALLBACK_ROOM.height');
  });

  it('has no room constant left in use beyond the fallback', () => {
    // The old names are gone entirely; the only literal pair is FALLBACK_ROOM,
    // which is reached only when no spec resolves.
    expect(source).not.toContain('const ROOM_WIDTH');
    expect(source).not.toContain('const ROOM_HEIGHT');
    expect(source.match(/FALLBACK_ROOM\.width/g) ?? []).toHaveLength(2);
  });

  it('feeds placement the resolved room, not a literal', () => {
    const start = source.indexOf('private updateWave(');
    const body = source.slice(start, source.indexOf('\n  private ', start + 1));
    expect(body).toContain('roomWidth: this.roomWidth');
    expect(body).toContain('roomHeight: this.roomHeight');
  });
});
