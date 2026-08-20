import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  COVERED_IDS,
  achievementValueSource,
  createLevelFlags,
  createQuitFlags,
  uncoveredIds,
} from './achievementContext';
import type { AchievementInputs, LevelAchievementFlags } from './achievementContext';
import { ACHIEVEMENTS } from './achievementData';
import { createInitialStates, updateAchievements } from './achievementState';
import { createInitialUpgradeState } from '../upgrades/upgradeState';
import { createEmptyProgress, recordLevelResult } from '../levels/levelProgress';
import type { LevelMode } from '../levels/levelData';

const SCENE = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

const inputs = (over: Partial<AchievementInputs> = {}): AchievementInputs => ({
  totals: { enemyKills: 0, moneyEarned: 0 },
  upgrades: createInitialUpgradeState(),
  progress: createEmptyProgress(),
  level: null,
  ...over,
});

const level = (
  mode: LevelMode,
  flags: Partial<LevelAchievementFlags> = {},
  completed = true,
) => ({ mode, completed, flags: { ...createLevelFlags(), ...flags } });

describe('every achievement has a value source', () => {
  it('covers all 36 with none left over', () => {
    // The failure this file exists to end: `updateAchievements` walked all 36
    // and nothing supplied a value, so every one sat at -1 forever.
    expect(uncoveredIds()).toEqual([]);
    expect(ACHIEVEMENTS).toHaveLength(36);
  });

  it('names no id the data does not have', () => {
    const real = new Set(ACHIEVEMENTS.map((s) => s.id));
    expect(COVERED_IDS.filter((id) => !real.has(id))).toEqual([]);
  });

  it('resolves every spec without throwing', () => {
    const getValue = achievementValueSource(inputs());
    for (const spec of ACHIEVEMENTS) {
      expect(() => getValue(spec), spec.id).not.toThrow();
    }
  });

  it('throws on an unknown id rather than returning a silent zero', () => {
    // A zero would present a permanently unearnable achievement as merely
    // unearned — indistinguishable from working.
    const getValue = achievementValueSource(inputs());
    expect(() =>
      getValue({ ...ACHIEVEMENTS[0], id: 'NotAnAchievement' }),
    ).toThrow(/No value source/);
  });
});

describe('the running totals', () => {
  it('feed the Kills and Money families', () => {
    const getValue = achievementValueSource(
      inputs({ totals: { enemyKills: 1234, moneyEarned: 99 } }),
    );
    const by = (id: string) => getValue(ACHIEVEMENTS.find((s) => s.id === id)!);

    expect([by('Kills1'), by('Kills2'), by('Kills3')]).toEqual([1234, 1234, 1234]);
    expect([by('Money1'), by('Money2'), by('Money3')]).toEqual([99, 99, 99]);
  });

  it('earns Kills1 at exactly 100', () => {
    const at = (enemyKills: number) =>
      updateAchievements(
        createInitialStates(),
        achievementValueSource(inputs({ totals: { enemyKills, moneyEarned: 0 } })),
        'Easy',
      ).newlyEarned;

    expect(at(99)).not.toContain('Kills1');
    expect(at(100)).toContain('Kills1');
    expect(at(100)).not.toContain('Kills2');
  });
});

describe('the medal-total families', () => {
  it('read the progress table, per mode and per tier', () => {
    // Three medals on a Normal level: Stars sees them, Flags does not.
    const progress = recordLevelResult(createEmptyProgress(), 1, 1, 'Hard', 3);
    const getValue = achievementValueSource(inputs({ progress }));
    const by = (id: string) => getValue(ACHIEVEMENTS.find((s) => s.id === id)!);

    expect(by('Stars1')).toEqual([3, 3, 3]);
    expect(by('Flags1')).toEqual([0, 0, 0]);
  });

  it('order the triple hardest-first, as evaluate expects', () => {
    // Cleared on Medium only: Hard sees 0, Medium and Easy see 2.
    const progress = recordLevelResult(createEmptyProgress(), 1, 1, 'Medium', 2);
    const getValue = achievementValueSource(inputs({ progress }));

    expect(getValue(ACHIEVEMENTS.find((s) => s.id === 'Stars1')!)).toEqual([0, 2, 2]);
  });
});

describe('the nine per-level Booleans', () => {
  const won = (id: string, record: ReturnType<typeof level> | null) =>
    achievementValueSource(inputs({ level: record }))(
      ACHIEVEMENTS.find((s) => s.id === id)!,
    );

  it('are false with no level, which is the shop-purchase case', () => {
    for (const id of [
      'PoisonDoctor',
      'FreezeTemperamental',
      'TrapMine',
      'AddictedCake',
      'Racing',
      'Idle',
      'FlagNoWeapons',
      'DefensiveBombs',
      'BossOnlySpecial',
    ]) {
      expect(won(id, null), id).toBe(false);
    }
  });

  it('the four unconditional ones need only their flag', () => {
    expect(won('PoisonDoctor', level('Normal', { doctorPoisoned: true }))).toBe(true);
    expect(won('FreezeTemperamental', level('Normal', { temperamentalFrozen: true }))).toBe(true);
    expect(won('TrapMine', level('Normal', { trapEnemyMineKill: true }))).toBe(true);
    expect(won('AddictedCake', level('Normal', { damageAddictEnemyCake: true }))).toBe(true);
  });

  it('Racing needs Defense as well as the flag', () => {
    // The flag is set by the tank in any mode; the achievement filters.
    expect(won('Racing', level('Normal', { hitBottom: true }))).toBe(false);
    expect(won('Racing', level('Defense', { hitBottom: true }))).toBe(true);
    expect(won('Racing', level('Defense', { hitBottom: false }))).toBe(false);
  });

  it('Idle needs the level completed', () => {
    expect(won('Idle', level('Normal', {}, false))).toBe(false);
    expect(won('Idle', level('Normal', {}, true))).toBe(true);
    expect(won('Idle', level('Normal', { nothingPressed: false }))).toBe(false);
  });

  it('FlagNoWeapons needs a completed Flag level and no shots', () => {
    expect(won('FlagNoWeapons', level('Flag'))).toBe(true);
    expect(won('FlagNoWeapons', level('Normal'))).toBe(false);
    expect(won('FlagNoWeapons', level('Flag', {}, false))).toBe(false);
    expect(won('FlagNoWeapons', level('Flag', { noWeaponsUsed: false }))).toBe(false);
  });

  it('DefensiveBombs needs one flag TRUE and another FALSE', () => {
    // The only achievement requiring a flag unset. Bombs and nothing else.
    const bombsOnly = { timedBombsFired: true, otherThanTimedBombsFired: false };

    expect(won('DefensiveBombs', level('Defense', bombsOnly))).toBe(true);
    expect(
      won('DefensiveBombs', level('Defense', { ...bombsOnly, otherThanTimedBombsFired: true })),
    ).toBe(false);
    expect(won('DefensiveBombs', level('Defense', { timedBombsFired: false }))).toBe(false);
    expect(won('DefensiveBombs', level('Normal', bombsOnly))).toBe(false);
  });

  it('BossOnlySpecial needs both of its flags and a Boss level', () => {
    const both = { onlySpecialWeapons: true, threeBosses: true };

    expect(won('BossOnlySpecial', level('Boss', both))).toBe(true);
    expect(won('BossOnlySpecial', level('Boss', { ...both, threeBosses: false }))).toBe(false);
    expect(
      won('BossOnlySpecial', level('Boss', { ...both, onlySpecialWeapons: false })),
    ).toBe(false);
    expect(won('BossOnlySpecial', level('Normal', both))).toBe(false);
    expect(won('BossOnlySpecial', level('Boss', both, false))).toBe(false);
  });
});

describe('the flags start where the AS3 starts them', () => {
  it('three begin true, because they are cleared by doing something', () => {
    const fresh = createLevelFlags();

    expect(fresh.nothingPressed).toBe(true);
    expect(fresh.noWeaponsUsed).toBe(true);
    expect(fresh.onlySpecialWeapons).toBe(true);
  });

  it('the rest begin false', () => {
    const fresh = createLevelFlags();
    const shouldBeFalse = Object.entries(fresh).filter(
      ([key]) => !['nothingPressed', 'noWeaponsUsed', 'onlySpecialWeapons'].includes(key),
    );

    expect(shouldBeFalse.every(([, value]) => value === false)).toBe(true);
    expect(shouldBeFalse).toHaveLength(8);
  });

  it('quitting sets the three optimistic ones false instead', () => {
    // `resetTempVariables("Quit")` is not the same as a level start. Abandoning
    // a level must not bank an achievement for having done nothing in it.
    const quit = createQuitFlags();

    expect(quit.nothingPressed).toBe(false);
    expect(quit.noWeaponsUsed).toBe(false);
    expect(quit.onlySpecialWeapons).toBe(false);
  });

  it('a quit loadout cannot earn Idle, FlagNoWeapons or BossOnlySpecial', () => {
    const getValue = achievementValueSource(
      inputs({ level: { mode: 'Flag', completed: true, flags: createQuitFlags() } }),
    );
    for (const id of ['Idle', 'FlagNoWeapons', 'BossOnlySpecial']) {
      expect(getValue(ACHIEVEMENTS.find((s) => s.id === id)!), id).toBe(false);
    }
  });
});

/**
 * Every flag needs a site that sets it, or the achievement is unreachable and
 * looks merely unearned.
 */
describe('each flag is set somewhere in gameplay', () => {
  it('doctorPoisoned, on poison landing on a Medic', () => {
    expect(SCENE).toContain("if (poisoned && enemy.enemyType === 'Medic')");
  });

  it('damageAddictEnemyCake, on a cake round striking one', () => {
    expect(SCENE).toContain("struck.enemyType === 'DamageAddict'");
  });

  it('trapEnemyMineKill, checking the mine blast is what killed it', () => {
    // Parentage matters: the shared explosion path has no idea what spawned it.
    expect(SCENE).toContain('this.levelFlags.trapEnemyMineKill = true;');
    expect(SCENE).toContain("e.enemyType === 'Trap'");
  });

  it('hitBottom, from the tank position rather than an enemy crossing', () => {
    // `Tank.as:210` — the one set site outside PartGameArea, and the reason a
    // sweep of that file alone misses it.
    expect(SCENE).toContain('private trackTankReachedBottom()');
    expect(SCENE).toContain('this.levelFlags.hitBottom = true;');
    expect(SCENE).toContain('this.trackTankReachedBottom();');
  });

  it('nothingPressed, cleared by any input at all', () => {
    expect(SCENE).toContain('this.levelFlags.nothingPressed = false;');
  });

  it('the four firing flags, split primary against secondary', () => {
    expect(SCENE).toContain("this.weapon?.name === 'Timed Bomb Cannon'");
    expect(SCENE).toContain('this.levelFlags.timedBombsFired = true;');
    expect(SCENE).toContain('this.levelFlags.onlySpecialWeapons = false;');
    // Any secondary sets two of them and leaves onlySpecialWeapons alone —
    // the whole distinction BossOnlySpecial rests on. `:3984-3985` sits above
    // the weapon dispatch, so it applies to every secondary rather than to
    // Mine alone, and the port sets them in the shared branch for that reason.
    // Bounded to the method itself: `updateHud` is far enough down the file
    // that the slice swept in the completion-time damage clear, which does set
    // onlySpecialWeapons and legitimately so.
    const start = SCENE.indexOf('private updateSecondary(');
    const secondary = SCENE.slice(start, SCENE.indexOf('private resolveHealAuras(', start));
    expect(secondary).toContain('this.levelFlags.otherThanTimedBombsFired = true;');
    expect(secondary).toContain('this.levelFlags.noWeaponsUsed = false;');
    // The assignment, not the word — the comment above the block explains the
    // distinction and would otherwise match itself.
    expect(secondary).not.toContain('this.levelFlags.onlySpecialWeapons');
  });

  it('threeBosses, from the level boss count at wave start', () => {
    expect(SCENE).toContain('this.levelFlags.threeBosses = this.wave.bossAmount >= 3;');
  });

  it('no longer clears the weapon flags on damage', () => {
    /*
     * ── Replaced in T214, not repaired ──────────────────────────────────
     *
     * This asserted `:2764-2770` was ported: finishing with any damage cleared
     * the four "did it cleanly" flags, so three weapon-choice achievements
     * also needed a near-flawless run. It was an accurate description of both
     * the AS3 and the port.
     *
     * The rule was dropped by request. Measured on level 1-1, standing still
     * and firing, the tank goes from 100 hp to 94 in four seconds — contact
     * damage is continuous, so a five-point budget across a whole Defense
     * level made "KABOOM!" unreachable in practice.
     *
     * Asserted as absent rather than deleted, because reinstating it would
     * silently make three achievements unearnable again and nothing else here
     * would notice.
     */
    expect(SCENE).not.toContain('if (this.hp < MEDAL_HP_GOLD) {');
    expect(SCENE).not.toContain('MEDAL_HP_GOLD');

    /*
     * The counterpart, and the reason the absence means something: the flags
     * are still *set* by the firing path. "The gate is gone" would also pass
     * if the whole mechanism had been deleted.
     */
    expect(SCENE).toContain('this.levelFlags.timedBombsFired = true;');
    expect(SCENE).toContain('this.levelFlags.otherThanTimedBombsFired = true;');
  });

  it('temperamentalFrozen, now that something deals Ice damage', () => {
    // This was a documented gap: `applyFreeze` had no caller because nothing
    // dealt Ice damage, so the achievement was knowably unreachable rather than
    // mysteriously unearned. The Ice Grenade is the source that closed it — a
    // missing damage source, exactly as the note predicted, not a missing
    // subsystem.
    expect(SCENE).toContain('enemy.freeze(');
    expect(SCENE).toContain(
      "if (enemy.enemyType === 'Temperamental') this.levelFlags.temperamentalFrozen = true;",
    );
  });
});

describe('the fabricated achievements are gone', () => {
  it('from the scene', () => {
    for (const invented of ['first-coins', 'Pocket Change', 'clear-board', 'Swept the Field']) {
      expect(SCENE, invented).not.toContain(`'${invented}'`);
    }
  });

  it('from every other surface', () => {
    for (const path of ['src/state/bridge.ts', 'src/state/gameStore.ts', 'src/ui/Hud.tsx']) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toContain('first-coins');
      expect(source, path).not.toContain('clear-board');
    }
  });

  it('and they were never real', () => {
    const real = new Set(ACHIEVEMENTS.map((s) => s.id));
    expect(real.has('first-coins')).toBe(false);
    expect(real.has('clear-board')).toBe(false);
  });

  it('the toast now announces ids that exist', () => {
    const bridge = readFileSync('src/state/bridge.ts', 'utf8');
    expect(bridge).toContain('for (const id of summary.newAchievements)');
    expect(bridge).toContain('const spec = getAchievement(id);');
  });
});
