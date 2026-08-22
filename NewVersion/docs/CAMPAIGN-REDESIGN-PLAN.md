# Campaign redesign — 9 worlds to 4

**Generated. Do not edit by hand — run `node scripts/gen-campaign-plan.mjs`.**

**This is a proposal, not the data.** Nothing under `src/` has changed. Every
number below is derived from the design constants at the top of the generator
and checked by two dozen assertions before the file is written, so a slip in
the layout is a non-zero exit rather than a plausible-looking row.

4 worlds, 45 levels each, 180 levels — down from 9 and 405.

Companions: `LEVEL-DOSSIER.md` is the original campaign level by level,
`ENEMY-DOSSIER.md` every enemy stat and multiplier.

---

## 1. The mode arithmetic

Compressing 405 levels into 180 is a factor of 4/9. Held proportional, every
mode keeps its share exactly. Rules 4 and 5 then move two of them:

| Mode | Original | Share | Proportional at 180 | **This plan** | Share | Rate vs original |
|---|---|---|---|---|---|---|
| Normal | 90 | 22.2% | 40 | **40** | 22.2% | unchanged |
| Flag | 90 | 22.2% | 40 | **40** | 22.2% | unchanged |
| Tower | 90 | 22.2% | 40 | **20** | 11.1% | **x0.5** |
| Defense | 90 | 22.2% | 40 | **40** | 22.2% | unchanged |
| Boss | 45 | 11.1% | 20 | **40** | 22.2% | **x2.0** |
| **Total** | **405** | | **180** | **180** | | |

### The two rules cancel exactly, and that is worth saying out loud

Rule 4 halves Tower: 40 proportional slots become 20, freeing **20**.
Rule 5 doubles Boss: 20 proportional slots become 40, consuming **20**.

The ledger nets to zero, so Normal, Flag and Defense land on their
proportional 40 apiece. Rule 4 asks for the freed Tower slots to go to "other
existing game modes", and rule 5 is what takes them — Boss being one of them.
At a fixed 180 levels there is no other closed solution: the campaign has no
spare slots, so anything Normal/Flag/Defense gain has to come out of Boss.

> **Decision D-2 — do you want Normal/Flag/Defense to visibly grow instead?**
> Then Boss cannot double. Trading 6 boss levels back gives Boss 34 and 42
> each of the other three — Boss at x1.7 rather than x2.0. The plan below
> assumes **no**: rule 5 as written, the other three held at their old rate.

---

## 2. Where each enemy is introduced

Rule 2 fixes the **order** and frees the **spacing**. Every type debuts in
exactly the position it held in the original sequence; what changes is that
the droughts between them are gone.

| # | Enemy | Original | Gap | **New** | Gap | Debut mode |
|---|---|---|---|---|---|---|
| 1 | **Basic** | 1-1 | — | **1-1** | — | Normal |
| 2 | **Fast** | 1-2 | 1 | **1-2** | 1 | Flag |
| 3 | **Shooting** | 1-6 | 4 | **1-4** | 2 | Normal |
| 4 | **Strong** | 1-13 | 7 | **1-11** | 7 | Flag |
| 5 | **Shrinking** | 1-24 | 11 | **1-19** | 8 | Normal |
| 6 | **Ghost** | 1-36 | 12 | **1-28** | 9 | Normal |
| 7 | **Trap** | 2-8 | 17 | **1-37** | 9 | Normal |
| 8 | **Temperamental** | 2-21 | 13 | **2-1** | 9 | Normal |
| 9 | **Ninja** | 2-44 | 23 | **2-10** | 9 | Normal |
| 10 | **Accelerating** | 3-14 | 15 | **2-19** | 9 | Normal |
| 11 | **Crazy** | 3-36 | 22 | **2-28** | 9 | Normal |
| 12 | **Medic** | 4-15 | 24 | **2-37** | 9 | Normal |
| 13 | **ScaredGhost** | 4-41 | 26 | **3-1** | 9 | Normal |
| 14 | **DamageAddict** | 5-24 | 28 | **3-10** | 9 | Normal |
| 15 | **Random** | 6-7 | 28 | **3-19** | 9 | Normal |
| 16 | **Exploding** | 7-1 | 39 | **3-28** | 9 | Normal |
| 17 | **Tiny** | 7-26 | 25 | **3-37** | 9 | Normal |
| 18 | **GrapplingHook** | 7-44 | 18 | **4-1** | 9 | Normal |
| 19 | **Teleporting** | 8-20 | 21 | **4-10** | 9 | Normal |
| 20 | **Soldier** | 9-1 | 26 | **4-19** | 9 | Normal |

| | Original | This plan |
|---|---|---|
| Longest run with nothing new | **39 levels** | **9 levels** |
| Mean gap between debuts | 18.9 | 8.1 |
| Last debut | 9-1 — level 361 of 405 | 4-19 — level 154 of 180 |
| Debuts per world | 6, 3, 2, 2, 1, 1, 3, 1, 1 | 7, 5, 5, 3 |

After the opening three the cadence is a flat **nine levels**. That is why
the shape of the old back half — 6 new types spread across its last 180
levels — does not survive. Two consequences worth being explicit about:

- **World 1 carries 7 debuts.** That is the front-loading the original
  already had (6 in world 1, 9 across the first two), compressed. The player
  meets something new every 8-9 levels for the whole of world 1.
- **World 4 carries 3, all within its first 19 levels.** Only three types remain
  in the original ordering after Tiny, and moving one later would break rule
  2. World 4 escalates by **tier and boss count**, not by novelty — and
  Soldier debuting at 4-19 leaves 26 levels of runway to actually use it,
  against the original 9-1 followed by 44 levels of the same roster.

No debut lands on a boss level, and 20 of the 20 land on a Normal or
Flag level — the two modes where a player can look at a new thing without a
lane to hold or a tower to protect.

---

## 3. The boss schedule

### Which levels

**5, 9, 14, 18, 23, 27, 32, 36, 41, 45** — the same ten in every world, 40 in total.

The original's five (9, 18, 27, 36, 45) are **all kept**, and the new five sit
at the midpoint of each gap. Nothing that was a boss stops being one, so a
player who knows the old rhythm still reads it — the spacing just alternates
4 and 5 levels instead of a flat 9.

### How many bosses on each

| World | L5 | L9 | L14 | L18 | L23 | L27 | L32 | L36 | L41 | L45 | Total |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **1** | 2 | 2 | 3 | 3 | 3 | 4 | 4 | 4 | 5 | 5 | 35 |
| **2** | 3 | 3 | 4 | 4 | 4 | 5 | 5 | 5 | 6 | 6 | 45 |
| **3** | 4 | 4 | 5 | 5 | 5 | 6 | 6 | 6 | 7 | 8 | 56 |
| **4** | 5 | 5 | 6 | 6 | 6 | 7 | 7 | 8 | 9 | 10 | 69 |

| | Original | This plan | Factor |
|---|---|---|---|
| Boss levels | 45 of 405 (11.1%) | 40 of 180 (22.2%) | **x2.0 by rate** |
| Bosses spawned across the campaign | 80 | 205 | x2.56 |
| Bosses per boss level | 1.8 mean, 1-3 | 5.1 mean, 2-10 | **x2.88** |

### Decision D-1 — DECIDED and shipped: option A, plus a cap

**Landed in T247.** The divisor is gone, each boss carries its whole stat
line, and `MAX_BOSSES_ALIVE = 4` in `waveState.ts` keeps at most four on the
map with the rest queuing behind their deaths. Divergence `A95`.

**The premise this section originally argued was half wrong, and the**
**correction is worth keeping.** The claim was that raising the boss count
would make levels *easier*, because `enemyStats.ts` divided a boss health and
money by the level boss count (`PartInterface.as:971`). That was true of the
**code** and false of the **game**: `bossAmount` reached the resolver only
through `EnemySpawnConfig`, and `Enemy.spawn` — its one and only call site —
has never passed it. Every boss this port has ever spawned already had full
health, so option A changed no observable behaviour. It deleted a rule that
was already inert and made the code say what the game does.

Five tests drove that divisor at 1, 2, 3 and 4 and all passed — one of them
deliberately on a multi-boss level, because "at 1 the division is invisible
and any implementation passes". None could see that nothing supplied the
number. **A test that constructs its own input cannot detect an input nobody
constructs.**

**The cap is the part that is genuinely new.** The AS3 spawns every boss back
to back and lets them all live, which it can afford *because* of the divisor.
With each boss whole, ten arriving at once is not a fight. Past four out,
`drawEnemy` falls through to the ordinary weighted draw, so the level keeps
sending support enemies rather than going quiet.

**Left open on purpose:** boss *money* is no longer divided either, so a
ten-boss level pays ten boss bounties. That follows from option A as
approved; balancing it belongs with the D-3 density pass, not here.

The three options as they were put, for the record:

| | Change | At 8 bosses | Note |
|---|---|---|---|
| **A** *(recommended)* | Drop the divisor — each boss keeps full health | 8x total health, 8x money | The honest reading of "more epic and difficult". Biggest balance swing, and the one players will feel. |
| **B** | Divide by `sqrt(bossAmount)` | 2.8x total health | A middle setting, but the number stops being legible from the data. |
| **C** | Keep the divisor, add a per-level `bossHealthScale` column | whatever each level says | Most control, most rows to author, easiest to get inconsistent. |

All three change `resolveEnemyStats`, not level data. **A** is one line plus a
divergence entry in `AUDIT-2026-07.md`. The boss health wipe reads `maxHealth`
off the enemy (`bossLifeIndicator.ts`) and needs no change under any of them.

### One thing this schedule fixes for free

`BossOnlySpecial` ("CHUCK NORRIS") needs a boss level with **three or more**
bosses — `GameplayScene.ts:2116` sets its flag from `bossAmount >= 3`. No
world-1 level in the original has three, so it could not be earned there at
all. Under this plan **1-14** is the first 3-boss level and world 1 has
8 of them.

---

## 4. Enemy variety on ordinary levels

| | Original | This plan |
|---|---|---|
| Distinct types on a non-boss level, mean | **2.7** | **4.2** |
| Range | 1-4 | 1-6 |
| Levels fielding a single type | 20 | 1 — only 1-1, where Basic is the whole roster |

The target ramps inside each world and across the campaign:

| World | Types per non-boss level | Actually achieved |
|---|---|---|
| 1 | 2 -> 4 | 1-4, mean 3.0 — held down early by the roster |
| 2 | 3 -> 5 | 3-5, mean 4.0 |
| 3 | 4 -> 6 | 4-6, mean 5.0 |
| 4 | 4 -> 6 | 4-6, mean 5.0 |

Two hard limits sit above the band. A level cannot field more types than have
debuted, which binds in world 1 only; and wave entries are capped at
**6**, because `levelPreview` draws one row per entry and the busiest
level in the original has 6. Six is a layout the level-select panel is known
to survive; seven is a guess. Raising it is a UI change with its own look, not
a data change.

### Tier mix per world

Each new world inherits the tier balance of the old worlds it replaces, so the
escalation curve is preserved rather than re-invented:

| New world | Replaces old | tier 1 | tier 2 | tier 3 |
|---|---|---|---|---|
| 1 | 1, 2 | 74% | 21% | 5% |
| 2 | 3, 4 | 48% | 36% | 15% |
| 3 | 5, 6 | 33% | 43% | 23% |
| 4 | 7, 8, 9 | 37% | 35% | 27% |

---

## 5. :warning: What a shorter campaign breaks — the medal ceilings

Fifteen achievements count medals earned in one mode, three medals to a level.
Fewer levels of a mode means a lower ceiling, and several thresholds end up
above it:

| Group | Mode | Levels | Ceiling (x3) | Thresholds | Status |
|---|---|---|---|---|---|
| Stars1-3 | Normal | 90 -> **40** | 270 -> **120** | 60 / 120 / 180 | Stars2 needs a perfect run; **Stars3 impossible** |
| Flags1-3 | Flag | 90 -> **40** | 270 -> **120** | 60 / 120 / 180 | Flags2 needs a perfect run; **Flags3 impossible** |
| Towers1-3 | Tower | 90 -> **20** | 270 -> **60** | 60 / 120 / 180 | Towers1 needs a perfect run; **Towers2 impossible**; **Towers3 impossible** |
| Shields1-3 | Defense | 90 -> **40** | 270 -> **120** | 60 / 120 / 180 | Shields2 needs a perfect run; **Shields3 impossible** |
| Bosses1-3 | Boss | 45 -> **40** | 135 -> **120** | 30 / 60 / 90 | fine |

Unearnable outright: **Stars3, Flags3, Towers2, Towers3, Shields3**.

**No test catches this.** `achievementReachability.test.ts` is titled "every
achievement is reachable" and it feeds the evaluator a fabricated total, so it
proves the rule *fires* — it never asks whether the campaign can supply the
number. That is the shape `CLAUDE.md` tracks under "a guarantee is only worth
what enforces it", and it is worth closing in the same pass:

- rescale each threshold to the same fraction of the new ceiling — roughly
  **25 / 50 / 80** for Stars, Flags, Shields and Bosses, and **15 / 30 / 40**
  for Towers. `achievementData.ts` restates the number in prose
  ("Earn 60 stars."), so the description has to move with it;
- add a check deriving each ceiling from `LEVELS` and failing when a
  requirement exceeds it, so the next campaign edit cannot quietly reopen it.

### Other code that assumes nine worlds

| Where | What it holds | Needs |
|---|---|---|
| `levelData.ts` | the 405-row table | replaced — this is the job |
| `levelProgress.ts:143-145` | `FREE_WORLD_COUNT = 6`, `PREMIUM_WORLD_COUNT = 9` | a new split — 2 of 4? |
| `levelProgress.ts:213` | the hardcoded "World 6  Level 45" completion label | follows the split |
| `levelSizeOverrides.ts` | 15 world-1 room overrides | fold into the new data, then retire the file |
| `achievementData.ts:51-65` | 15 thresholds and their prose | rescale, above |
| `levelUnlock.ts:91`, `WORLD_COUNT` | derived from `LEVELS.length` | **nothing — already derived** |

Save compatibility is the other open question. A slot stores progress as a
table shaped like the campaign, so every existing save points at worlds that
will no longer exist; the simplest answer is a save-version bump that resets
progress rather than a migration nobody can verify.

---

## 6. Every level

**The theme headings below are a placeholder.** D-4 was answered "pick exactly
four, one per world", and which four comes off the gallery at `#themes`
(T248) — so the mid-world switches shown here collapse to one theme per world
once the four are named. Nothing else in the table depends on it.

`Types` is the target number of distinct enemy types in the wave and `Roster`
how many have debuted by then. `Source` is the old level at the same fraction
of the campaign — a **pacing reference** for enemy count and spawn interval,
not a wave to copy: composition is authored to the variety rule above.

### World 1 — Desert (from 1) -> Grass (from 31)

| Level | Mode | Room | Bosses | New enemy | Types | Roster | Source |
|---|---|---|---|---|---|---|---|
| **1-1** | Normal | 800x600 | — | **NEW: Basic** | 1 | 1 | 1-1 |
| **1-2** | Flag | 900x720 | — | **NEW: Fast** | 2 | 2 | 1-3 |
| **1-3** | Defense | 640x960 | — | — | 2 | 2 | 1-6 |
| **1-4** | Normal | 800x600 | — | **NEW: Shooting** | 2 | 3 | 1-8 |
| **1-5** | Boss | 800x600 | 2 | — | 3 | 3 | 1-10 |
| **1-6** | Defense | 640x960 | — | — | 2 | 3 | 1-12 |
| **1-7** | Tower | 640x640 | — | — | 2 | 3 | 1-15 |
| **1-8** | Normal | 800x600 | — | — | 2 | 3 | 1-17 |
| **1-9** | Boss | 800x600 | 2 | — | 3 | 3 | 1-19 |
| **1-10** | Normal | 800x600 | — | — | 2 | 3 | 1-21 |
| **1-11** | Flag | 900x720 | — | **NEW: Strong** | 2 | 4 | 1-24 |
| **1-12** | Defense | 640x960 | — | — | 3 | 4 | 1-26 |
| **1-13** | Flag | 900x720 | — | — | 3 | 4 | 1-28 |
| **1-14** | Boss | 800x600 | 3 | — | 3 | 4 | 1-30 |
| **1-15** | Flag | 900x720 | — | — | 3 | 4 | 1-33 |
| **1-16** | Tower | 640x640 | — | — | 3 | 4 | 1-35 |
| **1-17** | Defense | 640x960 | — | — | 3 | 4 | 1-37 |
| **1-18** | Boss | 800x600 | 3 | — | 3 | 4 | 1-39 |
| **1-19** | Normal | 800x600 | — | **NEW: Shrinking** | 3 | 5 | 1-42 |
| **1-20** | Flag | 900x720 | — | — | 3 | 5 | 1-44 |
| **1-21** | Defense | 640x960 | — | — | 3 | 5 | 2-1 |
| **1-22** | Defense | 640x960 | — | — | 3 | 5 | 2-3 |
| **1-23** | Boss | 800x600 | 3 | — | 3 | 5 | 2-6 |
| **1-24** | Defense | 640x960 | — | — | 3 | 5 | 2-8 |
| **1-25** | Tower | 640x640 | — | — | 3 | 5 | 2-10 |
| **1-26** | Normal | 800x600 | — | — | 3 | 5 | 2-12 |
| **1-27** | Boss | 800x600 | 4 | — | 3 | 5 | 2-15 |
| **1-28** | Normal | 800x600 | — | **NEW: Ghost** | 3 | 6 | 2-17 |
| **1-29** | Flag | 900x720 | — | — | 3 | 6 | 2-19 |
| **1-30** | Defense | 640x960 | — | — | 3 | 6 | 2-21 |
| **1-31** | Normal | 800x600 | — | — | 3 | 6 | 2-24 |
| **1-32** | Boss | 800x600 | 4 | — | 3 | 6 | 2-26 |
| **1-33** | Flag | 900x720 | — | — | 3 | 6 | 2-28 |
| **1-34** | Tower | 640x640 | — | — | 4 | 6 | 2-30 |
| **1-35** | Defense | 640x960 | — | — | 4 | 6 | 2-33 |
| **1-36** | Boss | 800x600 | 4 | — | 3 | 6 | 2-35 |
| **1-37** | Normal | 800x600 | — | **NEW: Trap** | 4 | 7 | 2-37 |
| **1-38** | Flag | 900x720 | — | — | 4 | 7 | 2-39 |
| **1-39** | Defense | 640x960 | — | — | 4 | 7 | 2-42 |
| **1-40** | Flag | 900x720 | — | — | 4 | 7 | 2-44 |
| **1-41** | Boss | 900x720 | 5 | — | 3 | 7 | 3-1 |
| **1-42** | Normal | 800x600 | — | — | 4 | 7 | 3-3 |
| **1-43** | Tower | 640x640 | — | — | 4 | 7 | 3-6 |
| **1-44** | Flag | 900x720 | — | — | 4 | 7 | 3-8 |
| **1-45** | Boss | 900x720 | 5 | — | 3 | 7 | 3-10 |

### World 2 — BlueDirt (from 1) -> Beach (from 24)

| Level | Mode | Room | Bosses | New enemy | Types | Roster | Source |
|---|---|---|---|---|---|---|---|
| **2-1** | Normal | 800x600 | — | **NEW: Temperamental** | 3 | 8 | 3-12 |
| **2-2** | Flag | 900x720 | — | — | 3 | 8 | 3-15 |
| **2-3** | Defense | 640x960 | — | — | 3 | 8 | 3-17 |
| **2-4** | Flag | 900x720 | — | — | 3 | 8 | 3-19 |
| **2-5** | Boss | 800x600 | 3 | — | 3 | 8 | 3-21 |
| **2-6** | Flag | 900x720 | — | — | 3 | 8 | 3-24 |
| **2-7** | Tower | 640x640 | — | — | 3 | 8 | 3-26 |
| **2-8** | Defense | 640x960 | — | — | 3 | 8 | 3-28 |
| **2-9** | Boss | 800x600 | 3 | — | 3 | 8 | 3-30 |
| **2-10** | Normal | 800x600 | — | **NEW: Ninja** | 3 | 9 | 3-33 |
| **2-11** | Flag | 900x720 | — | — | 3 | 9 | 3-35 |
| **2-12** | Defense | 640x960 | — | — | 4 | 9 | 3-37 |
| **2-13** | Defense | 640x960 | — | — | 4 | 9 | 3-39 |
| **2-14** | Boss | 800x600 | 4 | — | 3 | 9 | 3-42 |
| **2-15** | Defense | 640x960 | — | — | 4 | 9 | 3-44 |
| **2-16** | Tower | 640x640 | — | — | 4 | 9 | 4-1 |
| **2-17** | Normal | 800x600 | — | — | 4 | 9 | 4-3 |
| **2-18** | Boss | 800x600 | 4 | — | 3 | 9 | 4-6 |
| **2-19** | Normal | 800x600 | — | **NEW: Accelerating** | 4 | 10 | 4-8 |
| **2-20** | Flag | 900x720 | — | — | 4 | 10 | 4-10 |
| **2-21** | Defense | 640x960 | — | — | 4 | 10 | 4-12 |
| **2-22** | Normal | 800x600 | — | — | 4 | 10 | 4-15 |
| **2-23** | Boss | 800x600 | 4 | — | 3 | 10 | 4-17 |
| **2-24** | Flag | 900x720 | — | — | 4 | 10 | 4-19 |
| **2-25** | Tower | 640x640 | — | — | 4 | 10 | 4-21 |
| **2-26** | Defense | 640x960 | — | — | 4 | 10 | 4-24 |
| **2-27** | Boss | 900x720 | 5 | — | 3 | 10 | 4-26 |
| **2-28** | Normal | 800x600 | — | **NEW: Crazy** | 4 | 11 | 4-28 |
| **2-29** | Flag | 900x720 | — | — | 4 | 11 | 4-30 |
| **2-30** | Defense | 640x960 | — | — | 4 | 11 | 4-33 |
| **2-31** | Flag | 900x720 | — | — | 4 | 11 | 4-35 |
| **2-32** | Boss | 900x720 | 5 | — | 3 | 11 | 4-37 |
| **2-33** | Normal | 800x600 | — | — | 4 | 11 | 4-39 |
| **2-34** | Tower | 640x640 | — | — | 5 | 11 | 4-42 |
| **2-35** | Flag | 900x720 | — | — | 5 | 11 | 4-44 |
| **2-36** | Boss | 900x720 | 5 | — | 3 | 11 | 5-1 |
| **2-37** | Normal | 800x600 | — | **NEW: Medic** | 5 | 12 | 5-3 |
| **2-38** | Flag | 900x720 | — | — | 5 | 12 | 5-6 |
| **2-39** | Defense | 640x960 | — | — | 5 | 12 | 5-8 |
| **2-40** | Normal | 800x600 | — | — | 5 | 12 | 5-10 |
| **2-41** | Boss | 900x720 | 6 | — | 3 | 12 | 5-12 |
| **2-42** | Defense | 640x960 | — | — | 5 | 12 | 5-15 |
| **2-43** | Tower | 640x640 | — | — | 5 | 12 | 5-17 |
| **2-44** | Normal | 800x600 | — | — | 5 | 12 | 5-19 |
| **2-45** | Boss | 900x720 | 6 | — | 3 | 12 | 5-21 |

### World 3 — Concrete (from 1) -> Biology (from 24)

| Level | Mode | Room | Bosses | New enemy | Types | Roster | Source |
|---|---|---|---|---|---|---|---|
| **3-1** | Normal | 800x600 | — | **NEW: ScaredGhost** | 4 | 13 | 5-24 |
| **3-2** | Flag | 900x720 | — | — | 4 | 13 | 5-26 |
| **3-3** | Defense | 640x960 | — | — | 4 | 13 | 5-28 |
| **3-4** | Defense | 640x960 | — | — | 4 | 13 | 5-30 |
| **3-5** | Boss | 800x600 | 4 | — | 3 | 13 | 5-33 |
| **3-6** | Defense | 640x960 | — | — | 4 | 13 | 5-35 |
| **3-7** | Tower | 640x640 | — | — | 4 | 13 | 5-37 |
| **3-8** | Normal | 800x600 | — | — | 4 | 13 | 5-39 |
| **3-9** | Boss | 800x600 | 4 | — | 3 | 13 | 5-42 |
| **3-10** | Normal | 800x600 | — | **NEW: DamageAddict** | 4 | 14 | 5-44 |
| **3-11** | Flag | 900x720 | — | — | 4 | 14 | 6-1 |
| **3-12** | Defense | 640x960 | — | — | 5 | 14 | 6-3 |
| **3-13** | Normal | 800x600 | — | — | 5 | 14 | 6-6 |
| **3-14** | Boss | 900x720 | 5 | — | 3 | 14 | 6-8 |
| **3-15** | Flag | 900x720 | — | — | 5 | 14 | 6-10 |
| **3-16** | Tower | 640x640 | — | — | 5 | 14 | 6-12 |
| **3-17** | Defense | 640x960 | — | — | 5 | 14 | 6-15 |
| **3-18** | Boss | 900x720 | 5 | — | 3 | 14 | 6-17 |
| **3-19** | Normal | 800x600 | — | **NEW: Random** | 5 | 15 | 6-19 |
| **3-20** | Flag | 900x720 | — | — | 5 | 15 | 6-21 |
| **3-21** | Defense | 640x960 | — | — | 5 | 15 | 6-24 |
| **3-22** | Flag | 900x720 | — | — | 5 | 15 | 6-26 |
| **3-23** | Boss | 900x720 | 5 | — | 3 | 15 | 6-28 |
| **3-24** | Normal | 800x600 | — | — | 5 | 15 | 6-30 |
| **3-25** | Tower | 640x640 | — | — | 5 | 15 | 6-33 |
| **3-26** | Flag | 900x720 | — | — | 5 | 15 | 6-35 |
| **3-27** | Boss | 900x720 | 6 | — | 3 | 15 | 6-37 |
| **3-28** | Normal | 800x600 | — | **NEW: Exploding** | 5 | 16 | 6-39 |
| **3-29** | Flag | 900x720 | — | — | 5 | 16 | 6-42 |
| **3-30** | Defense | 640x960 | — | — | 5 | 16 | 6-44 |
| **3-31** | Normal | 800x600 | — | — | 5 | 16 | 7-1 |
| **3-32** | Boss | 900x720 | 6 | — | 3 | 16 | 7-3 |
| **3-33** | Defense | 640x960 | — | — | 5 | 16 | 7-6 |
| **3-34** | Tower | 640x640 | — | — | 6 | 16 | 7-8 |
| **3-35** | Normal | 800x600 | — | — | 6 | 16 | 7-10 |
| **3-36** | Boss | 900x720 | 6 | — | 3 | 16 | 7-12 |
| **3-37** | Normal | 800x600 | — | **NEW: Tiny** | 6 | 17 | 7-15 |
| **3-38** | Flag | 900x720 | — | — | 6 | 17 | 7-17 |
| **3-39** | Defense | 640x960 | — | — | 6 | 17 | 7-19 |
| **3-40** | Flag | 900x720 | — | — | 6 | 17 | 7-21 |
| **3-41** | Boss | 900x720 | 7 | — | 3 | 17 | 7-24 |
| **3-42** | Flag | 900x720 | — | — | 6 | 17 | 7-26 |
| **3-43** | Tower | 640x640 | — | — | 6 | 17 | 7-28 |
| **3-44** | Defense | 640x960 | — | — | 6 | 17 | 7-30 |
| **3-45** | Boss | 900x720 | 8 | — | 3 | 17 | 7-33 |

### World 4 — Hell (from 1) -> MagicStone (from 16) -> Futuristic (from 31)

| Level | Mode | Room | Bosses | New enemy | Types | Roster | Source |
|---|---|---|---|---|---|---|---|
| **4-1** | Normal | 800x600 | — | **NEW: GrapplingHook** | 4 | 18 | 7-35 |
| **4-2** | Flag | 900x720 | — | — | 4 | 18 | 7-37 |
| **4-3** | Defense | 640x960 | — | — | 4 | 18 | 7-39 |
| **4-4** | Normal | 800x600 | — | — | 4 | 18 | 7-42 |
| **4-5** | Boss | 900x720 | 5 | — | 3 | 18 | 7-44 |
| **4-6** | Flag | 900x720 | — | — | 4 | 18 | 8-1 |
| **4-7** | Tower | 640x640 | — | — | 4 | 18 | 8-3 |
| **4-8** | Defense | 640x960 | — | — | 4 | 18 | 8-6 |
| **4-9** | Boss | 900x720 | 5 | — | 3 | 18 | 8-8 |
| **4-10** | Normal | 800x600 | — | **NEW: Teleporting** | 4 | 19 | 8-10 |
| **4-11** | Flag | 900x720 | — | — | 4 | 19 | 8-12 |
| **4-12** | Defense | 640x960 | — | — | 5 | 19 | 8-15 |
| **4-13** | Flag | 900x720 | — | — | 5 | 19 | 8-17 |
| **4-14** | Boss | 900x720 | 6 | — | 3 | 19 | 8-19 |
| **4-15** | Normal | 800x600 | — | — | 5 | 19 | 8-21 |
| **4-16** | Tower | 640x640 | — | — | 5 | 19 | 8-24 |
| **4-17** | Flag | 900x720 | — | — | 5 | 19 | 8-26 |
| **4-18** | Boss | 900x720 | 6 | — | 3 | 19 | 8-28 |
| **4-19** | Normal | 800x600 | — | **NEW: Soldier** | 5 | 20 | 8-30 |
| **4-20** | Flag | 900x720 | — | — | 5 | 20 | 8-33 |
| **4-21** | Defense | 640x960 | — | — | 5 | 20 | 8-35 |
| **4-22** | Normal | 800x600 | — | — | 5 | 20 | 8-37 |
| **4-23** | Boss | 900x720 | 6 | — | 3 | 20 | 8-39 |
| **4-24** | Defense | 640x960 | — | — | 5 | 20 | 8-42 |
| **4-25** | Tower | 640x640 | — | — | 5 | 20 | 8-44 |
| **4-26** | Normal | 800x600 | — | — | 5 | 20 | 9-1 |
| **4-27** | Boss | 900x720 | 7 | — | 3 | 20 | 9-3 |
| **4-28** | Normal | 800x600 | — | — | 5 | 20 | 9-6 |
| **4-29** | Flag | 900x720 | — | — | 5 | 20 | 9-8 |
| **4-30** | Defense | 640x960 | — | — | 5 | 20 | 9-10 |
| **4-31** | Flag | 900x720 | — | — | 5 | 20 | 9-12 |
| **4-32** | Boss | 900x720 | 7 | — | 3 | 20 | 9-15 |
| **4-33** | Flag | 900x720 | — | — | 5 | 20 | 9-17 |
| **4-34** | Tower | 640x640 | — | — | 6 | 20 | 9-19 |
| **4-35** | Defense | 640x960 | — | — | 6 | 20 | 9-21 |
| **4-36** | Boss | 900x720 | 8 | — | 3 | 20 | 9-24 |
| **4-37** | Normal | 800x600 | — | — | 6 | 20 | 9-26 |
| **4-38** | Flag | 900x720 | — | — | 6 | 20 | 9-28 |
| **4-39** | Defense | 640x960 | — | — | 6 | 20 | 9-30 |
| **4-40** | Defense | 640x960 | — | — | 6 | 20 | 9-33 |
| **4-41** | Boss | 900x720 | 9 | — | 3 | 20 | 9-35 |
| **4-42** | Defense | 640x960 | — | — | 6 | 20 | 9-37 |
| **4-43** | Tower | 640x640 | — | — | 6 | 20 | 9-39 |
| **4-44** | Normal | 800x600 | — | — | 6 | 20 | 9-42 |
| **4-45** | Boss | 900x720 | 10 | — | 3 | 20 | 9-44 |

---

## 7. Open decisions

All six are answered. This is now the record of what was decided, not a set
of open questions.

| | Question | **Decision** | State |
|---|---|---|---|
| **D-1** | The boss health divisor | **Option A** — dropped, plus a four-alive cap with the rest queuing behind deaths | **Done, T247** (`A95`) |
| **D-2** | Should the freed Tower slots grow Normal/Flag/Defense instead of Boss? | **No** — rule 5 as written; the other three hold their old rate | settled; the tables above reflect it |
| **D-3** | Enemy density on ordinary levels | **+20% enemy count, -30% spawn interval.** Defense levels instead take **-40% interval and +50% enemy move speed** | to do |
| **D-4** | Nine themes across four worlds | **Pick exactly four, one per world.** | **Page built, T248** — open `#themes` in a dev build; awaiting the four |
| **D-5** | Free/premium split | **No premium at all.** All four worlds free; the restriction comes out of the campaign | to do |
| **D-6** | Existing saves | **Bump the save version and wipe progress** | to do |

## 8. What happens once this is approved

In order, one commit each — the boundaries matter, because a boss balance
regression that bisects to "one of these four things" is most of the value of
having bisected at all:

1. ~~**D-1 alone.** A stat rule with its own tests and no dependency on the
   new data.~~ **Done — T247.**
2. ~~**The theme dev page**, so D-4 can be answered by looking rather than
   guessing.~~ **Done — T248**, at `#themes`. The theme column of the level
   table stays a placeholder until the four are named.
2. **The achievement rescale and the new ceiling check**, also alone, and also
   before the data — a check has to exist before the thing it guards.
3. **The 180-level table**, generated from a source of truth carrying the
   constants in this file, with a `data:check` that fails when the file and
   the generator disagree. Hand-authoring 180 rows of magic numbers is how a
   campaign ends up with a level nobody can explain.
4. **The world-count consequences** — premium split, completion label,
   retiring `levelSizeOverrides`, the save version.

Steps 1 and 2 can land before the redesign is finalised; they are corrections
either way.

