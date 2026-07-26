import { describe, expect, it } from 'vitest';
import {
  CAMERA_HEIGHT,
  CAMERA_WIDTH,
  isPotentiallyVisible,
  placeOnEdge,
  placeWarning,
} from './spawnPlacement';
import type { PlacementContext } from './spawnPlacement';
import {
  createWarning,
  tickWarnings,
  WARNING_FRAMES,
  warningScale,
} from './warnings';

/** A room bigger than the camera in both axes, so off-camera search applies. */
const BIG_ROOM: PlacementContext = { mode: 'Normal', roomWidth: 900, roomHeight: 720 };

/** Cycling pseudo-random, so a sequence is reproducible without Math.random. */
function sequence(values: number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length];
}

describe('isPotentiallyVisible', () => {
  it('is true in the centre of a large room', () => {
    expect(isPotentiallyVisible(450, 360, BIG_ROOM)).toBe(true);
  });

  it('is false near the edges', () => {
    expect(isPotentiallyVisible(5, 5, BIG_ROOM)).toBe(false);
    expect(isPotentiallyVisible(895, 715, BIG_ROOM)).toBe(false);
  });

  it('uses the camera-sized centre band', () => {
    const marginX = (900 - CAMERA_WIDTH) / 2; // 130
    const marginY = (720 - CAMERA_HEIGHT) / 2; // 160
    expect(isPotentiallyVisible(marginX + 1, marginY + 1, BIG_ROOM)).toBe(true);
    expect(isPotentiallyVisible(marginX - 1, marginY + 1, BIG_ROOM)).toBe(false);
  });
});

describe('placeOnEdge', () => {
  it('always lands on a wall', () => {
    for (let i = 0; i < 100; i += 1) {
      const placement = placeOnEdge({ ...BIG_ROOM, random: Math.random });
      const onEdge =
        placement.x === 0 ||
        placement.x === 900 ||
        placement.y === 0 ||
        placement.y === 720;
      expect(onEdge, JSON.stringify(placement)).toBe(true);
      expect([1, 2, 3, 4]).toContain(placement.wall);
    }
  });

  it('always uses the top wall in Defense mode', () => {
    for (let i = 0; i < 20; i += 1) {
      const placement = placeOnEdge({ ...BIG_ROOM, mode: 'Defense', random: Math.random });
      expect(placement.wall).toBe(1);
      expect(placement.y).toBe(0);
    }
  });

  it('narrows the window on each wall in Tower mode', () => {
    // Top wall in Tower spans [w/4, w/2]; the full-width version spans [0, w].
    for (const draw of [0, 0.5, 0.999]) {
      const tower = placeOnEdge({
        ...BIG_ROOM,
        mode: 'Tower',
        random: sequence([0, draw]), // wall 1, then the position draw
      });
      expect(tower.wall).toBe(1);
      expect(tower.x).toBeGreaterThanOrEqual(225);
      expect(tower.x).toBeLessThanOrEqual(450);
    }
  });

  it('spans the full wall outside Tower mode', () => {
    const placement = placeOnEdge({ ...BIG_ROOM, random: sequence([0, 0.99]) });
    expect(placement.wall).toBe(1);
    expect(placement.x).toBeGreaterThan(800);
  });

  it('marks edge placements as not off-camera', () => {
    expect(placeOnEdge({ ...BIG_ROOM, random: sequence([0, 0.5]) }).offCamera).toBe(false);
  });
});

describe('placeWarning', () => {
  it('finds an off-camera point in a large room', () => {
    const placement = placeWarning({ ...BIG_ROOM, random: sequence([0.01, 0.01]) });
    expect(placement.offCamera).toBe(true);
    expect(placement.wall).toBe(0);
    expect(isPotentiallyVisible(placement.x, placement.y, BIG_ROOM)).toBe(false);
  });

  it('falls back to an edge when every attempt lands on camera', () => {
    // 0.5 maps to the exact centre, which is always visible.
    const placement = placeWarning({ ...BIG_ROOM, random: () => 0.5 });
    expect(placement.offCamera).toBe(false);
    expect([1, 2, 3, 4]).toContain(placement.wall);
  });

  it('skips the search entirely in Defense mode', () => {
    const placement = placeWarning({ ...BIG_ROOM, mode: 'Defense', random: () => 0.01 });
    expect(placement.offCamera).toBe(false);
    expect(placement.wall).toBe(1);
  });

  it('skips the search when the room matches the camera', () => {
    const placement = placeWarning({
      mode: 'Normal',
      roomWidth: CAMERA_WIDTH,
      roomHeight: 960,
      random: () => 0.01,
    });
    expect(placement.offCamera).toBe(false);
  });

  it('skips the search during the countdown', () => {
    const placement = placeWarning({ ...BIG_ROOM, countDownDone: true, random: () => 0.01 });
    expect(placement.offCamera).toBe(false);
  });

  it('places bosses on an edge', () => {
    const placement = placeWarning({
      ...BIG_ROOM,
      mode: 'Boss',
      isBoss: true,
      random: () => 0.01,
    });
    expect(placement.offCamera).toBe(false);
  });

  it('always stays inside the room', () => {
    for (let i = 0; i < 200; i += 1) {
      const placement = placeWarning({ ...BIG_ROOM, random: Math.random });
      expect(placement.x).toBeGreaterThanOrEqual(0);
      expect(placement.x).toBeLessThanOrEqual(900);
      expect(placement.y).toBeGreaterThanOrEqual(0);
      expect(placement.y).toBeLessThanOrEqual(720);
    }
  });
});

describe('warnings', () => {
  const spawn = { type: 'Basic', level: '1' as const, x: 100, y: 0, wall: 1 as const };

  it('starts at the default lifetime', () => {
    expect(createWarning(spawn).timeLeft).toBe(WARNING_FRAMES);
  });

  it('shrinks from 1.0 to 0.3 across its life', () => {
    expect(warningScale(createWarning(spawn, 100))).toBeCloseTo(1, 6);
    expect(warningScale(createWarning(spawn, 50))).toBeCloseTo(0.65, 6);
    expect(warningScale(createWarning(spawn, 0))).toBeCloseTo(0.3, 6);
  });

  it('can start larger than 1.0 during the opening countdown', () => {
    // The AS3 divides by a hardcoded 100 regardless of the actual lifetime.
    expect(warningScale(createWarning(spawn, 150))).toBeGreaterThan(1);
  });

  it('counts down without maturing early', () => {
    const result = tickWarnings([createWarning(spawn)], 1000); // 30 frames
    expect(result.matured).toHaveLength(0);
    expect(result.pending[0].timeLeft).toBeCloseTo(70, 6);
  });

  it('matures at zero', () => {
    const result = tickWarnings([createWarning(spawn, 1)], 1000);
    expect(result.matured).toHaveLength(1);
    expect(result.pending).toHaveLength(0);
    expect(result.matured[0].type).toBe('Basic');
  });

  it('does not strand a warning when a frame is very long', () => {
    // The AS3 checks `timeLeft == 0` exactly, which a long frame could skip.
    const result = tickWarnings([createWarning(spawn, 100)], 60_000);
    expect(result.matured).toHaveLength(1);
    expect(result.matured[0].timeLeft).toBe(0);
  });

  it('handles a mixed batch', () => {
    const result = tickWarnings(
      [createWarning(spawn, 100), createWarning(spawn, 1), createWarning(spawn, 50)],
      1000,
    );
    expect(result.matured).toHaveLength(1);
    expect(result.pending).toHaveLength(2);
  });

  it('does not mutate the warnings it was given', () => {
    const warnings = [createWarning(spawn, 100)];
    tickWarnings(warnings, 1000);
    expect(warnings[0].timeLeft).toBe(100);
  });

  it('takes about 3.3 seconds at the default lifetime', () => {
    let pending = [createWarning(spawn)];
    let elapsed = 0;
    while (pending.length > 0 && elapsed < 10_000) {
      const result = tickWarnings(pending, 1000 / 60);
      pending = result.pending;
      elapsed += 1000 / 60;
    }
    expect(elapsed).toBeGreaterThan(3000);
    expect(elapsed).toBeLessThan(3600);
  });
});
