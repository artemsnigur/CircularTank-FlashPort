# Enemy dossier — every stat, tier and multiplier

**Generated. Do not edit by hand — run `node scripts/gen-enemy-dossier.mjs`.**

Sources: `enemies/enemyStatsData.ts` (base stats, transcribed from
`EnemyModel.as`), `config/difficultyMultipliers.ts` (the scaling), and
`entities/enemyArt.ts` (hitboxes). The resolved tables are **computed** with
the same formula `resolveEnemyStats` uses, not described — see the head of
the generator for why.

20 enemy types, 4 tiers each (1, 2, 3, B).

## How difficulty scales an enemy

Three stages, in this order — `enemies/enemyStats.ts:115-150`:

1. **Tier multiplier** from the enemy's level suffix in the level tables.
2. **Difficulty profile**, the table below.
3. **Rounding**, which differs per field and is not uniform — see the notes.

### The difficulty profiles

| Field | What it scales | Easy | Normal | Hard |
|---|---|---|---|---|
| `amount` | enemy count per level | 1 | 1 | 1 |
| `spawnRate` | frames between spawns (**lower is harder**) | 1 | 0.95 | 0.9 |
| `enemyHealth` | health | 1 | 1.225 | 1.4 |
| `enemyDamage` | contact and bullet damage | 1 | 1.225 | 1.4 |
| `enemySpeed` | move speed *and* acceleration | 1 | 1.1 | 1.2 |
| `enemyRotation` | turn rate | 1 | 1.1 | 1.2 |
| `reloadTime` | shooter reload (**lower is harder**) | 1 | 0.85 | 0.7 |
| `enemyBulletSpeed` | enemy bullet speed | 1 | 1.15 | 1.3 |

**A fourth difficulty is a fourth column here** — one more `DifficultyProfile`
in `config/difficultyMultipliers.ts`, plus its entry in `DIFFICULTY_PROFILES`
and in the `Difficulty` union in `config/constants.ts`. Nothing else reads
these numbers directly.

Two of the eight are **inverted**: `spawnRate` and `reloadTime` are
multipliers on a *duration*, so a harder setting wants a smaller number.
Easy is 1.0 across the board, which is the AS3's own baseline.

### Tier multipliers

| Tier | Multiplier | Applies to |
|---|---|---|
| 1 | 1 | health, damage, money |
| 2 | 1.225 | health, damage, money |
| 3 | 1.4 | health, damage, money |
| B | 1 | **nothing** — see below |

### Three rules that are easy to get wrong

- **A boss takes neither the difficulty nor the tier multiplier on health.**
  `getTotalHealth` sets it to 1 for `enemyLevel == "B"`, so a boss has the
  same HP on Easy and Hard. Its *damage* still scales with difficulty.
- **A boss's health and money are divided by the level's boss count.** Three
  bosses on one level are a third the size each. Not shown in the tables
  below, which assume one.
- **Speed scales acceleration too.** `enemySpeed` multiplies both
  `moveSpeedMax` and `accSpeed`, so a faster setting also reaches top speed
  sooner.

Turn rate additionally carries `ENEMY_TURN_MULTIPLIER` = 2, a port
divergence applied on top of the difficulty figure so the AS3 ladder still
reads straight off the source.

## Base stats, before any multiplier

`Radius` is half the authored sprite width — `PartGameArea.as:3318` sets
`enemy.radius = enemy.width / 2`, so the art *is* the hitbox.

| Enemy | | HP | Dmg | $ | Speed | Accel | Turn | Radius | Shoots |
|---|---|---|---|---|---|---|---|---|---|
| **Accelerating** | normal | 20 | 6 | 120 | 1 | 0.2 | 2 | 10.5 | — |
|  | **boss** | 900 | 15 | 1400 | 1 | 0.2 | 2 | 50.5 | — |
| **Basic** | normal | 10 | 5 | 50 | 1.5 | 0.2 | 1 | 8.5 | — |
|  | **boss** | 500 | 15 | 500 | 1.5 | 0.2 | 1 | 40.5 | — |
| **Crazy** | normal | 15 | 5 | 100 | 1.5 | 0.2 | 1 | 10.5 | Basic/Circle, 6 shots every 180f |
|  | **boss** | 950 | 15 | 1500 | 1.5 | 0.2 | 1 | 50.5 | BasicBoss/Circle, 12 shots every 120f |
| **DamageAddict** | normal | 25 | 5 | 150 | 1.5 | 0.25 | 2.5 | 13.5 | — |
|  | **boss** | 500 | 15 | 1900 | 1.5 | 0.25 | 2.5 | 65.5 | — |
| **Exploding** | normal | 20 | 5 | 150 | 2.5 | 0.25 | 2.5 | 9.5 | — |
|  | **boss** | 1200 | 15 | 2000 | 2.5 | 0.25 | 2.5 | 45.5 | — |
| **Fast** | normal | 10 | 5 | 50 | 3 | 0.2 | 2 | 8.5 | — |
|  | **boss** | 600 | 15 | 600 | 3 | 0.1 | 2 | 40.5 | — |
| **Ghost** | normal | 10 | 5 | 80 | 2 | 0.25 | 3 | 9.5 | — |
|  | **boss** | 450 | 15 | 1000 | 2 | 0.25 | 3 | 45.5 | — |
| **GrapplingHook** | normal | 20 | 5 | 150 | 1.5 | 0.2 | 3 | 6.5 | Hook/Front, 1 shots every 60f |
|  | **boss** | 1200 | 15 | 2200 | 1.5 | 0.2 | 3 | 30.5 | Hook/FrontAmount, 3 shots every 60f |
| **Medic** | normal | 25 | 5 | 200 | 2 | 0.3 | 2 | 8.5 | — |
|  | **boss** | 1000 | 15 | 1600 | 2 | 0.3 | 2 | 40.5 | — |
| **Ninja** | normal | 10 | 5 | 100 | 3 | 0.2 | 2 | 8.5 | Basic/Front, 1 shots every 60f |
|  | **boss** | 850 | 15 | 1300 | 3 | 0.1 | 2 | 40.5 | BasicBoss/FrontAmount, 1 shots every 35f |
| **Random** | normal | 20 | 5 | 150 | 2 | 0.1 | 1.5 | 10.5 | Basic/Circle, 1 shots every 60f |
|  | **boss** | 1050 | 15 | 1700 | 2 | 0.1 | 1.5 | 50.5 | BasicBoss/Circle, 1 shots every 15f |
| **ScaredGhost** | normal | 10 | 5 | 150 | 2 | 0.5 | 3 | 8.5 | — |
|  | **boss** | 400 | 15 | 1800 | 2 | 0.5 | 3 | 40.5 | — |
| **Shooting** | normal | 10 | 5 | 60 | 1.5 | 0.2 | 1 | 10.5 | Basic/Front, 1 shots every 150f |
|  | **boss** | 650 | 15 | 700 | 1.5 | 0.2 | 1 | 50.5 | BasicBoss/FrontAmount, 4 shots every 100f |
| **Shrinking** | normal | 10 | 5 | 70 | 2 | 0.1 | 2.5 | 11.5 | — |
|  | **boss** | 750 | 15 | 900 | 2 | 0.1 | 2.5 | 55.5 | — |
| **Soldier** | normal | 20 | 5 | 150 | 2.5 | 0.2 | 2 | 9.5 | Following/Front, 1 shots every 150f |
|  | **boss** | 1200 | 15 | 2400 | 2.5 | 0.2 | 2 | 45.5 | FollowingBoss/FrontSides, 3 shots every 150f |
| **Strong** | normal | 20 | 5 | 100 | 2 | 0.3 | 1.5 | 12.5 | — |
|  | **boss** | 700 | 15 | 800 | 2 | 0.1 | 1.5 | 60.5 | — |
| **Teleporting** | normal | 20 | 5 | 150 | 2.5 | 0.3 | 3 | 7.5 | — |
|  | **boss** | 1200 | 15 | 2300 | 2.5 | 0.3 | 3 | 35.5 | — |
| **Temperamental** | normal | 20 | 6 | 100 | 1 | 0.2 | 2 | 9.5 | — |
|  | **boss** | 800 | 15 | 1200 | 1 | 0.2 | 2 | 45.5 | — |
| **Tiny** | normal | 15 | 5 | 150 | 1.8 | 0.4 | 2 | 4.5 | — |
|  | **boss** | 1200 | 15 | 2100 | 1.8 | 0.4 | 2 | 20.5 | — |
| **Trap** | normal | 15 | 5 | 80 | 1.5 | 0.2 | 1 | 6.5 | Trap/BackTrap, 1 shots every 100f |
|  | **boss** | 750 | 15 | 1100 | 1.5 | 0.2 | 1 | 30.5 | Trap/BackTrap, 3 shots every 75f |

## Strengths and weaknesses

A multiplier on incoming damage of that type. **Absent means 1.0.** A value
of 0 is immunity — the hit spawns an `Immune` marker and is silent.

| Enemy | Resists (takes less) | Weak to (takes more) |
|---|---|---|
| Accelerating | Explosions 0.25x, Magic 0.5x | Food 0.75x |
| Basic | — | — |
| Crazy | Poison 0.75x | Bullets 0.5x |
| DamageAddict | — | — |
| Exploding | Bullets 0.75x | Laser 0.75x |
| Fast | — | — |
| Ghost | Poison 0.5x | Laser 0.5x |
| GrapplingHook | Poison 0.25x, Ice 0.75x | Magic 0.75x |
| Medic | FireLava 0.5x, Food 0.25x | Poison 0.5x |
| Ninja | Bullets 0.25x, Laser 0.75x | FireLava 0.5x |
| Random | Magic 0.75x | Explosions 0.75x |
| ScaredGhost | Ice 0.5x | Poison 0.75x, Magic 0.5x |
| Shooting | — | — |
| Shrinking | Laser 0.5x | FireLava 0.75x |
| Soldier | Explosions 0.75x, FireLava 0.25x | Food 0.5x |
| Strong | Explosions 0.5x, Bullets 0.5x | — |
| Teleporting | Laser 0.25x | Ice 0.5x |
| Temperamental | FireLava 0.75x, Food 0.5x | Ice 0.75x |
| Tiny | Food 0.75x, Magic 0.25x | Bullets 0.75x |
| Trap | Ice 0.25x, Magic 0.75x | Explosions 0.5x |

## Resolved stats, per tier and difficulty

Computed with the same formula the game uses. Boss rows assume **one** boss
on the level; divide health and money by the actual count.

### Accelerating

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 20 | 6 | 120 | 1 | 0.2 | 4 | — |
| 1 | Normal | 25 | 7 | 120 | 1.1 | 0.22 | 4.4 | — |
| 1 | Hard | 28 | 8 | 120 | 1.2 | 0.24 | 4.8 | — |
| 2 | Easy | 25 | 7 | 147 | 1 | 0.2 | 4 | — |
| 2 | Normal | 30 | 9 | 147 | 1.1 | 0.22 | 4.4 | — |
| 2 | Hard | 34 | 10 | 147 | 1.2 | 0.24 | 4.8 | — |
| 3 | Easy | 28 | 8 | 168 | 1 | 0.2 | 4 | — |
| 3 | Normal | 34 | 10 | 168 | 1.1 | 0.22 | 4.4 | — |
| 3 | Hard | 39 | 12 | 168 | 1.2 | 0.24 | 4.8 | — |
| B | Easy | 900 | 15 | 1400 | 1 | 0.2 | 4 | — |
| B | Normal | 900 | 18 | 1400 | 1.1 | 0.22 | 4.4 | — |
| B | Hard | 900 | 21 | 1400 | 1.2 | 0.24 | 4.8 | — |

### Basic

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 10 | 5 | 50 | 1.5 | 0.2 | 2 | — |
| 1 | Normal | 12 | 6 | 50 | 1.65 | 0.22 | 2.2 | — |
| 1 | Hard | 14 | 7 | 50 | 1.8 | 0.24 | 2.4 | — |
| 2 | Easy | 12 | 6 | 61 | 1.5 | 0.2 | 2 | — |
| 2 | Normal | 15 | 8 | 61 | 1.65 | 0.22 | 2.2 | — |
| 2 | Hard | 17 | 9 | 61 | 1.8 | 0.24 | 2.4 | — |
| 3 | Easy | 14 | 7 | 70 | 1.5 | 0.2 | 2 | — |
| 3 | Normal | 17 | 9 | 70 | 1.65 | 0.22 | 2.2 | — |
| 3 | Hard | 20 | 10 | 70 | 1.8 | 0.24 | 2.4 | — |
| B | Easy | 500 | 15 | 500 | 1.5 | 0.2 | 2 | — |
| B | Normal | 500 | 18 | 500 | 1.65 | 0.22 | 2.2 | — |
| B | Hard | 500 | 21 | 500 | 1.8 | 0.24 | 2.4 | — |

### Crazy

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 15 | 5 | 100 | 1.5 | 0.2 | 2 | 180 |
| 1 | Normal | 18 | 6 | 100 | 1.65 | 0.22 | 2.2 | 153 |
| 1 | Hard | 21 | 7 | 100 | 1.8 | 0.24 | 2.4 | 126 |
| 2 | Easy | 18 | 6 | 123 | 1.5 | 0.2 | 2 | 180 |
| 2 | Normal | 23 | 8 | 123 | 1.65 | 0.22 | 2.2 | 153 |
| 2 | Hard | 26 | 9 | 123 | 1.8 | 0.24 | 2.4 | 126 |
| 3 | Easy | 21 | 7 | 140 | 1.5 | 0.2 | 2 | 180 |
| 3 | Normal | 26 | 9 | 140 | 1.65 | 0.22 | 2.2 | 153 |
| 3 | Hard | 29 | 10 | 140 | 1.8 | 0.24 | 2.4 | 126 |
| B | Easy | 950 | 15 | 1500 | 1.5 | 0.2 | 2 | 120 |
| B | Normal | 950 | 18 | 1500 | 1.65 | 0.22 | 2.2 | 102 |
| B | Hard | 950 | 21 | 1500 | 1.8 | 0.24 | 2.4 | 84 |

### DamageAddict

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 25 | 5 | 150 | 1.5 | 0.25 | 5 | — |
| 1 | Normal | 31 | 6 | 150 | 1.65 | 0.275 | 5.5 | — |
| 1 | Hard | 35 | 7 | 150 | 1.8 | 0.3 | 6 | — |
| 2 | Easy | 31 | 6 | 184 | 1.5 | 0.25 | 5 | — |
| 2 | Normal | 38 | 8 | 184 | 1.65 | 0.275 | 5.5 | — |
| 2 | Hard | 43 | 9 | 184 | 1.8 | 0.3 | 6 | — |
| 3 | Easy | 35 | 7 | 210 | 1.5 | 0.25 | 5 | — |
| 3 | Normal | 43 | 9 | 210 | 1.65 | 0.275 | 5.5 | — |
| 3 | Hard | 49 | 10 | 210 | 1.8 | 0.3 | 6 | — |
| B | Easy | 500 | 15 | 1900 | 1.5 | 0.25 | 5 | — |
| B | Normal | 500 | 18 | 1900 | 1.65 | 0.275 | 5.5 | — |
| B | Hard | 500 | 21 | 1900 | 1.8 | 0.3 | 6 | — |

### Exploding

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 20 | 5 | 150 | 2.5 | 0.25 | 5 | — |
| 1 | Normal | 25 | 6 | 150 | 2.75 | 0.275 | 5.5 | — |
| 1 | Hard | 28 | 7 | 150 | 3 | 0.3 | 6 | — |
| 2 | Easy | 25 | 6 | 184 | 2.5 | 0.25 | 5 | — |
| 2 | Normal | 30 | 8 | 184 | 2.75 | 0.275 | 5.5 | — |
| 2 | Hard | 34 | 9 | 184 | 3 | 0.3 | 6 | — |
| 3 | Easy | 28 | 7 | 210 | 2.5 | 0.25 | 5 | — |
| 3 | Normal | 34 | 9 | 210 | 2.75 | 0.275 | 5.5 | — |
| 3 | Hard | 39 | 10 | 210 | 3 | 0.3 | 6 | — |
| B | Easy | 1200 | 15 | 2000 | 2.5 | 0.25 | 5 | — |
| B | Normal | 1200 | 18 | 2000 | 2.75 | 0.275 | 5.5 | — |
| B | Hard | 1200 | 21 | 2000 | 3 | 0.3 | 6 | — |

### Fast

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 10 | 5 | 50 | 3 | 0.2 | 4 | — |
| 1 | Normal | 12 | 6 | 50 | 3.3 | 0.22 | 4.4 | — |
| 1 | Hard | 14 | 7 | 50 | 3.6 | 0.24 | 4.8 | — |
| 2 | Easy | 12 | 6 | 61 | 3 | 0.2 | 4 | — |
| 2 | Normal | 15 | 8 | 61 | 3.3 | 0.22 | 4.4 | — |
| 2 | Hard | 17 | 9 | 61 | 3.6 | 0.24 | 4.8 | — |
| 3 | Easy | 14 | 7 | 70 | 3 | 0.2 | 4 | — |
| 3 | Normal | 17 | 9 | 70 | 3.3 | 0.22 | 4.4 | — |
| 3 | Hard | 20 | 10 | 70 | 3.6 | 0.24 | 4.8 | — |
| B | Easy | 600 | 15 | 600 | 3 | 0.1 | 4 | — |
| B | Normal | 600 | 18 | 600 | 3.3 | 0.11 | 4.4 | — |
| B | Hard | 600 | 21 | 600 | 3.6 | 0.12 | 4.8 | — |

### Ghost

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 10 | 5 | 80 | 2 | 0.25 | 6 | — |
| 1 | Normal | 12 | 6 | 80 | 2.2 | 0.275 | 6.6 | — |
| 1 | Hard | 14 | 7 | 80 | 2.4 | 0.3 | 7.2 | — |
| 2 | Easy | 12 | 6 | 98 | 2 | 0.25 | 6 | — |
| 2 | Normal | 15 | 8 | 98 | 2.2 | 0.275 | 6.6 | — |
| 2 | Hard | 17 | 9 | 98 | 2.4 | 0.3 | 7.2 | — |
| 3 | Easy | 14 | 7 | 112 | 2 | 0.25 | 6 | — |
| 3 | Normal | 17 | 9 | 112 | 2.2 | 0.275 | 6.6 | — |
| 3 | Hard | 20 | 10 | 112 | 2.4 | 0.3 | 7.2 | — |
| B | Easy | 450 | 15 | 1000 | 2 | 0.25 | 6 | — |
| B | Normal | 450 | 18 | 1000 | 2.2 | 0.275 | 6.6 | — |
| B | Hard | 450 | 21 | 1000 | 2.4 | 0.3 | 7.2 | — |

### GrapplingHook

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 20 | 5 | 150 | 1.5 | 0.2 | 6 | 60 |
| 1 | Normal | 25 | 6 | 150 | 1.65 | 0.22 | 6.6 | 51 |
| 1 | Hard | 28 | 7 | 150 | 1.8 | 0.24 | 7.2 | 42 |
| 2 | Easy | 25 | 6 | 184 | 1.5 | 0.2 | 6 | 60 |
| 2 | Normal | 30 | 8 | 184 | 1.65 | 0.22 | 6.6 | 51 |
| 2 | Hard | 34 | 9 | 184 | 1.8 | 0.24 | 7.2 | 42 |
| 3 | Easy | 28 | 7 | 210 | 1.5 | 0.2 | 6 | 60 |
| 3 | Normal | 34 | 9 | 210 | 1.65 | 0.22 | 6.6 | 51 |
| 3 | Hard | 39 | 10 | 210 | 1.8 | 0.24 | 7.2 | 42 |
| B | Easy | 1200 | 15 | 2200 | 1.5 | 0.2 | 6 | 60 |
| B | Normal | 1200 | 18 | 2200 | 1.65 | 0.22 | 6.6 | 51 |
| B | Hard | 1200 | 21 | 2200 | 1.8 | 0.24 | 7.2 | 42 |

### Medic

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 25 | 5 | 200 | 2 | 0.3 | 4 | — |
| 1 | Normal | 31 | 6 | 200 | 2.2 | 0.33 | 4.4 | — |
| 1 | Hard | 35 | 7 | 200 | 2.4 | 0.36 | 4.8 | — |
| 2 | Easy | 31 | 6 | 245 | 2 | 0.3 | 4 | — |
| 2 | Normal | 38 | 8 | 245 | 2.2 | 0.33 | 4.4 | — |
| 2 | Hard | 43 | 9 | 245 | 2.4 | 0.36 | 4.8 | — |
| 3 | Easy | 35 | 7 | 280 | 2 | 0.3 | 4 | — |
| 3 | Normal | 43 | 9 | 280 | 2.2 | 0.33 | 4.4 | — |
| 3 | Hard | 49 | 10 | 280 | 2.4 | 0.36 | 4.8 | — |
| B | Easy | 1000 | 15 | 1600 | 2 | 0.3 | 4 | — |
| B | Normal | 1000 | 18 | 1600 | 2.2 | 0.33 | 4.4 | — |
| B | Hard | 1000 | 21 | 1600 | 2.4 | 0.36 | 4.8 | — |

### Ninja

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 10 | 5 | 100 | 3 | 0.2 | 4 | 60 |
| 1 | Normal | 12 | 6 | 100 | 3.3 | 0.22 | 4.4 | 51 |
| 1 | Hard | 14 | 7 | 100 | 3.6 | 0.24 | 4.8 | 42 |
| 2 | Easy | 12 | 6 | 123 | 3 | 0.2 | 4 | 60 |
| 2 | Normal | 15 | 8 | 123 | 3.3 | 0.22 | 4.4 | 51 |
| 2 | Hard | 17 | 9 | 123 | 3.6 | 0.24 | 4.8 | 42 |
| 3 | Easy | 14 | 7 | 140 | 3 | 0.2 | 4 | 60 |
| 3 | Normal | 17 | 9 | 140 | 3.3 | 0.22 | 4.4 | 51 |
| 3 | Hard | 20 | 10 | 140 | 3.6 | 0.24 | 4.8 | 42 |
| B | Easy | 850 | 15 | 1300 | 3 | 0.1 | 4 | 35 |
| B | Normal | 850 | 18 | 1300 | 3.3 | 0.11 | 4.4 | 30 |
| B | Hard | 850 | 21 | 1300 | 3.6 | 0.12 | 4.8 | 25 |

### Random

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 20 | 5 | 150 | 2 | 0.1 | 3 | 60 |
| 1 | Normal | 25 | 6 | 150 | 2.2 | 0.11 | 3.3 | 51 |
| 1 | Hard | 28 | 7 | 150 | 2.4 | 0.12 | 3.6 | 42 |
| 2 | Easy | 25 | 6 | 184 | 2 | 0.1 | 3 | 60 |
| 2 | Normal | 30 | 8 | 184 | 2.2 | 0.11 | 3.3 | 51 |
| 2 | Hard | 34 | 9 | 184 | 2.4 | 0.12 | 3.6 | 42 |
| 3 | Easy | 28 | 7 | 210 | 2 | 0.1 | 3 | 60 |
| 3 | Normal | 34 | 9 | 210 | 2.2 | 0.11 | 3.3 | 51 |
| 3 | Hard | 39 | 10 | 210 | 2.4 | 0.12 | 3.6 | 42 |
| B | Easy | 1050 | 15 | 1700 | 2 | 0.1 | 3 | 15 |
| B | Normal | 1050 | 18 | 1700 | 2.2 | 0.11 | 3.3 | 13 |
| B | Hard | 1050 | 21 | 1700 | 2.4 | 0.12 | 3.6 | 11 |

### ScaredGhost

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 10 | 5 | 150 | 2 | 0.5 | 6 | — |
| 1 | Normal | 12 | 6 | 150 | 2.2 | 0.55 | 6.6 | — |
| 1 | Hard | 14 | 7 | 150 | 2.4 | 0.6 | 7.2 | — |
| 2 | Easy | 12 | 6 | 184 | 2 | 0.5 | 6 | — |
| 2 | Normal | 15 | 8 | 184 | 2.2 | 0.55 | 6.6 | — |
| 2 | Hard | 17 | 9 | 184 | 2.4 | 0.6 | 7.2 | — |
| 3 | Easy | 14 | 7 | 210 | 2 | 0.5 | 6 | — |
| 3 | Normal | 17 | 9 | 210 | 2.2 | 0.55 | 6.6 | — |
| 3 | Hard | 20 | 10 | 210 | 2.4 | 0.6 | 7.2 | — |
| B | Easy | 400 | 15 | 1800 | 2 | 0.5 | 6 | — |
| B | Normal | 400 | 18 | 1800 | 2.2 | 0.55 | 6.6 | — |
| B | Hard | 400 | 21 | 1800 | 2.4 | 0.6 | 7.2 | — |

### Shooting

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 10 | 5 | 60 | 1.5 | 0.2 | 2 | 150 |
| 1 | Normal | 12 | 6 | 60 | 1.65 | 0.22 | 2.2 | 128 |
| 1 | Hard | 14 | 7 | 60 | 1.8 | 0.24 | 2.4 | 105 |
| 2 | Easy | 12 | 6 | 74 | 1.5 | 0.2 | 2 | 150 |
| 2 | Normal | 15 | 8 | 74 | 1.65 | 0.22 | 2.2 | 128 |
| 2 | Hard | 17 | 9 | 74 | 1.8 | 0.24 | 2.4 | 105 |
| 3 | Easy | 14 | 7 | 84 | 1.5 | 0.2 | 2 | 150 |
| 3 | Normal | 17 | 9 | 84 | 1.65 | 0.22 | 2.2 | 128 |
| 3 | Hard | 20 | 10 | 84 | 1.8 | 0.24 | 2.4 | 105 |
| B | Easy | 650 | 15 | 700 | 1.5 | 0.2 | 2 | 100 |
| B | Normal | 650 | 18 | 700 | 1.65 | 0.22 | 2.2 | 85 |
| B | Hard | 650 | 21 | 700 | 1.8 | 0.24 | 2.4 | 70 |

### Shrinking

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 10 | 5 | 70 | 2 | 0.1 | 5 | — |
| 1 | Normal | 12 | 6 | 70 | 2.2 | 0.11 | 5.5 | — |
| 1 | Hard | 14 | 7 | 70 | 2.4 | 0.12 | 6 | — |
| 2 | Easy | 12 | 6 | 86 | 2 | 0.1 | 5 | — |
| 2 | Normal | 15 | 8 | 86 | 2.2 | 0.11 | 5.5 | — |
| 2 | Hard | 17 | 9 | 86 | 2.4 | 0.12 | 6 | — |
| 3 | Easy | 14 | 7 | 98 | 2 | 0.1 | 5 | — |
| 3 | Normal | 17 | 9 | 98 | 2.2 | 0.11 | 5.5 | — |
| 3 | Hard | 20 | 10 | 98 | 2.4 | 0.12 | 6 | — |
| B | Easy | 750 | 15 | 900 | 2 | 0.1 | 5 | — |
| B | Normal | 750 | 18 | 900 | 2.2 | 0.11 | 5.5 | — |
| B | Hard | 750 | 21 | 900 | 2.4 | 0.12 | 6 | — |

### Soldier

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 20 | 5 | 150 | 2.5 | 0.2 | 4 | 150 |
| 1 | Normal | 25 | 6 | 150 | 2.75 | 0.22 | 4.4 | 128 |
| 1 | Hard | 28 | 7 | 150 | 3 | 0.24 | 4.8 | 105 |
| 2 | Easy | 25 | 6 | 184 | 2.5 | 0.2 | 4 | 150 |
| 2 | Normal | 30 | 8 | 184 | 2.75 | 0.22 | 4.4 | 128 |
| 2 | Hard | 34 | 9 | 184 | 3 | 0.24 | 4.8 | 105 |
| 3 | Easy | 28 | 7 | 210 | 2.5 | 0.2 | 4 | 150 |
| 3 | Normal | 34 | 9 | 210 | 2.75 | 0.22 | 4.4 | 128 |
| 3 | Hard | 39 | 10 | 210 | 3 | 0.24 | 4.8 | 105 |
| B | Easy | 1200 | 15 | 2400 | 2.5 | 0.2 | 4 | 150 |
| B | Normal | 1200 | 18 | 2400 | 2.75 | 0.22 | 4.4 | 128 |
| B | Hard | 1200 | 21 | 2400 | 3 | 0.24 | 4.8 | 105 |

### Strong

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 20 | 5 | 100 | 2 | 0.3 | 3 | — |
| 1 | Normal | 25 | 6 | 100 | 2.2 | 0.33 | 3.3 | — |
| 1 | Hard | 28 | 7 | 100 | 2.4 | 0.36 | 3.6 | — |
| 2 | Easy | 25 | 6 | 123 | 2 | 0.3 | 3 | — |
| 2 | Normal | 30 | 8 | 123 | 2.2 | 0.33 | 3.3 | — |
| 2 | Hard | 34 | 9 | 123 | 2.4 | 0.36 | 3.6 | — |
| 3 | Easy | 28 | 7 | 140 | 2 | 0.3 | 3 | — |
| 3 | Normal | 34 | 9 | 140 | 2.2 | 0.33 | 3.3 | — |
| 3 | Hard | 39 | 10 | 140 | 2.4 | 0.36 | 3.6 | — |
| B | Easy | 700 | 15 | 800 | 2 | 0.1 | 3 | — |
| B | Normal | 700 | 18 | 800 | 2.2 | 0.11 | 3.3 | — |
| B | Hard | 700 | 21 | 800 | 2.4 | 0.12 | 3.6 | — |

### Teleporting

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 20 | 5 | 150 | 2.5 | 0.3 | 6 | — |
| 1 | Normal | 25 | 6 | 150 | 2.75 | 0.33 | 6.6 | — |
| 1 | Hard | 28 | 7 | 150 | 3 | 0.36 | 7.2 | — |
| 2 | Easy | 25 | 6 | 184 | 2.5 | 0.3 | 6 | — |
| 2 | Normal | 30 | 8 | 184 | 2.75 | 0.33 | 6.6 | — |
| 2 | Hard | 34 | 9 | 184 | 3 | 0.36 | 7.2 | — |
| 3 | Easy | 28 | 7 | 210 | 2.5 | 0.3 | 6 | — |
| 3 | Normal | 34 | 9 | 210 | 2.75 | 0.33 | 6.6 | — |
| 3 | Hard | 39 | 10 | 210 | 3 | 0.36 | 7.2 | — |
| B | Easy | 1200 | 15 | 2300 | 2.5 | 0.3 | 6 | — |
| B | Normal | 1200 | 18 | 2300 | 2.75 | 0.33 | 6.6 | — |
| B | Hard | 1200 | 21 | 2300 | 3 | 0.36 | 7.2 | — |

### Temperamental

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 20 | 6 | 100 | 1 | 0.2 | 4 | — |
| 1 | Normal | 25 | 7 | 100 | 1.1 | 0.22 | 4.4 | — |
| 1 | Hard | 28 | 8 | 100 | 1.2 | 0.24 | 4.8 | — |
| 2 | Easy | 25 | 7 | 123 | 1 | 0.2 | 4 | — |
| 2 | Normal | 30 | 9 | 123 | 1.1 | 0.22 | 4.4 | — |
| 2 | Hard | 34 | 10 | 123 | 1.2 | 0.24 | 4.8 | — |
| 3 | Easy | 28 | 8 | 140 | 1 | 0.2 | 4 | — |
| 3 | Normal | 34 | 10 | 140 | 1.1 | 0.22 | 4.4 | — |
| 3 | Hard | 39 | 12 | 140 | 1.2 | 0.24 | 4.8 | — |
| B | Easy | 800 | 15 | 1200 | 1 | 0.2 | 4 | — |
| B | Normal | 800 | 18 | 1200 | 1.1 | 0.22 | 4.4 | — |
| B | Hard | 800 | 21 | 1200 | 1.2 | 0.24 | 4.8 | — |

### Tiny

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 15 | 5 | 150 | 1.8 | 0.4 | 4 | — |
| 1 | Normal | 18 | 6 | 150 | 1.98 | 0.44 | 4.4 | — |
| 1 | Hard | 21 | 7 | 150 | 2.16 | 0.48 | 4.8 | — |
| 2 | Easy | 18 | 6 | 184 | 1.8 | 0.4 | 4 | — |
| 2 | Normal | 23 | 8 | 184 | 1.98 | 0.44 | 4.4 | — |
| 2 | Hard | 26 | 9 | 184 | 2.16 | 0.48 | 4.8 | — |
| 3 | Easy | 21 | 7 | 210 | 1.8 | 0.4 | 4 | — |
| 3 | Normal | 26 | 9 | 210 | 1.98 | 0.44 | 4.4 | — |
| 3 | Hard | 29 | 10 | 210 | 2.16 | 0.48 | 4.8 | — |
| B | Easy | 1200 | 15 | 2100 | 1.8 | 0.4 | 4 | — |
| B | Normal | 1200 | 18 | 2100 | 1.98 | 0.44 | 4.4 | — |
| B | Hard | 1200 | 21 | 2100 | 2.16 | 0.48 | 4.8 | — |

### Trap

| Tier | Difficulty | HP | Dmg | $ | Speed | Accel | Turn | Reload |
|---|---|---|---|---|---|---|---|---|
| 1 | Easy | 15 | 5 | 80 | 1.5 | 0.2 | 2 | 100 |
| 1 | Normal | 18 | 6 | 80 | 1.65 | 0.22 | 2.2 | 85 |
| 1 | Hard | 21 | 7 | 80 | 1.8 | 0.24 | 2.4 | 70 |
| 2 | Easy | 18 | 6 | 98 | 1.5 | 0.2 | 2 | 100 |
| 2 | Normal | 23 | 8 | 98 | 1.65 | 0.22 | 2.2 | 85 |
| 2 | Hard | 26 | 9 | 98 | 1.8 | 0.24 | 2.4 | 70 |
| 3 | Easy | 21 | 7 | 112 | 1.5 | 0.2 | 2 | 100 |
| 3 | Normal | 26 | 9 | 112 | 1.65 | 0.22 | 2.2 | 85 |
| 3 | Hard | 29 | 10 | 112 | 1.8 | 0.24 | 2.4 | 70 |
| B | Easy | 750 | 15 | 1100 | 1.5 | 0.2 | 2 | 75 |
| B | Normal | 750 | 18 | 1100 | 1.65 | 0.22 | 2.2 | 64 |
| B | Hard | 750 | 21 | 1100 | 1.8 | 0.24 | 2.4 | 53 |
