/**
 * Runtime stat modifiers — enemies whose speed changes during a level.
 *
 * Separate from the stat tables because these are *mutations over time*, not
 * resolved values: the table says what an enemy starts at, this says what it
 * becomes. `Temperamental`'s rage and `DamageAddict`'s decay will live here too.
 */

import { ENEMY_STATS } from './enemyStatsData';

/** Frames of undamaged travel to reach full speed — `PartGameArea.as:3076`. */
export const ACCELERATING_TIMER_MAX = 225;
/** The boss takes twice as long — `:3083`. */
export const ACCELERATING_BOSS_TIMER_MAX = 450;

export interface AcceleratingState {
  /** Counts down to zero; zero means fully wound up. */
  speedTimer: number;
  speedTimerMax: number;
}

export function createAcceleratingState(isBoss: boolean): AcceleratingState {
  const speedTimerMax = isBoss ? ACCELERATING_BOSS_TIMER_MAX : ACCELERATING_TIMER_MAX;
  // Starts *at* the maximum, so factor is 0 and the enemy enters at base speed.
  return { speedTimer: speedTimerMax, speedTimerMax };
}

/**
 * Advances the ramp one step.
 *
 * `healthChanged` is deliberately "changed", not "damaged" — `:6695` compares
 * `hp != beforeHP`, so **being healed resets the ramp too**. A Medic topping up
 * an Accelerating enemy therefore keeps it slow, which is why the shared
 * observer on `Enemy` records any change rather than only a drop.
 *
 * Freezing resets it outright (`:6714`), so thawing starts the wind-up again
 * from base speed rather than resuming.
 */
export function tickAccelerating(
  state: AcceleratingState,
  frames: number,
  healthChanged: boolean,
  frozen: boolean,
): AcceleratingState {
  if (frozen || healthChanged) return { ...state, speedTimer: state.speedTimerMax };
  return { ...state, speedTimer: Math.max(0, state.speedTimer - frames) };
}

/** 0 when freshly damaged, 1 when fully wound up — `:6705`. */
export function acceleratingFactor(state: AcceleratingState): number {
  if (state.speedTimerMax <= 0) return 1;
  return 1 - state.speedTimer / state.speedTimerMax;
}

export interface RampedSpeeds {
  moveSpeedMax: number;
  /** Absent in Tower, which owns these through its own ramp. */
  accSpeed?: number;
  rotSpeedMax?: number;
}

/**
 * The speeds an Accelerating enemy has at a given wind-up.
 *
 * ── Two faithful reproductions of original mistakes ───────────────────────
 * Both are deliberate. Neither is a porting error, and neither should be
 * "fixed" without deciding to diverge on purpose.
 *
 * **1. It reads Temperamental's stat row, not its own.** `:6706-6710` say
 * `ScreenGame.enemyTemperamentalStats[3..5]` inside the *Accelerating* branch.
 * Today this changes nothing, because the two rows carry identical movement
 * columns — Temperamental `[6,20,100,1,0.2,2]`, Accelerating `[6,20,120,1,0.2,2]`
 * — so only money and particle differ. `enemyStatMods.test.ts` asserts that
 * equality, so if a re-extraction ever separates them this stops being
 * invisible instead of silently changing how the enemy plays.
 *
 * It also uses the **non-boss** row for bosses: `:6706` has no boss branch,
 * unlike Temperamental's rage a few lines below which picks
 * `enemyTemperamentalBStats` explicitly. Also a no-op today — the boss rows
 * carry the same 1/0.2/2 — and reproduced for the same reason.
 *
 * **2. It reads the raw table, not the difficulty-resolved stats.** Difficulty
 * scales speed by x1.0/1.1/1.2 at spawn, and this overwrites that from frame
 * one. So on Medium an Accelerating enemy spawns at 1.1 and is immediately
 * pulled back to 1.0, and its ceiling is 4.0 rather than 4.4. Unlike the first
 * quirk this **is** observable, and it is still reproduced as-is.
 */
export function acceleratingSpeeds(factor: number, isTower: boolean): RampedSpeeds {
  // The Temperamental row, on purpose — see above.
  const base = ENEMY_STATS.Temperamental.normal;

  const moveSpeedMax = base.moveSpeedMax + factor * base.moveSpeedMax * 3;
  if (isTower) return { moveSpeedMax };

  return {
    moveSpeedMax,
    accSpeed: base.accSpeed + factor * base.accSpeed * 2,
    rotSpeedMax: base.rotSpeedMax + factor * base.rotSpeedMax,
  };
}

/** Enemy types whose speed winds up while they go undamaged. */
const ACCELERATES = new Set(['Accelerating']);

export function acceleratesWhileUndamaged(enemyType: string): boolean {
  return ACCELERATES.has(enemyType);
}

/* ── Temperamental ───────────────────────────────────────────────────────── */

/** Frames of calm after the last hit — `PartGameArea.as:3053`. */
export const RAGE_TIMER_MAX = 225;

export interface RageState {
  angry: boolean;
  /** Counts down to zero; reaching zero calms it. */
  angryTimer: number;
  angryTimerMax: number;
  /**
   * Whether this enemy has ever raged.
   *
   * Until it has, it keeps the difficulty-resolved speeds it spawned with: the
   * AS3's calm branch is guarded by `&& Boolean(theEnemy.angry)` (`:6670`), so
   * nothing overwrites them before the first hit. Afterwards every write comes
   * from the raw table, which is what makes the multiplier loss permanent
   * rather than momentary.
   */
  hasRaged: boolean;
}

export function createRageState(): RageState {
  return { angry: false, angryTimer: 0, angryTimerMax: RAGE_TIMER_MAX, hasRaged: false };
}

/**
 * Advances the rage timer — `PartGameArea.as:6636-6691`.
 *
 * ── Renewed damage resets, it does not extend ─────────────────────────────
 * `angryTimer = angryTimerMax` runs unconditionally on a hit, while the stat
 * boosts sit behind `if (!angry)` and so are applied once. Hitting an
 * already-angry enemy refreshes its clock without stacking anything.
 *
 * ── Freezing pauses; it does not reset ────────────────────────────────────
 * The AS3's `if (!frozen)` wraps both the decrement and the rage trigger, so a
 * frozen enemy holds its rage and cannot be newly angered. **This is the
 * opposite of `Accelerating`, whose ramp freezing resets outright** — the two
 * are adjacent in the source, use the same 225, and are easy to conflate.
 * `enemyStatMods.test.ts` asserts them side by side for that reason.
 *
 * The calm check sits *outside* that guard in the original, so an enemy whose
 * timer already reached zero still calms while frozen.
 *
 * `turnPeaceful` is not ported. It is read at `:6670` and assigned `false` at
 * `:6672`, and nothing anywhere assigns it `true` — only the timer can calm an
 * enemy. Porting it would add a branch that can never be taken.
 */
export function tickRage(
  state: RageState,
  frames: number,
  tookDamage: boolean,
  frozen: boolean,
): RageState {
  let { angry, angryTimer, hasRaged } = state;

  if (!frozen) {
    if (angryTimer > 0) angryTimer = Math.max(0, angryTimer - frames);
    if (tookDamage) {
      angry = true;
      hasRaged = true;
      angryTimer = state.angryTimerMax;
    }
  }

  // Outside the frozen guard, as in the original.
  if (angry && angryTimer === 0) angry = false;

  return { ...state, angry, angryTimer, hasRaged };
}

/**
 * The speeds a Temperamental enemy has, angry or calm — `:6651-6688`.
 *
 * ── Read from the raw table, and that is load-bearing ─────────────────────
 * Both the rage and the calm read `ScreenGame.enemyTemperamental[B]Stats`
 * directly rather than the difficulty-resolved values, so **raging once
 * permanently strips the difficulty multiplier**. On Medium an enemy spawns at
 * 1.1, rages to 4.0, then calms to 1.0 — not back to 1.1 — and stays slower
 * than one that was never hit, for the rest of the level.
 *
 * That is worse than `Accelerating`'s version of the same quirk, which only
 * lowers a ceiling, and it looks exactly like an oversight. It is reproduced
 * deliberately. Do not "fix" it without deciding to diverge on purpose.
 *
 * ── The boss branch has no Tower guard ────────────────────────────────────
 * The non-boss branch guards `accSpeed` and `rotSpeedMax` with
 * `levelMode != "Tower"`, because Tower owns those through its own ramp. The
 * boss branch at `:6660-6665` does not, and writes them in every mode. That
 * asymmetry is in the original and is reproduced as-is.
 *
 * Boss multipliers also differ from the non-boss ones: x3/x2/**x1**, so a boss
 * gains no turn rate at all from raging.
 */
export function rageSpeeds(angry: boolean, isBoss: boolean, isTower: boolean): RampedSpeeds {
  const base = isBoss ? ENEMY_STATS.Temperamental.boss : ENEMY_STATS.Temperamental.normal;

  if (isBoss) {
    // No Tower guard here, deliberately — see above.
    return {
      moveSpeedMax: angry ? base.moveSpeedMax * 3 : base.moveSpeedMax,
      accSpeed: angry ? base.accSpeed * 2 : base.accSpeed,
      rotSpeedMax: angry ? base.rotSpeedMax * 1 : base.rotSpeedMax,
    };
  }

  const moveSpeedMax = angry ? base.moveSpeedMax * 4 : base.moveSpeedMax;
  if (isTower) return { moveSpeedMax };

  return {
    moveSpeedMax,
    accSpeed: angry ? base.accSpeed * 2 : base.accSpeed,
    rotSpeedMax: angry ? base.rotSpeedMax * 3 : base.rotSpeedMax,
  };
}

/** Enemy types that rage when damaged. */
const RAGES = new Set(['Temperamental']);

export function ragesWhenDamaged(enemyType: string): boolean {
  return RAGES.has(enemyType);
}

/* ── DamageAddict ────────────────────────────────────────────────────────── */

/** Health lost per frame at Easy, tier 1 — `PartGameArea.as:4875`. */
export const DECAY_BASE = 0.045;
/** A boss decays at a flat rate, ignoring difficulty and tier — `:4877`. */
export const BOSS_DECAY = 0.1;

/** Health below which it starts slowing — `:4890` (boss: `:4908`). */
export const DECAY_SLOW_THRESHOLD = 3;
export const BOSS_DECAY_SLOW_THRESHOLD = 30;
/** The speed it slows *to*, not zero — both branches lerp to this. */
export const DECAY_SPEED_FLOOR = 0.2;

/**
 * Health lost per frame — `:4856-4878`.
 *
 * ── Why the multipliers are dampened ──────────────────────────────────────
 * The AS3 does not reuse the health multipliers directly. It takes 90% of the
 * difficulty excess and 50% of the tier excess:
 *
 *     hpDifficultyMultiplier = (multiplierHealth - 1) * 0.9 + 1
 *     hpLevelMultiplier      = (multiplierLevel  - 1) * 0.5 + 1
 *
 * That looks arbitrary until the lifetimes are computed. Health scales with
 * difficulty and tier, so scaling the bleed alongside keeps the enemy alive for
 * roughly the same wall-clock time everywhere — 18.5s at Easy tier 1, 22.2s at
 * Hard tier 3 — with the dampening buying a little extra at the top end. It is
 * a lifetime constant expressed as a rate, not a rate that happens to vary.
 */
export function decayPerFrame(
  healthMultiplier: number,
  tierMultiplier: number,
  isBoss: boolean,
): number {
  if (isBoss) return BOSS_DECAY;

  const difficultyPart = (healthMultiplier - 1) * 0.9 + 1;
  const tierPart = (tierMultiplier - 1) * 0.5 + 1;
  return DECAY_BASE * difficultyPart * tierPart;
}

/**
 * Speeds for a decaying enemy — `:4888-4918`.
 *
 * Above the threshold both are the base values; below it they lerp down to
 * `DECAY_SPEED_FLOOR`, so a nearly-dead one crawls rather than stopping. With
 * the real numbers move speed runs 1.5 -> 0.2 while acceleration only moves
 * 0.25 -> 0.2, so the visible effect is almost entirely top speed.
 *
 * ── Raw table again, and this is the strongest form of that quirk ─────────
 * These write `enemyDamageAddictStats[3..4]` **every frame from spawn**, so the
 * difficulty speed multiplier is discarded immediately. `Temperamental` only
 * loses it after its first rage and `Accelerating` merely tops out lower; this
 * one never has it at all. Reproduced as-is, like the other two.
 *
 * ── The boss branch has no Tower guard ────────────────────────────────────
 * `:4895` guards `accSpeed` with `levelMode != "Tower"`; the boss branch at
 * `:4912` does not, and writes it in every mode. The same asymmetry as
 * Temperamental's boss branch, and reproduced the same way.
 */
export function decayedSpeeds(health: number, isBoss: boolean, isTower: boolean): RampedSpeeds {
  const base = isBoss ? ENEMY_STATS.DamageAddict.boss : ENEMY_STATS.DamageAddict.normal;
  const threshold = isBoss ? BOSS_DECAY_SLOW_THRESHOLD : DECAY_SLOW_THRESHOLD;

  const lerp = (from: number): number =>
    health < threshold
      ? (from - DECAY_SPEED_FLOOR) * (Math.max(health, 0) / threshold) + DECAY_SPEED_FLOOR
      : from;

  const moveSpeedMax = lerp(base.moveSpeedMax);

  // No Tower guard on the boss branch, deliberately — see above.
  if (isBoss) return { moveSpeedMax, accSpeed: lerp(base.accSpeed) };
  if (isTower) return { moveSpeedMax };
  return { moveSpeedMax, accSpeed: lerp(base.accSpeed) };
}

/** Enemy types that bleed to death on their own. */
const DECAYS = new Set(['DamageAddict']);

export function decaysOverTime(enemyType: string): boolean {
  return DECAYS.has(enemyType);
}

/** Types that take no damage at all — `:5583` and every other damage site. */
const IMMUNE = new Set(['DamageAddict']);

/**
 * Whether damage does nothing to this type.
 *
 * The AS3 guards each damage site individually with
 * `enemyType != "DamageAddict"`. The port keeps the check in one place instead,
 * in `Enemy.setHealth`, so a damage source added later inherits it rather than
 * having to remember. The enemy's own decay bypasses that guard through a
 * private path — otherwise immunity would stop it dying.
 */
export function isImmuneToDamage(enemyType: string): boolean {
  return IMMUNE.has(enemyType);
}
