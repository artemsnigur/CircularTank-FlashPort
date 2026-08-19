/**
 * The pause panel — `PartInterface.pauseGame` (`:426-476`).
 *
 * ── It is a menu, not a "PAUSED" label ────────────────────────────────────
 * The original draws a 75%-black full-screen box, the words **Game Paused** at
 * 64pt, and three buttons: Resume (y 156), Reset Level (184), Quit Level (212),
 * plus an "Auto pause" checkbox at (266, 254). Everything is torn down again in
 * `unPauseGame` (`:797-826`).
 *
 * ── Three deliberate differences ──────────────────────────────────────────
 * **The audio toggles are not here** — divergence, recorded in the audit. The
 * AS3 puts Sound and Music buttons in this panel *and* in the HUD.
 *
 * This used to say "a second copy would be two sets of the same control on
 * screen at once", which was true while `AudioToggles` sat in the HUD. **T200
 * removed it from the HUD**, so that reasoning is gone and the position is now
 * a plain one: there is no audio control during a level, by request. Volume
 * and the two toggles live on the options screen. If a mid-level mute is
 * wanted, this panel is where it belongs — it is where the AS3 puts it.
 *
 * **The "Auto pause" checkbox is not here either.** `:459-462` puts it in the
 * panel, duplicating the options screen's own row. One control, one home: the
 * options screen. Auto-pause itself is untouched — `usePauseControl` reads
 * `gameplayOptions.autoPause` from the store, which the options screen writes,
 * so the behaviour works exactly as before and only this second copy of the
 * switch is gone.
 *
 * **Quit goes to level select, not the main menu.** `ButtonPause.as:105` sets
 * `Main.changeScreen = "LevelSelect"`, and quitting a level should not throw
 * the player out to the title. The main menu is one step further from there.
 *
 * ── Layout is not transcribed ─────────────────────────────────────────────
 * The AS3's coordinates are absolute inside a 640x480 stage. This port has a
 * responsive canvas, so the panel is centred and flows instead — the same rule
 * every other ported screen follows, and the reason `docs/SCALING.md` exists.
 * The *order* of the buttons is kept, because that is the muscle memory.
 */
import React from 'react';

import { GameEvents } from '../game/events/GameEvents';
import { useGameStore } from '../state/gameStore';
import { SceneKeys } from '../game/config/constants';

export function PauseOverlay(): React.ReactElement | null {
  const paused = useGameStore((s) => s.paused);

  if (!paused) return null;

  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Game Paused">
      <div className="pause-overlay__panel">
        <p className="pause-overlay__eyebrow">Paused</p>
        <h2 className="pause-overlay__title">Game Paused</h2>

        <div className="pause-overlay__actions">
          {/*
            Resume carries `--primary`, and it is the only one that does. Three
            buttons with equal weight is a list; one emphasised is a menu with
            an obvious default, which is what a pause panel wants — the player
            is nearly always here to carry on.
          */}
          <button
            type="button"
            className="pause-overlay__button pause-overlay__button--primary"
            autoFocus
            onClick={() => GameEvents.emit('ui:pause', { paused: false })}
          >
            Resume
          </button>
          {/*
            `ButtonPause.as:97` — "Reset" restarts the level in place. The scene
            owns the level's identity (world, level, difficulty, loadout), so
            this asks it to restart rather than passing those back in from here;
            React holds no copy of them and should not start doing so.
          */}
          <button
            type="button"
            className="pause-overlay__button"
            onClick={() => GameEvents.emit('ui:goto', { key: SceneKeys.Gameplay })}
          >
            Reset Level
          </button>
          <button
            type="button"
            className="pause-overlay__button"
            onClick={() => GameEvents.emit('ui:goto', { key: SceneKeys.LevelSelect })}
          >
            Quit Level
          </button>
        </div>

        {/* The keys that got them here, so the panel teaches its own shortcut. */}
        <p className="pause-overlay__hint">
          Press <kbd className="pause-overlay__key">P</kbd> or{' '}
          <kbd className="pause-overlay__key">Esc</kbd> to resume
        </p>
      </div>
    </div>
  );
}
