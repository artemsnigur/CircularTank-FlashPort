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
 * ── It is type on buttons now, not the extracted art ──────────────────────
 * Every button was a `ButtonUpgrades`/`ButtonEnemies`/… clip: a picture that
 * *is* the whole button, background and glyph together. Those are 40-unit
 * exports, and this bar draws at whatever height the viewport gives it — the
 * same upscale problem `A40` found behind the shop's tiles. T183 replaced them
 * with type on CSS buttons. `A41`.
 *
 * ── **This bar is a live style comparison, and it is temporary** ───────────
 * T184: the six buttons deliberately do **not** match each other. Each wears a
 * different aesthetic so they can be compared in place rather than described —
 * soft/neumorphic, flat, neon, arcade, outline and brutalist, in row order.
 * `NAV_STYLE` below is the whole of the assignment.
 *
 * **Do not "fix" the inconsistency.** It is the deliverable for this pass, and
 * exactly one of the six survives the next one, at which point `NAV_STYLE`
 * collapses to a constant and five CSS blocks are deleted. `A42` records it,
 * including the shortcut this takes: the styles are decided by *position in
 * the row* rather than by anything about the destination, which is fine for a
 * comparison and would be nonsense to keep.
 *
 * **The frame table did not go with them, and that is deliberate.**
 * `navTabs.ts` still says what the AS3 draws, and the two things it *decides*
 * are still read from it rather than restated here:
 *
 *   - **Whether a button has a "you are here" state at all.** `ButtonMenu` has
 *     three frames and no fourth (`MENU_FRAMES`), because Menu leads out of
 *     the bar rather than across it. `frames.current === undefined` is that
 *     fact, and it is what stops the Menu pill ever lighting up.
 *   - **Whether affordability changes this button.** `ButtonUpgrades` has 7
 *     frames because `makeIcon` shifts its triplet by 3 when something in the
 *     shop is within reach. `showsAffordanceHint` derives that from the table,
 *     so the hint follows the frame data rather than a hard-coded "Upgrades".
 *
 * So the numbers are no longer *drawn*, and they are still *load-bearing*.
 *
 * ── Hover and press are CSS, not state ────────────────────────────────────
 * As before, and now more simply: no React state, no re-render on pointer
 * move, and `:focus-visible` gets the hover treatment for free.
 */
import { GameEvents } from '../game/events/GameEvents';
import { useGameStore } from '../state/gameStore';
import { MENU_FRAMES, isNavigable, navFrames, showsAffordanceHint } from '../game/ui/navTabs';
import type { NavDestination, NavFrames } from '../game/ui/navTabs';
import type { SceneKey } from '../game/config/constants';

/** Which scene each destination opens. */
const SCENE_FOR: Readonly<Record<NavDestination, SceneKey>> = {
  Upgrades: 'Upgrades',
  LevelSelect: 'LevelSelect',
  Achievements: 'Achievements',
  Enemies: 'Bestiary',
  Options: 'Options',
};

/** `BottomBar.as:51-68` — the icon row, in its own left-to-right order. */
const ICONS: readonly NavDestination[] = ['Achievements', 'Enemies', 'Options'];

/**
 * Which look each button wears — **T184 only**, see the header.
 *
 * Keyed by destination because that is the stable handle; the *intent* is
 * position in the row, and the two happen to agree because the row's order is
 * fixed. `Menu` is not a `NavDestination`, so it is keyed separately rather
 * than by widening the type for a temporary experiment.
 */
const NAV_STYLE: Readonly<Record<NavDestination | 'Menu', string>> = {
  Upgrades: 'soft',
  LevelSelect: 'flat',
  Achievements: 'neon',
  Enemies: 'arcade',
  Options: 'outline',
  Menu: 'brutalist',
};

function NavButton({
  label,
  frames,
  current,
  onClick,
  wide,
  hint = false,
  look,
}: {
  label: string;
  /**
   * The AS3 frames for this button. **Read for what they imply, not drawn** —
   * see the header. `current === undefined` means "no you-are-here state".
   */
  frames: NavFrames;
  current: boolean;
  onClick: () => void;
  wide?: boolean;
  /** `ButtonUpgrades`' `makeIcon` — something in the shop is affordable. */
  hint?: boolean;
  /** T184's style key — one of `NAV_STYLE`'s values. */
  look: string;
}): React.ReactElement {
  // A control with no fourth frame cannot be current, whatever the caller
  // says. `ButtonMenu` is the case, and encoding it here rather than at the
  // call site means the rule travels with the frame data.
  const here = current && frames.current !== undefined;

  /*
   * **The hint does not show on the tab you are on**, and that is the AS3's
   * rule rather than a tidy-up: `ButtonUpgrades.as:88` sends frame 7 for "you
   * are here" *without* `extraFrames`, while 1/2/3 shift to 4/5/6. The
   * affordance hint is pointless on the screen that would spend the money.
   *
   * It is applied here rather than by the caller because `here` is decided
   * here — a caller passing `hint` would have to re-derive the same condition
   * to know whether to.
   */
  const showHint = hint && !here;

  const classes = ['nav-pill', `nav-style--${look}`];
  if (wide === true) classes.push('nav-pill--wide');
  if (here) classes.push('nav-pill--on');
  if (showHint) classes.push('nav-pill--flush');

  return (
    <button
      type="button"
      className={classes.join(' ')}
      // Still a button, and still focusable. `aria-current` is what says "you
      // are here"; `disabled` would take it out of the tab order and hide the
      // fact that this row has a current item at all.
      {...(here ? { 'aria-current': 'page' as const } : { onClick })}
      aria-label={label}
    >
      {/* Positioned, so it sits above `.gloss-pill::before`'s highlight — the
          same reason `.menu-play__label` is. */}
      <span className="nav-pill__label">{label}</span>
      {showHint && (
        /*
          `IconEnough` — `ButtonUpgrades.as` pins a badge over the tab when
          something is affordable, on top of shifting the frames. A dot rather
          than the extracted icon, for the same reason the tab is a pill.
        */
        <span className="nav-pill__dot" aria-hidden="true" />
      )}
    </button>
  );
}

export function BottomNav({
  current,
}: {
  /** The destination the player is on, so exactly one tab marks itself. */
  current: NavDestination | null;
}): React.ReactElement {
  /*
   * Read here rather than passed in. Every screen that shows this bar
   * publishes the flag as it opens (`publishAffordable`), so the bar can ask
   * the store directly — and a screen cannot forget to forward a prop it never
   * has to hold.
   */
  const affordable = useGameStore((s) => s.shopAffordable);

  const go = (destination: NavDestination) => () =>
    GameEvents.emit('ui:goto', { key: SCENE_FOR[destination] });

  const tab = (destination: NavDestination, label: string, wide = false) => (
    <NavButton
      key={destination}
      label={label}
      frames={navFrames(destination, affordable)}
      current={!isNavigable(destination, current)}
      onClick={go(destination)}
      wide={wide}
      hint={showsAffordanceHint(destination, affordable)}
      look={NAV_STYLE[destination]}
    />
  );

  return (
    <nav className="bottom-nav" aria-label="Screens">
      {/*
        One row, evenly spread. The AS3 splits it — two wide tabs pinned left,
        icons pinned right, a gap between — because those are pictures at fixed
        stage coordinates. Six labelled buttons read better spread across the
        dock than clustered at both ends, and the order is unchanged. `A41`.
      */}
      <div className="bottom-nav__row">
        {tab('Upgrades', 'Upgrades', true)}
        {tab('LevelSelect', 'Level select', true)}
        {ICONS.map((destination) => tab(destination, destination))}
        {/* Menu is last in the port and third-from-last in the AS3, where
            Premium sat between. It leads out of the bar rather than across it,
            so it has no current state to draw — `ButtonMenu` has 3 frames, and
            `NavButton` reads that off `MENU_FRAMES` rather than being told. */}
        <NavButton
          label="Main menu"
          frames={MENU_FRAMES}
          current={false}
          onClick={() => GameEvents.emit('ui:goto', { key: 'MainMenu' })}
          look={NAV_STYLE.Menu}
        />
      </div>
    </nav>
  );
}
