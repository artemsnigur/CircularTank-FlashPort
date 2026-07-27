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
import { getLevel, LEVELS } from '../levels/levelData';

describe('the level table describes five room sizes, not one', () => {
  // These read `LEVELS` rather than `getLevel`, which is the distinction the
  // describe already claims: this is about what the *table* holds. `getLevel`
  // applies the deliberate world-1 divergences in `levelSizeOverrides.ts`, so
  // asserting the table through it would conflate "the extraction is right"
  // with "we chose to play something else". Fidelity is checked here; the
  // played sizes are checked in levels/roomSizeSource.test.ts.
  it('level 1-1 is 640x400 in the table, not the hardcoded 640x960', () => {
    const spec = LEVELS[0][0];
    expect({ width: spec.roomWidth, height: spec.roomHeight }).toEqual({
      width: 640,
      height: 400,
    });
  });

  it('level 1-2 is 900x720 in the table', () => {
    const spec = LEVELS[0][1];
    expect({ width: spec.roomWidth, height: spec.roomHeight }).toEqual({
      width: 900,
      height: 720,
    });
  });

  it('world 1 Normal and Flag levels are standardised when played', () => {
    // The other side of the same coin, so this file cannot be read as saying
    // 1-1 plays at 640x400 — it does not, by decision.
    expect(getLevel(1, 1)).toMatchObject({ roomWidth: 800, roomHeight: 600 });
    expect(getLevel(1, 2)).toMatchObject({ roomWidth: 800, roomHeight: 600 });
    // A Tower level in the same world is untouched.
    expect(getLevel(1, 7)).toMatchObject({
      roomWidth: LEVELS[0][6].roomWidth,
      roomHeight: LEVELS[0][6].roomHeight,
    });
  });

  it('the 405 levels span five distinct sizes', () => {
    const sizes = new Set<string>();
    for (let world = 1; world <= 9; world += 1) {
      for (let level = 1; level <= 45; level += 1) {
        const spec = LEVELS[world - 1][level - 1];
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

/**
 * The off-camera search used to be asserted here, as `.offCamera === true`.
 *
 * That was measuring the wrong quantity. `offCamera` reports that the search
 * *found* a point, not that the point is out of view — so it stayed green while
 * the search placed enemies inside the visible area, which is how the defect
 * reached the screen. It is deleted rather than weakened.
 *
 * The property itself — a returned point is outside the visible core for the
 * viewport actually being rendered — is asserted in `offCameraSpawn.test.ts`,
 * across several room and camera sizes.
 */

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
