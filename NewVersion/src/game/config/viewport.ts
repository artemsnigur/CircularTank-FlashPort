/**
 * Viewport / scaling maths.
 *
 * Everything here is pure so it can be unit-tested without a browser or a
 * running Phaser game. `ViewportController` is the thing that applies it.
 *
 * ── Why RESIZE and not FIT ────────────────────────────────────────────────
 * The original Flash build ran a fixed 640x400 camera over rooms up to
 * 900x960 (see PartGameArea.cameraWidth/cameraHeight and the levelDataModel
 * tables in ScreenGame.as). The camera already scrolls, so there is no single
 * "correct" aspect ratio to letterbox to.
 *
 *   FIT    would pillar/letterbox a fixed design box. On a 19.5:9 phone that
 *          wastes 25-30% of the screen on black bars, and the React HUD
 *          overlay then has to be positioned against the *canvas* rectangle
 *          rather than the screen, which is exactly the kind of thing that
 *          fights safe-area insets.
 *   RESIZE gives a 1:1 mapping between canvas pixels and screen pixels. The
 *          canvas is full-bleed, the DOM HUD sits on the real screen edges so
 *          `env(safe-area-inset-*)` just works, and taller devices simply see
 *          more of the room — which is a feature for a wave-defense game.
 *
 * The tradeoff RESIZE brings is that "how much of the room can I see" varies
 * by device, which affects fairness. We bound that with a fixed design width
 * plus min/max logical heights below, so the visible area can never collapse
 * or balloon beyond a playable window.
 */

/**
 * Horizontal design resolution, in "design units".
 *
 * Pinned to the original Flash camera width so every extracted sprite,
 * shape and coordinate from the AS3 source keeps its authored proportions:
 * an object that was 64px wide in Flash is 64 design units wide here, on
 * every device.
 */
export const DESIGN_WIDTH = 640;

/**
 * Vertical bounds, in design units.
 *
 * MIN matches the original camera height: below this the player would see less
 * of the room than the Flash build ever showed, so we zoom out instead.
 *
 * MAX keeps ultra-tall devices from rendering a comically small tank. It must
 * stay above the tallest *mainstream* aspect ratio, or ordinary phones fall
 * into the fallback branch and lose the fixed 640-unit width. At 640 wide:
 *   19.5:9 (iPhone 14/15/16 Pro)  -> 1387 units
 *   20:9   (most Android flagships) -> 1422 units
 *   21:9   (Sony Xperia 1)          -> 1493 units — deliberately excluded
 * 1440 admits everything through 20:9 and clamps the genuinely extreme.
 */
export const MIN_LOGICAL_HEIGHT = 400;
export const MAX_LOGICAL_HEIGHT = 1440;

/**
 * Device pixel ratio is clamped: a 3x phone rendering a full-screen WebGL
 * scene at native resolution costs ~2.25x the fill rate of a 2x one for a
 * difference almost nobody can see on a 6" panel.
 */
export const MAX_PIXEL_RATIO = 2;

/** Nominal portrait reference used for the initial game size before layout. */
export const INITIAL_WIDTH = 640;
export const INITIAL_HEIGHT = 960;

export interface ViewportInput {
  /** CSS pixel width of the canvas container. */
  cssWidth: number;
  /** CSS pixel height of the canvas container. */
  cssHeight: number;
  /** `window.devicePixelRatio`, unclamped. */
  pixelRatio: number;
}

export interface Viewport {
  /** Canvas backing-store size in device pixels — what Phaser renders into. */
  renderWidth: number;
  renderHeight: number;
  /** CSS size the canvas is displayed at. */
  cssWidth: number;
  cssHeight: number;
  /** Clamped device pixel ratio actually used. */
  pixelRatio: number;
  /** Camera zoom: render pixels per design unit. */
  zoom: number;
  /** Visible world area in design units. */
  logicalWidth: number;
  logicalHeight: number;
}

/** CSS-pixel safe-area insets, as reported by `env(safe-area-inset-*)`. */
export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const NO_INSETS: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/** A rectangle in design units. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Resolves a container size into a canvas size, a camera zoom, and the world
 * area that zoom exposes.
 *
 * The rule is "fixed design width, flexible height", falling back to a
 * height-driven fit when the resulting height would leave the playable band
 * outside [MIN_LOGICAL_HEIGHT, MAX_LOGICAL_HEIGHT] — which is what happens on
 * landscape phones (too short) and on very tall handsets (too long).
 */
export function computeViewport({ cssWidth, cssHeight, pixelRatio }: ViewportInput): Viewport {
  const safeCssWidth = Math.max(1, cssWidth);
  const safeCssHeight = Math.max(1, cssHeight);
  const pr = clamp(Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1, 1, MAX_PIXEL_RATIO);

  const renderWidth = Math.max(1, Math.round(safeCssWidth * pr));
  const renderHeight = Math.max(1, Math.round(safeCssHeight * pr));

  // Preferred rule: 640 design units always span the full width.
  const widthZoom = renderWidth / DESIGN_WIDTH;
  const heightAtWidthZoom = renderHeight / widthZoom;

  let zoom: number;
  if (heightAtWidthZoom < MIN_LOGICAL_HEIGHT) {
    // Short viewport (landscape). Zoom out so the original vertical play area
    // still fits; the player sees a wider strip than 640 units.
    zoom = renderHeight / MIN_LOGICAL_HEIGHT;
  } else if (heightAtWidthZoom > MAX_LOGICAL_HEIGHT) {
    // Extremely tall viewport. Zoom in so the world does not become tiny; the
    // player sees a narrower strip than 640 units.
    zoom = renderHeight / MAX_LOGICAL_HEIGHT;
  } else {
    zoom = widthZoom;
  }

  return {
    renderWidth,
    renderHeight,
    cssWidth: safeCssWidth,
    cssHeight: safeCssHeight,
    pixelRatio: pr,
    zoom,
    logicalWidth: renderWidth / zoom,
    logicalHeight: renderHeight / zoom,
  };
}

/**
 * Converts CSS-pixel safe-area insets into a rectangle of design units that
 * in-canvas HUD elements can anchor to.
 *
 * Phaser has no notion of a notch, so anything drawn inside the canvas (ammo
 * counters, pause button, boss health bar) must be positioned against this
 * rect rather than against `camera.width/height`.
 */
export function computeSafeRect(viewport: Viewport, insets: SafeAreaInsets = NO_INSETS): Rect {
  const toUnits = (cssPx: number): number => (cssPx * viewport.pixelRatio) / viewport.zoom;

  const left = toUnits(Math.max(0, insets.left));
  const right = toUnits(Math.max(0, insets.right));
  const top = toUnits(Math.max(0, insets.top));
  const bottom = toUnits(Math.max(0, insets.bottom));

  // Never let insets eat the whole viewport — a bad env() read should degrade
  // to "slightly cramped", not "zero-sized HUD".
  const width = Math.max(1, viewport.logicalWidth - left - right);
  const height = Math.max(1, viewport.logicalHeight - top - bottom);

  return { x: left, y: top, width, height };
}

/** Human-readable one-liner for the debug overlay. */
export function describeViewport(viewport: Viewport): string {
  const { cssWidth, cssHeight, renderWidth, renderHeight, pixelRatio, zoom } = viewport;
  return (
    `${Math.round(cssWidth)}x${Math.round(cssHeight)} css @${pixelRatio}x ` +
    `-> ${renderWidth}x${renderHeight} px, zoom ${zoom.toFixed(3)}, ` +
    `world ${Math.round(viewport.logicalWidth)}x${Math.round(viewport.logicalHeight)} units`
  );
}

/**
 * Zoom that makes a room span the full render width, or the unchanged zoom when
 * the room is already at least as wide as the view.
 *
 * ── The problem this solves ───────────────────────────────────────────────
 * `computeViewport`'s landscape branch is driven by `MIN_LOGICAL_HEIGHT`, not
 * by the design width: on any window shorter than 640x400 the zoom is
 * `renderHeight / 400`, and the player therefore sees **more** than 640 design
 * units across. On 16:9 that is 711 units; on 21:9 it is 956.
 *
 * 210 of the 405 levels are 640 wide. In those the room is *narrower than the
 * view*, so it cannot fill the screen — 71 units of empty space on 16:9 and 316
 * on 21:9, which is a third of the window. That is the "narrow rooms stay
 * pinned to the original small size" effect, and it is a width problem, not the
 * height problem it looks like.
 *
 * ── Cosmetic only ─────────────────────────────────────────────────────────
 * This is applied to `camera.setZoom` and nowhere else. Gameplay rules read
 * `Viewport.logicalWidth`/`logicalHeight`, which this does not touch, so laser
 * reach, magic retargeting and the off-camera spawn search all keep judging
 * against the nominal view. Zooming in shows less vertically, so a room that
 * fills the width will usually scroll a little vertically — that is the trade,
 * and it is the same behaviour wide rooms already have.
 */
export function roomFillZoom(viewport: Viewport, roomWidth: number): number {
  if (!Number.isFinite(roomWidth) || roomWidth <= 0) return viewport.zoom;
  // Already as wide as the view, or wider: leave it alone and let it scroll.
  if (roomWidth >= viewport.logicalWidth) return viewport.zoom;
  return viewport.renderWidth / roomWidth;
}
