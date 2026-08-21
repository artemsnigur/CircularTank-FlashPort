/**
 * A fired projectile.
 *
 * Straight-line flight only — see `weapons/bullets.ts` for what the base path
 * deliberately omits (homing, reflection, and the status effects).
 */
import Phaser from 'phaser';
import { getSoundManager } from '../audio/soundService';
import { motionAfterStep, stepBullet } from '../weapons/bulletStep';
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
import {
  createMagicState,
  isFinalTarget,
  isHoming,
  registerMagicHit,
  seekingRotation,
  turnsWhileSeeking,
} from '../weapons/magic';
import type { MagicState } from '../weapons/magic';
import type { BulletSpec } from '../weapons/firing';
import type { BulletState } from '../weapons/bullets';
import { damageTypeOf } from '../enemies/damageTypes';
import type { DamageType } from '../enemies/enemyStatsData';
import { PROJECTILE_ART, PROJECTILE_VARIANTS } from '../../assets/projectileArt';
import { ProjectileOverlay } from './ProjectileOverlay';
import type { ProjectileArt } from '../../assets/projectileArt';

export class Bullet extends Phaser.GameObjects.Sprite {
  /**
   * Channel this projectile damages on, or null when untyped.
   *
   * The Cannon's plain `Bullet` is untyped — it matches none of the branches
   * in the AS3's hit code and so bypasses resistances entirely.
   */
  readonly damageType: DamageType | null;

  /**
   * Which border sound this round makes — `bullet.borderSound` (`:3761`).
   *
   * Null for rounds the AS3 gives none: `:1844` tests for null before the
   * three-way branch, so silence is a real answer rather than a gap.
   */
  borderSound: 'Tiny' | 'Medium' | 'Big' | null = null;

  /** AS3 class name, kept so cake fragments can be told from the parent. */
  private readonly bulletClassName: string;

  /** Resolved art, or null when this class has no entry — see the constructor. */
  private readonly art: ProjectileArt | null;

  /** The moving second layer, for `BulletBomb`; null for every other round. */
  private overlay: ProjectileOverlay | null = null;

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
    // Real art, keyed by AS3 class — generated from the SWF. Falls back to the
    // old shared circle only for a class with no entry, which is a bug rather
    // than a state to design around: `projectileArt.test.ts` pins that every
    // class the scene can construct has one.
    //
    // Classes the AS3 pins with `gotoAndStop` carry a set of frames to choose
    // between rather than one texture. Neither of the two here animates:
    //
    //   BulletFire       `:3798` picks 1 of 3 at random, once, on spawn
    //   BulletGummyBear  `:3828` starts on frame 1; the frame then tracks the
    //                    bounce stage, which is also what scales its damage
    //
    // Everything else takes its single entry from `PROJECTILE_ART`.
    const variants = PROJECTILE_VARIANTS[bulletClass];
    const art = variants
      ? variants[bulletClass === 'BulletFire' ? Math.floor(Math.random() * variants.length) : 0]
      : (PROJECTILE_ART[bulletClass] ?? null);
    super(scene, spec.x, spec.y, art?.key ?? 'particle-dot');
    this.art = art;

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

    // Drawn at the original's own dimensions — the shape's authored size times
    // its placement matrix, both read out of `assets.swf`.
    //
    // This replaces `radius * 4` square plus a flat `0xffe9a8` tint. That pair
    // was reasonable while every round was the same circle and the audit
    // recorded the 4x as **unsourced polish**; with real art it is actively
    // wrong. Shape 215 is the proof: Cannon, MiniGun, Big Cannon and Shotgun
    // all place it, and the AS3 tells them apart *only* by a non-uniform
    // matrix — 8x4, 16x3, 12x6, 16x3. A uniform square renders three of the
    // four identically, so keeping `radius * 4` would have thrown away the
    // distinction this pass exists to restore.
    //
    // `setDisplaySize` is an absolute size, so the 4x oversampled raster needs
    // no compensating divide here. That divide belongs to `setScale`, which is
    // relative to the texture — see `UNIT_RASTER_SCALE` in the manifest.
    //
    // The collision radius is untouched and still `spec.radius`: visual size
    // and hit size were always separate quantities, in the original too.
    if (art) this.setDisplaySize(art.width, art.height);
    else this.setDisplaySize(spec.radius * 4, spec.radius * 4).setTint(0xffe9a8);
    this.setDepth(12);

    // Face the way it is travelling — `:3907` sets `rotation` at spawn from the
    // fire angle, and Flash draws the clip at that angle.
    //
    // This was missing for **every** bullet, not just the one it was reported
    // on. It was invisible until T85: while every round was the same circle,
    // rotation could not be seen. Real directional art made a latent gap
    // visible, which is worth separating from "T85 broke it".
    //
    // `setAngle` takes degrees, which is what `BulletState.rotation` already
    // holds — no conversion, and no second unit to keep straight.
    this.setAngle(spec.rotation);

    scene.add.existing(this);

    // `BulletBomb` draws a static body with a ping-pong above it, so it needs a
    // companion sprite. Every other round is a single layer and gets null.
    this.overlay = ProjectileOverlay.create(scene, bulletClass, spec.x, spec.y, 12);
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
  /** The AS3 class name, for rules the source keyed on class identity. */
  get as3Class(): string {
    return this.bulletClassName;
  }

  get isCakeParent(): boolean {
    return this.bulletClassName === 'BulletCake';
  }

  /**
   * This round's velocity, for rules the scene owns.
   *
   * Read-only and a fresh object: `motion` stays private, so nothing outside
   * can write a component and desynchronise the state from the sprite. Added
   * for the wall-impact burst (T239), which needs the step the cull discards.
   */
  get velocity(): { xVel: number; yVel: number } {
    return { xVel: this.motion.xVel, yVel: this.motion.yVel };
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

  /**
   * Points the sprite along its velocity — **display only** (T237).
   *
   * ── Why this writes no state, and why that is the point ────────────────
   * T235 did the same job by writing `motion.rotation` inside `steer`. A hard
   * tab freeze was reported on it; four driven runs and a baseline comparison
   * found no loop, no `NaN` and no stall (`A87`), but the evidence was
   * inconclusive and it was reverted.
   *
   * This reads velocity and writes **only the display object's angle**.
   * `motion` is untouched, so nothing here can feed back into a step, a
   * bounce, a target search or a collision — the round flies exactly as it did
   * before this method existed. If a freeze ever survives this, it is provably
   * not from here.
   *
   * The gate has one home: `turnsWhileSeeking` says two of the three homing
   * rounds turn, and the caller loops over every bullet rather than
   * re-deciding.
   *
   * Must run **after** `advance`, which sets the angle from `motion.rotation`
   * on every frame it runs. The two now disagree by design: the state keeps
   * the spawn rotation the AS3 gives a round, and the drawing shows the
   * heading.
   */
  faceHeading(): void {
    if (!turnsWhileSeeking(this.bulletClassName)) return;

    const angle = seekingRotation(this.motion.xVel, this.motion.yVel);
    if (angle !== null) this.setAngle(angle);
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
  /**
   * Switches to one of this class's selectable frames, resizing with it.
   *
   * The frames can differ in size — `BulletFire`'s three are 34x34, 38x34 and
   * 34x38 — so the texture and the display size have to move together or a
   * variant renders stretched.
   */
  private showVariant(index: number): void {
    const variants = PROJECTILE_VARIANTS[this.bulletClassName];
    const art = variants?.[index];
    if (!art) return;
    this.setTexture(art.key).setDisplaySize(art.width, art.height);
  }

  /**
   * Tears the companion layer down with the round.
   *
   * `Bullet` had no destroy override before this, because a single sprite needs
   * none. The overlay is a *second* scene object that nothing else owns, so
   * without this every bomb fired would leave one behind — the same leak
   * `Mine.destroy` already guards its blink tween against.
   */
  override destroy(fromScene?: boolean): void {
    this.overlay?.destroy();
    this.overlay = null;
    super.destroy(fromScene);
  }

  advanceFlameLife(deltaMs: number, crowd: number): boolean {
    if (!this.flame) return true;
    const next = advanceFlame(this.flame, deltaMs, crowd);
    if (!next) return false;
    this.flame = next;
    // Grown from the **authored** size, not with `setScale`.
    //
    // `next.scale` starts at 1 and is a multiplier on the symbol's own size
    // (`flames.ts:170`), so with a 1:1 texture `setScale` was equivalent. It is
    // not any more: `projectile-218` is rasterised at 4x, and `setScale` is
    // relative to the *texture*, so it would draw the flame four times too
    // large. This is the `UNIT_RASTER_SCALE` trap named in the manifest, and it
    // shipped once already in the particle draw.
    //
    // Multiplying the authored dimensions keeps it absolute and therefore
    // resolution-independent — change the raster scale and nothing here moves.
    if (this.art) this.setDisplaySize(this.art.width * next.scale, this.art.height * next.scale);
    else this.setScale(next.scale);
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
    // The whole step — move, then bounce or leave — lives in `stepBullet` so it
    // can be driven across frames with a moving camera. This method's job is to
    // hold the state and paint the sprite.
    const step = stepBullet(
      this.motion,
      {
        roomWidth: this.roomWidth,
        roomHeight: this.roomHeight,
        camera,
        canBounce: this.bounceState !== null && !this.bounceSpent(),
      },
      deltaMs,
    );
    if (!step) return false;

    let bounceDamage: number | undefined;
    if (step.bounced) {
      // Returns the new damage rather than writing it: this method is the only
      // writer of `this.motion`, which is what stops a later assignment
      // silently undoing the raise. See `motionAfterStep`.
      bounceDamage = this.applyBounceCost(step.bounced) ?? undefined;
      // `:2011` — one sound for every bounce, whatever bounced and off which
      // edge. Ungated by the on-screen rule, like the border sound: the AS3
      // pushes it straight.
      getSoundManager(this.scene)?.queue('BorderBounce');
    }

    // One write. Keeps the live (possibly grown) radius rather than the spawn
    // value, and the bounce's damage rather than the pre-bounce figure the step
    // was computed from.
    this.motion = motionAfterStep(step, { radius: this.radius, damage: bounceDamage });
    this.setPosition(this.motion.x, this.motion.y);
    this.overlay?.update(deltaMs, this.motion.x, this.motion.y);
    // `:2012` — the AS3 rewrites `rotation` from the heading immediately after
    // a bounce, and it does so *outside* the per-class branches, so it applies
    // to every bouncing round. `reflect` (`bulletBounce.ts:131`) has always
    // computed the new heading; nothing was drawing it.
    //
    // Applied every frame rather than only on the bounce event: the state is
    // the single source of the heading, so reading it unconditionally cannot
    // fall out of step with it. A homing round re-aims mid-flight (`:1750`),
    // which an on-bounce-only update would miss.
    this.setAngle(this.motion.rotation);
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
  /**
   * Charges one bounce, returning the round's new damage where it has one.
   *
   * **It does not write `this.motion`, deliberately.** It used to, and the
   * assignment three lines later in `advance` overwrote it — so a Gummy Bear's
   * damage grew on its own books and never reached the enemy. The caller folds
   * this return value into its single motion write instead.
   */
  private applyBounceCost(edge: BounceEdge): number | null {
    if (!this.bounceState) return null;

    if (this.bounceState.kind === 'gummy') {
      const state = bounceGummy(this.bounceState.state, edge);
      this.bounceState = { kind: 'gummy', state };
      // `:1953` advances the frame in the same breath as the damage, because
      // they are one thing: the bear visibly hardens as it gets stronger
      // (x1 -> x3 -> x4). Wiring the colour without the damage would be a lie,
      // and the damage without the colour is what shipped until now.
      this.showVariant(state.stage - 1);
      return state.damage;
    }

    this.bounceState = { kind: 'cheese', state: bounceCheese(this.bounceState.state, edge) };
    // `:1966` — the AS3 clears `enemiesArray` here, which is what lets a
    // penetrating cheese cross the same crowd twice.
    this.hitEnemies.clear();
    // Cheese keeps its damage; only its bounce budget and hit list change.
    return null;
  }
}
