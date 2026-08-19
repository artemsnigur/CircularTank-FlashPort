/**
 * The pause panel — `PartInterface.pauseGame` (`:426-476`).
 *
 * These drive the real component against the real store, because the defect
 * worth catching is not "does it render" but **do the key and the button agree
 * about what is paused**. A panel that renders perfectly and a latch holding
 * its own stale copy of `paused` would pass any snapshot.
 */
import { readFileSync } from 'node:fs';

import { describe, expect, it, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { PauseOverlay } from './PauseOverlay';
import { useGameStore } from '../state/gameStore';
import { GameEvents } from '../game/events/GameEvents';

beforeEach(() => {
  act(() => {
    useGameStore.setState({ paused: false, levelOutcome: null });
  });
});

describe('the panel appears only while paused', () => {
  it('renders nothing when the game is running', () => {
    render(<PauseOverlay />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders the title and all three actions when paused', () => {
    act(() => useGameStore.setState({ paused: true }));
    render(<PauseOverlay />);

    expect(screen.getByRole('dialog', { name: 'Game Paused' })).toBeTruthy();
    // `:438`, `:452`, `:456` — and in that order, which is the muscle memory.
    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons).toEqual(['Resume', 'Reset Level', 'Quit Level']);
  });

  /**
   * ── The same assertion, a different rule (T200) ─────────────────────────
   *
   * This was "does not duplicate the HUD audio toggles", and that reason was
   * true while `AudioToggles` sat in the HUD: a copy here would have put two
   * of each control on screen. **T200 removed the HUD copy**, so the panel is
   * no longer avoiding a duplicate — it is the only place the toggles could
   * be, and they are deliberately not here either.
   *
   * The assertion is unchanged and the rule underneath it is not, which is
   * exactly the case that goes unnoticed. Restated rather than left to read as
   * something it no longer means.
   */
  it('offers no audio control, so a level has none at all', () => {
    act(() => useGameStore.setState({ paused: true }));
    render(<PauseOverlay />);

    const buttons = screen.getAllByRole('button').map((b) => b.textContent);
    expect(buttons).not.toContain('Sound');
    expect(buttons).not.toContain('Music');

    // The counterpart, so this is "these three and nothing else" rather than
    // "these two strings are absent" — which any panel satisfies.
    expect(buttons).toEqual(['Resume', 'Reset Level', 'Quit Level']);
  });
});

/**
 * ── The flat design, T200 ─────────────────────────────────────────────────
 *
 * The panel was a `var(--panel)` card with a 3px border and three identical
 * steel pills. These pin what replaced it — not because a border is wrong in
 * principle, but because this panel is now deliberately part of the HUD's flat
 * set, and the next person reaching for the house style will reach for the
 * glass one.
 */
describe('the panel is flat, and matches the HUD plate', () => {
  const CSS = readFileSync('src/styles/global.css', 'utf8');
  // Comments stripped: this block's own prose names `--panel` and `border`,
  // and a scan reading prose as code would find both.
  const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

  function block(selector: string): string {
    const at = cssCode.indexOf(`${selector} {`);
    expect(at, `${selector} is not in the stylesheet`).toBeGreaterThan(-1);
    return cssCode.slice(at, cssCode.indexOf('}', at));
  }

  it('paints the panel with --hud-plate and no border', () => {
    const panel = block('.pause-overlay__panel');
    expect(panel).toMatch(/background:\s*var\(--hud-plate/);
    expect(panel).toMatch(/border:\s*none/);
    // The 3px frame is gone and a shadow does its job instead.
    expect(panel).not.toMatch(/border:\s*3px/);
    expect(panel).toMatch(/box-shadow:/);
  });

  it('resolves --hud-plate, because the panel sits inside .hud', () => {
    /*
     * `--hud-plate` is declared on `.hud`, and this panel is rendered *inside*
     * that element rather than beside it. If it were ever moved out, the
     * `var()` would fall through to its literal and the two surfaces would
     * drift apart silently — so the declaration site is asserted here.
     */
    expect(block('.hud')).toMatch(/--hud-plate:/);
    // And the fallback is the same value, so a move degrades rather than
    // breaking. Parsed from the declaration rather than restated.
    const declared = /--hud-plate:\s*(rgb\([^)]*\))/.exec(cssCode);
    expect(declared, '--hud-plate is not declared in the expected form').not.toBeNull();
    expect(block('.pause-overlay__panel')).toContain(declared![1]);
  });

  it('gives exactly one action the emphasis', () => {
    act(() => useGameStore.setState({ paused: true }));
    const { container } = render(<PauseOverlay />);

    const primary = container.querySelectorAll('.pause-overlay__button--primary');
    expect(primary).toHaveLength(1);
    expect(primary[0].textContent).toBe('Resume');

    // The counterpart: the other two exist and are *not* emphasised, so this
    // cannot pass by there being only one button.
    expect(container.querySelectorAll('.pause-overlay__button')).toHaveLength(3);
  });

  it('separates focus from hover', () => {
    /*
     * The old rule merged them into one `filter: brightness()`, so a keyboard
     * user could not tell which button was focused while the pointer was over
     * another. This panel opens with focus on Resume, so that is its whole
     * keyboard story.
     */
    expect(block('.pause-overlay__button:focus-visible')).toMatch(/outline:/);
    expect(block('.pause-overlay__button:hover')).not.toMatch(/outline:/);
  });

  it('scales its type and spacing off the viewport, with no fixed px', () => {
    for (const selector of [
      '.pause-overlay__panel',
      '.pause-overlay__title',
      '.pause-overlay__button',
    ]) {
      expect(block(selector), selector).toMatch(/clamp\([^)]*vh[^)]*\)/);
    }
  });

  it('holds the 44px touch target, which is not a thing to scale away', () => {
    // Every other measure here is fluid; this one is a floor and stays fixed.
    expect(block('.pause-overlay__button')).toMatch(/min-height:\s*44px/);
  });
});

describe('the actions emit what the scene listens for', () => {
  it('Resume asks to unpause', () => {
    act(() => useGameStore.setState({ paused: true }));
    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:pause', (payload) => seen.push(payload));
    render(<PauseOverlay />);

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    off();

    expect(seen).toEqual([{ paused: false }]);
  });

  it('Quit goes to level select, not the main menu', () => {
    // `ButtonPause.as:105`. The HUD's own Menu button is the one that goes to
    // the title, and this is deliberately not that.
    act(() => useGameStore.setState({ paused: true }));
    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:goto', (payload) => seen.push(payload));
    render(<PauseOverlay />);

    fireEvent.click(screen.getByRole('button', { name: 'Quit Level' }));
    off();

    expect(seen).toEqual([{ key: 'LevelSelect' }]);
  });

  it('Reset restarts gameplay', () => {
    act(() => useGameStore.setState({ paused: true }));
    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:goto', (payload) => seen.push(payload));
    render(<PauseOverlay />);

    fireEvent.click(screen.getByRole('button', { name: 'Reset Level' }));
    off();

    expect(seen).toEqual([{ key: 'Gameplay' }]);
  });

  it('has no auto-pause checkbox — it lives on the options screen', () => {
    // `:459-462` puts one in this panel, duplicating the options row. Removed
    // in T136; auto-pause itself is untouched, since `usePauseControl` reads
    // the option from the store either way.
    act(() => useGameStore.setState({ paused: true }));
    render(<PauseOverlay />);

    expect(screen.queryByRole('checkbox')).toBeNull();
    // The counterpart: the panel is otherwise intact, so "no checkbox" cannot
    // be satisfied by a panel that failed to render.
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
});

describe('a finished level takes the panel with it', () => {
  /**
   * The results overlay owns the screen once a level ends. `endLevel` clears
   * `paused` so the two can never stack — asserted here rather than trusted,
   * because the alternative is a pause panel stranded on top of the results
   * with a Resume button that resumes a level that is over.
   */
  it('clearing the level clears the pause', () => {
    act(() => useGameStore.setState({ paused: true }));
    expect(useGameStore.getState().paused).toBe(true);

    act(() => {
      useGameStore.getState().endLevel({
        won: true,
        world: 1,
        level: 1,
        kills: 0,
        earned: 0,
        medals: [],
        newAchievements: [],
        newEnemies: [],
      } as never);
    });

    expect(useGameStore.getState().paused).toBe(false);
  });
});

describe('the key and the button share one flag', () => {
  /**
   * **The interaction a locally-held `paused` would break**: pause with the
   * key, resume with the button, and the latch's own copy would still say
   * "paused" — so the next keypress would emit `paused: false` again and the
   * game would never pause. Driven through the store both components read.
   */
  it('a store-driven resume is visible to everything', () => {
    const seen: { paused: boolean }[] = [];
    const off = GameEvents.subscribe('ui:pause', (payload) => seen.push(payload));

    // The key pauses.
    act(() => {
      GameEvents.emit('ui:pause', { paused: true });
    });
    // Nothing mirrors it in this unit — the bridge does that in the app — so
    // the store is set the way the bridge would.
    act(() => useGameStore.setState({ paused: true }));
    render(<PauseOverlay />);
    expect(screen.getByRole('dialog')).toBeTruthy();

    // The button resumes, and the store follows.
    act(() => {
      GameEvents.emit('ui:pause', { paused: false });
    });
    act(() => useGameStore.setState({ paused: false }));
    off();

    expect(seen).toEqual([{ paused: true }, { paused: false }]);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
