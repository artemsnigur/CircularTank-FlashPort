/**
 * What is actually implemented, per enemy type.
 *
 * Exists because "ported" has meant several different things in this project.
 * All 20 types have stat tables, resistances and bestiary text; all 20 steer at
 * the tank. Almost none of their *characteristic* behaviour is ported, and
 * nothing in the code made that visible without reading `PartGameArea.as`.
 *
 * ── Derived where possible, declared only where it must be ────────────────
 * Ranged support is **computed** from the shoot type and pattern this port can
 * actually build, so it cannot drift: widen `SUPPORTED_SHOOT_TYPES` or
 * `SUPPORTED_SHOOT_ANGLES` in enemyFiring.ts and the answer here changes with
 * it. Only the special mechanics below are hand-declared, because there is no
 * mechanical way to ask "is teleporting implemented".
 *
 * **Update `SPECIAL_MECHANICS` when you port one.** It is the one thing here
 * that can lie.
 */

import { ENEMY_STATS } from './enemyStatsData';
import type { EnemyBaseStats } from './enemyStatsData';
import { bulletClassFor, SUPPORTED_SHOOT_ANGLES } from './enemyFiring';

/**
 * The signature behaviour of each type, beyond moving and shooting — named
 * from `PartGameArea.as` and the bestiary text.
 *
 * An entry here means **not ported**. Remove it when the behaviour lands.
 */
const SPECIAL_MECHANICS: Record<string, string> = {
  Accelerating: 'speeds up the longer it chases',
  Crazy: 'erratic steering',
  DamageAddict: 'healed by damage instead of hurt',
  Ghost: 'passes through obstacles, periodically invisible',
  GrapplingHook: 'tethers the tank and reels it in',
  Medic: 'heals nearby enemies',
  Ninja: 'goes invisible between attacks',
  Random: 'randomised movement',
  ScaredGhost: 'flees the tank',
  Shrinking: 'shrinks as it takes damage',
  Soldier: 'fires homing rounds',
  Teleporting: 'blinks across the arena',
  Temperamental: 'enrages when provoked',
  Tiny: 'splits into smaller copies',
  Trap: 'lays stationary hazards',
};

export type BehaviourStatus = 'implemented' | 'partial' | 'data-only';

export interface EnemyBehaviourReport {
  type: string;
  status: BehaviourStatus;
  /** Steering is ported for every type. */
  moves: boolean;
  /** Whether this type shoots at all, per its stat table. */
  shoots: boolean;
  /** True when its shoot type *and* pattern are both supported. */
  rangedImplemented: boolean;
  /** Unported signature mechanic, or null when it has none. */
  missingMechanic: string | null;
}

function normalStats(type: string): EnemyBaseStats | undefined {
  return (ENEMY_STATS as Record<string, { normal?: EnemyBaseStats }>)[type]?.normal;
}

/**
 * The three fields this needs, so both the raw table rows and the
 * difficulty-resolved stats satisfy it — `ResolvedEnemyStats` widens
 * `particle` to `string`, so demanding the full base type rejects it.
 */
export interface ShootDescriptor {
  shoot?: boolean;
  shootType?: string;
  shootAngle?: string;
}

/** Whether this port can build the volley this enemy is specified to fire. */
export function isRangedImplemented(stats: ShootDescriptor | undefined | null): boolean {
  if (!stats?.shoot) return false;
  if (!bulletClassFor(stats.shootType)) return false;
  return (SUPPORTED_SHOOT_ANGLES as readonly string[]).includes(stats.shootAngle ?? '');
}

/**
 * Status for one type.
 *
 * `implemented` means everything that distinguishes this enemy is in: it
 * moves, its ranged behaviour works if it has any, and it has no unported
 * signature mechanic. `partial` means the ranged half works but a mechanic is
 * still missing — or it is a pure melee type whose mechanic is missing.
 */
export function describeEnemy(type: string): EnemyBehaviourReport {
  const stats = normalStats(type);
  const shoots = stats?.shoot === true;
  const rangedImplemented = isRangedImplemented(stats);
  const missingMechanic = SPECIAL_MECHANICS[type] ?? null;

  let status: BehaviourStatus;
  if (!missingMechanic && (!shoots || rangedImplemented)) status = 'implemented';
  else if (rangedImplemented) status = 'partial';
  else status = 'data-only';

  return {
    type,
    status,
    moves: true,
    shoots,
    rangedImplemented,
    missingMechanic,
  };
}

/** Every type, alphabetically. */
export function describeAllEnemies(): EnemyBehaviourReport[] {
  return Object.keys(ENEMY_STATS)
    .sort()
    .map((type) => describeEnemy(type));
}

export interface BehaviourTotals {
  implemented: number;
  partial: number;
  dataOnly: number;
  total: number;
}

export function behaviourTotals(reports: EnemyBehaviourReport[]): BehaviourTotals {
  return {
    implemented: reports.filter((r) => r.status === 'implemented').length,
    partial: reports.filter((r) => r.status === 'partial').length,
    dataOnly: reports.filter((r) => r.status === 'data-only').length,
    total: reports.length,
  };
}
