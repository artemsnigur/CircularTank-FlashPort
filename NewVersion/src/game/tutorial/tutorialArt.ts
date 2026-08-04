/**
 * Tutorial panel art — the twelve `Tutorial*` clips.
 *
 * ── The panels are composed, and `height` is the composition's ────────────
 * Each clip is a **backdrop plus content on separate depths**: `Move` is
 * `[1325, 1401, 1403, 1405]`, where 1325 is a 160x80 panel and the other three
 * are icons and text laid inside it. 1325 is shared with `AimShoot`, so the
 * shapes are not owned by the panel that draws them.
 *
 * Resolved with the **display-list** parser (depth -> character, snapshotted at
 * `ShowFrame`), not the placement list. The placement parser was latent through
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

export interface TutorialClip {
  /** `assets.swf` character id. */
  symbol: number;
  /** Shape ids, backdrop first, in display order. */
  shapes: readonly number[];
  /** The backdrop's authored size — what `DisplayObject.height` returns. */
  width: number;
  height: number;
}

export const TUTORIAL_CLIPS: Readonly<Record<string, TutorialClip>> = {
  Move: { symbol: 1406, shapes: [1325, 1401, 1403, 1405], width: 160, height: 80 },
  AimShoot: { symbol: 1331, shapes: [1325, 1326, 1328, 1330], width: 160, height: 80 },
  KillEnemies: { symbol: 1358, shapes: [1354, 1355, 1357, 1352], width: 160, height: 70 },
  Objective: { symbol: 1336, shapes: [1332, 1333, 1335], width: 160, height: 64 },
  CollectFlags: { symbol: 1366, shapes: [1361, 1362, 187, 1365, 1359], width: 160, height: 70 },
  Pause: { symbol: 1394, shapes: [1325, 1383, 1389, 1391, 1393], width: 160, height: 80 },
  Special: { symbol: 1400, shapes: [1325, 1395, 1397, 1399], width: 160, height: 80 },
  NoMoveTowerMode: { symbol: 1373, shapes: [1325, 1367, 1369, 1371, 195, 43], width: 160, height: 80 },
  DefendBottom: { symbol: 1380, shapes: [1325, 167, 1375, 1377, 1379], width: 160, height: 80 },
  ShiftWeapon: { symbol: 1388, shapes: [1325, 1381, 1383, 1385, 1387], width: 160, height: 80 },
  Strength: { symbol: 1351, shapes: [1325, 1345, 1347, 1348, 1350], width: 160, height: 80 },
  Weakness: { symbol: 1344, shapes: [1325, 1339, 1341, 1342, 1337], width: 160, height: 80 },
};

/** `:319` — every panel but one sits at this inset from the top-left. */
export const PANEL_INSET = 16;

/** `:340` — `Objective` is bottom-anchored, and at its own x. */
export const OBJECTIVE_X = 194;
export const OBJECTIVE_BOTTOM_GAP = 8;

/**
 * Where a panel is drawn, in design units — `:319-398`.
 *
 * `viewportHeight` is live. The AS3 uses the literal 480 because its stage
 * never changed size; this port's does, so passing the frozen number would
 * float `Objective` in mid-air on a tall phone and off the bottom on a short
 * window.
 */
export function panelPosition(
  id: string,
  viewportHeight: number,
): { x: number; y: number } {
  const clip = TUTORIAL_CLIPS[id];
  if (id === 'Objective' && clip) {
    return { x: OBJECTIVE_X, y: viewportHeight - clip.height - OBJECTIVE_BOTTOM_GAP };
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
 * **Unseeded `Math.random()`, confirmed at `:457`** — not `PM_PRNG`, so it
 * consumes nothing from any reproducible stream and nothing downstream shifts
 * if it is called a different number of times. That was worth checking rather
 * than assuming: the background props hid a generator in a presentation layer
 * and it changed every placement after it.
 */
export function jitterOffset(
  alpha: number,
  random: () => number = Math.random,
): { dx: number; dy: number } {
  const angle = ((random() * 360) / 180) * Math.PI;
  const reach = (1 - alpha) * JITTER_RADIUS;
  return { dx: Math.cos(angle) * reach, dy: Math.sin(angle) * reach };
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
