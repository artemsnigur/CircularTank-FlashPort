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
import {
  clampTankToRoom,
  createTankState,
  moveTank,
  tankStatsFor,
  tetherPull,
  tetheredTankStats,
} from '../player/tankMovement';
import type { DirectionalInput, TankState, TankStats } from '../player/tankMovement';
import type { UpgradeState } from '../upgrades/upgradeState';
import { TANK_BODY_FRAMES, TANK_SIZES, towerShape } from './tankArt';
import { TANK_RADIUS } from '../player/tankDamage';

/** Body diameter in design units — the extracted TankBody shape is ~58. */
/**
 * `TankBody`'s authored width — `TANK_SIZES.body`, and `Tank.radius * 2`.
 *
 * This was 58 until T34, which is exactly twice the authored 29. The two
 * numbers reconcile only one way: 29 was read as a *radius* and doubled to
 * make a diameter, when 29 is already the diameter. That put the drawn tank
 * and its hitbox at 2.07x the original's 14-unit radius for the whole project.
 * See `docs/AUDIT-2026-07.md` E1.
 */
const TANK_DIAMETER = TANK_SIZES.body;

export type PlayerInput = DirectionalInput;

export class PlayerTank extends Phaser.GameObjects.Container {
  /** Turret. Aims at the pointer independently of the body. */
  readonly tower: Phaser.GameObjects.Sprite;
  /**
   * `Tank.as:23`. Imported rather than recomputed from `TANK_DIAMETER`: the
   * constant was already ported, tested and correct in `tankDamage.ts`, and
   * reached by nothing — the game used a locally derived 29 instead. Pointing
   * the entity at the ported constant is what closes that split.
   */
  readonly radius = TANK_RADIUS;

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
    /**
     * The equipped primary, which selects the turret's art —
     * `ScreenGame.setVisibleTankWeapon`. Defaulted to the Cannon so a caller
     * that has not chosen yet gets frame 1, which is what the AS3 shows before
     * `setVisibleTankWeapon` first runs.
     */
    weaponName = 'Cannon',
  ) {
    super(scene, x, y);

    this.motion = createTankState(x, y);
    this.stats = tankStatsFor(upgrades);
    this.roomWidth = roomWidth;
    this.roomHeight = roomHeight;

    // `Tank.as:54` — body first. Frame 1; frame 2 is Tower mode.
    this.hull = scene.add
      .sprite(0, 0, `unit-${TANK_BODY_FRAMES[0]}`)
      .setDisplaySize(TANK_DIAMETER, TANK_DIAMETER);

    // `:63` — the turret is added after the body, so it draws on top. It used
    // to be a tinted circle with no facing at all, which is why the turret
    // appeared to have no direction; it has real art and a bearing now, and
    // the art it shows depends on the equipped primary.
    this.tower = scene.add
      .sprite(0, 0, `unit-${towerShape(weaponName)}`)
      .setDisplaySize(TANK_SIZES.tower, TANK_SIZES.tower)
      .setDepth(11);

    this.add(this.hull);
    this.setDepth(10);
    scene.add.existing(this);

    // The turret is a sibling, not a child, so the body's rotation does not
    // drag it around.
    scene.add.existing(this.tower);
  }

  /** Re-reads speed stats, e.g. after the Speed upgrade is bought. */
  /**
   * The boss grappler currently reeling this tank in, or null.
   *
   * `tank.grappingEnemy` in the AS3, and boss-only: a non-boss GrapplingHook
   * sets `isGrapping` on itself and charges without touching the tank.
   */
  tetheredTo: { x: number; y: number } | null = null;

  /**
   * Shoves the tank clear of a boss it is overlapping, kept inside the room.
   *
   * `PartGameArea.as:5319` writes the position with no clamp, which can put the
   * player outside the room against a wall-pinned boss. See `clampTankToRoom`.
   */
  shoveTo(x: number, y: number): void {
    const clamped = clampTankToRoom(x, y, {
      roomWidth: this.roomWidth,
      roomHeight: this.roomHeight,
      radius: this.radius,
    });
    this.motion = { ...this.motion, x: clamped.x, y: clamped.y };
    this.setPosition(clamped.x, clamped.y);
  }

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
      // A boss grappler overwrites the player's handling outright and drags
      // them toward it — Tank.as:84-93. Applied before the step so the pull is
      // part of this frame's motion rather than the next one's.
      const tethered = this.tetheredTo !== null;
      if (tethered) {
        const pulled = tetherPull(
          this.motion,
          this.motion.x,
          this.motion.y,
          this.tetheredTo!,
          (deltaMs / 1000) * 30,
        );
        this.motion = { ...this.motion, xVel: pulled.xVel, yVel: pulled.yVel };
      }

      const result = moveTank(
        this.motion,
        input,
        tethered ? tetheredTankStats() : this.stats,
        { roomWidth: this.roomWidth, roomHeight: this.roomHeight, radius: this.radius },
        deltaMs,
      );

      this.motion = result;
      this.hitBottom = result.hitBottom;
    }

    this.setPosition(this.motion.x, this.motion.y);
    // The AS3 art points up at rotation 0, so add a quarter turn.
    // `motion.rotation` already carries the AS3's hull convention (0 at north,
    // via `rotateTank`); the art is authored pointing up, so the quarter turn
    // converts that to Phaser's 0-at-east. Both halves are needed — dropping
    // either leaves the hull 90 degrees out, which on a round body reads as
    // "slightly off" rather than as broken.
    this.hull.setRotation(Phaser.Math.DegToRad(this.motion.rotation + 90));

    this.tower.setPosition(this.motion.x, this.motion.y);
    if (aim) this.tower.setRotation(Phaser.Math.Angle.Between(this.x, this.y, aim.x, aim.y));
  }

  /**
   * Swaps the turret to the equipped primary's art —
   * `ScreenGame.setVisibleTankWeapon` (`:521`).
   *
   * The AS3 calls this on every weapon switch, not only at level start, so an
   * unrecognised name falls back to frame 1 rather than leaving the previous
   * weapon's turret on screen.
   */
  setWeaponArt(weaponName: string): void {
    this.tower.setTexture(`unit-${towerShape(weaponName)}`);
    this.tower.setDisplaySize(TANK_SIZES.tower, TANK_SIZES.tower);
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
