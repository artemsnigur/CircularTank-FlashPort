/**
 * The hover panel — `PartInfoText.as`.
 *
 * One panel for the whole app, as the AS3 has one instance per screen: eight
 * screens each construct their own and hand it to their buttons as `pText`.
 * A single mounted panel is the same arrangement with the plumbing removed.
 *
 * Triggers use `useInfoText` (`useInfoText.ts`); both sides share the one
 * keep-alive in `infoTextChannel.ts`.
 */
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { cursor, keepAlive } from './infoTextChannel';
import { achievementRuns, placeInfoText } from '../game/ui/infoTextPlacement';
import type { InfoTextRequest } from '../game/ui/infoTextState';

/**
 * `--space-4`, the panel's CSS padding, as a number — `placeInfoText` is given
 * the *text* box and adds its own 16-per-side (`:308`), so the two must agree
 * or the panel is positioned for a size it is not.
 */
const CSS_PADDING = 32;

/**
 * ── The panel is measured, not estimated ──────────────────────────────────
 * The AS3 reads its `TextField`'s own `textWidth`/`textHeight` (`:206-212`),
 * which is a real measurement of the laid-out text. The first port of this
 * guessed instead — `charWidth * length`, `17` per line, transcribed from
 * Flash's Arial 14 metrics — and the driven pass caught it: the panel rendered
 * 76 and 94 tall where the guess had said 66, so both up-opening corners
 * (`showTop: false`, which is every site this pass wires) sat ~10-28px too low
 * and overlapped the cursor.
 *
 * That is exactly the constants-that-became-variables trap in a new place: line
 * height was fixed in Flash and is a function of the stylesheet here. So the
 * real box is read back after layout and fed to the same pure geometry.
 */
export function InfoText(): React.ReactElement | null {
  const [showing, setShowing] = useState<InfoTextRequest | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  /**
   * Measured content box, tagged with the text it belongs to. One field, not a
   * size plus a separate key: two values that can disagree about which text
   * they describe is the `AmmoReadout` split-visibility shape, and here the
   * disagreement would place the panel using the previous tooltip's height.
   */
  const [size, setSize] = useState<{ key: string; width: number; height: number } | null>(null);

  useEffect(() => {
    const track = (e: MouseEvent): void => {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
    };
    window.addEventListener('mousemove', track);

    let raf = 0;
    const pump = (): void => {
      // One tick per frame, exactly as `update()` runs once per frame. This is
      // what clears the panel when nothing re-asserted.
      const next = keepAlive.tick();
      setShowing((prev) => (prev?.text === next?.text && prev === next ? prev : next));
      raf = requestAnimationFrame(pump);
    };
    pump();

    return () => {
      window.removeEventListener('mousemove', track);
      cancelAnimationFrame(raf);
    };
  }, []);

  // Runs after every render, so a changed tooltip re-measures before paint.
  // Keyed on the text: re-measuring on every frame would set state in a loop.
  useLayoutEffect(() => {
    const key = showing?.text;
    if (key === undefined || size?.key === key) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setSize({ key, width: r.width - CSS_PADDING, height: r.height - CSS_PADDING });
    // Both deps are the guard above, restated: re-run when the tooltip's text
    // changes or when a measurement lands. Without them this runs after every
    // frame's `setShowing`, which is harmless only because of that guard —
    // and relying on a guard to stop a loop the deps should stop is how it
    // starts looping again the next time someone edits the condition.
  }, [showing?.text, size?.key]);

  if (!showing) return null;

  const measured = size?.key === showing.text ? size : null;
  const box = placeInfoText({
    mouseX: cursor.x,
    mouseY: cursor.y,
    textWidth: measured?.width ?? 0,
    textHeight: measured?.height ?? 0,
    showLeft: showing.showLeft,
    showTop: showing.showTop,
  });

  const runs =
    showing.titleLength !== undefined || showing.noteLength !== undefined
      ? achievementRuns(showing.text, showing.titleLength ?? 0, showing.noteLength ?? 0)
      : [{ text: showing.text, style: 'body' as const }];

  return (
    <div
      ref={ref}
      className="info-text"
      role="tooltip"
      style={{
        left: box.x,
        top: box.y,
        // Hidden for the one frame between "text is in the DOM" and "we know
        // how big it is". `visibility`, not unmounting: an unmounted node has
        // no box to measure, so the two-pass would never converge.
        visibility: measured === null ? 'hidden' : 'visible',
      }}
    >
      {runs.map((run, i) => (
        <span key={i} className={`info-text__run info-text__run--${run.style}`}>
          {run.text}
        </span>
      ))}
    </div>
  );
}
