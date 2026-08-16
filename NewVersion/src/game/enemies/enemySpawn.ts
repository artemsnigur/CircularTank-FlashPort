/**
 * The spawn geometry from `PartGameArea.spawnEnemy` — the tail of that
 * function, after the stat block that `enemyStats.ts` already covers.
 *
 * Scope note: `spawnEnemy` is 658 lines, but only the last ~90 are geometry.
 * The rest is either stats (ported) or wiring to things outside this slice —
 * wave counters, the strength/weakness tables, and ~40 runtime status fields
 * (`onFire`, `frozen`, `gotBomb`, …) that only the behaviour loop reads.
 *
 * ── Flash angle conventions ───────────────────────────────────────────────
 * Rotation is in degrees, 0 points along +x, and y grows downward — the same
 * as Phaser, so the trigonometry ports directly.
 *
 * The AS3 uses the Flash idiom `atan2(dx, dy)` (x first) rather than the usual
 * `atan2(dy, dx)`, combined with an offset. `90 - atan2(dx, dy) * 180 / PI`
 * resolves to "face the target": a target directly to the right gives 0, one
 * directly below gives 90.
 */

import type { LevelMode } from '../levels/levelData';

/** Which room edge an enemy entered from. Matches the AS3 `instance.wall`. */
export type SpawnWall = 0 | 1 | 2 | 3 | 4;

export interface SpawnGeometry {
  /** Room dimensions in design units. */
  roomWidth: number;
  roomHeight: number;
  /** Where the spawn marker sits. */
  x: number;
  y: number;
  /** Edge the marker is on; 0 when it is not edge-aligned. */
  wall: SpawnWall;
  /** Sprite size, used to inset the enemy so it starts flush with the edge. */
  width: number;
  height: number;
}

interface SpawnTarget {
  x: number;
  y: number;
}

export interface SpawnResult {
  x: number;
  y: number;
  /** Degrees, Flash convention. */
  rotation: number;
  /** Non-zero only in Tower mode, which launches the enemy immediately. */
  xVel: number;
  yVel: number;
}

const toDegrees = (radians: number): number => (radians * 180) / Math.PI;
const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** `PartGameArea.angleBetween`-style facing, in the AS3's own idiom. */
export function faceTarget(fromX: number, fromY: number, target: SpawnTarget): number {
  return 90 - toDegrees(Math.atan2(target.x - fromX, target.y - fromY));
}

/**
 * Insets the spawn position so the enemy starts flush with its edge rather
 * than half off-screen. Walls are numbered 1=top, 2=left, 3=bottom, 4=right.
 */
export function applyWallInset(geometry: SpawnGeometry): { x: number; y: number } {
  const { x, y, wall, width, height } = geometry;
  switch (wall) {
    case 1:
      return { x, y: y - height / 2 };
    case 2:
      return { x: x - width / 2, y };
    case 3:
      return { x, y: y + height / 2 };
    case 4:
      return { x: x + width / 2, y };
    default:
      return { x, y };
  }
}

export interface SpawnOptions {
  mode: LevelMode;
  target: SpawnTarget;
  moveSpeedMax: number;
  /** `instance.enemy` — only Accelerating and Temperamental change the spread. */
  enemyType?: string;
  /** Injectable for deterministic tests. */
  random?: () => number;
}

/**
 * Resolves a spawn marker into a starting position, facing and velocity.
 *
 * Four cases, in the AS3's own order of precedence:
 *
 *   Tower    aim ahead of the tank by a distance-scaled lead, and launch at
 *            full speed immediately
 *   Defense  spawned along the top; fan out downward at a random angle, wider
 *            for faster enemies
 *   edges    entered from an edge in any other mode: head straight in
 *   else     not edge-aligned: face the tank
 */
export function resolveSpawn(
  geometry: SpawnGeometry,
  { mode, target, moveSpeedMax, enemyType, random = Math.random }: SpawnOptions,
): SpawnResult {
  const { x, y } = applyWallInset(geometry);
  const { roomWidth, roomHeight } = geometry;

  if (mode === 'Tower') {
    // Leads the target: the further away, the further ahead it aims. The
    // triple square root is the AS3's, not a simplification of something else.
    const dist = Math.hypot(target.x - x, target.y - y);
    const lead =
      (35 + moveSpeedMax * 4) * (1 - Math.sqrt(Math.sqrt(Math.sqrt(dist / (roomWidth + 100)))));
    const rotation =
      180 - toDegrees(Math.atan2(target.x - x, target.y - y)) - lead - moveSpeedMax - 5;

    return {
      x,
      y,
      rotation,
      xVel: Math.cos(toRadians(rotation)) * moveSpeedMax,
      yVel: Math.sin(toRadians(rotation)) * moveSpeedMax,
    };
  }

  if (y <= 0) {
    if (mode !== 'Defense') return { x, y, rotation: 90, xVel: 0, yVel: 0 };

    // Defense levels spawn along the top edge and fan downward. Accelerating
    // and Temperamental enemies get a wider spread because they end up faster.
    const speedMultiplier =
      enemyType === 'Accelerating'
        ? moveSpeedMax * 2.7
        : enemyType === 'Temperamental'
          ? moveSpeedMax * 2
          : moveSpeedMax;

    const side = random();
    const spread = random();
    let rotation: number;

    if (side > 0.5) {
      rotation = 105 + spread * 15 + speedMultiplier * 17;
      if (rotation > 165) rotation = 162.5 + spread * 5;
    } else {
      rotation = 75 - spread * 15 - speedMultiplier * 17;
      if (rotation < 15) rotation = 12.5 + spread * 5;
    }

    return { x, y, rotation, xVel: 0, yVel: 0 };
  }

  if (x === 0) return { x, y, rotation: 0, xVel: 0, yVel: 0 };
  if (y === roomHeight) return { x, y, rotation: -90, xVel: 0, yVel: 0 };
  if (x === roomWidth) return { x, y, rotation: 180, xVel: 0, yVel: 0 };

  return { x, y, rotation: faceTarget(x, y, target), xVel: 0, yVel: 0 };
}

/*
 * Deleted in T151: `randomEdgeSpawn`.
 *
 * Its docstring said the AS3's own spawn-marker placement was "part of the wave
 * logic and out of this slice", and that this was "a stand-in good enough to
 * exercise the spawn path". Both halves stopped being true when
 * `waves/spawnPlacement.ts` landed: `placeOnEdge` and `placeWarning` are the
 * real rule, they take the live camera, and `GameplayScene` calls them. The
 * stand-in kept its own uniform-random edge picker with no AS3 line behind it,
 * had no production caller, and was held up only by its two tests.
 *
 * Recorded here rather than removed silently, because a reader who finds the
 * stand-in referenced somewhere older should be sent to its replacement rather
 * than left wondering what was dropped.
 */
