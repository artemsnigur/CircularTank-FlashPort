/**
 * The unlock rule and progress recording, as LevelSelect and Gameplay use them.
 *
 * `levelProgress` had 34 passing tests and was called by nothing; these cover
 * the shape the scenes actually consume.
 */
import { describe, expect, it } from 'vitest';
import {
  createEmptyProgress,
  isLevelCleared,
  recordLevelResult,
} from './levelProgress';
import { LEVELS } from './levelData';
import { PlayerProfile } from '../player/playerProfile';
import { MemoryBackend, SaveStore, saveSlotStoreName } from '../save/SaveStore';
import { ACTIVE_SLOT } from '../player/playerProfile';

/** `ScreenLevelSelect.as:842` — locked when the previous level scored nothing. */
const isUnlocked = (progress: ReturnType<typeof createEmptyProgress>, world: number, level: number) =>
  level === 1 || isLevelCleared(progress, world, level - 1);

describe('the unlock rule', () => {
  it('opens only level 1 on a fresh save', () => {
    const progress = createEmptyProgress();
    expect(isUnlocked(progress, 1, 1)).toBe(true);
    expect(isUnlocked(progress, 1, 2)).toBe(false);
    expect(isUnlocked(progress, 1, 3)).toBe(false);
  });

  it('opens the next level once one is cleared', () => {
    let progress = createEmptyProgress();
    progress = recordLevelResult(progress, 1, 1, 'Easy', 1);

    expect(isUnlocked(progress, 1, 2)).toBe(true);
    // Only the next one — not the whole world.
    expect(isUnlocked(progress, 1, 3)).toBe(false);
  });

  it('unlocks strictly one at a time across a run', () => {
    let progress = createEmptyProgress();
    for (let level = 1; level <= 5; level += 1) {
      expect(isUnlocked(progress, 1, level)).toBe(true);
      expect(isUnlocked(progress, 1, level + 1)).toBe(false);
      progress = recordLevelResult(progress, 1, level, 'Easy', 1);
    }
    expect(isUnlocked(progress, 1, 6)).toBe(true);
  });

  it('counts a clear on any difficulty', () => {
    for (const difficulty of ['Easy', 'Medium', 'Hard'] as const) {
      const progress = recordLevelResult(createEmptyProgress(), 1, 1, difficulty, 1);
      expect(isUnlocked(progress, 1, 2)).toBe(true);
    }
  });

  it('a loss scores nothing and unlocks nothing', () => {
    // Gameplay records 0 on a loss; recordLevelResult only ever raises a slot.
    const progress = recordLevelResult(createEmptyProgress(), 1, 1, 'Easy', 0);
    expect(isLevelCleared(progress, 1, 1)).toBe(false);
    expect(isUnlocked(progress, 1, 2)).toBe(false);
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
    expect(() => isUnlocked(progress, 1, world1.length)).not.toThrow();
    expect(isLevelCleared(progress, 1, world1.length)).toBe(false);
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
    expect(isUnlocked(second.progress, 1, 2)).toBe(true);
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
