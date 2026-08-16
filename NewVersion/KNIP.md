# Reading `npm run knip`

Finds exports with **no production consumer**, which is the failure this project
kept hitting by hand: `isWaveComplete`, `getCurrentWorldAndLevel` and the
`levelProgress` helpers were each ported, fully tested, and called by nothing —
in one case for weeks. A green suite cannot see that, and neither can a
module-level reachability check, because those symbols live in files that *are*
imported.

## Why test files are not entry points

Deliberate. If tests counted as consumers, a ported-but-unwired function would
look used and the one signal worth having would disappear. So **"unused export"
here means "nothing outside a test calls it"**, and that is the thing to look at.

The cost is a benign baseline: constants exported so a test can assert against
them, and helpers only referenced inside their own file. Those are fine.

### How that is achieved — check this before trusting the output

The claim above was **false for months** and nobody noticed, because it was
asserted with no mechanism behind it. `knip.json` set only `entry` and `project`,
so knip's auto-detected Vite/Vitest plugins supplied `**/*.test.ts` as entry
points and test imports counted as consumers — the exact opposite of what this
file promised. Every genuinely-unwired export was invisible.

Four settings in `knip.json` are load-bearing. Changing any of them silently
returns the tool to reporting nothing useful:

| setting | why |
|---|---|
| `"vite": false` | the Vite plugin infers entries from `index.html` **and** from the `test` block in `vite.config.ts`. Left on, it re-adds every test file as an entry. |
| `"vitest": false` | same, directly. |
| `"entry": ["src/main.tsx", …]` | with both plugins off, nothing auto-discovers the app entry. It has to be declared or the whole of `src/` reports as unused. |
| `"ignore": ["**/*.test.ts", …]` | keeps test files out of the graph entirely, so their imports cannot count. |

The testing libraries are in `ignoreDependencies` as a direct consequence: the
only files that import them are ignored, so knip would otherwise report all four
as unused dependencies.

**Verify rather than assume.** Pick an export whose only importer is its own
test — `countMaxedPrimary` in `upgrades/upgradeState.ts` is one — and confirm it
appears in the output. If it does not, the plugins are back on.

## Baseline

Current, after the T152 triage:

```
Unused exports (414)
Unused exported types (7)
```

Sorted by `node scripts/knip-triage.mjs <knip.json>`:

```
src-importer  1     knip disagrees with a real importer — look at it
test-only     407   imported by a test and nothing else
internal      5     used only inside its own file — all five generated
dead          8     referenced nowhere, and kept on purpose (listed below)
```

**Read the total as a worklist length, not a debt.** 407 of the 421 are
test-only, which is the baseline this configuration is *designed* to produce:
see "Why test files are not entry points". The number that matters is
`internal` + `dead`, and T152 took those from 137 to 13.

**The five remaining `internal` are in generated files and stay there.** The
unexport pass edited `achievementArt.ts`, `levelGuideArt.ts`,
`resistanceIconArt.ts`, `bestiaryArt.ts` and `upgradeArt.ts` — and
`data:check` failed on all five, correctly: a generated file's text belongs to
its generator, and hand-editing one makes the two disagree without changing
anything the generator would produce next run. They were regenerated and the
exports came back. **Do not unexport anything in a generated file** — change
the generator, or leave it. This is the same boundary the "Generated data"
limitation below describes, found from the other side.

### What T152 changed, and what it deliberately did not

- **114 exports became module-private.** Nothing outside their own file
  imported them; they were category 3 below. That is where most of the drop
  came from, and it is the change with the least behind it — no code moved.
  (119 were changed; five were in generated files and were put back.)
- **10 dead symbols were deleted**, each because something had replaced it:
  `randomEdgeSpawn` (T151, superseded by `waves/spawnPlacement.ts`),
  `layoutPropsForLevel`, `getGameState`, `describeViewport`, `PLACEHOLDER_SIZE`,
  `LevelTypes`/`LevelType`, `World`, `PLAYER_SPEED_UNITS_PER_SEC`/`PLAYER_DRAG`,
  `Healable`, `SampleFontFamily`, `StatusPageType`, and a re-export of
  `TOWER_GEOMETRY` that duplicated its declaring module's.
- **Nothing in category 1 was touched.** The unwired features — `tutorialState`,
  the `achievementState` evaluator, `enemyKnowledge`'s discovery half,
  `applyFreeze`, the achievement value sources — are all still exported and
  still reported. They are ported behaviour waiting on a decision, and deleting
  ported AS3 behaviour because a static tool called it unused would be the
  worst possible reading of this file.
- **Nothing in "one rule, two copies" was touched either.** `countCrowd`,
  `canAfford` and `flagReward` still have inline duplicates in their callers.
  That fix is *wiring*, not cleanup, and it changes running code — it does not
  belong in a pass whose whole safety argument is that nothing moved.

### The 8 kept dead exports, and why each stays

| export | why |
|---|---|
| `PREMIUM_WORLD_COUNT` | `Main.as:315`, and its sibling `FREE_WORLD_COUNT` is live. Half a cited pair is worse than an unused constant. |
| `DAMAGE_TINT_COLOUR` | `:2801`, sibling `DAMAGE_TINT_MAX` live — the tint's strength is wired and its colour is not yet. |
| `GUMMY_STAGE_MIN` | Same shape: `GUMMY_STAGE_MAX` is live, and the pair states the AS3's 1..3 range. |
| `WEAPON_PANEL_SYMBOL`, `WEAPON_SHAPE_IDS`, `MARKER_SHAPE_IDS`, `TANK_SYMBOLS`, `MONEY_SHAPES` | Generated contracts: "these are the shapes this subsystem draws", which is what the asset sync must have copied. They document a coupling that has broken before (T108). |

If one of these ever *does* get a consumer it simply stops being reported,
which is the outcome to want.

## Triage

For each finding, one of:

1. **A feature that was never wired.** The real catch. Wire it, or record why not.
2. **Exported only so a test can reach it.** Fine — but prefer testing through
   the public path where that is practical.
3. **Exported for no reason.** Drop the `export`; it is module-private.

The current 242 sort roughly as:

- **Category 1, held deliberately** — recorded in `docs/AUDIT-2026-07.md` under
  "Held, not fixed", each needing a decision rather than a reflex. The whole of
  `tutorialState` (`addTutorialsToQueue`, `takeNextTutorial`, …), the
  `achievementState` evaluator (`evaluate`, `updateAchievements`, `wouldWin`),
  the `enemyKnowledge` discovery half (`discoverEnemies`, `isEnemyKnown`,
  `knownBestiary`, `knownCount`), `applyFreeze`, and the achievement value
  sources (`countMaxed*`, `getTotalValues`, `getAchievementTiers`,
  `getLevelValues`).
- **Category 1, duplicated instead of called — treat these first.** A tested
  helper exists and the caller reimplements the same rule inline: `countCrowd`
  (`weapons/flames.ts`) against `GameplayScene`'s own crowd loop, `canAfford`
  (`upgrades/upgradeState.ts`) against `UpgradesScene`'s inline comparison,
  `flagReward` (`waves/flag.ts`) against an inlined `spec.flagMoney`.

  **These are the one category where the obvious reading of knip's output is
  wrong.** "Unused export" reads as "safe to delete", and deleting here removes
  the tested copy and leaves the untested live copy behind. The rule is real and
  running; what is unused is the guarded version of it. Two copies can drift
  apart while the suite stays green, because the test is pointed at the copy
  that never executes. Fix by calling the helper, never by dropping it. Full
  write-up in `docs/AUDIT-2026-07.md`, "One rule, two copies".
- **Category 2** — the bulk of the 136 values: stat constants, frame counts and
  fixture tables exported so a test can assert the exact figure.
- **Category 3** — module-private helpers that never needed exporting, e.g.
  `measureFamily` (`text/fontLoader.ts`) and `readSafeAreaInsets`
  (`state/safeArea.ts`), both used only as default parameters in their own file.

Categories 2 and 3 were acted on in T152 — 3 by unexporting, and the dead tail
by deleting. **Category 1 is untouched by design**, and the two bullets above
it are why: it is the only category where the tool's output and the right
action point in opposite directions.

**It is a worklist, not a defect report.** The distinction earns its keep here:
of the 137 findings that were not test-only, three separate ones — the
`TANK_RADIUS` pattern, the `layoutPropsForLevel` wrapper and the duplicated
helpers — would each have been made *worse* by the obvious action.

## What knip still cannot see

- **Class members.** knip 6 has no `classMembers` issue type, so methods are
  outside its scope entirely. `SoundManager.keepLoopAlive` has only test callers
  and is invisible here; so is anything on `SaveStore`, `PlayerProfile`, `Enemy`,
  `Bullet` and `PlayerTank`. Those still need reading by hand.
- **Imported but never called.** knip reports the import, not the call. An export
  that something imports and then ignores looks used.
- **Called but inert.** A function that runs every frame and changes nothing
  observable is invisible to any static tool. See the "Reachable but inert"
  section of the audit.
- **Generated data.** `src/game/**/*Data.ts` and `src/assets/*Manifest.ts` are in
  `ignore`, so `enemyStatsData.ts` and `bestiaryData.ts` are not analysed at all.

## Sorting the list — `scripts/knip-triage.mjs`

```bash
npx knip --no-progress --reporter json > knip.json
node scripts/knip-triage.mjs knip.json          # counts
node scripts/knip-triage.mjs knip.json dead     # one bucket, with call sites
```

It resolves import specifiers to files and reads the import clause, so an
importer is an importer. **That precision is the whole point**: a first version
matched symbol *names* across the tree and claimed 60 findings were used by
production code. Almost all were collisions — `Point`, `Room` and `FlamePoint`
are declared in more than one module — and acting on that list would have been
acting on noise. Resolving imports took the same bucket from 60 to 1.

Its limits are in its header and are worth reading before deleting anything on
its say-so: re-export chains are not followed, `import * as` counts as
importing everything, and "used in its own file" is a word match outside
comment lines.

## Not part of `data:check`

Left out on purpose. `data:check` gates the build and must stay a hard pass/fail
on generated data; this is a review list whose baseline is legitimately non-empty.
Run it when adding a module, and when picking up work after a break.
