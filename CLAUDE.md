# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository layout

Two directories, and they are not peers:

- **`SWFimported/`** — read-only extraction from the original SWF (JPEXS). 643 decompiled
  `.as` files, 31 images, 123 MP3s, 1015 SVG shapes, 2 TTFs, and
  `symbolClass/symbols.csv` mapping SWF library IDs to symbol names. Never edit; this is
  the source of truth being ported *from*.
- **`NewVersion/`** — the actual project (Vite + React + TypeScript + Phaser 3). **All npm
  commands run from here.**

## Commands

All from `NewVersion/`:

```bash
npm run assets:sync     # REQUIRED before first dev/test — see below
npm run dev             # Vite dev server, bound to 0.0.0.0 for phone testing
npm run build           # typecheck + production build
npm run typecheck       # tsc --noEmit over app and Node configs
npm run lint            # ESLint 9 flat config (lint:fix to autofix)
npm test                # Vitest, single run
npm run test:watch
```

Single test file / single test:

```bash
npx vitest run src/game/config/viewport.test.ts
npx vitest run -t "keeps the design width"
```

Project-specific tooling:

```bash
npm run assets:sync:all   # also copies all 1015 SVG shapes (default: curated 5)
npm run audio:audit       # MP3 header audit; exits non-zero on error-level issues
npm run progress          # regenerate PROGRESS.md (preserves recorded statuses)
npm run progress:check    # CI-style: fails if PROGRESS.md is stale
```

`src/assets/` is gitignored with `../SWFimported/` as the source of truth, so a fresh
clone has no assets and both `dev` and `test` fail until `assets:sync` has run.

## Architecture

### The React ↔ Phaser boundary

One typed bus, and it is the only sanctioned channel:

```
Phaser scene --emit--> GameEvents --> state/bridge.ts --> Zustand --> React
React UI     --emit--> GameEvents --> scene listener   --> gameplay
```

- Every event and payload is declared in `GameEventMap`
  (`src/game/events/GameEvents.ts`). Adding a member there is the only way to add an
  event — that is deliberate, so typos and missing fields are compile errors.
- `src/state/bridge.ts` is the event→store translator for **all gameplay**. When a HUD
  value is wrong, that is the one file to read. Scene code emits events; it does not call
  store setters, and no scene does. Two `state/` installers are the exception and write
  directly because they *originate* their data rather than consume an event:
  `safeArea.ts:87` (`setSafeArea`, which has no bridge handler) and `errorCapture.ts:36`
  (`setLoadError`).
- React must never hold a reference to a `Scene`. Scenes are torn down and rebuilt
  constantly and a stale reference leaks. Phaser reads state with
  `useGameStore.getState()`; React reads with selectors (never the whole store).
- The bridge and safe-area watcher are installed at **module scope** in `main.tsx`, not in
  an effect — they must be listening before the first scene boots, and StrictMode's double
  effect invocation would otherwise double-subscribe and apply every event twice.

### Canvas ownership and scaling (easy to break, hard to notice)

`Scale.RESIZE` with a fixed 640-unit design width. Full rationale in
`NewVersion/docs/SCALING.md`. Three coupled facts:

1. **React owns the `<canvas>`**, passed via `config.canvas`. Phaser's RESIZE mode sizes
   the backing store in *CSS* pixels, which renders at 1/3 resolution on a 3× phone.
   Instead, `ViewportController` feeds `scale.setParentSize(cssW × dpr, cssH × dpr)` from
   a `ResizeObserver`, and CSS maps the canvas back down — pixel-exact.
2. **`parent: null`, emphatically not `undefined`.** `ScaleManager.getParent()` only hands
   parent management back on an explicit `null`; `undefined` falls through to
   `GetTarget()`, which defaults to `document.body`. With a parent set, `ScaleManager.step()`
   polls `getBoundingClientRect()` and silently overwrites the device-pixel size every
   `resizeInterval`.
3. **`type` must be explicit.** Supplying `config.canvas` makes Phaser throw on
   `type: AUTO`, so `detectRendererType()` probes for WebGL itself and pins WEBGL/CANVAS.

Viewport maths lives in `src/game/config/viewport.ts` as pure functions so it is testable
without a browser. `MAX_LOGICAL_HEIGHT` must stay above the tallest mainstream aspect
(20:9 needs 1422 units at 640 wide) or ordinary phones fall into the fallback branch and
lose the fixed-width rule.

Safe-area insets have no JS API, so `src/state/safeArea.ts` reads them off a hidden probe
element's computed padding. DOM UI is padded by `env()` directly; in-canvas HUD anchors to
`ViewportController.safeRect` (design units), never to `camera.width/height`.

### Single Phaser instance under StrictMode

`src/ui/GameCanvas.tsx` makes teardown **deferred and cancellable**: cleanup schedules the
destroy on a macrotask and a re-running effect cancels it. StrictMode's synthetic remount
happens inside one macrotask so the destroy never fires; a real unmount has no follow-up
effect so it does. The naive create/destroy-in-effect pattern leaves orphaned RAF
callbacks, doubled input handlers and leaked WebGL contexts. Guarded by
`GameCanvas.test.tsx` — keep those tests passing.

`defaultBootstrap` lives in `src/ui/gameBootstrap.ts`, split out so `GameCanvas.tsx`
exports only its component (mixing exports silently breaks Fast Refresh).

### Scene chain

`Boot → Preload → MainMenu → LevelSelect → Gameplay`, plus `Upgrades` and `Enemies`,
both reached from the main menu. All seven are registered in `gameConfig.ts`.

**BootScene must always hand off to Preload, whatever happens.** Phaser does not await
`Scene.create()`, so a rejected promise there is unhandled and the game strands with the
UI showing "Loading" forever and no error anywhere. This has already happened once. Every
await in Boot is non-rejecting and the handoff sits in a `finally` — **do not add a bare
`await` to that method.** `src/game/text/fontLoader.ts` is contractually non-rejecting for
the same reason and has tests pinning that contract.

Startup failures are made visible by `src/state/errorCapture.ts` (promotes any uncaught
error/rejection before `ready` onto the error screen), a 15s no-progress watchdog in
`PreloadScene` that names in-flight files, and stage labels on the loading screen.

### Assets

Assets live in `src/assets/`, not `public/`, so Vite content-hashes them and a bad
filename fails the build instead of 404-ing on a phone. `src/assets/registry.ts` builds the
URL maps with `import.meta.glob`; `src/assets/manifest.ts` is the sample set the preloader
proves the pipeline with.

**Never rename an extracted file.** The leading number is the SWF library ID and is the
only link back to `SWFimported/symbolClass/symbols.csv`. A test enforces this.

### Text rendering

DOM/React for anything interactive, laid out, translated or screen-readable; Phaser for
anything welded to the world. Details in `NewVersion/docs/TEXT_RENDERING.md`. Note
`SWFMainFont` has only 581 glyphs — safe for headings you control, unsafe for arbitrary
text, which is why `--font-body` is the other face. Move to `BitmapText` only when text
changes every frame (floating damage numbers); `Text` re-rasterises and re-uploads a
texture on every `setText()`.

### Audio

Audited finding: all 123 MP3s are uniform CBR 80 kbps / 44.1 kHz mono with **no
Xing/LAME gapless header**, so no decoder can trim encoder delay. Harmless for one-shot
SFX; the music tracks and 2 looping SFX gap and click on repeat and need re-encoding to
OGG/AAC. Full detail in `NewVersion/docs/AUDIO_PIPELINE.md`.

Two verification layers: `scripts/lib/mp3-probe.mjs` parses frame headers offline (shared
by the audit CLI and `scripts/mp3-probe.test.mjs`, which asserts against the real asset
folder), and `src/game/audio/audioSelfTest.ts` measures the decoded `AudioBuffer` at
runtime and confirms the transport actually advanced — a suspended `AudioContext` will
happily report a "playing" sound that makes no noise.

## Test environment

Two non-obvious pieces of setup in `vite.config.ts` / `src/test/`:

- **`phaser` is aliased to `dist/phaser.js`** for tests. Phaser's package `main` is its CJS
  *source*, which `require`s the uninstalled optional `phaser3spectorjs`; and
  `dist/phaser.esm.js` has named exports only, so `import Phaser from 'phaser'` would be
  `undefined`. The UMD bundle is what the browser gets via the `browser` field.
- **`src/test/canvasStub.ts`** stubs `HTMLCanvasElement.prototype.getContext`. Phaser probes
  the 2D context at *module load* time, so any test transitively importing `phaser` crashes
  in jsdom without it. It is feature-detection scaffolding, not a renderer — never assert
  on its output.

## Porting workflow

`NewVersion/PROGRESS.md` tracks all 643 AS3 classes across 13 categories. Statuses are the
four literals `not started` / `ported` / `tested` / `not applicable`; anything else is
reset by the next `npm run progress`. Regeneration preserves recorded statuses (keyed by
the label in backticks, which falls back to the full path for names that collide across
packages — `Debug` exists twice), so it is safe to re-run after a fresh JPEXS export.

Use **`not applicable`** for classes that will deliberately never be ported: `[Embed]`
asset stubs, dead code, Kongregate telemetry, or anything the engine already provides.
They are excluded from every total, so the percentages keep meaning something — roughly
120 classes fall in this bucket and would otherwise depress the number forever.

Start from **Core systems** — everything else hangs off those. Do **not** port the ~81
third-party classes (`com/google/analytics`, `FGL`, `fl`, `mx`); replace or drop them.

**`PM_PRNG` is reproducibility-critical, and is not yet wired.** In the AS3 it is seeded
per level from `levelDataModel[...][9]` and drives deterministic background-prop placement.
In the port it has **no production importer**: `LevelSpec.seed` is extracted for all 405
levels and read by nothing, and `GameplayScene` uses `Phaser.Math.RandomDataGenerator`
seeded from a string key for spawn placement instead. Background props are unported, so
this is not yet a divergence — but the sites that would use it have already chosen a
different generator. It is a Lehmer generator whose product reaches ~7.2e13 — exact in a
double, but destroyed by `Math.imul`, `| 0` or `>>> 0`. `src/game/core/PM_PRNG.ts` says so
at length; the differential test against BigInt is the guard. Do not "optimise" it, and do
not delete it as unused — see `docs/AUDIT-2026-07.md`.

When lifting constants out of AS3, keep the origin in a comment (`ScreenGame.as`
`levelDataModelW1`, `PartGameArea.cameraWidth`, …). The level tables and enemy stat rows
are dense magic numbers and unattributed ones become unverifiable.

### An AS3 constant that became a runtime variable

The Flash build ran at one fixed size on one fixed platform. This port does not,
and **any AS3 value that was a compile-time constant but is a runtime variable here
will port term-for-term while silently changing meaning**. The arithmetic survives;
the semantics do not. Camera size is the instance that has bitten twice, but the
class is wider — frame rate, stage size, pixel density and safe-area insets are all
constants-that-became-variables.

Both instances so far involved `cameraWidth`/`cameraHeight`, a fixed 640×400 in the
AS3 and `640 × logicalHeight` here, where `logicalHeight` is `renderHeight / zoom`
clamped to `[400, 1440]`:

- The off-camera spawn search compared candidates against 640×400 while the game
  rendered up to 1440 tall, so it protected a rectangle less than half the height of
  the real view and placed enemies on screen. The *predicate* was a faithful port;
  the *operand* was not.
- The fix then over-corrected: a `==` disqualifier was widened to `<=` and justified
  as "identical on every room size the AS3 could produce" — reasoning in the AS3's
  world about a change that only matters in this one. It disabled the feature on
  every level at any height ≥ 720.

**The platform-blindness consequence is the important part.** That second defect was
*invisible at desktop viewports and total at phone ones*: a wide window gives a
logical height near the 400 floor, where everything looked correct, while a portrait
phone sits near 1385, where the feature was entirely gone. This port ships to
iOS/Android via Capacitor. **A desktop-only visual pass proves nothing about mobile**,
and neither defect was found by tests or by play — one surfaced because a reviewer
questioned a justification.

This is a different failure class from the wiring bugs above. There the code was
wrong everywhere and nobody had looked. Here the code is *correct on the platform you
test on* and absent on the platform you ship to, so looking harder in the same place
never finds it.

Before porting any expression involving a screen, camera, viewport or timing value:

1. **Ask whether the AS3 value was constant.** If it was, the port almost certainly
   needs the live value, not the transcribed number.
2. **Make the live value non-optional.** `PlacementContext` now requires
   `cameraWidth`/`cameraHeight`; omitting them is a compile error rather than a
   silent fallback to the Flash stage. A default that happens to be right on your
   machine is the trap.
3. **Check the behaviour at both extremes of the range**, not at the value your
   window happens to produce. For the viewport that means a logical height of 400
   *and* 1440.
4. **Keep the AS3 constant as documentation, never as a fallback.**
   `AS3_CAMERA_WIDTH`/`AS3_CAMERA_HEIGHT` exist to record what the original was, and
   nothing reads them at runtime.

### Claiming something is unused

**A name-based grep is not sufficient evidence that a field is dead**, and saying so in a
comment or dropping it from an extraction is a claim that has already been wrong once:
`enemyModel` column 1 was recorded as "a leftover from the level-design tool" when it is
actually the base enemy spawn interval. It was missed because the only read goes through
`enemyModelCurrent`, a renamed mutable working copy of the row, so `grep
'selectedEnemyModel\[.*\]\[1\]'` found nothing.

The AS3 aliases arrays constantly — `worldModels[world * 3 - 2]` becomes
`selectedLevelDataModel`, then `enemyModelCurrent`, then a bare local. Before calling
anything unused:

1. Grep for the **index** as well as the name (`[1]`, `[3 + 2 * i]`), not just
   `TheArray[...][1]`.
2. Find every alias: `grep -n '<name> = ' -- *.as` and follow each assignment target.
3. Say in the comment **how** it was established — "no reads found for column 1 under any
   of the three aliases (`selectedEnemyModel`, `enemyModelCurrent`, `theModel`)" is
   checkable; "nothing reads it" is not.

If tracing the aliases is impractical, extract the field with a neutral name and a note
that its meaning is unknown. Carrying an unexplained value is cheap; silently dropping a
load-bearing one is not.

#### The second variant: duplicated logic with no name at all

The alias trap above is one rule under several *names*. There is a worse variant in this
source — one rule where the second copy has **no name**, because the helper's body was
pasted inline. Grepping the identifier does not undercount by a little; it can miss most
of the uses.

The worked example. `checkWithinScreen` (`PartGameArea.as:4329`) tests whether a point is
within the camera's rect. `grep checkWithinScreen` finds **4** sites. The rule itself —
identifiable by its distinctive operand `cameraPosX`, which appears nowhere else — is
computed at **10**, the other six written out longhand at `:1716`, `:1814`, `:1906`,
`:4115`, `:4761`, `:5195`, `:5565` and `:6901`. I concluded from the name grep that the
laser had no on-screen gate, and was wrong: `:5565` is that gate, inlined.

The same shape shows up on our side of the port — `countCrowd`, `canAfford` and
`flagReward` are each tested helpers whose caller reimplements them inline
(`docs/AUDIT-2026-07.md`, "One rule, two copies"). So this is a habit of the original
source *and* of the port, and it defeats the same tool in both.

**Match on the expression's shape, not on its identifier.** In practice:

1. **Probe on a distinctive operand**, not the function name. A variable that appears
   only inside that one rule — `cameraPosX` here — finds every copy in one grep.
   Skeleton-matching whole lines (identifiers → `X`, numbers → `N`) also works, but is
   conservative: it missed `:5565` because that inline drops the `distanceAdd` terms.
2. **Assume the count is a floor.** "This appears N times" from a name grep means "at
   least N".
3. **Any status resting on a name grep is systematically low.** That includes
   `PROGRESS.md`, and it includes claims of the form "no branch exists for X".

`enemies/enemyBehaviour.ts` is a live instance. Its `branched` set is built from two
idioms, `enemyType == "X"` and `[object EnemyX]`. A **third** exists —
`instance.enemy == "X"`, the spawn-time dispatch, present for all 20 types — and the
regex matches neither. Two of those spawn branches carry real behaviour
(`:3475` gives `Accelerating` a 2.7x speed multiplier, `:3479` gives `Temperamental` 2x),
so a type whose only distinguishing behaviour lives there would be reported as having no
branch, and therefore as fully implemented. That is exactly the mistake that put a false
"no branch for this type" line into the generated `docs/ENEMIES.md` for `Exploding`.

### Calling something blocked

**Grade by dependencies, not by novelty.** Of the eight primary weapons first flagged as
"needs a dedicated session", three were wrong — Shotgun, Penetration Cannon, Laser Cannon —
and they were wrong the same way: each was graded on how unusual its *description* sounded
rather than on what it *depends on*. Those are different axes, and only the second predicts
effort.

The failures look like this:

- Shotgun's "deterministic even fan" is one formula over two extra stat tracks.
- Penetration is not a mechanic at all; `BulletPenetrate` is simply on the exclusion list
  guarding `dead = true` (`PartGameArea.as:5822`).
- Laser Cannon was flagged partly for having "its own spread rule". Its spread is `0`, so
  that rule evaluates to `tower.rotation - 0/2 + random()*0` — a no-op. A line of dead
  arithmetic was recorded as a blocker.

Meanwhile Timed Bomb Cannon and Poison Cannon *were* blocked, and on the same thing: a
persistent per-enemy status timer. That was the useful unit — build it once, several
weapons unblock together. **That prediction held**: `enemies/statusEffects.ts` is the
timer, it carries poison, attached bombs and freeze, and both weapons shipped on it. Name
the shared dependency and the grouping pays for itself. (Freeze is still inert — nothing
deals Ice damage yet — which is a missing *source*, not a missing subsystem.)

Before writing "blocked" or "needs its own session":

1. Name the **missing subsystem**, not the surprising behaviour. "Needs a per-enemy timer
   that survives across frames" is a dependency; "has a poison effect" is a description.
2. Check whether apparent enemy state is actually per-frame. `onFire`, `onLava` and
   `hitByCake` read like status effects and are reset immediately before the bullet loop
   (`:5554`) — they are same-frame dedup flags and cost nothing.
3. Check whether the data is genuinely absent or just **renamed**. `poisonMultiplier` was
   nearly reported missing; it is derived from the strengths/weaknesses arrays
   (`:3378-3438`) and is already ported as `multipliers.Poison`. Same alias trap as above.
4. Group blocked items by their shared dependency, so the blocker gets built once.

### Before adding a UI element, look for the one that exists

A weapon-name readout was requested for the bottom of the screen. One already existed —
`AmmoReadout` in `src/ui/Hud.tsx`, rendered into `hud__row--bottom` — and it was broken by
a placeholder emit from `GameplayScene.cycleWeapon`: `ammo:changed` with `capacity: 0`
trips `AmmoReadout`'s `capacity <= 0` guard and unmounts the whole readout, taking the
weapon name with it. So the name appeared on start and vanished on the first weapon
switch.

A second, in-canvas label was added instead of finding that, which cost four debugging
rounds against an element that was never the one on screen. The tells were all present
and all ignored: the reported element sat at a position the new label had been moved away
from, and it faded on a timer the new label did not have.

Before adding any HUD element, grep `src/ui/` for one that already renders the same
value. When a symptom does not match what the new code can physically do — wrong position,
an animation nothing schedules — suspect a *different element* before theorising about the
new one. And when debugging something just added, check whether an earlier change of your
own broke what was already there.

### A green unit test says nothing about the wiring

Four consecutive gameplay bugs have had the same shape: **the ported module was
correct and its tests passed, and the defect was in what the scene fed it or whether it
was called at all.** Unit tests structurally cannot see any of these, so a full green
suite is not evidence that a feature works.

- `isWaveComplete` was ported and tested when the wave system landed, and **nothing ever
  called it**. Levels could not be completed for weeks; the predicate sat as dead code.
- `GameplayScene.cycleWeapon` emitted `ammo:changed` with `capacity: 0`, which trips
  `AmmoReadout`'s `capacity <= 0` guard and unmounts the readout. `Hud.test.tsx` passed
  throughout — the emit site was wrong, not the component.
- `levelOutcome` was fed `moneyOnFloor: this.pickups.countActive(true)`, counting
  *decorative* placeholder coins rather than enemy money drops, so no level could ever
  hand over. Its own tests — including one asserting a level stays open while coins
  remain — were correct and green.
- `removeEnemy` was not idempotent: `filter` is, `registerEnemyKilled` is not, so a
  double call drifted `currentEnemies` below the true live count and completed levels
  early. `waveState`'s tests were correct; the scene's flame loop was indexing the live
  array with stale indices and calling it twice.

What to do about it:

1. **After porting a pure module, confirm it is reached.** `grep` for call sites, not just
   for the export. "Ported and tested" and "running in the game" are different claims.
2. **Check each argument's meaning at the wiring site, not its type.** `moneyOnFloor:
   number` accepted a decorative coin count without complaint. Every value crossing from
   scene to module deserves the question "is this the same quantity the AS3 meant?"
3. **Prefer ground truth to a parallel counter.** `this.enemies.length` *is* the arena;
   `currentEnemies` only tracks it. Where both exist, require both, so drift can delay a
   transition but never trigger one early.
4. **Make a mutator idempotent when it updates a counter alongside a collection.** The
   collection edit usually is idempotent and the counter never is, so a double call
   silently desyncs them.
5. **When a symptom is "nothing happens at all", suspect the inputs before the logic.**
   Both total no-shows here were wiring, and in both cases reasoning about the algorithm
   was wasted effort.

Debugging these by reading the code failed repeatedly. What worked was **getting numbers**:
simulating the module's lifecycle in a throwaway test, computing the actual arithmetic
(level 1-1 is 10 enemies at 5 damage against 100 HP, so defeat was *unreachable*, not
broken), and logging real values. Reach for an experiment before a third hypothesis.

### Scope a guard to the rule it enforces

A guard's **reach must match its reason**. Both times this has gone wrong, the check was
correct for the case that motivated it and was then applied one level too broadly, where
it silently vetoed something it was never meant to touch.

- `GameplayScene` used `isWaveComplete(wave) && enemies.length === 0`. The live-count
  check existed because `currentEnemies` can drift, and drift completed *arena* levels
  early. But Flag and Boss levels spawn indefinitely and their arenas are never empty, so
  a guard for the arena rule permanently blocked the two modes that do not use it —
  135 levels. It belongs inside `isWaveComplete`'s default branch, not beside the call.
- `AmmoReadout` returns null on `capacity <= 0`. The reason is "there is no magazine to
  show", but the reach is the whole component, so an unrelated `capacity: 0` emit took
  the **weapon name** down with it.

Before adding a check, say what it is protecting against, then confirm it covers only
that. Two questions that catch it:

1. **Where does the reason live?** If it guards one branch of a function, put it in that
   branch. A guard bolted on at the call site applies to every branch, including the ones
   whose rule it contradicts.
2. **What else is behind it?** A guard on a component, an early `return`, or an `&&` at a
   call site takes everything downstream with it. List what that includes.

The failure is invisible in tests: both guards were individually correct and every test
of the guarded unit passed. What broke was a case the guard should never have reached.

### A test can pin a bug and still look like coverage

Distinct from the wiring failures above: there the test was right and the caller was
wrong. Here the **test itself encodes the defect as the specification**, so it is green,
it looks like the behaviour is deliberate, and it actively resists the fix.

`waveState.test.ts` carried `it('never reports a Flag level complete')`. That was an
accurate description of `isWaveComplete` — which had no Flag branch — and it read as a
documented design decision. It was neither: 90 Flag levels and 45 Boss levels could not
finish, and the test would have failed the moment anyone fixed it.

The tell is a test asserting that something **cannot** happen, where the reason is "we did
not implement it" rather than a rule from the source. When writing one, say which it is:

```ts
// Flag levels end on flags, not an empty arena — PartGameArea.as:2708.
// (a rule; keep it)

// Flag completion is not ported yet, so this must return false.
// (a limitation; delete this test when it is)
```

Before "fixing" a failing test that has always passed, check whether the assertion was
ever a requirement. If it only ever described a gap, replace it rather than restore it.

### Test assertions

Prefer the **computed value** over a comparative whenever the number is knowable when the
test is written. Every assertion corrected so far has been a `toBeLessThan` /
`toBeGreaterThan` where the exact figure was already in hand — e.g. asserting the
Penetration Cannon's blast was *less than* half the Big Cannon's when it is exactly half
(40 against 80). `toEqual({ reloadTimeMax: 600, damage: 26, explosionRadius: 195 })` has
never needed fixing. Reserve comparatives for genuine invariants where the exact number is
not the point.

`noUncheckedIndexedAccess` is deliberately off: the AS3 source is full of fixed-shape
numeric arrays and it would add noise without catching real bugs during the port.
