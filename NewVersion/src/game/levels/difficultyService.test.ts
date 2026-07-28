/**
 * The difficulty selector's wiring.
 *
 * The decision logic is pure and tested in `difficultyOption.test.ts`; this
 * covers the two things that only exist at the seam — that a press reaches both
 * stores, and that the `DifficultyChosen` hint is consumed by a *change* rather
 * than by any press at all.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createInitialMainFlags, isHintDone, shouldShowHint } from '../onboarding/mainFlags';
import { createInitialTutorialState } from '../tutorial/tutorialState';
import { createEmptyProgress, recordLevelResult } from './levelProgress';
import { PlayerProfile } from '../player/playerProfile';
import { ACTIVE_SLOT } from '../player/playerProfile';
import { MemoryBackend, SaveStore, saveSlotStoreName } from '../save/SaveStore';
import { useGameStore } from '../../state/gameStore';

const profile = (backend = new MemoryBackend()) =>
  new PlayerProfile(new SaveStore(saveSlotStoreName(ACTIVE_SLOT), backend));

describe('the DifficultyChosen hint', () => {
  it('starts unconsumed', () => {
    expect(isHintDone(createInitialMainFlags(), 'DifficultyChosen')).toBe(false);
  });

  it('is consumed once, and marking again is a no-op', () => {
    const p = profile();

    expect(p.markUiHint('DifficultyChosen')).toBe(true);
    expect(isHintDone(p.mainFlags, 'DifficultyChosen')).toBe(true);
    // The second call reports "nothing changed", which is what lets the caller
    // skip re-encoding the whole slot.
    expect(p.markUiHint('DifficultyChosen')).toBe(false);
  });

  it('survives a reload', () => {
    const backend = new MemoryBackend();
    const first = profile(backend);
    first.markUiHint('DifficultyChosen');
    first.save(new Date('2026-01-01T00:00:00Z'));

    expect(isHintDone(profile(backend).mainFlags, 'DifficultyChosen')).toBe(true);
  });

  it('is only consumed on a real change, not on any press', () => {
    // `ButtonGameDifficulty.as:40-43` puts the flag write inside
    // `if (currentFrame != 3)` — the frame meaning "already selected". So
    // re-pressing the active difficulty leaves the hint pending.
    const source = readFileSync('src/game/levels/difficultyService.ts', 'utf8');
    const body = source.slice(source.indexOf('export function chooseDifficulty'));

    // The guard, and the marking inside it.
    expect(body).toContain('const changed = readDifficulty(store) !== difficulty;');
    expect(body.indexOf('if (changed) {')).toBeLessThan(body.indexOf("markUiHint('DifficultyChosen')"));
    // The option write is *outside* the guard: an unchanged press still turns a
    // default into an explicit choice.
    expect(body.indexOf('writeDifficulty(store, difficulty);')).toBeLessThan(
      body.indexOf('if (changed) {'),
    );
  });
});

describe('when the hint would show', () => {
  const flags = createInitialMainFlags();
  const early = createEmptyProgress();
  // Four levels of world 1 cleared, so `getCurrentWorldAndLevel` reports 1-5.
  const later = [1, 2, 3, 4].reduce(
    (p, level) => recordLevelResult(p, 1, level, 'Easy', 1),
    createEmptyProgress(),
  );

  it('needs the tutorial running — so never, today', () => {
    // `TutorialState.on` is false and nothing turns it on yet. Faithful rather
    // than stubbed: the *flag* is still recorded, so a player who picks now is
    // not shown the hint when the tutorial does land.
    expect(createInitialTutorialState().on).toBe(false);
    expect(
      shouldShowHint(flags, 'DifficultyChosen', {
        tutorialOn: false,
        currentWorldAndLevel: [1, 5],
      }),
    ).toBe(false);
  });

  it('needs world > 1 or level >= 4 once it is running', () => {
    // ScreenLevelSelect.as:1029 — the same gate the Pause tutorial uses.
    const at = (currentWorldAndLevel: readonly [number, number]) =>
      shouldShowHint(flags, 'DifficultyChosen', { tutorialOn: true, currentWorldAndLevel });

    expect(at([1, 1])).toBe(false);
    expect(at([1, 3])).toBe(false);
    expect(at([1, 4])).toBe(true);
    expect(at([2, 1])).toBe(true);
  });

  it('stops once the hint is done', () => {
    const done = { ...flags, uiHints: { ...flags.uiHints, DifficultyChosen: true } };
    expect(
      shouldShowHint(done, 'DifficultyChosen', { tutorialOn: true, currentWorldAndLevel: [2, 1] }),
    ).toBe(false);
  });

  it('reads the live progress rather than a constant', () => {
    // Guards against the service pinning [1, 1] and making the gate unreachable.
    const source = readFileSync('src/game/levels/difficultyService.ts', 'utf8');
    expect(source).toContain('currentWorldAndLevel: getCurrentWorldAndLevel(');
    expect(source).toContain('tutorialOn: profile.tutorial.on');
    expect(early).not.toEqual(later);
  });
});

/**
 * The wiring the compiler cannot check.
 *
 * `difficulty` became required on `ui:start-game`, so every *emitter* is a
 * compile error if it forgets. Publishing and forwarding are not — a scene that
 * never publishes leaves React on the store default forever.
 */
describe('every screen that can launch sees the difficulty', () => {
  it('the two scenes that host launch buttons publish it', () => {
    for (const path of [
      'src/game/scenes/MainMenuScene.ts',
      'src/game/scenes/LevelSelectScene.ts',
    ]) {
      expect(readFileSync(path, 'utf8'), path).toContain('publishDifficulty(this)');
    }
  });

  it('the picker is only wired where the AS3 has it', () => {
    // ButtonGameDifficulty appears on LevelSelect, Options and Status. Only the
    // first exists here, so only that scene handles the press.
    expect(readFileSync('src/game/scenes/LevelSelectScene.ts', 'utf8')).toContain(
      "GameEvents.subscribe('ui:set-difficulty'",
    );
  });

  it('a change republishes the grid, not just the buttons', () => {
    // The medal counts are per-difficulty, so leaving the rows alone would show
    // Easy medals under a Hard label.
    const source = readFileSync('src/game/scenes/LevelSelectScene.ts', 'utf8');
    const handler = source.slice(source.indexOf("'ui:set-difficulty'"));
    expect(handler.indexOf('this.publishLevels();')).toBeGreaterThan(
      handler.indexOf('chooseDifficulty(this, difficulty);'),
    );
  });

  it('the bridge turns the event into store state', () => {
    const bridge = readFileSync('src/state/bridge.ts', 'utf8');
    expect(bridge).toContain("on('difficulty:changed'");
    expect(bridge).toContain('setDifficulty({ difficulty, hintPending })');
  });

  it('a new run does not reset it', () => {
    // `reset()` clears `initialRunState`. Difficulty is a preference and sits
    // outside it, beside audioOptions — inside, the Next-level button would
    // quietly fall back to Easy the moment a level started.
    useGameStore.getState().setDifficulty({ difficulty: 'Hard', hintPending: false });
    useGameStore.getState().reset();

    expect(useGameStore.getState().difficulty).toBe('Hard');
    expect(useGameStore.getState().difficultyHintPending).toBe(false);
  });

  it('React echoes it rather than deciding it', () => {
    // Same rule as `menu:resume-point`: the scene owns the value, React hands
    // it straight back. A screen computing its own would be a second source of
    // truth for which progress slot a result lands in.
    for (const path of [
      'src/ui/screens/MainMenuScreen.tsx',
      'src/ui/screens/LevelSelectScreen.tsx',
      'src/ui/screens/EnemiesScreen.tsx',
      'src/ui/Hud.tsx',
    ]) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).toContain('useGameStore((s) => s.difficulty)');
    }
  });
});

describe('the pin is gone', () => {
  it('GameplayScene reads the run difficulty instead of a constant', () => {
    const source = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

    expect(source).toContain('this.difficulty = data.difficulty ?? FALLBACK_DIFFICULTY;');
    // The old pin, and the three sites that read it.
    expect(source).not.toContain("const DIFFICULTY: Difficulty = 'Easy'");
    expect(source).not.toMatch(/\bdifficulty: DIFFICULTY\b/);
    expect(source).not.toMatch(/getDifficultyProfile\(DIFFICULTY\)/);
  });

  it('the fallback is the same value an unset preference gives', () => {
    // So a launch that bypasses the event plays and banks identically to one
    // that names the default.
    const source = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');
    expect(source).toContain('const FALLBACK_DIFFICULTY: Difficulty = DEFAULT_DIFFICULTY;');
  });

  it('the enemy carries it, so leading is per-run', () => {
    const enemy = readFileSync('src/game/entities/Enemy.ts', 'utf8');
    expect(enemy).toContain('this.difficulty = config.difficulty;');
    expect(enemy).toContain('difficulty: this.difficulty,');
  });
});
