/**
 * Deaths that leave something behind — `PartGameArea.as:6825-6837`.
 *
 * Currently just the `Exploding` family, which detonates when it dies.
 *
 * ── The blast does not hurt the tank ──────────────────────────────────────
 * The explosion loop at `:6445` only ever touches `theEnemy.hp`. So
 * `ExplodingB`'s 200 damage is not a player one-shot — it is an anti-enemy
 * bomb, and the same is true of every other blast in the game. The port
 * matches: `spawnExplosion` resolves against `findEnemiesInBlast` alone.
 *
 * ── It fires on contact deaths too ────────────────────────────────────────
 * `:5301` sets `dead = true; noMoney = true` when an enemy reaches the tank,
 * and that flows into the *same* death block. So ramming an Exploding enemy
 * detonates it and clears whatever was around it — free damage, since a
 * contact death pays no money. Worth knowing before assuming the suicide path
 * is separate; it is not.
 *
 * ── Why the caller must defer these ───────────────────────────────────────
 * A death blast can kill another Exploding enemy. Spawning it inline from the
 * removal path would recurse — remove -> explode -> remove -> explode — and
 * would also re-enter the once-per-enemy guard in `removeEnemy`. Callers
 * collect these and flush them after the loop that produced them, the same
 * shape `updateStatusEffects` already uses for attached-bomb blasts.
 *
 * ── The figures are hardcoded, not from the stat tables ───────────────────
 * `enemyExplodingStats` carries no blast columns; `:6831` and `:6835` are
 * literals. That is why they live here rather than in the generated data.
 */

import type { ExplosionSpec } from '../weapons/explosions';

/** `[x, y, 100, 5, "Normal", 0, 0, false]` — `:6831`. */
export const EXPLODING_BLAST_RADIUS = 100;
export const EXPLODING_BLAST_DAMAGE = 5;

/** `[x, y, 250, 200, "Normal", 0, 0, false]` — `:6835`. */
export const EXPLODING_BOSS_BLAST_RADIUS = 250;
export const EXPLODING_BOSS_BLAST_DAMAGE = 200;

/** Enemy types that detonate on death, by their stat-table name. */
const EXPLODES_ON_DEATH = new Set(['Exploding']);

export interface DyingEnemy {
  x: number;
  y: number;
  enemyType: string;
  /** `"B"` for a boss; the AS3 keys off the `ExplodingB` type name. */
  enemyLevel: string;
}

export function explodesOnDeath(enemy: DyingEnemy): boolean {
  return EXPLODES_ON_DEATH.has(enemy.enemyType);
}

/**
 * The blast a dying enemy leaves, or null if it leaves none.
 *
 * `smallSound: false` — the AS3 passes `false` in the eighth slot, so this
 * plays the big boom rather than a bullet impact.
 */
export function deathExplosion(enemy: DyingEnemy): ExplosionSpec | null {
  if (!explodesOnDeath(enemy)) return null;

  const boss = enemy.enemyLevel === 'B';
  return {
    x: enemy.x,
    y: enemy.y,
    radius: boss ? EXPLODING_BOSS_BLAST_RADIUS : EXPLODING_BLAST_RADIUS,
    damage: boss ? EXPLODING_BOSS_BLAST_DAMAGE : EXPLODING_BLAST_DAMAGE,
    type: 'Normal',
    smallSound: false,
  };
}
