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
describe('the HUD layout', () => {
  it('puts health top-left, controls top-right and weapons on the bottom', () => {
    enterGameplay();
    const { container } = render(<Hud />);

    expect(container.querySelector('.hud__corner--tl .hud-health')).not.toBeNull();
    expect(container.querySelector('.hud__corner--tr .hud__controls')).not.toBeNull();
    expect(container.querySelector('.hud__corner--bottom .hud-reload')).not.toBeNull();

    // And the counterpart: nothing sits in the middle row of the grid, which
    // is the whole point of the change.
    expect(container.querySelectorAll('.hud > *').length).toBeLessThanOrEqual(7);
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

  it('scales the surface off the viewport height, with no fixed px', () => {
    // The arena's useful scale is the window's height, and the HUD's parent is
    // the full overlay rather than a sized container — so `vh`, not `cqh`,
    // which would resolve against the wrong box or none at all.
    expect(block('.hud-health')).toMatch(/clamp\([^)]*vh[^)]*\)/);
    expect(block('.hud-stat')).toMatch(/clamp\([^)]*vh[^)]*\)/);
    expect(block('.gloss-pill.hud-pause')).toMatch(/clamp\([^)]*vh[^)]*\)/);
  });
});

describe('Hud', () => {
  it('shows the currency counter updating from a Phaser event', () => {
    enterGameplay();
    render(<Hud />);

    expect(screen.getByText('0')).toBeInTheDocument();

    act(() => {
      GameEvents.emit('currency:earned', { amount: 5, total: 5 });
    });
    expect(screen.getByText('5')).toBeInTheDocument();

    act(() => {
      GameEvents.emit('currency:earned', { amount: 5, total: 10 });
    });
    expect(screen.getByText('10')).toBeInTheDocument();
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
    expect(screen.getByText('500')).toBeInTheDocument();
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('drops back to the banked balance when a level is abandoned', () => {
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('currency:earned', { amount: 0, total: 200 });
      GameEvents.emit('currency:earned', { amount: 90, total: 290 });
    });
    expect(screen.getByText('290')).toBeInTheDocument();

    // Shutdown without finishing restores the figure actually held.
    act(() => {
      GameEvents.emit('currency:earned', { amount: 0, total: 200 });
    });
    expect(screen.getByText('200')).toBeInTheDocument();
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

  it('shows the wave counter and remaining enemies', () => {
    enterGameplay();
    render(<Hud />);

    act(() => {
      GameEvents.emit('wave:changed', {
        wave: 3,
        enemiesRemaining: 7,
        mode: 'Normal',
        flagsRemaining: 0,
      });
    });

    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('7 left')).toBeInTheDocument();
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
        enemiesRemaining: 9,
        mode: 'Normal',
        flagsRemaining: 0,
      });
      GameEvents.emit('currency:earned', { amount: 5, total: 5 });
    });

    expect(screen.getByText('9 left')).toBeInTheDocument();
  });

  it('shows a flag counter only on Flag levels', () => {
    enterGameplay();
    const { rerender } = render(<Hud />);

    act(() => {
      GameEvents.emit('wave:changed', {
        wave: 3,
        enemiesRemaining: 4,
        mode: 'Normal',
        flagsRemaining: 0,
      });
    });
    rerender(<Hud />);
    expect(screen.queryByText('flags left')).not.toBeInTheDocument();

    act(() => {
      GameEvents.emit('wave:changed', {
        wave: 3,
        enemiesRemaining: 4,
        mode: 'Flag',
        flagsRemaining: 7,
      });
    });
    rerender(<Hud />);

    expect(screen.getByText('flags left')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
    // Flag levels spawn forever, so the enemy figure is what is on screen.
    expect(screen.getByText('4 on screen')).toBeInTheDocument();
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
    act(() => {
      GameEvents.emit('scene:ready', { key: 'MainMenu' });
      GameEvents.emit('currency:earned', { amount: 5, total: 5 });
    });
    render(<Hud />);

    expect(screen.queryByText('coins')).not.toBeInTheDocument();
  });
});
