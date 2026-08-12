# Backlog — what is left after the enemies

> ## What this document does **not** cover
>
> **Finishing F–L is not finishing the port.** This was written immediately after the
> enemy types landed, scoped at what was visible from there, and it has been read since
> as though it were the whole remaining plan. It is not.
>
> Outside its scope when written, and unlisted anywhere else at the time. **All five
> have since moved**, re-checked at `b2d2193`:
>
> - **Tutorial** — 23 AS3 classes. **Shipped** (T46–T56). Seven modules in
>   `src/game/tutorial/`; `tutorialGates.ts` is reached at `GameplayScene.ts:28`
>   and `waveState.ts:23`. It runs for a fresh player and gates spawning.
> - **Particles** — `spawnParticle` / `handleParticles`. **Shipped** (T32).
>   `effects/particles.ts`, reached at `GameplayScene.ts:140`.
> - **`ItemMoney`** — money as a collectable drop. **Shipped** (T36).
>   `items/money.ts` + `items/moneyArt.ts`, reached at `GameplayScene.ts:54-56`.
>   Note `moneyOnFloor: 0` is a *separate* item and still stands — see the audit.
> - **The two enemy/medic indicators** — `handleEnemyIndicators`,
>   `handleMedicIndicators`. **Shipped** (T43). `effects/indicators.ts`, reached at
>   `GameplayScene.ts:53`.
>   **This entry described them wrongly as "off-screen" indicators.** They are
>   *on-enemy*: `handleMedicIndicators` (`PartGameArea.as:2295`) sets
>   `indicator.x = indicator.enemy.x`, and `handleEnemyIndicators` (`:2491-2497`)
>   counts enemies carrying `gotBomb`. Corrected here rather than silently, because
>   the wrong description would have scoped a feature that does not exist.
> - **The UI and sound bulk** — **measured, not counted** (see below). UI: 9 of 11
>   screens render with content. Sound: **50–51 of 67** names fire (T80) — see
>   *Instrument note*.
>
> Recorded here rather than in a report because a list that refers to work it does not
> enumerate is how the dev aids ended up saying "remove the others" about a set nobody
> could name. If you complete F–L, come back to this box before declaring anything done.

All 20 enemy types are ported (`deedc29`). This is the inventory of what
remains, scoped the same way the enemy inventory was: **by dependency, not by
how novel the description sounds.** Groups A–E were the enemy porting order; this
continues at **F**.

**Status:** re-scoped in **T60**, 7 August 2026, verified against the tree at
commit **`b2d2193`** (T59) on `main`. Every claim below has a `file:line`
citation into either `SWFimported/scripts/` or `NewVersion/src/`, and every
status was checked by opening the cited line — **not by a search hit**, which is
the distinction that turned up two drifted citations in this file's own text.

**The previous stamp said `deedc29` on `develop`**, a branch frozen at `bda573b`
since the T1–T7 arc. Between that commit and this one, groups **F, G, H, I, J, K
and M closed almost entirely** while this file continued to read as the plan. If
you are re-reading this after another long gap, distrust the checkboxes and
re-derive before scoping anything.

### Instrument note — what was driven, and what was only read

Per rule 8 (*measure, do not count*), the two count-shaped claims in this
document were **driven at `b2d2193`**, not counted:

- **UI — driven.** `npm run look -- --ui`. Nine screens render with controls and
  content: MainMenu 13, LevelSelect 69, Upgrades 35, Bestiary 2, SaveSlots 5,
  Enemies 22, Options 10, Achievements 2. `Premium` and `Credits` report
  `UNREACHABLE (no entry point)` — both deliberately out of scope.
<!-- docs-check: sound-coverage = 50-51 of 67 -->
- **Sound — driven. 50–51 of 67 (T80).** `npm run look -- --sound-sweep`, with `L3`
  and `L8` closed, the sweep extended to the four modes `--baseline` never
  visits, and — since T80 — `Flamethrower`/`Lava Ball` in its equip lists plus a
  per-step log of *which* names are new. The last of those is what makes a
  two-name change legible at all: the total swings ±1 on its own, so it cannot
  carry a claim this small. What makes it trustworthy where the earlier readings
  were not:
  **landing evidence 6/6** — `ImpactBullet`, `ImpactLaser`, `ImpactMagic`,
  `ImpactCake`, `EnemySquish` and `Coin` all fire, and every one of them was
  absent from every run before T69.

  **41–42 → 47–48 mixes two different gains and they are worth keeping apart:**
  **+5 from reach** (`Boss`, `Defense`, `Flag`, `Tower` music and `Lose`, none
  of which needed code) and **+2 from wiring** (`Freeze`, `TeleportOut`).

  **The earlier figures are history, not a series.** Each was taken with
  different defects present in the harness, so they cannot be compared to this
  one or to each other:

  | Reading | Taken at | Harness state |
  |---|---|---|
  | 39 of 65/67 | `59b9756` (T57) | before `L3` and `L8` were known |
  | 25 of 67 | `b2d2193` (T60) | tutorial gate closed the arena (`L3`) |
  | 27 of 67 | T65 | `L3` fixed; sweep still aimed at a screen constant (`L8`) |
  | 41–42 of 67 | T69 | both closed; impacts landing — Normal mode only |
  | 47–48 of 67 | T71 | + four modes driven, + two triggers wired |
  | **50–51 of 67** | **T80 (current)** | **+ `Burning`/`FlameThrower` wired, + two names added to the equip lists** |

  **41–42 does not confirm or replace 39.** They measure the same thing through
  two different broken instruments and one working one.

Everything else in this document is a read of a cited line, which is enough for
"the module exists and is reached" and is **not** enough for "it behaves
correctly in play". Those remain separate claims here, as everywhere.

## How to read a scope line

Each item carries three facts, in this order:

- **Exists** — what is already built and callable in the port.
- **Missing** — the specific thing that is absent, named as a *subsystem* where
  one is missing and as a *wiring site* where the module exists but nothing
  calls it.
- **Lift** — small / medium / large, justified by what it depends on.

The distinction that matters throughout: **ported and tested is not the same as
running.** `PROGRESS.md` records `· wired` separately for exactly this reason,
and a full green suite has failed to catch four shipped-but-unreached features so
far. Several items below are "the model is done, nothing calls it".

---

## Group F — Secondary weapons — **CLOSED** (12 of 12)

**All twelve are ported, registered and dispatched.** `SecondaryKind`
(`secondaries.ts:113`) has seven members and `GameplayScene.useSecondary`
(`:2835-2852`) switches exhaustively over all of them, so a thirteenth kind is a
compile error rather than a weapon that silently runs the wrong spawn. The three
this document listed as remaining are `kind: 'fan'` (Crazy Cheese,
`secondaries.ts:313`) and `kind: 'trail'` (Ice Ball `:236`, Lava Ball `:271`).

**One thing in this group is still owed, and it is a comment, not a weapon** —
see **F4**.

Ported: `Mine`, `Shield`, `Grenade`, `Ice Grenade`, `Poison Grenade`,
`Icicles`, `Poison Spikes`, `Magic Bunny`, `Rockets`, `Crazy Cheese`,
`Ice Ball`, `Lava Ball`.

Two things fell out of that which the original scoping did not predict.
**Porting Shield ported `BulletReflect`** — `:1557` is one condition covering
both, so the misc upgrade came off the withheld list with it. **Porting the Ice
Grenade closed the `FreezeTemperamental` achievement**, which had been recorded
as knowably unreachable because nothing dealt Ice damage; the knip canary fired
on the exact commit that changed it.

**All twelve upgrade tables are already generated** — `upgradeData.ts` carries
every stat track for all of them, prices included. So no item in this group is
blocked on data; each is blocked only on a delivery mechanism.

**The three wrong descriptions in `secondaries.ts`'s header have been removed**
— the table below is kept as the record of what they said, since each was a case
of scoping from a class name rather than from the code:

| It said | Actually |
| --- | --- |
| Icicles / Poison Spikes are "persistent ground hazards with lifetimes" | A radial burst of ordinary fast bullets (speed 20, radius 6, `explosion = false`) — `PartGameArea.as:4058-4098`. Nothing persists. |
| Crazy Cheese "spawns a temporary allied entity" | A fan of wall-bouncing projectiles, `bounces = 3` — `:4208-4231`. No entity. |
| Magic Bunny is a "homing pet with its own steering loop" | `BulletMagic` with a different sprite and its own stat row. Same chain-homing code path, shared at `:1714` and `:1758`. |

### F0 — Shared subsystems this group needs — **all three shipped**

Build these once and several unblock together. That prediction held: naming the
shared dependency is what let three weapons land together rather than
separately.

- [x] **Bullet wall-bounce** — shipped. `weapons/bulletBounce.ts`, consumed by
      `weapons/bulletStep.ts:19-20` (`bounceAgainstCamera`). The live divergence
      this entry flagged — **Gummy Bear Cannon silently missing its bounce** — is
      closed with it, and is recorded as **C6** in the audit: the weapon ran at a
      quarter of its intended damage for the entire port until `fad4cba`, because
      a bear escalates only on bounce.
- [x] **Ground-hazard objects (`groundArray`)** — shipped.
      `weapons/groundHazard.ts`, reached at `GameplayScene.ts:150-151`, with the
      `trailID` generation rule owned by `iceGenerationAllows` and referenced from
      `enemies/statusEffects.ts:68`. `weapons/ball.ts` is deliberately kept apart
      from it (`ball.ts:11`) — different objects, shared `HazardType`.
- [x] **Projectile target selection** — shipped. `weapons/rockets.ts:56`
      (`nearestTargets`), documented at `:21` as nearest-first from the tank.

### F4 — Owed: `secondaries.ts`'s header still says "Scope: Mine only"

- [ ] **The file header contradicts itself and is now the last F artefact.**
      `secondaries.ts:16` heads a section `── Scope: Mine only ──`, `:22` says
      *"The other eleven each need work this file does not do:"*, and `:25`
      immediately below says *"All twelve are ported."* The correction was
      appended without retiring the scaffolding around it, so the file reads
      three ways at once.

      Not fixed in the pass that found it, which was docs-only. It is a comment,
      not behaviour — but it is the first thing anyone scoping this group reads,
      and it is exactly the "stale prose outlives the code" class the audit
      tracks under *Doc contradictions*. *Lift: trivial.*

### F1 — Unblocked today (status timers already exist)

`src/game/enemies/statusEffects.ts` was built with the Poison Cannon and Timed
Bomb Cannon and **already covers poison, freeze and bomb** — `applyPoison`,
`applyFreeze`, `applyBomb`, `tickStatuses`, wired into `Enemy.ts:83` and
`GameplayScene.ts:59`. Nothing in this group is blocked on it.

- [x] **Grenade** — shipped. `ObjectGrenade`, `:4001-4056`. A thrown arc: spawned at the
      muzzle with `timeLeft = 50` frames, speed `shootDistance / 9.35` (floor
      2.1) and friction `0.101 + 0.0014 × (shootDistance / 200)`, so it
      decelerates and lands near the cursor. Detonates as an ordinary `Normal`
      explosion. The cursor world point already exists
      (`GameplayScene.pointerWorldPoint()`, `:1002`).
      One wrinkle needing re-derivation: when the cursor is below the camera
      mid-line the throw distance is scaled by `distToBorder / distToMouse`
      (`:4032-4038`), which is written against the AS3's fixed 800×600 camera
      and cannot be lifted verbatim into the RESIZE viewport.
      *Missing: a bullet with friction and a detonate-on-lifetime path.
      Lift: small — smallest of the eleven.*
- [x] **Ice Grenade** — shipped. Grenade plus `frozenTime`, detonating on the `Ice`
      channel. `ExplosionType` already has `'Ice'`
      (`src/game/weapons/explosions.ts:34`) and `applyFreeze` exists.
      *Lift: small, once Grenade lands.*
- [x] **Poison Grenade** — shipped. Grenade plus `poisonTime` / `poisonDamage` on the
      `Poison` channel. Same story. *Lift: small, once Grenade lands.*
- [x] **Icicles** — shipped. `:4058`, a radial burst of `spikeCount` icicles (23 at level 1
      rising to 32), speed 20, radius 6, carrying `frozenTime`.
      **Quirk to reproduce or document:** the bearing is
      `360 / (spikeCount − 1) × c` for `c` in `0 … spikeCount − 1`, so the last
      icicle lands on 360° — exactly on top of the first. N icicles therefore
      produce N−1 distinct bearings with one doubled. This is the fan formula
      (endpoints inclusive) applied to a full circle.
      *Missing: nothing but the loop. Lift: small.*
- [x] **Poison Spikes** — shipped. Identical shape, flat 32 spikes at every level,
      carrying `poisonTime` (≈2.5) and `poisonDamage`. *Lift: small.*
- [x] **Magic Bunny** — shipped. `:4233`. Chain-homing with `targetsLeft`,
      `neverHitTarget` and a per-bullet `enemiesArray`. **This is `BulletMagic`.**
      Every code path is shared with the Magic Cannon — `:1714`, `:1758`, `:5795`,
      `:5807`, `:5822`, `:5917`, `:5945`, `:6070` all name both classes together —
      and the only line that is bunny-only is `:1748-1751`, which points the
      sprite along its travel. `src/game/weapons/magic.ts` is ported and tested.
      *Missing: a second spec row and one rotation line. Lift: small — despite
      being the most exotic-sounding name in the group.*

### F2 — Was blocked on an F0 subsystem; all four shipped

- [x] **Rockets** — shipped. `:4108-4172`. Fires up to `rocketCount` homing rockets, one
      per nearest on-screen enemy, each with an explosion radius.
      **Refunds the cooldown when there are no targets** (`:4169`,
      `reloadTimeSecondary = 0`) — a detail easy to miss and visible in play.
      *Blocked on: projectile target selection (F0). Lift: small after it.*
- [x] **Crazy Cheese** — shipped (`fad4cba`, the last of the twelve). `:4208`. A
      fan of `cheeseCount` projectiles, radius 7, speed 20, `bounces = 3`, with a
      per-bullet `enemiesArray` so one cheese damages a given enemy once. The fan
      width is a stat track. `secondaries.ts:299-314`, `kind: 'fan'`.
      Note its impact sound has no AS3 trigger — `ImpactCrazyCheese` is an
      **orphan asset**, not a missing wiring, argued in full in the audit.
- [x] **Ice Ball** — shipped. `:4174`. `secondaries.ts:227`, `kind: 'trail'`.
      A large slow projectile (radius 20, speed 12) that does not explode and is
      not consumed by hits, laying `ObjectGroundIce` patches behind it that freeze
      on contact. The `iceTrailID` counter (`:4179`, `:6208`, `:6220`) makes each
      *throw* freeze a given enemy once, not each patch — audit **C5**.
      Its two faithful oddities are recorded as **C4** (it deals no contact damage
      at all) and **C3** (ice bites for its full stat, lava for fifteen frames
      less). Do not "fix" either.
- [x] **Lava Ball** — shipped. `:4188`. `secondaries.ts:262`, `kind: 'trail'`.
      Same body, explodes on impact, lays `ObjectGroundLava` patches carrying
      damage over a lifetime. Audit **C2** (patches *grow* as they die) and
      **C10** (a lava-trail kill credits the player, Kill Reload included) both
      look like defects and are faithful.

### F3 — Not a projectile at all

- [x] **Shield** — shipped. `:4102`. Sets `shieldOn = true` and a timer; there is no
      entity. While up: contact damage is zeroed, non-boss enemies cannot connect
      at all, bosses connect at twice the tank radius, and enemy bullets are
      absorbed at twice the radius (`:1555`, `:5273-5277`). Thirteen sites in
      total.
      **`src/game/player/tankDamage.ts` already takes `shieldOn` through both
      entry points** (`:49`, `:89`) and implements the doubled reach and the
      zeroed damage — nothing ever passes `true`. So most of the rules are built
      and the missing piece is the timer, the trigger and the visual.
      *Lift: small. Good first item in the group; it exercises the secondary
      trigger path without needing a new projectile.*

---

## Group G — The post-level screen (`ScreenStatus`) and the reveal pages

### What it is in the original

`ScreenStatus.as` (1225 lines) is the screen between finishing a level and
returning to level select. It is **paginated**: `pagesArray` starts as
`["Standard"]` and then has pages appended (`:405-429`):

1. **Standard** — the results page: medals earned, money banked, the level
   value icons stamped with the difficulty played (`:383-399`).
2. **Achievement pages** — one per achievement newly earned this level, from
   `ScreenAchievements.updateAchievements()`.
3. **Enemy pages** — one per enemy newly discovered, from
   `ScreenEnemies.updateEnemies()`, with strengths/weaknesses icons
   (`:700`). **Gated on `ScreenGame.hp > 0`, so only a win reveals**, and it
   reads the *next* level's table, not the one just played (`:410-423`).

Pages are shown newest-first (`pageCurrent = pagesTotal`, `:431`) and paged
through with the square page buttons (`handleSquarePages`, `:629`).

### What exists in the port

- [x] Enemy discovery logic — `discoverEnemies`, called from
      `PlayerProfile.recordLevel()`, with the win-gate and next-level rule
      already correct and documented at the call site.
- [x] A results overlay — **the citation in this entry has drifted.** It is
      `LevelOutcomeOverlay` at `src/ui/Hud.tsx:159`, not `LevelOutcome` at
      `:119`. It is also no longer "a DOM dialog, not a page stack": it consumes
      `buildStatusPages` (`:167`) and `initialPageIndex` (`:186`), so it *is* the
      page stack now. Corrected at `b2d2193`.
- [x] `recordLevel` **returns the newly-discovered display names** — and the
      return value is now consumed. `levelBanking.ts:145` takes `newEnemies`,
      `:156` takes `newAchievements`, `:168` returns both, and `ui/Hud.tsx:167`
      feeds them to `buildStatusPages`. The "computed and thrown away" state is
      closed.

      **A stale comment survives at the site**, and is worth retiring next time
      anyone is in the file: `levelBanking.ts:135-138` still says the discovery
      is not displayed *"and the AS3 shows it as reveal pages on `ScreenStatus`,
      which is unported. Thread the value through when that screen lands"*. It
      landed; the value is threaded. Docs-only pass, so flagged rather than cut.

### What is missing

- [x] **The page stack** — shipped. The overlay is page 1 of N with prev/next
      arrows, and it **opens on the last page** (`:431`) so the player lands on
      the newest reveal and pages back to the results. The exit buttons are on
      the results page only, as the AS3 has them, so the reveals cannot be
      skipped — only walked through. Nothing auto-advances.
- [x] **Enemy reveal pages** — shipped, reading `BESTIARY` for the description
      and matching on the display name `discoverEnemies` produced. The AS3 also
      shows strengths/weaknesses icons on this page; the bestiary screen does
      not render those either, so they remain unported on both surfaces rather
      than on one.
- [x] **Achievement reveal pages** — shipped, taking the title and description
      from the same 36 specs `achievementContext` evaluates.
- [ ] **The medal-reveal animation — the one item in G still open.** The AS3
      keeps two parallel arrays — `worldsValuesArrays` (earned) and
      `worldsValuesVisibleArrays` (shown) — and animates the difference
      (`ScreenLevelSelect.as:523-526`). **`worldsValuesVisibleArrays` is not
      saved**; it is cloned from the real array at load (`SaveManager.as:656`)
      and diverges only within a session. The port has one `ProgressTable` and no
      "visible" copy.

      **Shipped in T76 and closed in T81.** `levels/progressReveal.ts` is the
      model, `playerProfile.ts:164` is the visible table, and
      `LevelSelectScene.ts:228`/`:241` run the reveal at one medal per **seven**
      frames (`:1378`, `:1371`).

      **The "one model change for two consumers" premise does not apply, and
      that is the correction worth keeping.** The two consumers were separated
      on purpose rather than unified: audit **A6** records that putting the
      gates on the lagging table would let the results screen's Next-level
      button start a level `LevelSelectScene` refuses, because
      `GameplayScene.ts:980` handles `ui:start-game` with no unlock check.
      Gates read earned; only the medal counts lag. So there was never one
      change here — there were two rules that look like one.

---

## Group H — Achievements — **CLOSED**

### What exists

Substantially more than the name suggests — and, unlike when this was written,
**it now runs.** The four "what is missing" items below are all discharged with
citations; the entry is kept rather than deleted because the prediction it made
(*"this is eleven small insertions plus a reset hook, not eleven features"*) is
the reusable part.

- [x] `achievementData.ts` — all **36** achievements generated from
      `ScreenAchievements.as`, with type, requirement, title, description,
      difficulty sensitivity and grid position.
- [x] `achievementState.ts` — the full evaluation model: the −1/0/1/2/3 state
      encoding, `winStateValue`, the re-earn-at-higher-difficulty rule, and all
      three evaluation types (`Number`, `Boolean`, `NumberArray`).
- [x] `achievementSave.ts` — encode/decode, including the two running totals
      (`ek` enemyKills, `me` moneyEarned).
- [x] Persistence — `SaveSlotData.achievements` is written and read every save.

### What was missing — **all four closed**

- [x] **Every counter** — shipped. `PlayerProfile.recordAchievements` takes a
      `totalsDelta` (`playerProfile.ts:155`) and adds into both running totals
      (`:160-161`). It is fed real values at `levelBanking.ts:155-156`:
      `{ enemyKills: input.kills, moneyEarned: input.earned }`. The three Kills
      and three Money achievements can move.
- [x] **The evaluation call** — shipped. `updateAchievements` is imported at
      `playerProfile.ts:36` and called at `:164`. Ordering is deliberate and
      documented at `levelBanking.ts:151-153`: it runs **after** `recordLevel`,
      because the medal-total achievements read the progress table and evaluating
      first would award `Stars3` a level late.
- [x] **An achievements screen** — shipped (T57). `ui/screens/AchievementsScreen.tsx`.
      Driven at this commit: renders with 1604 characters of content.
      The audit's baseline records all 36 on the AS3's board, proportionally
      placed.
- [x] **The 11 `temp*` flags** — shipped, all eleven. The estimate held exactly:
      eleven small insertions plus a reset hook, not eleven features.

      The model is `LevelAchievementFlags` (`achievementContext.ts:49-78`), the
      reset pair is `createLevelFlags` (`:89`) and `createQuitFlags` (`:112`), and
      the scene holds one instance at `GameplayScene.ts:452`, re-created per level
      at `:815` and handed to banking at `:3778`.

| Flag | Set at (`GameplayScene.ts`) |
| --- | --- |
| `nothingPressed` | `:1002` |
| `threeBosses` | `:1369` |
| `timedBombsFired` | `:1576` |
| `otherThanTimedBombsFired` | `:1578`, `:3169` |
| `onlySpecialWeapons` | `:1581` |
| `noWeaponsUsed` | `:1582`, `:3170` |
| `damageAddictEnemyCake` | `:1909` |
| `temperamentalFrozen` | `:2802`, `:3996`, `:4036` |
| `trapEnemyMineKill` | `:3219` |
| `hitBottom` | `:3297` (source value on `PlayerTank.ts:61`) |
| `doctorPoisoned` | `:4047` |

  **Two subtleties worth not re-deriving**, both already captured in the port:
  three flags start **true** and are cleared by acting (`:96-100`), so getting
  them backwards makes three achievements unreachable rather than trivially
  earned; and the quit path sets those same three **false** (`:113-118`), so
  abandoning a level cannot bank an achievement for having done nothing.
  `threeBosses` is a property of the level read once from `bossAmount`
  (`:1369`, AS3 `:305-308`), **not** a watch for three live bosses — so a Boss
  level with two bosses can never earn it however it is played.

---

## Group I — Reach: difficulty, worlds, unlocking — **effectively closed**

This is the group covering priorities **(3) all levels/worlds reachable** and
**(4) all difficulties working**. **Both priorities are met**: a difficulty is
selectable and carried, and all nine worlds are reachable behind the AS3's own
unlock rule.

**Nothing in this group is open.** The last thread — the visible-vs-earned table
(I2's final bullet) — was never a reach problem and is now a settled divergence
rather than a gap: see **A6**, and I2 below.

### I1 — Difficulty selector

- [x] **All the logic works.** `difficultyMultipliers.ts` has the three profiles
      and they are applied throughout the enemy stat mods.
      `ProgressTable` stores `[hard, medium, easy]` per level, so the save format
      already carries three independent results.
      `evaluate()` takes a difficulty and implements the re-earn rule.
- [x] **Something selects one now** — shipped. The `const DIFFICULTY = 'Easy'`
      pin is **gone from the scenes**; no `const DIFFICULTY` remains in
      `src/game/scenes/`. The selection lives in `levels/difficultyService.ts`
      (`chooseDifficulty`, `getDifficulty`, `publishDifficulty`) with
      `levels/difficultyOption.ts` beside it.
- [x] **Wired** — `LevelSelectScene.ts:22` imports the service and `:78` calls
      `chooseDifficulty(this, difficulty)`; the choice rides on `ui:start-game`
      (`:69-71`, which destructures `difficulty` and forwards it to the Gameplay
      scene) and is re-read from the options store when a slot starts a fresh game
      (`MainMenuScene.ts:210`, via `readDifficulty` imported at `:19`).
      `MainMenuScene.ts:22` publishes it for the menu.
      The estimate was right: this was the cheapest of the four priorities and it
      makes two thirds of the medal table reachable.

### I2 — World picker

- [x] `LEVELS` carries all nine worlds × 45 levels; `roomSizeSource.test.ts`
      independently verifies all 405 room sizes against the AS3.
- [x] A **dev-only** jump to any level in any world exists in
      `LevelSelectScreen.tsx:19-45`, launching sandbox runs that record nothing.
- [x] **The `SELECTED_WORLD = 1` pin is gone** — no such constant remains in
      `LevelSelectScene.ts`, and the "world 1 of 9" footer with it.
- [x] **The world grid and the world-0 picker mode** — shipped.
      `LevelSelectScene.ts:25` documents `selectedWorld = 0` as *"the picker
      itself, not a world"*, `:32-36` holds which grid is open or `PICKER`, and
      `:81-82` subscribes to `ui:select-world` → `selectWorld(world)` (`:144`),
      which returns to the picker on `PICKER` (`:145-146`).
- [x] **The unlock rule** — shipped as `isWorldUnlocked` (`levelUnlock.ts:117`):
      world 1 is always open, and any later world needs the **last level of the
      previous world** cleared. Enforced scene-side at `LevelSelectScene.ts:151`,
      and the reason is stated at `:137-143`: `ui:select-world` is an ordinary
      event and `disabled` on a React button is *presentation, not enforcement* —
      the same argument as `mayStart` (`:126-131`) for levels. That is the
      guard-scoping rule applied without being prompted.
- [x] **The earned-vs-visible question — settled, not owed (T76 built it, T81
      closed the entry).** The rule reads the *earned* table where the AS3 reads
      the *visible* one, and that is now a **recorded divergence (A6)** rather
      than a gap: a lagging gate would disagree with the results screen's
      Next-level button, which starts a level with no unlock check
      (`GameplayScene.ts:980`). The visible table exists and *is* consumed —
      just for the medal counts, via `levelUnlockStates`' `display` parameter
      (`LevelSelectScene.ts:205-210`), not for the gates.

### I3 — Level unlock, and the world rollover

- [x] The rule is implemented and used: `isLevelCleared` gates each level in
      `LevelSelectScene.ts:94` (`level === 1 || cleared(level − 1)`), matching
      `ScreenLevelSelect.as:842`.
- [x] `nextLevelAfter` rolls over into the next world, and `GameplayScene` uses
      it for the Next button.
- [x] **Extracted** — `levels/levelUnlock.ts` now exists, and the "three copies of
      one rule" state is closed. It was done **before** I2 landed, exactly as this
      entry recommended, so the world picker consumes the extracted rule
      (`isWorldUnlocked` at `LevelSelectScene.ts:151`, `mayStartLevel` at `:128`)
      rather than adding a fourth copy. This is the one item in the document whose
      sequencing advice was followed and demonstrably paid.

---

## Group J — Equip slots

### What this covers

The tank carries **two primary weapons** and switches between them in play
(Q on desktop). Buying a weapon in the shop makes it *owned*; equipping decides
which two owned weapons are actually in the tank. The secondary has one slot.

### State in the port

- [x] The whole model: `src/game/loadout/loadout.ts` — `equippedWeapons` as a
      2-tuple, `equipPrimary`, `unequipPrimary`, `chooseWeapon`, `equipSecondary`,
      `activeSlot`, name validation against the upgrade tables.
- [x] Persisted — `SaveSlotData.loadout`, encoded as the AS3's `ew`/`pw`/`sw`.
- [x] **Wired in gameplay** — Q toggles the two slots, refusing when the other
      is empty, and the level start re-derives the active weapon from the slots
      rather than the stored `primaryWeapon`.
- [x] **The equip UI** — shipped. Two slot buttons per owned primary, one Equip
      per owned secondary, with the ownership check re-run in `UpgradesScene`.

      **Correction to what this entry originally claimed.** It said "the player
      can buy the eleven other primaries and can never put any of them in the
      tank". That was wrong: `cycleWeapon` walked every *ported* primary, skipped
      any the player did not own — `resolveWeaponStats` returns null at level 0,
      which is the ownership test — and wrote the winner into slot 1. Buying a
      weapon did make it usable.

      What was actually missing was narrower: **slot 2 was never filled**, so the
      AS3's two-slot model did not exist, and **the secondary could not be
      changed at all** (`equipSecondary` had no caller — latent while only Mine
      is ported, real as soon as Group F lands). Fixing it also had to change
      three gameplay rules, so it was not the pure UI addition this entry
      assumed — see the commit for the level-start re-derive, the toggle
      rewrite, and the reload cost of a switch.
- [x] **Moved out of this group (T90).** The shop-preview work was the last open
      bullet here and had nothing to do with equip slots — it only lived in
      Group J because it was noticed while writing it up, and the summary table
      then inherited the letter **J** for it, pointing readers at a closed group.
      It is now **M2**, below. **Group J itself is closed.**

---

## Group K — Save slots — **CLOSED**

- [x] `saveSlot.ts` handles **all three slots already** — `readSaveSlot(string,
      slot)` / `writeSaveSlot(string, slot, data)`, matching `SaveManager.as`'s
      parenthesis-delimited format.
- [x] `SaveManager.checkIfSlotHasData(slot)` (`:56`) has no port equivalent yet,
      but the parsing it needs is in `saveString.ts`.
- [x] **`ACTIVE_SLOT` is no longer a pin, and the prediction it carried was
      correct.** It survives at `playerProfile.ts:60` but only as a **default
      parameter** — `constructor(store, slotNumber: number = ACTIVE_SLOT)`
      (`:78`) and `createPlayerProfile(slot: number = ACTIVE_SLOT)` (`:275`). The
      slot screen passes a real index: `MainMenuScene.ts:197` calls
      `createPlayerProfile(slot)` and puts the result in the game registry
      (`:196`), which is what `getPlayerProfile` reads, so **gameplay writes to
      the slot the player picked**. Slots 2 and 3 are genuinely reachable.

      The entry said "the rest changes nothing once a select screen passes a
      different index". That is what happened, and nothing else had to move.
- [x] The **"slot has data" probe** is ported — `slotHasData` in `save/saveSlot.ts`,
      from `SaveManager.checkIfSlotHasData` (`:56`). Built on `partOfSaveString` so it
      and `readSaveSlot` cannot disagree about where a slot begins.
- [x] The **slot-select screen** is built — `ui/screens/SaveSlotScreen.tsx`, fed by
      `save/slotSummary.ts`, drawn over the menu as the AS3 draws it. Renders the four
      facts `ButtonGameSave.as:215-266` decides a button from, and both entry
      behaviours from `:110-134`: an occupied slot loads and goes to Level Select, an
      empty one starts a fresh game at 1-1.
- [x] **Per-slot delete and its confirmation.** One flow, not two: `bSaveDelete`
      (`:296`) opens `makePage2("Delete slot?")` (`:435`), and Confirm clears the slot
      (`:453-462`). Built as the AS3 builds it — the row itself is replaced by the
      question with Confirm and Cancel side by side, rather than a dialog over it.

**A correction to this entry as it was first written.** It claimed the port "overwrites
without asking" and cited `makePage2("Overwrite?")`. That is wrong on both counts.
`"Overwrite?"` appears **only** when `ScreenMenu.convertingSaves` is true (`:140-144`) —
a one-time migration from the old per-slot SharedObjects into the save-string format,
which this port has no equivalent of and may never need. **Picking an occupied slot in
the AS3 loads it; nothing is overwritten**, and the port does the same. The confirmation
that exists in normal play is the delete one above.

**Three corrections to the description above, found while porting the probe:**

1. **The metadata readers already exist.** `readWorldAndLevel` and `readSaveDateTime`
   (`saveSlot.ts:161`, `:166`) return the `wl` and `dt` fields. The screen needs a way to
   read them *per slot*, not the readers themselves.
2. **The port already stores slots separately, and that is faithful.** `playerProfile.ts`
   builds its store as `saveSlotStoreName(ACTIVE_SLOT)`, giving `CircularTankSave1` — and
   the AS3 does the same, `SharedObject.getLocal("CircularTankSave1"/"2"/"3")` at
   `SaveManager.as:540-548`. So a slot-select screen must probe **three stores**, not
   three slots of one string. `slotHasData` answers the within-string question; the
   screen needs a store-level probe on top of it.
3. **A failed save is silent in the original too.** `gameSave.flush()` (`:617`, `:748`)
   has no try/catch and ignores the return value. The port's `console.warn` already
   exceeds it, so there is no AS3 handling path to port — adding one would be a
   divergence, and should be recorded as such if it is ever wanted.

---

## Group M — Requested by the user

### M1 — Tank damage feedback (`damageIndicator`'s red tint) — **DONE (T52)**

**Approved, explicitly scheduled last as the user asked, and shipped in that
order** — after the results screen (T44) and after the tutorial.

`player/damageIndicator.ts` is imported at `GameplayScene.ts:33-36`, the counter
lives at `:580` and resets per level at `:812`, and the tint is applied each
frame at `:2493-2495` (`damageTintStrength` then `tickDamageIndicator`). The
audit records it pinned as a **ramp** at four levels plus monotonicity, not as a
boolean — which is the right shape for a value that counts down from 20.

Original entry kept below for the reasoning.

`PartGameArea.as:2795-2803` tints the tank red in proportion to
`tank.damageIndicator`, counting down one per frame from 20:

    colorClip(tank, 0xFF0000, tank.damageIndicator / 20 * 0.8)

The port has the health bar and takes the damage; it has no `damageIndicator`
and no tint, so a player loses most of a bar without the screen ever saying so.
Named in the T37 baseline as the second-largest legibility gap after sound.

Small — one counter on `PlayerTank`, set where contact and bullet damage land,
and a tint in the draw. The enemy equivalent (`flashDamage`) already exists and
is the model to follow.

## Group L — Tooling

### L5b — The reload readout — **DONE (T78)**

`PLACEHOLDER_AMMO` is gone; the HUD draws the AS3's two cooldown bars
(`PartInterface.drawReloadBars`, `:746-778`). The rule is
`weapons/reloadBars.ts`.

**The premise was wrong, and that is the useful part.** This was recorded as a
placeholder *value* awaiting a real ammo count. It was a placeholder *concept*:
`ammo`, `magazine` and `clipSize` appear **zero** times in `ScreenGame.as`,
`PartGameArea.as` and `PartInterface.as`. The original counts no rounds — it
draws two 4x80 rectangles that fill as `reloadTime` drains. "12/12" described a
magazine the game does not have, so `ammo:changed` was retired rather than
populated.

**What `:750-752` actually gates.** `if (countDown > 0) height1 = 0` — and
`countDown` there is **the opening countdown**, the 3/2/1/GO! ported in T67/T68,
not a reload timer. It is display-only: no reload timing, no ammo, no input
lockout. The primary bar reads empty until GO! and then jumps to full, because
`reloadTime` is 0 at level start so `:758-760` takes over the moment the gate
lifts. **Only the primary** — `:766` has no countdown branch, so the secondary
shows its real state throughout.

`:754` additionally excludes `MiniGun` and `Flamethrower` from the filling
branch: continuous fire would otherwise strobe the bar at its fire rate.

**Driven.** In play the primary reads `27 → 15 → 8 → 100` across 360ms samples
while the secondary holds at `100`, independent. The readout's bottom measures
788px in an 800px viewport — clear of the edge by exactly the 0.75rem padding.

**No new divergence.** Placement in the DOM HUD row is the same consequence
already recorded as **A5**, and the fraction-vs-pixels change is representation,
not behaviour. The one defensive difference — a zero `reloadTimeMax` reads full
rather than NaN — is documented at the site and unreachable from the stat
tables.

---

### L1 — `assets:sync` never prunes — **FIXED (T77)**

`sync-assets.mjs` now deletes destination files the run would not have written.
The rule is `scripts/lib/asset-prune.mjs`, derived from **exactly** the inputs
the copy loops use, so the authored overlay survives by construction rather than
by an exemption someone has to keep in step.

**Deletes by default.** `src/assets/` is a build artifact — gitignored and
reproducible in full by re-running — so nothing tracked can be lost, and leaving
stale files is the more damaging default because `registry.ts:28` globs the
folder eagerly. `--dry-run` reports without deleting.

**One correction to the scope below.** Of the three failure modes listed,
`registry.test.ts:218` **already caught two** — a rename and an upstream
deletion both remove the name from *both* source roots, so both were strays. The
one it could not see is **failure mode 2**: a shape dropped from
`CURATED_SHAPES` is still in `SWFimported/shapes/`, so it is not a stray, while
the eager glob keeps bundling it. That was the real gap, and it is narrower than
this entry described.

**Driven.** On a clean tree the run prunes 0. With an orphaned image and a
de-curated shape planted, `--dry-run` reports both and deletes neither; the real
run deletes both and every legitimate count returns to its exact prior value
(images 32, fonts 2, audio 123, shapes 295), with the authored
`351_upscale.webp` still present.

*Original entry below.*

- [x] `scripts/sync-assets.mjs` copies and **never deletes**: there is no `rm`,
      `unlink`, or prune step anywhere in the file. Every destination file it has
      ever written stays in `src/assets/` until removed by hand.

  **Re-verified at `b2d2193`, and still true** — a count of
  `unlink|rm(|rmSync` across the file returns **0**. Stated as a count rather
  than "still not fixed", because an unbounded grep that returns zero is the one
  form of absence evidence this project trusts.

  This matters because `src/assets/registry.ts:29` builds its URL maps with an
  **eager** `import.meta.glob('./images/*.{png,jpg,jpeg,gif,webp}')` — so a stale
  file is not merely sitting on disk, it is *bundled into the build*.

  **The concrete instance:** commit `bc5ebe9` replaced the authored
  `assets-authored/images/351_upscale.png` with a WebP. On any working tree that
  ran `assets:sync` before that commit, `src/assets/images/351_upscale.png` is
  still present, still globbed, and still shipped — alongside the `.webp` that
  replaced it. `src/assets/` is gitignored, so nothing in the repo reveals the
  difference between two machines.

  Three failure modes, all silent:
  1. An authored asset renamed or re-encoded (the case above).
  2. A shape dropped from `CURATED_SHAPES` — the copy stays and keeps being
     eagerly imported, which is the exact cost the curated set exists to avoid.
  3. A file deleted from `SWFimported/` upstream.

  *Fix shape: track what the run wrote and delete unlisted files under the
  destination folders, or sync into a fresh directory. Needs care — the authored
  overlay deliberately overwrites extracted files, so a naive "delete anything
  not in the source" would remove the authored ones every run.
  Lift: small. Deferred by explicit instruction on 2026-07-27; recorded here so
  it is not lost.*

### L2 — Per-world ground themes — **DONE**

- [x] All nine tiles are mapped and selected per theme.
      `GROUND_KEYS` (`levels/groundTexture.ts:75-85`) names one texture per
      `LevelTheme` with its SWF library id in a comment (351, 353 … 367), and each
      was **opened and checked against its theme name rather than inferred from
      the sequence** (`:70-73`) — which is the right treatment for a run of ids
      that looks derivable and is not. `groundFor` is consumed at
      `GameplayScene.ts:58`, with the reasoning at `:839`.

      `UPSCALED_THEMES` (`:94`) is a set rather than a per-theme scale field, so
      adding an upscale cannot leave a 1024 texture tiling at scale 1 — a
      mechanism instead of a convention, per the standing rule.

      It was paired with I2 as this entry recommended, so the world picker shows
      nine worlds that actually look different.

### L3 — `--sound-sweep` never satisfies the tutorial spawn gate — **FIXED (T65), and it was not the whole cause**

**The fix landed and is verified; the sound number did not move.** Both halves
matter, and the second is the useful one.

**What the fix does.** `look.mjs` now moves, then fires, *before* the settle
delay, mirroring `--baseline`'s T58 fix. Verified by A/B on the dev level rather
than inferred from the count:

| | tutorial step reached | arena | enemies on screen |
|---|---|---|---|
| Without the move (old) | `Move`, through the **whole** firing loop — 140 sounds queued | `60 LEFT` | no |
| With it (new) | `KillEnemies`, inside the settle | `60 LEFT` | **yes** |

So the gate was real, it was shut, and it is now open.

**What it did not fix.** The sweep still reports **25 of 67** with
`peak/frame EnemySquish: 0`, unchanged. **A second, independent cause was hiding
behind the first** — see `L8`. The count cannot move until both are closed, and
that is why the pre-L3 figure of 39 must not be treated as the target: see the
note under `L8`.

*Original entry kept below.*

#### The original diagnosis

- [ ] **New, found by driving the sweep at `b2d2193`.** The sweep reports
      **25 of 67** names where the audit records 39 at `59b9756`, and
      `peak/frame EnemySquish: 0` — nothing died in it at all. Every combat
      reaction is in the not-fired list: `ImpactBullet`, `ImpactCake`,
      `ImpactMagic`, `EnemySquish`, `Coin`, `TankDamaged`.

  **This is the harness, not the game**, established by a controlled comparison
  on the same build rather than by argument: `npm run look -- --baseline`
  reports `level 1-1 cleared: true`, so enemies spawn, take damage, die and drop
  coins at this commit. Two modes, one build, opposite results.

  **The cause.** T58 made the tutorial gate the first thing a new player meets —
  faithful to `:7153`, which holds spawning until the player has moved *and*
  fired — and fixed `--baseline` to move first (`look.mjs:721-731`, with the
  reason at the site). **`--sound-sweep` never got the same fix.** It fires from
  iteration 0 but only moves at iteration 5 of 10 (`look.mjs:511`), and its
  `clear()` at `:495` wipes the queue before any of that, so most of its window
  is spent on a level that is deliberately not spawning. Each `page.goto` gets a
  fresh profile, so `tutorialOn` defaults true every pass — `Tutorial` is in the
  fired list, which is the tell.

  **Do not read the 39 → 25 drop as a regression, and do not "fix" it by
  wiring anything.** This is the audit's *reach and wiring are separate
  questions* verbatim, the same misreading that made ten fully-wired names look
  unwired in T40.

  *Fix shape: move before firing in the sweep loop, or complete the gate once
  after the level loads and clear the queue after it. Lift: trivial. Not done in
  the pass that found it, which was docs-only.*

  > **"Sound coverage" is two permanently unrelated numbers in this project.**
  > This one — the sweep's **trigger-firing count**, now **50–51 of 67** (T80) —
  > measures how many sound *names* actually play when the game is driven. `PROGRESS.md`'s **Sound and music triggers
  > 0/115** counts `[Embed]` MP3 *wrapper classes* (`sndBall.as` is 15 lines
  > around one file) and, since **L5 decided no change (T82), stays 0/115
  > permanently**. Neither can ever move the other, and
  > a fix to one will not change the other's figure. Conflating them cost a task
  > prompt once; the note is here so it costs nothing again.

### L4 — `npm run look` leaves its vite server running — **FIXED (T64)**

**Two causes, both closed, and the second was the dangerous one.**

1. **The leak.** vite was spawned through `npx` with `shell: true`, so
   `child.kill()` signalled the shell and the vite grandchild survived. Now
   spawned directly (`process.execPath` + `vite/bin/vite.js`), the same fix
   `smoke.mjs` already carried and documents at its own spawn site.
2. **The silent answer.** `serverUp()` only fetched the URL, and a foreign
   server answers 200 — so an occupied `--strictPort` meant our vite bound
   nothing, the stranger replied, and the run captured normal-looking frames
   from an unknown build. `look.mjs` now **binds the port first** and refuses
   with a hard error naming the port and how to find the owner. Binding is the
   only test that distinguishes "answering" from "ours".

**Both halves driven, not assumed:** a clean `--ui` run now leaves no listener
where the identical run leaked before, and an occupied port exits 1 with the
error instead of producing frames.

*Kept below as the record of how it presented, because "the instrument was
believed" is the recurring shape and this is the clearest instance of it.*

- [x] **Found the same pass.** After `--ui` exited normally, port 5199 was still
      held by a `vite --port 5199 --strictPort` child. Because the harness uses
      `--strictPort`, one orphan blocks **every subsequent run** rather than
      silently moving to another port.

  Two orphans were found alive at the start of this pass, from the previous
  session — one on 5173 (`npm run dev`) and one on 5199 dated **22:59**, i.e.
  older than T58's `GameplayScene.ts` change at 23:11. Anything measured against
  that process would have been a stale-build reading of exactly the kind the
  audit's *stale-server window* section documents, and the strictPort collision
  is the only reason it was noticed.

  **Recurred in T63, one pass after being written down.** A `--tutorial` run
  leaked 5199 at 03:25:26; the `--baseline` run at 03:32 — after the
  `tutorialArt.ts` fix at ~03:29 — produced frames anyway rather than failing on
  the taken port, so it may have been answered by a server older than the change
  being verified. The frames were discarded and the run repeated on a clean
  server. **Nothing warned; the run looked completely normal.** That is the whole
  hazard: a taken `--strictPort` does not announce itself in the output.

  *Fix shape: kill the child on exit, including on throw. Lift: trivial.
  Meanwhile: check the port before trusting any `look` run — and check it
  **before** the run, because afterwards you cannot tell which server answered.*

### L8 — the sweep aims at a screen constant — **FIXED (T69), and it was two bugs**

**Before: 25 of 67, landing evidence 0/6. After: 41–42 of 67, landing evidence
6/6.** Two consecutive runs gave 41 and 42 (the second also caught
`ReflectBullet`), so the honest figure is a **±1 band around 41**, not a single
number.

**The aim fix alone was not enough, and the measurement said so.** Centring the
orbit on `__arena.tank.screen` gave 32 on one run and 27 on the next — and the
good run's entire gain arrived at the **Magic Cannon** pairing, which *homes*
and lands without being aimed. A fixed-radius ring in a sparse arena connects
by luck. So the harness now aims at a **live enemy** from `__arena.enemies`,
cycling through them so the "spray in all directions" intent survives, and
falls back to the tank-centred orbit only when the arena is empty (which is
what still exercises the border sounds).

**The larger cause was not `L8` at all.** With the aim corrected the count
*still* did not move, because **T67's countdown gate had silently broken
`L3`'s fix**: `:2818`/`:2820` put `moveTank` and `tankAttack` inside the
countdown, so the sweep's move-and-fire — which ran in the first 900 ms —
satisfied nothing, the tutorial's `AimShoot` never completed, and `:7153` held
spawning for the entire run.

Measured directly rather than inferred: `__arena.enemies` was empty at every
sample, the arena read `60 LEFT` from first frame to last, the tank never left
`(320, 480)` despite a scripted `d` press — **and the sweep still reported a
perfectly plausible 27 of 67.** Waiting on `__arena.countDownDone` before
releasing play fixes it, and the same two gates were missing from the isolated
dev levels and the dedup block, which is why `peak/frame EnemySquish` had been
reporting `0` for a sound that demonstrably fired: nothing had ever died there
either. It now reads `2`.

**Instrument note worth keeping.** The first version of the tracking log used
`(640, 400)` as its fallback centre — which is also exactly where the tank
starts, so a silently-failed read was indistinguishable from a correct one and
produced a convincing `640..171`. The fallback is now off-centre and the count
of *live* reads is reported beside the coordinates: `10/10 live`.

*Original entry kept below.*

#### The original diagnosis

- [ ] **Found by fixing `L3` and watching the count refuse to move.** With the
      spawn gate open and enemies demonstrably on screen, the sweep still lands
      **zero** hits: no `ImpactBullet`, `ImpactCake`, `ImpactMagic`,
      `ImpactGummyBear` or `ImpactLaser`, no `EnemySquish`, no `Coin`, no
      `TankDamaged`, and the arena reads `60 LEFT` from first frame to last.

  **The cause, from a frame.** The orbit at `look.mjs:520` sweeps the cursor
  around **(640, 400) — a screen-space constant** — while the tank is wherever
  the camera left it. After the gate-satisfying move it sits near **x 900**, so
  the crosshair circles empty ground a couple of hundred units to its left and
  every round flies into it. Visible directly: crosshair up-left of the tank,
  bullets in flight toward nothing, enemies elsewhere on screen.

  **Same family as `L3` and worth naming as such:** the harness encodes a
  screen constant that stopped being true, and reports a clean number anyway.
  The AS3-side version of this is the whole *constants-that-became-variables*
  section; this is the instrument's own instance of it.

  *Fix shape: aim relative to the tank rather than to the viewport centre, or
  drive the tank into the enemies so contact resolves — the tank's screen
  position is not currently exposed to the harness, which is the one thing that
  makes this more than a two-line change. Needs a deliberate choice about what a
  sound sweep should guarantee, so it is not a tail-end job.*

  > **The 39 is not the target, and never was a floor.** It was measured on a
  > harness carrying at least these two defects, so it recorded whatever
  > combination of luck and timing that build happened to produce. Treat the
  > next post-`L8` number as the first trustworthy one, and do not "restore" 39.

### M3 — UI redesign — **CLOSED (T92-T96)**

Two things were bundled in one request and they were independent — the same
shape as `BossCollision` and `L1`, where a filed item hid two problems.

**The functional half, fixed first and alone (T92).** "Weapons in the shop are
cut off and cannot all be purchased" was `justify-content: center` on `.screen`
(`global.css`): a centred flex container pushes content taller than itself out of
*both* ends, and the top half is unreachable because `scrollTop` cannot go
negative. `.screen--shop` already had `overflow-y: auto` and a sticky header —
symptom treatment, defeated by the rule above.

It affected **six screens, not the one reported**. Four were visible in frames;
Bestiary and Enemies were found by the reachability probe added to `--ui`, which
measures children above the scroll origin rather than counting DOM text. Fixed
with `justify-content: safe center` plus `overflow-y`/`min-height: 0` on the
shared rule, and pinned as an invariant over every page-level selector so a
per-screen fix cannot pass.

**The visual half (T93-T96).** `#12161f` → `#F0EEE6` warm neutral; gold accent →
clay `#CC785C`; a 10-step type scale and a 4px spacing scale.

**Colour had three homes, and each sweep only found one of them:**

| Family | Count | Why the previous grep missed it |
|---|---|---|
| Hex literals | 24 | — (found in the audit) |
| `rgb(255 255 255 / N%)` | 34 | space-separated; the audit grepped the comma form |
| Arbitrary-channel tints | 19 | `rgb(255 209 102 / 12%)` — the *retired* gold, baked inline |

Plus `--surface`, **referenced six times and never defined**, so its fallback
did all the work silently. Now: zero literal colours outside `:root`, bar two
arena scrims and two shadows.

**The recurring fault worth carrying:** `opacity` used as a disabled state. It
dims against a dark panel and disappears against bone. It hid the shop's
unaffordable prices and the locked achievements — and a price you cannot afford
still has to be readable.

**Structural findings, not colour choices:** screens had to become *opaque*
(they render over the live canvas, and dark-on-dark is invisible), and the reload
widget needed a surface of its own — it was the only HUD element without one,
which is survivable as white-on-dark and not otherwise, because the arena is
nine world themes and no single colour is legible against all of them.

**Deliberately untouched:** the 33 `0x......` canvas colours (world art, not
chrome), the results overlay (already light cards over a scrim), and phone
horizontal overflow (desktop-first). The 640x400 backdrop patch remains
undiagnosed and unrelated — see `HANDOFF.md`.

---

### M2 — Shop stat previews — **CLOSED (T90 extraction, T91 render)**

**Filed as "shop descriptions and stat previews (data absent too), small + an
unscoped extraction". Three of those four claims were wrong.**

- **There are no descriptions.** `ScreenUpgrades.as` has no description table.
  What the shop shows is *computed stat previews*, assembled inline.

  > **Corrected T99.** True of `ScreenUpgrades.as`, and wrong about the game.
  > **28 per-upgrade descriptions exist** — 4 misc, 12 primary, 12 secondary —
  > in `ButtonUpgradeInfo.as:34-160`, the *tooltip trigger* rather than the
  > screen. They are now extracted by `scripts/gen-upgrade-descriptions.mjs`
  > and shown on hover. The original finding stands as far as it looked; the
  > mistake was stating a whole-game absence from a single-file sweep, which is
  > the "say by what method" rule exactly.


- **The data is not absent.** The numbers are the upgrade stat tracks
  `gen-upgrades.mjs` already extracts into `upgradeData.ts`. What was missing is
  the **formatting**.
- **Not small.** 158 assignments across `:783`-`:1597`, ~815 lines of a
  1856-line class, 21 distinct labels, 28 upgrades.
- **Not `J`.** See above; that letter pointed at a closed group.

**Pass A(a) — the extraction — is done and verified.**
`scripts/lib/parse-upgrade-previews.mjs` reads the block and yields, per line:
category, upgrade index, slot, label, track, transform, read offsets and units.
`scripts/parse-upgrade-previews.test.mjs` pins **all 21 labels** against the AS3
line each was read from, plus the three corrections below.

**The model, which is more than the flat "158 tuples" this was scoped as:**

| Piece | Detail |
|---|---|
| Transforms | **6**: `raw`, `perSecond` (×30), `percent`, `seconds1` (÷30, 1dp), `seconds2` (÷30, 2dp), `damagePerSecond` (×30, 2dp) |
| Index offsets | **3**: `[level-1]` current, `[level]` next, `[level+1]` next-when-unowned — and which pair applies is `statsIncludeLevelZero` (`gen-upgrades.mjs:12-22`, `Tank.as:64`), already solved |
| Attribution | per-upgrade **override** inside `if(selectedX == N)`, or the category **default** in the `else` |
| Slots | 5 lines per upgrade; `""` clears an unused one, which the renderer needs |

**Three defects hand-verification caught**, each of which left a plausible-looking
parser: measure-then-set scaffolding (`:857` assigns a bare label so `:858` can
size a column) being read as a display line; the `[level+1]` form (4 uses)
unmodelled; and category defaults misread as 10 unattributed upgrades. All three
are pinned.

**Pass A(b) — the render — landed T91. M2 is closed.**

`upgrades/upgradePreview.ts` applies the six transforms and picks the index;
`ShopCatalogue.upgrades[].previews` carries all five lines (blanks included, so
a cleared slot cannot leave the previous upgrade's text on screen);
`UpgradesScreen.tsx` renders them.

**Two off-by-ones the hand-computed expectations caught**, neither of which any
"it rendered something" test would have:

- **Track indices are one lower in the port.** `upgradeArray<Name>` is
  `[prices, ...tracks]` and `UpgradeSpec.stats` drops prices, so emitting the
  AS3 number made `"Damage:"` read the *explosion* track — the Cannon printed
  30 where it deals 7.
- **`unitUnowned` was dead.** It was detected by looking for a `[level + 1]`
  read, which only the misc section has, so the field carried the Shield quirk
  in name only. Now found by comparing units across branches, restricted to
  single-value rows (a two-value row concatenates the unit twice and looked like
  an anomaly).

**One divergence recorded rather than corrected:** `:1445` prints the Shield's
duration as `" HP"` when unowned where `:1252`/`:1332` say `" Sec"`. A typo in
the original, reproduced.

---

### M4 — Projectile art — **CLOSED (T84 mapping, T85 render, T87/T98 frames)**

> **Renumbered T100.** This was filed as `M1`, which was already taken by
> the tank damage tint at `:600`. Two live entries under one id is the kind
> of record defect that survives because both rows read fine on their own —
> it only bites the reader who follows a reference. `HANDOFF.md` referred to
> "`BACKLOG.md` M1" for the projectile work in three places, all of which
> pointed at the wrong section.

**The art was never missing.** All 24 weapons render as one shared circle
(`particle-dot` = `shapes/1.svg`), and the T83 audit concluded the real art
could not be located. That conclusion was wrong, and the way it was wrong is
worth keeping: **a failed lookup was read as absence.** `shapes/251.svg` does
not exist, so `BulletRocket`'s art looked gone — but `symbol251` is a
**DefineSprite** id and JPEXS keys its exports by **DefineShape** id. Sprite 251
places shape 250, and `250.svg` has been on disk the whole time.

Two things went unchecked in that audit: the SWF itself ships in the repo
(`SWFimported/scripts/_assets/assets.swf`, the exact file every `[Embed]`
names), and it is uncompressed, so the tag table walks with plain reads — no
JPEXS, no GUI, no network.

**Pass (a) — the mapping, landed T84, no visual change.**

- `scripts/gen-sprite-shapes.mjs` walks the tag table and emits
  `scripts/lib/sprite-shapes.mjs`: 474 sprites, their `frameCount`, and the
  character ids each places. Precedent for parsing a binary in-repo rather than
  shelling out: `scripts/lib/mp3-probe.mjs`.
- `sync-assets.mjs` now **derives** its projectile shape ids via
  `shapeIdsForSprites(PROJECTILE_SPRITES)` instead of hand-listing 43 numbers.
  The hand-maintained part is the 26 *sprite* ids, each checkable against its
  class's `[Embed]`; the shapes underneath cannot drift.
- Verified on disk: `src/assets/shapes/` went 295 → **338**, exactly +43, none
  missing.

**Facts the mapping settled, each pinned in `gen-sprite-shapes.test.mjs`:**

| | |
|---|---|
| Cannon / MiniGun / Big Cannon / Shotgun | **all place shape 215** — the port's "primaries look identical" is *faithful* for these four, and giving them distinct art would invent a difference the AS3 lacks |
| The three grenades | **1180 / 1178 / 1176, distinct** — so the port's single tint at `GameplayScene.ts:2269` *is* an infidelity |
| `BulletBomb` | 10 shapes across **16 frames** — two different numbers, both pinned, because conflating them is the mistake this data invites |
| `ObjectMine` | 2 shapes across **30 frames** |
| Tag walk vs JPEXS | both find **1015** shapes — an independent cross-check that the walk did not stop early |

**Pass (b) — rendering, landed T85.** Every projectile now draws its own art.

- `scripts/gen-projectile-art.mjs` → `src/assets/projectileArt.ts`: per class, a
  texture key and a **display size in design units**. 26 classes, 23 distinct
  textures (one representative shape each; the other 20 shapes are animation
  frames pass (c) will use, synced but not preloaded).
- `Bullet.ts` looks the class up instead of hard-coding `particle-dot`, and the
  blanket `setTint(0xffe9a8)` is gone. The `Object*` sites are wired too —
  `Mine.ts`, and the grenade/ball/hazard spawns in `GameplayScene`.

**Size comes from the SWF, not from `bulletRadius`, and the measurement is why.**
Shape 215's four sharers are distinguished *only* by a non-uniform placement
matrix — Cannon 0.5×1.333, Big Cannon 0.75×2, MiniGun and Shotgun 1×1 — which
against a 16×3 authored shape gives **8×4, 12×6, 16×3, 16×3**. The port's old
uniform `radius * 4` square could not express that and drew three of the four
identically. Collision radius is untouched; visual and hit size were always
separate quantities.

**The grenade infidelity is closed** — 1180/1178/1176 now render as three
distinct grenades (driven: green vs cyan), replacing one shared tint.

**Pass (c) — partly landed T87, and the brief's premise was wrong for 4 of 7.**

Two independent checks agree on the split. No sprite carries a `stop()` frame
action (`DoAction = 0` for all seven), so a Flash clip loops at 30 fps *unless
the AS3 pins it* — and four are pinned:

| Class | AS3 | What it is |
|---|---|---|
| `BulletFire` | `:3798` `gotoAndStop(round(random*2+1))` | random 1-of-3 at spawn |
| `BulletGummyBear` | `:3828`, `:1953`, `:1974`, `:2003` | the bounce stage |
| `ObjectGroundIce` | `:1806` same random call | random 1-of-3 at spawn |
| `ObjectGroundLava` | `:1806` | random 1-of-3 at spawn |

**Animating those would invent motion the original does not have.** All four are
wired as *selection* instead (`PROJECTILE_VARIANTS`), which is done.

`BulletGummyBear` was checked before wiring, because a colour that means nothing
is worse than no colour: the AS3 scales its damage **x1 / x3 / x4** by bounce
stage (`:1954`, `:1958`, `:1996`, `:1999`) and the port **already implements it
correctly** (`foodRounds.ts:45-56`, written back to `motion` at
`Bullet.ts:387`). So this was a visual-only gap and the frame now follows the
same stage the damage does.

**Pass (c) completed T98 — the two-layer composites.** `BulletBomb` (static body
226 under a 16-frame ping-pong 227→235→228) and `ObjectMine` (base 702 with 1142
over it for frames 16-30) each get a companion sprite, `entities/ProjectileOverlay.ts`,
which follows its owner and cycles its own texture. Neither consults game state:
both loop from spawn at 30fps.

**`BulletBomb` is not a fuse countdown**, which is the reading its frames invite.
The countdown is a *separate* `WarningTimedBomb` indicator driven by
`bombTimer / bombTimerMax` (`:2531`, `:2542`), already wired. **`ObjectMine` is a
plain idle blink** — the AS3 contains no frame control for a mine anywhere, and
nothing touches the instance beyond position, radius, damage and explosion
radius, so there is no armed or triggered state to follow. It replaced a 700ms
alpha yoyo that faded the *whole* mine, which the original never does.

**No orphans left.** 41 textures preloaded, every one drawn, pinned by a test
that fails if one stops being. The two shapes still unused are `BulletLaser`'s
second and third frames — **declined, not deferred**: the port draws the beam as
a line primitive, so there is no layer to animate, and the current rendering is
faithful in effect. Revisit only with `NineSlice` and the frame-widening
together (see the T87 assessment).

**M4 is closed.**

**Adjacent, not taken:** the same mapping resolves all 474 sprites, so enemies,
UI and props are one call away. That is a much larger commitment and the
bullet-only slice is the disciplined stop.

---

### L10 — Modal dialogs — **SCOPED AND DECLINED (T83). Do not build.**

Scoped as "a self-contained modal system (`WindowOk`, `ButtonWindow`,
`ButtonConfirm`, `ButtonCancel`, 512 lines) wired to unguarded destructive
actions". **Every part of that framing is wrong**, and the four classes are not
one system — they are two unrelated things.

**1. `ButtonConfirm`/`ButtonCancel` are already ported.** Their only AS3 users
are `ButtonGameSave.as:16` and `:60` — the save-slot delete prompt — and the
port already implements it, in-row, citing the same source: `SaveSlotScreen.tsx:28-31`
carries the `confirming` row state and `:56-79` renders Confirm/Cancel, with
`makePage2` (`:373`) named. The AS3 **flips the row into a second page rather
than opening a dialog**, so a modal here would not just duplicate an existing
confirmation path, it would be *less* faithful than what ships.

**2. `WindowOk` is not a confirmation dialog at all.** It is a one-button
informational notice with exactly two `type`s and a `moreWindowsArray` queue so
several can show in sequence (`WindowOk.as:94`, `:112-113`):

- **"Choose Difficulty"** (`:87`, `:149`) — already handled, differently: the
  port highlights the difficulty picker instead (`difficultyHintPending` →
  `difficulty--hint`, `LevelSelectScreen.tsx:126-131`).
- **"Upgrade Limit"** (`:66`, `:124-146`) — genuinely unported, and **blocked**.
  Its text announces a *mechanic*: *"The upgrade(s) will be temporarily
  downgraded to fit the level's upgrade limit."* The port has no upgrade-limit
  mechanic (no match for `upgradeLimit`/`upgradeCap`/`levelLimit` in `src/`).

So the only real gap is downstream of an unported gameplay subsystem — **the
BossCollision shape again.** Building the notice to unlock the modal would be
backwards; the cap mechanic is the thing with player value, and the notice falls
out of it. Also note the notice carries a "Don't show this message again"
checkbox bound to `ScreenOptions.optionWindowULOn`, so it needs a seventh
gameplay option too.

**Re-filed as: "Port per-level upgrade caps"** — not in the active queue. It
needs `ScreenLevelSelect.as:1006-1019` (the over-limit test across primaries,
secondaries and misc), the temporary downgrade itself, and only then the notice.

---

### L9 — The permanently-zero categories, labelled — **DONE (T83)**

A consequence of `L5`'s decision, written down where it will be read. **205 rows
in `PROGRESS.md` can never move**, and nothing said so: a reader arriving at
`Achievements 0/38` had no way to tell "nobody has started" from "there is
nothing here".

Measured (stub = contains `[Embed(` **and** ≤15 lines; method stated because the
rule misclassifies anything longer, e.g. the two 24-line font wrappers):

| Category | Rows | Real classes | Where the logic actually lives |
|---|---|---|---|
| **Achievements** | 0/38 | **1** — `Achievement.as`, 120 lines, a roll-over badge MovieClip | `achievements/achievementData.ts`, `achievementState.ts`, `achievementListing.ts`; `ScreenAchievements` wired |
| **Tutorial** | 0/25 | **0** | `PartTutorial`'s port at `src/game/tutorial/` |
| **Background props** | 0/27 | **0** | `levels/backgroundProps.ts` (the `D1` decision) + `levels/propArt.ts` |
| Sound *(already labelled)* | 0/115 | 0 | `assets/audioManifest.ts` + `audio/SoundManager.ts` |

In every case **the subsystem is ported and wired**; the rows are the *assets*,
which this port loads through `src/assets/registry.ts` rather than as classes.

Labelled at `gen-progress.mjs` — the category `note:` fields and a new section in
the file's own preamble — **not by hand in `PROGRESS.md`**, which regeneration
reverts and `progress:check` then fails. Same lesson as `L6`.

**This is bookkeeping, not a reclassification.** Marking them `not applicable`
would move the headline number, which is exactly what `L5` decided against.

---

### L5–L7 — PROGRESS.md status mechanics, deferred from T61

Three decisions surfaced by the T61 status-accuracy pass and deliberately **not
acted on** there. Logged here because a decision that exists only in a session
transcript is not findable, which is the same failure as a count without a list.

- [x] **L5 — DECIDED (T82): no change. The denominator and the stub rule stay
      as they are.** Closed as a settled judgment call, **not as "fixed"** —
      nothing was implemented and nothing is owed.

      **The decision.** Both alternatives were measured and both were rejected in
      favour of the status quo. The reasoning is a property of *when* we are, not
      of which definition is better: the shape-based rule is more internally
      honest about how much of the code that matters is ported, but the current
      count is the one this project has reported throughout, and switching now
      would **move the headline number without any new porting behind it**. That
      discontinuity mid-project is worse than the current definition's
      imprecision. A metric that jumps for definitional reasons stops being
      readable as progress, which is the only thing it is for.

      **The measurements, kept so the reasoning is traceable rather than
      re-derived.** Method: `grep -rl '\[Embed('` with no limit, plus a full
      line-count distribution — not a truncated search.

      | | Files | Denominator | Headline |
      |---|---|---|---|
      | **Current rule (kept)** | — | **556** | **6.8%** (38/556) |
      | Naive `[Embed(` test | 517 contain it | ~39 | ~85% |
      | Shape-based stub test | 471 are pure stubs — 361 at exactly 15 lines, 110 at 13 | ~85 | ~39% |

      The 46-file gap between 517 and 471 is why the naive test was never the
      option: those are **real classes that merely contain an `[Embed(`**, up to
      `ButtonGameSave.as` at 547 lines and 17 functions. A bare `[Embed(` test
      would exclude them from the metric permanently.

      **The entry's own figure was wrong and is superseded.** It claimed the
      denominator would drop *"~557 → ~353"*. That reconciles with neither 517
      nor 471 — it implies marking ~204 rows — and no derivation for it was
      found. Do not reuse it.

      **`gen-progress.mjs:256` could still derive the classification** — it
      already reads each file, for a line count. That remains true and is not the
      reason this is closed; the mechanism was never the hard part. The metric
      question was, and it is answered: **no change.**

      **The Sound category is the consequence to be clear about.** Its `0/115`
      counts `[Embed]` MP3 *wrapper classes*, so under this decision it **stays
      at 0/115 permanently** — those 115 rows are stubs the port will never
      write, and nothing will ever move them. That is the accepted cost of
      keeping the denominator. It is **not** the sweep's trigger-firing count
      (50–51 of 67), which moves independently and has nothing to do with L5.
      Two unrelated numbers, one word — see the box at L3.

      *Revisit only if the definition itself is being reopened deliberately — not
      as a side effect of touching the generator.*
- [x] **L6 — done (T81).** Filed as a self-contradiction between the two
      generated prose blocks. It read as one; the fault underneath was
      **misattribution**, and fixing it as a contradiction would have invited
      deleting the correct half.

      Wave spawning was never `ScreenGame`'s. Measured: **6** case-insensitive
      `spawn` hits in `ScreenGame.as`, *all four identifiers statics*
      (`bossAmountSpawned`, `bossAmountSpawnedFull`, `multiplierSpawnRateHard`,
      `multiplierSpawnRateMedium`), against **109** in `PartGameArea.as`. The
      block credited `ScreenGame` with the subsystem next door, which
      `PartGameArea`'s list two bullets below correctly records as substantially
      ported.

      **The static count was inverted too**, and only surfaced because the fix
      required naming what actually remains: of `ScreenGame`'s **131**
      `public static var`s, **107 are extracted** (80 enemy stat/strength/weakness
      tables + 27 per-world arrays) and **24** remain — live run state, not the
      *"~90 remaining"* the block claimed. A number nobody had recomputed since
      the tables landed.

      Fixed at `gen-progress.mjs:453-467` and regenerated; `PartGameArea`'s prose
      untouched. `progress:check` green.
- [x] **L7(a) — done (T81). The premise was wrong for a measurable share.** The
      entry says these classes have *"no citation naming the AS3 class"*. Matching
      `<Name>.as` across `src/` — T61's own rule — finds **30** distinct AS3
      classes cited, **14** of them still `not started`; minus `PartGameArea`,
      `ScreenGame` and `Main`, which are `not started` deliberately, that left
      **11 candidates**. So this half was never a decision. It was stale data.

      **Graded per class rather than flipped as a block, and 6 of the 11 did not
      survive the grading:**

      - **Flipped (5)** — a production module ports named behaviour *and* the
        class's job is done in the running game: `PartAchievements`
        (`toastQueue.ts:2`, `:262-274`/`:112-132`), `PartInterface` (12
        production files, incl. `countdownPanel.ts`, `reloadBars.ts`),
        `ButtonEquipSlot` (`loadout.ts:59`, `:114` — `onPressHandler`/
        `onReleaseHandler`), `ButtonGameSave` (`slotSummary.ts:4`, `:215-266`),
        `ButtonLevelSelect` (`ported`, not `tested` — the grid renders, but the
        tests cover the unlock rule rather than the button).
      - **Left `not started` (6), with the reason.** `BackgroundLevelSelect`,
        `LoadingBall`, `LoadingGlow`, `LoadingRing` are cited only in a
        **`Port target:` header, which declares intent, not completion** — and
        `LoadingScreen.tsx:5` says outright that it names the boot stage *"rather
        than showing an anonymous spinner"*, so the three spinner graphics are
        deliberately not ported. `ButtonPlayLevel` and `ButtonUpgrades` are cited
        in `onboarding/mainFlags.ts` as **`Main`'s hint-flag identifiers**; one
        side-effect (`ButtonPlayLevel.as:76-78`) is reproduced, the buttons are
        not.

      **A `Port target:` line is not a port citation.** That is the reusable
      distinction, and it is what stopped this being a flip of 11.

      Effect: **33 → 38 of 556 started, 13 → 17 verified** (5.9% → 6.8%).

- [x] **L7(b) — DEFERRED alongside L5 (T82). Not processed, and not owed.**
      `ScreenMenu`, `ImageEnemy`, `ButtonSecondary`, `ButtonWeapon` and the rest
      have their behaviour in a differently-named port module with **no** citation
      naming the AS3 class (method: `<Name>.as` and bare-name match over `src/`).
      Relaxing the rule for them is a judgment call, not work.

      **It closes with L5 because it was always the other half of one decision.**
      L5 shrinks the denominator, L7(b) grows the numerator; they were coupled so
      the headline figure would move once rather than twice. L5 decided **no
      change**, so moving this half alone would produce exactly the discontinuity
      that decision exists to avoid — a jump in the number with no new porting
      behind it.

      Note the asymmetry with **L7(a)**, which *was* processed: those 11 classes
      were **stale data** under the existing rule, so correcting them changed the
      number for a real reason. This half needs the rule itself to change, which
      is the thing that is not changing.

      *Revisit only if L5's decision is revisited. Not before, and not
      independently.*

---

## Dependencies

**Every edge in the original graph has been discharged.** It is kept below,
struck through, because the sequencing advice it encoded was followed and worked
— naming a shared dependency let three weapons land on one subsystem, and
extracting the unlock rule before the world picker stopped a fourth copy
appearing. That is the reusable part, not the edges themselves.

```
~~F0 bullet bounce ────────► F2 Crazy Cheese~~                       all shipped
~~                   └─────► (fixes shipped Gummy Bear)~~            → audit C6
~~F0 ground hazards ───────► F2 Ice Ball ──► F2 Lava Ball~~          all shipped
~~F0 target selection ─────► F2 Rockets~~                            all shipped
~~F1 Grenade ──────────────► F1 Ice/Poison Grenade~~                 all shipped
~~H counters + evaluation ─► G achievement reveal pages~~            all shipped
~~G page stack ────────────► G enemy reveal pages~~                  all shipped
~~I3 extract unlock rule ──► I2 world picker~~                       done, in order
~~I1 difficulty ───────────► 2/3 of ProgressTable reachable~~        done
```

**The last edge — and it turned out not to be an edge (closed T81):**

```
~~"visible values" model ──► G medal reveal animation~~              shipped T76
~~                   └────► I2 world unlock rule~~                   never landed — A6
```

The second arrow was drawn on the assumption that both consumers wanted the
visible table. Only one did. The unlock rule deliberately stays on the earned
table (**A6**), so the model had **one** consumer, not two, and the shared
dependency this diagram existed to name was not shared. Worth keeping as the
counter-example to the diagram's own success story: naming a shared dependency
pays when the dependency is real, and costs a wrong sequencing plan when it is
assumed.

Still one model change for two consumers, and the seam is already named
(`levelUnlock.ts:19-20`, `ProgressView` at `:117`).

Three things that look like dependencies and are not:

- **Status timers block nothing**, and have not since `statusEffects.ts` shipped
  with the Poison and Timed Bomb cannons. This entry twice flagged CLAUDE.md for
  still naming the timer as the blocker for Ice Grenade / Poison Grenade /
  Icicles / Poison Spikes. **Re-checked in the T107 docs pass: CLAUDE.md does not
  say that** — it names only the Timed Bomb and Poison *cannons*, and records
  that the prediction held and `statusEffects.ts` is the timer. The flag outlived
  the thing it flagged; both copies are retired rather than restated a third
  time.
- **Save slots (K) depend on nothing** — and are now closed.
- **L3 and L4 are harness items, not gameplay ones.** They gate *measurement*,
  not features. Fix them before trusting the next sound number, not before
  shipping anything.

## Suggested sequence

**The original sequence is complete.** Steps 1–4 all landed, in roughly the order
given; only the tail of step 5 remains. Struck through for the record:

1. ~~**I3** → **I1** → **I2** + the visible-values model, picking up **L2**.~~
   Done, in that order. The visible-values model was deferred out of I2, built
   in T76 and closed in T81 — and the edge back to I2 was never taken, because
   the unlock rule stays on the earned table (**A6**).
2. ~~**J** equip slots~~ — done. Not self-contained after all: it changed three
   gameplay rules as well as adding a UI.
3. ~~**H** counters, the eleven `temp*` flags, evaluation → **G** page stack and
   both reveal kinds.~~ Done, H before G as advised.
4. ~~**F** secondaries.~~ Done, all twelve, F0 subsystems included.
5. ~~**K** save slots~~ done; ~~**L1** the sync prune~~ done (T77).

### What is actually left in this document

Small, and none of it blocks anything else:

| Item | What | Lift |
|---|---|---|
| ~~**G / I2**~~ | ~~The visible-values model — one change, two consumers~~ — **closed T81.** Built in T76; the "one change, two consumers" premise was wrong, because the two consumers are deliberately split (**A6**). Three stale comments corrected | done |
| ~~**M2**~~ | ~~J — shop stat previews~~ — **closed.** Extraction T90, render T91. Not descriptions (none exist), data was already present, and the block is 815 AS3 lines — the row's original framing was wrong on all three | done |
| ~~**L1**~~ | ~~`assets:sync` never prunes~~ — **fixed T77.** `scripts/lib/asset-prune.mjs` derives what to delete from **exactly** the inputs the copy loops use, so the authored overlay survives by construction rather than by an exemption someone maintains. Driven: 0 pruned on a clean tree; a planted orphan and a de-curated shape both caught, with `--dry-run` deleting neither. The scope was narrower than filed — `registry.test.ts:218` already caught 2 of the 3 listed failure modes | done |
| ~~**L3**~~ | ~~`--sound-sweep` never satisfies the tutorial gate~~ — **fixed T65**; count unmoved, see L8 | done |
| ~~**L8**~~ | ~~The sweep aims at a screen constant~~ — **fixed T69**; 25 → 41–42 of 67, landing evidence 0/6 → 6/6 | done |
| **Sound: the silent names** | **`HANDOFF.md` §5 owns the count and the per-name breakdown; this row deliberately does not restate them.** It used to, and it drifted — `47–48` against §5's `50–51`, and a population of `14` against §5's `16`, which count the same names under different rules. What is durable and belongs here: the sweep drives a *defeat*, so `Award1-3` fire on a **win** and are confirmed by `--medals` instead — the sweep figure and the trigger-coverage figure have come apart and **neither is wrong**. `Burning`/`FlameThrower` **wired T80**. `ImpactCrazyCheese` is a permanent orphan — never wire it. `BossCollision` is re-filed as the enemy-separation row below | mostly blocked, not owed |
| **Port enemy-enemy separation** | `PartGameArea.as:5174-5221` — the pair loop that pushes two overlapping enemies apart by their relative mass (`:5199-5207` into `pushVelX/Y`, decayed at `:5365-5366`, integrated at `:5370-5385`, gated on `safetyDistance` at `:3354`/`:3358`). **The port has no enemy-enemy collision at all, so enemies interpenetrate on every one of the 405 levels.** That is the reason to build it: it is a visible fidelity gap with player value on its own. The `BossCollision` sound (`:5197`, boss-on-boss only) is a *byproduct* that falls out once the pair loop exists — **building the subsystem in order to unlock one sound would be backwards**, which is why this is filed as movement work and the sound is not listed separately any more | subsystem — touches enemy movement game-wide; **not in the active queue** |
| ~~**Achievement toasts cover the results panel**~~ | **Fixed T79.** The description was wrong twice: they *were* offset from one another, and the count was not the mechanism — two **centred** overlays were. AS3-derived after all: one toast at a time from a queue (`PartAchievements.as:265`, `:116-117`), top right (`:125-126`). Unblocked the `Achievement` sound (`:120`) | done |
| ~~**L4**~~ | ~~`npm run look` leaves its vite server alive~~ — **fixed T64** | done |
| ~~**L5**~~ | ~~517 stub statuses hand-set where `gen-progress.mjs:256` could derive them~~ — **decided T82: no change.** Both alternatives measured (naive `[Embed(` → ~39 denominator; shape-based → ~85, ~39%); the **556** denominator stays, because switching would move the headline without new porting behind it. The entry's own "~557 → ~353" was wrong and is superseded | decided — no change |
| ~~**L6**~~ | ~~`ScreenGame`/`PartGameArea` generated prose self-contradicts~~ — **done T81.** Not a contradiction but a **misattribution**: `ScreenGame` was credited with `PartGameArea`'s wave spawning (6 static hits vs 109). Fixing it exposed a second inverted number — 107 of 131 statics extracted, not "~90 remaining" | done |
| ~~**L7(a)** / **L7(b)**~~ | ~~**(a)** 11 candidates re-graded, 5 flipped, 6 left with reasons — **done T81**; a `Port target:` header is not a port citation. **(b)** the uncited remainder — **deferred T82** alongside L5, since the two were one decision and L5 chose no change~~ | (a) done · (b) deferred with L5 |
| **F4** | `secondaries.ts`'s header still says "Scope: Mine only" | trivial |
| ~~**Boss life indicator**~~ | ~~radial HP wipe under each boss~~ — **shipped T106.** Faithful port of `PartInterface.handleLifeIndicators` (`:872-995`), in-combat and Boss-mode only. The roster-icon and low-HP-opacity variants were scoped and **not built** — neither has any AS3 basis | shipped |
| ~~**A9**~~ | ~~Boss rows draw boss art in roster previews~~ — **decided T105: keep.** The AS3 draws ordinary enemy art (`PartInfoText.as:249`/`:271`, `ImageEnemy.as:57-145`); this port draws the boss clip because a boss row that looks like every other row buries what the preview is for. Recorded as divergence `A9` **because it reads as a forgotten level-character strip** | decided — no change |
| ~~**M6**~~ | ~~Level Guide — 912 lines / 5 classes~~ — **CLOSED T102.** (a)-(d) shipped; **(e) closed by decision, divergence `A8`** — not pending. `selectFromLevelGuide` and `canSelectFromLevelGuide` are deliberately not reproduced: this port's click-to-start level select is an intentional divergence, so porting them would mean building a selection step that contradicts the interaction model rather than completing it. The filing was wrong on four counts: **8** classes not 5, **951** lines not 912, **17** files reference it not 5, and the widget lives on the **shop**, not level select | closed |
| ~~**M5**~~ | ~~PartInfoText — the hover panel~~ — **CLOSED T104.** `infoTextSites.ts` reads **9 wired / 4 redundant / 7 no-consumer / 0 deferred = 20**: every site with a live consumer is wired, and nothing waits on unbuilt work. Shop rows, achievement cells, bestiary badges, the next-level preview, the Level Guide's four (T102) and the achievement reveal icon (T104). The "three dependencies outstanding" this row used to claim resolved as **decisions, not builds** — the Level Guide shipped, and `ImageEnemy.as:174`/`:178` became `no-consumer` behind `A8`. **One AS3 branch stays unported behind them:** `addStrengthsAndWeaknessIcons`' `"Normal"` mode (`:446-453`). Detail in `HANDOFF.md` §5 | closed |

**Read this next to `docs/HANDOFF.md` §5, not instead of it.** This document
covers what was visible when the enemies landed; **§5 is the live queue, and this
paragraph deliberately no longer duplicates it.** The four items it used to name
had every one gone stale — the `Objective` panel closed (T63), the pre-level
countdown closed (T67/T68), `D1`'s prop step decided and built, and "28
non-firing sound names" superseded twice — while this line went on listing them
as current. **Neither file is the whole remaining port**, which is the warning
this document opens with and still means.
