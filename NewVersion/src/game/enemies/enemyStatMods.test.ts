import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ACCELERATING_BOSS_TIMER_MAX,
  ACCELERATING_TIMER_MAX,
  acceleratesWhileUndamaged,
  acceleratingFactor,
  acceleratingSpeeds,
  createAcceleratingState,
  tickAccelerating,
} from './enemyStatMods';
import { ENEMY_STATS } from './enemyStatsData';
import { resolveEnemyStats } from './enemyStats';

const wind = (frames: number, isBoss = false) => {
  let state = createAcceleratingState(isBoss);
  for (let i = 0; i < frames; i += 1) state = tickAccelerating(state, 1, false, false);
  return state;
};

describe('the wind-up', () => {
  it('starts at base speed, not at full', () => {
    expect(acceleratingFactor(createAcceleratingState(false))).toBe(0);
  });

  it('takes 7.5 seconds to reach full, and 15 for a boss', () => {
    expect(ACCELERATING_TIMER_MAX).toBe(225);
    expect(ACCELERATING_BOSS_TIMER_MAX).toBe(450);
    expect(acceleratingFactor(wind(225))).toBe(1);
    expect(acceleratingFactor(wind(450, true))).toBe(1);
    // Half way, to pin that it is linear rather than eased.
    expect(acceleratingFactor(wind(112))).toBeCloseTo(0.4978, 4);
  });

  it('does not overshoot past full', () => {
    expect(acceleratingFactor(wind(10_000))).toBe(1);
  });

  it('snaps back to base on damage', () => {
    const wound = wind(200);
    expect(acceleratingFactor(wound)).toBeGreaterThan(0.8);

    const hit = tickAccelerating(wound, 1, true, false);
    expect(acceleratingFactor(hit)).toBe(0);
  });

  it('resets on healing too, because the original compares hp not damage', () => {
    // `PartGameArea.as:6695` is `hp != beforeHP`. A Medic topping this enemy up
    // therefore keeps it slow — which is why the shared observer on Enemy
    // records any change rather than only a drop.
    const wound = wind(200);
    expect(acceleratingFactor(tickAccelerating(wound, 1, true, false))).toBe(0);
  });

  it('is undone by freezing rather than paused', () => {
    const wound = wind(200);
    const frozen = tickAccelerating(wound, 1, false, true);
    expect(acceleratingFactor(frozen)).toBe(0);
  });
});

describe('the speeds it reaches', () => {
  const base = ENEMY_STATS.Temperamental.normal;

  it('quadruples move speed, triples acceleration, doubles turn rate', () => {
    const full = acceleratingSpeeds(1, false);
    expect(full.moveSpeedMax).toBeCloseTo(base.moveSpeedMax * 4, 10);
    expect(full.accSpeed).toBeCloseTo(base.accSpeed * 3, 10);
    expect(full.rotSpeedMax).toBeCloseTo(base.rotSpeedMax * 2, 10);

    // Concretely: 1 -> 4, 0.2 -> 0.6, 2 -> 4.
    expect(full).toEqual({ moveSpeedMax: 4, accSpeed: 0.6000000000000001, rotSpeedMax: 4 });
  });

  it('starts exactly at the base values', () => {
    expect(acceleratingSpeeds(0, false)).toEqual({
      moveSpeedMax: base.moveSpeedMax,
      accSpeed: base.accSpeed,
      rotSpeedMax: base.rotSpeedMax,
    });
  });

  it('leaves acceleration and turn rate to Tower, which owns them', () => {
    const tower = acceleratingSpeeds(1, true);
    expect(tower.moveSpeedMax).toBe(4);
    expect(tower.accSpeed).toBeUndefined();
    expect(tower.rotSpeedMax).toBeUndefined();
  });
});

/**
 * The two faithful reproductions of original mistakes.
 *
 * Both are deliberate. These tests exist so a future reader finds evidence
 * rather than having to decide whether the port simply got it wrong.
 */
describe('reproduced quirks', () => {
  it('reads Temperamental\'s row, which is a no-op only while the rows agree', () => {
    // `:6706-6710` say `enemyTemperamentalStats` inside the Accelerating
    // branch. Today that changes nothing, because the movement columns match.
    // If a re-extraction ever separates them, this fails and the reproduction
    // stops being invisible instead of silently changing how the enemy plays.
    const temperamental = ENEMY_STATS.Temperamental.normal;
    const accelerating = ENEMY_STATS.Accelerating.normal;

    expect(temperamental.moveSpeedMax).toBe(accelerating.moveSpeedMax);
    expect(temperamental.accSpeed).toBe(accelerating.accSpeed);
    expect(temperamental.rotSpeedMax).toBe(accelerating.rotSpeedMax);

    // The rows are not identical overall — money differs — so this is a real
    // coincidence in the columns that matter, not the same row twice.
    expect(temperamental.money).not.toBe(accelerating.money);
  });

  it('uses the non-boss row for bosses too', () => {
    // `:6706` has no boss branch, unlike Temperamental's rage a few lines
    // below. Also a no-op today, for the same reason.
    expect(ENEMY_STATS.Temperamental.boss.moveSpeedMax).toBe(
      ENEMY_STATS.Temperamental.normal.moveSpeedMax,
    );
    expect(acceleratingSpeeds(1, false).moveSpeedMax).toBe(4);
  });

  it('discards the difficulty multiplier, which is observable', () => {
    // Unlike the other two, this one changes play. Difficulty scales speed at
    // spawn; the ramp overwrites from the raw table on frame one, so a Hard
    // Accelerating enemy is pulled back to 1.0 and tops out at 4.0 rather than
    // the 4.8 its resolved stats imply.
    const hard = resolveEnemyStats('Accelerating', '1', 'Hard')!;
    expect(hard.moveSpeedMax).toBeCloseTo(1.2, 10);

    expect(acceleratingSpeeds(0, false).moveSpeedMax).toBe(1);
    expect(acceleratingSpeeds(1, false).moveSpeedMax).toBe(4);
  });
});

describe('which types accelerate', () => {
  it('is Accelerating alone', () => {
    expect(acceleratesWhileUndamaged('Accelerating')).toBe(true);
    for (const other of ['Basic', 'Fast', 'Temperamental', 'Shrinking']) {
      expect(acceleratesWhileUndamaged(other), other).toBe(false);
    }
  });
});

describe('the shared health observer', () => {
  const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');

  it('records a change and a drop separately', () => {
    expect(source).toContain('this.healthChanged = true;');
    expect(source).toContain('if (next < this.health) this.healthDropped = true;');
  });

  it('is the only way the scene writes enemy health', () => {
    // The funnel is worthless if a site bypasses it, and a bypass is silent:
    // the ramp would simply not reset, and Temperamental would not rage.
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).not.toMatch(/enemy\.health\s*=[^=]/);
    expect(scene).not.toMatch(/enemy\.health\s*-=/);
    expect(scene.match(/\.setHealth\(|\.takeDamage\(/g) ?? []).toHaveLength(4);
  });
});
