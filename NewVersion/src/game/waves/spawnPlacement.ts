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

/**
 * The original Flash stage. **Reference only — never a default.**
 *
 * These used to be the fallback for `cameraWidth`/`cameraHeight`, and that was
 * the defect behind enemies materialising on screen. The AS3's camera really was
 * a fixed 640x400, so comparing against a constant was faithful *there*. This
 * port's camera is 640 x `logicalHeight`, where `logicalHeight` is
 * `renderHeight / zoom` clamped to [400, 1440] (`config/viewport.ts`) — 400 is
 * the floor, reached only on a very wide window. Feeding the predicate 400 while
 * rendering 900 made it protect a rectangle less than half the height of the
 * real view, so points it judged off-camera were plainly visible.
 *
 * The predicate was a faithful port. The operand was not. Keeping these as
 * defaults would let the same mistake back in silently, so `PlacementContext`
 * requires the live values and this pair is documentation.
 */
export const AS3_CAMERA_WIDTH = 640;
export const AS3_CAMERA_HEIGHT = 400;

/** Attempts before falling back to edge placement. AS3 uses 25. */
export const OFF_CAMERA_ATTEMPTS = 25;

export interface PlacementContext {
  mode: LevelMode;
  roomWidth: number;
  roomHeight: number;
  /**
   * The **live** viewport in design units, not the AS3's 640x400 stage.
   *
   * Required, deliberately: an optional value defaulting to the Flash constants
   * is exactly how this shipped placing enemies inside the view. A caller that
   * does not know the current viewport cannot place a spawn correctly, so it
   * should fail to compile rather than silently get 400.
   */
  cameraWidth: number;
  cameraHeight: number;
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
    cameraWidth,
    cameraHeight,
    isBoss = false,
    countDownDone = false,
  } = context;

  if (countDownDone) return false;
  if (mode === 'Defense') return false;
  // AS3 `roomWidth == cameraWidth || roomHeight == cameraHeight` (:7245), kept
  // as equality.
  //
  // This was briefly widened to `<=`, on the reasoning that a dimension the
  // camera fully covers has no off-camera space. That reasoning was made in the
  // AS3's world — a fixed 640x400 camera — and is wrong in this port's, where
  // the viewport is dynamic. It cost the feature entirely: at any logical height
  // >= 720 the search became disabled on all 405 levels, so on a phone
  // (logicalHeight ~1385) every enemy would enter from an edge.
  //
  // Equality is right because the two dimensions are independent. A 900-wide
  // room in a 640-wide camera has off-camera space to the left and right no
  // matter how tall the viewport is — 28.9% of candidates are still valid at
  // any height. And the "camera covers this dimension" case needs no guard: it
  // makes the margin negative, which widens that band past the room, so the
  // test falls through to the other axis on its own. The arithmetic already
  // does what the guard was trying to do.
  //
  // Consequence worth knowing: with a continuous cameraHeight, the height half
  // of this condition is now almost never true, so it is close to dead. Its
  // intent survives in the arithmetic above.
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
    cameraWidth,
    cameraHeight,
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
