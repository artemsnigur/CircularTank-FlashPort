/**
 * The Shield's seam.
 *
 * The model is pure and covered in `shield.test.ts`. This covers what only
 * exists once it is wired: the doubled reach on a real hit test, the reflect
 * branch's guards, and the contact rules finally receiving the flag they have
 * accepted since they were written.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { hitsTank } from '../enemies/enemyFiring';
import type { EnemyBulletState } from '../enemies/enemyFiring';
import {
  bulletReflectChance,
  createShieldState,
  raiseShield,
  reflectBullet,
  shieldRadiusMultiplier,
} from './shield';
import { contactDamage, isTouchingTank, TANK_MAX_HP } from '../player/tankDamage';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';

const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

const bullet = (over: Partial<EnemyBulletState> = {}): EnemyBulletState => ({
  x: 0,
  y: 0,
  xVel: 0,
  yVel: 0,
  rotation: 0,
  radius: 4,
  damage: 5,
  lifeTime: 60,
  lifeTimeMax: 60,
  ...over,
});

const TANK = { x: 0, y: 0, radius: 14 };

describe('the doubled reach on a real hit test', () => {
  it('catches a bullet the bare hull would miss', () => {
    // 25 out: past 14 + 4 = 18, inside 28 + 4 = 32.
    const incoming = bullet({ x: 25 });

    expect(hitsTank(incoming, TANK)).toBe(false);
    expect(hitsTank(incoming, TANK, 2)).toBe(true);
  });

  it('defaults to 1, so every existing caller is unchanged', () => {
    const incoming = bullet({ x: 17 });
    expect(hitsTank(incoming, TANK)).toBe(hitsTank(incoming, TANK, 1));
  });

  it('takes the multiplier from the shield state', () => {
    expect(shieldRadiusMultiplier(raiseShield(100))).toBe(2);
    expect(shieldRadiusMultiplier(createShieldState())).toBe(1);
  });

  it('scales the tank radius only, never the bullet', () => {
    // 28 + 4 = 32, not (14 + 4) * 2 = 36.
    expect(hitsTank(bullet({ x: 32 }), TANK, 2)).toBe(true);
    expect(hitsTank(bullet({ x: 33 }), TANK, 2)).toBe(false);
  });
});

describe('a reflected bullet cannot hit the tank again', () => {
  it('is excluded by the loop guard, not by moving away', () => {
    // It leaves along the line it arrived on, so for a frame or two it is still
    // inside the reach. `reflected` is what stops the second hit.
    const turned = reflectBullet(bullet({ x: 20 }), TANK);

    expect(turned.reflected).toBe(true);
    expect(hitsTank(turned, TANK, 2)).toBe(true);

    // Source-shape check: this proves the guard is *written*, never that it is
    // reached. It broke when T35 added `!levelDone &&` to the same condition —
    // a correct change that this could only report as a failure, which is the
    // known cost of pinning a spelling. Matched on the two operands that carry
    // the rule instead of on the whole line, so an unrelated condition joining
    // the `&&` chain no longer trips it while a dropped `reflected` still does.
    const guard = SCENE.slice(SCENE.indexOf('const reach = isReflectable('));
    expect(guard).toContain('!next.reflected');
    expect(guard).toContain('hitsTank(next, tank, reach)');
  });

  it('survives the frame rather than being destroyed', () => {
    // Destroying it would lose the visual the reflect exists for.
    const loop = SCENE.slice(SCENE.indexOf('const reach = isReflectable('));
    expect(loop.slice(0, loop.indexOf('this.hp = applyBulletToTank'))).toContain(
      'surviving.push(entry);',
    );
  });

  it('damages no enemy — there is no such branch to reach', () => {
    // The AS3's enemy-bullet loop has no enemy-collision test at all, so a
    // reflected round is a removal with a visual, not damage return.
    const loop = SCENE.slice(
      SCENE.indexOf('const reach = isReflectable('),
      SCENE.indexOf('this.enemyBullets = surviving;'),
    );
    expect(loop).not.toContain('hitsEnemy');
    expect(loop).not.toContain('this.hitEnemy(');
  });
});

describe('the Trap exemption', () => {
  it('gets no doubled reach and no turn-away', () => {
    // Two separate consequences of one exemption, and the scene applies both
    // from the same `isReflectable` call.
    expect(SCENE).toContain(
      'const reach = isReflectable(entry.bulletClass) ? shieldRadiusMultiplier(this.shield) : 1;',
    );
    expect(SCENE).toContain('isReflectable(entry.bulletClass) &&');
  });

  it('is tagged at the spawn site from the shoot type', () => {
    expect(SCENE).toContain("bulletClass: isTrap ? 'EnemyBulletTrap' : 'EnemyBulletBasic',");
  });
});

describe('the BulletReflect reader', () => {
  it('is zero when the upgrade is unowned', () => {
    expect(bulletReflectChance(createInitialUpgradeState())).toBe(0);
  });

  it('runs 0.1 to 0.325 across the ten levels', () => {
    const spec = findUpgradeById('BulletReflect')!;
    const at = (level: number) => {
      const state = createInitialUpgradeState();
      const misc = [...state.misc];
      misc[spec.index] = level;
      return bulletReflectChance({ ...state, misc });
    };

    expect(at(1)).toBeCloseTo(0.1, 10);
    expect(at(10)).toBeCloseTo(0.325, 10);
  });

  it('is the reader whose absence withheld the upgrade', () => {
    // `purchasable.ts` shelved BulletReflect as "bullet reflection is
    // unported". This function is the port.
    expect(SCENE).toContain('reflectChance(this.shield.on, bulletReflectChance(this.upgrades))');
  });
});

describe('contact damage finally receives the flag', () => {
  const base = {
    enemyDamage: 20,
    upgrades: createInitialUpgradeState(),
    pushed: false,
  };

  it('is zeroed while the shield is up', () => {
    expect(contactDamage(base)).toBeGreaterThan(0);
    expect(contactDamage({ ...base, shieldOn: true })).toBe(0);
  });

  it('stops a non-boss connecting at all', () => {
    // `:5273` — with the shield up the whole block is skipped for a non-boss.
    const touching = {
      tankX: 0,
      tankY: 0,
      tankRadius: 14,
      enemyX: 20,
      enemyY: 0,
      enemyRadius: 10,
      isBoss: false,
    };

    expect(isTouchingTank(touching)).toBe(true);
    expect(isTouchingTank({ ...touching, shieldOn: true })).toBe(false);
  });

  it('still lets a boss connect, at the doubled radius', () => {
    const far = {
      tankX: 0,
      tankY: 0,
      tankRadius: 14,
      enemyX: 36,
      enemyY: 0,
      enemyRadius: 10,
      isBoss: true,
    };

    // 14 + 10 = 24 apart is a miss; 28 + 10 = 38 is a hit.
    expect(isTouchingTank(far)).toBe(false);
    expect(isTouchingTank({ ...far, shieldOn: true })).toBe(true);
    // And it still does no damage.
    expect(contactDamage({ ...base, shieldOn: true })).toBe(0);
  });

  it('the scene passes it to both halves', () => {
    // Two call sites, and passing it to only one would make a boss hit for full
    // damage at double range — worse than not having the shield.
    const block = SCENE.slice(SCENE.indexOf('const participants = {'));
    expect(block.slice(0, block.indexOf('if (result.damage > 0)'))).toContain(
      'shieldOn: this.shield.on,',
    );
    expect(
      (block.slice(0, block.indexOf('if (result.damage > 0)')).match(/shieldOn: this\.shield\.on/g) ?? [])
        .length,
    ).toBe(2);
  });

  it('swaps the collision sound while up', () => {
    expect(SCENE).toContain("getSoundManager(this)?.queue('TankShieldCollision')");
    expect(TANK_MAX_HP).toBe(100);
  });
});

describe('the window is scene state, reset per level', () => {
  it('starts down and is cleared on a new level', () => {
    // `:2783-2787` — the shield does not survive a level.
    expect(SCENE).toContain('this.shield = createShieldState();');
    expect(SCENE).toContain('this.shieldSprite = null;');
  });

  it('ticks whether or not the trigger is held', () => {
    expect(SCENE).toContain('this.shield = tickShield(this.shield, (deltaMs / 1000) * 30);');
  });

  it('shares the secondary cooldown rather than inventing a gate', () => {
    // The gate moved above the dispatch when Rockets needed a weapon that can
    // decline after being counted, so Shield no longer holds one — which is the
    // point: there is exactly one gate and every secondary passes through it.
    const start = SCENE.indexOf('private raiseShield()');
    const raise = SCENE.slice(start, SCENE.indexOf('private throwGrenade()', start));
    expect(raise).not.toContain('reloadTime');

    expect(SCENE).toContain('if (this.secondaryFiring.reloadTime <= 0) {');
    expect(SCENE).toContain(
      'this.secondaryFiring.reloadTime += this.secondaryStats.reloadTimeMax;',
    );
  });

  it('the sprite fades with the window', () => {
    // The `* 0.45` this used to pin was dropped in T117: `shieldAlpha` already
    // *is* `PartGameArea.as:1015`'s `timer / 120 * 0.9 + 0.1`, and the extra
    // factor had no AS3 basis — it was damping a solid cyan disc that the real
    // `TankShield` art replaced. Matched on the call rather than the exact
    // expression, since what this test is about is that the sprite fades with
    // the window at all.
    expect(SCENE).toMatch(/\.setAlpha\(shieldAlpha\(this\.shield\)\)/);
  });
});
