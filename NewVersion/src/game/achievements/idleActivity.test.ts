import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { endsIdleRun } from './idleActivity';
import type { IdleInput } from './idleActivity';

const IDLE: IdleInput = { moving: false, firing: false, pointerDown: false };

describe('endsIdleRun', () => {
  it('does not end on aiming, which has no input to end it with', () => {
    /*
     * The reported bug — "IDLE fails as soon as I move the mouse" — and the
     * answer is structural rather than a value: the rule takes no aim
     * parameter, so there is nothing an aim change could set. Sweeping the
     * turret is the *same* input as sitting still.
     *
     * Driven in the running game as well (T226): sitting still for four
     * seconds and then sweeping the cursor over a full circle both left
     * `nothingPressed` true.
     */
    expect(endsIdleRun(IDLE)).toBe(false);
    expect(Object.keys(IDLE)).not.toContain('aim');
  });

  it('ends on each of the three things that are activity, one at a time', () => {
    /*
     * The counterpart, and the reason the line above means anything: a rule
     * that returned false for everything would satisfy it. Each input is
     * driven alone, so one clause going missing fails on its own row rather
     * than being masked by its neighbours.
     */
    expect(endsIdleRun({ ...IDLE, moving: true })).toBe(true);
    expect(endsIdleRun({ ...IDLE, firing: true })).toBe(true);
    expect(endsIdleRun({ ...IDLE, pointerDown: true })).toBe(true);
  });

  it('separates the pointer button from the pointer moving', () => {
    // `Main.mouse` at `:2826` is a button flag. This is the distinction the
    // whole fix rests on, stated as the pair it actually is.
    expect(endsIdleRun({ ...IDLE, pointerDown: true })).toBe(true);
    expect(endsIdleRun({ ...IDLE, pointerDown: false })).toBe(false);
  });
});

describe('the scene spends the rule rather than restating it', () => {
  it('clears `nothingPressed` through `endsIdleRun`, and reads no aim there', () => {
    /*
     * Source-shape, and narrow on purpose: it proves the clear site *calls*
     * the rule, not that the rule is reached — `GameplayScene` cannot be
     * instantiated. What it does buy is that the boolean chain cannot quietly
     * grow back inline, which is where it was when this was hard to answer.
     *
     * The driven half of the claim is in T226's run, and the audit records it.
     */
    const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    const clear = /endsIdleRun\(\{[\s\S]{0,600}?\}\)/.exec(scene);

    expect(clear, 'the scene does not call endsIdleRun').not.toBeNull();
    expect(clear![0]).toMatch(/moving:/);
    expect(clear![0]).toMatch(/firing:/);
    expect(clear![0]).toMatch(/pointerDown:/);

    /*
     * The negative: no aim, angle or rotation is fed into the idle rule.
     *
     * Comments are stripped first. The first draft of this matched the word
     * "aiming" in the explanatory comment *inside* the call — prose read as
     * code, which is the failure `CLAUDE.md` names, and it failed a change
     * that was entirely correct.
     */
    const code = clear![0]
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n');
    expect(code).not.toMatch(/aim|rotation|angle|worldPoint/i);

    // And exactly one site sets the flag, so this one is the whole story.
    expect(scene.match(/nothingPressed = false/g) ?? []).toHaveLength(1);
  });
});
