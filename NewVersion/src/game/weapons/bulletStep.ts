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
  /** See `BulletBounds.contactInset`. Omitted keeps the collision radius. */
  contactInset?: number;
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
    {
      roomWidth: context.roomWidth,
      roomHeight: context.roomHeight,
      contactInset: context.contactInset,
    },
    deltaMs,
  );
  return next ? { state: next, bounced: null } : null;
}

/**
 * Folds a step's result and the frame's bounce cost into one motion.
 *
 * ── Why this exists, and it is a bug fix rather than tidying ──────────────
 * `Bullet.advance` used to write `this.motion` **twice** in one method: once
 * inside `applyBounceCost`, to raise a Gummy Bear's damage, and once
 * unconditionally afterwards from the step's own state. The second write won.
 *
 * That is subtle because the step state is not stale in general — it carries
 * the new position, velocity and heading, which is exactly why it is written
 * last. It simply predates the bounce cost, having been computed from the
 * motion as it was *before* the bounce was known. So the bear's `bounceState`
 * kept its raised damage and looked right to anything reading it, while
 * `motion.damage` — the value `Bullet.damage` returns to the collision — reset
 * to the spawn figure every single frame. Two bounces, ×4 damage on the books,
 * and the enemy took base damage.
 *
 * Collapsing it to one write makes the ordering unexpressible rather than
 * merely correct: there is nowhere left to put a second assignment that a later
 * line can overwrite. Pure, so the composition can be driven — the reason the
 * original defect survived is that the *rule* (`bounceGummy`) had tests and the
 * *wiring* had none, which `CLAUDE.md` names as this repo's signature failure.
 */
export function motionAfterStep(
  step: StepResult,
  overrides: {
    /** The live radius; a growing round must not revert to its spawn size. */
    radius: number;
    /** The bounce's new damage, when this frame's step bounced. */
    damage?: number;
  },
): BulletState {
  return {
    ...step.state,
    radius: overrides.radius,
    // Applied after the spread, so a bounce that happened *this* frame beats
    // the pre-bounce figure the step carried in.
    ...(overrides.damage !== undefined ? { damage: overrides.damage } : {}),
  };
}
