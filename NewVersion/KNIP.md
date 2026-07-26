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

As of the July 2026 audit, on a correctly-configured run:

```
Unused files (1)          — src/game/core/PM_PRNG.ts
Unused exports (242)      — 102 functions, 4 classes, 136 values
Unused exported types (29)
```

242 is not a regression; it is the number that was always true and previously
reported as 49. The jump is the tool starting to work, not the codebase getting
worse.

`PM_PRNG.ts` appearing as an **unused file** is the headline: the module
`CLAUDE.md` calls reproducibility-critical, carrying a BigInt differential test
over 35,000 draws, has no production importer at all.

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
- **Category 1, duplicated instead of called** — a smaller and more actionable
  group, where a tested helper exists and the caller reimplements it inline:
  `countCrowd` (`weapons/flames.ts`) against `GameplayScene`'s own crowd loop,
  `canAfford` (`upgrades/upgradeState.ts`) against `UpgradesScene`'s inline
  comparison, `flagReward` (`waves/flag.ts`) against an inlined `spec.flagMoney`.
  Two copies of one rule, and the tested copy is the unused one.
- **Category 2** — the bulk of the 136 values: stat constants, frame counts and
  fixture tables exported so a test can assert the exact figure.
- **Category 3** — module-private helpers that never needed exporting, e.g.
  `measureFamily` (`text/fontLoader.ts`) and `readSafeAreaInsets`
  (`state/safeArea.ts`), both used only as default parameters in their own file.

Nothing in this list has been acted on. It is a worklist, not a defect report.

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

## Not part of `data:check`

Left out on purpose. `data:check` gates the build and must stay a hard pass/fail
on generated data; this is a review list whose baseline is legitimately non-empty.
Run it when adding a module, and when picking up work after a break.
