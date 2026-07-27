/**
 * The bestiary — `ScreenEnemies.as`.
 *
 * The player-facing view: which enemies have been met, and what is known about
 * them. `EnemiesScreen` is the development board and is a different screen for
 * a different audience.
 *
 * Renders entirely from `bestiary`, which `BestiaryScene` publishes off the
 * profile. This component does no lookups of its own — in particular it never
 * reads `BESTIARY` directly, because that would show descriptions for enemies
 * the player has not met.
 */
import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';

export function BestiaryScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const bestiary = useGameStore((s) => s.bestiary);
  if (activeScene !== 'Bestiary') return null;

  const entries = bestiary?.entries ?? [];
  const knownCount = bestiary?.knownCount ?? 0;
  const total = bestiary?.total ?? 0;

  return (
    <div className="screen screen--bestiary">
      <header className="screen__header">
        <button
          type="button"
          className="menu__button menu__button--ghost"
          onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
        >
          ‹ Menu
        </button>
        <h2 className="screen__title">Bestiary</h2>
        <span className="bestiary__count" aria-label={`${knownCount} of ${total} enemies known`}>
          {knownCount} / {total}
        </span>
      </header>

      {entries.length === 0 ? (
        <p className="screen__hint">Loading…</p>
      ) : (
        <ul className="bestiary__list">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className={`bestiary-row ${entry.known ? '' : 'bestiary-row--locked'}`}
            >
              <span className="bestiary-row__name">
                {entry.known ? entry.displayName : '???'}
              </span>
              <span className="bestiary-row__text">
                {entry.known ? entry.description : 'Not yet encountered.'}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p className="screen__hint">
        Clearing a level reveals the enemies waiting in the next one.
      </p>
    </div>
  );
}
