/**
 * DEV-AID: a record of every sound `SoundManager.queue()` was asked for.
 *
 * ── Why this exists ───────────────────────────────────────────────────────
 * Every verification in this project for the last ten passes has been a frame,
 * and **audio does not appear in a frame**. Without this, wiring 167 remaining
 * trigger sites would land squarely in the category that has already hidden
 * three real defects here: written, unit-pinned, and unobserved.
 *
 * ── `resolved` is the point ───────────────────────────────────────────────
 * `queue()` warns and returns for a name the manifest does not know, so a
 * mistyped or invented trigger is *silent* — it looks exactly like a trigger
 * that has not been written yet. Recording the attempt **before** that early
 * return turns a `console.warn` nobody reads into a row that says
 * `resolved: false`.
 *
 * This is not hypothetical. T37 reported `EnemyShoot` as an invented name on
 * the strength of a literal-string grep; the AS3 pushes it through a variable
 * (`PartGameArea.as:6903`), so the name was real and the sweep was wrong. Had
 * this existed, the question would have been one line of harness output rather
 * than an incorrect entry in the audit.
 *
 * ── What a history entry does and does not prove ──────────────────────────
 * **Proves:** the call site was reached, with a name the manifest resolves, on
 * a known frame.
 *
 * **Does not prove:** that anything was audible. Volume, mute, a suspended
 * `AudioContext` and a failed decode are all downstream of here and all leave
 * the history identical. `audioSelfTest.ts` is the check for that half — it
 * measures a decoded buffer and confirms the transport advanced. Neither check
 * substitutes for the other, and "the sequence is right" must not be read as
 * "the player hears it".
 *
 * ── Removal ───────────────────────────────────────────────────────────────
 * Ships behind `import.meta.env.DEV` on the same schedule as the other dev
 * aids, and is listed in `src/game/devAids.test.ts`.
 */

export interface QueuedSound {
  name: string;
  /** Whether `audioManifest.ts` knows this name. False means it made no sound. */
  resolved: boolean;
  /** Frames since the manager was created — lets a caller ask "same frame?". */
  frame: number;
}

/** Bounded so a long session cannot grow it without limit. */
const MAX_ENTRIES = 2000;

let history: QueuedSound[] = [];
let enabled = false;

/** Turns recording on. Called by `SoundManager` only in a dev build. */
export function enableQueueHistory(): void {
  enabled = true;
}

export function recordQueued(name: string, resolved: boolean, frame: number): void {
  if (!enabled) return;
  history.push({ name, resolved, frame });
  if (history.length > MAX_ENTRIES) history = history.slice(-MAX_ENTRIES);
}

/** Everything recorded so far, oldest first. */
export function queueHistory(): readonly QueuedSound[] {
  return history;
}

export function clearQueueHistory(): void {
  history = [];
}

/**
 * How many times `name` was queued in its busiest single frame.
 *
 * The dedup assertion. `SoundManager.as:1080` resets `sfxPlayedArray` on every
 * drain and skips a name already played that frame, so **ten enemies dying in
 * one frame is one `EnemySquish`, not ten**. That rule fails silently — the
 * game still makes the right sound, just far too much of it — so presence
 * alone cannot see it. This makes the failure a number.
 *
 * Counts *queue attempts*, deliberately, not plays. `queue()` is safe to call
 * repeatedly and the `Set` collapses duplicates downstream, so a caller that
 * fires ten times per frame is a real defect at the call site even though the
 * player hears one sound. Asserting on plays would hide exactly that.
 */
export function peakPerFrame(name: string): number {
  const byFrame = new Map<number, number>();
  let peak = 0;
  for (const entry of history) {
    if (entry.name !== name) continue;
    const next = (byFrame.get(entry.frame) ?? 0) + 1;
    byFrame.set(entry.frame, next);
    if (next > peak) peak = next;
  }
  return peak;
}

/** The names queued, in order, with consecutive repeats kept. */
export function queuedNames(): string[] {
  return history.map((entry) => entry.name);
}

/** Names that were asked for but do not exist — the silent-failure list. */
export function unresolvedNames(): string[] {
  return [...new Set(history.filter((entry) => !entry.resolved).map((entry) => entry.name))];
}

/**
 * Publishes the history on `window` so the look harness can read it.
 *
 * The harness runs in a browser and cannot import a module out of the bundle,
 * so there has to be a handle somewhere. Installed only when recording is
 * enabled, i.e. only in a dev build, and it is the *only* global this aid adds.
 */
export function publishQueueHistory(): void {
  if (!enabled || typeof window === 'undefined') return;
  (window as unknown as Record<string, unknown>).__soundQueue = {
    all: queueHistory,
    names: queuedNames,
    unresolved: unresolvedNames,
    peakPerFrame,
    clear: clearQueueHistory,
  };
}
