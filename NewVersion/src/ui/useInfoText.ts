/**
 * What a tooltip trigger uses — the port of `cursorOver` plus the per-frame
 * `pText.showText = true` at `Achievement.as:96` / `ButtonUpgradeInfo.as:53`.
 */
import { useEffect, useRef, useState } from 'react';

import { keepAlive } from './infoTextChannel';
import type { InfoTextRequest } from '../game/ui/infoTextState';

/**
 * Marks a trigger as hovered for as long as it is.
 *
 * Returns props to spread onto the trigger. The rAF loop is the re-assert:
 * while hovered the request is renewed every frame, and the moment this
 * component stops rendering — unmounted, navigated away, list re-keyed — the
 * loop is cancelled and the panel closes on the next tick with no event
 * required. That is the case `mouseleave` cannot cover, and the reason
 * `infoTextState.ts` keeps the poll instead of porting to enter/leave.
 */
export function useInfoText(request: InfoTextRequest): {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
} {
  const [hovered, setHovered] = useState(false);
  // Held in a ref so changing the text does not restart the loop.
  const latest = useRef(request);
  latest.current = request;

  useEffect(() => {
    if (!hovered) return;
    let raf = 0;
    const pump = (): void => {
      keepAlive.keepAlive(latest.current);
      raf = requestAnimationFrame(pump);
    };
    pump();
    return () => cancelAnimationFrame(raf);
  }, [hovered]);

  return {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  };
}
