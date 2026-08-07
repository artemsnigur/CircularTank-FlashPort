/**
 * The unlock rule and progress recording, as LevelSelect and Gameplay use them.
 *
 * `levelProgress` had 34 passing tests and was called by nothing; these cover
 * the shape the scenes actually consume.
 *
 * ── This file used to test itself ─────────────────────────────────────────
 * Every assertion below drove a local `isUnlocked` defined at the top of this
 * file — a reimplementation of the rule, identical to the one inlined in
 * `LevelSelectScene`, and the only copy the tests ever executed. Changing the
 * scene's expression to `level <= 2 || …` would have left all of these green:
 * the file read as coverage of the unlock rule and could not fail for a defect
 * in it.
 *
 * The local is gone and every assertion now drives the real `isLevelUnlocked`.
 * They are otherwise unchanged, deliberately: if they still pass, the local was
 * a faithful copy and the extraction preserved behaviour. That is the
 * migration's own check, so do not "improve" them in the same change.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  createEmptyProgress,
  isLevelCleared,
  nextLevelAfter,
  recordLevelResult,
} from './levelProgress';
import {
  isLevelUnlocked,
  isWorldUnlocked,
  levelUnlockStates,
  mayStartLevel,
  SELECTABLE_WORLDS,
  worldMedalTiers,
  worldUnlockStates,
} from './levelUnlock';
import { LEVELS, levelsInWorld, WORLD_COUNT } from './levelData';
import { Worlds } from '../config/constants';
import { PlayerProfile } from '../player/playerProfile';
import { MemoryBackend, SaveStore, saveSlotStoreName } from '../save/SaveStore';
import { ACTIVE_SLOT } from '../player/playerProfile';

/** Clears a level so the next one opens. */
const clear = (progress: ReturnType<typeof createEmptyProgress>, world: number, level: number) =>
  recordLevelResult(progress, world, level, 'Easy', 1);

describe('the unlock rule', () => {
  it('opens only level 1 on a fresh save', () => {
    const progress = createEmptyProgress();
    expect(isLevelUnlocked(progress, 1, 1)).toBe(true);
    expect(isLevelUnlocked(progress, 1, 2)).toBe(false);
    expect(isLevelUnlocked(progress, 1, 3)).toBe(false);
  });

  it('opens the next level once one is cleared', () => {
    let progress = createEmptyProgress();
    progress = recordLevelResult(progress, 1, 1, 'Easy', 1);

    expect(isLevelUnlocked(progress, 1, 2)).toBe(true);
    // Only the next one — not the whole world.
    expect(isLevelUnlocked(progress, 1, 3)).toBe(false);
  });

  it('unlocks strictly one at a time across a run', () => {
    let progress = createEmptyProgress();
    for (let level = 1; level <= 5; level += 1) {
      expect(isLevelUnlocked(progress, 1, level)).toBe(true);
      expect(isLevelUnlocked(progress, 1, level + 1)).toBe(false);
      progress = recordLevelResult(progress, 1, level, 'Easy', 1);
    }
    expect(isLevelUnlocked(progress, 1, 6)).toBe(true);
  });

  it('counts a clear on any difficulty', () => {
    for (const difficulty of ['Easy', 'Medium', 'Hard'] as const) {
      const progress = recordLevelResult(createEmptyProgress(), 1, 1, difficulty, 1);
      expect(isLevelUnlocked(progress, 1, 2)).toBe(true);
    }
  });

  it('a loss scores nothing and unlocks nothing', () => {
    // Gameplay records 0 on a loss; recordLevelResult only ever raises a slot.
    const progress = recordLevelResult(createEmptyProgress(), 1, 1, 'Easy', 0);
    expect(isLevelCleared(progress, 1, 1)).toBe(false);
    expect(isLevelUnlocked(progress, 1, 2)).toBe(false);
  });

  it('never lowers a previous result', () => {
    let progress = recordLevelResult(createEmptyProgress(), 1, 1, 'Easy', 3);
    progress = recordLevelResult(progress, 1, 1, 'Easy', 1);
    expect(progress[0][0][2]).toBe(3);
  });

  it('covers the whole world without falling off the table', () => {
    const world1 = LEVELS[0];
    const progress = createEmptyProgress();
    expect(world1.length).toBeGreaterThan(0);
    // The last level must be addressable — an off-by-one here would silently
    // make it permanently locked.
    expect(() => isLevelUnlocked(progress, 1, world1.length)).not.toThrow();
    expect(isLevelCleared(progress, 1, world1.length)).toBe(false);
  });
});

describe('the world unlock rule', () => {
  it('opens world 1 on a fresh save', () => {
    // A deliberate base case here. In the AS3 it falls out of reading
    // `worldsValuesVisibleArrays[-1]` and the `!= null` guard short-circuiting
    // — see ScreenLevelSelect.as:1518.
    expect(isWorldUnlocked(createEmptyProgress(), 1)).toBe(true);
  });

  it('needs the LAST level of the previous world, not just any of them', () => {
    const finalLevel = levelsInWorld(1);
    let progress = createEmptyProgress();

    // Clear every level of world 1 except the last.
    for (let level = 1; level < finalLevel; level += 1) progress = clear(progress, 1, level);
    expect(isWorldUnlocked(progress, 2)).toBe(false);

    progress = clear(progress, 1, finalLevel);
    expect(isWorldUnlocked(progress, 2)).toBe(true);
  });

  it('takes the final level from the table rather than assuming 45', () => {
    // A hardcoded 45 would gate on the wrong level for any world sized
    // differently, and would be right by luck for every world that is not.
    const progress = clear(createEmptyProgress(), 1, levelsInWorld(1));
    expect(isWorldUnlocked(progress, 2)).toBe(true);
    expect(levelsInWorld(1)).toBe(LEVELS[0].length);
  });

  it('leaves later worlds shut', () => {
    const progress = clear(createEmptyProgress(), 1, levelsInWorld(1));
    expect(isWorldUnlocked(progress, 3)).toBe(false);
  });

  it('refuses a world past the end of the game', () => {
    const progress = createEmptyProgress();
    expect(isWorldUnlocked(progress, WORLD_COUNT)).toBe(false);
    expect(isWorldUnlocked(progress, WORLD_COUNT + 1)).toBe(false);
  });
});

describe('the world picker rows', () => {
  it('describes all nine worlds, in order, with their theme names', () => {
    const rows = worldUnlockStates(createEmptyProgress());

    expect(rows).toHaveLength(WORLD_COUNT);
    expect(rows.map((r) => r.world)).toEqual(rows.map((_, i) => i + 1));
    expect(rows.map((r) => r.name)).toEqual([...Worlds]);
    expect(rows[0].totalLevels).toBe(levelsInWorld(1));
  });

  it('opens only world 1 on a fresh save', () => {
    const rows = worldUnlockStates(createEmptyProgress());
    expect(rows.filter((r) => r.unlocked).map((r) => r.world)).toEqual([1]);
  });

  it('opens world 2 once world 1 last level is cleared', () => {
    const progress = clear(createEmptyProgress(), 1, levelsInWorld(1));
    const rows = worldUnlockStates(progress);

    expect(rows.filter((r) => r.unlocked).map((r) => r.world)).toEqual([1, 2]);
  });

  it('the frontier is the level the player is up to', () => {
    // `:1563-1568` — levelsCompleted + 1, capped. Unlocks are strictly
    // sequential, so this is exactly the first level that is open and unplayed.
    let progress = createEmptyProgress();
    for (let level = 1; level <= 6; level += 1) progress = clear(progress, 1, level);

    const world1 = worldUnlockStates(progress)[0];
    expect(world1.levelsCompleted).toBe(6);
    expect(world1.frontier).toBe(7);
    expect(isLevelUnlocked(progress, 1, world1.frontier)).toBe(true);
    expect(isLevelUnlocked(progress, 1, world1.frontier + 1)).toBe(false);
  });

  it('the frontier stops at the last level of a finished world', () => {
    const total = levelsInWorld(1);
    let progress = createEmptyProgress();
    for (let level = 1; level <= total; level += 1) progress = clear(progress, 1, level);

    const world1 = worldUnlockStates(progress)[0];
    expect(world1.levelsCompleted).toBe(total);
    expect(world1.frontier).toBe(total);
  });

  it('counts medals for a locked world too, at zero', () => {
    // The AS3 blanks a locked button's text; the numbers are not secret, they
    // are simply zero, so the caller decides what to hide.
    const rows = worldUnlockStates(createEmptyProgress());
    expect(rows[8]).toMatchObject({ unlocked: false, bronze: 0, silver: 0, gold: 0 });
  });
});

describe('the world medal tiers', () => {
  it('separates the three tiers by the same cascade the grid uses', () => {
    // 3 on Easy only: bronze sees it, silver and gold do not.
    const progress = recordLevelResult(createEmptyProgress(), 1, 1, 'Easy', 3);
    expect(worldMedalTiers(progress, 1)).toEqual({ bronze: 3, silver: 0, gold: 0 });

    // 2 on Hard: every tier sees it, because clearing hard satisfies easier.
    const hard = recordLevelResult(createEmptyProgress(), 1, 1, 'Hard', 2);
    expect(worldMedalTiers(hard, 1)).toEqual({ bronze: 2, silver: 2, gold: 2 });
  });

  it('sums across the world', () => {
    let progress = createEmptyProgress();
    for (let level = 1; level <= 4; level += 1) {
      progress = recordLevelResult(progress, 1, level, 'Medium', 2);
    }
    expect(worldMedalTiers(progress, 1)).toEqual({ bronze: 8, silver: 8, gold: 0 });
  });

  /**
   * The AS3's bronze branch is wrong on a tie, and this is the corrected value.
   *
   *     if      (v0 > v1 && v0 > v2)  bronze += v0;
   *     else if (v1 > v0)             bronze += v1;
   *     else                          bronze += v2;
   *
   * With v0 = v1 = 3 and v2 = 1 both tests fail on `3 > 3` and it falls to v2,
   * reporting 1 where the best is 3. Corrected rather than reproduced: it is
   * display-only, but the level grid shows `getLevelValues`, so reproducing it
   * would make two screens disagree about the same player's medals.
   */
  it('reports the true best when Hard and Medium tie above Easy', () => {
    let progress = recordLevelResult(createEmptyProgress(), 1, 1, 'Hard', 3);
    progress = recordLevelResult(progress, 1, 1, 'Medium', 3);
    progress = recordLevelResult(progress, 1, 1, 'Easy', 1);

    expect(progress[0][0]).toEqual([3, 3, 1]);
    // The AS3 chain would give 1 here.
    expect(worldMedalTiers(progress, 1).bronze).toBe(3);
  });

  it('agrees with the level grid on every row, tie or not', () => {
    // The property that made correcting it the right call — one number, two
    // screens. A per-level sum of the grid's own values must equal the world
    // tally exactly.
    let progress = recordLevelResult(createEmptyProgress(), 1, 1, 'Hard', 3);
    progress = recordLevelResult(progress, 1, 1, 'Medium', 3);
    progress = recordLevelResult(progress, 1, 1, 'Easy', 1);
    progress = recordLevelResult(progress, 1, 2, 'Easy', 2);

    const gridTotal = levelUnlockStates(progress, 1, 'Easy').reduce((s, r) => s + r.value, 0);
    expect(worldMedalTiers(progress, 1).bronze).toBe(gridTotal);
  });
});

describe('the grid rows', () => {
  it('describes every level in the world, in order', () => {
    const rows = levelUnlockStates(createEmptyProgress(), 1, 'Easy');

    expect(rows).toHaveLength(levelsInWorld(1));
    expect(rows.map((r) => r.level)).toEqual(rows.map((_, i) => i + 1));
    expect(rows[0].mode).toBe(LEVELS[0][0].mode);
  });

  it('opens exactly one row on a fresh save', () => {
    const rows = levelUnlockStates(createEmptyProgress(), 1, 'Easy');

    expect(rows.filter((r) => r.unlocked)).toHaveLength(1);
    expect(rows.filter((r) => r.cleared)).toHaveLength(0);
  });

  it('cleared and unlocked are different facts', () => {
    // Level 1 cleared: level 1 is cleared *and* open, level 2 is open and not
    // cleared. Conflating them would make one of these wrong.
    const rows = levelUnlockStates(clear(createEmptyProgress(), 1, 1), 1, 'Easy');

    expect(rows[0]).toMatchObject({ level: 1, cleared: true, unlocked: true });
    expect(rows[1]).toMatchObject({ level: 2, cleared: false, unlocked: true });
    expect(rows[2]).toMatchObject({ level: 3, cleared: false, unlocked: false });
  });

  it('shows the medal count for the difficulty asked about', () => {
    // Two medals on Medium. The cascade means Easy sees them and Hard does not:
    // clearing on a harder setting satisfies every easier one, never the
    // reverse. Same row, three different values.
    const progress = recordLevelResult(createEmptyProgress(), 1, 1, 'Medium', 2);

    expect(levelUnlockStates(progress, 1, 'Easy')[0].value).toBe(2);
    expect(levelUnlockStates(progress, 1, 'Medium')[0].value).toBe(2);
    expect(levelUnlockStates(progress, 1, 'Hard')[0].value).toBe(0);
  });

  it('a level opened on Easy stays open on Hard, at zero medals', () => {
    // The unlock rule tests all three slots (`:842`); only the *value* is
    // difficulty-scoped. Deriving one from the other would shut the grid on a
    // player who switched to Hard.
    const progress = clear(createEmptyProgress(), 1, 1);
    const hard = levelUnlockStates(progress, 1, 'Hard');

    expect(hard[1].unlocked).toBe(true);
    expect(hard[0]).toMatchObject({ cleared: true, unlocked: true, value: 0 });
  });

  it('yields nothing for a world that does not exist', () => {
    // A blank grid beats a crashed screen.
    expect(levelUnlockStates(createEmptyProgress(), 0, 'Easy')).toEqual([]);
    expect(levelUnlockStates(createEmptyProgress(), WORLD_COUNT + 1, 'Easy')).toEqual([]);
  });
});

/**
 * The start-time guard.
 *
 * `disabled` on a React button is presentation. `ui:start-game` is a shared
 * channel — the dev jump emits it too — so before this the lock was decorative:
 * any emitter started the level however locked the grid drew it.
 */
describe('a locked level cannot be started', () => {
  const storeName = saveSlotStoreName(ACTIVE_SLOT);

  /** A profile with world 1 level 1 cleared and nothing else. */
  const profileWithFirstLevelCleared = (): PlayerProfile => {
    const profile = new PlayerProfile(new SaveStore(storeName, new MemoryBackend()));
    profile.recordLevel(1, 1, 'Easy', 1, true);
    return profile;
  };

  it('refuses a level the player has not reached', () => {
    const progress = profileWithFirstLevelCleared().progress;

    expect(mayStartLevel(progress, { world: 1, level: 2 })).toBe(true);
    expect(mayStartLevel(progress, { world: 1, level: 3 })).toBe(false);
    expect(mayStartLevel(progress, { world: 1, level: 40 })).toBe(false);
  });

  it('lets a sandbox run through anyway', () => {
    // The dev jump's whole purpose is reaching a level the campaign has not
    // opened. Sandbox runs record nothing, so this cannot launder progress.
    const progress = profileWithFirstLevelCleared().progress;

    expect(mayStartLevel(progress, { world: 1, level: 40, sandbox: true })).toBe(true);
    expect(mayStartLevel(progress, { world: 9, level: 45, sandbox: true })).toBe(true);
  });

  it('refuses level 1 of a world the player has not reached', () => {
    // The gap the picker introduced. `isLevelUnlocked(view, 5, 1)` is true on a
    // fresh save because level 1 always is, so a level-only guard would have
    // started world 5 from a stale or forged event. Unreachable while the port
    // pinned itself to world 1; a real request once there is a picker.
    const progress = createEmptyProgress();

    expect(isLevelUnlocked(progress, 5, 1)).toBe(true);
    expect(mayStartLevel(progress, { world: 5, level: 1 })).toBe(false);
  });

  it('allows a world the player has opened', () => {
    const progress = clear(createEmptyProgress(), 1, levelsInWorld(1));

    expect(mayStartLevel(progress, { world: 2, level: 1 })).toBe(true);
    // Still one level at a time inside it.
    expect(mayStartLevel(progress, { world: 2, level: 2 })).toBe(false);
    expect(mayStartLevel(progress, { world: 3, level: 1 })).toBe(false);
  });

  it('the exemption is the request, not the level', () => {
    // Same level, two requests, two answers — so a sandbox launch cannot leave
    // the level generally startable afterwards.
    const progress = createEmptyProgress();

    expect(mayStartLevel(progress, { world: 1, level: 5, sandbox: true })).toBe(true);
    expect(mayStartLevel(progress, { world: 1, level: 5 })).toBe(false);
  });

  it('the scene routes its handler through the rule', () => {
    // This pins the wiring only. It proves the call is there and that the
    // handler returns early on refusal; it cannot prove the handler runs — the
    // three tests above are what check the decision itself.
    const source = readFileSync('src/game/scenes/LevelSelectScene.ts', 'utf8');
    // Matched on the event name alone, not the whole `subscribe(` call: the
    // handler's signature grows as the payload does, and pinning its exact
    // formatting makes this fail for reasons that have nothing to do with the
    // guard.
    expect(source).toContain("'ui:start-game',");
    expect(source).toContain('if (!this.mayStart(world, level, sandbox)) return;');
    expect(source).toContain('mayStartLevel(progress, { world, level, sandbox })');
  });
});

describe('the world pin is off', () => {
  it('every world is reachable', () => {
    // Was 1. All nine, deliberately: the port has no premium source, and the
    // AS3 contradicts itself — ButtonNextLevel's own local totalWorlds is
    // unconditionally 9 at :104, :194 and :285, so the original offers world 7
    // regardless of the picker's cap.
    expect(SELECTABLE_WORLDS).toBe(WORLD_COUNT);
    expect(WORLD_COUNT).toBe(9);
  });

  it('no scene keeps a private copy of the number', () => {
    for (const file of [
      'src/game/scenes/LevelSelectScene.ts',
      'src/game/scenes/MainMenuScene.ts',
    ]) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/const SELECTABLE_WORLDS\s*=\s*\d/);
      expect(source, file).not.toMatch(/const SELECTED_WORLD\s*=/);
    }
  });

  it("Play's resume scan spans them all", () => {
    // Scanning one world would stop Play at the end of world 1 silently:
    // getCurrentWorldAndLevel returns [0, 0] when everything scanned is played,
    // and the fallback is the last level played.
    const source = readFileSync('src/game/scenes/MainMenuScene.ts', 'utf8');
    expect(source).toContain('getCurrentWorldAndLevel(profile.progress, SELECTABLE_WORLDS)');
  });
});

/**
 * Two views, one screen — the AS3's `selectedWorld = 0` for the picker.
 */
describe('the picker and the grid are one screen', () => {
  const scene = readFileSync('src/game/scenes/LevelSelectScene.ts', 'utf8');

  it('the scene owns which view is showing', () => {
    expect(scene).toContain('private selectedWorld = PICKER;');
    expect(scene).toContain('const PICKER = 0;');
  });

  it('entering the screen shows the picker', () => {
    // `removed()` (:630) resets to the picker, so arriving shows where the
    // player is in the game rather than the last grid they looked at.
    expect(scene).toMatch(/this\.selectedWorld = PICKER;\s*\r?\n\s*this\.publishWorlds\(\);/);
  });

  it('refuses a locked world, silently, as the AS3 does', () => {
    // handleWorldButtons (:1324) tests `clicked && !isLocked` and does nothing
    // otherwise — no message, no shake.
    expect(scene).toContain('if (!isWorldUnlocked(getPlayerProfile(this).progress, world))');
    expect(scene).toContain('Refused locked world');
  });

  it('publishes the level rows only once a world is open', () => {
    expect(scene).toContain('if (world === PICKER) return;');
  });

  it('a difficulty change republishes the grid but not the picker', () => {
    // World tallies show all three tiers at once, so they do not move with the
    // difficulty; the grid's single count does.
    expect(scene).toContain('if (this.selectedWorld !== PICKER) this.publishLevels();');
  });

  it('React renders whichever view the scene names', () => {
    const screen = readFileSync('src/ui/screens/LevelSelectScreen.tsx', 'utf8');
    expect(screen).toContain("const showingPicker = (worldList?.selected ?? 0) === 0;");
    expect(screen).toContain('<WorldPicker />');
    // Back goes up one level of the screen, not straight out.
    expect(screen).toContain("GameEvents.emit('ui:select-world', { world: 0 })");
  });

  it('the bridge carries the world list across', () => {
    const bridge = readFileSync('src/state/bridge.ts', 'utf8');
    expect(bridge).toContain("on('worlds:listed'");
    expect(bridge).toContain('setWorldList(listing)');
  });
});

describe('progress survives a reload', () => {
  const storeName = saveSlotStoreName(ACTIVE_SLOT);

  it('persists a cleared level through the real codec', () => {
    const backend = new MemoryBackend();
    const first = new PlayerProfile(new SaveStore(storeName, backend));

    first.recordLevel(1, 1, 'Easy', 1, true);
    first.save(new Date('2026-01-01T00:00:00Z'));

    const second = new PlayerProfile(new SaveStore(storeName, backend));
    expect(isLevelCleared(second.progress, 1, 1)).toBe(true);
    expect(isLevelUnlocked(second.progress, 1, 2)).toBe(true);
  });

  it('remembers where the player was', () => {
    const backend = new MemoryBackend();
    const first = new PlayerProfile(new SaveStore(storeName, backend));

    first.recordLevel(1, 4, 'Easy', 1, true);
    first.save(new Date('2026-01-01T00:00:00Z'));

    const second = new PlayerProfile(new SaveStore(storeName, backend));
    expect(second.slot.levelSelect.previousLevel).toBe(4);
    expect(second.slot.levelSelect.previousLevelWon).toBe(true);
  });

  it('records a loss without unlocking', () => {
    const backend = new MemoryBackend();
    const first = new PlayerProfile(new SaveStore(storeName, backend));

    first.recordLevel(1, 1, 'Easy', 0, false);
    first.save(new Date('2026-01-01T00:00:00Z'));

    const second = new PlayerProfile(new SaveStore(storeName, backend));
    expect(isLevelCleared(second.progress, 1, 1)).toBe(false);
    expect(second.slot.levelSelect.previousLevelWon).toBe(false);
  });
});

/**
 * **Written before the visible-values model, and kept permanently.**
 *
 * The AS3 reads `worldsValuesVisibleArrays` in its unlock rules
 * (`ScreenLevelSelect.as:841`, `:1518`) — a session-only clone that lags the
 * earned table until `progressLevelButtons` (`:518-545`) has animated the
 * difference. Porting that faithfully means the unlock reads a table that
 * something has to advance.
 *
 * **If it is not advanced, progression stops dead**, and the scoping pass found
 * the failure would be worse than that: it would be *intermittent*.
 * `LevelSelectScene` gates on `mayStartLevel` (`:128`, `:151`), but
 * `GameplayScene.ts:980` handles `ui:start-game` with no gate at all — so the
 * results screen's Next-level button would keep working while level select
 * refused the same level. Two paths, one save, disagreeing.
 *
 * These assertions are the guard against that. They are deliberately written
 * against the *plain* recorded table, so they hold whether or not a second one
 * exists, and they must never be weakened to accommodate the reveal.
 */
describe('a cleared level opens the next one, reveal or no reveal', () => {
  it('opens the next level the moment the result is recorded', () => {
    const progress = recordLevelResult(createEmptyProgress(), 1, 1, 'Easy', 1);

    // The record alone is enough. Nothing about an animation may gate this.
    expect(mayStartLevel(progress, { world: 1, level: 2 })).toBe(true);
    // …and its counterpart on the same table: the level after that stays shut,
    // so "everything is open" cannot satisfy the assertion above.
    expect(mayStartLevel(progress, { world: 1, level: 3 })).toBe(false);
  });

  it('opens the next world on the last level of the previous one', () => {
    const last = LEVELS[0].length;
    const progress = recordLevelResult(createEmptyProgress(), 1, last, 'Easy', 1);

    expect(isWorldUnlocked(progress, 2)).toBe(true);
    expect(isWorldUnlocked(progress, 3)).toBe(false);
  });

  /**
   * The asymmetry itself, stated as an assertion rather than as a comment.
   *
   * Both routes into a level must give the same answer for the same save. The
   * gated one is `mayStartLevel`; the ungated one is `GameplayScene`'s
   * `ui:start-game` handler, which starts whatever it is given. So the property
   * that has to hold is that **the gate says yes** — if it ever says no while
   * the Next button still works, the two have come apart.
   */
  it('agrees with the ungated Next-level route about what is playable', () => {
    const progress = recordLevelResult(createEmptyProgress(), 1, 1, 'Easy', 1);
    const next = nextLevelAfter(1, 1);
    expect(next).not.toBeNull();
    // What the results screen would hand to `ui:start-game`, unchecked.
    expect(mayStartLevel(progress, { world: next!.world, level: next!.level })).toBe(true);
  });
});
