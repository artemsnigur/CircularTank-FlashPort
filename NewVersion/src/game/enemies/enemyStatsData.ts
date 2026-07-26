/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run enemy-stats:data
 *
 * The 40 `enemy*Stats` tables from SWFimported/scripts/ScreenGame.as, one per
 * enemy type per variant. Column meanings come from PartGameArea.spawnEnemy;
 * see enemyStats.ts for how the difficulty and tier multipliers are applied.
 */

/** Particle colour key used when the enemy is hit or dies. */
export type EnemyParticle = "EnemyBlack" | "EnemyBlue" | "EnemyCyan" | "EnemyGreen" | "EnemyGreen2" | "EnemyGreen3" | "EnemyGrey" | "EnemyLightBlue" | "EnemyOrange" | "EnemyOrangeBrown" | "EnemyPink" | "EnemyPurple" | "EnemyRed" | "EnemyRedGrey" | "EnemyWhite" | "EnemyWhite2" | "EnemyWhiteRed" | "EnemyYellow" | "EnemyYellow2";

/** Bullet behaviour, read only when `shoot` is true. */
export type EnemyShootType = "Basic" | "BasicBoss" | "Following" | "FollowingBoss" | "Hook" | "Trap";

/** Firing pattern. */
export type EnemyShootAngle = "BackTrap" | "Circle" | "Front" | "FrontAmount" | "FrontSides";

export interface EnemyBaseStats {
  /** Contact damage, before difficulty and tier scaling. */
  damage: number;
  health: number;
  /** Money dropped on death. */
  money: number;
  moveSpeedMax: number;
  accSpeed: number;
  rotSpeedMax: number;
  particle: EnemyParticle;
  shoot: boolean;
  shootType?: EnemyShootType;
  shootAngle?: EnemyShootAngle;
  /** Frames between shots at 30 fps, before the reload-time multiplier. */
  reloadTimeMax?: number;
  bulletAmount?: number;
}

/** The eight damage channels an enemy can resist or be vulnerable to. */
export type DamageType = "Bullets" | "Explosions" | "FireLava" | "Food" | "Ice" | "Laser" | "Magic" | "Poison";

/** One entry of a strengths or weaknesses table. */
export interface Resistance {
  damageType: DamageType;
  /** Subtracted from the multiplier for a strength, added for a weakness. */
  value: number;
}

export interface EnemyVariants {
  normal: EnemyBaseStats;
  /** The `B` table — used when a level spawns this type as a boss. */
  boss: EnemyBaseStats;
  /**
   * Damage types this enemy resists. Shared by both variants: the AS3
   * looks these up by base type name, so a boss inherits them.
   */
  strengths: Resistance[];
  /** Damage types this enemy takes extra from. */
  weaknesses: Resistance[];
}

/** 20 enemy types, 40 tables. */
export const ENEMY_STATS: Readonly<Record<string, EnemyVariants>> = {
  Accelerating: {
    normal: { damage: 6, health: 20, money: 120, moveSpeedMax: 1, accSpeed: 0.2, rotSpeedMax: 2, particle: "EnemyPurple", shoot: false },
    boss: { damage: 15, health: 900, money: 1400, moveSpeedMax: 1, accSpeed: 0.2, rotSpeedMax: 2, particle: "EnemyPurple", shoot: false },
    strengths: [{ damageType: "Explosions", value: 0.25 }, { damageType: "Magic", value: 0.5 }],
    weaknesses: [{ damageType: "Food", value: 0.75 }],
  },
  Basic: {
    normal: { damage: 5, health: 10, money: 50, moveSpeedMax: 1.5, accSpeed: 0.2, rotSpeedMax: 1, particle: "EnemyGreen", shoot: false },
    boss: { damage: 15, health: 500, money: 500, moveSpeedMax: 1.5, accSpeed: 0.2, rotSpeedMax: 1, particle: "EnemyGreen", shoot: false },
    strengths: [],
    weaknesses: [],
  },
  Crazy: {
    normal: { damage: 5, health: 15, money: 100, moveSpeedMax: 1.5, accSpeed: 0.2, rotSpeedMax: 1, particle: "EnemyRed", shoot: true, shootType: "Basic", shootAngle: "Circle", reloadTimeMax: 180, bulletAmount: 6 },
    boss: { damage: 15, health: 950, money: 1500, moveSpeedMax: 1.5, accSpeed: 0.2, rotSpeedMax: 1, particle: "EnemyRed", shoot: true, shootType: "BasicBoss", shootAngle: "Circle", reloadTimeMax: 120, bulletAmount: 12 },
    strengths: [{ damageType: "Poison", value: 0.75 }],
    weaknesses: [{ damageType: "Bullets", value: 0.5 }],
  },
  DamageAddict: {
    normal: { damage: 5, health: 25, money: 150, moveSpeedMax: 1.5, accSpeed: 0.25, rotSpeedMax: 2.5, particle: "EnemyPink", shoot: false },
    boss: { damage: 15, health: 500, money: 1900, moveSpeedMax: 1.5, accSpeed: 0.25, rotSpeedMax: 2.5, particle: "EnemyPink", shoot: false },
    strengths: [],
    weaknesses: [],
  },
  Exploding: {
    normal: { damage: 5, health: 20, money: 150, moveSpeedMax: 2.5, accSpeed: 0.25, rotSpeedMax: 2.5, particle: "EnemyOrange", shoot: false },
    boss: { damage: 15, health: 1200, money: 2000, moveSpeedMax: 2.5, accSpeed: 0.25, rotSpeedMax: 2.5, particle: "EnemyOrange", shoot: false },
    strengths: [{ damageType: "Bullets", value: 0.75 }],
    weaknesses: [{ damageType: "Laser", value: 0.75 }],
  },
  Fast: {
    normal: { damage: 5, health: 10, money: 50, moveSpeedMax: 3, accSpeed: 0.2, rotSpeedMax: 2, particle: "EnemyYellow", shoot: false },
    boss: { damage: 15, health: 600, money: 600, moveSpeedMax: 3, accSpeed: 0.1, rotSpeedMax: 2, particle: "EnemyYellow", shoot: false },
    strengths: [],
    weaknesses: [],
  },
  Ghost: {
    normal: { damage: 5, health: 10, money: 80, moveSpeedMax: 2, accSpeed: 0.25, rotSpeedMax: 3, particle: "EnemyWhite", shoot: false },
    boss: { damage: 15, health: 450, money: 1000, moveSpeedMax: 2, accSpeed: 0.25, rotSpeedMax: 3, particle: "EnemyWhite", shoot: false },
    strengths: [{ damageType: "Poison", value: 0.5 }],
    weaknesses: [{ damageType: "Laser", value: 0.5 }],
  },
  GrapplingHook: {
    normal: { damage: 5, health: 20, money: 150, moveSpeedMax: 1.5, accSpeed: 0.2, rotSpeedMax: 3, particle: "EnemyBlue", shoot: true, shootType: "Hook", shootAngle: "Front", reloadTimeMax: 60, bulletAmount: 1 },
    boss: { damage: 15, health: 1200, money: 2200, moveSpeedMax: 1.5, accSpeed: 0.2, rotSpeedMax: 3, particle: "EnemyBlue", shoot: true, shootType: "Hook", shootAngle: "FrontAmount", reloadTimeMax: 60, bulletAmount: 3 },
    strengths: [{ damageType: "Poison", value: 0.25 }, { damageType: "Ice", value: 0.75 }],
    weaknesses: [{ damageType: "Magic", value: 0.75 }],
  },
  Medic: {
    normal: { damage: 5, health: 25, money: 200, moveSpeedMax: 2, accSpeed: 0.3, rotSpeedMax: 2, particle: "EnemyGreen2", shoot: false },
    boss: { damage: 15, health: 1000, money: 1600, moveSpeedMax: 2, accSpeed: 0.3, rotSpeedMax: 2, particle: "EnemyGreen2", shoot: false },
    strengths: [{ damageType: "FireLava", value: 0.5 }, { damageType: "Food", value: 0.25 }],
    weaknesses: [{ damageType: "Poison", value: 0.5 }],
  },
  Ninja: {
    normal: { damage: 5, health: 10, money: 100, moveSpeedMax: 3, accSpeed: 0.2, rotSpeedMax: 2, particle: "EnemyBlack", shoot: true, shootType: "Basic", shootAngle: "Front", reloadTimeMax: 60, bulletAmount: 1 },
    boss: { damage: 15, health: 850, money: 1300, moveSpeedMax: 3, accSpeed: 0.1, rotSpeedMax: 2, particle: "EnemyBlack", shoot: true, shootType: "BasicBoss", shootAngle: "FrontAmount", reloadTimeMax: 35, bulletAmount: 1 },
    strengths: [{ damageType: "Bullets", value: 0.25 }, { damageType: "Laser", value: 0.75 }],
    weaknesses: [{ damageType: "FireLava", value: 0.5 }],
  },
  Random: {
    normal: { damage: 5, health: 20, money: 150, moveSpeedMax: 2, accSpeed: 0.1, rotSpeedMax: 1.5, particle: "EnemyLightBlue", shoot: true, shootType: "Basic", shootAngle: "Circle", reloadTimeMax: 60, bulletAmount: 1 },
    boss: { damage: 15, health: 1050, money: 1700, moveSpeedMax: 2, accSpeed: 0.1, rotSpeedMax: 1.5, particle: "EnemyLightBlue", shoot: true, shootType: "BasicBoss", shootAngle: "Circle", reloadTimeMax: 15, bulletAmount: 1 },
    strengths: [{ damageType: "Magic", value: 0.75 }],
    weaknesses: [{ damageType: "Explosions", value: 0.75 }],
  },
  ScaredGhost: {
    normal: { damage: 5, health: 10, money: 150, moveSpeedMax: 2, accSpeed: 0.5, rotSpeedMax: 3, particle: "EnemyWhite2", shoot: false },
    boss: { damage: 15, health: 400, money: 1800, moveSpeedMax: 2, accSpeed: 0.5, rotSpeedMax: 3, particle: "EnemyWhite2", shoot: false },
    strengths: [{ damageType: "Ice", value: 0.5 }],
    weaknesses: [{ damageType: "Poison", value: 0.75 }, { damageType: "Magic", value: 0.5 }],
  },
  Shooting: {
    normal: { damage: 5, health: 10, money: 60, moveSpeedMax: 1.5, accSpeed: 0.2, rotSpeedMax: 1, particle: "EnemyGrey", shoot: true, shootType: "Basic", shootAngle: "Front", reloadTimeMax: 150, bulletAmount: 1 },
    boss: { damage: 15, health: 650, money: 700, moveSpeedMax: 1.5, accSpeed: 0.2, rotSpeedMax: 1, particle: "EnemyGrey", shoot: true, shootType: "BasicBoss", shootAngle: "FrontAmount", reloadTimeMax: 100, bulletAmount: 4 },
    strengths: [],
    weaknesses: [],
  },
  Shrinking: {
    normal: { damage: 5, health: 10, money: 70, moveSpeedMax: 2, accSpeed: 0.1, rotSpeedMax: 2.5, particle: "EnemyCyan", shoot: false },
    boss: { damage: 15, health: 750, money: 900, moveSpeedMax: 2, accSpeed: 0.1, rotSpeedMax: 2.5, particle: "EnemyCyan", shoot: false },
    strengths: [{ damageType: "Laser", value: 0.5 }],
    weaknesses: [{ damageType: "FireLava", value: 0.75 }],
  },
  Soldier: {
    normal: { damage: 5, health: 20, money: 150, moveSpeedMax: 2.5, accSpeed: 0.2, rotSpeedMax: 2, particle: "EnemyGreen3", shoot: true, shootType: "Following", shootAngle: "Front", reloadTimeMax: 150, bulletAmount: 1 },
    boss: { damage: 15, health: 1200, money: 2400, moveSpeedMax: 2.5, accSpeed: 0.2, rotSpeedMax: 2, particle: "EnemyGreen3", shoot: true, shootType: "FollowingBoss", shootAngle: "FrontSides", reloadTimeMax: 150, bulletAmount: 3 },
    strengths: [{ damageType: "Explosions", value: 0.75 }, { damageType: "FireLava", value: 0.25 }],
    weaknesses: [{ damageType: "Food", value: 0.5 }],
  },
  Strong: {
    normal: { damage: 5, health: 20, money: 100, moveSpeedMax: 2, accSpeed: 0.3, rotSpeedMax: 1.5, particle: "EnemyRedGrey", shoot: false },
    boss: { damage: 15, health: 700, money: 800, moveSpeedMax: 2, accSpeed: 0.1, rotSpeedMax: 1.5, particle: "EnemyRedGrey", shoot: false },
    strengths: [{ damageType: "Explosions", value: 0.5 }, { damageType: "Bullets", value: 0.5 }],
    weaknesses: [],
  },
  Teleporting: {
    normal: { damage: 5, health: 20, money: 150, moveSpeedMax: 2.5, accSpeed: 0.3, rotSpeedMax: 3, particle: "EnemyYellow2", shoot: false },
    boss: { damage: 15, health: 1200, money: 2300, moveSpeedMax: 2.5, accSpeed: 0.3, rotSpeedMax: 3, particle: "EnemyYellow2", shoot: false },
    strengths: [{ damageType: "Laser", value: 0.25 }],
    weaknesses: [{ damageType: "Ice", value: 0.5 }],
  },
  Temperamental: {
    normal: { damage: 6, health: 20, money: 100, moveSpeedMax: 1, accSpeed: 0.2, rotSpeedMax: 2, particle: "EnemyWhiteRed", shoot: false },
    boss: { damage: 15, health: 800, money: 1200, moveSpeedMax: 1, accSpeed: 0.2, rotSpeedMax: 2, particle: "EnemyWhiteRed", shoot: false },
    strengths: [{ damageType: "FireLava", value: 0.75 }, { damageType: "Food", value: 0.5 }],
    weaknesses: [{ damageType: "Ice", value: 0.75 }],
  },
  Tiny: {
    normal: { damage: 5, health: 15, money: 150, moveSpeedMax: 1.8, accSpeed: 0.4, rotSpeedMax: 2, particle: "EnemyGreen2", shoot: false },
    boss: { damage: 15, health: 1200, money: 2100, moveSpeedMax: 1.8, accSpeed: 0.4, rotSpeedMax: 2, particle: "EnemyGreen2", shoot: false },
    strengths: [{ damageType: "Food", value: 0.75 }, { damageType: "Magic", value: 0.25 }],
    weaknesses: [{ damageType: "Bullets", value: 0.75 }],
  },
  Trap: {
    normal: { damage: 5, health: 15, money: 80, moveSpeedMax: 1.5, accSpeed: 0.2, rotSpeedMax: 1, particle: "EnemyOrangeBrown", shoot: true, shootType: "Trap", shootAngle: "BackTrap", reloadTimeMax: 100, bulletAmount: 1 },
    boss: { damage: 15, health: 750, money: 1100, moveSpeedMax: 1.5, accSpeed: 0.2, rotSpeedMax: 1, particle: "EnemyOrangeBrown", shoot: true, shootType: "Trap", shootAngle: "BackTrap", reloadTimeMax: 75, bulletAmount: 3 },
    strengths: [{ damageType: "Ice", value: 0.25 }, { damageType: "Magic", value: 0.75 }],
    weaknesses: [{ damageType: "Explosions", value: 0.5 }],
  },
};

/** Every enemy type that has a stat table. */
export const ENEMY_STAT_TYPES: readonly string[] = ["Accelerating", "Basic", "Crazy", "DamageAddict", "Exploding", "Fast", "Ghost", "GrapplingHook", "Medic", "Ninja", "Random", "ScaredGhost", "Shooting", "Shrinking", "Soldier", "Strong", "Teleporting", "Temperamental", "Tiny", "Trap"];

