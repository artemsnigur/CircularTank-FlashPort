/**
 * What the countdown *shows* — `PartInterface.as:303-308`, `:723-742`,
 * `:997-1029` and the nine expiry tweens at `:713-721`.
 *
 * Presentation only. The timer, the flag and the update gate are
 * `waves/countdown.ts` and `waves/countdownGate.ts`, and nothing here can
 * change them — this module is pure functions over a frame count.
 *
 * ── The panel ─────────────────────────────────────────────────────────────
 * Four display objects, built at `:303-307`: a `BackgroundText` panel, the big
 * countdown digit, a `"<Mode> Mode"` label, and a red objective line. On expiry
 * all four fade (20 frames) and slide up by 168 units (30 frames), which is the
 * eight `valueTweenOut*` tweens; the ninth is a flag-marker scale unrelated to
 * this panel.
 */

const AS3_FPS = 30;

/** `:305` — the big digit's own text is empty until the first cue. */
export const NO_LABEL = '';

/**
 * The digit showing at `framesLeft` — `:723`, `:728`, `:733`, `:738`.
 *
 * The AS3 *assigns* text on an exact frame and leaves it, so the label is a
 * step function of the counter rather than an event. Modelling it that way
 * means a dropped frame changes when the digit appears, never whether it does.
 */
export function countdownLabel(framesLeft: number): string {
  if (framesLeft > 54) return NO_LABEL;
  if (framesLeft > 36) return '3';
  if (framesLeft > 18) return '2';
  if (framesLeft > 0) return '1';
  return 'GO!';
}

/** `:713-721` — the fade runs 20 frames, the slide 30. */
const FADE_OUT_FRAMES = 20;
const SLIDE_OUT_FRAMES = 30;
export const FADE_OUT_MS = (FADE_OUT_FRAMES / AS3_FPS) * 1000;
export const SLIDE_OUT_MS = (SLIDE_OUT_FRAMES / AS3_FPS) * 1000;

/**
 * How far the panel travels on its way out, in design units.
 *
 * All four objects move by the same delta even though they start at different
 * y: `bgText` 68 → -100 (`:68`), the digit 60 → -108 (`:72`), and both labels
 * 90 → -78 (`:76`, `:80`). Every pair is **-168**, which is what makes this one
 * number rather than four.
 */
export const SLIDE_OUT_DISTANCE = 168;

type ObjectiveMode = 'Normal' | 'Tower' | 'Defense' | 'Flag' | 'Boss';

export interface ObjectiveInput {
  mode: ObjectiveMode;
  /** `enemyModel[level-1][0]` — the level's enemy total. */
  totalEnemies: number;
  /** `flagModel[level-1][0]`. */
  flagCount: number;
  /** `ScreenGame.bossAmount`. */
  bossAmount: number;
  /**
   * `DifficultyMultipliers.multiplierAmount*` — applied to the enemy total on
   * Medium and Hard (`:1007`, `:1011`).
   *
   * **It is 1 on all three difficulties in the AS3** (`DifficultyMultipliers.as:6`,
   * `:8`), so the three branches produce the same string. Applied anyway rather
   * than simplified away: the multiplier is the rule, and 1 is data. If the
   * table ever changes, this follows it instead of quietly disagreeing.
   */
  amountMultiplier: number;
}

/**
 * The red objective line — `setObjectiveCountText` (`:997-1029`).
 *
 * Three shapes, and the Boss one is the only that inflects for number.
 */
export function objectiveText(input: ObjectiveInput): string {
  const { mode, totalEnemies, flagCount, bossAmount, amountMultiplier } = input;

  if (mode === 'Flag') return `Collect ${flagCount} Flags`;

  if (mode === 'Boss') {
    // `:1020-1027` — singular only at exactly one.
    return bossAmount === 1 ? 'Kill 1 Boss' : `Kill ${bossAmount} Bosses`;
  }

  // Normal, Tower and Defense share one branch (`:999`).
  return `Kill ${Math.round(totalEnemies * amountMultiplier)} Enemies`;
}

/** `:306` — the mode label, e.g. `"Flag Mode"`. */
export function modeLabel(mode: string): string {
  return `${mode} Mode`;
}

/**
 * ── The reload-bar gate at `drawReloadBars` (`:750-752`) — ported in T78 ──
 *
 * `if(countDown > 0) height1 = 0` forces the **primary** reload bar empty for
 * the duration of the opening countdown. Only the primary: `height2` is
 * computed at `:766` with no countdown branch at all, so the secondary's bar
 * shows its real state throughout. That asymmetry looks like an oversight and
 * is the original's.
 *
 * It lives in `weapons/reloadBars.ts` now that there are bars to gate. The
 * `countdownRunning` flag it takes is this module's countdown, not a reload
 * one — the name in `drawReloadBars` is the trap, and it is documented there.
 */
