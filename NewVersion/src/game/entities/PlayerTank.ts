/**
 * The player tank — now driven by the ported `Tank.as` movement rather than
 * arcade physics.
 *
 * The body and turret rotate independently, as in the original: the body turns
 * toward its direction of travel at a capped rate, while the turret tracks the
 * pointer immediately.
 *
 * Not ported: grappling-hook drag, knockback, the shield, and collision with
 * enemies — all driven by the enemy behaviour loop.
 */
import Phaser from 'phaser';
import { createTankState, moveTank, tankStatsFor } from '../player/tankMovement';
import type { DirectionalInput, TankState, TankStats } from '../player/tankMovement';
import type { UpgradeState } from '../upgrades/upgradeState';

/** Body diameter in design units — the extracted TankBody shape is ~58. */
const TANK_DIAMETER = 58;

export type PlayerInput = DirectionalInput;

export class PlayerTank extends Phaser.GameObjects.Container {
  /** Turret. Aims at the pointer independently of the body. */
  readonly tower: Phaser.GameObjects.Sprite;
  readonly radius = TANK_DIAMETER / 2;

  private motion: TankState;
  private stats: TankStats;
  private readonly roomWidth: number;
  private readonly roomHeight: number;
  private readonly hull: Phaser.GameObjects.Sprite;

  /** True on the frame the tank struck the bottom wall — AS3 `tempHitBottom`. */
  hitBottom = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    roomWidth: number,
    roomHeight: number,
    upgrades: UpgradeState,
  ) {
    super(scene, x, y);

    this.motion = createTankState(x, y);
    this.stats = tankStatsFor(upgrades);
    this.roomWidth = roomWidth;
    this.roomHeight = roomHeight;

    // `tank-body` is the extracted 3.svg TankBody shape.
    this.hull = scene.add.sprite(0, 0, 'tank-body').setDisplaySize(TANK_DIAMETER, TANK_DIAMETER);

    this.tower = scene.add
      .sprite(0, 0, 'particle-dot')
      .setDisplaySize(22, 22)
      .setTint(0x8fd3ff)
      .setDepth(11);

    this.add(this.hull);
    this.setDepth(10);
    scene.add.existing(this);

    // The turret is a sibling, not a child, so the body's rotation does not
    // drag it around.
    scene.add.existing(this.tower);
  }

  /** Re-reads speed stats, e.g. after the Speed upgrade is bought. */
  refreshStats(upgrades: UpgradeState): void {
    this.stats = tankStatsFor(upgrades);
  }

  /**
   * @param input digital 8-way input
   * @param aim   world point the turret should face, or null
   */
  /**
   * Advances the tank: movement, then aim.
   *
   * ── Why these are separable ───────────────────────────────────────────
   * `PartGameArea.as:2816` skips `moveTank()` in Tower mode and calls
   * `tankAttack()` on the very next line, so the tank is immobile but still
   * turns its turret and fires. Everything that moves it — input, integration,
   * contact push, the GrapplingHook reel-in — lives inside `moveTank`, so
   * skipping that one call is the whole mechanic.
   *
   * `movable: false` reproduces that. It is deliberately a parameter rather
   * than a mode check inside this class: the entity should not have to know
   * what a level mode is, and the scene already does.
   */
  drive(
    input: PlayerInput,
    aim: Phaser.Math.Vector2 | null,
    deltaMs: number,
    movable = true,
  ): void {
    if (movable) {
      const result = moveTank(
        this.motion,
        input,
        this.stats,
        { roomWidth: this.roomWidth, roomHeight: this.roomHeight, radius: this.radius },
        deltaMs,
      );

      this.motion = result;
      this.hitBottom = result.hitBottom;
    }

    this.setPosition(this.motion.x, this.motion.y);
    // The AS3 art points up at rotation 0, so add a quarter turn.
    this.hull.setRotation(Phaser.Math.DegToRad(this.motion.rotation + 90));

    this.tower.setPosition(this.motion.x, this.motion.y);
    if (aim) this.tower.setRotation(Phaser.Math.Angle.Between(this.x, this.y, aim.x, aim.y));
  }

  /** Turret facing in degrees — what the firing code needs. */
  get towerRotationDegrees(): number {
    return Phaser.Math.RadToDeg(this.tower.rotation);
  }

  get speed(): number {
    return this.motion.speed;
  }

  /**
   * Live velocity in design units per frame at 30 fps.
   *
   * Only the Flamethrower reads these — its flames inherit the tank's motion
   * (`PartGameArea.as:3947`), so driving forwards throws the jet further.
   */
  get xVelPerFrame(): number {
    return this.motion.xVel;
  }

  get yVelPerFrame(): number {
    return this.motion.yVel;
  }

  get maxSpeed(): number {
    return this.stats.maxSpeed;
  }

  /**
   * Hides the tank, turret included.
   *
   * The turret is added to the scene separately (`scene.add.existing(this.tower)`)
   * rather than as a child of this container, so the inherited `setVisible`
   * would leave it floating in mid-air on its own.
   */
  override setVisible(value: boolean): this {
    this.tower.setVisible(value);
    return super.setVisible(value);
  }

  override destroy(fromScene?: boolean): void {
    this.tower.destroy(fromScene);
    super.destroy(fromScene);
  }
}
