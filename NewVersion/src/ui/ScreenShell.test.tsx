/**
 * The shell and the bar it carries — that the right art reaches the right
 * screen, and that the bar knows where it is.
 *
 * The frame *rules* are driven in `game/ui/navTabs.test.ts` against the AS3.
 * What these cover is the wiring those rules hang off: which clip each tab
 * draws, which one marks itself, and whether a screen reader can tell one
 * button from another when every label is a picture.
 */
import { readFileSync } from 'node:fs';

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';

import { ScreenShell } from './ScreenShell';
import { BottomNav } from './BottomNav';
import { GameEvents } from '../game/events/GameEvents';
import { useGameStore } from '../state/gameStore';

afterEach(() => {
  GameEvents.removeAllListeners();
  useGameStore.setState({ shopAffordable: false });
});

describe('ScreenShell', () => {
  it('names the screen through its title art', () => {
    render(
      <ScreenShell title="Upgrades" titleClip="TitleUpgrades" nav="Upgrades">
        <p>content</p>
      </ScreenShell>,
    );
    // The letters are paths, so this name exists only because the art is
    // labelled — without it the heading is unreachable text.
    expect(screen.getByRole('img', { name: 'Upgrades' })).toBeInTheDocument();
  });

  it('draws the shield beside the title', () => {
    const { container } = render(
      <ScreenShell title="Options" titleClip="TitleOptions" nav="Options">
        <p>content</p>
      </ScreenShell>,
    );
    expect(container.querySelector('[data-clip="IconShield"]')).toBeInTheDocument();
  });

  it('renders its children in the body', () => {
    render(
      <ScreenShell title="Options" titleClip="TitleOptions" nav="Options">
        <p>the content</p>
      </ScreenShell>,
    );
    expect(screen.getByText('the content')).toBeInTheDocument();
  });

  /**
   * The bar is conditional, and the pair is the assertion: a shell that always
   * drew it would pass the first of these, and one that never did would pass
   * the second.
   */
  it('carries the navigation bar, or omits it for a screen outside the bar', () => {
    const { rerender } = render(
      <ScreenShell title="Options" titleClip="TitleOptions" nav="Options">
        <p>content</p>
      </ScreenShell>,
    );
    expect(screen.getByRole('navigation', { name: 'Screens' })).toBeInTheDocument();

    rerender(
      <ScreenShell title="Options" titleClip="TitleOptions" nav={null}>
        <p>content</p>
      </ScreenShell>,
    );
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});

/**
 * The crest, which is the way home — T207.
 *
 * It was `IconShield` drawn at the bar's left and nothing else. T204 had
 * removed the dock's Main menu button, so this is now the only one-click route
 * to the title screen, which makes it worth pinning properly.
 */
describe('the shield goes home', () => {
  it('is a button, and asks to go to the main menu', () => {
    const seen: string[] = [];
    GameEvents.subscribe('ui:goto', ({ key }) => seen.push(key));

    render(
      <ScreenShell title="Options" titleClip="TitleOptions" nav="Options">
        <p>body</p>
      </ScreenShell>,
    );

    const crest = screen.getByRole('button', { name: 'Main menu' });
    crest.click();
    expect(seen).toEqual(['MainMenu']);
  });

  it('is absent when the shell is asked for no shield', () => {
    /*
     * The counterpart, on the same component: `shield={false}` is the main
     * menu's own setting, and a home button on the home screen would be a
     * button that does nothing. Without this, "there is a crest" would pass
     * even if the prop had stopped being read.
     */
    render(
      <ScreenShell title="Options" titleClip="TitleOptions" nav={null} shield={false}>
        <p>body</p>
      </ScreenShell>,
    );

    expect(screen.queryByRole('button', { name: 'Main menu' })).not.toBeInTheDocument();
  });

  it('holds the touch floor and says it is clickable', () => {
    const CSS = readFileSync('src/styles/global.css', 'utf8');
    const code = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
    const at = code.indexOf('.screen-shell__shield-button {');
    expect(at, 'the shield button has no rule').toBeGreaterThan(-1);
    const rule = code.slice(at, code.indexOf('}', at));

    expect(rule).toMatch(/cursor:\s*pointer/);
    expect(rule).toMatch(/min-height:\s*44px/);
    // Fluid, so it grows with the bar rather than shrinking on a large screen.
    expect(rule).toMatch(/clamp\([^)]*vh[^)]*\)/);
  });
});

describe('BottomNav', () => {
  it('gives every button a name, since all of them are pictures', () => {
    render(<BottomNav current="LevelSelect" />);
    for (const name of ['Upgrades', 'Level select', 'Achievements', 'Enemies', 'Options']) {
      expect(screen.getByRole('button', { name }), name).toBeInTheDocument();
    }

    // `Main menu` was in this list until T204 removed it from the bar. Asserted
    // absent rather than just dropped, so the list cannot silently regrow.
    expect(screen.queryByRole('button', { name: 'Main menu' })).not.toBeInTheDocument();
  });

  it('marks exactly one tab as current', () => {
    render(<BottomNav current="Enemies" />);
    const marked = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-current') === 'page');
    expect(marked).toHaveLength(1);
    expect(marked[0]).toHaveAccessibleName('Enemies');
  });

  it('marks none when the bar is shown outside its own screens', () => {
    render(<BottomNav current={null} />);
    const marked = screen
      .getAllByRole('button')
      .filter((b) => b.getAttribute('aria-current') === 'page');
    expect(marked).toHaveLength(0);
  });

  it('navigates on click, to the scene the destination names', () => {
    const seen: string[] = [];
    GameEvents.subscribe('ui:goto', ({ key }) => seen.push(key));

    render(<BottomNav current="LevelSelect" />);
    screen.getByRole('button', { name: 'Upgrades' }).click();
    screen.getByRole('button', { name: 'Enemies' }).click();
    screen.getByRole('button', { name: 'Options' }).click();

    /*
     * `Enemies` opens `Bestiary`: the player-facing screen keeps the AS3's
     * title and the port's own scene name, and this is where the two meet.
     *
     * The third click was `Main menu` until T204 took that button out of the
     * bar. `Options` replaces it here deliberately — it is now the bar's route
     * *towards* the title screen, since the options panel carries Exit to Menu.
     */
    expect(seen).toEqual(['Upgrades', 'Bestiary', 'Options']);
  });

  it('does not navigate from the tab you are already on', () => {
    const go = vi.fn();
    GameEvents.subscribe('ui:goto', go);

    render(<BottomNav current="Options" />);
    screen.getByRole('button', { name: 'Options' }).click();

    expect(go).not.toHaveBeenCalled();
  });

  /**
   * The clickable tabs stack three frames so hover and press are CSS; the
   * current tab draws one. That difference is the whole reason the row needs
   * no pointer state, so it is worth pinning rather than leaving implicit.
   */
  it('stacks hover and pressed faces on a clickable tab, and one face on the current one', () => {
    const { container } = render(<BottomNav current="Upgrades" />);

    const upgrades = container.querySelector('button[aria-current="page"]');
    expect(upgrades?.querySelectorAll('.chrome-art')).toHaveLength(1);

    const levelSelect = screen.getByRole('button', { name: 'Level select' });
    expect(levelSelect.querySelectorAll('.chrome-art')).toHaveLength(3);
  });

  it('draws the Upgrades tab at its you-are-here frame on the shop', () => {
    const { container } = render(<BottomNav current="Upgrades" />);
    const art = container.querySelector('button[aria-current="page"] .chrome-art');
    // `ButtonUpgrades.as:88` — frame 7, and not shifted by affordability.
    expect(art?.getAttribute('data-frame')).toBe('7');
  });

  /**
   * The affordance hint comes from the store now, not a prop — every screen
   * that shows the bar publishes it as it opens, so the bar asks rather than
   * being told and no screen can forget to forward it.
   *
   * Both states, on the same query: a bar wired to a constant passes either
   * one alone.
   */
  it('shifts the Upgrades tab to its affordable frames from another screen', () => {
    const firstTab = (container: HTMLElement): string | null | undefined =>
      container
        .querySelector('.bottom-nav__tabs button:first-child .chrome-art')
        ?.getAttribute('data-frame');

    useGameStore.setState({ shopAffordable: false });
    const { container: plain } = render(<BottomNav current="LevelSelect" />);
    expect(firstTab(plain)).toBe('1');

    useGameStore.setState({ shopAffordable: true });
    const { container: flush } = render(<BottomNav current="LevelSelect" />);
    // `:78` — `gotoAndStop(1 + extraFrames)` with `extraFrames = 3`.
    expect(firstTab(flush)).toBe('4');
  });
});
