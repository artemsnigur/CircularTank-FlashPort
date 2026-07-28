/**
 * Placeholder gameplay scene.
 *
 * Proves, in one screen:
 *   - a real extracted bitmap renders (351.png, the Desert ground tile),
 *   - a real extracted vector shape renders (3.svg, the tank body),
 *   - keyboard/WASD input drives arcade physics,
 *   - the camera scrolls over a room larger than the viewport, the way
 *     PartGameArea.as does,
 *   - in-canvas text uses the extracted font and respects the safe area,
 *   - gameplay events reach the React HUD with no polling.
 *
 * Everything here is scaffolding. Real waves, weapons and enemies arrive as
 * the AS3 classes in PROGRESS.md get ported.
 */
import Phaser from 'phaser';
import { SceneKeys } from '../config/constants';
import type { Difficulty } from '../config/constants';
import { GameEvents } from '../events/GameEvents';
import { PlayerTank } from '../entities/PlayerTank';
import type { PlayerInput } from '../entities/PlayerTank';
import { Pickup } from '../entities/Pickup';
import { Enemy } from '../entities/Enemy';
import { getSoundManager, publishAudioOptions, setAudioOption } from '../audio/soundService';
import { getLevel } from '../levels/levelData';
import { nextLevelAfter } from '../levels/levelProgress';
import { groundFor } from '../levels/groundTexture';
import type { LevelSpec } from '../levels/levelData';
import {
  canSpawn,
  createWaveState,
  drawEnemy,
  registerEnemySpawned,
  registerSpawn,
  tickWave,
} from '../waves/waveState';
import type { WaveState } from '../waves/waveState';
import { placeWarning } from '../waves/spawnPlacement';
import { createWarning, tickWarnings, warningScale } from '../waves/warnings';
import type { Warning } from '../waves/warnings';
import { Bullet } from '../entities/Bullet';
import {
  createFiringState,
  fire,
  getWeapon,
  FLAME_RANGE_MULTIPLIER,
  resolveWeaponStats,
  tickFiring,
} from '../weapons/firing';
import type { FiringState, WeaponStats } from '../weapons/firing';
import type { WeaponSpec } from '../weapons/firing';
import { applyBulletDamage, findAllHits, findHit } from '../weapons/bullets';
import { flameLifetimeMax, FLAME_CROWD_RADIUS } from '../weapons/flames';
import { spawnCakePieces } from '../weapons/cake';
import { createBeam, findBeamHits } from '../weapons/laser';
import { findMagicTarget, magicVelocity } from '../weapons/magic';
import type { HitTarget } from '../weapons/bullets';
import { applyBomb, applyPoison } from '../enemies/statusEffects';
import { healedTo, isInHealRange } from '../enemies/enemyHealing';
import { canFireHook } from '../enemies/enemyGrapple';
import { impactFeedback } from '../enemies/damageTypes';
import {
  blastDamage,
  createExplosion,
  explosionSound,
  findEnemiesInBlast,
} from '../weapons/explosions';
import type { ExplosionSpec } from '../weapons/explosions';
import { Explosion } from '../entities/Explosion';
import {
  getSecondary,
  placeMine,
  resolveSecondaryStats,
  sweepMines,
} from '../weapons/secondaries';
import type { SecondarySpec, SecondaryStats } from '../weapons/secondaries';
import { Mine } from '../entities/Mine';
import { createInitialUpgradeState, maxedUpgradeState } from '../upgrades/upgradeState';
import type { UpgradeState } from '../upgrades/upgradeState';
import { getPlayerProfile } from '../player/playerProfile';
import {
  bulletReflectChance,
  createShieldState,
  isReflectable,
  raiseShield,
  reflectBullet,
  reflectChance,
  shieldAlpha,
  shieldRadiusMultiplier,
  tickShield,
} from '../weapons/shield';
import type { ShieldState } from '../weapons/shield';
import {
  bounceGrenade,
  grenadeVelocity,
  throwGrenade,
  tickGrenade,
} from '../weapons/grenade';
import type { GrenadeState } from '../weapons/grenade';
import { spawnFan } from '../weapons/radialFan';
import type { SecondaryKind } from '../weapons/secondaries';
import { createLevelFlags } from '../achievements/achievementContext';
import type { LevelAchievementFlags } from '../achievements/achievementContext';
import type { PlayerProfile } from '../player/playerProfile';
import {
  chooseWeapon,
  nextSlot,
  resolveActivePrimary,
  resolveActiveSlot,
} from '../loadout/loadout';
import { isWaveComplete, registerEnemyKilled, registerFlagCaptured } from '../waves/waveState';
import { canCaptureFlag, placeFlag, tickFlag } from '../waves/flag';
import { deathExplosion } from '../enemies/enemyDeath';
import { devLevelSpec } from '../levels/devLevels';
import {
  advanceEnemyBullet,
  applyBulletToTank,
  homeTowardTank,
  turnRateFor,
  bulletAlpha,
  canShoot,
  createVolley,
  hitsTank,
  registerShot,
  tickShooter,
} from '../enemies/enemyFiring';
import type { EnemyBulletState } from '../enemies/enemyFiring';
import { getDifficultyProfile } from '../config/difficultyMultipliers';
import { DEFAULT_DIFFICULTY } from '../levels/difficultyOption';
import type { FlagState } from '../waves/flag';
import {
  createLevelOutcome,
  outcomeMusic,
  tickOutcome,
  TANK_DEATH_BLAST_RADIUS,
} from '../waves/levelOutcome';
import type { LevelOutcomeState } from '../waves/levelOutcome';
import {
  isTouchingTank,
  PUSHED_TIMER_MAX,
  resolveContact,
  TANK_MAX_HP,
} from '../player/tankDamage';
import { tankStartPosition } from '../player/tankMovement';
import { bankLevelOutcome } from '../player/levelBanking';
import type { LevelBankingResult } from '../player/levelBanking';
import { MEDAL_HP_GOLD } from '../waves/medals';
import { applyViewportToScene, getViewportController } from '../systems/ViewportController';
import {
  centredCameraBounds,
  marginGradientBands,
  outOfBoundsRects,
  roomFillZoom,
} from '../config/viewport';

/**
 * Used **only** when no level spec resolves.
 *
 * Every real room size comes from `LevelSpec.roomWidth`/`roomHeight`
 * (`levelDataModel` columns 0 and 1), which vary per level — 640x400, 800x600,
 * 900x720 and 640x960 all occur. This pair matches the largest "Defense" room
 * and used to be hardcoded for every level, which meant all 405 played at
 * 640x960 and the off-camera spawn search could never run (see
 * `resolveLevelSpec` and `docs/AUDIT-2026-07.md`).
 */
const FALLBACK_ROOM = { width: 640, height: 960 } as const;

/**
 * Peak opacity of the margin fade, reached at the screen edge.
 *
 * The first attempt was a flat 45% rectangle and it read as a bar with a hard
 * line down it. A gradient to a slightly higher peak reads as distance rather
 * than as a wall, because nothing is uniform and nothing has an edge.
 */
const OUT_OF_BOUNDS_ALPHA = 0.55;

/** Live enemy fire. */
const ENEMY_BULLET_DEPTH = 11;
/** The shield ring, just above the tank and below enemy fire. */
const SHIELD_DEPTH = 9.5;
/** Thrown grenades roll on the ground, under everything that moves. */
const GRENADE_DEPTH = 1;
/** `grenade.radius = 3` — `PartGameArea.as:4041`, fixed at every level. */
const GRENADE_RADIUS = 3;
/**
 * Magic Bunny's round — `:4236-4238`, `:4245`.
 *
 * Speed 10 and a `16 + width/2` muzzle, against the Magic Cannon's 14 and
 * `12 + width/2`. Same mechanic, different numbers at every one of them.
 */
const CHAIN_RADIUS = 8;
const CHAIN_SPEED = 10;
const CHAIN_MUZZLE_OFFSET = 16;
/** Traps sit below it — `enemyTrapLayer` against `enemyBulletLayer`. */
const ENEMY_TRAP_DEPTH = 10;

/**
 * Slices per margin strip.
 *
 * Phaser's Graphics has no gradient fill, so the fade is drawn as bands. 24 is
 * past the point where banding is visible at these widths (35 design units on
 * 16:9 is under 1.5 units per band) and is still only 24 fillRect calls on a
 * layer that is redrawn on resize, not per frame.
 */
const OUT_OF_BOUNDS_BANDS = 24;

/** Margin treatments, for judging them against each other in DEV. */
const MARGIN_STYLES = ['gradient', 'none', 'flat'] as const;
type MarginStyle = (typeof MARGIN_STYLES)[number];

/**
 * Levels the room-fill zoom prototype is enabled on, as `world-level`.
 *
 * 1-1 is the deliberate choice: at 640x400 it is both the narrowest and the
 * shortest room in the game, so it shows the largest change and is the worst
 * case for anything that breaks. It is also `Normal` mode with ten Basic
 * enemies, so a failure is legible rather than tangled in Flag or Boss rules.
 *
 * DEV-only and explicitly listed rather than applied by a rule, so the other
 * 404 levels are untouched while this is being judged.
 */
const ROOM_FILL_PROTOTYPE_LEVELS: ReadonlySet<string> = new Set(['1-1']);

function roomFillEnabled(world: number, level: number): boolean {
  return import.meta.env.DEV && ROOM_FILL_PROTOTYPE_LEVELS.has(`${world}-${level}`);
}

const PICKUP_COUNT = 8;
const PICKUP_VALUE = 5;

/**
 * Placeholder magazine size for the HUD's ammo readout.
 *
 * The AS3 has no magazines — weapons gate on `reloadTime`, not a round count —
 * so there is nothing real to report yet. It matters only that it stays
 * **above zero**: `AmmoReadout` in Hud.tsx returns null on `capacity <= 0`, so
 * emitting a zero capacity unmounts the whole readout, taking the weapon name
 * with it. Both emit sites must use this.
 */
const PLACEHOLDER_AMMO = 12;

/**
 * Frames of freeze a flame burns off instead of dealing damage
 * (`PartGameArea.as:5924`).
 */
const FIRE_THAW_FRAMES = 15;

/**
 * Fallback when a launch supplies no difficulty.
 *
 * `ui:start-game` requires one, so in practice every launch names it; this
 * covers `scene.start(Gameplay)` calls that bypass the event (`ui:goto`, and a
 * restart before `init` has run). It is the same value `difficultyOption`
 * defaults to, so a run that lands here plays and banks exactly as an unset
 * preference would.
 */
const FALLBACK_DIFFICULTY: Difficulty = DEFAULT_DIFFICULTY;

/** Dev-only top-up, so the shop can be exercised without grinding levels. */
const DEV_MONEY_GRANT = 5000;

/** Stand-in size for the flag; the extracted art is not among the assets. */
const FLAG_RADIUS = 14;
const FPS_EMIT_INTERVAL_MS = 500;

interface GameplayData {
  world?: number;
  level?: number;
  /**
   * See `ui:start-game`. Decides which of the three progress slots the result
   * is written to, how enemy stats scale, and whether enemies lead the tank.
   */
  difficulty?: Difficulty;
  /** See `ui:start-game` — a run that must not reach the player's save. */
  sandbox?: boolean;
  /** See `ui:start-game` — honoured only alongside `sandbox`. */
  equipped?: boolean;
}

export class GameplayScene extends Phaser.Scene {
  private player!: PlayerTank;
  private ground!: Phaser.GameObjects.TileSprite;
  /** Texture phase correction so the padded ground still lines up with the room. */
  private groundOffset = { x: 0, y: 0 };
  /** Dimming over the padded margin — see `outOfBoundsRects`. */
  private outOfBounds!: Phaser.GameObjects.Graphics;
  /** Which treatment the margin is drawn with. Cycled by G in DEV. */
  private marginStyle: MarginStyle = 'gradient';
  private pickups!: Phaser.Physics.Arcade.Group;
  private hudText!: Phaser.GameObjects.Text;
  private crosshair!: Phaser.GameObjects.Image;

  /** Null on touch-only devices, where there is no keyboard plugin at all. */
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys | null = null;
  private wasd: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key> | null = null;

  private currency = 0;
  /**
   * Which primary slot is in hand — `ScreenGame.currentWeapon`.
   *
   * Derived at level start and toggled by Q; never read from the save, which
   * only stores the slot *contents*.
   */
  private currentSlot: 1 | 2 = 1;
  /**
   * The per-level achievement flags — `PartGameArea`'s `temp*` statics.
   *
   * Reset at level start. Three begin **true** and are cleared by doing
   * something, so a level the player walks away from must not bank them:
   * quitting uses `createQuitFlags`, a different starting point.
   */
  private levelFlags: LevelAchievementFlags = createLevelFlags();
  /** The Shield secondary's window — `PartGameArea.shieldOn`/`shieldTimer`. */
  private shield: ShieldState = createShieldState();
  /** The shield ring, parented to nothing — it follows the tank each frame. */
  private shieldSprite: Phaser.GameObjects.Image | null = null;
  /** Thrown grenades in flight, with their sprites and blast payloads. */
  private grenades: Array<{
    state: GrenadeState;
    sprite: Phaser.GameObjects.Image;
    blast: Omit<ExplosionSpec, 'x' | 'y'>;
  }> = [];
  /** What the last banked level earned — newly won achievements and enemies. */
  private banking: LevelBankingResult | null = null;
  /** Which level is being played — set from LevelSelect via scene data. */
  private world = 1;
  private level = 1;
  /** The difficulty this run is being played on — see `ui:start-game`. */
  private difficulty: Difficulty = FALLBACK_DIFFICULTY;

  /**
   * A sandbox run persists nothing — see `ui:start-game`.
   *
   * Set for every level reached through a dev affordance. It is the one guard
   * that keeps development play off the real save, so it sits on the single
   * block that writes rather than being spread across the individual writers.
   */
  private sandbox = false;

  /** Dev: arrive fully upgraded. Only honoured on a sandbox run. */
  private equipped = false;
  private lastFpsEmit = 0;
  private teardown: Array<() => void> = [];

  /**
   * Enemies spawned from the real level tables. Only the spawn path and base
   * steering are ported — see Enemy.ts for what deliberately is not.
   */
  private enemies: Enemy[] = [];

  /** Wave pacing and the draw-without-replacement pool. */
  private wave: WaveState | null = null;
  private levelSpec: LevelSpec | null = null;

  /**
   * This level's room, in design units — `LevelSpec.roomWidth`/`roomHeight`.
   *
   * Set by `resolveLevelSpec()` before anything that sizes the world, and read
   * everywhere the arena's extent matters: physics bounds, the ground tile,
   * camera bounds, spawn placement, bullet culling and pickup scatter.
   */
  private roomWidth: number = FALLBACK_ROOM.width;
  private roomHeight: number = FALLBACK_ROOM.height;

  /** Pending spawn warnings and their on-screen markers, kept in step. */
  private warnings: Warning[] = [];
  private warningMarkers = new Map<Warning, Phaser.GameObjects.Image>();
  /** Deterministic per-level, so a run is reproducible. */
  private spawnRng!: Phaser.Math.RandomDataGenerator;

  /** The player's persistent upgrades and loadout. */
  private profile!: PlayerProfile;

  /** Guards against banking the same level's takings on every frame. */
  private banked = false;

  /**
   * Blasts left by dying enemies, flushed once per frame.
   *
   * Never spawned from `removeEnemy` itself: a death blast can kill another
   * Exploding enemy, so doing it inline would recurse through the removal
   * path and re-enter its once-per-enemy guard. Same deferral the attached
   * bomb blasts use.
   */
  private pendingDeathBlasts: ExplosionSpec[] = [];

  /**
   * Last wave figures published, so the per-frame refresh only emits on change.
   *
   * The counter used to be pushed from three places, none of which was the
   * spawn path — so it only moved when something died and read stale while
   * enemies were arriving.
   */
  private lastWaveSignature = '';

  /**
   * The live flag on a Flag level, and its marker.
   *
   * Exactly one exists at a time — `handleFlag` respawns as soon as the last
   * is taken, until `flagsLeft` reaches zero. Null on every other mode.
   */
  private flag: FlagState | null = null;
  private flagMarker: Phaser.GameObjects.Image | null = null;

  /**
   * Bullets fired *at* the tank — `PartGameArea.enemyBulletArray`.
   *
   * Kept separate from `this.bullets`: they collide with the tank rather than
   * with enemies, and nothing the player fires interacts with them yet
   * (`reflected` is not ported).
   */
  private enemyBullets: Array<{
    state: EnemyBulletState;
    sprite: Phaser.GameObjects.Image;
    /** Degrees per frame it may turn, or null when it flies straight. */
    turnRate: number | null;
    /** The grappler that fired this hook, or null for every other bullet. */
    hookOwner: Enemy | null;
    /** AS3 class name, for the Shield's Trap exemption — see `isReflectable`. */
    bulletClass: string;
  }> =
    [];

  /**
   * The balance the level opened on.
   *
   * Takings are committed **only** when a level finishes — win or lose. Quit
   * partway and everything earned since is forfeit, because the profile is
   * never written. That is deliberate, and this field makes it explicit rather
   * than an accident of where `save()` happens to be called: the shutdown
   * handler restores the HUD to this figure so a forfeited balance is not left
   * on screen.
   *
   * Any new save site must respect it. Persisting mid-level — on pause, say —
   * would silently turn quitting into a way to bank a level's earnings without
   * finishing it.
   */
  private openingBalance = 0;

  /** Weapon state. Only the Cannon is ported — see weapons/firing.ts. */
  private bullets: Bullet[] = [];
  private firing: FiringState = createFiringState();
  private upgrades: UpgradeState = createInitialUpgradeState();
  private weapon: WeaponSpec | undefined;
  private weaponStats: WeaponStats | null = null;
  private firePressed = false;
  private kills = 0;

  /**
   * Secondary weapon — a separate clock and trigger from the primary. Only
   * Mine is ported; see weapons/secondaries.ts.
   */
  private mines: Mine[] = [];
  private secondaryFiring: FiringState = createFiringState();
  private secondary: SecondarySpec | undefined;
  private secondaryStats: SecondaryStats | null = null;
  private secondaryPressed = false;

  /** Scratch vector for the per-frame aim point, to avoid allocating each frame. */
  private readonly aimScratch = new Phaser.Math.Vector2();

  /** Win/lose state and the handover countdown. See waves/levelOutcome.ts. */
  private outcome: LevelOutcomeState = createLevelOutcome();

  /** Tank health and the post-knockback grace window. */
  private hp = TANK_MAX_HP;
  private pushedFrames = 0;

  constructor() {
    super(SceneKeys.Gameplay);
  }

  init(data: GameplayData): void {
    this.world = data.world ?? 1;
    this.level = data.level ?? 1;
    this.difficulty = data.difficulty ?? FALLBACK_DIFFICULTY;
    this.sandbox = data.sandbox === true;
    this.equipped = data.equipped === true;
    // Seeded from the profile below — the AS3 has one running `money` total,
    // not a per-level takings counter.
    this.currency = 0;
    this.teardown = [];
    this.enemies = [];
    this.warnings = [];
    this.warningMarkers = new Map();
    this.wave = null;
    this.levelSpec = null;
    this.bullets = [];
    this.firing = createFiringState();

    // Real upgrades and loadout, shared across scenes and persisted — not a
    // throwaway state rebuilt on every restart.
    this.profile = getPlayerProfile(this);

    // A dev jump can ask to arrive equipped, because the starting Cannon makes
    // a late level unreadable — 1-9's boss is 500 HP against 7 damage, so a
    // fresh tank needs 31s of perfect fire and reads as "the boss won't die".
    //
    // Gated on `sandbox` as well as `equipped`, deliberately: this replaces the
    // profile's upgrades for the run, and the only thing keeping that out of
    // the save is that a sandbox run never banks. Honouring `equipped` on its
    // own would hand a maxed profile straight to `bankLevelOutcome`.
    this.upgrades =
      this.sandbox && this.equipped
        ? maxedUpgradeState(this.profile.upgrades.money)
        : this.profile.upgrades;

    // `ScreenUpgrades.money` is a single running total that levels add to, so
    // the counter starts from what the player already has rather than at zero.
    // Starting at zero made banked money invisible: it persisted correctly and
    // the HUD showed 0 on every fresh level, which reads as "nothing saved".
    this.currency = this.upgrades.money;
    this.openingBalance = this.upgrades.money;

    // Re-derived from the slots, not read from the stored `primaryWeapon` —
    // `ScreenGame.as:460-469` picks slot 1 when it holds something and slot 2
    // otherwise, on every level start.
    //
    // The stored value cannot be trusted once an equip screen exists:
    // `ButtonEquipSlot` writes a slot and never touches `primaryWeapon`, so
    // equipping over slot 1 leaves it naming a weapon that is now in no slot.
    // Reading it would play the weapon the player just unequipped.
    this.currentSlot = resolveActiveSlot(this.profile.loadout);
    this.weapon = getWeapon(resolveActivePrimary(this.profile.loadout));
    this.weaponStats = this.weapon
      ? resolveWeaponStats(this.weapon, this.upgrades)
      : null;
    this.firePressed = false;
    this.kills = 0;
    this.mines = [];
    this.secondaryFiring = createFiringState();
    // From the loadout — `ScreenGame.secondaryWeapon`, which defaults to Mine.
    this.secondary = getSecondary(this.profile.loadout.secondaryWeapon);
    this.secondaryStats = this.secondary
      ? resolveSecondaryStats(this.secondary, this.upgrades)
      : null;
    this.secondaryPressed = false;
    this.outcome = createLevelOutcome();
    this.banked = false;
    this.lastWaveSignature = '';
    this.flag = null;
    this.flagMarker = null;
    this.enemyBullets = [];
    this.pendingDeathBlasts = [];
    this.hp = TANK_MAX_HP;
    this.pushedFrames = 0;
    // `resetTempVariables("LevelStart")` — three of these start true.
    this.levelFlags = createLevelFlags();
    this.banking = null;
    // `:2783-2787` — the shield does not survive a level.
    this.shield = createShieldState();
    this.shieldSprite = null;
    this.grenades = [];
  }

  create(): void {
    const controller = getViewportController(this);
    if (controller) applyViewportToScene(this, controller.current);

    // Before anything below reads roomWidth/roomHeight.
    this.resolveLevelSpec();

    // After resolveLevelSpec, and only after: the fill zoom is derived from
    // `roomWidth`, which is the fallback until the spec lands. On 1-1 the
    // fallback is also 640, so calling it earlier produced the right number by
    // coincidence and would have been wrong on every other narrow level.
    this.applyRoomFillZoom();

    this.physics.world.setBounds(0, 0, this.roomWidth, this.roomHeight);

    // Real extracted bitmap, tiled across the room, chosen by the level's own
    // theme — nine tiles, one per world. See levels/groundTexture.ts for why
    // Desert draws a 1024 upscale and the other eight the 256 extraction.
    const ground = groundFor(this.levelSpec?.theme);
    this.ground = this.add
      .tileSprite(0, 0, this.roomWidth, this.roomHeight, ground.key)
      .setOrigin(0, 0)
      .setDepth(0);
    // setTileScale, not setScale: the sprite still spans the room, and this
    // changes how many design units one texture repeat covers.
    this.ground.setTileScale(ground.tileScale, ground.tileScale);

    // Above the ground, below everything that moves. The margin is real world
    // the player cannot enter, so it is dimmed rather than left bright: with no
    // border art in the extraction, the change in brightness is the only thing
    // marking where the arena ends.
    this.outOfBounds = this.add.graphics().setDepth(0.5);

    const start = tankStartPosition(
      this.levelSpec?.mode ?? 'Normal',
      this.roomWidth,
      this.roomHeight,
    );
    this.player = new PlayerTank(
      this,
      start.x,
      start.y,
      this.roomWidth,
      this.roomHeight,
      this.upgrades,
    );

    this.pickups = this.physics.add.group();
    this.spawnPickups();

    this.startWave();

    // `ScreenGame.as:378` — `SoundManager.changeMusic = ScreenLevelSelect.levelMode`.
    // A direct assignment with no lookup table, because the five level-mode
    // track names *are* the five LevelMode values. Five of the eight tracks
    // (Normal, Flag, Tower, Defense, Boss) had no call site at all before this,
    // so only Menu, Win and Lose were ever requested.
    if (this.levelSpec) getSoundManager(this)?.setMusic(this.levelSpec.mode);

    this.setupCamera();
    this.setupInput();
    this.setupHud();

    const onResize = (): void => this.layout();
    GameEvents.on('viewport:changed', onResize);
    this.teardown.push(() => GameEvents.off('viewport:changed', onResize));

    this.teardown.push(
      GameEvents.subscribe('ui:goto', ({ key }) => {
        if (key === SceneKeys.Gameplay) {
          // Retry from the results overlay. The scene is paused at that point,
          // so it has to be resumed before the restart takes effect.
          if (this.outcome.finished) {
            this.scene.resume();
            // `sandbox` rides along: retrying a dev run must not become a
            // real one.
            this.scene.restart({
              world: this.world,
              level: this.level,
              difficulty: this.difficulty,
              sandbox: this.sandbox,
              equipped: this.equipped,
            });
          }
          return;
        }
        this.scene.resume();
        this.scene.start(key);
      }),
      GameEvents.subscribe('ui:start-game', ({ world, level, difficulty, sandbox, equipped }) => {
        // "Next level" from the results overlay.
        //
        // Gameplay has to listen for this itself. MainMenuScene and
        // LevelSelectScene are the only other subscribers and both are torn
        // down while a level is running, so the event reached nobody: the
        // overlay had already dismissed itself and the scene was paused by
        // the completion handler, leaving no UI and no input path. It looked
        // like a freeze; it was an event with no live listener.
        this.scene.resume();
        // Sandbox is sticky across "Next level". The Hud emits this without a
        // sandbox flag — it has no way to know, and giving React the run's
        // provenance to hand back would be a longer wire than the rule
        // deserves. Falling back to the current run means a chain of levels
        // entered from a dev jump stays off the save for its whole length,
        // which is the only useful reading: the player did not legitimately
        // reach level N+1 either.
        this.scene.restart({
          world,
          level,
          difficulty,
          sandbox: sandbox ?? this.sandbox,
          equipped: equipped ?? this.equipped,
        });
      }),
      GameEvents.subscribe('ui:set-audio', (change) => {
        setAudioOption(this, change);
      }),
      GameEvents.subscribe('ui:pause', ({ paused }) => {
        if (paused) this.scene.pause();
        else this.scene.resume();
      }),
    );

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const off of this.teardown) off();
      this.teardown = [];
      // Abandoned partway: the takings are forfeit, so put the HUD back to the
      // balance actually held rather than leaving unbanked money on screen.
      if (!this.outcome.finished && this.currency !== this.openingBalance) {
        GameEvents.emit('currency:earned', { amount: 0, total: this.openingBalance });
      }
      GameEvents.emit('scene:shutdown', { key: SceneKeys.Gameplay });
    });

    publishAudioOptions(this);
    GameEvents.emit('scene:ready', { key: SceneKeys.Gameplay });
    // The player's actual balance, not zero. Emitting a hardcoded 0 here made
    // the HUD show 0 on every level start until the first coin corrected it,
    // which read as "the save did not load".
    GameEvents.emit('currency:earned', { amount: 0, total: this.currency });
    GameEvents.emit('player:damaged', {
      amount: 0,
      health: this.hp,
      maxHealth: TANK_MAX_HP,
    });
    this.emitWaveState();
    GameEvents.emit('ammo:changed', {
      current: PLACEHOLDER_AMMO,
      capacity: PLACEHOLDER_AMMO,
      weapon: this.weapon?.name ?? 'Cannon',
    });
  }

  override update(time: number, delta: number): void {
    const cursors = this.cursors;
    const wasd = this.wasd;
    const input: PlayerInput = {
      up: (cursors?.up.isDown ?? false) || (wasd?.W.isDown ?? false),
      down: (cursors?.down.isDown ?? false) || (wasd?.S.isDown ?? false),
      left: (cursors?.left.isDown ?? false) || (wasd?.A.isDown ?? false),
      right: (cursors?.right.isDown ?? false) || (wasd?.D.isDown ?? false),
    };

    // `:2828` — any input at all ends the Idle achievement's run. Movement,
    // aiming and firing all count; the AS3 clears it on the same keyboard and
    // mouse state this reads.
    if (
      input.up ||
      input.down ||
      input.left ||
      input.right ||
      this.firePressed ||
      this.input.activePointer.isDown
    ) {
      this.levelFlags.nothingPressed = false;
    }

    const aim = this.pointerWorldPoint();

    // On a loss the tank is gone, so it neither drives nor shoots. On a win it
    // keeps playing — the AS3 leaves the level running so remaining coins can
    // be collected before the results screen.
    const destroyed = this.outcome.result === 'lost';

    if (!destroyed) {
      // Tower fixes the tank in place — PartGameArea.as:2816 skips moveTank
      // and calls tankAttack on the next line, so aiming and firing continue.
      this.player.drive(input, aim, delta, this.levelSpec?.mode !== 'Tower');
      if (aim) this.crosshair.setPosition(aim.x, aim.y).setVisible(true);

      this.updateFiring(delta);
      this.updateSecondary(delta);
      this.updateContactDamage(delta);
    }

    this.collectPickups();

    // Parallax: the ground scrolls slightly slower than the camera, which is
    // enough to read as depth without a second art layer.
    this.ground.setTilePosition(
      this.groundOffset.x + this.cameras.main.scrollX * 0.06,
      this.groundOffset.y + this.cameras.main.scrollY * 0.06,
    );

    this.updateWave(delta);

    this.updateStatusEffects(delta);

    for (const enemy of [...this.enemies]) {
      // Velocity and radius are required by `AimTank`, not optional: Medium and
      // Hard lead the tank's motion, and a zero default would silently be the
      // Easy rule on every difficulty.
      enemy.update(
        {
          x: this.player.x,
          y: this.player.y,
          xVel: this.player.xVelPerFrame,
          yVel: this.player.yVelPerFrame,
          radius: this.player.radius,
        },
        delta,
      );

      // `DamageAddict` bleeds itself to death inside `update`. Routed through
      // the same `removeEnemy(enemy, true)` the status-effect tick uses, so the
      // death is indistinguishable downstream — kill count, money drop, wave
      // accounting and the level-complete check all key off that one call.
      if (enemy.health <= 0) this.removeEnemy(enemy, true);
    }
    this.trackTankReachedBottom();
    this.resolveDefenseBreaches();
    this.resolveHealAuras();

    this.updateEnemyFire(delta);
    this.flushDeathBlasts();
    this.updateFlag(delta);
    this.updateOutcome(delta);
    this.emitWaveState();
    this.updateHud(delta);

    if (time - this.lastFpsEmit > FPS_EMIT_INTERVAL_MS) {
      this.lastFpsEmit = time;
      GameEvents.emit('debug:fps', { fps: Math.round(this.game.loop.actualFps) });
    }
  }

  /* ── setup ─────────────────────────────────────────────────────────────── */

  /**
   * Cosmetic zoom so a narrow room fills the window — prototype, see
   * `ROOM_FILL_PROTOTYPE_LEVELS`.
   *
   * Deliberately touches `camera.setZoom` and nothing else. The one place
   * gameplay reads the view (`cameraWidth`/`cameraHeight` fed to
   * `spawnPlacement`) takes `ViewportController`'s nominal viewport, which this
   * does not modify — so the off-camera spawn disqualifier still compares the
   * room against 640 and behaves identically zoomed or not.
   */
  private applyRoomFillZoom(): void {
    if (!roomFillEnabled(this.world, this.level)) return;
    const view = getViewportController(this)?.current;
    if (!view) return;
    this.cameras.main.setZoom(roomFillZoom(view, this.roomWidth));
  }

  private setupCamera(): void {
    const camera = this.cameras.main;
    this.applyCameraBounds();
    // lerp < 1 gives the soft trailing camera PartGameArea.as approximates
    // with its manual clamping, without the per-frame arithmetic.
    camera.startFollow(this.player, true, 0.12, 0.12);
    camera.setRoundPixels(false);
  }

  /**
   * Camera bounds, widened so a room smaller than the view stays centred.
   *
   * Phaser pins such a room flush against the viewport's left edge rather than
   * centring it, which reads as the map being cut off on the right — see
   * `centredCameraBounds`. Recomputed on resize because the view size is
   * window-dependent, so a bounds fixed at create time would be wrong the
   * moment the window changed.
   *
   * Physics bounds are untouched: this changes what is looked at, not where
   * anything may go.
   */
  private applyCameraBounds(): void {
    const camera = this.cameras.main;
    const bounds = centredCameraBounds(
      this.roomWidth,
      this.roomHeight,
      camera.width / camera.zoom,
      camera.height / camera.zoom,
    );
    camera.setBounds(bounds.x, bounds.y, bounds.width, bounds.height);

    // Ground covers the whole padded rect, so the screen is full of world
    // rather than background colour. `groundOffset` keeps the texture phase
    // aligned to the room's origin, so the floor inside the arena is identical
    // to what it was before the padding existed.
    this.groundOffset = { x: bounds.x, y: bounds.y };
    this.ground.setPosition(bounds.x, bounds.y).setSize(bounds.width, bounds.height);

    this.drawMargin(bounds);
  }

  /** Redraws the margin treatment. Cheap, and only on resize or a style change. */
  private drawMargin(bounds: { x: number; y: number; width: number; height: number }): void {
    this.outOfBounds.clear();
    if (this.marginStyle === 'none') return;

    const rects = outOfBoundsRects(bounds, this.roomWidth, this.roomHeight);

    if (this.marginStyle === 'flat') {
      this.outOfBounds.fillStyle(0x000000, OUT_OF_BOUNDS_ALPHA);
      for (const r of rects) this.outOfBounds.fillRect(r.x, r.y, r.width, r.height);
      return;
    }

    for (const rect of rects) {
      for (const band of marginGradientBands(rect, OUT_OF_BOUNDS_BANDS, OUT_OF_BOUNDS_ALPHA)) {
        this.outOfBounds.fillStyle(0x000000, band.alpha);
        this.outOfBounds.fillRect(band.x, band.y, band.width, band.height);
      }
    }
  }

  private setupInput(): void {
    // Aiming reticle — the extracted CustomCursor bitmap (symbol 166).
    this.crosshair = this.add
      .image(this.roomWidth / 2, this.roomHeight / 2, 'cursor')
      .setDisplaySize(28, 28)
      .setDepth(30)
      .setVisible(false);

    const keyboard = this.input.keyboard;
    if (!keyboard) {
      // Touch-only device. Virtual controls land later; movement is simply
      // unavailable rather than crashing.
      console.info('[GameplayScene] No keyboard plugin; aiming only.');
      return;
    }

    this.cursors = keyboard.createCursorKeys();
    this.wasd = keyboard.addKeys('W,A,S,D') as Record<
      'W' | 'A' | 'S' | 'D',
      Phaser.Input.Keyboard.Key
    >;

    // Stop arrow keys and space from scrolling the page underneath the canvas.
    keyboard.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'SPACE', 'W', 'A', 'S', 'D', 'E', 'M']);

    // Space is the *secondary* trigger — `Main.space` in the AS3, against
    // `Main.mouse` for the primary. It stood in for the primary while there was
    // no secondary to bind it to; now that Mine exists it goes back to its real
    // job, and E takes over as the mouseless primary trigger.
    keyboard.on('keydown-SPACE', () => {
      this.secondaryPressed = true;
    });
    keyboard.on('keyup-SPACE', () => {
      this.secondaryPressed = false;
    });

    keyboard.on('keydown-E', () => {
      this.firePressed = true;
    });
    keyboard.on('keyup-E', () => {
      this.firePressed = false;
    });

    // Q toggles the two equipped slots, and refuses when the other is empty —
    // `ScreenGame.update`. Fill the second slot on the upgrades screen.
    keyboard.on('keydown-Q', () => this.cycleWeapon());

    if (import.meta.env.DEV) {
      // Cycles the margin treatment in place, so the three can be judged
      // against each other on one screen rather than by rebuilding between
      // them. Remove with the other dev aids before release.
      keyboard.on('keydown-G', () => {
        const next = (MARGIN_STYLES.indexOf(this.marginStyle) + 1) % MARGIN_STYLES.length;
        this.marginStyle = MARGIN_STYLES[next];
        this.applyCameraBounds();
        console.info(`[GameplayScene] margin style: ${this.marginStyle}`);
      });
    }

    if (import.meta.env.DEV) {
      // Dev-only: destroy the tank, so the defeat path is reachable at all.
      // Contact is the only ported damage source and it is capped by enemy
      // count — level 1-1 is 10 enemies at 5 damage against 100 HP, so losing
      // is arithmetically impossible until shooting enemies are ported.
      // Delete this with the rest of the dev aids.
      // Dev-only: fund the shop. Replaces the old "own every primary" grant —
      // buying weapons is the real path now, and grants made the shop a no-op.
      keyboard.on('keydown-M', () => {
        this.currency += DEV_MONEY_GRANT;
        GameEvents.emit('currency:earned', {
          amount: DEV_MONEY_GRANT,
          total: this.currency,
        });
        console.info(`[GameplayScene] Dev: +${DEV_MONEY_GRANT} coins (banked on finish).`);
      });

      keyboard.on('keydown-K', () => {
        this.hp = 0;
        GameEvents.emit('player:damaged', {
          amount: 0,
          health: 0,
          maxHealth: TANK_MAX_HP,
        });
      });
    }
  }

  private setupHud(): void {
    // In-canvas text: it scrolls and scales with the world camera, so it stays
    // welded to the play area. Menu text lives in React instead.
    this.hudText = this.add
      .text(0, 0, '', {
        fontFamily: '"SWFMainFont", sans-serif',
        fontSize: '18px',
        color: '#fff4d6',
        stroke: '#2b1d05',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.layout();
  }

  /**
   * Prepares the wave for this level. Enemies now arrive progressively rather
   * than all at once: the pool is drawn without replacement, paced by the
   * level's own spawn interval, each announced by a warning marker.
   */
  /**
   * Resolves the level and adopts its room size.
   *
   * Must run before anything that sizes the world — physics bounds, the ground
   * tile, the tank's clamp and the camera all take the room's extent, and they
   * are built at the top of `create()`. This used to sit inside `startWave()`,
   * which runs after all of them, so the room size could not come from the spec
   * and was hardcoded to 640x960 instead.
   */
  private resolveLevelSpec(): void {
    // Dev levels are synthetic specs, not table rows. Guarded so they cannot
    // be reached in a production build even if something asks for one.
    const spec =
      (import.meta.env.DEV ? devLevelSpec(this.world, this.level) : null) ??
      getLevel(this.world, this.level);

    this.levelSpec = spec ?? null;
    this.roomWidth = spec?.roomWidth ?? FALLBACK_ROOM.width;
    this.roomHeight = spec?.roomHeight ?? FALLBACK_ROOM.height;
  }

  private startWave(): void {
    const world = this.world;
    const level = this.level;
    const spec = this.levelSpec;
    if (!spec) return;

    this.wave = createWaveState(spec);
    // `:305-308` — set at level start from the level's own boss count, not by
    // watching three bosses be alive together. It is a property of the level,
    // so a Boss level with two bosses can never earn BossOnlySpecial however it
    // is played.
    this.levelFlags.threeBosses = this.wave.bossAmount >= 3;
    this.spawnRng = new Phaser.Math.RandomDataGenerator([`spawn-${world}-${level}`]);

    console.info(
      `[GameplayScene] Wave ${world}-${level} (${spec.mode}): ` +
        `${spec.totalEnemies} enemies, interval ${spec.spawnInterval} frames, ` +
        `${spec.enemies.map((e) => `${e.count}x${e.type}${e.level}`).join(', ')}`,
    );
  }

  /** Draws, places and announces one enemy when the wave allows it. */
  private updateWave(deltaMs: number): void {
    const wave = this.wave;
    const spec = this.levelSpec;
    if (!wave || !spec) return;

    const random = (): number => this.spawnRng.frac();

    tickWave(wave, deltaMs);

    if (canSpawn(wave)) {
      const drawn = drawEnemy(wave, { countsByType: this.livePopulation() }, random);
      if (drawn) {
        // The *live* viewport, not the AS3's 640x400 stage. This port's camera
        // height is `renderHeight / zoom` and varies with the window, so a
        // constant here protects the wrong rectangle and spawns land on screen.
        const view = getViewportController(this)?.current;
        const placement = placeWarning({
          mode: spec.mode,
          roomWidth: this.roomWidth,
          roomHeight: this.roomHeight,
          cameraWidth: view?.logicalWidth ?? this.cameras.main.width / this.cameras.main.zoom,
          cameraHeight: view?.logicalHeight ?? this.cameras.main.height / this.cameras.main.zoom,
          isBoss: drawn.level === 'B',
          countDownDone: wave.countDownDone,
          random,
        });

        const warning = createWarning({ ...drawn, ...placement });
        this.warnings.push(warning);
        this.addWarningMarker(warning);
        registerSpawn(wave);
      }
    }

    this.advanceWarnings(deltaMs);
  }

  /** Counts down the markers and spawns whatever has matured. */
  private advanceWarnings(deltaMs: number): void {
    if (this.warnings.length === 0) return;

    const { pending, matured } = tickWarnings(this.warnings, deltaMs);

    // tickWarnings returns fresh objects, so remap the markers by index.
    const markers = this.warnings.map((w) => this.warningMarkers.get(w));
    this.warningMarkers.clear();
    for (const [index, warning] of this.warnings.entries()) {
      const marker = markers[index];
      const stillPending = pending.find(
        (p) => p.x === warning.x && p.y === warning.y && p.type === warning.type,
      );
      if (stillPending && marker) {
        this.warningMarkers.set(stillPending, marker);
        marker.setScale(warningScale(stillPending) * 0.5);
      } else if (marker) {
        marker.destroy();
      }
    }

    this.warnings = pending;
    for (const warning of matured) this.spawnFromWarning(warning);
  }

  private addWarningMarker(warning: Warning): void {
    const marker = this.add
      .image(warning.x, warning.y, 'particle-dot')
      .setDisplaySize(34, 34)
      .setTint(0xff5252)
      .setAlpha(0.75)
      .setDepth(6);
    this.warningMarkers.set(warning, marker);
  }

  private spawnFromWarning(warning: Warning): void {
    const wave = this.wave;
    const spec = this.levelSpec;
    if (!wave || !spec) return;

    const enemy = Enemy.spawn(this, {
      type: warning.type,
      level: warning.level,
      difficulty: this.difficulty,
      mode: spec.mode,
      roomWidth: this.roomWidth,
      roomHeight: this.roomHeight,
      x: warning.x,
      y: warning.y,
      wall: warning.wall,
    });

    if (enemy) {
      this.enemies.push(enemy);
      registerEnemySpawned(wave);
    }
  }

  /**
   * The pointer's current world position, recomputed every frame.
   *
   * Deliberately not `pointer.worldX/worldY`: Phaser writes those in exactly
   * one place — `InputManager.hitTest`, reached only from
   * `InputPlugin.hitTestPointer` during pointer *event* processing. Nothing
   * refreshes them when the camera scrolls, so with the mouse held still while
   * the tank drives, the aim point stays pinned to the world position the
   * cursor was last over instead of tracking the cursor on screen.
   *
   * `camera.getWorldPoint` applies the current camera transform to the
   * pointer's screen coordinates, which is correct on every frame.
   */
  private pointerWorldPoint(): Phaser.Math.Vector2 | null {
    const pointer = this.input.activePointer;
    if (!pointer.active) return null;
    // Reuses a scratch vector; getWorldPoint writes into the output argument.
    return this.cameras.main.getWorldPoint(pointer.x, pointer.y, this.aimScratch);
  }

  /**
   * Fires while held, advances bullets, and resolves hits.
   *
   * The AS3 fires on `Main.mouse`; here either the pointer or Space works so
   * the scene is usable without a mouse.
   */
  private updateFiring(deltaMs: number): void {
    tickFiring(this.firing, deltaMs);

    const held = this.input.activePointer.isDown || this.firePressed;
    const before = this.firing.reloadTime;
    if (held && this.weapon && this.weaponStats) {
      const shots = fire(this.firing, this.weapon, this.weaponStats, {
        x: this.player.x,
        y: this.player.y,
        towerRotation: this.player.towerRotationDegrees,
        // Only the Flamethrower consumes these; every other spec ignores them.
        tankXVel: this.player.xVelPerFrame,
        tankYVel: this.player.yVelPerFrame,
      });

      // A beam has nothing in flight: it resolves entirely on the frame it
      // fires, so it never becomes a Bullet.
      if (shots.length > 0 && this.weapon.isBeam) {
        this.fireBeam();
        this.advanceBullets(deltaMs);
        return;
      }

      if (shots.length > 0) {
        // An empty key means the weapon has no one-shot report — the
        // Flamethrower drives a sustained loop the port does not have yet.
        if (this.weapon.sound) getSoundManager(this)?.queue(this.weapon.sound);
        const bulletClass = this.weapon.bulletClass ?? 'Bullet';
        // Range is a distance in the table; a flame's life is that distance
        // divided by its speed. See weapons/flames.ts.
        // The multiplier has to reach the flame itself, not just the range it
        // was derived from — the density rule overwrites lifetime two frames
        // in, and would otherwise discard it. See FLAME_RANGE_MULTIPLIER.
        const flame = this.weapon.isFlame
          ? {
              lifetimeMax: flameLifetimeMax(
                this.weaponStats.flameRange ?? 0,
                this.weapon.bulletSpeed,
              ),
              rangeMultiplier: FLAME_RANGE_MULTIPLIER,
            }
          : null;
        for (const spec of shots) {
          this.bullets.push(
            new Bullet(this, spec, this.roomWidth, this.roomHeight, bulletClass, flame),
          );
        }
      }
    }

    // `:3732-3739` — recorded on a shot actually leaving the barrel, which is
    // what the reload clock moving tells us. Holding fire through a reload sets
    // nothing, so a level spent with the button down but never able to fire
    // still counts as no weapons used.
    if (this.firing.reloadTime > before) {
      if (this.weapon?.name === 'Timed Bomb Cannon') {
        this.levelFlags.timedBombsFired = true;
      } else {
        this.levelFlags.otherThanTimedBombsFired = true;
      }
      // A *primary* ends "specials only"; a secondary above does not.
      this.levelFlags.onlySpecialWeapons = false;
      this.levelFlags.noWeaponsUsed = false;
    }

    this.advanceBullets(deltaMs);
  }

  /**
   * Lays down the laser segment and damages everything on it, once.
   *
   * The AS3 restricts hits to enemies inside the camera view (`:5565`), which
   * matters because the beam is 1000 units long and outruns the screen.
   */
  private fireBeam(): void {
    if (!this.weaponStats) return;

    const beam = createBeam(
      this.player.x,
      this.player.y,
      this.player.towerRotationDegrees,
    );

    getSoundManager(this)?.queue('WeaponLaser');
    this.drawBeam(beam);

    const targets = this.enemies.map((enemy) => ({
      x: enemy.x,
      y: enemy.y,
      radius: enemy.radius,
    }));

    const view = this.cameras.main.worldView;
    const onScreen = (_t: { x: number; y: number }, i: number): boolean => {
      const enemy = this.enemies[i];
      // `:6195` — ground hazards and the beam skip untargetable enemies too.
      return enemy.targetable && view.contains(enemy.x, enemy.y);
    };

    // Snapshot first: removing an enemy mid-loop would shift the indices.
    const caught = findBeamHits(beam, targets, onScreen).map((i) => this.enemies[i]);

    for (const enemy of caught) {
      // Immune enemies take nothing at all — the AS3 gates the whole block on
      // `laserDamageMultiplier > 0`.
      if (enemy.damageMultipliers.Laser <= 0) continue;

      // Unlike fire, the laser thaws *and* damages.
      if (enemy.status.frozen) {
        enemy.status.frozen = false;
        enemy.status.frozenTimer = 0;
      }

      getSoundManager(this)?.queue('ImpactLaser');
      const result = applyBulletDamage(
        enemy.health,
        this.weaponStats.damage,
        enemy.damageMultipliers,
        'Laser',
      );
      enemy.setHealth(result.health);

      if (result.killed) {
        this.removeEnemy(enemy, true);
      } else {
        enemy.flashDamage(impactFeedback(enemy.damageMultipliers, 'Laser'));
      }
    }
  }

  /** Stand-in visual: the extracted BulletLaser art is not among the assets. */
  private drawBeam(beam: ReturnType<typeof createBeam>): void {
    const line = this.add
      .line(0, 0, beam.start.x, beam.start.y, beam.end.x, beam.end.y, 0xff3b6b)
      .setOrigin(0, 0)
      .setLineWidth(beam.radius / 2)
      .setDepth(13)
      .setAlpha(0.9);

    this.tweens.add({
      targets: line,
      alpha: 0,
      duration: 140,
      onComplete: () => line.destroy(),
    });
  }

  /**
   * Re-acquires and steers a homing round.
   *
   * `:1716` only rescans when the current target is gone — null, destroyed,
   * invisible, teleporting or off-screen — so a round keeps its target while
   * it remains valid rather than re-picking the nearest every frame.
   */
  private steerMagic(bullet: Bullet): void {
    const view = this.cameras.main.worldView;
    // `:4115` and `:1720` both filter candidates on screen presence *and*
    // targetability. The second half used to be missing here, with a comment
    // saying `invisible` and `teleporting` came from the unported loop and no
    // enemy set them. Ghost and ScaredGhost set them now.
    const valid = (enemy: Enemy): boolean =>
      enemy.active &&
      this.enemies.includes(enemy) &&
      enemy.targetable &&
      view.contains(enemy.x, enemy.y);

    let target = bullet.magicTarget as Enemy | null;
    // ── Deliberate divergence from the AS3 ────────────────────────────────
    // `:1716` drops the current target when it is null, gone, invisible, or
    // **not teleporting** — that last clause is missing its negation. Every
    // other site writes `!(x.teleporting == null || !x.teleporting)` for "is
    // teleporting"; there it is un-negated, so the clause is true for almost
    // every enemy and the round re-picks a target every single frame.
    //
    // `:1743` and `:1766` get it right, so the original disagrees with itself.
    // Fixed rather than reproduced: unlike Group A's stat quirks this changes
    // how a shipped weapon behaves, and holding a target is plainly the intent
    // of a homing round. `enemyVisibility.test.ts` asserts the target persists.
    if (!target || !valid(target)) {
      const targets = this.enemies.map((enemy) => ({
        x: enemy.x,
        y: enemy.y,
        radius: enemy.radius,
      }));
      const index = findMagicTarget(
        { x: bullet.x, y: bullet.y },
        targets,
        // On screen and not already chained through. `invisible` and
        // `teleporting` come from the unported loop and no enemy sets them.
        (_t, i) => valid(this.enemies[i]) && !bullet.hasHit(this.enemies[i]),
      );
      target = index === -1 ? null : this.enemies[index];
      bullet.magicTarget = target;
    }

    if (!target) return;

    // Instant turn at full speed — the AS3 overwrites velocity outright.
    const { xVel, yVel } = magicVelocity(
      { x: bullet.x, y: bullet.y },
      { x: target.x, y: target.y },
      bullet.speedPerFrame,
    );
    bullet.steer(xVel, yVel);
  }

  private advanceBullets(deltaMs: number): void {
    if (this.bullets.length === 0) return;

    const surviving: Bullet[] = [];

    // `enemy.onFire` — reset before the bullet loop at `PartGameArea.as:5554`,
    // so it is a same-frame dedup flag rather than a status effect. It stops
    // several overlapping flames all burning one enemy in a single frame.
    const burnedThisFrame = new Set<Enemy>();

    // `enemy.hitByCake`, reset alongside `onFire` at `:5556`. One cake burst
    // per enemy per frame; later fragments touching the same enemy pass
    // through instead of re-bursting, which is what stops the cascade running
    // away when a ring spawns on top of a crowd.
    const cakedThisFrame = new Set<Enemy>();
    const spawnedPieces: Bullet[] = [];

    // Flame positions for the density rule; every bullet counts, as in the AS3.
    const flamePoints = this.bullets.map((b) => ({ x: b.x, y: b.y }));

    for (const bullet of this.bullets) {
      if (!bullet.advance(deltaMs)) {
        bullet.destroy();
        continue;
      }

      // Homing runs before flight, so a newly acquired target is steered to on
      // the same frame the old one died.
      if (bullet.isSeeking) this.steerMagic(bullet);

      // A flame dies on its own timer, not at the border. Counting its
      // neighbours here is what implements the density rule — a lone flame is
      // cut short two frames after it leaves the muzzle.
      if (bullet.isFlame) {
        let crowd = 0;
        for (const point of flamePoints) {
          if (Math.hypot(point.x - bullet.x, point.y - bullet.y) < FLAME_CROWD_RADIUS) {
            crowd += 1;
          }
        }
        if (!bullet.advanceFlameLife(deltaMs, crowd)) {
          bullet.destroy();
          continue;
        }
      }

      const targets = this.enemies.map((enemy) => ({
        x: enemy.x,
        y: enemy.y,
        radius: enemy.radius,
      }));
      // Two reasons to skip an otherwise valid target:
      //   - a penetrating round would re-trigger every frame it spent inside
      //     an enemy it has already damaged
      //   - a bomb round passes straight over anything already carrying one,
      //     because `:5826` guards the whole attach block on `!gotBomb`
      let canHit: ((target: HitTarget, i: number) => boolean) | undefined;
      // `:5552` gates the whole bullet loop on targetability, so this applies
      // to every bullet kind before any per-weapon rule below.
      const reachable = (i: number): boolean => this.enemies[i].targetable;

      if (bullet.isFlame) canHit = (_t, i) => reachable(i) && !burnedThisFrame.has(this.enemies[i]);
      // `:5917` — a magic round damages anything before it has a target, and
      // only its target once it does. Never the same enemy twice.
      else if (bullet.isMagic) {
        canHit = (_t, i) => {
          const enemy = this.enemies[i];
          if (!enemy.targetable || bullet.hasHit(enemy)) return false;
          return bullet.magicTarget === null || bullet.magicTarget === enemy;
        };
      }
      else if (bullet.penetrates) canHit = (_t, i) => reachable(i) && !bullet.hasHit(this.enemies[i]);
      else if (bullet.attachesBomb)
        canHit = (_t, i) => reachable(i) && !this.enemies[i].status.gotBomb;
      else canHit = (_t, i) => reachable(i);

      // A flame keeps burning for its whole life and hits everything it
      // overlaps, so it resolves against every target rather than the first.
      // It never records hits — there is no already-hit list for fire, only
      // the per-frame flag, so one flame burns the same enemy every frame.
      if (bullet.isFlame) {
        // Resolve indices to enemies *before* burning any of them: burnEnemy
        // can kill, which splices the live array and leaves every later index
        // pointing at the wrong enemy — or past the end. Same snapshot rule
        // queueExplosion already follows.
        const caught = findAllHits(bullet.hitState, targets, canHit).map(
          (i) => this.enemies[i],
        );
        for (const enemy of caught) {
          burnedThisFrame.add(enemy);
          this.burnEnemy(enemy, bullet);
        }
        surviving.push(bullet);
        continue;
      }

      const index = findHit(bullet.hitState, targets, canHit);

      if (index === -1) {
        surviving.push(bullet);
        continue;
      }

      const struck = this.enemies[index];

      // A bomb round does nothing on contact: direct damage is closed by
      // `explosion == true` and the impact blast excludes BulletBomb, so the
      // attachment is its entire effect. The blast comes later, from the
      // status tick, wherever the host has walked to by then.
      if (bullet.attachesBomb) {
        applyBomb(struck.status, {
          bombTimer: bullet.bombTimer,
          explosionRadius: bullet.explosionRadius,
          damage: bullet.damage,
        });
        getSoundManager(this)?.queue('ImpactTimedBomb');
      }
      // An exploding round deals no direct damage — the AS3 branches on
      // `theBullet.explosion == false` for the direct path and only queues a
      // blast otherwise. See weapons/explosions.ts.
      else if (bullet.explodes) this.queueExplosion(bullet);
      else this.hitEnemy(struck, bullet);

      // A magic round chains: it damages, spends one of its targets, and
      // carries on unless that was the last. `:5822` evaluates the budget
      // *before* the decrement, so `targetsLeft == 1` means this hit is final.
      if (bullet.isMagic) {
        this.hitEnemy(struck, bullet);
        getSoundManager(this)?.queue('ImpactMagic');

        const wasFinal = bullet.onFinalTarget;
        bullet.recordHit(struck);
        bullet.registerMagicHit();

        // `:5949` nudges the round forward a frame so it clears the enemy it
        // just hit rather than sitting inside it.
        bullet.advance((1000 / 30) * 1);

        if (wasFinal) bullet.destroy();
        else surviving.push(bullet);
        continue;
      }

      // A cake round bursts into a ring around the enemy — but only the first
      // one to reach it this frame. `:5822` folds `hitByCake` into the
      // `dead = true` condition, so a later fragment neither bursts nor dies.
      // `:5678` — the parent cake round striking a DamageAddict, before the
      // burst. DamageAddict is immune to damage, so this is the only trace the
      // hit leaves.
      if (struck.enemyType === 'DamageAddict') {
        this.levelFlags.damageAddictEnemyCake = true;
      }

      if (bullet.burstsIntoCake) {
        if (!cakedThisFrame.has(struck)) {
          cakedThisFrame.add(struck);
          this.burstCake(bullet, struck, spawnedPieces);
          bullet.destroy();
        } else {
          surviving.push(bullet);
        }
        continue;
      }

      // `dead = true` at PartGameArea.as:5822 is guarded by an exclusion list
      // that BulletPenetrate is on, so it carries on instead of being removed.
      if (bullet.penetrates) {
        bullet.recordHit(struck);
        surviving.push(bullet);
      } else {
        bullet.destroy();
      }
    }

    // Fragments join at the end, so they cannot burst again in the frame that
    // created them.
    this.bullets = [...surviving, ...spawnedPieces];
  }

  /**
   * Shatters a cake round into its ring of fragments around the enemy it hit.
   *
   * Damage lands first, then the burst — the parent still hits for its own
   * value on the way in. Fragments carry the parent's piece count, so any of
   * them can burst again on another enemy; see weapons/cake.ts.
   */
  private burstCake(bullet: Bullet, struck: Enemy, out: Bullet[]): void {
    this.hitEnemy(struck, bullet);

    // The enemy may have died to that hit; the ring still spawns around where
    // it was, which is what the AS3 does — the burst block runs off the
    // bullet's target regardless of the kill.
    const pieces = spawnCakePieces(
      {
        pieces: bullet.cakePieces,
        damage: bullet.damage,
        // Only the parent round halves; a fragment passes its damage on.
        isParent: bullet.isCakeParent,
      },
      { x: struck.x, y: struck.y, radius: struck.radius },
    );

    getSoundManager(this)?.queue('ImpactCake');
    for (const piece of pieces) {
      out.push(new Bullet(this, piece, this.roomWidth, this.roomHeight, 'BulletCakePiece'));
    }
  }

  /**
   * Ticks every enemy's poison/bomb/freeze timers and acts on the result.
   *
   * Poison damage is applied here rather than in `Enemy` so that a kill goes
   * through the same `removeEnemy` path as any other, and a bomb blast reaches
   * `spawnExplosion` — which is what lets it damage neighbours, not just its
   * host.
   */
  private updateStatusEffects(deltaMs: number): void {
    if (this.enemies.length === 0) return;

    const blasts: ExplosionSpec[] = [];

    for (const enemy of [...this.enemies]) {
      const result = enemy.tickStatus(deltaMs);

      if (result.damage > 0) {
        enemy.takeDamage(result.damage);
        if (enemy.health <= 0) this.removeEnemy(enemy, true);
      }

      blasts.push(...result.explosions);
    }

    // Deferred: a bomb can kill its own host, and spawning the blast inside the
    // loop above would mutate `this.enemies` while it is being walked.
    for (const blast of blasts) this.spawnExplosion(blast);
  }

  /**
   * The secondary weapon: places mines on Space, then detonates any an enemy
   * has walked into.
   *
   * Mines are checked *after* placement in the same frame, matching the AS3's
   * ordering — `tankAttack` runs before `handleMines`. In practice a mine
   * dropped under the tank cannot detonate on the placing frame anyway, since
   * an enemy that close would already have hit the tank.
   */
  /**
   * Raises the shield — `:4102-4107`.
   *
   * Consumes the cooldown the same way `placeMine` does, so the two secondaries
   * share one clock rather than each inventing a gate. Returns whether it fired,
   * which is what the achievement flags key off.
   */
  private raiseShield(): boolean {
    if (!this.secondaryStats) return false;

    this.shield = raiseShield(this.secondaryStats.duration);
    return this.shield.on;
  }

  /**
   * Throws a grenade at the cursor — `:4001-4056`.
   *
   * Consumes the shared secondary cooldown the same way the other two do. The
   * aim point is the live pointer in world units; see `throwGrenade` for why the
   * AS3's camera correction has no counterpart here.
   */
  private throwGrenade(): boolean {
    if (!this.secondaryStats) return false;

    const aim = this.pointerWorldPoint();
    if (!aim) return false;

    const state = throwGrenade({
      tankX: this.player.x,
      tankY: this.player.y,
      towerRotation: this.player.towerRotationDegrees,
      targetX: aim.x,
      targetY: aim.y,
      radius: GRENADE_RADIUS,
    });

    const sprite = this.add
      .image(state.x, state.y, 'particle-dot')
      .setDisplaySize(state.radius * 3, state.radius * 3)
      .setTint(0xb8d96a)
      .setDepth(GRENADE_DEPTH);

    this.grenades.push({
      state,
      sprite,
      // `:4084-4096` — one queue entry per variant, differing only in the
      // channel and the payload. Ice passes 0 for effectDamage, as the AS3 does.
      blast: {
        radius: this.secondaryStats.explosionRadius,
        damage: this.secondaryStats.damage,
        type: this.secondary?.explosionType ?? 'Normal',
        smallSound: false,
        effectTime: this.secondaryStats.effectTime,
        effectDamage: this.secondaryStats.effectDamage,
      },
    });
    return true;
  }

  /**
   * Advances every grenade and detonates the ones whose fuse has run out.
   *
   * Position is integrated *before* the decay, matching `:1810` sitting above
   * the grenade branch — so a frame travels at the previous frame's speed.
   */
  private updateGrenades(deltaMs: number): void {
    if (this.grenades.length === 0) return;

    const frames = (deltaMs / 1000) * 30;
    const surviving: typeof this.grenades = [];

    for (const entry of this.grenades) {
      const { xVel, yVel } = grenadeVelocity(entry.state);
      const moved = {
        ...entry.state,
        x: entry.state.x + xVel * frames,
        y: entry.state.y + yVel * frames,
      };

      const walled = bounceGrenade(moved, {
        roomWidth: this.roomWidth,
        roomHeight: this.roomHeight,
      });

      const ticked = tickGrenade(walled, frames);
      if (ticked.detonated) {
        this.spawnExplosion({ ...entry.blast, x: ticked.state.x, y: ticked.state.y });
        entry.sprite.destroy();
        continue;
      }

      entry.state = ticked.state;
      entry.sprite
        .setPosition(ticked.state.x, ticked.state.y)
        .setRotation(Phaser.Math.DegToRad(ticked.state.spin));
      surviving.push(entry);
    }

    this.grenades = surviving;
  }

  /**
   * Runs the spawn path for a secondary's kind.
   *
   * A `switch` on the declared kind, not a chain of tests against spec shape.
   * The previous version read the shape — a count meant a fan, an explosion
   * channel meant a throw — which was already wrong for Magic Bunny, whose
   * count is a chain length. `SecondaryKind` is exhaustive, so a sixth kind is
   * a compile error here rather than a weapon that silently runs the wrong
   * spawn.
   */
  private useSecondary(kind: SecondaryKind): boolean {
    switch (kind) {
      case 'shield':
        return this.raiseShield();
      case 'thrown':
        return this.throwGrenade();
      case 'fan':
        return this.fireSpikes();
      case 'chain':
        return this.fireChainRound();
      case 'mine':
        return this.placeMine();
    }
  }

  /**
   * Fires one chaining round — `:4233-4256`.
   *
   * `Bullet` gives any spec with `targets > 0` the whole chain-homing path
   * (`Bullet.ts:78`): the retarget search, the hit-once tracking and the
   * final-target death rule all come from the Magic Cannon's wiring. Setting
   * the count is the entire mechanic.
   */
  private fireChainRound(): boolean {
    if (!this.secondaryStats) return false;

    const stats = this.secondaryStats;
    const heading = (this.player.towerRotationDegrees * Math.PI) / 180;
    const offset = CHAIN_MUZZLE_OFFSET + CHAIN_RADIUS;

    this.bullets.push(
      new Bullet(
        this,
        {
          x: this.player.x + Math.cos(heading) * offset,
          y: this.player.y + Math.sin(heading) * offset,
          xVel: Math.cos(heading) * CHAIN_SPEED,
          yVel: Math.sin(heading) * CHAIN_SPEED,
          rotation: this.player.towerRotationDegrees,
          speed: CHAIN_SPEED,
          radius: CHAIN_RADIUS,
          damage: stats.damage,
          explosion: false,
          explosionRadius: 0,
          penetrates: false,
          bombTimer: 0,
          freezeTime: 0,
          poisonTime: 0,
          poisonDamage: 0,
          cakePieces: 0,
          // The whole mechanic — see `Bullet.ts:78`.
          targets: stats.count,
        },
        this.roomWidth,
        this.roomHeight,
        'BulletMagicBunny',
      ),
    );
    return true;
  }

  /**
   * Fires a radial burst — `:4058-4098`.
   *
   * Ordinary bullets on the shared secondary cooldown: they travel, hit, and
   * die at the border through the same paths every other round uses. The only
   * thing the fan adds is where they start and which way they point.
   */
  private fireSpikes(): boolean {
    if (!this.secondaryStats) return false;

    const stats = this.secondaryStats;
    // Icicles carry a freeze, Poison Spikes a poison; the spec's tracks decide
    // which, so the fan needs no branch of its own.
    const freezing = this.secondary?.upgradeId === 'Icicles';

    const spikes = spawnFan({
      tankX: this.player.x,
      tankY: this.player.y,
      count: stats.count,
      damage: stats.damage,
      freezeTime: freezing ? stats.effectTime : 0,
      poisonTime: freezing ? 0 : stats.effectTime,
      poisonDamage: freezing ? 0 : stats.effectDamage,
    });

    for (const spike of spikes) {
      this.bullets.push(
        new Bullet(
          this,
          spike,
          this.roomWidth,
          this.roomHeight,
          freezing ? 'BulletIcicle' : 'BulletPoisonSpike',
        ),
      );
    }
    return spikes.length > 0;
  }

  private placeMine(): boolean {
    if (!this.secondaryStats) return false;

    this.mines.push(
      new Mine(this, placeMine(this.secondaryStats, { x: this.player.x, y: this.player.y })),
    );
    return true;
  }

  /**
   * Draws the ring, following the tank and fading out over the last 120 frames.
   *
   * Created on demand rather than at level start: most levels never raise a
   * shield, and an invisible sprite following the tank all game is a cost with
   * no payoff.
   */
  private updateShieldSprite(): void {
    if (!this.shield.on) {
      this.shieldSprite?.destroy();
      this.shieldSprite = null;
      return;
    }

    if (!this.shieldSprite) {
      this.shieldSprite = this.add
        .image(this.player.x, this.player.y, 'particle-dot')
        .setDisplaySize(this.player.radius * 4, this.player.radius * 4)
        .setTint(0x6ee7ff)
        .setDepth(SHIELD_DEPTH);
    }

    this.shieldSprite
      .setPosition(this.player.x, this.player.y)
      .setAlpha(shieldAlpha(this.shield) * 0.45);
  }

  private updateSecondary(deltaMs: number): void {
    tickFiring(this.secondaryFiring, deltaMs);

    // `:1008-1042` — the window runs down whether or not the trigger is held.
    this.shield = tickShield(this.shield, (deltaMs / 1000) * 30);
    this.updateShieldSprite();
    this.updateGrenades(deltaMs);

    // `:3979-3986` — the cooldown gate and the achievement flags sit *above* the
    // weapon dispatch, so a press that passes the gate counts as a weapon use
    // whatever the weapon then decides to do. Only the sound is per-weapon.
    //
    // The port used to gate inside each spawn method and set the flags on
    // success. Identical while every secondary always spawns — which was true
    // until Rockets, which declines when nothing on screen is targetable and
    // still burns `noWeaponsUsed` in the original.
    if (this.secondaryPressed && this.secondaryStats && this.secondary) {
      if (this.secondaryFiring.reloadTime <= 0) {
        this.secondaryFiring.reloadTime += this.secondaryStats.reloadTimeMax;
        this.levelFlags.otherThanTimedBombsFired = true;
        this.levelFlags.noWeaponsUsed = false;

        // The weapon decides only whether it spawns. Returning false refunds
        // the cooldown — `:4169` sets `reloadTimeSecondary = 0`, which is
        // exactly a refund because the gate above guarantees it was zero.
        if (this.useSecondary(this.secondary.kind)) {
          getSoundManager(this)?.queue(this.secondary.sound);
        } else {
          this.secondaryFiring.reloadTime = 0;
        }
      }
    }

    if (this.mines.length === 0) return;

    // `:1058` — a mine does not detonate on an invisible or teleporting enemy.
    // The comment here used to say no enemy set those flags; Ghost and
    // ScaredGhost set them now, so the filter is real rather than anticipatory.
    const targets = this.enemies
      .filter((enemy) => enemy.targetable)
      .map((enemy) => ({
        x: enemy.x,
        y: enemy.y,
        radius: enemy.radius,
      }));

    const { mines, detonations } = sweepMines(
      this.mines.map((mine) => mine.spec),
      targets,
    );

    if (detonations.length === 0) return;

    const survivors = new Set(mines);
    this.mines = this.mines.filter((mine) => {
      if (survivors.has(mine.spec)) return true;
      mine.destroy();
      return false;
    });

    // `:6628` — the achievement needs the *mine's* blast to be what killed a
    // Trap, so the parentage is checked here rather than in the shared
    // explosion path, which has no idea what spawned it.
    const trapsBefore = new Set(
      this.enemies.filter((e) => e.enemyType === 'Trap' && e.active),
    );
    for (const spec of detonations) this.spawnExplosion(spec);
    if (trapsBefore.size > 0) {
      for (const trap of trapsBefore) {
        if (!trap.active) this.levelFlags.trapEnemyMineKill = true;
      }
    }
  }

  /**
   * Enemy contact damage.
   *
   * Non-bosses die on contact and pay nothing — a suicide attack, so the only
   * way to earn from an enemy is to kill it first.
   */
  /**
   * Medics topping up everything damaged around them.
   *
   * The loop lives here rather than on the entity because a Medic has to see
   * its peers. `PartGameArea.as:6722` walks the whole enemy array on each
   * pulse and heals *every* damaged enemy in range at once — no nearest-target
   * selection, no randomness — and skips itself via `u != i`.
   *
   * ── Healing a DamageAddict keeps it alive, and that is correct ───────────
   * The heal goes through `setHealth`, whose immunity guard blocks decreases
   * only, so a Medic can top up a `DamageAddict` — and the AS3 agrees, since
   * its immunity lives at the damage sites and the heal writes `hp += 1`
   * unguarded. The arithmetic then produces an unkillable enemy:
   *
   *   heal   1 hp / 15 frames  = 0.0667 /frame
   *   decay  Easy t1  0.04500  -> net +0.0217  never dies
   *          Hard t3  0.07344  -> net -0.0068  dies slowly
   *          boss     0.10000  -> net -0.0333  dies
   *
   * So on most difficulties one Medic out-heals the bleed and the DamageAddict
   * sits at full health, immune to damage and not decaying, until the Medic is
   * killed. Eight of the fifty-five Medic levels also contain DamageAddict, so
   * it is reachable rather than theoretical.
   *
   * This is emergent behaviour from two separately faithful systems, not an
   * oversight in either. Do not "fix" it by special-casing the pair.
   */
  private resolveHealAuras(): void {
    for (const medic of this.enemies) {
      if (!medic.pulsedHeal) continue;
      medic.pulsedHeal = false;

      for (const target of this.enemies) {
        if (target === medic) continue;
        if (target.health >= target.maxHealth) continue;
        if (!isInHealRange(medic, target, medic.healDistance)) continue;

        // Through the funnel, so `healthChanged` fires and an Accelerating
        // enemy healed by a Medic resets its speed ramp — which is the
        // behaviour the two-flag observer was built for.
        target.setHealth(healedTo(target.health, target.maxHealth));
      }
    }
  }

  /**
   * Enemies that reached the bottom of a Defense lane.
   *
   * `PartGameArea.as:5468-5484`: instead of the wall bounce every other mode
   * gets, the enemy damages the player by its contact damage, dies, and pays no
   * money. That last part matters — letting one through is a loss on both
   * counts, health and income.
   *
   * Iterated over a copy because `removeEnemy` mutates `this.enemies`.
   */
  /**
   * `Tank.as:210` — the tank itself reaching the bottom of a Defense lane.
   *
   * Set from the tank's own position, not from an enemy crossing: the Racing
   * achievement is "get there before any enemy does". The flag is set in any
   * mode by the original and filtered to Defense when the achievement reads it,
   * which is reproduced rather than tidied — a mode check here would move the
   * condition and quietly change nothing, until someone read one of the two
   * sites and believed it.
   */
  private trackTankReachedBottom(): void {
    if (this.player.y + this.player.radius >= this.roomHeight) {
      this.levelFlags.hitBottom = true;
    }
  }

  private resolveDefenseBreaches(): void {
    for (const enemy of [...this.enemies]) {
      if (!enemy.breachedLine) continue;
      enemy.breachedLine = false;

      const damage = enemy.stats.damage;
      this.hp = Math.max(0, this.hp - damage);
      getSoundManager(this)?.queue('TankEnemyCollision');
      this.cameras.main.shake(90, 0.0012);
      GameEvents.emit('player:damaged', {
        amount: damage,
        health: this.hp,
        maxHealth: TANK_MAX_HP,
      });

      this.removeEnemy(enemy, false);
    }
  }

  private updateContactDamage(deltaMs: number): void {
    const frames = (deltaMs / 1000) * 30;
    if (this.pushedFrames > 0) this.pushedFrames = Math.max(0, this.pushedFrames - frames);

    for (const enemy of [...this.enemies]) {
      const participants = {
        tankX: this.player.x,
        tankY: this.player.y,
        tankRadius: this.player.radius,
        enemyX: enemy.x,
        enemyY: enemy.y,
        enemyRadius: enemy.radius,
        isBoss: enemy.enemyLevel === 'B',
        // `:5273-5277` — with the shield up a non-boss cannot connect at all,
        // and a boss connects at the doubled radius for zero damage. Both rules
        // already live in tankDamage; nothing ever passed the flag until now.
        shieldOn: this.shield.on,
      };
      // `:5172` — a mid-teleport enemy is intangible, so it neither collides
      // with the tank nor is pushed by anything.
      if (!enemy.simulated) continue;
      if (!isTouchingTank(participants)) continue;

      const result = resolveContact(
        participants,
        {
          enemyDamage: enemy.stats.damage,
          upgrades: this.upgrades,
          pushed: this.pushedFrames > 0,
          shieldOn: this.shield.on,
        },
        this.hp,
      );

      // `:5308` — the shield turns the contact thud into its own sound.
      if (this.shield.on) getSoundManager(this)?.queue('TankShieldCollision');

      if (result.damage > 0) {
        this.hp = result.hp;
        getSoundManager(this)?.queue('TankEnemyCollision');
        this.cameras.main.shake(90, 0.0012);
        GameEvents.emit('player:damaged', {
          amount: result.damage,
          health: this.hp,
          maxHealth: TANK_MAX_HP,
        });
      }

      if (result.push) {
        this.pushedFrames = PUSHED_TIMER_MAX;
        // `:5342` — the push that shoves an enemy off also tears a non-boss
        // grapple loose, restoring its own speed and flinging it away on the
        // 105+-15 / 75+-15 fan. The boss release at `:5323` is the contact
        // path above, which clears the tank's tether instead.
        enemy.releaseGrapple();
        // Knockback is not yet fed back into the tank's velocity — that needs
        // Tank.as's `pushed` branch, which is part of the unported loop.
      }

      // `:5319` — a boss shoves the tank clear of its hitbox. The AS3 writes
      // the position unclamped, which can put the player outside the room
      // against a wall-pinned boss; `shoveTo` clamps it.
      if (result.enemyDies === false && enemy.enemyLevel === 'B') {
        const angle = Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x);
        const clearance = this.player.radius + enemy.radius;
        this.player.shoveTo(
          enemy.x + Math.cos(angle) * clearance,
          enemy.y + Math.sin(angle) * clearance,
        );
      }

      if (result.enemyDies) this.removeEnemy(enemy, false);

      if (this.hp <= 0) return;
    }
  }

  /**
   * Spawns the blasts left by enemies that died this frame.
   *
   * Drains rather than iterates: a blast can kill another Exploding enemy,
   * which enqueues its own, so the loop keeps going until the chain settles.
   * The bound is the enemy count — each enemy can only die once, and
   * `removeEnemy` refuses a second removal — so this terminates.
   */
  private flushDeathBlasts(): void {
    let guard = 0;
    while (this.pendingDeathBlasts.length > 0 && guard < 64) {
      guard += 1;
      const blast = this.pendingDeathBlasts.shift()!;
      this.spawnExplosion(blast);
    }
  }

  /**
   * Enemies shooting, and their bullets reaching the tank.
   *
   * Scope is `shootType: Basic` with `shootAngle: Front` — see
   * enemies/enemyFiring.ts for what is deliberately left out.
   */
  private updateEnemyFire(deltaMs: number): void {
    // A destroyed tank neither shoots at nor is shot by anything.
    if (this.outcome.result !== null) return;

    const speedMultiplier = getDifficultyProfile(this.difficulty).enemyBulletSpeed;

    for (const enemy of this.enemies) {
      if (!enemy.shooter) continue;
      enemy.shooter = tickShooter(enemy.shooter, deltaMs);

      // Freeze stops shooting as well as movement — `:6889`.
      if (!canShoot(enemy.shooter, enemy.status.frozen)) continue;
      const volley = createVolley(
        { x: enemy.x, y: enemy.y, rotation: enemy.facingDegrees, radius: enemy.radius },
        enemy.stats.shootType,
        enemy.stats.shootAngle,
        enemy.stats.bulletAmount ?? 1,
        () => this.spawnRng.frac(),
        speedMultiplier,
      );
      // An unported type/pattern yields no bullets; leave the clock alone so
      // it is not silently "firing" blanks on a timer.
      if (volley.length === 0) continue;
      // `:6891` — a grappler may only have one hook out, and none while
      // attached. No other enemy needs this; it is a firing gate, not a
      // property of the bullet.
      if (enemy.grapple && !canFireHook(enemy.grapple)) continue;

      enemy.shooter = registerShot(enemy.shooter);
      if (enemy.grapple) {
        enemy.grapple = { ...enemy.grapple, bulletsShooting: enemy.grapple.bulletsShooting + 1 };
      }
      getSoundManager(this)?.queue('EnemyShoot');

      // `PartGameArea.as:6972-6980` puts traps on `enemyTrapLayer` and
      // everything else on `enemyBulletLayer`, so a trap renders *under* live
      // fire. Purely z-order; in the port that is a depth value.
      const isTrap = enemy.stats.shootType === 'Trap';

      for (const state of volley) {
        const sprite = this.add
          .image(state.x, state.y, 'particle-dot')
          .setDisplaySize(state.radius * 2.5, state.radius * 2.5)
          .setTint(state.damage > 1 ? 0xff3b6b : 0xff6b6b)
          .setDepth(isTrap ? ENEMY_TRAP_DEPTH : ENEMY_BULLET_DEPTH);
        // Carried per bullet so the homing step needs no lookup back to an
        // enemy that may already be dead.
        this.enemyBullets.push({
          state,
          sprite,
          turnRate: turnRateFor(enemy.stats.shootType),
          // Only hooks need to find their owner again — on impact to attach,
          // on expiry to free the one-hook slot.
          hookOwner: enemy.stats.shootType === 'Hook' ? enemy : null,
          bulletClass: isTrap ? 'EnemyBulletTrap' : 'EnemyBulletBasic',
        });
      }
    }

    this.advanceEnemyBullets(deltaMs);
  }

  /** Frees a grappler's one-hook slot, on impact or expiry. */
  private releaseHookSlot(owner: Enemy): void {
    if (!owner.grapple) return;
    owner.grapple = {
      ...owner.grapple,
      bulletsShooting: Math.max(0, owner.grapple.bulletsShooting - 1),
    };
  }

  private advanceEnemyBullets(deltaMs: number): void {
    if (this.enemyBullets.length === 0) return;

    const surviving: typeof this.enemyBullets = [];
    const tank = { x: this.player.x, y: this.player.y, radius: this.player.radius };

    for (const entry of this.enemyBullets) {
      // Homing runs before the move, as it does in the AS3 — the round turns,
      // then travels along the new heading in the same frame.
      if (entry.turnRate !== null) {
        entry.state = homeTowardTank(
          entry.state,
          this.player.active ? { x: this.player.x, y: this.player.y } : null,
          entry.turnRate,
          (deltaMs / 1000) * 30,
        );
      }

      const next = advanceEnemyBullet(
        entry.state,
        { roomWidth: this.roomWidth, roomHeight: this.roomHeight },
        deltaMs,
      );
      if (!next) {
        // `:1510` — a missed hook frees the slot when it expires.
        if (entry.hookOwner) this.releaseHookSlot(entry.hookOwner);
        entry.sprite.destroy();
        continue;
      }

      // `:1555` — a reflected round is invisible to the tank for the rest of
      // its short life, which is what stops it coming straight back.
      const reach = isReflectable(entry.bulletClass) ? shieldRadiusMultiplier(this.shield) : 1;
      if (!next.reflected && hitsTank(next, tank, reach)) {
        // `:1557` — one condition, two entrances. The Trap's mine is exempt
        // from both the doubled reach and the turn-away: it is not a projectile
        // that can be batted aside.
        if (
          isReflectable(entry.bulletClass) &&
          reflectChance(this.shield.on, bulletReflectChance(this.upgrades))
        ) {
          entry.state = reflectBullet(next, tank);
          entry.sprite
            .setPosition(entry.state.x, entry.state.y)
            .setTint(0x9ad8ff);
          getSoundManager(this)?.queue('ReflectBullet');
          surviving.push(entry);
          continue;
        }

        // `:1567-1571` — the hook damages *and* attaches. `isGrapping` is set
        // on both ranks, but the tank is only tethered by a boss: a non-boss
        // reels itself in and never touches the player.
        if (entry.hookOwner) {
          this.releaseHookSlot(entry.hookOwner);
          if (entry.hookOwner.active) {
            entry.hookOwner.grapple = {
              ...entry.hookOwner.grapple!,
              isGrapping: true,
            };
            if (entry.hookOwner.enemyLevel === 'B') this.player.tetheredTo = entry.hookOwner;
          }
        }

        this.hp = applyBulletToTank(this.hp, next.damage);
        getSoundManager(this)?.queue('TankDamaged');
        this.cameras.main.shake(60, 0.0008);
        GameEvents.emit('player:damaged', {
          amount: next.damage,
          health: this.hp,
          maxHealth: TANK_MAX_HP,
        });
        entry.sprite.destroy();
        continue;
      }

      entry.state = next;
      entry.sprite.setPosition(next.x, next.y).setAlpha(bulletAlpha(next));
      surviving.push(entry);
    }

    this.enemyBullets = surviving;
  }

  /**
   * Flag levels — `PartGameArea.handleFlag`.
   *
   * Keeps exactly one flag on the field while any remain, arms it, and credits
   * the reward when the tank reaches it. See waves/flag.ts, including why the
   * money is awarded directly rather than scattered as pickups.
   */
  private updateFlag(deltaMs: number): void {
    const wave = this.wave;
    const spec = this.levelSpec;
    if (!wave || !spec || spec.mode !== 'Flag') return;
    // Nothing more to place once the last flag is taken.
    if (wave.flagsLeft <= 0) {
      this.clearFlagMarker();
      return;
    }

    if (!this.flag) {
      const placed = placeFlag({
        tankX: this.player.x,
        tankY: this.player.y,
        roomWidth: this.roomWidth,
        roomHeight: this.roomHeight,
        flagRadius: FLAG_RADIUS,
        random: () => this.spawnRng.frac(),
      });
      // Null means no legal position this frame; try again next one rather
      // than crashing the way the AS3's unguarded array index would.
      if (!placed) return;

      this.flag = placed;
      this.flagMarker = this.add
        .image(placed.x, placed.y, 'particle-dot')
        .setDisplaySize(FLAG_RADIUS * 2, FLAG_RADIUS * 2)
        .setTint(0x6ee7ff)
        .setDepth(9);
    }

    this.flag = tickFlag(this.flag, deltaMs);
    // Dimmed while arming, so "cannot take this yet" is visible.
    this.flagMarker?.setAlpha(this.flag.timer > 0 ? 0.45 : 1);

    if (!canCaptureFlag(this.flag, { x: this.player.x, y: this.player.y, radius: this.player.radius })) {
      return;
    }

    getSoundManager(this)?.queue('FlagPickup');
    registerFlagCaptured(wave);

    // Divergence: credited straight to the balance rather than scattered as
    // ItemMoney pickups. See waves/flag.ts.
    this.currency += spec.flagMoney;
    GameEvents.emit('currency:earned', { amount: spec.flagMoney, total: this.currency });

    this.flag = null;
    this.clearFlagMarker();
    this.emitWaveState();
  }

  private clearFlagMarker(): void {
    this.flagMarker?.destroy();
    this.flagMarker = null;
  }

  /**
   * Decides and advances the end of the level.
   *
   * The AS3 does not hand over the instant the last enemy dies: it waits until
   * every dropped coin is collected (or the player is dead), then counts down
   * 15 frames. See waves/levelOutcome.ts.
   */
  private updateOutcome(deltaMs: number): void {
    const before = this.outcome.result;

    this.outcome = tickOutcome(
      this.outcome,
      {
        // The live count goes *into* isWaveComplete, which applies it only to
        // the arena-clearing modes. Applying it here vetoed Flag and Boss,
        // whose arenas never empty.
        waveComplete: this.wave !== null && isWaveComplete(this.wave, this.enemies.length),
        tankHp: this.hp,
        // The AS3 counts `ItemMoney` — coins *dropped by killed enemies* —
        // and holds the level open until they are picked up. This port has no
        // drops: `removeEnemy` pays out directly on death. So there is never
        // anything to wait for.
        //
        // This previously read `this.pickups.countActive(true)`, which counts
        // the eight decorative placeholder coins scattered at level start.
        // Those are scaffolding, not drops, and a player has no reason to
        // collect them — so the handover was gated forever and no level could
        // ever finish. Restore the real count when ItemMoney is ported.
        moneyOnFloor: 0,
      },
      deltaMs,
    );

    // The frame the outcome is first decided: music, and the tank's send-off.
    if (before === null && this.outcome.result !== null) {
      getSoundManager(this)?.setMusic(outcomeMusic(this.outcome.result));

      if (this.outcome.result === 'lost') {
        // Radius 150, damage 0 — spectacle only, it cannot hurt anything.
        this.spawnExplosion({
          x: this.player.x,
          y: this.player.y,
          radius: TANK_DEATH_BLAST_RADIUS,
          damage: 0,
          type: 'Normal',
          smallSound: false,
        });
        this.player.setVisible(false);
      }

      console.info(`[GameplayScene] Level ${this.level}: ${this.outcome.result}.`);
    }

    if (this.outcome.finished && !this.banked) {
      // Latched whether or not anything is written, so a sandbox run cannot
      // re-enter this block every frame looking for work it will never do.
      this.banked = true;

      // The AS3 saves at defined moments rather than continuously; level end is
      // one of them. The sandbox rule and all three writes live in
      // `bankLevelOutcome` so they can be tested against a real profile — the
      // scene cannot be instantiated, and a regex over this file cannot tell
      // whether the guard is actually reached.
      // `:2764-2770` — completing with any damage taken clears the four
      // "did it cleanly" flags, so FlagNoWeapons, DefensiveBombs and
      // BossOnlySpecial each additionally require a flawless run. A
      // completion-time rule, so it is applied here rather than at each set
      // site.
      if (this.hp < MEDAL_HP_GOLD) {
        this.levelFlags.noWeaponsUsed = false;
        this.levelFlags.timedBombsFired = false;
        this.levelFlags.otherThanTimedBombsFired = false;
        this.levelFlags.onlySpecialWeapons = false;
      }

      this.banking = bankLevelOutcome(this.profile, {
        sandbox: this.sandbox,
        upgrades: this.upgrades,
        currency: this.currency,
        world: this.world,
        level: this.level,
        difficulty: this.difficulty,
        // The medal count comes from remaining HP, and a loss ends at 0 — so
        // the win/lose result is derived there rather than passed alongside.
        hp: this.hp,
        levelRecord: {
          mode: this.levelSpec?.mode ?? 'Normal',
          // `PartGameArea.levelDone` — the level reached its end, however it
          // went. Quitting never reaches this block.
          completed: true,
          flags: this.levelFlags,
        },
        kills: this.kills,
        // The level's takings, not the running balance — see the field's note.
        earned: this.currency - this.openingBalance,
      });
    }

    if (this.outcome.finished) {
      GameEvents.emit('level:ended', {
        result: this.outcome.result!,
        world: this.world,
        level: this.level,
        kills: this.kills,
        currency: this.currency,
        // A win has just recorded a value, which is what unlocks the next
        // level; a loss records nothing, so there is nothing to move on to.
        // `nextLevelAfter` rolls over into the next world, which the inline
        // check this replaced did not — see levelProgress.ts.
        nextLevel:
          this.outcome.result === 'won' ? nextLevelAfter(this.world, this.level) : null,
        // The reveal pages. Empty on a sandbox run and on a loss, which is what
        // `bankLevelOutcome` returns in both cases.
        medals: this.banking?.medals ?? 0,
        newAchievements: this.banking?.newAchievements ?? [],
        newEnemies: this.banking?.newEnemies ?? [],
      });
      // Stop simulating; the result overlay owns the screen from here.
      this.scene.pause();
    }
  }

  /**
   * Distance-based pickup collection.
   *
   * The tank is no longer an arcade sprite — it moves through the ported
   * `Tank.as` integration — so this replaces the physics overlap with the same
   * circle test the bullet hits use.
   */
  private collectPickups(): void {
    for (const child of this.pickups.getChildren()) {
      const pickup = child as Pickup;
      if (!pickup.active) continue;
      const distance = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        pickup.x,
        pickup.y,
      );
      if (distance <= this.player.radius + pickup.displayWidth / 2) this.collect(pickup);
    }
  }

  /**
   * Shift/Q — toggles between the two equipped slots. `ScreenGame.update`
   * (`:481-513`).
   *
   * ── A toggle with a refusal, not a ring ───────────────────────────────
   * The AS3 swaps 1 <-> 2 **only when the target slot holds a weapon**. With
   * one slot filled the press does nothing whatever: no sound, no reload
   * change, no weapon change. That refusal is what makes the equip screen
   * load-bearing — the player picks two weapons and toggles those, rather than
   * cycling everything they own.
   *
   * This previously walked every ported primary and wrote the winner into slot
   * 1, because there was no equip screen to fill slot 2. That made the slots
   * decorative and is gone.
   *
   * ── The reload cost of a switch ───────────────────────────────────────
   * A successful switch pays the **incoming** weapon's full reload. The AS3
   * writes `reloadTime` twice — once before `chooseWeapon` with the outgoing
   * weapon's `reloadTimeMax` (`:490`/`:495`) and once after with the incoming
   * one's (`:506`/`:511`) — and the second overwrites the first, so only the
   * incoming value survives. The first write is dead code.
   *
   * Two earlier readings of this were both wrong. `createFiringState()` reset
   * it to 0, i.e. ready to fire now, which granted a free shot and made Q-mash
   * an unbounded rate. Carrying the old countdown over was closer but still not
   * the rule. A refused switch changes nothing at all, including this.
   */
  private cycleWeapon(): void {
    const loadout = this.profile.loadout;

    const target = nextSlot(loadout, this.currentSlot);
    // The other slot is empty. Nothing happens — deliberately not even a sound.
    if (target === null) return;

    const name = loadout.equippedWeapons[target - 1];
    const next = getWeapon(name);
    // Equipped but unported, or unowned. `resolveWeaponStats` returns null at
    // upgrade level 0, which is the ownership test the shop uses too.
    const stats = next ? resolveWeaponStats(next, this.upgrades) : null;
    if (!next || !stats) {
      console.warn(`[GameplayScene] Slot ${target} holds "${name}", which cannot be fired.`);
      return;
    }

    this.currentSlot = target;
    this.weapon = next;
    this.weaponStats = stats;

    // `chooseWeapon` writes `primaryWeapon` so a mid-level quit and resume
    // returns to the same slot. The slot *contents* are not touched: switching
    // is not equipping.
    this.profile.setLoadout(chooseWeapon(loadout, target));

    // The incoming weapon's full reload. See the note above.
    this.firing.reloadTime = stats.reloadTimeMax;

    getSoundManager(this)?.queue('WeaponChange');
    // Capacity must stay above zero or the readout unmounts — see
    // PLACEHOLDER_AMMO. Emitting 0 here is what made the weapon name vanish on
    // the first weapon switch.
    GameEvents.emit('ammo:changed', {
      current: PLACEHOLDER_AMMO,
      capacity: PLACEHOLDER_AMMO,
      weapon: next.name,
    });
    console.info(`[GameplayScene] Weapon: ${next.name} (slot ${target})`);
  }

  /**
   * Spawns a blast at the bullet's position and applies it once.
   *
   * The AS3 queues explosions and resolves them on the next frame; resolving
   * immediately is equivalent because `canDamage` is true for exactly one frame
   * either way, and it avoids a frame of latency between impact and damage.
   */
  private queueExplosion(bullet: Bullet): void {
    this.spawnExplosion({
      x: bullet.x,
      y: bullet.y,
      radius: bullet.explosionRadius,
      damage: bullet.damage,
      type: 'Normal',
      // Bullet impacts use the small sound; grenades and mines use the big one.
      smallSound: true,
    });
  }

  /** `spawnExplosion` — the one path every blast in the scene goes through. */
  private spawnExplosion(spec: ExplosionSpec): void {
    const explosion = createExplosion(spec);

    getSoundManager(this)?.queue(explosionSound(explosion.smallSound));
    new Explosion(this, explosion);

    const targets = this.enemies.map((enemy) => ({
      x: enemy.x,
      y: enemy.y,
      radius: enemy.radius,
    }));

    // Snapshot the caught enemies first: removing one mid-loop would shift the
    // indices findEnemiesInBlast returned.
    // `:6437` — an invisible or teleporting enemy is untouched by blasts.
    const caught = findEnemiesInBlast(explosion, targets)
      .map((i) => this.enemies[i])
      .filter((enemy) => enemy.targetable);

    for (const enemy of caught) {
      // `:6484` and `:6607` — the status lands *before* the damage, so an
      // enemy killed by the blast still spent a frame frozen or poisoned in
      // the AS3's ordering, and a survivor carries the effect either way.
      this.applyBlastStatus(explosion, enemy);

      const damage = blastDamage(explosion, enemy.damageMultipliers);
      enemy.takeDamage(damage);

      if (enemy.health <= 0) {
        this.removeEnemy(enemy, true);
      } else {
        enemy.flashDamage(impactFeedback(enemy.damageMultipliers, 'Explosions'));
      }
    }
  }

  /**
   * Freeze or poison from a blast, where the explosion carries a payload.
   *
   * Routed through the same `statusEffects` timers a bullet uses, so the
   * stacking rules come for free: poison compares strength and keeps the
   * stronger, freeze overwrites. A `Normal` blast carries no payload and does
   * nothing here, which is every explosion the port had before the Ice and
   * Poison grenades.
   */
  private applyBlastStatus(explosion: ExplosionSpec, enemy: Enemy): void {
    if (explosion.effectTime === undefined || explosion.effectTime <= 0) return;

    if (explosion.type === 'Ice') {
      enemy.freeze(explosion.effectTime, this.levelSpec?.mode === 'Tower');
      // `:6324` — freezing a raged Temperamental. Unreachable until the Ice
      // Grenade landed, because nothing dealt Ice damage: the achievement was
      // documented as a known gap and this is the source that closes it.
      if (enemy.enemyType === 'Temperamental') this.levelFlags.temperamentalFrozen = true;
      return;
    }

    if (explosion.type === 'Poison') {
      applyPoison(
        enemy.status,
        { poisonTime: explosion.effectTime, poisonDamage: explosion.effectDamage ?? 0 },
        enemy.damageMultipliers.Poison,
      );
    }
  }

  /**
   * A flame touching an enemy.
   *
   * Fire and freeze are exclusive: `:6002` requires `frozen == false` before
   * any fire damage lands, and `:5922` instead knocks 15 frames off the freeze
   * timer. Fire thaws a frozen enemy rather than burning it.
   */
  private burnEnemy(enemy: Enemy, bullet: Bullet): void {
    if (enemy.status.frozen) {
      enemy.status.frozenTimer = Math.max(0, enemy.status.frozenTimer - FIRE_THAW_FRAMES);
      if (enemy.status.frozenTimer === 0) enemy.status.frozen = false;
      return;
    }

    this.hitEnemy(enemy, bullet);
  }

  private hitEnemy(enemy: Enemy, bullet: Bullet): void {
    // Poison lands before the direct hit is resolved, matching the AS3 order
    // (`:5927` sits inside the damage block, ahead of the kill check at
    // `:5981`). It is scaled by the enemy's own Poison resistance, and an
    // immune enemy takes none — applyPoison refuses outright.
    // `:5837-5857` — the Icicle freezes on impact, scaled by the enemy's own
    // Ice resistance and quartered against a boss. Same timer the Ice Grenade's
    // blast writes to, so the two stack by the same rule.
    if (bullet.appliesFreeze && enemy.damageMultipliers.Ice > 0) {
      enemy.freeze(bullet.freezeTime, this.levelSpec?.mode === 'Tower');
      if (enemy.enemyType === 'Temperamental') this.levelFlags.temperamentalFrozen = true;
    }

    if (bullet.appliesPoison) {
      const poisoned = applyPoison(
        enemy.status,
        { poisonTime: bullet.poisonTime, poisonDamage: bullet.poisonDamage },
        enemy.damageMultipliers.Poison,
      );
      // `:6364` — the flag is set where the poison lands, so an immune enemy
      // that `applyPoison` refuses does not count.
      if (poisoned && enemy.enemyType === 'Medic') this.levelFlags.doctorPoisoned = true;
    }

    // The Cannon's plain `Bullet` is untyped, so this is a no-op multiplier
    // today — it becomes load-bearing as the typed weapons are ported.
    const result = applyBulletDamage(
      enemy.health,
      bullet.damage,
      enemy.damageMultipliers,
      bullet.damageType,
    );
    enemy.setHealth(result.health);

    if (!result.killed) {
      enemy.flashDamage(impactFeedback(enemy.damageMultipliers, bullet.damageType));
      return;
    }

    this.removeEnemy(enemy, true);
  }

  /**
   * Removes an enemy from play.
   *
   * `payMoney` is false when the enemy reached the tank: the AS3 sets
   * `noMoney = true` on contact, so a suicide attack earns the player nothing.
   */
  private removeEnemy(enemy: Enemy, payMoney: boolean): void {
    // `Tank.as:94-99` — the tether is held by reference, and the AS3 notices it
    // has gone by testing `stage.contains`. Clearing it here is the same thing
    // said at the moment it becomes true, and it restores the player's own
    // upgraded handling.
    if (this.player.tetheredTo === enemy) this.player.tetheredTo = null;

    // Everything below is once-per-enemy, so the guard is the first thing in
    // the function.
    //
    // It used to sit lower, immediately above `registerEnemyKilled` — the line
    // it was added to protect. That left the payout and the kill tally outside
    // it, so a double call no-oped the wave counter while paying twice and
    // counting the kill twice. The counter looked right and the summary read
    // exactly 2x the real total.
    const index = this.enemies.indexOf(enemy);
    if (index === -1) {
      if (import.meta.env.DEV) {
        console.warn(
          `[GameplayScene] removeEnemy called twice for ${enemy.enemyType}. ` +
            'Harmless now, but a caller is resolving the same death twice.',
        );
      }
      return;
    }

    if (payMoney) {
      // A kill counts exactly where the removal counts. Contact deaths pass
      // false — a suicide attack pays nothing and is not a kill.
      this.kills += 1;
      getSoundManager(this)?.queue('EnemySquish');
      // Money is the enemy's own reward value, already scaled by tier.
      this.currency += enemy.stats.money;
      GameEvents.emit('currency:earned', {
        amount: enemy.stats.money,
        total: this.currency,
      });
    }

    // Queued, not spawned — see pendingDeathBlasts. Fires on any death,
    // including a contact suicide, which is what `:5301` does by setting
    // `dead = true` on that path too.
    const blast = deathExplosion(enemy);
    if (blast) this.pendingDeathBlasts.push(blast);

    if (this.wave) registerEnemyKilled(this.wave, enemy.enemyLevel === 'B');

    this.enemies.splice(index, 1);
    enemy.destroy();

    this.emitWaveState();
  }

  /**
   * Publishes wave state to the HUD.
   *
   * Single path on purpose: this was emitted from three places with three
   * different values, and the one in `collect()` sent the *pickup* count, so
   * grabbing a coin turned the enemy counter into a coin counter.
   *
   * Flag and Boss levels spawn indefinitely, so `enemiesLeft` is not a
   * countdown for them — it never decrements. For those the honest figure is
   * how many are on screen; the meaningful progress counter is flags or
   * bosses.
   */
  private emitWaveState(): void {
    const spec = this.levelSpec;
    const wave = this.wave;
    const indefinite = spec?.mode === 'Flag' || spec?.mode === 'Boss';

    // An enemy of an arena wave is in exactly one of three places, and the
    // three move between each other without changing the total:
    //
    //   enemiesLeft      not yet announced   (registerSpawn takes one)
    //   pendingWarnings  announced, marker on screen, not yet spawned
    //   this.enemies     alive in the arena
    //
    // `pendingWarnings` was missing, so the count dipped by one for the whole
    // time a warning marker was counting down — which is most of the time at a
    // 45-frame spawn interval.
    const remaining = indefinite
      ? this.enemies.length
      : (wave?.enemiesLeft ?? 0) + (wave?.pendingWarnings ?? 0) + this.enemies.length;

    // Emitting only on change: this is called every frame so the figure cannot
    // go stale, and a level is ~10 changes rather than ~10,000 events.
    const signature = `${this.level}|${remaining}|${spec?.mode ?? 'Normal'}|${wave?.flagsLeft ?? 0}`;
    if (signature === this.lastWaveSignature) return;
    this.lastWaveSignature = signature;

    GameEvents.emit('wave:changed', {
      wave: this.level,
      enemiesRemaining: remaining,
      mode: spec?.mode ?? 'Normal',
      flagsRemaining: wave?.flagsLeft ?? 0,
    });
  }

  /** Live counts by type, for the Flag/Boss balancing branch of the draw. */
  private livePopulation(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const enemy of this.enemies) {
      counts[enemy.enemyType] = (counts[enemy.enemyType] ?? 0) + 1;
    }
    for (const warning of this.warnings) {
      counts[warning.type] = (counts[warning.type] ?? 0) + 1;
    }
    return counts;
  }

  private spawnPickups(): void {
    // Deterministic layout: the same seed gives the same board, which makes a
    // "did my change break collection?" check reproducible.
    const rng = new Phaser.Math.RandomDataGenerator([`level-${this.world}-${this.level}`]);
    for (let i = 0; i < PICKUP_COUNT; i += 1) {
      const x = rng.between(60, this.roomWidth - 60);
      const y = rng.between(60, this.roomHeight - 60);
      this.pickups.add(new Pickup(this, x, y, PICKUP_VALUE));
    }
  }

  /* ── runtime ───────────────────────────────────────────────────────────── */

  private collect(pickup: Pickup): void {
    if (!pickup.active) return;
    pickup.destroy();

    this.currency += pickup.value;
    // "Coin" has three variants in the manifest, picked by a single random
    // draw exactly as playSound() does.
    getSoundManager(this)?.queue('Coin');

    // The one event the brief asks to demonstrate: React's currency counter
    // updates from this, with no polling and no shared mutable object.
    GameEvents.emit('currency:earned', { amount: pickup.value, total: this.currency });

    // Two invented achievements used to fire from here — `first-coins`
    // ("Pocket Change") and `clear-board` ("Swept the Field") — keyed off the
    // decorative placeholder coins. Neither is one of the 36 in
    // `achievementData.ts`; they were demo scaffolding for the toast channel,
    // and the toast has shown fabricated achievements ever since. Same
    // treatment as the five invented `SPECIAL_MECHANICS` entries: removed
    // rather than renamed, because there is nothing behind them to keep.
    //
    // Real achievements are evaluated once at level end and announced from
    // `level:ended`.
  }

  private updateHud(delta: number): void {
    // The Mine's cooldown is a flat 600 frames — 20 seconds — so it needs a
    // readout, unlike the primaries where the reload is barely perceptible.
    const cooldown = this.secondaryFiring.reloadTime;
    const secondary =
      this.secondary === undefined
        ? '—'
        : cooldown > 0
          ? `${this.secondary.name} ${Math.ceil(cooldown / 30)}s`
          : `${this.secondary.name} [SPACE]`;

    this.hudText.setText(
      [
        `${this.weapon?.name ?? '—'} [Q]`,
        secondary,
        `COINS ${this.currency}`,
        `KILLS ${this.kills}`,
        `LEFT ${(this.wave?.enemiesLeft ?? 0) + this.enemies.length}`,
      ].join('    '),
    );

    void delta;
  }

  private layout(): void {
    const controller = getViewportController(this);
    if (controller) {
      applyViewportToScene(this, controller.current);
      this.applyRoomFillZoom();
      this.applyCameraBounds();
    }

    // Anchor in-canvas HUD text to the safe rect, not to the camera edge — on
    // a notched phone the camera edge is under the status bar.
    const safe = controller?.safeRect;
    this.hudText.setPosition((safe?.x ?? 0) + 12, (safe?.y ?? 0) + 10);
  }
}
