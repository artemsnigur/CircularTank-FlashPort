/**
 * Placeholder collectible, standing in for ItemMoney.as.
 *
 * Its only job in the skeleton is to give the React HUD something real to
 * react to: driving over one emits `currency:earned`, which the store bridge
 * turns into a counter update with no polling anywhere in the chain.
 */
import Phaser from 'phaser';

export class Pickup extends Phaser.Physics.Arcade.Sprite {
  readonly value: number;

  constructor(scene: Phaser.Scene, x: number, y: number, value: number) {
    super(scene, x, y, 'particle-dot');
    this.value = value;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setDisplaySize(18, 18).setTint(0xffd34d).setDepth(5);
    (this.body as Phaser.Physics.Arcade.Body).setCircle(this.width / 2);

    scene.tweens.add({
      targets: this,
      scale: { from: this.scale * 0.85, to: this.scale * 1.15 },
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }
}
