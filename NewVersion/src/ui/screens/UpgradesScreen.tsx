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

const CATEGORY_LABELS: Record<string, string> = {
  primary: 'Primary weapons',
  secondary: 'Specials',
  misc: 'Tank',
};

/** Display order — weapons first, since they are what money is usually for. */
const CATEGORY_ORDER = ['primary', 'secondary', 'misc'];

/** Dev-only top-up, so the 28-upgrade catalogue can be exercised. */
const DEV_GRANT = 200_000;

type ShopRow = NonNullable<ReturnType<typeof useShop>>['upgrades'][number];

function useShop() {
  return useGameStore((s) => s.shop);
}

function UpgradeRow({ row }: { row: ShopRow }): React.ReactElement {
  const maxed = row.cost === null;
  const label = maxed ? 'MAX' : `${formatNumber(row.cost ?? 0)}`;

  return (
    <li className="shop-row">
      <div className="shop-row__info">
        <span className="shop-row__name">{row.name}</span>
        <span className="shop-row__level">
          {row.owned ? `Level ${row.level}/${row.maxLevel}` : 'Not owned'}
        </span>
      </div>

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
          ‹ Back
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

      {import.meta.env.DEV && (
        <button
          type="button"
          className="menu__button menu__button--ghost shop__dev-grant"
          onClick={() => GameEvents.emit('ui:dev-grant-money', { amount: DEV_GRANT })}
        >
          Dev: +{formatNumber(DEV_GRANT)} coins
        </button>
      )}

      <p className="screen__hint">
        Equipping is not ported yet — buying makes a weapon available, and Q cycles the
        ones you own during a level.
      </p>
    </div>
  );
}
