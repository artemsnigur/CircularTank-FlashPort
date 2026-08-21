import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import {
  ICE_FRAMES_BOSS,
  ICE_FRAMES_NORMAL,
  ICE_REFERENCE_RADIUS,
  ICE_THAW_FRAMES,
  iceIndicatorView,
  pickIceFrame,
} from './iceIndicator';

describe('pickIceFrame', () => {
  it('draws from 1-3 for an enemy and 4-6 for a boss, never overlapping', () => {
    /*
     * `:5872` and `:5876`. Driven at the ends of the range rather than
     * sampled, and asserted as a *pair* — a rule that returned 1-3 for both
     * would pass either line alone.
     */
    for (const r of [0, 0.25, 0.5, 0.75, 1]) {
      expect(ICE_FRAMES_NORMAL).toContain(pickIceFrame(false, () => r));
      expect(ICE_FRAMES_BOSS).toContain(pickIceFrame(true, () => r));
    }
    expect(ICE_FRAMES_NORMAL.some((f) => (ICE_FRAMES_BOSS as readonly number[]).includes(f))).toBe(
      false,
    );
  });

  it('reproduces the AS3`s uneven distribution rather than flattening it', () => {
    /*
     * `Math.round(random() * 2 + 1)` is not a uniform draw over three: it
     * sends [0, 0.5) to frame 1, [0.5, 1.5) to frame 2 and [1.5, 2] to frame
     * 3, so the middle frame comes up half the time.
     *
     * Pinned at the two boundaries, because a "fixed" version using
     * `Math.floor(random() * 3)` would give thirds and pass any test that only
     * checked the range.
     */
    expect(pickIceFrame(false, () => 0)).toBe(1);
    expect(pickIceFrame(false, () => 0.24)).toBe(1);
    expect(pickIceFrame(false, () => 0.26)).toBe(2); // floor()/3 would say 1
    expect(pickIceFrame(false, () => 0.74)).toBe(2);
    expect(pickIceFrame(false, () => 0.76)).toBe(3); // floor()/3 would say 2
    expect(pickIceFrame(false, () => 1)).toBe(3);

    // The boss range is the same shape, offset by three.
    expect(pickIceFrame(true, () => 0)).toBe(4);
    expect(pickIceFrame(true, () => 1)).toBe(6);
  });
});

describe('iceIndicatorView', () => {
  it('sizes the block by the enemy`s radius against the authored 50', () => {
    // `:5879` — `radius / 50`. Stated as the source's own divisor.
    expect(ICE_REFERENCE_RADIUS).toBe(50); // `:5879`
    expect(iceIndicatorView({ radius: 50, frozenTimer: 120 }).scale).toBeCloseTo(1, 10);
    expect(iceIndicatorView({ radius: 25, frozenTimer: 120 }).scale).toBeCloseTo(0.5, 10);
    expect(iceIndicatorView({ radius: 100, frozenTimer: 120 }).scale).toBeCloseTo(2, 10);
  });

  it('holds full size and opacity above the thaw window', () => {
    expect(ICE_THAW_FRAMES).toBe(30); // `:6339`
    for (const t of [30, 45, 300]) {
      const view = iceIndicatorView({ radius: 50, frozenTimer: t });
      expect(view.alpha, `timer ${t}`).toBe(1);
      expect(view.scale, `timer ${t}`).toBeCloseTo(1, 10);
    }
  });

  it('fades and shrinks together inside it, to the AS3`s own figures', () => {
    /*
     * `:6341-6343`. Both terms are computed here rather than compared, since
     * both are knowable: at half the window the alpha is 0.55 and the scale is
     * `1 - 0.1 + 0.05`.
     */
    const half = iceIndicatorView({ radius: 50, frozenTimer: 15 });
    expect(half.alpha).toBeCloseTo(0.1 + 0.9 * 0.5, 10);
    expect(half.scale).toBeCloseTo(1 - 0.1 + 0.1 * 0.5, 10);

    // At the very end it is at the floor, not at zero — the block is removed
    // by the caller, it does not fade to nothing first.
    const end = iceIndicatorView({ radius: 50, frozenTimer: 0 });
    expect(end.alpha).toBeCloseTo(0.1, 10);
    expect(end.scale).toBeCloseTo(0.9, 10);
  });

  it('shrinks a small enemy`s ice proportionally more than a boss`s', () => {
    /*
     * The consequence of `- 0.1` being absolute rather than a tenth, which is
     * the sort of term that gets "tidied" into `* 0.9` by someone reading it
     * as a percentage. Asserted as the two ratios, so the difference is the
     * claim rather than an accident of one number.
     */
    const small = iceIndicatorView({ radius: 20, frozenTimer: 0 });
    const boss = iceIndicatorView({ radius: 100, frozenTimer: 0 });

    expect(small.scale / (20 / 50)).toBeCloseTo(0.75, 10);
    expect(boss.scale / (100 / 50)).toBeCloseTo(0.95, 10);
    expect(small.scale / (20 / 50)).toBeLessThan(boss.scale / (100 / 50));
  });

  it('never returns a negative scale, however small the enemy', () => {
    // `radius / 50 - 0.1` goes negative below a radius of 5. No enemy in the
    // game is that small, but a Shrinking enemy's radius is a live value, and
    // a negative scale flips the sprite rather than hiding it.
    const tiny = iceIndicatorView({ radius: 2, frozenTimer: 0 });
    expect(tiny.scale).toBeGreaterThanOrEqual(0);
  });
});

describe('the scene draws it', () => {
  const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

  it('uses the six extracted frames, and no tint', () => {
    /*
     * Source-shape, and narrow: it proves what is written, not that it runs —
     * the driven half is in T230's run. What it buys is the thing most likely
     * to be "fixed" later: the AS3 draws an overlay and does **not** tint the
     * enemy, so a cyan `setTint` appearing in this block would be a
     * regression that looks like an improvement.
     */
    expect(SCENE).toMatch(/const ICE_BLOCK_FRAMES = \[1184, 1185, 1186, 1187, 1188, 1189\]/);

    const method = /private updateIceBlocks\(\): void \{[\s\S]{0,2000}?\n {2}\}/.exec(SCENE);
    expect(method, 'updateIceBlocks is not in the scene').not.toBeNull();

    const code = method![0]
      .split('\n')
      .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('*'))
      .join('\n');

    expect(code).toMatch(/setDisplaySize/);
    expect(code, 'the ice tints the enemy instead of covering it').not.toMatch(/setTint/);
    // `setScale` would draw it at the raster's 4x — the trap named in Bullet.ts.
    expect(code, 'setScale on a 4x raster draws it four times too large').not.toMatch(
      /\.setScale\(/,
    );
  });

  it('is called every frame, not only when something freezes', () => {
    // The thaw removal lives inside it, so a call site gated on a freeze event
    // would leave the last block on screen forever.
    expect(SCENE).toMatch(/this\.updateIceBlocks\(\);/);
  });
});
