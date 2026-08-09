/**
 * Shared state between React and Phaser.
 *
 * Reading rules:
 *   React    -> `useGameStore(selector)`. Always use a selector; subscribing
 *               to the whole store re-renders the HUD on every currency tick.
 *   Phaser   -> `useGameStore.getState()` inside update loops. Never call the
 *               hook from a scene; it is a React hook and there is no
 *               component to bind to.
 *
 * Writing rules: gameplay code should emit a GameEvent rather than calling a
 * setter here. `state/bridge.ts` owns the event -> store translation, which
 * keeps a single place to look when a HUD value is wrong.
 */
import { create } from 'zustand';
import type { AchievementListing } from '../game/achievements/achievementListing';
import type { ResistanceBadge } from '../game/enemies/resistanceIcons';
import type { GameEventMap } from '../game/events/GameEvents';
import { DEFAULT_GAMEPLAY_OPTIONS } from '../game/options/gameplayOptions';
import type { GameplayOptions } from '../game/options/gameplayOptions';
import type { Difficulty, SceneKey } from '../game/config/constants';
import { DEFAULT_DIFFICULTY } from '../game/levels/difficultyOption';
import type { AudioSelfTestReport, BootStage, FontReport } from '../game/events/GameEvents';
import type { SafeAreaInsets } from '../game/config/viewport';
import type { SlotSummary } from '../game/save/slotSummary';
import type { LevelResult } from '../game/waves/levelOutcome';
import type { LevelRef } from '../game/levels/levelProgress';
import { NO_INSETS } from '../game/config/viewport';

export type LoadPhase = 'idle' | 'booting' | 'loading' | 'ready' | 'error';

export interface ViewportSnapshot {
  cssWidth: number;
  cssHeight: number;
  zoom: number;
  logicalWidth: number;
  logicalHeight: number;
  pixelRatio: number;
}

export interface AchievementToast {
  id: string;
  title: string;
  /** Wall-clock ms, used by the HUD to expire the toast. */
  at: number;
}

/** What the results overlay renders. */
export interface LevelOutcomeSummary {
  result: LevelResult;
  world: number;
  level: number;
  kills: number;
  currency: number;
  /** Coordinates of the level to offer next, or null when there is none. */
  nextLevel: LevelRef | null;
  /** Medals awarded, 0-3. */
  medals: number;
  /** Achievement ids newly earned, and enemy names newly discovered. */
  newAchievements: string[];
  newEnemies: string[];
}

/** The bestiary as the screen renders it. */
export interface BestiaryListing {
  entries: Array<{
    id: string;
    displayName: string;
    description?: string;
    /**
     * Badges for the two resistance rows — `ScreenEnemies.as:329-451`.
     *
     * Empty **only** when the enemy is unmet. A met enemy with no strengths
     * still carries one badge, the frame-1 "none" placeholder the AS3 adds at
     * `:385-391`, so the screen never has to guess which case it is looking at.
     */
    strengths: ResistanceBadge[];
    weaknesses: ResistanceBadge[];
    known: boolean;
  }>;
  knownCount: number;
  total: number;
}

/** One world's levels with their unlock state. */
export interface WorldListing {
  /** 0 while the picker is showing; otherwise the open world. */
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
}

export interface LevelListing {
  world: number;
  worldName: string;
  levels: Array<{
    level: number;
    mode: string;
    cleared: boolean;
    unlocked: boolean;
    /** Medals 0-3 at the current difficulty — see `levelUnlockStates`. */
    value: number;
  }>;
}

/** Everything the shop rows render, precomputed by UpgradesScene. */
export interface ShopCatalogue {
  money: number;
  upgrades: Array<{
    id: string;
    name: string;
    category: string;
    level: number;
    maxLevel: number;
    cost: number | null;
    affordable: boolean;
    owned: boolean;
    /** Primaries: which of the two slots holds this weapon, or null. */
    slot: 1 | 2 | null;
    /** Secondaries: whether this is the equipped one. */
    equipped: boolean;
    /** Position within its category, 0-based — see `UpgradeSpec.index`. */
    index: number;
    /**
     * The five stat-preview lines, in slot order — `ScreenUpgrades`' five
     * `infoText` fields.
     *
     * **Always five entries, and `''` is meaningful**: it clears a line this
     * upgrade does not use. Sending only the non-empty ones would let the
     * previously selected upgrade's line survive on screen.
     */
    previews: string[];
  }>;
  /**
   * Upgrades that exist in the original but are not sold, because their effects
   * are unported. Surfaced so the shop can say what is missing rather than
   * present a filtered list as the whole catalogue.
   */
  withheld?: number;
}

export interface GameState {
  /* Loading */
  phase: LoadPhase;
  /** Which startup stage we are on — named so a stall is diagnosable. */
  stage: BootStage;
  progress: number;
  loadError: string | null;

  /* Active scene, mirrored so React can render the right overlay */
  activeScene: SceneKey | null;

  /* HUD data */
  currency: number;
  health: number;
  maxHealth: number;
  /** Primary reload bar fill, 0-1 — `PartInterface.as:750-761`. */
  reloadPrimary: number;
  /** Secondary reload bar fill, 0-1 — `:766-772`. */
  reloadSecondary: number;
  weapon: string;
  /** Equipped secondary's name, or null when there is none. */
  secondaryName: string | null;
  wave: number;
  enemiesRemaining: number;
  /** Level mode, so the HUD can show mode-specific counters. */
  levelMode: string;
  /** Flags still to capture; only shown on a Flag level. */
  flagsRemaining: number;
  /**
   * The opening countdown's panel, or null when there is none to draw.
   *
   * Kept as one object rather than four fields so the panel mounts and
   * unmounts on a single value — `AmmoReadout`'s `capacity <= 0` guard is the
   * cautionary tale for spreading one widget's visibility across several.
   */
  countdown: { running: boolean; label: string; mode: string; objective: string } | null;
  achievements: AchievementToast[];

  /** Set when a level finishes; null while one is in progress. */
  levelOutcome: LevelOutcomeSummary | null;

  /** The selectable levels of the current world, published by LevelSelectScene. */
  levelList: LevelListing | null;

  /** The world picker's rows. `selected` 0 means the picker is showing. */
  worldList: WorldListing | null;
  slotList: SlotSummary[] | null;
  slotPickerOpen: boolean;

  /** The shop catalogue, published by UpgradesScene. */
  shop: ShopCatalogue | null;
  bestiary: BestiaryListing | null;
  /** The shop's level guide widget — `LevelGuide.as`. */
  levelGuide: GameEventMap['level-guide:changed'] | null;

  /** Where the Play button resumes from, published by MainMenuScene. */
  resumePoint: { world: number; level: number } | null;

  /* Diagnostics */
  viewport: ViewportSnapshot | null;
  safeArea: SafeAreaInsets;
  /**
   * Sound/music preferences, mirrored from SoundManager for the HUD toggles and
   * the options-screen sliders.
   *
   * `soundVol`/`musicVol` are `SliderObject.sliderValue` — continuous 0..1, no
   * step (`SliderObject.as:58`).
   */
  audioOptions: { soundOn: boolean; musicOn: boolean; soundVol: number; musicVol: number };
  /** `ScreenOptions`' six checkboxes. See game/options/gameplayOptions.ts. */
  gameplayOptions: GameplayOptions;
  /** The achievements board. Distinct from `achievements`, which is toasts. */
  achievementBoard: AchievementListing | null;
  /**
   * The chosen difficulty, mirrored from the options store.
   *
   * React renders the buttons from this and echoes it back on `ui:start-game`;
   * it never decides it. `hintPending` is true until the player has pressed a
   * difficulty button — `Main.hDifficultyChosen` inverted.
   */
  difficulty: Difficulty;
  difficultyHintPending: boolean;
  fonts: FontReport[];
  audioReport: AudioSelfTestReport | null;
  fps: number;

  /* Actions — called by the bridge, and by React for UI-local state */
  setPhase: (phase: LoadPhase) => void;
  setStage: (stage: BootStage) => void;
  setProgress: (progress: number) => void;
  setLoadError: (message: string | null) => void;
  setActiveScene: (key: SceneKey | null) => void;
  setCurrency: (total: number) => void;
  addCurrency: (amount: number) => void;
  setHealth: (health: number, maxHealth?: number) => void;
  setReload: (
    primary: number,
    secondary: number,
    weapon: string,
    secondaryName: string | null,
  ) => void;
  setWave: (
    wave: number,
    enemiesRemaining: number,
    levelMode: string,
    flagsRemaining: number,
  ) => void;
  setCountdown: (countdown: GameState['countdown']) => void;
  endLevel: (summary: LevelOutcomeSummary) => void;
  /** Clears the result so the next level starts clean. */
  clearLevelOutcome: () => void;
  setLevelList: (listing: LevelListing) => void;
  setWorldList: (listing: WorldListing) => void;
  setSlotList: (slots: SlotSummary[]) => void;
  setSlotPickerOpen: (open: boolean) => void;
  setShop: (shop: ShopCatalogue) => void;
  setBestiary: (bestiary: BestiaryListing) => void;
  setLevelGuide: (guide: GameEventMap['level-guide:changed']) => void;
  setResumePoint: (point: { world: number; level: number }) => void;
  pushAchievement: (toast: AchievementToast) => void;
  dismissAchievement: (id: string) => void;
  setViewport: (viewport: ViewportSnapshot) => void;
  setSafeArea: (insets: SafeAreaInsets) => void;
  setAudioOptions: (options: {
    soundOn: boolean;
    musicOn: boolean;
    soundVol: number;
    musicVol: number;
  }) => void;
  setDifficulty: (state: { difficulty: Difficulty; hintPending: boolean }) => void;
  setFonts: (fonts: FontReport[]) => void;
  setAudioReport: (report: AudioSelfTestReport | null) => void;
  setFps: (fps: number) => void;
  reset: () => void;
}

/** Everything that a "new run" resets. Diagnostics deliberately survive. */
const initialRunState = {
  currency: 0,
  health: 100,
  maxHealth: 100,
  reloadPrimary: 1,
  reloadSecondary: 1,
  weapon: 'none',
  secondaryName: null,
  wave: 0,
  enemiesRemaining: 0,
  levelMode: 'Normal',
  flagsRemaining: 0,
  countdown: null,
  achievements: [] as AchievementToast[],
  levelOutcome: null as LevelOutcomeSummary | null,
  levelList: null as LevelListing | null,
  worldList: null as WorldListing | null,
  slotList: null as SlotSummary[] | null,
  slotPickerOpen: false,
  shop: null as ShopCatalogue | null,
  bestiary: null as BestiaryListing | null,
  levelGuide: null as GameEventMap['level-guide:changed'] | null,
  resumePoint: null as { world: number; level: number } | null,
};

export const useGameStore = create<GameState>()((set) => ({
  phase: 'idle',
  stage: 'fonts',
  progress: 0,
  loadError: null,
  activeScene: null,

  ...initialRunState,

  viewport: null,
  safeArea: NO_INSETS,
  // `SaveManager.as:831-834` — the reset defaults, matching DEFAULT_AUDIO_OPTIONS.
  audioOptions: { soundOn: true, musicOn: true, soundVol: 1, musicVol: 1 },
  gameplayOptions: { ...DEFAULT_GAMEPLAY_OPTIONS },
  achievementBoard: null,
  difficulty: DEFAULT_DIFFICULTY,
  difficultyHintPending: true,
  fonts: [],
  audioReport: null,
  fps: 0,

  setPhase: (phase) => set({ phase }),
  setStage: (stage) => set({ stage }),
  setProgress: (progress) => set({ progress: Math.min(1, Math.max(0, progress)) }),
  setLoadError: (loadError) => set({ loadError, phase: loadError ? 'error' : 'loading' }),
  setActiveScene: (activeScene) => set({ activeScene }),

  setCurrency: (currency) => set({ currency }),
  addCurrency: (amount) => set((s) => ({ currency: s.currency + amount })),

  setHealth: (health, maxHealth) =>
    set((s) => ({
      health: Math.max(0, health),
      maxHealth: maxHealth ?? s.maxHealth,
    })),

  setReload: (reloadPrimary, reloadSecondary, weapon, secondaryName) =>
    set({ reloadPrimary, reloadSecondary, weapon, secondaryName }),
  setWave: (wave, enemiesRemaining, levelMode, flagsRemaining) =>
    set({ wave, enemiesRemaining, levelMode, flagsRemaining }),
  setCountdown: (countdown) => set({ countdown }),
  endLevel: (levelOutcome) => set({ levelOutcome }),
  clearLevelOutcome: () => set({ levelOutcome: null }),
  setLevelList: (levelList) => set({ levelList }),
  setWorldList: (worldList) => set({ worldList }),
  setSlotList: (slotList) => set({ slotList }),
  setSlotPickerOpen: (slotPickerOpen) => set({ slotPickerOpen }),
  setShop: (shop) => set({ shop }),
  setBestiary: (bestiary) => set({ bestiary }),
  setLevelGuide: (levelGuide) => set({ levelGuide }),
  setResumePoint: (resumePoint) => set({ resumePoint }),

  pushAchievement: (toast) =>
    set((s) =>
      // Achievements fire once, but a level restart can replay the trigger;
      // de-dupe so the toast stack cannot grow without bound.
      s.achievements.some((a) => a.id === toast.id)
        ? s
        : { achievements: [...s.achievements, toast] },
    ),

  dismissAchievement: (id) =>
    set((s) => ({ achievements: s.achievements.filter((a) => a.id !== id) })),

  setViewport: (viewport) => set({ viewport }),
  setSafeArea: (safeArea) => set({ safeArea }),
  setAudioOptions: (audioOptions) => set({ audioOptions }),
  setDifficulty: ({ difficulty, hintPending }) =>
    set({ difficulty, difficultyHintPending: hintPending }),
  setFonts: (fonts) => set({ fonts }),
  setAudioReport: (audioReport) => set({ audioReport }),
  setFps: (fps) => set({ fps }),

  reset: () => set({ ...initialRunState }),
}));

/** Non-reactive accessor for Phaser code. */
export const getGameState = (): GameState => useGameStore.getState();
