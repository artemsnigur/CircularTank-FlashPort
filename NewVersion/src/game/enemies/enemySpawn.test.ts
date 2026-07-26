import { describe, expect, it } from 'vitest';
import {
  applyWallInset,
  faceTarget,
  randomEdgeSpawn,
  resolveSpawn,
} from './enemySpawn';
import type { SpawnGeometry } from './enemySpawn';

const ROOM = { roomWidth: 640, roomHeight: 960 };
const CENTRE = { x: 320, y: 480 };

const geometry = (overrides: Partial<SpawnGeometry> = {}): SpawnGeometry => ({
  ...ROOM,
  x: 320,
  y: 0,
  wall: 1,
  width: 26,
  height: 26,
  ...overrides,
});

/** Unit vector an enemy would travel along for a given Flash rotation. */
const heading = (rotation: number): { x: number; y: number } => ({
  x: Math.cos((rotation * Math.PI) / 180),
  y: Math.sin((rotation * Math.PI) / 180),
});

describe('faceTarget', () => {
  it('points at a target to the right', () => {
    expect(faceTarget(0, 0, { x: 100, y: 0 })).toBeCloseTo(0, 10);
  });

  it('points at a target below — y grows downward', () => {
    expect(faceTarget(0, 0, { x: 0, y: 100 })).toBeCloseTo(90, 10);
  });

  it('points at a target above', () => {
    expect(faceTarget(0, 0, { x: 0, y: -100 })).toBeCloseTo(-90, 10);
  });

  it('produces a heading that actually moves toward the target', () => {
    const target = { x: 200, y: 300 };
    const h = heading(faceTarget(50, 50, target));
    expect(h.x).toBeGreaterThan(0);
    expect(h.y).toBeGreaterThan(0);
  });
});

describe('applyWallInset', () => {
  it('insets by half the sprite on each wall', () => {
    expect(applyWallInset(geometry({ wall: 1, y: 0 })).y).toBe(-13);
    expect(applyWallInset(geometry({ wall: 2, x: 0 })).x).toBe(-13);
    expect(applyWallInset(geometry({ wall: 3, y: 960 })).y).toBe(973);
    expect(applyWallInset(geometry({ wall: 4, x: 640 })).x).toBe(653);
  });

  it('leaves a non-edge marker alone', () => {
    const g = geometry({ wall: 0, x: 100, y: 200 });
    expect(applyWallInset(g)).toEqual({ x: 100, y: 200 });
  });
});

describe('resolveSpawn — edge headings', () => {
  const options = { mode: 'Normal' as const, target: CENTRE, moveSpeedMax: 1.5 };

  it('heads downward from the top edge', () => {
    const spawn = resolveSpawn(geometry({ wall: 0, x: 320, y: 0 }), options);
    expect(spawn.rotation).toBe(90);
    expect(heading(spawn.rotation).y).toBeCloseTo(1, 10);
  });

  it('heads right from the left edge', () => {
    const spawn = resolveSpawn(geometry({ wall: 0, x: 0, y: 400 }), options);
    expect(spawn.rotation).toBe(0);
    expect(heading(spawn.rotation).x).toBeCloseTo(1, 10);
  });

  it('heads up from the bottom edge', () => {
    const spawn = resolveSpawn(geometry({ wall: 0, x: 320, y: 960 }), options);
    expect(spawn.rotation).toBe(-90);
    expect(heading(spawn.rotation).y).toBeCloseTo(-1, 10);
  });

  it('heads left from the right edge', () => {
    const spawn = resolveSpawn(geometry({ wall: 0, x: 640, y: 400 }), options);
    expect(spawn.rotation).toBe(180);
    expect(heading(spawn.rotation).x).toBeCloseTo(-1, 10);
  });

  it('every edge heading points into the room', () => {
    const edges: Array<{ x: number; y: number }> = [
      { x: 320, y: 0 },
      { x: 0, y: 400 },
      { x: 320, y: 960 },
      { x: 640, y: 400 },
    ];
    for (const edge of edges) {
      const spawn = resolveSpawn(geometry({ wall: 0, ...edge }), options);
      const h = heading(spawn.rotation);
      const towardCentre = {
        x: CENTRE.x - edge.x,
        y: CENTRE.y - edge.y,
      };
      // Dot product positive => heading is within 90 degrees of the centre.
      expect(h.x * towardCentre.x + h.y * towardCentre.y).toBeGreaterThan(0);
    }
  });

  it('faces the target when the marker is not edge-aligned', () => {
    const spawn = resolveSpawn(geometry({ wall: 0, x: 100, y: 200 }), options);
    expect(spawn.rotation).toBeCloseTo(faceTarget(100, 200, CENTRE), 10);
  });

  it('leaves velocity at zero outside Tower mode', () => {
    const spawn = resolveSpawn(geometry({ wall: 0, x: 320, y: 0 }), options);
    expect(spawn.xVel).toBe(0);
    expect(spawn.yVel).toBe(0);
  });
});

describe('resolveSpawn — Defense mode', () => {
  const base = {
    mode: 'Defense' as const,
    target: CENTRE,
    moveSpeedMax: 1.5,
  };

  it('fans downward within the AS3 angle band', () => {
    for (const draw of [0.1, 0.3, 0.49, 0.51, 0.7, 0.99]) {
      const spawn = resolveSpawn(geometry({ wall: 0, x: 320, y: 0 }), {
        ...base,
        random: () => draw,
      });
      // Every branch clamps into roughly 12-165 degrees, i.e. downward.
      expect(spawn.rotation).toBeGreaterThan(10);
      expect(spawn.rotation).toBeLessThan(170);
      expect(heading(spawn.rotation).y).toBeGreaterThan(0);
    }
  });

  it('sends the two sides in opposite horizontal directions', () => {
    const left = resolveSpawn(geometry({ wall: 0, x: 320, y: 0 }), {
      ...base,
      random: () => 0.2,
    });
    const right = resolveSpawn(geometry({ wall: 0, x: 320, y: 0 }), {
      ...base,
      random: () => 0.8,
    });
    expect(heading(left.rotation).x).toBeGreaterThan(0);
    expect(heading(right.rotation).x).toBeLessThan(0);
  });

  it('widens the spread for Accelerating enemies', () => {
    const normal = resolveSpawn(geometry({ wall: 0, x: 320, y: 0 }), {
      ...base,
      random: () => 0.8,
    });
    const accelerating = resolveSpawn(geometry({ wall: 0, x: 320, y: 0 }), {
      ...base,
      enemyType: 'Accelerating',
      random: () => 0.8,
    });
    expect(accelerating.rotation).toBeGreaterThan(normal.rotation);
  });

  it('clamps rather than overshooting the band', () => {
    const fast = resolveSpawn(geometry({ wall: 0, x: 320, y: 0 }), {
      ...base,
      moveSpeedMax: 10,
      random: () => 0.9,
    });
    expect(fast.rotation).toBeLessThanOrEqual(167.5);
  });

  it('behaves like a normal top-edge spawn in other modes', () => {
    const spawn = resolveSpawn(geometry({ wall: 0, x: 320, y: 0 }), {
      ...base,
      mode: 'Normal',
    });
    expect(spawn.rotation).toBe(90);
  });
});

describe('resolveSpawn — Tower mode', () => {
  const options = { mode: 'Tower' as const, target: CENTRE, moveSpeedMax: 1.5 };

  it('launches at full speed immediately', () => {
    const spawn = resolveSpawn(geometry({ wall: 0, x: 0, y: 0 }), options);
    expect(Math.hypot(spawn.xVel, spawn.yVel)).toBeCloseTo(1.5, 6);
  });

  it('leads the target rather than pointing straight at it', () => {
    const spawn = resolveSpawn(geometry({ wall: 0, x: 0, y: 0 }), options);
    expect(spawn.rotation).not.toBeCloseTo(faceTarget(0, 0, CENTRE), 1);
  });

  it('produces finite values across the room', () => {
    for (const x of [0, 320, 640]) {
      for (const y of [0, 480, 960]) {
        const spawn = resolveSpawn(geometry({ wall: 0, x, y }), options);
        expect(Number.isFinite(spawn.rotation), `${x},${y}`).toBe(true);
        expect(Number.isFinite(spawn.xVel), `${x},${y}`).toBe(true);
      }
    }
  });
});

describe('randomEdgeSpawn', () => {
  it('always lands on a room edge', () => {
    let seed = 0;
    const random = (): number => {
      seed += 0.137;
      return seed % 1;
    };

    for (let i = 0; i < 200; i += 1) {
      const spawn = randomEdgeSpawn(640, 960, random);
      const onEdge =
        spawn.x === 0 || spawn.x === 640 || spawn.y === 0 || spawn.y === 960;
      expect(onEdge, `${spawn.x},${spawn.y}`).toBe(true);
      expect([1, 2, 3, 4]).toContain(spawn.wall);
    }
  });

  it('stays within the room bounds', () => {
    for (let i = 0; i < 50; i += 1) {
      const spawn = randomEdgeSpawn(640, 960);
      expect(spawn.x).toBeGreaterThanOrEqual(0);
      expect(spawn.x).toBeLessThanOrEqual(640);
      expect(spawn.y).toBeGreaterThanOrEqual(0);
      expect(spawn.y).toBeLessThanOrEqual(960);
    }
  });
});
