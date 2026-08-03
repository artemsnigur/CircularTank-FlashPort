/**
 * Kill Reload, specified against the ordinary reload rather than alone.
 *
 * The two are the counterpart pair here, the way ice and lava were in T2/T3:
 * `tickFiring` drains the cooldown on a clock, this drains it on an event, and
 * the interesting cases are the ones where both are acting. Asserting either in
 * isolation would leave the composition unspecified — which is where the
 * plausible bugs live (a kill that resets rather than subtracts, or one that
 * banks credit against a cooldown that has not started).
 */
import { describe, expect, it } from 'vitest';
import { applyKillReload, killReloadBonus } from './killReload';
import { createInitialUpgradeState, findUpgradeById } from './upgradeState';
import { createFiringState, tickFiring } from '../weapons/firing';

const FRAME = 1000 / 30;

const owned = (level: number) => {
  const state = createInitialUpgradeState();
  const misc = [...state.misc];
  misc[findUpgradeById('KillReload')!.index] = level;
  return { ...state, misc };
};

describe('the bonus comes off the table, and is nothing when unowned', () => {
  it('is 2 at level 1 and 11 at level 10', () => {
    expect(killReloadBonus(owned(1))).toBe(2);
    expect(killReloadBonus(owned(10))).toBe(11);
  });

  it('is zero on a fresh save, because the AS3 gates the whole block', () => {
    // `:6849` tests `levelsArrayMisc[3] != 0`. Unowned is not "a bonus of zero",
    // it is no rule — the zero here is what makes the caller branch-free.
    expect(killReloadBonus(createInitialUpgradeState())).toBe(0);
  });

  it('reads its only stat track, which is not a reload time', () => {
    // Guard against the obvious misread: `upgradeArrayKillReload` has one track
    // and it is the *bonus*, not a cooldown. A row of 2..11 would be an absurd
    // reload and a sensible subtraction.
    const table = findUpgradeById('KillReload')!;
    expect(table.stats).toHaveLength(1);
    expect(table.stats[0]).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });
});

describe('the clamp, in both of the AS3 spellings', () => {
  /** `:6851-6858` written out as the source writes it. */
  const asWritten = (reload: number, bonus: number) =>
    reload - bonus > 0 ? reload - bonus : 0;

  it('agrees with the branch at every crossing point', () => {
    // The equality the docstring claims, asserted rather than assumed —
    // including `reload - bonus === 0`, where the branch takes its `else`.
    for (const reload of [0, 1, 2, 3, 5, 11, 12, 600, 700]) {
      for (const bonus of [0, 2, 5, 11]) {
        expect(applyKillReload(reload, bonus), `${reload} - ${bonus}`).toBe(
          asWritten(reload, bonus),
        );
      }
    }
  });

  it('never goes negative', () => {
    expect(applyKillReload(3, 11)).toBe(0);
  });
});

/**
 * The counterpart pairing: an event-driven drain against a clock-driven one.
 */
describe('kill reload against the ordinary reload', () => {
  it('a kill subtracts, where a frame of reload also subtracts', () => {
    // Same direction, different trigger. One frame of `tickFiring` removes one
    // frame; one kill at level 1 removes two — so a kill is worth exactly two
    // frames of waiting, and that is the whole upgrade.
    const ticking = createFiringState();
    ticking.reloadTime = 100;
    tickFiring(ticking, FRAME);
    expect(ticking.reloadTime).toBeCloseTo(99, 10);

    expect(applyKillReload(100, killReloadBonus(owned(1)))).toBe(98);
  });

  it('composes with a reload already in flight rather than replacing it', () => {
    // The interaction state. Both act on the same cooldown in the same frame;
    // neither resets it, so the total is the sum.
    const state = createFiringState();
    state.reloadTime = 700; // a Lava Ball's cooldown

    tickFiring(state, FRAME); // 699
    state.reloadTime = applyKillReload(state.reloadTime, killReloadBonus(owned(10)));

    expect(state.reloadTime).toBeCloseTo(688, 10); // 700 - 1 - 11
  });

  it('does not bank against a ready secondary', () => {
    // A kill with the cooldown already at 0 leaves it at 0. There is no credit
    // carried into the next use, which is the difference between "reduces the
    // cooldown" and "charges the weapon" — and the reading the upgrade's name
    // invites.
    const ready = createFiringState();
    expect(ready.reloadTime).toBe(0);

    const after = applyKillReload(ready.reloadTime, killReloadBonus(owned(10)));
    expect(after).toBe(0);

    // And the next use still pays the full cooldown.
    const full = after + 700;
    expect(full).toBe(700);
  });

  it('stacks within one frame, where the ordinary reload cannot', () => {
    // `:6849` runs per enemy inside the enemy loop with no dedup, so five kills
    // on one frame pay five times. `tickFiring` is once per frame by
    // construction — that asymmetry is the point of asserting them together.
    let reload = 700;
    const bonus = killReloadBonus(owned(1));
    for (let kill = 0; kill < 5; kill += 1) reload = applyKillReload(reload, bonus);

    expect(reload).toBe(690);

    const ticking = createFiringState();
    ticking.reloadTime = 700;
    tickFiring(ticking, FRAME);
    tickFiring(ticking, FRAME);
    expect(ticking.reloadTime).toBeCloseTo(698, 10); // two frames, two frames' worth
  });

  it('a maxed upgrade cannot outrun a Lava Ball cooldown on kills alone', () => {
    // The computed figure rather than a comparative: 700 frames at 11 a kill is
    // 64 kills to zero it from cold, which no single level supplies. The upgrade
    // shortens the wait; it does not remove it.
    expect(Math.ceil(700 / killReloadBonus(owned(10)))).toBe(64);
  });
});
