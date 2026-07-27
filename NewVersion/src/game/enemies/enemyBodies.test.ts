import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { SHRINK_FLOOR, shrinkScale, shrinksWithHealth } from './enemyBodies';
import { resolveEnemyStats } from './enemyStats';

describe('shrinkScale', () => {
  it('is full size at full health', () => {
    expect(shrinkScale(10, 10)).toBe(1);
  });

  it('stops at a third rather than vanishing', () => {
    // The floor is the point of the formula. A plain hp/max would take the
    // enemy to nothing and make the killing blow nearly impossible to land.
    expect(shrinkScale(0, 10)).toBe(SHRINK_FLOOR);
    expect(SHRINK_FLOOR).toBeCloseTo(0.3333, 4);
  });

  it('is linear between the two', () => {
    expect(shrinkScale(5, 10)).toBeCloseTo(2 / 3, 10);
    expect(shrinkScale(7.5, 10)).toBeCloseTo(5 / 6, 10);
  });

  it('clamps health outside the range instead of trusting it', () => {
    // A killing blow overshoots below zero, and a Medic heal is capped only
    // after the fact, so both ends occur for at least a frame.
    expect(shrinkScale(-5, 10)).toBe(SHRINK_FLOOR);
    expect(shrinkScale(15, 10)).toBe(1);
  });

  it('survives a zero or missing maximum rather than returning NaN', () => {
    // Guarding this is cheap; a NaN scale silently makes the sprite vanish and
    // the radius poison every distance check that reads it.
    expect(shrinkScale(0, 0)).toBe(1);
    expect(shrinkScale(5, Number.NaN)).toBe(1);
  });
});

describe('which types shrink', () => {
  it('is Shrinking alone', () => {
    expect(shrinksWithHealth('Shrinking')).toBe(true);
    for (const other of ['Basic', 'Strong', 'Tiny', 'Fast', 'Exploding', 'Ghost']) {
      expect(shrinksWithHealth(other), other).toBe(false);
    }
  });
});

describe('the size a real Shrinking enemy takes', () => {
  it('halves its radius by the time it is nearly dead', () => {
    // Real numbers, not a proportion: Shrinking is 10 hp at tier 1 on Easy.
    const stats = resolveEnemyStats('Shrinking', '1', 'Easy')!;
    expect(stats.health).toBe(10);

    const full = shrinkScale(stats.health, stats.health);
    const nearlyDead = shrinkScale(1, stats.health);

    expect(full).toBe(1);
    expect(nearlyDead).toBeCloseTo(0.4, 10);
  });
});

describe('radius and sprite move together', () => {
  it('the entity scales both, not just the sprite', () => {
    // The failure this guards against is invisible in play: scaling only the
    // sprite makes a Shrinking enemy *look* harder to hit while remaining
    // exactly as easy, and nothing in a screenshot would show it.
    const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    const body = source.slice(
      source.indexOf('private applyBodyScale('),
      source.indexOf('/** True while frozen'),
    );
    expect(body).toContain('this.radius = size * this.radiusStart');
    expect(body).toContain('this.setScale(size)');
  });

  it('radius is mutable and starts from radiusStart', () => {
    // `radius` was readonly until Shrinking needed it. Everything that reads it
    // — contact damage, blasts, flag capture, the wall clamp — must read it
    // fresh rather than caching at spawn.
    const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(source).toMatch(/^\s{2}radius: number;/m);
    expect(source).toContain('readonly radiusStart: number;');
    expect(source).toContain('this.radiusStart = this.radius;');
  });
});
