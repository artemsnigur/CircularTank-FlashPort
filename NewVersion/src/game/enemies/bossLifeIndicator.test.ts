/**
 * The boss life indicator — `PartInterface.handleLifeIndicators` (`:872-995`).
 */
import { describe, expect, it } from 'vitest';

import {
  RED_CIRCLE_ART_RADIUS,
  RED_CIRCLE_SHAPE,
  WIPE_START_DEGREES,
  discScale,
  wantsIndicator,
  wipeDegrees,
  wipeEndDegrees,
} from './bossLifeIndicator';
import { UNIT_RASTER_SCALE, UNIT_SHAPES } from '../../assets/manifest';
import { resolveEnemyStats } from './enemyStats';
import { SHRINK_FLOOR, shrinkScale, shrinksWithHealth } from './enemyBodies';
import { ENEMY_STATS } from './enemyStatsData';

describe('the wipe amount', () => {
  /**
   * `:972` — `degree = 360 * (1 - hp / totalHealth)`.
   *
   * **Exact figures, not "it changes".** Each is computed by hand from the
   * formula, so an implementation that inverted the fraction, used
   * `hp / total * 360`, or measured remaining rather than lost health fails on
   * every row rather than passing three of five.
   */
  const cases: Array<[number, number, number]> = [
    // hp, total, expected degrees
    [100, 100, 0], // full health reveals nothing
    [75, 100, 90],
    [50, 100, 180],
    [25, 100, 270],
    [0, 100, 360], // dead reveals the whole disc
  ];

  it.each(cases)('hp %i of %i -> %i degrees', (hp, total, expected) => {
    expect(wipeDegrees(hp, total)).toBe(expected);
  });

  /**
   * The counterpart to the table: the reveal **grows as health falls**. A sign
   * flip would still produce 0 and 360 at the ends and pass two of the rows.
   */
  it('grows monotonically as health drops', () => {
    const series = [100, 80, 60, 40, 20, 0].map((hp) => wipeDegrees(hp, 100));
    for (let i = 1; i < series.length; i += 1) {
      expect(series[i]).toBeGreaterThan(series[i - 1]);
    }
  });

  /**
   * The AS3 would draw a wedge past a full turn on an overheal and a negative
   * sweep on an overkill. Both are reachable here — `enemyHealing.ts` heals,
   * and a big hit takes hp below zero — so both are clamped.
   */
  it('clamps an overheal and an overkill', () => {
    expect(wipeDegrees(150, 100), 'overheal').toBe(0);
    expect(wipeDegrees(-40, 100), 'overkill').toBe(360);
    expect(wipeDegrees(50, 0), 'zero denominator').toBe(360);
  });
});

describe('the sweep direction', () => {
  /**
   * `:977` — `for (u = 270; u <= degree + 270; u++)`, and `:978` places each
   * point at `(r*cos u, r*sin u)`.
   *
   * **Driven as coordinates, not as a constant.** Asserting
   * `WIPE_START_DEGREES === 270` would pass for a sweep running the wrong way;
   * this checks where the arc's first and second points actually land. Flash
   * and Phaser both put +y downward, so the same arithmetic gives the same
   * screen direction.
   */
  // `+ 0` normalises `-0` to `+0`: `cos(270 deg)` is a hair below zero, so
  // `Math.round` yields `-0`, which `toEqual` treats as a different value.
  const at = (degrees: number, r = 10): { x: number; y: number } => ({
    x: Math.round(r * Math.cos((degrees * Math.PI) / 180)) + 0,
    y: Math.round(r * Math.sin((degrees * Math.PI) / 180)) + 0,
  });

  it('starts at 12 o\'clock', () => {
    expect(at(WIPE_START_DEGREES)).toEqual({ x: 0, y: -10 });
  });

  /**
   * One degree later the point must have moved **right**, which is clockwise
   * on a y-down screen. A counterclockwise sweep would move left, and would
   * still start at 12 o'clock — so the start point alone proves nothing.
   */
  it('moves clockwise from there', () => {
    const start = at(WIPE_START_DEGREES, 100);
    const next = at(WIPE_START_DEGREES + 10, 100);
    expect(next.x).toBeGreaterThan(start.x);
    expect(Math.abs(next.y)).toBeLessThan(Math.abs(start.y));
  });

  /** At half health the sweep ends at 90° — pointing straight down. */
  it('ends where the wipe amount says', () => {
    expect(wipeEndDegrees(50, 100)).toBe(450); // 270 + 180
    expect(at(wipeEndDegrees(50, 100))).toEqual({ x: 0, y: 10 });
    expect(wipeEndDegrees(100, 100)).toBe(270); // no sweep at all
  });
});

describe('the disc scale', () => {
  /** `:923-924` — `redCircle.scale = circleR / 50`. */
  it('scales the 100px art to the boss radius', () => {
    expect(RED_CIRCLE_ART_RADIUS).toBe(50);
    expect(discScale(50)).toBe(1);
    expect(discScale(25)).toBe(0.5);
    expect(discScale(101)).toBeCloseTo(2.02);
  });
});

describe('the denominator is the boss stat rule, already ported', () => {
  /** `resolveEnemyStats` returns undefined for an unknown type; a miss here is
   *  a real failure, so it is asserted rather than silenced with `!`. */
  const health = (level: 'B' | '1', difficulty: 'Easy' | 'Hard'): number => {
    const stats = resolveEnemyStats('Basic', level, difficulty);
    expect(stats, `Basic ${level} on ${difficulty}`).toBeDefined();
    return stats!.health;
  };

  /**
   * ── This assertion used to be its own inverse (`A95`) ───────────────────
   *
   * It read `splits a boss stat line across bossAmount` and drove 1/2/4 to
   * 500/250/125, deliberately on a multi-boss level because at 1 the division
   * is invisible. The division is now gone, so the same call on the same input
   * is a flat 500 — and that number comes from `ENEMY_STATS`, the stat table,
   * not from the code under test.
   */
  it('gives a boss the whole stat line, undivided', () => {
    expect(ENEMY_STATS.Basic.boss.health).toBe(500);
    expect(health('B', 'Easy')).toBe(500);
    expect(health('B', 'Hard')).toBe(500);
  });

  /**
   * The forced-1 half, and its counterpart on the identical call: a **boss**
   * ignores the difficulty health multiplier while an ordinary enemy of the
   * same type does not. Asserting only the boss would pass if the multiplier
   * happened to be 1 for everyone.
   */
  it('exempts a boss from the difficulty multiplier, and only a boss', () => {
    expect(health('B', 'Hard'), 'boss health does not move with difficulty')
      .toBe(health('B', 'Easy'));
    expect(health('1', 'Hard'), 'an ordinary enemy does')
      .toBeGreaterThan(health('1', 'Easy'));
  });

  /** And the wipe reads that number, so the two agree end to end. */
  it('reveals half the disc at half a boss stat line', () => {
    const total = health('B', 'Hard');
    expect(total).toBe(500);
    expect(wipeDegrees(250, total)).toBe(180);
  });
});

describe('which bosses get an indicator', () => {
  /**
   * `:1066` gates the whole routine on `levelMode == "Boss"`, and `:889` picks
   * only `enemyLevel == "B"` within it. Both halves, because either alone
   * would draw rings where the original draws none — a Normal level containing
   * a boss row, or every ordinary enemy on a Boss level.
   */
  it('needs a Boss level and a boss enemy', () => {
    expect(wantsIndicator('Boss', 'B')).toBe(true);
    expect(wantsIndicator('Boss', '1'), 'ordinary enemy on a Boss level').toBe(false);
    expect(wantsIndicator('Normal', 'B'), 'boss row on a Normal level').toBe(false);
    expect(wantsIndicator('Flag', 'B')).toBe(false);
    expect(wantsIndicator('Tower', '1')).toBe(false);
  });
});

describe('a ShrinkingB boss re-scales its disc as it shrinks', () => {
  /**
   * `:966-969` — the AS3 singles out `ShrinkingB` and re-reads
   * `theIndicator.enemy.radius` every frame, because that boss's collision
   * radius shrinks with its health (`enemyBodies.shrinkScale`,
   * `PartGameArea.as:6774`).
   *
   * The port reads `enemy.radius` for **every** boss rather than special-casing
   * one, which is the same behaviour with no branch to go stale. What that
   * relies on is the chain below actually moving: health -> shrink scale ->
   * radius -> disc scale. A cached radius would leave the disc at full size
   * over a shrunken boss, which looks like a halo and photographs as
   * deliberate.
   *
   * `ShrinkingB` is reachable: 4 levels spawn one.
   */
  it('shrinks the disc in step with the boss', () => {
    expect(shrinksWithHealth('Shrinking')).toBe(true);

    const radiusStart = 40;
    const at = (health: number): number =>
      discScale(radiusStart * shrinkScale(health, 100));

    const full = at(100);
    const half = at(50);
    const nearlyDead = at(1);

    expect(full).toBe(discScale(radiusStart));
    expect(half).toBeLessThan(full);
    expect(nearlyDead).toBeLessThan(half);

    // `SHRINK_FLOOR` — the AS3 reserves a third so the last hit stays landable,
    // so the disc never collapses to nothing either. The floor is reached at
    // **zero** health, not near it: `shrinkScale` interpolates from the floor
    // up, so at 1 of 100 it is still 0.34.
    expect(at(0)).toBeCloseTo(discScale(radiusStart * SHRINK_FLOOR), 5);
    expect(nearlyDead).toBeGreaterThan(at(0));
  });

  /**
   * The counterpart: a type that does **not** shrink keeps its radius, so its
   * disc keeps its size. Without this, "the disc follows radius" would also be
   * satisfied by a build that shrank every boss's disc with health.
   */
  it('leaves a non-shrinking boss at a constant size', () => {
    expect(shrinksWithHealth('Basic')).toBe(false);
    // `Enemy` only applies `shrinkScale` when `shrinksWithHealth`, so a Basic
    // boss's radius is its spawn radius at every health.
    expect(discScale(40)).toBe(discScale(40));
  });
});

/**
 * **The T108 defect, pinned.**
 *
 * Everything above is about *angles and sizes*, and none of it can see which
 * texture those angles reveal. T106 shipped with `1199.svg` synced to disk but
 * never added to `UNIT_SHAPES`, so `unit-1199` was never loaded and
 * `TextureManager` substituted `__MISSING` — a 32x32 black square with
 * `rgb(0,255,0)` lines. The mask then revealed *that* as the boss lost health,
 * which is the "black background with green lines" the bug was reported as.
 *
 * **Nothing failed.** A missing key raises no error, `npm run look` reported
 * "no page errors", and all 17 tests here stayed green — because the geometry
 * was never wrong.
 *
 * `projectileArt.test.ts:80` is this same check for projectiles and names the
 * same symptom in its own docstring ("a green missing-texture box"). It has
 * been in place since T84 and did not cover this disc, because the disc is
 * constructed directly by the scene rather than resolved through
 * `PROJECTILE_ART`. The mechanism existed; its reach did not include the new
 * site.
 */
describe('the disc names a texture the manifest actually loads', () => {
  const loaded = new Set(UNIT_SHAPES.map((asset) => asset.key));

  it('loads the RedCircle shape the indicator masks', () => {
    expect(loaded.has(`unit-${RED_CIRCLE_SHAPE}`)).toBe(true);
  });

  /**
   * The opposite, driven on the identical set. Without it, a `loaded` set built
   * from an empty export — or any lookup that always answered true — would
   * satisfy the assertion above while proving nothing.
   */
  it('reports a shape the manifest does not carry as absent', () => {
    expect(loaded.has('unit-999999')).toBe(false);
  });

  /**
   * The raster follows the unit convention. Both numbers are stated against the
   * **artwork**, not read back out of the manifest entry: `1199.svg` carries
   * `width="100.0px" height="100.0px"`, so the module's radius must be half of
   * that and the loaded raster must be `UNIT_RASTER_SCALE` times it. A wrong
   * number in `manifest.ts` fails here rather than being copied into the
   * expectation.
   */
  it('rasterises the disc at the unit scale, from the authored size', () => {
    const AUTHORED = 100; // `SWFimported/shapes/1199.svg`
    expect(RED_CIRCLE_ART_RADIUS * 2).toBe(AUTHORED);

    const entry = UNIT_SHAPES.find((asset) => asset.key === `unit-${RED_CIRCLE_SHAPE}`);
    expect(entry?.width).toBe(AUTHORED * UNIT_RASTER_SCALE);
    expect(entry?.height).toBe(AUTHORED * UNIT_RASTER_SCALE);
  });
});
