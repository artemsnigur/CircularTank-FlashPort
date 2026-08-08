/**
 * The single keep-alive every trigger writes to and the panel reads — the port
 * of the AS3's one `PartInfoText` instance per screen, handed to its buttons
 * as `pText`.
 *
 * Split out of `InfoText.tsx` for the reason `gameBootstrap.ts` is split out of
 * `GameCanvas.tsx`: a file that exports both a component and other values
 * silently breaks Fast Refresh.
 *
 * Module scope, like the store bridge in `main.tsx` and for the same reason —
 * triggers and panel must share one instance, and it must survive StrictMode's
 * double effect invocation without being rebuilt.
 */
import { InfoTextKeepAlive } from '../game/ui/infoTextState';

export const keepAlive = new InfoTextKeepAlive();

/**
 * Last known cursor position, in viewport coordinates.
 *
 * A plain object rather than state: it is read during the panel's render on
 * every frame, and routing it through `setState` would re-render the whole
 * panel on every mouse move to produce the same output.
 */
export const cursor = { x: 0, y: 0 };
