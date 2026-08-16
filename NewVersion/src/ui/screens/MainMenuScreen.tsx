/**
 * The main menu — a **fixed 4:3 stage**, not a responsive layout.
 *
 * ── Why this one screen is rigid ──────────────────────────────────────────
 * Every other screen here is responsive by decision, and that stands for them.
 * The menu is the exception: it is a *composition* — a black band carrying the
 * wordmark, an illustration with a hard right edge, and a save area beside it
 * — and reflowing those pieces produces a different picture rather than the
 * same picture at another size. The first attempt treated the scene as a
 * widescreen backdrop with glass panels floating over it, which is a modern
 * reading of the original and not the original.
 *
 * So the whole menu is one 4:3 box, letterboxed in black, with every element
 * placed as a percentage of it. The proportions come off the reference capture
 * and off `ScreenMenu.as`, and the two agree: `BackgroundTitle` is 640x88 on a
 * 640x480 stage — **18.3%** — and `bgSquareMenu.y = bgTitle.height` puts the
 * content directly beneath it.
 *
 * ── The save area is two columns, as the original has ─────────────────────
 * `ONLINE SAVES` and `LOCAL SAVES`, side by side. The online half is not
 * ported (`A26`: it needs an Armor Games account system), so its column keeps
 * its place and says so rather than being deleted — deleting it would leave
 * the right block half empty and the composition wrong.
 *
 * The local column lists the **real slots**, which is what the original does.
 * `SlotSummary` already carries the slot number, its progress line and its
 * timestamp; an empty slot reads `NEW GAME`.
 */
import { useGameStore } from '../../state/gameStore';
import { AudioToggles } from '../AudioToggles';
import { GameEvents } from '../../game/events/GameEvents';
import { DEV_COMBINED_LEVEL, DEV_WORLD } from '../../game/levels/devLevels';
import { ChromeArt } from '../ChromeArt';
import { shapeUrl } from '../../assets/registry';
import { CHROME_CLIPS } from '../../game/ui/chromeArt';

/** The menu illustration's single shape — `BackgroundMainMenu` (1322). */
const MENU_SCENE_SHAPE = CHROME_CLIPS.BackgroundMainMenu.frames[0].layers[0].shape;

/** One save slot, as a chunky full-width block in the local column. */
function SlotBlock({
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
    <div className="stage-slot">
      <button
        type="button"
        className="stage-slot__body"
        aria-label={hasData ? `Load slot ${slot}, ${progress ?? ''}` : `New game in slot ${slot}`}
        onClick={() => GameEvents.emit('ui:select-slot', { slot })}
      >
        {hasData ? (
          <>
            <span className="stage-slot__name">Slot {slot}</span>
            <span className="stage-slot__line">{progress}</span>
            <span className="stage-slot__line stage-slot__line--dim">{dateTime}</span>
          </>
        ) : (
          <span className="stage-slot__name stage-slot__name--empty">New game</span>
        )}
      </button>

      {/* The red cross — `ButtonSaveDelete`, top-right of a filled slot. */}
      {hasData && (
        <button
          type="button"
          className="stage-slot__delete"
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
    <div className="stage-frame">
      <div className="stage">
        {/* The black band and the wordmark filling it — `BackgroundTitle`
            (640x88) with `Title` centred at x 320, `ScreenMenu.as:224`. */}
        <header className="stage__band">
          <ChromeArt clip="TitleMainMenu" label="Circular Tank" className="stage__title" />
        </header>

        {/*
          The illustration, with a hard right edge. It does **not** run behind
          the save area: the original composes two solid blocks, and stretching
          the art across both is what made the previous attempt read as
          wallpaper.
        */}
        <div
          className="stage__scene"
          style={{ backgroundImage: `url(${shapeUrl(`${MENU_SCENE_SHAPE}.svg`)})` }}
        >
          {/* `ButtonToggleSound` / `ButtonToggleMusic`, over the sky at the
              scene's top-left and much larger than a HUD control. */}
          <div className="stage__toggles">
            <AudioToggles />
          </div>
        </div>

        <div className="stage__saves">
          {/* ── Online saves — the column stays, the feature is not ported ── */}
          <section className="stage-col">
            <h2 className="stage-col__head">Online saves</h2>
            <div className="stage-col__body">
              <p className="stage-col__note">Online saves are not part of this port.</p>
              <p className="stage-col__sub">
                The original kept them against an Armor Games account.
              </p>

              <button
                type="button"
                className="stage-play chrome-stack"
                aria-label={resume.level > 1 ? `Continue at level ${resume.level}` : 'Play'}
                onClick={() =>
                  GameEvents.emit('ui:start-game', {
                    world: resume.world,
                    level: resume.level,
                    difficulty,
                  })
                }
              >
                <ChromeArt clip="ButtonPlay" frame={1} className="stage-play__face" />
                <ChromeArt
                  clip="ButtonPlay"
                  frame={2}
                  className="stage-play__face chrome-art--face chrome-art--face--hover"
                />
                <ChromeArt
                  clip="ButtonPlay"
                  frame={3}
                  className="stage-play__face chrome-art--face chrome-art--face--pressed"
                />
              </button>
            </div>
          </section>

          {/* ── Local saves — the real slots ─────────────────────────────── */}
          <section className="stage-col stage-col--local">
            <h2 className="stage-col__head">Local saves</h2>
            <div className="stage-col__body stage-col__body--slots">
              {(slots ?? []).map((entry) => (
                <SlotBlock
                  key={entry.slot}
                  slot={entry.slot}
                  hasData={entry.hasData}
                  progress={entry.progress}
                  dateTime={entry.dateTime}
                />
              ))}
            </div>
          </section>
        </div>

        {/*
          Dev affordances only, and only in dev.

          **The secondary navigation is gone.** The original's menu has none:
          PLAY is the only way in, and the in-game bottom bar reaches every
          screen the cluster used to list. Options stays here behind the dev
          guard so a developer can reach it without starting a level.
        */}
        {import.meta.env.DEV && (
          <div className="stage__dev">
            <button
              type="button"
              className="chrome-pill"
              onClick={() => GameEvents.emit('ui:goto', { key: 'Enemies' })}
            >
              Dev: enemies
            </button>
            <button
              type="button"
              className="chrome-pill"
              onClick={() =>
                GameEvents.emit('ui:start-game', {
                  world: DEV_WORLD,
                  level: DEV_COMBINED_LEVEL,
                  difficulty,
                  sandbox: true,
                })
              }
            >
              Dev: all enemies
            </button>
            <button
              type="button"
              className="chrome-pill"
              onClick={() => GameEvents.emit('ui:goto', { key: 'Options' })}
            >
              Options
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
