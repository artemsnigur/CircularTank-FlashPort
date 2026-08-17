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
import { act, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { AchievementsScreen } from './AchievementsScreen';
import { GameEvents } from '../../game/events/GameEvents';
import { attachStoreBridge, detachStoreBridge } from '../../state/bridge';
import { useGameStore } from '../../state/gameStore';
import { buildAchievementListing } from '../../game/achievements/achievementListing';
import {
  ACHIEVEMENT_BADGE_SIZE,
  ACHIEVEMENT_CLIPS,
  ACHIEVEMENT_SHAPE_BOX,
} from '../../game/achievements/achievementArt';
import { buildAchievementStats } from '../../game/achievements/achievementStats';
import { achievementNote } from '../../game/achievements/achievementTooltip';
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
    // The count is the point. An earlier version derived a row index by
    // dividing y by 40 when the lattice steps 56, so two entries rounded into
    // one cell: 36 rendering as 35 is the failure this catches.
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
   * ── No percentage lengths on the badge ───────────────────────────────────
   *
   * The defect this replaces: `padding: 6%` on the cell, read as a share of
   * the disc. Percentage padding resolves against the **containing block's**
   * inline size — the grid — so it was 6% of 1425px, or 85.5px a side, on a
   * 105px disc. The border box grew to 173px, the rows overlapped and the last
   * one hung 45px off the plate.
   *
   * Measured in a browser, not here: jsdom resolves no percentages. What this
   * holds is the shape of the rule that made the measurement come out right,
   * so a length whose meaning depends on the parent cannot come back.
   */
  it('sizes the badge only in shares of --disc, never in percentages', () => {
    const cell = block('.achievements__cell');
    expect(cell).toMatch(/width:\s*var\(--disc\)/);
    expect(cell).toMatch(/height:\s*var\(--disc\)/);
    expect(cell).toMatch(/font-size:\s*calc\(var\(--disc\)\s*\*/);
    // The declaration is gone entirely — the art spans the padding box either
    // way, so a corrected padding would have been dead CSS pinned by a test.
    expect(cell).not.toMatch(/padding/);
    // `border-radius: 50%` is a percentage of the element's *own* box and is
    // the one that is meant to be, so the rule above reads as "no percentage
    // that resolves against the parent" rather than "no `%` at all".
    expect(cell).toMatch(/border-radius:\s*50%/);
  });

  it('resolves --disc against the board, and stays under the lattice ceiling', () => {
    // The board is the query container the `cq` units measure; the cell is
    // deliberately not one. Asserting only the cell half would pass on a
    // stylesheet with no containers at all, which is why the board's line
    // sits beside it.
    expect(block('.achievements__board')).toMatch(/container-type:\s*size/);

    /*
     * The ceiling is arithmetic, not taste. Six rows with centres inset by
     * half a badge put the row pitch at `(H - d) / 5`, so neighbours touch at
     * `d = H / 6`, or 16.67cqh. The expected value comes from the lattice —
     * `ys.length` rows — rather than from the stylesheet, so raising `--disc`
     * past the point where badges collide fails here instead of in a browser.
     */
    const rows = 6;
    const ceiling = 100 / rows;
    const declared = /--disc:\s*min\(\s*([\d.]+)cqh\s*,\s*([\d.]+)cqw\s*\)/.exec(
      block('.achievements__grid'),
    );
    expect(declared, '--disc is not a min() of two cq shares').not.toBeNull();
    expect(Number(declared![1])).toBe(Number(declared![2]));
    expect(Number(declared![1])).toBeLessThan(ceiling);
    // And large enough to be worth the plate. The badge was at 13, or 78% of
    // the ceiling, and was reported as too small; this holds the gain.
    expect(Number(declared![1])).toBeGreaterThan(ceiling * 0.85);
  });

  it('hugs the lattice rather than taking every spare pixel', () => {
    // The plate was `minmax(0, 1fr)`: 1461px wide at 1920 around a lattice
    // needing ~850, so the columns stood 267px apart. The ratio is the
    // lattice's own 60:56 step, worked through the placement inset.
    expect(block('.achievements')).toMatch(/grid-template-columns:\s*auto var\(--panel\)/);
    expect(block('.achievements')).toMatch(/justify-content:\s*center/);
    expect(block('.achievements__board')).toMatch(/aspect-ratio:\s*1\.06/);
  });

  /*
   * ── The badge is a picture, and the layers are not one size ──────────────
   *
   * `Achievement<id>` composes a 52-unit backing disc, a 48-unit difficulty
   * ring and an icon at its own size — 26x26 for `Bosses1`, 33.3x12.5 for
   * `BossOnlySpecial`. The results toast stretches every layer to fill its
   * box, which is survivable on one 64px icon and turns a badge into a blob at
   * 36 of them, so each layer carries its true share here.
   */
  it('draws each clip layer at its own size, not stretched to the disc', () => {
    const container = mount();
    const imgs = [...container.querySelectorAll<HTMLElement>('.achievements__art img')];
    expect(imgs.length).toBeGreaterThan(36);

    let scaled = 0;
    for (const img of imgs) {
      const shape = Number(/(\d+)\.svg/.exec(img.getAttribute('src') ?? '')?.[1]);
      const box = ACHIEVEMENT_SHAPE_BOX[shape];
      expect(box, `shape ${shape} has no recorded size`).toBeDefined();
      expect(Number(img.style.getPropertyValue('--sw'))).toBeCloseTo(
        box[0] / ACHIEVEMENT_BADGE_SIZE,
        6,
      );
      expect(Number(img.style.getPropertyValue('--sh'))).toBeCloseTo(
        box[1] / ACHIEVEMENT_BADGE_SIZE,
        6,
      );
      if (box[0] < ACHIEVEMENT_BADGE_SIZE) scaled += 1;
    }
    // The counterpart: if every layer were the full 52 units, the scale would
    // be 1 everywhere and this test would pass while proving nothing.
    expect(scaled).toBeGreaterThan(0);
    expect(block('.achievements__art img')).toMatch(/width:\s*calc\(100%\s*\*\s*var\(--sw\)\)/);
  });

  it('draws the earned picture on a locked badge, desaturated', () => {
    // A divergence, and a deliberate one — `A36`. Frame 1 is a grey disc with
    // the icon at 10% opacity, which is 36 empty circles on a fresh profile.
    // Every badge here is locked, so frame 2's shapes are what must appear.
    const container = mount();
    const cells = [...container.querySelectorAll('.achievements__cell')];
    expect(cells.every((c) => c.classList.contains('achievements__cell--locked'))).toBe(true);

    const first = ACHIEVEMENT_CLIPS.Kills1;
    const drawn = [...cells[0].querySelectorAll('img')].map((img) =>
      Number(/(\d+)\.svg/.exec(img.getAttribute('src') ?? '')?.[1]),
    );
    expect(drawn).toEqual([...first.frames[1]]);
    // Pinned against its counterpart: frame 1 is a *different* shape, so this
    // would fail if the view fell back to the AS3's locked art.
    expect(drawn).not.toEqual([...first.frames[0]]);
    expect(block('.achievements__cell--locked .achievements__art')).toMatch(/grayscale\(1\)/);
  });

  it('carries no text on the badge — it is a picture', () => {
    // The AS3's own arrangement, and what makes room for the art. All three
    // stay in the DOM for the accessible name and the tooltip.
    const container = mount();
    for (const selector of ['.achievements__title', '.achievements__goal']) {
      expect(container.querySelector(selector)).not.toBeNull();
    }
    // The three share one clipped rule; `block` keys on the last selector,
    // and the group membership is what makes the title part of it.
    expect(cssCode).toMatch(
      /\.achievements__title,\s*\.achievements__goal,\s*\.achievements__difficulty \{/,
    );
    expect(block('.achievements__difficulty')).toMatch(/clip-path:\s*inset\(50%\)/);
  });

  it('spans the body rather than sitting in pillars', () => {
    // `A32` — the same rule level select and the shop landed on.
    expect(block('.achievements')).not.toMatch(/max-width/);
  });
});

/*
 * ── The hover readout ────────────────────────────────────────────────────
 *
 * The same pointer-following card level select uses, and *the same component*
 * — `CursorTip`. Three defects were fixed in it (the corner flash, the
 * hit-test loop, the reflow-per-hover) and a second copy for this screen would
 * have started from the broken version of all three.
 *
 * jsdom has no pointer, so what these hold is the wiring: that a hover mounts
 * a card carrying the three parts, and that leaving takes it away again.
 */
describe('the hover card', () => {
  it('shows nothing until a badge is hovered', () => {
    mount();
    expect(document.querySelector('.cursor-tip')).toBeNull();
  });

  it('names the badge, its goal and its difficulty note', () => {
    const container = mount();
    const cell = container.querySelectorAll('.achievements__cell')[0];
    act(() => {
      fireEvent.mouseEnter(cell);
    });

    // Portalled to `<body>`, so it is deliberately not in `container`.
    const tip = document.querySelector('.cursor-tip');
    expect(tip).not.toBeNull();
    expect(tip!.querySelector('.cursor-tip__title')?.textContent).toBe('GRAVEYARD');
    expect(tip!.querySelector('.cursor-tip__objective')?.textContent).toBe('Kill 100 enemies.');
    expect(tip!.querySelector('.cursor-tip__note')?.textContent).toBe(
      achievementNote({
        title: 'GRAVEYARD',
        description: 'Kill 100 enemies.',
        difficultyMatters: false,
        difficulty: null,
        earned: false,
      }),
    );
  });

  it('takes the card away on leave', () => {
    const container = mount();
    const cell = container.querySelectorAll('.achievements__cell')[0];
    act(() => {
      fireEvent.mouseEnter(cell);
    });
    expect(document.querySelector('.cursor-tip')).not.toBeNull();
    act(() => {
      fireEvent.mouseLeave(cell);
    });
    expect(document.querySelector('.cursor-tip')).toBeNull();
  });

  it('stays hidden until it has been placed', () => {
    // The corner-flash guard. `visibility: hidden` until `--placed`, which the
    // layout effect adds once it has a pointer position — so a card that never
    // gets one is invisible rather than parked at the origin.
    expect(block('.cursor-tip')).toMatch(/visibility:\s*hidden/);
    expect(block('.cursor-tip--placed')).toMatch(/visibility:\s*visible/);
    expect(block('.cursor-tip')).toMatch(/pointer-events:\s*none/);
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
