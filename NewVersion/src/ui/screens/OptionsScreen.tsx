/**
 * Options — `ScreenOptions.as`.
 *
 * Six checkboxes plus the audio pair. The AS3 has eight controls; two are
 * **not applicable** to this port and their reasons live in
 * `game/options/gameplayOptions.ts` rather than here:
 *
 *   - graphics quality — `stage.quality`, a Flash rasterisation setting with
 *     no WebGL equivalent
 *   - save conversion — migrates between local and Kongregate online slots,
 *     and the third-party surface is out of scope
 *
 * ── The audio toggles are reused, not reimplemented ───────────────────────
 * `AudioToggles` already owns sound and music: it emits `ui:set-audio`,
 * `soundService` persists to the same `CircularTankOptions` store, and it
 * republishes. This screen renders the same component rather than a second
 * copy, so the two cannot disagree about the current state.
 *
 * It keeps its place in the main menu too. The AS3 puts every option on one
 * screen, but the menu toggles are the only audio control a player has *during*
 * a session, and removing them to satisfy the original's layout would take a
 * working affordance away. Recorded as a deliberate addition rather than
 * quietly kept.
 */
import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';
import { ScreenShell } from '../ScreenShell';
import { AudioToggles } from '../AudioToggles';
import { VolumeSliders } from '../VolumeSliders';
import type { GameplayOptions } from '../../game/options/gameplayOptions';

/** Label and explanation per preference, in `ScreenOptions`' own order. */
const CONTROLS: { key: keyof GameplayOptions; label: string; hint: string }[] = [
  { key: 'crosshair', label: 'Crosshair', hint: 'Draw the aiming crosshair.' },
  { key: 'autoPause', label: 'Auto-pause', hint: 'Pause when the window loses focus.' },
  // **No `windowUL` row — divergence `A11`.** "UL" is *Upgrade Limit*, not
  // upper-left: `ScreenLevelSelect.as:1001`/`:1024` and `ButtonNextLevel.as:123`
  // /`:147` gate the "Upgrade Limit" warning window on it, and its "don't show
  // this again" checkbox is this flag. That mechanic is deliberately not ported
  // (`A11`), so the toggle governed nothing. The key is still read and written
  // so an existing player's stored value survives; only the row is gone.
  // `ButtonLevelGuideAutoSelect.as:60` states what it does, verbatim:
  // "Automatically selects the upcoming level for the level guide and the level
  // select screen." It **never starts a level** — it decides where the guide
  // points and whether a manual pick writes back into it
  // (`ScreenLevelSelect.as:988`, `:1326`, both gated on `!autoSelect`).
  // The previous hint, "Jump to the next level automatically", described
  // something the original does not do.
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

export function OptionsScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const options = useGameStore((s) => s.gameplayOptions);
  if (activeScene !== 'Options') return null;

  return (
    <ScreenShell title="Options" titleClip="TitleOptions" nav="Options" className="screen--options">
      <ul className="options__list">
        {CONTROLS.map(({ key, label, hint }) => (
          <li key={key} className="options__row">
            <button
              type="button"
              role="switch"
              aria-checked={options[key]}
              className="options__toggle"
              // A partial, so a toggle names only what it changed and cannot
              // rewrite the other five with values read before someone else
              // changed them.
              onClick={() => GameEvents.emit('ui:set-option', { [key]: !options[key] })}
            >
              <span className="options__box" aria-hidden="true">
                {options[key] ? '✓' : ''}
              </span>
              <span className="options__label">{label}</span>
            </button>
            <p className="options__hint">{hint}</p>
          </li>
        ))}
      </ul>

      <section className="options__audio">
        <h3 className="options__subtitle">Sound</h3>
        <AudioToggles />
        {/*
          `ScreenOptions.as:38`, `:62` — the options screen is where the AS3 puts
          both sliders. The toggles sit here *and* in the HUD, which is why they
          are a separate component and these are not.
        */}
        <VolumeSliders />
      </section>
    </ScreenShell>
  );
}
