# Handoff

**For a reviewer who has no repo access and no memory of this project.** You read
the reports and decide what happens next. This is written so you can catch me
being wrong.

Current as of **T120**, commit `aaeccb0`, 13 August 2026. Keep it current — it is
part of the deliverable, like the audit.

**The hash is the commit this file sat on when it was written** — i.e. the parent
of the commit that carries the edit, so it is always one behind `HEAD`. That is
deliberate and is what the `T58` correction below established; **a reader
checking the stamp against `HEAD` will find a deliberate off-by-one, not drift.**
Check the task number and the gate figures in §1 instead.

*(Stamp history, because this file has drifted twice: `T58`/`8852cc8` named the
commit it was written **about** rather than **on**; `T60`/`b2d2193` was correct
but predated three passes. T61 corrected 13 `PROGRESS.md` statuses, T62 logged
L5–L7, T63 fixed the `Objective` panel and found `D1` already decided, and T64
mitigated `L4` and synced §5 to match. **§5 had drifted independently of the
audit — the audit was right about `D1` and this file was not**, which is the
argument for re-deriving a queue rather than reading it.)*

---

## 1. What this is, and where it stands

A port of a Flash/AS3 wave-defense game ("Circular Tank") to Vite + React 19 +
TypeScript strict + Phaser 3.90 + Zustand + Vitest + Capacitor.

- **`SWFimported/`** — a read-only JPEXS extraction of the original: 643 `.as`
  files, 1015 SVG shapes, 123 MP3s, and `assets.swf` itself. Never edited; a
  pre-commit hook enforces that.
- **`NewVersion/`** — the port. All npm commands run from here.

**Gate on every commit:** `typecheck`, `lint`, `data:check`, `progress:check`,
the full suite (**2883 tests, 152 files**), and `smoke`. Work that cannot land green is not
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

<!-- docs-check: sound-coverage = 50-51 of 67 -->
**Sound: 50–51 of 67 names fire** (T80, driven `--sound-sweep`). Three
consecutive runs **on the final T80 harness** gave 50, 50 and 51 — the same ±1
band, with `ReflectBullet`, `TankDamaged` and `TankEnemyCollision` as the swing.
Earlier runs in the same pass reported 48 and 49 and are **not** part of that
band: the harness itself was still changing under them, so they measure a
different instrument. **16 names were silent in all three runs**, and that
stable list is the one worth acting on — not the total.

**47–48 → 50–51 is two different gains again, and the total cannot tell them
apart** — which is why T80 made the sweep log **which** names are new at each
step. `Burning` and `FlameThrower` were genuinely unwired and are now wired
(T80); they were *also* unreachable, because `Flamethrower` and `Lava Ball` were
missing from the sweep's own equip lists. Either fix alone would have left both
names on the silent list, and the headline count would have read as "still
unwired" for a wiring change that had landed.

**41–42 → 48 is not a coverage improvement of the same thing.** T69's figure was
the first taken on a trustworthy harness; T71 then *extended the harness* to
visit the four modes `--baseline` never reached (+5: `Boss`, `Defense`, `Flag`,
`Tower`, `Lose`) **and** wired two genuinely-missing triggers (+2: `Freeze`,
`TeleportOut`). Those are different kinds of gain and are worth keeping apart —
the first was reach, the second was code.

**What makes this one trustworthy where three earlier readings were not:**
**landing evidence 6/6** — `ImpactBullet`, `ImpactLaser`, `ImpactMagic`,
`ImpactCake`, `EnemySquish` and `Coin` all fire, and every one of them was
absent from every previous run. The count alone never distinguished "this sound
is unwired" from "nothing ever triggered it"; that list does.

**The earlier figures are history, not a series.** Each was taken with different
defects present in the harness, so none of them can be compared with another:

| Reading | Taken at | Harness state |
|---|---|---|
| 39 of 65/67 | `59b9756` (T57) | before `L3` or `L8` were known |
| 25 of 67 | `b2d2193` (T60) | the tutorial gate left the arena empty (`L3`) |
| 27 of 67 | T65 | `L3` fixed; the sweep still aimed at a screen constant (`L8`) |
| 41–42 of 67 | T69 | both closed; impacts confirmed landing — Normal mode only |
| 47–48 of 67 | T71 | + four modes driven, + `Freeze` and `TeleportOut` wired |
| **50–51 of 67** | **T80 (current)** | **+ `Burning`/`FlameThrower` wired, + `Flamethrower`/`Lava Ball` in the equip lists** |

**41–42 does not confirm or replace 39**, and 39 → 25 was never a regression.
They are the same quantity measured through two broken instruments and one
working one. **Track 50–51, the last row** — do not treat any of the others as a
floor, a target, or a baseline.

### How to see it

`npm run look` boots the game, drives a scripted sequence and dumps frames to
`.look/`. **It is a tool, not a test: it asserts nothing.**

**Standing instruction since 12 August 2026: it is not run by default.** The user
tests visually on the site; the harness runs only when driven or screenshot
evidence is asked for in a specific prompt. Visual work is instead handed over as
a written, checkable description — what to look at and what correct looks like.
Full rule, including what is explicitly *unchanged* (pinning tests, `npm run
smoke`), in `CLAUDE.md` under *Look at the running game*. The mode list below is
a reference for when it is asked for.

Modes:
`--baseline` (the full loop), `--ui`, `--sound`, `--sound-sweep`, `--tutorial`,
`--particles`, `--money`, `--indicators`, `--secondaries`, `--save`, `--slots`,
`--countdown` (level 1-2 driven twice on one build, `?countdown=0` reproducing
the pre-T67 state, dumping spawn coordinates for both; the second run also
watches the panel's digit change in the DOM and counts the beeps),
`--medals` (a **real** 1-1 clear at full health — not the dev jump, which banks
nothing and therefore always shows 0 medals — watching the stamp-in and the
`Award1-3` cues), `--unlock` (wins 1-1, then watches the level-select medal
count-up, the `Unlock` latch, and whether 1-2 stays selectable throughout),
`--overlays`, `--tooltips` (hovers shop rows and achievement cells and
**measures the panel's box against the cursor** — the corner it opened toward,
not merely that a `.info-text` node exists; also holds a hover for 1200ms and
then leaves, because a panel that opens and never closes photographs exactly
like a correct one), `--resistances` (the bestiary's badges, with `?known=all`
so all 20 rows are revealed — it **counts the image layers that actually
loaded** per badge, because a badge whose middle layer 404s still renders as a
clean disc, which is exactly what the "none" badge is supposed to look like),
`--next-level` (clears 1-1 and hovers the Next Level button, then **jumps to
1-12 and clears that too** — 1-2's roster is Basic and Fast, neither of which
has a single resistance, so the first run draws no badges at all and proves
nothing about them; 1-13 is the earliest roster that does).

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

## 3b. The visual overhaul — T154-T161

The UI was restyled to the original's look across eight passes. What a reader
needs to know before touching it:

- **The chrome is the original's own art, not a recreation.** Every screen
  title, the nav tabs, the panels, the difficulty and audio buttons and the
  menu's cover picture are extracted SWF shapes (`chromeArt.ts`, 29 clips),
  drawn by `<ChromeArt>`. No web font was added: the headers are *pictures*,
  and the labels use `SWFMainFont`, which is the game's own "JG" face and was
  already in the repo.
- **Frame numbers mean different things on different clips, and the three
  conventions look interchangeable.** Frame 3 is *pressed* on a nav tab,
  *selected* on a difficulty button and *off* on an audio toggle. All three
  live in `game/ui/navTabs.ts` with their AS3 lines and a test asserting they
  disagree. Do not merge them.
- **Never style `.chrome-art` from a screen.** It sets `position: relative` and
  is declared after every screen's rules, and its `aspect-ratio` is inline —
  so a screen's own rule loses twice over. Wrap it. This shipped as a bug: the
  menu rendered its picture and nothing else, because the art stayed in flow
  and pushed every control past a clipped body.
- **Colours came off the SVGs, not off the screenshots.** The reference images
  are 320px JPEGs; sampling them would have carried compression noise into the
  tokens. The ramp and the signal colours are in `:root` with their sources.
- **The main menu is the one screen that is no longer the extracted art.**
  T164 made it a full-bleed wallpaper with floating controls (`A27`); T165
  replaced the wordmark and PLAY with pure CSS — an `<h1>` in `SWFMainFont`
  under a clipped metallic gradient, and a gradient pill (`A28`). Two things
  to know before editing it:
  - **The wordmark is two stacked copies of the same string on purpose.**
    `background-clip: text` needs `color: transparent`, and a `text-shadow` on
    transparent text paints *through* the glyphs, so the extrusion and the
    metal cannot share an element. The upper copy is `aria-hidden` or the
    heading announces itself twice.
  - **The card sizes everything off one `--card-w`.** Padding, gaps, radii and
    type are all fractions of it, chosen so the card at its 400px floor is
    pixel-identical to the fixed version it replaced. Add a fixed `px` padding
    inside it and a test fails — which is the point, because the symptom
    otherwise is a large panel with cramped contents that nobody reads as a
    bug.
- **The shop is a tile grid with one detail window, and it must not scroll.**
  T166 rebuilt it as `ScreenUpgrades`' own shape — six tiles to a row, one
  right-hand window addressing the selection (`A29`). Three things to know:
  - **`overflow: hidden` is the mechanism, so a bad change clips instead of
    scrolling** — silently. The fit is *measured*, not assumed: drive the real
    screen and compare `scrollHeight` with `clientHeight` on
    `.screen-shell__body`. It holds from 1024x480 to 3840x2160 today.
  - **Everything is a fraction of `--tile` or `--pane`**, both viewport-clamped.
    A fixed `px` padding, gap or `font-size` inside the window fails a test.
  - **`.gloss-pill` is the shared glossy-button recipe** (menu PLAY, shop Buy).
    Overriding it needs *two* classes — `.gloss-pill.shop-buy` — because both
    are (0,1,0) and a single class leaves it to source order.
- **`.gloss-pill` and `.type-title` are the two shared surface recipes** — the
  glossy button (menu PLAY, shop Buy) and the metallic wordmark (menu logo,
  shop header). Both carry the surface and no size, so a consumer that only
  sets dimensions cannot collide with them; one that *overrides* them needs two
  classes, because both are (0,1,0).
- **The achievements board is a proportional plate, not a grid, and its badges
  carry no percentage lengths.** T178 restored the AS3's circular badges
  (reversing `A25`) and ported the totals window at `:725-780` — two running
  totals and a 5x3 medal matrix drawn with the same `LevelModeIcon` shapes the
  level tiles use, tinted through `currentColor`. Two things to know:
  - **`achievementPlacementArray` is a regular 6x6 lattice** — x every 60, y
    every 56, all 36 points filled. A test and three docstrings claimed it was
    *irregular* and that `MaxedPrimary1` sat 16 units off the row step; both
    are false, and the claim survived because the test's expected value (a
    40-unit step) came from the buggy code rather than from the data. Badges
    are still placed by coordinate-as-fraction, inset by half a disc, because
    that cannot re-derive a wrong row index.
  - **The badge is a picture and its layers are not one size.** A 52-unit
    backing disc, a 48-unit tier ring and an icon at its own size. Each is
    drawn at `size / ACHIEVEMENT_BADGE_SIZE` of the badge, both generated from
    the SVGs. Stretching them all to 100% — which the results toast does — is
    survivable on one icon and turns a badge into a blob at 36.
  - **The badge can be at most `boardHeight / 6`** (16.67cqh), where
    neighbours touch. It sits at 15.5, and the plate's `aspect-ratio: 1.06` is
    the lattice's own 60:56 step, so the columns are not spread across a plate
    twice their width.
  - **A medal row is one mode at three tiers**, the opposite of a level tile,
    and bronze is the *Easy* tally while gold is the *Hard* one. That reads
    backwards next to the `[hard, medium, easy]` values triple and is pinned in
    both directions in `achievementStats.test.ts`.
- **Size the shop's tiles in `cqh`, never `vh`.** The bar and nav take a much
  larger fraction of a short window than a tall one, so a viewport share
  overshoots at 480px and undershoots at 1440. This is measured, not
  theoretical: `11.5vh` overflowed five of eight viewports.
- **A fit harness that only measures the container misses overlaps.** The shop
  shipped with the slot widget drawn over the tiles while `scrollWidth` and
  `scrollHeight` were both clean: a grid overflowing its *grid column* does not
  overflow a body that has margin to spare. Test rectangle intersection between
  siblings as well as container overflow.
- **Options omits graphics quality and difficulty on purpose, and both are
  pinned by test.** Quality is not applicable (`stage.quality` has no WebGL
  equivalent); difficulty is a divergence — it lives on level select beside the
  medals it decides (`A43`). The failure mode is a *re-addition* by someone
  completing the AS3's control list, which nothing else would object to.
- **"Reset options" is settings, not progress**, and that is the AS3's own line
  (`SaveManager.resetOptions` clears `optionsSave`, never `gameSave`). Deleting
  a slot is a separate control on the save picker. `optionsService.test.ts`
  writes two slots, resets, and requires both to survive — do not "simplify"
  that to a `localStorage.clear()`.
- **A held `blur(0)` is not `filter: none`, and a held `transform: none` is not
  `none` either.** `animation-fill-mode: both` keeps the `to` state forever, and
  either one makes its element the containing block for every `position: fixed`
  descendant. Use `backwards` when you only want the first-frame guard (`A45`).
- **Measure two conditions by alternating them, not block-then-block.** The
  screen blur's cost was first read as 33ms against a 17ms baseline; the same
  baseline came back 17/33/33/17 on the next run, because load drifted between
  the blocks. Paired alternation on the same screen gave a clean 17 vs 33
  (`A45`). **A clean number from a noisy instrument is this project's most
  expensive recurring mistake.**
- **If every size inside a box is a multiple of one lever, that lever needs a
  height term.** The box's height is *not* a multiple of it, so a width-only
  `clamp` overflows a short viewport — and with `overflow: hidden` it clips in
  silence. Three screens have now needed the same correction: the bestiary's
  window (`A37`), the options cards (`A43`) and level select's detail panel
  (`A44`). The form is `min(clamp(min, Xcqw, max), Ycqh)`. **Check this before
  adding a row to any panel.**
- **And it misses a panel clipping its own contents.** Same family, third
  instance. The bestiary's window was sized `clamp(14rem, 30cqw, 30rem)` —
  width only — while everything inside it is a multiple of that, so its content
  runs ~1.28x taller than the value. At 1024x480 it needed 389px inside a 315px
  box and `overflow: hidden` swallowed the difference: no scrollbar, no body
  overflow, nothing the page-level check could see. **Measure each box's own
  `scrollHeight - clientHeight`, not just the body's.** And note the shape of
  the near miss: it was clean from 1366x768 up, so every viewport anyone
  develops on said the rule was right.
- **The bar's height is `min(clamp(40px, 6vh, 80px), 6vw)`, and it is the
  `auto` track under five screens' `1fr` bodies** — anything added to it is
  taken from all of them. 40px is the clips' export size and is the *floor*,
  not a ceiling, because they are pure vector (`A42`); the `6vw` term is what
  keeps two 5:1 tabs and four icons inside a 360px phone. **Re-run the shop,
  bestiary, achievements and level-select harnesses after touching it** — the
  shop failed at 1280x540 by 4px when the dock grew, and the first fix landed
  on 58.2px against the 58px it had been and still failed by a sub-pixel. **A
  fix that lands on the boundary is not a fix.**
- **"Is it an SVG" is not the question; "does the SVG contain an `<image>`"
  is.** Some JPEXS exports are raster payloads wrapped in SVG — `910.svg`
  carries a base64 PNG with `image-rendering: pixelated` baked in — and those
  cannot be scaled up. The six bottom-bar clips were checked shape by shape and
  are pure vector, which is why T183's "the bar is being upscaled" argument was
  wrong and got reverted (`A41`). **Check before claiming an upscale problem.**
- **Capping a control does not cap the art inside it.** `.nav-button--wide` had
  `max-width: 40vw`; the `.chrome-art` within takes its width from the clip's
  aspect ratio, so at 360x640 a 200px picture sat in a 144px button and hung
  56px over its neighbour while every button rectangle measured clean. Third
  instance of one shape, after T168's widget overlap and T179's panel clipping:
  **the container being fine says nothing about what is inside it.**
- **An extracted shape has a size it was drawn at, and this port scales past
  it.** The shop's backing disc is a 30x30 export drawn at up to 176px — a
  six-times upscale whose antialiased edge goes ragged, and *worse* on a
  high-DPI screen because the glyph beside it gets sharper. It is CSS now
  (`A40`), from the SVG's own gradient stops. **Before scaling any extracted
  art past about 2x, check what it was exported at**; a flat shape (a disc, a
  ring, a plate) is usually cheaper and better in CSS, and a glyph usually is
  not.
- **When dropping layers from extracted art, derive the rule positionally and
  check it against the art.** The shop's plate is "layer 0 of a drawn frame",
  not a list of ids — two clips (`EnemyAbsorb`, GummyBear) use their own plate
  shapes, so a hand-written list would have left a pixelated disc on exactly
  those two. The assumption that layer 0 is never content is *driven*:
  `tileHighlight.test.ts` requires every derived plate to be a single-path
  30x30 disc in the export.
- **`.shop`'s `max-width` has been added, removed and added again — read the
  comment before touching it.** 1800px (T167) closed a void; removing it
  (T169) fixed the pillars it caused; 1900px (T182) closed the void again on
  2K+, where three spread columns *relocate* it rather than closing it. **1900
  is the measured natural width of the three columns**, so it changes nothing
  below that; a tighter cap shrinks the catalogue instead of the gap.
- **Which screens get the cursor card, and why the shop does not.** Two
  failure modes, not one. A *corner* panel fails on any grid — it is nowhere
  near the thing under the pointer (`A36`). A *cursor card* fails on a *dense
  comparison* grid — it covers the neighbours, which are the whole point of
  sweeping one. Level select, the bestiary and the achievements board keep
  theirs; the shop's 28 tiles in three labelled groups do not, and its blurb
  lives in the detail window instead (`A39`). **The test is what the grid is
  for, not how many cells it has.**
- **Before deleting a hover panel, find out what was rendering through it.**
  The shop's was the only consumer of `UPGRADE_DESCRIPTIONS` — 28 generated,
  tested strings. Removing it without rehousing them would have produced the
  "ported but not wired" state by deletion, which is the hardest kind to
  notice because nothing fails.
- **The three glass tiles are one recipe written three times, and a test now
  holds them together.** `.shop-tile`, `.bestiary-tile` and
  `.world-grid__cell` had drifted to 26/20/42, 24/20/42 and 26/22/42 on the
  same steel ramp, because no screen shows two of them at once. All three are
  the bestiary's values now and `glassSurfaces.test.ts` compares the
  declarations. **Extracting a `.glass-tile` primitive the way `.gloss-pill`
  was extracted is the right end state** — it was not done in T180 only
  because it touches three signed-off screens.
- **No tile in this game moves on hover.** The shop's was the last
  `translateY(-1px)` and it went in T180; it also nudged the level badge off
  the art it labels. The test checks two things, and the second is the one
  that lasts: no `transform` in the hover rule, *and* no `transform` left in
  the transition list — leaving it there is how the property comes back,
  easing in and looking deliberate.
- **The bestiary is a roster and a window, and it shows all twenty enemies.**
  The original's 5x3 grid with a `More Enemies` button under it is the state of
  a build that has not been paid for — `hideAmount = 5` and the button share
  one `if(!Main.extraStuff)`, and `extraStuff` is an Armor Games/Kongregate
  purchase check. 5x4 with no button is the *other branch of the same source*,
  not a divergence (`A37`). A locked tile draws no art at all now, which is a
  stronger form of this screen's withholding rule than sending the right frame
  was.
- **A CSS scan must strip comments first — this has now bitten three times.**
  `buttonSounds.test.ts` counted a component whose docstring mentioned
  `<button`; `chromeStack.test.tsx` found a selector that existed only in the
  comment explaining its removal; `UpgradesScreen.test.tsx` asserted `.shop`
  had no `max-width` and failed against the sentence *"T167 added
  `max-width: 1800px`"* in the comment saying why it has none.
- **Measure layout against `vite preview`, never the dev server.** `DevLevelJump`
  renders only under `import.meta.env.DEV` and it is a whole section: at
  1024x480 it took the entire body and level select's layout row measured
  **0px** tall, so every reading was of a screen that does not ship. The shop's
  harness had the same flaw and got away with it because its DEV affordance is
  one 60px button.
- **Level select opens on a grid, never the world picker.** `selectedWorld` is
  re-pointed at the level guide's world on entry (`:383`) and `:431` always
  takes the levels branch; the picker is somewhere you go via `SELECT WORLD`.
  The rules live in `levels/levelSelectEntry.ts` because a scene cannot be
  constructed in a test — that is why the original defect was invisible.
- **Level medals are coloured per medal, not per level.** The highest tier that
  reached each slot takes it, so one tile can show gold, silver and bronze
  (`medalTiers.ts`, `A34`). The count comes from the values triple and never
  from the selected difficulty — a level taken on Easy still shows its medals
  while `HARD` is set.
- **`A8` is reversed.** A level-select tile *selects*; `PLAY LEVEL` starts.
  Hover is a CSS state and moves nothing — it used to move the panel, which
  meant the panel changed under the cursor on the way anywhere. The grid emits
  no `ui:start-game` at all and a test pins that to one emitter.
- **`aspect-ratio` is a preference, not a constraint.** It loses to content
  needing more room, which is what stretched the level tiles and pushed the
  bottom row out of its plate. Place the parts absolutely and add
  `overflow: hidden` if the box must actually be square — and *measure* the
  height/width ratio, since the CSS reads correct either way.
- **Never put `backdrop-filter` over the Phaser canvas.** It cost 52 fps on
  level select — 8 fps against 60 — because the canvas repaints every frame and
  the browser re-blurs the whole area each time. On the in-game screens it was
  also invisible: `.screen-shell` paints opaque `#000`, and blurring a flat
  colour returns it unchanged. Only `.menu-card` keeps one, over a real
  picture. Measure with an rAF sampler and disable suspects one at a time;
  reading the CSS tells you nothing.
- **A cursor-following tooltip needs three things or it flickers violently:**
  `pointer-events: none` (or it steals the hit test from the element it
  describes, unmounting itself in a loop), a portal to `<body>` (the shell body
  is `container-type: size`, which contains layout and so becomes the
  containing block for fixed children *and* clips them), and movement by
  `style.transform` through a ref rather than React state.
- Divergences from the restyle are `A21`-`A35`.

**jsdom cannot see any of this.** Layout bugs here are found by measuring boxes
in a real browser — see the trap below — and the visual judgement is the
maintainer's, per the standing instruction above `npm run look`.

## 4. Instrument traps

**Every one of these cost at least one pass, and several recurred after being
written down.** The pattern is always the same: *a tool returned a clean,
decisive, wrong result and was believed.*

0. **`npm run smoke` is not a layout check.** It passed on the commit where the
   main menu showed nothing but its background: Playwright counts an element
   visible when it has a **box**, and being clipped by an ancestor's `overflow`
   does not remove one. It answers "did the app boot", not "can you see the
   app". For layout, measure — `getBoundingClientRect` plus
   `elementFromPoint` in a throwaway Playwright script found both the cause and
   the fix. And when reading that hit test, remember `elementFromPoint`
   **skips `pointer-events: none`**, so a passive readout correctly reports the
   canvas beneath it rather than itself.

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

10. **An instrument left behind by its own last run — now mitigated
    structurally.** `npm run look` spawned vite through `npx` with
    `shell: true`, so `child.kill()` signalled the shell and the vite grandchild
    survived holding `--strictPort` 5199. Worse, `serverUp()` only fetched the
    URL: a **foreign** server answers 200 perfectly well, so the next run bound
    nothing, was answered by the stranger, and captured a full set of
    normal-looking frames from an unknown build. It recurred in T63 one commit
    after being written down, against a server older than the fix being
    verified.

    **Fixed in T64 the way trap 1 was fixed — by making the tool refuse rather
    than by restating the rule.** `look.mjs` now spawns vite directly
    (`process.execPath` + `vite/bin/vite.js`, no shell wrapper) so `kill()`
    reaches it, and **binds the port before starting**: occupied means a hard
    error naming the port and how to find the owner, because binding is the only
    test that distinguishes "something is answering" from "ours is answering".
    Both halves were driven — a clean `--ui` run now leaves no listener, and an
    occupied port exits 1 instead of producing frames.
11. **A correct game change invalidating one harness mode but not another.**
    T58's tutorial spawn gate is faithful, and `--baseline` was updated to move
    first. `--sound-sweep` was not, so it now measures a level that is
    deliberately not spawning and reports 25 of 67 where the same build clears
    1-1 under `--baseline`. **The failure looks exactly like lost wiring.** This
    is trap 9's shape one level up: the instrument's reach narrowed while its
    output format stayed identical. (`L3`.)
12. **A new input gate silently invalidating a harness's timing assumption.**
    T67 put `moveTank` and `tankAttack` inside the countdown
    (`PartGameArea.as:2818`, `:2820`), so player input does nothing for the
    first two seconds of a level. `--sound-sweep` did its move-and-fire in the
    opening 900 ms (`look.mjs`, the `releasePlay` site) — a timing that had been
    correct since T65 — so the tutorial's `AimShoot` never completed, `:7153`
    held spawning, and the arena stayed empty for the whole run.

    **Nothing failed.** No error, no crash, no warning; a plausible 27 of 67 and
    a normal-looking frame. It was found only by probing `__arena` and noticing
    the tank had never left its spawn point despite a scripted key press.

    **The lesson generalises past this instance: any feature that gates player
    input invalidates every harness assumption about *when* input takes
    effect.** Those assumptions are timing constants scattered through the
    harness, they are invisible in a diff of the feature, and no test covers
    them. When you add or change a gate — countdown, pause, cutscene, tutorial
    hold — re-check the harness's timings rather than assuming they are durable.
    The fix is to wait on the game's own flag (`__arena.countDownDone`), never
    on a sleep. (`L8`, and it was **my own countdown work two passes earlier**
    that broke it.)
13. **A fallback value that resembled a real reading.** The tank-tracking log
    fell back to `(640, 400)` when its live read failed — which is also exactly
    where the tank spawns, so a silently-failed read produced a completely
    convincing `640..171` trace and was indistinguishable from success.

    Fixed by moving the fallback off-centre **and** returning an explicit
    `live` flag, so the log reports `10/10 live` and the count of real reads is
    the claim rather than the coordinates.

    **Generalises: choose a fallback that fails loudly.** A default that looks
    like a plausible measurement converts a broken instrument into a confident
    wrong answer — which is the single most repeated failure in this list. If a
    sentinel cannot be made obviously invalid, report whether the real value was
    obtained alongside the value itself.

14. **A rule that only a person can follow gets broken by the person who wrote
    it.** `CLAUDE.md` forbids editing a doc with an unchecked scripted replace,
    because a missed anchor returns the original and reports success. It was
    then broken twice **by the author of the warning**, in consecutive passes,
    both times with `sed -i` on `BACKLOG.md`.

    **The tool used is not observable from the result**, so no hook can enforce
    the rule as written. `npm run docs:check` guards the *hazard* instead: a
    replace that half-applies leaves a duplicated figure disagreeing between
    documents, and markers make that a hard failure in `data:check`. It does
    not check prose against the marker — stated at the script, not implied.

    **Known gap, and it has now bitten once (T107).** That stated limit is real:
    the sound-coverage markers agreed at `50-51 of 67` while three prose copies
    said `47–48` and `41–42`, across both documents, and `docs:check` was green
    throughout. Found by hand, not by the tool. **Extending it to check prose
    against its own marker is optional future work — not owed and not queued**;
    recorded here so it is not rediscovered as a surprise.

    The general form, and the reason this is trap 14 rather than a footnote:
    **when a rule has failed twice, stop restating it and find the observable
    consequence to test.** That is the same move as trap 1's `npm run sweep`
    and trap 10's port check.

15. **A missing texture is not an error — it is a picture.** `TextureManager`
    returns `__MISSING` for any key it does not hold: a 32x32 black square with
    green lines. Nothing throws, nothing warns, the load does not fail, and the
    object draws at the right position, size and depth. The T106 boss indicator
    shipped this way and `npm run look` reported `no page errors` on the broken
    build.

    **Getting extracted art on screen takes two registrations** — `sync-assets.mjs`
    (file onto disk) *and* `manifest.ts` (loaded as a texture). T106 did the
    first only, and a grep for the shape id finds that line and stops, which is
    what made it look done. **Check both.**

    Generalises past textures: the failure mode is a subsystem that substitutes
    a plausible artefact instead of failing. See also trap 13's `(640, 400)`
    fallback, and `e.type` on an `Enemy` reporting `"Container"` for every enemy
    because the class extends a Phaser `Container` — both in the audit.

16. **A harness that samples a per-frame event needs identity, cadence and
    framing — and `--walls` got all three wrong before it got them right.**
    Recorded together because they are one lesson: *measuring a transient
    per-entity event is not the same as reading a value*, and each fault
    produced a clean plausible number.

    - **Identity.** `__arena.enemies` is distance-sorted and sliced, so an
      enemy's **index changes every frame**. Keying "this enemy's previous
      sample" on the index compared unrelated enemies: it reported `0 wall
      contacts` for a boss that sat against a wall for **152 consecutive
      samples**. Fixed with a `WeakMap` id in the scene (a dev aid, enumerated
      in `devAids.test.ts`).
    - **Cadence.** Sampling at 80 ms against a 33 ms frame missed most contacts
      outright — a boss that demonstrably reached a wall registered **one**
      on-wall sample in 220. A per-frame event needs roughly per-frame
      sampling.
    - **Framing.** Frames on a timer photographed an empty arena, because wall
      contacts are brief and rare. Frames are now captured **on detection**, and
      logged with the operands that triggered them so a frame and the number it
      evidences are tied together.

    **And the honest limit, stated rather than dressed up: a screenshot cannot
    show a reflection.** It is one instant, the enemy is often at a wall the
    camera is not looking at, and a bounce, a slide and a jitter all put a
    sprite against an edge. For this subsystem **the measurement is the
    evidence** and the frames are corroboration at best. Do not accept "here is
    a frame of it working" for anything whose signature is a change over time.

    One near-miss worth keeping: `types=Basic,Fast` on a Boss level read as "no
    boss spawned". A boss's *species* on 1-9 **is** `Basic` — what makes it a
    boss is `enemyLevel === 'B'`. The instrument was right and the reading was
    wrong.

17. **A fix that moves no number did not touch the cause.** The achievements
    board overflowed its plate and every badge overlapped a neighbour. The
    first diagnosis blamed a container-unit cycle in `--disc`, removed the
    cell's `container-type`, rebuilt, and re-measured: **all six viewports came
    back byte-identical** — same card size, same overhang, same overlap count.
    That was reported as "still failing" and nearly re-theorised, when it was
    already the answer. A stylesheet edit that changes nothing measurable is
    not a partial fix; it is evidence the cause is elsewhere.

    The actual cause was `padding: 6%` on the badge, read as a share of the
    disc. **Percentage padding resolves against the containing block's inline
    size**, so it was 6% of the 1425px grid — 85.5px a side inside a 105px
    disc. The border box grew to fit the padding and measured 173px.

    Two things generalise:

    - **Ask the browser which operand is wrong before theorising how the value
      was computed.** One `getComputedStyle` call settled it: `left` was
      `52.4px`, exactly half a perfectly valid `104.83px` `--disc`. The
      variable was never the problem, and thirty minutes went into it.
    - **A percentage is a question about a box you did not name.** Padding and
      margin percentages resolve against the containing block's *width* — even
      vertically. On anything sized by a variable, use a share of that variable.

18. **Headless Chromium cannot measure frame cost, in either configuration.**
    T194 needed to know what a `backdrop-filter` over the live arena costs.
    Default headless pins `requestAnimationFrame` to its own cadence and both
    arms read a flat **30 30 30 30 30** — the display loop saturating, not a
    result, and it would have been reported as "the blur is free". Unpinning it
    with `--disable-frame-rate-limit --disable-gpu-vsync` drops to SwiftShader
    software GL, where the same two arms read **3333 1 1 1 2500** against
    **2500 0 1 1 1**, median 1 fps, worst frame 1.4-2.6 seconds. Neither number
    is about the page.

    The tell for the first is **an identical reading in both arms of a paired
    test**; for the second, **a variance larger than the effect**. Both were
    reported as inconclusive and the decision was left resting on the earlier
    `D-FPS` finding, which was measured differently. A compositor cost needs a
    real GPU, which means the user's machine, not this harness.

19. **A value that is only printed is not checked.** The T195 harness read the
    money colour, printed `money $0 rgb(255, 255, 255)` on the line, and
    stamped **OK** beside it at all six viewports — because the colour was in
    the output string and not in the pass predicate. The money was white; the
    stylesheet said green; the run was green. Anything worth putting in a
    harness's output is worth putting in its predicate, or it is decoration
    that reads as evidence.

    The bug underneath was the sixth equal-specificity override in
    `global.css` to lose to its own base class on source order alone. **When a
    CSS override does nothing, count the classes before re-reading the value.**

20. **Check what the page already publishes before looking for a handle to
    inject through.** Two drafts of the T196 colour harness drove health via
    `window.__gameStore` and then `window.__GAME_EVENTS__`. Neither exists —
    this build exposes only `__PHASER_GAME__`, `__arena`, `__soundQueue` and
    `__tutorialPanel`, and the last three are DEV-only, so under `vite preview`
    there is no store handle at all. Either draft would have set nothing, read
    the same value five times, and reported a flat ramp as a pass.

    The working version checks a **pairing** instead: the health bar publishes
    its own value in `aria-valuenow`/`aria-valuemax`, so the fill's computed
    colour must match the interpolation of that fraction — recomputed in the
    harness, never imported from the module under test, or the check agrees
    with the code by construction.

    The wider habit: **split the claim where the evidence divides.** A pure
    function is provable offline and should be proved there exhaustively; only
    the wiring needs a browser, and the browser half is usually a relationship
    between two things the page already shows.

21. **A well-cited constant can still be about something that no longer
    exists.** `HUD_BOTTOM_CLEARANCE_CSS = 96` carried a comment naming its
    method, its measurement and its viewport — "`.hud__row--bottom` reported
    `top` 89 CSS px above the canvas bottom at 1280x800" — and every one of
    those facts was accurate. The row had been deleted two tasks earlier. The
    minimap was being held 96px clear of furniture that was not there, and a
    later 6-unit margin change against it looked like it did nothing, because
    it did.

    A citation records where a number came from; **it cannot notice when its
    subject is removed.** When a positioning change has no visible effect, list
    every term in the expression and check each one still refers to something
    real, before adjusting the term you touched.

22. **An assertion can keep passing after its reason dies.** `PauseOverlay`
    omitted the audio toggles because the HUD already had them; T200 removed
    the HUD copy, and both the docstring arguing that and a test named
    `does not duplicate the HUD audio toggles` kept asserting the right
    outcome from a premise that had become false. Nothing went red, which is
    what makes it harder to spot than a failing test.

    **When you delete a thing, grep for what justified its absence
    elsewhere.** A comment or test naming the deleted thing is the tell, and a
    negative assertion is where it hides — restate the rule or add a
    counterpart that pins what *is* there.

23. **Two silent ways a DOM measurement lies, both found in one harness.**
    `querySelector('.a, .b')` returns the first match in **document order**,
    not the first selector's match — a tolerant fallback selector made the
    query ambiguous and the harness measured a price paragraph instead of the
    blurb, reporting the longest description as `"$0"`. And `line-height`
    computes to the keyword `normal`, which `parseFloat` turns into `NaN`, so
    every comparison against it was false and all five viewports failed on a
    page where nothing was wrong.

    Both were caught only because the *printed value* was implausible.
    **Print the value being judged, not just the verdict.**

24. **Read the console; a warning nobody reads is not a mechanism.**
    `--font-body` never loaded — the extracted `49_Main_font2_Arial.ttf` has a
    malformed `cmap` and Chrome rejected it outright, on every screen, since
    the first sync. `fontLoader.ts`'s self-test detected it perfectly and said
    so in a `console.warn` that nothing ever surfaced. Nothing broke: text was
    just set in a fallback face.

    A layout scan that also collected `console` and `pageerror` output found it
    in one run. **Collect console output in every driven harness** — it is free,
    and it is the only channel a working self-test has.

25. **A *failed* build serves the previous bundle.** `npm run build` is
    typecheck-then-build; when the typecheck fails, `dist/` is not rewritten
    and `vite preview` serves the last good one. A driven harness then measures
    **old code** and reports the bug still present. This happened on T211 and
    the fix was already correct.

    Vitest does not typecheck, so a type error can pass every test and only
    `tsc` objects. **Confirm the build succeeded before believing a driven
    result**, and do not let a harness's output start where the build's output
    ends — the `tsc` error was one line above `at boot:`.

**A run reporting nothing missing should be as suspect as one reporting
everything missing** — and a run reporting *more* missing than last time should
be checked against a second mode on the same build before it is believed.

---

## Pause — shipped T127-T129

**There is no pause button in the AS3.** `PartGameArea.as:2682` triggers on
`Main.keyP || Main.keyEsc` plus an auto-pause on focus loss; the four
`ButtonPause*` classes are the buttons *inside* the panel. So the port binds
**P and Escape**, and the panel carries Resume / Reset Level / Quit Level.

**The minimap (`A50`, `A51`).** It lives in **screen space** —
`setScrollFactor(0)` on the Graphics *and* its mask — because anchoring it to
`camera.worldView` made it twitch: `drawMinimap` runs in `update`, but
`Camera.preRender` (follow lerp, `roundPixels` floor, `worldView` recompute)
runs from `CameraManager.render` after it. **Do not move it back to world
space.** Dots are all red, as the AS3 has them; the ground matches
`--hud-plate` and is checked against the stylesheet rather than copied. Round
dots, culled rather than clipped, with the overhang cut by a geometry mask — the AS3's own arrangement (`:286`). **Do not
put `clampToPanel` back on the dots**: it moves their centres, which reports an
enemy in the wrong place. Dot colour is an authored per-family palette (the
AS3 draws every enemy in one red), covered against `BESTIARY` so a new enemy
type fails the test until it is classified. `marker` deliberately does not
round; the rect fills still do.

**The body font is a repaired authored asset (`A55`).**
`assets-authored/fonts/49_Main_font2_Arial.ttf` deliberately shadows the
extracted file of the same name — the JPEXS export's `cmap` is malformed and
Chrome rejects it. Do not delete it or "restore" the extracted one;
`fontIntegrity.test.ts` fails if the broken bytes ship.

**The unlock reveal stacks above the results, it does not float (`A61`).**
`.level-outcome` is a flex column with a gap and `overflow-y: auto`; the reveal
is a normal child, first in the DOM. **Do not give it `position: absolute`
again** — the panel's height varies with the outcome, so no offset clears it in
every case, which is how T206 broke it.

**The results screen has no VICTORY/DEFEAT banner and no Menu button
(`A60`).** The hidden `<h2>` stays so screen readers still get the outcome.
The unlock reveal centres with a flex column, not `text-align` — that centres
text inside boxes, not the boxes, which is what looked off-centre. The enemy
portrait's art is resolved on the *page* via `revealedTileLayers`, never in the
view: `EnemyTile` must stay ignorant of which enemy it draws.

**The results screen is flat, with real medals (`A58`).** Both the panel and
the unlock reveal use `--hud-plate`. Medals are `LevelModeIcon` in the shared
`medal--*` tiers, and the tier is derived by feeding `medalTiers` rather than
restating "Hard is gold" — do not hard-code the mapping in the view.
`level:ended` carries `mode` for the medal shape. One primary action, inverted.

**The pre-level briefing is flat and ordered (`A57`).** `--hud-plate`, no
border, and it reads mode -> objective -> count. The digit line is reserved by
`min-height` so the text above cannot jump; the asymmetric bottom padding is
load-bearing (the display face descends outside its line box). No Start button
exists — the AS3 countdown runs automatically.

**The title-bar crest is the home button (`A59`).** `IconShield` is a real
button on every screen that shows it — `shield={false}` turns it off, which is
the main menu's own setting. It is the one-click route home now that the dock
has none. Options deliberately has *both* it and Exit to Menu: chrome and a
settings action, recorded in `A59` rather than being a mistake.

**The dock has no Main menu button (`A56`).** It was removed from the bar
entirely — the route to the title screen is Options -> Exit to Menu, two clicks
from any screen. The main menu itself has never had a dock. `MENU_FRAMES` is
kept as extracted data although nothing renders it.

**Exit to Menu is on the options panel, not the dock, and only there
(`A54`).** `BottomNav` takes `showMenu`, defaulting to **true**; only Options
passes false, via `ScreenShell`'s `navMenuButton`. Do not flip the default —
`ButtonMenu` is the only way out of the bar on the other four screens. The
`margin-top: auto` that pins the block to the card bottom lives on
`.options__exit` now; putting it back on `.options__danger` as well splits the
free space and pushes the two buttons apart.

**There is one green now: `--green: #3fae53` (`A73`).** It replaced `#7dff8a`
in the shop, `#4ade6a` on the HUD and `#00ff00` for `--ok`, all of which read
as light rather than green. The value is the shop buy button's own midtone, so
it has a provenance. **Two homes cannot read a custom property** —
`healthColour.ts`'s top stop and `GameplayScene`'s `MONEY_BADGE_*` — and
`layerDepths.test.ts` is what keeps all three in step; it failed by name the
moment the token moved, which is how it should be.

**Impact bursts had three wiring gaps, all fixed (`A72`).** A hit *does*
throw debris — `effects/impactCue.ts`, called from `hitEnemy` — but it landed
at the round rather than on the enemy's rim (`:5654`); `BulletFire` and
`BulletPenetrate` fell through to the common shape where the AS3 gives them
none, which for fire meant three pieces **per enemy per frame**; and the timed
bomb never reached the burst at all. The `lastImpact` dev aid records empty
bursts too, because "spawned nothing" and "was never called" read the same.
**Known gap:** the laser's own cue at `:5633` is still missing.

**T219's death-debris scale is reverted (`A72`) — the small puff is intended,
and the constant says so.** Coins eased from 2.4x to 1.8x, with the friction
floor now a test rather than a comment.

**Death debris was never broken (`A71`).** All 19 enemy particle colours
resolve, ship and register; driven, 0 fall back to `particle-dot`. It was
small, so `DEBRIS_SCALE` raises velocity and lifetime together and
`DEBRIS_COUNT_SCALE` raises the count — friction stays at the AS3 value, and
the count scale is the one to lower if a crowded wave drops frames.
**Known gap:** `particleShape(clip, 1)` always draws frame 1, so Magic, Poison
and the muzzle flares lose their variants; harmless for debris, noted at the
call site.

**Money drops are green $-badges and fly faster (`A70`).** `COIN_SPEED_SCALE`
multiplies the AS3's attraction and cap; friction is deliberately unscaled.
The originals are kept as `AS3_*` and still pinned against their source lines
— **do not delete them when retuning**. The badge colours are restated as hex
in `GameplayScene` because a canvas cannot read CSS; a test compares them with
the stylesheet.

**Ice/lava trails sit at depth 0.75 and are spaced by distance (`A69`).**
`HAZARD_DEPTH` was 0, below `PROP_DEPTH` 0.5, so props drew over the trail;
`layerDepths.test.ts` now asserts the *ordering* rather than the numbers.
Density is `BALL_TRAIL_SPACING` world units, not per-frame — do not seed the
accumulator with `Infinity`, since `Infinity % n` is NaN and NaN reports
"due" forever.

**The Cake burst is a death effect (`A68`).** `:6132`'s spawn block is the
`else` of `:5981`, whose condition is the enemy *surviving* — so cakes only
shatter on a kill. The port burst on every hit until T216. `hitEnemy` returns
the kill now and `burstCake` gates on it; `__arena.bullets.impacts`/`.bursts`
is how to check it from outside. Equal counts do **not** mean the gate is
broken — on easy levels every cake hit is lethal.

**KABOOM! wants a Tower level (`A67`).** The AS3 says Defense; this is the one
deliberate mode divergence in the achievements, and the description says
"tower level" to match. Every other mode was re-checked against its own AS3
`case` block and agrees. If you revert the predicate, move
`achievementWording.ts` and the reachability input with it.

**KABOOM! and its two siblings no longer need a flawless run (`A66`).** The
`hp < 95` clean-run gate on the weapon flags is removed — measured, the tank
loses 6 hp in four seconds, so a five-point budget across a Defense level was
unreachable. `achievementWording.ts` corrects the three descriptions, which
still say "and get 3 medals" in the generated data. `__arena.achievements`
publishes the flags, weapon name and hp for diagnosing this class again.

**Achievements: all 36 are reachable, and a loss is not a completion
(`A65`).** `bankLevelOutcome` derives `completed` from `won` and takes
`Omit<LevelRecord, 'completed'>` — **do not let a caller pass it again**, that
is what let a lost level earn "Idle".
`achievementReachability.test.ts` fires every achievement from a tailored
input; a new one fails there until it is given a way to be earned. KABOOM!
(`DefensiveBombs`) additionally needs **no damage taken** and **no secondary
fired** — it is correct, just stricter than its title suggests.

**Deleting a slot is verified end to end (`A64`).** It needed no fix. The
interaction worth knowing: the menu deletes and then republishes, and
republishing flushes-then-reloads — safe only because `clear()` sets
`dirty = false` as well as emptying `data`. A test pins that exact order.

**Save slots re-read on every menu entry (`A63`).** `SaveStore` loads once in
its constructor, and there are two instances over each slot key — the profile's
(gameplay writes) and `MainMenuScene`'s (the menu reads). Phaser reuses scene
instances, so the menu's copy was built at boot. `publishSlots()` calls
`reloadAll()` first; **do not remove it**, or the slot list goes stale again
until a page reload.

**The shop prices in dollars (`A62`).** The `◉` glyph is gone — it was not in
`SWFMainFont`'s 581 glyphs and came from a browser fallback. Price, balance and
both accessible names all say `$`. The price green is the shop balance's
`#7dff8a`, deliberately not the HUD's `#4ade6a`.

**Shop blurbs are hand-authored (`A53`).** `upgradeDescriptionData.ts` is
generated from the AS3 and must not be edited; the one-line shop copy lives in
`upgradeBlurbs.ts`, with tests requiring the two to cover each other exactly.
`BLURB_MAX_LENGTH` is 26 because that is what the detail column measures at,
not because 26 looked right.

**No audio control during a level (`A52`).** The HUD's mute/music toggles were
removed by request; both toggles and both volume sliders live on the options
screen only. The AS3 puts them in the pause panel too, which is where they
belong if a mid-level mute is ever wanted.

**The pause panel is flat (`A52`).** `--hud-plate`, no border, one soft
shadow, Resume inverted as the single emphasised action. It resolves
`--hud-plate` by being rendered *inside* `.hud` — do not move it out of that
subtree without moving the declaration.

**The in-game HUD, as it now stands (`A47`-`A49`).** One readout per corner:
money top-left in green with a `$`, the controls top-right, the health bar
bottom-left as a pill, the weapon hotbar centred on the bottom edge. The
objective line reads `3/20 killed`, or `3/20 collected` on a Flag level — the
old "N on screen" live population figure is gone, and so is the whole
diagnostics panel. The health colour is computed by
`src/game/ui/healthColour.ts`, not painted by a gradient; **do not put a
`background-image` back on `.hud-health__fill`**, it would cover the computed
fill.

**The HUD's look is flat grey, not glass (`A47`).** T194 built it as glass to
match the menus and that was rejected: no border, no shadow, no gradient, one
`--hud-plate` grey. Health and money sit bottom-left, money reads `$1,500` in
green, the hotbar is centred on the arena by a `1fr auto 1fr` bottom row. Do
not "restore the house style" here — the divergence from every other screen is
the point.

**T194 added one anyway, as a declared divergence (`A46`).** The HUD overhaul
was asked for a pause control top-right, and keyboard-only pause is unreachable
on touch. `.hud-pause` emits the same `ui:pause` the keys do — one path, not
two — and replaced the `Menu` button that used to sit in that corner.

**The trigger lives in React, not in `GameplayScene`.** A paused Phaser scene
stops dispatching its own keys — `KeyboardPlugin` checks `isActive()` — so a
`keydown-P` handler in the scene would pause the game and then be unable to
unpause it. It listens on `window` and goes over the bus, which is the
sanctioned React -> Phaser direction anyway.

**`canPause` is an edge detector and it matters.** The AS3 polls a *held* key
every frame, so without the latch pause toggles sixty times a second. Extracted
to `pauseLatch.ts` and driven over 60 and 200 frames of a held key, requiring
exactly one toggle. The auto arm carries its own `!gamePaused`, so losing focus
can pause but never resume — pinned over 300 unfocused frames.

**`paused` lives in the store, not in the latch.** The key and the Resume button
both change it; a local copy would go stale the first time a player mixed them.
`endLevel` also clears it, so the pause panel and the results overlay can never
stack — belt and braces with the latch's finished-level gate, and both wanted.

**Three inert things now have consumers:** `ui:pause` (a correct handler with
zero emitters), `autoPause` (persisted and shown on the options screen, read by
nothing), and `SoundManager.musicPaused` (a field the class carried from the
start that nothing ever set). Setting it **stops** the music rather than
suspending it — `SoundManager.as:947` tears the channels down, so resuming
restarts the track from the top. The manager ticks on the game's `PRE_STEP`
rather than a scene update, so it keeps running while the scene is paused and
the flag takes effect at once.

**Three divergences**, all tested so they cannot be undone by accident: the panel
does **not** duplicate the HUD's audio toggles, it does **not** carry the
auto-pause checkbox (removed T136 — the setting still lives on the options
screen and still works; only the in-panel duplicate is gone), and Quit goes to
**LevelSelect** (`ButtonPause.as:105`) while the HUD's separate Menu button
still goes to the title.

**A bug fixed in T130.** "Reset Level" restarted the scene but left the overlay
up, because `paused` is store state and a scene restart does not touch it.
`setActiveScene` now clears it, which covers every scene transition rather than
that one button.

---

## The Gummy Bear's damage never reached the enemy — T131

**The rule was right and had been since T4; the wiring threw the result away.**
`bounceGummy` computes the AS3's x3 then x4/3 exactly, and `Bullet.advance`
wrote `this.motion` **twice** in one method: once inside `applyBounceCost` to
raise the damage, then unconditionally from the step's own state, which had been
computed before the bounce was known. The second write won on every frame.

So `bounceState.damage` held 36 and then 48 and looked correct to anything that
inspected it, while `motion.damage` — the value `Bullet.damage` returns to the
collision — reset to the spawn figure. Measured against the pre-fix
composition: **36 on the books, 12 to the enemy.**

**Why nothing caught it.** The rule had unit tests, the seam had none. That is
this repo's signature failure written out again: four consecutive gameplay bugs
with the same shape are already recorded above, and this is the fifth. The fix
is `motionAfterStep` in `bulletStep.ts` — one pure composition, one write, and
`bulletStep.test.ts` drives the chain in the order `advance` runs it.

**The shape to watch for elsewhere:** a method that assembles state from two
sources where one is computed earlier than the other. The earlier value is not
stale in general — it carries the position, velocity and heading, which is
precisely why it is written last — it is only stale in the one field the later
step also touches.

---

## The shield glued the tank to bosses — T132/T133

Three faults in one contact path, and **none of them was a sign error** —
`resolveContact` has computed the angle correctly since it was written.

1. **The suck-in.** `isTouchingTank` reaches `enemyRadius + tankRadius * 2` with
   the shield up (`tankDamage.ts:64`), while `:5319`'s un-overlap places the
   tank at `enemyRadius + tankRadius` and is gated on `dist < tR + eR - 5`
   (`:5317`). `GameplayScene` ignored that gate and shoved on **every** boss
   contact with its own recomputed angle, so a tank touching a boss with its
   *shield* was teleported inward to the body and pinned there. Unshielded the
   two radii are equal, so the shove was a no-op and the bug never showed.
2. **The knockback was discarded.** `:5311` sets the velocity to 8 away; the
   scene computed it, commented that it was not wired, and dropped it.
3. **The clamp ate what was left.** `Tank.as` opens `if(!this.pushed)` at
   `:103` and closes it at `:161`, and the speed refresh and `maxSpeed` clamp at
   `:155-160` are **inside** it. So a pushed tank is never clamped — which is
   the entire reason `BOSS_PUSH_SPEED` is 8 against a `maxSpeed` of 3. The port
   clamped unconditionally, crushing the shove to 3 on the frame it landed.

**`frozen` and `pushed` are not one flag.** They were, until this pass. The
`levelDone` guard sits at `:106`, *inside* `!pushed`, around the input only:
accel is skipped by either, the clamp by `pushed` alone, friction applied by
either. Collapsing them looks harmless and deletes five-eighths of the
knockback.

**Fault 3 was found by a test written for fault 2** — the duration test failed
with "expected -3 to be greater than -2.8", which only makes sense if the clamp
had already flattened both sides. Worth remembering: the assertion that fails
for the wrong reason is often pointing at a third thing.

**Two seams here still rest on labelled source assertions** — the scene's
handoff to `resolveContact` and the `pushedFrames` argument to `drive`. Both are
one line, both are labelled as proving a spelling, and `sceneHarness.ts` records
why a real `PlayerTank` cannot be stood up in this suite. Extract the apply step
if either ever needs a behavioural test.

---

## Enemies turn twice as fast — T134, divergence `A12`

**A tuning decision, and the scoping pass found no bug** — which is the part
worth carrying, because the change looks exactly like a fix. The reported
symptom was enemies "ice-skating": they slide and drift rather than committing
to a heading. The port's movement matches `PartGameArea.as:4696-4744` term for
term, including the friction the drift comes from. The drift is faithful.

What produces the feel is the *ratio* between turn rate and acceleration: an
enemy accelerates along its **new** facing each frame, so a slow turn means the
old velocity keeps most of its authority for many frames. Doubling `rotSpeedMax`
shortens that tail without touching friction, acceleration or top speed.

`ENEMY_TURN_MULTIPLIER = 2` is applied where `rotSpeedMax` resolves in
`resolveEnemyStats`; `enemyStatsData.ts` keeps the untouched AS3 rows, so the
baseline is still readable and `AS3_ENEMY_TURN_MULTIPLIER = 1` sits beside it.
Reverting is one constant.

---

## Four settings and UI items — T135-T139

A batch from one report, four atomic commits, three of them divergences.

- **T135, `A13`** — `crosshair` and `tutorialOn` start **off** for a new
  profile. Nothing had pinned the defaults: both were changed and all 3042 tests
  stayed green. `gameplayOptions.test.ts` now holds the AS3 table as its own
  object and requires the shipped defaults to differ in **exactly** those two
  keys. Turning the tutorial off removes onboarding for anyone who never opens
  the options screen; that was flagged and confirmed as wanted.
- **T136** — the auto-pause checkbox leaves the pause panel only. See the pause
  section above.
- **T137, `A11`** — the mysterious **"Info window"** option is
  `optionWindowUL`, and `UL` is **Upgrade Limit**: `ScreenGame.as` gates the
  per-level upgrade-limit popup on it. Since the limit itself was dropped by
  decision in T122, the toggle governed nothing, so the row is gone from the
  options screen. The key and its default are kept so an existing player's
  stored value is not orphaned.
- **T139** — an achievement earned **in the shop** now pops at once. Another
  instance of this repo's signature failure: `recordAchievements` had exactly
  one caller, the level-end path, so nothing evaluated on a purchase.
  **Filed as divergence `A14` and withdrawn a day later (T140)** — the original
  does pop these, from a second `PartAchievements` at `ScreenUpgrades.as:635`
  and a per-frame sweep at `:216`. The behaviour stands; the divergence claim
  was mine, from reading a name grep as a complete count. `A14` carries the
  correction.

---

## The bestiary, completed — T142/T143

**Audited first, and the unlock rule was already right.** Worth knowing before
changing anything there: discovery is **not** by kill count. `ScreenStatus.as:415`
calls `ScreenEnemies.updateEnemies(world, level + 1)` when a level is *won*, so
clearing a level reveals what is waiting in the next one. The port does the same
from `playerProfile.recordLevel:341`, and simulating a full 405-level clear
reaches 20/20 with nothing stranded.

What was missing was all display: no enemy pictures, no stat block, no
difficulty or tier selectors. All three are in now.

- **The pictures are the tiles, not the gameplay clips.** `ScreenEnemies` never
  builds an `ImageEnemy` — that belongs to the level-select panel this port does
  not have (`A8`), and its plate is still synced-and-undrawn. The bestiary's art
  is `ButtonEnemy<Type>`, whose **frame 4 is a built-in locked state**, so an
  unmet enemy is hidden with the original's own "?" glyph.
- **Which frame to draw is decided in `buildBestiaryListing`.** `BestiaryScreen`
  is barred by test from importing `bestiaryData`, `enemyKnowledge`,
  `bestiaryArt` or `bestiaryStats`; it may import only `bestiaryView`, a leaf
  holding the view shapes and tier labels and no enemy data at all. That list
  grew in T143 for a reason worth keeping: a picture and a stat block are as
  leakable as a description.
- **The stats are the screen's own formula, and they agree with the game.**
  `bestiaryStats.ts` is driven against `resolveEnemyStats` across all 180
  type/tier/difficulty combinations. They part on boss money alone, on purpose:
  the resolver divides by the level's boss count and the bestiary is not looking
  at a level.
- **The selectors live in the header, one pair for the screen** — the AS3's are
  statics, so they were screen-wide there too. The scene owns the selection and
  republishes; React emits `ui:bestiary-view`, exactly as the options screen
  works.

Layout differences are `A16`; the port keeps its flat list rather than the
original's grid plus detail pane.

---

## The shop's tiles — T144/T145

**The audit's surprise was what was already there.** The stat block the AS3
shows — five lines, current level beside next — has been implemented and wired
since `upgradePreview.ts` landed, including the `statsIncludeLevelZero` quirk
that only affects Speed. Driven: `Cannon @1` gives
`["Damage: 7 HP  7.33", "Reload: 0.43 Sec  0.43", "Explosion: 30 PX  33", "", ""]`,
and at level 10 the next-value half drops away. All 28 upgrades produce at least
one line at every level.

What was missing was the pictures, and nothing else of substance.

- **Nine frames, not one.** `ButtonWeapon.as:145-206` is a 3x3 of state
  (owned / owned-and-equipped / not owned) by interaction (rest / hover /
  pressed); `ButtonMisc.as` is the same without the equipped row. Resting frames
  are **1, 4, 7** for a weapon and **1, 4** for a misc upgrade.
- **The not-owned row has its own glyph.** The original does not dim the owned
  art, it draws a different picture. Pinned, because a CSS filter is the obvious
  thing to reach for.
- `upgradeTile.ts` holds the rule and asks *owned?* before *equipped?*, as
  `:193` does. `UpgradesScene` resolves it and sends the layers; `UpgradeIcon`
  paints them and is `aria-hidden`, since the row already names the upgrade in
  text.

**Also fixed:** the footer said "Equipping is not ported yet" directly under
working equip controls. The withheld-upgrades notice next to it is *dormant*,
not stale — nothing is withheld today, but `purchasable.ts` is still the gate,
so it stays.

Not done, by decision: the slot 1<->2 swap button (`ButtonWeaponSwitch`), and
the AS3's grid-plus-detail-pane layout. Same call as the bestiary's `A16`.

---

## The minimap — T146

**The first of four HUD gaps the T146 audit found**, and the only one closed so
far. `PartInterface.drawMinimap` (`:652-694`) draws an 80x80 panel: grey ground,
a 20%-white rectangle for what the camera sees, a red 4px dot per enemy (8px for
a boss), a black dot for the flag on Flag levels, and a white dot for the tank —
**in that order**, so the tank can never be hidden under an enemy standing on
it.

`ui/minimap.ts` owns all of it, including `minimapPlan`, which returns the fills
as an ordered list of values. `GameplayScene.drawMinimap` is a loop over that
list and nothing else, so the part a scene test cannot reach is one `fillRect`
call and everything that could be wrong about the picture is driven.

Two things to know before changing it:

- **The viewport rect uses the live camera**, so on a room smaller than the
  camera it exceeds the panel and `clampToPanel` — the AS3's own mask — hides
  the overflow. Both the honest figure and the clamped one are pinned.
- **Placement is `A17`**, not the AS3's `(560, 400)`: those are stage
  coordinates for a HUD band this port does not have.

**The off-screen markers followed in T148** — `G2` and `G3`. `outsideWindow`
lives in `ui/offScreenMarkers.ts` with both placements and the flag's pulse;
`GameplayScene.drawOffScreenMarkers` is placement only. Three things worth
knowing: an enemy is outside only when its **whole box** clears the view, a
**teleporting** enemy is never marked, and the enemy marker's direction comes
from *which edge it was pinned to*, not from a computed bearing — eight fixed
rotations, corners included. The flag's marker is 8-frame directional art with
a two-curve pulse (`easeOut` down, `easeIn` up) that starts when the countdown
ends. Placement is `A18`; two smaller divergences are `A19` (the appear
threshold is the collision radius, not the art's half-width) and `A20` (the flag
marker is full size during the countdown, where the AS3's scale is `NaN`).

**T149 fixed a crash in it that no instrument here could see.** The enemy marker
pool is a field on a scene instance Phaser reuses across `scene.restart`, and
Phaser destroys its images on shutdown — so every level after the first threw on
the first frame with an off-screen enemy, while all 29 marker tests passed. The
pool is now emptied in `create` beside `flagMarkerSprite`, **not** in the `init`
reset block: the two fields beside it are rebuilt per run by construction, and
`enemyMarkers` was the one field of seven that the reset block's convention had
been missed off. If you add a marker, add it there. Full write-up in the audit
under "A pooled game object outlives the scene that built it".

**The HUD weapon art followed in T150** — `G4`, and the last of the audit's four
gaps. `WeaponInterface` (symbol 1198) is **one clip with three instances**: the
weapon in hand, the other slot at 0.75x, and the special. `ui/weaponArt.ts` is
generated from the SWF and `ui/weaponPanel.ts` is the transcription — frame
numbers, which instance shows what, and the special's dim while it reloads.

The thing to know before touching it: **the layers align by origin, not by
centre.** Every placement inside 1198 is identity with translate (0, 0), so
both shapes sit at the clip origin, and a shape's origin is usually not its box
centre — 22 of the 24 glyphs are off, worst `Cannon` at 4.31 units on a 30-unit
socket. `UpgradeIcon` centres its layers and is right to; copying that here
would hang the default weapon's barrel out of its socket. Layout divergences are
`A22`, and the weapon name kept as text under the art is `A21`.

**That audit is now closed.** T151 took the last two cosmetic items — the menu
credit (`ButtonCredit`, which never needed the Credits screen its row claimed to
be waiting on) and the two stale comments, one of which turned out to be
describing dead code rather than live code. **The credit was then removed again
in T153 by decision** — the port carries no attribution, `A23` records it, and
its `infoTextSites.ts` row says "removed by decision" rather than sitting there
looking like work owed. T152 triaged knip: 545 findings
sorted into four buckets by `scripts/knip-triage.mjs`, 114 exports made
module-private, 10 dead symbols deleted, and the two categories where the
obvious action is *wrong* left alone with the reason written down. Read
`KNIP.md` before acting on that list — 407 of the remaining 421 are the
baseline the configuration is designed to produce, not debt.

What is genuinely open now is a decision list, not a gap list: the unwired
category-1 features (`tutorialState`, the achievement evaluator,
`enemyKnowledge`'s discovery half, `applyFreeze`), the three helpers whose
callers reimplement them inline, and the touch/phone work that is deliberately
queued behind the desktop port.

---

## 5. What is open

### The live queue — one measurement note

**Nothing here is queued build work.** The one decision that sat in this table —
the volume slider ↔ mute coupling — was decided and shipped in T111; the row
that remains is a standing note about what the sound sweep can reach. This
section is the source of truth for both — `BACKLOG.md` points here rather than
restating them.

| Item | Needs |
|---|---|
| ~~**Volume slider ↔ mute toggle coupling**~~ — **DECIDED AND SHIPPED (T111): port it faithfully.** | See *The slider and its toggle are one control* below. |
| **Sound: 16 silent in the sweep — 14 need no code, 1 is blocked, 1 is permanent** | `--sound-sweep` reports **50–51 of 67** (T80; three runs on the final harness gave 50, 50, 51, with `ReflectBullet`/`TankDamaged`/`TankEnemyCollision` swinging). **`Award1-3` are additionally confirmed firing by `--medals`** (T74) and do not appear in the sweep figure, because the sweep drives a defeat and they fire on a win. **The two numbers have come apart and both are correct** — the sweep measures what one scenario reaches, not what is wired. Full list and evidence grade below. |

### The 16 silent sounds, individually

**Silent in *all three* T80 runs, which is not the same as silent.**
`ReflectBullet`, `TankDamaged` and `TankEnemyCollision` each fired in some runs
and not others; they are reach noise, not gaps, and are listed below with that
said. Only `BossCollision` (blocked) and `ImpactCrazyCheese` (permanent orphan)
are silent for a reason other than "this scenario does not go there".

**Evidence grade is stated per row, per rule 8.** *Measured* means the sweep or a
scan settled it. *Inferred* means the emit site is cited and confirmed present,
but the scenario that reaches it has **not** been driven — a weaker claim, and
the one that has been wrong before.

The "no emit" rows are measured by an exhaustive scan over every emit form this
port has (`queue`, `startLoop`, `stopLoop`, `setMusic`, `keepLoopAlive`), not by
a name grep — the variable-passed music names are exactly what a name grep gets
wrong, and did.

**Wired — nothing owed. The sweep does not reach the scenario (14, counting the
five struck-through rows in the table below, which are wired *and* measured
firing by a different driven mode):**

| Sound | Emit site | Grade |
|---|---|---|
| `BottomCollision` | `GameplayScene.removeEnemy`, T71 | inferred — needs an enemy to cross the Defense line |
| `FlagPickup` | `GameplayScene.ts:3965` | inferred — needs the tank to reach a flag |
| `InterfaceButtonMoney` | `UpgradesScene.ts:243` | **drive attempted and reported failing** — the Buy click did not land; not driven |
| `Menu` | `MainMenuScene.ts:83` | **measured cause**: gated on a Phaser `POINTER_DOWN` on the canvas (`:79-84`), and the DOM menu overlay intercepts every harness click. Not reachable by this harness without a canvas point clear of the buttons |
| `ReflectBullet` | `GameplayScene.ts:3906` | **measured, intermittently** — fired in two of the three T80 runs and in one T69 run. A swing name: reach varies, the wiring does not |
| `SpecialReloaded` | `GameplayScene.ts:3444` | inferred — needs a longer window than the sweep gives |
| `TankShieldCollision` | `GameplayScene.ts:3655` | inferred — needs the shield up at the moment of a hit |
| `TeleportIn` | `GameplayScene`, T71 | inferred, but its sibling `TeleportOut` **is measured firing through the identical code path** |
| `WeaponChange` | `GameplayScene.ts:4181` | inferred — needs two owned primaries; `?primary=` equips one |
| `Win` | `GameplayScene.ts:4022` via `outcomeMusic` | inferred, but `Lose` **is measured firing through the identical function** |

**Blocked — no production emit, and something has to land first. Nine rows, and
after T80 only two are still live:**

| Sound | AS3 site | Blocked on |
|---|---|---|
| ~~`Achievement`~~ | `PartAchievements.as:120` | **fired (T79)** — the toast queue is built; the sound is bound to a toast being *shown*, not earned |
| ~~`Award1`~~ | `ScreenStatus.as:1151` | **fired (T74)** — driven at `1★@0ms` |
| ~~`Award2`~~ | `ScreenStatus.as:1157` | **fired (T74)** — driven at `2★@334ms` |
| ~~`Award3`~~ | `ScreenStatus.as:1163` | **fired (T74)** — driven at `3★@652ms` |
| ~~`Unlock`~~ | `ScreenLevelSelect.as:768`, `:1475` | **fired (T76)** — driven, one per latch |
| `BossCollision` | `PartGameArea.as:5197` | **enemy-to-enemy collision** — the pair loop at `:5174-5221` has no port equivalent. **Re-filed T80** as `Port enemy-enemy separation` in `BACKLOG.md`, and deliberately **not** as a sound task: enemies interpenetrate on all 405 levels, which is the fidelity gap worth fixing; the sound falls out of it. Not in the active queue |
| ~~`Burning`~~ | `:6006` (flame), `:6261` (lava) | **fired (T80)** — measured from **both** sources, separately: the flame source on a `Flamethrower`+`Magic Bunny` level (no lava present), the lava source on an isolated `Lava Ball`+`Cannon` level (no flame equipped). Each is the only possible source on its level, so neither reading can be the other one |
| ~~`FlameThrower`~~ | `:3788` | **fired (T80)** — asserted on the flame-spawn path, so it re-fires every firing frame. It was *also* unreachable until T80 put `Flamethrower` in the sweep's equip list |
| `ImpactCrazyCheese` | **none** | permanent orphan — no AS3 trigger under any spelling; the audit's argument is exhaustive. **Never wire this.** |

**`Award1-3` closed in T74 and were never on the visible-values model** — the
scoping pass found `:1147-1163` is driven by `countTime` over `medalsForHp`, not
by either progress table. **The visible-values model now closes exactly one
name, `Unlock`**, and `Achievement` is adjacent to it rather than on it.

### The slider and its toggle are one control (T111) — decided, ported

**Decision: port it faithfully.** Muting zeroes the volume; unmuting restores
**full** volume, not the player's previous setting. The port-invented "muted but
volume remembered" state is gone, and so is "volume 0 with sound on".

**There is exactly one volume value in the original.** `SoundManager.soundVol`.
The AS3 never distinguishes a chosen volume from a current one, so "restore what
they had" is not a behaviour that exists to be preserved.

Two AS3 sites apply the rule, and the second is the one that unblocked this:

- **`ButtonToggleSound.as:43-52`** (`ButtonToggleMusic.as:43-52`) — the
  standalone toggle, **with no slider anywhere on screen**: flips `soundOn`, then
  writes `soundVol = 1` on / `0` off.
- **`ScreenOptions.as:233-256`** — per-frame reconciliation while Options is
  open: `:235-244` dragging sets `soundOn = (vol != 0)`; `:246-249` on-with-0
  jumps the slider to **1** and moves `sliderButton.x` to the bar's right end;
  `:251-254` off-with-volume forces **0** and the button to `x = 0`; `:256`
  assigns `soundVol = sliderValue` unconditionally. `:150-151` initialises each
  slider from the stored volume, so a saved 0.5 shows as 0.5 — it is destroyed by
  a mute round-trip, not by opening the screen.

**The T83 entry's stated blocker was factually wrong, and that is why this sat
open for so long.** It said adopting the rule "would do it from the HUD and main
menu, where `AudioToggles` renders with no slider visible — the original always
reconciled with the slider on screen." The original does no such thing:
`ButtonToggleSound` is exactly a sliderless toggle and couples identically. The
HUD and main-menu toggles are **not** port-invented UI needing a separate
decision; they have a direct AS3 counterpart. Recorded because the objection read
as a careful caveat and was never checked against the file it described.

**Where it lives.** `audioOptions.coupleAudioChange` is the change-time half
(the toggle's writes plus the dragging branch); `reconcileAudioOptions` is the
idle half (`:246-254`). The change-time rule is applied in
`soundService.setAudioOption`, which is the single point all four writers
converge on — the HUD toggles, the main menu's, the Options screen's, and the
sliders. Applying it at any one surface would have coupled that surface and left
the rest independent, which is the state this replaced.

**Migration is the AS3 rule, not a bespoke step.** Save data written under the
old model can hold `soundOn: true, soundVol: 0` — a silent game whose toggle
reads "on". `readAudioOptions` runs `reconcileAudioOptions` on the way out, which
resolves it to on-at-full: exactly what `:246-249` would have done the moment the
Options screen rendered. No version flag, and the rule that makes the state
unreachable is the same rule that repairs it.

**One consequence.** `SoundManager.handleLoops` gates on `soundOn` explicitly.
That gate was added in T83 *because* the port had dropped the AS3's
"`soundVol == 0` whenever off" invariant. The invariant is restored, so the gate
is now belt-and-braces rather than load-bearing. Kept deliberately — a loop
silenced two ways is not a defect, and removing it would be an unrelated risk
taken for tidiness.

### Flag art, and a placeholder audit (T116)

**The flag now draws its real sprite.** `ItemFlag` is symbol **1360**, which
places shape **1359** with `frameCount: 1` — there is no waving animation to
defer. `1359.svg` was already in `CURATED_SHAPES` and already on disk; it had
never been added to `UNIT_SHAPES` or wired, so the scene drew a cyan-tinted
`particle-dot`. Same shape as the T114 texture bug: synced is not loaded, and
loaded is not drawn.

Rendered at its **authored 33x33**, not at `FLAG_RADIUS * 2`. The radius is
pickup range; the two are separate quantities, which is the rule T85 set when
projectile art stopped being sized from `bulletRadius`.

**The muzzle flare: two passes, and the second one corrected the first.** Read
all of this before touching the flare — the reasoning that produced the wrong
answer is still persuasive on its own.

The report in T116 was that the flare draws at the tank's centre.
`PartGameArea.as:3962` puts it at `tank.x + cos(angle) * 10`, the port matched
that exactly, and T116 declined to change it. **T120 then moved it to the hull
edge** (`TANK_SIZES.body / 2 + 1.5`, 16 units) on the reasoning that the hull's
radius is 14.5 so a flare at 10 is inside the silhouette. **That was wrong.**
Every one of these barrels ends at **10.5** — the turret shapes' own bounds say
so — so 16 floated the flare clear of the gun. The reasoning never asked where
the barrel actually ends.

**T121 is the state to work from.** Two separate quantities, both now right:

- **Position** — `muzzleFlareOffset(weapon)` returns that weapon's
  `barrelReach`: 10.5 for eleven turrets, 11.3 for the Gummy Bear, 17.9 for the
  Magic Cannon (which fires no flare — the AS3's chain omits it). Read per
  weapon from `spriteGeometry.ts`, not a constant.
- **Anchor** — the flares' registration point is their flat **base** (local
  x = 0), and the port drew them centred, so half of every flare sat behind the
  muzzle. This, not the position, is what "buried in the tank" actually was.
  Fixed via `PARTICLE_ANCHORS`.

Driven, `npm run look -- --sprites`: Cannon 10.5 at 0 deg and -121 deg, Gummy
Bear 11.3 at 0 deg and -117 deg, anchor x = 0 on all four, flare rotation
tracking the turret each time.

**The turret itself was also being drawn wrong**, and had to be fixed for any of
the above to mean anything: `setDisplaySize(21, 21)` — square, centred — against
five turret shapes that are not square and a Magic Cannon pivoting 4.7 units off
its hinge. It now draws at authored size on its registration point. See "A
registration point is not a centre" in the audit; the same question has **not**
been asked of enemy, projectile or prop art.

**Photographing a flare needs `?flarehold=<frames>`.** Its lifetime is **2
frames**, about 33ms, and a CDP screenshot round-trip is nearer 200ms — three
orderings of poll-and-shoot were tried in T121 and each either missed the frame
or sampled more coarsely than the flare is long. The dev aid lengthens the flare
and changes nothing else; position and anchor have no time term. Two traps came
with it, both now handled in `look.mjs`: held flares outlive their shot, so the
harness **drains** between angles and reads the **newest** flare — a run that
read the head of the list measured the previous angle's flare and reported the
wrong bearing with complete confidence.

#### T117 — shield and warning wired, enemy bullets scoped

**Tank shield** — `TankShield` sprite 212 -> shapes **208-211**, at its authored
97.1. It replaced a cyan `particle-dot` at `radius * 4`.

**A third frame-control case, beyond the two pass (c) found.** Projectiles were
either "loops freely" or "pinned at spawn by `gotoAndStop`". This one **plays
once and stops itself**: `PartGameArea.as:1027` calls `gotoAndPlay(1)` when the
clip is added, and `:1033-1035` pins it the moment it arrives —
`if (currentFrame == 4) gotoAndStop(4)`. So 1 -> 4 at 30fps, then hold 4 for the
rest of the shield's life, and replay from 1 on the next raise because `:1024`
re-adds the clip.

The scene's `* 0.45` alpha multiplier is **gone**: `shieldAlpha` already is
`:1015`'s `timer / 120 * 0.9 + 0.1`, and the extra factor was damping a solid
disc that would otherwise have been opaque.

**Enemy spawn warning** — `WarningEnemy` sprite 376 -> shape **375**,
`frameCount: 1`, authored 75x75. `375.svg` had to be synced first.

**It caught the oversampled-raster trap on the way in.** `:1711` scaled the
marker with `setScale(warningScale(w) * 0.5)`, and `setScale` is relative to the
*texture* while `unit-375` is rasterised at `UNIT_RASTER_SCALE`. Swapping the
dot for real art therefore drew it at ~150 units instead of 75 — measured, not
guessed: the first run reported `width 149`. It is `setDisplaySize` now, and the
`* 0.5` went with the dot it was damping.

#### Enemy bullets — shipped (T118)

**The original does not use plain dots.** Six distinct classes, each its own
sprite, instantiated at `PartGameArea.as:6918-6964`:

| Class | AS3 | Sprite | Shapes | Frames |
|---|---|---|---|---|
| `EnemyBulletBasic` | `:6918` | 1175 | 1173, 1174 | 2 |
| `EnemyBulletBasicBoss` | `:6927` | 1166 | 1164, 1165 | 2 |
| `EnemyBulletTrap` | `:6936` | 1160 | 1159 | 1 |
| `EnemyBulletHook` | `:6945` | 1169 | 1167, 1168 | 2 |
| `EnemyBulletFollowing` | `:6955` | 1172 | 1170, 1171 | 2 |
| `EnemyBulletFollowingBoss` | `:6964` | 1163 | 1161, 1162 | 2 |

All eleven shapes are synced, in `UNIT_SHAPES`, and wired through
`enemies/enemyBulletArt.ts`. They replaced one red-tinted `particle-dot` shared
by all six classes.

**Frame 2 is the reflected round — a selection, not an animation.** `:6975`
pins `gotoAndStop(1)` at spawn for every non-Trap type, and the *only* other
frame call in the file is `:1600`'s `gotoAndStop(2)`, which fires beside
`:1601`'s `reflected = true`. Same shape as `BulletGummyBear`'s bounce stage.
`:1600` carries no class branch, so one rule covers all five two-frame clips;
`Trap` has a single frame and `:6976-6979` adds it without pinning anything.

**Facing is ported with it.** The bearing is written at spawn from the firing
enemy and rewritten on reflection (`:1595`), and the sprite is rotated to it
every frame — so a homing round (`:1522`) and a reflected one both face where
they are actually going. Sizes come from the authored SVGs, **not** `radius`:
the AS3's own values disagree (`Basic` is `radius = 4` against an 11px clip),
which is the rule T85 set for projectiles.

**Driven 4 of 6.** `Basic` `unit-1173`, `Following` `unit-1170`, `Hook`
`unit-1167`, `Trap` `unit-1159` — four distinct textures, untinted, each
rotated to its own bearing. **`BasicBoss` and `FollowingBoss` were not observed
in play**: `shootType` splits by rank, so they need a boss that shoots, and the
bosses on 1-27 and 9-9 spawn too late in their waves for the sampling window.
Their mappings are covered by `enemyBulletArt.test.ts` instead, which is a
weaker claim and is stated as one.

#### Placeholder audit — non-enemy, non-projectile

| Element | Currently draws | Real art | State |
|---|---|---|---|
| Flag item | `particle-dot` + cyan tint | `ItemFlag` 1360 -> shape **1359** (1 frame) | **fixed, T116** |
| Tank shield | dot + cyan tint | `TankShield` 212 -> **208-211** | **fixed, T117** — one-shot 1->4 intro, holds on 4 |
| Enemy spawn warning | dot + red tint | `WarningEnemy` 376 -> **375** | **fixed, T117** — synced, wired, and the `setScale` trap caught |
| Timed-bomb warning | `unit-370`/`unit-371` | `WarningTimedBomb` 372 -> 370, 371 | **already real** |
| Enemy bullets | dot + red tint | six `EnemyBullet*` sprites, 11 shapes | **fixed, T118** — frame 2 is the reflected round |
| Background props | `particle-dot` **only** when a key is missing | real prop art wired | fallback, not a placeholder |
| Particles | `particle-dot` when a shape is missing | real particle art wired | fallback; muzzle flare shapes 1108-1121 confirmed loaded |

All three are done — the flag in T116, the shield and warning in T117. **Enemy
bullets are the one remaining item**, and they are scoped above rather than
built.

### The turret was missing during the countdown (T115)

**Created, but never placed on the tank until the countdown ended.** Not hidden,
and not created late — the third of the three possibilities.

`PlayerTank` makes the turret a scene **sibling** rather than a child, so the
body's rotation cannot drag it round (`:113`). That means something has to
position it, and the only `tower.setPosition` lived inside `drive()` — which
sits inside `shouldRunDuringCountdown('tankDrive', …)`. So for the whole
countdown the body was at the spawn point and the turret was at the world
origin, constructed by `.sprite(0, 0, …)`.

**The AS3 has no such problem, and for two separate reasons.** `Tank.as:19`
creates the turret with the tank and `:63` `addChild`s it, so position is
inherited — every one of the 24 `tank.tower` references in `PartGameArea.as` is
a read of `.rotation`, and none is a write to `.x`/`.y`. And `:70-76` aims it
from the **tank clip's own `ENTER_FRAME`** (registered `:53`), gated on
`levelDone`/`gamePaused` only. The countdown holds `moveTank`
(`PartGameArea.as:2808`), never the turret.

So the fix is a timing one: `syncTurret` is split out of `drive` and called
every frame outside the countdown gate — next to the crosshair, which already
escapes it for the same stated reason. The turret also now starts at the tank's
position rather than `(0, 0)`. `aim` left `drive`'s signature with it, since the
turret was its only consumer.

Driven — `npm run look -- --turret`, two weapons because a hardcoded turret
would pass a one-weapon run:

| Weapon | During countdown | After GO! |
|---|---|---|
| Cannon | tank (400,300), turret (400,300), **gap 0.0**, `unit-6` | gap 0.0, `unit-6` |
| Laser Cannon | tank (400,300), turret (400,300), **gap 0.0**, `unit-14` | gap 0.0, `unit-14` |

Different texture keys, so the *equipped* weapon is what draws. The pre-fix gap
is **derived, not measured**: `sprite(0, 0, …)` with the sole `setPosition`
inside the gated `drive` puts it at `hypot(400, 300) = 500`.

### Hit enemies stayed darkened (T114) — one bug, not two

Reported as "enemies lose opacity **or** turn grey/washed-out after being hit".
**One root cause, and no alpha was involved.**

`Enemy` only tints its sprite at construction when the type has **no** real art
and falls back to `particle-dot` (`:436`). All twenty types have art
(`enemyArt.test.ts` pins it), so a real enemy starts **untinted**. The damage
flash's reset nevertheless restored `baseTint` **unconditionally**, so the first
hit permanently multiplied the artwork by a colour it never had. A mid-grey
particle colour (`EnemyGrey 0x9e9e9e`, `EnemyBlack 0x4a4a4a`) read as "turned
grey"; any darkening multiply read as "lost opacity".

**The AS3 reset is `uncolorClip` (`PartGameArea.as:2129`) — `new ColorTransform()`,
the identity**, called at `:4511` when `damageIndicator` hits 0. It restores the
clip's own colours and never applies a base colour. `:4516` is the flash itself:
red `0xFF0000` at `damageIndicator / 20 * 0.8`, ramping down over 20 frames.

The rule is now `enemyArt.restingTint` — `null` (clear) for real art, `baseTint`
for the fallback dot only.

**Not the bug, and deliberately untouched:** `ScaredGhost`'s alpha dip when hurt
is faithful (`enemyVisibility.hidesWhenHurt`, `:4832-4850`), as is the teleport
fade. `applyAlpha` remains the single alpha writer and damage does not reach it.

**Known divergence, pre-existing and out of scope:** the port flashes a flat 80ms
in one of four colours (red, plus Strength/Weakness/Immune tints) where the AS3
ramps red over 20 frames. That encodes the unported Strength/Weakness *particles*
as a colour and predates this fix.

Driven — `npm run look -- --hits`, and the A/B is the evidence:

| | Fixed | Bug reintroduced in a worktree |
|---|---|---|
| enemies left tinted | **0** | **1** |
| longest consecutive tint run | **2 samples (~50ms)** | **657 samples (~16s)** |
| resting tint | `0xff4444`, the transient flash | **`0x7ed957` = `PARTICLE_TINTS.EnemyGreen` = `baseTint`** |
| minimum alpha | **1.00** | **1.00** |

The alpha column is the answer to "one bug or two": it never moved in **either**
build, so the opacity complaint was the darkening multiply all along.

**Two instrument faults on the way, both of which reported a clean pass on a
broken build:** the sampler first aimed at the viewport centre and landed zero
hits in 400 samples (`L8` again), and `stuck` first counted *cumulative* tinted
samples, so an enemy under continuous fire — legitimately re-flashed — was
reported stuck on a correct build. It counts consecutive runs now.

### Frame timing, and the stutter that was not the wall bounce (T113)

A stutter report after T112 was investigated by profiling rather than by
reading. **Wall collision is not the cause, and there is no evidence of a
regression from it.**

`npm run look -- --frames` records `requestAnimationFrame` deltas, heap and a
CDP CPU profile; `--transitions` enters the same level repeatedly and reports a
window after each entry. Both take `LOOK_URL` to run against a **production**
build via `vite preview`, which is the only way to separate dev-server cost from
real cost.

| Measurement | Dev | Production |
|---|---|---|
| Steady play, 30-enemy arena, 120s | 1 frame >33ms in 7260, heap flat at 40MB | — |
| Boot (page load -> first entry) | 33 long frames, max 67ms, **798ms lost** | 37 long, max 50ms, **765ms lost** |
| Each level entry (2.5s window) | 1-3 long frames, max 33-50ms | 1-2 long, max 33ms |

**The findings, in order of what they rule out:**

1. **Not the wall bounce.** `bounceOffWalls`, `atWall` and `turnTowardsGoal`
   appear in **zero** CPU samples. ~98% of samples are `(program)` + `(idle)` —
   browser render and compositing — with the top JS entries Phaser internals at
   0.1-0.2%. GC is 0.1% and the heap is flat.
2. **Not enemy count.** Every long frame lands at **n = 0 enemies**.
3. **Not dev-only, and not one-time.** Transition cost is the same in a
   production build, and it does **not** diminish across four consecutive
   entries to the same level. It is also uniform across level size, mode and
   world (1-4 Normal, 1-7 Tower, 1-11 Defense, 3-9).
4. **The big cost is boot, ~800ms of dropped-frame time, and it is the same in
   production.** So it is not the dev server either.

**One instrument trap, and it inverted a conclusion.** Attaching the CDP
profiler distorts what it measures: the profiled entry read **217ms** where the
three unprofiled entries either side read **33ms**. An earlier draft of this
compared a *profiled* dev boot (233ms) against an *unprofiled* production one
(67ms) and concluded dev was 3.5x worse. Re-measured unprofiled, the two are
within noise of each other. `--transitions` therefore keeps profiling **off by
default** (`TRANS_PROFILE=1` opts in), and the note at the site says never to
compare a profiled number with an unprofiled one.

**What the transition cost appears to be** — stated weakly, because the only
profile of it is a contaminated one: the sampled work is `texImage2D`, React
`recursivelyTraversePassiveUnmountEffects` and `createWorkInProgress`, i.e. GPU
texture upload plus the HUD's React tree re-mounting on scene swap. No game
function appears. Pinning that properly needs a profiler that does not perturb
the thing it measures.

**Dev-only annoyance found in passing:** the diagnostics toggle
(`DiagnosticsPanel.tsx`, `:66` returns null in production) is laid out over the
HUD's Menu button and swallows its pointer events, so Menu cannot be clicked in
dev. Not a shipped defect; `--transitions` dispatches a DOM click to get past it.

### Source-shape tests — the four that kept breaking (T119)

Four tests broke on **legitimate** changes in four consecutive passes, each
because it asserted an expression in a source file rather than a behaviour:

| Test | Pinned | Broke on |
|---|---|---|
| `shieldWiring` | `.setAlpha(shieldAlpha(this.shield) * 0.45)` | T117 dropping an invented `* 0.45` |
| `towerMode` | the scene's `drive(input, aim, delta, ...)` text | T115 removing `aim` from the signature |
| `defenseMode` | four expressions around the wall gate | T112 (gate moved) **and** T113 (literal hoisted) |
| `enemyGrapple` | four literal lines incl. `let walled = stepped;` | T112 restructuring the wall branch |

All four are now behavioural:

- **`shieldWiring` — deleted.** `shield.test.ts` already walks the timer 200 -> 0
  and requires alpha to be monotonically non-increasing. The source check was
  pure duplication, so keeping it only meant two failures per change.
- **`towerMode` — the rule was extracted.** `PlayerTank.tankIsMobile(mode)`
  (`PartGameArea.as:2816`) replaces an inline `mode !== 'Tower'`, and the test
  calls it for Tower **and** for Normal/Flag/Boss/Defense/undefined.
- **`defenseMode` — driven on `bounceOffWalls`.** `skipBottom` leaves a floor
  contact untouched, the same state bounces without it, and the side walls still
  reflect under the flag.
- **`enemyGrapple` — driven.** A reel toward a tank *outside* the room, 200
  frames, asserting the enemy stays in bounds and settles at the corner.

**This was the four named, not a sweep. 124 source-shape assertions remain**
across ~48 test files. They are not all wrong — some guard wiring that genuinely
cannot be reached from a unit test — but the population is large and the failure
rate is now known. Whether to work through it is an open call, deliberately not
taken here.
### Enemy wall collision (T112) — every non-boss reflects, bosses turn

`PartGameArea.as:5370-5513`, inline in the enemy update loop's integration step.
**Separate from bullet wall-bounce and from the tank's bounds** — three
independent mechanisms; the port shares no code between them.

- **Non-boss: a true reflection off all four walls.** Clamp the coordinate,
  reverse the perpendicular velocity, and mirror the heading **only when it
  points into that wall**. Right `:5379-5398` and left `:5405-5434` mirror with
  `180 - r` / `-180 - r`; bottom `:5439-5468` and top `:5488-5513` with `-r`.
- **Boss (`enemyLevel == "B"`): never reflects.** All four branches set
  `rotateTowardsTank` instead, which turns **one degree per frame** toward the
  tank (`:5516-5530`), snapping when already within a degree. A boss grinds
  along a wall while swinging round to face the player.
- **Defense's bottom edge is the objective, not a wall** (`:5449`) — unchanged,
  and `crossesDefenseLine` still runs ahead of the bounce.

**The rotation basis is the thing to get right**: `0 = right, 90 = down,
-90 = up`, so a heading is `(cos r, sin r)`. Derived from the spawn edges
(`:3507`, `:3511`, `:3515`), not assumed. It is what makes `r > 0` mean "moving
down" and `-r` the horizontal mirror — **get it wrong and every guard inverts
while still looking plausible.**

**What was already there, and what was actually wrong.** `bounceOffSideWalls`
was a faithful port of the *side* walls since the Defense work, and
`clampToRoom` ran for everything. The defect was the **gate**: `Enemy.ts` applied
the bounce only when `mode === 'Defense'`, where the AS3 splits on
`enemyLevel != "B"` in every mode. So in Normal/Flag/Boss/Tower an enemy pinned
itself to a wall with its heading still pointing into it and peeled off a degree
at a time as steering re-aimed it — hugging, not bouncing. It was **documented as
a deliberate scope-down**, and the docstring predicted exactly this: "a latent
gap for whatever mode next stops re-steering".

**`turnTowardsGoal`'s `lockDirection` arm is ported but unreachable.** Its only
producer is the boss border AI at `:4642-4680` (a 200-unit band that locks a
boss's turn direction toward map centre), which is **unported**. Production
always passes `'None'`. Driven in tests for all three values so a later pass
inherits a pinned rule — but its presence is not evidence the border AI exists.

**Pass (a) landed in T123** — `enemies/enemySeparation.ts`, the pair rule as
pure functions with 27 tests and **no caller**. Knip lists it under
`Unused files (1)`; that is the expected state until pass (c).

**One scoping claim was wrong and the tests caught it.** The scope said the
ordered-pair loop visits every pair twice. It does — but the *broad phase* at
`:2354` treats enemy centres as rect corners and pads only in `+x`/`+y`, so it
is **direction-dependent**: when the subject is larger than the other body, a
genuine overlap can be invisible to one of the two orderings. Swept over
241,816 overlapping configurations (radii 5..60, offsets +-120): **17.2% are
seen by exactly one ordering, and 0% by neither**. The zero is what keeps this
from being a dropped collision, and it is now a test rather than a claim.
Consequences for pass (c): a boss pair always resolves (the surviving visit
writes *both* bodies' `pushVel`), while a mismatched normal pair is nudged on
one side only — the **smaller** body's.

**Pass (b) landed in T124** — `pushVel` on `Enemy`, threaded through
`bounceOffWalls` and `clampToRoom`, decayed in the AS3's order (after the pair
loop, before integration). **Still no producer**, so nothing moved: the 48
existing wall and steering tests pass with **zero deletions**, which the diff
shows directly — `enemyWalls.test.ts` is +222/-0 and `enemySteering.test.ts` is
untouched.

**The `-y` branch differs in three ways, not the one the scope found.** Written
out as a table in `applyPush`: `:5488` omits the push from its predicate, omits
it from its bounds test, **and never clears it on contact** — the other three
branches all do `pushVel = 0` when they snap. Two visible consequences, both
pinned: an enemy shoved up keeps its push after touching the top wall, and the
`-y` arm can carry one *past* the top bound (the AS3 leaves it there; this
port's positional reflection pulls it back, which is the port's net and not the
original's).

**And the gate has teeth.** An enemy drifting down while shoved up harder than
it drifts satisfies neither y predicate, so it does not move vertically at all
that frame — not by the push, not by the velocity it already had. A symmetric
implementation moves it up instead and looks more correct. That case is what
`steppedBy` exists for: this port integrates before the walls run, so expressing
"no movement at all" means handing back the step to undo.

**Pass (c) landed in T125 — the loop is wired and enemies separate.** The pair
resolution sits inside the per-enemy iteration, immediately before
`enemy.update`, because the AS3 nests it there: pairs for enemy *i*, then the
decay at `:5365`, then the integration at `:5370`. Hoisting it into a global
pass would change the result, since the normal-vs-normal branch writes position
immediately and later pairs are supposed to see the moved body.
`safetyDistance` is rolled once at spawn from `Math.random`.

**Three instrument faults in one session, all of them mine, all caught by
disbelieving a clean number:**

1. **The scenario measured nothing.** A stationary tank on the busiest level in
   the game (7-32, 58 enemies) gave *0% overlapping and a worst ratio of 9.7* —
   no two enemies ever came within nine times their combined radii. Enemies
   converging on a still target arrive one at a time and die on contact, so no
   crowd forms. Four runs agreed with each other and all four were worthless.
2. **The tutorial gate ate the window.** Moving the `d` keydown to after the
   mouse press stopped the Move step clearing, so spawning began after the
   sampling window and two runs reported *0 populated samples*.
3. **The aggregate moved the wrong way** on the first controlled run — 0.8% ->
   1.1% overlapping — with no way to tell "wired and weak" from "not wired". A
   per-frame applied-effect counter settled it in one run: **0 effects with the
   flag off, 121 with it on.** Reachability and effect size are different
   claims and the second is worthless without the first.

**Defense levels are where this is observable** (8-4), not Normal ones: enemies
march in formation and coexist, where a chase kills them one at a time. Tower is
worse still — 1-7 gave 2 enemies and a worst ratio of 35.

**Cost is not a problem and was measured, not assumed.** `--frames` on 7-32:
mean 17.2ms, p50 16.7, p95 16.8, p99 33.4, heap flat at 10MB across 25s. Every
long frame landed at **n=0 enemies** — level entry, the T113 transition cost —
not in the crowd. Peak concurrency observed is 18, so the O(n^2) is ~300 pair
tests a frame behind a two-comparison broad phase.

**Pass (d) landed in T126 — the subsystem is complete.** `BossCollision` fires
from the boss-on-boss branch, gated exactly as `:5195-5198` gates it.

**The margin is not the one the port had.** `onScreenGate.ts` carried a single
`SOUND_HEARING_MARGIN = 100` and its own docstring listed `:5197 BossCollision`
among the sites using it. Only two `distanceAdd` assignments exist in
`PartGameArea.as` — `:6900` at 100 and **`:5194` at 200** — so boss collisions
are heard from twice as far out as anything else. The margin is now a parameter
with the common value as its default, and both constants are pinned against the
source. Two further things are specific to this site: it tests the **contact
point** on the other body's rim rather than either centre, and it carries **no
width term**, unlike every `checkWithinScreen` call.

**A natural boss collision can only ever drive one side of the gate.** All 25
two-boss levels converge their enemies on the tank, so bosses meet next to the
tank and are always on screen. `?bosspair=x,y` drops the first two live bosses
on top of each other at a chosen point; nothing else about them changes.

**And where the tank stands decides whether "off screen" is even reachable.**
The camera clamps inside the room, so in 3-9's 900x720 arena a 640x400 camera
leaves 260 units of horizontal slack against a 200 margin. Parked mid-room, the
far corner came out **140 units outside the rect — inside the margin**, and the
gate correctly called it audible. Driving the tank into the opposite corner
first pins the camera at (0,0) and puts the same corner 304 units out. The first
run of this looked like a failed gate and was a badly chosen viewpoint.

**For whoever ports enemy-enemy separation:** the AS3 tests `xVel + pushVelX`
against the wall. `pushVel` has **0 occurrences in `src/`** against 21 in the
AS3, so the term is identically zero and the rule reads `xVel` alone today. When
separation lands, **do not make the four branches symmetric** — `:5488` gates on
`yVel < 0` alone and omits `pushVelY` from its predicate while still adding it to
the position at `:5493`. That asymmetry is in the original. The note is at the
site in `enemySteering.ts`.

### PartInfoText — CLOSED (T104)

The hover panel. `src/game/ui/infoTextPlacement.ts` is the geometry,
`infoTextState.ts` the per-frame keep-alive, `infoTextSites.ts` the table of all
20 AS3 call sites, and `src/ui/InfoText.tsx` the single mounted panel. Driven by
`npm run look -- --tooltips`, which measures the panel's box against the cursor
rather than asserting the node exists.

**`infoTextSites.ts` reads 9 wired / 4 redundant / 7 no-consumer / 0 deferred =
20.** Nothing waits on unbuilt work; what remains is held by decisions already
made. That table carries the per-row verdict and is the thing to read rather
than a summary adjective.

| Step | Landed | What it wired |
|---|---|---|
| **1 — core + Achievement rich text** | T99 | Shop rows and achievement cells. The "16 sites" it was scoped as is **2** — see the audit's "reachable surface" entry |
| **2 — `EnemyStrengthsWeaknesses`** | T100 | `IconStrongWeak.as:48`, the bestiary's badges. `ImageEnemy.as:174`/`:178` are the *tooltip* variant and are `no-consumer` — see below |
| **3 — `AllEnemiesInLevel`** | T101 | `ButtonNextLevel.as:208`, the Next Level button on the results overlay |
| **4 — Level Guide's 4 sites** | T102 | All four, on the Level Guide's own widget |
| **`Achievement.as:103`** | T104 | The achievement reveal page's icon, with its tooltip |

**What closed it was a wiring and a reclassification, in that order:**

- **`Achievement.as:103` wired (T104)** — **built for completeness despite
  duplicating the page text**: the AS3 page shows the title only
  (`ScreenStatus.as:971`), so there the tooltip is the only way to read the
  description; this port already renders it. Recorded at the component and in
  the site table so it is not "cleaned up" later as an oversight. 36 icon clips
  / 76 shapes synced, derived from the `[Embed]` lines rather than hand-listed.
- **`ImageEnemy.as:174`/`:178` reclassified `deferred` -> `no-consumer`.** They
  need per-enemy tiles in a *selected-level* panel and this port has no
  selection step (`A8`). The blocker is a decision, not unbuilt work, and the
  status now says so.

**One AS3 branch stays unported, and closing the item does not close it:**
`addStrengthsAndWeaknessIcons`' `"Normal"` mode (`:446-453`), the full-size
badges the panel draws for `EnemyStrengthsWeaknesses`. Its consumer `ImageEnemy`
lives on the level-select enemy roster `A8` decided against building, so it
waits on that decision rather than on effort. Named here because a bare "closed"
would hide it.

**A fidelity fix fell out of sharing the composition.** T99's achievement
tooltip added a difficulty note only when *earned* and wrote it `(Medium)`.
`Achievement.as:60-80` always emits one — `(Difficulty doesn't matter.)`,
`(Difficulty matters.)` or `(Completed on EASY/MEDIUM/HARD.)`. Both screens now
use `achievementTooltip`, so the board's text is corrected as a side effect.

**Step 2 split into two halves that the brief treated as one.** The task was
scoped as "wire `addStrengthsAndWeaknessIcons`, lands on the Enemies screen".
Reading the source first (rule 1) found three corrections, and they change what
shipped:

- **The screen is the Bestiary.** `BestiaryScreen.tsx` is the port of
  `ScreenEnemies.as` — its own docstring says so. `EnemiesScreen.tsx` is a
  port-progress dev board with no AS3 counterpart. Wiring badges into it would
  have been the "add a second element instead of finding the first" mistake.
- **Two icon classes, not one, and they are not interchangeable.**
  `IconStrongWeak2` (1018) is used *only* by `PartInfoText.addStrengthsAndWeaknessIcons`
  (`:404`, `:456`); `IconStrongWeak` (1033) is used by `ScreenEnemies` ×4 and
  `ScreenStatus` ×4, placed inline with its own tooltip. The badge artwork
  differs on 6 of the 16 glyphs.
- **`addStrengthsAndWeaknessIcons` has no live consumer, and the inline icons
  do.** Its `"Normal"` caller is the panel's `EnemyStrengthsWeaknesses` type,
  reached only from `ImageEnemy`, which appears only at `ScreenLevelSelect.as:1128` —
  a per-level enemy roster this port has not built. So the shared rule
  (`resistanceIcons.ts`) is ported and driven through the bestiary; the panel
  variant waits for its screen rather than being built for nobody.

Both clips' shapes are synced regardless, which is the precedent the projectile
pass set: the six shapes unique to the undrawn clip are present **by intent**,
and `resistanceIcons.test.ts` pins that set exactly so "unused" and "missing"
cannot be confused.

**One finding this pass turned up and did not act on, because it is a different
subsystem.** `ButtonUpgradeInfo.as:33` pushes `InterfaceButtonOver1` when the
cursor enters a shop row — the AS3 plays a sound on row hover. This port's rows
are `<li>`s and make no sound; only the Buy button inside them is audible. That
is a gap in the *button sound* coverage, not in the tooltip, and widening T99 to
cover it would have been scope creep. `buttonSounds.test.ts` now excludes
`role="tooltip"` explicitly, with the AS3 line saying why the panel itself is
correctly silent.

### Boss life indicator (T106) — a faithful port, in-combat only

A red disc under each boss on a Boss level, revealed as a pie wedge growing
clockwise from 12 o'clock as it loses health — `PartInterface.handleLifeIndicators`
(`:872-995`), called at `:1068`.

- The wedge is a **mask** over the real `RedCircle` art (symbol 1200 -> shape
  1199), as `:926` does it, so the artwork is the original's — a black-to-red
  radial gradient at 50% alpha — and only the reveal is computed.
- `degree = 360 * (1 - hp / total)` (`:972`), swept 270 deg clockwise
  (`:977-983`), closed to the centre. Clamped for overheal and overkill, which
  the AS3 does not do and this port can reach (`enemyHealing.ts`).
- The denominator is **read, not recomputed**: `:971`'s
  `round(stat * multiplier / bossAmount)` with the multiplier forced to 1 for
  bosses is already `resolveEnemyStats` (`enemyStats.ts:87`, `:91-95`), so the
  number is on the enemy as `maxHealth`. Recomputing would be a second copy of
  a rule this port has once.
- Layer depth 8.5 — directly above enemies (8), matching
  `PartGameArea.as:329`'s `bossHealthLayer`.
- **Not built, and confirmed to have no AS3 basis:** a roster-icon version, and
  opacity dimming at low HP. The AS3's alpha rules (`:937-948`) key on
  `invisible`/`teleporting` only and were left untouched.

`ShrinkingB` (`:966-969`) needs a live radius; `Enemy.radius` is the mutable
field `enemyBodies` writes, so the disc reads it every frame for **every** boss
rather than special-casing one type.

Driven — `npm run look -- --boss-life`: 1-9, five samples at 100/78/59/40/18%
HP giving 0/78/147/216/294 degrees. The harness kites away from the boss,
because a stationary tank dies in ~16s and the first run got two samples.

**It shipped invisible-broken and was fixed in T108.** `unit-1199` was synced to
disk but never added to `UNIT_SHAPES`, so the mask revealed Phaser's
`__MISSING` texture — black with green lines — instead of the `RedCircle` art.
The geometry was correct throughout and all 17 tests passed against the broken
build. Trap 15 and the audit carry the full account; the short version is that
**T106's driven run logged five correct numbers and nobody opened the frames.**

`--walls` (added T112) drives 1-4 Normal, 1-9 Boss and 1-7 Tower and classifies
every on-wall sample by how far the heading moved in it: a **mirror** (>30 deg in
one sample) is a reflection, a **gradual turn** is a boss's one-degree swing or
ordinary steering. Frames are captured **on detection** rather than on a timer —
see trap 16.

`--boss-life --shrink` (added T108) retargets at **3-9**, whose boss row is
`Shrinking` — the only type in `enemyBodies.SHRINKS`, so the only one whose
radius, and therefore the disc's size, moves every frame. Driven: radius
55.5 -> 48.1 -> 41.0 -> 33.3 as HP falls 750 -> 300, against 1-9's `Basic` boss
holding **40.5 at every sample**. The two together are the counterpart pin —
one boss shrinks, one does not, and the disc follows each.

### Boss art in roster previews — intentional (`A9`)

A boss row in any roster preview draws the **boss** clip. The AS3 draws the
ordinary enemy's art there: `PartInfoText.as:249` strips the level character
before `:271` builds `Enemy<type>`, and `ImageEnemy.as:57-145` has no boss
branch. **Kept by decision** — a Boss level whose boss row looks identical to
its ordinary rows buries the one fact the preview exists to convey.

Filed as `A9` because it looks like a slip: follow `:249` and the port's
`enemyShape(enemy.type, isBoss)` reads as a forgotten strip. It was found in
T104's scoping, checked against both AS3 sites, and kept. The assertion in
`levelPreview.test.ts` carries the same warning, since that is where someone
would stand while "fixing" it.

### Level-grid roster preview (T103) — a port addition, not a port of `ImageEnemy`

Hovering a level cell on level select shows that level's summary and enemy
roster, through `previewForLevel` — the same `PartInfoText` `"AllEnemiesInLevel"`
model (`:222-294`) the next-level button and the level guide's info icon use.

**What is and is not ported, because this is easy to miscount:**

- **Ported:** the panel's content. Summary lines from `ButtonNextLevel.as:335`,
  rows from the `AllEnemiesInLevel` branch. Unchanged.
- **Not ported:** the trigger. The AS3 shows a roster in a **selected-level**
  detail panel built from `ImageEnemy` tiles (`ScreenLevelSelect.addEnemyImages`,
  `:1112-1160`, gated at `:1197` on `!isLocked`). This port has no selection
  step — divergence `A8` — so the same information is offered on hover instead.

**It does not unblock `ImageEnemy.as:174`/`:178`.** Those need per-*enemy* hover
targets, which only exist if the tiles are rendered. They stay `no-consumer`,
and this must not be counted as closing them. `BackgroundEnemyImage`'s three
shapes are synced and drawn by nothing; `levelSelectTiles.test.ts` asserts that
so it does not read as an oversight.

Driven — `npm run look -- --grid-preview`: clears 1-1 to get a second unlocked
cell (a fresh profile has one, so the staleness check would have nothing to
compare), then hovers each and requires the panel to follow the cursor. Locked
cells show no panel.

### Level Guide — shipped (T102), with one half deliberately not built

A compact widget on the **shop** screen (`ScreenUpgrades.as:324`, `:631-634`),
not on level select and not a carousel: `World N` / `Level M`, four arrows,
three presets, an info tooltip and an auto-select toggle. It points at the
level you are heading into, which is what the shop's spending decisions depend
on.

| Pass | State |
|---|---|
| (a) state model | Done. Pure, read-only, on the **earned** table |
| (b) art | Done. 7 clips / 30 shapes, derived, no extraction pass |
| (c) widget | Done, on the shop screen |
| (d) 4 `PartInfoText` sites | Done, in the widget's own markup |
| (e) level-select coupling | **CLOSED BY DECISION — divergence `A8`.** Not pending, not owed |

**Level Guide is fully closed.** (a)-(d) shipped; (e) is a decision, in the same
category as `L5`, `BossCollision` and the modal dialogs — a call that was made
with reasoning, not an item waiting for someone.

**The decision.** `selectFromLevelGuide` (`ScreenLevelSelect.as:584-596`) and its
latch `canSelectFromLevelGuide` are deliberately not reproduced. The AS3's level
select is world -> grid -> **select** -> Play, with `selectedLevel` as persistent
highlight state; that function pre-highlights the guide's level so the player can
go straight to Play. **This port's click-to-start is an intentional divergence,
not a missing step**: a cell click emits `ui:start-game` directly, and there is no
`selectedLevel`, no highlight and no Play button on the grid.

So porting it would not fill a gap in the port's interaction model — it would mean
**building a UI step that contradicts it**: a highlight, a confirm control, and a
second route into a level beside the one that already works. That is a UX change
to a settled screen, and it would make the screen worse in order to make an unused
pointer visible. Full write-up and what is lost: divergence `A8`.

**Two fragments would become portable if the interaction model ever changes**,
named so they are not re-derived: opening the grid on the guide's world
(`SaveManager.as:1463`), and writing a manual pick back into the guide when
auto-select is off (`ScreenLevelSelect.as:988`, `:1326`). Neither is worth
building alone today.

### Closed since the previous stamp

Kept as a short list rather than struck-through rows, so the queue above is only
things that are actually open.

- **`Objective` panel overlaps the HUD** — done (T63). **The entry's diagnosis
  was wrong on both counts**: the panel already used the live viewport (rule 7
  was applied in T51), and the AS3 *did* have a HUD in that region — a 400..480
  interface strip (`PartInterface.as:232`). It cleared the weapon widgets on
  **x** (`bgWeapon.x = 388` vs the panel's 194..354), which a full-width DOM HUD
  row makes impossible. The real defect was structural, not a frozen constant.
  Recorded as divergence **A5**.
- **`D1` — PM_PRNG** — **never open at this point; this file had drifted.** The
  audit's D1 entry already read `DECIDED — Option A`, and the code implements
  it: `backgroundProps.ts:8-10` calls itself "the first production reader of
  `LevelSpec.seed`, and the reason D1 was decided", seeds
  `new PM_PRNG(input.seed)` (`:286`, `:579`, `:587`), and is consumed at
  `GameplayScene.ts:138`. The collision pass is ported too
  (`resolveCollisions:539`, from `:2603-2664`) and props render. **Nothing is
  owed and no call is needed** — the audit was right and only §5 was stale.
- **`G`/`I2` — the visible-values model** — built T76, **entry closed T81**, and
  the recorded scope was wrong in the same way `BossCollision`'s was. It was
  filed as *"one model change, two consumers"*. There is only ever **one**
  consumer: the medal counts. The unlock gates deliberately stay on the **earned**
  table (**A6**) because `GameplayScene.ts:980` starts `ui:start-game` with no
  unlock check, so a lagging gate would let the results screen's Next-level
  button start a level `LevelSelectScene` refuses. What actually remained was
  three stale comments, the worst of them `LevelSelectScene.ts:217` claiming
  *"one medal per AS3 frame"* — the exact misreading `progressReveal.ts:38-43`
  exists to correct. **A comment that teaches a corrected error is worse than no
  comment**, and it survived because the correction was written in a new file
  instead of at the old claim.
- **`L6` — the generated `ScreenGame` prose** — done (T81). Filed as a
  self-contradiction; the fault was **misattribution**. Wave spawning was never
  `ScreenGame`'s (6 case-insensitive `spawn` hits, all four identifiers statics,
  against `PartGameArea`'s 109), and fixing it exposed a second inverted number:
  **107 of its 131 statics are extracted, 24 remain**, not the "~90 remaining"
  the block claimed. Fixed at `gen-progress.mjs`, since a hand edit to
  `PROGRESS.md` is reverted by regeneration and fails the gate.
- **`L7(a)` — 11 mis-recorded class statuses** — done (T81). **5 flipped, 6 left
  standing with reasons.** The reusable part: **a `Port target:` header declares
  intent, not completion.** Four of the six were cited only that way, and
  `LoadingScreen.tsx:5` says plainly it names the boot stage *"rather than
  showing an anonymous spinner"* — so `LoadingRing`/`Ball`/`Glow` are
  deliberately unported, and flipping them would have been false. `L7(b)`
  remains open — see the queue.
- **`L5` + `L7(b)` — the metric definition** — **decided T82: no change.** Closed
  as a settled judgment call, not as work done. The stub rule and the **556**
  denominator stay. Both alternatives were measured first — a naive `[Embed(`
  test (517 files, but **46 of them real classes** up to 547 lines, so it would
  exclude live UI from the metric forever) and a shape-based stub test (**471**
  true stubs → ~85 denominator, ~39%). The reason for keeping the current one is
  about timing, not correctness: **switching would move the headline number with
  no new porting behind it**, and a metric that jumps for definitional reasons
  stops reading as progress. `L7(b)` was the other half of the same decision —
  it grows the numerator where `L5` shrinks the denominator — so it is deferred
  with it rather than landed alone. Accepted cost: **Sound stays `0/115`
  permanently**, since those rows are `[Embed]` MP3 wrappers nobody will write.
  The entry's own *"~557 → ~353"* was wrong and reconciles with nothing; do not
  reuse it. Full rationale and the measurement table in `BACKLOG.md`. **Revisit
  only by reopening the definition deliberately.**
- **Volume sliders** — shipped (T83). `SliderObject.as` is a **continuous** 0..1
  with no step or snap (`:58`), clamped at both ends (`:48`, `:53`); the only
  `Math.round` in the class is on the *button's pixel x* (`:36`), not the value,
  so `step="any"` is the faithful spelling and any tidy 0.05 step would be wrong.
  Wired through the existing `ui:set-audio` → `setAudioOption` → `audio:options`
  path, so the control shows what the engine holds. **Scoping it found a live
  defect** — see the next entry. The toggle coupling was left unported here and
  **was ported in T111** — see *The slider and its toggle are one control*.
- **Mute did not silence the Flamethrower/Burning loops** — fixed (T83).
  `handleLoops` scaled by `soundVol` and never consulted `soundOn`. The AS3 needs
  no such check because `ScreenOptions.as:251-254` forces `soundVol = 0` when
  sound is off — **an invariant this port dropped when it made the two fields
  independent**, so the transcribed expression lost a guarantee that was never
  written down. Latent until T80 gave the loops their first callers. This is the
  "a guarantee is only worth what enforces it" rule arriving from a new
  direction: the enforcement lived in the *original's UI*, not in its audio code.
- **Modal dialogs** — **scoped and declined (T83), no code written.** The four
  classes are two unrelated things, and neither is owed. `ButtonConfirm`/
  `ButtonCancel` serve only `ButtonGameSave`'s slot-delete prompt, which the port
  **already implements in-row** (`SaveSlotScreen.tsx:56-79`, citing `makePage2`
  `:373`) — a modal would have duplicated a confirmation path *and* been less
  faithful. `WindowOk` is a one-button **notice**, not a confirm dialog: its
  "Choose Difficulty" type is already handled as a picker highlight, and its
  "Upgrade Limit" type was blocked on an unported mechanic — and that mechanic
  is now **closed by decision (T122, divergence `A11`)**: full upgrades apply on
  every level, so there is no cap to announce and the notice is not owed. The
  number is no longer printed in the preview panel either.
- **`LevelSpec.tier` was `upgradeLimit` all along** — renamed (T83). Found while
  scoping the above. `levelDataModel` column 7 was extracted as *"difficulty tier
  1-10, scales enemy stats"*; both AS3 reads name it `selectedUpgradeLimit`
  (`ScreenGame.as:365`, `ScreenLevelSelect.as:1203`), no read anywhere calls it a
  tier, and its range across all 405 rows is exactly 1..10 — `MAX_UPGRADE_LEVEL`.
  **No live bug, because nothing consumed it** (checked exhaustively: all 50
  `tier` hits in `src/` are enemy tiers or medal tiers). The hazard was the
  docstring *inviting* a wrong wiring — enemy-stat scaling by a number that means
  an upgrade cap. An inert field with a confident wrong name is the quiet version
  of the `enemyModel[1]` trap.
- **Projectile art, pass (a) — the sprite→shape mapping** — landed (T84), no
  visual change. **The art was never missing**: `symbolN` in an `[Embed]` is a
  **sprite** id and JPEXS keys its SVGs by **shape** id, so `shapes/251.svg`
  not existing was read as "BulletRocket has no art" when sprite 251 simply
  places shape 250. All 43 shapes the 26 projectile classes need were already
  extracted. **This is trap-family "a failed lookup is not absence"**, and I
  made it myself in the T83 audit — the fix was to check the two things I had
  not: that `assets.swf` ships in the repo, and that it is uncompressed and
  therefore walkable by script. `scripts/gen-sprite-shapes.mjs` now emits the
  mapping; `sync-assets.mjs` derives its curated ids from it rather than
  hand-listing them. Passes (b) rendering and (c) animation are **not started**
  — see `BACKLOG.md` M4, including the one real decision in (c).
- **Projectile art, pass (b) — rendering** — landed (T85). Every weapon draws
  its own art; the shared `particle-dot` circle and the blanket
  `setTint(0xffe9a8)` are gone from the projectile path. **The size question was
  measured, not assumed, and the measurement changed the design**: shape 215's
  four sharers are told apart *only* by a non-uniform placement matrix (Cannon
  0.5×1.333, Big Cannon 0.75×2), which the port's uniform `radius * 4` square
  structurally could not express — it drew three of the four identically. Sizes
  now come from the SWF's authored dimensions × that matrix; the collision
  radius is untouched, as the two were always separate quantities. The three
  grenades render as three distinct shapes, closing the infidelity pass (a)
  found. Pass (c) animation is **not started** — `BACKLOG.md` M4.
- **Trap: an oversampled texture plus `setScale`** — hit again in T85 and caught
  before it shipped. `manifest.ts` already warns that a raster oversampled 4×
  must be divided at the draw, and that it *"shipped wrong for one pass"* in the
  particle code. The flame's growth used `setScale`, which is relative to the
  **texture**, so a 4× raster would have drawn flames four times too large. The
  fix is to stay absolute — `setDisplaySize(authored × scale)` — which is
  resolution-independent, so changing the raster scale moves nothing.
- **Projectile art, pass (c) — partly landed (T87).** **Only 3 of the 7
  multi-shape classes animate.** Two checks agree: no sprite carries a `stop()`
  frame action, so a clip loops unless the AS3 pins it — and `BulletFire`,
  `BulletGummyBear` and both ground hazards are pinned with `gotoAndStop`
  (`:3798`, `:3828`, `:1806`). Those four are wired as **selection**, not
  animation; animating them would have invented motion. `BulletGummyBear` was
  checked first because a green→yellow→red bullet that hits identically would
  mislead: the AS3 scales damage x1/x3/x4 by bounce stage and **the port already
  had the mechanic** — this closed a visual-only gap. `BulletBomb` + `ObjectMine`
  (two-layer composites) and `BulletLaser` (drawn as a line primitive, not a
  sprite) are deferred — `BACKLOG.md` M4.
- **Projectiles did not face their heading** — fixed (T88). Reported against the
  Gummy Bear; it was missing for **every** bullet. **Nothing was broken — it was
  never wired**, and it could not be seen until T85 gave rounds directional art:
  a circle looks identical at every angle. Worth separating from "T85 broke it".
  The model side was already complete — `BulletState.rotation`, and `reflect`
  (`bulletBounce.ts:131`) computing the post-bounce heading for all three edges —
  so this was two `setAngle` calls, matching `:3907` (spawn) and `:2012` (after a
  bounce, applied outside the per-class branches so it covers every bouncing
  round). Applied every frame from the state rather than on the bounce event, so
  a homing round that re-aims mid-flight (`:1750`) follows too. The Flamethrower
  keeps its `:3949` random draw angle, which is deliberately *not* its travel
  direction — wiring the general rule without that exception would have made
  flame puffs all point the same way.
- **Shop stat previews, extraction (A(a))** — landed (T90), no UI change.
  **The filed description was wrong in three of four claims**: there are no
  "descriptions" in `ScreenUpgrades.as` at all (the shop computes *stat
  previews* inline), the data was never absent (they read the same tracks
  `upgradeData.ts` already holds), and the block is 158 assignments over ~815
  lines rather than "small". It was also filed under **J**, a closed group;
  re-filed as **M2**. Hand-verification found three defects a
  plausible-looking parser had — measure-then-set scaffolding read as a display
  line, an unmodelled `[level+1]` index form, and category defaults misread as
  missing upgrades. All 21 labels are pinned against the AS3 line each was read
  from. Render half (A(b)) **not started**.
- **Shop stat previews, render (A(b))** — landed (T91); **M2 closed**. The shop
  now shows each upgrade's stats and what the next level would give. **Two
  off-by-ones were caught by computing the expected strings by hand** rather
  than from a run: the port's stat tracks sit one lower than the AS3's (prices
  occupy index 0 there), so `"Damage:"` was reading the explosion track and
  printing 30 for a 7-damage Cannon; and `unitUnowned` was dead code, detected
  via an index form only the misc section uses, so it claimed to carry a quirk
  it never carried. One divergence recorded, not corrected: `:1445` labels the
  Shield's duration `" HP"` when unowned.
- **UI redesign** — landed T92-T96. Two things were bundled in the request and
  they were independent: a **functional defect** (shop weapons unreachable) and a
  **visual redesign**. The defect was `justify-content: center` on `.screen`
  stranding content above an unreachable scroll origin — **six screens, not the
  one reported** — and it was fixed first, alone. The redesign then went
  bg `#12161f` → `#F0EEE6` warm-neutral, accent gold → clay `#CC785C`.
  **Colour now has exactly one home** (`:root` in `global.css`); it previously
  had three families the audit's grep missed one by one — 24 hex literals, 34
  `rgb(255 255 255 / N%)` alphas, and 19 arbitrary-channel semantic tints. The
  recurring fault across all of them was `opacity` used as a disabled state,
  which dims on dark and disappears on bone. **Canvas colours are deliberately
  untouched**: the 33 `0x......` values in `src/game` are world art, not chrome.

  **Two things are deliberately still open, and neither is a loose end:**

  - **Phone-viewport horizontal overflow.** At 390px the shop rows clip weapon
    names on the left and Buy buttons on the right — the same "cannot buy it"
    symptom as the defect above, on the other axis. Deferred on the standing
    desktop-first rule in `CLAUDE.md`, not because it is small.
  - **The 640x400 backdrop patch is still undiagnosed** and is unrelated to any
    of this. My T83 guess that it was a frozen stage constant was **wrong**:
    `MainMenuScene.ts:45-49` sizes the backdrop from live camera values and
    `:222` resizes it. It needs a live measurement of `camera.width`/`zoom` at
    the moment of a frame, not a third guess from reading. Mostly moot on menus
    now that screens are opaque, but it will still show wherever the canvas is
    visible.

  One deviation from the approved spec, flagged when it was made: the type scale
  gained two steps **below** the agreed 0.75rem floor. 28 sites sat under it —
  pips, meters, HUD counters — and snapping them up by as much as 36% would have
  re-created the overflow T92 had just removed.
- **Projectile art — fully closed (T84-T87, T98).** The last piece was the two
  clips that draw **two shapes at once**: `BulletBomb` (static body under a
  16-frame ping-pong) and `ObjectMine` (body with a second shape over it for half
  a 30-frame blink). Both now carry a companion sprite,
  `entities/ProjectileOverlay.ts`. Neither is tied to game state — the bomb's
  frames are **not** a fuse countdown (that is a separate `WarningTimedBomb`
  indicator, already wired) and the mine's blink is a plain idle loop, since the
  AS3 has no frame control for a mine anywhere. **41 textures preloaded, zero
  orphans**, pinned by a test. `BulletLaser` stays **declined**: the port draws
  the beam as a line primitive, so there is no layer to animate and the current
  rendering is faithful in effect.
- **`L4`** — fixed structurally (T64), not written down harder. See trap 10.
- **The countdown's presentation** — landed (T68). The panel (`:303-308`), the
  digit steps, the fade-and-slide (`:713-721`, 20 frames and 30, all four
  objects moving the same -168), and both beeps. Driven: digits at
  `3@0ms 2@585 1@1186 GO!@1783` measured from the first digit — the AS3's
  600 ms spacing — with `CountDownBeep1 x3, CountDownBeep2 x1` and the panel
  confirmed faded. **A frame caught what the log could not**: the red objective
  line overflowed the panel's bottom edge while the digit sequence logged
  perfectly. The reload-bar half of `:750-752` is not ported — see the queue.
- **The pre-level countdown's behaviour half** — landed (T67): the 2000 ms timer,
  `countDownDone`, the `:288` 1-1 skip, and the update gate that freezes the
  player while the arena fills. **This was the "changes spawn placement
  game-wide" item**, and it did: on 198 of 405 levels enemies now arrive at the
  room edge after the countdown instead of fading in off-screen. Faithful,
  measured, and recorded as **C15** so it is not reported as a regression.
  Tower and Defense are untouched — their rooms already matched the camera.
  Presentation is still owed; see the queue above.
- **The achievement toast overlap** — fixed (T79), and the recorded description
  was wrong in both halves. They were **not** un-offset (`.hud-toasts` is a flex
  column with a gap, so toasts never overlapped each other) and the uncapped
  count was not the mechanism. **Two centred overlays were**: the toast column
  grew down from top-centre into the centred results panel.

  It is also **AS3-derived**, against the note that said it belonged to the
  component: `PartAchievements` shows **one at a time** from a queue (`:265`,
  `:116-117`) at **top right** (`:125-126`). Both ported; the stacking problem
  disappears with them. **This unblocked the `Achievement` sound** (`:120`),
  which was filed as blocked on exactly this queue.
- **The reload readout** — done (T78). `PLACEHOLDER_AMMO` is gone and the HUD
  draws the AS3's two cooldown bars (`PartInterface.drawReloadBars`,
  `:746-778`). **A premise correction came with it:** it was never a placeholder
  *value* awaiting a real count — `ammo`, `magazine` and `clipSize` appear
  **zero** times in the AS3's three gameplay files, so the `{ current, capacity }`
  shape was a placeholder *concept*. `ammo:changed` is retired for
  `reload:changed`, carrying two 0-1 fills.

  `:750-752`'s "countdown" is the **opening** countdown, already ported in
  T67/T68 — not a reload one, despite living in `drawReloadBars`. It is display
  only: no reload timing, no input gating, and it touches the primary alone.
- **`L1`** — fixed (T77). `sync-assets.mjs` now prunes destination files the run
  would not write, using the same inputs the copy loops use so the authored
  overlay survives by construction. **A scoping correction came with it:**
  `registry.test.ts:218` already caught two of the three failure modes the
  backlog listed — a rename and an upstream deletion both remove the name from
  *both* source roots. The gap was only a shape dropped from `CURATED_SHAPES`,
  which stays in `SWFimported/shapes/` and is therefore not a stray, while the
  eager glob keeps bundling it.
- **`L8`** — fixed (T69), and it turned out to be two bugs. The aim fix alone
  moved 25 → 32 on one run and 27 on the next, with the good run's whole gain
  arriving at the **homing** Magic Cannon — so the harness now aims at a live
  enemy rather than orbiting a ring. The larger cause was that **T67's countdown
  gate had silently broken `L3`'s fix**: the sweep's move-and-fire ran inside
  the two-second input block, so the tutorial gate never released and nothing
  spawned at all. Both closed; the sweep now waits on `__arena.countDownDone`.
  **The count reported a plausible 27 throughout.**
- **`L3`** — fixed (T65). `--sound-sweep` now moves before firing, mirroring
  `--baseline`. Verified by A/B on the dev level rather than by the count:
  without the move the tutorial stays on step `Move` through the entire firing
  loop (140 sounds queued, nothing spawns); with it the step reaches
  `KillEnemies` inside the settle and enemies are on screen.

  **The sound number did not move — it is 25 of 67, not 39.** Flagged rather
  than glossed: `L3` was necessary and not sufficient, and `L8` was hiding
  behind it. **Do not read 25 as a regression and do not treat 39 as the
  target** — 39 was itself measured on a harness carrying both defects, so it
  recorded whatever that build's luck produced. The first trustworthy number
  will be the one after `L8`.

### Blocked on you, not on me

- **Nothing is currently blocked on you.** The last item that was — the volume
  slider ↔ mute toggle coupling — was decided in T111 (port it faithfully) and
  has shipped.
- **Two standing calls shape everything**: the touch/phone work is deliberately
  deprioritised until the desktop port is finished, and the ~81 third-party
  classes (`com.google.analytics`, `FGL`, `fl`, `mx`) are never being ported.
- `M1`, the tank damage tint, was the one item you asked for by name and is
  **done** (T52) — recorded in §6.

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
