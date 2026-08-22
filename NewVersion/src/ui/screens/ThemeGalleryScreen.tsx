/**
 * DEV-AID: the nine ground themes side by side, for decision `D-4`.
 *
 * The campaign redesign keeps four worlds and one theme each, so five of the
 * nine grounds are being retired. Picking which is a judgement made by eye, and
 * before this there was nowhere to make it: a theme is only visible by playing
 * into the world that uses it, and three of them sit past level 270.
 *
 * ── The tiles are drawn as DOM, at their true repeat ──────────────────────
 * Each swatch is the real texture as a `background-image` with
 * `background-size` set to the design units one repeat covers. That is the
 * honest comparison: the swatch shows *less* ground than a level does rather
 * than the same ground shrunk, so tile scale, seam quality and feature size all
 * read the way they will in play. Scaling the image to fit the cell would make
 * every theme look equally fine-grained, which is the one thing the decision
 * turns on.
 *
 * `Desert` is the exception worth expecting: it is the 1024 upscale at tile
 * scale 0.25, so it covers the same 256 units as the other eight and simply
 * resolves sharper. The `repeat` column states that rather than leaving it to
 * be noticed.
 *
 * ── Facts come from `devThemes.ts` ────────────────────────────────────────
 * Which worlds use a theme, how many levels, and what scatters on it are all
 * derived from the level table and `THEME_PROPS`. Nothing here is transcribed.
 */
import { useGameStore } from '../../state/gameStore';
import { GameEvents } from '../../game/events/GameEvents';
import { themeCards } from '../../game/levels/devThemes';
import { devLevelForTheme, DEV_THEME_ENEMY_COUNT, DEV_WORLD } from '../../game/levels/devLevels';
import { SAMPLE_IMAGES } from '../../assets/manifest';

/** Texture key -> bundled URL, so a swatch can name the same asset the game loads. */
const IMAGE_URLS: Readonly<Record<string, string>> = Object.fromEntries(
  SAMPLE_IMAGES.map((asset) => [asset.key, asset.url]),
);

export function ThemeGalleryScreen(): React.ReactElement | null {
  const activeScene = useGameStore((s) => s.activeScene);
  const difficulty = useGameStore((s) => s.difficulty);
  if (activeScene !== 'ThemeGallery') return null;

  const cards = themeCards();

  return (
    <div className="screen screen--themes">
      <header className="screen__header">
        <button
          type="button"
          className="menu__button menu__button--ghost"
          onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
        >
          ‹ Menu
        </button>
        <h2 className="screen__title">Ground themes</h2>
        <span className="themes__totals">{cards.length} themes · keeping 4</span>
      </header>

      <p className="screen__hint">
        Each swatch is the real tile at the size the game draws it, so it shows a window onto
        the ground rather than a shrunken copy. <strong>View ›</strong> opens an empty{' '}
        900×720 arena on that theme with the real props and {DEV_THEME_ENEMY_COUNT} enemies,
        so you can judge whether things read against it.
      </p>

      <ul className="themes__grid">
        {cards.map((card) => {
          const url = IMAGE_URLS[card.groundKey];
          const level = devLevelForTheme(card.theme);
          return (
            <li key={card.theme} className="themes__card">
              <div
                className="themes__swatch"
                role="img"
                aria-label={`${card.theme} ground tile`}
                style={{
                  backgroundImage: url ? `url(${url})` : undefined,
                  // The repeat in design units. The swatch is sized in CSS
                  // pixels, so this is only approximately the on-screen scale —
                  // what it preserves exactly is the *ratio* between the nine.
                  backgroundSize: `${card.repeatUnits}px ${card.repeatUnits}px`,
                }}
              />
              <div className="themes__meta">
                <h3 className="themes__name">{card.theme}</h3>
                <p className="themes__where">
                  {card.worlds.length > 0
                    ? `World ${card.worlds.join(', ')} · ${card.levels} levels`
                    : 'unused by any world'}
                </p>
                <p className="themes__props">
                  {card.props.length > 0
                    ? card.props
                        .map((p) => `${p.type} ${Math.round(p.share * 100)}%`)
                        .join(' · ')
                    : 'no props'}
                </p>
                <p className="themes__repeat">
                  repeat {card.repeatUnits}u · tile ×{card.tileScale}
                  {card.tileScale !== 1 ? ' (upscaled)' : ''} · {card.perTile[0]}–
                  {card.perTile[1]} props/tile
                </p>
              </div>
              {level !== null && (
                <button
                  type="button"
                  className="themes__view"
                  title={`Walk around a ${card.theme} arena`}
                  onClick={() =>
                    GameEvents.emit('ui:start-game', {
                      world: DEV_WORLD,
                      level,
                      difficulty,
                      // Keeps the visit out of the save, exactly as the enemy
                      // test levels do — the sentinel world alone does not.
                      sandbox: true,
                    })
                  }
                >
                  View ›
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
