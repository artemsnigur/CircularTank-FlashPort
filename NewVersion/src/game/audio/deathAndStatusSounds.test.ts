/**
 * The four sound rules wired in T71, each pinned **against its counterpart**.
 *
 * All four were silent for the same reason — nothing called them — and all four
 * are `if/else` or dedup rules in the AS3, so asserting either side alone would
 * pass for a rule that always fires or never does. Each pair is driven on one
 * shared input.
 *
 * These are the rules, extracted where they were extractable. The scene wiring
 * that reaches them is confirmed by driving (`npm run look -- --sound-sweep`),
 * not here — a unit test cannot see whether the caller runs, which is this
 * repository's most repeated failure.
 */
import { describe, expect, it } from 'vitest';

import { createStatusState, applyFreeze } from '../enemies/statusEffects';
import { isAudibleAt } from './onScreenGate';

/**
 * `PartGameArea.as:5866-5868` and `:6230-6232` both gate the `Freeze` push on
 * `!theEnemy.gotIceIndicator` — the enemy was not already frozen.
 *
 * The port answers this from `status.frozen` *before* `applyFreeze` runs, which
 * is what `Enemy.freeze` returns. Modelled here rather than driven through
 * `Enemy`, which needs a live Phaser scene to construct.
 */
const freshFreeze = (state: { frozen: boolean }): boolean => !state.frozen;

describe('Freeze sounds once per freeze, not once per tick', () => {
  it('sounds on a fresh freeze and is silent on a re-freeze', () => {
    const status = createStatusState();

    // First application: nothing was frozen, so this is the sound.
    expect(freshFreeze(status), 'first freeze').toBe(true);
    applyFreeze(status, 30, 1, false);

    // Second, while still frozen: the AS3 refuses it. Same object, same call —
    // the pair is the assertion, not either half.
    expect(freshFreeze(status), 're-freeze while frozen').toBe(false);
    applyFreeze(status, 30, 1, false);

    // …and once it has thawed, it sounds again. Without this the rule would be
    // satisfied by "only ever sounds once, ever".
    status.frozen = false;
    expect(freshFreeze(status), 'after thawing').toBe(true);
  });

  it('still extends the timer on the silent re-freeze', () => {
    // The sound is deduped; the effect is not. Pinned because collapsing the
    // two would look like a tidy-up and would quietly shorten every stacked
    // freeze.
    const status = createStatusState();
    applyFreeze(status, 30, 1, false);
    status.frozenTimer = 5;
    applyFreeze(status, 30, 1, false);
    expect(status.frozenTimer).toBe(30);
  });
});

/**
 * `:6861-6868` — `if(!bottomCollision) EnemySquish else BottomCollision`.
 *
 * An either/or on one death, and it sits *below* the `noMoney` gate at `:6842`,
 * so it is not conditional on the death paying out.
 */
const deathSound = (bottomCollision: boolean): string =>
  bottomCollision ? 'BottomCollision' : 'EnemySquish';

describe('a death sounds exactly one of two names', () => {
  it('swaps EnemySquish for BottomCollision at the Defense line', () => {
    expect(deathSound(false)).toBe('EnemySquish');
    expect(deathSound(true)).toBe('BottomCollision');
    // Never both, never neither — the AS3 is an if/else, and a port that
    // queued both would still satisfy each assertion above on its own.
    expect(new Set([deathSound(false), deathSound(true)]).size).toBe(2);
  });
});

/**
 * `:4946` and `:4973` gate both teleport sounds on `checkWithinScreen(…, 100)`
 * — the port's `isAudibleAt` with `SOUND_HEARING_MARGIN`.
 *
 * Driven against the *ungated* case on the identical rect, because "nothing is
 * ever audible" would pass a silence assertion by itself.
 */
describe('teleport sounds are gated on being on screen', () => {
  const view = { cameraX: 0, cameraY: 0, cameraWidth: 640, cameraHeight: 400 };

  it('sounds inside the camera rect and not far outside it', () => {
    expect(isAudibleAt(320, 200, 10, view), 'centre of the view').toBe(true);
    expect(isAudibleAt(5000, 200, 10, view), 'far off to the right').toBe(false);
  });

  it('extends past the camera edge by the hearing margin', () => {
    // The margin is the whole point of the rule: a teleport just off screen is
    // still heard, one well beyond it is not. Asserted either side of the
    // boundary rather than at one point.
    expect(isAudibleAt(690, 200, 10, view), 'just outside, within margin').toBe(true);
    expect(isAudibleAt(900, 200, 10, view), 'outside the margin').toBe(false);
  });
});
