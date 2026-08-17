/**
 * The shell and the bar it carries — that the right art reaches the right
 * screen, and that the bar knows where it is.
 *
 * The frame *rules* are driven in `game/ui/navTabs.test.ts` against the AS3.
 * What these cover is the wiring those rules hang off: which clip each tab
 * draws, which one marks itself, and whether a screen reader can tell one
 * button from another when every label is a picture.
 */
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

describe('BottomNav', () => {
  it('gives every button a name, since all of them are pictures', () => {
    render(<BottomNav current="LevelSelect" />);
    for (const name of ['Upgrades', 'Level select', 'Achievements', 'Enemies', 'Options', 'Main menu']) {
      expect(screen.getByRole('button', { name }), name).toBeInTheDocument();
    }
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
    screen.getByRole('button', { name: 'Main menu' }).click();

    // `Enemies` opens `Bestiary`: the player-facing screen keeps the AS3's
    // title and the port's own scene name, and this is where the two meet.
    expect(seen).toEqual(['Upgrades', 'Bestiary', 'MainMenu']);
  });

  it('does not navigate from the tab you are already on', () => {
    const go = vi.fn();
    GameEvents.subscribe('ui:goto', go);

    render(<BottomNav current="Options" />);
    screen.getByRole('button', { name: 'Options' }).click();

    expect(go).not.toHaveBeenCalled();
  });

  /*
   * ── The bar is type on pills since T183, not the extracted art ───────────
   *
   * The three tests below used to read `data-frame` off `<ChromeArt>`. There
   * is no art in this bar now (`A41`), so they read the states the frames
   * *decide* instead — which is what they were always about, since a frame
   * number nobody can see is not a behaviour.
   */
  it('lights the current tab and leaves the rest as ordinary pills', () => {
    render(<BottomNav current="Upgrades" />);

    const upgrades = screen.getByRole('button', { name: 'Upgrades' });
    expect(upgrades.className).toContain('nav-pill--on');
    expect(upgrades).toHaveAttribute('aria-current', 'page');

    // The counterpart on the same render: every other tab must *not* be lit,
    // or "the current one glows" is satisfied by a bar where all six do.
    const lit = screen
      .getAllByRole('button')
      .filter((b) => b.className.includes('nav-pill--on'));
    expect(lit).toHaveLength(1);

    const levelSelect = screen.getByRole('button', { name: 'Level select' });
    expect(levelSelect).not.toHaveAttribute('aria-current');
  });

  /*
   * ── T184: six styles, and the six-ness is the assertion ─────────────────
   *
   * The bar is a live comparison — each button wears a different aesthetic so
   * they can be judged in place (`A42`). This is **temporary**: one style
   * survives the next pass and five CSS blocks get deleted.
   *
   * Pinned because the failure mode is silent. Two buttons sharing a style key
   * still renders six buttons that all work, and the comparison is simply
   * missing one option — nothing throws, nothing looks broken, and the
   * screenshot the choice gets made from is wrong.
   *
   * **Delete this test when the winner is chosen**, along with the styles that
   * lost. It describes an experiment, not a requirement.
   */
  it('gives all six tabs a different style, since that is the point of T184', () => {
    const { container } = render(<BottomNav current="LevelSelect" />);

    const looks = [...container.querySelectorAll('.nav-pill')].map(
      (pill) =>
        [...pill.classList].find((name) => name.startsWith('nav-style--')) ?? '(none)',
    );

    expect(looks).toHaveLength(6);
    expect(new Set(looks).size, `duplicate or missing style: ${looks.join(', ')}`).toBe(6);
    expect(looks).not.toContain('(none)');
  });

  it('never lights Main menu, because ButtonMenu has no fourth frame', () => {
    // `MENU_FRAMES` is three frames — Menu leads *out* of the bar, so there is
    // no "you are here" for it to be in. `NavButton` reads that off the frame
    // data rather than being told, so this holds even from the main menu.
    render(<BottomNav current={null} />);
    const menu = screen.getByRole('button', { name: 'Main menu' });
    expect(menu.className).not.toContain('nav-pill--on');
    expect(menu).not.toHaveAttribute('aria-current');
  });

  /**
   * The affordance hint comes from the store, not a prop — every screen that
   * shows the bar publishes it as it opens, so the bar asks rather than being
   * told and no screen can forget to forward it.
   *
   * Both states on the same query: a bar wired to a constant passes either one
   * alone.
   */
  it('badges the Upgrades tab when the shop has something affordable', () => {
    const dot = (container: HTMLElement): Element | null =>
      container.querySelector('.nav-pill--flush .nav-pill__dot');

    useGameStore.setState({ shopAffordable: false });
    const { container: plain } = render(<BottomNav current="LevelSelect" />);
    expect(dot(plain)).toBeNull();

    useGameStore.setState({ shopAffordable: true });
    const { container: flush } = render(<BottomNav current="LevelSelect" />);
    expect(dot(flush)).not.toBeNull();
    // On the Upgrades tab and nowhere else — the shift is a property of
    // `ButtonUpgrades`' 7 frames, not of the bar.
    expect(
      flush.querySelector('.nav-pill--flush')?.getAttribute('aria-label'),
    ).toBe('Upgrades');
  });

  it('drops the hint on the shop itself, as ButtonUpgrades.as:88 does', () => {
    /*
     * Frame 7 is "you are here" and is **not** shifted by `extraFrames`, while
     * 1/2/3 shift to 4/5/6 — the hint is pointless on the screen that would
     * spend the money. This was a real defect on the first pass of T183: the
     * badge was passed independently of `current`, so the shop's own tab wore
     * it. Driven against the case above, which is the same store state on a
     * different screen.
     */
    useGameStore.setState({ shopAffordable: true });
    const { container } = render(<BottomNav current="Upgrades" />);
    expect(container.querySelector('.nav-pill__dot')).toBeNull();
  });
});
