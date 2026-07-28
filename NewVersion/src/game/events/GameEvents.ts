/**
 * The single channel between Phaser and React.
 *
 * Phaser's own `EventEmitter` (an EventEmitter3 fork) backs this, so it is the
 * same emitter the engine uses internally — no second event system, no
 * polling, no `requestAnimationFrame` loop in React reading game state.
 *
 * Direction of travel:
 *   Phaser scene  --emit-->  GameEvents  --> state/bridge.ts --> Zustand --> React
 *   React UI      --emit-->  GameEvents  --> scene listener  --> gameplay
 *
 * React must never reach into a Scene instance directly; a scene can be torn
 * down and rebuilt at any time, and a stale reference is a memory leak that
 * only shows up after twenty level restarts.
 */
import Phaser from 'phaser';
import type { Difficulty, SceneKey } from '../config/constants';
import type { LevelResult } from '../waves/levelOutcome';
import type { LevelRef } from '../levels/levelProgress';

export interface AudioTrackReport {
  key: string;
  file: string;
  /** Duration the browser's decoder produced, in seconds. */
  decodedDuration: number;
  /** Duration derived from the MP3 frame headers by the offline audit. */
  expectedDuration: number;
  /** decoded - expected, in milliseconds. */
  driftMs: number;
  /** Silence before the first sample above -60 dBFS, in milliseconds. */
  leadingSilenceMs: number;
  /** Silence after the last sample above -60 dBFS, in milliseconds. */
  trailingSilenceMs: number;
  /** Peak absolute sample value, 0..1. */
  peak: number;
  /**
   * Mean sample value. A non-zero DC offset makes a clip audibly "thump" when
   * it starts and stops — a classic symptom of a truncated MP3 frame.
   */
  dcOffset: number;
  /**
   * |first sample - last sample| for looping clips. A large discontinuity at
   * the loop seam is heard as a click on every repeat.
   */
  loopSeamDelta: number | null;
  /** Whether playback actually started (checked against the audio clock). */
  playbackConfirmed: boolean;
  verdict: 'ok' | 'warn' | 'fail';
  notes: string[];
}

export interface AudioSelfTestReport {
  /** 'webaudio' | 'html5' | 'none' — Phaser picks this based on the device. */
  backend: string;
  /** False until the user has interacted; browsers block audio before that. */
  unlocked: boolean;
  sampleRate: number;
  tracks: AudioTrackReport[];
  verdict: 'ok' | 'warn' | 'fail';
}

/** Startup stages, in order. Surfaced by the loading screen. */
export type BootStage = 'fonts' | 'assets' | 'ready';

export interface FontReport {
  family: string;
  file: string;
  /** document.fonts reported the face as loaded. */
  loaded: boolean;
  /** Measured width differs from the fallback -> the face really is in use. */
  distinctFromFallback: boolean;
  measuredWidth: number;
  fallbackWidth: number;
}

/**
 * Every event that crosses the boundary, with its payload type.
 * Adding a member here is the only way to add an event — that is the point.
 */
export interface GameEventMap {
  /* ── Loading ─────────────────────────────────────────────────────────── */
  /**
   * Coarse progress through startup. Exists so a stall is diagnosable: the
   * loading screen names the stage it is stuck on rather than showing an
   * anonymous spinner.
   */
  'boot:stage': { stage: BootStage };
  'boot:fonts-ready': { reports: FontReport[] };
  'preload:progress': { value: number };
  'preload:complete': { durationMs: number; assetCount: number };
  'preload:error': { file: string; reason: string };

  /* ── Scene lifecycle ─────────────────────────────────────────────────── */
  'scene:ready': { key: SceneKey };
  'scene:shutdown': { key: SceneKey };

  /* ── Gameplay -> HUD ─────────────────────────────────────────────────── */
  'currency:earned': { amount: number; total: number };
  'player:damaged': { amount: number; health: number; maxHealth: number };
  'player:healed': { amount: number; health: number; maxHealth: number };
  'ammo:changed': { current: number; capacity: number; weapon: string };
  'wave:changed': {
    wave: number;
    enemiesRemaining: number;
    /** Level mode, so the HUD knows which counters are meaningful. */
    mode: string;
    /** Flags still to capture; only meaningful on a Flag level. */
    flagsRemaining: number;
  };
  'achievement:unlocked': { id: string; title: string };
  /**
   * A level has ended and the results should be shown.
   *
   * Fired after the AS3's grace period, not the instant the last enemy dies —
   * see waves/levelOutcome.ts.
   */
  'level:ended': {
    result: LevelResult;
    world: number;
    level: number;
    kills: number;
    currency: number;
    /**
     * The level to offer next, or null when there is none.
     *
     * Carries the coordinates rather than a boolean so the overlay does no
     * arithmetic of its own. It previously received `hasNextLevel` and derived
     * the target as `level + 1`, which duplicated the progression rule in the
     * view and got it wrong at a world boundary — the flag and the button
     * could disagree. The scene owns the level tables and the unlock rule, so
     * it hands over the answer.
     *
     * Null after a loss: losing records no value, so the next level stays
     * locked and offering to start it would bypass the rule.
     */
    nextLevel: LevelRef | null;
  };

  /* ── Diagnostics ─────────────────────────────────────────────────────── */
  'viewport:changed': {
    cssWidth: number;
    cssHeight: number;
    zoom: number;
    logicalWidth: number;
    logicalHeight: number;
    pixelRatio: number;
  };
  'audio:selftest': AudioSelfTestReport;
  'debug:fps': { fps: number };

  /* ── React -> Phaser ─────────────────────────────────────────────────── */
  /**
   * Start a level.
   *
   * `sandbox` marks a run that must not touch the player's save: no banked
   * money, no recorded result, no "where the player was" write. Set it for
   * anything reached through a dev affordance — the enemy Test buttons and the
   * dev level picker — so a development session cannot overwrite real progress.
   * It rides on the event because it has to survive the hop through whichever
   * scene forwards it, and back again on a retry.
   */
  'ui:start-game': {
    world: number;
    level: number;
    /**
     * Which difficulty to play, and therefore which of the three progress slots
     * the result is written to.
     *
     * **Required, deliberately.** It replaced a pinned `'Easy'` constant in
     * `GameplayScene`, and making it optional would have left every emitter that
     * forgot it silently playing on Easy and banking to the Easy slot — the same
     * silent-default trap `PlacementContext` documents for camera size. Required
     * means the compiler names every launch site instead.
     *
     * React does not decide it: the value is published on `difficulty:changed`
     * and echoed back here, exactly as `menu:resume-point` works.
     */
    difficulty: Difficulty;
    sandbox?: boolean;
    /**
     * Arrive fully upgraded. **Only honoured on a `sandbox` run**, so it can
     * never reach the save — see `GameplayScene.create`.
     */
    equipped?: boolean;
  };
  /**
   * The selectable levels of a world, pushed by LevelSelectScene.
   *
   * React never reads the profile directly — it lives in the Phaser registry,
   * and a scene owns it. This is the sanctioned channel.
   */
  /**
   * Where "Play" should resume from, published by MainMenuScene.
   *
   * Resolved from `getCurrentWorldAndLevel` — the same progress table and the
   * same rule LevelSelect locks levels with. React echoes these values back in
   * `ui:start-game`; it does not compute them.
   */
  'menu:resume-point': { world: number; level: number };
  /**
   * The world picker's rows, published by LevelSelectScene.
   *
   * `selected` is 0 while the picker itself is showing — the AS3's
   * `selectedWorld = 0` (`ScreenLevelSelect.changeToWorldsFunction`), which is
   * how one screen holds two views.
   */
  'worlds:listed': {
    selected: number;
    worlds: Array<{
      world: number;
      name: string;
      unlocked: boolean;
      totalLevels: number;
      levelsCompleted: number;
      frontier: number;
      bronze: number;
      silver: number;
      gold: number;
    }>;
  };
  /** Open a world's level grid, or return to the picker with 0. */
  'ui:select-world': { world: number };
  'levels:listed': {
    world: number;
    worldName: string;
    levels: Array<{
      level: number;
      mode: string;
      cleared: boolean;
      unlocked: boolean;
      /** Medals 0-3 at the current difficulty; see `levelUnlockStates`. */
      value: number;
    }>;
  };
  'ui:pause': { paused: boolean };
  /** A purchase request from the shop; the scene owns the transaction. */
  'ui:buy-upgrade': { id: string };
  /**
   * Put an owned primary into a slot — `ButtonEquipSlot.onPressHandler`.
   *
   * Carries only ids. The scene re-reads the live upgrade state and refuses an
   * unowned weapon, the same way `ui:buy-upgrade` lets `purchaseNextLevel`
   * refuse: a stale or forged event must not equip something unbought.
   *
   * There is deliberately no unequip event. The AS3 assigns unconditionally and
   * has no control that empties a slot, so a slot can only be overwritten.
   */
  'ui:equip-primary': { slot: 1 | 2; id: string };
  /** Equip an owned secondary — `ButtonEquip`. One slot, always occupied. */
  'ui:equip-secondary': { id: string };
  /** Dev-only: top up the balance and persist it immediately. */
  'ui:dev-grant-money': { amount: number };
  /**
   * The shop catalogue, published by UpgradesScene after reading the profile.
   *
   * Everything the rows need is precomputed here so React does no game-rule
   * arithmetic — affordability and cost come from `upgradeState`, not the UI.
   */
  /**
   * The player-facing bestiary — `ScreenEnemies`.
   *
   * Published by `BestiaryScene` from the profile, with locked entries
   * included rather than filtered out: the screen shows what is still unmet as
   * silhouettes, and a count of 20 that never moves would be worse than no
   * count at all. `knownBestiary` alone cannot express that, which is why this
   * carries every entry with a `known` flag rather than just the known ones.
   */
  'bestiary:listed': {
    entries: Array<{
      /** Stat-table id — the stable key. */
      id: string;
      /** Stored/display form. Three ids differ from it; see enemyKnowledge.ts. */
      displayName: string;
      /** Absent until met, so an unmet entry leaks nothing about itself. */
      description?: string;
      known: boolean;
    }>;
    knownCount: number;
    total: number;
  };

  'upgrades:listed': {
    /** How many upgrades exist but are unported, so the shop can say so. */
    withheld?: number;
    money: number;
    upgrades: Array<{
      id: string;
      name: string;
      category: string;
      level: number;
      maxLevel: number;
      /** Null when maxed — there is no next level to price. */
      cost: number | null;
      affordable: boolean;
      owned: boolean;
      /** Primaries: which of the two slots holds this weapon, or null. */
      slot: 1 | 2 | null;
      /** Secondaries: whether this is the equipped one. */
      equipped: boolean;
    }>;
  };
  'ui:goto': { key: SceneKey };
  /**
   * Flip sound or music on/off. Persisted to CircularTankOptions, the AS3's
   * own options SharedObject — see audio/audioOptions.ts.
   */
  'ui:set-audio': { soundOn?: boolean; musicOn?: boolean };
  /** The current preferences, so React can render the toggles. */
  'audio:options': { soundOn: boolean; musicOn: boolean };
  /**
   * Choose the difficulty. Persisted to CircularTankOptions beside the volume
   * settings, as `SaveManager.as:793` has it — it is a preference, not progress.
   */
  'ui:set-difficulty': { difficulty: Difficulty };
  /**
   * The current difficulty, so React can render the buttons and echo it back on
   * `ui:start-game`.
   *
   * `hintPending` is `Main.hDifficultyChosen` inverted — true until the player
   * has actually pressed a difficulty button, which is what the AS3 points its
   * helper hand at (`ButtonGameDifficulty.as:41`).
   */
  'difficulty:changed': { difficulty: Difficulty; hintPending: boolean };
  'ui:run-audio-selftest': Record<string, never>;
  'ui:safe-area-changed': { top: number; right: number; bottom: number; left: number };
}

export type GameEventName = keyof GameEventMap;
export type GameEventHandler<K extends GameEventName> = (payload: GameEventMap[K]) => void;

/**
 * Typed facade over Phaser's emitter. The generics are the whole value:
 * `emit('currency:earned', { amount: 5 })` fails to compile because `total`
 * is missing, and `on('currency:earnd', …)` fails because of the typo.
 */
export class TypedGameEmitter {
  private readonly emitter = new Phaser.Events.EventEmitter();

  emit<K extends GameEventName>(event: K, payload: GameEventMap[K]): boolean {
    // A `ui:` event with no live listener is silent and can strand the player.
    // "Next level" emitted `ui:start-game` while only MainMenu and LevelSelect
    // subscribed to it — both torn down during a level — so nothing happened,
    // the overlay had already dismissed itself, and the paused scene looked
    // frozen. Dev-only, because the cost is a listener count per emit.
    if (import.meta.env.DEV && event.startsWith('ui:')) {
      if (this.emitter.listenerCount(event) === 0) {
        console.warn(
          `[GameEvents] "${event}" was emitted with no listener. ` +
            'Whichever scene should act on it is not subscribed right now.',
        );
      }
    }
    return this.emitter.emit(event, payload);
  }

  on<K extends GameEventName>(event: K, handler: GameEventHandler<K>, context?: unknown): this {
    this.emitter.on(event, handler, context);
    return this;
  }

  once<K extends GameEventName>(event: K, handler: GameEventHandler<K>, context?: unknown): this {
    this.emitter.once(event, handler, context);
    return this;
  }

  off<K extends GameEventName>(event: K, handler?: GameEventHandler<K>, context?: unknown): this {
    this.emitter.off(event, handler, context);
    return this;
  }

  /**
   * Subscribe and get an unsubscribe function back — the shape React's
   * `useEffect` and Zustand's `subscribe` both want.
   */
  subscribe<K extends GameEventName>(event: K, handler: GameEventHandler<K>): () => void {
    this.emitter.on(event, handler);
    return () => {
      this.emitter.off(event, handler);
    };
  }

  listenerCount(event: GameEventName): number {
    return this.emitter.listenerCount(event);
  }

  /** Used by tests and by a full teardown; never call this from a scene. */
  removeAllListeners(): void {
    this.emitter.removeAllListeners();
  }
}

/**
 * Module-scoped singleton.
 *
 * Deliberately not created per-Game: it must outlive the Phaser instance so
 * that React subscriptions set up on mount survive StrictMode's
 * create/destroy/create cycle in development.
 */
export const GameEvents = new TypedGameEmitter();
