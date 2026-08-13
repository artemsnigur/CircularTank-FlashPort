import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  absorptionMultiplier,
  BOSS_PUSH_SPEED,
  contactDamage,
  isTouchingTank,
  PUSHED_DAMAGE_DIVISOR,
  PUSHED_TIMER_MAX,
  resolveContact,
  TANK_MAX_HP,
  TANK_RADIUS,
} from './tankDamage';
import type { ContactParticipants } from './tankDamage';
import { createInitialUpgradeState, findUpgradeById } from '../upgrades/upgradeState';
import { resolveEnemyStats } from '../enemies/enemyStats';

const upgrades = () => createInitialUpgradeState();

const participants = (overrides: Partial<ContactParticipants> = {}): ContactParticipants => ({
  tankX: 100,
  tankY: 100,
  tankRadius: TANK_RADIUS,
  enemyX: 110,
  enemyY: 100,
  enemyRadius: 13,
  isBoss: false,
  ...overrides,
});

describe('constants', () => {
  it('matches the AS3 values', () => {
    expect(TANK_MAX_HP).toBe(100);
    expect(TANK_RADIUS).toBe(14);
    expect(PUSHED_TIMER_MAX).toBe(20);
    expect(BOSS_PUSH_SPEED).toBe(8);
    expect(PUSHED_DAMAGE_DIVISOR).toBe(4);
  });
});

describe('isTouchingTank', () => {
  it('detects an overlap', () => {
    expect(isTouchingTank(participants())).toBe(true);
  });

  it('misses when apart', () => {
    expect(isTouchingTank(participants({ enemyX: 200 }))).toBe(false);
  });

  it('uses the sum of the radii', () => {
    // 14 + 13 = 27, so 26 away touches and 28 does not.
    expect(isTouchingTank(participants({ enemyX: 126 }))).toBe(true);
    expect(isTouchingTank(participants({ enemyX: 128 }))).toBe(false);
  });

  it('blocks non-bosses entirely while the shield is up', () => {
    expect(isTouchingTank(participants({ shieldOn: true }))).toBe(false);
  });

  it('lets a boss through the shield at double the tank radius', () => {
    const boss = participants({ isBoss: true, shieldOn: true, enemyX: 140 });
    // 13 + 14*2 = 41, so 40 away still connects.
    expect(isTouchingTank(boss)).toBe(true);
    expect(isTouchingTank({ ...boss, enemyX: 150 })).toBe(false);
  });
});

describe('absorptionMultiplier', () => {
  it('is 1 without the Enemy Absorption upgrade', () => {
    expect(absorptionMultiplier(upgrades())).toBe(1);
  });

  it('reduces damage as the upgrade levels', () => {
    const absorb = findUpgradeById('EnemyAbsorb')!;
    const state = upgrades();

    state.misc[2] = 1;
    expect(absorptionMultiplier(state)).toBeCloseTo(1 - absorb.stats[0][0], 10);

    state.misc[2] = 10;
    expect(absorptionMultiplier(state)).toBeCloseTo(1 - absorb.stats[0][9], 10);
  });

  it('halves damage at max level', () => {
    const state = upgrades();
    state.misc[2] = 10;
    // The top entry is 0.5, so half the damage is absorbed.
    expect(absorptionMultiplier(state)).toBeCloseTo(0.5, 10);
  });
});

describe('contactDamage', () => {
  it('is the enemy damage at baseline', () => {
    expect(contactDamage({ enemyDamage: 5, upgrades: upgrades(), pushed: false })).toBe(5);
  });

  it('is quartered while pushed', () => {
    expect(contactDamage({ enemyDamage: 20, upgrades: upgrades(), pushed: true })).toBe(5);
  });

  it('is zero while the shield is up', () => {
    expect(
      contactDamage({ enemyDamage: 20, upgrades: upgrades(), pushed: false, shieldOn: true }),
    ).toBe(0);
  });

  it('stacks the push window with absorption', () => {
    const state = upgrades();
    state.misc[2] = 10; // 50% absorption
    expect(contactDamage({ enemyDamage: 40, upgrades: state, pushed: true })).toBe(5);
  });

  it('rounds, as the AS3 does', () => {
    const state = upgrades();
    state.misc[2] = 1; // 10% absorption
    expect(contactDamage({ enemyDamage: 5, upgrades: state, pushed: false })).toBe(5); // 4.5 -> 5
  });
});

describe('resolveContact — non-boss', () => {
  it('kills the enemy and pays nothing', () => {
    const result = resolveContact(
      participants(),
      { enemyDamage: 5, upgrades: upgrades(), pushed: false },
      TANK_MAX_HP,
    );

    expect(result.enemyDies).toBe(true);
    expect(result.noMoney).toBe(true);
    expect(result.push).toBeNull();
    expect(result.hp).toBe(95);
  });

  it('floors health at zero', () => {
    const result = resolveContact(
      participants(),
      { enemyDamage: 500, upgrades: upgrades(), pushed: false },
      10,
    );
    expect(result.hp).toBe(0);
  });
});

describe('resolveContact — boss', () => {
  const boss = participants({ isBoss: true, enemyX: 120, enemyRadius: 23 });

  it('survives and pushes the tank away', () => {
    const result = resolveContact(
      boss,
      { enemyDamage: 15, upgrades: upgrades(), pushed: false },
      TANK_MAX_HP,
    );

    expect(result.enemyDies).toBe(false);
    expect(result.push).not.toBeNull();
    expect(Math.hypot(result.push!.xVel, result.push!.yVel)).toBeCloseTo(BOSS_PUSH_SPEED, 6);
  });

  it('pushes the tank away from the enemy, not toward it', () => {
    // Boss is to the right, so the tank should be flung left.
    const result = resolveContact(
      boss,
      { enemyDamage: 15, upgrades: upgrades(), pushed: false },
      TANK_MAX_HP,
    );
    expect(result.push!.xVel).toBeLessThan(0);
  });

  it('un-overlaps the tank when it is genuinely inside', () => {
    const overlapping = participants({ isBoss: true, enemyX: 105, enemyRadius: 23 });
    const result = resolveContact(
      overlapping,
      { enemyDamage: 15, upgrades: upgrades(), pushed: false },
      TANK_MAX_HP,
    );

    const distance = Math.hypot(
      result.push!.x - overlapping.enemyX,
      result.push!.y - overlapping.enemyY,
    );
    expect(distance).toBeCloseTo(TANK_RADIUS + 23, 6);
  });

  it('leaves position alone when only just touching', () => {
    const grazing = participants({ isBoss: true, enemyX: 136, enemyRadius: 23 });
    const result = resolveContact(
      grazing,
      { enemyDamage: 15, upgrades: upgrades(), pushed: false },
      TANK_MAX_HP,
    );
    expect(result.push!.x).toBe(grazing.tankX);
    expect(result.push!.y).toBe(grazing.tankY);
  });
});

describe('the threat side of the loop', () => {
  it('a Basic enemy takes 5 hp on Easy', () => {
    const enemy = resolveEnemyStats('Basic', '1', 'Easy')!;
    expect(enemy.damage).toBe(5);

    const result = resolveContact(
      participants(),
      { enemyDamage: enemy.damage, upgrades: upgrades(), pushed: false },
      TANK_MAX_HP,
    );
    expect(result.hp).toBe(95);
  });

  it('hits harder on Hard', () => {
    const easy = resolveEnemyStats('Basic', '1', 'Easy')!;
    const hard = resolveEnemyStats('Basic', '1', 'Hard')!;
    expect(hard.damage).toBeGreaterThan(easy.damage);
  });

  it('twenty Basic contacts destroy a fresh tank on Easy', () => {
    const enemy = resolveEnemyStats('Basic', '1', 'Easy')!;
    let hp = TANK_MAX_HP;
    let contacts = 0;

    while (hp > 0 && contacts < 100) {
      hp = resolveContact(
        participants(),
        { enemyDamage: enemy.damage, upgrades: upgrades(), pushed: false },
        hp,
      ).hp;
      contacts += 1;
    }

    expect(contacts).toBe(20);
  });

  it('max absorption nearly doubles how many contacts the tank survives', () => {
    // Not exactly double: damage is rounded, so 50% absorption of a 5-damage
    // enemy gives round(2.5) = 3 rather than 2.5. Rounding blunts absorption
    // against weak enemies and matters less against strong ones.
    const enemy = resolveEnemyStats('Basic', '1', 'Easy')!;
    const state = upgrades();
    state.misc[2] = 10;

    let hp = TANK_MAX_HP;
    let contacts = 0;
    while (hp > 0 && contacts < 100) {
      hp = resolveContact(
        participants(),
        { enemyDamage: enemy.damage, upgrades: state, pushed: false },
        hp,
      ).hp;
      contacts += 1;
    }

    expect(contacts).toBe(34); // ceil(100 / 3)
    expect(contacts).toBeGreaterThan(20); // clearly better than unupgraded
  });

  it('absorption is closer to exact against a hard-hitting enemy', () => {
    // A boss deals 15, so 50% absorption rounds to exactly 8 rather than 7.5.
    const boss = resolveEnemyStats('Basic', 'B', 'Easy')!;
    const state = upgrades();
    state.misc[2] = 10;

    const absorbed = contactDamage({
      enemyDamage: boss.damage,
      upgrades: state,
      pushed: false,
    });
    expect(absorbed).toBe(Math.round(boss.damage / 2));
  });
});

/**
 * The shield-band suck-in — the bug T132 fixed.
 *
 * With the shield up, `isTouchingTank` reaches to `enemyRadius + tankRadius * 2`
 * while the AS3's un-overlap places the tank at `enemyRadius + tankRadius`. The
 * scene used to shove on **every** boss contact with its own recomputed angle,
 * so a tank touching the boss with its *shield* was teleported inward to the
 * boss's body and held there. `resolveContact` carries `:5317`'s
 * `dist < tR + eR - 5` guard, which is what makes the shove a no-op out there.
 *
 * Geometry throughout: tank radius 14, boss radius 30. Body contact at 44,
 * shield contact out to 58, and the guard trips at 39.
 */
describe('a shielded boss contact must not pull the tank in', () => {
  const boss = (distance: number) =>
    participants({
      isBoss: true,
      shieldOn: true,
      tankX: 100,
      tankY: 100,
      enemyX: 100 + distance,
      enemyY: 100,
      enemyRadius: 30,
    });

  const contact = (distance: number) =>
    resolveContact(boss(distance), {
      enemyDamage: 10,
      upgrades: upgrades(),
      pushed: false,
      shieldOn: true,
    }, 100);

  it('leaves the tank where it is inside the shield band', () => {
    // 50 is shield contact (< 58) but not body contact (> 44), and well
    // outside the 39 guard. **This is the case that used to teleport inward.**
    expect(isTouchingTank(boss(50)), 'the band must actually register a hit').toBe(true);

    const result = contact(50);
    expect(result.push).not.toBeNull();
    expect(result.push!.x).toBe(100);
    expect(result.push!.y).toBe(100);
  });

  it('still un-overlaps a genuine body overlap', () => {
    // The counterpart: 30 is inside the 39 guard, so the tank *is* moved — out
    // to exactly `enemyRadius + tankRadius` on the far side. Without this pair,
    // "does not move the tank" would be satisfied by a shove that never fires.
    const result = contact(30);
    expect(result.push!.x).toBeCloseTo(100 + 30 - (30 + 14), 6);
    expect(result.push!.y).toBeCloseTo(100, 6);
  });

  it('never moves the tank closer to the boss than it already was', () => {
    // The property the bug violated, swept across the whole contact range
    // rather than asserted at one distance.
    for (let d = 20; d <= 58; d += 1) {
      const result = contact(d);
      if (!result.push) continue;
      const before = d;
      const after = Math.hypot(100 + d - result.push.x, 100 - result.push.y);
      expect(after, `at distance ${d}`).toBeGreaterThanOrEqual(before - 1e-9);
    }
  });
});

describe('the boss knockback points away from the boss', () => {
  const shove = (enemyX: number, enemyY: number) =>
    resolveContact(
      participants({ isBoss: true, tankX: 100, tankY: 100, enemyX, enemyY, enemyRadius: 30 }),
      { enemyDamage: 10, upgrades: upgrades(), pushed: false, shieldOn: false },
      100,
    ).push!;

  it('flings the tank directly away, at the AS3 speed', () => {
    // Boss to the right: the tank must leave to the left at 8.
    const right = shove(130, 100);
    expect(right.xVel).toBeCloseTo(-BOSS_PUSH_SPEED, 6);
    expect(right.yVel).toBeCloseTo(0, 6);

    // And below: away is upward. Driven on a second axis because a sign error
    // in one component alone survives an x-only check.
    const below = shove(100, 130);
    expect(below.xVel).toBeCloseTo(0, 6);
    expect(below.yVel).toBeCloseTo(-BOSS_PUSH_SPEED, 6);
  });

  it('always points away, never toward, whatever the bearing', () => {
    // The sign property, swept. A knockback toward the boss is the other half
    // of "sucked in", and a single-axis test cannot see a reversed diagonal.
    for (let deg = 0; deg < 360; deg += 15) {
      const rad = (deg * Math.PI) / 180;
      const ex = 100 + Math.cos(rad) * 35;
      const ey = 100 + Math.sin(rad) * 35;
      const push = shove(ex, ey);

      // Dot product of the knockback with the tank->boss direction must be
      // negative: the tank moves against the boss's bearing.
      const dot = push.xVel * Math.cos(rad) + push.yVel * Math.sin(rad);
      expect(dot, `bearing ${deg}deg`).toBeLessThan(0);
      expect(Math.hypot(push.xVel, push.yVel)).toBeCloseTo(BOSS_PUSH_SPEED, 6);
    }
  });
});

/**
 * The handoff — **and this proves a spelling, not a behaviour.**
 *
 * Everything above drives `resolveContact`, which was already correct before
 * T132: it has always returned the tank's own position outside a body overlap.
 * **The bug was the call site**, which recomputed its own angle and shoved on
 * every boss contact regardless. So the tests above would all have passed while
 * the tank was being dragged into the boss.
 *
 * A scene cannot be stood up here — `sceneHarness.ts` records why at length —
 * so this follows the same compromise that file uses for its own one-line
 * handoffs: a narrow assertion, labelled. It proves `GameplayScene` *reads*
 * `result.push` rather than deriving its own; it cannot prove the frame the
 * player sees. If this ever needs to be a real behavioural test, the way in is
 * to extract the apply step, not to write a better regex.
 */
describe('GameplayScene defers to resolveContact for the shove', () => {
  const scene = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

  it('takes both the knockback and the position from the result', () => {
    expect(scene).toContain('this.player.applyKnockback(result.push.xVel, result.push.yVel);');
    expect(scene).toContain('this.player.shoveTo(result.push.x, result.push.y);');
  });

  it('no longer derives its own contact angle', () => {
    // The exact expression that caused the suck-in. Its absence is the fix.
    expect(scene).not.toContain(
      'Math.atan2(this.player.y - enemy.y, this.player.x - enemy.x)',
    );
  });
});
