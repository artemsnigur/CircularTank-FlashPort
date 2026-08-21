/**
 * Burning has no indicator, and that is the finding — not a gap.
 *
 * The ice block (`A81`) prompted the obvious question: is there a lava one?
 * There is not, and this file is where the sweep that established it lives, so
 * the next reader does not repeat it from scratch.
 *
 * **Two claims, and only one of them can be tested.** "The AS3 has no burn
 * overlay" is about a source this repo cannot execute, so what is mechanised
 * here is the *derivable* half: that the extraction contains no such asset,
 * and that the port has no burn-timer field an indicator could hang off. The
 * rest is a citation.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { createStatusState } from '../enemies/statusEffects';

const SYMBOLS = readFileSync('../SWFimported/symbolClass/symbols.csv', 'utf8');
const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

describe('the extraction carries no burn indicator', () => {
  it('has an ice indicator symbol and no fire, lava or burn counterpart', () => {
    /*
     * The sweep, over all 518 symbols by name. **A name sweep is a floor**, so
     * the claim is "none found by this method" rather than "none exists" — but
     * the method is the same one that *found* `IndicatorIce`, and it found it
     * on the first pass, so it is not a method that misses indicators.
     *
     * Asserted as the pair: the positive is what gives the negative meaning.
     */
    const named = (re: RegExp): string[] =>
      [...SYMBOLS.matchAll(/^\d+;"([^"]+)"/gm)].map((m) => m[1]).filter((n) => re.test(n));

    expect(named(/^Indicator/), 'the indicator symbols').toEqual(
      expect.arrayContaining(['IndicatorIce']),
    );

    // Everything fire-shaped in the whole table is a projectile, a ground
    // patch, a shop button or a sound — nothing that could sit on an enemy.
    const fiery = named(/fire|flame|burn|lava/i).sort();
    expect(fiery).toEqual([
      'BulletFire',
      'BulletLavaball',
      'ButtonPrimaryFlamethrower',
      'ButtonSecondaryLavaball',
      'ObjectGroundLava',
      'sndBurningLoop',
      'sndFireSpikes',
      'sndFlameThrowerLoop',
    ]);
  });
});

describe('there is no burn state to indicate', () => {
  it('carries timers for freeze, poison and the bomb — and none for fire', () => {
    /*
     * `:3335-3375` resets the enemy's whole status block. Three of them are
     * persistent and each has a visual: `frozen`/`frozenTimer` (the ice
     * block), `poisonTimer` (the puff particles) and `bombTimer` (the marker).
     *
     * `onFire` and `onLava` are **same-frame dedup booleans**, reset at
     * `:5554` before every bullet loop — which is why the port does not carry
     * them at all. There is no duration, so there is nothing an overlay could
     * be shown *for*.
     */
    const state = createStatusState();

    expect(state).toHaveProperty('frozenTimer');
    expect(state).toHaveProperty('poisonTimer');
    expect(state).toHaveProperty('bombTimer');

    for (const absent of ['onFire', 'onLava', 'fireTimer', 'burnTimer', 'lavaTimer']) {
      expect(state, `${absent} is not a status`).not.toHaveProperty(absent);
    }
  });
});

describe('what lava does do to an enemy', () => {
  it('flashes it, which is the visual the port was missing', () => {
    /*
     * `:6272` — `colorClip(theEnemy, 16711680, 0.8)` beside
     * `damageIndicator = 20`. The port applied lava's damage without it, so
     * lava was the one damage source in the game that did nothing visible to
     * what it hit.
     *
     * Source-shape, and narrow: it proves the call is written in the hazard
     * effect loop, not that the loop runs. The driven half is in T231's run.
     */
    const loop = /for \(const effect of result\.effects\) \{[\s\S]{0,3000}?\n {4}\}/.exec(SCENE);
    expect(loop, 'the hazard effect loop was not found').not.toBeNull();

    expect(loop![0]).toMatch(/enemy\.takeDamage\(effect\.damage\)/);
    expect(loop![0], 'lava damage does not flash the enemy').toMatch(/enemy\.flashDamage\(\)/);

    /*
     * And with no feedback argument. Every other site passes
     * `impactFeedback(...)` so the colour carries strong/weak, and the AS3's
     * other sites spawn a matching `Strength`/`Weakness` particle. The lava
     * branch spawns none — plain red whatever the resistance — so the bare
     * call is the faithful one, and this is what stops it being "made
     * consistent" later.
     */
    expect(loop![0], 'the lava flash should carry no strong/weak feedback').not.toMatch(
      /flashDamage\(impactFeedback/,
    );
  });

  it('leaves the freeze branch untouched, which flashes nothing', () => {
    // The counterpart: ice ground has no `colorClip` in the AS3 either — the
    // block *is* its visual. So "the hazard loop flashes" must be true of
    // exactly one of the two branches.
    const loop = /for \(const effect of result\.effects\) \{[\s\S]{0,3000}?\n {4}\}/.exec(SCENE);
    const freezeArm = /if \(effect\.kind === 'freeze'\) \{[\s\S]*?continue;\n {6}\}/.exec(loop![0]);

    expect(freezeArm, 'the freeze arm was not found').not.toBeNull();
    expect(freezeArm![0]).not.toMatch(/flashDamage/);
  });
});
