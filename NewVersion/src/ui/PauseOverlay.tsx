/**
 * The pause panel — `PartInterface.pauseGame` (`:426-476`).
 *
 * ── It is a menu, not a "PAUSED" label ────────────────────────────────────
 * The original draws a 75%-black full-screen box, the words **Game Paused** at
 * 64pt, and three buttons: Resume (y 156), Reset Level (184), Quit Level (212),
 * plus an "Auto pause" checkbox at (266, 254). Everything is torn down again in
 * `unPauseGame` (`:797-826`).
 *
 * ── Two deliberate differences ────────────────────────────────────────────
 * **The audio toggles are not here** — divergence, recorded in the audit. The
 * AS3 puts Sound and Music buttons in this panel *and* in the HUD; this port
 * already has `AudioToggles` permanently in the HUD, so a second copy would be
 * two sets of the same control on screen at once. Nothing is lost: the controls
 * the panel exists to offer are still reachable while paused, because the HUD
 * stays mounted underneath.
 *
 * **Quit goes to level select, not the main menu.** `ButtonPause.as:105` sets
 * `Main.changeScreen = "LevelSelect"`, and quitting a level should not throw
 * the player out to the title. The HUD's own Menu button still goes to the main
 * menu, which is a different action and keeps its own destination.
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
  const autoPause = useGameStore((s) => s.gameplayOptions.autoPause);

  if (!paused) return null;

  return (
    <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Game Paused">
      <div className="pause-overlay__panel">
        <h2 className="pause-overlay__title">Game Paused</h2>

        <div className="pause-overlay__actions">
          <button
            type="button"
            className="pause-overlay__button"
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

        {/*
          `:459-462` — the checkbox is in the pause panel, and its value is the
          same option the options screen shows. Toggled through `ui:set-option`
          so it persists by the one path, rather than being written twice.
        */}
        <label className="pause-overlay__option">
          {/*
            `role` stated explicitly so the delegated button-sound listener
            matches it: `isAudible` reads `closest('[role="checkbox"]')`, which
            an implicit role does not satisfy. The AS3's checkbox is a button
            and clicks like one (`ButtonOptionCheckBox`), so silence here would
            be the divergence.
          */}
          <input
            type="checkbox"
            role="checkbox"
            checked={autoPause}
            onChange={() => GameEvents.emit('ui:set-option', { autoPause: !autoPause })}
          />
          Auto pause
        </label>
      </div>
    </div>
  );
}
