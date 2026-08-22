/**
 * Which ground theme each level of the redesigned campaign uses — decision `D-4`.
 *
 * ── The decision this records ─────────────────────────────────────────────
 * The redesign cuts nine worlds to four (`docs/CAMPAIGN-REDESIGN-PLAN.md`), and
 * the first answer to `D-4` was "pick four themes and retire five". Looking at
 * all nine side by side in the `#themes` gallery reversed that: **all nine are
 * kept**, and a world moves through two or three of them in solid blocks.
 *
 * So a world is no longer one place. World 1 opens in Desert, crosses into
 * Grass at 16 and reaches Beach at 31 — the ground changing under you as the
 * campaign advances, rather than at a world boundary you only see in a menu.
 *
 * -- This is a build-time specification, not runtime code ----------------
 *
 * **This file is the source of truth for the theme blocks, and it is
 * consumed by reading it as text rather than by importing it.**
 * `gen-levels.mjs:215` parses it and bakes a `theme` onto every row of the
 * generated `levelData.ts`; `gen-campaign-plan.mjs:147` parses it again so
 * the plan document shows the same mapping. Nothing imports it at runtime,
 * because by the time the game runs the answer is already in the table.
 *
 * **Two consequences, and the second is a trap.** The blocks below are
 * parsed with a regex, so their *formatting* is load-bearing: reformatting
 * this file can break the generator without changing a single value. That
 * is not hypothetical -- running Prettier over it once rewrote the quotes
 * and the wrapping, which is why this warning is here.
 *
 * **And `knip` reports this file as unused, wrongly.** Knip follows
 * imports, and a `readFileSync` is not one. The edge is real but invisible
 * to it. Deleting the file is still caught, just not by knip: both
 * generators throw on the missing file, so `npm run levels:data:check`
 * fails. The guarantee is the generator's own failure, not this paragraph.
 *
 * Recorded in code rather than in the plan's prose because a boundary
 * written in a document drifts from a boundary written in code, and this
 * one has already been decided twice.
 *
 * **This section used to say the opposite** -- "nothing consumes this at
 * runtime, because the 180-level table it describes does not exist". That
 * was true when the blocks were written (T249) and stopped being true when
 * the table landed (T252); it survived four passes because a header nobody
 * has a reason to re-read is the last thing to be updated.
 *
 * ── The rules the blocks obey ─────────────────────────────────────────────
 * Every one is checked in `campaignThemes.test.ts` rather than described:
 *
 *   - each world's blocks start at level 1 and ascend, so every level of every
 *     world resolves to exactly one theme;
 *   - a theme appears in **one solid run** and never returns — no A, B, A;
 *   - all nine themes are used, and each exactly once across the campaign.
 *
 * That third rule is what makes this "keep all nine" rather than "keep some of
 * nine", and it is the one a later edit is most likely to break by accident.
 */

import type { LevelTheme } from './levelData';

/** Levels per world in the redesigned campaign. */
export const CAMPAIGN_LEVELS_PER_WORLD = 45;

/** Worlds in the redesigned campaign. */
export const CAMPAIGN_WORLD_COUNT = 4;

/** One run of levels on a single theme. `from` is inclusive and 1-based. */
export interface ThemeBlock {
  theme: LevelTheme;
  from: number;
}

/**
 * The mapping, exactly as specified.
 *
 * Written as a start level per block rather than a `from`/`to` pair: a pair
 * lets the two halves disagree — a gap or an overlap between blocks — and there
 * is no reading of that which is correct. With starts alone, a block runs until
 * the next one begins and the world's last block runs to 45, so the levels are
 * covered exactly once by construction.
 */
export const CAMPAIGN_THEMES: Readonly<Record<number, readonly ThemeBlock[]>> = {
  1: [
    { theme: 'Desert', from: 1 },
    { theme: 'Grass', from: 16 },
    { theme: 'Beach', from: 31 },
  ],
  2: [
    { theme: 'BlueDirt', from: 1 },
    { theme: 'Concrete', from: 23 },
  ],
  3: [
    { theme: 'Biology', from: 1 },
    { theme: 'Hell', from: 23 },
  ],
  4: [
    { theme: 'Futuristic', from: 1 },
    { theme: 'MagicStone', from: 23 },
  ],
};

/** A block with its end resolved, for display and for range checks. */
export interface ResolvedThemeBlock extends ThemeBlock {
  /** Inclusive last level of the run. */
  to: number;
  /** How many levels the run covers. */
  levels: number;
}

/**
 * A world's blocks with their ends filled in.
 *
 * The end of a block is the level before the next one starts, and the last
 * block ends at 45 — derived here so no caller has to know that rule, and so
 * "the blocks tile the world" cannot be broken by editing one number.
 */
export function themeBlocks(world: number): ResolvedThemeBlock[] {
  const blocks = CAMPAIGN_THEMES[world];
  if (!blocks) return [];

  return blocks.map((block, index) => {
    const next = blocks[index + 1];
    const to = next ? next.from - 1 : CAMPAIGN_LEVELS_PER_WORLD;
    return { ...block, to, levels: to - block.from + 1 };
  });
}

/**
 * The theme a level plays, or null when the world or level is out of range.
 *
 * Null rather than a fallback theme: a caller asking about a level that does
 * not exist has a bug, and answering `Desert` would hide it. The redesign has
 * four worlds of 45, and this says so.
 */
export function themeForCampaignLevel(world: number, level: number): LevelTheme | null {
  if (!Number.isInteger(level) || level < 1 || level > CAMPAIGN_LEVELS_PER_WORLD) return null;

  const blocks = CAMPAIGN_THEMES[world];
  if (!blocks) return null;

  // Last block whose start is at or below the level. The table is ascending,
  // which `campaignThemes.test.ts` checks — this loop relies on it.
  let found: LevelTheme | null = null;
  for (const block of blocks) {
    if (block.from <= level) found = block.theme;
  }
  return found;
}

/** Every theme the redesigned campaign uses, in the order it reaches them. */
export function campaignThemeOrder(): LevelTheme[] {
  const order: LevelTheme[] = [];
  for (let world = 1; world <= CAMPAIGN_WORLD_COUNT; world += 1) {
    for (const block of CAMPAIGN_THEMES[world] ?? []) order.push(block.theme);
  }
  return order;
}
