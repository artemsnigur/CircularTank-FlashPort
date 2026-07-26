/**
 * A fired projectile.
 *
 * Straight-line flight only — see `weapons/bullets.ts` for what the base path
 * deliberately omits (homing, reflection, and the status effects).
 */
import Phaser from 'phaser';
import { advanceBullet } from '../weapons/bullets';
import { advanceFlame, createFlame } from '../weapons/flames';
import type { FlameState } from '../weapons/flames';
import { createMagicState, isFinalTarget, isHoming, registerMagicHit } from '../weapons/magic';
import type { MagicState } from '../weapons/magic';
import type { BulletSpec } from '../weapons/firing';
import type { BulletState } from '../weapons/bullets';
import { damageTypeOf } from '../enemies/damageTypes';
import type { DamageType } from '../enemies/enemyStatsData';

export class Bullet extends Phaser.GameObjects.Sprite {
  /**
   * Channel this projectile damages on, or null when untyped.
   *
   * The Cannon's plain `Bullet` is untyped — it matches none of the branches
   * in the AS3's hit code and so bypasses resistances entirely.
   */
  readonly damageType: DamageType | null;

  /** AS3 class name, kept so cake fragments can be told from the parent. */
  private readonly bulletClassName: string;

  private motion: BulletState;
  private readonly roomWidth: number;
  private readonly roomHeight: number;

  /**
   * `bullet.enemiesArray` — everything this round has already damaged.
   *
   * Only penetrating rounds outlive a hit, so only they can consult it. Holds
   * references, not ids; a destroyed enemy simply stops being offered as a
   * target, and the bullet is short-lived, so there is nothing to prune.
   */
  private readonly hitEnemies = new Set<object>();

  /**
   * Flame lifetime/growth state, or null for an ordinary projectile.
   *
   * A flame dies on its own timer rather than at the room border, and its hit
   * radius grows as it ages — see weapons/flames.ts.
   */
  private flame: FlameState | null = null;

  /** Chaining budget for a homing round, or null for everything else. */
  private magic: MagicState | null = null;

  /**
   * The enemy this round is currently seeking.
   *
   * Typed as `object` for the same reason `hitEnemies` is: importing `Enemy`
   * here would close a cycle, and nothing in this file needs its shape.
   */
  magicTarget: object | null = null;

  constructor(
    scene: Phaser.Scene,
    spec: BulletSpec,
    roomWidth: number,
    roomHeight: number,
    bulletClass = 'Bullet',
    flame: { lifetimeMax: number; rangeMultiplier: number } | null = null,
  ) {
    super(scene, spec.x, spec.y, 'particle-dot');

    this.motion = { ...spec };
    this.damageType = damageTypeOf(bulletClass);
    this.bulletClassName = bulletClass;
    if (flame && flame.lifetimeMax > 0) {
      this.flame = createFlame(flame.lifetimeMax, flame.rangeMultiplier);
    }
    if ((spec.targets ?? 0) > 0) this.magic = createMagicState(spec.targets);
    this.roomWidth = roomWidth;
    this.roomHeight = roomHeight;

    // Cannon rounds are radius 2; render a little larger so they read at speed.
    this.setDisplaySize(spec.radius * 4, spec.radius * 4)
      .setTint(0xffe9a8)
      .setDepth(12);

    scene.add.existing(this);
  }

  // `x`/`y` are deliberately not overridden: they are accessors on Phaser's
  // Transform mixin, and `setPosition` below keeps them in step with `state`.

  get radius(): number {
    // A flame's hit radius grows with age, so it wins over the spawn value.
    return this.flame ? this.flame.radius : this.motion.radius;
  }

  get isFlame(): boolean {
    return this.flame !== null;
  }

  get damage(): number {
    return this.motion.damage;
  }

  /** True when impact should spawn a blast instead of dealing direct damage. */
  get explodes(): boolean {
    return this.motion.explosion;
  }

  get explosionRadius(): number {
    return this.motion.explosionRadius;
  }

  /** The plain state `findHit` wants, without the Sprite's own properties. */
  get hitState(): BulletState {
    return this.motion;
  }

  /** True when this round survives impact and carries on. */
  get penetrates(): boolean {
    return this.motion.penetrates ?? false;
  }

  /** Fuse length in frames when this round attaches a bomb; 0 otherwise. */
  get bombTimer(): number {
    return this.motion.bombTimer ?? 0;
  }

  get attachesBomb(): boolean {
    return this.bombTimer > 0;
  }

  /** Poison this round leaves, before the enemy's own scaling. */
  get poisonTime(): number {
    return this.motion.poisonTime ?? 0;
  }

  get poisonDamage(): number {
    return this.motion.poisonDamage ?? 0;
  }

  get appliesPoison(): boolean {
    return this.poisonTime > 0;
  }

  /** Fragments this round bursts into; 0 for everything but the Cake Cannon. */
  get cakePieces(): number {
    return this.motion.cakePieces ?? 0;
  }

  get burstsIntoCake(): boolean {
    return this.cakePieces > 0;
  }

  /**
   * True for the `BulletCake` round, false for a `BulletCakePiece`.
   *
   * Only the parent halves its damage when it splits (`:6140`); fragments pass
   * theirs along unchanged, so the cascade does not decay past the first split.
   */
  get isCakeParent(): boolean {
    return this.bulletClassName === 'BulletCake';
  }

  /** Flight speed in design units per frame, for re-aiming a homing round. */
  get speedPerFrame(): number {
    return Math.hypot(this.motion.xVel, this.motion.yVel);
  }

  get isMagic(): boolean {
    return this.magic !== null;
  }

  /** True once it has hit something and still has budget — i.e. seeking. */
  get isSeeking(): boolean {
    return this.magic !== null && isHoming(this.magic);
  }

  /** True when the next hit consumes the round. */
  get onFinalTarget(): boolean {
    return this.magic !== null && isFinalTarget(this.magic);
  }

  /** Applies a chain hit: spends one target and drops the current one. */
  registerMagicHit(): void {
    if (this.magic) this.magic = registerMagicHit(this.magic);
    this.magicTarget = null;
  }

  /** Points the round at a new heading, for homing. */
  steer(xVel: number, yVel: number): void {
    this.motion = { ...this.motion, xVel, yVel };
  }

  hasHit(enemy: object): boolean {
    return this.hitEnemies.has(enemy);
  }

  recordHit(enemy: object): void {
    this.hitEnemies.add(enemy);
  }

  /**
   * Advances the flame timer. Returns false once it has burnt out.
   *
   * Separate from `advance` because it needs the neighbour count, which only
   * the scene can supply.
   */
  advanceFlameLife(deltaMs: number, crowd: number): boolean {
    if (!this.flame) return true;
    const next = advanceFlame(this.flame, deltaMs, crowd);
    if (!next) return false;
    this.flame = next;
    this.setScale(next.scale);
    return true;
  }

  /** Advances flight. Returns false once the bullet has left the room. */
  advance(deltaMs: number): boolean {
    const next = advanceBullet(
      this.motion,
      { roomWidth: this.roomWidth, roomHeight: this.roomHeight },
      deltaMs,
    );
    if (!next) return false;

    // Keep the live (possibly grown) radius rather than the spawn value.
    this.motion = { ...next, radius: this.radius };
    this.setPosition(next.x, next.y);
    return true;
  }
}
