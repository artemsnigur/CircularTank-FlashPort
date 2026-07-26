/**
 * Enemy behaviour status.
 *
 * A development view: what has actually been built per enemy type, so progress
 * is visible without reading `PartGameArea.as` or PROGRESS.md.
 *
 * Everything is derived — see `enemyBehaviour.ts`. Ranged support is computed
 * from the shoot types and patterns the port can build, so widening those
 * updates this screen automatically; only the unported special mechanics are
 * hand-declared.
 */
import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';
import { behaviourTotals, describeAllEnemies } from '../../game/enemies/enemyBehaviour';
import type { BehaviourStatus } from '../../game/enemies/enemyBehaviour';
import { DEV_SINGLE_TYPE_COUNT, DEV_WORLD, devLevelForType } from '../../game/levels/devLevels';

const STATUS_LABEL: Record<BehaviourStatus, string> = {
  implemented: 'Implemented',
  partial: 'Partial',
  'data-only': 'Data only',
};

export function EnemiesScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  if (activeScene !== 'Enemies') return null;

  const reports = describeAllEnemies();
  const totals = behaviourTotals(reports);
  const order: BehaviourStatus[] = ['implemented', 'partial', 'data-only'];

  return (
    <div className="screen screen--enemies">
      <header className="screen__header">
        <button
          type="button"
          className="menu__button menu__button--ghost"
          onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
        >
          ‹ Menu
        </button>
        <h2 className="screen__title">Enemy behaviour</h2>
        <span className="enemies__totals">
          {totals.implemented} done · {totals.partial} partial · {totals.dataOnly} data only
        </span>
      </header>

      {order.map((status) => {
        const group = reports.filter((r) => r.status === status);
        if (group.length === 0) return null;
        return (
          <section key={status} className="enemies__section">
            <h3 className="shop-section__title">
              {STATUS_LABEL[status]} ({group.length})
            </h3>
            <ul className="enemies__list">
              {group.map((r) => (
                <li key={r.type} className={`enemies__row enemies__row--${status}`}>
                  <span className="enemies__name">{r.type}</span>
                  <span className="enemies__traits">
                    {/* Every type steers; only the extras are worth listing. */}
                    {r.shoots && (
                      <span className={r.rangedImplemented ? 'enemies__tag' : 'enemies__tag enemies__tag--missing'}>
                        {r.rangedImplemented ? 'ranged' : 'ranged (unported pattern)'}
                      </span>
                    )}
                    {r.missingMechanic && (
                      <span className="enemies__missing">missing: {r.missingMechanic}</span>
                    )}
                  </span>
                  {import.meta.env.DEV && devLevelForType(r.type) !== null && (
                    <button
                      type="button"
                      className="enemies__test"
                      title={`Fight ${DEV_SINGLE_TYPE_COUNT} ${r.type} on their own`}
                      onClick={() =>
                        GameEvents.emit('ui:start-game', {
                          world: DEV_WORLD,
                          level: devLevelForType(r.type)!,
                        })
                      }
                    >
                      Test ›
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      {import.meta.env.DEV && (
        <p className="screen__hint">
          Test launches a dev-only level with {DEV_SINGLE_TYPE_COUNT} of that type and nothing
          else. It records no progress.
        </p>
      )}

      <p className="screen__hint">
        All {totals.total} types move and use the real stat and resistance tables. This lists
        what else is built. Not the in-game bestiary — that is <code>ScreenEnemies</code>, still
        unported.
      </p>
    </div>
  );
}
