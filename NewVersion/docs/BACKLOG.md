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
>   screens render with content. Sound: 25 of 67 names fired in the sweep at this
>   commit, and that number needs its caveat read — see *Instrument note*.
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
- **Sound — driven, and the number moved for a reason that is not a regression.**
  `npm run look -- --sound-sweep` reports **25 of 67** at this commit, where the
  audit records 39 at `59b9756`. **The game did not regress.** A controlled
  comparison on the *same* build settles it: `npm run look -- --baseline` reports
  `level 1-1 cleared: true`, so enemies spawn, die and drop coins — while the
  sweep reports `peak/frame EnemySquish: 0`, i.e. nothing died in it at all.
  The difference is **scenario reach, not wiring** — the audit's own T40 lesson.
  The cause is identified and open as **L3** below.

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
`GameplayScene.ts:59`. CLAUDE.md still describes the per-enemy status timer as
the blocker for this group; it is not, any more.

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

      **The seam for it now exists and is named**, which is the only thing that
      changed here: `levels/levelUnlock.ts:19-20` records that the AS3 reads the
      *visible* table where the port reads the earned one, and `:53-55` says the
      difference is invisible in outcome and exists only while an animation runs.
      The parameter is already called `ProgressView` (`:117`) so a visible table
      has somewhere to arrive. That is rule 4 applied correctly — the gap is
      written where someone will be standing.

      Still shared with I2's world-unlock rule, so still one model change for
      two consumers. *Lift: small.*

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

One thread is still open and it is *not* a reach problem — the visible-vs-earned
table (I2's last bullet), which only affects an animation and is shared with G.

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
- [ ] **Still owed, and shared with G:** the rule reads the *earned* table where
      the AS3 reads the *visible* one. Recorded at `levelUnlock.ts:19-20`. One
      model change closes this and G's medal reveal together. *Lift: small.*

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
- [ ] **Still open, and wider than this entry implies:** per-upgrade description
      text and stat previews on the shop screen. Re-checked at `b2d2193` —
      `ui/screens/UpgradesScreen.tsx` has **no** description or preview rendering,
      and `upgrades/upgradeData.ts` carries **no `description` field at all**, so
      the data is absent as well as the UI. This entry called it "cosmetic;
      separable", which is true of the rendering and understates the extraction:
      the strings have to come out of `ScreenUpgrades.as` first.
      *Lift: small for the render, unknown for the extraction until someone reads
      the AS3 table. Do not scope it as pure UI.*

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

### L1 — `assets:sync` never prunes

- [ ] `scripts/sync-assets.mjs` copies and **never deletes**: there is no `rm`,
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

### L3 — `--sound-sweep` never satisfies the tutorial spawn gate

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
  > This one — the sweep's **trigger-firing count** (39 of 67 at `59b9756`,
  > unreliable pending L3) — measures how many sound *names* actually play when
  > the game is driven. `PROGRESS.md`'s **Sound and music triggers 0/115**
  > counts `[Embed]` MP3 *wrapper classes* (`sndBall.as` is 15 lines around one
  > file) and is pending **L5**, not L3. Neither can ever move the other, and a
  > fix to one will not change the other's figure. Conflating them cost a task
  > prompt once; the note is here so it costs nothing again.

### L4 — `npm run look` leaves its vite server running

- [ ] **Found the same pass.** After `--ui` exited normally, port 5199 was still
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

### L5–L7 — PROGRESS.md status mechanics, deferred from T61

Three decisions surfaced by the T61 status-accuracy pass and deliberately **not
acted on** there. Logged here because a decision that exists only in a session
transcript is not findable, which is the same failure as a count without a list.

- [ ] **L5 — stub classification could be derived, and is hand-set.** 517 of the
      643 rows are `[Embed]` asset stubs; `gen-progress.mjs:256` already reads
      each `.as` file (only to count lines), so a `[Embed(` test would classify
      all 517 mechanically. *A mechanism instead of 517 hand-set statuses — but
      it also decides the metric, so it wants the `not applicable` question
      answered first (marking them excludes them, dropping the denominator
      ~557 → ~353). Lift: small; consequence: large.*
      **The Sound category is the one to watch here:** its `0/115` counts
      `[Embed]` MP3 wrapper classes and moves only with L5. It is **not** the
      sweep's trigger-firing count, which moves only with L3 — see the box at
      L3. Two unrelated numbers, one word.
- [ ] **L6 — `ScreenGame`/`PartGameArea` status and justification are coupled,
      and the justification self-contradicts.** Both prose blocks are generated
      (`gen-progress.mjs:443-456`), and `ScreenGame`'s says *"Still untouched:
      the game loop, wave spawning"* while `PartGameArea`'s lists
      `waves/waveState.ts` as ported two bullets below. The audit records both
      classes as running the frame loop. **Needs one generator pass, not a hand
      edit** — editing PROGRESS.md alone is reverted by the next regeneration and
      fails `progress:check` in the gate. *Lift: small.*
- [ ] **L7 — ~20 absorbed classes stay uncounted under the current mapping
      rule.** `ScreenMenu`, `PartInterface`, `ImageEnemy`, `ButtonEquipSlot`,
      `ButtonSecondary`, `ButtonWeapon` and about fourteen others have their
      behaviour in a differently-named port module and no citation naming the
      AS3 class, so T61's "named port citation" rule leaves them `not started`.
      The rule was chosen to understate rather than overstate. *Relaxing it is a
      future call and changes ~20 statuses at once; not this pass's.*

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

**The one edge that survives:**

```
"visible values" model ────► G medal reveal animation
                     └─────► I2 world unlock rule (visible vs earned table)
```

Still one model change for two consumers, and the seam is already named
(`levelUnlock.ts:19-20`, `ProgressView` at `:117`).

Three things that look like dependencies and are not:

- **Status timers block nothing**, and have not since `statusEffects.ts` shipped
  with the Poison and Timed Bomb cannons. **CLAUDE.md's note naming this as the
  blocker for Ice Grenade / Poison Grenade / Icicles / Poison Spikes is stale and
  was stale when this document was first written** — it is still there. Flagged
  again rather than fixed, because CLAUDE.md is the working-rules file and
  editing it is its own deliberate act.
- **Save slots (K) depend on nothing** — and are now closed.
- **L3 and L4 are harness items, not gameplay ones.** They gate *measurement*,
  not features. Fix them before trusting the next sound number, not before
  shipping anything.

## Suggested sequence

**The original sequence is complete.** Steps 1–4 all landed, in roughly the order
given; only the tail of step 5 remains. Struck through for the record:

1. ~~**I3** → **I1** → **I2** + the visible-values model, picking up **L2**.~~
   Done, in that order — except **the visible-values model, which was deferred
   out of I2 and is now the only surviving cross-group edge.**
2. ~~**J** equip slots~~ — done. Not self-contained after all: it changed three
   gameplay rules as well as adding a UI.
3. ~~**H** counters, the eleven `temp*` flags, evaluation → **G** page stack and
   both reveal kinds.~~ Done, H before G as advised.
4. ~~**F** secondaries.~~ Done, all twelve, F0 subsystems included.
5. ~~**K** save slots~~ done; **L1** the sync prune still open.

### What is actually left in this document

Small, and none of it blocks anything else:

| Item | What | Lift |
|---|---|---|
| **G / I2** | The visible-values model — one change, two consumers | small |
| **J** | Shop descriptions and stat previews (**data absent too**) | small + an unscoped extraction |
| **L1** | `assets:sync` never prunes | small |
| **L3** | `--sound-sweep` never satisfies the tutorial gate | trivial |
| **L4** | `npm run look` leaves its vite server alive | trivial |
| **L5** | 517 stub statuses hand-set where `gen-progress.mjs:256` could derive them | small work, large metric consequence |
| **L6** | `ScreenGame`/`PartGameArea` generated prose self-contradicts and is coupled to their status | small, generator pass |
| **L7** | ~20 absorbed classes uncounted under the "named port citation" rule | a decision, not work |
| **F4** | `secondaries.ts`'s header still says "Scope: Mine only" | trivial |

**Read this next to `docs/HANDOFF.md` §5, not instead of it.** This document
covers what was visible when the enemies landed; the live queue — the `Objective`
panel overlapping the HUD, the pre-level countdown and its game-wide spawn
consequence, the 28 non-firing sound names, `D1`'s remaining prop-art step — is
tracked there. **Neither file is the whole remaining port**, which is the warning
this document opens with and still means.
