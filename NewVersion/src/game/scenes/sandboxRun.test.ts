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

    GameEvents.emit('ui:start-game', { world: 1, level: 9, difficulty: 'Easy', sandbox: true });
    GameEvents.emit('ui:start-game', { world: 1, level: 1, difficulty: 'Easy' });
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
    // Destructured off the event, then handed on. `difficulty` joined the
    // payload later and must ride the same route: a forwarder that drops it
    // silently plays the run on the fallback and banks to the wrong slot.
    expect(source).toContain("({ world, level, difficulty, sandbox, equipped })");
    expect(source).toContain(
      'this.scene.start(SceneKeys.Gameplay, { world, level, difficulty, sandbox, equipped })',
    );
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

describe('GameplayScene hands the flag to the banker', () => {
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

  // What the rule *does* is covered behaviourally in
  // player/levelBanking.test.ts, against a real profile over real storage.
  // These only pin the two things that live in the scene and nowhere else:
  // where the flag comes from, and that it survives the routes back in here.

  it('reads the flag off the scene data', () => {
    expect(source).toContain('this.sandbox = data.sandbox === true');
  });

  it('passes it to bankLevelOutcome rather than writing inline', () => {
    const body = persistBlock();
    expect(body).toContain('bankLevelOutcome(this.profile, {');
    expect(body).toContain('sandbox: this.sandbox');
    // The writes must not have crept back into the scene alongside the call.
    expect(body).not.toContain('this.profile.setUpgrades(');
    expect(body).not.toContain('this.profile.save()');
  });

  it('latches `banked` before it calls out', () => {
    // Otherwise a sandbox run re-enters the block every frame forever.
    const body = persistBlock();
    expect(body.indexOf('this.banked = true')).toBeLessThan(body.indexOf('bankLevelOutcome('));
  });

  it('keeps the flag across a retry and a Next level', () => {
    // A retry replays the same run, so every field comes off the scene.
    for (const field of [
      'world: this.world',
      'level: this.level',
      'difficulty: this.difficulty',
      'sandbox: this.sandbox',
      'equipped: this.equipped',
    ]) {
      expect(source, field).toContain(field);
    }
    // Next level inherits when the emitter does not say — the Hud cannot know.
    expect(source).toContain('sandbox: sandbox ?? this.sandbox');
  });

  it('honours `equipped` only alongside `sandbox`', () => {
    // The safety property. `equipped` swaps the run's upgrades for a maxed set;
    // the only thing keeping that out of the save is that a sandbox run never
    // banks. Honouring it on its own would hand a maxed profile straight to
    // bankLevelOutcome, which would then persist it.
    expect(source).toContain('this.sandbox && this.equipped');
    // And it must never be the sole condition.
    expect(source).not.toMatch(/[^&]\bif \(this\.equipped\)/);
  });
});

describe('every dev entry point sets it', () => {
  /**
   * `MainMenuScreen` left this list in T164, and the removal is the point
   * rather than an exemption: the menu's all-enemy dev button is **gone**, so
   * there is no entry point there to guard. The counterpart below is what
   * keeps that honest — if the menu ever starts a run again, it has to come
   * back onto this list.
   */
  const entries: [string, string][] = [
    ['src/ui/screens/EnemiesScreen.tsx', 'the per-type Test buttons'],
    // `LevelSelectScreen.tsx` left in T172 for the same reason the menu did:
    // its dev level jump is gone, so there is no entry point there to guard.
    // Its counterpart is below.
  ];

  it.each(entries)('%s (%s) emits sandbox: true', (path) => {
    expect(readFileSync(path, 'utf8')).toContain('sandbox: true');
  });

  /**
   * The menu starts exactly one run — the player's, from PLAY — and it must
   * **not** be sandboxed, or a real game would never bank. Any *other*
   * `ui:start-game` there would be a dev jump that this list no longer covers.
   */
  it('the menu starts one real run and no dev ones', () => {
    const source = readFileSync('src/ui/screens/MainMenuScreen.tsx', 'utf8');
    const starts = source.match(/ui:start-game/g) ?? [];

    expect(starts).toHaveLength(1);
    expect(source).not.toContain('sandbox: true');
  });

  /**
   * Level select has **one** `ui:start-game` emitter — `PLAY LEVEL` — and it is
   * the player's, un-sandboxed.
   *
   * It was two until T173: the grid tile launched a level directly (`A8`), and
   * reversing that decision left this the only route in. The dev jump that
   * used to sit here went in T172. So, as with the menu, this keeps the
   * shortened list honest — a second emitter now is either a revert of `A8` or
   * a dev route the list no longer covers, and both deserve a look.
   */
  it('level select starts only real runs, from one place', () => {
    const source = readFileSync('src/ui/screens/LevelSelectScreen.tsx', 'utf8');
    const starts = source.match(/ui:start-game/g) ?? [];

    expect(starts).toHaveLength(1);
    expect(source).not.toContain('sandbox: true');
    expect(source).not.toContain('import.meta.env.DEV');
  });
});
