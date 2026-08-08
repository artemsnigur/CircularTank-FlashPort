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
import { ProjectileOverlay } from './ProjectileOverlay';

/** Below enemies (10) and the tank, above the ground tile (0). */
const MINE_DEPTH = 4;

export class Mine extends Phaser.GameObjects.Sprite {
  /**
   * Named `spec` rather than `state` because `GameObject.state` already exists
   * — the same collision `Enemy` hits with `state` and `body`.
   */
  readonly spec: MineState;
  private overlay: ProjectileOverlay | null = null;

  constructor(scene: Phaser.Scene, spec: MineState) {
    // `ObjectMine` — sprite 1143, a body (702) with a second shape (1142)
    // appearing over it for the back half of a 30-frame blink.
    const art = PROJECTILE_ART.ObjectMine;
    super(scene, spec.x, spec.y, art.key);
    this.spec = spec;

    this.setDisplaySize(art.width, art.height).setDepth(MINE_DEPTH);

    scene.add.existing(this);

    // Replaces a 700ms alpha yoyo that stood in for this until the real frames
    // landed. The stand-in faded the *whole* mine; the original never does that
    // — it adds a second shape on top and takes it away again.
    this.overlay = ProjectileOverlay.create(scene, 'ObjectMine', spec.x, spec.y, MINE_DEPTH + 1);
  }

  /**
   * A mine does not move, so only the loop needs advancing.
   *
   * `override` because Phaser's `Sprite` already declares `update` — the scene
   * does not call it automatically for a plain sprite, so the mine list drives
   * it explicitly.
   */
  override update(deltaMs: number): void {
    this.overlay?.update(deltaMs, this.spec.x, this.spec.y);
  }

  override destroy(fromScene?: boolean): void {
    // The overlay is a second scene object nothing else owns; leaving it behind
    // would strand a blinking sprite where the mine detonated.
    this.overlay?.destroy();
    this.overlay = null;
    super.destroy(fromScene);
  }
}
