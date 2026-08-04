/**
 * Every particle type must resolve to real art.
 *
 * This replaces a guarantee the original had for free. `presetFor` falls
 * through to the debris preset for an unrecognised type — faithful, because the
 * AS3 picks debris with a negative check — but the AS3 also had a compiler that
 * refused `new ParticleTpyo()`. Here a mistyped type would silently render as
 * debris and look almost right.
 *
 * So the check lives here instead of tightening the fallback: a typo fails the
 * build rather than shipping as a wrong-looking effect.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { PARTICLE_CLIPS, particleShape } from './particleArt';
import { DEBRIS_PRESET, PARTICLE_PRESETS, presetFor } from './particles';

const SHAPES = new Set(readdirSync('../SWFimported/shapes'));

/** Every colour the AS3 dispatches to a debris clip — `:730-742`. */
const DEBRIS_TYPES = [
  'EnemyGreen', 'EnemyGreen2', 'EnemyGreen3', 'EnemyGrey', 'EnemyYellow',
  'EnemyYellow2', 'EnemyBlack', 'EnemyRedGrey', 'EnemyRed', 'EnemyCyan', 'EnemyBlue',
];

describe('every named type resolves to a clip', () => {
  it.each(Object.keys(PARTICLE_PRESETS))('%s', (type) => {
    const sprite = PARTICLE_PRESETS[type].sprite;
    expect(PARTICLE_CLIPS[sprite], `${type} -> Particle${sprite}`).toBeDefined();
  });

  it.each(DEBRIS_TYPES)('%s falls through to debris and still has art', (type) => {
    // The permissive path, checked rather than trusted: the fallback strips the
    // `Enemy` prefix, so the clip must exist under the bare colour name.
    const preset = presetFor(type);
    expect(preset.velocity).toBe(DEBRIS_PRESET.velocity);
    expect(PARTICLE_CLIPS[preset.sprite], `${type} -> Particle${preset.sprite}`).toBeDefined();
  });

  it('and a genuinely unknown name has no art, rather than borrowing some', () => {
    // The failure this guards: a typo must not quietly render. It still gets
    // the debris *preset* — faithful — but no clip, so it is visibly absent.
    expect(presetFor('EnemyTpyo').velocity).toBe(DEBRIS_PRESET.velocity);
    expect(particleShape('Tpyo', 1)).toBeUndefined();
  });
});

describe('every clip frame names a shape that exists', () => {
  it.each(Object.entries(PARTICLE_CLIPS))('%s', (name, clip) => {
    expect(clip.frames.length, `${name} has no frames`).toBeGreaterThan(0);
    for (const shape of clip.frames) {
      expect(SHAPES.has(`${shape}.svg`), `${name} -> ${shape}.svg`).toBe(true);
    }
  });

  it('covers all thirty-two', () => {
    expect(Object.keys(PARTICLE_CLIPS)).toHaveLength(32);
  });

  it('clamps a frame past the end rather than returning undefined', () => {
    const multi = Object.entries(PARTICLE_CLIPS).find(([, c]) => c.frames.length > 1);
    expect(multi).toBeDefined();
    const [name, clip] = multi!;
    expect(particleShape(name, 99)).toBe(clip.frames[clip.frames.length - 1]);
  });
});
