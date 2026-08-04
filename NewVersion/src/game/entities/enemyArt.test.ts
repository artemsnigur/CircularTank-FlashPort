import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { ENEMY_CLIPS, enemyClipKey, enemyRadius, enemyShape } from './enemyArt';

/** The twenty types the port spawns. `Merge` has AS3 art but no stat row here. */
const TYPES = [
  'Accelerating', 'Basic', 'Crazy', 'DamageAddict', 'Exploding', 'Fast', 'Ghost',
  'GrapplingHook', 'Medic', 'Ninja', 'Random', 'ScaredGhost', 'Shooting',
  'Shrinking', 'Soldier', 'Strong', 'Teleporting', 'Temperamental', 'Tiny', 'Trap',
] as const;

/** The four types the AS3 gives an altered-state frame. */
const TWO_FRAME = new Set(['Ghost', 'ScaredGhost', 'Teleporting', 'Temperamental']);

/** The port's sizes before T34: one number for every normal, one for every boss. */
const BEFORE = { normal: 13, boss: 23 };

function svgWidth(shapeId: number): number {
  const svg = readFileSync(`../SWFimported/shapes/${shapeId}.svg`, 'utf8');
  const match = svg.match(/width="([\d.]+)/);
  if (!match) throw new Error(`no width in shapes/${shapeId}.svg`);
  return Number(match[1]);
}

describe('ENEMY_CLIPS — coverage', () => {
  it('resolves every type at both levels', () => {
    // This assertion is what replaces the AS3's compiler. There, the spawn
    // dispatch writes `new EnemyBasicBoss()` and a missing class is a build
    // error; here a missing key would be a silent undefined at the one call
    // site that reads it. Same trade `particleArt.ts` documents.
    for (const type of TYPES) {
      for (const isBoss of [false, true]) {
        expect(ENEMY_CLIPS[enemyClipKey(type, isBoss)], `${type} boss=${isBoss}`).toBeDefined();
      }
    }
  });

  it('gives exactly the four altered-state types a second frame', () => {
    // Asserted as a partition rather than four positives: a change that gave
    // every type two frames would pass "Ghost has two" on its own.
    for (const type of TYPES) {
      for (const isBoss of [false, true]) {
        const clip = ENEMY_CLIPS[enemyClipKey(type, isBoss)];
        expect(clip?.frames.length, `${type} boss=${isBoss}`).toBe(TWO_FRAME.has(type) ? 2 : 1);
      }
    }
  });

  it('names a real exported shape on every frame', () => {
    for (const [key, clip] of Object.entries(ENEMY_CLIPS)) {
      for (const shape of clip.frames) {
        expect(() => svgWidth(shape), `${key} frame ${shape}`).not.toThrow();
      }
    }
  });
});

describe('enemyRadius — reconciled against the SVG, not against the table', () => {
  it('equals half the authored width of the type`s own first frame', () => {
    // The point of the pass. Checking `enemyRadius` against `clip.size` would
    // only prove the table is self-consistent; this reads the width back out
    // of the SVG that JPEXS exported, so a transcription error in the table
    // fails here rather than becoming the new truth.
    for (const type of TYPES) {
      for (const isBoss of [false, true]) {
        const shape = enemyShape(type, isBoss, 1);
        expect(shape).toBeDefined();
        expect(enemyRadius(type, isBoss), `${type} boss=${isBoss}`).toBeCloseTo(
          svgWidth(shape as number) / 2,
          6,
        );
      }
    }
  });

  it('is no longer one number for every type', () => {
    // The defect being corrected, asserted directly: the port used to give
    // every normal enemy 13 and every boss 23. Pinned as a *spread* so a
    // future change that re-flattens them fails, rather than as twenty
    // separate figures that would all need editing together.
    const normals = new Set(TYPES.map((t) => enemyRadius(t, false)));
    const bosses = new Set(TYPES.map((t) => enemyRadius(t, true)));

    expect(normals.size).toBeGreaterThan(1);
    expect(bosses.size).toBeGreaterThan(1);
    expect(Math.min(...(normals as Set<number>))).toBeLessThan(BEFORE.normal);
    expect(Math.max(...(bosses as Set<number>))).toBeGreaterThan(BEFORE.boss);
  });

  it('keeps every boss larger than its own normal form', () => {
    // An invariant that survives the table changing, and the one a mis-paired
    // key would break: swapping `Tiny` and `TinyBoss` passes every assertion
    // above and fails this one.
    for (const type of TYPES) {
      expect(enemyRadius(type, true), type).toBeGreaterThan(enemyRadius(type, false) as number);
    }
  });

  it('returns undefined for an unknown type rather than a default', () => {
    // A fallback here would be the invented-constant failure one layer down:
    // every caller keeps working and the wrong number is invisible.
    expect(enemyRadius('NotAnEnemy', false)).toBeUndefined();
    expect(enemyShape('NotAnEnemy', false, 1)).toBeUndefined();
  });
});

describe('enemyShape — frame selection', () => {
  it('gives a two-frame type a different shape on frame 2', () => {
    expect(enemyShape('Ghost', false, 2)).not.toBe(enemyShape('Ghost', false, 1));
  });

  it('clamps a single-frame type asking for frame 2 back to frame 1', () => {
    // `applyAlpha` asks for frame 2 whenever an enemy is invisible, and
    // invisibility is not exclusive to the four two-frame types. Clamping is
    // what keeps that from returning undefined and blanking the sprite.
    expect(enemyShape('Basic', false, 2)).toBe(enemyShape('Basic', false, 1));
    expect(enemyShape('Basic', false, 0)).toBe(enemyShape('Basic', false, 1));
  });
});
