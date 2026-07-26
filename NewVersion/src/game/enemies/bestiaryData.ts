/**
 * GENERATED FILE — do not edit by hand.
 * Regenerate with: npm run bestiary:data
 *
 * The enemy bestiary from SWFimported/scripts/ScreenEnemies.as.
 *
 * `id` is the display name with spaces removed, which is also the enemy type
 * name in the level tables (levelData.ts `EnemyTypeName`), so one id keys both
 * the bestiary and a level's enemy composition.
 */

export interface BestiaryEntry {
  /** Matches EnemyTypeName in levelData.ts. */
  id: string;
  /** Name as shown on the enemies screen; three ids contain a space. */
  displayName: string;
  description: string;
}

/** 20 enemy types, in enemyButtonModelArray order. */
export const BESTIARY: readonly BestiaryEntry[] = [
  { id: "Basic", displayName: "Basic", description: "The most boring enemy in the game." },
  { id: "Fast", displayName: "Fast", description: "Faster than most enemies." },
  { id: "Shooting", displayName: "Shooting", description: "The first shooting enemy in the game." },
  { id: "Strong", displayName: "Strong", description: "Strong against explosions and bullets." },
  { id: "Shrinking", displayName: "Shrinking", description: "Shrinks when damaged." },
  { id: "Ghost", displayName: "Ghost", description: "Can't be damaged when invisible." },
  { id: "Trap", displayName: "Trap", description: "Lays traps once in a while." },
  { id: "Temperamental", displayName: "Temperamental", description: "Becomes very angry when damaged." },
  { id: "Ninja", displayName: "Ninja", description: "Moves fast and shoots rapidly." },
  { id: "Accelerating", displayName: "Accelerating", description: "Becomes faster over time. Damage slows it down." },
  { id: "Crazy", displayName: "Crazy", description: "Shoots bursts of bullets in all directions." },
  { id: "Medic", displayName: "Medic", description: "Heals other enemies." },
  { id: "ScaredGhost", displayName: "Scared Ghost", description: "Becomes invisible when damaged." },
  { id: "DamageAddict", displayName: "Damage Addict", description: "Dies automatically. Damage heals it." },
  { id: "Random", displayName: "Random", description: "Shoots in random directions." },
  { id: "Exploding", displayName: "Exploding", description: "Explodes when it dies." },
  { id: "Tiny", displayName: "Tiny", description: "A very small enemy." },
  { id: "GrapplingHook", displayName: "Grappling Hook", description: "Hooks onto you with its grappling hook." },
  { id: "Teleporting", displayName: "Teleporting", description: "Loves to teleport <3." },
  { id: "Soldier", displayName: "Soldier", description: "Shoots bullets which follow you." },
];

/** ScreenEnemies.as `knownEnemiesArray` initialiser — Basic is known up front. */
export const INITIAL_KNOWN_ENEMIES: readonly string[] = ["Basic"];

