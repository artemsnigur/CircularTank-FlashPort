/**
 * The step-to-motion composition — the seam a Gummy Bear's damage fell through.
 *
 * ── What went wrong, because it decides what these assert ─────────────────
 * `bounceGummy` was correct and tested from the day it landed. `Bullet.advance`
 * then wrote `this.motion` **twice**: once inside `applyBounceCost` to raise the
 * damage, and once afterwards from the step's own state, which had been
 * computed before the bounce was known. The second write won, every frame.
 *
 * So the bear's `bounceState` held ×3 and then ×4 exactly as the AS3 says,
 * while the value the collision actually reads — `motion.damage` — reset to the
 * spawn figure. Every unit test passed. The rule had coverage; the *wiring*
 * had none, which `CLAUDE.md` names as this repo's signature failure and this
 * file is the answer to.
 *
 * These therefore assert the **composition**, not the arithmetic: given a step
 * and a bounce that raised the damage, what does the next motion hold?
 */
import { describe, expect, it } from 'vitest';

import { motionAfterStep, stepBullet } from './bulletStep';
import type { StepResult } from './bulletStep';
import type { BulletState } from './bullets';
import { bounceGummy } from './foodRounds';

const motion = (over: Partial<BulletState> = {}): BulletState =>
  ({
    x: 100,
    y: 100,
    xVel: 4,
    yVel: 0,
    rotation: 0,
    radius: 5,
    damage: 12,
    lifeTime: 100,
    explosion: false,
    ...over,
  }) as BulletState;

const stepFrom = (state: BulletState, bounced: StepResult['bounced'] = 'side'): StepResult => ({
  state,
  bounced,
});

describe('motionAfterStep', () => {
  /** **The regression.** */
  it('keeps a bounce`s raised damage instead of the step`s pre-bounce figure', () => {
    // The step carries the damage as it was *before* the bounce — that is not a
    // bug in the step, it is when the step was computed.
    const step = stepFrom(motion({ damage: 12 }));

    const next = motionAfterStep(step, { radius: 5, damage: 36 });

    expect(next.damage).toBe(36);
  });

  it('leaves the step`s damage alone when nothing bounced', () => {
    // The counterpart: without a bounce there is no override, and the step's
    // own figure must survive untouched. Without this pair, "takes the
    // override" would be satisfied by a function that always overwrote.
    const step = stepFrom(motion({ damage: 12 }), null);

    const next = motionAfterStep(step, { radius: 5 });

    expect(next.damage).toBe(12);
  });

  it('keeps the live radius over the step`s', () => {
    // The other override, and the reason the second write existed at all: a
    // growing round must not revert to its spawn size.
    const step = stepFrom(motion({ radius: 5 }));

    expect(motionAfterStep(step, { radius: 9 }).radius).toBe(9);
  });

  it('carries the step`s position and velocity through', () => {
    // The override must not cost the thing the step was written for.
    const step = stepFrom(motion({ x: 250, y: 40, xVel: -4, yVel: 2, rotation: 180 }));

    const next = motionAfterStep(step, { radius: 5, damage: 36 });

    expect(next).toMatchObject({ x: 250, y: 40, xVel: -4, yVel: 2, rotation: 180 });
  });
});

/**
 * The whole chain, in the order `Bullet.advance` runs it — step, charge the
 * bounce, compose — with the real `bounceGummy` rather than a stated table.
 *
 * This is the test that fails against the old code: `motionAfterStep` did not
 * exist, and the equivalent line was `{ ...step.state, radius }`, which drops
 * the raise on the floor.
 */
describe('a bear`s damage survives the frame it bounces on', () => {
  const camera = { left: 0, top: 0, width: 640, height: 400 };

  it('reaches x3 after one bounce and x4 after two', () => {
    let bounce = { stage: 1, damage: 12 };
    // Just inside the right edge, moving right, so the next step crosses it.
    let live = motion({ x: 640 - 5 - 1, y: 200, xVel: 8, yVel: 0, damage: 12 });

    for (const expected of [36, 48]) {
      const step = stepBullet(
        live,
        { roomWidth: 900, roomHeight: 720, camera, canBounce: true },
        1000 / 30,
      );
      if (!step) throw new Error('the bear was culled mid-flight');
      expect(step.bounced, 'expected an edge this frame').not.toBeNull();

      bounce = bounceGummy(bounce, step.bounced!);
      live = motionAfterStep(step, { radius: live.radius, damage: bounce.damage });

      // The value the collision reads, not the value the bounce state holds.
      expect(live.damage).toBe(expected);

      // Turn it around for the next pass: reflected off the right edge it now
      // travels left, so aim it back at the same wall.
      live = { ...live, x: 640 - 5 - 1, xVel: 8 };
    }

    expect(bounce.stage).toBe(3);
  });

  it('a non-bouncing frame does not disturb the damage it already earned', () => {
    // Mid-flight after a bounce: the step does not bounce, so no override is
    // passed, and the raised figure must ride along in the step state.
    const raised = motion({ x: 300, y: 200, xVel: 4, damage: 36 });
    const step = stepBullet(
      raised,
      { roomWidth: 900, roomHeight: 720, camera, canBounce: true },
      1000 / 30,
    );
    if (!step) throw new Error('unexpected cull');

    expect(step.bounced).toBeNull();
    expect(motionAfterStep(step, { radius: raised.radius }).damage).toBe(36);
  });
});
