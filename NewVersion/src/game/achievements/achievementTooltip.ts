/**
 * The achievement hover panel's text — `Achievement.as:60-81`.
 *
 * ── One composition, two screens ──────────────────────────────────────────
 * The AS3 builds this once on the `Achievement` object and both its `changeText`
 * calls read it: `:99` on the achievements board and `:103` on the level-complete
 * status screen, differing only in which way the panel opens. This port has two
 * *components* rather than one object, so the composition lives here and both
 * call it — rather than each writing out `title + "\n" + description + note`
 * and drifting.
 *
 * That matters more than it looks. The panel styles by **character offset**
 * (`PartInfoText.as:195-205` takes `titleLength` and `noteLength`), so a second
 * copy that composed the same string with, say, one newline instead of two
 * would still produce correct-looking text with the wrong ranges bolded.
 */

/**
 * `:60-80` — the difficulty line, spelled as the AS3 spells it.
 *
 * ── There is **always** a note, and T99 got that wrong ────────────────────
 * The first port of this (the achievements board, T99) added a note only when
 * the achievement was *earned* and wrote it as `(Medium)`. Both halves are
 * wrong against the source, which branches on `theDifficulty` first and always
 * lands on a string:
 *
 *     theDifficulty false            -> "(Difficulty doesn't matter.)"   :62-63
 *     theDifficulty true, unearned   -> "(Difficulty matters.)"          :68-69
 *     theDifficulty true, thisState  -> "(Completed on EASY/MEDIUM/HARD.)"
 *                                                                       :70-78
 *
 * So an unearned achievement is not silent — it tells you *whether* difficulty
 * will be recorded, which is the useful thing to know before attempting it.
 * Consolidating the two screens onto this function fixes the board's text as a
 * side effect; that is a deliberate fidelity correction, not a drive-by.
 */
const COMPLETED_ON: Readonly<Record<number, string>> = {
  1: "\n\n(Completed on EASY.)",
  2: '\n\n(Completed on MEDIUM.)',
  3: '\n\n(Completed on HARD.)',
};
const DIFFICULTY_IRRELEVANT = "\n\n(Difficulty doesn't matter.)";
const DIFFICULTY_MATTERS = '\n\n(Difficulty matters.)';

export interface AchievementTooltipInput {
  title: string;
  description: string;
  /** Whether this achievement records the difficulty it was earned on. */
  difficultyMatters: boolean;
  /** 1/2/3 once earned, or null. */
  difficulty: number | null;
  earned: boolean;
}

export interface AchievementTooltipText {
  /** `theText` — what the panel shows. */
  text: string;
  /** `theTitle.length` — the leading run styled in the display face (`:199`). */
  titleLength: number;
  /** `difficultyText.length` — the trailing run, smaller (`:203`). */
  noteLength: number;
}

/**
 * The trailing note alone — `:62-78`, without the leading blank line.
 *
 * Split out because the board's cursor tooltip lays the three parts out as
 * separate elements while `PartInfoText` styles them as character ranges of
 * one string. **Both must say the same thing**, and the way to guarantee that
 * is for the branch to exist once; two copies of a five-way branch is exactly
 * the "one rule, two copies" shape this project keeps finding.
 */
export function achievementNote(input: AchievementTooltipInput): string {
  const note = !input.difficultyMatters
    ? DIFFICULTY_IRRELEVANT
    : !input.earned || input.difficulty === null
      ? DIFFICULTY_MATTERS
      : COMPLETED_ON[input.difficulty] ?? DIFFICULTY_MATTERS;
  return note.trimStart();
}

/** `:60-81`. Every case yields a note — see `COMPLETED_ON` above. */
export function achievementTooltip(
  input: AchievementTooltipInput,
): AchievementTooltipText {
  // The AS3's own string keeps the blank line between the goal and the note;
  // `achievementNote` returns the note without it, so it is restored here.
  const note = `\n\n${achievementNote(input)}`;

  return {
    text: `${input.title}\n${input.description}${note}`,
    titleLength: input.title.length,
    noteLength: note.length,
  };
}

/**
 * `Achievement.as:45-59` — which clip frame the icon shows.
 *
 *     thisState -1      -> 1   locked
 *     thisState  0 / 1  -> 2   earned; no difficulty, or Easy
 *     thisState  2      -> 3   Medium
 *     thisState  3      -> 4   Hard
 *
 * `ScreenStatus.as:986-998` sets `thisState` from the difficulty just played
 * when the achievement records one, and `0` when it does not.
 *
 * Clamped to the clip's own length by the caller: an achievement whose
 * `difficultyMatters` is false has a **2-frame** clip, so asking for frame 3
 * would be out of range. `achievementArt.test.ts` pins that correspondence.
 */
export function achievementFrame(input: {
  earned: boolean;
  difficultyMatters: boolean;
  difficulty: number | null;
}): number {
  if (!input.earned) return 1;
  if (!input.difficultyMatters || input.difficulty === null) return 2;
  if (input.difficulty <= 1) return 2;
  return input.difficulty === 2 ? 3 : 4;
}
