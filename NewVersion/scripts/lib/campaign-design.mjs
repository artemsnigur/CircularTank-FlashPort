/**
 * The redesigned campaign's shape, in one place.
 *
 * ── Why this is a shared module and not two copies ────────────────────────
 * Two generators need it: `gen-campaign-plan.mjs` writes the document that
 * describes the campaign, and `gen-levels.mjs` writes the data that *is* it. A
 * constant copied into both is a constant that drifts, and the document is the
 * copy nobody re-reads — the plan already carried a stale theme table once,
 * which is what put `campaignThemes.ts` in `src/` and this file here.
 *
 * The themes are the exception and stay in `src/game/levels/campaignThemes.ts`:
 * the *game* needs them at runtime, so they belong in the app and both
 * generators parse them from there.
 *
 * Decisions recorded: `docs/CAMPAIGN-REDESIGN-PLAN.md`, sections 1-5.
 */

export const WORLDS = 4;
export const PER_WORLD = 45;
export const TOTAL_LEVELS = WORLDS * PER_WORLD;

/**
 * Boss levels within every world — `D-5` of the plan's section 3.
 *
 * The original's five (9, 18, 27, 36, 45) are all kept and a new one sits at
 * the midpoint of each gap, so nothing that was a boss stops being one and the
 * cadence a player already reads survives.
 */
export const BOSS_LEVELS = [5, 9, 14, 18, 23, 27, 32, 36, 41, 45];

/**
 * How many bosses each boss level spawns, in order, per world.
 *
 * **World 1 opens on a single boss.** 1-5 is the first boss the player ever
 * meets and has to teach the encounter — the health wipe, that it does not die
 * to one magazine, that support keeps arriving around it. Two at once teaches
 * none of that; it just kills you. Every later level ramps from there.
 */
export const BOSS_AMOUNTS = {
  1: [1, 2, 3, 3, 3, 4, 4, 4, 5, 5],
  2: [3, 3, 4, 4, 4, 5, 5, 5, 6, 6],
  3: [4, 4, 5, 5, 5, 6, 6, 6, 7, 8],
  4: [5, 5, 6, 6, 6, 7, 7, 8, 9, 10],
};

/**
 * The non-boss mode layout for world 1, in level order.
 *
 * Ten segments sit between the boss levels, alternating four and three long,
 * and each three-segment carries the world's one Tower — which lands Tower on
 * 7, 16, 25, 34 and 43, five of them, exactly half its old rate.
 */
export const BASE_LAYOUT = [
  'Normal', 'Flag', 'Defense', 'Normal',
  'Defense', 'Tower', 'Normal',
  'Normal', 'Flag', 'Defense', 'Flag',
  'Flag', 'Tower', 'Defense',
  'Normal', 'Flag', 'Defense', 'Defense',
  'Defense', 'Tower', 'Normal',
  'Normal', 'Flag', 'Defense', 'Normal',
  'Flag', 'Tower', 'Defense',
  'Normal', 'Flag', 'Defense', 'Flag',
  'Normal', 'Tower', 'Flag',
];

/**
 * Worlds 2-4 rotate that sequence by 7 slots each.
 *
 * The Towers sit 7 apart, so a rotation by 7 maps the Tower set onto itself:
 * the Tower cadence is identical in every world while Normal, Flag and Defense
 * land differently. One template, four layouts, and the per-world mode counts
 * come out equal by construction rather than by care.
 */
export const LAYOUT_ROTATION = 7;

/**
 * Where each enemy type debuts, as `world -> [level, ...]`.
 *
 * The **order** is the original's, unchanged — that is the redesign's rule 2.
 * Only the spacing moves: after the opening three the cadence is a flat nine
 * levels, so the longest wait for something new drops from 39 levels to 9.
 */
export const INTRO_LEVELS = {
  1: [1, 2, 4, 11, 19, 28, 37],
  2: [1, 10, 19, 28, 37],
  3: [1, 10, 19, 28, 37],
  4: [1, 10, 19],
};

/** Distinct enemy types a non-boss level should field, `[start, end]` per world. */
export const VARIETY_BAND = {
  1: [2, 4],
  2: [3, 5],
  3: [4, 6],
  4: [4, 6],
};

/**
 * Cap on wave entries.
 *
 * `levelPreview` draws one row per entry and the original's busiest level has
 * six, so six is a layout the level-select panel is known to survive. Seven is
 * a guess, and raising it is a UI change with its own look.
 */
export const MAX_WAVE_ENTRIES = 6;

/**
 * The same cap for a Boss level, which needs one more row.
 *
 * A boss level now fields up to five **distinct** boss types (see
 * `bossRoster`), and each is a row of its own before the support enemies get
 * one. Five bosses plus two support is seven, which is one past what the
 * original ever asked the panel to draw.
 *
 * **This is the one place the redesign asks the level-select panel to do
 * something unproven**, so it is a separate constant rather than a quiet bump
 * of the number above: the ordinary levels stay inside what is known to work,
 * and if seven rows overflow, only this moves.
 */
export const MAX_BOSS_LEVEL_ENTRIES = 7;

/**
 * Mode -> room size, and every number here is a decision already taken.
 *
 * The AS3 locks Tower to 640x640, Defense to 640x960 and Boss to one of two
 * sizes; the port had already diverged from two of those through
 * `levelSizeOverrides.ts`, which this table replaces. **Those divergences are
 * folded in here rather than lost** — retiring the override list without
 * carrying its decisions would have silently undone work that was compared in
 * game and chosen:
 *
 *   - **Tower 800x800.** Square deliberately, so every wall is the same
 *     distance, and widened from 640 so the arena fills the viewport instead
 *     of sitting in a margin.
 *   - **Defense 712x960.** 712 is the *minimum* width that fills a 16:9 view,
 *     not a round number — it keeps the lane an effectively fixed frame, with
 *     about two device pixels of travel. The trade is more letterbox on 21:9
 *     and a little scroll on 16:10, taken in favour of the common aspect.
 *   - **Normal 800x600.** The world-1 standardisation, now applied campaign
 *     wide: the AS3 mixes 640x400, 800x600 and 900x720 across Normal levels
 *     with no rule behind it, and one size per mode is what makes a mode read
 *     as a mode.
 *
 * Flag keeps 900x720, the largest of the three the AS3 uses for it, because a
 * Flag level wants room to run.
 */
export const ROOMS = {
  Tower: [800, 800],
  Defense: [712, 960],
  Normal: [800, 600],
  Flag: [900, 720],
  Boss: [800, 600],
};

/** A boss level with this many or more gets the larger of the two Boss rooms. */
export const BIG_BOSS_ROOM = [900, 720];
export const BIG_BOSS_FROM = 5;

/** Which old worlds each new world inherits its tier mix from. */
export const TIER_SOURCE = { 1: [1, 2], 2: [3, 4], 3: [5, 6], 4: [7, 8, 9] };

/** Levels of a world that are not boss levels, in order. */
export function nonBossLevels() {
  const out = [];
  for (let l = 1; l <= PER_WORLD; l += 1) if (!BOSS_LEVELS.includes(l)) out.push(l);
  return out;
}

/** The mode layout for a world — the base sequence rotated. */
export function layoutFor(world) {
  const k = (LAYOUT_ROTATION * (world - 1)) % BASE_LAYOUT.length;
  return BASE_LAYOUT.map((_, i) => BASE_LAYOUT[(i + k) % BASE_LAYOUT.length]);
}

/** The mode of one level. */
export function modeFor(world, level) {
  if (BOSS_LEVELS.includes(level)) return 'Boss';
  return layoutFor(world)[nonBossLevels().indexOf(level)];
}

/** How many bosses a level fields, or 0 if it is not a boss level. */
export function bossesFor(world, level) {
  const index = BOSS_LEVELS.indexOf(level);
  return index === -1 ? 0 : BOSS_AMOUNTS[world][index];
}

/** Room size for a level, as `[width, height]`. */
export function roomFor(world, level) {
  const mode = modeFor(world, level);
  if (mode !== 'Boss') return ROOMS[mode];
  return bossesFor(world, level) >= BIG_BOSS_FROM ? BIG_BOSS_ROOM : ROOMS.Boss;
}

/** How many distinct types a level should field, bounded by the roster. */
export function varietyAt(world, level, roster) {
  const [lo, hi] = VARIETY_BAND[world];
  const t = (level - 1) / (PER_WORLD - 1);
  return Math.min(roster, MAX_WAVE_ENTRIES, lo + Math.round(t * (hi - lo)));
}

/**
 * The old level at the same fraction of the campaign.
 *
 * A **pacing reference**: enemy count, spawn interval and flag numbers are
 * taken from it so the redesign inherits the original's rhythm rather than a
 * curve someone invented. The composition is authored to the variety rule.
 */
export function sourceLevelFor(globalIndex) {
  return Math.min(405, Math.max(1, Math.round((globalIndex - 0.5) * (405 / TOTAL_LEVELS))));
}
