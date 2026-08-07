# Handoff

**For a reviewer who has no repo access and no memory of this project.** You read
the reports and decide what happens next. This is written so you can catch me
being wrong.

Current as of **T60**, commit `b2d2193`, 7 August 2026. Keep it current — it is
part of the deliverable, like the audit.

*(The previous stamp read `T58` / `8852cc8` / 5 August. This file was written in
T59 and described the T58 baseline, so the stamp named the commit it was written
**about** rather than the one it was written **on** — the same slip the audit
guards against with "a `verified` entry must name what it was observed against".
T60 re-scoped `BACKLOG.md` and re-drove the UI and sound measurements below.)*

---

## 1. What this is, and where it stands

A port of a Flash/AS3 wave-defense game ("Circular Tank") to Vite + React 19 +
TypeScript strict + Phaser 3.90 + Zustand + Vitest + Capacitor.

- **`SWFimported/`** — a read-only JPEXS extraction of the original: 643 `.as`
  files, 1015 SVG shapes, 123 MP3s, and `assets.swf` itself. Never edited; a
  pre-commit hook enforces that.
- **`NewVersion/`** — the port. All npm commands run from here.

**Gate on every commit:** `typecheck`, `lint`, `data:check`, the full suite
(**2580 tests, 126 files**), and `smoke`. Work that cannot land green is not
committed. Commits go straight to `main` and are pushed at the end of each task.

### What plays end to end

Boot → menu → save slots → level select → **1-1 with the tutorial running** →
fight → win with collectable coins → results with a route onward → level 2 →
defeat. Also reachable: Upgrades, Bestiary, Options, Achievements, and two dev
screens.

Nine of eleven screens render and respond. The two that do not are `Premium`
(a Kongregate upsell, deliberately out of scope) and `Credits` (no separate AS3
class found).

**UI: 9 of 11 screens render with content**, re-driven at `b2d2193` — MainMenu
13 controls, LevelSelect 69, Upgrades 35, Enemies 22, Options 10, SaveSlots 5,
Bestiary 2, Achievements 2. `Premium` and `Credits` report `UNREACHABLE (no
entry point)`, both deliberately out of scope. Measured by driving, because a
screen that opens empty and a screen that is not ported are indistinguishable to
a presence check.

**Sound: 25 of 67 names fired in the sweep at `b2d2193` — and that number is
currently an artefact of the harness, not a measure of the game.** The audit
records 39 at `59b9756`. **The game did not regress.** On the *same* build,
`--baseline` reports `level 1-1 cleared: true`, so enemies spawn, die and drop
coins, while the sweep reports `peak/frame EnemySquish: 0` — nothing died in it
at all. T58 made the tutorial gate hold spawning until the player has moved and
fired, and fixed `--baseline` to move first; **`--sound-sweep` never got the
same fix**, so most of its window runs on a level that is deliberately not
spawning. Tracked as **L3** in `BACKLOG.md`.

**Do not read 39 → 25 as lost wiring**, and do not wire anything in response.
This is *reach and wiring are separate questions* (rule 9) — the same misreading
that made ten fully-wired names look unwired in T40. **The last trustworthy
sound number is 39 at `59b9756`; there will not be another until L3 is fixed.**

### How to see it

`npm run look` boots the game, drives a scripted sequence and dumps frames to
`.look/`. **It is a tool, not a test: it asserts nothing.** Modes:
`--baseline` (the full loop), `--ui`, `--sound`, `--sound-sweep`, `--tutorial`,
`--particles`, `--money`, `--indicators`, `--secondaries`, `--save`, `--slots`.

---

## 2. The working discipline

Stated as rules. Each was paid for.

1. **The AS3 source is the spec** — not the running port, and not its tests.
   Verify against the line before porting, and re-verify rather than leaning on
   an earlier read. Where the source is genuinely ambiguous, record both
   readings; do not settle it by observing what the port currently does.

2. **Pin an assertion against its counterpart, not alone.** Ice against lava, a
   kill-reload against the ordinary reload, a fast tutorial step against a slow
   one. A rule asserted alone reads as arbitrary and survives a change that
   blurs it into its neighbour.

3. **A negative assertion is worthless until its opposite is driven on the
   identical context.** `expect(actionSatisfies('Strength', everything))
   .toBe(false)` proves nothing until `expect(actionSatisfies('Special',
   everything)).toBe(true)` sits beside it *on that same input*. "Nothing
   satisfies anything" is the failure mode.

4. **A check that only proves a spelling is flagged inline, at the assertion**,
   saying what it does and does not prove. A `readFileSync` over a scene proves
   a guard is *written*, never that it is *reached*. These have broken three
   times on correct changes and caught nothing; prefer extracting the rule so it
   can be driven.

5. **Document a gap at the call site, not in a report.** An unported condition,
   a placeholder argument, a branch nothing reaches — write it where someone
   will be standing when it matters. A gap recorded only in a commit message is
   invisible six months out.

6. **An assertion's expected value must come from the source, not the code.** A
   test that copies a constant out of the module it tests cannot detect a wrong
   constant. A citation is not a check — three constants were corrected that all
   carried correct-looking references to the lines contradicting them.

7. **Where the AS3 froze a screen dimension into a constant, the port uses the
   live value.** The original ran at one fixed size; this does not. Spawn
   placement, weapon reach and panel anchoring all take the live camera or
   viewport. **Amplitude ports directly; rate does not** — the AS3 ran at 30 fps
   and this runs at 60, so anything per-frame needs its cadence converted.

8. **Measure, do not count.** Every count-based estimate has collapsed: 27
   tutorial classes were 26 stubs and one real class; 187 sound sites were 12
   rules; 197 UI widgets were two missing components. Drive it and read what
   happened.

9. **Reach and wiring are separate questions.** Before wiring a trigger that is
   not firing, check whether the scenario can reach it. Ten sound names looked
   unwired and were fully wired.

---

## 3. Where things live

| File | Holds |
|---|---|
| `CLAUDE.md` (repo root) | **The working rules.** Read first. |
| `NewVersion/docs/AUDIT-2026-07.md` | **Every finding and divergence.** Where the port deliberately differs, and every "this looks like a defect and is faithful". Includes the dated playable baselines. |
| `NewVersion/docs/BACKLOG.md` | **The plan** — re-scoped against `b2d2193` in T60. Groups F, H, I, J, K, M and L2 are closed; what remains is six small items listed at its foot. Group M is "requested by the user". **It is not the whole remaining port** — its own opening box says so. |
| `NewVersion/docs/HANDOFF.md` | This file. |
| `NewVersion/PROGRESS.md` | 643 AS3 classes, four statuses. Regenerated; preserves recorded values. |
| `NewVersion/docs/` others | `SCALING.md`, `TEXT_RENDERING.md`, `AUDIO_PIPELINE.md`, `ENEMIES.md`. |

Divergences are labelled `A1`…`A4`, `D1`, `E1` etc. in the audit and referenced
from the code.

---

## 4. Instrument traps

**Every one of these cost at least one pass, and several recurred after being
written down.** The pattern is always the same: *a tool returned a clean,
decisive, wrong result and was believed.*

1. **Truncated grep.** `grep … | head -4` answers "the first four matches", not
   "the matches". Produced "enemies never shoot", then "defeat is unreachable".
   **Recurred four times**, most recently as "`setMusic` has zero production
   callers" — the three real call sites sat below a `head -6`. Now mitigated
   structurally: `npm run sweep -- "<pattern>" <path>` prints the **total count
   first**, so truncation cannot hide it.
2. **Aliased pushes.** The AS3 pushes one sound through a variable, so a
   literal-string grep missed it and reported a real name as invented. The port
   does the same at three sites. **Any name-based count is a floor.**
3. **CRLF-poisoned lists.** A generated id list carried `\r`, so every file test
   asked for `1483\r.svg` and all 108 reported missing. When a check returns the
   same answer for every input, suspect the check.
4. **Drifted anchors.** A scripted `str.replace` returns the original on a miss
   and reports success. An audit entry was "written" and the file was unchanged.
   Use the `Edit` tool, which fails on a missed anchor.
5. **Sub-frame input.** `keyboard.press()` is ~10 ms against a 16 ms frame, and
   input flags are read once per frame. A lost tap looks exactly like a weapon
   that does not fire. **Hold keys, never tap.**
6. **Screenshots after the effect left frame.** A radial fan clears the screen
   in under half a second. Use `burst()`, and `waitFor()` on an observable state
   rather than a duration.
7. **Frames compared across two builds.** "Panel one renders, later ones do not"
   came from comparing a frame from before a scale change with one from after.
   None of them rendered. **A frame is evidence about the build it came from.**
8. **An instrument not covering its own emit paths.** `setMusic` and
   `keepLoopAlive` bypassed the sound recorder, so wired subsystems measured as
   absent — and the failure looked exactly like what the instrument detects.
   Now asserted: every method reaching the audio backend must record.
9. **A selector narrower than the guarantee it backed.** The UI sound listener
   matched `button` only, so six `role="switch"` controls shipped silent while
   the coverage test reported success — it asked "is every component in the
   subtree", never "does the selector match every control". **A coverage test
   must assert the mechanism's reach, not the membership of what it points at.**

10. **An instrument left behind by its own last run.** `npm run look` does not
    kill its vite child on exit, and uses `--strictPort` — so an orphan does not
    silently move to another port, it blocks every later run. Two were found
    alive at the start of T60 from the previous session; the one holding the
    harness port predated the commit it would have been measuring. **Check the
    port before trusting a `look` run**, and kill what you started. (`L4`.)
11. **A correct game change invalidating one harness mode but not another.**
    T58's tutorial spawn gate is faithful, and `--baseline` was updated to move
    first. `--sound-sweep` was not, so it now measures a level that is
    deliberately not spawning and reports 25 of 67 where the same build clears
    1-1 under `--baseline`. **The failure looks exactly like lost wiring.** This
    is trap 9's shape one level up: the instrument's reach narrowed while its
    output format stayed identical. (`L3`.)

**A run reporting nothing missing should be as suspect as one reporting
everything missing** — and a run reporting *more* missing than last time should
be checked against a second mode on the same build before it is believed.

---

## 5. What is open

### Queued, unblocked

| Item | Needs |
|---|---|
| ~~**`Objective` panel overlaps the HUD**~~ | **Done** (T63). And the entry's diagnosis was wrong twice: the panel already used the live viewport (rule 7 was applied in T51), and the AS3 *did* have a HUD there — a 400..480 interface strip. It cleared the widgets on **x** (`bgWeapon.x = 388` vs the panel's 194..354), which a full-width DOM HUD makes impossible. Fixed by reserving an AS3-derived 80-unit band. Divergence **A5**. |
| **Pre-level countdown** | `spawnWarnings` and the countdown are unported. **Not just a missing feature:** `countDownDone` is read by `spawnPlacement` and never written, so the off-camera spawn search runs on *every* spawn where the AS3 runs it only during the countdown. Porting it changes spawn placement game-wide. |
| **Sound: 28 names not firing** | Six blocked on unported triggers (achievement reveal, level-unlock, countdown, shop purchase, second loadout slot). The rest is scenario reach — they fire in play, the sweep just does not visit those modes. `ImpactCrazyCheese` is an orphan asset with no AS3 trigger under any spelling. |
| ~~**`D1` — PM_PRNG**~~ | **Not open — decided and built.** This row was stale. The audit's D1 entry reads `DECIDED — Option A`, and the code implements it: `backgroundProps.ts:8-10` calls itself "the first production reader of `LevelSpec.seed`, and the reason D1 was decided", seeds `new PM_PRNG(input.seed)` (`:286`, `:579`), and is consumed in production at `GameplayScene.ts:138`. The collision pass is ported too (`resolveCollisions:539`, from `:2603-2664`). Props render — visible in `.look/b-04-fight.png`. **Nothing is owed and no call is needed.** |
| **`L1`** | `assets:sync` never prunes. Re-verified at `b2d2193`: a count of `unlink\|rm(\|rmSync` over `scripts/sync-assets.mjs` returns 0. |
| **`L3`** | `--sound-sweep` never satisfies the tutorial spawn gate, so its count is not comparable to the recorded 39. Trivial fix; blocks the next sound measurement. |
| **`L4`** | `npm run look` leaves its vite child alive on exit. Because it uses `--strictPort`, one orphan blocks every later run — and two were found alive from the previous session, one of them older than the code it would have been measuring. |

### Blocked on you, not on me

- **`M1` — tank damage tint.** *Done* (T52). Was the one item you asked for by
  name; see below.
- **Nothing else is currently blocked on a decision**, but two standing calls
  shape everything: the touch/phone work is deliberately deprioritised until the
  desktop port is finished, and the ~81 third-party classes
  (`com.google.analytics`, `FGL`, `fl`, `mx`) are never being ported.

### Known-imperfect and recorded rather than fixed

- The tutorial panel composition is correct, but only the twelve panels were
  extracted with matrices — no other subsystem needs them yet.
- `TankBody` frame 2 is a two-layer frame and the port's flat array does not
  express it. Nothing reads it today; whoever wires Tower mode must draw both
  shapes. Noted at the site.

---

## 6. What you asked for by name

| Request | Standing |
|---|---|
| **Results screen: open on the score, not the enemy reveal**; reveal as a pop-up; a line recording the unlock; a route to choose the next level | **Done** (T44). Recorded as divergence **A2** with what was faithful, what changed, and that the reveal content is untouched. |
| **Tank damage feedback** — `damageIndicator`'s red tint | **Done** (T52), explicitly scheduled last as you asked. Pinned as a *ramp* at four levels plus monotonicity, not a boolean. |
| **The tutorial panel shakes too much** | **Done** (T55) — and it was **not** taste. The amplitude was already correct; the AS3 re-rolls at 30 fps and the port ran at 60, so it read as twice as busy. A frame-rate correction, recorded as **A4**. |
| Flag/Boss/Shield levels work in play | Accepted; four sound names marked reachable-in-play rather than owed. |

**Divergences you approved, so a future reader does not "fix" them:** the
results-screen ordering (**A2**), the audio toggles appearing on the main menu
as well as in Options (**A3**), and the level-select route added to the results
screen, which the AS3 has no equivalent of.

---

## 7. How to catch me being wrong

- **Ask what enforces a claim.** If the answer is "the author was careful", it
  is a hope, not a guarantee. Three documented guarantees have turned out to
  cover less than their sentence promised, and each was found by accident.
- **Ask whether a "not found" says by what method.** No artifact here should
  assert something does not exist in the AS3 — every sweep is name- or
  pattern-based and every count is a floor. "No branch found for X by \<method\>"
  is checkable; "no branch exists for X" is not.
- **Ask whether a visual claim came from a frame, and from which build.** Two of
  the last five misdiagnoses were frames read without instrumentation, in the
  subsystem whose newest code was the obvious suspect.
- **Ask which of "the build is clean" and "the app loads" was checked.** They
  are different claims and only the first is enforced by the gate.
- **Distrust a green suite as evidence of wiring.** Four gameplay bugs have had
  the shape "the module was correct and its tests passed; the caller was wrong".
  A 2.85× change to every entity's collision radius moved no test.
