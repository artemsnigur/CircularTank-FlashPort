/**
 * The shop screen's tiles.
 *
 * The stat lines, the prices and the equip controls were already covered by the
 * modules behind them (`upgradePreview.test.ts`, `upgradeState.test.ts`,
 * `equipWiring.test.ts`). What had no coverage was the *picture*, which is what
 * T145 added — so these assert the layers reach the DOM and that the three
 * states draw different things.
 *
 * The frame choice itself is `upgradeTile.test.ts`; here the rows are handed a
 * tile directly, because the seam under test is "does the screen paint what the
 * scene sends", not "does the scene choose right". Both halves have to hold and
 * only one of them is a component.
 */
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { UpgradesScreen } from './UpgradesScreen';
import { GameEvents } from '../../game/events/GameEvents';
import type { GameEventMap } from '../../game/events/GameEvents';
import { attachStoreBridge, detachStoreBridge } from '../../state/bridge';
import { useGameStore } from '../../state/gameStore';

function enterShop(): void {
  act(() => {
    GameEvents.emit('scene:ready', { key: 'Upgrades' });
  });
}

/**
 * Typed from the event map rather than loosely, so a field added to a shop row
 * fails here instead of letting the fixture drift out of shape.
 */
type ShopRow = GameEventMap['upgrades:listed']['upgrades'][number];

function publish(rows: ShopRow[]): void {
  act(() => {
    GameEvents.emit('upgrades:listed', { money: 5000, upgrades: rows, withheld: 0 });
  });
}

const row = (over: Partial<ShopRow> = {}): ShopRow => ({
  id: 'Cannon',
  name: 'Cannon',
  category: 'primary',
  level: 3,
  maxLevel: 10,
  cost: 100,
  affordable: true,
  owned: true,
  slot: null,
  equipped: false,
  index: 0,
  previews: ['Damage: 7 HP  7.33', '', '', '', ''],
  tile: [596, 597],
  ...over,
});

const layerSources = (): string[] =>
  Array.from(document.querySelectorAll('.upgrade-icon__layer')).map(
    (img) => img.getAttribute('src') ?? '',
  );

/** Filename-anchored: `includes('597')` would also match `1597.svg`. */
const draws = (shape: number): boolean =>
  layerSources().some((src) => src.endsWith(`/${shape}.svg`) || src.endsWith(`${shape}.svg`));

describe('the shop screen', () => {
  beforeEach(() => {
    attachStoreBridge();
    useGameStore.setState({ activeScene: 'Boot', shop: null });
  });
  afterEach(() => {
    detachStoreBridge();
  });

  it('renders nothing while another scene is active', () => {
    publish([row()]);
    const { container } = render(<UpgradesScreen />);
    expect(container).toBeEmptyDOMElement();
  });

  it('draws every layer of a row`s tile', () => {
    enterShop();
    publish([row({ tile: [596, 597, 598] })]);
    render(<UpgradesScreen />);

    expect(layerSources()).toHaveLength(3);
    expect(draws(597), 'the Cannon glyph').toBe(true);
  });

  it('draws different art for owned, equipped and unowned', () => {
    // Three rows through the same component, so this fails if the screen ever
    // stops reading `tile` per row and starts deriving one picture for all.
    enterShop();
    publish([
      row({ id: 'Cannon', name: 'Cannon', tile: [596, 597] }),
      row({ id: 'MiniGun', name: 'Mini Gun', index: 1, slot: 1, tile: [601, 597, 602] }),
      row({ id: 'BigCannon', name: 'Big Cannon', index: 2, owned: false, tile: [596, 605] }),
    ]);
    render(<UpgradesScreen />);

    expect(draws(597)).toBe(true);
    // The unowned glyph, which is a different picture rather than a dimmed one.
    expect(draws(605)).toBe(true);
    expect(layerSources()).toHaveLength(7);
  });

  it('leaves a gap rather than a wrong picture when a row has no tile', () => {
    // `upgradeTileLayers` returns [] for an unknown id. The counterpart to the
    // test above: an empty array must render nothing at all, not fall back to
    // some other upgrade's art.
    enterShop();
    publish([row({ tile: [] })]);
    render(<UpgradesScreen />);

    expect(document.querySelectorAll('.upgrade-icon')).toHaveLength(0);
    // And the row itself is still there — the gap is the icon, not the row.
    expect(document.querySelectorAll('.shop-row')).toHaveLength(1);
  });

  it('does not announce the tile to a screen reader', () => {
    // The row already names the upgrade in text; labelling the picture too
    // would read the same fact twice. `EnemyTile` does the opposite, because
    // there the picture is the only distinguishing thing.
    enterShop();
    publish([row()]);
    render(<UpgradesScreen />);

    const icon = document.querySelector('.upgrade-icon');
    expect(icon?.getAttribute('aria-hidden')).toBe('true');
    expect(icon?.getAttribute('title')).toBe('Cannon');
  });
});

describe('the slot summary and the balance — T158', () => {
  beforeEach(() => {
    attachStoreBridge();
    enterShop();
  });

  afterEach(() => {
    detachStoreBridge();
    GameEvents.removeAllListeners();
    useGameStore.setState({ shop: null });
  });

  it('names what is in each primary slot', () => {
    publish([
      row({ id: 'Cannon', name: 'Cannon', slot: 1 }),
      row({ id: 'MiniGun', name: 'MiniGun', slot: 2, index: 1 }),
    ]);

    render(<UpgradesScreen />);

    const slots = document.querySelector('.shop__slots');
    expect(slots).toHaveTextContent('Slot 1');
    expect(slots).toHaveTextContent('Cannon');
    expect(slots).toHaveTextContent('Slot 2');
    expect(slots).toHaveTextContent('MiniGun');
  });

  /**
   * The empty case, on the same element. An "Empty" that never appears and a
   * weapon name that never appears look identical from a test that only ever
   * publishes one of them.
   */
  it('says Empty for a slot holding nothing', () => {
    publish([row({ id: 'Cannon', name: 'Cannon', slot: 1 })]);

    render(<UpgradesScreen />);

    const slots = document.querySelector('.shop__slots');
    expect(slots).toHaveTextContent('Cannon');
    expect(slots).toHaveTextContent('Empty');
  });

  it('shows the balance as money, not as a bare number', () => {
    publish([row()]);
    render(<UpgradesScreen />);

    // `$` and the accessible name, because the figure is read as a resource
    // and the glyph alone says nothing to a screen reader.
    const balance = document.querySelector('.shop__balance');
    expect(balance).toHaveTextContent('$5,000');
    expect(balance).toHaveAttribute('aria-label', '5000 coins');
  });
});
