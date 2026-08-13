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
import { TANK_BODY_FRAMES, TANK_SIZES, towerGeometry, towerShape } from './tankArt';

/**
 * Draws a turret at its authored size, pivoting on its registration point.
 *
 * **Both halves are the fix, and each was wrong on its own.** The turret was
 * drawn `setDisplaySize(21, 21)` — a square — with Phaser's default centred
 * origin. Only six of the twelve turret shapes are square and centred; the
 * other six were stretched to fit and pivoted off their real hinge. The Magic
 * Cannon is the worst of them at an authored 26.4 x 17: squeezed to 21 wide,
 * stretched to 21 tall, and swung about a point 4.7 units from its pivot.
 *
 * `Tank.as:63` adds the turret with no x/y, so the registration point *is* the
 * tank's centre — which is what `originX/originY` restore here.
 */
function applyTowerGeometry(sprite: Phaser.GameObjects.Sprite, weaponName: string): void {
  const art = towerGeometry(weaponName);
  sprite.setOrigin(art.originX, art.originY).setDisplaySize(art.width, art.height);
}
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

/**
 * Whether the tank may move in this level mode — `PartGameArea.as:2816`.
 *
 * Tower fixes the tank in place: `:2816` skips `moveTank` and calls `tankAttack`
 * on the very next line, so aiming and firing continue while driving does not.
 *
 * **Extracted so it can be driven (T119).** It lived inline at its one call
 * site as `this.levelSpec?.mode !== 'Tower'`, and `towerMode.test.ts` asserted
 * that expression by matching the scene's source — which broke in T115 on an
 * unrelated signature change. The rule is one predicate; a test can call it.
 *
 * It stays out of `drive` deliberately: the entity should not have to know what
 * a level mode is, and the scene already does.
 */
export function tankIsMobile(mode: string | undefined): boolean {
  return mode !== 'Tower';
}

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

  /** Flat-red copies drawn over each part — see `setDamageTint`. */
  private readonly hullFlash: Phaser.GameObjects.Sprite;
  private readonly towerFlash: Phaser.GameObjects.Sprite;

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
    // Placed at the tank's own position, not at the world origin. It is a
    // sibling rather than a child (see below), so nothing else puts it there
    // until `syncTurret` first runs — and a turret sitting at (0, 0) is a
    // turret in the room's top-left corner.
    this.tower = scene.add.sprite(x, y, `unit-${towerShape(weaponName)}`).setDepth(11);
    applyTowerGeometry(this.tower, weaponName);

    // Above their sources, and hidden until a hit.
    this.hullFlash = scene.add.sprite(0, 0, `unit-${TANK_BODY_FRAMES[0]}`).setVisible(false);
    this.hullFlash.setTintFill(0xff0000);
    this.towerFlash = scene.add
      .sprite(0, 0, `unit-${towerShape(weaponName)}`)
      .setVisible(false)
      .setDepth(12);
    this.towerFlash.setTintFill(0xff0000);

    this.add([this.hull, this.hullFlash]);
    this.setDepth(10);
    scene.add.existing(this);

    // The turret is a sibling, not a child, so the body's rotation does not
    // drag it around.
    scene.add.existing(this.tower);
    scene.add.existing(this.towerFlash);
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
  // `aim` used to be a parameter here, for the turret. That moved to
  // `syncTurret`, which runs outside the countdown gate — see its docstring.
  //
  // `movable` comes from `tankIsMobile(mode)` at the call site rather than from
  // a mode check in here — see that function for why the entity does not take
  // the mode itself.
  drive(input: PlayerInput, deltaMs: number, movable = true): void {
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

  }

  /**
   * Keeps the turret on the tank and pointed at the cursor.
   *
   * ── Why this is not part of `drive` ───────────────────────────────────────
   * In the AS3 the turret is a **child** of the tank clip (`Tank.as:19`, added
   * at `:63`), so it inherits the body's position for free, and it is aimed
   * from the tank's **own** `ENTER_FRAME` (`:53` registers it; `:70-76` is the
   * handler) — which is gated on `levelDone` and `gamePaused` and **not** on
   * the countdown. `moveTank` is the thing `PartGameArea.as:2808` holds back.
   *
   * This port makes the turret a scene sibling so the body's rotation cannot
   * drag it round, which means something has to position it. That was done
   * inside `drive`, and `drive` is inside the countdown gate — so for the whole
   * countdown the body sat at the spawn point and the turret sat at the world
   * origin. Split out so the scene can run it every frame, as `Tank.as` does.
   */
  syncTurret(aim?: { x: number; y: number }): void {
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
    applyTowerGeometry(this.tower, weaponName);
  }

  /**
   * Applies the red hit tint — `colorClip(tank, 0xFF0000, strength)` (`:2801`).
   *
   * ── `colorClip` blends; `setTint` multiplies ──────────────────────────────
   * The AS3 builds a `ColorTransform` with `ctMul = 1 - trans` and per-channel
   * offsets of `trans * channel`, i.e. `result = art * (1 - t) + red * t`. A
   * **blend toward red**, leaving the art visible underneath.
   *
   * Phaser's `setTint` multiplies instead, and multiplying green art by a
   * reddish tint darkens it rather than reddening it — the first attempt at
   * this produced a tank that turned dark green when hit, which reads as a
   * shadow rather than damage. Caught in a frame, not by a test.
   *
   * So the blend is done the way a renderer can express it: a flat-red copy of
   * each part drawn over the original at `strength` alpha. `setTintFill`
   * replaces the art's colour outright, so the overlay is a solid red
   * silhouette and the composite is the AS3's linear blend.
   */
  setDamageTint(strength: number): void {
    for (const [source, overlay] of [
      [this.hull, this.hullFlash],
      [this.tower, this.towerFlash],
    ] as const) {
      if (strength <= 0) {
        overlay.setVisible(false);
        continue;
      }
      overlay
        .setTexture(source.texture.key)
        .setPosition(source.x, source.y)
        .setRotation(source.rotation)
        // Origin as well as size: the turret is anchored at its registration
        // point, not its centre, so an overlay left at the default 0.5 sits
        // off to one side of the part it is meant to be reddening.
        .setOrigin(source.originX, source.originY)
        .setDisplaySize(source.displayWidth, source.displayHeight)
        .setAlpha(strength)
        .setVisible(true);
    }
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
