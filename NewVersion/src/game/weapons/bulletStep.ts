/**
 * One frame of a bullet's flight — move, then bounce or leave.
 *
 * Split out of `Bullet.advance` for one reason: the camera rect it bounces
 * against is read **live, every frame** (`PartGameArea.as:1906`), and nothing
 * could prove that. `Bullet` is a `Phaser.GameObjects.Sprite`, so driving it in
 * a test needs a texture graph; the assertions that remained were source-text
 * checks that could not tell a live rect from one cached at spawn.
 *
 * With the step pure, a test can advance the same bullet across several frames
 * and **move the camera between them**, which is exactly the behaviour the
 * shape checks could only gesture at.
 *
 * `Bullet.advance` is now a thin delegation: it calls this, then writes the
 * result onto the sprite.
 */
import type { BulletState } from './bullets';
import { advanceBullet } from './bullets';
import { bounceAgainstCamera } from './bulletBounce';
import type { BounceEdge, CameraBounds } from './bulletBounce';

/** Matches `bullets.ts` — the AS3 ran at a fixed 30 fps. */
const AS3_FPS = 30;

export interface StepContext {
  roomWidth: number;
  roomHeight: number;
  /**
   * The live visible rect, or null where the caller has none.
   *
   * Only a round that still has bounces left reads it. Null falls through to
   * the ordinary cull, which is also what a spent round gets.
   */
  camera: CameraBounds | null;
  /** False once this round's bounces are used up — `:1812`. */
  canBounce: boolean;
}

export interface StepResult {
  state: BulletState;
  /** Which edge was struck this frame, or null. */
  bounced: BounceEdge | null;
}

/**
 * Advances one frame. Returns null once the bullet should be removed.
 *
 * A bouncing round never takes the room-bounds cull: `:1812` routes it to the
 * bounce branch instead, and only a spent one falls back. That is why
 * `canBounce` gates the whole branch rather than just the reflection.
 */
export function stepBullet(
  bullet: BulletState,
  context: StepContext,
  deltaMs: number,
): StepResult | null {
  if (context.canBounce && context.camera) {
    const frames = (deltaMs / 1000) * AS3_FPS;
    const moved: BulletState = {
      ...bullet,
      x: bullet.x + bullet.xVel * frames,
      y: bullet.y + bullet.yVel * frames,
    };

    const bounced = bounceAgainstCamera(
      { ...moved, rotation: bullet.rotation },
      context.camera,
    );

    if (!bounced) return { state: moved, bounced: null };

    return {
      state: { ...moved, ...bounced.state },
      bounced: bounced.edge,
    };
  }

  const next = advanceBullet(
    bullet,
    { roomWidth: context.roomWidth, roomHeight: context.roomHeight },
    deltaMs,
  );
  return next ? { state: next, bounced: null } : null;
}
