/**
 * Death explosions — the Exploding family.
 */
import { describe, expect, it } from 'vitest';
import {
  deathExplosion,
  explodesOnDeath,
  EXPLODING_BLAST_DAMAGE,
  EXPLODING_BLAST_RADIUS,
  EXPLODING_BOSS_BLAST_DAMAGE,
  EXPLODING_BOSS_BLAST_RADIUS,
} from './enemyDeath';
import { blastDamage, createExplosion, findEnemiesInBlast } from '../weapons/explosions';
import { resolveDamageMultipliers } from './damageTypes';
import { resolveEnemyStats } from './enemyStats';
import { describeEnemy } from './enemyBehaviour';
import { TANK_MAX_HP } from '../player/tankDamage';

const at = (x: number, y: number, type = 'Exploding', level = '1') => ({
  x,
  y,
  enemyType: type,
  enemyLevel: level,
});

describe('who explodes', () => {
  it('only the Exploding family', () => {
    expect(explodesOnDeath(at(0, 0, 'Exploding'))).toBe(true);
    for (const other of ['Basic', 'Fast', 'Strong', 'Shooting', 'Crazy']) {
      expect(explodesOnDeath(at(0, 0, other)), other).toBe(false);
    }
  });

  it('gives non-exploders no blast at all', () => {
    expect(deathExplosion(at(0, 0, 'Basic'))).toBeNull();
  });
});

describe('the blast', () => {
  it('uses the hardcoded figures, not the stat tables', () => {
    // enemyExplodingStats has no blast columns; :6831 and :6835 are literals.
    const blast = deathExplosion(at(100, 200))!;
    expect(blast.radius).toBe(EXPLODING_BLAST_RADIUS);
    expect(blast.damage).toBe(EXPLODING_BLAST_DAMAGE);
    expect(blast).toMatchObject({ x: 100, y: 200, type: 'Normal', smallSound: false });
  });

  it('is far larger and deadlier for a boss', () => {
    const boss = deathExplosion(at(0, 0, 'Exploding', 'B'))!;
    expect(boss.radius).toBe(EXPLODING_BOSS_BLAST_RADIUS);
    expect(boss.damage).toBe(EXPLODING_BOSS_BLAST_DAMAGE);
    expect(boss.radius).toBeGreaterThan(EXPLODING_BLAST_RADIUS * 2);
    expect(boss.damage).toBe(EXPLODING_BLAST_DAMAGE * 40);
  });

  it('plays the big boom, not a bullet impact', () => {
    expect(deathExplosion(at(0, 0))!.smallSound).toBe(false);
  });

  it('lands where the enemy died', () => {
    const blast = deathExplosion(at(321, 654))!;
    expect([blast.x, blast.y]).toEqual([321, 654]);
  });
});

describe('the boss blast cannot one-shot the player', () => {
  it('200 damage exceeds tank health, but blasts only reach enemies', () => {
    // `:6445` — the explosion loop only ever touches theEnemy.hp. If blasts
    // ever gain a tank path, this figure has to be revisited.
    expect(EXPLODING_BOSS_BLAST_DAMAGE).toBeGreaterThan(TANK_MAX_HP);

    const blast = createExplosion(deathExplosion(at(0, 0, 'Exploding', 'B'))!);
    const tankAtGroundZero = [{ x: 0, y: 0, radius: 13 }];
    // The blast resolves against enemies; the tank is simply not a candidate.
    expect(findEnemiesInBlast(blast, tankAtGroundZero)).toEqual([0]);
  });
});

describe('what it actually kills', () => {
  const blast = createExplosion(deathExplosion(at(0, 0))!);

  it('softens neighbours rather than clearing them', () => {
    // 5 damage against a tier-1 Basic's 10 hp — two blasts, not one. The
    // normal Exploding enemy is a chip, not a clear; only the boss obliterates.
    expect(blastDamage(blast, resolveDamageMultipliers('Basic'))).toBe(5);
    expect(resolveEnemyStats('Basic', '1', 'Easy')!.health).toBe(10);
  });

  it('the boss blast does clear them', () => {
    const bossBlast = createExplosion(deathExplosion(at(0, 0, 'Exploding', 'B'))!);
    expect(blastDamage(bossBlast, resolveDamageMultipliers('Basic'))).toBe(200);
  });

  it('reaches anything inside its radius', () => {
    const ring = [
      { x: 50, y: 0, radius: 13 },
      { x: 0, y: 90, radius: 13 },
      { x: 200, y: 0, radius: 13 },
    ];
    expect(findEnemiesInBlast(blast, ring)).toEqual([0, 1]);
  });

  it('is halved by Strong, like every Explosions-channel source', () => {
    expect(blastDamage(blast, resolveDamageMultipliers('Strong'))).toBeCloseTo(
      blastDamage(blast, resolveDamageMultipliers('Basic')) / 2,
      10,
    );
  });
});

describe('chain reactions terminate', () => {
  it('a blast that kills another Exploding enemy yields another blast', () => {
    // The reason the scene defers these instead of spawning inline: doing it
    // from removeEnemy would recurse through the removal path.
    const first = deathExplosion(at(0, 0))!;
    const second = deathExplosion(at(first.x + 10, first.y))!;
    expect(second).not.toBeNull();
    expect(second.radius).toBe(first.radius);
  });
});

describe('the status board reflects it', () => {
  it('Exploding is no longer data-only', () => {
    const report = describeEnemy('Exploding');
    expect(report.missingMechanic).toBeNull();
    expect(report.status).toBe('implemented');
  });
});
