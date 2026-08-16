/**
 * The bottom bar's frame rules — `ButtonUpgrades.as` and its siblings.
 *
 * Expected values are the AS3's own `gotoAndStop` arguments, read off the
 * source lines, not from `navTabs.ts`.
 */
import { describe, expect, it } from 'vitest';

import {
  MENU_FRAMES,
  isNavigable,
  navFrames,
  restingFrame,
  upgradesTabFrames,
} from './navTabs';

describe('the standard four-frame button', () => {
  it('numbers rest, hover, pressed and you-are-here', () => {
    // `ButtonLevelSelect.as:38`, `:84`, `:53`, `:43` respectively.
    expect(navFrames('LevelSelect')).toEqual({ rest: 1, hover: 2, pressed: 3, current: 4 });
    // `ButtonEnemies.as` uses the same four; the icon buttons are uniform.
    expect(navFrames('Enemies')).toEqual(navFrames('LevelSelect'));
    expect(navFrames('Achievements')).toEqual(navFrames('LevelSelect'));
    expect(navFrames('Options')).toEqual(navFrames('LevelSelect'));
  });

  it('gives Menu three frames and no you-are-here', () => {
    // Menu is never a screen this bar is *on*, so `ButtonMenu` has no fourth
    // state to draw. The absent `current` is the assertion.
    expect(MENU_FRAMES).toEqual({ rest: 1, hover: 2, pressed: 3 });
    expect(MENU_FRAMES.current).toBeUndefined();
  });
});

describe('the Upgrades tab, which carries one more fact', () => {
  /**
   * `ButtonUpgrades.as:78-88`: `gotoAndStop(1 + extraFrames)`, where
   * `extraFrames` is 3 when `makeIcon` — anything in the shop is both un-maxed
   * and affordable.
   *
   * Driven as a pair on the identical input, because "affordable shifts the
   * triplet" and "affordable does nothing" are the two readings and only the
   * pair separates them.
   */
  it('shifts its triplet by three when something is affordable', () => {
    expect(upgradesTabFrames(false)).toMatchObject({ rest: 1, hover: 2, pressed: 3 });
    expect(upgradesTabFrames(true)).toMatchObject({ rest: 4, hover: 5, pressed: 6 });
  });

  /**
   * And frame 7 is **not** shifted — `:88`'s `gotoAndStop(7)` sits in the
   * `else` branch, outside the `extraFrames` arithmetic entirely. A generator
   * that added the offset uniformly would land on 10, a frame the clip does not
   * have, and `ChromeArt` would clamp it back to rest: the tab would stop
   * showing you where you are, only while you had money.
   */
  it('keeps you-are-here at 7 whether or not money is available', () => {
    expect(upgradesTabFrames(false).current).toBe(7);
    expect(upgradesTabFrames(true).current).toBe(7);
  });

  it('has seven frames in total, which is why it is the odd one out', () => {
    const frames = upgradesTabFrames(true);
    expect(Math.max(frames.rest, frames.hover, frames.pressed, frames.current ?? 0)).toBe(7);
  });
});

describe('which tab marks itself', () => {
  /**
   * The inversion the module header warns about: in the AS3 `isActive` means
   * *clickable*, so the tab you are on is the one that is not active.
   *
   * Both directions on the same destination, because a rule that returned
   * `rest` always, or `current` always, passes half of this.
   */
  it('gives the current destination its dedicated frame and the rest their rest frame', () => {
    expect(restingFrame('LevelSelect', 'LevelSelect')).toBe(4);
    expect(restingFrame('LevelSelect', 'Upgrades')).toBe(1);
    expect(restingFrame('Upgrades', 'Upgrades')).toBe(7);
    expect(restingFrame('Upgrades', 'LevelSelect')).toBe(1);
  });

  it('marks nothing when the bar is shown outside its own screens', () => {
    expect(restingFrame('Upgrades', null)).toBe(1);
    expect(restingFrame('Enemies', null)).toBe(1);
  });

  it('reports the current destination as the one place you cannot navigate to', () => {
    expect(isNavigable('Enemies', 'Enemies')).toBe(false);
    expect(isNavigable('Enemies', 'Options')).toBe(true);
    expect(isNavigable('Enemies', null)).toBe(true);
  });

  it('still shifts the rest frame for affordability while another screen is current', () => {
    // The two rules compose: not current, so rest — but the affordable rest.
    expect(restingFrame('Upgrades', 'LevelSelect', true)).toBe(4);
  });
});
