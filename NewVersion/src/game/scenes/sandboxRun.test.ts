/**
 * A sandbox run must not reach the player's save.
 *
 * Every dev affordance — the enemy Test buttons, the all-enemy level, the dev
 * level jump — sets `sandbox` on `ui:start-game`, and `GameplayScene` gates its
 * whole persistence block on it.
 *
 * This replaces a guarantee that was asserted and untrue. `devLevels.ts` claimed
 * world 0 meant "playing them cannot pollute a save" because `recordLevelResult`
 * no-ops on `progress[-1]`. It did no-op — and the level-end block still banked
 * the run's money into the real profile and wrote `previousWorld: 0` /
 * `previousLevel` / `previousLevelWon` outside it, both persisted. The sentinel
 * never covered those two writes, and covers the dev jump not at all, since that
 * uses real world numbers.
 *
 * ── What these tests are, honestly ────────────────────────────────────────
 * The **bus** half is behavioural: it emits and listens for real.
 *
 * The **scene** half is a source-shape test. `GameplayScene` needs a live Phaser
 * game to construct, so nothing here proves the guard executes — only that the
 * source has the shape that would make it execute. `docs/AUDIT-2026-07.md`
 * records this technique as a known limit rather than as coverage: a
 * source-shape test passes when the source looks right and says nothing about
 * behaviour. It is here because the alternative is no check at all on a rule
 * whose failure is silent and destroys real player data.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { GameEvents } from '../events/GameEvents';

describe('the bus carries the flag', () => {
  it('delivers sandbox to a listener', () => {
    const seen: (boolean | undefined)[] = [];
    const off = GameEvents.subscribe('ui:start-game', ({ sandbox }) => {
      seen.push(sandbox);
    });

    GameEvents.emit('ui:start-game', { world: 1, level: 9, sandbox: true });
    GameEvents.emit('ui:start-game', { world: 1, level: 1 });
    off();

    // Explicit true survives; an ordinary start stays undefined so the scene
    // can distinguish "not a dev run" from "inherit the current run".
    expect(seen).toEqual([true, undefined]);
  });
});

describe('every scene that starts Gameplay forwards the flag', () => {
  // A fifth forwarder is the likely regression: four had to be changed to add
  // this, and a new one defaults to dropping the flag silently.
  const forwarders = [
    'src/game/scenes/MainMenuScene.ts',
    'src/game/scenes/LevelSelectScene.ts',
    'src/game/scenes/EnemiesScene.ts',
  ];

  it.each(forwarders)('%s passes sandbox through to scene.start', (path) => {
    const source = readFileSync(path, 'utf8');
    expect(source).toContain("GameEvents.subscribe('ui:start-game', ({ world, level, sandbox })");
    expect(source).toContain('this.scene.start(SceneKeys.Gameplay, { world, level, sandbox })');
  });

  it('no scene starts Gameplay without passing sandbox', () => {
    for (const path of forwarders) {
      const source = readFileSync(path, 'utf8');
      // The old shape, which silently dropped it.
      expect(source, path).not.toContain(
        'this.scene.start(SceneKeys.Gameplay, { world, level })',
      );
    }
  });
});

describe('GameplayScene keeps a sandbox run out of the profile', () => {
  const source = readFileSync('src/game/scenes/GameplayScene.ts', 'utf8');

  function persistBlock(): string {
    const start = source.indexOf('if (this.outcome.finished && !this.banked)');
    expect(start).toBeGreaterThan(-1);
    // Ends where the next top-level statement in the method begins, rather than
    // at a character count that quietly truncates past the last writer.
    const end = source.indexOf('\n    if (this.outcome.finished) {', start);
    expect(end).toBeGreaterThan(start);
    return source.slice(start, end);
  }

  it('reads the flag off the scene data', () => {
    expect(source).toContain('this.sandbox = data.sandbox === true');
  });

  it('guards every write with one check, not three', () => {
    const body = persistBlock();
    const guard = body.indexOf('if (!this.sandbox)');
    expect(guard).toBeGreaterThan(-1);

    // All three writers sit behind it. Matched against calls, not prose.
    for (const write of ['this.profile.setUpgrades(', 'this.profile.recordLevel(', 'this.profile.save()']) {
      const at = body.indexOf(write);
      expect(at, write).toBeGreaterThan(guard);
    }
  });

  it('latches `banked` outside the guard', () => {
    // Otherwise a sandbox run re-enters the block every frame forever.
    const body = persistBlock();
    expect(body.indexOf('this.banked = true')).toBeLessThan(body.indexOf('if (!this.sandbox)'));
  });

  it('keeps the flag across a retry and a Next level', () => {
    expect(source).toContain(
      'this.scene.restart({ world: this.world, level: this.level, sandbox: this.sandbox })',
    );
    // Next level inherits when the emitter does not say — the Hud cannot know.
    expect(source).toContain('sandbox: sandbox ?? this.sandbox');
  });
});

describe('every dev entry point sets it', () => {
  const entries: [string, string][] = [
    ['src/ui/screens/EnemiesScreen.tsx', 'the per-type Test buttons'],
    ['src/ui/screens/MainMenuScreen.tsx', 'the all-enemy dev level'],
    ['src/ui/screens/LevelSelectScreen.tsx', 'the dev level jump'],
  ];

  it.each(entries)('%s (%s) emits sandbox: true', (path) => {
    expect(readFileSync(path, 'utf8')).toContain('sandbox: true');
  });

  it('the dev jump is behind the DEV guard', () => {
    const source = readFileSync('src/ui/screens/LevelSelectScreen.tsx', 'utf8');
    expect(source).toContain('{import.meta.env.DEV && <DevLevelJump />}');
  });
});
