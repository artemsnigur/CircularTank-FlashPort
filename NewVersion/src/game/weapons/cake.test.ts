/**
 * Cake Cannon — a round that shatters into a ring of fragments, and whose
 * fragments can shatter again.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CAKE_EXTRA_PIECES,
  CAKE_PIECE_RADIUS,
  CAKE_PIECE_SIZE_DIVISOR,
  CAKE_PIECE_SPEED,
  CAKE_RING_START_DEGREES,
  spawnCakePieces,
} from './cake';
import {
  CAKE_CANNON,
  CANNON,
  createFiringState,
  fire,
  getWeapon,
  GUMMY_BEAR_CANNON,
  resolveWeaponStats,
} from './firing';
import { applyBulletDamage } from './bullets';
import { damageTypeOf, resolveDamageMultipliers } from '../enemies/damageTypes';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';

const context = { x: 320, y: 480, towerRotation: 0 };
const host = { x: 200, y: 300, radius: 13 };

function upgrades(level = 1) {
  const state = createInitialUpgradeState();
  state.primary[9] = level;
  return state;
}

describe('registration', () => {
  it('is exposed as a ported weapon', () => {
    expect(getWeapon('Cake Cannon')).toBe(CAKE_CANNON);
    expect(CAKE_CANNON.spawnsCakePieces).toBe(true);
  });

  it('runs on the Food channel, like the Gummy Bear Cannon', () => {
    expect(damageTypeOf(CAKE_CANNON.bulletClass!)).toBe('Food');
    expect(damageTypeOf('BulletCakePiece')).toBe('Food');
    expect(damageTypeOf(GUMMY_BEAR_CANNON.bulletClass!)).toBe('Food');
  });

  it('does not explode', () => {
    expect(CAKE_CANNON.explosion).toBe(false);
  });
});

describe('stats from the upgrade table', () => {
  it('reads level 1 correctly', () => {
    expect(resolveWeaponStats(CAKE_CANNON, upgrades())).toEqual({
      reloadTimeMax: 14,
      damage: 5,
      explosionRadius: 0,
      cakePieces: 6,
    });
  });

  it('reads level 10 correctly', () => {
    const stats = resolveWeaponStats(CAKE_CANNON, upgrades(10))!;
    expect(stats.damage).toBe(11);
    expect(stats.cakePieces).toBe(8);
  });

  it('maps its three tracks to the AS3 table', () => {
    const table = findUpgradeById('CakeCannon')!;
    expect(table.stats[CAKE_CANNON.reloadTrack][0]).toBe(14);
    expect(table.stats[CAKE_CANNON.damageTrack][0]).toBe(5);
    expect(table.stats[CAKE_CANNON.cakePiecesTrack!][0]).toBe(6);
  });

  it('goes from six fragments to eight', () => {
    const counts = findUpgradeById('CakeCannon')!.stats[CAKE_CANNON.cakePiecesTrack!];
    expect(counts[0]).toBe(6);
    expect(counts[counts.length - 1]).toBe(8);
  });

  it('carries the piece count onto the round it fires', () => {
    const stats = resolveWeaponStats(CAKE_CANNON, upgrades())!;
    const [bullet] = fire(createFiringState(), CAKE_CANNON, stats, context);
    expect(bullet.cakePieces).toBe(6);
  });

  it('leaves other weapons with no pieces', () => {
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    const [bullet] = fire(createFiringState(), CANNON, cannon, context);
    expect(bullet.cakePieces).toBe(0);
  });
});

describe('the ring', () => {
  const burst = (pieces = 6, damage = 5, isParent = true) =>
    spawnCakePieces({ pieces, damage, isParent }, host);

  it('produces one fragment per piece, plus the balance extra', () => {
    expect(burst(6)).toHaveLength(6 + CAKE_EXTRA_PIECES);
    expect(burst(8)).toHaveLength(8 + CAKE_EXTRA_PIECES);
  });

  it('starts pointing straight up', () => {
    expect(burst()[0].rotation).toBe(CAKE_RING_START_DEGREES);
    expect(CAKE_RING_START_DEGREES).toBe(-90);
  });

  it('spaces fragments evenly around a full circle', () => {
    // 7 fragments at level 1 (6 from the table + 1), so 360/7 apart.
    const rotations = burst(6).map((p) => p.rotation);
    expect(rotations).toHaveLength(7);
    for (let i = 1; i < rotations.length; i += 1) {
      expect(rotations[i] - rotations[i - 1]).toBeCloseTo(360 / 7, 10);
    }
    expect(rotations[0]).toBe(-90);
  });

  it('is deterministic — no random draw', () => {
    expect(burst().map((p) => p.rotation)).toEqual(burst().map((p) => p.rotation));
  });

  it('spawns fragments just outside the host, not at its centre', () => {
    // enemy.radius + 5, so they do not immediately re-test against it.
    for (const piece of burst()) {
      const distance = Math.hypot(piece.x - host.x, piece.y - host.y);
      expect(distance).toBeCloseTo(host.radius + CAKE_PIECE_RADIUS, 6);
    }
  });

  it('centres the ring on the enemy, not the tank', () => {
    const ring = burst();
    const centreX = ring.reduce((sum, p) => sum + p.x, 0) / ring.length;
    const centreY = ring.reduce((sum, p) => sum + p.y, 0) / ring.length;
    expect(centreX).toBeCloseTo(host.x, 6);
    expect(centreY).toBeCloseTo(host.y, 6);
  });

  it('fires fragments outward at the piece speed', () => {
    for (const piece of burst()) {
      expect(Math.hypot(piece.xVel, piece.yVel)).toBeCloseTo(CAKE_PIECE_SPEED, 6);
      // Velocity points away from the host.
      const outwardX = piece.x - host.x;
      const outwardY = piece.y - host.y;
      expect(piece.xVel * outwardX + piece.yVel * outwardY).toBeGreaterThan(0);
    }
  });

  it('handles a zero piece count without producing anything', () => {
    expect(spawnCakePieces({ pieces: 0, damage: 5, isParent: true }, host)).toHaveLength(0);
  });
});

describe('damage halves once, and only once', () => {
  it('halves the parent damage across the first split', () => {
    const pieces = spawnCakePieces({ pieces: 6, damage: 5, isParent: true }, host);
    for (const piece of pieces) expect(piece.damage).toBe(2.5);
  });

  it('passes a fragment damage on unchanged', () => {
    // `:6140` only halves for BulletCake; a piece gives `theBullet.damage`.
    const second = spawnCakePieces({ pieces: 6, damage: 2.5, isParent: false }, host);
    for (const piece of second) expect(piece.damage).toBe(2.5);
  });

  it('does not decay across a cascade', () => {
    const first = spawnCakePieces({ pieces: 6, damage: 5, isParent: true }, host);
    const second = spawnCakePieces(
      { pieces: first[0].cakePieces, damage: first[0].damage, isParent: false },
      host,
    );
    const third = spawnCakePieces(
      { pieces: second[0].cakePieces, damage: second[0].damage, isParent: false },
      host,
    );
    expect(second[0].damage).toBe(2.5);
    expect(third[0].damage).toBe(2.5);
  });

  it('gives fragments the table piece count, so the bonus does not compound', () => {
    const pieces = spawnCakePieces({ pieces: 8, damage: 11, isParent: true }, host);
    // 9 fragments produced, but each carries 8 — the +1 applies per burst.
    expect(pieces).toHaveLength(9);
    for (const piece of pieces) expect(piece.cakePieces).toBe(8);
  });

  it('keeps fragments small', () => {
    // Balance change: a third of the AS3's radius of 5.
    expect(CAKE_PIECE_SIZE_DIVISOR).toBe(3);
    expect(CAKE_PIECE_RADIUS).toBeCloseTo(5 / 3, 10);
    const [piece] = spawnCakePieces({ pieces: 6, damage: 5, isParent: true }, host);
    expect(piece.radius).toBeCloseTo(5 / 3, 10);
  });

  it('produces fragments that are otherwise inert', () => {
    const [piece] = spawnCakePieces({ pieces: 6, damage: 5, isParent: true }, host);
    expect(piece.explosion).toBe(false);
    expect(piece.penetrates).toBe(false);
    expect(piece.bombTimer).toBe(0);
    expect(piece.poisonTime).toBe(0);
  });
});

describe('what the burst is worth', () => {
  const stats = resolveWeaponStats(CAKE_CANNON, upgrades())!;

  it('delivers more total damage than the round itself, if every fragment lands', () => {
    // 5 on impact plus the ring, against a packed crowd.
    const pieces = spawnCakePieces(
      { pieces: stats.cakePieces!, damage: stats.damage, isParent: true },
      host,
    );
    // 7 fragments at 2.5 = 17.5, plus the 5 the round itself lands.
    const fragmentTotal = pieces.reduce((sum, p) => sum + p.damage, 0);
    expect(pieces).toHaveLength(7);
    expect(fragmentTotal).toBe(17.5);
    expect(stats.damage + fragmentTotal).toBe(22.5);
  });

  it('is resisted by Medic on the Food channel, fragments included', () => {
    const medic = resolveDamageMultipliers('Medic');
    expect(medic.Food).toBe(0.75);

    const [piece] = spawnCakePieces(
      { pieces: stats.cakePieces!, damage: stats.damage, isParent: true },
      host,
    );
    expect(applyBulletDamage(100, piece.damage, medic, 'Food').damageDealt).toBeCloseTo(
      1.875,
      10,
    );
  });

  it('is a poor single-target weapon — the ring mostly misses', () => {
    // Against one enemy only the 5 lands; the six fragments fly into empty
    // room. That is worse per shot than a Cannon shell at a slower cadence.
    const cannon = resolveWeaponStats(CANNON, createInitialUpgradeState())!;
    expect(stats.damage / stats.reloadTimeMax).toBeLessThan(
      cannon.damage / cannon.reloadTimeMax,
    );
  });
});

/**
 * ── The burst is gated on the kill, T216 ──────────────────────────────────
 *
 * `:6132`'s spawn block sits in the `else` of `:5981`, whose condition is the
 * enemy *surviving* — so a cake that only wounds does nothing but damage. The
 * port burst on every impact, and its comment claimed that was faithful.
 *
 * **This is a source scan and it proves the guard is written, not that it is
 * reached.** The rule lives in `GameplayScene`'s collision loop, which cannot
 * be instantiated, so nothing in this suite can drive it — that is exactly why
 * the bug survived. The behavioural check is `__arena.bullets.impacts` and
 * `.bursts`, driven in a browser; the counters are placed so `bursts` can only
 * rise after `hitEnemy` reports a kill.
 */
describe('the scene gates the burst on the kill', () => {
  const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

  it('returns from burstCake when the hit did not kill', () => {
    expect(SCENE).toContain('if (!this.hitEnemy(struck, bullet)) return;');
  });

  it('no longer bursts unconditionally', () => {
    // The exact line that was there before, asserted absent — restoring it is
    // the regression, and it would look like a tidy-up.
    expect(SCENE).not.toContain('    this.hitEnemy(struck, bullet);' + String.fromCharCode(10) + String.fromCharCode(10));
  });

  it('hitEnemy reports the kill, which is what the gate reads', () => {
    // The counterpart: the guard above is only meaningful if hitEnemy returns
    // something. A void hitEnemy would make the condition always truthy.
    expect(SCENE).toContain('private hitEnemy(enemy: Enemy, bullet: Bullet): boolean {');
  });
});
