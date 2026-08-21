# Level dossier — every world, level, mode and wave

**Generated. Do not edit by hand — run `node scripts/gen-level-dossier.mjs`.**

Source: `src/game/levels/levelData.ts`, which is a pure transcription of
`ScreenGame.as`. Deliberate divergences are applied by `getLevel` at read
time and are listed at the end rather than folded in here, so this document
shows what the original specifies.

9 worlds, 405 levels.

## Worlds at a glance

| World | Theme | Levels | Modes | Enemy types | Bosses | New types here |
|---|---|---|---|---|---|---|
| **1** | Desert | 45 | Tower 13, Normal 9, Flag 9, Defense 9, Boss 5 | 6 | 5 | Basic, Fast, Shooting, Strong, Shrinking, Ghost |
| **2** | Grass | 45 | Normal 12, Defense 11, Flag 10, Tower 7, Boss 5 | 9 | 6 | Trap, Temperamental, Ninja |
| **3** | BlueDirt | 45 | Tower 11, Flag 11, Normal 10, Defense 8, Boss 5 | 11 | 8 | Accelerating, Crazy |
| **4** | Beach | 45 | Defense 12, Tower 11, Flag 9, Normal 8, Boss 5 | 13 | 9 | Medic, ScaredGhost |
| **5** | Concrete | 45 | Flag 11, Normal 10, Tower 10, Defense 9, Boss 5 | 14 | 11 | DamageAddict |
| **6** | Biology | 45 | Defense 11, Normal 11, Flag 10, Tower 8, Boss 5 | 15 | 10 | Random |
| **7** | Hell | 45 | Defense 11, Normal 11, Tower 10, Flag 8, Boss 5 | 18 | 9 | Exploding, Tiny, GrapplingHook |
| **8** | MagicStone | 45 | Flag 11, Defense 11, Tower 10, Normal 8, Boss 5 | 19 | 10 | Teleporting |
| **9** | Futuristic | 45 | Normal 11, Flag 11, Tower 10, Defense 8, Boss 5 | 20 | 12 | Soldier |

## Enemy roster — where each type enters

`First seen` is the earliest level containing the type at any tier;
`first boss` is the earliest level containing it as a boss. `Levels` counts
the levels it appears in, `total` the sum of its counts across all of them.

| Enemy | First seen | First boss | Levels | Total spawned | Worlds |
|---|---|---|---|---|---|
| Basic | 1-1 | 1-9 | 77 | 937 | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| Fast | 1-2 | 1-18 | 92 | 897 | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| Shooting | 1-6 | 1-27 | 84 | 882 | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| Strong | 1-13 | 1-36 | 94 | 836 | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| Shrinking | 1-24 | 1-45 | 78 | 796 | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| Ghost | 1-36 | 2-9 | 70 | 777 | 1, 2, 3, 4, 5, 6, 7, 8, 9 |
| Trap | 2-8 | 2-18 | 71 | 737 | 2, 3, 4, 5, 6, 7, 8, 9 |
| Temperamental | 2-21 | 2-27 | 60 | 698 | 2, 3, 4, 5, 6, 7, 8, 9 |
| Ninja | 2-44 | 2-45 | 72 | 662 | 2, 3, 4, 5, 6, 7, 8, 9 |
| Accelerating | 3-14 | 3-18 | 52 | 642 | 3, 4, 5, 6, 7, 8, 9 |
| Crazy | 3-36 | 3-36 | 59 | 608 | 3, 4, 5, 6, 7, 8, 9 |
| Medic | 4-15 | 4-18 | 57 | 589 | 4, 5, 6, 7, 8, 9 |
| ScaredGhost | 4-41 | 4-45 | 49 | 556 | 4, 5, 6, 7, 8, 9 |
| DamageAddict | 5-24 | 5-27 | 48 | 512 | 5, 6, 7, 8, 9 |
| Random | 6-7 | 6-9 | 50 | 489 | 6, 7, 8, 9 |
| Exploding | 7-1 | 7-9 | 34 | 437 | 7, 8, 9 |
| Tiny | 7-26 | 7-27 | 30 | 390 | 7, 8, 9 |
| GrapplingHook | 7-44 | 7-45 | 34 | 347 | 7, 8, 9 |
| Teleporting | 8-20 | 8-27 | 28 | 280 | 8, 9 |
| Soldier | 9-1 | 9-9 | 19 | 225 | 9 |

## Modes

| Mode | Levels | Share |
|---|---|---|
| Normal | 90 | 22.2% |
| Flag | 90 | 22.2% |
| Tower | 90 | 22.2% |
| Defense | 90 | 22.2% |
| Boss | 45 | 11.1% |

## Structural rules, checked against all 405 rows

- **Every world has exactly 45 levels**: true of all 9.
- **Boss levels sit at 9, 18, 27, 36, 45** in every world — every ninth level, no exceptions. 45 boss levels in total.
- **One theme per world**: true of all 9.
- **5 distinct room sizes** across the game: 900x720 (120), 640x640 (90), 640x960 (90), 800x600 (75), 640x400 (30).
- **New enemy types per world**: 6, 3, 2, 2, 1, 1, 3, 1, 1. The last four worlds introduce 6 between them, against 14 in the first five.
- **Longest run with no new enemy**: 39 levels, ending when Exploding arrives. Mean gap between introductions is 18.9 levels.
- **Enemy tiers in use**: 1, 2, 3, B (`B` is the boss tier).

## Every level

`Room` is in design units. `Interval` is frames between spawns at 30fps.
`Cap` is the upgrade-level cap the AS3 records — **the port ignores it**
(divergence `A11`), so it is informational. Flag columns are 0 outside Flag
levels.

### World 1 — Desert

| Level | Mode | Room | Enemies | Interval | Cap | Bosses | Flags | $/flag | Wave composition |
|---|---|---|---|---|---|---|---|---|---|
| **1-1** | Normal | 640x400 | 10 | 45.53 | 1 | — | — | — | 10x Basic (t1) <br>**NEW: Basic** |
| **1-2** | Normal | 900x720 | 18 | 42 | 1 | — | — | — | 12x Basic (t1), 6x Fast (t1) <br>**NEW: Fast** |
| **1-3** | Flag | 640x400 | 14 | 104.36 | 1 | — | 10 | 102 | 10x Basic (t1), 4x Fast (t1) |
| **1-4** | Normal | 800x600 | 20 | 49.55 | 2 | — | — | — | 10x Basic (t1), 10x Fast (t1) |
| **1-5** | Flag | 900x720 | 20 | 100 | 2 | — | 8 | 136 | 20x Fast (t1) |
| **1-6** | Normal | 900x720 | 26 | 47.14 | 2 | — | — | — | 13x Basic (t1), 13x Shooting (t1) <br>**NEW: Shooting** |
| **1-7** | Tower | 640x640 | 20 | 98.03 | 2 | — | — | — | 10x Basic (t1), 10x Fast (t1) |
| **1-8** | Normal | 900x720 | 28 | 60.08 | 2 | — | — | — | 14x Fast (t1), 14x Shooting (t1) |
| **1-9** | Boss | 800x600 | 20 | 143.94 | 2 | 1 | — | — | 1x Basic **[BOSS]**, 7x Fast (t1), 6x Basic (t1), 6x Shooting (t1) |
| **1-10** | Tower | 640x640 | 20 | 109.06 | 2 | — | — | — | 14x Fast (t1), 6x Basic (t1) |
| **1-11** | Defense | 640x960 | 31 | 45.1 | 2 | — | — | — | 18x Shooting (t1), 13x Basic (t1) |
| **1-12** | Tower | 640x640 | 24 | 79.21 | 2 | — | — | — | 15x Basic (t1), 9x Fast (t1) |
| **1-13** | Defense | 640x960 | 24 | 78 | 2 | — | — | — | 10x Strong (t1), 8x Basic (t1), 6x Shooting (t1) <br>**NEW: Strong** |
| **1-14** | Tower | 640x640 | 15 | 165.1 | 2 | — | — | — | 8x Strong (t1), 4x Basic (t1), 3x Fast (t1) |
| **1-15** | Flag | 800x600 | 18 | 119.44 | 3 | — | 12 | 122 | 7x Basic (t1), 7x Fast (t1), 4x Shooting (t1) |
| **1-16** | Tower | 640x640 | 13 | 209.53 | 3 | — | — | — | 9x Strong (t1), 4x Fast (t1) |
| **1-17** | Normal | 900x720 | 27 | 57.02 | 3 | — | — | — | 12x Shooting (t1), 8x Fast (t1), 7x Strong (t1) |
| **1-18** | Boss | 900x720 | 27 | 63.97 | 3 | 1 | — | — | 1x Fast **[BOSS]**, 13x Basic (t1), 8x Strong (t1), 5x Fast (t1) |
| **1-19** | Flag | 900x720 | 35 | 28.25 | 3 | — | 11 | 142 | 26x Basic (t1), 9x Fast (t1) |
| **1-20** | Defense | 640x960 | 19 | 108.3 | 3 | — | — | — | 19x Strong (t1) |
| **1-21** | Flag | 900x720 | 21 | 82.19 | 3 | — | 12 | 143 | 11x Fast (t2), 6x Basic (t1), 4x Shooting (t1) |
| **1-22** | Defense | 640x960 | 28 | 52.19 | 3 | — | — | — | 17x Shooting (t1), 11x Fast (t2) |
| **1-23** | Normal | 800x600 | 26 | 65.28 | 3 | — | — | — | 13x Basic (t2), 8x Shooting (t1), 5x Strong (t1) |
| **1-24** | Flag | 800x600 | 20 | 96.28 | 3 | — | 14 | 129 | 12x Shrinking (t1), 8x Shooting (t1) <br>**NEW: Shrinking** |
| **1-25** | Tower | 640x640 | 18 | 120.31 | 3 | — | — | — | 6x Basic (t1), 6x Fast (t2), 6x Strong (t1) |
| **1-26** | Tower | 640x640 | 16 | 152.12 | 3 | — | — | — | 9x Strong (t1), 4x Fast (t2), 3x Basic (t1) |
| **1-27** | Boss | 800x600 | 20 | 117.14 | 3 | 1 | — | — | 1x Shooting **[BOSS]**, 8x Basic (t2), 7x Fast (t1), 4x Strong (t1) |
| **1-28** | Normal | 800x600 | 26 | 58.43 | 3 | — | — | — | 13x Shooting (t2), 13x Shrinking (t1) |
| **1-29** | Defense | 640x960 | 30 | 40.93 | 3 | — | — | — | 15x Fast (t1), 15x Shrinking (t1) |
| **1-30** | Flag | 640x400 | 15 | 158.03 | 4 | — | 20 | 104 | 5x Basic (t1), 5x Shooting (t2), 5x Strong (t1) |
| **1-31** | Tower | 640x640 | 20 | 114.34 | 4 | — | — | — | 10x Basic (t2), 10x Strong (t1) |
| **1-32** | Tower | 640x640 | 24 | 76.36 | 4 | — | — | — | 12x Basic (t1), 7x Shrinking (t1), 5x Strong (t2) |
| **1-33** | Defense | 640x960 | 29 | 49.43 | 4 | — | — | — | 13x Shrinking (t1), 10x Fast (t1), 6x Strong (t1) |
| **1-34** | Tower | 640x640 | 16 | 168.12 | 4 | — | — | — | 8x Fast (t2), 8x Strong (t1) |
| **1-35** | Defense | 640x960 | 34 | 37.06 | 4 | — | — | — | 17x Basic (t1), 17x Shooting (t2) |
| **1-36** | Boss | 900x720 | 23 | 88.88 | 4 | 1 | — | — | 1x Strong **[BOSS]**, 9x Ghost (t1), 7x Shooting (t2), 6x Shrinking (t1) <br>**NEW: Ghost** |
| **1-37** | Tower | 640x640 | 20 | 106.25 | 4 | — | — | — | 20x Ghost (t1) |
| **1-38** | Defense | 640x960 | 26 | 62.85 | 4 | — | — | — | 11x Shooting (t2), 9x Strong (t1), 6x Shrinking (t1) |
| **1-39** | Flag | 900x720 | 24 | 74.97 | 4 | — | 16 | 152 | 8x Shooting (t2), 8x Strong (t1), 8x Shrinking (t1) |
| **1-40** | Defense | 640x960 | 28 | 53.73 | 4 | — | — | — | 14x Fast (t3), 14x Shooting (t1) |
| **1-41** | Tower | 640x640 | 19 | 123.3 | 4 | — | — | — | 11x Strong (t1), 4x Basic (t1), 4x Shrinking (t1) |
| **1-42** | Flag | 800x600 | 27 | 59.36 | 4 | — | 19 | 136 | 9x Fast (t3), 9x Shrinking (t1), 9x Ghost (t1) |
| **1-43** | Normal | 900x720 | 32 | 38.19 | 4 | — | — | — | 21x Shooting (t1), 11x Fast (t1) |
| **1-44** | Tower | 640x640 | 21 | 101.79 | 4 | — | — | — | 7x Basic (t1), 7x Strong (t1), 7x Ghost (t1) |
| **1-45** | Boss | 800x600 | 22 | 87.21 | 4 | 1 | — | — | 1x Shrinking **[BOSS]**, 7x Fast (t2), 7x Shrinking (t1), 7x Ghost (t1) |

### World 2 — Grass

| Level | Mode | Room | Enemies | Interval | Cap | Bosses | Flags | $/flag | Wave composition |
|---|---|---|---|---|---|---|---|---|---|
| **2-1** | Defense | 640x960 | 28 | 55.36 | 5 | — | — | — | 14x Strong (t1), 14x Shrinking (t1) |
| **2-2** | Normal | 640x400 | 27 | 50.59 | 5 | — | — | — | 11x Ghost (t1), 9x Fast (t1), 7x Basic (t2) |
| **2-3** | Flag | 900x720 | 28 | 50.91 | 5 | — | 18 | 152 | 20x Basic (t1), 8x Shooting (t2) |
| **2-4** | Flag | 640x400 | 16 | 149.15 | 5 | — | 24 | 111 | 8x Fast (t1), 4x Shooting (t1), 4x Ghost (t1) |
| **2-5** | Normal | 900x720 | 42 | 16.38 | 5 | — | — | — | 28x Basic (t2), 14x Shrinking (t1) |
| **2-6** | Tower | 640x640 | 17 | 135.71 | 5 | — | — | — | 6x Strong (t1), 6x Ghost (t1), 5x Fast (t2) |
| **2-7** | Defense | 640x960 | 27 | 62.1 | 5 | — | — | — | 20x Fast (t1), 7x Strong (t2) |
| **2-8** | Defense | 640x960 | 30 | 49.1 | 5 | — | — | — | 30x Trap (t1) <br>**NEW: Trap** |
| **2-9** | Boss | 900x720 | 27 | 65.55 | 5 | 1 | — | — | 1x Ghost **[BOSS]**, 13x Shooting (t2), 13x Shrinking (t2) |
| **2-10** | Defense | 640x960 | 25 | 71.62 | 5 | — | — | — | 11x Ghost (t1), 9x Strong (t1), 5x Shooting (t1) |
| **2-11** | Flag | 800x600 | 18 | 118.78 | 5 | — | 20 | 140 | 6x Shrinking (t3), 6x Ghost (t1), 6x Trap (t1) |
| **2-12** | Flag | 900x720 | 26 | 64.21 | 5 | — | 18 | 160 | 14x Ghost (t2), 7x Basic (t2), 5x Shooting (t3) |
| **2-13** | Defense | 640x960 | 25 | 72.53 | 5 | — | — | — | 12x Trap (t1), 8x Strong (t1), 5x Fast (t1) |
| **2-14** | Flag | 900x720 | 38 | 24.89 | 5 | — | 18 | 161 | 19x Basic (t3), 19x Shrinking (t1) |
| **2-15** | Tower | 640x640 | 18 | 120.42 | 5 | — | — | — | 6x Fast (t1), 6x Strong (t1), 6x Ghost (t1) |
| **2-16** | Normal | 800x600 | 23 | 82.67 | 5 | — | — | — | 12x Strong (t1), 11x Trap (t1) |
| **2-17** | Flag | 800x600 | 21 | 94.69 | 5 | — | 20 | 144 | 7x Fast (t1), 7x Shooting (t1), 7x Ghost (t2) |
| **2-18** | Boss | 900x720 | 22 | 92.63 | 5 | 1 | — | — | 1x Trap **[BOSS]**, 7x Shooting (t1), 7x Strong (t1), 7x Shrinking (t3) |
| **2-19** | Defense | 640x960 | 28 | 53.84 | 5 | — | — | — | 21x Ghost (t1), 7x Strong (t1) |
| **2-20** | Normal | 900x720 | 31 | 48 | 5 | — | — | — | 14x Fast (t2), 9x Strong (t1), 8x Shooting (t1) |
| **2-21** | Defense | 640x960 | 27 | 59.07 | 5 | — | — | — | 20x Temperamental (t1), 7x Trap (t1) <br>**NEW: Temperamental** |
| **2-22** | Flag | 900x720 | 22 | 89.69 | 5 | — | 18 | 168 | 12x Strong (t1), 5x Shrinking (t1), 5x Trap (t1) |
| **2-23** | Normal | 800x600 | 37 | 25.74 | 5 | — | — | — | 26x Basic (t2), 11x Fast (t1) |
| **2-24** | Tower | 640x640 | 24 | 73.96 | 5 | — | — | — | 14x Ghost (t1), 10x Shrinking (t1) |
| **2-25** | Normal | 640x400 | 24 | 80.72 | 5 | — | — | — | 11x Shooting (t3), 7x Temperamental (t1), 6x Trap (t3) |
| **2-26** | Normal | 900x720 | 37 | 29.49 | 6 | — | — | — | 37x Shooting (t2) |
| **2-27** | Boss | 800x600 | 21 | 122.3 | 6 | 1 | — | — | 1x Temperamental **[BOSS]**, 10x Shrinking (t2), 10x Trap (t1) |
| **2-28** | Normal | 900x720 | 38 | 27.66 | 6 | — | — | — | 16x Basic (t1), 13x Shooting (t1), 9x Shrinking (t2) |
| **2-29** | Tower | 640x640 | 22 | 97.79 | 6 | — | — | — | 11x Fast (t2), 6x Temperamental (t1), 5x Ghost (t1) |
| **2-30** | Flag | 800x600 | 30 | 55.26 | 6 | — | 21 | 147 | 10x Strong (t1), 10x Shrinking (t1), 10x Ghost (t2) |
| **2-31** | Normal | 800x600 | 30 | 46.16 | 6 | — | — | — | 10x Fast (t1), 10x Strong (t1), 10x Temperamental (t1) |
| **2-32** | Flag | 640x400 | 18 | 123.87 | 6 | — | 26 | 122 | 9x Basic (t1), 9x Trap (t1) |
| **2-33** | Normal | 800x600 | 26 | 65.38 | 6 | — | — | — | 9x Shrinking (t1), 9x Temperamental (t1), 8x Trap (t3) |
| **2-34** | Normal | 900x720 | 39 | 26.5 | 6 | — | — | — | 15x Fast (t2), 15x Ghost (t1), 9x Temperamental (t1) |
| **2-35** | Defense | 640x960 | 30 | 53.14 | 6 | — | — | — | 15x Shooting (t1), 15x Strong (t1) |
| **2-36** | Boss | 900x720 | 21 | 125.37 | 6 | 2 | — | — | 1x Shooting **[BOSS]**, 1x Ghost **[BOSS]**, 11x Strong (t2), 8x Trap (t2) |
| **2-37** | Defense | 640x960 | 33 | 43.31 | 6 | — | — | — | 11x Basic (t1), 11x Trap (t1), 11x Temperamental (t1) |
| **2-38** | Normal | 800x600 | 30 | 51.48 | 6 | — | — | — | 11x Fast (t1), 11x Ghost (t1), 8x Shooting (t1) |
| **2-39** | Tower | 640x640 | 25 | 77.77 | 6 | — | — | — | 10x Shrinking (t2), 9x Strong (t1), 6x Basic (t1) |
| **2-40** | Tower | 640x640 | 23 | 86.09 | 6 | — | — | — | 12x Ghost (t1), 11x Temperamental (t1) |
| **2-41** | Tower | 640x640 | 28 | 57.7 | 6 | — | — | — | 15x Shrinking (t1), 7x Fast (t3), 6x Basic (t2) |
| **2-42** | Flag | 900x720 | 26 | 67.96 | 6 | — | 18 | 176 | 17x Trap (t1), 9x Temperamental (t2) |
| **2-43** | Defense | 640x960 | 34 | 36.79 | 6 | — | — | — | 17x Basic (t2), 17x Trap (t1) |
| **2-44** | Defense | 640x960 | 27 | 57.67 | 6 | — | — | — | 9x Shooting (t3), 9x Ghost (t3), 9x Ninja (t1) <br>**NEW: Ninja** |
| **2-45** | Boss | 900x720 | 25 | 81.83 | 6 | 1 | — | — | 1x Ninja **[BOSS]**, 15x Shooting (t2), 9x Temperamental (t1) |

### World 3 — BlueDirt

| Level | Mode | Room | Enemies | Interval | Cap | Bosses | Flags | $/flag | Wave composition |
|---|---|---|---|---|---|---|---|---|---|
| **3-1** | Tower | 640x640 | 22 | 85 | 6 | — | — | — | 12x Strong (t1), 5x Fast (t1), 5x Shrinking (t1) |
| **3-2** | Normal | 640x400 | 25 | 74.6 | 6 | — | — | — | 17x Trap (t1), 8x Shrinking (t1) |
| **3-3** | Defense | 640x960 | 23 | 125 | 6 | — | — | — | 11x Ninja (t1), 6x Strong (t2), 6x Temperamental (t2) |
| **3-4** | Tower | 640x640 | 27 | 67.58 | 6 | — | — | — | 12x Ghost (t1), 9x Shrinking (t1), 6x Fast (t1) |
| **3-5** | Defense | 640x960 | 36 | 32.8 | 6 | — | — | — | 36x Temperamental (t1) |
| **3-6** | Normal | 900x720 | 29 | 54.45 | 6 | — | — | — | 12x Basic (t1), 10x Ninja (t1), 7x Fast (t1) |
| **3-7** | Flag | 900x720 | 18 | 131.89 | 6 | — | 18 | 184 | 8x Strong (t3), 6x Ninja (t1), 4x Fast (t3) |
| **3-8** | Flag | 800x600 | 16 | 150.44 | 6 | — | 21 | 163 | 11x Ghost (t1), 5x Ninja (t1) |
| **3-9** | Boss | 900x720 | 22 | 108.62 | 6 | 2 | — | — | 1x Shrinking **[BOSS]**, 1x Trap **[BOSS]**, 10x Fast (t3), 10x Trap (t2) |
| **3-10** | Flag | 900x720 | 27 | 64.14 | 7 | — | 19 | 179 | 16x Ghost (t1), 6x Shooting (t1), 5x Ninja (t1) |
| **3-11** | Normal | 900x720 | 28 | 58.85 | 7 | — | — | — | 9x Basic (t2), 8x Strong (t1), 6x Fast (t1), 5x Ninja (t1) |
| **3-12** | Flag | 800x600 | 18 | 115.1 | 7 | — | 22 | 159 | 6x Shooting (t3), 6x Strong (t2), 6x Ninja (t1) |
| **3-13** | Tower | 640x640 | 30 | 50.73 | 7 | — | — | — | 22x Shrinking (t1), 8x Fast (t1) |
| **3-14** | Flag | 640x400 | 17 | 133.98 | 7 | — | 27 | 131 | 9x Accelerating (t1), 8x Trap (t2) <br>**NEW: Accelerating** |
| **3-15** | Flag | 900x720 | 26 | 75.55 | 7 | — | 19 | 182 | 8x Shrinking (t1), 7x Trap (t1), 6x Ninja (t1), 5x Strong (t1) |
| **3-16** | Normal | 640x400 | 33 | 41.43 | 7 | — | — | — | 33x Accelerating (t1) |
| **3-17** | Flag | 900x720 | 29 | 55.51 | 7 | — | 19 | 184 | 12x Shooting (t3), 11x Ghost (t2), 6x Strong (t2) |
| **3-18** | Boss | 800x600 | 32 | 52.63 | 7 | 1 | — | — | 1x Accelerating **[BOSS]**, 17x Basic (t1), 14x Shrinking (t1) |
| **3-19** | Defense | 640x960 | 33 | 40.32 | 7 | — | — | — | 11x Shooting (t2), 11x Trap (t1), 11x Ninja (t1) |
| **3-20** | Normal | 900x720 | 27 | 68.7 | 7 | — | — | — | 9x Strong (t2), 9x Ghost (t2), 9x Ninja (t3) |
| **3-21** | Defense | 640x960 | 26 | 71.76 | 7 | — | — | — | 11x Strong (t1), 9x Ninja (t1), 6x Trap (t1) |
| **3-22** | Defense | 640x960 | 29 | 40 | 7 | — | — | — | 14x Fast (t2), 9x Basic (t2), 6x Ninja (t1) |
| **3-23** | Tower | 640x640 | 24 | 80.03 | 7 | — | — | — | 6x Fast (t3), 6x Shrinking (t1), 6x Ghost (t1), 6x Temperamental (t3) |
| **3-24** | Defense | 640x960 | 30 | 50.49 | 7 | — | — | — | 10x Basic (t3), 10x Trap (t3), 10x Ninja (t2) |
| **3-25** | Tower | 640x640 | 22 | 102.89 | 7 | — | — | — | 11x Strong (t2), 11x Temperamental (t1) |
| **3-26** | Normal | 800x600 | 30 | 57.38 | 7 | — | — | — | 10x Fast (t2), 10x Trap (t1), 10x Accelerating (t1) |
| **3-27** | Boss | 900x720 | 29 | 68.08 | 7 | 2 | — | — | 1x Fast **[BOSS]**, 1x Ninja **[BOSS]**, 12x Shrinking (t1), 8x Temperamental (t2), 7x Ghost (t1) |
| **3-28** | Normal | 900x720 | 44 | 17.58 | 7 | — | — | — | 26x Temperamental (t2), 18x Basic (t3) |
| **3-29** | Tower | 640x640 | 24 | 82.73 | 7 | — | — | — | 14x Accelerating (t1), 5x Strong (t2), 5x Ghost (t1) |
| **3-30** | Flag | 800x600 | 26 | 70.06 | 7 | — | 22 | 171 | 10x Trap (t1), 6x Ghost (t1), 5x Shooting (t2), 5x Shrinking (t1) |
| **3-31** | Flag | 900x720 | 25 | 72.84 | 7 | — | 19 | 194 | 16x Ninja (t2), 9x Shooting (t2) |
| **3-32** | Tower | 640x640 | 24 | 87.44 | 7 | — | — | — | 13x Fast (t2), 6x Shrinking (t2), 5x Strong (t3) |
| **3-33** | Flag | 640x400 | 18 | 120.26 | 7 | — | 27 | 142 | 6x Shooting (t2), 6x Trap (t1), 6x Ninja (t2) |
| **3-34** | Normal | 640x400 | 29 | 55.13 | 7 | — | — | — | 12x Accelerating (t2), 7x Fast (t2), 5x Strong (t2), 5x Ghost (t2) |
| **3-35** | Normal | 800x600 | 44 | 17.82 | 7 | — | — | — | 29x Basic (t2), 15x Temperamental (t1) |
| **3-36** | Boss | 800x600 | 20 | 115.25 | 7 | 1 | — | — | 1x Crazy **[BOSS]**, 11x Strong (t1), 8x Shrinking (t2) <br>**NEW: Crazy** |
| **3-37** | Defense | 640x960 | 27 | 61.26 | 7 | — | — | — | 9x Trap (t1), 9x Ninja (t1), 9x Crazy (t1) |
| **3-38** | Tower | 640x640 | 25 | 71.46 | 7 | — | — | — | 16x Accelerating (t1), 9x Fast (t2) |
| **3-39** | Tower | 640x640 | 31 | 30 | 7 | — | — | — | 31x Shrinking (t2) |
| **3-40** | Flag | 800x600 | 18 | 130.03 | 7 | — | 22 | 177 | 9x Trap (t1), 5x Crazy (t1), 4x Ninja (t1) |
| **3-41** | Normal | 900x720 | 34 | 40.87 | 7 | — | — | — | 14x Strong (t1), 11x Ninja (t1), 9x Shooting (t2) |
| **3-42** | Defense | 640x960 | 27 | 62.09 | 7 | — | — | — | 11x Ghost (t1), 9x Trap (t1), 7x Crazy (t1) |
| **3-43** | Tower | 640x640 | 26 | 74.74 | 7 | — | — | — | 18x Temperamental (t3), 8x Accelerating (t2) |
| **3-44** | Tower | 640x640 | 25 | 76 | 7 | — | — | — | 14x Fast (t2), 11x Ghost (t2) |
| **3-45** | Boss | 900x720 | 20 | 127.03 | 7 | 2 | — | — | 1x Strong **[BOSS]**, 1x Temperamental **[BOSS]**, 9x Ninja (t2), 9x Accelerating (t2) |

### World 4 — Beach

| Level | Mode | Room | Enemies | Interval | Cap | Bosses | Flags | $/flag | Wave composition |
|---|---|---|---|---|---|---|---|---|---|
| **4-1** | Tower | 640x640 | 18 | 131.05 | 8 | — | — | — | 12x Strong (t3), 6x Ghost (t2) |
| **4-2** | Defense | 640x960 | 36 | 35.05 | 8 | — | — | — | 13x Trap (t1), 10x Shooting (t3), 7x Ninja (t1), 6x Temperamental (t1) |
| **4-3** | Tower | 640x640 | 26 | 77.77 | 8 | — | — | — | 13x Fast (t2), 7x Ghost (t2), 6x Accelerating (t2) |
| **4-4** | Defense | 640x960 | 34 | 62 | 8 | — | — | — | 17x Ghost (t2), 10x Temperamental (t1), 7x Shooting (t3) |
| **4-5** | Normal | 900x720 | 33 | 46.61 | 8 | — | — | — | 11x Basic (t2), 11x Ninja (t1), 11x Accelerating (t2) |
| **4-6** | Defense | 640x960 | 32 | 45.32 | 8 | — | — | — | 13x Shrinking (t3), 10x Crazy (t1), 9x Shooting (t2) |
| **4-7** | Flag | 900x720 | 24 | 83.75 | 8 | — | 20 | 202 | 10x Ninja (t2), 5x Shooting (t1), 5x Crazy (t1), 4x Trap (t2) |
| **4-8** | Tower | 640x640 | 27 | 63.86 | 8 | — | — | — | 9x Basic (t2), 9x Strong (t2), 9x Temperamental (t1) |
| **4-9** | Boss | 900x720 | 26 | 83.28 | 8 | 2 | — | — | 1x Basic **[BOSS]**, 1x Crazy **[BOSS]**, 12x Trap (t2), 7x Accelerating (t3), 5x Shooting (t2) |
| **4-10** | Normal | 800x600 | 27 | 50 | 8 | — | — | — | 9x Fast (t1), 9x Shooting (t1), 9x Crazy (t1) |
| **4-11** | Defense | 640x960 | 40 | 52 | 8 | — | — | — | 23x Shooting (t2), 17x Temperamental (t1) |
| **4-12** | Flag | 900x720 | 18 | 120.54 | 8 | — | 20 | 205 | 9x Ninja (t2), 9x Crazy (t1) |
| **4-13** | Tower | 640x640 | 24 | 68 | 8 | — | — | — | 12x Ghost (t3), 12x Accelerating (t2) |
| **4-14** | Flag | 800x600 | 28 | 63.65 | 8 | — | 23 | 182 | 7x Basic (t2), 7x Shooting (t2), 7x Strong (t2), 7x Trap (t2) |
| **4-15** | Normal | 900x720 | 39 | 32.59 | 8 | — | — | — | 15x Medic (t1), 9x Trap (t2), 8x Shooting (t3), 7x Strong (t1) <br>**NEW: Medic** |
| **4-16** | Tower | 640x640 | 28 | 64.97 | 8 | — | — | — | 14x Ghost (t2), 7x Fast (t3), 7x Shrinking (t2) |
| **4-17** | Defense | 640x960 | 29 | 63.38 | 8 | — | — | — | 10x Crazy (t1), 7x Fast (t2), 6x Shrinking (t2), 6x Ninja (t1) |
| **4-18** | Boss | 900x720 | 22 | 100.18 | 8 | 1 | — | — | 1x Medic **[BOSS]**, 12x Medic (t1), 9x Ninja (t1) |
| **4-19** | Defense | 640x960 | 39 | 30.43 | 8 | — | — | — | 17x Accelerating (t1), 8x Shooting (t3), 7x Shrinking (t2), 7x Temperamental (t1) |
| **4-20** | Tower | 640x640 | 33 | 47.05 | 8 | — | — | — | 20x Basic (t2), 13x Strong (t1) |
| **4-21** | Flag | 900x720 | 28 | 62.64 | 8 | — | 20 | 212 | 7x Fast (t3), 7x Shrinking (t2), 7x Trap (t2), 7x Ninja (t3) |
| **4-22** | Normal | 640x400 | 34 | 44.05 | 8 | — | — | — | 13x Medic (t1), 11x Temperamental (t2), 10x Accelerating (t1) |
| **4-23** | Defense | 640x960 | 30 | 53.11 | 8 | — | — | — | 10x Fast (t3), 10x Trap (t2), 10x Crazy (t1) |
| **4-24** | Tower | 640x640 | 24 | 81.37 | 8 | — | — | — | 8x Strong (t1), 8x Ghost (t1), 8x Accelerating (t3) |
| **4-25** | Flag | 900x720 | 37 | 34.2 | 8 | — | 20 | 215 | 13x Basic (t2), 9x Ghost (t2), 8x Temperamental (t1), 7x Shooting (t3) |
| **4-26** | Normal | 800x600 | 24 | 76.91 | 8 | — | — | — | 8x Trap (t2), 8x Crazy (t3), 8x Medic (t1) |
| **4-27** | Boss | 800x600 | 25 | 91.25 | 8 | 3 | — | — | 1x Basic **[BOSS]**, 1x Shooting **[BOSS]**, 1x Trap **[BOSS]**, 11x Shrinking (t3), 11x Accelerating (t1) |
| **4-28** | Defense | 640x960 | 33 | 22 | 8 | — | — | — | 13x Fast (t3), 10x Shooting (t3), 10x Crazy (t1) |
| **4-29** | Normal | 900x720 | 28 | 64.73 | 8 | — | — | — | 13x Crazy (t1), 9x Temperamental (t3), 6x Ninja (t2) |
| **4-30** | Defense | 640x960 | 26 | 68.16 | 8 | — | — | — | 10x Crazy (t1), 9x Shrinking (t2), 7x Strong (t3) |
| **4-31** | Normal | 900x720 | 32 | 38 | 8 | — | — | — | 32x Ninja (t1) |
| **4-32** | Tower | 640x640 | 26 | 68.91 | 8 | — | — | — | 19x Temperamental (t2), 7x Strong (t1) |
| **4-33** | Flag | 800x600 | 40 | 27.62 | 8 | — | 23 | 194 | 23x Accelerating (t1), 9x Basic (t1), 8x Ghost (t2) |
| **4-34** | Defense | 640x960 | 31 | 48.58 | 8 | — | — | — | 23x Crazy (t3), 8x Shooting (t1) |
| **4-35** | Tower | 640x640 | 26 | 72.16 | 8 | — | — | — | 9x Medic (t1), 7x Shrinking (t2), 5x Fast (t2), 5x Strong (t2) |
| **4-36** | Boss | 900x720 | 20 | 134.92 | 8 | 2 | — | — | 1x Accelerating **[BOSS]**, 1x Medic **[BOSS]**, 6x Fast (t3), 6x Crazy (t2), 6x Medic (t1) |
| **4-37** | Flag | 900x720 | 39 | 33.15 | 8 | — | 20 | 223 | 20x Shrinking (t3), 11x Shooting (t2), 8x Ghost (t2) |
| **4-38** | Flag | 800x600 | 19 | 116.14 | 8 | — | 23 | 197 | 6x Ninja (t2), 5x Medic (t1), 4x Strong (t2), 4x Ghost (t2) |
| **4-39** | Tower | 640x640 | 23 | 91.28 | 8 | — | — | — | 17x Strong (t1), 6x Medic (t1) |
| **4-40** | Flag | 640x400 | 11 | 224.05 | 8 | — | 28 | 163 | 6x Temperamental (t2), 3x Crazy (t1), 2x Accelerating (t1) |
| **4-41** | Defense | 640x960 | 24 | 80.13 | 8 | — | — | — | 17x ScaredGhost (t1), 7x Crazy (t1) <br>**NEW: ScaredGhost** |
| **4-42** | Tower | 640x640 | 28 | 67.39 | 8 | — | — | — | 13x Fast (t2), 9x Medic (t1), 6x Ghost (t1) |
| **4-43** | Normal | 800x600 | 27 | 68.99 | 8 | — | — | — | 9x Ghost (t1), 9x Trap (t3), 9x Crazy (t3) |
| **4-44** | Defense | 640x960 | 45 | 20.23 | 8 | — | — | — | 24x Basic (t2), 11x Temperamental (t2), 10x Shooting (t1) |
| **4-45** | Boss | 900x720 | 22 | 98.07 | 8 | 1 | — | — | 1x ScaredGhost **[BOSS]**, 9x ScaredGhost (t1), 7x Crazy (t3), 5x Accelerating (t2) |

### World 5 — Concrete

| Level | Mode | Room | Enemies | Interval | Cap | Bosses | Flags | $/flag | Wave composition |
|---|---|---|---|---|---|---|---|---|---|
| **5-1** | Normal | 900x720 | 40 | 30.32 | 9 | — | — | — | 10x Shooting (t2), 10x Ninja (t1), 10x Accelerating (t1), 10x Medic (t2) |
| **5-2** | Flag | 900x720 | 42 | 25.45 | 9 | — | 21 | 222 | 29x Fast (t2), 13x Ghost (t3) |
| **5-3** | Flag | 900x720 | 41 | 26.56 | 9 | — | 21 | 222 | 26x Accelerating (t2), 15x Strong (t1) |
| **5-4** | Normal | 900x720 | 39 | 29.92 | 9 | — | — | — | 16x Medic (t1), 15x ScaredGhost (t1), 8x Trap (t2) |
| **5-5** | Normal | 900x720 | 46 | 19.49 | 9 | — | — | — | 23x Shrinking (t2), 23x Medic (t2) |
| **5-6** | Normal | 800x600 | 46 | 24 | 9 | — | — | — | 46x ScaredGhost (t1) |
| **5-7** | Flag | 640x400 | 24 | 79.2 | 9 | — | 29 | 163 | 11x Shooting (t1), 8x Ninja (t2), 5x Trap (t1) |
| **5-8** | Normal | 900x720 | 48 | 15.67 | 9 | — | — | — | 28x Temperamental (t2), 20x Ghost (t1) |
| **5-9** | Boss | 900x720 | 25 | 88.37 | 9 | 3 | — | — | 1x Ghost **[BOSS]**, 1x Ninja **[BOSS]**, 1x ScaredGhost **[BOSS]**, 8x Strong (t2), 8x Ninja (t2), 6x Shooting (t1) |
| **5-10** | Defense | 640x960 | 40 | 60 | 9 | — | — | — | 20x Accelerating (t3), 20x Medic (t1) |
| **5-11** | Flag | 800x600 | 22 | 92.21 | 9 | — | 24 | 201 | 8x Basic (t2), 6x Shrinking (t2), 4x Trap (t1), 4x Crazy (t1) |
| **5-12** | Normal | 640x400 | 24 | 40 | 9 | — | — | — | 10x Crazy (t1), 9x Trap (t1), 5x Basic (t3) |
| **5-13** | Defense | 640x960 | 39 | 33.77 | 9 | — | — | — | 15x Trap (t3), 14x Strong (t1), 10x Basic (t3) |
| **5-14** | Defense | 640x960 | 31 | 48.66 | 9 | — | — | — | 10x Ninja (t3), 8x Crazy (t1), 7x Temperamental (t2), 6x Trap (t2) |
| **5-15** | Normal | 800x600 | 50 | 14.38 | 9 | — | — | — | 32x Ghost (t1), 18x Basic (t2) |
| **5-16** | Tower | 640x640 | 30 | 52.34 | 9 | — | — | — | 10x Shrinking (t2), 10x Temperamental (t2), 10x Medic (t1) |
| **5-17** | Defense | 640x960 | 33 | 46.98 | 9 | — | — | — | 18x Ninja (t2), 8x Crazy (t1), 7x Trap (t2) |
| **5-18** | Boss | 900x720 | 30 | 64.75 | 9 | 3 | — | — | 1x Strong **[BOSS]**, 1x Shrinking **[BOSS]**, 1x Accelerating **[BOSS]**, 11x Shooting (t2), 11x Shrinking (t2), 5x Strong (t2) |
| **5-19** | Flag | 900x720 | 38 | 35.98 | 9 | — | 21 | 233 | 19x Shooting (t2), 19x Medic (t2) |
| **5-20** | Tower | 640x640 | 28 | 56.7 | 9 | — | — | — | 7x Fast (t2), 7x Temperamental (t1), 7x Accelerating (t2), 7x ScaredGhost (t1) |
| **5-21** | Defense | 640x960 | 38 | 47 | 9 | — | — | — | 19x Strong (t2), 19x Accelerating (t2) |
| **5-22** | Normal | 900x720 | 40 | 28.87 | 9 | — | — | — | 15x Fast (t3), 15x Trap (t1), 10x Ninja (t2) |
| **5-23** | Tower | 640x640 | 34 | 44.12 | 9 | — | — | — | 17x Shrinking (t1), 9x ScaredGhost (t1), 8x Temperamental (t2) |
| **5-24** | Tower | 640x640 | 25 | 72.53 | 9 | — | — | — | 16x DamageAddict (t1), 9x ScaredGhost (t1) <br>**NEW: DamageAddict** |
| **5-25** | Normal | 900x720 | 33 | 35 | 9 | — | — | — | 17x Ninja (t3), 9x Basic (t1), 7x Crazy (t1) |
| **5-26** | Flag | 800x600 | 16 | 128.83 | 9 | — | 24 | 210 | 4x Ninja (t1), 4x Crazy (t2), 4x Medic (t1), 4x ScaredGhost (t2) |
| **5-27** | Boss | 900x720 | 37 | 33.67 | 9 | 1 | — | — | 1x DamageAddict **[BOSS]**, 12x Shooting (t3), 12x Trap (t2), 12x ScaredGhost (t1) |
| **5-28** | Flag | 900x720 | 26 | 69.8 | 9 | — | 21 | 240 | 13x Ninja (t2), 13x DamageAddict (t1) |
| **5-29** | Tower | 640x640 | 31 | 51.72 | 9 | — | — | — | 17x Fast (t2), 8x Temperamental (t1), 6x Accelerating (t2) |
| **5-30** | Tower | 640x640 | 31 | 53.54 | 9 | — | — | — | 21x Accelerating (t2), 10x Medic (t1) |
| **5-31** | Tower | 640x640 | 27 | 62.16 | 9 | — | — | — | 13x Temperamental (t1), 7x Strong (t2), 7x Medic (t2) |
| **5-32** | Defense | 640x960 | 32 | 30 | 9 | — | — | — | 21x Crazy (t1), 11x Ghost (t2) |
| **5-33** | Tower | 640x640 | 31 | 51.75 | 9 | — | — | — | 13x ScaredGhost (t1), 12x Shrinking (t2), 6x DamageAddict (t1) |
| **5-34** | Defense | 640x960 | 30 | 50.9 | 9 | — | — | — | 12x Crazy (t2), 12x Medic (t1), 6x Ninja (t2) |
| **5-35** | Flag | 800x600 | 18 | 100 | 9 | — | 24 | 216 | 9x Strong (t3), 9x Crazy (t1) |
| **5-36** | Boss | 900x720 | 36 | 44.69 | 9 | 2 | — | — | 1x Temperamental **[BOSS]**, 1x Medic **[BOSS]**, 17x Basic (t3), 17x Trap (t1) |
| **5-37** | Flag | 900x720 | 25 | 75.65 | 9 | — | 21 | 246 | 25x Crazy (t1) |
| **5-38** | Tower | 640x640 | 27 | 66.6 | 9 | — | — | — | 9x Ghost (t2), 9x Medic (t2), 9x ScaredGhost (t1) |
| **5-39** | Defense | 640x960 | 50 | 17.24 | 9 | — | — | — | 25x Basic (t2), 25x ScaredGhost (t2) |
| **5-40** | Flag | 800x600 | 15 | 137.55 | 9 | — | 24 | 219 | 5x Strong (t2), 5x Crazy (t2), 5x DamageAddict (t1) |
| **5-41** | Flag | 800x600 | 38 | 32.92 | 9 | — | 24 | 219 | 21x Temperamental (t2), 17x Fast (t2) |
| **5-42** | Defense | 640x960 | 41 | 27.59 | 9 | — | — | — | 31x DamageAddict (t1), 10x Accelerating (t2) |
| **5-43** | Tower | 640x640 | 28 | 59.09 | 9 | — | — | — | 14x Strong (t3), 14x Shrinking (t2) |
| **5-44** | Normal | 800x600 | 30 | 51.03 | 9 | — | — | — | 10x Ghost (t2), 10x Ninja (t2), 10x Medic (t1) |
| **5-45** | Boss | 800x600 | 32 | 55.04 | 9 | 2 | — | — | 1x Fast **[BOSS]**, 1x DamageAddict **[BOSS]**, 10x Accelerating (t3), 10x Medic (t1), 10x DamageAddict (t1) |

### World 6 — Biology

| Level | Mode | Room | Enemies | Interval | Cap | Bosses | Flags | $/flag | Wave composition |
|---|---|---|---|---|---|---|---|---|---|
| **6-1** | Tower | 640x640 | 30 | 51.68 | 9 | — | — | — | 22x Ghost (t3), 8x Fast (t1) |
| **6-2** | Defense | 640x960 | 34 | 42.88 | 9 | — | — | — | 16x Crazy (t2), 6x Shooting (t3), 6x Medic (t2), 6x ScaredGhost (t3) |
| **6-3** | Normal | 640x400 | 32 | 48.21 | 9 | — | — | — | 8x Shooting (t3), 8x Shrinking (t3), 8x Ninja (t2), 8x DamageAddict (t1) |
| **6-4** | Flag | 640x400 | 21 | 89.52 | 9 | — | 29 | 184 | 10x Temperamental (t2), 6x Trap (t2), 5x Ninja (t3) |
| **6-5** | Normal | 800x600 | 33 | 44.88 | 9 | — | — | — | 11x Shooting (t3), 11x Crazy (t3), 11x ScaredGhost (t2) |
| **6-6** | Tower | 640x640 | 27 | 60.9 | 9 | — | — | — | 9x Accelerating (t2), 9x Medic (t2), 9x DamageAddict (t2) |
| **6-7** | Defense | 640x960 | 39 | 30.52 | 9 | — | — | — | 13x Fast (t2), 13x Trap (t2), 13x Random (t1) <br>**NEW: Random** |
| **6-8** | Tower | 640x640 | 31 | 52.64 | 9 | — | — | — | 16x DamageAddict (t2), 8x Accelerating (t1), 7x Shrinking (t3) |
| **6-9** | Boss | 800x600 | 24 | 86.21 | 9 | 1 | — | — | 1x Random **[BOSS]**, 13x Random (t1), 10x Shooting (t2) |
| **6-10** | Normal | 900x720 | 34 | 42.78 | 10 | — | — | — | 17x Crazy (t2), 17x ScaredGhost (t3) |
| **6-11** | Flag | 900x720 | 33 | 45.82 | 10 | — | 22 | 249 | 11x Ninja (t1), 10x Random (t1), 6x Basic (t2), 6x Trap (t2) |
| **6-12** | Defense | 640x960 | 42 | 26.57 | 10 | — | — | — | 27x Trap (t1), 15x Strong (t2) |
| **6-13** | Normal | 640x400 | 25 | 71.32 | 10 | — | — | — | 11x Medic (t1), 9x Ninja (t3), 5x Temperamental (t2) |
| **6-14** | Flag | 900x720 | 52 | 13.8 | 10 | — | 22 | 251 | 22x Ghost (t3), 19x Shrinking (t3), 11x Basic (t2) |
| **6-15** | Defense | 640x960 | 43 | 42 | 10 | — | — | — | 14x Shooting (t3), 11x Medic (t1), 11x DamageAddict (t1), 7x ScaredGhost (t3) |
| **6-16** | Flag | 800x600 | 33 | 43.87 | 10 | — | 25 | 223 | 33x Medic (t2) |
| **6-17** | Tower | 640x640 | 27 | 61.27 | 10 | — | — | — | 9x Strong (t3), 9x Accelerating (t2), 9x ScaredGhost (t1) |
| **6-18** | Boss | 800x600 | 19 | 142.2 | 10 | 3 | — | — | 1x ScaredGhost **[BOSS]**, 1x DamageAddict **[BOSS]**, 1x Random **[BOSS]**, 10x Ninja (t2), 6x Random (t1) |
| **6-19** | Tower | 640x640 | 29 | 56.08 | 10 | — | — | — | 14x ScaredGhost (t2), 5x Temperamental (t3), 5x Accelerating (t2), 5x DamageAddict (t1) |
| **6-20** | Defense | 640x960 | 41 | 28.03 | 10 | — | — | — | 19x Accelerating (t2), 14x Trap (t3), 8x Ninja (t2) |
| **6-21** | Normal | 800x600 | 31 | 53.26 | 10 | — | — | — | 15x Fast (t2), 10x Temperamental (t1), 6x Random (t1) |
| **6-22** | Defense | 640x960 | 37 | 34.28 | 10 | — | — | — | 15x Temperamental (t2), 12x Random (t1), 10x Basic (t2) |
| **6-23** | Flag | 900x720 | 28 | 54.87 | 10 | — | 22 | 257 | 7x Shrinking (t2), 7x Trap (t1), 7x Crazy (t2), 7x DamageAddict (t2) |
| **6-24** | Tower | 640x640 | 26 | 62.87 | 10 | — | — | — | 14x Strong (t2), 6x Fast (t1), 6x ScaredGhost (t2) |
| **6-25** | Normal | 900x720 | 36 | 41 | 10 | — | — | — | 18x Ninja (t3), 18x Crazy (t3) |
| **6-26** | Flag | 640x400 | 40 | 29.62 | 10 | — | 30 | 188 | 22x Ghost (t3), 9x Basic (t3), 9x ScaredGhost (t2) |
| **6-27** | Boss | 900x720 | 30 | 61.43 | 10 | 2 | — | — | 1x Crazy **[BOSS]**, 1x Random **[BOSS]**, 11x Shooting (t3), 10x Shrinking (t3), 7x Accelerating (t1) |
| **6-28** | Tower | 640x640 | 31 | 50.78 | 10 | — | — | — | 19x Temperamental (t3), 12x DamageAddict (t2) |
| **6-29** | Defense | 640x960 | 42 | 25.92 | 10 | — | — | — | 14x Fast (t1), 14x Trap (t2), 14x DamageAddict (t1) |
| **6-30** | Normal | 900x720 | 52 | 14.47 | 10 | — | — | — | 36x Accelerating (t1), 16x Shooting (t3) |
| **6-31** | Flag | 900x720 | 26 | 66.14 | 10 | — | 22 | 263 | 11x Random (t1), 8x Medic (t2), 7x Crazy (t2) |
| **6-32** | Normal | 800x600 | 31 | 50.27 | 10 | — | — | — | 19x Random (t2), 6x Basic (t3), 6x Medic (t3) |
| **6-33** | Flag | 900x720 | 32 | 49.97 | 10 | — | 22 | 264 | 8x Strong (t3), 8x Shrinking (t3), 8x Ninja (t2), 8x DamageAddict (t2) |
| **6-34** | Flag | 800x600 | 47 | 26 | 10 | — | 25 | 233 | 47x ScaredGhost (t1) |
| **6-35** | Flag | 800x600 | 20 | 94.94 | 10 | — | 25 | 234 | 15x Crazy (t2), 5x Medic (t3) |
| **6-36** | Boss | 900x720 | 33 | 48.3 | 10 | 2 | — | — | 1x Strong **[BOSS]**, 1x Medic **[BOSS]**, 21x Random (t1), 10x Shooting (t2) |
| **6-37** | Tower | 640x640 | 42 | 25.38 | 10 | — | — | — | 14x Basic (t3), 14x Fast (t1), 14x Shrinking (t3) |
| **6-38** | Normal | 900x720 | 33 | 39.31 | 10 | — | — | — | 11x Strong (t2), 11x Ghost (t2), 11x Crazy (t3) |
| **6-39** | Defense | 640x960 | 36 | 37.38 | 10 | — | — | — | 18x Temperamental (t2), 11x Medic (t2), 7x Random (t2) |
| **6-40** | Defense | 640x960 | 42 | 26.04 | 10 | — | — | — | 24x Strong (t3), 18x Shooting (t3) |
| **6-41** | Normal | 800x600 | 36 | 36.53 | 10 | — | — | — | 12x Trap (t3), 12x Ninja (t3), 12x Random (t1) |
| **6-42** | Defense | 640x960 | 39 | 29.65 | 10 | — | — | — | 11x Medic (t1), 10x Ninja (t2), 10x DamageAddict (t1), 8x Trap (t3) |
| **6-43** | Defense | 640x960 | 37 | 34.93 | 10 | — | — | — | 27x Crazy (t2), 10x Random (t2) |
| **6-44** | Normal | 900x720 | 51 | 13.57 | 10 | — | — | — | 17x Fast (t3), 17x Shrinking (t3), 17x DamageAddict (t2) |
| **6-45** | Boss | 900x720 | 33 | 48.06 | 10 | 2 | — | — | 1x Shooting **[BOSS]**, 1x Random **[BOSS]**, 16x Trap (t3), 9x Basic (t2), 6x Medic (t3) |

### World 7 — Hell

| Level | Mode | Room | Enemies | Interval | Cap | Bosses | Flags | $/flag | Wave composition |
|---|---|---|---|---|---|---|---|---|---|
| **7-1** | Defense | 640x960 | 46 | 21.15 | 10 | — | — | — | 31x Exploding (t1), 15x DamageAddict (t1) <br>**NEW: Exploding** |
| **7-2** | Defense | 640x960 | 35 | 40.77 | 10 | — | — | — | 12x ScaredGhost (t1), 8x DamageAddict (t1), 8x Random (t2), 7x Basic (t2) |
| **7-3** | Defense | 640x960 | 35 | 55 | 10 | — | — | — | 12x Ghost (t3), 12x Temperamental (t3), 11x Accelerating (t3) |
| **7-4** | Flag | 900x720 | 28 | 68 | 10 | — | 22 | 270 | 18x Medic (t2), 10x Random (t1) |
| **7-5** | Defense | 640x960 | 45 | 26 | 10 | — | — | — | 21x Shooting (t3), 13x ScaredGhost (t1), 11x DamageAddict (t2) |
| **7-6** | Normal | 800x600 | 29 | 49.34 | 10 | — | — | — | 14x Crazy (t2), 9x Accelerating (t1), 6x Random (t2) |
| **7-7** | Tower | 640x640 | 42 | 26.81 | 10 | — | — | — | 21x Basic (t3), 21x Exploding (t1) |
| **7-8** | Normal | 800x600 | 34 | 41.45 | 10 | — | — | — | 12x Ghost (t3), 12x Random (t1), 10x Shrinking (t2) |
| **7-9** | Boss | 800x600 | 23 | 111.78 | 10 | 1 | — | — | 1x Exploding **[BOSS]**, 11x Random (t1), 6x Medic (t2), 5x ScaredGhost (t1) |
| **7-10** | Flag | 900x720 | 39 | 34.53 | 10 | — | 22 | 270 | 16x ScaredGhost (t1), 13x Temperamental (t3), 10x Trap (t3) |
| **7-11** | Normal | 640x400 | 26 | 61.91 | 10 | — | — | — | 12x DamageAddict (t1), 9x Ninja (t2), 5x Strong (t2) |
| **7-12** | Flag | 900x720 | 36 | 43.83 | 10 | — | 22 | 270 | 9x Fast (t3), 9x Trap (t2), 9x Ninja (t2), 9x DamageAddict (t1) |
| **7-13** | Flag | 640x400 | 17 | 135.73 | 10 | — | 30 | 195 | 17x Random (t1) |
| **7-14** | Tower | 640x640 | 28 | 61.3 | 10 | — | — | — | 14x Ghost (t3), 14x Medic (t3) |
| **7-15** | Normal | 900x720 | 54 | 11.96 | 10 | — | — | — | 27x Fast (t2), 27x Temperamental (t2) |
| **7-16** | Tower | 640x640 | 29 | 65 | 10 | — | — | — | 11x Strong (t2), 7x Exploding (t1), 6x Accelerating (t3), 5x ScaredGhost (t2) |
| **7-17** | Normal | 900x720 | 36 | 40 | 10 | — | — | — | 23x Crazy (t2), 13x Ninja (t2) |
| **7-18** | Boss | 800x600 | 21 | 142.99 | 10 | 3 | — | — | 1x Basic **[BOSS]**, 1x Ghost **[BOSS]**, 1x Crazy **[BOSS]**, 9x Ninja (t3), 9x Medic (t1) |
| **7-19** | Normal | 800x600 | 42 | 23.02 | 10 | — | — | — | 14x Shrinking (t2), 14x Trap (t2), 14x Accelerating (t2) |
| **7-20** | Defense | 640x960 | 35 | 54.5 | 10 | — | — | — | 15x ScaredGhost (t2), 13x Shooting (t2), 7x Ninja (t3) |
| **7-21** | Normal | 900x720 | 36 | 32.86 | 10 | — | — | — | 12x Strong (t2), 12x Accelerating (t3), 12x Random (t1) |
| **7-22** | Tower | 640x640 | 29 | 57.46 | 10 | — | — | — | 14x Ghost (t3), 5x Medic (t2), 5x DamageAddict (t2), 5x Exploding (t3) |
| **7-23** | Tower | 640x640 | 44 | 23.63 | 10 | — | — | — | 32x Basic (t3), 12x DamageAddict (t1) |
| **7-24** | Normal | 640x400 | 23 | 67.8 | 10 | — | — | — | 10x Crazy (t1), 8x ScaredGhost (t2), 5x Shrinking (t3) |
| **7-25** | Flag | 800x600 | 36 | 41.79 | 10 | — | 25 | 238 | 16x Medic (t2), 11x Exploding (t3), 9x DamageAddict (t1) |
| **7-26** | Flag | 640x400 | 39 | 36.66 | 10 | — | 30 | 195 | 29x Tiny (t1), 10x DamageAddict (t1) <br>**NEW: Tiny** |
| **7-27** | Boss | 900x720 | 30 | 66.17 | 10 | 1 | — | — | 1x Tiny **[BOSS]**, 14x DamageAddict (t1), 9x Ninja (t3), 6x Shrinking (t2) |
| **7-28** | Defense | 640x960 | 47 | 20.82 | 10 | — | — | — | 26x Accelerating (t2), 21x DamageAddict (t1) |
| **7-29** | Tower | 640x640 | 26 | 67.75 | 10 | — | — | — | 13x Strong (t3), 7x ScaredGhost (t2), 6x Exploding (t1) |
| **7-30** | Tower | 640x640 | 30 | 53.72 | 10 | — | — | — | 15x Medic (t3), 15x Exploding (t1) |
| **7-31** | Normal | 900x720 | 45 | 19.88 | 10 | — | — | — | 15x Shooting (t3), 15x Ninja (t2), 15x Random (t1) |
| **7-32** | Normal | 900x720 | 58 | 8.49 | 10 | — | — | — | 58x Tiny (t1) |
| **7-33** | Defense | 640x960 | 39 | 30.09 | 10 | — | — | — | 13x Trap (t2), 13x Crazy (t3), 13x Exploding (t1) |
| **7-34** | Flag | 900x720 | 39 | 35.56 | 10 | — | 22 | 270 | 27x Trap (t3), 12x DamageAddict (t3) |
| **7-35** | Normal | 640x400 | 23 | 77.02 | 10 | — | — | — | 10x Fast (t2), 7x Temperamental (t2), 6x Crazy (t3) |
| **7-36** | Boss | 900x720 | 24 | 105.01 | 10 | 3 | — | — | 1x Shrinking **[BOSS]**, 1x Ninja **[BOSS]**, 1x Exploding **[BOSS]**, 7x Ghost (t3), 7x Temperamental (t2), 7x Random (t1) |
| **7-37** | Tower | 640x640 | 32 | 51.65 | 10 | — | — | — | 8x Strong (t2), 8x Shrinking (t1), 8x ScaredGhost (t3), 8x Exploding (t2) |
| **7-38** | Flag | 900x720 | 27 | 70.48 | 10 | — | 22 | 270 | 15x Crazy (t2), 12x Ghost (t1) |
| **7-39** | Defense | 640x960 | 32 | 45.42 | 10 | — | — | — | 15x ScaredGhost (t2), 9x Exploding (t1), 8x Random (t2) |
| **7-40** | Defense | 640x960 | 48 | 18.8 | 10 | — | — | — | 48x Exploding (t1) |
| **7-41** | Tower | 640x640 | 32 | 49.28 | 10 | — | — | — | 16x DamageAddict (t1), 16x Exploding (t1) |
| **7-42** | Defense | 640x960 | 48 | 18.96 | 10 | — | — | — | 28x Temperamental (t3), 10x Fast (t1), 10x Shrinking (t1) |
| **7-43** | Tower | 640x640 | 26 | 65.81 | 10 | — | — | — | 15x Medic (t2), 6x ScaredGhost (t2), 5x Strong (t2) |
| **7-44** | Defense | 640x960 | 48 | 18.71 | 10 | — | — | — | 30x Shooting (t3), 18x GrapplingHook (t1) <br>**NEW: GrapplingHook** |
| **7-45** | Boss | 800x600 | 22 | 160.5 | 10 | 1 | — | — | 1x GrapplingHook **[BOSS]**, 7x Shrinking (t3), 7x Ninja (t3), 7x Exploding (t1) |

### World 8 — MagicStone

| Level | Mode | Room | Enemies | Interval | Cap | Bosses | Flags | $/flag | Wave composition |
|---|---|---|---|---|---|---|---|---|---|
| **8-1** | Normal | 800x600 | 47 | 18.74 | 10 | — | — | — | 30x Accelerating (t2), 17x DamageAddict (t2) |
| **8-2** | Flag | 800x600 | 22 | 92.64 | 10 | — | 25 | 238 | 8x Strong (t3), 8x GrapplingHook (t1), 6x Random (t1) |
| **8-3** | Flag | 900x720 | 33 | 49.96 | 10 | — | 22 | 270 | 15x Ghost (t3), 11x Ninja (t2), 7x Exploding (t1) |
| **8-4** | Defense | 640x960 | 54 | 12.94 | 10 | — | — | — | 35x Basic (t3), 19x ScaredGhost (t3) |
| **8-5** | Defense | 640x960 | 39 | 31.89 | 10 | — | — | — | 19x GrapplingHook (t1), 10x Shrinking (t1), 10x Random (t1) |
| **8-6** | Defense | 640x960 | 38 | 40 | 10 | — | — | — | 19x Crazy (t1), 19x Tiny (t2) |
| **8-7** | Tower | 640x640 | 32 | 49.96 | 10 | — | — | — | 16x ScaredGhost (t2), 8x Exploding (t2), 8x Tiny (t1) |
| **8-8** | Flag | 900x720 | 32 | 52.45 | 10 | — | 22 | 270 | 18x Medic (t1), 7x Ninja (t3), 7x Exploding (t1) |
| **8-9** | Boss | 900x720 | 22 | 124.83 | 10 | 3 | — | — | 1x Exploding **[BOSS]**, 1x Tiny **[BOSS]**, 1x GrapplingHook **[BOSS]**, 14x DamageAddict (t2), 5x GrapplingHook (t1) |
| **8-10** | Normal | 900x720 | 42 | 24.98 | 10 | — | — | — | 18x Exploding (t1), 13x Fast (t3), 11x GrapplingHook (t1) |
| **8-11** | Tower | 640x640 | 30 | 53.39 | 10 | — | — | — | 10x Strong (t1), 10x Medic (t2), 10x Tiny (t2) |
| **8-12** | Defense | 640x960 | 36 | 35.05 | 10 | — | — | — | 14x Ninja (t3), 9x Tiny (t1), 7x GrapplingHook (t1), 6x Random (t3) |
| **8-13** | Flag | 900x720 | 27 | 69.47 | 10 | — | 22 | 270 | 17x Crazy (t1), 10x Ghost (t2) |
| **8-14** | Defense | 640x960 | 31 | 46.78 | 10 | — | — | — | 19x DamageAddict (t3), 6x Shrinking (t3), 6x Random (t3) |
| **8-15** | Flag | 800x600 | 31 | 58.45 | 10 | — | 25 | 238 | 12x Trap (t3), 12x Exploding (t3), 7x GrapplingHook (t1) |
| **8-16** | Tower | 640x640 | 33 | 49 | 10 | — | — | — | 18x Tiny (t3), 8x ScaredGhost (t2), 7x Temperamental (t2) |
| **8-17** | Defense | 640x960 | 39 | 34.38 | 10 | — | — | — | 13x Random (t2), 13x Tiny (t2), 13x GrapplingHook (t1) |
| **8-18** | Boss | 900x720 | 23 | 102.28 | 10 | 2 | — | — | 1x Tiny **[BOSS]**, 1x GrapplingHook **[BOSS]**, 7x Fast (t3), 7x Random (t2), 7x GrapplingHook (t1) |
| **8-19** | Normal | 900x720 | 39 | 28.46 | 10 | — | — | — | 17x Random (t1), 14x Tiny (t2), 8x Exploding (t1) |
| **8-20** | Flag | 640x400 | 31 | 54.68 | 10 | — | 30 | 195 | 17x Teleporting (t1), 14x Accelerating (t3) <br>**NEW: Teleporting** |
| **8-21** | Tower | 640x640 | 33 | 44.92 | 10 | — | — | — | 15x Shrinking (t2), 9x Strong (t3), 9x Exploding (t1) |
| **8-22** | Normal | 800x600 | 36 | 32.28 | 10 | — | — | — | 9x Ghost (t2), 9x Trap (t1), 9x Temperamental (t3), 9x Random (t3) |
| **8-23** | Flag | 800x600 | 24 | 80.48 | 10 | — | 25 | 238 | 10x ScaredGhost (t2), 9x Medic (t2), 5x GrapplingHook (t2) |
| **8-24** | Flag | 900x720 | 30 | 85.5 | 10 | — | 22 | 270 | 9x Random (t1), 8x Tiny (t2), 7x GrapplingHook (t2), 6x Ninja (t2) |
| **8-25** | Defense | 640x960 | 41 | 30.18 | 10 | — | — | — | 19x Exploding (t1), 13x GrapplingHook (t1), 9x Tiny (t2) |
| **8-26** | Tower | 640x640 | 29 | 55.26 | 10 | — | — | — | 17x DamageAddict (t3), 12x Tiny (t1) |
| **8-27** | Boss | 900x720 | 33 | 56.74 | 10 | 1 | — | — | 1x Teleporting **[BOSS]**, 15x Teleporting (t1), 9x Shooting (t3), 8x Random (t1) |
| **8-28** | Normal | 900x720 | 36 | 36.41 | 10 | — | — | — | 17x Random (t3), 11x Fast (t1), 8x Crazy (t2) |
| **8-29** | Normal | 800x600 | 32 | 48.39 | 10 | — | — | — | 8x Strong (t3), 8x Random (t3), 8x GrapplingHook (t1), 8x Teleporting (t1) |
| **8-30** | Normal | 640x400 | 36 | 36.46 | 10 | — | — | — | 16x Accelerating (t2), 11x Tiny (t2), 9x Trap (t3) |
| **8-31** | Defense | 640x960 | 38 | 36.08 | 10 | — | — | — | 19x Temperamental (t2), 19x Ninja (t3) |
| **8-32** | Tower | 640x640 | 28 | 57.45 | 10 | — | — | — | 7x Medic (t2), 7x ScaredGhost (t2), 7x Exploding (t1), 7x Teleporting (t1) |
| **8-33** | Flag | 900x720 | 50 | 18.85 | 10 | — | 22 | 270 | 35x Ghost (t3), 15x ScaredGhost (t2) |
| **8-34** | Defense | 640x960 | 32 | 46.32 | 10 | — | — | — | 8x Crazy (t3), 8x Medic (t2), 8x DamageAddict (t3), 8x Random (t1) |
| **8-35** | Tower | 640x640 | 34 | 41.32 | 10 | — | — | — | 34x Exploding (t1) |
| **8-36** | Boss | 900x720 | 31 | 66.54 | 10 | 2 | — | — | 1x DamageAddict **[BOSS]**, 1x Teleporting **[BOSS]**, 20x Shrinking (t1), 9x GrapplingHook (t2) |
| **8-37** | Defense | 640x960 | 48 | 35.5 | 10 | — | — | — | 29x Tiny (t1), 19x Trap (t2) |
| **8-38** | Tower | 640x640 | 26 | 67.68 | 10 | — | — | — | 17x DamageAddict (t2), 9x Medic (t3) |
| **8-39** | Flag | 900x720 | 26 | 72.95 | 10 | — | 22 | 270 | 16x Crazy (t2), 10x Fast (t2) |
| **8-40** | Flag | 800x600 | 20 | 111.71 | 10 | — | 25 | 238 | 8x Strong (t3), 7x Random (t3), 5x Medic (t3) |
| **8-41** | Tower | 640x640 | 40 | 29.65 | 10 | — | — | — | 20x Basic (t1), 20x Teleporting (t1) |
| **8-42** | Tower | 640x640 | 31 | 60 | 10 | — | — | — | 11x ScaredGhost (t3), 8x Accelerating (t3), 6x Tiny (t1), 6x Teleporting (t1) |
| **8-43** | Normal | 900x720 | 43 | 24 | 10 | — | — | — | 21x Random (t1), 12x Shooting (t3), 10x GrapplingHook (t3) |
| **8-44** | Defense | 640x960 | 36 | 37.68 | 10 | — | — | — | 26x Teleporting (t1), 10x GrapplingHook (t1) |
| **8-45** | Boss | 800x600 | 29 | 74.2 | 10 | 2 | — | — | 1x Fast **[BOSS]**, 1x Trap **[BOSS]**, 20x Medic (t3), 7x Tiny (t1) |

### World 9 — Futuristic

| Level | Mode | Room | Enemies | Interval | Cap | Bosses | Flags | $/flag | Wave composition |
|---|---|---|---|---|---|---|---|---|---|
| **9-1** | Normal | 900x720 | 43 | 25.03 | 10 | — | — | — | 23x Soldier (t1), 11x Strong (t1), 9x Random (t1) <br>**NEW: Soldier** |
| **9-2** | Defense | 640x960 | 39 | 32.71 | 10 | — | — | — | 15x GrapplingHook (t1), 13x Ninja (t2), 11x Tiny (t1) |
| **9-3** | Flag | 640x400 | 18 | 420 | 10 | — | 30 | 195 | 18x GrapplingHook (t1) |
| **9-4** | Defense | 640x960 | 37 | 35.8 | 10 | — | — | — | 14x DamageAddict (t2), 13x Soldier (t1), 10x GrapplingHook (t1) |
| **9-5** | Flag | 800x600 | 38 | 36.84 | 10 | — | 25 | 238 | 19x Shooting (t2), 19x Exploding (t1) |
| **9-6** | Normal | 800x600 | 28 | 55.33 | 10 | — | — | — | 16x Fast (t2), 6x Crazy (t2), 6x Teleporting (t1) |
| **9-7** | Tower | 640x640 | 30 | 55.29 | 10 | — | — | — | 10x ScaredGhost (t2), 10x Tiny (t2), 10x Teleporting (t2) |
| **9-8** | Tower | 640x640 | 34 | 42.71 | 10 | — | — | — | 18x Temperamental (t2), 16x Accelerating (t3) |
| **9-9** | Boss | 900x720 | 28 | 90 | 10 | 1 | — | — | 1x Soldier **[BOSS]**, 9x Tiny (t2), 9x GrapplingHook (t2), 9x Teleporting (t1) |
| **9-10** | Flag | 900x720 | 34 | 46.28 | 10 | — | 22 | 270 | 23x Soldier (t1), 11x GrapplingHook (t1) |
| **9-11** | Defense | 640x960 | 40 | 30.41 | 10 | — | — | — | 19x Exploding (t2), 12x Soldier (t1), 9x Teleporting (t1) |
| **9-12** | Normal | 900x720 | 45 | 21.3 | 10 | — | — | — | 15x ScaredGhost (t2), 15x Teleporting (t2), 15x Soldier (t1) |
| **9-13** | Flag | 800x600 | 28 | 64.19 | 10 | — | 25 | 238 | 7x DamageAddict (t2), 7x Tiny (t1), 7x GrapplingHook (t1), 7x Soldier (t1) |
| **9-14** | Defense | 640x960 | 35 | 40.12 | 10 | — | — | — | 26x GrapplingHook (t2), 9x Random (t2) |
| **9-15** | Tower | 640x640 | 36 | 42.58 | 10 | — | — | — | 9x Basic (t3), 9x Medic (t3), 9x Tiny (t2), 9x Teleporting (t1) |
| **9-16** | Normal | 800x600 | 32 | 43.81 | 10 | — | — | — | 20x GrapplingHook (t1), 12x Ninja (t2) |
| **9-17** | Flag | 800x600 | 41 | 31.81 | 10 | — | 25 | 238 | 31x Tiny (t2), 10x Strong (t3) |
| **9-18** | Boss | 800x600 | 21 | 131.95 | 10 | 3 | — | — | 1x Accelerating **[BOSS]**, 1x Exploding **[BOSS]**, 1x Tiny **[BOSS]**, 6x Trap (t3), 6x Random (t2), 6x Teleporting (t2) |
| **9-19** | Normal | 800x600 | 32 | 43.41 | 10 | — | — | — | 18x Shrinking (t3), 14x Random (t3) |
| **9-20** | Normal | 900x720 | 48 | 17.54 | 10 | — | — | — | 26x Trap (t3), 22x Accelerating (t3) |
| **9-21** | Defense | 640x960 | 33 | 70 | 10 | — | — | — | 33x Soldier (t3) |
| **9-22** | Tower | 640x640 | 26 | 66.62 | 10 | — | — | — | 16x Teleporting (t2), 5x Medic (t3), 5x Exploding (t3) |
| **9-23** | Tower | 640x640 | 30 | 45 | 10 | — | — | — | 20x Exploding (t2), 10x Teleporting (t1) |
| **9-24** | Normal | 640x400 | 22 | 85.58 | 10 | — | — | — | 11x DamageAddict (t2), 6x ScaredGhost (t3), 5x Crazy (t2) |
| **9-25** | Tower | 640x640 | 30 | 55.68 | 10 | — | — | — | 15x Temperamental (t3), 9x Teleporting (t1), 6x DamageAddict (t2) |
| **9-26** | Normal | 900x720 | 36 | 31.96 | 10 | — | — | — | 12x Crazy (t2), 12x Teleporting (t1), 12x Soldier (t2) |
| **9-27** | Boss | 900x720 | 24 | 111.99 | 10 | 3 | — | — | 1x Temperamental **[BOSS]**, 1x ScaredGhost **[BOSS]**, 1x Soldier **[BOSS]**, 9x Fast (t2), 8x Random (t1), 4x Teleporting (t1) |
| **9-28** | Flag | 900x720 | 58 | 11.07 | 10 | — | 22 | 270 | 29x Basic (t1), 29x Ghost (t2) |
| **9-29** | Tower | 640x640 | 23 | 79.96 | 10 | — | — | — | 13x Strong (t3), 5x ScaredGhost (t3), 5x DamageAddict (t2) |
| **9-30** | Flag | 640x400 | 28 | 78 | 10 | — | 30 | 195 | 14x Shooting (t3), 14x Soldier (t1) |
| **9-31** | Defense | 640x960 | 39 | 50 | 10 | — | — | — | 13x Tiny (t1), 13x Teleporting (t2), 13x Soldier (t2) |
| **9-32** | Defense | 640x960 | 36 | 35.23 | 10 | — | — | — | 12x Medic (t2), 12x Exploding (t1), 12x GrapplingHook (t1) |
| **9-33** | Flag | 900x720 | 32 | 53.19 | 10 | — | 22 | 270 | 14x Soldier (t2), 11x Ninja (t3), 7x DamageAddict (t3) |
| **9-34** | Flag | 900x720 | 33 | 47.37 | 10 | — | 22 | 270 | 11x ScaredGhost (t3), 11x Random (t2), 11x Soldier (t2) |
| **9-35** | Tower | 640x640 | 32 | 47.69 | 10 | — | — | — | 16x Tiny (t1), 16x Teleporting (t2) |
| **9-36** | Boss | 900x720 | 22 | 117.77 | 10 | 2 | — | — | 1x Teleporting **[BOSS]**, 1x Soldier **[BOSS]**, 15x Crazy (t3), 5x DamageAddict (t3) |
| **9-37** | Tower | 640x640 | 28 | 59.09 | 10 | — | — | — | 14x Exploding (t2), 14x Teleporting (t2) |
| **9-38** | Tower | 640x640 | 26 | 66.66 | 10 | — | — | — | 15x Medic (t3), 11x Teleporting (t1) |
| **9-39** | Normal | 900x720 | 37 | 32.57 | 10 | — | — | — | 16x GrapplingHook (t1), 12x Random (t3), 9x DamageAddict (t2) |
| **9-40** | Normal | 900x720 | 40 | 27.21 | 10 | — | — | — | 21x GrapplingHook (t1), 10x Random (t2), 9x Soldier (t1) |
| **9-41** | Flag | 800x600 | 23 | 87.93 | 10 | — | 25 | 238 | 8x Tiny (t2), 6x GrapplingHook (t2), 5x Crazy (t1), 4x Soldier (t2) |
| **9-42** | Normal | 800x600 | 32 | 34 | 10 | — | — | — | 8x Shrinking (t2), 8x Ninja (t3), 8x ScaredGhost (t1), 8x Random (t2) |
| **9-43** | Flag | 900x720 | 33 | 48.53 | 10 | — | 22 | 270 | 18x Soldier (t2), 8x Fast (t3), 7x GrapplingHook (t2) |
| **9-44** | Defense | 640x960 | 47 | 40 | 10 | — | — | — | 18x Exploding (t2), 12x Tiny (t2), 9x Accelerating (t3), 8x Temperamental (t2) |
| **9-45** | Boss | 900x720 | 19 | 175.5 | 10 | 3 | — | — | 1x GrapplingHook **[BOSS]**, 1x Teleporting **[BOSS]**, 1x Soldier **[BOSS]**, 8x GrapplingHook (t2), 8x Teleporting (t2) |

## Divergences applied on top of this data

`getLevel` applies these at read time, so the game plays them and the table
above does not show them. See `src/game/levels/levelSizeOverrides.ts`.

12 level(s) play at a size other than the one the AS3 specifies.

| Level | Source size | Played size | Reason |
|---|---|---|---|
| 1-1 | 640x400 | 800x600 | standard |
| 1-3 | 640x400 | 800x600 | standard |
| 1-30 | 640x400 | 800x600 | standard |
| 1-2 | 900x720 | 800x600 | standard |
| 1-5 | 900x720 | 800x600 | standard |
| 1-6 | 900x720 | 800x600 | standard |
| 1-8 | 900x720 | 800x600 | standard |
| 1-17 | 900x720 | 800x600 | standard |
| 1-19 | 900x720 | 800x600 | standard |
| 1-21 | 900x720 | 800x600 | standard |
| 1-39 | 900x720 | 800x600 | standard |
| 1-43 | 900x720 | 800x600 | standard |
