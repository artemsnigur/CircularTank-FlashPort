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
  bounceOffSideWalls,
  clampToRoom,
  crossesDefenseLine,
  steerToward,
  towerAccSpeed,
  towerAngleToTarget,
  towerRotSpeedMax,
} from '../enemies/enemySteering';
import type { SteeringState } from '../enemies/enemySteering';
import { resolveDamageMultipliers } from '../enemies/damageTypes';
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
import type { AcceleratingState, RageState, RampedSpeeds } from '../enemies/enemyStatMods';
import type { DamageMultipliers, ImpactFeedback } from '../enemies/damageTypes';
import { createStatusState, tickStatuses } from '../enemies/statusEffects';
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
const BASE_DIAMETER = 26;
const BOSS_DIAMETER = 46;

/** How long the damage flash holds before reverting, in ms. */
const FLASH_MS = 80;

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

  /** The radius this enemy spawned at. `Shrinking` scales relative to it. */
  readonly radiusStart: number;
  /** Per-channel resistances from this type's strengths/weaknesses tables. */
  readonly damageMultipliers: DamageMultipliers;

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
    const diameter = isBoss ? BOSS_DIAMETER : BASE_DIAMETER;

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
    this.radiusStart = this.radius;
    this.roomWidth = config.roomWidth;
    this.roomHeight = config.roomHeight;
    this.mode = config.mode;
    this.resetTowerRamp();
    this.accelerating = acceleratesWhileUndamaged(config.type)
      ? createAcceleratingState(config.level === 'B')
      : null;
    this.rage = ragesWhenDamaged(config.type) ? createRageState() : null;
    this.visibility =
      blinksOnTimer(config.type) || hidesWhenHurt(config.type) ? createVisibilityState() : null;
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

    // `particle-dot` is the extracted 1.svg circle, tinted by the enemy's
    // particle colour so the stat table drives appearance.
    this.baseTint = PARTICLE_TINTS[stats.particle] ?? 0xffffff;
    this.shell = scene.add
      .sprite(0, 0, 'particle-dot')
      .setDisplaySize(diameter, diameter)
      .setTint(this.baseTint);

    // A short nose showing which way it is heading.
    const nose = scene.add
      .sprite(diameter * 0.32, 0, 'particle-dot')
      .setDisplaySize(diameter * 0.34, diameter * 0.34)
      .setTint(0x1b1b1b);

    this.add([this.shell, nose]);
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
   * Note freezing is specified to do something *different* — it zeroes the
   * ramp outright (`PartGameArea.as:5862`) rather than restoring the stat.
   * Nothing freezes yet, so that is recorded in `statusEffects.applyFreeze`
   * rather than implemented here as a method no caller can reach.
   */
  resetTowerRamp(): void {
    this.towerAcc = this.stats.accSpeed;
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
   * The AS3 swaps to frame 2 for the invisible state; the port has no such
   * frame, so it uses alpha. Deliberately not fully transparent: the original
   * shows a faint ghost rather than nothing, and an enemy the player cannot see
   * at all is indistinguishable from one that has despawned.
   */
  private tickVisibility(frames: number): void {
    if (!this.visibility) return;

    this.visibility = blinksOnTimer(this.enemyType)
      ? tickGhostBlink(this.visibility, frames, this.status.frozen)
      : tickScaredGhost(this.visibility, frames, this.healthDropped, this.status.frozen);

    this.setAlpha(this.visibility.invisible ? INVISIBLE_ALPHA : 1);
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
  override update(target: { x: number; y: number }, deltaMs: number): void {
    // `PartGameArea.as:5027` gates the whole acceleration block on `!frozen`,
    // so a frozen enemy holds position rather than coasting.
    if (this.status.frozen) return;

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

    const stepped = steerToward(
      this.steering,
      {
        // Tower overrides both from the ramp; every other mode uses the stats.
        rotSpeedMax:
          tower ? towerRotSpeedMax(this.towerAcc) : speeds?.rotSpeedMax ?? this.stats.rotSpeedMax,
        accSpeed: tower ? this.towerAcc : speeds?.accSpeed ?? this.stats.accSpeed,
        moveSpeedMax: speeds?.moveSpeedMax ?? this.stats.moveSpeedMax,
      },
      target,
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
          ? towerAngleToTarget(this.steering, target, this.stats.moveSpeedMax, this.roomWidth)
          : undefined,
    );

    // Checked before clamping: `clampToRoom` pulls the enemy back inside, so
    // afterwards the crossing is no longer visible.
    this.breachedLine =
      defense && crossesDefenseLine(stepped, this.roomHeight, this.radius);

    // Defense enemies ricochet off the side walls rather than sliding down
    // them. Applied before `clampToRoom`, which then finds x already exactly on
    // the boundary and leaves the reflected velocity alone — it only zeroes a
    // component when it actually has to move the coordinate.
    const walled = defense
      ? bounceOffSideWalls(stepped, this.roomWidth, this.radius)
      : stepped;

    this.steering = clampToRoom(walled, this.roomWidth, this.roomHeight, this.radius);
    this.setPosition(this.steering.x, this.steering.y);
    this.setRotation(Phaser.Math.DegToRad(this.steering.rotation));
    this.applyBodyScale();
    this.tickVisibility(frames);

    // Consumed, so damage arriving before the next update is what the next
    // update sees.
    this.healthChanged = false;
    this.healthDropped = false;
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
      // Restores the tint captured at construction, never the live one: reading
      // `shell.tintTopLeft` here would pick up a previous flash's colour on an
      // overlapping hit and leave the enemy permanently red.
      if (this.active) this.shell.setTint(this.baseTint);
    });
  }
}
