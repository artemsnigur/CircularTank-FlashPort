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
import { ChromeArt } from './ChromeArt';
import type { ChromeClipName } from './ChromeArt';
import type { NavDestination } from '../game/ui/navTabs';

export function ScreenShell({
  title,
  titleClip,
  nav,
  className,
  children,
}: {
  /** The screen's name, and the title art's accessible name. */
  title: string;
  titleClip: ChromeClipName;
  /** Which nav item is current, or null for a screen outside the bar. */
  nav: NavDestination | null;
  className?: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className={className ? `screen-shell ${className}` : 'screen-shell'}>
      <header className="screen-shell__bar">
        {/* `IconShield` sits at the bar's left in every screenshot. Frame 1 is
            its resting state; the other two are the states `ScreenLevelSelect`
            drives from world progress, which is T157's business. */}
        <ChromeArt clip="IconShield" frame={1} className="screen-shell__shield" />
        <ChromeArt clip={titleClip} label={title} className="screen-shell__title" />
      </header>

      <div className="screen-shell__body">{children}</div>

      {nav === null ? null : <BottomNav current={nav} />}
    </div>
  );
}
