/**
 * Tutorial panel art — the twelve `Tutorial*` clips.
 *
 * ── The panels are composed, and `height` is the composition's ────────────
 * Each clip is a **backdrop plus content on separate depths**: `Move` is
 * `[1325, 1401, 1403, 1405]`, where 1325 is a 160x80 panel and the other three
 * are icons and text laid inside it. 1325 is shared with `AimShoot`, so the
 * shapes are not owned by the panel that draws them.
 *
 * Resolved with the **matrix** parser — the third refinement of this tool:
 *
 *   1. placement list  "shapes placed on this frame". Wrong; latent in props
 *                      and particles, exposed by the coins.
 *   2. display list    depth -> character at `ShowFrame`. Correct about *what*
 *                      draws.
 *   3. + matrices      where each one draws, and how many times.
 *
 * **The matrix translate is in the shape's own coordinate space, and JPEXS
 * normalises each SVG to its bounding box.** A shape whose art sits around its
 * origin gets a `<g transform="matrix(1,0,0,1, tx, ty)">` in the export, so
 * drawing it at the raw translate puts its *top-left* where its *origin*
 * belongs. `x - tx` corrects it, and shapes with an identity transform are
 * unaffected — 1403 needed 43.2 and 1401 needed nothing, which is exactly the
 * kind of per-shape difference that averages out to "close enough" and reads
 * as sloppy art.
 *
 * Step 3 found something step 2 could not: **the display list deduped by shape
 * id, and the AS3 places some shapes twice.** `Move` draws `1401` at both
 * `x: 10` and `x: 99` — two arrow keys from one glyph. A parser that returns a
 * set loses the second, and the panel silently renders one arrow. The placement parser was latent through
 * props and particles — each of their frames replaces a single shape — and only
 * surfaced on the coins, where it produced a non-monotonic ladder. These panels
 * are the same layered shape, so it would have been wrong here too.
 *
 * `width`/`height` are the **backdrop's**, which is what AS3 `DisplayObject
 * .height` returns for these clips: it is the union bounding box of the whole
 * subtree, and in every one of the twelve the backdrop is the largest child
 * with the rest laid inside it. Checked, not assumed — `Objective`'s backdrop
 * is 160x64 and its two children are 117.6x42.
 *
 * ── The one dimension read ────────────────────────────────────────────────
 * `:341` is `theYPos = 480 - tutorialObjective.height - 8`. **480 is the AS3's
 * frozen stage height**, not its camera height (400) — so this is another
 * constant-that-became-a-variable, and the port takes the live viewport bottom.
 * `Objective` is the only panel that reads a dimension; the other eleven are at
 * a literal (16, 16).
 */

export interface TutorialPart {
  /** Shape id. May repeat — the AS3 places some shapes more than once. */
  shape: number;
  /** Offset from the panel's origin, in design units. */
  x: number;
  y: number;
}

export interface TutorialClip {
  /** `assets.swf` character id. */
  symbol: number;
  /** The backdrop's authored size — what `DisplayObject.height` returns. */
  width: number;
  height: number;
  /** Every placement, in draw order, backdrop first. */
  parts: readonly TutorialPart[];
}

export const TUTORIAL_CLIPS: Readonly<Record<string, TutorialClip>> = {
  Move: {
    symbol: 1406,
    width: 160,
    height: 80,
    parts: [
      { shape: 1325, x: 0, y: 0 },
      { shape: 1401, x: 10, y: 57 },
      { shape: 1401, x: 99, y: 57 },
      { shape: 1403, x: 36.7, y: 10 },
      { shape: 1405, x: 13.65, y: 10 },
    ],
  },
  AimShoot: {
    symbol: 1331,
    width: 160,
    height: 80,
    parts: [
      { shape: 1325, x: 0, y: 0 },
      { shape: 1326, x: 66.3, y: 33.1 },
      { shape: 1328, x: 27.9, y: 10 },
      { shape: 1330, x: 27.9, y: 10 },
    ],
  },
  KillEnemies: {
    symbol: 1358,
    width: 160,
    height: 70,
    parts: [
      { shape: 1354, x: 0, y: 0 },
      { shape: 1355, x: 24.1, y: 10 },
      { shape: 1357, x: 24.1, y: 10 },
      { shape: 1352, x: 71.5, y: 35.5 },
    ],
  },
  Objective: {
    symbol: 1336,
    width: 160,
    height: 64,
    parts: [
      { shape: 1332, x: -16, y: 0 },
      { shape: 1333, x: 13.2, y: 10 },
      { shape: 1335, x: 13.2, y: 10 },
    ],
  },
  CollectFlags: {
    symbol: 1366,
    width: 160,
    height: 70,
    parts: [
      { shape: 1361, x: 0, y: 0 },
      { shape: 1362, x: 16.9, y: 10 },
      { shape: 187, x: 72, y: 36 },
      { shape: 1365, x: 16.9, y: 10 },
      { shape: 1359, x: 63.5, y: 27.5 },
    ],
  },
  Pause: {
    symbol: 1394,
    width: 160,
    height: 80,
    parts: [
      { shape: 1325, x: 0, y: 0 },
      { shape: 1383, x: 91, y: 35.95 },
      { shape: 1389, x: 49, y: 35.95 },
      { shape: 1391, x: 17.8, y: 10 },
      { shape: 1393, x: 17.8, y: 10 },
    ],
  },
  Special: {
    symbol: 1400,
    width: 160,
    height: 80,
    parts: [
      { shape: 1325, x: 0, y: 0 },
      { shape: 1395, x: 40, y: 62 },
      { shape: 1397, x: 22.8, y: 10 },
      { shape: 1399, x: 22.8, y: 10 },
    ],
  },
  NoMoveTowerMode: {
    symbol: 1373,
    width: 160,
    height: 80,
    parts: [
      { shape: 1325, x: 0, y: 0 },
      { shape: 1367, x: 25.3, y: 10 },
      { shape: 1369, x: 65.35, y: 55.35 },
      { shape: 1371, x: 25.3, y: 10 },
      { shape: 195, x: 50.9, y: 64 },
      { shape: 195, x: 104.9, y: 64 },
      { shape: 43, x: 53, y: 43 },
    ],
  },
  DefendBottom: {
    symbol: 1380,
    width: 160,
    height: 80,
    parts: [
      { shape: 1325, x: 0, y: 0 },
      { shape: 167, x: 35, y: 60 },
      { shape: 1375, x: 34, y: 58.95 },
      { shape: 1377, x: 11.3, y: 10 },
      { shape: 1379, x: 11.3, y: 10 },
    ],
  },
  ShiftWeapon: {
    symbol: 1388,
    width: 160,
    height: 80,
    parts: [
      { shape: 1325, x: 0, y: 0 },
      { shape: 1381, x: 32, y: 62 },
      { shape: 1383, x: 112, y: 62 },
      { shape: 1385, x: 22.9, y: 10 },
      { shape: 1387, x: 22.9, y: 10 },
    ],
  },
  Strength: {
    symbol: 1351,
    width: 160,
    height: 80,
    parts: [
      { shape: 1325, x: 0, y: 0 },
      { shape: 1345, x: 34.85, y: 10 },
      { shape: 1347, x: 34.85, y: 10 },
      { shape: 1348, x: 81.5, y: 51.45 },
      { shape: 1350, x: 81.5, y: 51.45 },
    ],
  },
  Weakness: {
    symbol: 1344,
    width: 160,
    height: 80,
    parts: [
      { shape: 1325, x: 0, y: 0 },
      { shape: 1339, x: 40, y: 10 },
      { shape: 1341, x: 40, y: 10 },
      { shape: 1342, x: 80.9, y: 34.15 },
      { shape: 1337, x: 80.9, y: 34.15 },
    ],
  },
};

/** `:319` — every panel but one sits at this inset from the top-left. */
export const PANEL_INSET = 16;

/** `:340` — `Objective` is bottom-anchored, and at its own x. */
export const OBJECTIVE_X = 194;
export const OBJECTIVE_BOTTOM_GAP = 8;

/**
 * The band at the bottom of the screen this port's HUD owns — **divergence
 * `A5`**, and the number is the AS3's, not a taste value.
 *
 * ── Why a divergence is needed at all ─────────────────────────────────────
 * The AS3 stage is 640x480 with the play area at 0..400 and an interface strip
 * at 400..480 (`PartInterface.as:232` sets `bg.y = 400`). `Objective` is placed
 * at `480 - height - 8` = **408**, i.e. deliberately *inside* that strip — and
 * it does not collide with the weapon widgets because it clears them **on x**:
 * the panel spans 194..354 and the weapon cluster starts at `bgWeapon.x = 388`
 * (`PartInterface.as:234`, `bgWeapon2.x = 474`).
 *
 * **This port's HUD row is full-width** — health left, ammo centre, audio and
 * menu right — so there is no x at which a bottom-anchored panel clears it. The
 * AS3's y placement therefore cannot be reproduced without the panel landing on
 * the weapon readout, which is what shipped up to T62.
 *
 * ── The number is derived, not chosen ─────────────────────────────────────
 * `480 - 400` = 80: exactly how much of its screen the original reserved for
 * interface. Reserving the same band here and seating the panel *above* it is
 * the closest the port gets to "at the bottom of the play area, clear of the
 * interface", which is what `:341` means in a layout where the strip exists.
 *
 * Deriving it keeps the assertion sourced: `AS3_STAGE_HEIGHT` and
 * `AS3_CAMERA_HEIGHT` are documentation of the original and nothing reads them
 * at runtime except this subtraction.
 */
export const AS3_STAGE_HEIGHT = 480;
/** `PartInterface.as:232` — the interface strip starts here. Also the camera height. */
export const AS3_PLAY_AREA_HEIGHT = 400;
export const HUD_BAND = AS3_STAGE_HEIGHT - AS3_PLAY_AREA_HEIGHT;

/**
 * Where a panel is drawn, in design units — `:319-398`.
 *
 * `viewportHeight` is live. The AS3 uses the literal 480 because its stage
 * never changed size; this port's does, so passing the frozen number would
 * float `Objective` in mid-air on a tall phone and off the bottom on a short
 * window.
 *
 * **`Objective` additionally clears `HUD_BAND`** — divergence **`A5`** in
 * `docs/AUDIT-2026-07.md`. That is a deliberate departure from `:341`, not a
 * correction to it: the AS3's y is faithful and unusable here because its HUD
 * was not full-width.
 */
export function panelPosition(
  id: string,
  viewportHeight: number,
): { x: number; y: number } {
  const clip = TUTORIAL_CLIPS[id];
  if (id === 'Objective' && clip) {
    return {
      x: OBJECTIVE_X,
      // `- HUD_BAND` is the divergence, not the port: `:341` is
      // `480 - height - 8` and seats the panel *inside* the interface strip,
      // clearing the weapon widgets on x. A full-width HUD row makes that
      // impossible here. See `A5` in `docs/AUDIT-2026-07.md` before removing it.
      y: viewportHeight - HUD_BAND - clip.height - OBJECTIVE_BOTTOM_GAP,
    };
  }
  return { x: PANEL_INSET, y: PANEL_INSET };
}

/** `:83` — the slide-in and slide-out tweens are 30 frames each. */
export const TWEEN_FRAMES = 30;

/** `:458` — the jitter's reach at full transparency. */
export const JITTER_RADIUS = 10;

/**
 * The panel's offset while a tween runs — `:457-459`.
 *
 * A fresh angle **every frame**, so the panel shimmers rather than drifting,
 * and the offset shrinks as it fades in: `(1 - alpha) * 10`.
 *
 * ── It re-rolls at 30 Hz, and only while a tween runs ────────────────────
 * `:454` guards the whole block on `inTweenRunning || outTweenRunning`, so the
 * jitter exists **only during the one-second fade in and fade out** — a settled
 * panel is perfectly still. `(1 - alpha) * 10` makes that nearly true anyway,
 * but the guard is the rule.
 *
 * **And the AS3 ran at 30 fps.** A fresh angle every frame at 60 Hz is twice as
 * many re-rolls over the same fade, which reads as roughly twice as busy at
 * identical amplitude — the amplitude was never wrong. `jitterOffset` therefore
 * takes an accumulator and re-rolls on whole AS3 frames only, which is a
 * frame-rate correction rather than a taste change.
 *
 * **Unseeded `Math.random()`, confirmed at `:457`** — not `PM_PRNG`, so it
 * consumes nothing from any reproducible stream and nothing downstream shifts
 * if it is called a different number of times. That was worth checking rather
 * than assuming: the background props hid a generator in a presentation layer
 * and it changed every placement after it.
 */
export interface JitterState {
  /** Fractional AS3 frames since the last re-roll. */
  elapsed: number;
  angle: number;
}

export function createJitterState(): JitterState {
  return { elapsed: 0, angle: 0 };
}

/**
 * The panel's offset while a tween runs, re-rolled on whole AS3 frames.
 *
 * `frames` is elapsed AS3 frames (`deltaMs / 1000 * 30`), so at 60 fps this is
 * ~0.5 per call and the angle changes every second call — matching the
 * original's cadence rather than the browser's.
 */
export function jitterOffset(
  alpha: number,
  state: JitterState,
  frames: number,
  random: () => number = Math.random,
): { dx: number; dy: number; state: JitterState } {
  let { elapsed, angle } = state;
  elapsed += frames;
  if (elapsed >= 1) {
    elapsed %= 1;
    angle = ((random() * 360) / 180) * Math.PI;
  }

  const reach = (1 - alpha) * JITTER_RADIUS;
  return { dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach, state: { elapsed, angle } };
}

/**
 * Authored size per shape, for `setDisplaySize` at the draw.
 *
 * **The shapes carry no internal offsets.** Every panel SVG has an identity
 * transform and a tight bounding box — checked, after a comment in T48 claimed
 * the opposite and used it to justify scaling a container instead. Each one
 * therefore rasterises to its own tight texture with content at the origin.
 *
 * The consequence is the honest gap below: with no offsets in the art and no
 * `PlaceObject` matrices extracted, **there is nothing that says where inside a
 * panel each piece belongs.** The backdrop is placed correctly; the icons and
 * text stack on it at the panel's origin rather than laid out. See
 * `PANEL_LAYOUT_UNPORTED` at the draw site.
 */
export const SHAPE_SIZES: Readonly<Record<number, readonly [number, number]>> = {
  43: [54, 54],
  167: [20, 20],
  187: [16, 16],
  195: [6, 12],
  1325: [160, 80],
  1326: [24.4, 58.05],
  1328: [104.2, 25.9],
  1330: [104.2, 25.9],
  1332: [160, 64],
  1333: [117.6, 42],
  1335: [117.6, 42],
  1337: [18.3, 17.6],
  1339: [85, 56],
  1341: [85, 56],
  1342: [18.3, 17.6],
  1345: [90.3, 73],
  1347: [90.3, 73],
  1348: [17, 17.1],
  1350: [17, 17.1],
  1352: [17, 17],
  1354: [160, 70],
  1355: [111.9, 9.9],
  1357: [111.9, 9.9],
  1359: [33, 33],
  1361: [160, 70],
  1362: [126, 10.1],
  1365: [126, 10.1],
  1367: [109.1, 26.5],
  1369: [29.3, 29.3],
  1371: [109.1, 70.45],
  1375: [92, 122],
  1377: [137.3, 25.9],
  1379: [137.3, 25.9],
  1381: [64, 16],
  1383: [16, 16],
  1385: [113.9, 25.9],
  1387: [113.9, 64.8],
  1389: [26, 16],
  1391: [124.3, 10.1],
  1393: [124.3, 38.25],
  1395: [80, 16],
  1397: [114.3, 25.9],
  1399: [114.3, 25.9],
  1401: [52, 34],
  1403: [86.4, 41.9],
  1405: [136.15, 79.5],
};

/** The authored size of a shape, or null when it is not a panel shape. */
export function shapeSize(id: number): readonly [number, number] | null {
  return SHAPE_SIZES[id] ?? null;
}
