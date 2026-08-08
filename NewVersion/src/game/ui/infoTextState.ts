/**
 * Whether the hover panel is showing — `PartInfoText.showText`.
 *
 * ── A per-frame keep-alive, not a start/stop toggle ───────────────────────
 * `update()` clears `showText` at the end of **every** frame (`:165`), and each
 * trigger re-asserts it from its own update loop while the cursor is over it
 * (`ImageEnemy.as:186`, `ButtonOptions.as:97`). So the flag means *"something
 * wants the panel this frame"*, never *"open the panel"*.
 *
 * **This is the same shape as `SoundManager`'s `flameThrowerPlay`/`burningPlay`**
 * (`SoundManager.as:1040-1041`), ported in T80 — and the trap is the same one
 * that pass documented: wiring it as a toggle makes it stop early. There, a
 * caller that fired once on the triggering event instead of on every firing
 * frame got one frame of volume ramp and then a fade, which sounds like a click
 * rather than a loop. Here the equivalent is a panel that flickers for one frame
 * and vanishes.
 *
 * ── Why keep it in the DOM, where `mouseleave` exists ─────────────────────
 * The poll is a Flash workaround, and it would be reasonable to ask whether a
 * DOM port should just use enter/leave events. It should not, and the reason is
 * a real failure rather than fidelity for its own sake: **`mouseleave` does not
 * fire when the element under the cursor unmounts.** A shop row that is bought
 * and re-rendered, or a screen that navigates away, leaves the panel stuck with
 * no event to clear it. The keep-alive has no such state — nothing re-asserts,
 * so it closes on the next frame.
 */

export interface InfoTextRequest {
  /** The tooltip body. */
  text: string;
  /** `:193` — which side of the cursor to open toward. Fixed per trigger. */
  showLeft: boolean;
  /** `:194`. */
  showTop: boolean;
  /**
   * `:195-205` — an achievement's title/note lengths, for the styled runs.
   * Absent for a plain tooltip, which is most of them.
   */
  titleLength?: number;
  noteLength?: number;
}

/**
 * Holds the current request and forgets it unless it is renewed.
 *
 * Deliberately not a `showText` boolean plus a payload: two fields can disagree
 * about whether anything is showing, and `AmmoReadout`'s `capacity <= 0` guard
 * is this project's cautionary tale for spreading one widget's visibility across
 * several values.
 */
export class InfoTextKeepAlive {
  private requested: InfoTextRequest | null = null;
  private current: InfoTextRequest | null = null;

  /** Re-assert every frame the cursor is over the trigger — `:167`, `:186`. */
  keepAlive(request: InfoTextRequest): void {
    this.requested = request;
  }

  /**
   * One frame — `update()` at `:149-166`.
   *
   * Returns what should be on screen now, and clears the request, so a trigger
   * that stops asking closes the panel on the next tick.
   */
  tick(): InfoTextRequest | null {
    this.current = this.requested;
    this.requested = null;
    return this.current;
  }

  /** What the last `tick` settled on. */
  get showing(): InfoTextRequest | null {
    return this.current;
  }
}
