/**
 * The bestiary screen.
 *
 * The assertions that matter are about *withholding*: an unmet enemy must not
 * reveal its name or its description, and the component must not be able to
 * find them on its own. The last one is the real guarantee — a screen that
 * imports `BESTIARY` could render a locked entry correctly today and leak it
 * after any future edit.
 */
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BestiaryScreen } from './BestiaryScreen';
import { GameEvents } from '../../game/events/GameEvents';
import { attachStoreBridge, detachStoreBridge } from '../../state/bridge';
import { useGameStore } from '../../state/gameStore';

function enterBestiary(): void {
  act(() => {
    GameEvents.emit('scene:ready', { key: 'Bestiary' });
  });
}

/**
 * Three rows covering the three states the screen has to tell apart: met with
 * resistances, met with none (the frame-1 placeholder), and unmet (no badges
 * at all). The middle one is the case an `entry.strengths.length > 0` guard
 * would get wrong if the listing ever stopped sending the placeholder.
 */
function publishSample(): void {
  act(() => {
    GameEvents.emit('bestiary:listed', {
      entries: [
        {
          id: 'Basic',
          displayName: 'Basic',
          description: 'The most boring enemy.',
          strengths: [{ frame: 1, damageType: null, label: 'None', percent: '' }],
          weaknesses: [{ frame: 1, damageType: null, label: 'None', percent: '' }],
          // Frame 1 of `ButtonEnemyBasic` — [plate, overlay, its own glyph].
          tile: [734, 735, 777],
          stats: { money: 10, health: 12, damage: 5, speed: 45 },
          known: true,
        },
        {
          id: 'Fast',
          displayName: 'Fast',
          description: 'Moves quickly.',
          strengths: [{ frame: 2, damageType: 'Explosions', label: 'Explosions', percent: '25%' }],
          weaknesses: [{ frame: 16, damageType: 'Food', label: 'Food', percent: '75%' }],
          tile: [734, 735, 749],
          // A ranged speed, so the "40-160" form is exercised too.
          stats: { money: 20, health: 8, damage: 6, speed: 60, speedMax: 240 },
          known: true,
        },
        {
          id: 'Ghost',
          displayName: 'Ghost',
          strengths: [],
          weaknesses: [],
          // The locked frame: the "?" glyph 739, never Ghost's own 751.
          tile: [734, 735, 739],
          known: false,
        },
      ],
      knownCount: 2,
      total: 3,
      view: { difficulty: 'Easy', tier: '1' },
    });
  });
}

describe('the bestiary screen', () => {
  beforeEach(() => {
    attachStoreBridge();
    useGameStore.setState({ activeScene: 'Boot', bestiary: null });
  });
  afterEach(() => {
    detachStoreBridge();
  });

  it('renders nothing while another scene is active', () => {
    publishSample();
    const { container } = render(<BestiaryScreen />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows met enemies with their descriptions', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('The most boring enemy.')).toBeInTheDocument();
  });

  /**
   * The picture, and the one thing it must never be. `739` is the locked "?"
   * glyph; `751` is Ghost's own art, which is in the table but must not reach
   * the browser for an enemy the player has not met.
   *
   * Asserted on the rendered `src`, not on the prop: the whole point of this
   * screen's no-import rule is what ends up in the DOM.
   */
  it('draws a met enemy`s tile and withholds an unmet one`s', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    const sources = Array.from(document.querySelectorAll('.enemy-tile__layer'))
      .map((img) => img.getAttribute('src') ?? '');

    // Matched on the filename, not as a substring: `includes('739')` would
    // also accept `1739.svg`, and there are 1015 shapes to collide with.
    const draws = (shape: number): boolean =>
      sources.some((src) => src.endsWith(`/${shape}.svg`) || src.endsWith(`${shape}.svg`));

    expect(draws(777), 'Basic glyph').toBe(true);
    expect(draws(739), 'locked glyph').toBe(true);
    // Ghost is unmet in the sample, so its own glyph is absent from the DOM.
    expect(draws(751), 'Ghost glyph').toBe(false);
  });

  it('names the tile for a screen reader without naming a locked enemy', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    // The art carries no text, so the label is the only name it has — and for
    // a locked row it must not become "Ghost".
    expect(screen.getByLabelText('Basic')).toBeInTheDocument();
    expect(screen.getByLabelText('Not yet encountered')).toBeInTheDocument();
    expect(screen.queryByLabelText('Ghost')).not.toBeInTheDocument();
  });

  it('shows the stat block for a met enemy and none for an unmet one', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    expect(screen.getByText('12 HP')).toBeInTheDocument();
    expect(screen.getByText('10$')).toBeInTheDocument();
    expect(screen.getByText('45 PX/Sec')).toBeInTheDocument();

    // Ghost is unmet, so there are two stat blocks for three rows. Counting is
    // the assertion: "no stats leak" is not something a text query can show.
    expect(document.querySelectorAll('.bestiary-stats')).toHaveLength(2);
  });

  it('prints a speed range only where the listing sends one', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    // Fast carries `speedMax`; Basic does not. Both rendered from the same
    // component, so this is what separates "handles a range" from "always
    // prints one".
    expect(screen.getByText('60-240 PX/Sec')).toBeInTheDocument();
    expect(screen.getByText('45 PX/Sec')).toBeInTheDocument();
  });

  it('asks the scene to change the view rather than recomputing', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    const seen: unknown[] = [];
    const off = GameEvents.subscribe('ui:bestiary-view', (view) => seen.push(view));
    act(() => {
      screen.getByRole('button', { name: 'Hard' }).click();
    });
    off();

    // The tier rides along unchanged — the screen sends a whole view, not a
    // patch, so a stale half cannot reach the scene.
    expect(seen).toEqual([{ difficulty: 'Hard', tier: '1' }]);
  });

  it('marks the selected difficulty and tier as pressed', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    // Rendered from the listing's own `view`, so the buttons cannot show a
    // selection the numbers beside them were not computed at.
    expect(screen.getByRole('button', { name: 'Easy' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Hard' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Boss' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('hides the name and description of an unmet enemy', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    expect(screen.queryByText('Ghost')).not.toBeInTheDocument();
    expect(screen.getByText('???')).toBeInTheDocument();
    expect(screen.getByText('Not yet encountered.')).toBeInTheDocument();
  });

  it('still lists the unmet entry, so the gaps are visible', () => {
    // Filtering them out would make the list grow silently and lose the sense
    // of an incomplete collection, which is the whole point of a bestiary.
    enterBestiary();
    publishSample();
    const { container } = render(<BestiaryScreen />);

    expect(container.querySelectorAll('.bestiary-row')).toHaveLength(3);
    expect(container.querySelectorAll('.bestiary-row--locked')).toHaveLength(1);
  });

  it('shows the count as met over total', () => {
    enterBestiary();
    publishSample();
    render(<BestiaryScreen />);

    expect(screen.getByText('2 / 3')).toBeInTheDocument();
  });

  it('says nothing rather than 0 / 0 before the scene publishes', () => {
    enterBestiary();
    render(<BestiaryScreen />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('cannot reach the bestiary data on its own', () => {
    // The guarantee behind every assertion above. If this component imported
    // BESTIARY it could render a locked row from its own lookup, and the
    // withholding would be one careless edit from failing silently.
    const source = readFileSync('src/ui/screens/BestiaryScreen.tsx', 'utf8');

    // Extended in T143: a picture and a stat block are as leakable as a
    // description, so the art table and the stats formula join the list. Each
    // would let this component answer "what is enemy X" for an X the player has
    // never met.
    for (const forbidden of ['bestiaryData', 'enemyKnowledge', 'bestiaryArt', 'bestiaryStats']) {
      expect(source, forbidden).not.toMatch(new RegExp(`from '[^']*/${forbidden}'`));
    }

    // The counterpart, and the reason the list above is not just decoration:
    // the screen *does* import the leaf that carries the view shapes and the
    // tier labels, and that module holds no enemy data to leak. Without this,
    // the loop would pass just as well on a file that imported nothing at all.
    expect(source).toMatch(/from '[^']*\/bestiaryView'/);

    // And the instrument check, because a regex that matched nothing would
    // make every line above pass. Driven on a fabricated import rather than by
    // editing the real component: the dev server watches that file, and this
    // repo has already lost two hours to a probe that truncated a watched
    // module. A wrong pattern fails here instead.
    const pattern = /from '[^']*\/bestiaryStats'/;
    expect(pattern.test("import { bestiaryStats } from '../../game/enemies/bestiaryStats';")).toBe(
      true,
    );
    expect(pattern.test("import { BESTIARY_TIERS } from '../../game/enemies/bestiaryView';")).toBe(
      false,
    );
  });
});
