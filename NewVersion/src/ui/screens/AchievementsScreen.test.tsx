/**
 * The achievements board and its totals window.
 *
 * Two seams, and they fail in different ways. The board places 36 discs from
 * `achievementPlacementArray` and the window draws a 5x3 medal matrix; the
 * first breaks by *losing* an entry to a collision, the second by transcribing
 * the tier order backwards. Neither is visible in the other's tests.
 *
 * **jsdom computes no layout**, so nothing here proves a disc is on screen or
 * that the board fits. That was measured in a browser at six viewports and the
 * numbers are in the commit; what these hold is the markup contract and the
 * two CSS mechanisms the measurement depends on.
 */
import { readFileSync } from 'node:fs';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AchievementsScreen } from './AchievementsScreen';
import { GameEvents } from '../../game/events/GameEvents';
import { attachStoreBridge, detachStoreBridge } from '../../state/bridge';
import { useGameStore } from '../../state/gameStore';
import { buildAchievementListing } from '../../game/achievements/achievementListing';
import { buildAchievementStats } from '../../game/achievements/achievementStats';
import { createEmptyProgress } from '../../game/levels/levelProgress';

const CSS = readFileSync('src/styles/global.css', 'utf8');

/*
 * Comments stripped before any selector scan — the third time a prose-as-code
 * match has been caught in this repo. A rule's own docstring names the
 * property it deliberately does *not* set, which is exactly the string these
 * assertions look for.
 */
const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

/** The declaration block of one selector, comments already gone. */
function block(selector: string): string {
  const at = cssCode.indexOf(`${selector} {`);
  expect(at, `${selector} is not in the stylesheet`).toBeGreaterThan(-1);
  return cssCode.slice(at, cssCode.indexOf('}', at));
}

function mount(): HTMLElement {
  const listing = buildAchievementListing(
    {},
    buildAchievementStats(createEmptyProgress(), { enemyKills: 1234, moneyEarned: 56_789 }),
  );
  const view = render(<AchievementsScreen />);
  act(() => {
    GameEvents.emit('scene:ready', { key: 'Achievements' });
    GameEvents.emit('achievements:listed', listing);
  });
  return view.container;
}

beforeEach(() => {
  attachStoreBridge();
});

afterEach(() => {
  detachStoreBridge();
  useGameStore.setState({ activeScene: null, achievementBoard: null });
});

describe('the board', () => {
  it('draws every placement — none collide into one cell', () => {
    // The count is the point. An earlier version bucketed x/y into a regular
    // grid and lost `MaxedPrimary1`, which sits 16 units off the row step, so
    // 36 rendering as 35 is the failure this catches.
    const container = mount();
    expect(container.querySelectorAll('.achievements__cell')).toHaveLength(36);
  });

  it('places each disc by a unitless fraction of the board, not a percentage', () => {
    const container = mount();
    const cells = [...container.querySelectorAll<HTMLElement>('.achievements__cell')];
    for (const cell of cells) {
      const fx = cell.style.getPropertyValue('--fx');
      const fy = cell.style.getPropertyValue('--fy');
      // A `%` here would be the defect: the CSS multiplies these by a length.
      expect(fx).not.toMatch(/%/);
      expect(Number(fx)).toBeGreaterThanOrEqual(0);
      expect(Number(fx)).toBeLessThanOrEqual(1);
      expect(Number(fy)).toBeGreaterThanOrEqual(0);
      expect(Number(fy)).toBeLessThanOrEqual(1);
    }
    // The extremes are actually reached, or a fraction that collapsed every
    // entry to the middle would pass the range check above.
    const xs = cells.map((c) => Number(c.style.getPropertyValue('--fx')));
    expect(Math.min(...xs)).toBe(0);
    expect(Math.max(...xs)).toBe(1);
  });

  it('insets the placement range by half a disc, so an edge badge stays on the plate', () => {
    // `left: 0%` centres a disc half off the left edge and `100%` half off the
    // right. Measured, that overflowed the plate by up to 167px. The inset is
    // the fix and it is arithmetic, not styling — hence a check on it.
    const cell = block('.achievements__cell');
    expect(cell).toMatch(/left:\s*calc\(var\(--disc\)\s*\/\s*2\s*\+\s*\(100%\s*-\s*var\(--disc\)\)\s*\*\s*var\(--fx\)\)/);
    expect(cell).toMatch(/top:\s*calc\(var\(--disc\)\s*\/\s*2\s*\+\s*\(100%\s*-\s*var\(--disc\)\)\s*\*\s*var\(--fy\)\)/);
  });

  /*
   * ── No percentage lengths on the disc ────────────────────────────────────
   *
   * The defect this replaces: `padding: 6%` on the cell, read as a share of
   * the disc. Percentage padding resolves against the **containing block's**
   * inline size — the grid — so it was 6% of 1425px, or 85.5px a side, on a
   * 105px disc. The border box grew to 173px, the rows overlapped and the last
   * one hung 45px off the plate.
   *
   * Measured in a browser, not here: jsdom resolves no percentages. What this
   * holds is the shape of the rule that made the measurement come out right,
   * so the number cannot quietly come back as a percentage.
   */
  it('sizes the disc only in shares of --disc, never in percentages', () => {
    const cell = block('.achievements__cell');
    expect(cell).toMatch(/padding:\s*calc\(var\(--disc\)\s*\*/);
    // `border-radius: 50%` is a percentage of the element's own box and is the
    // one that is *meant* to be — asserted here so the rule above is read as
    // "no percentage that resolves against the parent", not "no `%` at all".
    expect(cell).toMatch(/border-radius:\s*50%/);
    expect(cell).not.toMatch(/padding:\s*\d/);
    expect(cell).toMatch(/width:\s*var\(--disc\)/);
    expect(cell).toMatch(/height:\s*var\(--disc\)/);
  });

  it('resolves --disc against the board, and sizes the parts in em', () => {
    // The board is the query container the `cq` units measure; the cell is
    // deliberately not one, so the parts scale off the cell's font-size
    // instead. Asserting only the cell half would pass on a stylesheet with no
    // containers at all, which is why the board's line sits beside it.
    expect(block('.achievements__board')).toMatch(/container-type:\s*size/);
    expect(block('.achievements__grid')).toMatch(/--disc:\s*min\(\s*13cqh\s*,\s*13cqw\s*\)/);
    expect(block('.achievements__cell')).toMatch(/font-size:\s*calc\(var\(--disc\)\s*\*/);
    expect(block('.achievements__title')).toMatch(/font-size:\s*1em/);
    expect(block('.achievements__title')).not.toMatch(/cq[wh]/);
  });

  it('spans the body rather than sitting in pillars', () => {
    // `A32` — the same rule level select and the shop landed on.
    expect(block('.achievements')).not.toMatch(/max-width/);
  });
});

describe('the totals window', () => {
  it('shows both running totals, formatted', () => {
    const container = mount();
    const values = [...container.querySelectorAll('.achievements__stat-value')].map(
      (n) => n.textContent,
    );
    expect(values).toEqual(['1,234', '$56,789']);
  });

  it('draws five mode rows of three tiers, in the frame order', () => {
    const container = mount();
    const rows = [...container.querySelectorAll('.achievements__medal-row')];
    expect(rows).toHaveLength(5);
    for (const row of rows) {
      const tiers = [...row.querySelectorAll('.achievements__medal')].map((n) =>
        // `className` on an SVG is an `SVGAnimatedString`, which read as empty
        // for every tier once already — the same wrong answer for every input.
        // These are spans, but read the attribute anyway so a later refactor
        // to an SVG root cannot revive it.
        (n.getAttribute('class') ?? '').replace('achievements__medal achievements__medal--', ''),
      );
      expect(tiers).toEqual(['bronze', 'silver', 'gold']);
    }
  });

  it('reuses the level tiles own mode shapes rather than a second set', () => {
    // One definition of what a flag or a skull looks like. A separate copy here
    // would drift silently, because nothing renders the two side by side.
    const container = mount();
    const icons = [...container.querySelectorAll('.achievements__medal-icon')];
    expect(icons).toHaveLength(15);
    for (const icon of icons) {
      expect(icon.tagName.toLowerCase()).toBe('svg');
      expect(icon.getAttribute('viewBox')).toBe('0 0 24 24');
    }
  });

  it('tints the three tiers by currentColor, so one shape serves all of them', () => {
    for (const tier of ['bronze', 'silver', 'gold']) {
      expect(block(`.achievements__medal--${tier} .achievements__medal-icon`)).toMatch(
        /color:\s*#/,
      );
    }
  });
});
