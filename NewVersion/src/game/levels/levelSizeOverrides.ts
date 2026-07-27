/**
 * Deliberate room-size divergences from `ScreenGame.as`.
 *
 * The port otherwise reproduces all 405 rooms exactly, and
 * `roomSizeSource.test.ts` proves it against the AS3 on every run. This is the
 * enumerated list of places where we have decided *not* to match, so that
 * check can stay exact instead of being loosened into a rubber stamp.
 *
 * ── The rule these entries buy ────────────────────────────────────────────
 * An override does not say "ignore this level". It says "the source says
 * `from`, and we play `to` instead". The verification test requires `from` to
 * equal what the AS3 currently holds, so an override only excuses the exact
 * divergence it predicted:
 *
 *   - if a re-extraction changes 1-2 away from 900x720, this entry stops
 *     matching and the test fails rather than silently masking the change;
 *   - if an entry is left here after the level matches again, the "every
 *     override is used" test fails, so the list cannot rot;
 *   - an entry outside the declared scope fails too, so this cannot quietly
 *     grow into a general escape hatch.
 *
 * ── Applied at the accessor, not baked into the data ──────────────────────
 * `LEVELS` in the generated `levelData.ts` stays a pure transcription of the
 * AS3, so `npm run levels:data` remains a function of the source alone and
 * `levels:data:check` keeps working untouched. `getLevel` applies these on the
 * way out, which means what the game plays is what the test checks.
 */

import type { LevelMode, LevelSpec } from './levelData';

/**
 * Why a level diverges.
 *
 * `standard` is the settled world-1 decision; `experiment` is a change being
 * looked at and expected to be resolved. Keeping them apart means the
 * standardisation rule can still be asserted exactly — "every world-1
 * Normal/Flag level plays 800x600" stays true of every level that is not
 * currently an experiment, rather than becoming "mostly 800x600".
 */
export type OverrideReason = 'standard' | 'experiment';

export interface LevelSizeOverride {
  world: number;
  level: number;
  /** The size the AS3 specifies. Asserted against the source. */
  from: readonly [number, number];
  /** The size the game plays instead. */
  to: readonly [number, number];
  reason: OverrideReason;
  /** Required on an experiment: what it is for. */
  note?: string;
}

/** The one size every overridden level is standardised to — 1-4's room. */
export const WORLD_1_STANDARD_ROOM: readonly [number, number] = [800, 600];

/**
 * World 1, `Normal` and `Flag` only, standardised to 800x600 (decided
 * 27 July 2026).
 *
 * World 1's Normal and Flag levels shipped at three different sizes — 640x400,
 * 800x600 and 900x720 — and the request was one consistent "big map" feel
 * across the early game. 800x600 is 1-4's room, chosen because six of the
 * eighteen already used it, so the standard is the existing majority rather
 * than a new number.
 *
 * **Tower, Boss and Defense are deliberately untouched** (27 of world 1's 45).
 * Their room sizes are tied to how those modes play — Defense is the tall
 * 640x960 lane, Tower the square 640x640 — so standardising them would change
 * the mode, not the map.
 *
 * ── Two consequences, accepted on purpose ────────────────────────────────
 * 1. **Density moves.** Enemy counts live in `enemyModel` and are unchanged, so
 *    the nine levels shrinking from 900x720 lose 26% of their area and get
 *    ~35% denser, while the three growing from 640x400 gain 87% area and get
 *    ~47% sparser. That is a balance change to twelve levels and was signed
 *    off as such.
 * 2. **Off-camera spawning switches on for three levels.** The disqualifier at
 *    `spawnPlacement.ts` fires when `roomHeight === cameraHeight`, and the
 *    nominal camera height is clamped to exactly 400 — so every 640x400 room
 *    has the off-camera search disabled and its enemies enter at the visible
 *    edge. At 800x600 the search runs, and 1-1, 1-3 and 1-30 start receiving
 *    enemies from genuinely off screen. This is the most visible behavioural
 *    effect of the change.
 *
 * The six levels already at 800x600 — 1-4, 1-15, 1-23, 1-24, 1-28, 1-42 — are
 * **not** listed. An override that changes nothing would be a lie about what
 * diverges, and the "every override is used" test rejects it.
 */
export const LEVEL_SIZE_OVERRIDES: readonly LevelSizeOverride[] = [
  // ── World 1 standardisation ───────────────────────────────────────────
  // 640x400 -> 800x600. These three also gain off-camera spawning.
  { world: 1, level: 1, from: [640, 400], to: WORLD_1_STANDARD_ROOM, reason: 'standard' },
  { world: 1, level: 3, from: [640, 400], to: WORLD_1_STANDARD_ROOM, reason: 'standard' },
  { world: 1, level: 30, from: [640, 400], to: WORLD_1_STANDARD_ROOM, reason: 'standard' },

  // 900x720 -> 800x600. These nine get ~35% denser.
  { world: 1, level: 2, from: [900, 720], to: WORLD_1_STANDARD_ROOM, reason: 'standard' },
  { world: 1, level: 5, from: [900, 720], to: WORLD_1_STANDARD_ROOM, reason: 'standard' },
  { world: 1, level: 6, from: [900, 720], to: WORLD_1_STANDARD_ROOM, reason: 'standard' },
  { world: 1, level: 8, from: [900, 720], to: WORLD_1_STANDARD_ROOM, reason: 'standard' },
  { world: 1, level: 17, from: [900, 720], to: WORLD_1_STANDARD_ROOM, reason: 'standard' },
  { world: 1, level: 19, from: [900, 720], to: WORLD_1_STANDARD_ROOM, reason: 'standard' },
  { world: 1, level: 21, from: [900, 720], to: WORLD_1_STANDARD_ROOM, reason: 'standard' },
  { world: 1, level: 39, from: [900, 720], to: WORLD_1_STANDARD_ROOM, reason: 'standard' },
  { world: 1, level: 43, from: [900, 720], to: WORLD_1_STANDARD_ROOM, reason: 'standard' },
];

/** The size every Tower arena plays at. Square, deliberately — see below. */
export const TOWER_ROOM: readonly [number, number] = [800, 800];

/**
 * The size every Defense lane plays at.
 *
 * 712 is the *minimum* width that fills a 16:9 viewport, not a round number
 * chosen for tidiness, and the difference matters — see the rule below.
 */
export const DEFENSE_ROOM: readonly [number, number] = [712, 960];

export interface ModeSizeOverride {
  mode: LevelMode;
  /** The size the AS3 specifies for **every** level of this mode. Asserted. */
  from: readonly [number, number];
  to: readonly [number, number];
  reason: OverrideReason;
  note?: string;
}

/**
 * Divergences that apply to a whole mode rather than named levels.
 *
 * Tower is 90 levels and the AS3 gives every one of them the same 640x640
 * room, so ninety near-identical rows would state one fact ninety times. The
 * guarantee is kept instead by asserting the *premise*: a test checks all 90
 * Tower rows in `ScreenGame.as` really are 640x640, so a rule that stopped
 * being uniformly true would fail rather than silently apply to a level it was
 * never meant for.
 *
 * ── Why 800x800 and not 800x600 ──────────────────────────────────────────
 * A 640-wide room is narrower than the view on every aspect except 16:10 —
 * 711 design units on 16:9, 956 on 21:9 — so it cannot fill the screen and
 * left visible margin either side. Matching the world-1 standard of 800x600
 * would have fixed that, but Tower's room is the only *square* one in the game
 * and squareness is load-bearing: the spawn bands are quarters of each wall, so
 * in a square room every wall sits the same distance from the tank and the
 * orbit is circular. At 800x600 the side walls would be 400 units out and the
 * top and bottom 300 — a 33% difference — and the orbit would read as an
 * ellipse, with side entrants taking visibly longer to arrive.
 *
 * 800x800 fills exactly as well as 800x600 (both exceed the 711-unit view on
 * 16:9 and both leave 78 units per side on 21:9) and keeps every wall
 * equidistant. The width was the problem; the height never was.
 *
 * The spiral does shift, because `towerAngleToTarget` divides by
 * `roomWidth + 100`: enemies now approach ~0.6 degrees flatter. That is
 * accepted, and it is uniform across all four walls rather than different per
 * wall, which is what the square keeps.
 *
 * ── Why Defense is 712 and not 800 ───────────────────────────────────────
 * Height is untouched: the tall lane is the mode. Width is raised only to the
 * point where the margin disappears on 16:9, and no further, because the extra
 * width buys a side effect.
 *
 * `PartGameArea.setCamera` (:695-705) clamps the camera to the room. With
 * `roomWidth == cameraWidth` the first branch's condition is `< 0 && > 0` —
 * impossible — and both fallbacks assign `x = 0`, so **the original's Defense
 * camera never scrolls horizontally**. The lane is exactly one screen wide, a
 * fixed frame. Any width above the viewport reintroduces horizontal tracking:
 * 800 would give 89 units of it on 16:9.
 *
 * 712 is the smallest width that fills a 711.1-unit view, so the frame stays
 * effectively fixed — 0.9 design units of travel, about two device pixels.
 * The cost is that it leaves 122 units per side on 21:9 where 800 would leave
 * 78, and that windows *narrower* than 16:9 gain scroll they did not have: a
 * 16:10 view is 640 units, so 712 scrolls 72 there. That is the trade, taken
 * deliberately in favour of the mode's shape on the common aspect.
 */
export const MODE_SIZE_OVERRIDES: readonly ModeSizeOverride[] = [
  {
    mode: 'Tower',
    from: [640, 640],
    to: TOWER_ROOM,
    reason: 'standard',
    note: 'square arena widened so it fills the viewport without margin',
  },
  {
    mode: 'Defense',
    from: [640, 960],
    to: DEFENSE_ROOM,
    reason: 'standard',
    note: 'widened to exactly fill 16:9, keeping the lane a fixed frame',
  },
];

/** The mode-wide override for a mode, or undefined. */
export function findModeOverride(mode: LevelMode): ModeSizeOverride | undefined {
  return MODE_SIZE_OVERRIDES.find((o) => o.mode === mode);
}

/** The modes the per-level divergence is scoped to. Asserted by the tests. */
export const OVERRIDDEN_MODES: readonly string[] = ['Normal', 'Flag'];

/** The override for a level, or undefined when it plays as extracted. */
export function findSizeOverride(
  world: number,
  level: number,
): LevelSizeOverride | undefined {
  return LEVEL_SIZE_OVERRIDES.find((o) => o.world === world && o.level === level);
}

/**
 * Applies a size override to a spec, returning it unchanged when none applies.
 *
 * Returns a new object rather than mutating: `LEVELS` is a shared module-level
 * table and a mutation would leak into every later read, including the
 * verification test's own comparison against the source.
 */
export function applySizeOverride(
  spec: LevelSpec,
  world: number,
  level: number,
): LevelSpec {
  // A per-level entry wins over a mode-wide one, so a single level can always
  // be excepted from its mode's rule without unpicking the rule.
  const override = findSizeOverride(world, level) ?? findModeOverride(spec.mode);
  if (!override) return spec;
  return { ...spec, roomWidth: override.to[0], roomHeight: override.to[1] };
}
