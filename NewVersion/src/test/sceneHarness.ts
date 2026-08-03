/**
 * A scene-level harness — real game state, driven across frames.
 *
 * ── Why this is not a Phaser scene ────────────────────────────────────────
 * Two routes were tried first and both were rejected on evidence, not taste:
 *
 *  - `new Phaser.Game({ type: HEADLESS })` never fires `ready` under jsdom, so
 *    the test times out with no scene at all.
 *  - Constructing a `Phaser.GameObjects.Sprite` against a hand-built scene
 *    needs `sys.anims`, `sys.textures` **and** a populated texture graph, since
 *    `setTexture` resolves a frame at construction. That is a fake asset
 *    pipeline, and asserting against it would prove things about the fake.
 *
 * So the seams under test were extracted instead — `stepBullet` and
 * `planBlastOn` — and this holds the state a scene holds and drives them. That
 * is the project's own remedy for exactly this problem: extract the rule so it
 * can be driven, rather than write a better regex over the source.
 *
 * ── What it does and does not prove ───────────────────────────────────────
 * It runs the **real** step and plan functions the scene runs, over state that
 * changes between frames — a mutable camera above all, which is the gap the
 * T4 notes named. It does **not** prove Phaser calls `update`, that the sprite
 * is painted, or that `GameplayScene` passes these functions the right
 * arguments. That last handoff is one line per seam and is still checked by a
 * narrow source assertion, labelled as such where it lives.
 */
import type { BulletState } from '../game/weapons/bullets';
import type { CameraBounds } from '../game/weapons/bulletBounce';
import { stepBullet } from '../game/weapons/bulletStep';
import type { BounceEdge } from '../game/weapons/bulletBounce';
import { bounceCheese, bounceGummy, cheeseIsSpent, gummyIsSpent } from '../game/weapons/foodRounds';
import type { CheeseBounceState, GummyBounceState } from '../game/weapons/foodRounds';
import { planBlastOn } from '../game/weapons/blastPlan';
import { sweepHazards } from '../game/weapons/hazardSweep';
import { applyKillReload, killReloadBonus } from '../game/upgrades/killReload';
import { createInitialUpgradeState, findUpgradeById } from '../game/upgrades/upgradeState';
import type { UpgradeState } from '../game/upgrades/upgradeState';
import type { SweepEffect } from '../game/weapons/hazardSweep';
import { createBeam, findBeamHits } from '../game/weapons/laser';
import type { LaserBeam } from '../game/weapons/laser';
import type { GroundHazard } from '../game/weapons/groundHazard';
import type { BlastOutcome } from '../game/weapons/blastPlan';
import type { ExplosionState } from '../game/weapons/explosions';
import type { DamageMultipliers } from '../game/enemies/damageTypes';
import { resolveDamageMultipliers } from '../game/enemies/damageTypes';

/** One frame at the AS3's fixed rate, which is what the scene ticks at. */
export const FRAME_MS = 1000 / 30;

/** An enemy as the blast planner sees it, plus the state a hit would change. */
export interface HarnessEnemy {
  id: number;
  targetable: boolean;
  trailId: number | null;
  health: number;
  frozenFor: number;
  multipliers: DamageMultipliers;
  x: number;
  y: number;
  radius: number;
  isBoss: boolean;
  enemyType: string;
}

export function harnessEnemy(over: Partial<HarnessEnemy> = {}): HarnessEnemy {
  return {
    id: 1,
    targetable: true,
    trailId: null,
    health: 100,
    frozenFor: 0,
    x: 0,
    y: 0,
    radius: 13,
    isBoss: false,
    enemyType: 'Normal',
    // Real table data rather than an invented neutral row.
    multipliers: resolveDamageMultipliers('Normal'),
    ...over,
  };
}

/**
 * The mutable slice of scene state these seams read.
 *
 * `camera` is deliberately a plain field rather than a constructor argument:
 * moving it between frames is the whole point, and a test that could only set
 * it once would reproduce the gap this harness exists to close.
 */
export class SceneHarness {
  camera: CameraBounds = { left: 0, top: 0, width: 640, height: 400 };
  roomWidth = 1920;
  roomHeight = 1200;
  /** `PartGameArea.iceTrailID`. */
  iceTrailId = 0;
  /** `ScreenGame.secondaryWeapon` — what `:6554` actually reads. */
  equippedSecondary: string | undefined = undefined;
  enemies: HarnessEnemy[] = [];
  hazards: GroundHazard[] = [];
  /** The beam laid this frame, or null — `:7083`'s operand. */
  beam: LaserBeam | null = null;
  /** Enemies the beam is on — `collidingWithLaser` (`:5574`). */
  laserTouched: Set<number> = new Set();

  /**
   * Fires the laser from `(x, y)` along `rotation`, as `fireLaser` does.
   *
   * Populates both reads of the one shot: the beam the patch sweep tests
   * against, and the per-enemy flag the freeze gate consults. Enemies immune to
   * Laser are excluded, because `:5572` sets the flag inside that gate.
   */
  fireLaser(x: number, y: number, rotation: number): void {
    this.beam = createBeam(x, y, rotation);
    this.laserTouched = new Set();

    const hits = findBeamHits(this.beam, this.enemies.map((e) => ({ x: e.x, y: e.y, radius: e.radius })));
    for (const index of hits) {
      if (this.enemies[index].multipliers.Laser <= 0) continue;
      this.laserTouched.add(index);
    }
  }

  /** Stops firing, so the next sweep sees no beam. */
  holdFire(): void {
    this.beam = null;
    this.laserTouched = new Set();
  }

  /**
   * One frame of the hazard sweep, applying its effects to the enemies.
   *
   * Mutates, so a test can assert an enemy was *not* frozen rather than that a
   * predicate returned false.
   */
  sweep(frames = 1): SweepEffect[] {
    const result = sweepHazards(this.hazards, this.enemies.map((e) => ({
      targetable: e.targetable,
      x: e.x,
      y: e.y,
      radius: e.radius,
      trailId: e.trailId,
      isBoss: e.isBoss,
      enemyType: e.enemyType,
      iceMultiplier: e.multipliers.Ice,
      fireLavaMultiplier: e.multipliers.FireLava,
    })), {
      frames,
      iceTrailId: this.iceTrailId,
      laserTouched: this.laserTouched,
      beam: this.beam,
      flames: this.flames,
    });

    this.hazards = result.hazards;
    for (const index of result.stamped) this.enemies[index].trailId = this.iceTrailId;

    for (const effect of result.effects) {
      const enemy = this.enemies[effect.enemy];
      if (effect.kind === 'freeze') enemy.frozenFor = effect.frames;
      else enemy.health -= effect.damage;
    }

    return result.effects;
  }

  /** Live flames, for the ice drain at `:7078`. */
  flames: Array<{ x: number; y: number; radius: number }> = [];

  /** The player's upgrades, for rules that read them — Kill Reload so far. */
  upgrades: UpgradeState = createInitialUpgradeState();
  /** `ScreenGame.reloadTimeSecondary`. */
  secondaryReload = 0;
  /** Kills resolved this run, in order, for attribution assertions. */
  killLog: string[] = [];

  /** Buys Kill Reload to `level`. */
  buyKillReload(level: number): void {
    const misc = [...this.upgrades.misc];
    misc[findUpgradeById('KillReload')!.index] = level;
    this.upgrades = { ...this.upgrades, misc };
  }

  /**
   * Resolves a death, as `GameplayScene.removeEnemy` does.
   *
   * Kill Reload is applied here and **not** gated on `payMoney`, matching
   * `:6849` sitting outside the `noMoney` gate at `:6842`.
   */
  killEnemy(index: number, payMoney = true): void {
    const enemy = this.enemies[index];
    if (!enemy) return;

    this.killLog.push(enemy.enemyType);
    this.secondaryReload = applyKillReload(this.secondaryReload, killReloadBonus(this.upgrades));
    // Stands for the payout, which is gated on `payMoney` where Kill Reload
    // deliberately is not — the asymmetry is the thing under test.
    if (payMoney) this.money += 1;
    this.enemies.splice(index, 1);
  }

  money = 0;

  /** Moves the view, as scrolling after the tank would. */
  scrollTo(left: number, top = this.camera.top): void {
    this.camera = { ...this.camera, left, top };
  }

  /** Throwing an Ice Ball — `:4179`. */
  throwIceBall(): void {
    this.iceTrailId += 1;
  }

  /**
   * Runs one bullet for `frames` frames, letting a caller move the camera
   * between them.
   *
   * Returns every bounce that happened, so a test can assert *when* one
   * occurred rather than only where the bullet ended up.
   */
  flyBullet(
    bullet: BulletState,
    frames: number,
    options: {
      bounce?: { kind: 'gummy'; state: GummyBounceState } | { kind: 'cheese'; state: CheeseBounceState };
      onFrame?: (frame: number, harness: SceneHarness) => void;
    } = {},
  ): {
    state: BulletState | null;
    /** Every bounce, with the point it happened at — the edge it was sent back from. */
    bounces: Array<{ edge: BounceEdge; x: number; y: number; frame: number }>;
    bounceState: typeof options.bounce;
  } {
    let state: BulletState | null = bullet;
    let bounceState = options.bounce;
    const bounces: Array<{ edge: BounceEdge; x: number; y: number; frame: number }> = [];

    for (let frame = 0; frame < frames; frame += 1) {
      options.onFrame?.(frame, this);
      if (!state) break;

      const spent =
        !bounceState ||
        (bounceState.kind === 'gummy'
          ? gummyIsSpent(bounceState.state)
          : cheeseIsSpent(bounceState.state));

      const step = stepBullet(
        state,
        {
          roomWidth: this.roomWidth,
          roomHeight: this.roomHeight,
          // Read fresh every frame, exactly as `advanceBullets` does.
          camera: this.camera,
          canBounce: !spent,
        },
        FRAME_MS,
      );

      if (!step) return { state: null, bounces, bounceState };

      if (step.bounced && bounceState) {
        bounces.push({ edge: step.bounced, x: step.state.x, y: step.state.y, frame });
        bounceState =
          bounceState.kind === 'gummy'
            ? { kind: 'gummy', state: bounceGummy(bounceState.state, step.bounced) }
            : { kind: 'cheese', state: bounceCheese(bounceState.state, step.bounced) };
      }

      state = step.state;
    }

    return { state, bounces, bounceState };
  }

  /**
   * Applies a blast to every enemy, as `spawnExplosion`'s loop does.
   *
   * Mutates the enemies, so a test can assert an enemy took *no* damage rather
   * than that a guard was spelled a certain way.
   */
  detonate(explosion: ExplosionState): BlastOutcome[] {
    const outcomes: BlastOutcome[] = [];

    for (const enemy of this.enemies) {
      const plan = planBlastOn(
        explosion,
        {
          targetable: enemy.targetable,
          trailId: enemy.trailId,
          multipliers: enemy.multipliers,
        },
        { iceTrailId: this.iceTrailId, equippedSecondary: this.equippedSecondary },
      );
      outcomes.push(plan);
      if (!plan.applies) continue;

      if (plan.stampGeneration) enemy.trailId = this.iceTrailId;
      if (plan.freezeTime > 0) enemy.frozenFor = plan.freezeTime;
      enemy.health -= plan.damage;
    }

    return outcomes;
  }
}
