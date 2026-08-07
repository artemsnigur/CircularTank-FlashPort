import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  ACCELERATING_BOSS_TIMER_MAX,
  ACCELERATING_TIMER_MAX,
  acceleratesWhileUndamaged,
  acceleratingFactor,
  acceleratingSpeeds,
  BOSS_DECAY,
  DECAY_BASE,
  DECAY_SPEED_FLOOR,
  RAGE_TIMER_MAX,
  decayPerFrame,
  decayedSpeeds,
  decaysOverTime,
  isImmuneToDamage,
  createAcceleratingState,
  createRageState,
  rageSpeeds,
  ragesWhenDamaged,
  tickAccelerating,
  tickRage,
} from './enemyStatMods';
import { ENEMY_STATS } from './enemyStatsData';
import { resolveEnemyStats } from './enemyStats';
import { ENEMY_TIER_MULTIPLIERS, getDifficultyProfile } from '../config/difficultyMultipliers';

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
    //
    // Six callers: five damage sources — laser, status effects, explosions,
    // bullets, and the Lava Ball's ground trail — plus Medic's heal, which is
    // the one that goes *up*. The count is asserted rather than a floor so a
    // seventh has to be considered rather than just added.
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).not.toMatch(/enemy\.health\s*=[^=]/);
    expect(scene).not.toMatch(/enemy\.health\s*-=/);
    expect(scene.match(/\.setHealth\(|\.takeDamage\(/g) ?? []).toHaveLength(6);
  });
});

/* ── Temperamental ───────────────────────────────────────────────────────── */

const rageFor = (frames: number, state = createRageState()) => {
  let s = state;
  for (let i = 0; i < frames; i += 1) s = tickRage(s, 1, false, false);
  return s;
};

describe('rage', () => {
  it('starts calm and having never raged', () => {
    expect(createRageState()).toMatchObject({ angry: false, hasRaged: false, angryTimer: 0 });
  });

  it('is triggered by damage and lasts 7.5 seconds', () => {
    expect(RAGE_TIMER_MAX).toBe(225);
    const hit = tickRage(createRageState(), 1, true, false);
    expect(hit).toMatchObject({ angry: true, hasRaged: true, angryTimer: 225 });

    expect(rageFor(224, hit).angry).toBe(true);
    expect(rageFor(225, hit).angry).toBe(false);
  });

  it('renewed damage resets the clock rather than extending it', () => {
    // `angryTimer = angryTimerMax` runs unconditionally on a hit, while the
    // boosts sit behind `if (!angry)`. So a second hit refreshes and does not
    // stack.
    const angry = tickRage(createRageState(), 1, true, false);
    const halfway = rageFor(150, angry);
    expect(halfway.angryTimer).toBe(75);

    const hitAgain = tickRage(halfway, 1, true, false);
    expect(hitAgain.angryTimer).toBe(225);
  });

  it('does not re-apply anything when already angry', () => {
    const first = tickRage(createRageState(), 1, true, false);
    const second = tickRage(first, 1, true, false);
    // Same state, not a stacked one — the only difference is the refreshed clock.
    expect(rageSpeeds(first.angry, false, false)).toEqual(rageSpeeds(second.angry, false, false));
  });
});

describe('rage speeds', () => {
  const base = ENEMY_STATS.Temperamental.normal;

  it('non-boss quadruples speed, doubles acceleration, triples turn rate', () => {
    expect(rageSpeeds(true, false, false)).toEqual({
      moveSpeedMax: base.moveSpeedMax * 4,
      accSpeed: base.accSpeed * 2,
      rotSpeedMax: base.rotSpeedMax * 3,
    });
    // Concretely: 1 -> 4, 0.2 -> 0.4, 2 -> 6.
    expect(rageSpeeds(true, false, false)).toEqual({
      moveSpeedMax: 4,
      accSpeed: 0.4,
      rotSpeedMax: 6,
    });
  });

  it('a boss gains speed and acceleration but no turn rate at all', () => {
    // x3/x2/x1 against the non-boss x4/x2/x3.
    const boss = ENEMY_STATS.Temperamental.boss;
    expect(rageSpeeds(true, true, false)).toEqual({
      moveSpeedMax: boss.moveSpeedMax * 3,
      accSpeed: boss.accSpeed * 2,
      rotSpeedMax: boss.rotSpeedMax,
    });
    expect(rageSpeeds(true, true, false).rotSpeedMax).toBe(rageSpeeds(false, true, false).rotSpeedMax);
  });

  it('the boss branch ignores Tower, where the non-boss branch respects it', () => {
    // Reproduced asymmetry: `:6660-6665` has no `levelMode != "Tower"` guard.
    expect(rageSpeeds(true, false, true).accSpeed).toBeUndefined();
    expect(rageSpeeds(true, false, true).rotSpeedMax).toBeUndefined();

    expect(rageSpeeds(true, true, true).accSpeed).toBe(0.4);
    expect(rageSpeeds(true, true, true).rotSpeedMax).toBe(2);
  });

  it('calming restores the raw table, not the resolved stats', () => {
    // The reproduced quirk that matters most. On Medium the enemy spawns at
    // 1.1; raging once and calming leaves it at 1.0 for the rest of the level,
    // permanently slower than one that was never hit.
    const medium = resolveEnemyStats('Temperamental', '1', 'Medium')!;
    expect(medium.moveSpeedMax).toBeCloseTo(1.1, 10);

    expect(rageSpeeds(false, false, false).moveSpeedMax).toBe(1);
    expect(rageSpeeds(false, false, false).moveSpeedMax).toBeLessThan(medium.moveSpeedMax);
  });
});

/**
 * The one that most needs asserting side by side.
 *
 * Accelerating and Temperamental sit adjacent in the AS3, both use 225 frames,
 * and freezing does the **opposite** thing to each. Conflating them later would
 * be easy and would look like a plausible simplification.
 */
describe('freezing does opposite things to the two ramps', () => {
  it('resets Accelerating outright', () => {
    const wound = wind(200);
    expect(acceleratingFactor(wound)).toBeGreaterThan(0.8);
    expect(acceleratingFactor(tickAccelerating(wound, 1, false, true))).toBe(0);
  });

  it('pauses Temperamental instead, keeping the rage', () => {
    const angry = tickRage(createRageState(), 1, true, false);
    const halfway = rageFor(150, angry);
    expect(halfway.angryTimer).toBe(75);

    let frozen = halfway;
    for (let i = 0; i < 100; i += 1) frozen = tickRage(frozen, 1, false, true);

    expect(frozen.angry).toBe(true);
    expect(frozen.angryTimer).toBe(75);
  });

  it('cannot be newly angered while frozen', () => {
    const frozen = tickRage(createRageState(), 1, true, true);
    expect(frozen.angry).toBe(false);
    expect(frozen.hasRaged).toBe(false);
  });

  it('still calms while frozen if the clock already ran out', () => {
    // The calm check sits outside the frozen guard in the original.
    const angry = tickRage(createRageState(), 1, true, false);
    const expired = rageFor(225, angry);
    expect(expired.angry).toBe(false);
  });
});

describe('which types rage', () => {
  it('is Temperamental alone', () => {
    expect(ragesWhenDamaged('Temperamental')).toBe(true);
    for (const other of ['Accelerating', 'Basic', 'Shrinking', 'Strong']) {
      expect(ragesWhenDamaged(other), other).toBe(false);
    }
  });
});

/* ── DamageAddict ────────────────────────────────────────────────────────── */

describe('the decay rate', () => {
  it('is 0.045 a frame at Easy tier 1, and flat 0.1 for a boss', () => {
    expect(decayPerFrame(1, 1, false)).toBe(DECAY_BASE);
    expect(DECAY_BASE).toBe(0.045);
    // The boss rate ignores both multipliers entirely.
    expect(decayPerFrame(1.4, 1.4, true)).toBe(BOSS_DECAY);
    expect(BOSS_DECAY).toBe(0.1);
  });

  it('dampens the multipliers rather than reusing them', () => {
    // 90% of the difficulty excess, 50% of the tier excess.
    expect(decayPerFrame(1.225, 1, false)).toBeCloseTo(0.045 * 1.2025, 10);
    expect(decayPerFrame(1, 1.225, false)).toBeCloseTo(0.045 * 1.1125, 10);
    expect(decayPerFrame(1.4, 1.4, false)).toBeCloseTo(0.045 * 1.36 * 1.2, 10);
  });

  it('holds lifetime near-constant across every difficulty and tier', () => {
    // The reason the dampening exists. Health scales, so the bleed scales with
    // it and the enemy always lives around twenty seconds — the rate is a
    // lifetime constant in disguise.
    const base = ENEMY_STATS.DamageAddict.normal.health;
    const lifetimes: number[] = [];

    for (const difficulty of ['Easy', 'Medium', 'Hard'] as const) {
      for (const tier of ['1', '2', '3'] as const) {
        const health = resolveEnemyStats('DamageAddict', tier, difficulty)!.health;
        const rate = decayPerFrame(
          getDifficultyProfile(difficulty).enemyHealth,
          ENEMY_TIER_MULTIPLIERS[tier],
          false,
        );
        lifetimes.push(health / rate / 30);
      }
    }

    expect(base).toBe(25);
    for (const seconds of lifetimes) {
      expect(seconds).toBeGreaterThan(18);
      expect(seconds).toBeLessThan(23);
    }
    // And the spread is small — the dampening buys a little at the top end.
    expect(Math.max(...lifetimes) - Math.min(...lifetimes)).toBeLessThan(4);
  });
});

describe('the slow as it dies', () => {
  const base = ENEMY_STATS.DamageAddict.normal;

  it('is unchanged above three health', () => {
    expect(decayedSpeeds(3, false, false).moveSpeedMax).toBe(base.moveSpeedMax);
    expect(decayedSpeeds(25, false, false).moveSpeedMax).toBe(base.moveSpeedMax);
  });

  it('lerps to a floor of 0.2, not to zero', () => {
    // A nearly-dead one crawls rather than stopping dead.
    expect(decayedSpeeds(0, false, false).moveSpeedMax).toBe(DECAY_SPEED_FLOOR);
    expect(decayedSpeeds(1.5, false, false).moveSpeedMax).toBeCloseTo(0.85, 10);
  });

  it('barely touches acceleration, because base and floor are close', () => {
    // 0.25 -> 0.2, so the visible effect is almost entirely top speed.
    expect(base.accSpeed).toBe(0.25);
    expect(decayedSpeeds(0, false, false).accSpeed).toBe(0.2);
  });

  it('uses a threshold of 30 for a boss', () => {
    expect(decayedSpeeds(30, true, false).moveSpeedMax).toBe(
      ENEMY_STATS.DamageAddict.boss.moveSpeedMax,
    );
    expect(decayedSpeeds(0, true, false).moveSpeedMax).toBe(DECAY_SPEED_FLOOR);
  });

  it('the boss branch ignores Tower, where the non-boss branch respects it', () => {
    // Same reproduced asymmetry as Temperamental's boss branch.
    expect(decayedSpeeds(1, false, true).accSpeed).toBeUndefined();
    expect(decayedSpeeds(1, true, true).accSpeed).toBeDefined();
  });

  it('discards the difficulty multiplier from spawn, the strongest form', () => {
    // Temperamental loses it after a first rage; Accelerating merely tops out
    // lower. This one writes the raw base every frame from the start.
    const hard = resolveEnemyStats('DamageAddict', '1', 'Hard')!;
    expect(hard.moveSpeedMax).toBeCloseTo(1.8, 10);
    expect(decayedSpeeds(25, false, false).moveSpeedMax).toBe(1.5);
  });
});

describe('immunity', () => {
  it('is DamageAddict alone, and it also decays', () => {
    expect(isImmuneToDamage('DamageAddict')).toBe(true);
    expect(decaysOverTime('DamageAddict')).toBe(true);
    for (const other of ['Basic', 'Strong', 'Temperamental', 'Accelerating']) {
      expect(isImmuneToDamage(other), other).toBe(false);
      expect(decaysOverTime(other), other).toBe(false);
    }
  });

  it('guards setHealth, so every damage source inherits it', () => {
    const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(source).toContain('if (next < this.health && isImmuneToDamage(this.enemyType)) return;');
  });

  it('the private bleed is the only bypass, and there is exactly one caller', () => {
    // The point of making it private and named rather than a `force` flag on
    // setHealth: immunity cannot be opted out of by a future damage source.
    const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(source).toContain('private bleed(amount: number): void');
    expect(source.match(/this\.bleed\(/g) ?? []).toHaveLength(1);

    // And nothing outside the entity writes health directly.
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).not.toMatch(/enemy\.health\s*=[^=]/);
  });

  /**
   * **A source-shape check. It proves the removal is written this way; it
   * cannot prove any branch is reached.** Flagged inline per CLAUDE.md.
   *
   * ── What this replaced, and why ───────────────────────────────────────────
   * This was `/enemy\.update\([\s\S]{0,400}?removeEnemy\(enemy, true\)/` — a
   * proximity window measuring the gap between two calls **in characters**. It
   * broke four times on correct changes (T35 `shieldWiring`, T36 `killTally`,
   * T41 `equipWiring`, and T71 when twenty lines of teleport-sound wiring
   * landed between the two), and caught **zero** defects, because the distance
   * between two calls is not the property anyone cares about.
   *
   * ── The property it was actually protecting ──────────────────────────────
   * That `DamageAddict`'s self-inflicted death is not resolved by a bespoke
   * path — kill count, money drop, death blast and wave accounting all hang off
   * `removeEnemy`, so a second removal site would silently skip all four.
   *
   * That is assertable directly: **`removeEnemy` is the only thing that removes
   * an enemy.** Asserted by counting the two operations that actually do the
   * removing, which does not drift when unrelated code is added between calls.
   */
  it('removeEnemy is the only path that removes an enemy', () => {
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

    // Exactly one splice and one destroy, both inside `removeEnemy`. A second
    // of either is a removal that skips the kill count and the money drop.
    expect(scene.match(/this\.enemies\.splice\(/g) ?? []).toHaveLength(1);
    expect(scene.match(/enemy\.destroy\(\)/g) ?? []).toHaveLength(1);

    // And the decay death routes through it with `true`, which is what
    // separates a kill from a contact suicide.
    expect(scene).toContain('if (enemy.health <= 0) this.removeEnemy(enemy, true);');
  });
});
