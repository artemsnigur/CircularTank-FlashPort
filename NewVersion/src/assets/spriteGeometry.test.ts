/**
 * The generated geometry, against the art it claims to describe.
 *
 * `spriteGeometry.ts` is generated, so a test that only reads it back proves
 * the generator ran. These read **the SVGs themselves** and re-derive the
 * numbers, so a generator that computes the wrong thing fails here rather than
 * shipping a confidently wrong table.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PARTICLE_ANCHORS, TOWER_GEOMETRY } from './spriteGeometry';

/** Bounds and registration point, read straight off the exported SVG. */
function svgGeometry(shapeId: number) {
  const svg = readFileSync(`../SWFimported/shapes/${shapeId}.svg`, 'utf8');
  const width = Number(/\bwidth="([\d.]+)px"/.exec(svg)?.[1]);
  const height = Number(/\bheight="([\d.]+)px"/.exec(svg)?.[1]);
  const reg = /<g transform="matrix\(1\.0, 0\.0, 0\.0, 1\.0, ([-\d.]+), ([-\d.]+)\)"/.exec(svg);
  return {
    width,
    height,
    registrationX: Number(reg?.[1]),
    registrationY: Number(reg?.[2]),
  };
}

describe('turret geometry comes from the shapes', () => {
  it('covers all twelve weapons', () => {
    expect(Object.keys(TOWER_GEOMETRY)).toHaveLength(12);
  });

  it('matches each shape`s authored bounds and registration point', () => {
    for (const [weapon, art] of Object.entries(TOWER_GEOMETRY)) {
      const svg = svgGeometry(art.shape);
      expect(art.width, weapon).toBeCloseTo(svg.width, 4);
      expect(art.height, weapon).toBeCloseTo(svg.height, 4);
      expect(art.originX, weapon).toBeCloseTo(svg.registrationX / svg.width, 3);
      expect(art.originY, weapon).toBeCloseTo(svg.registrationY / svg.height, 3);
    }
  });

  it('reaches from the registration point to the far edge', () => {
    // The definition of barrel reach, re-derived rather than restated: the
    // turret pivots on its registration point (`Tank.as:63` adds it at 0,0),
    // so the barrel tip is whatever the canvas extends past that point in +x.
    for (const [weapon, art] of Object.entries(TOWER_GEOMETRY)) {
      const svg = svgGeometry(art.shape);
      expect(art.barrelReach, weapon).toBeCloseTo(svg.width - svg.registrationX, 4);
    }
  });

  it('is not one number wearing twelve hats', () => {
    // The reason this table exists at all. Eleven turrets do reach 10.5 — which
    // is why `PartGameArea.as:3962` could use a flat 10 — but two do not, and a
    // constant would be wrong for those two.
    expect(TOWER_GEOMETRY['Magic Cannon']?.barrelReach).toBe(17.9);
    expect(TOWER_GEOMETRY['Gummy Bear Cannon']?.barrelReach).toBe(11.3);
    expect(TOWER_GEOMETRY.Cannon?.barrelReach).toBe(10.5);

    const distinct = new Set(Object.values(TOWER_GEOMETRY).map((a) => a.barrelReach));
    expect(distinct.size).toBeGreaterThan(1);
  });

  it('has five turrets that are not square, which is why size is per weapon', () => {
    // Drawing these at a fixed 21x21 — what the port did before T121 — stretches
    // exactly these five. (The Gummy Bear is square at 22.6, so it was scaled
    // rather than distorted; it is in the size table for that reason.) The list
    // is the check: if a future extraction changes the art, this fails rather
    // than silently distorting a new one.
    const nonSquare = Object.entries(TOWER_GEOMETRY).filter(([, a]) => a.width !== a.height);
    expect(nonSquare.map(([w]) => w).sort()).toEqual([
      'Cake Cannon',
      'Laser Cannon',
      'Magic Cannon',
      'MiniGun',
      'Timed Bomb Cannon',
    ]);
  });
});

describe('particle anchors carry only the clips that are not centred', () => {
  it('anchors the three flares at their base', () => {
    for (const tier of ['MuzzleFlareSmall', 'MuzzleFlareMedium', 'MuzzleFlareBig']) {
      expect(PARTICLE_ANCHORS[tier]?.originX, tier).toBe(0);
    }
  });

  it('holds nothing else', () => {
    // The counterpart to the flares: a table that anchored everything would
    // move 33 shapes that are already correct.
    expect(Object.keys(PARTICLE_ANCHORS).sort()).toEqual([
      'MuzzleFlareBig',
      'MuzzleFlareMedium',
      'MuzzleFlareSmall',
    ]);
  });

  it('leaves Lock out, because its clip translates it', () => {
    // Shape 843's registration is far outside its own canvas, and sprite 1059
    // places it at (-65, -47) to cancel that. The generated placement data
    // keeps only the scale half of that matrix, so an anchor derived from
    // registration alone would move it by the amount the translation cancels.
    expect(PARTICLE_ANCHORS.Lock).toBeUndefined();
    const svg = svgGeometry(843);
    expect(svg.registrationX / svg.width).toBeLessThan(0);
  });
});
