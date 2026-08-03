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
}

export function harnessEnemy(over: Partial<HarnessEnemy> = {}): HarnessEnemy {
  return {
    id: 1,
    targetable: true,
    trailId: null,
    health: 100,
    frozenFor: 0,
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
