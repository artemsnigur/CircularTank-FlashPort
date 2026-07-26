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
import { DEV_LEVEL, DEV_WORLD } from '../../game/levels/devTestLevel';

export function MainMenuScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const phase = useGameStore((s) => s.phase);
  const resumePoint = useGameStore((s) => s.resumePoint);

  if (activeScene !== 'MainMenu' || phase !== 'ready') return null;

  // 1-1 until the scene has published a resume point — a fresh save resolves
  // there anyway, so the fallback and the real answer agree for a new player.
  const resume = resumePoint ?? { world: 1, level: 1 };

  return (
    <div className="screen screen--menu">
      <p className="screen__eyebrow">Flash port — skeleton build</p>

      <nav className="menu" aria-label="Main menu">
        <button
          type="button"
          className="menu__button menu__button--primary"
          onClick={() =>
            GameEvents.emit('ui:start-game', {
              world: resume.world,
              level: resume.level,
            })
          }
        >
          {/* Resolved by MainMenuScene from the same progress table LevelSelect
              locks levels with — never computed here. */}
          {resume.level > 1 ? `Continue — Level ${resume.level}` : 'Play'}
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
          onClick={() => GameEvents.emit('ui:goto', { key: 'Upgrades' })}
        >
          Upgrades
        </button>
        <button
          type="button"
          className="menu__button"
          onClick={() => GameEvents.emit('ui:goto', { key: 'Enemies' })}
        >
          Enemy behaviour
        </button>
        {import.meta.env.DEV && (
          <button
            type="button"
            className="menu__button menu__button--ghost"
            // Every enemy type in one arena. Enemy variety lives in worlds 7-9,
            // which the pinned world-1 level select cannot reach.
            onClick={() =>
              GameEvents.emit('ui:start-game', { world: DEV_WORLD, level: DEV_LEVEL })
            }
          >
            Dev: all-enemy test level
          </button>
        )}
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
