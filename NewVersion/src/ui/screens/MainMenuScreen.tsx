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
 * The pieces are still the original's own art. The wordmark is `Title`, the
 * button is `ButtonPlay`, the toggles are `ButtonToggleSound` /
 * `ButtonToggleMusic` — so the identity survives the layout change.
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
import { GameEvents } from '../../game/events/GameEvents';
import { ChromeArt } from '../ChromeArt';
import { shapeUrl } from '../../assets/registry';
import { CHROME_CLIPS } from '../../game/ui/chromeArt';

/** The menu illustration's single shape — `BackgroundMainMenu` (1322). */
const MENU_SCENE_SHAPE = CHROME_CLIPS.BackgroundMainMenu.frames[0].layers[0].shape;

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

      {/* The wordmark, floating over the sky with a drop shadow to lift it. */}
      <ChromeArt clip="TitleMainMenu" label="Circular Tank" className="menu-logo" />

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

        <button
          type="button"
          className="menu-play chrome-stack"
          aria-label={resume.level > 1 ? `Continue at level ${resume.level}` : 'Play'}
          onClick={() =>
            GameEvents.emit('ui:start-game', {
              world: resume.world,
              level: resume.level,
              difficulty,
            })
          }
        >
          <ChromeArt clip="ButtonPlay" frame={1} className="menu-play__face" />
          <ChromeArt
            clip="ButtonPlay"
            frame={2}
            className="menu-play__face chrome-art--face chrome-art--face--hover"
          />
          <ChromeArt
            clip="ButtonPlay"
            frame={3}
            className="menu-play__face chrome-art--face chrome-art--face--pressed"
          />
        </button>
      </section>
    </div>
  );
}
