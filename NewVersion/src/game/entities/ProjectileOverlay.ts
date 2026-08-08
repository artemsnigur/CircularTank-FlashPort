/**
 * The second layer of a two-shape projectile clip.
 *
 * ── Why a second sprite at all ────────────────────────────────────────────
 * Five of the seven multi-shape clips draw one shape at a time, so swapping the
 * texture on the existing sprite covers them. Two do not:
 *
 *   `BulletBomb`   depth 1 holds a static body (shape 226) and depth 3 a
 *                  16-frame ping-pong over it, 227 -> 235 -> 228.
 *   `ObjectMine`   depth 1 holds the body (702) for all 30 frames, and a second
 *                  shape (1142) appears on top for the last 15 — the blink.
 *
 * Both are *composites*: the body and the moving part are on screen together, so
 * one sprite cannot express them. Hence a companion sprite that follows the
 * owner and cycles its own texture.
 *
 * ── Neither is tied to game state ─────────────────────────────────────────
 * Both loop from spawn at the SWF's 30fps and never consult anything.
 *
 * `BulletBomb`'s ping-pong is **not** a fuse countdown, which is the reading it
 * invites. The countdown is a separate `WarningTimedBomb` indicator scaled and
 * faded by `bombTimer / bombTimerMax` (`PartGameArea.as:2531`, `:2542`), and it
 * is already wired. Driving these frames from the fuse would invent a mechanic.
 *
 * `ObjectMine`'s blink is a plain idle loop: the AS3 contains **no frame control
 * for a mine anywhere** — no `gotoAndStop`, and nothing touches the instance
 * beyond position, radius, damage and explosion radius — so there is no armed or
 * triggered state for it to follow.
 */
import type Phaser from 'phaser';
import { PROJECTILE_OVERLAYS } from '../../assets/projectileArt';
import type { ProjectileArt } from '../../assets/projectileArt';

/** The SWF runs at 30fps, so one timeline frame is this long. */
const FRAME_MS = 1000 / 30;

export class ProjectileOverlay {
  private readonly frames: readonly (ProjectileArt | null)[];
  private readonly sprite: Phaser.GameObjects.Image;
  private elapsed = 0;
  /** Avoids a `setTexture` on every tick when the frame has not changed. */
  private shown = -1;

  private constructor(
    scene: Phaser.Scene,
    frames: readonly (ProjectileArt | null)[],
    x: number,
    y: number,
    depth: number,
  ) {
    this.frames = frames;
    // Seeded with the first non-null frame so the sprite has a valid texture
    // before the first tick; visibility is then driven by `apply`.
    const first = frames.find((f) => f !== null)!;
    this.sprite = scene.add.image(x, y, first.key).setDepth(depth);
    this.apply(0);
  }

  /**
   * An overlay for this class, or null when it has none.
   *
   * Returning null rather than a no-op object keeps the cost at zero for the 24
   * projectile classes that are a single layer — this runs per bullet, and most
   * bullets are not bombs.
   */
  static create(
    scene: Phaser.Scene,
    className: string,
    x: number,
    y: number,
    depth: number,
  ): ProjectileOverlay | null {
    const frames = PROJECTILE_OVERLAYS[className];
    if (!frames || frames.length === 0) return null;
    return new ProjectileOverlay(scene, frames, x, y, depth);
  }

  private apply(index: number): void {
    if (index === this.shown) return;
    this.shown = index;

    const frame = this.frames[index];
    // A `null` frame is the clip showing its body alone — the dark half of the
    // mine's blink. Hiding rather than clearing the texture keeps the sprite
    // reusable on the next cycle.
    if (!frame) {
      this.sprite.setVisible(false);
      return;
    }
    this.sprite.setVisible(true).setTexture(frame.key).setDisplaySize(frame.width, frame.height);
  }

  /**
   * Advances the loop and follows the owner.
   *
   * Position is pushed in rather than read from the owner so this needs no
   * reference back to it — a bullet is destroyed and recreated constantly, and
   * a held reference is the leak `GameCanvas` already documents.
   */
  update(deltaMs: number, x: number, y: number): void {
    this.elapsed += deltaMs;
    // Modulo on the accumulated time rather than an incrementing counter, so a
    // long frame skips ahead instead of slowing the animation down.
    this.apply(Math.floor(this.elapsed / FRAME_MS) % this.frames.length);
    this.sprite.setPosition(x, y);
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
