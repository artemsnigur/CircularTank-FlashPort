/**
 * Where the hover panel sits, and how its text is styled — `PartInfoText.as`.
 *
 * Pure functions so the geometry can be driven without a DOM. The panel itself
 * is `ui/InfoText.tsx`.
 *
 * ── There is no edge-flipping ─────────────────────────────────────────────
 * This is worth stating because the opposite is the natural assumption, and the
 * scoping report made it before reading the source. `showLeft`/`showTop` are
 * **parameters** (`:193-194`), and every one of the 20 call sites passes a
 * literal. `ImageEnemy` looks like an exception — it passes `right, bottom` —
 * but both are initialised `false` at `ImageEnemy.as:168-169` and never
 * reassigned.
 *
 * So there is no proximity test, no threshold, and no content-width flip
 * anywhere in the original. Each trigger has a fixed corner, and porting a
 * "smart" flip would be inventing behaviour.
 */

/** `:308` — 16px of padding on each side of the text. */
const PADDING = 32;
/** `:369`, `:378` — the gap between the cursor and the panel. */
const CURSOR_GAP = 16;

export interface InfoTextMetrics {
  /** Cursor position, in the space the panel is drawn in. */
  mouseX: number;
  mouseY: number;
  /** Measured text box. */
  textWidth: number;
  textHeight: number;
  /** `:193-194` — which side of the cursor the panel opens toward. */
  showLeft: boolean;
  showTop: boolean;
  /**
   * Extra room the structured renderers demand — `:304-306` widens the box when
   * `requiredMinWidth` exceeds the text. Zero for a plain tooltip, which is
   * every site this pass covers.
   */
  additionalWidth?: number;
  additionalHeight?: number;
}

export interface InfoTextBox {
  /** Panel rectangle. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Where the text starts inside it. */
  textX: number;
  textY: number;
}

/**
 * `placeText()` (`:362-386`) and the box it draws into (`:308`).
 *
 * Transcribed rather than tidied: the AS3 offsets the text and the background
 * by *different* amounts — the text by `additionalWidth - 1` and the background
 * not at all — and collapsing that into one origin would move the text a pixel.
 */
export function placeInfoText(metrics: InfoTextMetrics): InfoTextBox {
  const {
    mouseX,
    mouseY,
    textWidth,
    textHeight,
    showLeft,
    showTop,
    additionalWidth = 0,
    additionalHeight = 0,
  } = metrics;

  // `:308` — the panel is the text plus padding plus whatever a structured
  // renderer asked for.
  const width = Math.round(textWidth) + PADDING + additionalWidth;
  const height = Math.round(textHeight) + PADDING + additionalHeight;

  // `:363-366` — the text starts from the cursor, less the extra room; the
  // background starts *at* the cursor.
  let textX = mouseX - additionalWidth - 1;
  let textY = mouseY - additionalHeight - 2;
  let x = mouseX;
  let y = mouseY;

  // `:368-376`.
  if (showLeft) textX += CURSOR_GAP;
  else {
    textX -= textWidth + CURSOR_GAP;
    x -= width;
  }

  // `:377-385`.
  if (showTop) textY += CURSOR_GAP;
  else {
    textY -= textHeight + CURSOR_GAP;
    y -= height;
  }

  return { x, y, width, height, textX, textY };
}

/** One run of text with a style, in source order. */
export interface InfoTextRun {
  text: string;
  /** `textFormat2` (`:36`) — the display face, for an achievement's title. */
  style: 'title' | 'body' | 'note';
}

/**
 * Splits an achievement's tooltip into its three styled runs — `:195-205`.
 *
 * **Not a "structured renderer", which is what the scoping report called it.**
 * It is two `setTextFormat` calls over sub-ranges of one string: the first
 * `titleLength` characters take `textFormat2` (`:199`) and the last
 * `noteLength` take `textFormat3` (`:203`). Everything between keeps the base
 * format. Three spans.
 *
 *   `textFormat`   Arial 14 bold  (`:14`)  — the description
 *   `textFormat2`  JG 14 bold     (`:36`)  — the title, in the display face
 *   `textFormat3`  Arial 11 bold  (`:38`)  — the difficulty note, smaller
 *
 * A zero length means "no run" (`:197`, `:201` both guard on `!= 0`), which is
 * how a tooltip with no difficulty line is expressed.
 */
export function achievementRuns(
  text: string,
  titleLength: number,
  noteLength: number,
): InfoTextRun[] {
  // Guarded in the same order the AS3 guards them, and clamped: the AS3 reads
  // `infoText.length` for the tail, so a note longer than the string would
  // silently swallow the title rather than throwing.
  const title = Math.max(0, Math.min(titleLength, text.length));
  const note = Math.max(0, Math.min(noteLength, text.length - title));
  const bodyEnd = text.length - note;

  const runs: InfoTextRun[] = [];
  if (title > 0) runs.push({ text: text.slice(0, title), style: 'title' });
  if (bodyEnd > title) runs.push({ text: text.slice(title, bodyEnd), style: 'body' });
  if (note > 0) runs.push({ text: text.slice(bodyEnd), style: 'note' });
  return runs;
}
