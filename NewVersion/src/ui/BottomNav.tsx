/**
 * The bottom navigation bar — `BottomBar.as`, the whole row.
 *
 * ── Its own geometry, from the source ─────────────────────────────────────
 * `BottomBar.added` places the two wide tabs at x 5 and 209 — 204 apart, on a
 * 200-wide button — and then runs the icon buttons at a **45px pitch** from
 * 413: Achievements 413, Enemies 458, Premium 503, Menu 548, Options 593. The
 * port drops Premium with the rest of the monetisation surface, so the row
 * keeps its pitch and loses one icon.
 *
 * ── Hover and press are CSS, not state ────────────────────────────────────
 * Each button stacks its rest, hover and pressed frames and cross-fades them
 * with `:hover` / `:active`. Three images instead of one, and in exchange
 * there is no React state, no re-render on pointer move, and the keyboard's
 * `:focus-visible` gets the hover art for free — which a `useState`
 * implementation would have had to remember to do.
 */
import { GameEvents } from '../game/events/GameEvents';
import { ChromeArt } from './ChromeArt';
import type { ChromeClipName } from './ChromeArt';
import { MENU_FRAMES, isNavigable, navFrames } from '../game/ui/navTabs';
import type { NavDestination } from '../game/ui/navTabs';
import type { SceneKey } from '../game/config/constants';

/** Which scene each destination opens. */
const SCENE_FOR: Readonly<Record<NavDestination, SceneKey>> = {
  Upgrades: 'Upgrades',
  LevelSelect: 'LevelSelect',
  Achievements: 'Achievements',
  Enemies: 'Bestiary',
  Options: 'Options',
};

const CLIP_FOR: Readonly<Record<NavDestination, ChromeClipName>> = {
  Upgrades: 'ButtonUpgrades',
  LevelSelect: 'ButtonLevelSelect',
  Achievements: 'ButtonAchievements',
  Enemies: 'ButtonEnemies',
  Options: 'ButtonOptions',
};

/** `BottomBar.as:51-68` — the icon row, in its own left-to-right order. */
const ICONS: readonly NavDestination[] = ['Achievements', 'Enemies', 'Options'];

function NavButton({
  clip,
  label,
  frames,
  current,
  onClick,
  wide,
}: {
  clip: ChromeClipName;
  label: string;
  frames: { rest: number; hover: number; pressed: number; current?: number };
  current: boolean;
  onClick: () => void;
  wide?: boolean;
}): React.ReactElement {
  const className = wide ? 'nav-button nav-button--wide' : 'nav-button';

  if (current) {
    // Still a button, and still focusable. `aria-current` is what says "you are
    // here"; making it `disabled` would take it out of the tab order and hide
    // the fact that this row has a current item at all.
    return (
      <button type="button" className={className} aria-current="page" aria-label={label}>
        <ChromeArt clip={clip} frame={frames.current ?? frames.rest} />
      </button>
    );
  }

  return (
    <button type="button" className={className} aria-label={label} onClick={onClick}>
      <ChromeArt clip={clip} frame={frames.rest} className="nav-button__face nav-button__face--rest" />
      <ChromeArt clip={clip} frame={frames.hover} className="nav-button__face nav-button__face--hover" />
      <ChromeArt
        clip={clip}
        frame={frames.pressed}
        className="nav-button__face nav-button__face--pressed"
      />
    </button>
  );
}

export function BottomNav({
  current,
  affordable = false,
}: {
  /** The destination the player is on, so exactly one tab marks itself. */
  current: NavDestination | null;
  /** `ButtonUpgrades`' `makeIcon` — anything affordable in the shop. */
  affordable?: boolean;
}): React.ReactElement {
  const go = (destination: NavDestination) => () =>
    GameEvents.emit('ui:goto', { key: SCENE_FOR[destination] });

  const tab = (destination: NavDestination, label: string, wide = false) => (
    <NavButton
      key={destination}
      clip={CLIP_FOR[destination]}
      label={label}
      frames={navFrames(destination, affordable)}
      current={!isNavigable(destination, current)}
      onClick={go(destination)}
      wide={wide}
    />
  );

  return (
    <nav className="bottom-nav" aria-label="Screens">
      <div className="bottom-nav__tabs">
        {tab('Upgrades', 'Upgrades', true)}
        {tab('LevelSelect', 'Level select', true)}
      </div>

      <div className="bottom-nav__icons">
        {ICONS.map((destination) => tab(destination, destination))}
        {/* Menu is last in the port and third-from-last in the AS3, where
            Premium sat between. It leads out of the bar rather than across it,
            so it has no current state to draw — `ButtonMenu` has 3 frames. */}
        <NavButton
          clip="ButtonMenu"
          label="Main menu"
          frames={MENU_FRAMES}
          current={false}
          onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
        />
      </div>
    </nav>
  );
}
