/**
 * A tooltip that follows the pointer.
 *
 * ── Why it is not `useInfoText` ───────────────────────────────────────────
 * `InfoText` is the port of `PartInfoText`: one panel, anchored to a *corner*
 * chosen per trigger from `infoTextSites.ts`, because that is what the AS3
 * does. It is still what the level guide's presets and the shop's rows use.
 *
 * This is a different thing for a different job — a readout that tracks the
 * cursor across a 45-tile grid, where a fixed corner would mean looking away
 * from what you are pointing at.
 *
 * ── The performance rule, which is the whole design ───────────────────────
 * **Nothing here re-renders on pointer movement.** A `useState` per `mousemove`
 * would run React 60+ times a second over a screen that also has a Phaser
 * canvas compositing behind it; on this screen that is the difference between
 * smooth and unusable. So:
 *
 *   - **Position** is written straight to `style.transform` through a ref, in
 *     a listener attached once. React never sees a coordinate.
 *   - **Content** is a prop, and changes only when the pointer crosses into a
 *     different tile — a handful of renders per second at worst, not per
 *     pixel.
 *
 * `transform` specifically, not `left`/`top`: it is composited, so a move
 * costs no layout and no paint.
 */
import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { EnemyTile } from './EnemyTile';
import type { LevelPreview } from '../game/levels/levelPreview';

/** Clear of the cursor, and offset down-right so the arrow never covers it. */
const OFFSET_X = 18;
const OFFSET_Y = 20;

/**
 * The last pointer position, tracked continuously.
 *
 * **Because the tooltip mounts *after* the move that summoned it.** The first
 * `mousemove` inside a tile is what sets `hovered`; by the time this component
 * exists that event is gone, so with only a `mousemove` listener the card
 * would sit at the origin until the pointer happened to move again — a card
 * flashing in the top-left corner of the screen and then jumping.
 *
 * Module scope and one listener for the whole app: the alternative is every
 * trigger carrying the coordinate through the state that mounts this, which is
 * the per-pixel React update the whole design exists to avoid.
 */
const pointer = { x: 0, y: 0, seen: false };
if (typeof window !== 'undefined') {
  window.addEventListener(
    'mousemove',
    (event) => {
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.seen = true;
    },
    { passive: true },
  );
}

/**
 * The mechanism, with no opinion about what it shows.
 *
 * **Two screens use this and there is one copy of it**, which is the point:
 * the corner flash, the hit-test loop and the reflow-per-hover were three
 * separate defects and each was fixed here. A second implementation for the
 * achievements board would have started from the broken version of all three.
 *
 * `contentKey` is what tells it the body changed — it re-places on a new key,
 * because the card's size changes with its content and the flip decision above
 * is measured from that size.
 */
export function CursorTip({
  open,
  contentKey,
  className,
  children,
}: {
  open: boolean;
  contentKey: string | null;
  /** An extra class on the card, for a screen that needs its own width. */
  className?: string;
  children: React.ReactNode;
}): React.ReactElement | null {
  const box = useRef<HTMLDivElement>(null);

  /*
   * **`useLayoutEffect`, and this is the fix for the corner flash.**
   *
   * `useEffect` runs *after* the browser paints, so the card was painted once
   * with no `transform` — one frame at (0, 0) in the top-left — before the
   * effect moved it. A layout effect runs before that paint, so the first
   * frame the user sees is already in the right place.
   *
   * Belt and braces with the `--placed` class below: if no pointer position
   * has ever been recorded, the card stays invisible rather than appearing in
   * the corner. That is the case a layout effect alone does not cover — a
   * hover raised without any prior `mousemove`, which is what a touch tap or a
   * programmatic focus produces.
   */
  useLayoutEffect(() => {
    if (!open) return;

    const place = (x: number, y: number): void => {
      const el = box.current;
      if (!el) return;

      /*
       * Flip before the edge rather than after it. Measured from the element
       * itself, so a long body flips at the right moment instead of at a
       * guessed width — and read inside the listener because the box changes
       * size with its content.
       */
      const { offsetWidth: w, offsetHeight: h } = el;
      const left = x + OFFSET_X + w > window.innerWidth ? x - OFFSET_X - w : x + OFFSET_X;
      const top = y + OFFSET_Y + h > window.innerHeight ? y - OFFSET_Y - h : y + OFFSET_Y;

      el.style.transform = `translate3d(${Math.round(left)}px, ${Math.round(top)}px, 0)`;
    };

    // Place it where the pointer already is, before waiting for it to move —
    // the `mousemove` that summoned this is over by the time it exists.
    if (pointer.seen) {
      place(pointer.x, pointer.y);
      box.current?.classList.add('cursor-tip--placed');
    }

    const move = (event: MouseEvent): void => {
      place(event.clientX, event.clientY);
      // Reveals on the first real move if there was no position on mount.
      box.current?.classList.add('cursor-tip--placed');
    };

    // `passive`: this never calls `preventDefault`, and saying so lets the
    // browser skip waiting on it before it scrolls.
    window.addEventListener('mousemove', move, { passive: true });
    return () => window.removeEventListener('mousemove', move);
  }, [open, contentKey]);

  if (!open) return null;

  /*
   * **Portalled to `<body>`, and that is not tidiness.**
   *
   * Two things in either screen's subtree would break a `position: fixed`
   * child: `.screen-shell__body` sets `overflow: hidden`, and it sets
   * `container-type: size` — which implies `contain: layout`, and a
   * layout-contained element becomes the containing block for its *fixed*
   * descendants. So a tooltip rendered in place would be positioned against
   * that box and clipped by it, losing a corner near every screen edge.
   *
   * It also has to be out of the grid's flow entirely. Rendered inline it is a
   * grid item of the screen's layout, appearing and vanishing on every hover —
   * a full reflow of both columns each time the pointer crosses a tile, which
   * is the "everything twitches" this was reported as.
   *
   * `aria-hidden`: whatever it describes already carries the same facts in its
   * accessible name, and a live region that moved with the mouse would
   * interrupt a screen reader continuously.
   */
  return createPortal(
    <div
      className={`cursor-tip${className === undefined ? '' : ` ${className}`}`}
      ref={box}
      aria-hidden="true"
    >
      {children}
    </div>,
    document.body,
  );
}

export function CursorTooltip({
  preview,
  title,
}: {
  /** What to describe, or `null` to show nothing. */
  preview: LevelPreview | null;
  title: string;
}): React.ReactElement | null {
  if (preview === null) return null;

  return (
    <CursorTip open contentKey={title}>
      <p className="cursor-tip__title">{title}</p>
      <p className="cursor-tip__mode">{preview.mode} mode</p>
      <p className="cursor-tip__objective">{preview.objective}</p>

      {/*
        The roster, as pictures — `addEnemyImages` (`:1112-1160`) draws the
        level's enemies with their share above and their tier below, and this
        is the same readout at tooltip scale. A name alone told you nothing you
        could recognise mid-hover.
      */}
      {preview.rows.length > 0 && (
        <ul className="cursor-tip__enemies">
          {preview.rows.map((row, i) => (
            <li key={`${row.type}-${i}`} className="cursor-tip__enemy">
              <span className="cursor-tip__amount">{row.amountLabel}</span>
              {row.shape !== undefined && (
                <EnemyTile layers={[row.shape]} label={row.type} size="var(--tip-enemy)" />
              )}
              <span className="cursor-tip__tier">{row.levelLabel}</span>
            </li>
          ))}
        </ul>
      )}
    </CursorTip>
  );
}
