import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  BURN_ANGLE_JITTER,
  BURN_ANGLE_UP,
  BURN_PARTICLE_FRAMES,
  BURN_REFERENCE_RADIUS,
  burnFlame,
  tickBurnClock,
} from './burnParticles';
import { PARTICLE_PRESETS, particleFrame, presetFor, spawnParticles } from './particles';
import { PARTICLE_CLIPS } from './particleArt';

describe('tickBurnClock', () => {
  it('emits once every `BURN_PARTICLE_FRAMES`, not every frame', () => {
    /*
     * The whole budget. Fire damage lands **every frame** an enemy overlaps a
     * flame or stands in lava, so a clock that emitted on each call would be
     * 30 particles a second per enemy — the clutter the request warned about.
     *
     * Counted over a run rather than spot-checked, since the claim is a rate.
     */
    let timer = 0;
    let emitted = 0;
    for (let frame = 0; frame < 100; frame += 1) {
      const next = tickBurnClock(timer);
      timer = next.timer;
      if (next.emit) emitted += 1;
    }

    /*
     * The period is `BURN_PARTICLE_FRAMES + 1`, not `BURN_PARTICLE_FRAMES` —
     * one call to emit and re-arm, then that many to count back down. My first
     * draft of this asserted the wrong figure and failed.
     *
     * It is the **AS3's own off-by-one**, not a slip: `:6333` runs poison's
     * clock as `if(timer > 0) --timer; else { spawn; timer = max; }`, so
     * `poisonParticleTimerMax = 3` is a puff every four frames. Reproducing
     * the idiom reproduces the period, and correcting it here would silently
     * make this emitter faster than the one it is modelled on.
     */
    expect(emitted).toBe(100 / (BURN_PARTICLE_FRAMES + 1));

    // The counterpart: it does emit. A clock that never fired would also keep
    // the budget, and would be the bug this feature exists to avoid.
    expect(emitted).toBeGreaterThan(0);
  });

  it('fires on the first call, so a fresh burn shows immediately', () => {
    // An enemy that walks into lava should flame on the frame it does, not
    // four frames later — the counter starts at zero and this is what makes
    // that the *right* starting value rather than an accident.
    expect(tickBurnClock(0).emit).toBe(true);
    expect(tickBurnClock(1).emit).toBe(false);
  });

  it('re-arms to the full interval, so the rate cannot drift', () => {
    const first = tickBurnClock(0);
    expect(first.timer).toBe(BURN_PARTICLE_FRAMES);

    // And counts all the way down before the next, emitting on none of the
    // way there — the loop walks the whole cycle rather than sampling it.
    let timer = first.timer;
    for (let i = 0; i < BURN_PARTICLE_FRAMES; i += 1) {
      const step = tickBurnClock(timer);
      expect(step.emit, `frame ${i} of the count-down`).toBe(false);
      timer = step.timer;
    }
    expect(timer).toBe(0);
    expect(tickBurnClock(timer).emit, 'the cycle closes').toBe(true);
  });
});

describe('burnFlame', () => {
  it('leans up, within the jitter, at both ends of the roll', () => {
    // 270 is up — the same convention `:4317`'s heal particle uses. Driven at
    // the extremes rather than sampled, so the arc is pinned rather than
    // observed.
    expect(burnFlame(14, () => 0).startAngle).toBeCloseTo(BURN_ANGLE_UP - BURN_ANGLE_JITTER, 10);
    expect(burnFlame(14, () => 1).startAngle).toBeCloseTo(BURN_ANGLE_UP + BURN_ANGLE_JITTER, 10);
    expect(burnFlame(14, () => 0.5).startAngle).toBeCloseTo(BURN_ANGLE_UP, 10);
  });

  it('never leans past horizontal, so no flame points downward', () => {
    /*
     * The reason the jitter is 45 and not 90: a flame is drawn from its base
     * along its heading, so one aimed below horizontal reads as dripping
     * rather than burning. Asserted as the property, not the number.
     */
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      const angle = burnFlame(14, () => r).startAngle;
      expect(angle, `roll ${r}`).toBeGreaterThan(180);
      expect(angle, `roll ${r}`).toBeLessThan(360);
    }
  });

  it('scales the flame with the enemy, so a boss burns bigger', () => {
    expect(burnFlame(BURN_REFERENCE_RADIUS, () => 0.5).addMaxScale).toBe(0);
    expect(burnFlame(BURN_REFERENCE_RADIUS * 3, () => 0.5).addMaxScale).toBeCloseTo(2, 10);
  });

  it('never returns a negative scale bonus, however small the enemy', () => {
    /*
     * The same class of bug as the ice block's negative scale (`A81`), and
     * found the same way — by asking what the smallest enemy does. The tick
     * interpolates *from* `scaleMax` *to* `scaleMin`, so pushing `scaleMax`
     * under `scaleMin` makes a flame **grow as it dies**, which is the
     * opposite of the read.
     */
    for (const radius of [1, 5, 13.9, 0, -4, Number.NaN]) {
      expect(burnFlame(radius, () => 0.5).addMaxScale, `radius ${radius}`).toBeGreaterThanOrEqual(0);
    }

    // And the resulting scaleMax still clears scaleMin on the smallest enemy.
    const preset = PARTICLE_PRESETS.Burn;
    expect(preset.scaleMax + burnFlame(1, () => 0.5).addMaxScale).toBeGreaterThan(preset.scaleMin);
  });
});

describe('the Burn preset', () => {
  it('draws real flame art with all four of its frames', () => {
    /*
     * It borrows the muzzle flare, which is a flame drawn for this game — the
     * alternative was tinting generic debris, which would have been an
     * invented *look* on top of an invented effect.
     */
    const preset = presetFor('Burn');
    expect(preset.sprite).toBe('MuzzleFlareSmall');
    expect(PARTICLE_CLIPS[preset.sprite].frames).toHaveLength(4);

    const frames = new Set([0, 0.2, 0.5, 0.8, 1].map((r) => particleFrame('Burn', () => r)));
    expect(frames.size).toBeGreaterThan(1);
    for (const f of frames) expect(f).toBeLessThanOrEqual(4);
  });

  it('faces the angle it is given, and shrinks as it dies', () => {
    // `facesStartAngle` is what makes one flame's jittered angle its rotation
    // as well as its heading; without it every flame would draw at a random
    // rotation and the lean would be invisible.
    const preset = PARTICLE_PRESETS.Burn;
    expect(preset.facesStartAngle).toBe(true);
    expect(preset.scaleMax).toBeGreaterThan(preset.scaleMin);

    // Short-lived, which is the other half of the budget.
    expect(preset.lifeTime + preset.lifeTimeRandom).toBeLessThan(12);
  });

  it('sustains about two live flames per burning enemy', () => {
    /*
     * The budget stated as the number a reader would want: emission rate times
     * mean lifetime. Twenty burning enemies is then about forty particles —
     * against nine to fourteen thrown by a single enemy death.
     */
    const preset = PARTICLE_PRESETS.Burn;
    const meanLife = preset.lifeTime + preset.lifeTimeRandom / 2;
    const live = meanLife / BURN_PARTICLE_FRAMES;

    expect(live).toBeGreaterThan(1);
    expect(live).toBeLessThan(3);
  });

  it('spawns through the ordinary particle path, carrying its frame', () => {
    const [flame] = spawnParticles({
      type: 'Burn',
      count: 1,
      x: 10,
      y: 20,
      distance: 0,
      startAngle: 250,
      randAngle: 0,
    });

    expect(flame.type).toBe('Burn');
    expect(flame.rotation).toBe(250);
    expect(flame.frame).toBeGreaterThanOrEqual(1);
    expect(flame.frame).toBeLessThanOrEqual(4);
  });
});

describe('the scene emits from both fire sources', () => {
  const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

  it('calls one emitter from lava and from a flame round', () => {
    /*
     * Source-shape, and narrow: it proves two call sites are written, not that
     * they run — the driven half is T233's run. What it buys is the thing that
     * would actually go wrong: one source getting flames and the other not,
     * which is invisible unless you happen to test both weapons.
     */
    expect(SCENE.match(/this\.emitBurnFlame\(/g) ?? []).toHaveLength(2);

    const lavaLoop = /for \(const effect of result\.effects\) \{[\s\S]{0,3000}?\n {4}\}/.exec(SCENE);
    expect(lavaLoop, 'the hazard effect loop was not found').not.toBeNull();
    expect(lavaLoop![0], 'lava does not emit flames').toMatch(/emitBurnFlame/);

    const burn = /private burnEnemy\([\s\S]{0,3000}?\n {2}\}/.exec(SCENE);
    expect(burn, 'burnEnemy was not found').not.toBeNull();
    expect(burn![0], 'a flame round does not emit flames').toMatch(/emitBurnFlame/);
  });

  it('emits before the damage, so a lethal tick still shows one', () => {
    // An enemy that dies to this tick is removed inside `hitEnemy`; emitting
    // after it would drop the last flame of every kill, which is the frame a
    // player is most likely to be looking at.
    const burn = /private burnEnemy\([\s\S]{0,3000}?\n {2}\}/.exec(SCENE)![0];
    expect(burn.indexOf('emitBurnFlame')).toBeLessThan(burn.indexOf('this.hitEnemy'));
  });
});
