/**
 * A fired projectile.
 *
 * Straight-line flight only — see `weapons/bullets.ts` for what the base path
 * deliberately omits (homing, reflection, and the status effects).
 */
import Phaser from 'phaser';
import { advanceBullet } from '../weapons/bullets';
import { bounceAgainstCamera } from '../weapons/bulletBounce';
import type { BounceEdge, CameraBounds } from '../weapons/bulletBounce';
import {
  CHEESE_BOUNCES,
  bounceCheese,
  bounceGummy,
  cheeseIsSpent,
  gummyIsSpent,
} from '../weapons/foodRounds';
import type { CheeseBounceState, GummyBounceState } from '../weapons/foodRounds';
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
   * Border-bounce state, or null for the rounds that simply leave.
   *
   * Keyed off the AS3 class name because that is what `:1903` dispatches on,
   * and because these are the only two projectiles in the game that bounce.
   * The geometry is shared (`bulletBounce.ts`); what a bounce *costs* is not
   * (`foodRounds.ts`), which is why the state is a discriminated pair rather
   * than one counter.
   */
  private bounceState:
    | { kind: 'gummy'; state: GummyBounceState }
    | { kind: 'cheese'; state: CheeseBounceState }
    | null = null;

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

  /**
   * Locked at launch and never re-acquired — see `BulletSpec.seeking`.
   *
   * Deliberately not `isSeeking`, which already means something else on this
   * class: Magic's "has hit something and still has budget to chase more".
   * A locked round is the opposite — committed to one enemy and incapable of
   * choosing another.
   *
   * Shares `magicTarget` as the held enemy because the field is the same idea;
   * what differs is that nothing ever assigns a new one.
   */
  readonly isLocked: boolean;

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
    this.isLocked = spec.seeking === true;

    // `:1903` — the only two projectiles that bounce, dispatched on the same
    // class names the AS3 tests.
    if (bulletClass === 'BulletGummyBear') {
      this.bounceState = { kind: 'gummy', state: { stage: 1, damage: spec.damage } };
    } else if (bulletClass === 'BulletCrazyCheese') {
      this.bounceState = { kind: 'cheese', state: { bounces: CHEESE_BOUNCES, hits: new Set() } };
    }
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

  /** Frames of freeze this round leaves; 0 for everything but the Icicle. */
  get freezeTime(): number {
    return this.motion.freezeTime ?? 0;
  }

  get appliesFreeze(): boolean {
    return this.freezeTime > 0;
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

  /**
   * Advances flight. Returns false once the bullet has left the room.
   *
   * `camera` is the live visible rect, and only the two food rounds read it —
   * they bounce off the camera's edges rather than the room's walls (`:1906`).
   * Passing it every frame rather than caching at spawn is the point: the rect
   * moves with the player, and a bear fired on one side of a large room must
   * bounce off where the view is *now*.
   */
  advance(deltaMs: number, camera: CameraBounds | null = null): boolean {
    // `:1810` moves first, then `:1812` decides between culling and bouncing —
    // a spent round takes the cull branch, so the order matters.
    if (camera && this.bounceState && !this.bounceSpent()) {
      const frames = (deltaMs / 1000) * 30;
      const moved = {
        ...this.motion,
        x: this.motion.x + this.motion.xVel * frames,
        y: this.motion.y + this.motion.yVel * frames,
      };

      const bounced = bounceAgainstCamera(
        { ...moved, rotation: this.motion.rotation },
        camera,
      );

      if (bounced) {
        this.applyBounceCost(bounced.edge);
        this.motion = { ...moved, ...bounced.state, radius: this.radius };
        this.setPosition(this.motion.x, this.motion.y);
        return true;
      }

      this.motion = { ...moved, radius: this.radius };
      this.setPosition(moved.x, moved.y);
      return true;
    }

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

  /** Whether this round has used up its bounces — `:1812`. */
  private bounceSpent(): boolean {
    if (!this.bounceState) return true;
    return this.bounceState.kind === 'gummy'
      ? gummyIsSpent(this.bounceState.state)
      : cheeseIsSpent(this.bounceState.state);
  }

  /**
   * What the bounce costs this round — the half the two weapons do not share.
   *
   * A bear gets stronger, so the escalated damage is written back onto
   * `motion`; a cheese gets re-armed, so its hit list is emptied and the same
   * enemies become hittable again (`:1966`).
   */
  private applyBounceCost(edge: BounceEdge): void {
    if (!this.bounceState) return;

    if (this.bounceState.kind === 'gummy') {
      const state = bounceGummy(this.bounceState.state, edge);
      this.bounceState = { kind: 'gummy', state };
      this.motion = { ...this.motion, damage: state.damage };
      return;
    }

    this.bounceState = { kind: 'cheese', state: bounceCheese(this.bounceState.state, edge) };
    // `:1966` — the AS3 clears `enemiesArray` here, which is what lets a
    // penetrating cheese cross the same crowd twice.
    this.hitEnemies.clear();
  }
}
