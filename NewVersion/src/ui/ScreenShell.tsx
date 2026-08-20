/**
 * The furniture every menu screen sits inside — title bar, shield, sheen and
 * the bottom navigation.
 *
 * ── One component because the original has one arrangement ────────────────
 * `ScreenLevelSelect`, `ScreenUpgrades`, `ScreenEnemies`, `ScreenAchievements`
 * and `ScreenOptions` each add the same three things in the same order
 * (`ScreenLevelSelect.as:385-401` is the template): the black title bar, the
 * screen's own title art over it, and a `BottomBar`. Building that five times
 * is how the five drift apart.
 *
 * ── What is art and what is CSS ───────────────────────────────────────────
 * The bar, the shield and the title are `ChromeArt` — the original's own
 * shapes. The *layout* around them is CSS, because this port is responsive by
 * decision and the AS3's coordinates describe a 640x480 cabinet it does not
 * have. So the bar spans the viewport rather than 640 units, and the title
 * sits in it at the same proportion.
 *
 * The sheen is `BackgroundSquareBig` as a token rather than as art: it is one
 * radial gradient, it has to stretch to whatever the viewport is, and a
 * gradient does that natively where a fixed-size SVG would need a second
 * scaling rule for no gain.
 */
import { BottomNav } from './BottomNav';
import { GameEvents } from '../game/events/GameEvents';
import { TypeTitle } from './TypeTitle';
import { ChromeArt } from './ChromeArt';
import type { ChromeClipName } from './ChromeArt';
import type { NavDestination } from '../game/ui/navTabs';

export function ScreenShell({
  title,
  titleClip,
  nav,
  shield = true,
  typeTitle = false,
  className,
  children,
}: {
  /** The screen's name, and the title art's accessible name. */
  title: string;
  titleClip: ChromeClipName;
  /** Which nav item is current, or null for a screen outside the bar. */
  nav: NavDestination | null;
  /**
   * `IconShield` at the bar's left.
   *
   * True everywhere but the main menu, which the original heads with its own
   * title bar and no crest — the shield belongs to the screens *inside* the
   * game, and putting one on the menu would invent a badge the original does
   * not draw there.
   */
  shield?: boolean;
  /**
   * Set the title in type instead of drawing `titleClip`.
   *
   * **Opt-in per screen, deliberately.** The screens are being polished one at
   * a time and the two treatments are meant to coexist meanwhile; a global
   * switch would have restyled four screens nobody had looked at. The clip is
   * still required either way, so a screen can be flipped back by removing one
   * prop rather than by finding its art again.
   */
  typeTitle?: boolean;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className={className ? `screen-shell ${className}` : 'screen-shell'}>
      <header className="screen-shell__bar">
        {/*
          ── The shield is the way home, T207 ──────────────────────────────
          It was decoration — `IconShield` at the bar's left, drawn and no
          more. T204 took the Main menu button out of the dock, which left the
          crest as the one thing on every screen that *looks* like a badge and
          does nothing, while the route home lived two clicks away in options.

          So the crest is the button. It is the top-left corner of a game,
          which is where a player already reaches to go home, and it needs no
          room in the layout because it was already there.

          Frame 1 is its resting state; the other two are the states
          `ScreenLevelSelect` drives from world progress.
        */}
        {shield && (
          <button
            type="button"
            className="screen-shell__shield-button"
            aria-label="Main menu"
            onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
          >
            <ChromeArt clip="IconShield" frame={1} className="screen-shell__shield" />
          </button>
        )}
        {typeTitle ? (
          <TypeTitle text={title} as="h1" className="screen-shell__type" />
        ) : (
          <ChromeArt clip={titleClip} label={title} className="screen-shell__title" />
        )}
      </header>

      <div className="screen-shell__body">{children}</div>

      {nav === null ? null : <BottomNav current={nav} />}
    </div>
  );
}
