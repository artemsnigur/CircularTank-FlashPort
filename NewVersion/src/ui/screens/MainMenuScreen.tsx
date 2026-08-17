/**
 * The main menu — a full-bleed wallpaper with floating elements over it.
 *
 * ── A deliberate change of direction ──────────────────────────────────────
 * This replaces a rigid 4:3 clone of the original's composition. That version
 * reproduced the Flash layout exactly — black band, hard-edged illustration,
 * two solid save columns — and the direction has moved on: the picture now
 * fills the window and the controls float over it as a premium menu, rather
 * than the game sitting letterboxed inside a frame.
 *
 * ── The wordmark and PLAY are CSS, the toggles are still art ──────────────
 * T165 replaced two of the extracted clips with type and gradients: `Title`
 * and `ButtonPlay` are no longer rendered here. Both were raster-free already,
 * but a fixed-size SVG still has a fixed size, and the menu now runs from a
 * phone to a 2K display. Text and gradients resolve at whatever the device
 * gives them.
 *
 * The toggles are **deliberately** still `ChromeArt` — a speaker and a note
 * are drawings, not type, and reproducing them in CSS would be tracing rather
 * than styling. Recorded as `A28`.
 *
 * The wordmark is two stacked copies of the same text and that is not
 * decoration: `background-clip: text` needs `color: transparent`, which makes
 * a `text-shadow` on the same element show *through* the glyphs instead of
 * behind them. So the lower copy carries the extrusion and the upper one
 * carries the metal. The upper is `aria-hidden`, or the heading would announce
 * itself twice.
 *
 * ── One thing here is not a style choice ──────────────────────────────────
 * The wallpaper is painted as a **background image**, not an `<img>` with
 * `object-fit: cover`. The extracted SVGs carry `width`/`height` but no
 * `viewBox`, and their drawing fills only the middle ~63% of the canvas —
 * measured, in T163 — so an `<img>` letterboxes the picture however it is
 * sized, which is exactly the black banding this layout exists to remove. A
 * background with an explicit size has no such second opinion. Recorded as
 * `A27`.
 */
import { useGameStore } from '../../state/gameStore';
import { AudioToggles } from '../AudioToggles';
import { TypeTitle } from '../TypeTitle';
import { GameEvents } from '../../game/events/GameEvents';
import { shapeUrl } from '../../assets/registry';
import { CHROME_CLIPS } from '../../game/ui/chromeArt';

/** The menu illustration's single shape — `BackgroundMainMenu` (1322). */
const MENU_SCENE_SHAPE = CHROME_CLIPS.BackgroundMainMenu.frames[0].layers[0].shape;

/**
 * The game's name, as the original sets it — `ScreenMenu.as` draws `Title` in
 * caps. One constant so the two stacked copies cannot drift apart.
 */
const WORDMARK = 'CIRCULAR TANK';

/** One save slot, as a clean sub-box inside the floating card. */
function SlotBox({
  slot,
  hasData,
  progress,
  dateTime,
}: {
  slot: number;
  hasData: boolean;
  progress?: string;
  dateTime?: string;
}): React.ReactElement {
  return (
    <div className="menu-slot">
      <button
        type="button"
        className="menu-slot__body"
        aria-label={hasData ? `Load slot ${slot}, ${progress ?? ''}` : `New game in slot ${slot}`}
        onClick={() => GameEvents.emit('ui:select-slot', { slot })}
      >
        <span className="menu-slot__name">Slot {slot}</span>
        {hasData ? (
          <>
            <span className="menu-slot__line">{progress}</span>
            <span className="menu-slot__line menu-slot__line--dim">{dateTime}</span>
          </>
        ) : (
          <span className="menu-slot__line menu-slot__line--dim">New game</span>
        )}
      </button>

      {hasData && (
        <button
          type="button"
          className="menu-slot__delete"
          aria-label={`Delete slot ${slot}`}
          onClick={() => GameEvents.emit('ui:delete-slot', { slot })}
        >
          ✕
        </button>
      )}
    </div>
  );
}

export function MainMenuScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const slotPickerOpen = useGameStore((s) => s.slotPickerOpen);
  const phase = useGameStore((s) => s.phase);
  const resumePoint = useGameStore((s) => s.resumePoint);
  const slots = useGameStore((s) => s.slotList);
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
    <div className="menu-screen">
      {/* Full-bleed wallpaper, behind everything. */}
      <div
        className="menu-wallpaper"
        style={{ backgroundImage: `url(${shapeUrl(`${MENU_SCENE_SHAPE}.svg`)})` }}
      />

      {/*
        The wordmark, floating over the sky.

        Two copies: the lower one is the extruded body and owns the accessible
        name, the upper one is the metal and is hidden from the tree. See the
        header — they cannot be one element.
      */}
      <TypeTitle text={WORDMARK} className="menu-title" />

      <div className="menu-toggles">
        <AudioToggles />
      </div>

      {/*
        The floating card.

        `ONLINE SAVES` is gone entirely rather than kept as an empty column
        explaining itself: the feature is not ported, and a panel whose only
        content is that news was carrying it for nobody.
      */}
      <section className="menu-card" aria-label="Local saves">
        <h2 className="menu-card__title">Local saves</h2>

        <div className="menu-card__slots">
          {(slots ?? []).map((entry) => (
            <SlotBox
              key={entry.slot}
              slot={entry.slot}
              hasData={entry.hasData}
              progress={entry.progress}
              dateTime={entry.dateTime}
            />
          ))}
        </div>

        {/*
          PLAY, in CSS. The label is a child rather than bare text so it can
          sit above the specular sweep, which is a pseudo-element on the
          button itself.
        */}
        <button
          type="button"
          className="menu-play gloss-pill"
          aria-label={resume.level > 1 ? `Continue at level ${resume.level}` : 'Play'}
          onClick={() =>
            GameEvents.emit('ui:start-game', {
              world: resume.world,
              level: resume.level,
              difficulty,
            })
          }
        >
          <span className="menu-play__label">{resume.level > 1 ? 'Continue' : 'Play'}</span>
        </button>
      </section>
    </div>
  );
}
