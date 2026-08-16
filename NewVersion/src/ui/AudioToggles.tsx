/**
 * Sound and music on/off.
 *
 * Port of `ButtonToggleSound` / `ButtonToggleMusic`, which the AS3 places in
 * `PartInterface` — the in-game HUD, not only an options screen — so this
 * renders in both the main menu and the HUD.
 *
 * State comes from the store, which the bridge fills from `audio:options`,
 * which the scene publishes from `SoundManager`. React never reads the manager:
 * it lives in the Phaser registry, and the bus is the only sanctioned crossing.
 *
 * Emitting `ui:set-audio` rather than flipping a local boolean is what makes
 * this a control instead of a display. The scene applies it to the manager,
 * persists it to `CircularTankOptions`, and republishes — so the button
 * reflects what the audio engine actually holds, not what was clicked.
 *
 * ── The state is in the artwork ───────────────────────────────────────────
 * T160 swapped the emoji for the original's own clips, whose four frames are a
 * 2x2 of state and hover (`ButtonToggleSound.as:55-83`) — so "off" needs no
 * styling of its own, and the label moves to the accessible name because the
 * picture is the label. `toggleFrame` owns which frame that is, beside the two
 * other frame conventions it must not be confused with.
 */
import { GameEvents } from '../game/events/GameEvents';
import { useGameStore } from '../state/gameStore';
import { ChromeArt } from './ChromeArt';
import type { ChromeClipName } from './ChromeArt';
import { toggleFrame, toggleHoverFrame } from '../game/ui/navTabs';

function Toggle({
  clip,
  on,
  label,
  onClick,
}: {
  clip: ChromeClipName;
  on: boolean;
  label: string;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      className="audio-toggles__button chrome-stack"
      aria-pressed={on}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <ChromeArt clip={clip} frame={toggleFrame(on)} className="audio-toggles__face" />
      <ChromeArt
        clip={clip}
        frame={toggleHoverFrame(on)}
        className="audio-toggles__face chrome-art--face chrome-art--face--hover"
      />
    </button>
  );
}

export function AudioToggles(): React.ReactElement {
  const { soundOn, musicOn } = useGameStore((s) => s.audioOptions);

  return (
    <div className="audio-toggles" role="group" aria-label="Audio">
      <Toggle
        clip="ButtonToggleSound"
        on={soundOn}
        label={soundOn ? 'Mute sound effects' : 'Unmute sound effects'}
        onClick={() => GameEvents.emit('ui:set-audio', { soundOn: !soundOn })}
      />
      <Toggle
        clip="ButtonToggleMusic"
        on={musicOn}
        label={musicOn ? 'Mute music' : 'Unmute music'}
        onClick={() => GameEvents.emit('ui:set-audio', { musicOn: !musicOn })}
      />
    </div>
  );
}
