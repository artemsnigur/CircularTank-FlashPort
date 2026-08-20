/**
 * The end-to-end proof for the event bridge, as an assertion rather than a
 * claim: a Phaser scene emits `currency:earned`, and the React counter shows
 * the new value — no polling, no shared mutable object.
 */
import { readFileSync } from 'node:fs';

import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Hud } from './Hud';
import { GameEvents } from '../game/events/GameEvents';
import { attachStoreBridge, detachStoreBridge } from '../state/bridge';
import { useGameStore } from '../state/gameStore';

const initial = useGameStore.getState();

beforeEach(() => {
  useGameStore.setState(initial, true);
  attachStoreBridge();
});

afterEach(() => {
  detachStoreBridge();
  GameEvents.removeAllListeners();
});

/** Puts the store in the state the HUD renders in. */
function enterGameplay(): void {
  act(() => {
    GameEvents.emit('scene:ready', { key: 'Gameplay' });
  });
}

const CSS = readFileSync('src/styles/global.css', 'utf8');

/*
 * Comments stripped before any selector scan. This block's own docstring
 * argues at length about `backdrop-filter` and names `.hud__row`, so a scan
 * reading prose as code would report both as present — the prose-as-code trap
 * this repo has now hit three times.
 */
const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

function block(selector: string): string {
  const at = cssCode.indexOf(`${selector} {`);
  expect(at, `${selector} is not in the stylesheet`).toBeGreaterThan(-1);
  return cssCode.slice(at, cssCode.indexOf('}', at));
}

/*
 * ── The layout, T194 ─────────────────────────────────────────────────────
 *
 * The HUD was two full-width rows; it is now three corner clusters with the
 * centre band left clear. These pin *where things are*, because the arena is
 * underneath and a readout drifting into the middle is the failure.
 */
/**
 * The results screen — T206.
 *
 * The victory path is hard to reach in a browser (you have to win), so the
 * things that differ between victory and defeat are pinned here, where the
 * outcome is an event payload rather than a level to play.
 */
describe('the results screen', () => {
  const finish = (result: 'won' | 'lost', medals: number, mode = 'Normal') => {
    enterGameplay();
    const view = render(<Hud />);
    act(() => {
      GameEvents.emit('level:ended', {
        result,
        world: 1,
        level: 1,
        kills: 10,
        currency: 25,
        nextLevel: result === 'won' ? { world: 1, level: 2 } : null,
        medals,
        mode,
        newAchievements: [],
        newEnemies: [],
      });
    });
    return view;
  };

  it('draws three medal sockets whatever was earned', () => {
    /*
     * The row must not resize as the stamps land, so an unearned medal keeps
     * its socket. Driven at both ends: none earned and all three.
     */
    for (const earned of [0, 3]) {
      const { container, unmount } = finish('won', earned);
      expect(container.querySelectorAll('.level-outcome__medal'), String(earned)).toHaveLength(3);
      unmount();
    }
  });

  it('takes the medal shape from the mode, not a star for everything', () => {
    // ScreenLevelSelect.as:874 builds the icon from the mode. Driven against
    // its counterpart: two modes on the same call must draw different paths.
    const normal = finish('won', 3).container.querySelector('.level-outcome__medal-icon path');
    const normalPath = normal?.getAttribute('d');
    expect(normalPath, 'the medal has no path at all').toBeTruthy();

    const boss = finish('won', 3, 'Boss').container.querySelectorAll(
      '.level-outcome__medal-icon path',
    );
    expect([...boss].some((p) => p.getAttribute('d') !== normalPath)).toBe(true);
  });

  it('gives exactly one action the emphasis, and names it by outcome', () => {
    /*
     * The hierarchy the screen was missing: four identical buttons led
     * nowhere. Driven for both outcomes on the same component, because the
     * primary is a *different button* in each and "one is primary" would pass
     * with the wrong one highlighted.
     */
    const won = finish('won', 3);
    const wonPrimary = won.container.querySelectorAll('.hud__button--primary');
    expect(wonPrimary).toHaveLength(1);
    expect(wonPrimary[0].textContent).toMatch(/next level/i);
    won.unmount();

    // A loss records no value, so there is no next level to offer and Retry is
    // the obvious action instead.
    const lost = finish('lost', 0);
    expect(lost.container.querySelector('.hud__button--primary')).toBeNull();
    expect(
      [...lost.container.querySelectorAll('.hud__button')].map((b) => b.textContent),
    ).toContain('Retry');
  });

  it('paints the results panel on the same plate, with no border', () => {
    const panel = block('.level-outcome__panel');
    expect(panel).toMatch(/background:\s*var\(--hud-plate/);
    expect(panel).toMatch(/border:\s*none/);
    expect(panel).not.toMatch(/border:\s*3px/);

    // The reveal pop-up sits above it and kept its frame until T206.
    const reveal = block('.level-outcome__reveal');
    expect(reveal).toMatch(/border:\s*none/);
    expect(reveal).toMatch(/background:\s*var\(--hud-plate/);
  });

  it('lays the stats out in three equal columns', () => {
    // Content-width columns shifted the row as the figures grew.
    expect(block('.level-outcome__stats')).toMatch(/grid-template-columns:\s*repeat\(3,\s*1fr\)/);
  });
});

describe('the HUD layout', () => {
  it('puts money top-left, health bottom-left and weapons on the bottom', () => {
    enterGameplay();
    const { container } = render(<Hud />);

    /*
     * One readout per corner. T195 put health and money together at the
     * bottom-left; T196 sent the money back up, so the two are asserted apart
     * — the money must *not* be in the bottom cluster, which is what a
     * half-applied move would leave behind.
     */
    expect(container.querySelector('.hud__corner--tl .hud-money')).not.toBeNull();
    expect(container.querySelector('.hud__corner--bl .hud-health')).not.toBeNull();
    expect(container.querySelector('.hud__corner--bl .hud-money')).toBeNull();
    // And exactly one of it, so a move that copied rather than moved fails.
    expect(container.querySelectorAll('.hud-money').length).toBe(1);

    expect(container.querySelector('.hud__corner--tr .hud__controls')).not.toBeNull();
    expect(container.querySelector('.hud__bottom .hud-reload')).not.toBeNull();

    // And the counterpart: nothing sits in the middle row of the grid, which
    // is the whole point of the change.
    expect(container.querySelectorAll('.hud > *').length).toBeLessThanOrEqual(7);
  });

  /*
   * ── Flat grey, T195 ──────────────────────────────────────────────────
   *
   * The glass finish was rejected for the HUD: no border, no box-shadow, no
   * gradient. Pinned because every other surface in this stylesheet is built
   * the opposite way, so the next person to reach for the house style will
   * reach for the wrong one.
   */
  it('paints the readouts flat, with no border and no glass', () => {
    const surface = block('.hud-stat,\n.hud-health,\n.hud-reload');
    expect(surface).toMatch(/border:\s*none/);
    expect(surface).toMatch(/box-shadow:\s*none/);
    expect(surface).toMatch(/background-image:\s*none/);
    // One grey for the whole HUD, so it moves together.
    expect(surface).toMatch(/background-color:\s*var\(--hud-plate\)/);
    expect(block('.hud')).toMatch(/--hud-plate:/);

    // The pause button is a `.gloss-pill`, so it needs the finish taken off
    // explicitly — and at two classes, or the pill's own rule wins.
    const pause = block('.gloss-pill.hud-pause');
    expect(pause).toMatch(/border:\s*none/);
    expect(pause).toMatch(/box-shadow:\s*none/);
    expect(pause).toMatch(/background-color:\s*var\(--hud-plate\)/);

    /*
     * The counterpart, so this reads as "the HUD is flat" rather than "this
     * stylesheet has no gradients": the menus still carry theirs, and it is
     * `.gloss-pill` itself that the override above is fighting.
     */
    expect(block('.gloss-pill')).toMatch(/linear-gradient/);
  });

  /*
   * The money is green, and the override must outrank its own base class.
   *
   * At one class it did not. `.hud-money__value` and `.hud-stat__value` are
   * both (0,1,0) and the money rule sits earlier in the file, so source order
   * handed it to the base and the figure rendered white — measured as
   * `rgb(255, 255, 255)` at all six viewports while the sheet plainly said
   * green. This asserts the *shape* of the fix rather than the colour, because
   * a colour assertion is exactly what passed while the bug was live.
   */
  it('states the money colour at two classes so it outranks .hud-stat__value', () => {
    expect(cssCode).toMatch(/\.hud-stat__value\.hud-money__value\s*\{/);
    // The counterpart: the base rule it has to beat is still there, and still
    // sets a colour. If that ever stops being true this test is guarding
    // nothing and should go.
    expect(block('.hud-stat__value')).toMatch(/color:/);
  });

  it('lets clicks through to the arena except on the controls', () => {
    // The HUD covers the whole viewport. If the root ever stops being
    // `pointer-events: none`, aiming and firing stop working everywhere the
    // overlay reaches — which is everywhere.
    expect(block('.hud')).toMatch(/pointer-events:\s*none/);
    expect(block('.hud__controls')).toMatch(/pointer-events:\s*auto/);
    expect(block('.gloss-pill.hud-pause')).toMatch(/pointer-events:\s*auto/);
  });

  /*
   * ── No `backdrop-filter` on the HUD, and this is the measured rule ───────
   *
   * `D-FPS` measured 52 fps lost to a `backdrop-filter` over this same Phaser
   * canvas on a *menu* screen, where the canvas is idle. The HUD sits over it
   * while the game is running, so the blur would be recomputed every frame
   * over a region that changes every frame.
   *
   * Pinned because it is the one place the obvious "make it glassy" edit is
   * actively harmful, and nothing in the visual result would show it.
   */
  it('never puts a backdrop-filter over the live arena', () => {
    /*
     * Every rule whose selector mentions a `hud` class, not a hand-listed
     * few — the shared surface is a *grouped* selector
     * (`.hud-stat, .hud-health, .hud-reload`), so naming rules individually
     * would miss the one that actually paints the panels.
     */
    const hudRules = [...cssCode.matchAll(/([^{}]+)\{([^}]*)\}/g)].filter((m) =>
      /\.hud[\w-]*/.test(m[1]),
    );

    // A match set that came back empty would pass the loop below in silence.
    expect(hudRules.length, 'no HUD rules matched at all').toBeGreaterThan(8);
    for (const [, selector, body] of hudRules) {
      expect(body, `backdrop-filter on ${selector.trim()}`).not.toMatch(/backdrop-filter/);
    }

    // The counterpart, so this reads as "the HUD does not" rather than
    // "nothing in the stylesheet does": the two surfaces that are *not* over
    // live gameplay keep theirs.
    expect(cssCode).toMatch(/backdrop-filter/);
  });

  /*
   * The pill, T196. The shared surface rule sets a small radius on
   * `.hud-health` too and both selectors are one class, so this only holds on
   * source order — `.hud-health` sits below it. Pinned because moving the rule
   * up the file would restore the old corners with nothing else changing.
   */
  it('rounds the health bar into a pill, beating the shared radius', () => {
    expect(block('.hud-health')).toMatch(/border-radius:\s*999px/);

    const sharedAt = cssCode.indexOf('.hud-stat,\n.hud-health,\n.hud-reload {');
    const healthAt = cssCode.indexOf('.hud-health {');
    expect(sharedAt, 'shared surface rule not found').toBeGreaterThan(-1);
    expect(healthAt, 'health rule not found').toBeGreaterThan(-1);
    expect(healthAt, 'the pill radius must sit below the rule it overrides').toBeGreaterThan(
      sharedAt,
    );
  });

  it('leaves the health colour to healthColour(), not the stylesheet', () => {
    // The ramp moved into a tested function. A gradient left behind here
    // would paint over the computed fill and silently win.
    expect(block('.hud-health__fill')).not.toMatch(/linear-gradient/);
    expect(block('.hud-health__fill')).not.toMatch(/background-image/);
    // The counterpart: the fill rule does still exist and still styles it.
    expect(block('.hud-health__fill')).toMatch(/border-radius:\s*inherit/);
  });

  /*
   * ── The pre-level briefing, T205 ──────────────────────────────────────
   *
   * It was a 72%-black box with a 3px border and two lines at the same size.
   * These pin the hierarchy and the surface, because the panel shows for about
   * two seconds at the start of a level and is the easiest thing in the game
   * to regress without anyone seeing it.
   */
  it('reads mode, then objective, then the count', () => {
    enterGameplay();
    const { container } = render(<Hud />);

    act(() => {
      GameEvents.emit('countdown:changed', {
        label: '3',
        mode: 'Flag Mode',
        objective: 'Capture 5 Flags',
        running: true,
      });
    });

    const panel = container.querySelector('.hud-countdown__panel');
    expect(panel, 'no briefing panel').not.toBeNull();

    // Order asserted as the rendered sequence, which is what a player reads.
    const lines = [...panel!.children].map((el) => el.className.replace('hud-countdown__', ''));
    expect(lines).toEqual(['mode', 'objective', 'digit']);
  });

  it('paints the briefing on the same plate as everything else', () => {
    const panel = block('.hud-countdown__panel');
    expect(panel).toMatch(/background:\s*var\(--hud-plate/);
    expect(panel).toMatch(/border:\s*none/);
    // The 3px frame is gone and a shadow does its job.
    expect(panel).not.toMatch(/border:\s*3px/);
    expect(panel).toMatch(/box-shadow:/);
  });

  it('makes the objective the largest text and the mode the smallest', () => {
    /*
     * Hierarchy as a relationship between the two vh coefficients, not as
     * absolute sizes — the panel is fluid, so comparing rendered pixels would
     * need a browser and comparing rem literals would break on the next tune.
     */
    const coefficient = (selector: string): number => {
      const m = /font-size:\s*clamp\([^,]+,\s*([\d.]+)vh/.exec(block(selector));
      expect(m, selector + ' does not size its font in vh').not.toBeNull();
      return Number(m![1]);
    };

    const mode = coefficient('.hud-countdown__mode');
    const objective = coefficient('.hud-countdown__objective');
    const digit = coefficient('.hud-countdown__digit');

    expect(objective).toBeGreaterThan(mode);
    // And the digit is bigger still — it is a countdown, it just does not lead.
    expect(digit).toBeGreaterThan(objective);
  });

  it('reserves the digit line so the briefing cannot jump', () => {
    // Empty until the first cue at frame 54. Without a reserved line the two
    // lines above would move as the count appeared.
    expect(block('.hud-countdown__digit')).toMatch(/min-height:/);
  });

  it('scales the surface off the viewport height, with no fixed px', () => {
    // The arena's useful scale is the window's height, and the HUD's parent is
    // the full overlay rather than a sized container — so `vh`, not `cqh`,
    // which would resolve against the wrong box or none at all.
    expect(block('.hud-health')).toMatch(/clamp\([^)]*vh[^)]*\)/);
    expect(block('.hud-stat')).toMatch(/clamp\([^)]*vh[^)]*\)/);
    expect(block('.gloss-pill.hud-pause')).toMatch(/clamp\([^)]*vh[^)]*\)/);
    expect(block('.hud__bottom')).toMatch(/clamp\([^)]*vh[^)]*\)/);
  });
});

describe('Hud', () => {
  it('shows the currency counter updating from a Phaser event', () => {
    enterGameplay();
    render(<Hud />);

    // `$` prefixed, T195 — it was a bare figure beside a coin glyph.
    expect(screen.getByText('$0')).toBeInTheDocument();

    act(() => {
      GameEvents.emit('currency:earned', { amount: 5, total: 5 });
    });
    expect(screen.getByText('$5')).toBeInTheDocument();

    act(() => {
      GameEvents.emit('currency:earned', { amount: 5, total: 10 });
    });
    expect(screen.getByText('$10')).toBeInTheDocument();
  });

  it('comma-groups the money figure behind the dollar sign', () => {
    // The sign is part of the text node rather than a `::before`, so it is
    // read out with the figure instead of being skipped as decoration.
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('currency:earned', { amount: 0, total: 1500 });
    });
    // Functions.formatNumber, not toLocaleString — which yields "1 500" in
    // fr-FR and would make this assertion locale-dependent.
    expect(screen.getByText('$1,500')).toBeInTheDocument();
  });

  it('opens on the saved balance rather than zero', () => {
    // Regression: GameplayScene.create emitted a hardcoded `total: 0`, which
    // overwrote the real opening balance until the first coin corrected it —
    // indistinguishable from the save having failed to load.
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('currency:earned', { amount: 0, total: 500 });
    });
    expect(screen.getByText('$500')).toBeInTheDocument();
    expect(screen.queryByText('$0')).not.toBeInTheDocument();
  });

  it('drops back to the banked balance when a level is abandoned', () => {
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('currency:earned', { amount: 0, total: 200 });
      GameEvents.emit('currency:earned', { amount: 90, total: 290 });
    });
    expect(screen.getByText('$290')).toBeInTheDocument();

    // Shutdown without finishing restores the figure actually held.
    act(() => {
      GameEvents.emit('currency:earned', { amount: 0, total: 200 });
    });
    expect(screen.getByText('$200')).toBeInTheDocument();
  });

  it('renders health as an accessible progress bar', () => {
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('player:damaged', { amount: 25, health: 75, maxHealth: 100 });
    });

    const bar = screen.getByRole('progressbar', { name: /tank health/i });
    expect(bar).toHaveAttribute('aria-valuenow', '75');
    expect(screen.getByText('75/100')).toBeInTheDocument();
  });

  it('shows the wave counter and kill progress', () => {
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('wave:changed', {
        wave: 3,
        enemiesKilled: 13,
        enemiesTotal: 20,
        mode: 'Normal',
        flagsCaptured: 0,
        flagsTotal: 0,
      });
    });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('13/20 killed')).toBeInTheDocument();
  });

  it('shows both reload bars once a secondary is equipped, and one before', () => {
    // The secondary bar is conditional on *having a secondary* — the only
    // conditional part of the readout. Pinned as a pair so "always two" and
    // "always one" both fail.
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 1,
        secondary: 1,
        weapon: 'Cannon',
        secondaryName: null,
        equipped: ['Cannon', 'None'],
        slot: 1,
        secondaryReady: true,
      });
    });
    rerender(<Hud />);
    expect(screen.getAllByRole('progressbar', { name: /reload/i })).toHaveLength(1);
    expect(screen.getByText('Cannon')).toBeInTheDocument();

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 1,
        secondary: 0.5,
        weapon: 'Cannon',
        secondaryName: 'Mine',
        equipped: ['Cannon', 'None'],
        slot: 1,
        secondaryReady: false,
      });
    });
    rerender(<Hud />);
    expect(screen.getAllByRole('progressbar', { name: /reload/i })).toHaveLength(2);
    expect(screen.getByText('Mine')).toBeInTheDocument();
  });

  it('renders the fill it is given, at both ends and in between', () => {
    // A bar that ignored its input would still mount and still show the weapon
    // name, so the readout being present proves nothing on its own.
    enterGameplay();
    const { rerender } = render(<Hud />);

    for (const [fill, expected] of [[0, '0'], [0.5, '50'], [1, '100']] as const) {
      act(() => {
        GameEvents.emit('reload:changed', {
          primary: fill,
          secondary: 1,
          weapon: 'Cannon',
          secondaryName: null,
          equipped: ['Cannon', 'None'],
          slot: 1,
          secondaryReady: true,
        });
      });
      rerender(<Hud />);
      expect(
        screen.getByRole('progressbar', { name: /Cannon reload/i }),
      ).toHaveAttribute('aria-valuenow', expected);
    }
  });

  it('keeps the weapon name visible across a weapon switch, at an empty bar', () => {
    // Regression, and the reason the old `capacity <= 0` guard is gone.
    // `cycleWeapon` pays the incoming weapon a full reload, so the bar is
    // **empty** on the frame after a switch — exactly the state that used to
    // unmount the whole readout and take the weapon name with it.
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 1,
        secondary: 1,
        weapon: 'Cannon',
        secondaryName: null,
        equipped: ['Cannon', 'None'],
        slot: 1,
        secondaryReady: true,
      });
    });
    rerender(<Hud />);
    expect(screen.getByText('Cannon')).toBeInTheDocument();

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 0,
        secondary: 1,
        weapon: 'MiniGun',
        secondaryName: null,
        equipped: ['MiniGun', 'None'],
        slot: 1,
        secondaryReady: true,
      });
    });
    rerender(<Hud />);

    expect(screen.getByText('MiniGun')).toBeInTheDocument();
    expect(screen.queryByText('Cannon')).not.toBeInTheDocument();
  });

  /**
   * The weapon art — T150.
   *
   * These are about the *wiring*, not the pictures: which icons mount, what
   * they point at and when they dim. The frame table, the layer offsets and
   * the two AS3 rules behind them are driven in `ui/weaponPanel.test.ts`
   * against the SWF geometry, which is where a wrong picture is catchable.
   *
   * `data-weapon` exists for these assertions: the icons are `aria-hidden`
   * decorations, so there is no accessible name to query them by, and querying
   * the `<img>` sources would assert on shape ids in two places.
   */
  it('draws an icon for the weapon in hand', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 1,
        secondary: 1,
        weapon: 'Big Cannon',
        secondaryName: null,
        equipped: ['Big Cannon', 'None'],
        slot: 1,
        secondaryReady: true,
      });
    });
    rerender(<Hud />);

    const icons = document.querySelectorAll('.weapon-icon');
    expect(icons).toHaveLength(1);
    expect(icons[0].getAttribute('data-weapon')).toBe('Big Cannon');
    // Socket plus one glyph — frame 4. A single layer would mean the glyph
    // never resolved and the socket was drawn alone.
    expect(icons[0].querySelectorAll('img')).toHaveLength(2);
  });

  it('previews the other slot only when both slots are filled', () => {
    // `PartInterface.as:242` against `WeaponInterface.as:44-51`, driven as a
    // pair on the same payload shape: one slot filled shows one icon, two
    // slots filled show two, and the second is the one *not* in hand.
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 1,
        secondary: 1,
        weapon: 'Cannon',
        secondaryName: null,
        equipped: ['Cannon', 'None'],
        slot: 1,
        secondaryReady: true,
      });
    });
    rerender(<Hud />);
    expect(document.querySelectorAll('.weapon-icon')).toHaveLength(1);

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 1,
        secondary: 1,
        weapon: 'Cannon',
        secondaryName: null,
        equipped: ['Cannon', 'Shotgun'],
        slot: 1,
        secondaryReady: true,
      });
    });
    rerender(<Hud />);

    const shown = [...document.querySelectorAll('.weapon-icon')].map((el) =>
      el.getAttribute('data-weapon'),
    );
    expect(shown).toEqual(['Shotgun', 'Cannon']);
  });

  it('follows the slot in hand when the weapon is switched', () => {
    // The preview is the *opposite* slot, so switching swaps both icons. A
    // component that read `equipped[1]` unconditionally would pass the test
    // above and fail this one.
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 1,
        secondary: 1,
        weapon: 'Shotgun',
        secondaryName: null,
        equipped: ['Cannon', 'Shotgun'],
        slot: 2,
        secondaryReady: true,
      });
    });
    rerender(<Hud />);

    const shown = [...document.querySelectorAll('.weapon-icon')].map((el) =>
      el.getAttribute('data-weapon'),
    );
    expect(shown).toEqual(['Cannon', 'Shotgun']);
  });

  it('dims the special while it reloads and lights it when ready', () => {
    // `:648` against `:643`. Both directions on the same element, because a
    // component that hard-coded either value would pass one of them.
    enterGameplay();
    const { rerender } = render(<Hud />);

    const special = (): HTMLElement | null =>
      document.querySelector<HTMLElement>('.weapon-icon[data-weapon="Mine"]');

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 1,
        secondary: 0.4,
        weapon: 'Cannon',
        secondaryName: 'Mine',
        equipped: ['Cannon', 'None'],
        slot: 1,
        secondaryReady: false,
      });
    });
    rerender(<Hud />);
    expect(special()?.style.opacity).toBe('0.25');

    act(() => {
      GameEvents.emit('reload:changed', {
        primary: 1,
        secondary: 1,
        weapon: 'Cannon',
        secondaryName: 'Mine',
        equipped: ['Cannon', 'None'],
        slot: 1,
        secondaryReady: true,
      });
    });
    rerender(<Hud />);
    expect(special()?.style.opacity).toBe('1');
  });

  // Deleted in T78: `it('hides the readout entirely when capacity drops to zero')`.
  //
  // **The audit predicted this deletion.** Under *"Two tests pin defects as
  // specification"* it recorded that the test pinned the `capacity <= 0` guard
  // — a guard whose reach was the whole component when its reason was only
  // "there is no magazine to show" — and that narrowing it "would now fail a
  // green test". The guard is gone with the magazine it described, so the test
  // goes with it rather than being adapted. The behaviour it was protecting is
  // now the case directly above, from the opposite side: an empty bar must
  // *keep* the readout mounted.

  it('shows the results overlay when a level ends', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    act(() => {
      GameEvents.emit('level:ended', {
        result: 'won',
        world: 1,
        level: 3,
        kills: 12,
        currency: 240,
        nextLevel: { world: 1, level: 4 },
        medals: 3,
        mode: 'Normal',
        newAchievements: [],
        newEnemies: [],
      });
    });
    rerender(<Hud />);

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // T161: the heading is `TitleVictory` art with the word under it, so the
    // assertion moved from the old prose to what the art actually says.
    expect(screen.getByText('Victory')).toBeInTheDocument();
    expect(document.querySelector('[data-clip="TitleVictory"]')).not.toBeNull();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('240')).toBeInTheDocument();
  });

  /**
   * **The T74 regression, pinned by its symptom.**
   *
   * Six achievements landing on one clear (which `?primary=`'s maxed upgrades
   * produce) rendered a centred toast column straight through the centred
   * results panel, hiding the title it was celebrating.
   *
   * Asserted as a **pair on one render**: exactly one toast is on screen *and*
   * the results title is present. Either half alone passes a wrong fix —
   * capping the stack at three keeps the title covered, and hiding toasts
   * entirely keeps the title visible while losing the feature.
   */
  it('keeps the results title visible with six achievements at once', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      for (const id of ['a1', 'a2', 'a3', 'a4', 'a5', 'a6']) {
        GameEvents.emit('achievement:unlocked', { id, title: `Award ${id}` });
      }
      GameEvents.emit('level:ended', {
        result: 'won',
        world: 1,
        level: 3,
        kills: 12,
        currency: 240,
        nextLevel: { world: 1, level: 4 },
        medals: 3,
        mode: 'Normal',
        newAchievements: [],
        newEnemies: [],
      });
    });
    rerender(<Hud />);

    // One toast, not six — `PartAchievements.as:265`.
    expect(screen.getAllByText('Achievement unlocked')).toHaveLength(1);
    expect(screen.getByText('Award a1')).toBeInTheDocument();
    expect(screen.queryByText('Award a2')).not.toBeInTheDocument();

    // …and the panel the toasts used to bury is intact.
    expect(screen.getByText('Victory')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('offers the next level after a win', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('level:ended', {
        result: 'won',
        world: 1,
        level: 3,
        kills: 5,
        currency: 100,
        nextLevel: { world: 1, level: 4 },
        medals: 3,
        mode: 'Normal',
        newAchievements: [],
        newEnemies: [],
      });
    });
    rerender(<Hud />);

    expect(screen.getByRole('button', { name: /next level/i })).toBeInTheDocument();
  });

  it('offers no next level when there is none', () => {
    // A loss unlocks nothing, so there is nothing to move on to. Note this is
    // *not* the world-boundary case: 1-45 does have a successor, 2-1. An
    // earlier version of this comment said it did not, which described the
    // `level + 1` bug rather than a rule.
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('level:ended', {
        result: 'lost',
        world: 1,
        level: 3,
        kills: 5,
        currency: 100,
        nextLevel: null,
        medals: 3,
        mode: 'Normal',
        newAchievements: [],
        newEnemies: [],
      });
    });
    rerender(<Hud />);

    expect(screen.queryByRole('button', { name: /next level/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('starts the level the scene named, rolling over into the next world', () => {
    // The overlay used to emit `level + 1`, so finishing 1-45 would have asked
    // for the non-existent 1-46. The scene resolves the target now, and this
    // asserts the button sends it verbatim rather than deriving anything.
    enterGameplay();
    const started: Array<{ world: number; level: number; difficulty: string }> = [];
    const off = GameEvents.subscribe('ui:start-game', (p) => void started.push(p));
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('level:ended', {
        result: 'won',
        world: 1,
        level: 45,
        kills: 9,
        currency: 300,
        nextLevel: { world: 2, level: 1 },
        medals: 3,
        mode: 'Normal',
        newAchievements: [],
        newEnemies: [],
      });
    });
    rerender(<Hud />);
    fireEvent.click(screen.getByRole('button', { name: /next level/i }));
    off();

    // The difficulty rides along from the store, defaulting to Easy here.
    expect(started).toEqual([{ world: 2, level: 1, difficulty: 'Easy' }]);
  });

  it('labels a defeat differently', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('level:ended', {
        result: 'lost',
        world: 1,
        level: 1,
        kills: 2,
        currency: 10,
        nextLevel: null,
        medals: 3,
        mode: 'Normal',
        newAchievements: [],
        newEnemies: [],
      });
    });
    rerender(<Hud />);

    expect(screen.getByText('Defeat')).toBeInTheDocument();
    // The counterpart to the win above, on the same mechanism: a panel wired to
    // one clip would pass whichever of the two was asserted alone.
    expect(document.querySelector('[data-clip="TitleDefeat"]')).not.toBeNull();
    expect(document.querySelector('[data-clip="TitleVictory"]')).toBeNull();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
  });

  it('keeps the enemy counter clear of coin pickups', () => {
    // Regression: collect() emitted wave:changed carrying the *pickup* count,
    // so grabbing a coin turned the enemy counter into a coin counter.
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('wave:changed', {
        wave: 3,
        enemiesKilled: 9,
        enemiesTotal: 20,
        mode: 'Normal',
        flagsCaptured: 0,
        flagsTotal: 0,
      });
      GameEvents.emit('currency:earned', { amount: 5, total: 5 });
    });

    // Progress, not a countdown — T197. `9 left` said nothing about whether
    // that was most of the level or the last of it.
    expect(screen.getByText('9/20 killed')).toBeInTheDocument();
    expect(screen.queryByText(/left/)).not.toBeInTheDocument();
  });

  /*
   * T197 replaced the separate flag widget with one objective line that
   * changes what it counts. Driven against its counterpart on the *identical*
   * emit shape: the same wave, the same numbers, only `mode` differing. That
   * is what separates "a Flag level counts flags" from "this line always says
   * collected".
   */
  it('counts flags on a Flag level and kills everywhere else', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('wave:changed', {
        wave: 3,
        enemiesKilled: 4,
        enemiesTotal: 20,
        mode: 'Normal',
        flagsCaptured: 3,
        flagsTotal: 9,
      });
    });
    rerender(<Hud />);
    expect(screen.getByText('4/20 killed')).toBeInTheDocument();
    expect(screen.queryByText('3/9 collected')).not.toBeInTheDocument();

    act(() => {
      GameEvents.emit('wave:changed', {
        wave: 3,
        enemiesKilled: 4,
        enemiesTotal: 20,
        mode: 'Flag',
        flagsCaptured: 3,
        flagsTotal: 9,
      });
    });
    rerender(<Hud />);

    expect(screen.getByText('3/9 collected')).toBeInTheDocument();
    expect(screen.queryByText('4/20 killed')).not.toBeInTheDocument();

    // The live arena population is gone from the HUD entirely — it moved every
    // second, it went *up* when the level spawned, and no decision used it.
    expect(screen.queryByText(/on screen/)).not.toBeInTheDocument();
  });

  it('surfaces an achievement toast', () => {
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('achievement:unlocked', { id: 'first-coins', title: 'Pocket Change' });
    });

    expect(screen.getByText('Pocket Change')).toBeInTheDocument();
  });

  it('hides the in-game HUD outside the Gameplay scene', () => {
    /*
     * This asserted on the text "coins", which T195 removed — so it would now
     * pass against a blank document, proving nothing. It asserts on the money
     * readout instead, and its counterpart below drives the *same* balance
     * through the *same* component in gameplay, where it must appear. A
     * negative alone is satisfied by anything.
     */
    act(() => {
      GameEvents.emit('scene:ready', { key: 'MainMenu' });
      GameEvents.emit('currency:earned', { amount: 5, total: 5 });
    });
    const outside = render(<Hud />);

    expect(screen.queryByText('$5')).not.toBeInTheDocument();
    expect(outside.container.querySelector('.hud')).toBeNull();
    outside.unmount();

    enterGameplay();
    act(() => {
      GameEvents.emit('currency:earned', { amount: 0, total: 5 });
    });
    render(<Hud />);
    expect(screen.getByText('$5')).toBeInTheDocument();
  });
});
