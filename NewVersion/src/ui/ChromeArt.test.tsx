/**
 * `ChromeArt` — that a clip reaches the DOM as positioned layers.
 *
 * The geometry itself is pinned in `game/ui/chromeArt.test.ts` against the SWF.
 * What this covers is the half that table cannot: the conversion to
 * percentages, which frame is drawn, and whether a screen reader can name the
 * art — the three things that would leave the numbers correct and the screen
 * wrong.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ChromeArt } from './ChromeArt';
import { CHROME_CLIPS } from '../game/ui/chromeArt';

describe('ChromeArt', () => {
  it('draws one image per layer of the requested frame', () => {
    const { container } = render(<ChromeArt clip="ButtonUpgrades" frame={1} />);
    const layers = container.querySelectorAll('img');
    expect(layers).toHaveLength(CHROME_CLIPS.ButtonUpgrades.frames[0].layers.length);
  });

  it('positions each layer as a percentage of the clip box', () => {
    // `ButtonUpgrades`: a 200x40 box with its label at (32.1, 10), so the
    // label lands at 16.05% across and 25% down. Computed here from the AS3
    // geometry rather than read back out of the component.
    const { container } = render(<ChromeArt clip="ButtonUpgrades" frame={1} />);
    const label = container.querySelectorAll('img')[1] as HTMLElement;

    expect(label.style.left).toBe(`${(32.1 / 200) * 100}%`);
    expect(label.style.top).toBe(`${(10 / 40) * 100}%`);
    expect(label.style.width).toBe(`${(135.8 / 200) * 100}%`);
  });

  it('carries the clip aspect ratio, so a caller only sets a width', () => {
    const { container } = render(<ChromeArt clip="TitleUpgrades" />);
    const box = container.querySelector('.chrome-art') as HTMLElement;
    expect(box.style.aspectRatio).toBe('310.65 / 45.7');
  });

  /**
   * The frame is the state. `ButtonUpgrades` frame 7 is the active tab, and it
   * swaps *two* layers — the plate and the label — against frame 1.
   *
   * Driven as a pair on the same clip: asserting frame 7 alone would pass on a
   * component that ignored the prop and always drew frame 1, if frame 1
   * happened to contain the shape looked for.
   */
  it('draws the frame it is given', () => {
    const { container: resting } = render(<ChromeArt clip="ButtonUpgrades" frame={1} />);
    const { container: active } = render(<ChromeArt clip="ButtonUpgrades" frame={7} />);

    const shapes = (c: HTMLElement): string[] =>
      [...c.querySelectorAll('img')].map((img) => img.getAttribute('src') ?? '');

    expect(shapes(resting)).not.toEqual(shapes(active));
    expect(resting.querySelector('.chrome-art')?.getAttribute('data-frame')).toBe('1');
    expect(active.querySelector('.chrome-art')?.getAttribute('data-frame')).toBe('7');
  });

  it('clamps an out-of-range frame to the resting state rather than blanking', () => {
    // A blank is indistinguishable from "the component failed", which is the
    // reading that costs the most time. Wrong should look wrong.
    const { container } = render(<ChromeArt clip="TitleUpgrades" frame={99} />);
    expect(container.querySelectorAll('img')).toHaveLength(1);
    expect(container.querySelector('.chrome-art')?.getAttribute('data-frame')).toBe('1');
  });

  /**
   * Naming, both ways on the same component.
   *
   * The letters are paths, so an unlabelled title is unreachable text. A
   * labelled one must be an image with a name; an unlabelled one must be
   * hidden, not merely unnamed, or a screen reader announces an anonymous
   * graphic inside every button.
   */
  it('is a named image when given a label', () => {
    render(<ChromeArt clip="TitleUpgrades" label="Upgrades" />);
    expect(screen.getByRole('img', { name: 'Upgrades' })).toBeInTheDocument();
  });

  it('is hidden when not', () => {
    const { container } = render(<ChromeArt clip="TitleUpgrades" />);
    const box = container.querySelector('.chrome-art');
    expect(box?.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
