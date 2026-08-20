/**
 * Options — `ScreenOptions.as`.
 *
 * ── What is deliberately absent ───────────────────────────────────────────
 * The AS3 has eight controls. Four are **not** on this screen, and the reasons
 * differ enough to be worth separating:
 *
 *   - **Graphics quality** (`ButtonOptionGraphics.as:93-101`) sets
 *     `stage.quality`, Flash's vector rasterisation setting. This port
 *     rasterises SVG at load and renders through WebGL; there is no runtime
 *     equivalent, so the control would change nothing. Recorded in
 *     `gameplayOptions.ts` as not applicable.
 *   - **Difficulty** — the AS3 puts the Easy/Medium/Hard triplet here as well
 *     as on level select. This port has it on level select only, where it sits
 *     beside the medals it decides and the progress slot it writes to. Two
 *     places to set one value is how they drift.
 *   - **Save conversion** migrates between local and Kongregate online slots;
 *     the third-party surface is out of scope.
 *   - **`windowUL`** — divergence `A11`. The key is still read and written so
 *     an existing player's value survives; only the row is gone.
 *
 * ── The audio switches here are not `AudioToggles` ────────────────────────
 * `AudioToggles` draws `ButtonToggleSound`/`ButtonToggleMusic`, the original's
 * own art, and it lives in the HUD and the main menu — the places the AS3 puts
 * them (`PartInterface`), where the picture *is* the label. This screen was
 * restyled in T187 and uses the same switch its five preference rows use, so
 * seven controls that do the same kind of thing look like it.
 *
 * **That is a presentation difference, not a second implementation.** Both
 * emit `ui:set-audio`, both read `audioOptions` from the store, and neither
 * holds any state — there is no rule here to keep in two places.
 */
import { useState } from 'react';

import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';
import { ScreenShell } from '../ScreenShell';
import { VolumeSliders } from '../VolumeSliders';
import type { GameplayOptions } from '../../game/options/gameplayOptions';

/** Label and explanation per preference, in `ScreenOptions`' own order. */
const CONTROLS: { key: keyof GameplayOptions; label: string; hint: string }[] = [
  { key: 'crosshair', label: 'Crosshair', hint: 'Draw the aiming crosshair.' },
  { key: 'autoPause', label: 'Auto-pause', hint: 'Pause when the window loses focus.' },
  // `ButtonLevelGuideAutoSelect.as:60` states what it does, verbatim:
  // "Automatically selects the upcoming level for the level guide and the level
  // select screen." It **never starts a level** — it decides where the guide
  // points and whether a manual pick writes back into it
  // (`ScreenLevelSelect.as:988`, `:1326`, both gated on `!autoSelect`).
  {
    key: 'autoSelect',
    label: 'Auto-select level',
    hint: 'Point the level guide at the upcoming level.',
  },
  {
    key: 'achievementPopUp',
    label: 'Achievement pop-ups',
    hint: 'Show a notice when one is earned.',
  },
  { key: 'tutorialOn', label: 'Tutorial', hint: 'Show the hints for a new player.' },
];

/**
 * One switch — a track and a knob, `role="switch"`.
 *
 * Used by all seven rows on this screen, which is the point: five preferences
 * and two audio channels are the same kind of control and reading as one thing
 * is worth more than matching the AS3's two different widgets for them.
 */
function OptionSwitch({
  on,
  label,
  hint,
  onToggle,
}: {
  on: boolean;
  label: string;
  hint?: string;
  onToggle: () => void;
}): React.ReactElement {
  return (
    <li className="options__row">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        className={`options__switch${on ? ' options__switch--on' : ''}`}
        onClick={onToggle}
      >
        <span className="options__text">
          <span className="options__label">{label}</span>
          {hint !== undefined && <span className="options__hint">{hint}</span>}
        </span>
        {/* The track is `aria-hidden` — `role="switch"` plus `aria-checked` on
            the button already carries the state, and announcing the picture
            would say it twice. */}
        <span className="options__track" aria-hidden="true">
          <span className="options__knob" />
        </span>
      </button>
    </li>
  );
}

export function OptionsScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const options = useGameStore((s) => s.gameplayOptions);
  const audio = useGameStore((s) => s.audioOptions);
  /*
   * The reset button's second step. Local state, because it is a question
   * being asked rather than a fact about the game — nothing outside this
   * screen has any use for "the player is looking at a confirmation".
   *
   * Two steps at all because the AS3's own delete control has them
   * (`ButtonGameSave` flips the row into "Delete slot?" before acting), and
   * this is the only irreversible button on the screen.
   */
  const [confirming, setConfirming] = useState(false);
  if (activeScene !== 'Options') return null;

  const setOption = (key: keyof GameplayOptions): void => {
    // A partial, so a toggle names only what it changed and cannot rewrite the
    // other four with values read before someone else changed them.
    GameEvents.emit('ui:set-option', { [key]: !options[key] });
  };

  return (
    <ScreenShell
      title="Options"
      titleClip="TitleOptions"
      typeTitle
      nav="Options"
      className="screen--options"
    >
      <div className="options">
        <section className="options__card" aria-label="Game">
          <h3 className="options__subtitle">Game</h3>
          <ul className="options__list">
            {CONTROLS.map(({ key, label, hint }) => (
              <OptionSwitch
                key={key}
                on={options[key]}
                label={label}
                hint={hint}
                onToggle={() => setOption(key)}
              />
            ))}
          </ul>
        </section>

        <section className="options__card" aria-label="Sound">
          <h3 className="options__subtitle">Sound</h3>
          <ul className="options__list">
            <OptionSwitch
              on={audio.soundOn}
              label="Sound effects"
              onToggle={() => GameEvents.emit('ui:set-audio', { soundOn: !audio.soundOn })}
            />
            <OptionSwitch
              on={audio.musicOn}
              label="Music"
              onToggle={() => GameEvents.emit('ui:set-audio', { musicOn: !audio.musicOn })}
            />
          </ul>

          {/*
            `ScreenOptions.as:38`, `:62` — the options screen is where the AS3
            puts both sliders.
          */}
          <VolumeSliders />

          {/*
            Exit to Menu, directly above Reset options — T202.

            It was only in the dock's bottom-right corner, which is where every
            screen's global navigation lives. On this screen it reads as
            disconnected from the settings it sits beside, so it moves into the
            list and the dock drops its copy. One action, one place, which is
            the same rule the auto-pause checkbox and the audio toggles follow.

            Same `gloss-pill options__reset` sizing as the button below it, so
            the two read as one stack rather than as a button and a visitor.
          */}
          <div className="options__exit">
            <button
              type="button"
              className="gloss-pill options__reset options__exit-button"
              onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
            >
              <span className="options__reset-label">Exit to Menu</span>
            </button>
          </div>

          <div className="options__danger">
            <p className="options__danger-note">
              {confirming
                ? 'Every setting on this screen goes back to its default. Your progress is not touched.'
                : 'Restore the default settings.'}
            </p>
            {confirming ? (
              <div className="options__danger-actions">
                <button
                  type="button"
                  className="gloss-pill options__reset options__reset--confirm"
                  onClick={() => {
                    GameEvents.emit('ui:reset-options', {});
                    setConfirming(false);
                  }}
                >
                  <span className="options__reset-label">Yes, reset</span>
                </button>
                <button
                  type="button"
                  className="gloss-pill options__reset"
                  onClick={() => setConfirming(false)}
                >
                  <span className="options__reset-label">Cancel</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="gloss-pill options__reset options__reset--danger"
                onClick={() => setConfirming(true)}
              >
                <span className="options__reset-label">Reset options</span>
              </button>
            )}
          </div>
        </section>
      </div>
    </ScreenShell>
  );
}
