/**
 * The enemy behaviour report.
 *
 * The point of this module is to be honest about what is built, so the tests
 * mostly guard against it *overstating* — a status board that drifts optimistic
 * is worse than none.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  SPECIAL_MECHANICS,
  behaviourTotals,
  describeAllEnemies,
  describeEnemy,
  isRangedImplemented,
} from './enemyBehaviour';
import { ENEMY_STATS } from './enemyStatsData';
import { resolveEnemyStats } from './enemyStats';

describe('coverage', () => {
  it('reports every enemy type exactly once', () => {
    const all = describeAllEnemies();
    expect(all).toHaveLength(Object.keys(ENEMY_STATS).length);
    expect(new Set(all.map((r) => r.type)).size).toBe(all.length);
  });

  it('totals add up', () => {
    const all = describeAllEnemies();
    const t = behaviourTotals(all);
    expect(t.implemented + t.partial + t.dataOnly).toBe(t.total);
  });
});

describe('ranged support is derived, not declared', () => {
  it('is true only when both the bullet class and the pattern are supported', () => {
    // Shooting: Basic + Front — both supported.
    expect(isRangedImplemented(resolveEnemyStats('Shooting', '1', 'Easy'))).toBe(true);
    // Crazy: Basic + Circle — both supported after this pass.
    expect(isRangedImplemented(resolveEnemyStats('Crazy', '1', 'Easy'))).toBe(true);
    // Soldier: Following — bullet class not ported.
    expect(isRangedImplemented(resolveEnemyStats('Soldier', '1', 'Easy'))).toBe(false);
    // Trap: BackTrap — pattern not ported.
    expect(isRangedImplemented(resolveEnemyStats('Trap', '1', 'Easy'))).toBe(false);
  });

  it('is false for anything that does not shoot', () => {
    expect(isRangedImplemented(resolveEnemyStats('Basic', '1', 'Easy'))).toBe(false);
  });
});

describe('status is not optimistic', () => {
  it('a type with an unported mechanic is never "implemented"', () => {
    for (const r of describeAllEnemies()) {
      if (r.missingMechanic) expect(r.status, r.type).not.toBe('implemented');
    }
  });

  it('a shooter whose pattern is unported is never "implemented"', () => {
    for (const r of describeAllEnemies()) {
      if (r.shoots && !r.rangedImplemented) expect(r.status, r.type).not.toBe('implemented');
    }
  });

  it('every "implemented" type really has nothing outstanding', () => {
    for (const r of describeAllEnemies().filter((x) => x.status === 'implemented')) {
      expect(r.missingMechanic, r.type).toBeNull();
      if (r.shoots) expect(r.rangedImplemented, r.type).toBe(true);
    }
  });
});

/**
 * The guard that would have caught four invented mechanics.
 *
 * Special behaviour in the AS3 is always a branch keyed on the type name or on
 * the display class. Reading those branch names straight out of the source
 * makes "does this mechanic exist" a mechanical question instead of a
 * recollection, which is the only reason the board can be trusted.
 */
describe('every declared mechanic exists in the AS3', () => {
  const source = readFileSync('../SWFimported/scripts/PartGameArea.as', 'utf8');

  /** Types the source actually branches on, by either idiom. */
  const branched = new Set<string>([
    ...[...source.matchAll(/enemyType == "([A-Za-z]+?)B?"/g)].map((m) => m[1]),
    ...[...source.matchAll(/\[object Enemy([A-Za-z]+?)(?:Boss)?\]/g)].map((m) => m[1]),
  ]);

  it('finds the branch idioms at all', () => {
    // If a JPEXS re-export changed the formatting, every check below would
    // pass vacuously. Ghost and Teleporting are one per idiom.
    expect(branched.has('Ghost')).toBe(true);
    expect(branched.has('Teleporting')).toBe(true);
  });

  /**
   * The third idiom, and the reason this survey is a floor rather than a census.
   *
   * `branched` above matches `enemyType == "X"` and `[object EnemyX]`. A third
   * exists — `instance.enemy == "X"`, the spawn dispatch at `:2934-3246` — and
   * it is present for **all 20 types**, so matching it would add no signal to
   * the guard above. But it is not empty of behaviour: some cases carry
   * per-type initialisation after the constructor, and `Temperamental` (`:3049`)
   * sets `angry`/`angryTimerMax` there, while `Accelerating` (`:3076`) sets
   * `speedTimerMax`.
   *
   * So a type whose *only* distinguishing behaviour lived in its spawn case
   * would be reported as having no branch, and therefore as fully implemented.
   * This check closes that hole mechanically instead of asserting it is closed:
   * for every type the board calls `implemented`, the spawn case must contain
   * nothing but the constructor, the stat row and boss bookkeeping.
   */
  const spawnCases = (): Map<string, string[]> => {
    const lines = source.split(/\r?\n/);
    const starts: { line: number; type: string }[] = [];
    lines.forEach((l, i) => {
      const m = l.match(/instance\.enemy == "(\w+)"/);
      // The constructor switch only; the speedMultiplier switch is at :3475.
      if (m && i + 1 >= 2934 && i + 1 <= 3246) starts.push({ line: i, type: m[1] });
    });
    const out = new Map<string, string[]>();
    starts.forEach((s, k) => {
      const end = k + 1 < starts.length ? starts[k + 1].line : 3250;
      out.set(
        s.type,
        lines
          .slice(s.line, end)
          .map((x) => x.trim())
          .filter(
            (x) =>
              x &&
              x !== '{' &&
              x !== '}' &&
              !/^(if|else)\b/.test(x) &&
              !/^enemy = new /.test(x) &&
              !/^enemyStatsArray = /.test(x) &&
              !/^\+\+ScreenGame\./.test(x),
          ),
      );
    });
    return out;
  };

  it('finds a spawn case for every type', () => {
    const cases = spawnCases();
    expect(cases.size).toBe(Object.keys(ENEMY_STATS).length);
    // Sanity: a type known to carry initialisation must show it, or the filter
    // is stripping everything and the check below passes vacuously.
    expect(cases.get('Temperamental')!.join(' ')).toContain('angryTimerMax');
  });

  /**
   * Spawn setup that **is** reproduced, and where.
   *
   * The check below used to require an implemented type's spawn case to be
   * empty. That held while every ported type happened to have no per-instance
   * initialisation, and stopped holding the moment one did — `Accelerating`
   * seeds a wind-up timer. Exempting it would have removed the guard; instead a
   * line has to be *claimed*, and the claim names the port that covers it, so
   * an unported line still fails.
   */
  const ACCOUNTED_SPAWN_SETUP: Record<string, readonly string[]> = {
    // enemyVisibility.createVisibilityState — both spawn visible with the
    // timer at its maximum. `gotoAndStop(1)` is the visible sprite frame,
    // which the port expresses as alpha rather than a frame index.
    Ghost: [
      'enemy.gotoAndStop(1);',
      'enemy.invisible = false;',
      'enemy.ghostTimerMax = 150;',
      'enemy.ghostTimer = enemy.ghostTimerMax;',
    ],
    ScaredGhost: [
      'enemy.gotoAndStop(1);',
      'enemy.invisible = false;',
      'enemy.ghostTimerMax = 150;',
      'enemy.ghostTimer = enemy.ghostTimerMax;',
    ],
    // enemyHealing.createHealState, and healDistanceFor for the 50/100 radius.
    // The IndicatorMedic ring is a visual the port does not draw.
    Medic: [
      'enemy.healDistance = 50;',
      'enemy.healDistance = 100;',
      'enemy.healTimerMax = 15;',
      'enemy.healTimer = enemy.healTimerMax;',
      'indicator = new IndicatorMedic();',
      'indicator.enemy = enemy;',
      'indicator.scaleX = enemy.healDistance / 100;',
      'indicator.scaleY = enemy.healDistance / 100;',
      'this.medicIndicatorLayer.addChild(indicator);',
      'this.medicIndicatorArray.push(indicator);',
    ],
    // enemyTeleport.createTeleportState — the 120..150 / 150..225 seed and the
    // 30-frame phase length.
    Teleporting: [
      // Visible sprite frame; the port drives opacity through applyAlpha.
      'enemy.gotoAndStop(1);',
      'enemy.teleStartTimerMax = 150;',
      'enemy.teleStartTimerMin = 120;',
      'enemy.teleStartTimerMax = 225;',
      'enemy.teleStartTimerMin = 150;',
      'enemy.teleporting = false;',
      'enemy.teleportingAway = false;',
      'enemy.teleStartTimer = enemy.teleStartTimerMin + Math.random() * (enemy.teleStartTimerMax - enemy.teleStartTimerMin);',
      'enemy.teleTimerMax = 30;',
      'enemy.teleTimer = 30;',
      // Scratch fields the AS3 stashes on the enemy between the two phases.
      // The port passes them as locals through teleportDestination instead, so
      // there is nothing to initialise.
      'enemy.distEnemyTank = 0;',
      'enemy.angleToTank = 0;',
      'enemy.newDistance = 0;',
      'enemy.randomAngle = 0;',
      'enemy.velocityAngle = 0;',
      'enemy.velocitySpeed = 0;',
    ],
    // Enemy.radiusStart, captured in the constructor from the same diameter.
    Shrinking: ['enemy.radiusStart = enemy.width / 2;'],
    // enemyStatMods.createRageState. `gotoAndStop(1)` is the calm sprite frame,
    // which the port expresses through the same art the other types use rather
    // than a frame index. `turnPeaceful` is deliberately not ported — nothing
    // in the AS3 ever assigns it true, so the branch reading it is unreachable.
    Temperamental: [
      'enemy.gotoAndStop(1);',
      'enemy.angry = false;',
      'enemy.turnAngry = false;',
      'enemy.turnPeaceful = false;',
      'enemy.angryTimerMax = 225;',
      'enemy.angryTimer = enemy.angryTimerMax;',
    ],
    // enemyStatMods.createAcceleratingState — 225 normal, 450 boss, starting
    // at the maximum so the enemy enters at base speed.
    Accelerating: [
      'enemy.speedTimerMax = 225;',
      'enemy.speedTimerMax = 450;',
      'enemy.speedTimer = enemy.speedTimerMax;',
    ],
  };

  it('no "implemented" type hides behaviour in its spawn case', () => {
    const cases = spawnCases();
    for (const r of describeAllEnemies().filter((x) => x.status === 'implemented')) {
      const accounted = ACCOUNTED_SPAWN_SETUP[r.type] ?? [];
      const unaccounted = (cases.get(r.type) ?? []).filter((line) => !accounted.includes(line));

      expect(
        unaccounted,
        `${r.type} is reported implemented, but its spawn case carries setup that ` +
          `nothing claims to reproduce. Either port it, or add it to ` +
          `ACCOUNTED_SPAWN_SETUP naming what covers it.`,
      ).toEqual([]);
    }
  });

  it('every accounted line is really in the source', () => {
    // Stops the allowance rotting: a claim for a line the AS3 no longer has
    // would sit there excusing nothing, and would quietly excuse a *different*
    // line if one were added with the same text.
    const cases = spawnCases();
    for (const [type, lines] of Object.entries(ACCOUNTED_SPAWN_SETUP)) {
      for (const line of lines) {
        expect(cases.get(type) ?? [], `${type}: "${line}"`).toContain(line);
      }
    }
  });

  it.each(Object.entries(SPECIAL_MECHANICS))(
    '%s has a real branch, so "%s" is a finding and not a guess',
    (type) => {
      expect(
        branched.has(type),
        `SPECIAL_MECHANICS declares a mechanic for "${type}", but no ` +
          `"enemyType == \\"${type}\\"" or "[object Enemy${type}]" branch was FOUND ` +
          `in PartGameArea.as by this survey. Note "found", not "exists": the AS3 ` +
          `also branches as \`instance.enemy == "X"\` and inlines helper bodies, so ` +
          `this is a floor. Verify against the source — probing on a distinctive ` +
          `operand, not on a name — before adding or keeping an entry.`,
      ).toBe(true);
    },
  );
});

describe('the current picture', () => {
  it('Shooting is fully implemented', () => {
    const r = describeEnemy('Shooting');
    expect(r.status).toBe('implemented');
    expect(r.rangedImplemented).toBe(true);
  });

  it('Crazy is complete — Circle volleys are its whole character', () => {
    // "Shoots bursts of bullets in all directions" (bestiary): shootAngle
    // Circle, bulletAmount 6. There is no steering mechanic to miss.
    const r = describeEnemy('Crazy');
    expect(r).toMatchObject({ status: 'implemented', rangedImplemented: true });
    expect(r.missingMechanic).toBeNull();
  });

  it('Ninja and Random are complete for the same reason', () => {
    expect(describeEnemy('Ninja').status).toBe('implemented');
    expect(describeEnemy('Random').status).toBe('implemented');
  });

  it('Tiny is complete — it is small, and that is all', () => {
    const r = describeEnemy('Tiny');
    expect(r).toMatchObject({ status: 'implemented', shoots: false });
    expect(r.missingMechanic).toBeNull();
  });

  it('Soldier is data-only — homing is not ported', () => {
    // Reported by the derived ranged check (shootType "Following"), not by a
    // hand-written entry, so it clears itself when that bullet class lands.
    const r = describeEnemy('Soldier');
    expect(r).toMatchObject({ status: 'data-only', rangedImplemented: false });
    expect(r.missingMechanic).toBeNull();
  });

  it('stands at 17 implemented, 0 partial, 3 data-only of 20', () => {
    // The exact figure, not a comparative: it is knowable, and a board that
    // moves without anyone noticing is the failure this module exists to stop.
    //
    // `partial` is empty, and that is a real result rather than a rounding
    // artefact: it needed a type with both a working firing pattern and an
    // unported mechanic, and the only three types in that bucket were Crazy,
    // Ninja and Random — whose mechanics turned out not to exist. Every
    // remaining mechanic belongs to a type whose shooting is also unported.
    expect(behaviourTotals(describeAllEnemies())).toEqual({
      implemented: 17,
      partial: 0,
      dataOnly: 3,
      total: 20,
    });
  });
});
