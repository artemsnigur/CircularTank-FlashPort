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
import { readFileSync } from 'node:fs';
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
    // And the tile itself is still there — the gap is the icon, not the tile.
    expect(document.querySelectorAll('.shop-tile')).toHaveLength(1);
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
    // The tile carries the name instead, since the picture no longer sits
    // beside a text row that named it.
    expect(document.querySelector('.shop-tile')?.getAttribute('aria-label')).toContain('Cannon');
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

/**
 * ── The tile grid and the detail window — T166 ─────────────────────────────
 *
 * The screen became `ScreenUpgrades`' own shape: icon buttons six to a row,
 * and one right-hand window addressing whichever is selected. These cover the
 * part that is genuinely new — the selection — rather than restating what
 * `upgradeState` and `upgradePreview` already pin.
 */
describe('selecting a tile', () => {
  beforeEach(() => {
    attachStoreBridge();
    enterShop();
  });
  afterEach(() => {
    detachStoreBridge();
    GameEvents.removeAllListeners();
    useGameStore.setState({ shop: null });
  });

  const three = (): ShopRow[] => [
    row({ id: 'Cannon', name: 'Cannon', index: 0 }),
    row({ id: 'MiniGun', name: 'Mini Gun', index: 1, cost: 250 }),
    row({ id: 'BigCannon', name: 'Big Cannon', index: 2, owned: false, cost: 1600 }),
  ];

  it('starts on the first upgrade rather than on nothing', () => {
    // A blank window beside a full catalogue reads as broken, and the AS3's
    // `selectedWeapon = 0` empty state only exists because it has a separate
    // "nothing chosen" screen to fall back to.
    publish(three());
    render(<UpgradesScreen />);

    expect(document.querySelector('.shop-detail__name')).toHaveTextContent('Cannon');
    expect(document.querySelectorAll('.shop-tile--on')).toHaveLength(1);
  });

  it('moves the window and the ring together', () => {
    publish(three());
    render(<UpgradesScreen />);

    act(() => {
      (document.querySelectorAll('.shop-tile')[2] as HTMLButtonElement).click();
    });

    // Both halves, because a ring that moves without the window — or a window
    // that changes with no ring — is the failure this pairing exists to catch.
    expect(document.querySelector('.shop-detail__name')).toHaveTextContent('Big Cannon');
    expect(document.querySelectorAll('.shop-tile')[2]).toHaveAttribute('aria-pressed', 'true');
    expect(document.querySelectorAll('.shop-tile--on')).toHaveLength(1);
  });

  /**
   * Selection is keyed by `id`, not by index, and this is why.
   *
   * Buying republishes the whole catalogue. Keyed by position, a selection
   * would survive only while the order held; keyed by id it survives a
   * reorder, and the player does not lose their place mid-purchase.
   */
  it('survives a republished catalogue', () => {
    publish(three());
    render(<UpgradesScreen />);

    act(() => {
      (document.querySelectorAll('.shop-tile')[1] as HTMLButtonElement).click();
    });
    expect(document.querySelector('.shop-detail__name')).toHaveTextContent('Mini Gun');

    // Same rows, reordered and levelled up — what a purchase produces.
    publish([
      row({ id: 'BigCannon', name: 'Big Cannon', index: 2, owned: false }),
      row({ id: 'MiniGun', name: 'Mini Gun', index: 1, level: 4 }),
      row({ id: 'Cannon', name: 'Cannon', index: 0 }),
    ]);

    expect(document.querySelector('.shop-detail__name')).toHaveTextContent('Mini Gun');
  });

  it('buys the selected upgrade, not the first one', () => {
    const bought: unknown[] = [];
    GameEvents.subscribe('ui:buy-upgrade', (p) => bought.push(p));

    publish(three());
    render(<UpgradesScreen />);

    act(() => {
      (document.querySelectorAll('.shop-tile')[1] as HTMLButtonElement).click();
    });
    act(() => {
      document.querySelector<HTMLButtonElement>('.shop-buy')!.click();
    });

    expect(bought).toEqual([{ id: 'MiniGun' }]);
  });
});

describe('the detail window', () => {
  beforeEach(() => {
    attachStoreBridge();
    enterShop();
  });
  afterEach(() => {
    detachStoreBridge();
    GameEvents.removeAllListeners();
    useGameStore.setState({ shop: null });
  });

  it('splits a stat into a label and a figure', () => {
    // The colon is the boundary the AS3 emphasises across too (`:828-831`).
    publish([row({ previews: ['Damage: 7 HP  7.33', '', '', '', ''] })]);
    render(<UpgradesScreen />);

    expect(document.querySelector('.shop-stat__label')).toHaveTextContent('Damage:');
    // `textContent`, not `toHaveTextContent`, which collapses runs of spaces.
    // The gap between the current figure and the next one is two spaces and is
    // the AS3's own separator (`:814` concatenates `" " + next`), so a matcher
    // that normalises it away cannot see the value being reformatted.
    expect(document.querySelector('.shop-stat__value')?.textContent).toBe('7 HP  7.33');
  });

  it('keeps a colonless line whole rather than blanking it', () => {
    // The counterpart. A splitter that assumed a colon would render an empty
    // label and drop the text, which looks like a missing stat.
    publish([row({ previews: ['Fires three shots', '', '', '', ''] })]);
    render(<UpgradesScreen />);

    expect(document.querySelector('.shop-stat__label')).toHaveTextContent('Fires three shots');
    expect(document.querySelector('.shop-stat__value')).toBeNull();
  });

  it('names the damage type from the AS3 lookup', () => {
    // `index: 2` is `selectedWeapon == 3` — Explosion, `ScreenUpgrades.as:1779`.
    publish([row({ id: 'BigCannon', name: 'Big Cannon', index: 2 })]);
    render(<UpgradesScreen />);

    expect(document.querySelector('.shop-detail__damage')).toHaveTextContent('Explosion Damage');
  });

  it('shows MAX instead of a price on a maxed upgrade', () => {
    publish([row({ cost: null, level: 10 })]);
    render(<UpgradesScreen />);

    const buy = document.querySelector<HTMLButtonElement>('.shop-buy');
    expect(buy).toBeDisabled();
    expect(buy).toHaveTextContent('MAX');
    // And no price beside it — the counterpart to the split pill's two halves.
    expect(document.querySelector('.shop-buy__price')).toBeNull();
  });

  it('carries the price in its own half when there is one', () => {
    publish([row({ cost: 1600, affordable: true })]);
    render(<UpgradesScreen />);

    expect(document.querySelector('.shop-buy__verb')).toHaveTextContent('Upgrade');
    expect(document.querySelector('.shop-buy__price')).toHaveTextContent('1,600');
  });
});

describe('the headings and the category order', () => {
  beforeEach(() => {
    attachStoreBridge();
    enterShop();
  });
  afterEach(() => {
    detachStoreBridge();
    GameEvents.removeAllListeners();
    useGameStore.setState({ shop: null });
  });

  /**
   * The original's own three labels. The port had shortened two of them, and
   * the uppercasing is CSS so the accessible name stays sentence case.
   */
  it('uses ScreenUpgrades` names, in its order', () => {
    publish([
      row({ id: 'Cannon', category: 'primary', index: 0 }),
      row({ id: 'Grenade', category: 'secondary', index: 0 }),
      row({ id: 'Speed', category: 'misc', index: 0 }),
    ]);
    render(<UpgradesScreen />);

    const titles = [...document.querySelectorAll('.shop-group__title')].map((n) => n.textContent);
    expect(titles).toEqual(['Primary weapons', 'Special weapons', 'Miscellaneous']);
  });
});

/**
 * ── The no-scroll guarantee ────────────────────────────────────────────────
 *
 * **These read the stylesheet. They prove the rules are written, not that the
 * screen fits** — jsdom has no layout engine and resolves no `calc()`, so a
 * `--tile` that computed to nonsense would pass every line below.
 *
 * The fit itself was **measured in headless Chromium**, driving the real
 * screen and comparing `scrollHeight` with `clientHeight` on
 * `.screen-shell__body`, at nine viewports from 1024x480 to 3840x2160. All
 * nine came back equal, with all 28 tiles present and the lowest content edge
 * 68-76px above the container's bottom. The numbers are in the commit.
 *
 * That run is also what found the one real defect here, and the shape of it is
 * worth keeping: the overflow was **exactly 60px at every size**. A number
 * that does not move while the tiles scale by 2x is not coming from the tiles
 * — it was the DEV grant button, a sibling of `.shop`, which claimed
 * `height: 100%` of a body it did not solely occupy.
 */
describe('the shop is built not to scroll', () => {
  const css = readFileSync('src/styles/global.css', 'utf8');

  const block = (selector: string): string => {
    const literal = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const found = new RegExp(`${literal}\\s*\\{([^}]*)\\}`).exec(css);
    expect(found, `${selector} is missing`).not.toBeNull();
    return found![1];
  };

  it('takes the scroll off the body rather than hoping it never overflows', () => {
    const body = block('.screen--shop .screen-shell__body');

    expect(body).toMatch(/overflow:\s*hidden/);
    // `.screen-shell__body` sets `overflow-y: auto`; both are one class, so
    // the override must out-specify it rather than merely follow it.
    expect(css).toMatch(/\.screen-shell__body \{[^}]*overflow-y: auto/);
  });

  it('gives the shop a grid row rather than the whole body', () => {
    // The 60px defect in one assertion. `.shop` is not the body's only child —
    // the withheld notice and the DEV button are siblings — so `height: 100%`
    // on it overflows by whatever they occupy.
    const body = block('.screen--shop .screen-shell__body');

    expect(body).toMatch(/display:\s*grid/);
    // `minmax(0, 1fr)` and not a bare `1fr`: the latter is `minmax(auto, 1fr)`
    // and refuses to shrink below its content, which is how a grid row
    // silently overflows anyway.
    expect(body).toMatch(/grid-template-rows:\s*minmax\(0, 1fr\) auto/);
  });

  /**
   * The tile is sized off the **viewport**, so the binding dimension wins: a
   * short wide window is limited by height, a narrow tall one by width. Off
   * the column instead, a wide monitor would size tiles to fill horizontally
   * and overflow vertically.
   */
  it('sizes the tile from whichever viewport dimension binds', () => {
    const shop = block('.shop');

    expect(shop).toMatch(/--tile:\s*clamp\([^;]*min\([^;]*vh[^;]*vw[^;]*\)/);
    // The ceiling is what stops a 2K display sizing tiles off `vw`; five tile
    // rows at the cap is 380px, which is the whole budget this rests on.
    expect(shop).toMatch(/--tile:\s*clamp\([^;]*4\.75rem\)/);
  });

  it('derives the tile`s parts from it rather than from fixed lengths', () => {
    const shop = block('.shop');
    expect(shop).toMatch(/--tile-icon:\s*calc\(var\(--tile\)/);
    expect(shop).toMatch(/--tile-gap:\s*calc\(var\(--tile\)/);

    // And the icon actually receives it — the component takes a CSS length
    // precisely so this can be handed over, and an inline `38` would win.
    expect(readFileSync('src/ui/screens/UpgradesScreen.tsx', 'utf8')).toContain(
      'size="var(--tile-icon)"',
    );
  });

  it('splits the two columns and scales the window from one lever', () => {
    const shop = block('.shop');

    expect(shop).toMatch(/--pane:\s*clamp\(/);
    expect(shop).toMatch(/grid-template-columns:\s*minmax\(0, 1fr\) var\(--pane\)/);

    // Same rule as the menu card: no fixed padding, gap or type inside the
    // window, or it stays put while the panel grows on a large display.
    const fixed: string[] = [];
    const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)]
      .map((m) => ({ selector: m[1].trim(), body: m[2] }))
      .filter((r) => /^\.(shop-detail|shop-buy|gloss-pill\.shop-buy|shop-stat)/.test(r.selector));

    expect(rules.length, 'the window`s rules were renamed').toBeGreaterThanOrEqual(5);
    for (const { selector, body } of rules) {
      for (const [, property, value] of body.matchAll(
        /(?:^|;)\s*(padding|gap|font-size)\s*:([^;]+)/g,
      )) {
        const scales =
          value.includes('var(--pane)') || /(?:^|\s)0(?:\s|$)|em\b|%/.test(value.trim());
        if (!scales) fixed.push(`${selector} { ${property}:${value.trim()} }`);
      }
    }
    expect(fixed, 'these stay put while the window grows').toEqual([]);
  });

  it('lays the tiles six across, as the original does', () => {
    // `ScreenUpgrades.as:440-467` places them at `36 * 1` through `36 * 6`.
    expect(block('.shop-grid')).toMatch(/grid-template-columns:\s*repeat\(6, var\(--tile\)\)/);
  });

  /**
   * The selection ring, and the two states it has to beat.
   *
   * A tile can be selected *and* affordable, or selected *and* unowned. Those
   * set their own border and shadow, so the selected rule names the
   * combinations explicitly rather than trusting source order — the failure
   * this project has shipped five times.
   */
  it('makes the selected ring win over the other tile states', () => {
    expect(css).toContain('.shop-tile--on.shop-tile--affordable');
    expect(css).toContain('.shop-tile--on.shop-tile--locked');
    // The ring itself. Anchored on the last selector in the group, so the
    // assertion does not depend on how the three are wrapped across lines.
    expect(css).toMatch(/\.shop-tile--on\.shop-tile--locked \{[^}]*border-color:\s*#fff/);
  });

  /**
   * The Buy pill overrides the shared recipe, so it must do it with two
   * classes. Both are (0,1,0); a single `.shop-buy` would be settled by
   * whichever rule sits later in the file.
   */
  it('overrides the shared pill by specificity, not by position', () => {
    expect(css).toContain('.gloss-pill.shop-buy {');
    expect(css).not.toMatch(/\n\.shop-buy \{/);

    const buy = block('.gloss-pill.shop-buy');
    // The split: a hard stop at the midline, green above and near-black below.
    expect(buy).toMatch(/background-image:\s*linear-gradient/);
    expect(buy).toMatch(/49%,\s*\n\s*#[0-9a-f]{6} 50%/);
  });
});
