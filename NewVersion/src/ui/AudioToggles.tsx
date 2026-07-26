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
 * persists it to `CircularTankOptions`, and republishes — so the checkbox
 * reflects what the audio engine actually holds, not what was clicked.
 */
import { GameEvents } from '../game/events/GameEvents';
import { useGameStore } from '../state/gameStore';

export function AudioToggles(): React.ReactElement {
  const { soundOn, musicOn } = useGameStore((s) => s.audioOptions);

  return (
    <div className="audio-toggles" role="group" aria-label="Audio">
      <button
        type="button"
        className={`audio-toggles__button${soundOn ? '' : ' audio-toggles__button--off'}`}
        aria-pressed={soundOn}
        title={soundOn ? 'Mute sound effects' : 'Unmute sound effects'}
        onClick={() => GameEvents.emit('ui:set-audio', { soundOn: !soundOn })}
      >
        {soundOn ? '🔊' : '🔇'} Sound
      </button>
      <button
        type="button"
        className={`audio-toggles__button${musicOn ? '' : ' audio-toggles__button--off'}`}
        aria-pressed={musicOn}
        title={musicOn ? 'Mute music' : 'Unmute music'}
        onClick={() => GameEvents.emit('ui:set-audio', { musicOn: !musicOn })}
      >
        {musicOn ? '♪' : '♩'} Music
      </button>
    </div>
  );
}
