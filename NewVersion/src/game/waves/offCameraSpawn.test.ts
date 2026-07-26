/**
 * An off-camera spawn must actually be off camera.
 *
 * ── Why this file replaces an assertion that was green and wrong ──────────
 * `roomSize.test.ts` asserted `placeWarning(...).offCamera === true` and called
 * that "off-camera placement works". It does not: `offCamera` is the search
 * reporting that it *found* a point, not that the point is outside the view. The
 * two came apart the moment the search first ran for real, and the test could
 * not see it because it was measuring the wrong quantity. That assertion is
 * deleted, not weakened.
 *
 * ── What the AS3 actually compares (PartGameArea.as:7251-7257) ────────────
 *
 *     camRoomDifX = roomWidth - cameraWidth;
 *     camRoomDifY = roomHeight - cameraHeight;
 *     xPos = randX * roomWidth;  yPos = randY * roomHeight;
 *     if(!(xPos > camRoomDifX / 2 && xPos < roomWidth - camRoomDifX / 2
 *       && yPos > camRoomDifY / 2 && yPos < roomHeight - camRoomDifY / 2))
 *
 * The rectangle is `cameraWidth x cameraHeight` **centred in the room**, since
 * `roomWidth - 2 * (camRoomDifX / 2)` is exactly `cameraWidth`. The camera's
 * scroll position is never read — so this is the *intersection of every camera
 * position*, the region on screen no matter where the camera has scrolled to.
 *
 * Two consequences worth stating, because both are faithful and neither is
 * obvious:
 *  - A point that passes is only guaranteed to be outside that always-visible
 *    core. With the camera at one extreme it may still be on screen. The
 *    original does this too.
 *  - Candidates are `random() * roomWidth`, so the search never returns a point
 *    outside the room. Only the *edge fallback* reaches the boundary, and only
 *    `spawnEnemy`'s per-wall inset pushes an enemy beyond it.
 *
 * ── The defect this pins ──────────────────────────────────────────────────
 * The predicate was a faithful port. Its *operand* was not: the port fed it the
 * AS3's fixed 640x400 Flash stage while its own camera is 640 x `logicalHeight`,
 * and `logicalHeight` is `renderHeight / zoom` clamped to [400, 1440]. 400 is
 * the minimum, reached only on a very wide window. So the core it tested against
 * was far smaller than the real viewport, and points just outside it were
 * comfortably inside the view — enemies materialising on screen.
 */
import { describe, expect, it } from 'vitest';
import { AS3_CAMERA_HEIGHT, AS3_CAMERA_WIDTH, placeWarning } from './spawnPlacement';
import type { LevelMode } from '../levels/levelData';

/** The always-visible core, straight from the AS3 expression. */
function insideCore(
  x: number,
  y: number,
  roomWidth: number,
  roomHeight: number,
  cameraWidth: number,
  cameraHeight: number,
): boolean {
  const marginX = (roomWidth - cameraWidth) / 2;
  const marginY = (roomHeight - cameraHeight) / 2;
  return x > marginX && x < roomWidth - marginX && y > marginY && y < roomHeight - marginY;
}

/** Deterministic sequence, so a failure is reproducible. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Room sizes that actually occur, paired with viewport heights the game
 * actually renders. 400 is the clamp floor; 720/900/1000 are ordinary windows
 * and phones.
 */
const CASES: { room: [number, number]; camera: [number, number]; mode: LevelMode }[] = [
  { room: [900, 720], camera: [640, 400], mode: 'Normal' },
  { room: [900, 720], camera: [640, 720], mode: 'Normal' },
  { room: [900, 720], camera: [640, 900], mode: 'Normal' },
  { room: [800, 600], camera: [640, 400], mode: 'Normal' },
  { room: [800, 600], camera: [640, 640], mode: 'Flag' },
  { room: [900, 720], camera: [640, 1000], mode: 'Boss' },
];

describe('a placement reported as off-camera is outside the visible core', () => {
  it.each(
    CASES.map((c) => [
      `${c.mode} room ${c.room[0]}x${c.room[1]} in a ${c.camera[0]}x${c.camera[1]} viewport`,
      c,
    ] as const),
  )('%s', (_title, { room, camera, mode }) => {
      const [roomWidth, roomHeight] = room;
      const [cameraWidth, cameraHeight] = camera;
      const random = lcg(20260727);

      let offCamera = 0;
      for (let i = 0; i < 400; i += 1) {
        const p = placeWarning({
          mode,
          roomWidth,
          roomHeight,
          cameraWidth,
          cameraHeight,
          random,
        });
        if (!p.offCamera) continue;
        offCamera += 1;

        // The property that matters, and the one the old test never checked.
        expect(
          insideCore(p.x, p.y, roomWidth, roomHeight, cameraWidth, cameraHeight),
          `(${p.x.toFixed(1)}, ${p.y.toFixed(1)}) is inside the visible core`,
        ).toBe(false);

        // And still inside the room — the search never leaves the map.
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(roomWidth);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(roomHeight);
        expect(p.wall).toBe(0);
      }

      // A vacuous pass would be the same failure in a new costume: if the
      // search never succeeds there is nothing to check above.
      if (cameraHeight < roomHeight) {
        expect(offCamera, 'the search never succeeded, so nothing was asserted').toBeGreaterThan(0);
      }
  });
});

describe('the defect, stated as a measurement', () => {
  it('judging against 640x400 while rendering 640x900 puts spawns on screen', () => {
    // Exactly what the scene did: place using the AS3's fixed stage...
    const random = lcg(4242);
    let visible = 0;
    let offCamera = 0;

    for (let i = 0; i < 400; i += 1) {
      const p = placeWarning({
        mode: 'Normal',
        roomWidth: 900,
        roomHeight: 720,
        cameraWidth: AS3_CAMERA_WIDTH,
        cameraHeight: AS3_CAMERA_HEIGHT,
        random,
      });
      if (!p.offCamera) continue;
      offCamera += 1;
      // ...then judge it against the viewport actually being rendered.
      if (insideCore(p.x, p.y, 900, 720, 640, 900)) visible += 1;
    }

    // Not a marginal effect. The 400-tall core is 320 units shorter than the
    // real one, so a large share of "off-camera" points are plainly in view.
    expect(offCamera).toBeGreaterThan(0);
    expect(visible).toBeGreaterThan(0);
    expect(visible / offCamera).toBeGreaterThan(0.2);
  });
});

describe('when the viewport covers the room there is nowhere to hide', () => {
  it('falls back to an edge rather than claiming an off-camera spot', () => {
    // A tall window on a short room: the camera shows the whole height, so no
    // point in the room is ever outside the view. Every placement must be an
    // edge, or the search is lying.
    const random = lcg(7);
    for (let i = 0; i < 200; i += 1) {
      const p = placeWarning({
        mode: 'Normal',
        roomWidth: 640,
        roomHeight: 400,
        cameraWidth: 640,
        cameraHeight: 900,
        random,
      });
      expect(p.offCamera).toBe(false);
      expect(p.wall).toBeGreaterThan(0);
    }
  });
});
