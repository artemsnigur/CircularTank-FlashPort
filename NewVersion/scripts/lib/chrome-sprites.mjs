/**
 * The UI chrome symbols, by SWF symbol id.
 *
 * Hand-kept like `marker-sprites.mjs` and `weapon-panel-sprites.mjs`: the ids
 * come off each AS3 class's `[Embed(... symbol="symbolNNN")]` line, and nothing
 * in the extraction records that link.
 *
 * ── Why the screen furniture is art and not CSS ───────────────────────────
 * Every screen title in this game is a **vector symbol, not a text field**.
 * `Title` (394) is 24 paths and 48 gradients — two paths and four gradients per
 * letter, a white-to-`#bfbfbf` fill inside a black outline. No web font
 * reproduces that, and none has to: the shapes are already extracted. The same
 * is true of the buttons, whose labels are baked into their art, which is why
 * `infoTextSites.ts` files their tooltips as "redundant".
 *
 * So this table is the boundary between what the restyle *draws* and what it
 * *styles*: everything here is the original's own art, and the CSS around it
 * carries layout, colour tokens and anything with dynamic text in it.
 */

/**
 * Screen titles — one shape each, all 45.5-45.7 units tall.
 *
 * `TitlePremium` (382) is deliberately absent: the monetisation surface is
 * dropped, so there is no screen to head.
 */
export const CHROME_TITLE_SPRITE_IDS = Object.freeze({
  TitleMainMenu: 394,
  TitleLevelSelect: 388,
  TitleUpgrades: 386,
  TitleOptions: 384,
  TitleEnemies: 380,
  TitleAchievements: 378,
  TitleVictory: 392,
  TitleDefeat: 390,
});

/**
 * The bottom navigation bar — `BottomBar.as`, which owns the whole row.
 *
 * Its own geometry, for the layout step: the two wide tabs sit at x 5 and 209
 * (so ~204 apart), and the icon buttons run at a 45px pitch from 413 —
 * Achievements 413, Enemies 458, **Premium 503**, Menu 548, Options 593.
 *
 * **Premium is the one dropped**, by decision: it opens the paid-content
 * upsell, which this port has no equivalent for. The other four all lead
 * somewhere real here, so the row loses one of its five icons and keeps its
 * pitch.
 *
 * `ButtonUpgrades` has **7** frames against `ButtonLevelSelect`'s 4 — the tab
 * you are *on* has its own state, and the two tabs are not symmetrical.
 */
export const CHROME_NAV_SPRITE_IDS = Object.freeze({
  BackgroundBottom: 848,
  ButtonUpgrades: 456,
  ButtonLevelSelect: 595,
  ButtonAchievements: 565,
  ButtonEnemies: 553,
  ButtonMenu: 576,
  ButtonOptions: 582,
});

/**
 * Panels and plates.
 *
 * `BackgroundSquareBig` (901) is not a fill: it is one rect under a **radial**
 * gradient, white at 25% opacity in the middle — the sheen over the dark
 * ground, not the ground itself. `BackgroundUpgradeMenu` (973) is filled with
 * an SVG `<pattern>` carrying a base64 PNG, which is the brushed-metal texture
 * and is self-contained, so it needs no second asset synced beside it.
 *
 * `BackgroundTitle` (928) places a **20x20 tile at scale (32, 4.4)** — the
 * black title bar is one small square stretched, which is exactly the kind of
 * placement the old parser discarded.
 */
export const CHROME_PANEL_SPRITE_IDS = Object.freeze({
  BackgroundTitle: 928,
  IconShield: 980,
  BackgroundSquareBig: 901,
  BackgroundWindow: 905,
  BackgroundWindowBar: 859,
  BackgroundUpgradeMenu: 973,
  /**
   * The menu's illustrated scene — a full 640x480 of vector art, 34 paths and
   * 24 gradients: sky, sun, ground, a tank and two enemies. It is the menu's
   * whole background in the original, and the one piece of chrome here that is
   * a picture rather than furniture.
   */
  BackgroundMainMenu: 1322,
  /**
   * The band behind level select's world name — `bgFadeText` (`:99`, `:388`).
   *
   * **Ten frames, one shape each, and the frame is the world.**
   * `changeToLevelsFunction` sets `gotoAndStop(1 + selectedWorld)` (`:795`) and
   * `changeToWorldsFunction` resets it to frame 1 (`:684`), so frame 1 is the
   * world picker and frames 2..10 are worlds 1..9. Each is that world's own
   * texture — sand for the desert, and so on.
   *
   * Sized 410 wide in the original against a 640 stage; the port stretches it
   * across whatever the column is, which is why it arrives here as a
   * background image rather than a `ChromeArt`.
   */
  BackgroundFadeText: 927,
});

/**
 * Action buttons the screens press.
 *
 * The three difficulty buttons are separate symbols rather than three frames of
 * one, which is why they are listed individually — `ScreenLevelSelect` swaps
 * *which clip* is lit rather than a frame on a shared clip.
 */
export const CHROME_BUTTON_SPRITE_IDS = Object.freeze({
  /**
   * The audio toggles, whose four frames are a **2x2 matrix** rather than the
   * rest/hover/pressed triplet every other button here uses:
   * `ButtonToggleSound.as:55-83` gives 1 on-rest, 2 on-hover, 3 off-rest,
   * 4 off-hover. The state is in the frame, so there is no separate "off"
   * styling to apply.
   *
   * They share three of their four shapes (40, 42, 43) and differ only in the
   * glyph — 41 a speaker, 45 a note.
   */
  ButtonToggleSound: 44,
  ButtonToggleMusic: 46,
  ButtonPlay: 29,
  ButtonPlayLevel: 444,
  ButtonDifficultyEasy: 545,
  ButtonDifficultyMedium: 468,
  ButtonDifficultyHard: 462,
});

/** Every chrome symbol, flattened — what the generator walks and the sync copies. */
export const CHROME_SPRITE_IDS = Object.freeze({
  ...CHROME_TITLE_SPRITE_IDS,
  ...CHROME_NAV_SPRITE_IDS,
  ...CHROME_PANEL_SPRITE_IDS,
  ...CHROME_BUTTON_SPRITE_IDS,
});
