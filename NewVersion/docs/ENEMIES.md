# Enemy reference

<!-- GENERATED FILE — do not edit by hand.
     Regenerate with: npm run enemies:doc
     Source of every figure: src/game/enemies/ and src/game/weapons/firing.ts.
     See scripts/gen-enemy-reference.ts for why this is generated. -->

Covers the **19 of 20** enemy types whose behaviour is built.
Types still marked `data-only` are omitted deliberately: they spawn and steer,
but nothing that distinguishes them is implemented, so an entry would describe
intent rather than the game.

Every number is read from the modules the game runs on, not retyped — so this
file cannot drift from the code. Frame counts are at the SWF's 30 fps.

Stats shown are the **base table values**. At runtime they are scaled by
difficulty and by the level's tier (`resolveEnemyStats`), so a world-7 Basic
is not a world-1 Basic.

## Contents

- [Accelerating](#accelerating)
- [Basic](#basic)
- [Crazy](#crazy)
- [DamageAddict](#damageaddict)
- [Exploding](#exploding)
- [Fast](#fast)
- [Ghost](#ghost)
- [Medic](#medic)
- [Ninja](#ninja)
- [Random](#random)
- [ScaredGhost](#scaredghost)
- [Shooting](#shooting)
- [Shrinking](#shrinking)
- [Soldier](#soldier)
- [Strong](#strong)
- [Teleporting](#teleporting)
- [Temperamental](#temperamental)
- [Tiny](#tiny)
- [Trap](#trap)

---

### Accelerating

_Becomes faster over time. Damage slows it down._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

**Counter with** Gummy Bear Cannon, Cake Cannon. **Avoid** Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon, Magic Cannon.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Food | 1.75x **weak** | Gummy Bear Cannon, Cake Cannon |
| Bullets | 1x neutral | MiniGun, Shotgun |
| FireLava | 1x neutral | Flamethrower |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Laser | 1x neutral | Laser Cannon |
| Poison | 1x neutral | Poison Cannon |
| Explosions | 0.75x resists | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| Magic | 0.5x resists | Magic Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 20 | 900 |
| Contact damage | 6 | 15 |
| Money dropped | 120 | 1400 |
| Max speed | 1 | 1 |
| Acceleration | 0.2 | 0.2 |
| Turn rate (deg/frame) | 2 | 2 |

---

### Basic

_The most boring enemy in the game._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

No resistances or weaknesses — every primary does full damage.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Bullets | 1x neutral | MiniGun, Shotgun |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| FireLava | 1x neutral | Flamethrower |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Laser | 1x neutral | Laser Cannon |
| Magic | 1x neutral | Magic Cannon |
| Poison | 1x neutral | Poison Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 10 | 500 |
| Contact damage | 5 | 15 |
| Money dropped | 50 | 500 |
| Max speed | 1.5 | 1.5 |
| Acceleration | 0.2 | 0.2 |
| Turn rate (deg/frame) | 1 | 1 |

---

### Crazy

_Shoots bursts of bullets in all directions._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** 6 bullets in a full ring from a random start angle, once every 180 frames (6s). Bullet class `Basic`.

**Counters**

**Counter with** MiniGun, Shotgun. **Avoid** Poison Cannon.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Bullets | 1.5x **weak** | MiniGun, Shotgun |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| FireLava | 1x neutral | Flamethrower |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Laser | 1x neutral | Laser Cannon |
| Magic | 1x neutral | Magic Cannon |
| Poison | 0.25x resists | Poison Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 15 | 950 |
| Contact damage | 5 | 15 |
| Money dropped | 100 | 1500 |
| Max speed | 1.5 | 1.5 |
| Acceleration | 0.2 | 0.2 |
| Turn rate (deg/frame) | 1 | 1 |
| Reload | 180 frames (6s) | 120 frames (4s) |
| Bullets per volley | 6 | 12 |
| Bullet class | Basic | BasicBoss |
| Firing pattern | Circle | Circle |

---

### DamageAddict

_Dies automatically. Damage heals it._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

No resistances or weaknesses — every primary does full damage.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Bullets | 1x neutral | MiniGun, Shotgun |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| FireLava | 1x neutral | Flamethrower |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Laser | 1x neutral | Laser Cannon |
| Magic | 1x neutral | Magic Cannon |
| Poison | 1x neutral | Poison Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 25 | 500 |
| Contact damage | 5 | 15 |
| Money dropped | 150 | 1900 |
| Max speed | 1.5 | 1.5 |
| Acceleration | 0.25 | 0.25 |
| Turn rate (deg/frame) | 2.5 | 2.5 |

---

### Exploding

_Explodes when it dies._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

**Counter with** Laser Cannon. **Avoid** MiniGun, Shotgun.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Laser | 1.75x **weak** | Laser Cannon |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| FireLava | 1x neutral | Flamethrower |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Magic | 1x neutral | Magic Cannon |
| Poison | 1x neutral | Poison Cannon |
| Bullets | 0.25x resists | MiniGun, Shotgun |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 20 | 1200 |
| Contact damage | 5 | 15 |
| Money dropped | 150 | 2000 |
| Max speed | 2.5 | 2.5 |
| Acceleration | 0.25 | 0.25 |
| Turn rate (deg/frame) | 2.5 | 2.5 |

---

### Fast

_Faster than most enemies._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

No resistances or weaknesses — every primary does full damage.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Bullets | 1x neutral | MiniGun, Shotgun |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| FireLava | 1x neutral | Flamethrower |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Laser | 1x neutral | Laser Cannon |
| Magic | 1x neutral | Magic Cannon |
| Poison | 1x neutral | Poison Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 10 | 600 |
| Contact damage | 5 | 15 |
| Money dropped | 50 | 600 |
| Max speed | 3 | 3 |
| Acceleration | 0.2 | 0.1 |
| Turn rate (deg/frame) | 2 | 2 |

---

### Ghost

_Can't be damaged when invisible._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

**Counter with** Laser Cannon. **Avoid** Poison Cannon.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Laser | 1.5x **weak** | Laser Cannon |
| Bullets | 1x neutral | MiniGun, Shotgun |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| FireLava | 1x neutral | Flamethrower |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Magic | 1x neutral | Magic Cannon |
| Poison | 0.5x resists | Poison Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 10 | 450 |
| Contact damage | 5 | 15 |
| Money dropped | 80 | 1000 |
| Max speed | 2 | 2 |
| Acceleration | 0.25 | 0.25 |
| Turn rate (deg/frame) | 3 | 3 |

---

### Medic

_Heals other enemies._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

**Counter with** Poison Cannon. **Avoid** Flamethrower, Gummy Bear Cannon, Cake Cannon.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Poison | 1.5x **weak** | Poison Cannon |
| Bullets | 1x neutral | MiniGun, Shotgun |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Laser | 1x neutral | Laser Cannon |
| Magic | 1x neutral | Magic Cannon |
| Food | 0.75x resists | Gummy Bear Cannon, Cake Cannon |
| FireLava | 0.5x resists | Flamethrower |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 25 | 1000 |
| Contact damage | 5 | 15 |
| Money dropped | 200 | 1600 |
| Max speed | 2 | 2 |
| Acceleration | 0.3 | 0.3 |
| Turn rate (deg/frame) | 2 | 2 |

---

### Ninja

_Moves fast and shoots rapidly._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** a single bullet along its facing, once every 60 frames (2s). Bullet class `Basic`.

**Counters**

**Counter with** Flamethrower. **Avoid** MiniGun, Shotgun, Laser Cannon.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| FireLava | 1.5x **weak** | Flamethrower |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Magic | 1x neutral | Magic Cannon |
| Poison | 1x neutral | Poison Cannon |
| Bullets | 0.75x resists | MiniGun, Shotgun |
| Laser | 0.25x resists | Laser Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 10 | 850 |
| Contact damage | 5 | 15 |
| Money dropped | 100 | 1300 |
| Max speed | 3 | 3 |
| Acceleration | 0.2 | 0.1 |
| Turn rate (deg/frame) | 2 | 2 |
| Reload | 60 frames (2s) | 35 frames (1.17s) |
| Bullets per volley | 1 | 1 |
| Bullet class | Basic | BasicBoss |
| Firing pattern | Front | FrontAmount |

---

### Random

_Shoots in random directions._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** 1 bullets in a full ring from a random start angle, once every 60 frames (2s). Bullet class `Basic`.

**Counters**

**Counter with** Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon. **Avoid** Magic Cannon.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Explosions | 1.75x **weak** | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| Bullets | 1x neutral | MiniGun, Shotgun |
| FireLava | 1x neutral | Flamethrower |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Laser | 1x neutral | Laser Cannon |
| Poison | 1x neutral | Poison Cannon |
| Magic | 0.25x resists | Magic Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 20 | 1050 |
| Contact damage | 5 | 15 |
| Money dropped | 150 | 1700 |
| Max speed | 2 | 2 |
| Acceleration | 0.1 | 0.1 |
| Turn rate (deg/frame) | 1.5 | 1.5 |
| Reload | 60 frames (2s) | 15 frames (0.5s) |
| Bullets per volley | 1 | 1 |
| Bullet class | Basic | BasicBoss |
| Firing pattern | Circle | Circle |

---

### ScaredGhost

_Becomes invisible when damaged._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

**Counter with** Magic Cannon, Poison Cannon.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Poison | 1.75x **weak** | Poison Cannon |
| Magic | 1.5x **weak** | Magic Cannon |
| Bullets | 1x neutral | MiniGun, Shotgun |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| FireLava | 1x neutral | Flamethrower |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Laser | 1x neutral | Laser Cannon |
| Ice | 0.5x resists | _no primary — secondaries only_ |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 10 | 400 |
| Contact damage | 5 | 15 |
| Money dropped | 150 | 1800 |
| Max speed | 2 | 2 |
| Acceleration | 0.5 | 0.5 |
| Turn rate (deg/frame) | 3 | 3 |

---

### Shooting

_The first shooting enemy in the game._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** a single bullet along its facing, once every 150 frames (5s). Bullet class `Basic`.

**Counters**

No resistances or weaknesses — every primary does full damage.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Bullets | 1x neutral | MiniGun, Shotgun |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| FireLava | 1x neutral | Flamethrower |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Laser | 1x neutral | Laser Cannon |
| Magic | 1x neutral | Magic Cannon |
| Poison | 1x neutral | Poison Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 10 | 650 |
| Contact damage | 5 | 15 |
| Money dropped | 60 | 700 |
| Max speed | 1.5 | 1.5 |
| Acceleration | 0.2 | 0.2 |
| Turn rate (deg/frame) | 1 | 1 |
| Reload | 150 frames (5s) | 100 frames (3.33s) |
| Bullets per volley | 1 | 4 |
| Bullet class | Basic | BasicBoss |
| Firing pattern | Front | FrontAmount |

---

### Shrinking

_Shrinks when damaged._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

**Counter with** Flamethrower. **Avoid** Laser Cannon.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| FireLava | 1.75x **weak** | Flamethrower |
| Bullets | 1x neutral | MiniGun, Shotgun |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Magic | 1x neutral | Magic Cannon |
| Poison | 1x neutral | Poison Cannon |
| Laser | 0.5x resists | Laser Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 10 | 750 |
| Contact damage | 5 | 15 |
| Money dropped | 70 | 900 |
| Max speed | 2 | 2 |
| Acceleration | 0.1 | 0.1 |
| Turn rate (deg/frame) | 2.5 | 2.5 |

---

### Soldier

_Shoots bullets which follow you._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** a single bullet along its facing, once every 150 frames (5s). Bullet class `Following`.

**Counters**

**Counter with** Gummy Bear Cannon, Cake Cannon. **Avoid** Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon, Flamethrower.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Food | 1.5x **weak** | Gummy Bear Cannon, Cake Cannon |
| Bullets | 1x neutral | MiniGun, Shotgun |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Laser | 1x neutral | Laser Cannon |
| Magic | 1x neutral | Magic Cannon |
| Poison | 1x neutral | Poison Cannon |
| FireLava | 0.75x resists | Flamethrower |
| Explosions | 0.25x resists | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 20 | 1200 |
| Contact damage | 5 | 15 |
| Money dropped | 150 | 2400 |
| Max speed | 2.5 | 2.5 |
| Acceleration | 0.2 | 0.2 |
| Turn rate (deg/frame) | 2 | 2 |
| Reload | 150 frames (5s) | 150 frames (5s) |
| Bullets per volley | 1 | 3 |
| Bullet class | Following | FollowingBoss |
| Firing pattern | Front | FrontSides |

---

### Strong

_Strong against explosions and bullets._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

**Avoid** MiniGun, Shotgun, Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| FireLava | 1x neutral | Flamethrower |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Laser | 1x neutral | Laser Cannon |
| Magic | 1x neutral | Magic Cannon |
| Poison | 1x neutral | Poison Cannon |
| Bullets | 0.5x resists | MiniGun, Shotgun |
| Explosions | 0.5x resists | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 20 | 700 |
| Contact damage | 5 | 15 |
| Money dropped | 100 | 800 |
| Max speed | 2 | 2 |
| Acceleration | 0.3 | 0.1 |
| Turn rate (deg/frame) | 1.5 | 1.5 |

---

### Teleporting

_Loves to teleport <3._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

**Avoid** Laser Cannon. Also weak to Ice, which no primary deals — that is a secondary.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Ice | 1.5x **weak** | _no primary — secondaries only_ |
| Bullets | 1x neutral | MiniGun, Shotgun |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| FireLava | 1x neutral | Flamethrower |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Magic | 1x neutral | Magic Cannon |
| Poison | 1x neutral | Poison Cannon |
| Laser | 0.75x resists | Laser Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 20 | 1200 |
| Contact damage | 5 | 15 |
| Money dropped | 150 | 2300 |
| Max speed | 2.5 | 2.5 |
| Acceleration | 0.3 | 0.3 |
| Turn rate (deg/frame) | 3 | 3 |

---

### Temperamental

_Becomes very angry when damaged._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

**Avoid** Flamethrower, Gummy Bear Cannon, Cake Cannon. Also weak to Ice, which no primary deals — that is a secondary.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Ice | 1.75x **weak** | _no primary — secondaries only_ |
| Bullets | 1x neutral | MiniGun, Shotgun |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| Laser | 1x neutral | Laser Cannon |
| Magic | 1x neutral | Magic Cannon |
| Poison | 1x neutral | Poison Cannon |
| Food | 0.5x resists | Gummy Bear Cannon, Cake Cannon |
| FireLava | 0.25x resists | Flamethrower |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 20 | 800 |
| Contact damage | 6 | 15 |
| Money dropped | 100 | 1200 |
| Max speed | 1 | 1 |
| Acceleration | 0.2 | 0.2 |
| Turn rate (deg/frame) | 2 | 2 |

---

### Tiny

_A very small enemy._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** none — contact damage only.

**Counters**

**Counter with** MiniGun, Shotgun. **Avoid** Gummy Bear Cannon, Cake Cannon, Magic Cannon.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Bullets | 1.75x **weak** | MiniGun, Shotgun |
| Explosions | 1x neutral | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| FireLava | 1x neutral | Flamethrower |
| Ice | 1x neutral | _no primary — secondaries only_ |
| Laser | 1x neutral | Laser Cannon |
| Poison | 1x neutral | Poison Cannon |
| Magic | 0.75x resists | Magic Cannon |
| Food | 0.25x resists | Gummy Bear Cannon, Cake Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 15 | 1200 |
| Contact damage | 5 | 15 |
| Money dropped | 150 | 2100 |
| Max speed | 1.8 | 1.8 |
| Acceleration | 0.4 | 0.4 |
| Turn rate (deg/frame) | 2 | 2 |

---

### Trap

_Lays traps once in a while._

**Special mechanic:** none recorded as outstanding. Either this type has no special behaviour, or it has some and that behaviour is already ported — `Exploding` is the second case. No unported mechanic was *found* for it by `enemyBehaviour.test.ts`'s branch survey; that survey matches two AS3 idioms and is a floor, not a census.

**Ranged:** BackTrap (pattern not ported), once every 100 frames (3.33s). Bullet class `Trap`.

**Counters**

**Counter with** Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon. **Avoid** Magic Cannon.

| Channel | Effect | Primary weapons |
| --- | --- | --- |
| Explosions | 1.5x **weak** | Cannon, Big Cannon, Penetration Cannon, Timed Bomb Cannon |
| Bullets | 1x neutral | MiniGun, Shotgun |
| FireLava | 1x neutral | Flamethrower |
| Food | 1x neutral | Gummy Bear Cannon, Cake Cannon |
| Laser | 1x neutral | Laser Cannon |
| Poison | 1x neutral | Poison Cannon |
| Ice | 0.75x resists | _no primary — secondaries only_ |
| Magic | 0.25x resists | Magic Cannon |

**Stats**

| Stat | Normal | Boss |
| --- | --- | --- |
| Health | 15 | 750 |
| Contact damage | 5 | 15 |
| Money dropped | 80 | 1100 |
| Max speed | 1.5 | 1.5 |
| Acceleration | 0.2 | 0.2 |
| Turn rate (deg/frame) | 1 | 1 |
| Reload | 100 frames (3.33s) | 75 frames (2.5s) |
| Bullets per volley | 1 | 3 |
| Bullet class | Trap | Trap |
| Firing pattern | BackTrap | BackTrap |
