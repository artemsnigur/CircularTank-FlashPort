/**
 * A spawned enemy — the first entity driven by real extracted data.
 *
 * Stats come from `resolveEnemyStats` (the `ScreenGame.enemy*Stats` tables
 * scaled by difficulty and tier), the starting position and facing from
 * `resolveSpawn`, and movement from `steerToward`.
 *
 * ── What this is not ──────────────────────────────────────────────────────
 * Only the spawn path and base steering are ported. `PartGameArea`'s enemy
 * behaviour loop — damage, freezing, poison, burning, teleporting, healing,
 * bullet collision, death, money drops, strengths and weaknesses — is 2,545
 * lines and is not ported. An enemy here moves toward the tank and nothing
 * else; `health`, `damage` and `money` are carried but unused.
 */
import Phaser from 'phaser';
import { resolveEnemyStats } from '../enemies/enemyStats';
import type { ResolvedEnemyStats } from '../enemies/enemyStats';
import { resolveSpawn } from '../enemies/enemySpawn';
import type { SpawnGeometry } from '../enemies/enemySpawn';
import {
  angleToTarget,
  atWall,
  bounceOffWalls,
  clampToRoom,
  crossesDefenseLine,
  steerToward,
  turnTowardsGoal,
  towerAccSpeed,
  towerAngleToTarget,
  towerRotSpeedMax,
} from '../enemies/enemySteering';
import type { SteeringState } from '../enemies/enemySteering';
import { decayPush } from '../enemies/enemySeparation';
import type { SeparationBody, SeparationEffect } from '../enemies/enemySeparation';
import { resolveDamageMultipliers } from '../enemies/damageTypes';
import { ENEMY_CLIPS, enemyClipKey, enemyShape, restingTint } from './enemyArt';
import { shrinkScale, shrinksWithHealth } from '../enemies/enemyBodies';
import {
  blinksOnTimer,
  createVisibilityState,
  hidesWhenHurt,
  isTargetable,
  tickGhostBlink,
  tickScaredGhost,
} from '../enemies/enemyVisibility';
import type { VisibilityState } from '../enemies/enemyVisibility';
import {
  createHealState,
  healDistanceFor,
  healsOthers,
  tickHeal,
} from '../enemies/enemyHealing';
import type { HealState } from '../enemies/enemyHealing';
import {
  canTeleport,
  createTeleportState,
  isTeleporting,
  teleportAlpha,
  teleportDestination,
  teleportsPeriodically,
  tickTeleport,
} from '../enemies/enemyTeleport';
import type { TeleportState } from '../enemies/enemyTeleport';
import {
  createGrappleState,
  grapplesTank,
  reelVelocity,
  releaseHeading,
} from '../enemies/enemyGrapple';
import type { GrappleState } from '../enemies/enemyGrapple';
import {
  acceleratesWhileUndamaged,
  acceleratingFactor,
  acceleratingSpeeds,
  createAcceleratingState,
  createRageState,
  rageSpeeds,
  decayPerFrame,
  decayedSpeeds,
  decaysOverTime,
  isImmuneToDamage,
  ragesWhenDamaged,
  tickAccelerating,
  tickRage,
} from '../enemies/enemyStatMods';
import { ENEMY_TIER_MULTIPLIERS, getDifficultyProfile } from '../config/difficultyMultipliers';
import { aimPoint } from '../enemies/enemyAim';
import type { AimTank } from '../enemies/enemyAim';
import type { AcceleratingState, RageState, RampedSpeeds } from '../enemies/enemyStatMods';
import type { DamageMultipliers, ImpactFeedback } from '../enemies/damageTypes';
import { applyFreeze, createStatusState, tickStatuses } from '../enemies/statusEffects';
import { createShooter } from '../enemies/enemyFiring';
import type { ShooterState } from '../enemies/enemyFiring';
import type { StatusState, StatusTickResult } from '../enemies/statusEffects';
import type { Difficulty, EnemyLevel } from '../config/constants';
import type { LevelMode } from '../levels/levelData';

/** SWF frame rate; the Tower ramp is specified per frame at this rate. */
const AS3_FPS = 30;

/**
 * How visible an "invisible" enemy still is.
 *
 * The AS3 swaps to a ghost frame rather than hiding the sprite, so the player
 * can still track it. Zero would make it indistinguishable from a despawn.
 */
const INVISIBLE_ALPHA = 0.18;

/** Body diameter in design units, by tier. The AS3 scales the boss art up. */
/**
 * Fallback sizes, used only when a type has no clip in `ENEMY_CLIPS`.
 *
 * These were the *only* sizes until T34: one diameter for every normal enemy
 * and one for every boss. The AS3 has no such flattening — `:3318` takes each
 * type's own sprite width — so the port's contact range was wrong by up to
 * 2.9x per type. They survive as a fallback because `Enemy` must still
 * construct for a type whose art has not been mapped; `enemyArt.test.ts`
 * asserts all twenty resolve, so nothing reaches them today.
 */
const FALLBACK_DIAMETER = 26;
const FALLBACK_BOSS_DIAMETER = 46;

/** How long the damage flash holds before reverting, in ms. */
const FLASH_MS = 80;

/**
 * Wall-handling options, hoisted so the per-frame path allocates nothing.
 *
 * `bounceOffWalls` and `atWall` read `skipBottom` and never mutate the object,
 * so one frozen instance per case is safe to share across every enemy.
 *
 * **This is a cleanup, not a performance fix.** The literal it replaced was
 * profiled in T113 and never appeared: ~98% of samples sat outside JS, GC was
 * 0.1%, and the heap was flat across 120s of loaded play. Hoisted because it
 * costs nothing to hoist — not because it was costing anything.
 */
const WALL_OPTIONS_ALL = Object.freeze({ skipBottom: false });
/** Defense only — `PartGameArea.as:5449` makes the bottom edge the objective. */
const WALL_OPTIONS_SKIP_BOTTOM = Object.freeze({ skipBottom: true });

/** Particle key -> tint, so the extracted `particle` column drives colour. */
const PARTICLE_TINTS: Record<string, number> = {
  EnemyGreen: 0x7ed957,
  EnemyGreen2: 0x4caf50,
  EnemyGreen3: 0x2e7d32,
  EnemyRed: 0xef5350,
  EnemyRedGrey: 0xa04a4a,
  EnemyYellow: 0xffe066,
  EnemyYellow2: 0xffd11a,
  EnemyBlue: 0x5b8def,
  EnemyLightBlue: 0x8fd3ff,
  EnemyCyan: 0x4dd0e1,
  EnemyPurple: 0xb07cd6,
  EnemyPink: 0xf48fb1,
  EnemyOrange: 0xffa726,
  EnemyOrangeBrown: 0xc77b3a,
  EnemyGrey: 0x9e9e9e,
  EnemyBlack: 0x4a4a4a,
  EnemyWhite: 0xf5f5f5,
  EnemyWhite2: 0xe0e0e0,
  EnemyWhiteRed: 0xffbdbd,
};

export interface EnemySpawnConfig {
  type: string;
  level: EnemyLevel;
  difficulty: Difficulty;
  mode: LevelMode;
  roomWidth: number;
  roomHeight: number;
  /** Spawn marker position and edge. */
  x: number;
  y: number;
  wall: SpawnGeometry['wall'];
  bossAmount?: number;
}

export class Enemy extends Phaser.GameObjects.Container {
  readonly enemyType: string;
  readonly enemyLevel: EnemyLevel;
  readonly stats: ResolvedEnemyStats;
  /**
   * Collision radius in design units.
   *
   * **Mutable**, because `Shrinking` rescales it as it takes damage
   * (`PartGameArea.as:6772`). Everything that reads it — contact damage, blast
   * radii, flag capture, the wall clamp, spawn insets — must read it fresh
   * rather than caching a copy at spawn.
   */
  radius: number;

  /**
   * Separation velocity — `theEnemy.pushVelX`/`pushVelY` (`:5203-5209`).
   *
   * **Only the boss-on-boss branch of the pair loop ever writes these, and that
   * loop is not wired yet** (pass (c)). They are therefore permanently zero
   * today: `decayPush` runs on them each frame and returns zero, `applyPush`
   * sees zero and returns its input untouched, and every wall test passes
   * unedited. That is the point — the plumbing lands with no behaviour change,
   * so the pass that does change behaviour changes only the producer.
   *
   * Public because pass (c)'s pair loop lives in `GameplayScene` and assigns
   * them from outside, exactly as the AS3 does across `:5203-5209`.
   */
  pushVelX = 0;
  pushVelY = 0;

  /**
   * Broad-phase padding for separation — `:3354`/`:3358`.
   *
   * `40 + random() * 60` for an ordinary enemy, `160 + random() * 10` for a
   * boss, rolled **once at spawn** as the AS3 does.
   *
   * ── `Math.random`, and deliberately not `PM_PRNG` ─────────────────────────
   * The AS3 uses `Math.random()` here, which in Flash is a different generator
   * from the seeded `PM_PRNG` driving background-prop layout. Routing this
   * through `PM_PRNG` would draw from that stream — and a Lehmer generator has
   * no resynchronisation, so one extra draw shifts every later prop on the
   * level. `core/PM_PRNG.ts` says so at length; this is the site where it would
   * have been easy to get wrong.
   */
  readonly safetyDistance: number;

  /** The radius this enemy spawned at. `Shrinking` scales relative to it. */
  readonly radiusStart: number;
  /** Per-channel resistances from this type's strengths/weaknesses tables. */
  readonly damageMultipliers: DamageMultipliers;

  /**
   * The debris this enemy throws — `enemyStatsArray[6]` via `:3280`.
   *
   * Exposed as well as tinted because the two uses are different: `baseTint`
   * colours the body sprite, while the impact burst spawns particles *of this
   * type*, which resolve to their own art in `particleArt.ts`. Reading the tint
   * back would have lost the type.
   */
  readonly particle: string;

  /**
   * `:3373`, `:4519` — frames until this enemy will show another Strength or
   * Weakness cue. Counts down once per frame; only the minigun's rounds
   * consult it. See `effects/impactCue.ts`.
   */
  strongWeakTimer = 0;

  /**
   * `:3366`, `:6375` — frames until this enemy puffs another poison particle.
   *
   * Separate from the poison *damage* timer in `statusEffects.ts`: this one
   * fires every 3 frames regardless of how often the damage ticks, so the two
   * cannot share a counter without one of them changing rate.
   */
  poisonParticleTimer = 0;

  /**
   * Frames until this enemy throws its next flame — T233, invented.
   *
   * Its own counter for the same reason `poisonParticleTimer` is: fire damage
   * lands every frame an enemy overlaps a flame or stands in lava, and the
   * flames must not. See `effects/burnParticles.ts`.
   */
  burnParticleTimer = 0;

  /** Carried from the stat tables; unused until the behaviour loop is ported. */
  health: number;

  /** Poison, attached bombs and freeze. See enemies/statusEffects.ts. */
  readonly status: StatusState = createStatusState();

  /**
   * Reload clock, or null for an enemy that does not shoot.
   *
   * Seeded with a randomised initial value so a wave spawned from one timer
   * does not fire in unison — see `initialReloadTime`.
   */
  shooter: ShooterState | null = null;

  /**
   * Set on the frame this enemy crosses the Defense line, for the scene to act
   * on. A flag rather than a return value, matching `PlayerTank.hitBottom`.
   */
  breachedLine = false;

  /** True on the frame this Medic's aura fired. Read and cleared by the scene. */
  pulsedHeal = false;

  /**
   * Health changed since this enemy was last updated — **any** change.
   *
   * `Accelerating` resets its speed ramp on this, because `PartGameArea.as:6695`
   * compares `hp != beforeHP` rather than hooking the damage sites. That means
   * healing resets it too, which is why this records a *change* and not a
   * *drop*. Nothing heals yet; `Medic` will, through the same setter.
   */
  private healthChanged = false;

  /**
   * Health went **down** since the last update.
   *
   * `Temperamental` rages on this — the AS3 sets `turnAngry` at the four damage
   * sites (`:5581`, `:5683`, `:6206`, `:6449`), so a heal must not trigger it.
   */
  private healthDropped = false;

  private steering: SteeringState;
  private readonly roomWidth: number;
  private readonly roomHeight: number;
  private readonly mode: LevelMode;
  /** Decides how far the enemy leads the tank — see `enemies/enemyAim.ts`. */
  private readonly difficulty: Difficulty;
  /**
   * Tower's acceleration ramp — per-enemy mutable state, not a stat.
   *
   * `PartGameArea.as:5030` grows this every frame for the whole level, and
   * `towerRotSpeedMax` derives the turn rate from it, so it is what makes a
   * Tower orbit tighten. It is deliberately *not* stored on `stats`, which is
   * shared and immutable.
   *
   * Reset through `resetTowerRamp`, which the constructor calls. **If this
   * entity is ever pooled, the reuse path must call it too** — a reused enemy
   * would otherwise enter at the previous one's accumulated speed, and there
   * is a test pinning that.
   */
  private towerAcc = 0;
  /** `Accelerating`'s wind-up. Null for every other type. */
  private accelerating: AcceleratingState | null = null;
  /** `Temperamental`'s rage. Null for every other type. */
  private rage: RageState | null = null;
  /** `DamageAddict`'s health loss per frame. Null for every other type. */
  private decayRate: number | null = null;
  /** Blink/flinch state. Present only on Ghost and ScaredGhost. */
  private visibility: VisibilityState | null = null;
  /** Medic's aura clock. Null for every other type. */
  private healing: HealState | null = null;
  /** Teleport clock. Null for every other type. */
  private teleport: TeleportState | null = null;
  /** Hook accounting and tether flag. Null for every other type. */
  grapple: GrappleState | null = null;
  /** Aura radius, valid only when `healing` is set. */
  readonly healDistance: number = 0;

  /**
   * Mid-teleport, so untargetable — `Teleporting`, unported.
   *
   * Declared here rather than with Teleporting because every AS3 site that
   * checks `invisible` checks this in the same condition. Wiring the guards
   * against `isTargetable` now means Teleporting inherits all eight of them by
   * setting this flag and nothing else.
   */
  teleporting = false;
  /** Named `shell`, not `body`: Container.body is the physics body. */
  private readonly shell: Phaser.GameObjects.Sprite;

  /**
   * The enemy's resting tint, captured once.
   *
   * Must not be re-read from the sprite when a flash ends: with a fast weapon
   * the next hit lands mid-flash, and reading live would capture the flash
   * colour as the "original" and strand the enemy red.
   */
  private readonly baseTint: number;

  /**
   * Whether the sprite is the untextured `particle-dot` fallback.
   *
   * Only the fallback carries a tint at rest; a type with real art shows its
   * own colours. `restingTint` is the rule, and this is its input.
   */
  private readonly usesFallbackArt: boolean;
  private flashTimer: Phaser.Time.TimerEvent | null = null;

  /**
   * Returns null when the type has no stat table, rather than throwing —
   * a bad level row should not take the scene down.
   */
  static spawn(scene: Phaser.Scene, config: EnemySpawnConfig): Enemy | null {
    const stats = resolveEnemyStats(config.type, config.level, config.difficulty, {
      bossAmount: config.bossAmount ?? 1,
    });
    if (!stats) {
      console.warn(`[Enemy] No stats for "${config.type}"; not spawning.`);
      return null;
    }
    return new Enemy(scene, config, stats);
  }

  private constructor(
    scene: Phaser.Scene,
    config: EnemySpawnConfig,
    stats: ResolvedEnemyStats,
  ) {
    const isBoss = config.level === 'B';
    // `PartGameArea.as:3318` — `enemy.radius = enemy.width / 2`. The authored
    // sprite width is the hitbox, per type, and the fallback is only reached
    // for a type with no clip.
    const diameter =
      ENEMY_CLIPS[enemyClipKey(config.type, isBoss)]?.size ??
      (isBoss ? FALLBACK_BOSS_DIAMETER : FALLBACK_DIAMETER);

    const spawn = resolveSpawn(
      {
        roomWidth: config.roomWidth,
        roomHeight: config.roomHeight,
        x: config.x,
        y: config.y,
        wall: config.wall,
        width: diameter,
        height: diameter,
      },
      {
        mode: config.mode,
        target: { x: config.roomWidth / 2, y: config.roomHeight / 2 },
        moveSpeedMax: stats.moveSpeedMax,
        enemyType: config.type,
      },
    );

    super(scene, spawn.x, spawn.y);

    this.enemyType = config.type;
    this.enemyLevel = config.level;
    this.stats = stats;
    this.health = stats.health;
    // Bosses inherit their base type's table; the AS3 looks it up by the type
    // name with the level suffix already stripped.
    this.damageMultipliers = resolveDamageMultipliers(config.type);

    // Only the shooting types get a clock; everything else stays null and the
    // scene skips them entirely.
    if (stats.shoot && stats.reloadTimeMax) {
      this.shooter = createShooter(stats.reloadTimeMax, Math.random);
    }

    this.radius = diameter / 2;
    // `:3352-3359` — rolled once, per enemy, from the unseeded generator.
    this.safetyDistance =
      config.level === 'B' ? 160 + Math.random() * 10 : 40 + Math.random() * 60;
    this.radiusStart = this.radius;
    this.roomWidth = config.roomWidth;
    this.roomHeight = config.roomHeight;
    this.mode = config.mode;
    this.difficulty = config.difficulty;
    this.resetTowerRamp();
    this.accelerating = acceleratesWhileUndamaged(config.type)
      ? createAcceleratingState(config.level === 'B')
      : null;
    this.rage = ragesWhenDamaged(config.type) ? createRageState() : null;
    this.visibility =
      blinksOnTimer(config.type) || hidesWhenHurt(config.type) ? createVisibilityState() : null;
    this.grapple = grapplesTank(config.type) ? createGrappleState() : null;
    this.teleport = teleportsPeriodically(config.type)
      ? createTeleportState(config.level === 'B', Math.random)
      : null;
    if (healsOthers(config.type)) {
      this.healing = createHealState();
      this.healDistance = healDistanceFor(config.level === 'B');
    }
    this.decayRate = decaysOverTime(config.type)
      ? decayPerFrame(
          getDifficultyProfile(config.difficulty).enemyHealth,
          ENEMY_TIER_MULTIPLIERS[config.level],
          config.level === 'B',
        )
      : null;

    this.steering = {
      x: spawn.x,
      y: spawn.y,
      rotation: spawn.rotation,
      xVel: spawn.xVel,
      yVel: spawn.yVel,
    };

    this.particle = stats.particle;
    this.baseTint = PARTICLE_TINTS[stats.particle] ?? 0xffffff;

    // Real art, drawn at its authored size. `setDisplaySize` rather than a
    // scale, because the texture is rasterised at `UNIT_RASTER_SCALE` and the
    // authored width is the number that has to end up on screen — it is also
    // the diameter the radius above came from, so the two cannot drift.
    const shape = enemyShape(config.type, isBoss, 1);
    this.shell = scene.add
      .sprite(0, 0, shape !== undefined ? `unit-${shape}` : 'particle-dot')
      .setDisplaySize(diameter, diameter);

    // The placeholder tinted a plain circle by the enemy's particle colour and
    // added a nose so it had a facing. Both are gone: the art carries its own
    // colour and its own front — so a real enemy is **untinted**, and only the
    // fallback dot is coloured.
    //
    // `baseTint` is kept for that fallback and for the impact burst's particle
    // colour. It is deliberately *not* what a damage flash resets to — see
    // `restingTint`, and the T114 bug where it was.
    this.usesFallbackArt = shape === undefined;
    if (this.usesFallbackArt) this.shell.setTint(this.baseTint);

    this.add([this.shell]);
    this.setDepth(8);
    this.setRotation(Phaser.Math.DegToRad(spawn.rotation));

    scene.add.existing(this);
  }

  /**
   * Advances status timers, returning any damage or blast they produced.
   *
   * Kept separate from `update` so the scene can act on the result — poison
   * can kill, and a bomb going off has to reach the explosion path.
   */
  tickStatus(deltaMs: number): StatusTickResult {
    return tickStatuses(this.status, { x: this.x, y: this.y, radius: this.radius }, deltaMs);
  }

  /**
   * Returns the Tower acceleration ramp to its starting value.
   *
   * Called by the constructor. **A pooling reuse path must call it as well** —
   * the ramp is the one piece of per-enemy state that survives a level and
   * would otherwise carry into the next enemy, which is exactly the failure
   * `resets the ramp on reuse, not just on construction` pins.
   *
   * Freezing does something *different* — see `freeze` below, which zeroes the
   * ramp outright rather than restoring the stat.
   */
  resetTowerRamp(): void {
    this.towerAcc = this.stats.accSpeed;
  }

  /**
   * Freezes this enemy, and in Tower mode destroys its acceleration build-up.
   *
   * ── One rule the AS3 writes three times ───────────────────────────────
   * `theEnemy.accSpeed = 0` under `levelMode == "Tower"` appears at `:5864`,
   * `:6228` and `:6572` — character-identical, immediately after each of the
   * three `frozen = true` sites (bullet impact, ice ground trail, explosion).
   * Every freeze source does it; none is special.
   *
   * So it belongs *inside* the freeze rather than beside each caller. Both port
   * freeze sources — the Icicle's impact and the Ice Grenade's blast — go
   * through here, and a fourth inherits it for free.
   *
   * ── Zero, not the spawn value ─────────────────────────────────────────
   * `resetTowerRamp` restores `stats.accSpeed`; this sets **0**, which is below
   * where the enemy spawned. `towerAccSpeed` then climbs from nothing and
   * `towerRotSpeedMax(0)` is 1, its floor — so a thawed enemy is both slower
   * and turns worse than a fresh one. Freezing in Tower undoes the build-up
   * rather than pausing it, which is most of why ice is worth using there.
   *
   * ── Why the Ice Grenade shipped without it ────────────────────────────
   * Not a divergence between the AS3's bullet and blast paths — those agree.
   * `applyFreeze` was extracted as a pure status function before anything
   * could freeze, and the ramp reset needs the enemy rather than the status
   * record, so it was documented at both `applyFreeze` and `resetTowerRamp`
   * instead of implemented. G2's Ice Grenade then became the first freeze
   * source and inherited the gap. This closes it.
   */
  /**
   * @returns whether this was a **fresh** freeze — the enemy was not already
   * frozen. Both AS3 push sites gate the `Freeze` sound on
   * `!theEnemy.gotIceIndicator` (`PartGameArea.as:5866-5868`, `:6230-6232`),
   * so re-freezing an already-frozen enemy is silent. The caller needs that
   * answer and cannot recover it afterwards, since `applyFreeze` has already
   * set the flag by the time it returns.
   */
  freeze(frozenTime: number, isTower: boolean): boolean {
    const wasFrozen = this.status.frozen;
    applyFreeze(this.status, frozenTime, this.damageMultipliers.Ice, this.enemyLevel === 'B');
    if (isTower) this.towerAcc = 0;
    return !wasFrozen;
  }

  /** The Tower ramp, for tests and the debug readout. */
  get towerAccSpeedValue(): number {
    return this.towerAcc;
  }

  /**
   * Health this enemy spawned with — the AS3's `getTotalHealth`.
   *
   * That function (`PartGameArea.as:2300-2341`) recomputes the figure from the
   * stat row and the difficulty and tier multipliers every time it is called.
   * `resolveEnemyStats` already produces exactly the same number, including the
   * boss exemption from the difficulty multiplier and the division by
   * `bossAmount`, so this is a named accessor rather than a reimplementation.
   *
   * Named so callers read intent: `health / maxHealth` is a fraction of full,
   * where `health / stats.health` looks like it could be a mistake.
   */
  get maxHealth(): number {
    return this.stats.health;
  }

  /**
   * The single way health is written — every damage source goes through here.
   *
   * A funnel rather than four assignments, because three things need to happen
   * at every one of them and a missed site is silent in all three cases: the
   * change flags above, `DamageAddict`'s immunity when it lands, and whatever
   * the next health-reactive enemy needs.
   *
   * Flags are cleared at the end of `update`, so damage landing between updates
   * is consumed by the next one. That is a deterministic one-frame latency and
   * it matches the original, which captures `beforeHP` at the top of its enemy
   * loop and compares at the bottom of the same iteration.
   */
  setHealth(next: number): void {
    // `DamageAddict` takes nothing from anything. The AS3 repeats this guard at
    // every damage site; keeping it here means a source added later inherits it
    // instead of having to remember. Its own decay uses `bleed`, which is
    // private and deliberately bypasses this — immunity would otherwise stop it
    // dying.
    if (next < this.health && isImmuneToDamage(this.enemyType)) return;
    if (next === this.health) return;
    this.healthChanged = true;
    if (next < this.health) this.healthDropped = true;
    this.health = next;
  }

  /**
   * Whether health dropped since the last update — `Temperamental`'s trigger.
   *
   * Exposed now rather than when Temperamental lands, so the observer has one
   * shape from the start and the next enemy plugs in rather than reworking it.
   */
  get tookDamage(): boolean {
    return this.healthDropped;
  }

  /** Whether health changed at all — `Accelerating`'s trigger. Heals count. */
  get healthMoved(): boolean {
    return this.healthChanged;
  }

  /**
   * The one sanctioned bypass of the immunity guard — `PartGameArea.as:4879`.
   *
   * Private and named rather than a `force` parameter on `setHealth`, so there
   * is exactly one caller and no way for a future damage source to opt itself
   * out. Writes health directly, exactly as the AS3 does.
   */
  private bleed(amount: number): void {
    this.health = Math.max(0, this.health - amount);
  }

  /** Convenience for callers that have an amount rather than a total. */
  takeDamage(amount: number): void {
    if (amount === 0) return;
    this.setHealth(this.health - amount);
  }

  /**
   * Rescales a `Shrinking` enemy to match its health.
   *
   * Radius and sprite move together, as they do in the AS3 — scaling only the
   * sprite would make it *look* harder to hit while remaining exactly as easy,
   * which is the worse of the two failure modes because it is invisible.
   */
  /**
   * Advances `Accelerating`'s wind-up and returns the speeds it implies.
   *
   * Null for every other type, so the caller falls back to the resolved stats.
   */
  private tickAcceleratingRamp(frames: number, isTower: boolean): RampedSpeeds | null {
    if (!this.accelerating) return null;

    this.accelerating = tickAccelerating(
      this.accelerating,
      frames,
      this.healthChanged,
      this.status.frozen,
    );
    return acceleratingSpeeds(acceleratingFactor(this.accelerating), isTower);
  }

  /**
   * Advances `Temperamental`'s rage and returns the speeds it implies.
   *
   * Returns null until the enemy has ever raged, so it keeps the
   * difficulty-resolved speeds it spawned with. The AS3's calm branch is
   * guarded by `&& angry`, so nothing writes the raw table before the first
   * hit — and every write afterwards comes from it, which is what makes losing
   * the difficulty multiplier permanent.
   */
  private tickRageState(frames: number, isTower: boolean): RampedSpeeds | null {
    if (!this.rage) return null;

    this.rage = tickRage(this.rage, frames, this.healthDropped, this.status.frozen);
    if (!this.rage.hasRaged) return null;

    return rageSpeeds(this.rage.angry, this.enemyLevel === 'B', isTower);
  }

  /**
   * Bleeds a `DamageAddict` and returns the speeds its remaining health implies.
   *
   * The AS3 gates the whole block on `!frozen` at the enclosing level, so a
   * frozen one stops decaying rather than dying on ice.
   */
  private tickDecay(frames: number, isTower: boolean): RampedSpeeds | null {
    if (this.decayRate === null) return null;
    if (!this.status.frozen) this.bleed(this.decayRate * frames);
    return decayedSpeeds(this.health, this.enemyLevel === 'B', isTower);
  }

  /**
   * Advances the blink or flinch and fades the sprite to match.
   *
   * The AS3 swaps to frame 2 for the invisible state, which `applyAlpha` now
   * does too. The alpha is kept alongside it and is this port's own addition:
   * deliberately not fully transparent, because an enemy the player cannot see
   * at all is indistinguishable from one that has despawned.
   */
  private tickVisibility(frames: number): void {
    if (!this.visibility) return;

    this.visibility = blinksOnTimer(this.enemyType)
      ? tickGhostBlink(this.visibility, frames, this.status.frozen)
      : tickScaredGhost(this.visibility, frames, this.healthDropped, this.status.frozen);

  }

  /**
   * Counts the heal aura down.
   *
   * Only reports *whether* it fired — the heal itself needs every other enemy,
   * which this entity cannot see, so the scene owns that loop.
   */
  private tickHealAura(frames: number): boolean {
    if (!this.healing) return false;
    const result = tickHeal(this.healing, frames);
    this.healing = result.state;
    return result.pulses;
  }

  /**
   * Advances the teleport clock and moves the enemy when it lands.
   *
   * `canTeleport` is a *block*, not a cancel: a Tower enemy too near the tank
   * simply stays ready and re-tests next frame, exactly as the AS3 does by
   * leaving `teleStartTimer` at zero.
   */
  /**
   * Teleport transitions that happened on the last `update`, for the scene to
   * sound — `:4948` `TeleportOut` and `:4975` `TeleportIn`.
   *
   * Surfaced as flags rather than queued here because **entities in this port
   * do not emit sounds**; the scene owns the `SoundManager`, and it also owns
   * the camera rect that both pushes are gated on (`checkWithinScreen(…, 100)`
   * at `:4946` and `:4973` — the port's `isAudibleAt`). Doing it here would
   * need the enemy to know about both, and would put a second sound path
   * beside the scene's.
   *
   * Reset at the top of every `tickTeleportCycle`, so a frame that does not run
   * the cycle cannot re-sound a stale transition.
   */
  teleportedOut = false;

  teleportedIn = false;

  private tickTeleportCycle(frames: number, target: { x: number; y: number }): void {
    this.teleportedOut = false;
    this.teleportedIn = false;
    if (!this.teleport) return;

    const context = {
      mode: this.mode,
      x: this.steering.x,
      y: this.steering.y,
      tankX: target.x,
      tankY: target.y,
      roomHeight: this.roomHeight,
    };

    const result = tickTeleport(this.teleport, frames, canTeleport(context), Math.random);
    this.teleport = result.state;
    this.teleporting = isTeleporting(this.teleport);
    this.teleportedOut = result.departs;
    this.teleportedIn = result.arrives;

    if (!result.arrives) return;

    const destination = teleportDestination({
      ...context,
      roomWidth: this.roomWidth,
      radius: this.radius,
    });
    // Null means the reroll cap was hit. Skipping the hop leaves the enemy
    // where it is rather than dropping it somewhere arbitrary — possibly on
    // the tank.
    if (!destination) return;

    this.steering = { ...this.steering, x: destination.x, y: destination.y };
    this.setPosition(destination.x, destination.y);
  }

  /**
   * The single writer for opacity.
   *
   * Two systems want it — the teleport fade and Ghost/ScaredGhost's dimming —
   * and no type is both today, so an accidental overwrite order would work by
   * luck. Resolved explicitly instead: a teleport in progress owns the fade,
   * invisibility applies otherwise.
   */
  private applyAlpha(): void {
    if (this.teleport && isTeleporting(this.teleport)) {
      this.setAlpha(teleportAlpha(this.teleport));
      return;
    }
    this.setAlpha(this.invisible ? INVISIBLE_ALPHA : 1);

    // `:4824`, `:4844` — the AS3 also swaps to the clip's second frame while
    // invisible. Four types have one (Ghost, ScaredGhost, Teleporting,
    // Temperamental, and their bosses); `enemyShape` clamps, so a single-frame
    // type asking for frame 2 gets frame 1 rather than nothing.
    //
    // Frame *and* alpha, not one or the other: the frame is the art the
    // original shows, and the alpha is this port's own softening so a fully
    // hidden enemy is not mistaken for a despawned one. That divergence
    // predates the art and is kept — see the note on `tickVisibility`.
    const shape = enemyShape(this.enemyType, this.enemyLevel === 'B', this.invisible ? 2 : 1);
    if (shape !== undefined) this.shell.setTexture(`unit-${shape}`);
  }

  /**
   * One frame of reeling: velocity straight at the tank, speed +0.5, capped at
   * the raised `REEL_MAX_SPEED`, then integrated.
   */
  private reelStep(target: { x: number; y: number }, frames: number): SteeringState {
    const speed = Math.hypot(this.steering.xVel, this.steering.yVel);
    const reel = reelVelocity(this.steering, target, speed);

    let { xVel, yVel } = reel;
    const next = Math.hypot(xVel, yVel);
    if (next > reel.moveSpeedMax && next > 0) {
      const scale = reel.moveSpeedMax / next;
      xVel *= scale;
      yVel *= scale;
    }

    return {
      rotation: reel.rotation,
      xVel,
      yVel,
      x: this.steering.x + xVel * frames,
      y: this.steering.y + yVel * frames,
    };
  }

  /** Releases a non-boss grapple — the shield push at `:5342`. */
  releaseGrapple(random: () => number = Math.random): void {
    if (!this.grapple?.isGrapping) return;
    this.grapple = { ...this.grapple, isGrapping: false };
    this.steering = {
      ...this.steering,
      rotation: releaseHeading(this.steering.rotation, this.stats.moveSpeedMax, random),
    };
  }

  private applyBodyScale(): void {
    if (!shrinksWithHealth(this.enemyType)) return;

    const size = shrinkScale(this.health, this.maxHealth);
    this.radius = size * this.radiusStart;
    this.setScale(size);
  }

  /** Hidden, so bullets, blasts, mines and homing rounds pass it by. */
  get invisible(): boolean {
    return this.visibility?.invisible ?? false;
  }

  /**
   * Whether this enemy is simulated at all this frame.
   *
   * A mid-teleport enemy is not: `PartGameArea.as` suppresses steering
   * (`:4528`), position integration (`:5368`), enemy-enemy collision and push
   * (`:5172`, `:5179`), enemy-avoidance (`:5120`) and off-screen tracking
   * (`:4759`) while `teleporting` is set. That is a separate concern from
   * `targetable`, which is about what can *reach* it — the two coincide today
   * only because teleporting sets both.
   */
  get simulated(): boolean {
    return !this.teleporting;
  }

  /**
   * Whether anything may interact with this enemy.
   *
   * The single predicate every collision and targeting site should ask, rather
   * than reading `invisible` directly — `teleporting` travels with it at all
   * eight AS3 sites.
   */
  get targetable(): boolean {
    return isTargetable(this);
  }

  /** True while frozen — the scene skips contact damage against it. */
  get frozen(): boolean {
    return this.status.frozen;
  }

  /** Advances steering. Call once per frame with the tank's position. */
  override update(target: AimTank, deltaMs: number): void {
    // `PartGameArea.as:5027` gates the whole acceleration block on `!frozen`,
    // so a frozen enemy holds position rather than coasting.
    if (this.status.frozen) return;

    this.tickTeleportCycle((deltaMs / 1000) * AS3_FPS, target);
    // Suppressed entirely while mid-teleport — see `simulated`.
    if (!this.simulated) {
      this.applyAlpha();
      this.healthChanged = false;
      this.healthDropped = false;
      return;
    }

    const tower = this.mode === 'Tower';
    const defense = this.mode === 'Defense';
    const frames = (deltaMs / 1000) * AS3_FPS;
    const speeds =
      this.tickAcceleratingRamp(frames, tower) ??
      this.tickRageState(frames, tower) ??
      this.tickDecay(frames, tower);
    if (tower) {
      // Grows for the level, capped at 10. Advanced before the step so the
      // frame that spawned the enemy does not get a free tick.
      this.towerAcc = towerAccSpeed(
        this.towerAcc,
        this.stats.moveSpeedMax,
        (deltaMs / 1000) * AS3_FPS,
      );
    }

    // `:5041` is the `if` of an if/else whose else is the ordinary
    // accelerate-along-facing block, so reeling *replaces* steering rather than
    // layering on it. Velocity and rotation are written from the bearing to the
    // tank every frame, which is also why the wall cannot produce Defense's
    // slide: whatever the clamp did is rebuilt next frame.
    // Where to steer, which is not always where the tank is: on Medium and Hard
    // the enemy leads the tank's velocity. `enemyAim.ts` owns that rule; the
    // steering formulas below are unchanged and simply receive a different
    // point, exactly as `PartGameArea.as:4585` does.
    //
    // Not applied to a reeling grappler: `:5041` replaces the whole steering
    // branch with a straight pull to the tank's actual position.
    const goal = aimPoint(this.steering, target, {
      difficulty: this.difficulty,
      mode: this.mode,
      rotation: this.steering.rotation,
      radius: this.radius,
      roomWidth: this.roomWidth,
      roomHeight: this.roomHeight,
    });

    // `:5365-5366` — the separation push sheds 0.5 a frame, **after the pair
    // loop and before integration**. Decaying after integrating would spend a
    // stale velocity for one frame, which is invisible in a still frame and
    // wrong in motion.
    //
    // Nothing writes `pushVel` yet — the pair loop is pass (c) — so this runs
    // on zeros and `decayPush(0, 0)` is `(0, 0)`. It is here now so that pass
    // (c) is a pure wiring change with no ordering decisions left in it.
    const decayed = decayPush({ pushVelX: this.pushVelX, pushVelY: this.pushVelY });
    this.pushVelX = decayed.pushVelX;
    this.pushVelY = decayed.pushVelY;

    const steppedCore = this.grapple?.isGrapping
      ? this.reelStep(target, frames)
      : steerToward(
      this.steering,
      {
        // Tower overrides both from the ramp; every other mode uses the stats.
        rotSpeedMax:
          tower ? towerRotSpeedMax(this.towerAcc) : speeds?.rotSpeedMax ?? this.stats.rotSpeedMax,
        accSpeed: tower ? this.towerAcc : speeds?.accSpeed ?? this.stats.accSpeed,
        moveSpeedMax: speeds?.moveSpeedMax ?? this.stats.moveSpeedMax,
      },
      goal,
      deltaMs,
      // Defense enemies never re-steer. `PartGameArea.as:4528` gates the whole
      // steering block — goal selection, the tank-lead prediction, the capped
      // turn, lines 4528-4758 — on `levelMode != "Defense"`, while the
      // acceleration and integration at :5027 stay outside it. So they keep the
      // heading `resolveSpawn` gave them and fly straight.
      //
      // Expressed as "turn toward the heading you already have", which makes
      // the turn exactly zero and leaves the rest of `steerToward` running
      // unchanged. That is the same arithmetic as skipping the block, through
      // one code path rather than two.
      defense
        ? this.steering.rotation
        : tower
          ? towerAngleToTarget(this.steering, goal, this.stats.moveSpeedMax, this.roomWidth)
          : undefined,
      );

    // The push rides along with the step. `steerToward` builds a fresh state
    // and does not carry it, which is deliberate — the separation velocity is
    // not a steering output — so it is re-attached here, together with the
    // distance this frame's integration actually covered. `applyPush` needs
    // that distance for the AS3's all-or-nothing axis gate; see `WallOptions`.
    const stepped: SteeringState = {
      ...steppedCore,
      pushVelX: this.pushVelX,
      pushVelY: this.pushVelY,
    };
    const steppedBy = {
      x: stepped.x - this.steering.x,
      y: stepped.y - this.steering.y,
    };

    // Checked before clamping: `clampToRoom` pulls the enemy back inside, so
    // afterwards the crossing is no longer visible.
    this.breachedLine =
      defense && crossesDefenseLine(stepped, this.roomHeight, this.radius);

    // Walls — `PartGameArea.as:5370-5513`. The split is by **enemy level, not
    // by mode**: every non-boss reflects off every wall in every mode, and a
    // boss never reflects.
    //
    // Applied before `clampToRoom`, which then finds the coordinate already
    // exactly on the boundary and leaves the reflected velocity alone — it only
    // zeroes a component when it actually has to move the coordinate.
    //
    // `skipBottom` is Defense's carve-out at `:5449`: there the bottom edge is
    // the objective, and `crossesDefenseLine` above has already recorded the
    // crossing that kills the enemy.
    // Two frozen constants rather than a fresh `{ skipBottom }` per enemy per
    // frame. **Cleanup, not a fix**: T113 profiled this and it never appeared —
    // ~98% of samples were outside JS, GC sat at 0.1%, and the heap was flat
    // across 120s of loaded play. Hoisted because it is free to hoist, not
    // because it cost anything measurable.
    const wallOptions = defense ? WALL_OPTIONS_SKIP_BOTTOM : WALL_OPTIONS_ALL;
    const isBoss = this.enemyLevel === 'B';
    let walled = stepped;
    if (isBoss) {
      // `:5516-5530` — a boss grinds along the wall turning one degree per
      // frame toward the tank rather than bouncing off it. `lockDirection` is
      // left at its default: its only producer, the border AI at `:4642-4680`,
      // is unported. See `turnTowardsGoal`.
      if (atWall(stepped, this.roomWidth, this.roomHeight, this.radius, wallOptions)) {
        walled = {
          ...stepped,
          rotation: turnTowardsGoal(stepped.rotation, angleToTarget(stepped, goal)),
        };
      }
    } else {
      walled = bounceOffWalls(
        stepped,
        this.roomWidth,
        this.roomHeight,
        this.radius,
        wallOptions,
        steppedBy,
      );
    }

    this.steering = clampToRoom(walled, this.roomWidth, this.roomHeight, this.radius);
    // Written back so the next frame decays what the walls left, rather than
    // what the pair loop produced before they clipped it.
    this.pushVelX = this.steering.pushVelX ?? 0;
    this.pushVelY = this.steering.pushVelY ?? 0;
    this.setPosition(this.steering.x, this.steering.y);
    this.setRotation(Phaser.Math.DegToRad(this.steering.rotation));
    this.applyBodyScale();
    this.tickVisibility(frames);
    this.pulsedHeal = this.tickHealAura(frames);
    this.applyAlpha();

    // Consumed, so damage arriving before the next update is what the next
    // update sees.
    this.healthChanged = false;
    this.healthDropped = false;
  }

  /**
   * Applies one ordered pair's separation effect — `:5186-5218`.
   *
   * The three branches write to three different places, which is why this takes
   * the discriminated effect rather than a vector: a nudge is **position**, a
   * boss push is an **assignment** to `pushVel`, and a boss-on-normal shove is
   * an **addition** to velocity. Collapsing them is the mistake
   * `enemySeparation.ts` is shaped to prevent.
   *
   * Mutates immediately, as the AS3 does. Later pairs in the same frame see the
   * moved position, so the result depends on array order — that is the
   * original's behaviour and the reason the loop must not be reordered or
   * distance-sorted.
   */
  applySeparation(effect: SeparationEffect): void {
    if (effect.kind === 'nudge') {
      this.steering = {
        ...this.steering,
        x: this.steering.x + effect.dx,
        y: this.steering.y + effect.dy,
      };
      // Kept in step so a later pair in this same frame measures from where the
      // enemy now is, not where it started the frame.
      this.setPosition(this.steering.x, this.steering.y);
      return;
    }

    if (effect.kind === 'velocity') {
      this.steering = {
        ...this.steering,
        xVel: this.steering.xVel + effect.dxVel,
        yVel: this.steering.yVel + effect.dyVel,
      };
      return;
    }

    if (effect.kind === 'bossPush') {
      // `:5203-5205` — assignment, not accumulation.
      this.pushVelX = effect.subject.pushVelX;
      this.pushVelY = effect.subject.pushVelY;
    }
  }

  /** `:5206-5209` — the other body of a boss pair, written by the same visit. */
  applyBossCounterPush(push: { pushVelX: number; pushVelY: number }): void {
    this.pushVelX = push.pushVelX;
    this.pushVelY = push.pushVelY;
  }

  /**
   * DEV-AID: drop this enemy at a world point — `--boss-collision` only.
   *
   * Writes the steering state as well as the display position, because the two
   * are separate in this port and moving only the sprite would leave the rule
   * reading the old coordinates. Velocity and rotation are untouched, so the
   * enemy carries on doing what it was doing from the new place.
   */
  placeAt(x: number, y: number): void {
    this.steering = { ...this.steering, x, y };
    this.setPosition(x, y);
  }

  /** The body this enemy presents to the separation rule. */
  get separationBody(): SeparationBody {
    return {
      x: this.steering.x,
      y: this.steering.y,
      radius: this.radius,
      enemyLevel: this.enemyLevel,
      safetyDistance: this.safetyDistance,
      teleporting: this.teleporting,
    };
  }

  /** Current speed in design units per frame, for the debug readout. */
  /**
   * Facing in degrees — where a `Front` shot goes.
   *
   * Read from the steering state rather than the display rotation: the sprite
   * carries art offsets, and the AS3 fires along `theEnemy.rotation`, which is
   * the steering value.
   */
  get facingDegrees(): number {
    return this.steering.rotation;
  }

  get speed(): number {
    return Math.hypot(this.steering.xVel, this.steering.yVel);
  }

  override destroy(fromScene?: boolean): void {
    // A pending flash would otherwise fire against a destroyed sprite.
    this.flashTimer?.remove();
    this.flashTimer = null;
    super.destroy(fromScene);
  }

  /**
   * Brief red flash on a non-fatal hit.
   *
   * The AS3 tints via `colorClip` and counts a `damageIndicator` down over 20
   * frames inside the behaviour loop; this is the visual only.
   */
  /**
   * DEV-AID: the sprite's live tint, for `npm run look -- --hits`.
   *
   * The T114 defect was a tint that persisted after a damage flash, and neither
   * a unit test (nothing constructs an `Enemy`) nor a screenshot (a darkened
   * sprite against nine world themes is not reliably readable) can settle it.
   * `isTinted` plus the value can.
   */
  get debugTint(): { tinted: boolean; value: number } {
    return { tinted: this.shell.isTinted, value: this.shell.tintTopLeft };
  }

  flashDamage(feedback: ImpactFeedback = null): void {
    // The AS3 spawns a Strength/Weakness/Immune particle alongside the red
    // flash; particles are unported, so the flash colour carries the signal.
    const colour =
      feedback === 'Weakness'
        ? 0xffe066
        : feedback === 'Strength'
          ? 0x9e9e9e
          : feedback === 'Immune'
            ? 0x5b8def
            : 0xff4444;

    // Cancel any flash still in flight, so a rapid second hit restarts the
    // full flash rather than being cut short by the earlier hit's timer.
    this.flashTimer?.remove();

    this.shell.setTint(colour);
    this.flashTimer = this.scene.time.delayedCall(FLASH_MS, () => {
      this.flashTimer = null;
      if (!this.active) return;
      // `uncolorClip` (`PartGameArea.as:2129`, called at `:4511`): back to the
      // sprite's **own** colours, not to a base colour. Restoring `baseTint`
      // here is what left every hit enemy permanently darkened — see
      // `restingTint`.
      //
      // Computed from the construction-time flag rather than read back off
      // `shell.tintTopLeft`, which on an overlapping hit would pick up the
      // previous flash's colour and pin the enemy red.
      const resting = restingTint(this.usesFallbackArt, this.baseTint);
      if (resting === null) this.shell.clearTint();
      else this.shell.setTint(resting);
    });
  }
}
