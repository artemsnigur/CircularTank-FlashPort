import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  GHOST_TIMER_MAX,
  blinksOnTimer,
  createVisibilityState,
  hidesWhenHurt,
  isTargetable,
  tickGhostBlink,
  tickScaredGhost,
} from './enemyVisibility';
import type { VisibilityState } from './enemyVisibility';

const run = (
  tick: (s: VisibilityState) => VisibilityState,
  frames: number,
  from = createVisibilityState(),
) => {
  let state = from;
  for (let i = 0; i < frames; i += 1) state = tick(state);
  return state;
};

const blink = (frames: number, from?: VisibilityState) =>
  run((s) => tickGhostBlink(s, 1, false), frames, from);
const flinch = (frames: number, from?: VisibilityState) =>
  run((s) => tickScaredGhost(s, 1, false, false), frames, from);

describe('Ghost blinks on a timer', () => {
  it('spawns visible, with the first blink five seconds away', () => {
    const fresh = createVisibilityState();
    expect(fresh.invisible).toBe(false);
    expect(fresh.ghostTimer).toBe(GHOST_TIMER_MAX);
    expect(GHOST_TIMER_MAX).toBe(150);
  });

  it('turns invisible after 150 frames and back 151 later', () => {
    expect(blink(150).invisible).toBe(false);
    // The toggle fires on the frame *after* the timer reaches zero, so the
    // period is 151 frames rather than 150 — worth pinning, because 150 is the
    // number in the source and the off-by-one is in the loop shape.
    expect(blink(151).invisible).toBe(true);
    expect(blink(301).invisible).toBe(true);
    expect(blink(302).invisible).toBe(false);
  });

  it('keeps a steady cycle rather than blinking once', () => {
    // Sampled across four phases, so a drifting or one-shot blink fails.
    const phases = [0, 151, 302, 453, 604].map((f) => blink(f).invisible);
    expect(phases).toEqual([false, true, false, true, false]);
  });

  it('ignores the player entirely', () => {
    // Ghost's blink takes no damage argument — being hit changes nothing,
    // which is what separates it from ScaredGhost.
    expect(tickGhostBlink.length).toBe(3);
  });

  it('holds its state while frozen rather than continuing to flicker', () => {
    const nearlyBlinking = blink(149);
    let frozen = nearlyBlinking;
    for (let i = 0; i < 500; i += 1) frozen = tickGhostBlink(frozen, 1, true);

    expect(frozen).toEqual(nearlyBlinking);
  });
});

describe('ScaredGhost hides when hurt', () => {
  it('spawns visible and stays visible while untouched', () => {
    expect(createVisibilityState().invisible).toBe(false);
    expect(flinch(1000).invisible).toBe(false);
  });

  it('hides for a full five seconds after a hit', () => {
    const hit = tickScaredGhost(createVisibilityState(), 1, true, false);
    expect(hit.invisible).toBe(true);
    expect(hit.ghostTimer).toBe(1);

    expect(flinch(148, hit).invisible).toBe(true);
    // Reaches the cap still hidden; the frame after that reveals it.
    expect(flinch(149, hit).invisible).toBe(true);
    expect(flinch(150, hit).invisible).toBe(false);
  });

  it('restarts the full five seconds on every hit', () => {
    // Counting *up* with damage resetting to zero, so repeated hits keep it
    // hidden indefinitely — the opposite shape to Ghost's fixed cycle.
    const hit = tickScaredGhost(createVisibilityState(), 1, true, false);
    const halfway = flinch(75, hit);
    expect(halfway.ghostTimer).toBe(76);

    const hitAgain = tickScaredGhost(halfway, 1, true, false);
    expect(hitAgain.ghostTimer).toBe(1);
    expect(hitAgain.invisible).toBe(true);
  });

  it('holds its state while frozen', () => {
    const hit = tickScaredGhost(createVisibilityState(), 1, true, false);
    let frozen = hit;
    for (let i = 0; i < 500; i += 1) frozen = tickScaredGhost(frozen, 1, false, true);

    expect(frozen).toEqual(hit);
    expect(frozen.invisible).toBe(true);
  });

  it('cannot be newly frightened while frozen', () => {
    const frozen = tickScaredGhost(createVisibilityState(), 1, true, true);
    expect(frozen.invisible).toBe(false);
  });
});

describe('the two are different mechanics, not one trigger apart', () => {
  it('Ghost counts down and toggles; ScaredGhost counts up and hides', () => {
    // Worth pinning: the names suggest one mechanic, and an attempt to merge
    // them into a shared helper would have to break one of these.
    expect(blink(1).ghostTimer).toBe(GHOST_TIMER_MAX - 1);

    const hit = tickScaredGhost(createVisibilityState(), 1, true, false);
    expect(flinch(1, hit).ghostTimer).toBe(2);
  });

  it('claims the right types', () => {
    expect(blinksOnTimer('Ghost')).toBe(true);
    expect(hidesWhenHurt('ScaredGhost')).toBe(true);
    expect(blinksOnTimer('ScaredGhost')).toBe(false);
    expect(hidesWhenHurt('Ghost')).toBe(false);
    for (const other of ['Basic', 'Teleporting', 'Strong']) {
      expect(blinksOnTimer(other) || hidesWhenHurt(other), other).toBe(false);
    }
  });
});

describe('isTargetable covers both flags', () => {
  it('rejects invisible and teleporting alike', () => {
    expect(isTargetable({ invisible: false, teleporting: false })).toBe(true);
    expect(isTargetable({ invisible: true, teleporting: false })).toBe(false);
    expect(isTargetable({ invisible: false, teleporting: true })).toBe(false);
    expect(isTargetable({ invisible: true, teleporting: true })).toBe(false);
  });
});

/**
 * The five consumer sites, checked at the call sites.
 *
 * These are wiring assertions rather than behaviour ones: the predicate is
 * trivially correct, and every previous failure of this kind in the project has
 * been a site that never asked.
 */
describe('every consumer site asks', () => {
  const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

  it('bullets, in every per-weapon branch', () => {
    // Flame, magic, penetrating, bomb and the plain default each need it —
    // the AS3 gates the whole loop once, the port branches per weapon.
    expect(scene.match(/reachable\(i\)/g) ?? []).toHaveLength(4);
    expect(scene).toContain('if (!enemy.targetable || bullet.hasHit(enemy)) return false;');
  });

  it('explosions', () => {
    expect(scene).toContain('.filter((enemy) => enemy.targetable)');
  });

  it('the beam and ground hazards', () => {
    expect(scene).toMatch(/return enemy\.targetable && view\.contains/);
  });

  it('mines', () => {
    expect(scene).toMatch(/\.filter\(\(enemy\) => enemy\.targetable\)\s*\n\s*\.map/);
  });

  it('magic acquisition', () => {
    expect(scene).toMatch(/enemy\.targetable &&\s*\n\s*view\.contains/);
  });

  it('no site still claims nothing sets the flags', () => {
    // Two comments said the flags came from the unported loop and no enemy set
    // them. Ghost and ScaredGhost set them now.
    expect(scene).not.toContain('no enemy sets them yet');
    expect(scene).not.toContain('and no enemy set them');
  });
});

/**
 * The corrected AS3 bug, asserted against the behaviour it replaces.
 *
 * `:1716` drops the current target when it is null, gone, invisible, or **not
 * teleporting** — the last clause is missing its negation, so it is true for
 * almost every enemy and a magic round re-picks a target every frame. `:1743`
 * and `:1766` get it right, so the original disagrees with itself.
 */
describe('magic holds its target — the :1716 fix', () => {
  const buggy = (target: { invisible: boolean; teleporting: boolean }): boolean =>
    // Faithful transcription of the broken condition, for contrast only.
    target.invisible || !target.teleporting;

  const fixed = (target: { invisible: boolean; teleporting: boolean }): boolean =>
    !isTargetable(target);

  it('the original would drop a perfectly good target', () => {
    const healthy = { invisible: false, teleporting: false };
    expect(buggy(healthy)).toBe(true);
    expect(fixed(healthy)).toBe(false);
  });

  it('both agree an invisible target should be dropped', () => {
    const hidden = { invisible: true, teleporting: false };
    expect(buggy(hidden)).toBe(true);
    expect(fixed(hidden)).toBe(true);
  });

  it('the fix drops a teleporting target, which the original kept', () => {
    // The inverted clause makes the buggy version *keep* the one case it was
    // written to reject.
    const gone = { invisible: false, teleporting: true };
    expect(buggy(gone)).toBe(false);
    expect(fixed(gone)).toBe(true);
  });

  it('the scene uses the fixed rule and says why', () => {
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(scene).toContain('Deliberate divergence from the AS3');
    expect(scene).toContain('if (!target || !valid(target)) {');
  });
});
