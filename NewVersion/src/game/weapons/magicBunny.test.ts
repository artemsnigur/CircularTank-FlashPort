/**
 * Magic Bunny — mechanically `BulletMagic`, numerically nothing like it.
 *
 * The chain-homing itself is covered in `magic.test.ts` and is reached without
 * a line of new mechanics code: `Bullet.ts:78` gives any spec with
 * `targets > 0` the whole path. What this file pins is the five ways the two
 * weapons differ, asserted side by side because the contrast *is* the design.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { MAGIC_BUNNY, SECONDARY_WEAPONS, resolveSecondaryStats } from './secondaries';
import type { SecondaryKind } from './secondaries';
import { MAGIC_CANNON, resolveWeaponStats } from './firing';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import { createMagicState, isHoming } from './magic';

const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

const ownedSecondary = (id: string, level: number) => {
  const state = createInitialUpgradeState();
  const secondary = [...state.secondary];
  secondary[findUpgradeById(id)!.index] = level;
  return { ...state, secondary };
};

const ownedPrimary = (id: string, level: number) => {
  const state = createInitialUpgradeState();
  const primary = [...state.primary];
  primary[findUpgradeById(id)!.index] = level;
  return { ...state, primary };
};

const bunny = (level: number) =>
  resolveSecondaryStats(MAGIC_BUNNY, ownedSecondary('MagicBunny', level))!;
const cannon = (level: number) =>
  resolveWeaponStats(MAGIC_CANNON, ownedPrimary('MagicCannon', level))!;

describe('the same mechanic, five different numbers', () => {
  it('waits thirty seconds where the cannon waits half a second', () => {
    // 900 frames at 30 fps. The longest cooldown in the game — Shield's 700
    // was the previous record.
    expect(bunny(1).reloadTimeMax).toBe(900);
    expect(cannon(1).reloadTimeMax).toBe(15);
  });

  it('hits for five to nine times as much', () => {
    expect(bunny(1).damage).toBe(16);
    expect(bunny(10).damage).toBe(30);
    expect(cannon(1).damage).toBe(2.2);
    expect(cannon(10).damage).toBe(3.5);
  });

  it('chains through more enemies', () => {
    expect(bunny(1).count).toBe(5);
    expect(bunny(10).count).toBe(6);
    expect(cannon(1).targets).toBe(3);
    expect(cannon(10).targets).toBe(4);
  });

  it('travels slower', () => {
    // `:4237` against `:3893`. Read from the scene because the spawn constants
    // live there.
    expect(SCENE).toContain('const CHAIN_SPEED = 10;');
    expect(MAGIC_CANNON.bulletSpeed).toBe(14);
  });

  it('leaves the barrel further out', () => {
    // `16 + width/2` against the cannon's `12 + width/2`. The Magic Cannon is
    // in the exclusion list at `:3913` and gets its own branch at `:3934`.
    expect(SCENE).toContain('const CHAIN_MUZZLE_OFFSET = 16;');
    expect(MAGIC_CANNON.muzzleOffset).toBe(12);
  });

  it('shares the radius, which is the one spawn number that matches', () => {
    expect(SCENE).toContain('const CHAIN_RADIUS = 8;');
    expect(MAGIC_CANNON.bulletRadius).toBe(8);
  });
});

describe('the cooldown never improves', () => {
  it('is 900 at every level', () => {
    for (let level = 1; level <= 10; level += 1) {
      expect(bunny(level).reloadTimeMax, `level ${level}`).toBe(900);
    }
  });

  it('unlike the cannon, which gets faster', () => {
    expect(cannon(10).reloadTimeMax).toBeLessThan(cannon(1).reloadTimeMax);
  });

  it('is null when unowned', () => {
    expect(resolveSecondaryStats(MAGIC_BUNNY, createInitialUpgradeState())).toBeNull();
  });
});

describe('the chain engages without new mechanics code', () => {
  it('sets targets from the count track, which is the whole mechanic', () => {
    expect(SCENE).toContain('targets: stats.count,');
  });

  it('a spec with targets gets chain state, per Bullet.ts:78', () => {
    const entity = readFileSync('src/game/entities/Bullet.ts', 'utf8');
    expect(entity).toContain('if ((spec.targets ?? 0) > 0) this.magic = createMagicState(spec.targets);');
  });

  it('and that state homes once it has hit something', () => {
    // `neverHitTarget` gates homing entirely, so a fresh round flies straight
    // and only chains after its first hit — same for both weapons.
    const state = createMagicState(bunny(1).count);
    expect(state.targetsLeft).toBe(5);
    expect(isHoming(state)).toBe(false);
    expect(isHoming({ ...state, neverHitTarget: false })).toBe(true);
  });

  it('the fire path reaches no subsystem it does not need', () => {
    const start = SCENE.indexOf('private fireChainRound()');
    const body = SCENE.slice(start, SCENE.indexOf('private fireSpikes()', start));

    expect(body).not.toContain('bounce');
    expect(body).not.toContain('ground');
    expect(body).not.toContain('closest');
    expect(body).not.toContain('findEnemies');
    // Chain target selection is the round's own, in `findMagicTarget` — not the
    // nearest-N pick Rockets will need.
    expect(body).not.toContain('findMagicTarget');
  });

  it('carries no payload it should not', () => {
    const start = SCENE.indexOf('private fireChainRound()');
    const body = SCENE.slice(start, SCENE.indexOf('private fireSpikes()', start));

    for (const zeroed of [
      'explosion: false',
      'penetrates: false',
      'bombTimer: 0',
      'freezeTime: 0',
      'poisonTime: 0',
      'cakePieces: 0',
    ]) {
      expect(body, zeroed).toContain(zeroed);
    }
  });
});

/**
 * The dispatch, replaced before it reached nine branches.
 */
describe('secondaries dispatch on a declared kind', () => {
  it('every registered secondary declares one', () => {
    for (const spec of Object.values(SECONDARY_WEAPONS)) {
      expect(spec.kind, spec.name).toBeTruthy();
    }
  });

  it('groups by shape, not one per weapon', () => {
    const kinds = Object.values(SECONDARY_WEAPONS).map((s) => s.kind);
    const unique = new Set<SecondaryKind>(kinds);

    // Ten weapons, seven shapes: three grenades share `thrown`, two spike
    // weapons share `fan`, and Ice Ball opened `trail` — which Lava Ball will
    // join, making it the third shared shape.
    expect(kinds).toHaveLength(10);
    expect(unique.size).toBe(7);
    expect(kinds.filter((k) => k === 'thrown')).toHaveLength(3);
    expect(kinds.filter((k) => k === 'fan')).toHaveLength(2);
  });

  it('Magic Bunny is a chain, not a fan, despite having a count', () => {
    // The exact ambiguity that made shape-sniffing wrong: the old dispatch read
    // `countTrack !== undefined` as "fan", which would have sent every Bunny
    // shot through the spike burst.
    expect(MAGIC_BUNNY.countTrack).toBeDefined();
    expect(MAGIC_BUNNY.kind).toBe('chain');
  });

  it('is a switch, so a sixth kind is a compile error not a silent path', () => {
    expect(SCENE).toContain('private useSecondary(kind: SecondaryKind): boolean {');
    expect(SCENE).toContain('switch (kind) {');
    for (const kind of ['shield', 'thrown', 'fan', 'chain', 'mine', 'volley']) {
      expect(SCENE, kind).toContain(`case '${kind}':`);
    }
  });

  it('the nested ternary is gone', () => {
    expect(SCENE).not.toContain("this.secondary?.countTrack !== undefined");
    expect(SCENE).not.toContain("this.secondary?.name === 'Shield'");
  });
});

/**
 * The gate and the achievement flags sit above the dispatch — `:3979-3986`.
 *
 * Moved there ahead of Rockets, which is the first secondary that can decline a
 * press *after* the gate has already counted it. A regression here would be
 * silent and would touch every secondary, so it is pinned per kind.
 */
describe('one cooldown gate, above the dispatch', () => {
  const method = (name: string, next: string): string => {
    const start = SCENE.indexOf(`private ${name}(`);
    expect(start, name).toBeGreaterThan(-1);
    return SCENE.slice(start, SCENE.indexOf(`private ${next}(`, start));
  };

  it('gates once, before the weapon runs', () => {
    expect(SCENE).toContain('if (this.secondaryFiring.reloadTime <= 0) {');
    const gate = SCENE.indexOf('this.secondaryFiring.reloadTime += this.secondaryStats.reloadTimeMax;');
    const dispatch = SCENE.indexOf('this.useSecondary(this.secondary.kind)');

    expect(gate).toBeGreaterThan(-1);
    expect(gate).toBeLessThan(dispatch);
  });

  it('sets the flags before the weapon can decline', () => {
    // The AS3 sets them at `:3984-3985`, above the dispatch, so a refused press
    // still burns `noWeaponsUsed`. Setting them on success would be a silent
    // divergence the moment a weapon declines.
    const flags = SCENE.indexOf('this.levelFlags.noWeaponsUsed = false;');
    const dispatch = SCENE.indexOf('this.useSecondary(this.secondary.kind)');

    expect(flags).toBeLessThan(dispatch);
  });

  it('refunds the cooldown when the weapon declines', () => {
    // `:4169` sets `reloadTimeSecondary = 0`, which is exactly a refund because
    // the gate guarantees it was zero before the `+=`.
    expect(SCENE).toContain('this.secondaryFiring.reloadTime = 0;');
  });

  it('plays the sound only when something actually spawned', () => {
    // `push("Rockets")` is inside `if (rocketCount > 0)`, unlike the flags.
    expect(SCENE).toContain('getSoundManager(this)?.queue(this.secondary.sound);');
  });

  it('no shipped kind holds its own gate any more', () => {
    // The regression that would be silent and wide: one weapon keeping a
    // private check would double-charge or block itself.
    const bodies: Array<[string, string]> = [
      ['raiseShield', 'throwGrenade'],
      ['throwGrenade', 'updateGrenades'],
      ['useSecondary', 'fireChainRound'],
      ['fireChainRound', 'fireSpikes'],
      ['fireSpikes', 'placeMine'],
      ['fireVolley', 'steerRockets'],
    ];

    for (const [name, next] of bodies) {
      expect(method(name, next), name).not.toContain('reloadTime');
    }
  });

  it('and neither does the mine helper it used to live in', () => {
    const source = readFileSync('src/game/weapons/secondaries.ts', 'utf8');
    const start = source.indexOf('export function placeMine(');
    expect(source.slice(start, source.indexOf('export function sweepMines(', start))).not.toContain(
      'reloadTime',
    );
  });
});
