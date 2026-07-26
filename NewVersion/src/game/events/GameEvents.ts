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
import type { SceneKey } from '../config/constants';
import type { LevelResult } from '../waves/levelOutcome';

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
     * Whether a next level exists in this world *and* is now reachable.
     *
     * Computed by the scene, which owns the level tables and the unlock rule.
     * False after a loss: losing records no value, so the next level stays
     * locked and offering to start it would bypass the rule.
     */
    hasNextLevel: boolean;
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
  'ui:start-game': { world: number; level: number };
  /**
   * The selectable levels of a world, pushed by LevelSelectScene.
   *
   * React never reads the profile directly — it lives in the Phaser registry,
   * and a scene owns it. This is the sanctioned channel.
   */
  'levels:listed': {
    world: number;
    worldName: string;
    levels: Array<{
      level: number;
      mode: string;
      cleared: boolean;
      unlocked: boolean;
    }>;
  };
  'ui:pause': { paused: boolean };
  /** A purchase request from the shop; the scene owns the transaction. */
  'ui:buy-upgrade': { id: string };
  /** Dev-only: top up the balance and persist it immediately. */
  'ui:dev-grant-money': { amount: number };
  /**
   * The shop catalogue, published by UpgradesScene after reading the profile.
   *
   * Everything the rows need is precomputed here so React does no game-rule
   * arithmetic — affordability and cost come from `upgradeState`, not the UI.
   */
  'upgrades:listed': {
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
    }>;
  };
  'ui:goto': { key: SceneKey };
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
