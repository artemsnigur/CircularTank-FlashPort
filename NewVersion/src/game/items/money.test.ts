import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  MONEY_FIGURE_FIT,
  MONEY_FIGURE_MIN,
  MONEY_FIGURE_SCALE,
  figureFit,
  AS3_COIN_ATTRACTION,
  AS3_COIN_MAX_SPEED,
  COIN_ATTRACTION,
  COIN_FRICTION,
  COIN_MAX_SPEED,
  COIN_SPEED_SCALE,
  DENOMINATIONS,
  baseDropAmount,
  bossShare,
  decomposeMoney,
  dropAmount,
  spawnMoney,
  tickCoin,
} from './money';
import type { Coin, DropInput } from './money';
import { campaignMoney } from '../config/campaignTuning';
import { MONEY_CLIPS, coinRadius } from './moneyArt';

const BOUNDS = { roomWidth: 640, roomHeight: 960 };
const TANK = { x: 320, y: 480, radius: 14 };

/**
 * The AS3's payout, without the campaign multiplier.
 *
 * `baseDropAmount`, not `dropAmount`: this whole describe is about the
 * original's two branches — Flag pays nothing, a Boss level halves its
 * ordinary enemies — and `dropAmount` now scales the result by
 * `CAMPAIGN_MONEY_MULTIPLIER` (`D-3`). Driving the scaled function here would
 * multiply every expected figure by 2.05 for no gain and would stop the
 * numbers being the AS3's.
 *
 * The multiplier has its own test below, on the seam between the two.
 */
const drop = (over: Partial<DropInput> = {}): number =>
  baseDropAmount({
    money: 100,
    isBoss: false,
    // One by default, which is the no-op: every test written before the split
    // existed keeps asserting exactly what it did.
    bossAmount: 1,
    mode: 'Normal',
    reachedTank: false,
    tankHp: 50,
    ...over,
  });

describe('decomposeMoney', () => {
  it('takes the largest denomination first', () => {
    expect(decomposeMoney(1000)).toEqual([1000]);
    expect(decomposeMoney(1001)).toEqual([1000, 1]);
    expect(decomposeMoney(7)).toEqual([5, 2]);
  });

  it('always sums back to the amount it was given', () => {
    // The property that matters — an exact figure per input would pin the
    // ladder's shape rather than its correctness, and there are 15 rungs.
    for (const amount of [1, 3, 17, 99, 137, 640, 1234, 5000]) {
      expect(decomposeMoney(amount).reduce((a, b) => a + b, 0), `${amount}`).toBe(amount);
    }
  });

  it('emits only real denominations, so every coin has art', () => {
    // `coinRadius` throws on an unknown value rather than defaulting. This is
    // what makes that safe.
    const valid = new Set(DENOMINATIONS);
    for (const amount of [1, 3, 17, 99, 137, 640, 1234, 5000]) {
      for (const value of decomposeMoney(amount)) {
        expect(valid.has(value), `${amount} produced ${value}`).toBe(true);
        expect(() => coinRadius(value)).not.toThrow();
      }
    }
  });

  it('yields nothing for zero or less', () => {
    expect(decomposeMoney(0)).toEqual([]);
    expect(decomposeMoney(-5)).toEqual([]);
  });
});

describe('dropAmount — the two AS3 branches', () => {
  it('pays full in an ordinary level and nothing in a Flag level', () => {
    // Asserted as the pair. Flag levels pay through the flag itself (`:2589`),
    // and "kills drop money" is true everywhere else — a rule that reads as an
    // oversight unless its counterpart is beside it.
    expect(drop({ mode: 'Normal' })).toBe(100);
    expect(drop({ mode: 'Flag' })).toBe(0);
    expect(drop({ mode: 'Flag', isBoss: true })).toBe(0);
  });

  /*
   * ── `A95`: the bounty is the level's, split between its bosses ──────────
   *
   * `T247` dropped the AS3's division of boss health *and* money by the boss
   * count. Health had to stop being divided — that is what makes ten bosses a
   * fight rather than one boss in ten pieces. Money did not, and undivided it
   * pays ten bounties: measured against the redesign's boss schedule, **4.6x
   * the original campaign's boss income on a campaign 44% the length**.
   */
  it('splits a boss bounty across the level\'s bosses', () => {
    expect(drop({ mode: 'Boss', isBoss: true, bossAmount: 1, money: 1000 })).toBe(1000);
    expect(drop({ mode: 'Boss', isBoss: true, bossAmount: 2, money: 1000 })).toBe(500);
    expect(drop({ mode: 'Boss', isBoss: true, bossAmount: 10, money: 1000 })).toBe(100);
  });

  it('pays about one bounty however many bosses carry it', () => {
    /*
     * The property the split exists for: N bosses at a share each is one
     * bounty, not N.
     *
     * "About", and the tolerance is stated rather than fudged — each share is
     * rounded to the nearest 10, which moves it by up to 5, so a level total
     * can drift by 5 per boss and no more. Three bosses on a 2000 bounty pay
     * 670 each, which is 2010. Written as an equality first, and that is what
     * it caught.
     */
    for (const bossAmount of [1, 2, 3, 4, 5, 8, 10]) {
      const total = drop({ mode: 'Boss', isBoss: true, bossAmount, money: 2000 }) * bossAmount;
      expect(Math.abs(total - 2000), `${bossAmount} bosses`).toBeLessThanOrEqual(5 * bossAmount);

      // And the inflation this prevents, on the same input: nowhere near the
      // N bounties an undivided share would pay.
      if (bossAmount > 1) {
        expect(total, `${bossAmount} bosses undivided`).toBeLessThan(2000 * bossAmount);
      }
    }
  });

  it('leaves every other kind of drop alone', () => {
    /*
     * The counterpart, on the identical count. Without it, "dividing by
     * bossAmount" would pass for an implementation that divides everything —
     * and an ordinary enemy on a 10-boss level would pay a tenth.
     */
    expect(drop({ mode: 'Boss', isBoss: false, bossAmount: 10 })).toBe(50);
    expect(drop({ mode: 'Normal', isBoss: false, bossAmount: 10 })).toBe(100);
    // A boss outside Boss mode does not exist in the data, but the rule is
    // written on `isBoss`, so pin what it does: still splits.
    expect(drop({ mode: 'Flag', isBoss: true, bossAmount: 10 })).toBe(0);
  });

  it('rounds a share to ten and never to nothing', () => {
    // Boss money is a multiple of 10 everywhere in the AS3, and the floor is
    // headroom rather than a live case — the cheapest boss is 500, so ten of
    // them still pay 50 each.
    expect(bossShare(1450, 3) % 10).toBe(0);
    expect(bossShare(500, 10)).toBe(50);
    expect(bossShare(5, 10), 'floored, not zeroed').toBe(10);
    // Not an assumption about `bossCountFor`, which cannot return this — the
    // same guard the health divisor carried, for the same reason.
    expect(bossShare(1000, 0)).toBe(1000);
    expect(Number.isFinite(bossShare(1000, 0))).toBe(true);
  });

  it('halves an ordinary enemy in a Boss level but not the boss', () => {
    // The second branch, and the one that falls out of `(mode != "Boss" ||
    // level == "B")` rather than being written as a special case.
    expect(drop({ mode: 'Boss', isBoss: false })).toBe(50);
    expect(drop({ mode: 'Boss', isBoss: true })).toBe(100);
    // Beside the ordinary level, so "halving" cannot quietly become universal.
    expect(drop({ mode: 'Normal', isBoss: false })).toBe(100);
  });

  it('rounds the halved amount rather than truncating', () => {
    // `Math.round(money / 2)` at `:6848`. 101/2 = 50.5 -> 51, not 50.
    expect(drop({ mode: 'Boss', isBoss: false, money: 101 })).toBe(51);
  });

  it('pays nothing when the enemy reached the tank', () => {
    // `noMoney` (`:5304`), pinned against the same enemy that did not.
    expect(drop({ reachedTank: true })).toBe(0);
    expect(drop({ reachedTank: false })).toBe(100);
  });

  it('pays nothing at all when the tank died on the same blow', () => {
    // `:368` zeroes the count inside `spawnMoney`, so it applies to every
    // caller — a kill that also destroys the tank drops nothing.
    expect(drop({ tankHp: 0 })).toBe(0);
    expect(drop({ tankHp: 0, isBoss: true, mode: 'Boss' })).toBe(0);
  });
});

describe('spawnMoney — placement', () => {
  const radiusFor = (): number => 5;

  it('rings a Flag reward evenly and scatters a kill drop', () => {
    // Two genuinely different rules (`:615` against `:621`), not one with a
    // parameter. Driven with a fixed random so the ring's evenness is checkable.
    // 1950 decomposes to [1000, 500, 250, 200] — four coins. Derived, not
    // assumed: `amount: 4` gives [2, 2], because the ladder is greedy over
    // denominations rather than a count.
    const ring = spawnMoney({
      amount: 1950,
      x: 0,
      y: 0,
      move: false,
      distance: 100,
      evenRing: true,
      radiusFor,
      random: () => 0,
    });
    expect(ring).toHaveLength(4);
    // startAngle 0, four coins at 0/90/180/270 and all at exactly `distance`.
    for (const coin of ring) {
      expect(Math.hypot(coin.x, coin.y)).toBeCloseTo(100, 6);
    }
    const angles = ring.map((c) => Math.round((Math.atan2(c.y, c.x) * 180) / Math.PI));
    expect(new Set(angles).size).toBe(4);

    // The scatter uses `random() * distance`, so with random()===0 every coin
    // lands on the origin — the opposite of the ring, and the discriminator.
    const scatter = spawnMoney({
      amount: 1950,
      x: 0,
      y: 0,
      distance: 100,
      radiusFor,
      random: () => 0,
    });
    for (const coin of scatter) {
      expect(Math.hypot(coin.x, coin.y)).toBeCloseTo(0, 6);
    }
  });

  it('gives a launched drop speed and a placed one none', () => {
    // `move` at `:626`. The flag reward is the only caller passing false.
    const launched = spawnMoney({ amount: 1, x: 0, y: 0, radiusFor, random: () => 0.5 });
    const placed = spawnMoney({
      amount: 1,
      x: 0,
      y: 0,
      move: false,
      radiusFor,
      random: () => 0.5,
    });
    // `1.2 + 0.5` at the AS3's numbers, times T218's launch scale. Derived
    // rather than restated, so retuning the scale does not need a new literal
    // here — and a change that broke the relationship still fails.
    expect(Math.hypot(launched[0].xVel, launched[0].yVel)).toBeCloseTo(
      1.7 * COIN_SPEED_SCALE * 1.5,
      6,
    );
    expect(Math.hypot(placed[0].xVel, placed[0].yVel)).toBe(0);
  });

  it('keeps a scattered coin`s launch above friction, however it is retuned', () => {
    /*
     * The floor under `COIN_SPEED_SCALE`, and the reason the AS3's own numbers
     * looked broken: `1.2 + random()` is **below** friction's 2.15, so the
     * launch is erased in the frame it happens and a drop never visibly leaves
     * the enemy. T220 eased the scale from 2.4 to 1.8, which is the direction
     * that runs at this floor — a further slowdown has to fail here rather
     * than quietly reverting the scatter.
     *
     * `random: () => 0` is the slowest coin the launch can produce, so this is
     * the worst case and not an average one.
     */
    const slowest = spawnMoney({ amount: 1, x: 0, y: 0, radiusFor, random: () => 0 });
    expect(Math.hypot(slowest[0].xVel, slowest[0].yVel)).toBeGreaterThan(COIN_FRICTION);

    // The counterpart, on the same call: at the AS3's unscaled figures the
    // launch is under friction, which is the bug the scale exists to fix.
    expect(1.2).toBeLessThan(COIN_FRICTION);
  });

  it('gives each coin the radius of its own denomination', () => {
    const coins = spawnMoney({ amount: 1002, x: 0, y: 0, radiusFor: coinRadius });
    // 1000 + 2 — the largest disc and one of the smallest, in one drop.
    expect(coins.map((c) => c.value)).toEqual([1000, 2]);
    expect(coins[0].radius).toBe(11);
    expect(coins[1].radius).toBe(5);
  });

  it('produces nothing for an empty drop', () => {
    expect(spawnMoney({ amount: 0, x: 0, y: 0, radiusFor })).toEqual([]);
  });
});

describe('tickCoin', () => {
  const coin = (over: Partial<Coin> = {}): Coin => ({
    value: 1,
    x: 400,
    y: 480,
    xVel: 0,
    yVel: 0,
    radius: 5,
    ...over,
  });

  it('collects on contact and reports the value', () => {
    const touching = coin({ x: TANK.x + 18, y: TANK.y });
    const step = tickCoin(touching, TANK, BOUNDS, 1);
    expect(step.coin).toBeNull();
    expect(step.collected).toBe(1);
  });

  it('does not collect one unit further out', () => {
    // 14 + 5 = 19 is the reach; asserted against the touching case above so
    // the boundary is pinned rather than the pass.
    const step = tickCoin(coin({ x: TANK.x + 20, y: TANK.y }), TANK, BOUNDS, 1);
    expect(step.coin).not.toBeNull();
    expect(step.collected).toBe(0);
  });

  it('is pulled toward the tank from anywhere, with no range limit', () => {
    // The property the level-done wait depends on: every coin reaches the tank
    // eventually, so the handover always arrives. A range-gated magnet would
    // look more sensible and would hang the results screen on a stray coin.
    const far = coin({ x: 630, y: 950 });
    const step = tickCoin(far, TANK, BOUNDS, 1);
    expect(step.coin).not.toBeNull();
    // Moved toward the tank on both axes.
    expect(step.coin!.x).toBeLessThan(far.x);
    expect(step.coin!.y).toBeLessThan(far.y);
  });

  it('closes the distance monotonically until collected', () => {
    // Driven rather than reasoned: 400 frames of a coin in the far corner,
    // requiring it to actually arrive. This is the wait's termination.
    let current: Coin | null = coin({ x: 635, y: 955 });
    let collected = 0;
    for (let i = 0; i < 400 && current; i += 1) {
      const step = tickCoin(current, TANK, BOUNDS, 1);
      current = step.coin;
      collected += step.collected;
    }
    expect(current).toBeNull();
    expect(collected).toBe(1);
  });

  it('never exceeds the speed cap', () => {
    // Attraction adds every frame with nothing to stop it but the cap.
    let current: Coin | null = coin({ x: 630, y: 950 });
    for (let i = 0; i < 50 && current; i += 1) {
      current = tickCoin(current, TANK, BOUNDS, 1).coin;
      if (current) {
        expect(Math.hypot(current.xVel, current.yVel)).toBeLessThanOrEqual(COIN_MAX_SPEED + 1e-9);
      }
    }
  });

  it('clamps a coin back inside the room and flips its velocity', () => {
    // Started past the wall rather than driven into it: the attraction always
    // pulls toward the tank, so a coin cannot be made to chase a wall. This
    // exercises the clamp itself, which is the part that can be wrong.
    /*
     * The velocity is derived from the constants, not a literal. At `6` this
     * used to work and stopped when T218 scaled attraction to exactly 6: one
     * frame of pull cancelled the coin dead, it never reached the wall moving
     * right, and the reflection produced 0 instead of a negative. A number
     * above attraction *plus* friction cannot be cancelled in one frame,
     * whatever the scale is retuned to.
     */
    const outside = coin({
      x: 638,
      y: 480,
      xVel: COIN_ATTRACTION + COIN_FRICTION + 4,
      yVel: 0,
    });
    const step = tickCoin(outside, TANK, BOUNDS, 1);

    expect(step.coin).not.toBeNull();
    expect(step.coin!.x).toBe(BOUNDS.roomWidth - outside.radius);
    // Reflected, not zeroed — the AS3 negates rather than stopping (`:2186`).
    // The coin was travelling right into the wall, so the reflection sends it
    // left: negative. Asserted against a stop, which would leave it at zero.
    expect(step.coin!.xVel).toBeLessThan(0);
  });
});

describe('the constants come from the AS3, not from each other', () => {
  it('states each figure against its source line', () => {
    /*
     * Copying these out of the module would be a tautology — see CLAUDE.md on
     * assertions coming from the source. These are the AS3's literals, and
     * they are still asserted after T218 scaled the flight: the originals are
     * kept as `AS3_*` precisely so this test survives the divergence rather
     * than being deleted with it.
     */
    expect(COIN_FRICTION).toBe(2.15); // `:612`
    expect(AS3_COIN_ATTRACTION).toBe(2.5); // `:2155`
    expect(AS3_COIN_MAX_SPEED).toBe(8); // `:2160`
  });

  it('scales the flight off those figures rather than replacing them', () => {
    /*
     * T218: coins fly faster by request. Asserted as the *relationship*, so
     * retuning `COIN_SPEED_SCALE` needs no edit here, while decoupling the
     * live values from the AS3 ones — which is how a divergence quietly
     * becomes an invented constant — fails.
     */
    expect(COIN_ATTRACTION).toBeCloseTo(AS3_COIN_ATTRACTION * COIN_SPEED_SCALE, 6);
    expect(COIN_MAX_SPEED).toBeCloseTo(AS3_COIN_MAX_SPEED * COIN_SPEED_SCALE, 6);

    // And the direction of the change, so a scale of 1 or below fails: the
    // whole point is that they are faster than the original.
    expect(COIN_SPEED_SCALE).toBeGreaterThan(1);
  });

  it('launches hard enough to survive the first frame of friction', () => {
    /*
     * The reason the original read as sluggish, and the thing most easily lost
     * by retuning: `:628`'s launch is `1.2 + random()`, which is **below**
     * friction's 2.15, so the outward scatter was erased inside one frame and
     * the coin never visibly left the enemy.
     */
    const slowest = spawnMoney({
      amount: 1,
      x: 0,
      y: 0,
      radiusFor: () => 5,
      random: () => 0,
    });
    const speed = Math.hypot(slowest[0].xVel, slowest[0].yVel);

    expect(speed, 'even the slowest launch must outlive one frame of friction').toBeGreaterThan(
      COIN_FRICTION,
    );
  });

  it('has fifteen denominations, matching the fifteen clip frames', () => {
    expect(DENOMINATIONS).toHaveLength(15);
    expect(Object.keys(MONEY_CLIPS)).toHaveLength(15);
    for (const value of DENOMINATIONS) {
      expect(MONEY_CLIPS[value], `no art for ${value}`).toBeDefined();
    }
  });

  it('descends, which the greedy decomposition depends on', () => {
    const sorted = [...DENOMINATIONS].sort((a, b) => b - a);
    expect(DENOMINATIONS).toEqual(sorted);
  });
});

describe('coinRadius — reconciled against the SVG', () => {
  const svgWidth = (id: number): number => {
    const match = readFileSync(`../SWFimported/shapes/${id}.svg`, 'utf8').match(/width="([\d.]+)/);
    if (!match) throw new Error(`no width in shapes/${id}.svg`);
    return Number(match[1]);
  };

  it('equals half the body`s authored width for every denomination', () => {
    // Same discipline as `enemyArt.test.ts`: read back out of the exported SVG,
    // not out of the table, so a transcription slip fails rather than becoming
    // the new truth.
    for (const value of DENOMINATIONS) {
      expect(coinRadius(value), `${value}`).toBeCloseTo(svgWidth(MONEY_CLIPS[value].body) / 2, 6);
    }
  });

  it('never shrinks as the denomination rises', () => {
    // Five distinct bodies across fifteen frames, so most steps are flat. The
    // non-monotonic ladder is exactly what exposed the frame-parser bug — a
    // 4.2-unit Money5 against a 7-unit Money1 — so it is pinned here.
    const ascending = [...DENOMINATIONS].sort((a, b) => a - b);
    for (let i = 1; i < ascending.length; i += 1) {
      expect(
        coinRadius(ascending[i]),
        `${ascending[i]} is smaller than ${ascending[i - 1]}`,
      ).toBeGreaterThanOrEqual(coinRadius(ascending[i - 1]));
    }
  });

  it('throws for a value with no art rather than defaulting', () => {
    expect(() => coinRadius(3)).toThrow();
  });
});

/**
 * The figure on a coin has to fit the coin — T222.
 *
 * Extracted from the scene so it can be driven at all: the measurement
 * (`Text.displayWidth`) can only come from a live game object, but the
 * *decision* made with it is arithmetic, and arithmetic in a scene is
 * arithmetic no test can reach.
 */
describe('figureFit', () => {
  it('leaves a figure that already fits completely alone', () => {
    // Well inside the allowance: no scaling, exactly 1, not 0.999.
    expect(figureFit(8, 22)).toBe(1);
  });

  it('shrinks one that overhangs to exactly the allowance', () => {
    /*
     * The case that motivated it, with the numbers from the run: `$50` came
     * out 14 units wide on a 13-unit disc. Asserted as the computed value
     * rather than "less than 1" — the figure is knowable here.
     */
    const scale = figureFit(14, 13);
    expect(scale).toBeCloseTo((13 * MONEY_FIGURE_FIT) / 14, 10);
    expect(14 * scale).toBeCloseTo(13 * MONEY_FIGURE_FIT, 10);
  });

  it('never grows a figure, however small it is', () => {
    // The other direction, which a `room / width` written without the guard
    // would get wrong: a 2-unit figure on a 22-unit disc must stay 2 units.
    expect(figureFit(2, 22)).toBe(1);
  });

  it('lands exactly on the boundary without scaling', () => {
    // A figure at precisely the allowance fits; `>` rather than `>=` is what
    // this pins, and an off-by-one there would scale by 1 anyway — so the
    // counterpart below is what gives it teeth.
    const size = 20;
    expect(figureFit(size * MONEY_FIGURE_FIT, size)).toBe(1);
    expect(figureFit(size * MONEY_FIGURE_FIT + 0.001, size)).toBeLessThan(1);
  });

  it('returns 1 rather than a nonsense scale on metrics it cannot use', () => {
    /*
     * Zero width is the real case: a face that has not finished loading
     * measures as nothing, and `room / 0` is `Infinity` — a figure scaled to
     * infinity is a very visible bug, and it would happen exactly once, at
     * boot, on a slow connection.
     */
    for (const width of [0, -3, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(figureFit(width, 20), `width ${width}`).toBe(1);
    }
    for (const size of [0, -1, Number.NaN]) {
      expect(figureFit(14, size), `size ${size}`).toBe(1);
    }
  });

  it('keeps the floor below the ratio`s own answer for a mid-sized coin', () => {
    /*
     * The floor is meant to catch only the smallest discs. It was `7`, which
     * is above the ratio's answer for every denomination up to `$500` — so it
     * clamped nearly all of them to one size and the ratio decided nothing.
     *
     * Pinned as the relationship on a real disc size (a `$50` coin is 13 units
     * across) rather than as the two literals, so retuning either moves this
     * deliberately.
     */
    const midDisc = 13;
    expect(MONEY_FIGURE_MIN).toBeLessThanOrEqual(Math.round(midDisc * MONEY_FIGURE_SCALE) + 1);

    // And the counterpart: it still catches the smallest coin, whose ratio
    // answer is 4 units and would be unreadable.
    const smallestDisc = 10;
    expect(MONEY_FIGURE_MIN).toBeGreaterThan(Math.round(smallestDisc * MONEY_FIGURE_SCALE));
  });
});

describe('the campaign multiplier sits on top of the AS3 payout', () => {
  const input: DropInput = {
    money: 100,
    isBoss: false,
    bossAmount: 1,
    mode: 'Normal',
    reachedTank: false,
    tankHp: 50,
  };

  it('scales what the original would have paid', () => {
    // The seam, stated once: `dropAmount` is the AS3's rule with `D-3`'s
    // multiplier applied. Driven rather than described, because the two are in
    // separate modules and nothing else checks they are composed.
    expect(dropAmount(input)).toBe(campaignMoney(baseDropAmount(input)));
    expect(dropAmount(input)).toBeGreaterThan(baseDropAmount(input));
  });

  it('leaves a zero payout at zero', () => {
    /*
     * The counterpart, and the one that matters: multiplying is not the same as
     * paying. A kill that pays nothing — the enemy reached the tank, the tank
     * died, a Flag level — must still pay nothing, not `0 * 2.05` rounded up
     * to a coin.
     */
    for (const over of [
      { reachedTank: true },
      { tankHp: 0 },
      { mode: 'Flag' },
    ] as Partial<DropInput>[]) {
      const zeroed = { ...input, ...over };
      expect(baseDropAmount(zeroed), JSON.stringify(over)).toBe(0);
      expect(dropAmount(zeroed), JSON.stringify(over)).toBe(0);
    }
  });
});
