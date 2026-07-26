/**
 * Where "Play" resumes from.
 *
 * `getCurrentWorldAndLevel` is the AS3's own definition and was ported with
 * tests but never called. These cover the shape MainMenuScene uses it in —
 * crucially, that Play and the level-select grid cannot disagree, because both
 * read the same progress table through the same rule.
 */
import { describe, expect, it } from 'vitest';
import {
  createEmptyProgress,
  getCurrentWorldAndLevel,
  isLevelCleared,
  recordLevelResult,
} from './levelProgress';
import { PlayerProfile, ACTIVE_SLOT } from '../player/playerProfile';
import { MemoryBackend, SaveStore, saveSlotStoreName } from '../save/SaveStore';

const SELECTABLE_WORLDS = 1;
const storeName = saveSlotStoreName(ACTIVE_SLOT);

/** What MainMenuScene.publishResumePoint does. */
function resume(profile: PlayerProfile): { world: number; level: number } {
  const [world, level] = getCurrentWorldAndLevel(profile.progress, SELECTABLE_WORLDS);
  return world > 0 && level > 0
    ? { world, level }
    : {
        world: profile.slot.levelSelect.previousWorld || 1,
        level: profile.slot.levelSelect.previousLevel || 1,
      };
}

const fresh = () => new PlayerProfile(new SaveStore(storeName, new MemoryBackend()));

describe('a new player', () => {
  it('resumes at 1-1', () => {
    expect(resume(fresh())).toEqual({ world: 1, level: 1 });
  });
});

describe('after progress', () => {
  it('resumes at the furthest level reached, not level 1', () => {
    const profile = fresh();
    profile.recordLevel(1, 1, 'Easy', 1, true);
    profile.recordLevel(1, 2, 'Easy', 1, true);
    profile.recordLevel(1, 3, 'Easy', 1, true);

    expect(resume(profile)).toEqual({ world: 1, level: 4 });
  });

  it('advances one level per clear', () => {
    const profile = fresh();
    for (let level = 1; level <= 5; level += 1) {
      expect(resume(profile).level).toBe(level);
      profile.recordLevel(1, level, 'Easy', 1, true);
    }
    expect(resume(profile).level).toBe(6);
  });

  it('does not advance on a loss', () => {
    const profile = fresh();
    profile.recordLevel(1, 1, 'Easy', 0, false);
    expect(resume(profile)).toEqual({ world: 1, level: 1 });
  });

  it('skips a gap the way the AS3 does — first unplayed, not highest played', () => {
    // Clearing 3 without 2 leaves 2 as the resume point.
    let progress = createEmptyProgress();
    progress = recordLevelResult(progress, 1, 1, 'Easy', 1);
    progress = recordLevelResult(progress, 1, 3, 'Easy', 1);
    expect(getCurrentWorldAndLevel(progress, SELECTABLE_WORLDS)).toEqual([1, 2]);
  });

  it('survives a reload', () => {
    const backend = new MemoryBackend();
    const first = new PlayerProfile(new SaveStore(storeName, backend));
    first.recordLevel(1, 1, 'Easy', 1, true);
    first.recordLevel(1, 2, 'Easy', 1, true);
    first.save(new Date('2026-01-01T00:00:00Z'));

    const second = new PlayerProfile(new SaveStore(storeName, backend));
    expect(resume(second)).toEqual({ world: 1, level: 3 });
  });
});

describe('agreement with the level grid', () => {
  it('the resume level is always unlocked', () => {
    // Both read the same table: the grid unlocks level N when N-1 is cleared,
    // and the resume point is the first level not yet cleared. So the resume
    // level's predecessor is always cleared, by construction.
    const profile = fresh();
    for (let cleared = 0; cleared < 6; cleared += 1) {
      const point = resume(profile);
      const unlocked =
        point.level === 1 || isLevelCleared(profile.progress, point.world, point.level - 1);
      expect(unlocked, `level ${point.level}`).toBe(true);
      profile.recordLevel(1, point.level, 'Easy', 1, true);
    }
  });
});

describe('when everything in the scanned world is done', () => {
  it('falls back to the last level played rather than 1-1', () => {
    const profile = fresh();
    // 45 levels in world 1; clearing them all leaves nothing unplayed.
    for (let level = 1; level <= 45; level += 1) {
      profile.recordLevel(1, level, 'Easy', 1, true);
    }
    expect(getCurrentWorldAndLevel(profile.progress, SELECTABLE_WORLDS)).toEqual([0, 0]);
    expect(resume(profile)).toEqual({ world: 1, level: 45 });
  });
});
