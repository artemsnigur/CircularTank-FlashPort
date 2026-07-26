/**
 * Boot must hand off to Preload, whatever happens.
 *
 * This is the invariant `BootScene.ts` states in capitals and `CLAUDE.md`
 * repeats — and until now it was defended by a comment saying "do not add a
 * bare `await` to this method". It guards a failure that has already happened
 * once: Phaser does not await `create()`, so a rejected promise there is
 * unhandled, the game strands on Boot, and the UI shows "Loading" forever with
 * no error anywhere. Silent, total, and invisible to every other test.
 *
 * ── Driving the scene without a Phaser game ──────────────────────────────
 * `BootScene` is unusually testable for a scene: `create()` touches exactly
 * three things Phaser injects — `game.registry` (via `getViewportController`),
 * `cameras.main` (via `applyViewportToScene`, which returns early when absent)
 * and `scene.start`. All three are stubbed below, so this drives the real
 * `create()` and the real `boot()` rather than asserting on source text.
 *
 * ── What this does NOT cover, stated rather than implied ─────────────────
 *  - That Phaser calls `create()` at all, or that `scene.start(Preload)`
 *    actually transitions in a live game. Both are Phaser's contract.
 *  - The `void this.boot()` fire-and-forget shape. A future edit adding
 *    `await` before it would still pass here, because these tests await the
 *    microtask queue themselves. That is the one part of the invariant still
 *    held by the comment, and it is why the comment stays.
 *  - `getViewportController` returning a real controller; it is null here.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { GameEvents } from '../events/GameEvents';
import { SceneKeys } from '../config/constants';

vi.mock('../text/fontLoader', () => ({
  loadGameFonts: vi.fn(),
}));

const { loadGameFonts } = await import('../text/fontLoader');
const mockedLoadFonts = vi.mocked(loadGameFonts);

/** A BootScene with the three Phaser-injected members it touches. */
function bootable(): { scene: BootScene; started: string[] } {
  const scene = new BootScene();
  const started: string[] = [];

  Object.defineProperty(scene, 'scene', {
    value: { start: (key: string) => started.push(key) },
    configurable: true,
  });
  Object.defineProperty(scene, 'game', {
    value: { registry: { get: () => undefined } },
    configurable: true,
  });
  // applyViewportToScene returns early when there is no camera, which is the
  // path taken here — the viewport is not what this file is about.
  Object.defineProperty(scene, 'cameras', { value: {}, configurable: true });

  return { scene, started };
}

/** Lets `boot()`'s promise chain and its `finally` run to completion. */
const settle = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
};

afterEach(() => {
  vi.clearAllMocks();
});

describe('the handoff happens whatever the font stage does', () => {
  it('starts Preload when fonts resolve', async () => {
    mockedLoadFonts.mockResolvedValue([]);
    const { scene, started } = bootable();

    scene.create();
    await settle();

    expect(started).toEqual([SceneKeys.Preload]);
  });

  it('starts Preload when loadGameFonts REJECTS', async () => {
    // The case the invariant exists for. loadGameFonts is contractually
    // non-rejecting and has its own tests pinning that, so reaching the catch
    // means something unforeseen broke — and the handoff must survive it.
    mockedLoadFonts.mockRejectedValue(new Error('font subsystem exploded'));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { scene, started } = bootable();

    scene.create();
    await settle();

    expect(started).toEqual([SceneKeys.Preload]);
    expect(errors).toHaveBeenCalled();
    errors.mockRestore();
  });

  it('starts Preload when loadGameFonts throws synchronously', async () => {
    mockedLoadFonts.mockImplementation(() => {
      throw new Error('threw before returning a promise');
    });
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { scene, started } = bootable();

    scene.create();
    await settle();

    expect(started).toEqual([SceneKeys.Preload]);
    errors.mockRestore();
  });

  it('never leaves create() rejecting, whatever boot() does', async () => {
    // Phaser does not await create(), so a rejection here is unhandled and
    // silent. `create()` must return undefined, not a promise.
    mockedLoadFonts.mockRejectedValue(new Error('boom'));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
    const { scene } = bootable();

    expect(scene.create()).toBeUndefined();
    await settle();
    errors.mockRestore();
  });

  it('hands off exactly once', async () => {
    mockedLoadFonts.mockResolvedValue([]);
    const { scene, started } = bootable();

    scene.create();
    await settle();
    await settle();

    expect(started).toHaveLength(1);
  });
});

describe('the stages the loading screen reads', () => {
  it('emits fonts then assets, and fonts-ready even on failure', async () => {
    mockedLoadFonts.mockRejectedValue(new Error('boom'));
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

    const stages: string[] = [];
    const offStage = GameEvents.subscribe('boot:stage', ({ stage }) => stages.push(stage));
    let fontsReady = 0;
    const offFonts = GameEvents.subscribe('boot:fonts-ready', () => (fontsReady += 1));

    const { scene } = bootable();
    scene.create();
    await settle();

    offStage();
    offFonts();
    errors.mockRestore();

    // 'assets' is emitted in the same `finally` as the handoff, so a missing
    // stage label and a stranded boot are the same defect.
    expect(stages).toEqual(['fonts', 'assets']);
    // The error screen and the diagnostics panel both key off this; swallowing
    // it on failure would leave the loading screen mid-sentence.
    expect(fontsReady).toBe(1);
  });
});

describe('the scene is registered where Phaser will find it', () => {
  it('declares the Boot key', () => {
    // A scene with the wrong key is registered and never started, which looks
    // exactly like a stranded boot from the outside.
    expect(new BootScene()).toBeInstanceOf(Phaser.Scene);
    expect(SceneKeys.Boot).toBe('Boot');
  });
});
