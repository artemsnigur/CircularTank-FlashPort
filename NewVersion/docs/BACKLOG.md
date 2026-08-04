# Backlog — what is left after the enemies

> ## What this document does **not** cover
>
> **Finishing F–L is not finishing the port.** This was written immediately after the
> enemy types landed, scoped at what was visible from there, and it has been read since
> as though it were the whole remaining plan. It is not.
>
> Outside its scope entirely, and unlisted anywhere else:
>
> - **Tutorial** — 23 AS3 classes. State is persisted; no tutorial runs.
> - **Particles** — `spawnParticle` / `handleParticles`. Every impact, death and
>   strength/weakness cue in the original. No port equivalent.
> - **`ItemMoney`** — money as a collectable drop. `moneyOnFloor: 0` stands in for it.
> - **Enemy and medic off-screen indicators** — `handleEnemyIndicators`,
>   `handleMedicIndicators`.
> - **The UI and sound bulk** — the largest count by far, and the part most likely to
>   move under a lighter process than the gameplay rules needed.
>
> Recorded here rather than in a report because a list that refers to work it does not
> enumerate is how the dev aids ended up saying "remove the others" about a set nobody
> could name. If you complete F–L, come back to this box before declaring anything done.

All 20 enemy types are ported (`deedc29`). This is the inventory of what
remains, scoped the same way the enemy inventory was: **by dependency, not by
how novel the description sounds.** Groups A–E were the enemy porting order; this
continues at **F**.

**Status:** written against commit `deedc29` on `develop`. Every claim below has
a `file:line` citation into either `SWFimported/scripts/` or `NewVersion/src/`.
Nothing here has been implemented — this is documentation only.

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

## Group F — Secondary weapons (3 of 12 remaining)

Ported: `Mine`, `Shield`, `Grenade`, `Ice Grenade`, `Poison Grenade`,
`Icicles`, `Poison Spikes`, `Magic Bunny`, `Rockets`.

Two things fell out of that which the original scoping did not predict.
**Porting Shield ported `BulletReflect`** — `:1557` is one condition covering
both, so the misc upgrade came off the withheld list with it. **Porting the Ice
Grenade closed the `FreezeTemperamental` achievement**, which had been recorded
as knowably unreachable because nothing dealt Ice damage; the knip canary fired
on the exact commit that changed it.

**All twelve upgrade tables are already generated** — `upgradeData.ts` carries
every stat track for all of them, prices included. So no item in this group is
blocked on data; each is blocked only on a delivery mechanism.

**Two corrections to the header comment in `secondaries.ts`,** which describes
this group and gets three of them wrong. They were written from the class names
rather than from the code, and the file should be fixed when this group starts:

| It says | Actually |
| --- | --- |
| Icicles / Poison Spikes are "persistent ground hazards with lifetimes" | A radial burst of ordinary fast bullets (speed 20, radius 6, `explosion = false`) — `PartGameArea.as:4058-4098`. Nothing persists. |
| Crazy Cheese "spawns a temporary allied entity" | A fan of wall-bouncing projectiles, `bounces = 3` — `:4208-4231`. No entity. |
| Magic Bunny is a "homing pet with its own steering loop" | `BulletMagic` with a different sprite and its own stat row. Same chain-homing code path, shared at `:1714` and `:1758`. |

### F0 — Shared subsystems this group needs

Build these once and several unblock together.

- [ ] **Bullet wall-bounce.** `advanceBullet` deletes any bullet leaving the room
      (`src/game/weapons/bullets.ts:72` says so in a comment). The AS3 has
      per-weapon border behaviour at `PartGameArea.as:1903`. Consumers:
      Crazy Cheese, the `BulletReflect` tank upgrade, **and Gummy Bear Cannon —
      which is already shipped and is silently missing its bounce today.** That
      makes this a live divergence on an existing weapon, not only a blocker.
      *Lift: small.*
- [ ] **Ground-hazard objects (`groundArray`).** Persistent world objects with a
      lifetime that damage or freeze whatever walks over them —
      `PartGameArea.as:1784-1809` (spawn), `:6197-6260` (contact), `:7050-7095`
      (expiry). Carries a `trailID` so one trail freezes a given enemy only once
      (`:6208`, `:6220`). Consumers: Ice Ball, Lava Ball. Nothing else in the
      port needs it, so it is genuinely new. *Lift: medium.*
- [ ] **Projectile target selection.** Nearest-first ordering by
      `distance − enemy.radius`, filtered to on-screen and targetable enemies —
      `PartGameArea.as:4113-4141`. Consumers: Rockets. `isTargetable` already
      exists; the on-screen test and the sorted insert do not. *Lift: small.*

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

### F2 — Blocked on an F0 subsystem

- [x] **Rockets** — shipped. `:4108-4172`. Fires up to `rocketCount` homing rockets, one
      per nearest on-screen enemy, each with an explosion radius.
      **Refunds the cooldown when there are no targets** (`:4169`,
      `reloadTimeSecondary = 0`) — a detail easy to miss and visible in play.
      *Blocked on: projectile target selection (F0). Lift: small after it.*
- [ ] **Crazy Cheese** — `:4208`. A fan of `cheeseCount` projectiles, radius 7,
      speed 20, `bounces = 3`, with a per-bullet `enemiesArray` so one cheese
      damages a given enemy once. The fan width is a stat track.
      *Blocked on: bullet wall-bounce (F0). Lift: small after it.*
- [ ] **Ice Ball** — `:4174`. A large slow projectile (radius 20, speed 12) that
      does not explode and is not consumed by hits, laying `ObjectGroundIce`
      patches behind it that freeze on contact. The `iceTrailID` counter
      (`:4179`, `:6208`, `:6220`) makes each *throw* freeze a given enemy once,
      not each patch.
      *Blocked on: ground hazards (F0). Lift: medium.*
- [ ] **Lava Ball** — `:4188`. Same body, explodes on impact, lays
      `ObjectGroundLava` patches carrying damage over a lifetime. The enemy-side
      `onLava` flag is a same-frame dedup and already exists.
      *Blocked on: ground hazards (F0). Lift: small after Ice Ball.*

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
- [x] A minimal results overlay — `LevelOutcome` in `src/ui/Hud.tsx:119`,
      rendering result / level / kills / currency with Next and Replay buttons.
      It is a DOM dialog, not a page stack.
- [x] `recordLevel` **returns the newly-discovered display names** — and nothing
      consumes the return value. The data for the reveal pages is being computed
      and thrown away every level.

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
- [ ] **The medal-reveal animation.** The AS3 keeps two parallel arrays —
      `worldsValuesArrays` (earned) and `worldsValuesVisibleArrays` (shown) — and
      animates the difference (`ScreenLevelSelect.as:523-526`).
      **`worldsValuesVisibleArrays` is not saved**; it is cloned from the real
      array at load (`SaveManager.as:656`) and diverges only within a session.
      The port has one `ProgressTable` and no "visible" copy. This same
      distinction gates the world-unlock animation — see Group I.
      *Lift: small, but it is a shared model change; do it with Group I.*

---

## Group H — Achievements

### What exists

Substantially more than the name suggests, and none of it runs.

- [x] `achievementData.ts` — all **36** achievements generated from
      `ScreenAchievements.as`, with type, requirement, title, description,
      difficulty sensitivity and grid position.
- [x] `achievementState.ts` — the full evaluation model: the −1/0/1/2/3 state
      encoding, `winStateValue`, the re-earn-at-higher-difficulty rule, and all
      three evaluation types (`Number`, `Boolean`, `NumberArray`).
- [x] `achievementSave.ts` — encode/decode, including the two running totals
      (`ek` enemyKills, `me` moneyEarned).
- [x] Persistence — `SaveSlotData.achievements` is written and read every save.

### What is missing

- [ ] **Every counter.** `enemyKills` and `moneyEarned` are serialised and
      deserialised and **nothing increments either one** — the only non-test
      references in `src/` are in the codec and the schema. So the three Kills and
      three Money achievements measure zero forever.
      *Lift: small; the increment sites are `removeEnemy` and the payout.*
- [ ] **The evaluation call.** Nothing calls `evaluate()` outside tests. The AS3
      runs `updateAchievements()` once, from `ScreenStatus` (`:405`).
      *Lift: small, but it wants Group G to have somewhere to show the result.*
- [ ] **An achievements screen.** No UI exists. The grid positions are already in
      the data. *Lift: medium.*
- [ ] **The 11 `temp*` flags.** Per-level one-shot booleans set during play and
      read once afterwards, reset on level start and quit
      (`PartGameArea.as:256-278`). Documented at the head of
      `achievementState.ts`. Each needs a set site, and the good news is that
      **most of the code they hook into is already ported:**

| Flag | Set where | Port status of the host code |
| --- | --- | --- |
| `tempTrapEnemyMineKill` | `:6626` — mine explosion kills a Trap | Trap ported; Mine ported. Needs explosion parentage. |
| `tempDoctorPoisoned` | Poison applied to a Medic | Medic ported; `applyPoison` ported. |
| `tempTemperamentalFrozen` | Freeze applied to a raged Temperamental | Temperamental ported (`hasRaged` exists); `applyFreeze` ported. |
| `tempDamageAddictEnemyCake` | Cake hits a DamageAddict | Both ported. |
| `tempHitBottom` | Tank reaches the bottom of a Defense level | Defense mode ported. |
| `tempNoWeaponsUsed` | Cleared without firing | Set at `:3984`; both firing blocks are ported. |
| `tempTimedBombsFired` / `tempOtherThanTimedBombsFired` | Which weapon classes were used | Same two blocks. |
| `tempOnlySpecialWeapons` | Secondaries only | Same. |
| `tempNothingPressed` | No input at all | Input layer ported. |
| `tempThreeBosses` | Three bosses alive at once | Boss spawning ported. |

  So this is eleven small insertions plus a reset hook, not eleven features.
  *Lift: small each; medium in aggregate. Do them with the counters.*

---

## Group I — Reach: difficulty, worlds, unlocking

This is the group covering priorities **(3) all levels/worlds reachable** and
**(4) all difficulties working**. The three items share one model change and
should be sequenced together.

### I1 — Difficulty selector

- [x] **All the logic works.** `difficultyMultipliers.ts` has the three profiles
      and they are applied throughout the enemy stat mods.
      `ProgressTable` stores `[hard, medium, easy]` per level, so the save format
      already carries three independent results.
      `evaluate()` takes a difficulty and implements the re-earn rule.
- [ ] **Nothing selects one.** `GameplayScene.ts:207` pins
      `const DIFFICULTY: Difficulty = 'Easy'` with a comment saying so. Every
      level is played on Easy and every result is written to the Easy slot.
- [ ] Missing: three buttons on level select (`ButtonDifficultyEasy/Medium/Hard`),
      the selection carried on `ui:start-game`, and the `DifficultyChosen` UI
      hint — which is **already in `mainFlags.ts` (`UI_HINT_IDS`)** and is one of
      the six hints waiting there.
      *Lift: small. This is the cheapest of the four priorities and it makes two
      thirds of the medal table reachable.*

### I2 — World picker

- [x] `LEVELS` carries all nine worlds × 45 levels; `roomSizeSource.test.ts`
      independently verifies all 405 room sizes against the AS3.
- [x] A **dev-only** jump to any level in any world exists in
      `LevelSelectScreen.tsx:19-45`, launching sandbox runs that record nothing.
- [ ] `LevelSelectScene.ts:24` pins `const SELECTED_WORLD = 1`. The screen says
      so in the footer: *"world 1 of 9 — the world picker is not ported yet"*.
- [ ] Missing: the world grid (`ButtonWorld`, `ScreenLevelSelect.as:1504-1580`),
      the world-0 "picker" view mode the AS3 uses (`selectedWorld = 0`), and the
      unlock rule at `:1518` — a world is locked unless it is `progressWorld` or
      the **last level of the previous world** has a non-zero value on some
      difficulty. Note that rule reads the *visible* array, so it shares the
      model change with G's medal reveal.
      *Lift: medium.*

### I3 — Level unlock, and the world rollover

- [x] The rule is implemented and used: `isLevelCleared` gates each level in
      `LevelSelectScene.ts:94` (`level === 1 || cleared(level − 1)`), matching
      `ScreenLevelSelect.as:842`.
- [x] `nextLevelAfter` rolls over into the next world, and `GameplayScene` uses
      it for the Next button.
- [ ] Missing: `levelUnlock.test.ts` exists with **no `levelUnlock.ts`** — the
      rule is inlined at the two call sites and duplicated in the test file
      itself (`levelUnlock.test.ts:19`). Three copies of one rule, and the test's
      copy cannot fail when the scene's copy drifts. *Lift: trivial — extract it.
      Worth doing before I2 adds a fourth copy.*

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
- [ ] Also listed as not ported in the same comment: per-upgrade description text
      and stat previews on the shop screen. Cosmetic; separable.

---

## Group K — Save slots

- [x] `saveSlot.ts` handles **all three slots already** — `readSaveSlot(string,
      slot)` / `writeSaveSlot(string, slot, data)`, matching `SaveManager.as`'s
      parenthesis-delimited format.
- [x] `SaveManager.checkIfSlotHasData(slot)` (`:56`) has no port equivalent yet,
      but the parsing it needs is in `saveString.ts`.
- [ ] `playerProfile.ts:42` pins `export const ACTIVE_SLOT = 1`, with a comment
      saying the rest changes nothing once a select screen passes a different
      index. That claim looks right: `ACTIVE_SLOT` appears in exactly two places
      (`load`, `save`) plus the store name.
- [x] The **"slot has data" probe** is ported — `slotHasData` in `save/saveSlot.ts`,
      from `SaveManager.checkIfSlotHasData` (`:56`). Built on `partOfSaveString` so it
      and `readSaveSlot` cannot disagree about where a slot begins.
- [x] The **slot-select screen** is built — `ui/screens/SaveSlotScreen.tsx`, fed by
      `save/slotSummary.ts`, drawn over the menu as the AS3 draws it. Renders the four
      facts `ButtonGameSave.as:215-266` decides a button from, and both entry
      behaviours from `:110-134`: an occupied slot loads and goes to Level Select, an
      empty one starts a fresh game at 1-1.
- [ ] **Per-slot delete.** `ButtonGameSave` carries a `bSaveDelete` child with its own
      cursor handling (`:107`), so each slot can be cleared from the picker.
      *Not in the original K description. Lift: small.*
- [ ] **The "Overwrite?" confirmation page.** `makePage2("Overwrite?")` (`:141`) — the
      button flips to a second page asking for confirmation before a non-empty slot is
      replaced. The port currently overwrites without asking, which for a save screen is
      the one interaction where a missing confirmation costs the player everything.
      *Not in the original K description. Lift: small, and worth more than its size.*

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

## Group L — Tooling

### L1 — `assets:sync` never prunes

- [ ] `scripts/sync-assets.mjs` copies and **never deletes**: there is no `rm`,
      `unlink`, or prune step anywhere in the file. Every destination file it has
      ever written stays in `src/assets/` until removed by hand.

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

### L2 — Per-world ground themes

- [ ] Nine ground tiles were extracted; **eight are unused** and every level in
      every world renders the Desert tile. `groundTexture.ts` exists and is
      wired; only the per-world selection is missing.
      *Lift: trivial. Naturally paired with I2 — a world picker that shows nine
      worlds which all look identical undersells the change.*

---

## Dependencies

The edges worth sequencing around. Everything not listed is independent.

```
F0 bullet bounce ──────────► F2 Crazy Cheese
                     └─────► (fixes shipped Gummy Bear)
F0 ground hazards ─────────► F2 Ice Ball ──► F2 Lava Ball
F0 target selection ───────► F2 Rockets
F1 Grenade ────────────────► F1 Ice Grenade, F1 Poison Grenade

H counters + evaluation ───► G achievement reveal pages
G page stack ──────────────► G enemy reveal pages
                             (data already computed and discarded)

"visible values" model ────► G medal reveal animation
                     └─────► I2 world unlock rule

I3 extract unlock rule ────► I2 world picker  (before a 4th copy appears)
I1 difficulty ─────────────► makes 2/3 of ProgressTable reachable
                     └─────► mainFlags `DifficultyChosen` hint
```

Two things that look like dependencies and are not:

- **Status timers no longer block anything.** `statusEffects.ts` shipped with the
  Poison and Timed Bomb cannons and covers poison, freeze and bomb. CLAUDE.md
  still names this as the blocker for Ice Grenade / Poison Grenade / Icicles /
  Poison Spikes; that note is stale.
- **Save slots (K) depend on nothing.** `saveSlot.ts` is already slot-aware.

## Suggested sequence

Ordered by the user's stated priorities — enemies were (2), so (3) and (4) come
next — with cheap unblockers pulled forward.

1. **I3** extract the unlock rule → **I1** difficulty selector → **I2** world
   picker + the visible-values model. Closes priorities (3) and (4). Pick up
   **L2** with I2.
2. ~~**J** equip slots~~ — done. Not self-contained after all: it changed three
   gameplay rules as well as adding a UI.
3. **H** counters, the eleven `temp*` flags, and evaluation → **G** the page
   stack and both kinds of reveal page. These two are one arc; H first because G
   has nothing to show without it.
4. **F** secondaries, in this order: **Shield** (no projectile), **Grenade** →
   the two grenade variants, **Magic Bunny** and the two spike weapons (all
   unblocked), then the F0 subsystems and their consumers.
5. **K** save slots and **L1** the sync prune, whenever convenient.
