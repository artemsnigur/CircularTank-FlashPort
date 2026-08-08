/**
 * Sound and music volume — a port of `SliderObject` (`SliderObject.as`), which
 * `ScreenOptions` instantiates twice (`:38`, `:62`).
 *
 * ── What the AS3 slider actually is ───────────────────────────────────────
 * A **continuous** 0..1 value, and nothing more:
 *
 *   `:58`  `sliderValue = mouseX / sliderBar.width`   — no step, no snap
 *   `:48`  `mouseX < 0`            -> `sliderValue = 0`
 *   `:53`  `mouseX > bar.width`    -> `sliderValue = 1`
 *
 * The only rounding anywhere in the class is `:36`, `Math.round(sliderValue *
 * bar.width)`, and that is the **button's pixel position** on add — not the
 * value. Reading it as a quantised control would be wrong, which is why `step`
 * below is `any` rather than a tidy 0.05.
 *
 * `ScreenOptions.as:150-151` seeds the two from `SoundManager.soundVol` and
 * `.musicVol`, and `:256`/`:278` write them back every frame. Here the write is
 * an event instead of a per-frame assignment — `ui:set-audio` carries a partial,
 * `soundService.setAudioOption` applies and persists it, and the store is
 * refreshed from the manager. So the control shows what the audio engine holds,
 * not what was dragged, exactly as `AudioToggles` does.
 *
 * ── What is deliberately *not* ported here ────────────────────────────────
 * `ScreenOptions.as:233-278` couples each slider to its on/off toggle in both
 * directions. That coupling is **OPEN AND UNDECIDED** — see `audioOptions.ts`
 * and `docs/HANDOFF.md` §5. This control changes volume only; it does not touch
 * `soundOn`/`musicOn`, which is the port's existing shipped behaviour.
 *
 * One consequence is worth knowing rather than discovering: volume 0 with sound
 * *on* is now reachable and is silent. That is the conventional meaning of a
 * volume control and is not a defect, but the AS3 does not have that state —
 * it resolves it by forcing the toggle instead (`:237-244`).
 */
import { GameEvents } from '../game/events/GameEvents';
import { useGameStore } from '../state/gameStore';

interface SliderProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
}

function VolumeSlider({ label, value, onChange }: SliderProps): React.ReactElement {
  return (
    <label className="volume-slider">
      <span className="volume-slider__label">{label}</span>
      <input
        type="range"
        className="volume-slider__input"
        min={0}
        max={1}
        // Continuous, per `:58`. A numeric step would quantise a value the
        // original never quantises.
        step="any"
        value={value}
        aria-label={`${label} volume`}
        // `valueAsNumber` rather than parsing `value`: the string form is
        // locale-formatted in some browsers and `parseFloat` would silently
        // truncate at a comma.
        onChange={(e) => onChange(e.currentTarget.valueAsNumber)}
      />
      <span className="volume-slider__readout">{Math.round(value * 100)}%</span>
    </label>
  );
}

export function VolumeSliders(): React.ReactElement {
  const { soundVol, musicVol } = useGameStore((s) => s.audioOptions);

  return (
    <div className="volume-sliders" role="group" aria-label="Volume">
      <VolumeSlider
        label="Sound"
        value={soundVol}
        onChange={(soundVol) => GameEvents.emit('ui:set-audio', { soundVol })}
      />
      <VolumeSlider
        label="Music"
        value={musicVol}
        onChange={(musicVol) => GameEvents.emit('ui:set-audio', { musicVol })}
      />
    </div>
  );
}
