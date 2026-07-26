/**
 * Level select — placeholder grid.
 *
 * Real level data comes from ScreenGame.as (`levelDataModelW1..W9`, 9 worlds
 * x ~45 levels). This renders a stub so the navigation graph is exercised.
 */
import { Worlds } from '../../game/config/constants';
import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';

const PLACEHOLDER_LEVELS = 12;

export function LevelSelectScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  if (activeScene !== 'LevelSelect') return null;

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
        <h2 className="screen__title">{Worlds[0]}</h2>
      </header>

      <ul className="level-grid">
        {Array.from({ length: PLACEHOLDER_LEVELS }, (_, i) => (
          <li key={i}>
            <button
              type="button"
              className="level-grid__cell"
              onClick={() => GameEvents.emit('ui:start-game', { levelIndex: i })}
            >
              {i + 1}
            </button>
          </li>
        ))}
      </ul>

      <p className="screen__hint">
        Placeholder grid — real level tables live in <code>ScreenGame.as</code>.
      </p>
    </div>
  );
}
