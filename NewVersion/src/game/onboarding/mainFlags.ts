/**
 * The seven `Main` statics the save format persists — the last non-computed
 * fields in the slot.
 *
 * Scoped to those seven. `Main` itself is the document class and remains
 * unported; nothing here touches screen routing or the display list.
 *
 * ── What "uih" means ──────────────────────────────────────────────────────
 * UI **hint**. Six of the seven are one-shot onboarding flags following an
 * identical pattern across the button classes:
 *
 *     if (PartTutorial.tutorialOn && Main.uihButtonX == false && !uihActivated)
 *         ... show the glow ...
 *     // and on click:
 *     Main.uihButtonX = true;
 *
 * So a hint shows only while the tutorial is running and only until the player
 * acts on it. `hDifficultyChosen` is the same shape despite its different name
 * (ScreenLevelSelect.as:1029).
 *
 * The seventh, `extraMoneyGiven`, is not a hint: it guards a one-time premium
 * cash grant.
 */

/** The six one-shot hint flags, keyed by the button they belong to. */
export const UI_HINT_IDS = [
  'ButtonLevel',
  'ButtonPlayLevel',
  'ButtonNextLevel',
  'ButtonSquarePage',
  'ButtonUpgrades',
  'DifficultyChosen',
] as const;

export type UiHintId = (typeof UI_HINT_IDS)[number];

export interface MainFlags {
  /** True once the hint has been shown and acted on; it never shows again. */
  uiHints: Record<UiHintId, boolean>;
  /** Main.extraMoneyGiven — the one-time premium grant has been paid out. */
  extraMoneyGiven: boolean;
}

/** Main.as initialisers: every flag starts false. */
export function createInitialMainFlags(): MainFlags {
  return {
    uiHints: {
      ButtonLevel: false,
      ButtonPlayLevel: false,
      ButtonNextLevel: false,
      ButtonSquarePage: false,
      ButtonUpgrades: false,
      DifficultyChosen: false,
    },
    extraMoneyGiven: false,
  };
}

export function isHintDone(flags: MainFlags, id: UiHintId): boolean {
  return flags.uiHints[id];
}

/** What the hint conditions read from elsewhere. */
export interface HintContext {
  /** PartTutorial.tutorialOn — every hint is gated on this. */
  tutorialOn: boolean;
  /** ScreenLevelSelect.getCurrentWorldAndLevel(). */
  currentWorldAndLevel: readonly [number, number];
}

/**
 * Whether a hint should currently be displayed.
 *
 * Two of the six carry an extra condition beyond "tutorial on and not yet
 * done":
 *
 *   - `ButtonUpgrades` requires `uihButtonNextLevel` to be done first
 *     (ButtonUpgrades.as:104), so the upgrades hint cannot appear before the
 *     player has been walked through finishing a level.
 *   - `DifficultyChosen` requires world > 1 or level >= 4
 *     (ScreenLevelSelect.as:1029) — the same gate the `Pause` tutorial uses.
 *
 * The per-button `uihActivated` local is a display-side latch that stops the
 * same glow being spawned twice in one screen; it belongs to the UI component,
 * not here.
 */
export function shouldShowHint(
  flags: MainFlags,
  id: UiHintId,
  context: HintContext,
): boolean {
  if (!context.tutorialOn) return false;
  if (flags.uiHints[id]) return false;

  switch (id) {
    case 'ButtonUpgrades':
      return flags.uiHints.ButtonNextLevel;

    case 'DifficultyChosen': {
      const [world, level] = context.currentWorldAndLevel;
      return world > 1 || level >= 4;
    }

    default:
      return true;
  }
}

/**
 * Marks a hint as done.
 *
 * `ButtonPlayLevel` also marks `ButtonLevel`: ButtonPlayLevel.as:76-78 sets
 * `uihButtonLevel = true` when the play button is pressed, on the reasoning
 * that reaching it means the level button was already found. Reproduced, since
 * skipping it would make the level-button hint reappear later.
 */
export function markHintDone(flags: MainFlags, id: UiHintId): MainFlags {
  const uiHints = { ...flags.uiHints, [id]: true };
  if (id === 'ButtonPlayLevel') uiHints.ButtonLevel = true;

  const changed = UI_HINT_IDS.some((hint) => uiHints[hint] !== flags.uiHints[hint]);
  return changed ? { ...flags, uiHints } : flags;
}

/** Main.as `checkExtraMoney()` — the premium grant amount. */
export const EXTRA_MONEY_AMOUNT = 10000;

interface ExtraMoneyResult {
  flags: MainFlags;
  /** Money after the grant. Unchanged when nothing was paid. */
  money: number;
  granted: boolean;
}

/**
 * `Main.checkExtraMoney()` — pays the premium bonus once.
 *
 * `hasPremium` is the AS3's `extraStuff`. The AS3 calls
 * `SaveManager.savePremiumContent()` unconditionally afterwards; persistence is
 * the caller's job here.
 */
export function grantExtraMoney(
  flags: MainFlags,
  money: number,
  hasPremium: boolean,
): ExtraMoneyResult {
  if (!hasPremium || flags.extraMoneyGiven) {
    return { flags, money, granted: false };
  }
  return {
    flags: { ...flags, extraMoneyGiven: true },
    money: money + EXTRA_MONEY_AMOUNT,
    granted: true,
  };
}

/** How many of the six hints the player has cleared. */
export function hintsCompleted(flags: MainFlags): number {
  return UI_HINT_IDS.filter((id) => flags.uiHints[id]).length;
}
