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
    super(scene, spec.x, spec.y, 'particle-dot');
    this.spec = spec;

    this.setDisplaySize(spec.radius * 2, spec.radius * 2)
      .setTint(0x3a3f47)
      .setDepth(MINE_DEPTH);

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
