/**
 * What is actually implemented, per enemy type.
 *
 * Exists because "ported" has meant several different things in this project.
 * All 20 types have stat tables, resistances and bestiary text; all 20 steer at
 * the tank. Rather less of their *characteristic* behaviour is ported than the
 * stat coverage suggests, and nothing in the code made that visible without
 * reading `PartGameArea.as`.
 *
 * ── Derived where possible, declared only where it must be ────────────────
 * Ranged support is **computed** from the shoot type and pattern this port can
 * actually build, so *that field* cannot drift: widen `SUPPORTED_SHOOT_TYPES`
 * or `SUPPORTED_SHOOT_ANGLES` in enemyFiring.ts and the answer here changes
 * with it. Only the special mechanics below are hand-declared, because there is
 * no mechanical way to ask "is teleporting implemented".
 *
 * **The board as a whole can still drift, and did.** This docstring used to say
 * so less carefully, and the gap was real: the guard that keeps
 * `SPECIAL_MECHANICS` honest surveys two AS3 idioms, `enemyType == "X"` and
 * `[object EnemyX]`, and a third exists — `instance.enemy == "X"`, the spawn
 * dispatch — where `Temperamental` and `Accelerating` set up state. A type
 * whose only distinguishing behaviour lived there would have been reported
 * `implemented`. `enemyBehaviour.test.ts` now closes that mechanically by
 * requiring every `implemented` type's spawn case to be constructor and stats
 * only. All nine currently pass, checked rather than assumed.
 *
 * Treat the branch survey as a **floor**, not a census: the AS3 also inlines
 * helper bodies, so any pattern-based sweep undercounts. See CLAUDE.md, "A
 * guarantee is only worth what enforces it".
 *
 * **Update `SPECIAL_MECHANICS` when you port one.** It is the one thing here
 * that can lie, and it has — in both directions. It has claimed mechanics were
 * missing that were finished, and mechanics existed that were never in the
 * game at all. The test now pins each entry to a branch in the AS3.
 */

import { ENEMY_STATS } from './enemyStatsData';
import type { EnemyBaseStats } from './enemyStatsData';
import { bulletClassFor, SUPPORTED_SHOOT_ANGLES } from './enemyFiring';

/**
 * The signature behaviour of each type, beyond moving and shooting.
 *
 * An entry here means **not ported**. Remove it when the behaviour lands.
 *
 * ── Every entry must name a real branch in PartGameArea.as ────────────────
 * Special behaviour in the AS3 is always a branch keyed on `enemyType == "X"`
 * or on the display class, `theEnemy == "[object EnemyX]"`. Exactly eleven
 * types have one. A type with no branch has no mechanic — its character comes
 * entirely from its stat row and its firing pattern.
 *
 * This list originally carried five entries that named no branch at all, four
 * of which described behaviour that does not exist anywhere in the source:
 *
 *   Crazy   "erratic steering"       — bestiary: "Shoots bursts of bullets in
 *                                      all directions". That is shootAngle
 *                                      Circle with bulletAmount 6, ported.
 *   Ninja   "invisible between       — every write to `.invisible` is inside
 *           attacks"                   the Ghost and ScaredGhost branches
 *                                      (:4821, :4843, :4850). Ninja is simply
 *                                      the fastest type: moveSpeedMax 3,
 *                                      reloadTimeMax 60.
 *   Random  "randomised movement"    — the randomness is in the *shot*: a
 *                                      Circle volley starts at random()*360
 *                                      (:7016), already ported.
 *   Tiny    "splits into smaller     — all 11 mentions of Tiny are spawn and
 *           copies"                    border-sound. It is just small.
 *   Soldier "fires homing rounds"    — real, but shootType "Following" is
 *                                      already unsupported, so the derived
 *                                      ranged check reports it. Duplicating a
 *                                      derived fact by hand can only drift.
 *
 * They were written from guesses at what the names suggested rather than from
 * the source, and they read as findings for months. `enemyBehaviour.test.ts`
 * now checks every key here against the branches actually present in
 * PartGameArea.as, so an invented mechanic fails the suite.
 */
export const SPECIAL_MECHANICS: Record<string, string> = {
  Ghost: 'passes through obstacles, periodically invisible',
  GrapplingHook: 'tethers the tank and reels it in',
  Medic: 'heals nearby enemies',
  ScaredGhost: 'flees the tank',
  // Porting this? Two AS3 sites are easy to miss because they are sound cues,
  // not movement: `:4946` (TeleportOut, as the enemy leaves) and `:4973`
  // (TeleportIn, as it returns). Both are gated on `checkWithinScreen(x, y, w,
  // h, 100)` — the on-screen rect widened by 100 units — so the cue plays only
  // when the blink is near enough to see. That rect is the AS3's fixed 640x400
  // stage at the live scroll; see docs/AUDIT-2026-07.md on camera constants
  // before reusing the port's live viewport for it.
  Teleporting: 'blinks across the arena',
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
