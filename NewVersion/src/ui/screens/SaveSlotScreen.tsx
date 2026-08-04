/**
 * The save-slot picker — `ButtonGameSave.as:215-266`.
 *
 * Shown over the main menu, which is where the AS3 puts it. Each row renders
 * the four facts that file decides a slot button from, and nothing else:
 *
 *   empty        "New Game"
 *   occupied     "Slot N", then `gameProgress` and `gameDateTime` on two lines
 *   premium save a crown, and "Premium Required" with the button disabled when
 *                the player has no premium
 *
 * **The screen decides nothing.** Which slot loads, and whether choosing an
 * empty one starts a fresh game, is `MainMenuScene.selectSlot` reproducing
 * `onReleaseHandler` (`:110-134`). This renders `slotList` and emits a number.
 */
import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';

/** `Main.extraStuff` — no premium build yet, so a premium save is unreadable. */
const HAS_PREMIUM = false;

export function SaveSlotScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const open = useGameStore((s) => s.slotPickerOpen);
  const slots = useGameStore((s) => s.slotList);

  if (activeScene !== 'MainMenu' || !open) return null;

  return (
    <div className="screen screen--slots">
      <header className="screen__header">
        <button
          type="button"
          className="menu__button menu__button--ghost"
          onClick={() => GameEvents.emit('ui:slot-picker', { open: false })}
        >
          ‹ Back
        </button>
        <h2 className="screen__title">Choose a save</h2>
      </header>

      <ul className="slot-grid">
        {(slots ?? []).map((slot) => {
          // `:249` — a premium save is shown but not clickable without premium.
          const locked = slot.premium && !HAS_PREMIUM;

          return (
            <li key={slot.slot}>
              <button
                type="button"
                className={`slot-grid__cell${locked ? ' slot-grid__cell--locked' : ''}`}
                disabled={locked}
                aria-label={
                  slot.hasData
                    ? `Slot ${slot.slot}, ${slot.progress ?? 'saved game'}`
                    : `Slot ${slot.slot}, new game`
                }
                onClick={() => GameEvents.emit('ui:select-slot', { slot: slot.slot })}
              >
                <span className="slot-grid__title">
                  {slot.hasData ? `Slot ${slot.slot}` : 'New Game'}
                  {slot.premium && <span className="slot-grid__crown"> 👑</span>}
                </span>

                {/* Both lines come from the save's own `wl` and `dt` fields —
                    never recomputed here, so the screen cannot disagree with
                    what the slot actually holds. */}
                {slot.hasData && <span className="slot-grid__progress">{slot.progress}</span>}
                {slot.hasData && <span className="slot-grid__date">{slot.dateTime}</span>}

                {locked && <span className="slot-grid__locked">Premium Required</span>}
              </button>
            </li>
          );
        })}
      </ul>

      <p className="screen__hint">
        An empty slot starts a new game at level 1-1. A saved slot opens level select.
      </p>
    </div>
  );
}
