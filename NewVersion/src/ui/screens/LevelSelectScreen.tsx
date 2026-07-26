/**
 * Level select.
 *
 * The grid is React because scrolling, momentum and accessibility are all free
 * in the DOM. It renders from `levelList`, which `LevelSelectScene` publishes
 * after reading the player's progress — React never touches the profile, since
 * that lives in the Phaser registry.
 *
 * Port target: ScreenLevelSelect.as, ButtonLevelSelect.as. Still to come: the
 * world picker (world 1 only for now) and the bronze/silver/gold value icons.
 */
import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';

export function LevelSelectScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const listing = useGameStore((s) => s.levelList);
  if (activeScene !== 'LevelSelect') return null;

  const levels = listing?.levels ?? [];
  const cleared = levels.filter((l) => l.cleared).length;

  return (
    <div className="screen screen--levels">
      <header className="screen__header">
        <button
          type="button"
          className="menu__button menu__button--ghost"
          onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
        >
          ‹ Back
        </button>
        <h2 className="screen__title">{listing?.worldName ?? 'Loading…'}</h2>
      </header>

      {levels.length === 0 ? (
        <p className="screen__hint">No levels available.</p>
      ) : (
        <ul className="level-grid">
          {levels.map((entry) => (
            <li key={entry.level}>
              <button
                type="button"
                className={[
                  'level-grid__cell',
                  entry.cleared ? 'level-grid__cell--cleared' : '',
                  entry.unlocked ? '' : 'level-grid__cell--locked',
                ]
                  .filter(Boolean)
                  .join(' ')}
                disabled={!entry.unlocked}
                // The mode is the useful distinguisher between levels, and it
                // is the only hint that a Flag or Boss level plays differently.
                title={entry.unlocked ? `${entry.mode} level` : 'Clear the previous level first'}
                aria-label={
                  entry.unlocked
                    ? `Level ${entry.level}, ${entry.mode}${entry.cleared ? ', cleared' : ''}`
                    : `Level ${entry.level}, locked`
                }
                onClick={() =>
                  GameEvents.emit('ui:start-game', {
                    world: listing!.world,
                    level: entry.level,
                  })
                }
              >
                <span className="level-grid__number">{entry.unlocked ? entry.level : '🔒'}</span>
                {entry.unlocked && <span className="level-grid__mode">{entry.mode}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="screen__hint">
        {cleared}/{levels.length} cleared · world 1 of 9 — the world picker is not ported yet
      </p>
    </div>
  );
}
