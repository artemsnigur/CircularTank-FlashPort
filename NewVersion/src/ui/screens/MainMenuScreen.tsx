/**
 * Menu buttons, rendered as DOM.
 *
 * Why DOM and not Phaser: these are real buttons. In the DOM they get focus
 * rings, screen-reader semantics, native tap highlighting, text that reflows
 * when translated, and `env(safe-area-inset-*)` for free. Rebuilding any of
 * that inside a canvas is work with no payoff. See docs/TEXT_RENDERING.md.
 */
import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';

export function MainMenuScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const phase = useGameStore((s) => s.phase);

  if (activeScene !== 'MainMenu' || phase !== 'ready') return null;

  return (
    <div className="screen screen--menu">
      <p className="screen__eyebrow">Flash port — skeleton build</p>

      <nav className="menu" aria-label="Main menu">
        <button
          type="button"
          className="menu__button menu__button--primary"
          onClick={() => GameEvents.emit('ui:start-game', { world: 1, level: 1 })}
        >
          Play
        </button>
        <button
          type="button"
          className="menu__button"
          onClick={() => GameEvents.emit('ui:goto', { key: 'LevelSelect' })}
        >
          Level Select
        </button>
        <button
          type="button"
          className="menu__button"
          onClick={() => GameEvents.emit('ui:run-audio-selftest', {})}
        >
          Re-run audio self-test
        </button>
      </nav>

      <p className="screen__hint">
        Tap once to unlock audio. In-game: <kbd>WASD</kbd> / arrows to move, mouse to aim,{' '}
        <kbd>Space</kbd> to fire.
      </p>
    </div>
  );
}
