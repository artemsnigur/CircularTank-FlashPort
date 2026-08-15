/**
 * Edge-of-screen markers for things the camera cannot see —
 * `PartInterface.handleEnemyMarkers` (`:477-631`) and `markTheFlag`
 * (`:318-425`), over `PartGameArea`'s `outsideWindow` flags (`:4761-4804`).
 *
 * ── The two markers are not the same mechanism ────────────────────────────
 * Worth stating up front, because they look alike and share nothing:
 *
 * | | enemies | flag |
 * |---|---|---|
 * | art | one clip **rotated** | 8 frames, one per direction |
 * | count | one per off-screen enemy | exactly one |
 * | pinned to | the clamped screen point | the edge, offset by 1 |
 * | extra | a Defense-mode danger frame | a scale pulse |
 *
 * ── The AS3's camera is a constant here and a variable in this port ───────
 * `handleEnemyMarkers` is called only when `roomWidth > 640 || roomHeight >
 * 400` (`:1073`) — "is the room bigger than the camera", written with the
 * Flash stage's frozen size. `markersApply` takes the live view instead, which
 * is the standing rule: on a tall phone the camera is ~1385 units high, so the
 * transcribed 400 would put markers on rooms the player can already see whole.
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Subject {
  x: number;
  y: number;
  /** Half-width and half-height — the AS3 uses `width / 2` on the clip. */
  halfWidth: number;
  halfHeight: number;
}

export interface OutsideWindow {
  outside: boolean;
  left: boolean;
  right: boolean;
  top: boolean;
  bottom: boolean;
}

const INSIDE: OutsideWindow = {
  outside: false,
  left: false,
  right: false,
  top: false,
  bottom: false,
};

/**
 * `PartGameArea.as:4761` — is this subject entirely off camera, and past which
 * edges?
 *
 * The AS3 writes the test against `cameraPosX`, its *container offset*, which
 * is the negation of the camera's world position; the four comparisons reduce
 * to "the subject's box does not touch the view". Transcribed as the reduced
 * form because the offset does not exist in this port, and keeping it would
 * mean carrying a sign convention nothing else uses.
 *
 * **A teleporting enemy is never outside** (`:4759` gates the whole block, and
 * `:4796` clears every flag). Mid-teleport it has no meaningful position, and a
 * marker pointing at where it is not is worse than none.
 */
export function outsideWindow(subject: Subject, view: Rect, teleporting = false): OutsideWindow {
  if (teleporting) return INSIDE;

  const left = subject.x + subject.halfWidth < view.x;
  const right = subject.x - subject.halfWidth > view.x + view.width;
  const top = subject.y + subject.halfHeight < view.y;
  const bottom = subject.y - subject.halfHeight > view.y + view.height;
  const outside = left || right || top || bottom;

  return outside ? { outside, left, right, top, bottom } : INSIDE;
}

/**
 * Whether markers are drawn at all — `:1073`.
 *
 * The room has to be bigger than the view in some direction, or nothing can be
 * off screen to begin with. Live view, not the AS3's 640x400: see the header.
 */
export function markersApply(room: { width: number; height: number }, view: Rect): boolean {
  return room.width > view.width || room.height > view.height;
}

export interface EnemyMarker {
  /** Screen position, in view-relative units. */
  x: number;
  y: number;
  /** Degrees. 0 points right, matching this port's rotation basis. */
  rotation: number;
  /** Frame 2 — the Defense-mode danger marker. */
  danger: boolean;
  /** `:527` — a boss's marker is drawn at double size. */
  scale: number;
}

/**
 * Where one enemy's marker sits and which way it points — `:521-630`.
 *
 * ── Rotation is decided by which edge, not by an angle ────────────────────
 * The AS3 does not compute a bearing. It pins the marker to an edge, then
 * picks one of eight fixed rotations from *where on the edge it landed*: a
 * marker on a side edge points left or right by which half of the screen it is
 * in, one on the top or bottom edge points up or down, and one in a corner
 * takes a diagonal. Reproduced exactly, including the corner cases, because an
 * angle computed from the enemy's true bearing would differ by a few degrees
 * everywhere and look like a rounding bug.
 */
export function enemyMarker(
  where: OutsideWindow,
  screen: { x: number; y: number },
  view: Rect,
  options: { boss?: boolean; defense?: boolean; damageAddict?: boolean } = {},
): EnemyMarker {
  const width = view.width;
  const height = view.height;

  // `:537-560` — pinned to the crossed edge, otherwise the subject's own
  // screen coordinate, then clamped into the view.
  let x = where.left ? 0 : where.right ? width : screen.x;
  let y = where.top ? 0 : where.bottom ? height : screen.y;
  x = Math.min(width, Math.max(0, x));
  y = Math.min(height, Math.max(0, y));

  let rotation = 0;
  let danger = false;

  if (y > 0 && y < height) {
    // A side edge: which way depends on which half of the screen, `:581`.
    rotation = x < width / 2 ? 180 : 0;
  } else if (x > 0 && x < width) {
    if (y < height / 2) {
      rotation = 270;
    } else {
      rotation = 90;
      // `:596-602` — on Defense, an enemy coming from the bottom is about to
      // cross the line, so its marker turns red. `DamageAddict` is excluded:
      // it dies on its own and never threatens the line.
      danger = Boolean(options.defense) && !options.damageAddict;
    }
  }

  // `:614-628` — the four corners override with a diagonal. Written after the
  // edge cases in the AS3 and therefore last here too: a corner satisfies
  // neither branch above, since both test for a *strictly* interior coordinate.
  if (x === 0 && y === 0) rotation = 225;
  else if (x === 0 && y === height) rotation = 135;
  else if (x === width && y === 0) rotation = 315;
  else if (x === width && y === height) rotation = 45;

  return { x, y, rotation, danger, scale: options.boss ? 2 : 1 };
}

/**
 * `MarkerFlag`'s eight frames, clockwise from the top-left corner — the
 * `gotoAndStop` arguments in `markTheFlag`.
 */
export const FLAG_FRAME = Object.freeze({
  topLeft: 1,
  top: 2,
  topRight: 3,
  right: 4,
  bottomRight: 5,
  bottom: 6,
  bottomLeft: 7,
  left: 8,
});

/** `:332` — the marker is inset one unit from the edge it sits on. */
export const FLAG_MARKER_INSET = 1;

export interface FlagMarker {
  x: number;
  y: number;
  /** 1-8; the clip is directional art, not a rotation. */
  frame: number;
}

/**
 * Where the flag's marker sits, or `null` when the flag is on screen — `:326`.
 *
 * **Null is the whole of "it disappears".** The AS3 removes the marker from the
 * stage when the flag is visible (`:328-334`) and when there is no flag at all
 * (`:421`), and both collapse to this returning nothing.
 *
 * Note the AS3 tests the flag's *point*, not a box: a flag straddling the edge
 * counts as visible and loses its marker. Faithful, and the reason this takes
 * a bare position rather than a `Subject`.
 */
export function flagMarker(flag: { x: number; y: number } | null, view: Rect): FlagMarker | null {
  if (!flag) return null;

  const left = view.x;
  const top = view.y;
  const right = view.x + view.width;
  const bottom = view.y + view.height;

  const withinX = flag.x > left && flag.x < right;
  const withinY = flag.y > top && flag.y < bottom;
  if (withinX && withinY) return null;

  const inset = FLAG_MARKER_INSET;
  const clamp = (value: number, max: number): number =>
    Math.min(max - inset, Math.max(inset, value));

  // `:340` — above or below, so it slides along the top or bottom edge.
  if (withinX) {
    const below = flag.y > top + view.height / 2;
    return {
      x: clamp(flag.x - left, view.width),
      y: below ? view.height - inset : inset,
      frame: below ? FLAG_FRAME.bottom : FLAG_FRAME.top,
    };
  }

  // `:361` — left or right, sliding along a side edge.
  if (withinY) {
    const beyondRight = flag.x > left + view.width / 2;
    return {
      x: beyondRight ? view.width - inset : inset,
      y: clamp(flag.y - top, view.height),
      frame: beyondRight ? FLAG_FRAME.right : FLAG_FRAME.left,
    };
  }

  // `:383` — outside on both axes, so it takes the nearest corner. Compared
  // against the view's **centre**, not its edges, which is what decides the
  // corner for a flag that is only just diagonal.
  const leftHalf = flag.x < left + view.width / 2;
  const topHalf = flag.y < top + view.height / 2;
  return {
    x: leftHalf ? inset : view.width - inset,
    y: topHalf ? inset : view.height - inset,
    frame: leftHalf
      ? topHalf
        ? FLAG_FRAME.topLeft
        : FLAG_FRAME.bottomLeft
      : topHalf
        ? FLAG_FRAME.topRight
        : FLAG_FRAME.bottomRight,
  };
}

/* ── The pulse ───────────────────────────────────────────────────────────── */

/** `:122`/`:124` — both halves run 15 frames at the AS3's 30 fps. */
export const FLAG_PULSE_FRAMES = 15;
export const FLAG_PULSE_MAX = 1.2;
export const FLAG_PULSE_MIN = 0.9;

/**
 * The flag marker's scale — two `fl.transitions.Tween`s that restart each
 * other forever (`:697-700`, `:1087-1090`), started when the countdown ends
 * (`:721`).
 *
 * **Shrinking first.** `markerFlagInTween` runs `Regular.easeOut` from 1.2 down
 * to 0.9, and its finish starts `markerFlagOutTween`, `Regular.easeIn` from 0.9
 * back to 1.2. So the marker appears large and pulls in, rather than starting
 * small — which is what makes it read as a heartbeat rather than a blink.
 *
 * `Regular.easeOut` is `-c * t * (t - 2) + b` and `easeIn` is `c * t * t + b`,
 * with `t` normalised — quadratics, transcribed rather than approximated with
 * a sine, because the two halves are *different* curves and a symmetric
 * approximation would lose the asymmetry the ping-pong exists to produce.
 *
 * `frames` counts from the pulse starting; it is taken modulo the full cycle,
 * so a caller can pass a monotonically increasing count and never wrap.
 */
export function flagPulseScale(frames: number): number {
  const half = FLAG_PULSE_FRAMES;
  const cycle = half * 2;
  const at = ((frames % cycle) + cycle) % cycle;
  const span = FLAG_PULSE_MAX - FLAG_PULSE_MIN;

  if (at < half) {
    // easeOut, 1.2 -> 0.9: `-c * t * (t - 2) + b` with c = -span.
    const t = at / half;
    return FLAG_PULSE_MAX - span * -(t * (t - 2));
  }
  // easeIn, 0.9 -> 1.2: `c * t * t + b`.
  const t = (at - half) / half;
  return FLAG_PULSE_MIN + span * t * t;
}
