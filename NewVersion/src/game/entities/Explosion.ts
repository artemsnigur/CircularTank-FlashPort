/**
 * The visual for a blast.
 *
 * The AS3 uses an `Explosion` MovieClip animation scaled by `radius / 250`;
 * that art is a SWF symbol we have not extracted, so this stands in with an
 * expanding, fading disc at the correct radius. Damage is unaffected — that
 * lives in `weapons/explosions.ts` and fires on the spawn frame regardless of
 * how long the visual takes.
 */
import Phaser from 'phaser';
import type { ExplosionState } from '../weapons/explosions';

/** How long the stand-in visual plays for, in ms. */
const VISUAL_MS = 260;

export class Explosion extends Phaser.GameObjects.Sprite {
  constructor(scene: Phaser.Scene, state: ExplosionState) {
    super(scene, state.x, state.y, 'particle-dot');

    const diameter = state.radius * 2;
    const tint =
      state.type === 'Ice' ? 0x8fd3ff : state.type === 'Poison' ? 0x9ccc65 : 0xffb03a;

    this.setDisplaySize(diameter * 0.4, diameter * 0.4)
      .setTint(tint)
      .setAlpha(0.55)
      .setDepth(11);

    scene.add.existing(this);

    scene.tweens.add({
      targets: this,
      displayWidth: diameter,
      displayHeight: diameter,
      alpha: 0,
      duration: VISUAL_MS,
      ease: 'Quad.easeOut',
      onComplete: () => this.destroy(),
    });
  }
}
