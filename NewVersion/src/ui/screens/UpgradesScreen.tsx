/**
 * The shop — `ScreenUpgrades.as`.
 *
 * Renders from `shop`, which `UpgradesScene` publishes. Every figure here is
 * precomputed: cost, affordability and the level cap all come from
 * `upgradeState`, so the 1173 balance values have exactly one interpreter and
 * this component does no game arithmetic.
 *
 * Clicking emits an id; the scene owns the transaction.
 */
import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';
import { formatNumber } from '../../game/core/Functions';
import { useInfoText } from '../useInfoText';
import { siteCorner } from '../../game/ui/infoTextSites';
import { UPGRADE_DESCRIPTIONS } from '../../game/upgrades/upgradeDescriptionData';

const CATEGORY_LABELS: Record<string, string> = {
  primary: 'Primary weapons',
  secondary: 'Specials',
  misc: 'Tank',
};

/** Display order — weapons first, since they are what money is usually for. */
const CATEGORY_ORDER = ['primary', 'secondary', 'misc'];

/** DEV-AID: top-up, so the 28-upgrade catalogue can be exercised. */
const DEV_GRANT = 200_000;

type ShopRow = NonNullable<ReturnType<typeof useShop>>['upgrades'][number];

function useShop() {
  return useGameStore((s) => s.shop);
}

/**
 * The equip controls — `ButtonEquipSlot` (two, primaries) and `ButtonEquip`
 * (one, secondaries).
 *
 * Shown only on an owned row, because the AS3 adds them inside
 * `if (levelsArray[selectedWeapon - 1] != 0)` and shows the Buy button
 * otherwise. There is **no unequip**: pressing a slot assigns, and nothing in
 * the original ever empties one, so the button that already holds this weapon
 * is simply inert rather than a toggle.
 */
function EquipControls({ row }: { row: ShopRow }): React.ReactElement | null {
  if (!row.owned) return null;

  if (row.category === 'secondary') {
    return (
      <div className="shop-row__equip">
        <button
          type="button"
          className={`shop-row__slot${row.equipped ? ' shop-row__slot--on' : ''}`}
          disabled={row.equipped}
          aria-pressed={row.equipped}
          aria-label={row.equipped ? `${row.name} equipped` : `Equip ${row.name}`}
          onClick={() => GameEvents.emit('ui:equip-secondary', { id: row.id })}
        >
          {row.equipped ? 'Equipped' : 'Equip'}
        </button>
      </div>
    );
  }

  if (row.category !== 'primary') return null;

  return (
    <div className="shop-row__equip" role="group" aria-label={`${row.name} slots`}>
      {([1, 2] as const).map((slot) => {
        const here = row.slot === slot;
        return (
          <button
            key={slot}
            type="button"
            className={`shop-row__slot${here ? ' shop-row__slot--on' : ''}`}
            disabled={here}
            aria-pressed={here}
            aria-label={
              here ? `${row.name} in slot ${slot}` : `Put ${row.name} in slot ${slot}`
            }
            onClick={() => GameEvents.emit('ui:equip-primary', { slot, id: row.id })}
          >
            {slot}
          </button>
        );
      })}
    </div>
  );
}

function UpgradeRow({ row }: { row: ShopRow }): React.ReactElement {
  const maxed = row.cost === null;
  const label = maxed ? 'MAX' : `${formatNumber(row.cost ?? 0)}`;

  // The corner comes from `infoTextSites.ts`, which pins it against
  // `ButtonUpgradeInfo.as:163` rather than restating it here. The first wiring
  // did restate it — `showTop: false`, cited to `:56`, a description string
  // rather than the call — and the panel opened upward over the row above the
  // one it described. Two booleans four lines from their text is exactly the
  // constant a test cannot check while the code is its own source.
  const info = UPGRADE_DESCRIPTIONS.find(
    (d) => d.category === row.category && d.index === row.index + 1,
  );
  const hover = useInfoText({
    text: info?.text ?? row.name,
    ...siteCorner('ButtonUpgradeInfo.as:163'),
  });

  return (
    <li className="shop-row" {...hover}>
      <div className="shop-row__info">
        <span className="shop-row__name">{row.name}</span>
        <span className="shop-row__level">
          {row.owned ? `Level ${row.level}/${row.maxLevel}` : 'Not owned'}
        </span>
      </div>

      {/*
        The five stat lines — `ScreenUpgrades`' `infoText1-5`. An empty string
        clears a line this upgrade does not use, so those are skipped here
        rather than rendered as blank rows; the *array* still carries all five
        so the scene and the screen cannot disagree about which slot is which.
      */}
      {row.previews.some((line) => line !== '') && (
        <ul className="shop-row__stats">
          {row.previews.map((line, i) =>
            line === '' ? null : (
              <li key={i} className="shop-row__stat">
                {line}
              </li>
            ),
          )}
        </ul>
      )}

      <EquipControls row={row} />

      <div className="shop-row__meter" aria-hidden="true">
        {Array.from({ length: row.maxLevel }, (_, i) => (
          <span
            key={i}
            className={`shop-row__pip ${i < row.level ? 'shop-row__pip--filled' : ''}`}
          />
        ))}
      </div>

      <button
        type="button"
        className="shop-row__buy"
        disabled={maxed || !row.affordable}
        aria-label={
          maxed
            ? `${row.name} fully upgraded`
            : `${row.owned ? 'Upgrade' : 'Buy'} ${row.name} for ${row.cost} coins`
        }
        onClick={() => GameEvents.emit('ui:buy-upgrade', { id: row.id })}
      >
        {maxed ? 'MAX' : (
          <>
            <span className="shop-row__verb">{row.owned ? 'Upgrade' : 'Buy'}</span>
            <span className="shop-row__price">◉ {label}</span>
          </>
        )}
      </button>
    </li>
  );
}

export function UpgradesScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const shop = useShop();
  if (activeScene !== 'Upgrades') return null;

  const rows = shop?.upgrades ?? [];

  return (
    <div className="screen screen--shop">
      <header className="screen__header">
        <button
          type="button"
          className="menu__button menu__button--ghost"
          onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
        >
          ‹ Menu
        </button>
        <h2 className="screen__title">Upgrades</h2>
        <span className="shop__balance" aria-label="Coins">
          ◉ {formatNumber(shop?.money ?? 0)}
        </span>
      </header>

      {rows.length === 0 ? (
        <p className="screen__hint">Loading…</p>
      ) : (
        CATEGORY_ORDER.map((category) => {
          const inCategory = rows.filter((r) => r.category === category);
          if (inCategory.length === 0) return null;
          return (
            <section key={category} className="shop-section">
              <h3 className="shop-section__title">{CATEGORY_LABELS[category] ?? category}</h3>
              <ul className="shop-list">
                {inCategory.map((row) => (
                  <UpgradeRow key={row.id} row={row} />
                ))}
              </ul>
            </section>
          );
        })
      )}

      {/* Say what is missing rather than silently omitting it. Thirteen of the
          28 upgrades are withheld because their effects are unported; a shop
          that just showed fifteen would read as the whole catalogue. */}
      {(shop?.withheld ?? 0) > 0 && (
        <p className="screen__hint">
          {shop!.withheld} more upgrades exist in the original but are not sold yet — their
          effects are unported, so buying one would take your coins and change nothing.
        </p>
      )}

      {import.meta.env.DEV && (
        <button
          type="button"
          className="menu__button menu__button--ghost shop__dev-grant"
          onClick={() => GameEvents.emit('ui:dev-grant-money', { amount: DEV_GRANT })}
        >
          Dev: +{formatNumber(DEV_GRANT)} coins
        </button>
      )}

      <div className="shop__exits">
        <button
          type="button"
          className="menu__button menu__button--primary"
          onClick={() => GameEvents.emit('ui:goto', { key: 'LevelSelect' })}
        >
          Level select ›
        </button>
      </div>

      <p className="screen__hint">
        Equipping is not ported yet — buying makes a weapon available, and Q cycles the
        ones you own during a level.
      </p>
    </div>
  );
}
