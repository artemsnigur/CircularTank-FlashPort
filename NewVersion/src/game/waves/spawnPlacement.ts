/**
 * Where a spawn warning is placed — the placement half of
 * `PartGameArea.spawnWarnings()` (lines 7244-7326).
 *
 * Two strategies, in the AS3's own order:
 *
 *   1. **Off-camera placement.** When the room is bigger than the camera, try
 *      up to 25 random points and take the first that is *not* inside the
 *      centre band the camera can see — so enemies appear from off-screen
 *      rather than popping into view. Skipped during the opening countdown, in
 *      Defense mode, when the room is exactly camera-sized, and for bosses.
 *   2. **Edge placement.** The fallback, and the only option in the cases
 *      above. Picks a wall and a point along it. Defense always uses the top
 *      wall; Tower mode restricts each wall to a quarter-length window.
 *
 * The AS3 checks `wall == 4 || wall == 5`, but wall is `floor(random() * 4) + 1`
 * so 5 is unreachable. Left out rather than reproduced as dead code.
 */

import type { LevelMode } from '../levels/levelData';
import type { SpawnWall } from '../enemies/enemySpawn';

/** PartGameArea.as camera dimensions — the original Flash viewport. */
export const CAMERA_WIDTH = 640;
export const CAMERA_HEIGHT = 400;

/** Attempts before falling back to edge placement. AS3 uses 25. */
export const OFF_CAMERA_ATTEMPTS = 25;

export interface PlacementContext {
  mode: LevelMode;
  roomWidth: number;
  roomHeight: number;
  cameraWidth?: number;
  cameraHeight?: number;
  /** Bosses always use edge placement. */
  isBoss?: boolean;
  /** During the countdown, enemies come from the edges. */
  countDownDone?: boolean;
  random?: () => number;
}

export interface Placement {
  x: number;
  y: number;
  wall: SpawnWall;
  /** True when off-camera search succeeded; false when it fell back to an edge. */
  offCamera: boolean;
}

/**
 * Whether the off-camera search applies at all.
 *
 * Note the AS3 condition is inverted from how it reads: the search runs only
 * when *none* of the disqualifiers hold.
 */
function canSearchOffCamera(context: PlacementContext): boolean {
  const {
    mode,
    roomWidth,
    roomHeight,
    cameraWidth = CAMERA_WIDTH,
    cameraHeight = CAMERA_HEIGHT,
    isBoss = false,
    countDownDone = false,
  } = context;

  if (countDownDone) return false;
  if (mode === 'Defense') return false;
  if (roomWidth === cameraWidth || roomHeight === cameraHeight) return false;
  if (mode === 'Boss' && isBoss) return false;
  return true;
}

/**
 * True when a point lies in the band the camera can reach, i.e. would be
 * visible. The AS3 rejects a candidate only when it is inside *both* the x and
 * y bands.
 */
export function isPotentiallyVisible(
  x: number,
  y: number,
  context: Pick<PlacementContext, 'roomWidth' | 'roomHeight' | 'cameraWidth' | 'cameraHeight'>,
): boolean {
  const {
    roomWidth,
    roomHeight,
    cameraWidth = CAMERA_WIDTH,
    cameraHeight = CAMERA_HEIGHT,
  } = context;

  const marginX = (roomWidth - cameraWidth) / 2;
  const marginY = (roomHeight - cameraHeight) / 2;

  return (
    x > marginX && x < roomWidth - marginX && y > marginY && y < roomHeight - marginY
  );
}

/** Edge placement, with Tower mode's narrowed windows. */
export function placeOnEdge(context: PlacementContext): Placement {
  const { mode, roomWidth, roomHeight, random = Math.random } = context;

  const wall: 1 | 2 | 3 | 4 =
    mode === 'Defense' ? 1 : ((Math.floor(random() * 4) + 1) as 1 | 2 | 3 | 4);

  const isTower = mode === 'Tower';

  switch (wall) {
    case 1:
      return {
        x: isTower ? (random() * roomWidth) / 4 + roomWidth / 4 : random() * roomWidth,
        y: 0,
        wall,
        offCamera: false,
      };
    case 2:
      return {
        x: 0,
        y: isTower ? (random() * roomHeight) / 4 + roomHeight / 2 : random() * roomHeight,
        wall,
        offCamera: false,
      };
    case 3:
      return {
        x: isTower ? (random() * roomWidth) / 4 + roomWidth / 2 : random() * roomWidth,
        y: roomHeight,
        wall,
        offCamera: false,
      };
    default:
      return {
        x: roomWidth,
        y: isTower ? (random() * roomHeight) / 4 + roomHeight / 4 : random() * roomHeight,
        wall,
        offCamera: false,
      };
  }
}

/** Resolves a spawn position, preferring off-camera when the mode allows it. */
export function placeWarning(context: PlacementContext): Placement {
  const { roomWidth, roomHeight, random = Math.random } = context;

  if (canSearchOffCamera(context)) {
    for (let attempt = 0; attempt < OFF_CAMERA_ATTEMPTS; attempt += 1) {
      const x = random() * roomWidth;
      const y = random() * roomHeight;
      if (!isPotentiallyVisible(x, y, context)) {
        // Not on a wall: `wall` 0 means the spawn geometry applies no inset and
        // the enemy simply faces the tank.
        return { x, y, wall: 0, offCamera: true };
      }
    }
  }

  return placeOnEdge(context);
}
