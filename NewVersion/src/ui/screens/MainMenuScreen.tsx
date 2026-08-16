/**
 * Menu buttons, rendered as DOM.
 *
 * Why DOM and not Phaser: these are real buttons. In the DOM they get focus
 * rings, screen-reader semantics, native tap highlighting, text that reflows
 * when translated, and `env(safe-area-inset-*)` for free. Rebuilding any of
 * that inside a canvas is work with no payoff. See docs/TEXT_RENDERING.md.
 */
import { useGameStore } from '../../state/gameStore';
import { AudioToggles } from '../AudioToggles';
import { GameEvents } from '../../game/events/GameEvents';
import { DEV_COMBINED_LEVEL, DEV_WORLD } from '../../game/levels/devLevels';
import { ScreenShell } from '../ScreenShell';
import { ChromeArt } from '../ChromeArt';

export function MainMenuScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const slotPickerOpen = useGameStore((s) => s.slotPickerOpen);
  const phase = useGameStore((s) => s.phase);
  const resumePoint = useGameStore((s) => s.resumePoint);
  // Echoed back, never decided here — MainMenuScene publishes it.
  const difficulty = useGameStore((s) => s.difficulty);

  // The slot picker is drawn over the menu and both are keyed to MainMenu, so
  // without this they render at once — the picker appeared *behind* the menu,
  // its rows off-screen, while its DOM text read correctly. A text assertion
  // passed on that; the screenshot did not.
  if (activeScene !== 'MainMenu' || phase !== 'ready' || slotPickerOpen) return null;

  // 1-1 until the scene has published a resume point — a fresh save resolves
  // there anyway, so the fallback and the real answer agree for a new player.
  const resume = resumePoint ?? { world: 1, level: 1 };

  return (
    <ScreenShell
      title="Circular Tank"
      titleClip="TitleMainMenu"
      /* No bar: the original's menu has none, and there is no "current" screen
         to mark while you are standing outside all of them. */
      nav={null}
      /* And no crest. `IconShield` heads the screens *inside* the game; the
         menu's own bar carries the title alone. */
      shield={false}
      className="screen--menu"
    >
      {/*
        The illustrated scene — `BackgroundMainMenu` (1322), a full 640x480 of
        vector art. Decorative: it is the game's own cover picture and says
        nothing a control does not, so it is `aria-hidden` and sits behind.

        **Wrapped, and the wrapper is the fix for T160's bug.** `ChromeArt`
        gives every clip `position: relative` from `.chrome-art` and an
        **inline** `aspect-ratio`. A class on the art itself cannot reliably
        override either — the inline style always wins, and `.chrome-art` is
        declared later in the stylesheet than any screen's rules, so at equal
        specificity it wins too. Styling it directly left the art in flow at
        full body height, which pushed the panels below a body with
        `overflow: hidden` and made them vanish. The wrapper is an element this
        screen owns outright, so its `position: absolute` is not in a contest.
      */}
      <div className="menu-scene">
        <ChromeArt clip="BackgroundMainMenu" className="menu-scene__art" />
      </div>

      <div className="menu-panels">
        {/*
          `LOCAL SAVES`. The original pairs this with an `ONLINE SAVES` panel
          for Armor Games accounts; that surface is not ported, so there is one
          panel rather than two empty ones. Recorded as `A26`.
        */}
        <section className="menu-saves chrome-panel chrome-panel--dark">
          <h2 className="menu-saves__title">Local saves</h2>

          <button
            type="button"
            className="menu-play"
            aria-label={resume.level > 1 ? `Continue at level ${resume.level}` : 'Play'}
            onClick={() =>
              GameEvents.emit('ui:start-game', {
                world: resume.world,
                level: resume.level,
                difficulty,
              })
            }
          >
            <ChromeArt clip="ButtonPlay" frame={1} className="menu-play__face" />
            <ChromeArt clip="ButtonPlay" frame={2} className="menu-play__face menu-play__face--hover" />
            <ChromeArt clip="ButtonPlay" frame={3} className="menu-play__face menu-play__face--pressed" />
          </button>

          {/* Resolved by MainMenuScene from the same progress table LevelSelect
              locks levels with — never computed here. */}
          <p className="menu-saves__resume">
            {resume.level > 1 ? `Level ${resume.world}-${resume.level}` : 'New game'}
          </p>

          <button
            type="button"
            className="chrome-pill chrome-pill--red menu-saves__slots"
            onClick={() => GameEvents.emit('ui:slot-picker', { open: true })}
          >
            Save slots
          </button>
        </section>

      <nav className="menu" aria-label="Main menu">
        <button
          type="button"
          className="chrome-pill"
          onClick={() => GameEvents.emit('ui:goto', { key: 'LevelSelect' })}
        >
          Level Select
        </button>
        <button
          type="button"
          className="chrome-pill"
          onClick={() => GameEvents.emit('ui:goto', { key: 'Upgrades' })}
        >
          Upgrades
        </button>
        <button
          type="button"
          className="chrome-pill"
          onClick={() => GameEvents.emit('ui:goto', { key: 'Bestiary' })}
        >
          Bestiary
        </button>
        <button
          type="button"
          className="chrome-pill"
          onClick={() => GameEvents.emit('ui:goto', { key: 'Options' })}
        >
          Options
        </button>
        <button
          type="button"
          className="chrome-pill"
          onClick={() => GameEvents.emit('ui:goto', { key: 'Achievements' })}
        >
          Achievements
        </button>
        {import.meta.env.DEV && (
          <button
            type="button"
            className="menu__button menu__button--ghost"
            // The development board — what has been *built* per type, as
            // against the Bestiary's what the player has *met*. It documents
            // itself as a dev view and was reachable in production anyway;
            // now that a player-facing enemy screen exists, shipping both
            // would put two near-identical entries on the menu.
            onClick={() => GameEvents.emit('ui:goto', { key: 'Enemies' })}
          >
            Dev: enemy behaviour
          </button>
        )}
        {import.meta.env.DEV && (
          <button
            type="button"
            className="menu__button menu__button--ghost"
            // Every enemy type in one arena. Enemy variety lives in worlds 7-9,
            // which the pinned world-1 level select cannot reach.
            onClick={() =>
              GameEvents.emit('ui:start-game', {
                world: DEV_WORLD,
                level: DEV_COMBINED_LEVEL,
                difficulty,
                sandbox: true,
              })
            }
          >
            Dev: all-enemy test level
          </button>
        )}
        <button
          type="button"
          className="chrome-pill"
          onClick={() => GameEvents.emit('ui:run-audio-selftest', {})}
        >
          Re-run audio self-test
        </button>
      </nav>
      </div>

      {/*
        The corner icons — `ScreenMenu` fills its bottom-left with the sponsor,
        social and more-games buttons, all of which go with the monetisation
        surface. What is left there and still means something is the audio
        pair, which the original also draws as small icon buttons.
      */}
      <div className="menu-corner">
        <AudioToggles />
      </div>

      <p className="screen__hint">
        Tap once to unlock audio. In-game: <kbd>WASD</kbd> / arrows to move, mouse to aim,{' '}
        <kbd>Space</kbd> to fire.
      </p>
    </ScreenShell>
  );
}
