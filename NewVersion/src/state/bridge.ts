/**
 * Translates GameEvents into Zustand store updates.
 *
 * This is the *only* place that maps an event onto HUD state, so when a
 * counter is wrong there is exactly one file to read.
 *
 * `attachStoreBridge()` is idempotent and returns a detach function. It is
 * installed from `main.tsx` at module scope rather than from a component,
 * because the bridge must be listening before the first scene boots — and
 * must not be re-installed by React StrictMode's double effect invocation.
 */
import { GameEvents } from '../game/events/GameEvents';
import type { GameEventHandler, GameEventName } from '../game/events/GameEvents';
import { useGameStore } from './gameStore';
import { getAchievement } from '../game/achievements/achievementState';

let detach: (() => void) | null = null;

export function attachStoreBridge(): () => void {
  if (detach) return detach;

  const store = useGameStore;
  const unsubscribers: Array<() => void> = [];
  const on = <K extends GameEventName>(event: K, handler: GameEventHandler<K>): void => {
    unsubscribers.push(GameEvents.subscribe(event, handler));
  };

  /* ── Loading ───────────────────────────────────────────────────────────── */
  on('boot:stage', ({ stage }) => {
    store.getState().setStage(stage);
  });

  on('preload:progress', ({ value }) => {
    store.getState().setProgress(value);
    if (store.getState().phase !== 'loading') store.getState().setPhase('loading');
  });

  on('preload:complete', () => {
    store.getState().setProgress(1);
    store.getState().setStage('ready');
    store.getState().setPhase('ready');
  });

  on('preload:error', ({ file, reason }) => {
    store.getState().setLoadError(`${file}: ${reason}`);
  });

  on('boot:fonts-ready', ({ reports }) => {
    store.getState().setFonts(reports);
  });

  /* ── Scene lifecycle ───────────────────────────────────────────────────── */
  on('scene:ready', ({ key }) => {
    store.getState().setActiveScene(key);
  });

  on('scene:shutdown', ({ key }) => {
    // Only clear if this is still the scene we think is active; a fast
    // transition can deliver shutdown(A) after ready(B).
    if (store.getState().activeScene === key) store.getState().setActiveScene(null);
  });

  /* ── Gameplay -> HUD ───────────────────────────────────────────────────── */
  on('currency:earned', ({ total }) => {
    // Trust the scene's running total rather than accumulating here, so a
    // dropped event cannot desync the HUD permanently.
    store.getState().setCurrency(total);
  });

  on('player:damaged', ({ health, maxHealth }) => {
    store.getState().setHealth(health, maxHealth);
  });

  on('player:healed', ({ health, maxHealth }) => {
    store.getState().setHealth(health, maxHealth);
  });

  on('reload:changed', ({ primary, secondary, weapon, secondaryName }) => {
    store.getState().setReload(primary, secondary, weapon, secondaryName);
  });

  on('countdown:changed', (panel) => {
    store.getState().setCountdown(panel);
  });

  on('menu:resume-point', (point) => {
    store.getState().setResumePoint(point);
  });

  on('upgrades:listed', (catalogue) => {
    store.getState().setShop(catalogue);
  });

  on('level-guide:changed', (guide) => {
    store.getState().setLevelGuide(guide);
  });

  on('bestiary:listed', (listing) => {
    store.getState().setBestiary(listing);
  });

  on('levels:listed', (listing) => {
    store.getState().setLevelList(listing);
  });

  on('worlds:listed', (listing) => {
    store.getState().setWorldList(listing);
  });

  on('save:slots', ({ slots }) => {
    store.getState().setSlotList(slots);
  });

  // The pause flag is mirrored here like any other gameplay value, even though
  // its emitter is React rather than a scene: the bus is the channel either
  // way, and a second path would be a second source of truth.
  on('ui:pause', ({ paused }) => {
    store.getState().setPaused(paused);
  });

  on('ui:slot-picker', ({ open }) => {
    store.getState().setSlotPickerOpen(open);
  });

  on('level:ended', (summary) => {
    store.getState().endLevel(summary);

    // Real achievements, announced once at level end. The toast used to carry
    // two invented ids fired from the coin pickup path; see GameplayScene.
    for (const id of summary.newAchievements) {
      const spec = getAchievement(id);
      if (spec) store.getState().pushAchievement({ id, title: spec.title, at: Date.now() });
    }
  });

  on('wave:changed', ({ wave, enemiesRemaining, mode, flagsRemaining }) => {
    store.getState().setWave(wave, enemiesRemaining, mode, flagsRemaining);
  });

  on('achievement:unlocked', ({ id, title }) => {
    store.getState().pushAchievement({ id, title, at: Date.now() });
  });

  /* ── Diagnostics ───────────────────────────────────────────────────────── */
  on('viewport:changed', (viewport) => {
    store.getState().setViewport(viewport);
  });

  on('achievements:listed', (achievements) => {
    useGameStore.setState({ achievementBoard: achievements });
  });

  on('options:changed', (options) => {
    useGameStore.setState({ gameplayOptions: options });
  });

  on('audio:options', ({ soundOn, musicOn, soundVol, musicVol }) => {
    useGameStore.getState().setAudioOptions({ soundOn, musicOn, soundVol, musicVol });
  });

  on('difficulty:changed', ({ difficulty, hintPending }) => {
    useGameStore.getState().setDifficulty({ difficulty, hintPending });
  });

  on('audio:selftest', (report) => {
    store.getState().setAudioReport(report);
  });

  on('debug:fps', ({ fps }) => {
    store.getState().setFps(fps);
  });

  detach = () => {
    for (const off of unsubscribers) off();
    unsubscribers.length = 0;
    detach = null;
  };

  return detach;
}

/** Test helper: tears the bridge down so each test starts clean. */
export function detachStoreBridge(): void {
  detach?.();
}
