/**
 * Keeps the Web Audio context running — the reason music "only started after
 * pressing ESC".
 *
 * ── The symptom, and why it pointed here ──────────────────────────────────
 * Gameplay requested its track in `create()` and nothing was heard until the
 * player pressed ESC. The request was never the problem: `startCrossfade`
 * retries every frame until the file loads and then plays it, so the sound was
 * *playing* into a **suspended** context. ESC is a `keydown`, which is one of
 * the events a browser accepts as a gesture, so the context resumed and the
 * track that had been running silently became audible mid-way.
 *
 * ── Why Phaser's own unlock is not enough ─────────────────────────────────
 * `WebAudioSoundManager.unlock` installs its handlers **only when the context
 * is `suspended` at construction**. Chrome frequently reports `running` at
 * that moment and suspends it afterwards under the autoplay policy, so the
 * handlers are never installed and nothing ever resumes it. That is a race
 * this port cannot win by waiting.
 *
 * So this listens itself, on `document`, in the **capture** phase and for the
 * events a browser actually counts as a gesture. Capture matters: a React
 * handler that calls `stopPropagation` — which the overlays are free to do —
 * would hide a bubbling listener from the gesture entirely.
 *
 * It is deliberately **not** one-shot. A context can be suspended again by a
 * background tab or an OS audio change, so the listeners stay and every
 * gesture re-checks. The check is a string comparison on an already-running
 * context, which costs nothing.
 */

/** What the browser accepts as a gesture, and what we can see from `document`. */
const GESTURES = ['pointerdown', 'mousedown', 'touchend', 'keydown'] as const;

/** The slice of `AudioContext` this needs, so a test can supply one. */
export interface ResumableContext {
  state: string;
  resume: () => Promise<void>;
}

/**
 * Resumes the context if it is suspended. Safe to call on every gesture.
 *
 * A rejected `resume()` is swallowed: it happens when the call is not actually
 * within a user gesture, and there is nothing useful to do about it — the next
 * gesture tries again. Throwing here would take the input handler with it.
 */
export function resumeIfSuspended(context: ResumableContext | null | undefined): boolean {
  if (!context || context.state !== 'suspended') return false;

  try {
    void context.resume().catch(() => {});
  } catch {
    return false;
  }
  return true;
}

/**
 * Listens for gestures and resumes the context on each. Returns a teardown.
 *
 * `getContext` is a thunk rather than a value because Phaser can replace the
 * context — and because at install time there may not be one yet.
 */
export function installAudioUnlock(
  getContext: () => ResumableContext | null | undefined,
  target: EventTarget = document,
): () => void {
  const onGesture = (): void => {
    resumeIfSuspended(getContext());
  };

  for (const type of GESTURES) {
    target.addEventListener(type, onGesture, { capture: true, passive: true });
  }

  return () => {
    for (const type of GESTURES) {
      target.removeEventListener(type, onGesture, { capture: true });
    }
  };
}
