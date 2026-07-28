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
import { createEmptyProgress, isLevelCleared, recordLevelResult } from './levelProgress';
import {
  isLevelUnlocked,
  isWorldUnlocked,
  levelUnlockStates,
  mayStartLevel,
  SELECTABLE_WORLDS,
} from './levelUnlock';
import { LEVELS, levelsInWorld, WORLD_COUNT } from './levelData';
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

describe('one pin for how many worlds are reachable', () => {
  it('is a single exported constant', () => {
    // Previously two: LevelSelectScene.SELECTED_WORLD and
    // MainMenuScene.SELECTABLE_WORLDS, agreeing only by convention. Nothing
    // made them agree, and disagreeing would have let Play launch a level the
    // grid cannot show.
    expect(SELECTABLE_WORLDS).toBeGreaterThanOrEqual(1);
    expect(SELECTABLE_WORLDS).toBeLessThanOrEqual(WORLD_COUNT);

    for (const file of [
      'src/game/scenes/LevelSelectScene.ts',
      'src/game/scenes/MainMenuScene.ts',
    ]) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).toContain("from '../levels/levelUnlock'");
      expect(source, file).not.toMatch(/const SELECTABLE_WORLDS\s*=\s*\d/);
    }
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
