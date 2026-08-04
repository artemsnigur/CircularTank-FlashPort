import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import {
  COIN_ATTRACTION,
  COIN_FRICTION,
  COIN_MAX_SPEED,
  DENOMINATIONS,
  decomposeMoney,
  dropAmount,
  spawnMoney,
  tickCoin,
} from './money';
import type { Coin, DropInput } from './money';
import { MONEY_CLIPS, coinRadius } from './moneyArt';

const BOUNDS = { roomWidth: 640, roomHeight: 960 };
const TANK = { x: 320, y: 480, radius: 14 };

const drop = (over: Partial<DropInput> = {}): number =>
  dropAmount({ money: 100, isBoss: false, mode: 'Normal', reachedTank: false, tankHp: 50, ...over });

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
    expect(Math.hypot(launched[0].xVel, launched[0].yVel)).toBeCloseTo(1.7, 6);
    expect(Math.hypot(placed[0].xVel, placed[0].yVel)).toBe(0);
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
    const outside = coin({ x: 638, y: 480, xVel: 6, yVel: 0 });
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
    // Copying these out of the module would be a tautology — see CLAUDE.md on
    // assertions coming from the source. These are the AS3's literals.
    expect(COIN_FRICTION).toBe(2.15); // `:612`
    expect(COIN_ATTRACTION).toBe(2.5); // `:2155`
    expect(COIN_MAX_SPEED).toBe(8); // `:2160`
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
