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
import { CREDIT_TEXT, siteCorner } from '../../game/ui/infoTextSites';
import { useInfoText } from '../useInfoText';

/**
 * `ButtonCredit` — the menu's attribution, `ScreenMenu.as:268-271`.
 *
 * A small icon at `(20, 372)`, bottom-left of the 640x480 menu, whose only
 * behaviour is a tooltip: `ButtonCredit.as:36` hands
 * `PartInfoText.changeText` the credit text on roll-over and nothing on
 * roll-out. No click handler, no screen behind it.
 *
 * ── One divergence, and it is an addition ─────────────────────────────────
 * The AS3's is **mouse-only**: `ROLL_OVER`/`ROLL_OUT` with no keyboard or touch
 * path, which was fine for a Flash game on a desktop. Porting only that would
 * make an attribution unreachable for anyone on a phone or a keyboard, so the
 * same text also rides `title` and the accessible name. The hover panel is the
 * faithful part; the two attributes are the port's, and they add a route rather
 * than change one.
 */
function CreditButton(): React.ReactElement {
  // The corner comes from the table, pinned against `ButtonCredit.as:37`, not
  // restated here — the two-booleans-four-lines-away trap `infoTextSites.ts`
  // documents.
  const hover = useInfoText({ text: CREDIT_TEXT, ...siteCorner('ButtonCredit.as:37') });

  return (
    <p className="screen__credit">
      <button type="button" className="credit-button" aria-label={CREDIT_TEXT} title={CREDIT_TEXT} {...hover}>
        Credits
      </button>
    </p>
  );
}

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
              difficulty,
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
          onClick={() => GameEvents.emit('ui:slot-picker', { open: true })}
        >
          Save Slots
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
          onClick={() => GameEvents.emit('ui:goto', { key: 'Bestiary' })}
        >
          Bestiary
        </button>
        <button
          type="button"
          className="menu__button"
          onClick={() => GameEvents.emit('ui:goto', { key: 'Options' })}
        >
          Options
        </button>
        <button
          type="button"
          className="menu__button"
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
        <AudioToggles />
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

      {/* Last in the menu, as `ScreenMenu.as:269` adds it after the buttons and
          places it low-left. */}
      <CreditButton />
    </div>
  );
}
