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
import type { SlotSummary } from '../save/slotSummary';
import type { AchievementListing } from '../achievements/achievementListing';
import type { ResistanceBadge } from '../enemies/resistanceIcons';
import type { BestiaryStats } from '../enemies/bestiaryStats';
import type { BestiaryView } from '../enemies/enemyKnowledge';
import type { GameplayOptions } from '../options/gameplayOptions';
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
  /**
   * The two reload bars — `PartInterface.drawReloadBars` (`:746-778`).
   *
   * **Replaced `ammo:changed` in T78.** That event carried
   * `{ current, capacity }`, which modelled a magazine: `ammo`, `magazine` and
   * `clipSize` appear **zero** times in the AS3's three gameplay files, so
   * "12/12" described something the original does not have. These are cooldown
   * fills, 0-1, and the weapon name for the readout beside them.
   */
  'reload:changed': {
    /** 0-1 — `height1 / 80`. Empty during the opening countdown (`:750-752`). */
    primary: number;
    /** 0-1 — `height2 / 80`. Never gated by the countdown (`:766`). */
    secondary: number;
    weapon: string;
    /** Null when no secondary is equipped, so the bar can be hidden. */
    secondaryName: string | null;
    /**
     * Both primary slots and which one is in hand — `ScreenGame.equippedWeapons`
     * and `currentWeapon`, the two values `weaponInterfaceUnused` reads
     * (`WeaponInterface.as:44-51`, `PartInterface.as:242`).
     *
     * **The pair and the index, not the derived answer.** Which slot the
     * preview shows, and whether it appears at all, is a rule with two AS3
     * sites; sending the raw state keeps that rule in `weaponPanel.ts` where it
     * is driven, instead of splitting it between the scene and the HUD.
     */
    equipped: readonly [string, string];
    /** 1 or 2 — `ScreenGame.currentWeapon`. */
    slot: number;
    /**
     * `reloadTimeSecondary <= 0` (`:637`), which dims the special's icon.
     *
     * Sent as the predicate rather than read off `secondary` above: that fill
     * is also full when no cooldown is configured, so the two agree on every
     * real weapon and disagree exactly where it would be wrong.
     */
    secondaryReady: boolean;
  };
  /**
   * The opening countdown's panel — `PartInterface.as:303-308`.
   *
   * Emitted while the countdown runs and once more on expiry with
   * `running: false`, which is what starts the fade-and-slide. The scene owns
   * the timer; this carries only what the panel draws.
   *
   * **`null` means "no panel at all"**, which is not the same as
   * `running: false`. A level whose countdown was skipped (`:288`) must never
   * show one, where an expired countdown fades out — one clears, the other
   * animates.
   */
  'countdown:changed': {
    running: boolean;
    /** `countDownText` — '', '3', '2', '1' or 'GO!'. */
    label: string;
    /** `modeCountText`, e.g. `"Flag Mode"`. */
    mode: string;
    /** `objectiveCountText`, e.g. `"Kill 18 Enemies"`. */
    objective: string;
  } | null;
  'wave:changed': {
    wave: number;
    /**
     * Enemies killed and the level's full complement, so the HUD can read
     * `3/20 killed`.
     *
     * This replaced a single `enemiesRemaining`, which the HUD rendered as
     * "17 left". Two fields rather than one because the *total* is the part a
     * countdown cannot recover: 17 left says nothing about whether that is
     * most of the level or the last of it.
     */
    enemiesKilled: number;
    enemiesTotal: number;
    /** Level mode, so the HUD knows which counters are meaningful. */
    mode: string;
    /** Flags captured, and how many the level has. Only set on Flag levels. */
    flagsCaptured: number;
    flagsTotal: number;
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
    /** Medals awarded, 0-3 — see `waves/medals.ts`. */
    medals: number;
    /**
     * The level's mode, so the results can draw the right medal *shape*.
     *
     * `ScreenLevelSelect.as:874` builds the medal icon from the level's mode
     * before `:898` sets its tier frame — a Flag level earns flags and a Boss
     * level earns skulls. The results screen drew stars for all three until
     * T206, because this field did not exist and it had nothing else to go on.
     */
    mode: string;
    /**
     * Achievement ids newly earned, and enemy display names newly discovered.
     *
     * `ScreenStatus.as:405-429` appends one page per entry, achievements first
     * then enemies, and shows them newest-first. Both are empty on a sandbox
     * run; enemies are additionally empty on a loss, because discovery is gated
     * on `hp > 0`.
     */
    newAchievements: string[];
    newEnemies: string[];
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
  /**
   * A level's latch just opened during the medal reveal —
   * `ScreenLevelSelect.as:768` / `:1475`, where `spawnLockParticle` sits one
   * line from the `Unlock` push.
   *
   * Emitted only on the step a level crosses from **no** medals to some, not on
   * every medal counted up. The sound and this are a pair; either alone is the
   * bug the pairing test exists to catch.
   */
  'levels:unlock-flash': { world: number; level: number };
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
  /**
   * A save slot was picked on the slot screen — `ButtonGameSave.onReleaseHandler`.
   *
   * The scene decides what happens: an occupied slot loads and goes to Level
   * Select, an empty one starts a fresh game at 1-1. Both are AS3 behaviour
   * (`:110-134`), so neither is the screen's choice to make.
   */
  'ui:select-slot': { slot: number };
  /**
   * Confirmed "Delete slot?" — `ButtonGameSave` (`:453`).
   *
   * The confirmation itself is the row's own state and never leaves the screen;
   * only the confirmed answer reaches the scene.
   */
  'ui:delete-slot': { slot: number };
  /** Open or close the slot picker — the AS3 shows it on the menu screen. */
  'ui:slot-picker': { open: boolean };
  /** Scene -> UI: one row per save slot. */
  'save:slots': { slots: SlotSummary[] };
  'levels:listed': {
    world: number;
    worldName: string;
    /**
     * The level guide's level, when it falls in this world and is unlocked —
     * `ScreenLevelSelect.selectFromLevelGuide` (`:583-595`).
     *
     * `undefined` when it points at another world or a locked level, which is
     * the AS3's own condition rather than a missing value: `:587` tests both
     * before assigning `selectedLevel`, and leaves the selection alone if
     * either fails.
     */
    guideLevel?: number;
    levels: Array<{
      level: number;
      mode: string;
      cleared: boolean;
      unlocked: boolean;
      /** Medals 0-3 at the current difficulty; see `levelUnlockStates`. */
      value: number;
      /**
       * The tier of each medal drawn, best first — `medalTiers`.
       *
       * Not derivable from `value`: the AS3 colours each medal by the highest
       * difficulty that reached *that slot*, so one level can show gold,
       * silver and bronze together, and the count comes from the best tier
       * rather than from the selected difficulty.
       */
      medals: Array<'gold' | 'silver' | 'bronze'>;
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
  /**
   * A DOM control was hovered or clicked — `InterfaceButtonOver1` / `Click`.
   *
   * On the bus rather than called directly because **React must never hold a
   * `Scene`**, and `getSoundManager` takes one. `soundService` subscribes at
   * install time, where it already has the manager.
   */
  'ui:sound': { name: string };
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
  /**
   * The level guide widget on the shop screen — `LevelGuide.as`.
   *
   * Everything the widget draws, resolved by the scene. React sends intents
   * back (`ui:level-guide-*`) and never computes a bound itself: the bounds are
   * counts over the progress table (`levelGuide.ts`), and a second
   * implementation in the view is how the shop's next-level arithmetic went
   * wrong once already.
   */
  'level-guide:changed': {
    selectedWorld: number;
    selectedLevel: number;
    maxWorld: number;
    maxLevel: number;
    /** Which preset rule is in force — `LevelGuide.type` (`:21`). */
    type: 'Previous' | 'Upcoming' | 'Last';
    /** `:19`, persisted in the options store. */
    autoSelect: boolean;
    /** Per-preset, because two can be lit at once — see `isPresetActive`. */
    presetActive: { Previous: boolean; Upcoming: boolean; Last: boolean };
    /** Per-arrow enablement — `ButtonLevelGuideArrow.updateState` (`:74-112`). */
    canStep: {
      worldLeft: boolean;
      worldRight: boolean;
      levelLeft: boolean;
      levelRight: boolean;
    };
  };

  /** An arrow press — `ButtonLevelGuideArrow.changeValue` (`:196-237`). */
  'ui:level-guide-step': {
    axis: 'World' | 'Level';
    direction: 'Left' | 'Right';
  };
  /** A preset press — `ButtonLevelGuideSelect.onPressHandler` (`:66-67`). */
  'ui:level-guide-preset': { type: 'Previous' | 'Upcoming' | 'Last' };
  /** The auto-select toggle — `ButtonLevelGuideAutoSelect`. */
  'ui:level-guide-autoselect': { on: boolean };

  'bestiary:listed': {
    entries: Array<{
      /** Stat-table id — the stable key. */
      id: string;
      /** Stored/display form. Three ids differ from it; see enemyKnowledge.ts. */
      displayName: string;
      /** Absent until met, so an unmet entry leaks nothing about itself. */
      description?: string;
      /**
       * Resistance badges — `ScreenEnemies.as:329-451`. **Empty means unmet**,
       * not "resists nothing": a met enemy with no strengths still carries the
       * frame-1 "none" badge the AS3 adds at `:385-391`, so the two states stay
       * distinguishable without a second flag.
       */
      strengths: ResistanceBadge[];
      weaknesses: ResistanceBadge[];
      /**
       * Tile shape layers, back to front — `ButtonEnemy<Type>` frame 1 when
       * met, frame 4 (the "?" glyph) when not. **The frame is chosen in
       * `buildBestiaryListing`**, so an unmet entry's real artwork never
       * reaches the store; every locked tile is the same triple.
       */
      tile: readonly number[];
      /**
       * Money / health / damage / speed at the listing's own `view`, or absent
       * for an unmet enemy — withheld with everything else on the row.
       */
      stats?: BestiaryStats;
      known: boolean;
    }>;
    knownCount: number;
    total: number;
    /** What the two selectors were set to when this was built. */
    view: BestiaryView;
  };

  /**
   * The bestiary's difficulty / tier selectors — `ScreenEnemies`' two button
   * rows, whose AS3 counterparts are screen-wide statics.
   *
   * React emits; `BestiaryScene` holds the selection and republishes the
   * listing, the same shape as `ui:set-option`. The screen cannot recompute the
   * stats itself, and must not be able to: it would then hold the numbers for
   * enemies the player has never met.
   */
  'ui:bestiary-view': BestiaryView;

  /**
   * `ButtonUpgrades`' `makeIcon` — is anything in the shop affordable.
   *
   * **Separate from `upgrades:listed`, and emitted from every menu scene**,
   * because the bottom bar asks this on screens that never build a catalogue.
   * In the AS3 the button computes it for itself in `added()` off
   * `ScreenUpgrades`' statics, which are global; the port has no equivalent
   * global for React, so each screen that shows the bar publishes the answer
   * as it opens. One line per scene, over one shared rule.
   */
  'upgrades:affordable': { affordable: boolean };

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
      /** Position within its category, 0-based. */
      index: number;
      /**
       * Five stat-preview lines in slot order — `ScreenUpgrades`' `infoText1-5`.
       * `''` clears an unused line and must be carried, not filtered.
       */
      /**
       * The tile's shape layers, back to front — the resting frame for this
       * row's owned/equipped state, chosen by `upgradeTileFrame`.
       */
      tile: readonly number[];
      previews: string[];
    }>;
  };
  'ui:goto': { key: SceneKey };
  /**
   * Flip sound or music on/off, or set either volume. Persisted to
   * CircularTankOptions, the AS3's own options SharedObject — see
   * audio/audioOptions.ts.
   *
   * Volumes are `SliderObject.sliderValue` (`SliderObject.as:58`): a
   * **continuous** 0..1 with no step or snap, clamped at both ends (`:48`,
   * `:53`). A partial, so a control names only what it changed.
   */
  'ui:set-audio': {
    soundOn?: boolean;
    musicOn?: boolean;
    soundVol?: number;
    musicVol?: number;
  };
  /**
   * Set one gameplay preference — `ScreenOptions`' checkboxes.
   *
   * A partial, like `ui:set-audio`, so a toggle names only what it changed and
   * cannot accidentally rewrite the other five with stale values.
   */
  'ui:set-option': Partial<GameplayOptions>;
  /**
   * `ButtonResetOptions.onReleaseHandler` — `SaveManager.resetOptions()`.
   *
   * **Preferences, not progress.** The AS3 clears `optionsSave` and reloads
   * defaults; `gameSave` is untouched. Deleting a *slot* is `ui:delete-slot`
   * on the save picker, which is where the original puts it too
   * (`ButtonGameSave:453`). Keeping the two apart is the point — one is
   * undoable in a click and the other is not.
   */
  'ui:reset-options': Record<string, never>;
  /** The current preferences, so React can render the checkboxes. */
  'options:changed': GameplayOptions;
  /** The achievements board, published by its scene. */
  'achievements:listed': AchievementListing;
  /** The current preferences, so React can render the toggles. */
  'audio:options': {
    soundOn: boolean;
    musicOn: boolean;
    /** 0..1, continuous — `SliderObject.as:58`. */
    soundVol: number;
    musicVol: number;
  };
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
class TypedGameEmitter {
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
