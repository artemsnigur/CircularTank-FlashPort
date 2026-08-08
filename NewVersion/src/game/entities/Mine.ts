/**
 * The visual for a placed mine.
 *
 * `ObjectMine` is SWF symbol1143, which is not among the extracted assets, so
 * this stands in with a small dark disc that pulses to read as "armed". The
 * pulse is cosmetic — the trigger radius in `weapons/secondaries.ts` is a flat
 * 12 units and does not change with it.
 *
 * Drawn on the ground layer in the AS3 (`groundLayer.addChild(mine)`), i.e.
 * beneath enemies and the tank, so this sits at a low depth deliberately.
 */
import Phaser from 'phaser';
import type { MineState } from '../weapons/secondaries';
import { PROJECTILE_ART } from '../../assets/projectileArt';

/** Below enemies (10) and the tank, above the ground tile (0). */
const MINE_DEPTH = 4;

export class Mine extends Phaser.GameObjects.Sprite {
  /**
   * Named `spec` rather than `state` because `GameObject.state` already exists
   * — the same collision `Enemy` hits with `state` and `body`.
   */
  readonly spec: MineState;
  private pulse: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, spec: MineState) {
    // `ObjectMine` — sprite 1143. It places two shapes across 30 frames (a
    // slow blink); this draws frame 1, and the alpha pulse below stands in for
    // the rest until animation lands in pass (c).
    const art = PROJECTILE_ART.ObjectMine;
    super(scene, spec.x, spec.y, art.key);
    this.spec = spec;

    this.setDisplaySize(art.width, art.height).setDepth(MINE_DEPTH);

    scene.add.existing(this);

    this.pulse = scene.tweens.add({
      targets: this,
      alpha: { from: 1, to: 0.45 },
      duration: 700,
      yoyo: true,
      repeat: -1,
    });
  }

  override destroy(fromScene?: boolean): void {
    // The tween holds a reference to this sprite; leaving it running after
    // detonation would tick a destroyed target every frame.
    this.pulse?.remove();
    this.pulse = null;
    super.destroy(fromScene);
  }
}
