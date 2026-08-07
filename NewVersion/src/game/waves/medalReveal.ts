/**
 * The results screen's medal stamp-in — `ScreenStatus.as:1147-1163`.
 *
 * Three icons appear one at a time, each with its own sound, driven by
 * `countTime` reaching 10, 20 and 30.
 *
 * ── This is not the level-select medal reveal ─────────────────────────────
 * Worth stating up front, because the two were conflated in this repo's own
 * notes for several passes and the mistake would have scoped a large piece of
 * work onto a small one.
 *
 * `progressLevelButtons` (`ScreenLevelSelect.as:518-545`) animates the
 * difference between `worldsValuesArrays` and `worldsValuesVisibleArrays` — the
 * lagging-clone model — and is what `Unlock` hangs off. **This has nothing to do
 * with either table.** `valueIconArray` is built at `:361-401` over
 * `valuesCount`, and `valuesCount = values` (`:262`) where `values` is a plain
 * hp threshold (`:246-260`): `>=95` is 3, `>=75` is 2, `>=1` is 1.
 *
 * That is `medalsForHp`, which the port already computes and banks. So this is
 * presentation timing over a number that is already right, and it needs no new
 * model.
 *
 * ── Only earned medals sound ──────────────────────────────────────────────
 * Each push is guarded by `valueIconArray[n] != null` (`:1147`, `:1153`,
 * `:1159`), and the array holds exactly `valuesCount` icons. A one-medal clear
 * therefore plays `Award1` alone — not three sounds against one icon, and not a
 * sound for a medal that was not earned.
 */

const AS3_FPS = 30;

/**
 * `:1147`, `:1153`, `:1159` — the `countTime` values each icon stamps in on.
 *
 * Kept in AS3 frames because that is what the source states; the milliseconds
 * below are derived. Same treatment, and the same `AS3_FPS`, as
 * `waves/countdown.ts` — the two conversions are asserted against each other in
 * the tests, so a drift in either is a failure rather than a discrepancy nobody
 * notices.
 */
export const MEDAL_STAMP_FRAMES = [10, 20, 30] as const;

/** 333.3 / 666.7 / 1000 ms. Derived, so the frames stay the stated source. */
export const MEDAL_STAMP_MS: readonly number[] = MEDAL_STAMP_FRAMES.map(
  (frames) => (frames / AS3_FPS) * 1000,
);

export type MedalCue = 'Award1' | 'Award2' | 'Award3';

/** In stamp order — `:1151`, `:1157`, `:1163`. */
export const MEDAL_CUES: readonly MedalCue[] = ['Award1', 'Award2', 'Award3'];

/**
 * How many medals are showing at `elapsedMs`, never more than were earned.
 *
 * The cap is the `valueIconArray[n] != null` guard: the array is only as long
 * as the medal count, so a later `countTime` finds nothing to reveal.
 */
export function medalsShownAt(elapsedMs: number, earned: number): number {
  const capped = Math.max(0, Math.min(3, Math.trunc(earned)));
  let shown = 0;
  for (let i = 0; i < capped; i += 1) {
    if (elapsedMs >= MEDAL_STAMP_MS[i]) shown += 1;
  }
  return shown;
}

/**
 * Cues crossed in `(fromMs, toMs]`, in stamp order.
 *
 * A half-open interval so a cue fires exactly once across consecutive calls,
 * and a long frame that spans several thresholds returns all of them — the same
 * crossing model `tickCountdown` uses, and for the same reason: an equality
 * test on a fractional timer is stepped over.
 */
export function medalCuesBetween(fromMs: number, toMs: number, earned: number): MedalCue[] {
  const capped = Math.max(0, Math.min(3, Math.trunc(earned)));
  const cues: MedalCue[] = [];
  for (let i = 0; i < capped; i += 1) {
    const at = MEDAL_STAMP_MS[i];
    if (fromMs < at && toMs >= at) cues.push(MEDAL_CUES[i]);
  }
  return cues;
}

/** When the last earned medal has stamped in — nothing moves after this. */
export function medalRevealDurationMs(earned: number): number {
  const capped = Math.max(0, Math.min(3, Math.trunc(earned)));
  return capped === 0 ? 0 : MEDAL_STAMP_MS[capped - 1];
}
