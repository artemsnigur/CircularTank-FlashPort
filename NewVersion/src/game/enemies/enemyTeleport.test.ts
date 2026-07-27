import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  APPROACH_FACTOR,
  DEFENSE_EDGE_MARGIN,
  DEFENSE_MIN_HOP,
  MAX_DESTINATION_ATTEMPTS,
  TELE_PHASE_FRAMES,
  TELE_START_MAX,
  TELE_START_MIN,
  TOWER_MIN_TANK_DISTANCE,
  canTeleport,
  createTeleportState,
  isTeleporting,
  teleportAlpha,
  teleportDestination,
  teleportsPeriodically,
  tickTeleport,
} from './enemyTeleport';
import type { TeleportState } from './enemyTeleport';

const ROOM = { roomWidth: 800, roomHeight: 800 };
const always = () => 0.5;

/** Runs the clock with the guard always satisfied. */
function advance(state: TeleportState, frames: number, allowed = true) {
  let s = state;
  const events: string[] = [];
  for (let i = 0; i < frames; i += 1) {
    const r = tickTeleport(s, 1, allowed, always);
    s = r.state;
    if (r.departs) events.push(`depart@${i + 1}`);
    if (r.arrives) events.push(`arrive@${i + 1}`);
  }
  return { state: s, events };
}

describe('the trigger', () => {
  it('is a plain timer seeded between 120 and 150', () => {
    expect(TELE_START_MIN).toBe(120);
    expect(TELE_START_MAX).toBe(150);
    const state = createTeleportState(false, () => 0);
    expect(state.startTimer).toBe(120);
    expect(createTeleportState(false, () => 1).startTimer).toBe(150);
  });

  it('a boss waits longer', () => {
    expect(createTeleportState(true, () => 0).startTimer).toBe(150);
    expect(createTeleportState(true, () => 1).startTimer).toBe(225);
  });

  it('runs a 60-frame window: 30 fading out, 30 fading in', () => {
    expect(TELE_PHASE_FRAMES).toBe(30);
    const { events } = advance(createTeleportState(false, always), 200);

    // Seeded at 135 with random 0.5. The departure happens on the frame the
    // timer *reaches* zero, not the one after — unlike Ghost's blink and
    // Medic's pulse, which fire the frame after. The shapes differ in the AS3.
    expect(events).toEqual(['depart@135', 'arrive@165']);
  });
});

describe('the mode guards block rather than cancel', () => {
  const base = { x: 400, y: 400, tankX: 400, tankY: 400, roomHeight: 800 };

  it('Tower refuses within 65 units, centre to centre', () => {
    expect(TOWER_MIN_TANK_DISTANCE).toBe(65);
    expect(canTeleport({ ...base, mode: 'Tower', x: 460, y: 400 })).toBe(false);
    expect(canTeleport({ ...base, mode: 'Tower', x: 466, y: 400 })).toBe(true);
  });

  it('Defense refuses within 160 of either end of the lane', () => {
    expect(DEFENSE_EDGE_MARGIN).toBe(160);
    const lane = { ...base, mode: 'Defense' as const, roomHeight: 960 };
    expect(canTeleport({ ...lane, y: 159 })).toBe(false);
    expect(canTeleport({ ...lane, y: 161 })).toBe(true);
    expect(canTeleport({ ...lane, y: 801 })).toBe(false);
    expect(canTeleport({ ...lane, y: 799 })).toBe(true);
  });

  it('every other mode always allows it', () => {
    for (const mode of ['Normal', 'Flag', 'Boss'] as const) {
      expect(canTeleport({ ...base, mode })).toBe(true);
    }
  });

  it('a blocked enemy stays ready and retries next frame', () => {
    // The distinction that matters: the AS3 leaves teleStartTimer at zero and
    // re-tests, so this is not a cancellation and not a cooldown reset.
    const ready = advance(createTeleportState(false, always), 200, false);
    expect(ready.events).toEqual([]);
    expect(ready.state.phase).toBe('waiting');
    expect(ready.state.startTimer).toBe(0);

    // The very next frame, once allowed, it goes.
    const released = tickTeleport(ready.state, 1, true, always);
    expect(released.departs).toBe(true);
  });
});

describe('where it lands', () => {
  it('keeps the same bearing distance scaled by 0.9', () => {
    expect(APPROACH_FACTOR).toBe(0.9);
    const destination = teleportDestination({
      mode: 'Normal',
      x: 600,
      y: 400,
      tankX: 400,
      tankY: 400,
      radius: 12,
      random: () => 0,
      ...ROOM,
    })!;

    // 200 units out becomes 180.
    expect(Math.hypot(destination.x - 400, destination.y - 400)).toBeCloseTo(180, 6);
  });

  it('compounds, so it creeps closer over successive hops', () => {
    let distance = 300;
    for (let hop = 0; hop < 5; hop += 1) {
      const d = teleportDestination({
        mode: 'Normal',
        x: 400 + distance,
        y: 400,
        tankX: 400,
        tankY: 400,
        radius: 12,
        random: () => 0,
        ...ROOM,
      })!;
      distance = Math.hypot(d.x - 400, d.y - 400);
    }
    // 300 * 0.9^5
    expect(distance).toBeCloseTo(300 * 0.9 ** 5, 6);
    expect(distance).toBeCloseTo(177.147, 3);
  });

  it('rerolls until the point is inside the room', () => {
    // Tank near a corner, so most bearings land outside and the loop has to
    // work for it.
    // First bearing points off the left edge, second is fine — so the loop has
    // to actually reroll rather than succeeding immediately.
    const draws = [0.5, 0];
    let calls = 0;
    const destination = teleportDestination({
      mode: 'Normal',
      x: 60,
      y: 200,
      tankX: 40,
      tankY: 40,
      radius: 12,
      random: () => draws[calls++] ?? 0,
      ...ROOM,
    });

    expect(destination).not.toBeNull();
    expect(destination!.x).toBeGreaterThanOrEqual(12);
    expect(destination!.y).toBeGreaterThanOrEqual(12);
    expect(calls).toBe(2);
  });

  it('Defense hops sideways by at least 100 and drifts vertically', () => {
    expect(DEFENSE_MIN_HOP).toBe(100);
    const destination = teleportDestination({
      mode: 'Defense',
      x: 100,
      y: 500,
      tankX: 356,
      tankY: 200,
      radius: 12,
      roomWidth: 712,
      roomHeight: 960,
      random: () => 0.9,
    })!;

    expect(Math.abs(destination.x - 100)).toBeGreaterThanOrEqual(DEFENSE_MIN_HOP);
    expect(Math.abs(destination.y - 500)).toBeLessThanOrEqual(100);
  });
});

/**
 * The capped reroll — a deliberate divergence.
 *
 * The AS3 loops `while` the point is out of bounds, which terminates only
 * because the distance always shrinks. That is an invariant about room geometry,
 * and a browser should not have to trust it.
 */
describe('the reroll cap', () => {
  it('gives up rather than spinning when no bearing can work', () => {
    // Distance far larger than the room, so every angle lands outside and the
    // AS3's loop would never exit.
    const destination = teleportDestination({
      mode: 'Normal',
      x: 5000,
      y: 400,
      tankX: 400,
      tankY: 400,
      radius: 12,
      random: () => Math.random(),
      ...ROOM,
    });

    expect(destination).toBeNull();
  });

  it('gives up in Defense when no hop is far enough', () => {
    // A room barely wider than the minimum hop, with the enemy centred.
    const destination = teleportDestination({
      mode: 'Defense',
      x: 60,
      y: 500,
      tankX: 60,
      tankY: 200,
      radius: 12,
      roomWidth: 120,
      roomHeight: 960,
      random: () => 0.5,
    });

    expect(destination).toBeNull();
  });

  it('caps at a bounded number of attempts', () => {
    let calls = 0;
    teleportDestination({
      mode: 'Normal',
      x: 5000,
      y: 400,
      tankX: 400,
      tankY: 400,
      radius: 12,
      random: () => {
        calls += 1;
        return 0.5;
      },
      ...ROOM,
    });

    expect(MAX_DESTINATION_ATTEMPTS).toBe(32);
    expect(calls).toBe(MAX_DESTINATION_ATTEMPTS);
  });

  it('the scene skips the hop rather than placing it arbitrarily', () => {
    // Clamping to an in-bounds point could drop the enemy on the tank.
    const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(source).toContain('if (!destination) return;');
  });
});

describe('untargetable and static throughout', () => {
  it('reports teleporting for the whole 60-frame window', () => {
    let state = createTeleportState(false, always);
    const flags: boolean[] = [];
    for (let i = 0; i < 200; i += 1) {
      state = tickTeleport(state, 1, true, always).state;
      flags.push(isTeleporting(state));
    }

    // Frames 135..194 inclusive — 60 frames of being gone.
    expect(flags.slice(0, 134).every((f) => !f)).toBe(true);
    expect(flags.slice(134, 194).every((f) => f)).toBe(true);
    expect(flags.slice(134, 194)).toHaveLength(60);
    expect(flags[194]).toBe(false);
  });

  it('the entity suppresses its whole update while teleporting', () => {
    // Steering, integration, collision and avoidance all stop — six AS3 sites
    // where `teleporting` appears without `invisible`.
    const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(source).toContain('if (!this.simulated) {');
    expect(source).toContain('get simulated(): boolean');

    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).toContain('if (!enemy.simulated) continue;');
  });

  it('inherits the eight targetability sites through the shared flag', () => {
    // The Group B bet: setting `teleporting` is all that is needed, because
    // isTargetable already reads it.
    const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(source).toContain('this.teleporting = isTeleporting(this.teleport);');
    expect(source).toContain('return isTargetable(this);');
  });
});

describe('opacity has one writer', () => {
  it('fades out then in across the window', () => {
    const leaving: TeleportState = { phase: 'leaving', timer: 30, startTimer: 0, isBoss: false };
    expect(teleportAlpha(leaving)).toBe(1);
    expect(teleportAlpha({ ...leaving, timer: 15 })).toBe(0.5);
    expect(teleportAlpha({ ...leaving, timer: 0 })).toBe(0);

    const arriving: TeleportState = { phase: 'arriving', timer: 30, startTimer: 0, isBoss: false };
    expect(teleportAlpha(arriving)).toBe(0);
    expect(teleportAlpha({ ...arriving, timer: 0 })).toBe(1);
  });

  it('is resolved explicitly, not by overwrite order', () => {
    // Teleport fade and Ghost/ScaredGhost dimming both want alpha. No type is
    // both today, so an accidental ordering would work by luck.
    const source = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(source).toContain('private applyAlpha(): void');
    expect(source.match(/this\.setAlpha\(/g) ?? []).toHaveLength(2);

    const body = source.slice(
      source.indexOf('private applyAlpha(): void'),
      source.indexOf('private applyBodyScale('),
    );
    expect(body).toContain('teleportAlpha(this.teleport)');
    expect(body).toContain('this.invisible ? INVISIBLE_ALPHA : 1');
  });
});

describe('which types teleport', () => {
  it('is Teleporting alone', () => {
    expect(teleportsPeriodically('Teleporting')).toBe(true);
    for (const other of ['Ghost', 'ScaredGhost', 'Basic', 'Medic']) {
      expect(teleportsPeriodically(other), other).toBe(false);
    }
  });
});
