/**
 * The options screen.
 *
 * Two things are being held: that the controls emit rather than deciding, and
 * that the two settings the maintainer asked to omit stay omitted. The second
 * is easy to lose by accident — a future pass adding "everything the AS3 has"
 * would put quality and difficulty back without anyone objecting.
 *
 * **jsdom computes no layout**, so nothing here proves the two cards fit. That
 * was measured in a browser at eight viewports and the numbers are in the
 * commit; what these hold is the markup contract and the CSS mechanisms the
 * measurement depends on.
 */
import { readFileSync } from 'node:fs';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { OptionsScreen } from './OptionsScreen';
import { GameEvents } from '../../game/events/GameEvents';
import { attachStoreBridge, detachStoreBridge } from '../../state/bridge';
import { useGameStore } from '../../state/gameStore';
import { DEFAULT_GAMEPLAY_OPTIONS } from '../../game/options/gameplayOptions';
import { DEFAULT_AUDIO_OPTIONS } from '../../game/audio/audioOptions';

const CSS = readFileSync('src/styles/global.css', 'utf8');

/*
 * Comments stripped before any selector scan — a prose-as-code match has been
 * caught three times in this repo, and the rules below are documented in prose
 * that names the very properties these assertions look for.
 */
const cssCode = CSS.replace(/\/\*[\s\S]*?\*\//g, '');

function block(selector: string): string {
  const at = cssCode.indexOf(`${selector} {`);
  expect(at, `${selector} is not in the stylesheet`).toBeGreaterThan(-1);
  return cssCode.slice(at, cssCode.indexOf('}', at));
}

function mount(): void {
  render(<OptionsScreen />);
  act(() => {
    GameEvents.emit('scene:ready', { key: 'Options' });
    GameEvents.emit('options:changed', { ...DEFAULT_GAMEPLAY_OPTIONS });
    GameEvents.emit('audio:options', { ...DEFAULT_AUDIO_OPTIONS });
  });
}

beforeEach(() => {
  attachStoreBridge();
});

afterEach(() => {
  detachStoreBridge();
  useGameStore.setState({ activeScene: null });
});

describe('the controls', () => {
  it('shows the five gameplay preferences and the two audio channels', () => {
    mount();
    const switches = screen.getAllByRole('switch');
    // Read the label element rather than slicing `textContent` — the hint
    // shares the button, so a text split depends on punctuation that is not
    // part of the contract.
    expect(switches.map((el) => el.querySelector('.options__label')?.textContent)).toEqual([
      'Crosshair',
      'Auto-pause',
      'Auto-select level',
      'Achievement pop-ups',
      'Tutorial',
      'Sound effects',
      'Music',
    ]);
  });

  /*
   * ── The two omissions, asked for by name ─────────────────────────────────
   *
   * Quality has never been here — `stage.quality` is a Flash rasterisation
   * setting with no WebGL equivalent, recorded as not applicable in
   * `gameplayOptions.ts`. Difficulty *is* in the AS3's options screen and is
   * deliberately only on level select in this port, where it sits beside the
   * medals it decides and the progress slot it writes to.
   *
   * Pinned because the failure is a *re-addition* by someone completing the
   * AS3's list, which nothing else would object to.
   */
  it('offers no graphics quality control', () => {
    mount();
    expect(screen.queryByText(/quality/i)).not.toBeInTheDocument();
    expect(document.querySelectorAll('.options__quality')).toHaveLength(0);
  });

  it('offers no difficulty control — that lives on level select', () => {
    mount();
    for (const name of ['Easy', 'Medium', 'Hard']) {
      expect(screen.queryByRole('button', { name }), name).not.toBeInTheDocument();
    }
    // The class the level-select pills use, so a copy-paste of that control
    // would fail here rather than quietly giving the value two homes.
    expect(document.querySelectorAll('.difficulty__button')).toHaveLength(0);
  });

  it('asks the scene to change a preference rather than deciding', () => {
    mount();
    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:set-option', (change) => seen.push(change));
    act(() => {
      screen.getByRole('switch', { name: /Crosshair/ }).click();
    });
    off();

    // A partial naming only what changed — a whole-object emit would rewrite
    // the other four with values read before someone else changed them.
    expect(seen).toEqual([{ crosshair: !DEFAULT_GAMEPLAY_OPTIONS.crosshair }]);
  });

  it('routes the audio switches through the same bus as everything else', () => {
    mount();
    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:set-audio', (change) => seen.push(change));
    act(() => {
      screen.getByRole('switch', { name: /Music/ }).click();
    });
    off();
    expect(seen).toEqual([{ musicOn: !DEFAULT_AUDIO_OPTIONS.musicOn }]);
  });

  it('renders the switch state as aria-checked, not only as a class', () => {
    // The class is what the knob slides on; `aria-checked` is what a screen
    // reader has. Both, because a styled state with no semantic is a control
    // only a sighted mouse user can read.
    mount();
    const crosshair = screen.getByRole('switch', { name: /Crosshair/ });
    expect(crosshair).toHaveAttribute('aria-checked', String(DEFAULT_GAMEPLAY_OPTIONS.crosshair));
    const music = screen.getByRole('switch', { name: /Music/ });
    expect(music).toHaveAttribute('aria-checked', 'true');
    expect(music.className).toContain('options__switch--on');
  });
});

describe('reset', () => {
  /*
   * `ButtonResetOptions` → `SaveManager.resetOptions()`, which clears
   * `optionsSave` and reloads defaults. **Preferences, not progress** —
   * `gameSave` is untouched, and deleting a slot is a different control on the
   * save picker. `optionsService.test.ts` drives that separation.
   */
  it('does not fire on the first click — it asks first', () => {
    mount();
    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:reset-options', () => seen.push('reset'));

    act(() => {
      screen.getByRole('button', { name: /reset options/i }).click();
    });
    // Asked, not done. The only irreversible control on the screen, so it gets
    // the same two-step the AS3's own delete control has.
    expect(seen).toEqual([]);
    expect(screen.getByRole('button', { name: /yes, reset/i })).toBeInTheDocument();

    act(() => {
      screen.getByRole('button', { name: /yes, reset/i }).click();
    });
    off();
    expect(seen).toEqual(['reset']);
  });

  it('can be backed out of, and leaves nothing emitted', () => {
    // The counterpart: a confirm step that cannot be cancelled is a delay, not
    // a safeguard.
    mount();
    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:reset-options', () => seen.push('reset'));

    act(() => {
      screen.getByRole('button', { name: /reset options/i }).click();
    });
    act(() => {
      screen.getByRole('button', { name: /cancel/i }).click();
    });
    off();

    expect(seen).toEqual([]);
    expect(screen.getByRole('button', { name: /reset options/i })).toBeInTheDocument();
  });

  it('says what it will and will not touch', () => {
    // The wording is the safeguard as much as the second click is: "your
    // progress is not touched" is the fact a player needs before pressing a
    // red button, and it is true — see `optionsService.test.ts`.
    mount();
    act(() => {
      screen.getByRole('button', { name: /reset options/i }).click();
    });
    expect(screen.getByText(/progress is not touched/i)).toBeInTheDocument();
  });
});

describe('the layout mechanisms', () => {
  it('scales everything from one lever, with no fixed px inside a card', () => {
    // The same rule the shop's `--pane` and the menu's `--card-w` hold: a
    // stray `px` padding or font-size is how a panel ends up cramped at one
    // size and airy at another.
    const card = block('.options__card');
    expect(card).toMatch(/padding:\s*calc\(var\(--card\)/);
    expect(card).not.toMatch(/padding:\s*\d+px/);
    expect(block('.options__label')).toMatch(/font-size:\s*calc\(var\(--card\)/);
    /*
     * Both terms, and the `min()` that joins them. The height cap is the T179
     * defect's fix — a width-only lever gave a card 83px taller than its box
     * at 1024x480, clipped in silence by `overflow: hidden`. Asserting only
     * the `cqw` half would pass on exactly the version that was broken.
     */
    expect(block('.options')).toMatch(/--card:\s*min\(clamp\([^;]*cqw[^;]*\),\s*\d+cqh\)/);
    // `cqh`, not `vh`: the bar and the nav take a far larger fraction of a
    // short window than a tall one, which is the `A32` finding.
    expect(block('.options')).not.toMatch(/--card:[^;]*vh/);
  });

  it('centres the two cards rather than pinning them to the edges', () => {
    // `A40`'s correction, applied here from the start: two content-sized
    // columns spread across a 4K display leave a hole between them.
    expect(block('.options')).toMatch(/justify-content:\s*center/);
    expect(block('.options')).toMatch(/grid-template-columns:\s*repeat\(2,\s*var\(--card\)\)/);
  });

  it('makes the body the clipper, so a bad change cannot scroll', () => {
    expect(block('.screen--options .screen-shell__body')).toMatch(/overflow:\s*hidden/);
    expect(block('.screen--options .screen-shell__body')).toMatch(/container-type:\s*size/);
  });

  it('overrides the shared pill by specificity, not by position', () => {
    // Both are (0,1,0); a lone `.options__reset` would be settled by whichever
    // rule sits later in the file, which this project has shipped five bugs
    // from.
    expect(cssCode).toContain('.gloss-pill.options__reset {');
    expect(cssCode).not.toMatch(/\n\.options__reset \{/);
  });

  it('does not lift the switch on hover', () => {
    // The rule every grid, tile and dock in this game settled on.
    expect(block('.options__switch:hover')).not.toMatch(/transform/);
    expect(block('.options__switch:hover')).toMatch(/filter:\s*brightness/);
  });
});
