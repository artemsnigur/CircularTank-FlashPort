/**
 * Which frame each bottom-bar button shows — `ButtonUpgrades.as`,
 * `ButtonLevelSelect.as`, `ButtonEnemies.as` and their siblings.
 *
 * ── `isActive` means *clickable*, not *current* ───────────────────────────
 * The naming is the trap. Every one of these classes sets
 * `isActive = Main.changeScreen != "<its own screen>"` — so the tab you are
 * **on** is the one that is *not* active, and it shows a dedicated frame while
 * the rest sit at rest. Reading `isActive` as "highlighted" inverts the whole
 * bar.
 *
 * ── The frames, per class ─────────────────────────────────────────────────
 * `ButtonLevelSelect` (4 frames) and the icon buttons are uniform:
 *
 *     1  rest        2  hover        3  pressed        4  you are here
 *
 * `ButtonUpgrades` has **7**, because it carries one more piece of
 * information: `checkWeapons`/`checkSecondaryWeapons`/`checkMisc`
 * (`ButtonUpgrades.as:126-197`) each ask whether the player can afford
 * *anything*, and if so `extraFrames = 3` shifts the whole triplet — so 4/5/6
 * are rest/hover/pressed **with money to spend**, and the original also pins an
 * `IconEnough` badge over the tab. Frame 7 is "you are here", and it is not
 * shifted: the affordance hint is pointless on the screen that would spend it.
 *
 * `ButtonMenu` has only 3, because Menu is never a screen you are *on* from
 * this bar — there is no fourth state to draw.
 */

/** What the bar is showing right now, so one tab can mark itself current. */
export type NavDestination = 'Upgrades' | 'LevelSelect' | 'Achievements' | 'Enemies' | 'Options';

export interface NavFrames {
  rest: number;
  hover: number;
  pressed: number;
  /** Absent for `ButtonMenu`, which has no "you are here". */
  current?: number;
}

/** `:38`, `:43`, `:53`, `:84` in `ButtonLevelSelect.as` — the shared shape. */
const STANDARD: NavFrames = { rest: 1, hover: 2, pressed: 3, current: 4 };

/** `ButtonMenu.as` — three frames and no current state. */
const MENU: NavFrames = { rest: 1, hover: 2, pressed: 3 };

/**
 * `ButtonUpgrades.as:78-88` — `gotoAndStop(1 + extraFrames)` and friends.
 *
 * `affordable` is `makeIcon`: true when any upgrade in any of the three
 * categories is both un-maxed and within the player's money.
 */
export function upgradesTabFrames(affordable: boolean): NavFrames {
  const extra = affordable ? 3 : 0;
  return { rest: 1 + extra, hover: 2 + extra, pressed: 3 + extra, current: 7 };
}

/**
 * The frames for one bar button.
 *
 * `affordable` only reaches the Upgrades tab; passing it elsewhere is harmless
 * and ignored, which is why it is one argument rather than a second function.
 */
export function navFrames(destination: NavDestination, affordable = false): NavFrames {
  if (destination === 'Upgrades') return upgradesTabFrames(affordable);
  return STANDARD;
}

/** `ButtonMenu`'s frames, kept separate because it is not a destination. */
export const MENU_FRAMES = MENU;

/**
 * The frame to draw at rest, given where the player is.
 *
 * The whole of "which tab looks pressed in" is this one line, and it is the
 * inversion the header warns about: **current takes the dedicated frame, and
 * everything else sits at rest.**
 */
export function restingFrame(
  destination: NavDestination,
  current: NavDestination | null,
  affordable = false,
): number {
  const frames = navFrames(destination, affordable);
  if (destination === current && frames.current !== undefined) return frames.current;
  return frames.rest;
}

/** Whether the button leads anywhere — false on the screen it points at. */
export function isNavigable(destination: NavDestination, current: NavDestination | null): boolean {
  return destination !== current;
}

/* ── The difficulty triplet, whose third frame means something else ───────── */

/**
 * `ButtonGameDifficulty` — the shared base of `ButtonDifficultyEasy/Medium/Hard`.
 *
 * Also three frames, and **not** the same three. `:63-87` reads:
 *
 *     this difficulty is the selected one  -> gotoAndStop(3)   (`:73`)
 *     the cursor is over it                -> gotoAndStop(2)   (`:82`)
 *     otherwise                            -> gotoAndStop(1)   (`:87`)
 *
 * So **frame 3 is *selected*, not pressed.** The nav buttons' third frame is
 * the pressed state, and reading these the same way would leave the chosen
 * difficulty looking merely hovered — with no frame anywhere that says which
 * one is actually set, on a control whose entire job is to say that.
 *
 * It lives beside the bar's rules because it is the same question — which
 * frame does this piece of chrome show — answered from the same family of
 * button classes, and keeping the two answers apart is how one gets applied to
 * the other.
 */
export const DIFFICULTY_FRAMES = Object.freeze({ rest: 1, hover: 2, selected: 3 });

/** The resting frame for a difficulty button: selected, or not. */
export function difficultyFrame(selected: boolean): number {
  return selected ? DIFFICULTY_FRAMES.selected : DIFFICULTY_FRAMES.rest;
}

/* ── The audio toggles, whose four frames are a matrix ────────────────────── */

/**
 * `ButtonToggleSound` / `ButtonToggleMusic` — `ButtonToggleSound.as:55-83`.
 *
 * A **2x2 of state and hover**, not a rest/hover/pressed run:
 *
 *     on,  cursor out  -> 1        off, cursor out  -> 3
 *     on,  cursor over -> 2        off, cursor over -> 4
 *
 * That is the third frame convention in this file, and the three disagree in
 * ways that all look like off-by-ones: a nav button's 3 is *pressed*, a
 * difficulty button's 3 is *selected*, and a toggle's 3 is *off*. Applying any
 * one of them to another draws a plausible picture that says the wrong thing —
 * which is precisely why they live together with their AS3 lines attached,
 * rather than as a shared triplet with three call sites.
 *
 * The state lives in the frame, so a toggle needs no "off" styling of its own.
 */
export const TOGGLE_FRAMES = Object.freeze({ onRest: 1, onHover: 2, offRest: 3, offHover: 4 });

/** The resting frame for an audio toggle. */
export function toggleFrame(on: boolean): number {
  return on ? TOGGLE_FRAMES.onRest : TOGGLE_FRAMES.offRest;
}

/** The frame it shows under the cursor, in whichever state it is in. */
export function toggleHoverFrame(on: boolean): number {
  return on ? TOGGLE_FRAMES.onHover : TOGGLE_FRAMES.offHover;
}
